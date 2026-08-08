import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setActiveEvent } from "@/lib/active-event";

export type EventRole = "owner" | "organizer" | "planner" | "rsvp" | "celebrant" | "viewer";

export const eventRoleLabel: Record<EventRole, string> = {
  owner: "Proprietário",
  organizer: "Organizador",
  planner: "Cerimonialista",
  rsvp: "RSVP / recepção",
  celebrant: "Aniversariante",
  viewer: "Visualizador",
};

export const eventRoleHint: Record<EventRole, string> = {
  owner: "Acesso total, inclusive equipe e configurações",
  organizer: "Acesso total ao evento",
  planner: "Convidados e tarefas; vê o financeiro sem alterar",
  rsvp: "Só a lista de convidados, apenas para confirmar presença",
  celebrant: "Acompanha convidados e tarefas, sem financeiro",
  viewer: "Somente leitura",
};

export type EventSummary = { id: string; name: string; eventDate: string | null; role: EventRole };

export type EventAccess = {
  ready: boolean;
  userId: string | null;
  email: string | null;
  name: string | null;
  isPlatformAdmin: boolean;
  events: EventSummary[];
  activeEventId: string | null;
  activeEvent: EventSummary | null;
  role: EventRole | null;
  can: {
    guests: boolean;
    guestsEdit: boolean;
    tasks: boolean;
    tasksEdit: boolean;
    finance: boolean;
    financeEdit: boolean;
    team: boolean;
  };
  setActiveEventId: (id: string) => void;
  reload: () => Promise<void>;
};


const permissionsFor = (role: EventRole | null) => ({
  guests: role !== null,
  guestsEdit: role === "owner" || role === "organizer" || role === "planner",
  tasks: role !== null && role !== "rsvp",
  tasksEdit: role === "owner" || role === "organizer" || role === "planner" || role === "celebrant",
  finance: role === "owner" || role === "organizer" || role === "planner",
  financeEdit: role === "owner" || role === "organizer",
  team: role === "owner" || role === "organizer",
});

export function useEventAccess(): EventAccess {
  const [state, setState] = useState<Omit<EventAccess, "setActiveEventId" | "reload" | "can" | "activeEvent" | "role">>({
    ready: false,
    userId: null,
    email: null,
    name: null,
    isPlatformAdmin: false,
    events: [],
    activeEventId: null,
  });

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      setState({ ready: false, userId: null, email: null, name: null, isPlatformAdmin: false, events: [], activeEventId: null });
      return;
    }
    const [{ data: profile }, { data: platformRoles }, { data: memberships }] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", session.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", session.user.id),
      supabase.from("event_members").select("role, event_id, events(id, name, event_date)").order("created_at", { ascending: true }),
    ]);

    const events: EventSummary[] = (memberships ?? [])
      .map((row) => {
        const event = row.events as { id: string; name: string; event_date: string | null } | null;
        if (!event) return null;
        return { id: event.id, name: event.name, eventDate: event.event_date, role: row.role as EventRole };
      })
      .filter((item): item is EventSummary => item !== null);

    const stored = typeof window !== "undefined" ? window.localStorage.getItem("festa-active-event") : null;
    const activeEventId = events.find((event) => event.id === stored)?.id ?? events[0]?.id ?? null;
    setActiveEvent(activeEventId);

    setState({
      ready: true,
      userId: session.user.id,
      email: session.user.email ?? null,
      name: profile?.display_name ?? session.user.email ?? "Perfil",
      isPlatformAdmin: (platformRoles ?? []).some((row) => row.role === "admin"),
      events,
      activeEventId,
    });
  }, []);

  useEffect(() => {
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") void load();
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const setActiveEventId = useCallback((id: string) => {
    setActiveEvent(id);
    setState((current) => ({ ...current, activeEventId: id }));
  }, []);

  const activeEvent = state.events.find((event) => event.id === state.activeEventId) ?? null;
  const role = activeEvent?.role ?? null;

  return { ...state, activeEvent, role, can: permissionsFor(role), setActiveEventId, reload: load };
}
