import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Role = "owner" | "organizer" | "planner" | "rsvp" | "celebrant" | "viewer";
const ROLES: Role[] = ["owner", "organizer", "planner", "rsvp", "celebrant", "viewer"];
type AutoKind = "task_done" | "rsvp" | "pending_report";

type AuthedClient = {
  rpc: (fn: "has_event_role", args: { _event: string; _roles: Role[] }) => PromiseLike<{ data: unknown }>;
};

async function assertManager(client: AuthedClient, eventId: string) {
  const { data } = await client.rpc("has_event_role", { _event: eventId, _roles: ["owner", "organizer"] });
  if (data !== true) throw new Error("Sem permissão para enviar avisos neste evento");
}

const sanitizeRoles = (roles?: string[]) => (roles ?? []).filter((role): role is Role => ROLES.includes(role as Role));

export const getPushPublicKey = createServerFn({ method: "GET" }).handler(async () => ({
  publicKey: process.env["VAPID_PUBLIC_KEY"] ?? "",
}));

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { endpoint: string; p256dh: string; auth: string; label?: string; eventId?: string }) => {
    if (!data?.endpoint || !data.p256dh || !data.auth) throw new Error("Inscrição inválida");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_subscriptions").upsert(
      {
        user_id: context.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        label: data.label ?? null,
        event_id: data.eventId ?? null,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { endpoint: string }) => data)
  .handler(async ({ data, context }) => {
    await context.supabase.from("push_subscriptions").delete().eq("endpoint", data.endpoint);
    return { ok: true };
  });

export const sendPushMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { eventId: string; title: string; body: string; url?: string; audienceRoles?: string[]; audienceUserIds?: string[] }) => {
    const title = (data?.title ?? "").trim();
    const body = (data?.body ?? "").trim();
    if (!data?.eventId) throw new Error("Evento inválido");
    if (!title || title.length > 80) throw new Error("Título obrigatório (até 80 caracteres)");
    if (!body || body.length > 300) throw new Error("Mensagem obrigatória (até 300 caracteres)");
    const roles = sanitizeRoles(data.audienceRoles);
    const userIds = (data.audienceUserIds ?? []).slice(0, 200);
    if (roles.length === 0 && userIds.length === 0) throw new Error("Escolha ao menos um destinatário");
    return { eventId: data.eventId, title, body, url: data.url?.slice(0, 200), roles, userIds };
  })
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, data.eventId);
    const { deliverPush } = await import("@/lib/push.server");
    return deliverPush(
      { title: data.title, body: data.body, url: data.url },
      { sentBy: context.userId, automatic: false, kind: "manual", eventId: data.eventId, roles: data.roles, userIds: data.userIds },
    );
  });

export const listEventMembersForPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { eventId: string }) => {
    if (!data?.eventId) throw new Error("Evento inválido");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { data: members, error } = await context.supabase
      .from("event_members")
      .select("user_id, role, profiles:user_id(display_name, email)")
      .eq("event_id", data.eventId);
    if (error) throw new Error(error.message);
    return (members ?? []).map((row) => {
      const profile = row.profiles as { display_name?: string; email?: string } | null;
      return {
        userId: row.user_id,
        role: row.role as Role,
        name: profile?.display_name ?? profile?.email ?? "Participante",
      };
    });
  });

export const getNotificationSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { eventId: string }) => {
    if (!data?.eventId) throw new Error("Evento inválido");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("notification_settings")
      .select("kind, enabled, audience_roles")
      .eq("event_id", data.eventId);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((row) => ({
      kind: row.kind as AutoKind,
      enabled: row.enabled,
      roles: (row.audience_roles ?? []) as Role[],
    }));
  });

export const updateNotificationSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { eventId: string; kind: AutoKind; enabled: boolean; roles: string[] }) => {
    if (!data?.eventId) throw new Error("Evento inválido");
    if (!["task_done", "rsvp", "pending_report"].includes(data.kind)) throw new Error("Tipo de aviso inválido");
    return { eventId: data.eventId, kind: data.kind, enabled: Boolean(data.enabled), roles: sanitizeRoles(data.roles) };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("notification_settings").upsert(
      { event_id: data.eventId, kind: data.kind, enabled: data.enabled, audience_roles: data.roles },
      { onConflict: "event_id,kind" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function automaticAudience(client: { from: (table: "notification_settings") => any }, eventId: string, kind: AutoKind) {
  const { data } = await client
    .from("notification_settings")
    .select("enabled, audience_roles")
    .eq("event_id", eventId)
    .eq("kind", kind)
    .maybeSingle();
  if (!data || data.enabled === false) return null;
  const roles = sanitizeRoles(data.audience_roles as string[]);
  return roles.length ? roles : null;
}

export const notifyTaskDone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { eventId: string; taskName: string }) => {
    if (!data?.eventId || !data?.taskName) throw new Error("Dados inválidos");
    return { eventId: data.eventId, taskName: data.taskName.slice(0, 120) };
  })
  .handler(async ({ data, context }) => {
    const roles = await automaticAudience(context.supabase, data.eventId, "task_done");
    if (!roles) return { delivered: 0, total: 0, skipped: true };
    const { data: profile } = await context.supabase.from("profiles").select("display_name").eq("id", context.userId).maybeSingle();
    const actor = profile?.display_name ?? "Alguém";
    const { deliverPush } = await import("@/lib/push.server");
    return deliverPush(
      { title: "Tarefa concluída", body: `${actor} concluiu: ${data.taskName}`, url: "/app" },
      { sentBy: context.userId, automatic: true, kind: "task_done", eventId: data.eventId, roles },
    );
  });

export const notifyGuestRsvp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { eventId: string; guestName: string; status: string; family?: string }) => {
    if (!data?.eventId || !data?.guestName) throw new Error("Dados inválidos");
    if (!["Confirmado", "Declinado"].includes(data.status)) throw new Error("Status sem aviso");
    return { eventId: data.eventId, guestName: data.guestName.slice(0, 120), status: data.status, family: data.family?.slice(0, 80) };
  })
  .handler(async ({ data, context }) => {
    const roles = await automaticAudience(context.supabase, data.eventId, "rsvp");
    if (!roles) return { delivered: 0, total: 0, skipped: true };
    const { data: profile } = await context.supabase.from("profiles").select("display_name").eq("id", context.userId).maybeSingle();
    const actor = profile?.display_name ?? "Alguém";
    const action = data.status === "Confirmado" ? "confirmou presença" : "declinou o convite";
    const family = data.family ? ` (família ${data.family})` : "";
    const { deliverPush } = await import("@/lib/push.server");
    return deliverPush(
      { title: data.status === "Confirmado" ? "Presença confirmada" : "Convite declinado", body: `${data.guestName}${family} ${action} — registrado por ${actor}`, url: "/app" },
      { sentBy: context.userId, automatic: true, kind: "rsvp", eventId: data.eventId, roles },
    );
  });