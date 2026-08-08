import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Role = "owner" | "organizer" | "planner" | "rsvp" | "celebrant" | "viewer";
const ROLES: Role[] = ["owner", "organizer", "planner", "rsvp", "celebrant", "viewer"];

type AuthedClient = { rpc: (fn: "has_event_role", args: { _event: string; _roles: Role[] }) => PromiseLike<{ data: unknown }> };

async function assertManager(supabaseClient: AuthedClient, eventId: string) {
  const { data } = await supabaseClient.rpc("has_event_role", { _event: eventId, _roles: ["owner", "organizer"] });
  if (data !== true) throw new Error("Sem permissão para gerenciar a equipe deste evento");
}

export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { eventId: string; email: string; role: Role }) => {
    const email = (data?.email ?? "").trim().toLowerCase();
    if (!data?.eventId) throw new Error("Evento inválido");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("E-mail inválido");
    if (!ROLES.includes(data.role)) throw new Error("Papel inválido");
    if (data.role === "owner") throw new Error("Só existe um proprietário por evento");
    return { eventId: data.eventId, email, role: data.role };
  })
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, data.eventId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .ilike("email", data.email)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from("event_members")
        .upsert({ event_id: data.eventId, user_id: existing.id, role: data.role }, { onConflict: "event_id,user_id" });
      if (error) throw new Error(error.message);
      return { status: "added" as const, email: data.email };
    }

    const { error } = await supabaseAdmin.from("event_invites").upsert(
      { event_id: data.eventId, email: data.email, role: data.role, invited_by: context.userId, accepted_at: null },
      { onConflict: "event_id,email" },
    );
    if (error) throw new Error(error.message);
    return { status: "invited" as const, email: data.email };
  });

export const acceptMyInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as { email?: string } | null)?.email?.toLowerCase();
    if (!email) return { joined: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invites } = await supabaseAdmin
      .from("event_invites")
      .select("id, event_id, role, expires_at")
      .ilike("email", email)
      .is("accepted_at", null);

    let joined = 0;
    for (const invite of invites ?? []) {
      if (new Date(invite.expires_at).getTime() < Date.now()) continue;
      const { error } = await supabaseAdmin
        .from("event_members")
        .upsert({ event_id: invite.event_id, user_id: context.userId, role: invite.role }, { onConflict: "event_id,user_id" });
      if (error) continue;
      await supabaseAdmin.from("event_invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);
      joined += 1;
    }
    return { joined };
  });
