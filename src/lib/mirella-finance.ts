import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Supplier = {
  id: string;
  name: string;
  category: string;
  contact: string;
  status: string;
  value: number;
  paid: number;
  due: string;
  notes: string;
};

export type Expense = {
  id: string;
  name: string;
  description: string;
  planned: number;
  paid: number;
  due: string;
  status: string;
};

export const supplierStatuses = ["Orçamento", "Em negociação", "Contratado", "A contratar"];
export const expenseStatuses = ["Pendente", "Parcial", "Pago"];

export function useSuppliers() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from("suppliers").select("*").order("created_at", { ascending: true });
    setItems((data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category ?? "",
      contact: row.contact ?? "",
      status: row.status,
      value: Number(row.value ?? 0),
      paid: Number(row.paid ?? 0),
      due: row.due ?? "",
      notes: row.notes ?? "",
    })));
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const create = useCallback(async (values: Omit<Supplier, "id">) => {
    await supabase.from("suppliers").insert(values);
    await refresh();
  }, [refresh]);

  const update = useCallback(async (id: string, values: Omit<Supplier, "id">) => {
    await supabase.from("suppliers").update(values).eq("id", id);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await supabase.from("suppliers").delete().eq("id", id);
    await refresh();
  }, [refresh]);

  return { items, loading, create, update, remove };
}

export function useExpenses() {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from("expenses").select("*").order("created_at", { ascending: true });
    setItems((data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      planned: Number(row.planned ?? 0),
      paid: Number(row.paid ?? 0),
      due: row.due ?? "",
      status: row.status,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const create = useCallback(async (values: Omit<Expense, "id">) => {
    await supabase.from("expenses").insert(values);
    await refresh();
  }, [refresh]);

  const update = useCallback(async (id: string, values: Omit<Expense, "id">) => {
    await supabase.from("expenses").update(values).eq("id", id);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await supabase.from("expenses").delete().eq("id", id);
    await refresh();
  }, [refresh]);

  return { items, loading, create, update, remove };
}
