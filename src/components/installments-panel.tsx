import { useState } from "react";
import { Check, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePayers, type Installment, type NewInstallment } from "@/lib/mirella-installments";

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fieldClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-xs";

function formatDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  return value || "sem data";
}

type Props = {
  parent: { supplierId?: string; expenseId?: string };
  items: Installment[];
  onCreate: (values: NewInstallment) => void;
  onSettle: (item: Installment, paidAt: string, payer: string) => void;
  onReopen: (item: Installment) => void;
  onRemove: (item: Installment) => void;
};

export function InstallmentsPanel({ parent, items, onCreate, onSettle, onReopen, onRemove }: Props) {
  const { names, add } = usePayers();
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");
  const [settling, setSettling] = useState<string | null>(null);
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [payer, setPayer] = useState("");
  const [newPayer, setNewPayer] = useState("");

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const settled = items.filter((item) => item.paid).reduce((sum, item) => sum + item.amount, 0);

  const submitNew = () => {
    const value = Number(amount);
    if (!value) return;
    onCreate({ ...parent, label: label.trim(), amount: value, due });
    setLabel(""); setAmount(""); setDue(""); setShowForm(false);
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
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Prestações {items.length > 0 && <span className="font-normal normal-case tracking-normal">· {money(settled)} de {money(total)} pagos</span>}
        </div>
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" onClick={() => setShowForm((open) => !open)}><Plus className="size-3.5" />Parcela</Button>
      </div>

      {showForm && (
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Descrição (opcional)" className="h-9 text-xs" />
          <Input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Valor (R$)" className="h-9 text-xs" />
          <Input type="date" value={due} onChange={(event) => setDue(event.target.value)} className="h-9 text-xs" />
          <div className="flex gap-2">
            <Button size="sm" className="h-9 text-xs" onClick={submitNew}>Adicionar</Button>
            <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="mt-2 text-[11px] text-muted-foreground">Nenhuma prestação cadastrada.</div>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-md border border-border bg-background p-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-medium">{item.label || `Parcela ${item.seq}`}</span>
                <span className="font-semibold">{money(item.amount)}</span>
                <span className="text-muted-foreground">vence {formatDate(item.due)}</span>
                {item.paid
                  ? <Badge variant="secondary" className="text-[10px]">Pago em {formatDate(item.paidAt)} · {item.payer || "sem pagante"}</Badge>
                  : <Badge variant="outline" className="text-[10px]">Em aberto</Badge>}
                <div className="ml-auto flex gap-1">
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
                    <Button size="sm" className="h-9 text-xs" onClick={() => void confirmSettle(item)}>Confirmar baixa</Button>
                    <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => setSettling(null)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
