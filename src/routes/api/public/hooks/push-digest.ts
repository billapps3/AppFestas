import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/push-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
        const apikey = request.headers.get("apikey");
        if (!expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        const { buildDigest, buildPendingReport, deliverPush } = await import("@/lib/push.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: settings } = await supabaseAdmin
          .from("notification_settings")
          .select("event_id, kind, enabled, audience_roles")
          .eq("kind", "pending_report")
          .eq("enabled", true);

        const results: Array<{ eventId: string; delivered: number; total: number }> = [];
        for (const setting of settings ?? []) {
          const roles = (setting.audience_roles ?? []) as Array<
            "owner" | "organizer" | "planner" | "rsvp" | "celebrant" | "viewer"
          >;
          if (roles.length === 0) continue;

          const digest = await buildDigest(setting.event_id);
          if (digest) {
            const sent = await deliverPush(digest, {
              automatic: true,
              kind: "pending_report",
              eventId: setting.event_id,
              roles,
            });
            results.push({ eventId: setting.event_id, ...sent });
          }

          const pending = await buildPendingReport(setting.event_id);
          if (pending) {
            const sent = await deliverPush(pending, {
              automatic: true,
              kind: "pending_report",
              eventId: setting.event_id,
              roles,
            });
            results.push({ eventId: setting.event_id, ...sent });
          }
        }

        return Response.json({ ok: true, results });
      },
    },
  },
});
