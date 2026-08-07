import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getPushPublicKey, removePushSubscription, savePushSubscription, sendPushMessage } from "@/lib/push.functions";

type Message = { id: string; title: string; body: string; delivered: number; automatic: boolean; created_at: string };

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

const bufferToBase64 = (buffer: ArrayBuffer | null) =>
  buffer ? btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : "";

export function PushPanel({ isAdmin }: { isAdmin: boolean }) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase.from("push_messages").select("id, title, body, delivered, automatic, created_at").order("created_at", { ascending: false }).limit(8);
    setMessages((data ?? []) as Message[]);
  }, []);

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
      const result = await sendPushMessage({ data: { title, body } });
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
          <h2 className="text-sm font-semibold">Avisos no celular</h2>
          <p className="text-xs text-muted-foreground">Notificações do navegador para William, Késya e Mirella.</p>
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
        <div className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título do aviso" className="h-9 text-xs" maxLength={80} />
          <Input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Mensagem" className="h-9 text-xs" maxLength={300} />
          <Button size="sm" className="h-9 gap-1.5 text-xs" disabled={busy || !title.trim() || !body.trim()} onClick={() => void send()}><Send className="size-3.5" />Enviar</Button>
        </div>
      )}

      {feedback && <p className="mt-2 text-xs text-muted-foreground">{feedback}</p>}

      {messages.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {messages.map((message) => (
            <li key={message.id} className="rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px]">
              <span className="font-medium">{message.title}</span> · {message.body}
              <span className="ml-1 text-muted-foreground">
                ({message.automatic ? "automático" : "manual"} · {message.delivered} entrega(s) · {new Date(message.created_at).toLocaleDateString("pt-BR")})
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}