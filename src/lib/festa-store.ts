import { supabase } from "@/integrations/supabase/client";

export const FESTA_STATE_ID = "mirella15";

export type FestaState = { tasks: unknown[]; guests: unknown[] };

export async function loadFestaState(): Promise<FestaState | null> {
  const { data, error } = await supabase
    .from("app_state")
    .select("data")
    .eq("id", FESTA_STATE_ID)
    .maybeSingle();
  if (error || !data) return null;
  const payload = data.data as Partial<FestaState> | null;
  if (!payload || !Array.isArray(payload.tasks) || !Array.isArray(payload.guests)) return null;
  return { tasks: payload.tasks, guests: payload.guests };
}

export async function saveFestaState(state: FestaState): Promise<void> {
  const { error } = await supabase
    .from("app_state")
    .upsert({ id: FESTA_STATE_ID, data: state as never, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) console.error("[festa] falha ao salvar", error.message);
}
