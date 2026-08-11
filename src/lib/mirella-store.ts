import { supabase } from "@/integrations/supabase/client";
import { activeEventId } from "@/lib/active-event";

export type StoredTask = {
  id: number;
  name: string;
  area: string;
  owner: string;
  due: string;
  status: string;
  priority: string;
  parent?: number | null;
};

export type StoredGuest = {
  id: number;
  name: string;
  age?: number | undefined;
  phone?: string | undefined;
  status: string;
  virtual: boolean;
  virtualAt: string;
  physical: boolean;
  personal: boolean;
  child: boolean;
  family: string;
  host: string;
  deadline: string;
};

export type MirellaState = { tasks: StoredTask[]; guests: StoredGuest[] };

async function nameMap(table: "families" | "hosts") {
  const { data } = await supabase.from(table).select("id, name").eq("event_id", activeEventId());
  const byId = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const row of data ?? []) {
    byId.set(row.id, row.name);
    byName.set(row.name, row.id);
  }
  return { byId, byName };
}

export async function loadMirellaState(): Promise<MirellaState | null> {
  const [families, hosts, guestsRes, tasksRes] = await Promise.all([
    nameMap("families"),
    nameMap("hosts"),
    supabase.from("guests").select("*").eq("event_id", activeEventId()).order("legacy_id", { ascending: true }),
    supabase.from("tasks").select("*").eq("event_id", activeEventId()).order("legacy_id", { ascending: true }),
  ]);
  if (guestsRes.error || tasksRes.error) return null;

  const guests: StoredGuest[] = (guestsRes.data ?? []).map((row) => ({
    id: row.legacy_id ?? 0,
    name: row.name,
    age: row.age ?? undefined,
    phone: row.phone ?? undefined,
    status: row.status,
    virtual: row.invite_virtual,
    virtualAt: row.invite_virtual_at ?? "",
    physical: row.invite_physical,
    personal: row.invite_personal,
    child: typeof row.age === "number" && row.age > 10 ? false : row.is_child ?? false,
    deadline: row.rsvp_deadline ?? "",
    family: (row.family_id && families.byId.get(row.family_id)) || "",
    host: (row.host_id && hosts.byId.get(row.host_id)) || "",
  }));

  const tasks: StoredTask[] = (tasksRes.data ?? []).map((row) => ({
    id: row.legacy_id ?? 0,
    name: row.name,
    area: row.area ?? "",
    owner: row.owner ?? "",
    due: row.due ?? "",
    status: row.status,
    priority: row.priority,
    parent: row.parent_legacy_id ?? null,
  }));

  return { tasks, guests };
}

async function ensureNames(table: "families" | "hosts", names: string[]) {
  const existing = await nameMap(table);
  const missing = names.filter((name) => name && !existing.byName.has(name));
  if (missing.length) {
    await supabase.from(table).upsert(missing.map((name) => ({ name, event_id: activeEventId() })), { onConflict: "event_id,name" });
    return (await nameMap(table)).byName;
  }
  return existing.byName;
}

export async function saveMirellaState(state: MirellaState) {
  const { tasks, guests } = state;
  if (!guests.length) return; // nunca sobrescreve com lista vazia

  // Trava de segurança: bloqueia gravações que apagariam família/responsável em massa.
  const { data: currentRows } = await supabase
    .from("guests")
    .select("legacy_id, family_id, host_id")
    .eq("event_id", activeEventId());
  if (currentRows?.length) {
    const byLegacy = new Map(currentRows.map((row) => [row.legacy_id, row]));
    let clearing = 0;
    for (const guest of guests) {
      const current = byLegacy.get(guest.id);
      if (!current) continue;
      if (current.family_id && !guest.family) clearing += 1;
      if (current.host_id && !guest.host) clearing += 1;
    }
    if (clearing > 5) {
      throw new Error(
        `Gravação bloqueada: ${clearing} vínculos de família/responsável seriam apagados de uma vez.`,
      );
    }
  }

  const familyIds = await ensureNames("families", [...new Set(guests.map((guest) => guest.family))]);
  const hostIds = await ensureNames("hosts", [...new Set(guests.map((guest) => guest.host))]);

  const eventId = activeEventId();
  const guestRows = guests.map((guest) => ({
    event_id: eventId,
    legacy_id: guest.id,
    name: guest.name,
    phone: guest.phone ?? null,
    age: guest.age ?? null,
    is_child: guest.child,
    status: guest.status,
    invite_virtual: guest.virtual,
    invite_virtual_at: guest.virtualAt || null,
    rsvp_deadline: guest.deadline || null,
    invite_physical: guest.physical,
    invite_personal: guest.personal,
    is_primary: Boolean(guest.family) && guest.family === guest.name,
    family_id: guest.family ? familyIds.get(guest.family) ?? null : null,
    host_id: guest.host ? hostIds.get(guest.host) ?? null : null,
  }));

  const { error: guestError } = await supabase.from("guests").upsert(guestRows, { onConflict: "event_id,legacy_id" });
  if (guestError) throw guestError;

  if (tasks.length) {
    const { error: taskError } = await supabase.from("tasks").upsert(
      tasks.map((task) => ({
        event_id: eventId,
        legacy_id: task.id,
        name: task.name,
        area: task.area,
        owner: task.owner,
        due: task.due,
        status: task.status,
        priority: task.priority,
        parent_legacy_id: task.parent ?? null,
      })),
      { onConflict: "event_id,legacy_id" },
    );
    if (taskError) throw taskError;
    await supabase
      .from("tasks")
      .delete()
      .eq("event_id", eventId)
      .not("legacy_id", "in", `(${tasks.map((task) => task.id).join(",")})`);
  }
}

export type FamilyInvite = { physical: boolean; physicalAt: string; virtual: boolean; virtualAt: string; deadline: string };

export async function deleteGuest(legacyId: number) {
  const { error } = await supabase
    .from("guests")
    .delete()
    .eq("event_id", activeEventId())
    .eq("legacy_id", legacyId);
  if (error) throw error;
}

export async function loadFamilyInvites(): Promise<Record<string, FamilyInvite>> {
  const { data } = await supabase
    .from("families")
    .select("name, invite_physical, invite_physical_at, invite_virtual, invite_virtual_at, rsvp_deadline")
    .eq("event_id", activeEventId());
  const map: Record<string, FamilyInvite> = {};
  for (const row of data ?? []) {
    map[row.name] = {
      physical: row.invite_physical ?? false,
      physicalAt: row.invite_physical_at ?? "",
      virtual: row.invite_virtual ?? false,
      virtualAt: row.invite_virtual_at ?? "",
      deadline: row.rsvp_deadline ?? "",
    };
  }
  return map;
}

export async function saveFamilyInvite(name: string, invite: FamilyInvite) {
  if (!name) return;
  await supabase
    .from("families")
    .upsert(
      {
        name,
        event_id: activeEventId(),
        invite_physical: invite.physical,
        invite_physical_at: invite.physicalAt || null,
        invite_virtual: invite.virtual,
        invite_virtual_at: invite.virtualAt || null,
        rsvp_deadline: invite.deadline || null,
      },
      { onConflict: "event_id,name" },
    );
}
