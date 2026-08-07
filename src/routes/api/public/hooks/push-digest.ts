import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/push-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PUSH_CRON_SECRET"];
        const token = request.headers.get("authorization")?.replace("Bearer ", "");
        if (!secret || token !== secret) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
        }
        const { buildDigest, deliverPush } = await import("@/lib/push.server");
        const digest = await buildDigest();
        if (!digest) return Response.json({ ok: true, skipped: true });
        const result = await deliverPush(digest, { automatic: true });
        return Response.json({ ok: true, ...result });
      },
    },
  },
});