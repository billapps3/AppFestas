import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { eventRoleLabel, type EventRole } from "@/lib/event-access";
import {
  getNotificationSettings,
  getPushPublicKey,
  listEventMembersForPush,
  removePushSubscription,
  savePushSubscription,
  sendPushMessage,
  updateNotificationSettings,
} from "@/lib/push.functions";

type Message = {
  id: string;
  title: string;
  body: string;
  delivered: number;
  automatic: boolean;
  created_at: string;
  kind: string;
  audience_roles: string[] | null;
};

type AutoKind = "task_done" | "rsvp" | "pending_report";
type Setting = { kind: AutoKind; enabled: boolean; roles: EventRole[] };
type Member = { userId: string; role: EventRole; name: string };

const ALL_ROLES: EventRole[] = ["owner", "organizer", "planner", "rsvp", "celebrant", "viewer"];

const autoLabel: Record<AutoKind, string> = {
  task_done: "Tarefa concluída",
  rsvp: "Confirmação ou declínio de convidado",
  pending_report: "Relatório de convites sem confirmação",
};

const kindLabel: Record<string, string> = { manual: "manual", ...autoLabel };

const defaultSettings: Setting[] = [
  { kind: "task_done", enabled: true, roles: ["owner", "organizer", "planner"] },
  { kind: "rsvp", enabled: true, roles: ["owner", "organizer", "rsvp"] },
  { kind: "pending_report", enabled: true, roles: ["owner", "organizer", "planner"] },
];

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

const bufferToBase64 = (buffer: ArrayBuffer | null) =>
  buffer ? btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : "";

export function PushPanel({ isAdmin, eventId }: { isAdmin: boolean; eventId: string }) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [tab, setTab] = useState<"send" | "auto" | "history">("send");
  const [roles, setRoles] = useState<EventRole[]>(["owner", "organizer"]);
  const [people, setPeople] = useState<string[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [settings, setSettings] = useState<Setting[]>(defaultSettings);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from("push_messages")
      .select("id, title, body, delivered, automatic, created_at, kind, audience_roles")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(10);
    setMessages((data ?? []) as Message[]);
  }, [eventId]);

  useEffect(() => {
    const ok = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
    setSupported(ok);
    if (!ok) return;
    void navigator.serviceWorker.getRegistration("/push-sw.js").then(async (registration) => {
      const subscription = await registration?.pushManager.getSubscription();
      setEnabled(Boolean(subscription));
    });
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!isAdmin || !eventId) return;
    void listEventMembersForPush({ data: { eventId } }).then(setMembers).catch(() => undefined);
    void getNotificationSettings({ data: { eventId } })
      .then((rows) => {
        if (rows.length) {
          setSettings(defaultSettings.map((item) => rows.find((row) => row.kind === item.kind) ?? item));
        }
      })
      .catch(() => undefined);
  }, [isAdmin, eventId]);

  const toggleRole = (role: EventRole) =>
    setRoles((current) => (current.includes(role) ? current.filter((item) => item !== role) : [...current, role]));

  const togglePerson = (userId: string) =>
    setPeople((current) => (current.includes(userId) ? current.filter((item) => item !== userId) : [...current, userId]));

  const saveSetting = async (kind: AutoKind, patch: Partial<Setting>) => {
    const next = settings.map((item) => (item.kind === kind ? { ...item, ...patch } : item));
    setSettings(next);
    const target = next.find((item) => item.kind === kind)!;
    await updateNotificationSettings({ data: { eventId, kind, enabled: target.enabled, roles: target.roles } }).catch(() => undefined);
  };

  const enable = async () => {
    setBusy(true);
    setFeedback("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Permissão negada no navegador");
      const { publicKey } = await getPushPublicKey();
      if (!publicKey) throw new Error("Chave de notificação não configurada");
      const registration = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
      await savePushSubscription({
        data: {
          endpoint: subscription.endpoint,
          p256dh: bufferToBase64(subscription.getKey("p256dh")),
          auth: bufferToBase64(subscription.getKey("auth")),
          label: navigator.userAgent.slice(0, 80),
          eventId,
        },
      });
      setEnabled(true);
      setFeedback("Avisos ativados neste aparelho.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível ativar");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/push-sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription({ data: { endpoint: subscription.endpoint } });
        await subscription.unsubscribe();
      }
      setEnabled(false);
      setFeedback("Avisos desativados neste aparelho.");
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    setBusy(true);
    setFeedback("");
    try {
      const result = await sendPushMessage({ data: { eventId, title, body, audienceRoles: roles, audienceUserIds: people } });
      setTitle("");
      setBody("");
      setFeedback(`Enviado para ${result.delivered} de ${result.total} aparelho(s).`);
      await loadMessages();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao enviar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Central de avisos</h2>
          <p className="text-xs text-muted-foreground">Notificações no celular para a equipe do evento.</p>
        </div>
        {supported ? (
          enabled ? (
            <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => void disable()}><BellOff className="size-3.5" />Desativar aqui</Button>
          ) : (
            <Button size="sm" className="gap-1.5" disabled={busy} onClick={() => void enable()}><Bell className="size-3.5" />Ativar neste aparelho</Button>
          )
        ) : (
          <span className="text-xs text-muted-foreground">Navegador sem suporte a avisos.</span>
        )}
      </div>

      {isAdmin && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/50 p-1 text-[11px] font-medium">
            {([["send", "Enviar aviso"], ["auto", "Automáticos"], ["history", "Histórico"]] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-md px-2 py-1.5 ${tab === id ? "bg-card shadow-sm" : "text-muted-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "send" && (
            <div className="mt-3 space-y-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título do aviso" className="h-9 text-xs" maxLength={80} />
                <Input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Mensagem" className="h-9 text-xs" maxLength={300} />
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Enviar para os papéis</div>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
                  {ALL_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] ${roles.includes(role) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                    >
                      {eventRoleLabel[role]}
                    </button>
                  ))}
                </div>
              </div>

              {members.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pessoas específicas</div>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    {members.map((member) => (
                      <label key={member.userId} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-[11px]">
                        <input type="checkbox" checked={people.includes(member.userId)} onChange={() => togglePerson(member.userId)} className="size-3.5 accent-primary" />
                        <span className="min-w-0 truncate">{member.name}</span>
                        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{eventRoleLabel[member.role]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <Button
                size="sm"
                className="h-9 w-full gap-1.5 text-xs sm:w-auto"
                disabled={busy || !title.trim() || !body.trim() || (roles.length === 0 && people.length === 0)}
                onClick={() => void send()}
              >
                <Send className="size-3.5" />Enviar aviso
              </Button>
            </div>
          )}

          {tab === "auto" && (
            <div className="mt-3 space-y-2">
              {settings.map((setting) => (
                <div key={setting.kind} className="rounded-lg border border-border p-2.5">
                  <label className="flex items-center gap-2 text-xs font-medium">
                    <input type="checkbox" checked={setting.enabled} onChange={(event) => void saveSetting(setting.kind, { enabled: event.target.checked })} className="size-3.5 accent-primary" />
                    {autoLabel[setting.kind]}
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
                    {ALL_ROLES.map((role) => {
                      const active = setting.roles.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => void saveSetting(setting.kind, { roles: active ? setting.roles.filter((item) => item !== role) : [...setting.roles, role] })}
                          className={`rounded-full border px-2.5 py-1 text-[11px] ${active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                        >
                          {eventRoleLabel[role]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground">O relatório de pendentes é enviado uma vez por dia no horário do resumo.</p>
            </div>
          )}
        </div>
      )}

      {feedback && <p className="mt-2 text-xs text-muted-foreground">{feedback}</p>}

      {(!isAdmin || tab === "history") && messages.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {messages.map((message) => (
            <li key={message.id} className="rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px]">
              <span className="font-medium">{message.title}</span> · {message.body}
              <span className="ml-1 text-muted-foreground">
                ({kindLabel[message.kind] ?? message.kind} · {(message.audience_roles ?? []).map((role) => eventRoleLabel[role as EventRole] ?? role).join(", ") || "pessoas escolhidas"} · {message.delivered} entrega(s) · {new Date(message.created_at).toLocaleDateString("pt-BR")})
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}