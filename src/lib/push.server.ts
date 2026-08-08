import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PushPayload = { title: string; body: string; url?: string | undefined };
export type EventRole = "owner" | "organizer" | "planner" | "rsvp" | "celebrant" | "viewer";
export type PushKind = "manual" | "task_done" | "rsvp" | "pending_report";

export type PushAudience = { eventId: string; roles?: EventRole[]; userIds?: string[] };

async function resolveRecipients({ eventId, roles = [], userIds = [] }: PushAudience) {
  if (roles.length === 0 && userIds.length === 0) return [] as string[];
  const { data: members } = await supabaseAdmin
    .from("event_members")
    .select("user_id, role")
    .eq("event_id", eventId);
  const set = new Set<string>();
  for (const member of members ?? []) {
    if (roles.includes(member.role as EventRole) || userIds.includes(member.user_id))
      set.add(member.user_id);
  }
  return [...set];
}

export async function deliverPush(
  payload: PushPayload,
  meta: { sentBy?: string | null; automatic?: boolean; kind?: PushKind } & PushAudience,
) {
  const vapid = {
    subject: process.env["VAPID_SUBJECT"] ?? "mailto:admin@example.com",
    publicKey: process.env["VAPID_PUBLIC_KEY"]!,
    privateKey: process.env["VAPID_PRIVATE_KEY"]!,
  };

  const recipients = await resolveRecipients(meta);
  const subs = recipients.length
    ? ((
        await supabaseAdmin
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth, user_id, event_id")
          .in("user_id", recipients)
      ).data?.filter((row) => row.event_id === null || row.event_id === meta.eventId) ?? [])
    : [];
  let delivered = 0;

  for (const row of subs ?? []) {
    const subscription: PushSubscription = {
      endpoint: row.endpoint,
      expirationTime: null,
      keys: { p256dh: row.p256dh, auth: row.auth },
    };
    try {
      const request = await buildPushPayload(
        { data: JSON.stringify(payload), options: { ttl: 3600 } },
        subscription,
        vapid,
      );
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
    event_id: meta.eventId,
    kind: meta.kind ?? "manual",
    audience_roles: meta.roles ?? [],
    audience_user_ids: meta.userIds ?? [],
  });

  return { delivered, total: subs?.length ?? 0 };
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const inDaysISO = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

export async function buildDigest(eventId: string): Promise<PushPayload | null> {
  const today = todayISO();
  const soon = inDaysISO(3);

  const [tasksRes, installmentsRes] = await Promise.all([
    supabaseAdmin
      .from("tasks")
      .select("name, due, status")
      .eq("event_id", eventId)
      .neq("status", "Concluído"),
    supabaseAdmin
      .from("installments")
      .select("label, due, amount, paid")
      .eq("event_id", eventId)
      .eq("paid", false),
  ]);

  const lateTasks = (tasksRes.data ?? []).filter((task) => task.due && task.due < today);
  const dueTasks = (tasksRes.data ?? []).filter(
    (task) => task.due && task.due >= today && task.due <= soon,
  );
  const lateParcels = (installmentsRes.data ?? []).filter((item) => item.due && item.due < today);
  const dueParcels = (installmentsRes.data ?? []).filter(
    (item) => item.due && item.due >= today && item.due <= soon,
  );

  const parts: string[] = [];
  if (lateTasks.length) parts.push(`${lateTasks.length} tarefa(s) atrasada(s)`);
  if (dueTasks.length) parts.push(`${dueTasks.length} tarefa(s) vencendo em 3 dias`);
  if (lateParcels.length) parts.push(`${lateParcels.length} parcela(s) em atraso`);
  if (dueParcels.length) parts.push(`${dueParcels.length} parcela(s) a vencer`);
  if (parts.length === 0) return null;

  return { title: "Festa da Mirella · resumo do dia", body: parts.join(" · "), url: "/" };
}

export async function buildPendingReport(eventId: string): Promise<PushPayload | null> {
  const today = todayISO();
  const [guestsRes, familiesRes] = await Promise.all([
    supabaseAdmin
      .from("guests")
      .select("name, status, family_id, rsvp_deadline")
      .eq("event_id", eventId),
    supabaseAdmin.from("families").select("id, name, rsvp_deadline").eq("event_id", eventId),
  ]);

  const guests = guestsRes.data ?? [];
  const families = new Map((familiesRes.data ?? []).map((row) => [row.id, row]));
  const waiting = guests.filter((guest) => guest.status === "Aguardando");
  if (waiting.length === 0) return null;

  const deadlineOf = (guest: (typeof waiting)[number]) =>
    guest.rsvp_deadline ||
    (guest.family_id ? (families.get(guest.family_id)?.rsvp_deadline ?? "") : "");

  const late = waiting.filter((guest) => {
    const deadline = deadlineOf(guest);
    return Boolean(deadline) && deadline < today;
  });

  const byGroup = new Map<string, number>();
  for (const guest of late) {
    const label = guest.family_id
      ? (families.get(guest.family_id)?.name ?? guest.name)
      : guest.name;
    byGroup.set(label, (byGroup.get(label) ?? 0) + 1);
  }
  const top = [...byGroup.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => `${label} (${count})`);

  const parts = [`${waiting.length} convite(s) sem confirmação`];
  if (late.length) parts.push(`${late.length} fora do prazo`);
  if (top.length) parts.push(`Atrasados: ${top.join(", ")}`);

  return { title: "Convites sem confirmação", body: parts.join(" · "), url: "/app" };
}
