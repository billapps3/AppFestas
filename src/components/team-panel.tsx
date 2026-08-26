import { useCallback, useEffect, useState } from "react";
import { Mail, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { inviteTeamMember } from "@/lib/team.functions";
import { eventRoleHint, eventRoleLabel, type EventRole } from "@/lib/event-access";

type Member = { userId: string; role: EventRole; name: string; email: string | null };
type Invite = { id: string; email: string; role: EventRole; expiresAt: string };

const ASSIGNABLE: EventRole[] = ["organizer", "planner", "rsvp", "celebrant", "viewer"];

export function TeamPanel({ eventId, canManage, currentUserId }: { eventId: string; canManage: boolean; currentUserId: string | null }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<EventRole>("organizer");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: memberRows }, { data: inviteRows }] = await Promise.all([
      supabase.from("event_members").select("user_id, role").eq("event_id", eventId),
      supabase.from("event_invites").select("id, email, role, expires_at").eq("event_id", eventId).is("accepted_at", null),
    ]);
    const ids = (memberRows ?? []).map((row) => row.user_id);
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, display_name, email").in("id", ids)
      : { data: [] as { id: string; display_name: string | null; email: string | null }[] };
    setMembers(
      (memberRows ?? [])
        // Sem perfil = sem conta de verdade por trás (convite nunca aceito,
        // conta apagada, resíduo de dado antigo). Não faz sentido mostrar um
        // card vazio repetido — se acontecer de novo, alguém some da lista
        // silenciosamente em vez de aparecer como "Perfil" genérico.
        .filter((row) => (profiles ?? []).some((item) => item.id === row.user_id))
        .map((row) => {
          const profile = (profiles ?? []).find((item) => item.id === row.user_id)!;
          return { userId: row.user_id, role: row.role as EventRole, name: profile.display_name ?? "Sem nome", email: profile.email };
        }),
    );
    setInvites((inviteRows ?? []).map((row) => ({ id: row.id, email: row.email, role: row.role as EventRole, expiresAt: row.expires_at })));
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeRole = async (member: Member, next: EventRole) => {
    setBusy(member.userId);
    const { error } = await supabase.from("event_members").update({ role: next }).eq("event_id", eventId).eq("user_id", member.userId);
    setMessage(error ? error.message : null);
    await load();
    setBusy(null);
  };

  const removeMember = async (member: Member) => {
    setBusy(member.userId);
    const { error } = await supabase.from("event_members").delete().eq("event_id", eventId).eq("user_id", member.userId);
    setMessage(error ? error.message : null);
    await load();
    setBusy(null);
  };

  const submitInvite = async () => {
    setBusy("invite");
    try {
      const result = await inviteTeamMember({ data: { eventId, email, role } });
      setMessage(result.status === "added" ? `${result.email} já tinha conta e entrou na equipe.` : `Convite registrado para ${result.email}. O acesso é liberado no primeiro login com esse e-mail.`);
      setEmail("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível convidar");
    }
    setBusy(null);
  };

  const cancelInvite = async (invite: Invite) => {
    setBusy(invite.id);
    await supabase.from("event_invites").delete().eq("id", invite.id);
    await load();
    setBusy(null);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 text-primary" />Equipe do evento</div>
      <p className="mt-1 text-xs text-muted-foreground">
        Cada pessoa recebe um papel neste evento. As regras valem no banco de dados, não só no menu: quem é RSVP, por exemplo, só consegue mudar a confirmação dos convidados.
      </p>

      <div className="mt-4 space-y-3">
        {members.map((member) => (
          <div key={member.userId} className="rounded-lg border border-border bg-background px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{member.name}{member.userId === currentUserId ? " (você)" : ""}</div>
                <div className="truncate text-[11px] text-muted-foreground">{member.email ?? "—"} · {eventRoleLabel[member.role]}</div>
              </div>
              {canManage && member.role !== "owner" && member.userId !== currentUserId && (
                <div className="flex items-center gap-2">
                  <select
                    className="h-8 rounded-md border border-input bg-card px-2 text-xs"
                    value={member.role}
                    disabled={busy === member.userId}
                    onChange={(event) => void changeRole(member, event.target.value as EventRole)}
                  >
                    {ASSIGNABLE.map((option) => (
                      <option key={option} value={option}>{eventRoleLabel[option]}</option>
                    ))}
                  </select>
                  <Button size="icon" variant="ghost" aria-label="Remover acesso" disabled={busy === member.userId} onClick={() => void removeMember(member)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">{eventRoleHint[member.role]}</div>
          </div>
        ))}
        {members.length === 0 && <div className="text-xs text-muted-foreground">Carregando equipe…</div>}
      </div>

      {invites.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Convites pendentes</div>
          {invites.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-3 py-2 text-xs">
              <span className="flex min-w-0 items-center gap-2"><Mail className="size-3.5 shrink-0" /><span className="truncate">{invite.email} · {eventRoleLabel[invite.role]}</span></span>
              {canManage && (
                <Button size="sm" variant="ghost" className="text-[11px]" disabled={busy === invite.id} onClick={() => void cancelInvite(invite)}>Cancelar</Button>
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div className="mt-5 rounded-lg border border-border bg-background p-3">
          <div className="flex items-center gap-2 text-xs font-medium"><UserPlus className="size-3.5" />Convidar pessoa</div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input placeholder="email@exemplo.com" value={email} onChange={(event) => setEmail(event.target.value)} className="sm:flex-1" />
            <select className="h-9 rounded-md border border-input bg-card px-2 text-xs" value={role} onChange={(event) => setRole(event.target.value as EventRole)}>
              {ASSIGNABLE.map((option) => (
                <option key={option} value={option}>{eventRoleLabel[option]}</option>
              ))}
            </select>
            <Button size="sm" disabled={busy === "invite" || !email} onClick={() => void submitInvite()}>Convidar</Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{eventRoleHint[role]}</p>
        </div>
      )}

      {message && <p className="mt-3 text-[11px] text-muted-foreground">{message}</p>}
    </section>
  );
}
