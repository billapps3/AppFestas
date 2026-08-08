import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { activeEventId } from "@/lib/active-event";

export type Installment = {
  id: string;
  supplierId: string | null;
  expenseId: string | null;
  seq: number;
  label: string;
  amount: number;
  due: string;
  paid: boolean;
  paidAt: string;
  payer: string;
};

export type NewInstallment = {
  supplierId?: string | null;
  expenseId?: string | null;
  label: string;
  amount: number;
  due: string;
};

function mapRow(row: {
  id: string;
  supplier_id: string | null;
  expense_id: string | null;
  seq: number | null;
  label: string | null;
  amount: number | string | null;
  due: string | null;
  paid: boolean | null;
  paid_at: string | null;
  payer: string | null;
}): Installment {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    expenseId: row.expense_id,
    seq: row.seq ?? 1,
    label: row.label ?? "",
    amount: Number(row.amount ?? 0),
    due: row.due ?? "",
    paid: row.paid ?? false,
    paidAt: row.paid_at ?? "",
    payer: row.payer ?? "",
  };
}

export function useInstallments() {
  const [items, setItems] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from("installments").select("*").eq("event_id", activeEventId()).order("seq", { ascending: true });
    setItems((data ?? []).map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const forSupplier = useCallback((id: string) => items.filter((item) => item.supplierId === id), [items]);
  const forExpense = useCallback((id: string) => items.filter((item) => item.expenseId === id), [items]);

  const syncParentPaid = useCallback(async (parent: { supplierId?: string | null; expenseId?: string | null }) => {
    const column = parent.supplierId ? "supplier_id" : "expense_id";
    const value = parent.supplierId ?? parent.expenseId;
    if (!value) return;
    const { data } = await supabase.from("installments").select("amount, paid").eq(column, value);
    const total = (data ?? []).filter((row) => row.paid).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    if (!data || data.length === 0) return;
    if (parent.supplierId) await supabase.from("suppliers").update({ paid: total }).eq("id", parent.supplierId);
    else await supabase.from("expenses").update({ paid: total }).eq("id", parent.expenseId!);
  }, []);

  const create = useCallback(async (values: NewInstallment) => {
    const siblings = values.supplierId
      ? items.filter((item) => item.supplierId === values.supplierId)
      : items.filter((item) => item.expenseId === values.expenseId);
    const seq = siblings.reduce((max, item) => Math.max(max, item.seq), 0) + 1;
    await supabase.from("installments").insert({
      event_id: activeEventId(),
      supplier_id: values.supplierId ?? null,
      expense_id: values.expenseId ?? null,
      seq,
      label: values.label || `Parcela ${seq}`,
      amount: values.amount,
      due: values.due || null,
    });
    await refresh();
  }, [items, refresh]);

  const createMany = useCallback(async (parent: { supplierId?: string | null; expenseId?: string | null }, list: Array<{ label: string; amount: number; due: string }>) => {
    if (list.length === 0) return;
    const siblings = parent.supplierId
      ? items.filter((item) => item.supplierId === parent.supplierId)
      : items.filter((item) => item.expenseId === parent.expenseId);
    let seq = siblings.reduce((max, item) => Math.max(max, item.seq), 0);
    const rows = list.map((entry) => {
      seq += 1;
      return {
        event_id: activeEventId(),
        supplier_id: parent.supplierId ?? null,
        expense_id: parent.expenseId ?? null,
        seq,
        label: entry.label || `Parcela ${seq}`,
        amount: entry.amount,
        due: entry.due || null,
      };
    });
    await supabase.from("installments").insert(rows);
    await refresh();
  }, [items, refresh]);

  const settle = useCallback(async (item: Installment, paidAt: string, payer: string) => {
    await supabase.from("installments").update({ paid: true, paid_at: paidAt || null, payer: payer || null }).eq("id", item.id);
    await syncParentPaid(item);
    await refresh();
  }, [refresh, syncParentPaid]);

  const reopen = useCallback(async (item: Installment) => {
    await supabase.from("installments").update({ paid: false, paid_at: null, payer: null }).eq("id", item.id);
    await syncParentPaid(item);
    await refresh();
  }, [refresh, syncParentPaid]);

  const remove = useCallback(async (item: Installment) => {
    await supabase.from("installments").delete().eq("id", item.id);
    await syncParentPaid(item);
    await refresh();
  }, [refresh, syncParentPaid]);

  return { items, loading, forSupplier, forExpense, create, createMany, settle, reopen, remove, refresh };
}

export function usePayers() {
  const [names, setNames] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from("payers").select("name").eq("event_id", activeEventId()).order("name", { ascending: true });
    setNames((data ?? []).map((row) => row.name));
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const add = useCallback(async (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    await supabase.from("payers").upsert({ name: clean, event_id: activeEventId() }, { onConflict: "event_id,name" });
    await refresh();
  }, [refresh]);

  return { names, add };
}
