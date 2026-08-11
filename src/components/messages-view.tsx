import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Send, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { eventRoleLabel, type EventRole } from "@/lib/event-access";
import {
  getNotificationSettings,
  getPushPublicKey,
  listPushReach,
  removePushSubscription,
  savePushSubscription,
  sendPushMessage,
  sendTestPush,
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
  profiles: { display_name: string | null } | null;
};

type AutoKind = "task_done" | "rsvp" | "pending_report";
type Setting = { kind: AutoKind; enabled: boolean; roles: EventRole[] };
type Reach = { userId: string; role: EventRole; name: string; email: string; devices: number };

const ALL_ROLES: EventRole[] = ["owner", "organizer", "planner", "rsvp", "celebrant", "viewer"];

const autoLabel: Record<AutoKind, string> = {
  task_done: "Tarefa concluída",
  rsvp: "Confirmação ou declínio de convidado",
  pending_report: "Relatório de convites sem confirmação",
};

const kindLabel: Record<string, string> = { manual: "Comunicado", ...autoLabel };

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
  buffer
    ? btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "")
    : "";

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function RoleChips({
  selected,
  onToggle,
}: {
  selected: EventRole[];
  onToggle: (role: EventRole) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
      {ALL_ROLES.map((role) => {
        const active = selected.includes(role);
        return (
          <button
            key={role}
            type="button"
            onClick={() => onToggle(role)}
            className={`rounded-full border px-2.5 py-1 text-[11px] ${active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          >
            {eventRoleLabel[role]}
          </button>
        );
      })}
    </div>
  );
}

export function MessagesView({ canManage, eventId }: { canManage: boolean; eventId: string }) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [standalone, setStandalone] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [roles, setRoles] = useState<EventRole[]>(["owner", "organizer"]);
  const [people, setPeople] = useState<string[]>([]);
  const [reach, setReach] = useState<Reach[]>([]);
  const [settings, setSettings] = useState<Setting[]>(defaultSettings);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from("push_messages")
      .select(
        "id, title, body, delivered, automatic, created_at, kind, audience_roles, profiles:sent_by(display_name)",
      )
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(30);
    setMessages((data ?? []) as unknown as Message[]);
  }, [eventId]);

  const loadReach = useCallback(async () => {
    if (!canManage || !eventId) return;
    await listPushReach({ data: { eventId } })
      .then(setReach)
      .catch(() => undefined);
  }, [canManage, eventId]);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
    setSupported(ok);
    if (typeof window !== "undefined") {
      setStandalone(
        window.matchMedia("(display-mode: standalone)").matches ||
          (window.navigator as unknown as { standalone?: boolean }).standalone === true,
      );
      setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));
    }
    if (!ok) return;
    void navigator.serviceWorker.getRegistration("/push-sw.js").then(async (registration) => {
      const subscription = await registration?.pushManager.getSubscription();
      setEnabled(Boolean(subscription));
    });
  }, []);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    void loadReach();
  }, [loadReach]);

  useEffect(() => {
    if (!canManage || !eventId) return;
    void getNotificationSettings({ data: { eventId } })
      .then((rows) => {
        if (rows.length) {
          setSettings(
            defaultSettings.map((item) => rows.find((row) => row.kind === item.kind) ?? item),
          );
        }
      })
      .catch(() => undefined);
  }, [canManage, eventId]);

  const toggleRole = (role: EventRole) =>
    setRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    );

  const togglePerson = (userId: string) =>
    setPeople((current) =>
      current.includes(userId) ? current.filter((item) => item !== userId) : [...current, userId],
    );

  const saveSetting = async (kind: AutoKind, patch: Partial<Setting>) => {
    const next = settings.map((item) => (item.kind === kind ? { ...item, ...patch } : item));
    setSettings(next);
    const target = next.find((item) => item.kind === kind)!;
    await updateNotificationSettings({
      data: { eventId, kind, enabled: target.enabled, roles: target.roles },
    }).catch(() => undefined);
  };

  const enable = async () => {
    setBusy(true);
    setFeedback("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        throw new Error(
          "O navegador bloqueou os avisos. Abra as configurações do site e libere as notificações.",
        );
      const { publicKey } = await getPushPublicKey();
      if (!publicKey) throw new Error("Chave de notificação não configurada");
      const registration = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));
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
      await loadReach();
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
      await loadReach();
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    setBusy(true);
    setFeedback("");
    try {
      const result = await sendPushMessage({
        data: { eventId, title, body, audienceRoles: roles, audienceUserIds: people },
      });
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

  const test = async (userId?: string) => {
    setBusy(true);
    try {
      const result = await sendTestPush({ data: { eventId, ...(userId ? { userId } : {}) } });
      setFeedback(
        result.total === 0
          ? "Essa pessoa ainda não ativou os avisos em nenhum aparelho."
          : `Teste enviado para ${result.delivered} de ${result.total} aparelho(s).`,
      );
      await loadMessages();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha no teste");
    } finally {
      setBusy(false);
    }
  };

  const audienceCount = reach.filter(
    (item) => roles.includes(item.role) || people.includes(item.userId),
  ).length;

  return (
    <div className="space-y-4">
      <Card
        title="Avisos neste aparelho"
        hint="Cada pessoa precisa ativar no próprio celular para receber."
      >
        {supported ? (
          <div className="flex flex-wrap items-center gap-2">
            {enabled ? (
              <Button variant="outline" className="gap-1.5" disabled={busy} onClick={() => void disable()}>
                <BellOff className="size-4" />
                Desativar aqui
              </Button>
            ) : (
              <Button className="gap-1.5" disabled={busy} onClick={() => void enable()}>
                <Bell className="size-4" />
                Ativar neste aparelho
              </Button>
            )}
            {enabled && (
              <Button variant="ghost" size="sm" className="text-xs" disabled={busy} onClick={() => void test()}>
                Enviar teste para mim
              </Button>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Este navegador não envia avisos. Use o Chrome no Android ou o app instalado no iPhone.
          </p>
        )}
        {isIOS && !standalone && (
          <p className="mt-2 flex items-start gap-1.5 rounded-md bg-muted/50 p-2 text-[11px] text-muted-foreground">
            <Smartphone className="mt-0.5 size-3.5 shrink-0" />
            No iPhone, toque em Compartilhar → “Adicionar à Tela de Início” e ative os avisos abrindo
            o app por esse ícone. Pelo Safari comum o iPhone não entrega avisos.
          </p>
        )}
      </Card>

      {canManage && (
        <Card title="Escrever comunicado" hint="Escolha os papéis e/ou pessoas que devem receber.">
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Título do aviso"
                className="h-9 text-xs"
                maxLength={80}
              />
              <Input
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Mensagem"
                className="h-9 text-xs"
                maxLength={300}
              />
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Enviar para os papéis
              </div>
              <div className="mt-1.5">
                <RoleChips selected={roles} onToggle={toggleRole} />
              </div>
            </div>

            {reach.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Pessoas específicas
                </div>
                <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                  {reach.map((member) => (
                    <label
                      key={member.userId}
                      className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-[11px]"
                    >
                      <input
                        type="checkbox"
                        checked={people.includes(member.userId)}
                        onChange={() => togglePerson(member.userId)}
                        className="size-3.5 accent-primary"
                      />
                      <span className="min-w-0 truncate">{member.name}</span>
                      <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                        {eventRoleLabel[member.role]} ·{" "}
                        {member.devices > 0 ? `${member.devices} aparelho(s)` : "sem aparelho"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button
              className="h-9 w-full gap-1.5 text-xs sm:w-auto"
              disabled={
                busy || !title.trim() || !body.trim() || (roles.length === 0 && people.length === 0)
              }
              onClick={() => void send()}
            >
              <Send className="size-3.5" />
              Enviar para {audienceCount} pessoa(s)
            </Button>
          </div>
        </Card>
      )}

      {canManage && (
        <Card title="Avisos automáticos" hint="Ligue ou desligue e escolha quem recebe cada tipo.">
          <div className="space-y-2">
            {settings.map((setting) => (
              <div key={setting.kind} className="rounded-lg border border-border p-2.5">
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={setting.enabled}
                    onChange={(event) =>
                      void saveSetting(setting.kind, { enabled: event.target.checked })
                    }
                    className="size-3.5 accent-primary"
                  />
                  {autoLabel[setting.kind]}
                </label>
                <div className="mt-2">
                  <RoleChips
                    selected={setting.roles}
                    onToggle={(role) =>
                      void saveSetting(setting.kind, {
                        roles: setting.roles.includes(role)
                          ? setting.roles.filter((item) => item !== role)
                          : [...setting.roles, role],
                      })
                    }
                  />
                </div>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">
              O relatório de pendentes é enviado uma vez por dia no horário do resumo.
            </p>
          </div>
        </Card>
      )}

      <Card title="Mensagens do evento" hint="Tudo que já foi enviado, mesmo sem aviso no celular.">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma mensagem ainda.</p>
        ) : (
          <ul className="space-y-1.5">
            {messages.map((message) => (
              <li
                key={message.id}
                className="rounded-md border border-border bg-background px-2.5 py-2 text-[11px]"
              >
                <div>
                  <span className="font-medium">{message.title}</span> · {message.body}
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {kindLabel[message.kind] ?? message.kind} ·{" "}
                  {message.automatic
                    ? "automático"
                    : `por ${message.profiles?.display_name ?? "equipe"}`}{" "}
                  ·{" "}
                  {(message.audience_roles ?? [])
                    .map((role) => eventRoleLabel[role as EventRole] ?? role)
                    .join(", ") || "pessoas escolhidas"}{" "}
                  · {message.delivered} entrega(s) ·{" "}
                  {new Date(message.created_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {canManage && reach.length > 0 && (
        <Card title="Quem está recebendo" hint="Quem tem zero aparelhos precisa ativar no celular.">
          <ul className="space-y-1.5">
            {reach.map((member) => (
              <li
                key={member.userId}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border px-2.5 py-2 text-[11px]"
              >
                <span className="font-medium">{member.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {eventRoleLabel[member.role]}
                </span>
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-[10px] ${member.devices > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                >
                  {member.devices > 0
                    ? `recebendo em ${member.devices} aparelho(s)`
                    : "ainda não ativou"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px]"
                  disabled={busy || member.devices === 0}
                  onClick={() => void test(member.userId)}
                >
                  Enviar teste
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}
    </div>
  );
}