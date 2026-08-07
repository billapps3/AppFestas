import type { Installment } from "./mirella-installments";

export type Totals = {
  planned: number;
  paid: number;
  remaining: number;
  scheduled: number;
  openParcels: number;
  overdue: number;
  hasParcels: boolean;
  unplanned: boolean;
};

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Fonte da verdade financeira: o previsto nunca pode ser menor do que o que já
 * foi contratado em parcelas. Se o contrato não tem valor informado, o plano de
 * parcelas define o previsto — assim "falta pagar" nunca fica negativo.
 */
export function computeTotals(record: { planned?: number; value?: number; paid?: number }, parcels: Installment[]): Totals {
  const declared = Number(record.planned ?? record.value ?? 0) || 0;
  const scheduled = parcels.reduce((sum, item) => sum + item.amount, 0);
  const paidParcels = parcels.filter((item) => item.paid).reduce((sum, item) => sum + item.amount, 0);
  const hasParcels = parcels.length > 0;
  const paid = hasParcels ? Math.max(paidParcels, 0) : Number(record.paid ?? 0) || 0;
  const planned = Math.max(declared, scheduled, paid);
  const remaining = Math.max(planned - paid, 0);
  const limit = today();
  const overdue = parcels.filter((item) => !item.paid && item.due && item.due < limit).reduce((sum, item) => sum + item.amount, 0);
  return {
    planned,
    paid,
    remaining,
    scheduled,
    openParcels: Math.max(scheduled - paidParcels, 0),
    overdue,
    hasParcels,
    unplanned: declared === 0 && (scheduled > 0 || paid > 0),
  };
}

export function sumTotals(list: Totals[]): Totals {
  return list.reduce<Totals>((acc, item) => ({
    planned: acc.planned + item.planned,
    paid: acc.paid + item.paid,
    remaining: acc.remaining + item.remaining,
    scheduled: acc.scheduled + item.scheduled,
    openParcels: acc.openParcels + item.openParcels,
    overdue: acc.overdue + item.overdue,
    hasParcels: acc.hasParcels || item.hasParcels,
    unplanned: acc.unplanned || item.unplanned,
  }), { planned: 0, paid: 0, remaining: 0, scheduled: 0, openParcels: 0, overdue: 0, hasParcels: false, unplanned: false });
}
