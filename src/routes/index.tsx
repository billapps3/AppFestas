import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { importedGuests } from "@/lib/mirella-guests";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Download,
  Gift,
  Heart,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  PackageCheck,
  PanelLeftClose,
  Plus,
  Search,
  Send,
  Baby,
  Sparkles,
  Store,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mirella 15 — Organização da festa" },
      { name: "description", content: "Painel visual para organizar convidados, tarefas, fornecedores e orçamento do aniversário de 15 anos da Mirella." },
      { property: "og:title", content: "Mirella 15 — Organização da festa" },
      { property: "og:description", content: "Tudo da festa da Mirella em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FestaApp,
});

type View = "overview" | "tasks" | "guests" | "suppliers" | "finance";
type TaskStatus = "Concluído" | "Em andamento" | "Aguardando";
type GuestStatus = "Confirmado" | "Aguardando" | "Não confirmado";

type Task = {
  id: number;
  name: string;
  area: string;
  owner: string;
  due: string;
  status: TaskStatus;
  priority: "Alta" | "Média" | "Baixa";
};

type Guest = {
  id: number;
  name: string;
  age?: number;
  phone?: string;
  status: GuestStatus;
  virtual: boolean;
  physical: boolean;
  personal: boolean;
  family: string;
  host: string;
  child: boolean;
  virtualDate?: string;
  physicalDate?: string;
  confirmDue?: string;
};

const hosts = ["William", "Késya", "Mirella"];
const extraFamilies = ["Mirella Colégio", "Mirella CNA", "Mirella Vôlei", "Mirella Igreja"];
const seedFamilies: Record<number, string> = { 14: "Tio Luiz Carlos Nogueira", 15: "Tio Luiz Carlos Nogueira", 16: "Tio Luiz Carlos Nogueira", 17: "Tio Luiz Carlos Nogueira", 18: "Tio Luiz Carlos Nogueira" };

const taskSeed: Task[] = [
  { id: 1, name: "Definir identidade visual", area: "Preparação", owner: "Mamãe", due: "08 ago", status: "Concluído", priority: "Alta" },
  { id: 2, name: "Lista de convidados", area: "Convidados", owner: "Mamãe", due: "12 ago", status: "Concluído", priority: "Alta" },
  { id: 3, name: "Escolher convite físico", area: "Convites físicos", owner: "Mirella", due: "18 ago", status: "Em andamento", priority: "Alta" },
  { id: 4, name: "Enviar convites virtuais", area: "Convites virtuais", owner: "Mamãe", due: "25 ago", status: "Aguardando", priority: "Alta" },
  { id: 5, name: "Contratar buffet", area: "Fornecedores", owner: "Papai", due: "30 ago", status: "Em andamento", priority: "Alta" },
  { id: 6, name: "Escolher vestido", area: "Produção", owner: "Mirella", due: "05 set", status: "Em andamento", priority: "Média" },
  { id: 7, name: "Produção dos chinelos", area: "Lembranças", owner: "Mamãe", due: "10 set", status: "Aguardando", priority: "Média" },
  { id: 8, name: "Fechar playlist com DJ", area: "Festa", owner: "Mirella", due: "18 set", status: "Aguardando", priority: "Baixa" },
  { id: 9, name: "Prova do vestido", area: "Produção", owner: "Mirella", due: "20 set", status: "Aguardando", priority: "Média" },
  { id: 10, name: "Confirmar decoração", area: "Fornecedores", owner: "Papai", due: "24 set", status: "Aguardando", priority: "Alta" },
];

const guestNames: Guest[] = importedGuests.map((guest, index) => ({
  ...guest,
  status: index < 72 ? "Confirmado" : index < 98 ? "Aguardando" : "Não confirmado",
  virtual: index < 31,
  physical: index < 14,
  personal: index < 6,
  family: seedFamilies[guest.id] ?? "",
  host: "",
  child: (guest.age ?? 99) <= 10,
}));

const suppliers = [
  { name: "Buffet", status: "Em negociação", value: 18500, paid: 5000, due: "30 ago", icon: Gift },
  { name: "Fotógrafo", status: "Contratado", value: 4800, paid: 2400, due: "15 set", icon: Sparkles },
  { name: "DJ", status: "Orçamento", value: 3200, paid: 0, due: "18 set", icon: Send },
  { name: "Decoração", status: "Contratado", value: 12500, paid: 6250, due: "24 set", icon: Sparkles },
  { name: "Vestido", status: "Contratado", value: 7800, paid: 3900, due: "05 set", icon: Heart },
  { name: "Maquiagem", status: "A contratar", value: 1500, paid: 0, due: "28 set", icon: Sparkles },
  { name: "Chinelos", status: "Orçamento", value: 2800, paid: 0, due: "10 set", icon: PackageCheck },
  { name: "Lembrancinhas", status: "A contratar", value: 4200, paid: 0, due: "20 set", icon: Gift },
];

const financeRows = [
  { name: "Buffet", planned: 18500, paid: 5000, due: "30 ago", status: "Parcial" },
  { name: "Vestido", planned: 7800, paid: 3900, due: "05 set", status: "Parcial" },
  { name: "Fotógrafo", planned: 4800, paid: 2400, due: "15 set", status: "Parcial" },
  { name: "DJ", planned: 3200, paid: 0, due: "18 set", status: "Pendente" },
  { name: "Decoração", planned: 12500, paid: 6250, due: "24 set", status: "Parcial" },
  { name: "Doces", planned: 3800, paid: 0, due: "26 set", status: "Pendente" },
];

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "tasks", label: "Tarefas", icon: ClipboardCheck },
  { id: "guests", label: "Convidados", icon: Users },
  { id: "suppliers", label: "Fornecedores", icon: Store },
  { id: "finance", label: "Financeiro", icon: WalletCards },
];

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function FestaApp() {
  const [view, setView] = useState<View>("overview");
  const [tasks, setTasks] = useState(taskSeed);
  const [guests, setGuests] = useState(guestNames);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [newGuest, setNewGuest] = useState("");
  const [hostFilter, setHostFilter] = useState("Todos");
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    const updateCountdown = () => {
      const eventDate = new Date("2026-10-02T20:00:00").getTime();
      setDaysLeft(Math.max(0, Math.ceil((eventDate - Date.now()) / 86400000)));
    };
    updateCountdown();
    const interval = window.setInterval(updateCountdown, 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("mirella15-demo-v3");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { tasks?: Task[]; guests?: Guest[] };
      if (parsed.tasks) setTasks(parsed.tasks);
      if (parsed.guests) setGuests(parsed.guests.map((guest) => ({ ...guest, child: guest.child ?? (guest.age ?? 99) <= 10 })));
    } catch {
      window.localStorage.removeItem("mirella15-demo-v3");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("mirella15-demo-v3", JSON.stringify({ tasks, guests }));
  }, [tasks, guests]);

  const completedTasks = tasks.filter((task) => task.status === "Concluído").length;
  const confirmedGuests = guests.filter((guest) => guest.status === "Confirmado").length;
  const virtualSent = guests.filter((guest) => guest.virtual).length;
  const filteredGuests = useMemo(
    () => guests.filter((guest) => guest.name.toLowerCase().includes(search.toLowerCase()) && (hostFilter === "Todos" || (hostFilter === "Sem responsável" ? !guest.host : guest.host === hostFilter))),
    [guests, search, hostFilter],
  );

  const changeTaskStatus = (id: number) => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status: task.status === "Concluído" ? "Em andamento" : "Concluído" } : task));
  };

  const changeGuestStatus = (id: number, status: GuestStatus) => {
    setGuests((current) => current.map((guest) => guest.id === id ? { ...guest, status } : guest));
  };

  const updateGuest = (id: number, patch: Partial<Guest>) => {
    setGuests((current) => current.map((guest) => guest.id === id ? { ...guest, ...patch } : guest));
  };

  const setFamilyHost = (family: string, host: string) => {
    setGuests((current) => current.map((guest) => guest.family === family ? { ...guest, host } : guest));
  };

  const addGuest = () => {
    const name = newGuest.trim();
    if (!name) return;
    setGuests((current) => [...current, { id: Math.max(0, ...current.map((item) => item.id)) + 1, name, status: "Aguardando", virtual: false, physical: false, personal: false, family: "", host: "", child: false }]);
    setNewGuest("");
    setShowGuestForm(false);
  };

  const selectView = (next: View) => {
    setView(next);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-[252px] flex-col border-r border-border bg-sidebar px-5 py-6 transition-transform duration-200 lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2">
          <button className="flex items-center gap-3 text-left" onClick={() => selectView("overview")} aria-label="Ir para visão geral">
            <span className="grid size-10 place-items-center rounded-full bg-primary font-serif text-xl text-primary-foreground shadow-sm">M</span>
            <span>
              <span className="block font-serif text-[20px] leading-none text-sidebar-foreground">Mirella</span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/55">15 anos</span>
            </span>
          </button>
          <Button size="icon" variant="ghost" className="lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><PanelLeftClose /></Button>
        </div>

        <div className="mt-10 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/45">Organização</div>
        <nav className="mt-3 space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <Button key={id} variant="ghost" onClick={() => selectView(id)} className={`w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-[13px] ${view === id ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "text-sidebar-foreground/65 hover:text-sidebar-foreground"}`}>
              <Icon className="size-[17px]" />{label}
              {id === "tasks" && <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{tasks.length - completedTasks}</span>}
            </Button>
          ))}
        </nav>

        <div className="mt-auto rounded-xl border border-sidebar-border bg-sidebar-accent/45 p-4">
          <div className="flex items-center gap-2 text-sidebar-foreground/70"><CalendarDays className="size-4 text-primary" /><span className="text-xs font-medium">Data da festa</span></div>
          <div className="mt-3 font-serif text-[22px] text-sidebar-foreground">02 outubro 2026</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-sidebar-foreground/50"><Clock3 className="size-3.5" />Faltam {daysLeft} dias</div>
        </div>
        <div className="mt-4 flex items-center gap-3 px-2"><span className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">M</span><div className="min-w-0"><div className="truncate text-xs font-medium text-sidebar-foreground">Mamãe da Mirella</div><div className="text-[11px] text-sidebar-foreground/45">Organizadora</div></div><MoreHorizontal className="ml-auto size-4 text-sidebar-foreground/40" /></div>
      </aside>

      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-md">
          <div className="flex h-[72px] items-center justify-between px-5 sm:px-8 lg:px-10">
            <div className="flex items-center gap-3"><Button size="icon" variant="ghost" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu /></Button><div><div className="text-[11px] font-medium text-muted-foreground">Sexta-feira, 06 de agosto de 2026</div><div className="mt-0.5 font-serif text-[21px]">{view === "overview" ? "Bom dia, mamãe" : navItems.find((item) => item.id === view)?.label}</div></div></div>
            <div className="flex items-center gap-2 sm:gap-4"><Button variant="ghost" size="icon" aria-label="Notificações" className="relative"><Bell /><span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" /></Button><div className="hidden h-7 w-px bg-border sm:block" /><Button variant="outline" size="sm" className="hidden gap-2 sm:inline-flex"><Download />Exportar</Button><span className="grid size-9 place-items-center rounded-full bg-secondary font-serif text-lg text-secondary-foreground">M</span></div>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-5 pb-12 pt-7 sm:px-8 lg:px-10">
          {view === "overview" && <Overview daysLeft={daysLeft} completedTasks={completedTasks} confirmedGuests={confirmedGuests} totalGuests={123} virtualSent={virtualSent} tasks={tasks} guests={guests} onTaskStatus={changeTaskStatus} onView={selectView} />}
          {view === "tasks" && <TasksView tasks={tasks} onTaskStatus={changeTaskStatus} />}
          {view === "guests" && <GuestsView guests={filteredGuests} allGuests={guests} search={search} setSearch={setSearch} hostFilter={hostFilter} setHostFilter={setHostFilter} showForm={showGuestForm} setShowForm={setShowGuestForm} newGuest={newGuest} setNewGuest={setNewGuest} addGuest={addGuest} onStatus={changeGuestStatus} onUpdate={updateGuest} onFamilyHost={setFamilyHost} />}
          {view === "suppliers" && <SuppliersView />}
          {view === "finance" && <FinanceView />}
        </main>
      </div>
    </div>
  );
}

function Overview({ daysLeft, completedTasks, totalGuests, tasks, guests, onTaskStatus, onView }: { daysLeft: number; completedTasks: number; confirmedGuests: number; totalGuests: number; virtualSent: number; tasks: Task[]; guests: Guest[]; onTaskStatus: (id: number) => void; onView: (view: View) => void }) {
  const upcoming = tasks.filter((task) => task.status !== "Concluído").slice(0, 4);
  const [hostFilter, setHostFilter] = useState("Todos");
  const scoped = useMemo(
    () => guests.filter((guest) => (hostFilter === "Todos" ? true : hostFilter === "Sem responsável" ? !guest.host : guest.host === hostFilter)),
    [guests, hostFilter],
  );
  const total = scoped.length;
  const confirmed = scoped.filter((guest) => guest.status === "Confirmado").length;
  const declined = scoped.filter((guest) => guest.status === "Não confirmado").length;
  const waiting = scoped.filter((guest) => guest.status === "Aguardando").length;
  const available = total - declined;
  const children = scoped.filter((guest) => guest.child).length;
  const confirmedChildren = scoped.filter((guest) => guest.child && guest.status === "Confirmado").length;
  const payingConfirmed = confirmed - confirmedChildren;
  const virtual = scoped.filter((guest) => guest.virtual).length;
  return <div className="space-y-8">
    <section className="relative overflow-hidden rounded-2xl bg-primary px-6 py-7 text-primary-foreground shadow-sm sm:px-9 sm:py-9">
      <div className="relative z-10 max-w-2xl"><div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/60"><Sparkles className="size-4" />Contagem regressiva</div><h1 className="font-serif text-[36px] leading-[1.05] sm:text-[48px]">O grande dia está<br className="hidden sm:block" /> chegando, Mirella.</h1><p className="mt-4 max-w-md text-sm leading-6 text-primary-foreground/68">Acompanhe cada detalhe da sua festa de 15 anos e deixe a organização mais leve.</p><div className="mt-7 flex items-end gap-3"><span className="font-serif text-[58px] leading-none sm:text-[68px]">{daysLeft}</span><span className="pb-1 text-sm text-primary-foreground/65">dias até<br />02.10.2026</span></div></div>
      <div className="absolute -right-5 -top-16 size-64 rounded-full border border-primary-foreground/10" /><div className="absolute -right-20 -bottom-36 size-96 rounded-full border border-primary-foreground/10" /><div className="absolute right-10 top-8 hidden h-44 w-44 rotate-12 rounded-full border border-primary-foreground/10 sm:block"><div className="absolute inset-6 rounded-full border border-primary-foreground/10" /></div>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={ClipboardCheck} label="Tarefas concluídas" value={`${completedTasks} / ${tasks.length}`} detail={`${tasks.length - completedTasks} em aberto`} tone="rose" onClick={() => onView("tasks")} />
      <Metric icon={Users} label="Convidados confirmados" value={`${confirmed}`} detail={`de ${total} convidados`} tone="gold" onClick={() => onView("guests")} />
      <Metric icon={WalletCards} label="Saldo a pagar" value={money(34800)} detail="de R$ 50.600 previstos" tone="sage" onClick={() => onView("finance")} />
      <Metric icon={Send} label="Convites virtuais" value={`${virtual} / ${total}`} detail="já enviados" tone="lilac" onClick={() => onView("guests")} />
    </section>

    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading eyebrow="Lista de convidados" title="Números da confirmação" />
        <div className="flex flex-wrap gap-2">
          {["Todos", ...hosts, "Sem responsável"].map((option) => (
            <button
              key={option}
              onClick={() => setHostFilter(option)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${hostFilter === option ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <NumberCard label="Total de convidados" value={total} detail={hostFilter === "Todos" ? "lista completa" : `responsável: ${hostFilter}`} />
        <NumberCard label="Confirmados" value={confirmed} detail={`${payingConfirmed} pagantes · ${confirmedChildren} crianças`} tone="primary" />
        <NumberCard label="Aguardando resposta" value={waiting} detail="ainda sem retorno" />
        <NumberCard label="Declinados" value={declined} detail="não vêm à festa" />
        <NumberCard label="Lista sem os declinados" value={available} detail={`${declined} convites livres para reofertar`} tone="primary" />
        <NumberCard label="Crianças até 10 anos" value={children} detail="marcadas como não pagantes" />
      </div>
    </section>

    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6"><SectionHeading eyebrow="Acompanhe de perto" title="Próximos prazos" action="Ver todas" onClick={() => onView("tasks")} /><div className="mt-6 space-y-1">{upcoming.map((task, index) => <TaskRow key={task.id} task={task} onStatus={onTaskStatus} first={index === 0} />)}</div></section>
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6"><SectionHeading eyebrow="Lista de convidados" title="Como está a confirmação" action="Abrir lista" onClick={() => onView("guests")} /><div className="mt-7 flex items-center gap-7"><div className="relative grid size-36 place-items-center rounded-full" style={{ background: `conic-gradient(var(--primary) ${Math.max(3, (confirmed / totalGuests) * 100)}%, var(--muted) 0)` }}><div className="grid size-[114px] place-items-center rounded-full bg-card"><div className="text-center"><div className="font-serif text-3xl">{Math.round((confirmed / totalGuests) * 100)}%</div><div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">confirmados</div></div></div></div><div className="space-y-3 text-xs"><Legend color="bg-primary" label="Confirmados" value={confirmed} /><Legend color="bg-accent" label="Aguardando" value={guests.filter((guest) => guest.status === "Aguardando").length} /><Legend color="bg-muted-foreground/30" label="Não confirmados" value={guests.filter((guest) => guest.status === "Não confirmado").length} /></div></div><div className="mt-7 border-t border-border pt-4 text-xs text-muted-foreground">A lista original foi importada com <span className="font-semibold text-foreground">123 nomes</span>. Os grupos familiares podem ser completados quando você tiver certeza.</div></section>
    </div>

    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"><section className="rounded-xl border border-border bg-card p-5 sm:p-6"><SectionHeading eyebrow="Orçamento" title="Visão financeira" action="Ver detalhes" onClick={() => onView("finance")} /><div className="mt-7 flex items-end justify-between"><div><div className="text-xs text-muted-foreground">Total previsto</div><div className="mt-1 font-serif text-3xl">R$ 50.600</div></div><div className="text-right"><div className="text-xs text-muted-foreground">Pago até agora</div><div className="mt-1 font-semibold text-primary">R$ 15.800</div></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full w-[31%] rounded-full bg-primary" /></div><div className="mt-3 flex justify-between text-[11px] text-muted-foreground"><span>31% pago</span><span>Falta R$ 34.800</span></div></section><section className="rounded-xl border border-border bg-card p-5 sm:p-6"><SectionHeading eyebrow="Para não esquecer" title="Atenções desta semana" /><div className="mt-5 grid gap-3 sm:grid-cols-3"><Attention icon={Clock3} title="3 prazos próximos" text="Nos próximos 7 dias" /><Attention icon={Store} title="4 fornecedores" text="Ainda sem contrato" /><Attention icon={Send} title="92 convites" text="Ainda não enviados" /></div></section></div>
  </div>;
}

function Metric({ icon: Icon, label, value, detail, tone, onClick }: { icon: typeof Users; label: string; value: string; detail: string; tone: "rose" | "gold" | "sage" | "lilac"; onClick: () => void }) {
  return <button onClick={onClick} className="group rounded-xl border border-border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><span className={`grid size-9 place-items-center rounded-lg metric-${tone}`}><Icon className="size-[17px]" /></span><ArrowUpRight className="size-4 text-muted-foreground/45 transition group-hover:text-primary" /></div><div className="mt-5 text-xs text-muted-foreground">{label}</div><div className="mt-1 font-serif text-[30px] leading-none">{value}</div><div className="mt-2 text-[11px] text-muted-foreground">{detail}</div></button>;
}

function NumberCard({ label, value, detail, tone }: { label: string; value: number; detail: string; tone?: "primary" }) {
  return <div className={`rounded-xl border p-4 ${tone === "primary" ? "border-primary/25 bg-primary/5" : "border-border bg-background"}`}><div className="text-xs text-muted-foreground">{label}</div><div className={`mt-2 font-serif text-3xl leading-none ${tone === "primary" ? "text-primary" : ""}`}>{value}</div><div className="mt-2 text-[11px] text-muted-foreground">{detail}</div></div>;
}

function SectionHeading({ eyebrow, title, action, onClick }: { eyebrow: string; title: string; action?: string; onClick?: () => void }) {
  return <div className="flex items-end justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</div><h2 className="mt-1 font-serif text-[24px]">{title}</h2></div>{action && <Button variant="ghost" size="sm" onClick={onClick} className="gap-1 text-xs text-muted-foreground">{action}<ChevronRight className="size-3.5" /></Button>}</div>;
}

function TaskRow({ task, onStatus, first = false }: { task: Task; onStatus: (id: number) => void; first?: boolean }) {
  return <div className={`flex items-center gap-3 py-3.5 ${!first ? "border-t border-border" : ""}`}><button onClick={() => onStatus(task.id)} aria-label={`Marcar ${task.name}`} className={`grid size-5 shrink-0 place-items-center rounded-full border transition ${task.status === "Concluído" ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"}`}>{task.status === "Concluído" && <Check className="size-3" />}</button><div className="min-w-0 flex-1"><div className={`truncate text-sm font-medium ${task.status === "Concluído" ? "text-muted-foreground line-through" : ""}`}>{task.name}</div><div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground"><span>{task.area}</span><span className="size-1 rounded-full bg-border" /><span>{task.owner}</span></div></div><div className="hidden text-right sm:block"><div className="text-xs font-medium">{task.due}</div><div className={`mt-1 text-[10px] ${task.priority === "Alta" ? "text-primary" : "text-muted-foreground"}`}>{task.priority} prioridade</div></div><Badge variant={task.status === "Concluído" ? "secondary" : task.status === "Em andamento" ? "default" : "outline"} className="hidden text-[10px] font-medium sm:inline-flex">{task.status}</Badge></div>;
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) { return <div className="flex items-center gap-2"><span className={`size-2 rounded-full ${color}`} /><span className="w-24 text-muted-foreground">{label}</span><span className="font-semibold">{value}</span></div>; }
function Attention({ icon: Icon, title, text }: { icon: typeof Clock3; title: string; text: string }) { return <div className="flex items-center gap-3 rounded-lg bg-muted/55 p-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-card text-primary"><Icon className="size-4" /></span><div><div className="text-xs font-semibold">{title}</div><div className="mt-0.5 text-[11px] text-muted-foreground">{text}</div></div></div>; }

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) { return <div className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</div><h1 className="mt-2 font-serif text-[36px] leading-none">{title}</h1><p className="mt-3 max-w-xl text-sm text-muted-foreground">{description}</p></div>{action}</div>; }

function TasksView({ tasks, onTaskStatus }: { tasks: Task[]; onTaskStatus: (id: number) => void }) {
  const [filter, setFilter] = useState("Todas");
  const filtered = filter === "Todas" ? tasks : tasks.filter((task) => task.status === filter);
  return <div className="space-y-7"><PageIntro eyebrow="Planejamento" title="Tarefas" description="Uma visão simples do que já foi feito e do próximo passo da festa." action={<Button><Plus />Nova tarefa</Button>} /><div className="grid gap-4 sm:grid-cols-3"><Metric icon={ClipboardCheck} label="Concluídas" value={`${tasks.filter((task) => task.status === "Concluído").length}`} detail="tarefas finalizadas" tone="rose" onClick={() => setFilter("Concluído")} /><Metric icon={Clock3} label="Em andamento" value={`${tasks.filter((task) => task.status === "Em andamento").length}`} detail="precisam de atenção" tone="gold" onClick={() => setFilter("Em andamento")} /><Metric icon={Bell} label="Aguardando" value={`${tasks.filter((task) => task.status === "Aguardando").length}`} detail="dependem de uma ação" tone="sage" onClick={() => setFilter("Aguardando")} /></div><section className="rounded-xl border border-border bg-card p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-1 rounded-lg bg-muted p-1">{["Todas", "Em andamento", "Aguardando", "Concluído"].map((item) => <Button key={item} size="sm" variant={filter === item ? "default" : "ghost"} onClick={() => setFilter(item)} className="text-xs">{item}</Button>)}</div><span className="text-xs text-muted-foreground">{filtered.length} tarefas exibidas</span></div><div className="mt-5">{filtered.map((task, index) => <TaskRow key={task.id} task={task} onStatus={onTaskStatus} first={index === 0} />)}</div></section></div>;
}

type GuestsViewProps = {
  guests: Guest[];
  allGuests: Guest[];
  search: string;
  setSearch: (value: string) => void;
  hostFilter: string;
  setHostFilter: (value: string) => void;
  showForm: boolean;
  setShowForm: (value: boolean) => void;
  newGuest: string;
  setNewGuest: (value: string) => void;
  addGuest: () => void;
  onStatus: (id: number, status: GuestStatus) => void;
  onUpdate: (id: number, patch: Partial<Guest>) => void;
  onFamilyHost: (family: string, host: string) => void;
};

function GuestsView({ guests, allGuests, search, setSearch, hostFilter, setHostFilter, showForm, setShowForm, newGuest, setNewGuest, addGuest, onStatus, onUpdate, onFamilyHost }: GuestsViewProps) {
  const familyOptions = useMemo(
    () =>
      Array.from(new Set([...extraFamilies, ...allGuests.filter((guest) => guest.family).map((guest) => guest.family)])).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [allGuests],
  );

  const sections = useMemo(() => {
    const groups = [...hosts, "Sem responsável"];
    return groups
      .map((host) => {
        const people = guests.filter((guest) => (host === "Sem responsável" ? !guest.host : guest.host === host));
        const families = Array.from(new Set(people.filter((guest) => guest.family).map((guest) => guest.family)))
          .sort((a, b) => a.localeCompare(b, "pt-BR"))
          .map((family) => ({
            family,
            principal: people.find((guest) => guest.name === family),
            members: people.filter((guest) => guest.family === family && guest.name !== family),
          }));
        const singles = people.filter((guest) => !guest.family);
        return { host, people, families, singles };
      })
      .filter((section) => section.people.length > 0);
  }, [guests]);

  const stats = [
    { label: "Confirmados", value: guests.filter((guest) => guest.status === "Confirmado").length },
    { label: "Aguardando", value: guests.filter((guest) => guest.status === "Aguardando").length },
    { label: "Declinados", value: guests.filter((guest) => guest.status === "Não confirmado").length },
    { label: "Crianças não pagantes", value: guests.filter((guest) => guest.child).length },
  ];

  return (
    <div className="space-y-7">
      <PageIntro
        eyebrow="Pessoas especiais"
        title="Convidados"
        description="A lista está segmentada por responsável pelo convite e agrupada por família. Escolha o responsável de quem ainda estiver sem e confirme pessoa por pessoa."
        action={<Button onClick={() => setShowForm(!showForm)}>{showForm ? <X /> : <Plus />}{showForm ? "Fechar" : "Adicionar convidado"}</Button>}
      />
      {showForm && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row">
          <Input autoFocus value={newGuest} onChange={(event) => setNewGuest(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addGuest()} placeholder="Nome do convidado" />
          <Button onClick={addGuest}>Adicionar</Button>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">{stat.label}</div>
            <div className="mt-2 font-serif text-3xl">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex flex-wrap gap-2">
          {["Todos", ...hosts, "Sem responsável"].map((option) => (
            <button
              key={option}
              onClick={() => setHostFilter(option)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${hostFilter === option ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Buscar nome..." />
        </div>
      </div>

      {sections.map((section) => (
        <section key={section.host} className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border bg-muted/30 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Responsável pelos convites</div>
              <h2 className="mt-1 font-serif text-2xl">{section.host}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <Badge variant="secondary" className="text-[10px]">{section.people.length} convidados</Badge>
              <Badge variant="outline" className="text-[10px]">{section.people.filter((guest) => guest.status === "Confirmado").length} confirmados</Badge>
              <Badge variant="outline" className="text-[10px]">{section.families.length} famílias</Badge>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            {section.families.map(({ family, principal, members }) => (
              <div key={family} className="rounded-xl border border-primary/20 bg-primary/[0.04]">
                <div className="flex flex-col gap-3 border-b border-primary/15 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-primary">Família · principal</div>
                    <div className="mt-1 font-medium">{family}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{members.length} dependente(s) · {[principal, ...members].filter((guest) => guest?.status === "Confirmado").length} confirmado(s)</div>
                  </div>
                  <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    Responsável da família
                    <select
                      aria-label={`Responsável da família ${family}`}
                      value={principal?.host ?? section.people.find((guest) => guest.family === family)?.host ?? ""}
                      onChange={(event) => onFamilyHost(family, event.target.value)}
                      className="rounded-md border border-border bg-background px-2 py-1.5 text-[11px] font-medium text-foreground outline-none"
                    >
                      <option value="">Sem responsável</option>
                      {hosts.map((host) => <option key={host} value={host}>{host}</option>)}
                    </select>
                  </label>
                </div>
                <div className="divide-y divide-border">
                  {principal && <GuestRow guest={principal} isPrincipal families={familyOptions} onStatus={onStatus} onUpdate={onUpdate} />}
                  {members.map((guest) => <GuestRow key={guest.id} guest={guest} families={familyOptions} onStatus={onStatus} onUpdate={onUpdate} />)}
                </div>
              </div>
            ))}

            {section.singles.length > 0 && (
              <div className="rounded-xl border border-border">
                <div className="border-b border-border px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground">Convidados individuais</div>
                <div className="divide-y divide-border">
                  {section.singles.map((guest) => <GuestRow key={guest.id} guest={guest} families={familyOptions} onStatus={onStatus} onUpdate={onUpdate} />)}
                </div>
              </div>
            )}
          </div>
        </section>
      ))}

      {sections.length === 0 && <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Nenhum convidado encontrado com esses filtros.</div>}
    </div>
  );
}

function GuestRow({ guest, isPrincipal, families, onStatus, onUpdate }: { guest: Guest; isPrincipal?: boolean; families: string[]; onStatus: (id: number, status: GuestStatus) => void; onUpdate: (id: number, patch: Partial<Guest>) => void }) {
  return (
    <div className="flex flex-col gap-3 p-4 transition hover:bg-muted/25 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${isPrincipal ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{guest.name.charAt(0)}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{guest.name}</span>
            {guest.age && <span className="text-xs text-muted-foreground">({guest.age} anos)</span>}
            {isPrincipal && <Badge className="text-[9px]">Principal</Badge>}
            {guest.child && <Badge variant="secondary" className="text-[9px]">Criança · não pagante</Badge>}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">#{String(guest.id).padStart(3, "0")}{guest.phone && ` · ${guest.phone}`}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          <button onClick={() => onUpdate(guest.id, { virtual: !guest.virtual })} title="Convite virtual enviado" aria-label={`Convite virtual de ${guest.name}`} className={`grid size-7 place-items-center rounded-md ${guest.virtual ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/40"}`}><Send className="size-3" /></button>
          <button onClick={() => onUpdate(guest.id, { physical: !guest.physical })} title="Convite físico entregue" aria-label={`Convite físico de ${guest.name}`} className={`grid size-7 place-items-center rounded-md ${guest.physical ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground/40"}`}><Gift className="size-3" /></button>
          <button onClick={() => onUpdate(guest.id, { child: !guest.child })} title="Criança até 10 anos (não pagante)" aria-label={`Criança não pagante: ${guest.name}`} className={`grid size-7 place-items-center rounded-md ${guest.child ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/40"}`}><Baby className="size-3" /></button>
        </div>

        <select
          aria-label={`Família de ${guest.name}`}
          value={guest.family}
          onChange={(event) => onUpdate(guest.id, { family: event.target.value === "__self" ? guest.name : event.target.value })}
          className="max-w-[190px] rounded-md border border-border bg-background px-2 py-1.5 text-[11px] outline-none"
        >
          <option value="">Sem família</option>
          <option value="__self">Tornar principal de família</option>
          {families.map((family) => <option key={family} value={family}>{family}</option>)}
        </select>

        <select
          aria-label={`Responsável por ${guest.name}`}
          value={guest.host}
          onChange={(event) => onUpdate(guest.id, { host: event.target.value })}
          className={`rounded-md border px-2 py-1.5 text-[11px] font-medium outline-none ${guest.host ? "border-border bg-background" : "border-dashed border-primary/50 bg-primary/5 text-primary"}`}
        >
          <option value="">Escolher responsável</option>
          {hosts.map((host) => <option key={host} value={host}>{host}</option>)}
        </select>

        <GuestStatusSelect guest={guest} onStatus={onStatus} />
      </div>
    </div>
  );
}

function GuestStatusSelect({ guest, onStatus }: { guest: Guest; onStatus: (id: number, status: GuestStatus) => void }) {
  return (
    <select
      aria-label={`Confirmação de ${guest.name}`}
      value={guest.status}
      onChange={(event) => onStatus(guest.id, event.target.value as GuestStatus)}
      className={`rounded-md border px-2 py-1.5 text-[11px] font-medium outline-none ${guest.status === "Confirmado" ? "border-primary/20 bg-primary/10 text-primary" : guest.status === "Aguardando" ? "border-accent bg-accent text-accent-foreground" : "border-border bg-muted text-muted-foreground"}`}
    >
      <option>Confirmado</option>
      <option>Aguardando</option>
      <option>Não confirmado</option>
    </select>
  );
}

function SuppliersView() { return <div className="space-y-7"><PageIntro eyebrow="Parceiros da festa" title="Fornecedores" description="Acompanhe contratos, valores e o que ainda precisa ser fechado." action={<Button><Plus />Adicionar fornecedor</Button>} /><div className="grid gap-4 sm:grid-cols-3"><Metric icon={Store} label="Contratados" value="3" detail="de 8 fornecedores" tone="rose" onClick={() => undefined} /><Metric icon={CircleDollarSign} label="Valor contratado" value="R$ 49.100" detail="soma dos contratos" tone="gold" onClick={() => undefined} /><Metric icon={Clock3} label="A contratar" value="4" detail="precisam de orçamento" tone="sage" onClick={() => undefined} /></div><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{suppliers.map(({ name, status, value, paid, due, icon: Icon }) => <div key={name} className="rounded-xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><span className="grid size-9 place-items-center rounded-lg bg-secondary text-secondary-foreground"><Icon className="size-4" /></span><MoreHorizontal className="size-4 text-muted-foreground" /></div><div className="mt-5 font-medium">{name}</div><Badge variant={status === "Contratado" ? "secondary" : status === "Em negociação" ? "default" : "outline"} className="mt-2 text-[10px]">{status}</Badge><div className="mt-5 flex justify-between text-xs"><span className="text-muted-foreground">Valor</span><span className="font-semibold">{money(value)}</span></div><div className="mt-2 flex justify-between text-xs"><span className="text-muted-foreground">Falta pagar</span><span className="font-medium text-primary">{money(value - paid)}</span></div><div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3 text-[11px] text-muted-foreground"><CalendarDays className="size-3.5" />Vencimento {due}</div></div>)}</section></div>; }

function FinanceView() { const planned = financeRows.reduce((sum, row) => sum + row.planned, 0); const paid = financeRows.reduce((sum, row) => sum + row.paid, 0); return <div className="space-y-7"><PageIntro eyebrow="Controle do orçamento" title="Financeiro" description="Tenha clareza do que foi previsto, pago e ainda falta pagar." action={<Button><Plus />Lançar despesa</Button>} /><div className="grid gap-4 sm:grid-cols-3"><Metric icon={CircleDollarSign} label="Total previsto" value={money(planned)} detail="para os itens cadastrados" tone="rose" onClick={() => undefined} /><Metric icon={Check} label="Total pago" value={money(paid)} detail={`${Math.round((paid / planned) * 100)}% do orçamento`} tone="sage" onClick={() => undefined} /><Metric icon={WalletCards} label="Falta pagar" value={money(planned - paid)} detail="próximos vencimentos" tone="gold" onClick={() => undefined} /></div><section className="overflow-hidden rounded-xl border border-border bg-card"><div className="border-b border-border p-5 sm:p-6"><h2 className="font-serif text-2xl">Despesas da festa</h2><p className="mt-1 text-xs text-muted-foreground">Valores em reais brasileiros</p></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-muted/45 text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th className="px-6 py-3 font-semibold">Categoria</th><th className="px-4 py-3 font-semibold">Previsto</th><th className="px-4 py-3 font-semibold">Pago</th><th className="px-4 py-3 font-semibold">Falta pagar</th><th className="px-4 py-3 font-semibold">Vencimento</th><th className="px-6 py-3 font-semibold">Status</th></tr></thead><tbody>{financeRows.map((row) => <tr key={row.name} className="border-t border-border"><td className="px-6 py-4 font-medium">{row.name}</td><td className="px-4 py-4 text-muted-foreground">{money(row.planned)}</td><td className="px-4 py-4">{money(row.paid)}</td><td className="px-4 py-4 font-semibold text-primary">{money(row.planned - row.paid)}</td><td className="px-4 py-4 text-xs text-muted-foreground">{row.due}</td><td className="px-6 py-4"><Badge variant={row.status === "Parcial" ? "secondary" : "outline"} className="text-[10px]">{row.status}</Badge></td></tr>)}</tbody></table></div></section></div>; }
