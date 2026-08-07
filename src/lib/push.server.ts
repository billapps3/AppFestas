import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PushPayload = { title: string; body: string; url?: string };

export async function deliverPush(payload: PushPayload, meta: { sentBy?: string | null; automatic?: boolean }) {
  const vapid = {
    subject: process.env["VAPID_SUBJECT"] ?? "mailto:admin@example.com",
    publicKey: process.env["VAPID_PUBLIC_KEY"]!,
    privateKey: process.env["VAPID_PRIVATE_KEY"]!,
  };

  const { data: subs } = await supabaseAdmin.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  let delivered = 0;

  for (const row of subs ?? []) {
    const subscription: PushSubscription = {
      endpoint: row.endpoint,
      expirationTime: null,
      keys: { p256dh: row.p256dh, auth: row.auth },
    };
    try {
      const request = await buildPushPayload({ data: JSON.stringify(payload), options: { ttl: 3600 } }, subscription, vapid);
      const response = await fetch(row.endpoint, request as unknown as RequestInit);
      if (response.ok) {
        delivered += 1;
      } else if (response.status === 404 || response.status === 410) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("id", row.id);
      } else {
        console.error(`Push failed [${response.status}]: ${await response.text()}`);
      }
    } catch (error) {
      console.error("Push error", error);
    }
  }

  await supabaseAdmin.from("push_messages").insert({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? null,
    sent_by: meta.sentBy ?? null,
    automatic: meta.automatic ?? false,
    delivered,
  });

  return { delivered, total: subs?.length ?? 0 };
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const inDaysISO = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

export async function buildDigest(): Promise<PushPayload | null> {
  const today = todayISO();
  const soon = inDaysISO(3);

  const [tasksRes, installmentsRes] = await Promise.all([
    supabaseAdmin.from("tasks").select("name, due, status").neq("status", "Concluído"),
    supabaseAdmin.from("installments").select("label, due, amount, paid").eq("paid", false),
  ]);

  const lateTasks = (tasksRes.data ?? []).filter((task) => task.due && task.due < today);
  const dueTasks = (tasksRes.data ?? []).filter((task) => task.due && task.due >= today && task.due <= soon);
  const lateParcels = (installmentsRes.data ?? []).filter((item) => item.due && item.due < today);
  const dueParcels = (installmentsRes.data ?? []).filter((item) => item.due && item.due >= today && item.due <= soon);

  const parts: string[] = [];
  if (lateTasks.length) parts.push(`${lateTasks.length} tarefa(s) atrasada(s)`);
  if (dueTasks.length) parts.push(`${dueTasks.length} tarefa(s) vencendo em 3 dias`);
  if (lateParcels.length) parts.push(`${lateParcels.length} parcela(s) em atraso`);
  if (dueParcels.length) parts.push(`${dueParcels.length} parcela(s) a vencer`);
  if (parts.length === 0) return null;

  return { title: "Festa da Mirella · resumo do dia", body: parts.join(" · "), url: "/" };
}