import { supabase } from "@/integrations/supabase/client";

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
  physical: boolean;
  personal: boolean;
  child: boolean;
  family: string;
  host: string;
};

export type MirellaState = { tasks: StoredTask[]; guests: StoredGuest[] };

async function nameMap(table: "families" | "hosts") {
  const { data } = await supabase.from(table).select("id, name");
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
    supabase.from("guests").select("*").order("legacy_id", { ascending: true }),
    supabase.from("tasks").select("*").order("legacy_id", { ascending: true }),
  ]);
  if (guestsRes.error || tasksRes.error) return null;

  const guests: StoredGuest[] = (guestsRes.data ?? []).map((row) => ({
    id: row.legacy_id ?? 0,
    name: row.name,
    age: row.age ?? undefined,
    phone: row.phone ?? undefined,
    status: row.status,
    virtual: row.invite_virtual,
    physical: row.invite_physical,
    personal: row.invite_personal,
    child: row.is_child ?? false,
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
    await supabase.from(table).upsert(missing.map((name) => ({ name })), { onConflict: "name" });
    return (await nameMap(table)).byName;
  }
  return existing.byName;
}

export async function saveMirellaState(state: MirellaState) {
  const { tasks, guests } = state;
  if (!guests.length) return; // nunca sobrescreve com lista vazia

  const familyIds = await ensureNames("families", [...new Set(guests.map((guest) => guest.family))]);
  const hostIds = await ensureNames("hosts", [...new Set(guests.map((guest) => guest.host))]);

  const guestRows = guests.map((guest) => ({
    legacy_id: guest.id,
    name: guest.name,
    phone: guest.phone ?? null,
    age: guest.age ?? null,
    is_child: guest.child,
    status: guest.status,
    invite_virtual: guest.virtual,
    invite_physical: guest.physical,
    invite_personal: guest.personal,
    is_primary: Boolean(guest.family) && guest.family === guest.name,
    family_id: guest.family ? familyIds.get(guest.family) ?? null : null,
    host_id: guest.host ? hostIds.get(guest.host) ?? null : null,
  }));

  const { error: guestError } = await supabase.from("guests").upsert(guestRows, { onConflict: "legacy_id" });
  if (guestError) throw guestError;

  if (tasks.length) {
    const { error: taskError } = await supabase.from("tasks").upsert(
      tasks.map((task) => ({
        legacy_id: task.id,
        name: task.name,
        area: task.area,
        owner: task.owner,
        due: task.due,
        status: task.status,
        priority: task.priority,
        parent_legacy_id: task.parent ?? null,
      })),
      { onConflict: "legacy_id" },
    );
    if (taskError) throw taskError;
    await supabase
      .from("tasks")
      .delete()
      .not("legacy_id", "in", `(${tasks.map((task) => task.id).join(",")})`);
  }
}
