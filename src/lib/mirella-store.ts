import { supabase } from "@/integrations/supabase/client";

const ROW_ID = "mirella15";

export type MirellaState<T, G> = { tasks?: T[]; guests?: G[] };

export async function loadMirellaState<T, G>(): Promise<MirellaState<T, G> | null> {
  const { data, error } = await supabase.from("app_state").select("data").eq("id", ROW_ID).maybeSingle();
  if (error || !data) return null;
  return (data.data ?? null) as MirellaState<T, G> | null;
}

export async function saveMirellaState<T, G>(state: MirellaState<T, G>) {
  const { error } = await supabase
    .from("app_state")
    .upsert({ id: ROW_ID, data: state as never, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) throw error;
}
