import { useMemo, useState } from "react";
import { AlertTriangle, Check, Layers, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePayers, type Installment, type NewInstallment } from "@/lib/mirella-installments";

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fieldClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-xs";

function formatDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  return value || "sem data";
}

const todayISO = () => new Date().toISOString().slice(0, 10);

function addPeriod(iso: string, index: number, frequency: "mensal" | "quinzenal" | "semanal") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [year, month, day] = iso.split("-").map(Number) as [number, number, number];
  if (frequency === "mensal") {
    const target = new Date(Date.UTC(year, month - 1 + index, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(day, lastDay));
    return target.toISOString().slice(0, 10);
  }
  const step = frequency === "quinzenal" ? 15 : 7;
  const target = new Date(Date.UTC(year, month - 1, day + index * step));
  return target.toISOString().slice(0, 10);
}

type Draft = { label: string; amount: number; due: string };

function buildPlan(input: {
  total: number;
  entrada: number;
  entradaDue: string;
  count: number;
  firstDue: string;
  frequency: "mensal" | "quinzenal" | "semanal";
}): Draft[] {
  const drafts: Draft[] = [];
  if (input.entrada > 0) drafts.push({ label: "Entrada", amount: round2(input.entrada), due: input.entradaDue || input.firstDue });
  const rest = Math.max(0, input.total - input.entrada);
  const count = Math.max(0, Math.floor(input.count));
  if (count > 0 && rest > 0) {
    const base = round2(Math.floor((rest * 100) / count) / 100);
    for (let index = 0; index < count; index += 1) {
      const amount = index === count - 1 ? round2(rest - base * (count - 1)) : base;
      drafts.push({ label: `Parcela ${index + 1}/${count}`, amount, due: addPeriod(input.firstDue, index, input.frequency) });
    }
  }
  return drafts;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

type Props = {
  parent: { supplierId?: string; expenseId?: string };
  items: Installment[];
  onCreate: (values: NewInstallment) => void;
  onCreateMany: (list: Draft[]) => void;
  onSettle: (item: Installment, paidAt: string, payer: string) => void;
  onReopen: (item: Installment) => void;
  onRemove: (item: Installment) => void;
};

export function InstallmentsPanel({ parent, items, onCreate, onCreateMany, onSettle, onReopen, onRemove }: Props) {
  const { names, add } = usePayers();
  const [mode, setMode] = useState<"none" | "single" | "plan">("none");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");
  const [settling, setSettling] = useState<string | null>(null);
  const [paidAt, setPaidAt] = useState(todayISO());
  const [payer, setPayer] = useState("");
  const [newPayer, setNewPayer] = useState("");

  // plano de pagamento
  const [planTotal, setPlanTotal] = useState("");
  const [planEntrada, setPlanEntrada] = useState("");
  const [planEntradaDue, setPlanEntradaDue] = useState(todayISO());
  const [planCount, setPlanCount] = useState("3");
  const [planFirstDue, setPlanFirstDue] = useState(todayISO());
  const [planFrequency, setPlanFrequency] = useState<"mensal" | "quinzenal" | "semanal">("mensal");

  const preview = useMemo(() => buildPlan({
    total: Number(planTotal) || 0,
    entrada: Number(planEntrada) || 0,
    entradaDue: planEntradaDue,
    count: Number(planCount) || 0,
    firstDue: planFirstDue,
    frequency: planFrequency,
  }), [planTotal, planEntrada, planEntradaDue, planCount, planFirstDue, planFrequency]);

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const settled = items.filter((item) => item.paid).reduce((sum, item) => sum + item.amount, 0);
  const open = round2(total - settled);
  const today = todayISO();
  const overdue = items.filter((item) => !item.paid && item.due && item.due < today);
  const overdueTotal = overdue.reduce((sum, item) => sum + item.amount, 0);
  const nextDue = items.filter((item) => !item.paid && item.due && item.due >= today).sort((a, b) => a.due.localeCompare(b.due))[0];
  const progress = total > 0 ? Math.min(100, Math.round((settled / total) * 100)) : 0;

  const submitNew = () => {
    const value = Number(amount);
    if (!value) return;
    onCreate({ ...parent, label: label.trim(), amount: value, due });
    setLabel(""); setAmount(""); setDue(""); setMode("none");
  };

  const submitPlan = () => {
    if (preview.length === 0) return;
    onCreateMany(preview);
    setPlanTotal(""); setPlanEntrada(""); setMode("none");
  };

  const confirmSettle = async (item: Installment) => {
    const chosen = payer === "__novo__" ? newPayer.trim() : payer.trim();
    if (!chosen) return;
    if (payer === "__novo__") await add(chosen);
    onSettle(item, paidAt, chosen);
    setSettling(null); setPayer(""); setNewPayer("");
  };

  return (
    <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Prestações</div>
          {items.length > 0 && (
            <div className="mt-0.5 text-[11px] text-muted-foreground">{money(settled)} pagos de {money(total)} · {progress}%</div>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" onClick={() => setMode(mode === "plan" ? "none" : "plan")}><Layers className="size-3.5" />Plano</Button>
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" onClick={() => setMode(mode === "single" ? "none" : "single")}><Plus className="size-3.5" />Parcela</Button>
        </div>
      </div>

      {items.length > 0 && (
        <>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Pago" value={money(settled)} />
            <Stat label="Em aberto" value={money(open)} />
            <Stat label="Atrasado" value={money(overdueTotal)} tone={overdueTotal > 0 ? "danger" : undefined} />
            <Stat label="Próximo venc." value={nextDue ? formatDate(nextDue.due) : "—"} />
          </div>
        </>
      )}

      {mode === "single" && (
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Descrição (opcional)" className="h-9 text-xs" />
          <Input type="number" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Valor (R$)" className="h-9 text-xs" />
          <Input type="date" value={due} onChange={(event) => setDue(event.target.value)} className="h-9 text-xs" />
          <div className="flex gap-2">
            <Button size="sm" className="h-9 flex-1 text-xs" onClick={submitNew}>Adicionar</Button>
            <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => setMode("none")}>Cancelar</Button>
          </div>
        </div>
      )}

      {mode === "plan" && (
        <div className="mt-3 rounded-md border border-border bg-background p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Plano de pagamento</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <label className="text-[10px] text-muted-foreground">Valor total (R$)
              <Input type="number" inputMode="decimal" value={planTotal} onChange={(event) => setPlanTotal(event.target.value)} placeholder="0,00" className="mt-1 h-9 text-xs" />
            </label>
            <label className="text-[10px] text-muted-foreground">Entrada (R$) — opcional
              <Input type="number" inputMode="decimal" value={planEntrada} onChange={(event) => setPlanEntrada(event.target.value)} placeholder="0,00" className="mt-1 h-9 text-xs" />
            </label>
            <label className="text-[10px] text-muted-foreground">Vencimento da entrada
              <Input type="date" value={planEntradaDue} onChange={(event) => setPlanEntradaDue(event.target.value)} className="mt-1 h-9 text-xs" />
            </label>
            <label className="text-[10px] text-muted-foreground">Nº de parcelas
              <Input type="number" inputMode="numeric" min={1} value={planCount} onChange={(event) => setPlanCount(event.target.value)} className="mt-1 h-9 text-xs" />
            </label>
            <label className="text-[10px] text-muted-foreground">1º vencimento
              <Input type="date" value={planFirstDue} onChange={(event) => setPlanFirstDue(event.target.value)} className="mt-1 h-9 text-xs" />
            </label>
            <label className="text-[10px] text-muted-foreground">Frequência
              <select value={planFrequency} onChange={(event) => setPlanFrequency(event.target.value as typeof planFrequency)} className={`mt-1 ${fieldClass}`}>
                <option value="mensal">Mensal</option>
                <option value="quinzenal">Quinzenal</option>
                <option value="semanal">Semanal</option>
              </select>
            </label>
          </div>

          {preview.length > 0 && (
            <ul className="mt-3 space-y-1 rounded-md border border-dashed border-border p-2">
              {preview.map((draft, index) => (
                <li key={`${draft.label}-${index}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                  <span className="font-medium">{draft.label}</span>
                  <span className="font-semibold">{money(draft.amount)}</span>
                  <span className="text-muted-foreground">vence {formatDate(draft.due)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" className="h-9 text-xs" disabled={preview.length === 0} onClick={submitPlan}>Gerar {preview.length || ""} prestações</Button>
            <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => setMode("none")}>Cancelar</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="mt-2 text-[11px] text-muted-foreground">Nenhuma prestação cadastrada.</div>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => {
            const late = !item.paid && Boolean(item.due) && item.due < today;
            return (
            <li key={item.id} className={`rounded-md border bg-background p-2.5 ${late ? "border-destructive/50" : "border-border"}`}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className="font-medium">{item.label || `Parcela ${item.seq}`}</span>
                <span className="font-semibold">{money(item.amount)}</span>
                <span className="text-muted-foreground">vence {formatDate(item.due)}</span>
                {item.paid
                  ? <Badge variant="secondary" className="text-[10px]">Pago em {formatDate(item.paidAt)} · {item.payer || "sem pagante"}</Badge>
                  : late
                    ? <Badge variant="destructive" className="gap-1 text-[10px]"><AlertTriangle className="size-3" />Atrasada</Badge>
                    : <Badge variant="outline" className="text-[10px]">Em aberto</Badge>}
                <div className="ml-auto flex shrink-0 gap-1">
                  {item.paid
                    ? <Button size="icon" variant="ghost" className="size-7" aria-label="Reabrir parcela" onClick={() => onReopen(item)}><RotateCcw className="size-3.5" /></Button>
                    : <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => { setSettling(item.id); setPayer(names[0] ?? "__novo__"); }}><Check className="size-3.5" />Dar baixa</Button>}
                  <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-destructive" aria-label="Excluir parcela" onClick={() => onRemove(item)}><Trash2 className="size-3.5" /></Button>
                </div>
              </div>

              {settling === item.id && (
                <div className="mt-2 grid gap-2 border-t border-border pt-2 sm:grid-cols-4">
                  <label className="text-[10px] text-muted-foreground">Data do pagamento
                    <Input type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} className="mt-1 h-9 text-xs" />
                  </label>
                  <label className="text-[10px] text-muted-foreground">Quem pagou
                    <select value={payer} onChange={(event) => setPayer(event.target.value)} className={`mt-1 ${fieldClass}`}>
                      {names.map((name) => <option key={name} value={name}>{name}</option>)}
                      <option value="__novo__">+ Novo pagante…</option>
                    </select>
                  </label>
                  {payer === "__novo__" && (
                    <label className="text-[10px] text-muted-foreground">Nome do pagante
                      <Input autoFocus value={newPayer} onChange={(event) => setNewPayer(event.target.value)} placeholder="Ex.: Vovó Ana" className="mt-1 h-9 text-xs" />
                    </label>
                  )}
                  <div className="flex items-end gap-2">
                    <Button size="sm" className="h-9 flex-1 text-xs" onClick={() => void confirmSettle(item)}>Confirmar baixa</Button>
                    <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => setSettling(null)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </li>
          );})}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "danger" | undefined }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-background px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`truncate text-xs font-semibold ${tone === "danger" ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}
