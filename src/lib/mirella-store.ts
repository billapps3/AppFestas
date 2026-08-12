import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
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
  updatedAt: string;
};

export type MirellaState = { tasks: StoredTask[]; guests: StoredGuest[] };

async function nameMap(table: "families" | "hosts", eventId: string) {
  const { data, error } = await supabase.from(table).select("id, name").eq("event_id", eventId);
  if (error) throw error;
  const byId = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const row of data ?? []) {
    byId.set(row.id, row.name);
    byName.set(row.name, row.id);
  }
  return { byId, byName };
}

export async function loadMirellaState(eventId: string): Promise<MirellaState> {
  const [families, hosts, guestsRes, tasksRes] = await Promise.all([
    nameMap("families", eventId),
    nameMap("hosts", eventId),
    supabase.from("guests").select("*").eq("event_id", eventId).order("legacy_id", { ascending: true }),
    supabase.from("tasks").select("*").eq("event_id", eventId).order("legacy_id", { ascending: true }),
  ]);
  if (guestsRes.error) throw guestsRes.error;
  if (tasksRes.error) throw tasksRes.error;

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
    updatedAt: row.updated_at,
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

async function ensureNames(table: "families" | "hosts", names: string[], eventId: string) {
  const existing = await nameMap(table, eventId);
  const missing = names.filter((name) => name && !existing.byName.has(name));
  if (missing.length) {
    const { error } = await supabase.from(table).upsert(missing.map((name) => ({ name, event_id: eventId })), { onConflict: "event_id,name" });
    if (error) throw error;
    return (await nameMap(table, eventId)).byName;
  }
  return existing.byName;
}

export async function saveTasks(eventId: string, tasks: StoredTask[]) {
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

export type GuestPatch = Partial<Omit<StoredGuest, "id" | "updatedAt">>;

export async function updateGuestFields(
  eventId: string,
  legacyId: number,
  patch: GuestPatch,
  expectedUpdatedAt: string,
  currentName: string,
): Promise<string> {
  const row: Database["public"]["Tables"]["guests"]["Update"] = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.phone !== undefined) row.phone = patch.phone || null;
  if (patch.age !== undefined) row.age = patch.age ?? null;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.virtual !== undefined) row.invite_virtual = patch.virtual;
  if (patch.virtualAt !== undefined) row.invite_virtual_at = patch.virtualAt || null;
  if (patch.deadline !== undefined) row.rsvp_deadline = patch.deadline || null;
  if (patch.physical !== undefined) row.invite_physical = patch.physical;
  if (patch.personal !== undefined) row.invite_personal = patch.personal;
  if (patch.child !== undefined) row.is_child = patch.child;

  if (patch.family !== undefined) {
    const families = await ensureNames("families", patch.family ? [patch.family] : [], eventId);
    row.family_id = patch.family ? families.get(patch.family) ?? null : null;
    row.is_primary = Boolean(patch.family) && patch.family === (patch.name ?? currentName);
  }
  if (patch.host !== undefined) {
    const hosts = await ensureNames("hosts", patch.host ? [patch.host] : [], eventId);
    row.host_id = patch.host ? hosts.get(patch.host) ?? null : null;
  }
  if (!Object.keys(row).length) return expectedUpdatedAt;

  const { data, error } = await supabase
    .from("guests")
    .update(row)
    .eq("event_id", eventId)
    .eq("legacy_id", legacyId)
    .eq("updated_at", expectedUpdatedAt)
    .select("updated_at")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("CONFLICT");
  return data.updated_at;
}

export async function addGuestRow(eventId: string, guest: StoredGuest): Promise<string> {
  const { data, error } = await supabase
    .from("guests")
    .insert({
      event_id: eventId,
      legacy_id: guest.id,
      name: guest.name,
      status: guest.status,
      invite_virtual: guest.virtual,
      invite_physical: guest.physical,
      invite_personal: guest.personal,
      is_child: guest.child,
      is_primary: false,
    })
    .select("updated_at")
    .single();
  if (error) throw error;
  return data.updated_at;
}

export type FamilyInvite = { physical: boolean; physicalAt: string; virtual: boolean; virtualAt: string; deadline: string };

export async function deleteGuest(eventId: string, legacyId: number) {
  const { error } = await supabase
    .from("guests")
    .delete()
    .eq("event_id", eventId)
    .eq("legacy_id", legacyId);
  if (error) throw error;
}

export async function loadFamilyInvites(eventId: string): Promise<Record<string, FamilyInvite>> {
  const { data } = await supabase
    .from("families")
    .select("name, invite_physical, invite_physical_at, invite_virtual, invite_virtual_at, rsvp_deadline")
    .eq("event_id", eventId);
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

export async function saveFamilyInvite(eventId: string, name: string, invite: FamilyInvite) {
  if (!name) return;
  await supabase
    .from("families")
    .upsert(
      {
        name,
        event_id: eventId,
        invite_physical: invite.physical,
        invite_physical_at: invite.physicalAt || null,
        invite_virtual: invite.virtual,
        invite_virtual_at: invite.virtualAt || null,
        rsvp_deadline: invite.deadline || null,
      },
      { onConflict: "event_id,name" },
    );
}
