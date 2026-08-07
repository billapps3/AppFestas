import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { importedGuests } from "@/lib/mirella-guests";
import { loadMirellaState, saveMirellaState } from "@/lib/mirella-store";
import { expenseStatuses, supplierStatuses, useExpenses, useSuppliers, type Expense, type Supplier } from "@/lib/mirella-finance";
import { useInstallments } from "@/lib/mirella-installments";
import { InstallmentsPanel } from "@/components/installments-panel";
import {
  ArrowUpRight,
  Baby,
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
  Pencil,
  Plus,
  Search,
  Send,
  Sparkles,
  Store,
  Trash2,
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

function useSessionProfile() {
  const navigate = useNavigate();
  const [state, setState] = useState<{ ready: boolean; name: string | null }>({ ready: false, name: null });

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (!data.session) {
        navigate({ to: "/auth", replace: true });
        setState({ ready: false, name: null });
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", data.session.user.id).maybeSingle();
      if (!active) return;
      setState({ ready: true, name: profile?.display_name ?? data.session.user.email ?? "Perfil" });
    };
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth", replace: true });
      if (event === "SIGNED_IN") void load();
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  return state;
}

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
  parent?: number | null;
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
  child: boolean;
  family: string;
  host: string;
};

const hosts = ["William", "Késya", "Mirella"];
const taskOwners = ["William", "Késya", "Mirella"];
const taskPriorities: Task["priority"][] = ["Alta", "Média", "Baixa"];
const taskStatuses: TaskStatus[] = ["Aguardando", "Em andamento", "Concluído"];
const extraFamilies = ["Mirella Colégio", "Mirella CNA", "Mirella Vôlei", "Mirella Igreja"];
const seedFamilies: Record<number, string> = { 14: "Tio Luiz Carlos Nogueira", 15: "Tio Luiz Carlos Nogueira", 16: "Tio Luiz Carlos Nogueira", 17: "Tio Luiz Carlos Nogueira", 18: "Tio Luiz Carlos Nogueira" };

const taskSeed: Task[] = [
  { id: 1, name: "Definir identidade visual", area: "Preparação", owner: "Késya", due: "08 ago", status: "Concluído", priority: "Alta" },
  { id: 2, name: "Lista de convidados", area: "Convidados", owner: "Késya", due: "12 ago", status: "Concluído", priority: "Alta" },
  { id: 3, name: "Escolher convite físico", area: "Convites físicos", owner: "Mirella", due: "18 ago", status: "Em andamento", priority: "Alta" },
  { id: 4, name: "Enviar convites virtuais", area: "Convites virtuais", owner: "Késya", due: "25 ago", status: "Aguardando", priority: "Alta" },
  { id: 5, name: "Contratar buffet", area: "Fornecedores", owner: "Papai", due: "30 ago", status: "Em andamento", priority: "Alta" },
  { id: 6, name: "Escolher vestido", area: "Produção", owner: "Mirella", due: "05 set", status: "Em andamento", priority: "Média" },
  { id: 7, name: "Produção dos chinelos", area: "Lembranças", owner: "Késya", due: "10 set", status: "Aguardando", priority: "Média" },
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
  child: typeof guest.age === "number" ? guest.age <= 10 : false,
  family: seedFamilies[guest.id] ?? "",
  host: "",
}));

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
  const session = useSessionProfile();
  const [view, setView] = useState<View>("overview");
  const [tasks, setTasks] = useState(taskSeed);
  const [guests, setGuests] = useState(guestNames);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [newGuest, setNewGuest] = useState("");
  const [hostFilter, setHostFilter] = useState("Todos");
  const [daysLeft, setDaysLeft] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

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
    let active = true;
    loadMirellaState()
      .then((state) => {
        if (!active || !state) return;
        if (state.tasks?.length) setTasks(state.tasks as Task[]);
        if (state.guests?.length) setGuests(state.guests as Guest[]);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      saveMirellaState({ tasks, guests })
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
    }, 600);
    return () => window.clearTimeout(timer);
  }, [tasks, guests, loaded]);

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

  const addTask = (task: Omit<Task, "id">) => {
    setTasks((current) => [...current, { ...task, id: Math.max(0, ...current.map((item) => item.id)) + 1 }]);
  };

  const updateTask = (id: number, patch: Partial<Task>) => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, ...patch } : task));
  };

  const deleteTask = (id: number) => {
    setTasks((current) => current.filter((task) => task.id !== id && task.parent !== id));
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
    setGuests((current) => [...current, { id: Math.max(0, ...current.map((item) => item.id)) + 1, name, status: "Aguardando", virtual: false, physical: false, personal: false, child: false, family: "", host: "" }]);
    setNewGuest("");
    setShowGuestForm(false);
  };

  const selectView = (next: View) => {
    setView(next);
    setMenuOpen(false);
  };

  if (!session.ready) {
    return <div className="grid min-h-svh place-items-center text-sm text-muted-foreground">Carregando o painel…</div>;
  }

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
        <div className="mt-4 flex items-center gap-3 px-2"><span className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">{(session.name ?? "M").charAt(0).toUpperCase()}</span><div className="min-w-0"><div className="truncate text-xs font-medium text-sidebar-foreground">{session.name}</div><div className="text-[11px] text-sidebar-foreground/45">Painel da festa</div></div><MoreHorizontal className="ml-auto size-4 text-sidebar-foreground/40" /></div>
      </aside>

      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-md">
          <div className="flex h-[72px] items-center justify-between px-5 sm:px-8 lg:px-10">
            <div className="flex items-center gap-3"><Button size="icon" variant="ghost" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu /></Button><div><div className="text-[11px] font-medium text-muted-foreground">Sexta-feira, 06 de agosto de 2026</div><div className="mt-0.5 font-serif text-[21px]">{view === "overview" ? `Olá, ${(session.name ?? "").split(" ")[0] || "família"}` : navItems.find((item) => item.id === view)?.label}</div></div></div>
            <div className="flex items-center gap-2 sm:gap-4"><span className="hidden text-xs text-muted-foreground sm:inline">{saveState === "saving" ? "Salvando…" : saveState === "saved" ? "Salvo na nuvem" : saveState === "error" ? "Erro ao salvar" : ""}</span><Button variant="ghost" size="icon" aria-label="Notificações" className="relative"><Bell /><span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" /></Button><div className="hidden h-7 w-px bg-border sm:block" /><Button variant="outline" size="sm" className="hidden gap-2 sm:inline-flex"><Download />Exportar</Button><span className="hidden text-xs font-medium sm:inline">{session.name}</span><Button variant="ghost" size="sm" className="text-xs" onClick={() => { void supabase.auth.signOut(); }}>Sair</Button><span className="grid size-9 place-items-center rounded-full bg-secondary font-serif text-lg text-secondary-foreground">{(session.name ?? "M").charAt(0).toUpperCase()}</span></div>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-5 pb-12 pt-7 sm:px-8 lg:px-10">
          {view === "overview" && <Overview daysLeft={daysLeft} completedTasks={completedTasks} confirmedGuests={confirmedGuests} totalGuests={guests.length} virtualSent={virtualSent} tasks={tasks} guests={guests} onTaskStatus={changeTaskStatus} onView={selectView} />}
          {view === "tasks" && <TasksView tasks={tasks} onTaskStatus={changeTaskStatus} onAdd={addTask} onUpdate={updateTask} onDelete={deleteTask} />}
          {view === "guests" && <GuestsView guests={filteredGuests} allGuests={guests} search={search} setSearch={setSearch} hostFilter={hostFilter} setHostFilter={setHostFilter} showForm={showGuestForm} setShowForm={setShowGuestForm} newGuest={newGuest} setNewGuest={setNewGuest} addGuest={addGuest} onStatus={changeGuestStatus} onUpdate={updateGuest} onFamilyHost={setFamilyHost} />}
          {view === "suppliers" && <SuppliersView />}
          {view === "finance" && <FinanceView />}
        </main>
      </div>
    </div>
  );
}

function Overview({ daysLeft, completedTasks, confirmedGuests, totalGuests, virtualSent, tasks, guests, onTaskStatus, onView }: { daysLeft: number; completedTasks: number; confirmedGuests: number; totalGuests: number; virtualSent: number; tasks: Task[]; guests: Guest[]; onTaskStatus: (id: number) => void; onView: (view: View) => void }) {
  const upcoming = tasks.filter((task) => task.status !== "Concluído").slice(0, 4);
  const confirmed = guests.filter((guest) => guest.status === "Confirmado").length;
  const declined = guests.filter((guest) => guest.status === "Não confirmado").length;
  const waiting = guests.filter((guest) => guest.status === "Aguardando").length;
  const children = guests.filter((guest) => guest.child).length;
  const inviteBalance = totalGuests - children - declined;
  return <div className="space-y-8">
    <section className="relative overflow-hidden rounded-2xl bg-primary px-6 py-7 text-primary-foreground shadow-sm sm:px-9 sm:py-9">
      <div className="relative z-10 max-w-2xl"><div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/60"><Sparkles className="size-4" />Contagem regressiva</div><h1 className="font-serif text-[36px] leading-[1.05] sm:text-[48px]">O grande dia está<br className="hidden sm:block" /> chegando, Mirella.</h1><p className="mt-4 max-w-md text-sm leading-6 text-primary-foreground/68">Acompanhe cada detalhe da sua festa de 15 anos e deixe a organização mais leve.</p><div className="mt-7 flex items-end gap-3"><span className="font-serif text-[58px] leading-none sm:text-[68px]">{daysLeft}</span><span className="pb-1 text-sm text-primary-foreground/65">dias até<br />02.10.2026</span></div></div>
      <div className="absolute -right-5 -top-16 size-64 rounded-full border border-primary-foreground/10" /><div className="absolute -right-20 -bottom-36 size-96 rounded-full border border-primary-foreground/10" /><div className="absolute right-10 top-8 hidden h-44 w-44 rotate-12 rounded-full border border-primary-foreground/10 sm:block"><div className="absolute inset-6 rounded-full border border-primary-foreground/10" /></div>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={ClipboardCheck} label="Tarefas concluídas" value={`${completedTasks} / ${tasks.length}`} detail={`${tasks.length - completedTasks} em aberto`} tone="rose" onClick={() => onView("tasks")} />
      <Metric icon={Users} label="Convidados confirmados" value={`${confirmedGuests}`} detail={`de ${totalGuests} convidados`} tone="gold" onClick={() => onView("guests")} />
      <Metric icon={WalletCards} label="Saldo a pagar" value={money(34800)} detail="de R$ 50.600 previstos" tone="sage" onClick={() => onView("finance")} />
      <Metric icon={Send} label="Convites virtuais" value={`${virtualSent} / ${totalGuests}`} detail="já enviados" tone="lilac" onClick={() => onView("guests")} />
    </section>

    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <SectionHeading eyebrow="Resumo da lista" title="Convidados e convites" action="Abrir lista" onClick={() => onView("guests")} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Total de convidados", value: totalGuests, hint: "pessoas na lista" },
          { label: "Confirmados", value: confirmed, hint: "vão comparecer" },
          { label: "Declinados", value: declined, hint: "não vão" },
          { label: "Aguardando", value: waiting, hint: "sem resposta" },
          { label: "Crianças até 10 anos", value: children, hint: "não pagantes" },
          { label: "Saldo de convites", value: inviteBalance, hint: "total − crianças − declinados" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-background p-4">
            <div className="text-[11px] leading-tight text-muted-foreground">{item.label}</div>
            <div className="mt-2 font-serif text-3xl">{item.value}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">{item.hint}</div>
          </div>
        ))}
      </div>
    </section>

    <TaskHealthPanel tasks={tasks} onView={onView} />

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

function SectionHeading({ eyebrow, title, action, onClick }: { eyebrow: string; title: string; action?: string; onClick?: () => void }) {
  return <div className="flex items-end justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</div><h2 className="mt-1 font-serif text-[24px]">{title}</h2></div>{action && <Button variant="ghost" size="sm" onClick={onClick} className="gap-1 text-xs text-muted-foreground">{action}<ChevronRight className="size-3.5" /></Button>}</div>;
}

function TaskRow({ task, onStatus, first = false }: { task: Task; onStatus: (id: number) => void; first?: boolean }) {
  return <div className={`flex items-center gap-3 py-3.5 ${!first ? "border-t border-border" : ""}`}><button onClick={() => onStatus(task.id)} aria-label={`Marcar ${task.name}`} className={`grid size-5 shrink-0 place-items-center rounded-full border transition ${task.status === "Concluído" ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"}`}>{task.status === "Concluído" && <Check className="size-3" />}</button><div className="min-w-0 flex-1"><div className={`truncate text-sm font-medium ${task.status === "Concluído" ? "text-muted-foreground line-through" : ""}`}>{task.name}</div><div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground"><span>{task.area}</span><span className="size-1 rounded-full bg-border" /><span>{task.owner}</span></div></div><div className="hidden text-right sm:block"><div className="text-xs font-medium">{formatDue(task.due)}</div><div className={`mt-1 text-[10px] ${task.priority === "Alta" ? "text-primary" : "text-muted-foreground"}`}>{task.priority} prioridade</div></div><Badge variant={task.status === "Concluído" ? "secondary" : task.status === "Em andamento" ? "default" : "outline"} className="hidden text-[10px] font-medium sm:inline-flex">{task.status}</Badge></div>;
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) { return <div className="flex items-center gap-2"><span className={`size-2 rounded-full ${color}`} /><span className="w-24 text-muted-foreground">{label}</span><span className="font-semibold">{value}</span></div>; }
function Attention({ icon: Icon, title, text }: { icon: typeof Clock3; title: string; text: string }) { return <div className="flex items-center gap-3 rounded-lg bg-muted/55 p-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-card text-primary"><Icon className="size-4" /></span><div><div className="text-xs font-semibold">{title}</div><div className="mt-0.5 text-[11px] text-muted-foreground">{text}</div></div></div>; }

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) { return <div className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</div><h1 className="mt-2 font-serif text-[36px] leading-none">{title}</h1><p className="mt-3 max-w-xl text-sm text-muted-foreground">{description}</p></div>{action}</div>; }

function formatDue(due: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(due)) {
    const [year, month, day] = due.split("-");
    return `${day}/${month}/${year}`;
  }
  return due || "sem data";
}

type TaskHealth = "concluida" | "sem-data" | "atrasada" | "critica" | "no-prazo";

function taskHealth(task: Task): TaskHealth {
  if (task.status === "Concluído") return "concluida";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(task.due)) return "sem-data";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = task.due.split("-").map(Number);
  const target = new Date(year!, month! - 1, day!);
  const days = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "atrasada";
  if (days <= 7 || task.priority === "Alta") return "critica";
  return "no-prazo";
}

const healthLabel: Record<TaskHealth, string> = {
  concluida: "Concluídas",
  "no-prazo": "No prazo",
  critica: "Críticas",
  atrasada: "Atrasadas",
  "sem-data": "Sem data",
};

function TaskHealthPanel({ tasks, onView }: { tasks: Task[]; onView: (view: View) => void }) {
  const counts = tasks.reduce((acc, task) => {
    const key = taskHealth(task);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<TaskHealth, number>);
  const late = tasks.filter((task) => taskHealth(task) === "atrasada").slice(0, 4);
  const cards: { key: TaskHealth; hint: string; className: string }[] = [
    { key: "no-prazo", hint: "prazo confortável", className: "border-border bg-background" },
    { key: "critica", hint: "vencem em até 7 dias ou alta prioridade", className: "border-accent/50 bg-accent/10" },
    { key: "atrasada", hint: "passaram da data limite", className: "border-destructive/40 bg-destructive/5" },
    { key: "sem-data", hint: "ainda sem data limite", className: "border-border bg-muted/40" },
    { key: "concluida", hint: "finalizadas", className: "border-primary/30 bg-primary/5" },
  ];
  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <SectionHeading eyebrow="Termômetro das tarefas" title="Prazos em dia?" action="Abrir tarefas" onClick={() => onView("tasks")} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <div key={card.key} className={`rounded-xl border p-4 ${card.className}`}>
            <div className="text-[11px] leading-tight text-muted-foreground">{healthLabel[card.key]}</div>
            <div className="mt-2 font-serif text-3xl">{counts[card.key] ?? 0}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">{card.hint}</div>
          </div>
        ))}
      </div>
      {late.length > 0 && (
        <div className="mt-5 space-y-2 border-t border-border pt-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-destructive">Precisam de atenção agora</div>
          {late.map((task) => (
            <div key={task.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate">{task.name} <span className="text-muted-foreground">· {task.owner || "sem responsável"}</span></span>
              <span className="shrink-0 text-destructive">{formatDue(task.due)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const fieldClass = "h-9 w-full rounded-md border border-border bg-background px-2 text-xs";

function TaskForm({ title, initial, areas, parents, onSubmit, onCancel }: { title: string; initial: Partial<Task>; areas: string[]; parents: Task[]; onSubmit: (values: Omit<Task, "id">) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial.name ?? "");
  const [area, setArea] = useState(initial.area ?? "");
  const [owner, setOwner] = useState(initial.owner ?? "");
  const [due, setDue] = useState(/^\d{4}-\d{2}-\d{2}$/.test(initial.due ?? "") ? initial.due! : "");
  const [status, setStatus] = useState<TaskStatus>(initial.status ?? "Aguardando");
  const [priority, setPriority] = useState<Task["priority"]>(initial.priority ?? "Média");
  const [parent, setParent] = useState<string>(initial.parent ? String(initial.parent) : "");

  const submit = () => {
    if (!name.trim() || !area.trim()) return;
    onSubmit({ name: name.trim(), area: area.trim(), owner: owner.trim(), due, status, priority, parent: parent ? Number(parent) : null });
  };

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
      <div className="text-xs font-semibold text-primary">{title}</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-[11px] text-muted-foreground">Tarefa
          <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome da tarefa" className="mt-1 h-9 text-xs" />
        </label>
        <label className="text-[11px] text-muted-foreground">Tema
          <Input list="task-areas" value={area} onChange={(event) => setArea(event.target.value)} placeholder="Ex.: Convites" className="mt-1 h-9 text-xs" />
          <datalist id="task-areas">{areas.map((item) => <option key={item} value={item} />)}</datalist>
        </label>
        <label className="text-[11px] text-muted-foreground">Responsável
          <Input list="task-owners" value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="Quem faz" className="mt-1 h-9 text-xs" />
          <datalist id="task-owners">{taskOwners.map((item) => <option key={item} value={item} />)}</datalist>
        </label>
        <label className="text-[11px] text-muted-foreground">Data limite
          <Input type="date" value={due} onChange={(event) => setDue(event.target.value)} className="mt-1 h-9 text-xs" />
        </label>
        <label className="text-[11px] text-muted-foreground">Status
          <select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)} className={`mt-1 ${fieldClass}`}>{taskStatuses.map((item) => <option key={item}>{item}</option>)}</select>
        </label>
        <label className="text-[11px] text-muted-foreground">Prioridade
          <select value={priority} onChange={(event) => setPriority(event.target.value as Task["priority"])} className={`mt-1 ${fieldClass}`}>{taskPriorities.map((item) => <option key={item}>{item}</option>)}</select>
        </label>
        <label className="text-[11px] text-muted-foreground">Desdobramento de
          <select value={parent} onChange={(event) => setParent(event.target.value)} className={`mt-1 ${fieldClass}`}>
            <option value="">Tarefa principal do tema</option>
            {parents.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <Button size="sm" onClick={submit}>Salvar</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

function TaskLine({ task, child = false, onStatus, onEdit, onDelete, onAddChild }: { task: Task; child?: boolean; onStatus: (id: number) => void; onEdit: () => void; onDelete: () => void; onAddChild?: () => void }) {
  return (
    <div className={`flex items-center gap-3 border-t border-border py-3 ${child ? "pl-6 sm:pl-10" : ""}`}>
      <button onClick={() => onStatus(task.id)} aria-label={`Marcar ${task.name}`} className={`grid size-5 shrink-0 place-items-center rounded-full border transition ${task.status === "Concluído" ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"}`}>{task.status === "Concluído" && <Check className="size-3" />}</button>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm font-medium ${task.status === "Concluído" ? "text-muted-foreground line-through" : ""}`}>{task.name}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span>{task.owner || "sem responsável"}</span><span className="size-1 rounded-full bg-border" />
          <span>Até {formatDue(task.due)}</span><span className="size-1 rounded-full bg-border" />
          <span className={task.priority === "Alta" ? "text-primary" : ""}>{task.priority} prioridade</span>
        </div>
      </div>
      <Badge variant={task.status === "Concluído" ? "secondary" : task.status === "Em andamento" ? "default" : "outline"} className="hidden text-[10px] font-medium sm:inline-flex">{task.status}</Badge>
      <div className="flex shrink-0 items-center gap-1">
        {onAddChild && <Button size="icon" variant="ghost" className="size-8" aria-label={`Adicionar desdobramento de ${task.name}`} title="Adicionar desdobramento" onClick={onAddChild}><Plus className="size-4" /></Button>}
        <Button size="icon" variant="ghost" className="size-8" aria-label={`Editar ${task.name}`} title="Editar" onClick={onEdit}><Pencil className="size-4" /></Button>
        <Button size="icon" variant="ghost" className="size-8 text-destructive" aria-label={`Excluir ${task.name}`} title="Excluir" onClick={onDelete}><Trash2 className="size-4" /></Button>
      </div>
    </div>
  );
}

function TasksView({ tasks, onTaskStatus, onAdd, onUpdate, onDelete }: { tasks: Task[]; onTaskStatus: (id: number) => void; onAdd: (task: Omit<Task, "id">) => void; onUpdate: (id: number, patch: Partial<Task>) => void; onDelete: (id: number) => void }) {
  const [filter, setFilter] = useState("Todas");
  const [ownerFilter, setOwnerFilter] = useState("Todos");
  const [editing, setEditing] = useState<number | null>(null);
  const [creating, setCreating] = useState<{ area: string; parent: number | null } | null>(null);

  const areas = useMemo(() => Array.from(new Set(tasks.map((task) => task.area).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR")), [tasks]);
  const owners = useMemo(
    () => Array.from(new Set([...taskOwners, ...tasks.map((task) => task.owner).filter(Boolean)])).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [tasks],
  );
  const matchesOwner = (task: Task) =>
    ownerFilter === "Todos" || (ownerFilter === "Sem responsável" ? !task.owner?.trim() : task.owner === ownerFilter);
  const matches = (task: Task) => (filter === "Todas" || task.status === filter) && matchesOwner(task);

  const themes = useMemo(() => {
    return areas
      .map((area) => {
        const inArea = tasks.filter((task) => task.area === area);
        const roots = inArea.filter((task) => !task.parent || !inArea.some((item) => item.id === task.parent));
        const groups = roots
          .map((root) => ({ root, children: inArea.filter((task) => task.parent === root.id) }))
          .filter((group) => matches(group.root) || group.children.some(matches));
        return { area, groups, total: inArea.length };
      })
      .filter((theme) => theme.groups.length > 0);
  }, [tasks, areas, filter, ownerFilter]);

  const visible = tasks.filter(matches).length;

  return (
    <div className="space-y-7">
      <PageIntro eyebrow="Planejamento" title="Tarefas" description="Tarefas organizadas por tema, com desdobramentos, responsável e data limite." action={<Button onClick={() => { setEditing(null); setCreating(creating ? null : { area: "", parent: null }); }}>{creating ? <X /> : <Plus />}{creating ? "Fechar" : "Nova tarefa"}</Button>} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric icon={ClipboardCheck} label="Concluídas" value={`${tasks.filter((task) => task.status === "Concluído").length}`} detail="tarefas finalizadas" tone="rose" onClick={() => setFilter("Concluído")} />
        <Metric icon={Clock3} label="Em andamento" value={`${tasks.filter((task) => task.status === "Em andamento").length}`} detail="precisam de atenção" tone="gold" onClick={() => setFilter("Em andamento")} />
        <Metric icon={Bell} label="Aguardando" value={`${tasks.filter((task) => task.status === "Aguardando").length}`} detail="dependem de uma ação" tone="sage" onClick={() => setFilter("Aguardando")} />
      </div>

      {creating && (
        <TaskForm
          title={creating.parent ? "Novo desdobramento" : creating.area ? `Nova tarefa em ${creating.area}` : "Nova tarefa"}
          initial={{ area: creating.area, parent: creating.parent }}
          areas={areas}
          parents={tasks.filter((task) => !task.parent && (!creating.area || task.area === creating.area))}
          onSubmit={(values) => { onAdd(values); setCreating(null); }}
          onCancel={() => setCreating(null)}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg bg-muted p-1">{["Todas", "Em andamento", "Aguardando", "Concluído"].map((item) => <Button key={item} size="sm" variant={filter === item ? "default" : "ghost"} onClick={() => setFilter(item)} className="text-xs">{item}</Button>)}</div>
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">Responsável
            <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)} className="h-9 rounded-md border border-border bg-background px-2 text-xs">
              <option>Todos</option>
              <option>Sem responsável</option>
              {owners.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>
        <span className="text-xs text-muted-foreground">{visible} tarefas exibidas</span>
      </div>

      <div className="space-y-5">
        {themes.map((theme) => (
          <section key={theme.area} className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Tema</div>
                <h2 className="mt-1 font-serif text-[22px]">{theme.area}</h2>
              </div>
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => { setEditing(null); setCreating({ area: theme.area, parent: null }); }}><Plus className="size-3.5" />Tarefa neste tema</Button>
            </div>
            <div className="mt-4">
              {theme.groups.map((group) => (
                <div key={group.root.id}>
                  {editing === group.root.id ? (
                    <div className="py-3"><TaskForm title={`Editar ${group.root.name}`} initial={group.root} areas={areas} parents={tasks.filter((task) => !task.parent && task.id !== group.root.id)} onSubmit={(values) => { onUpdate(group.root.id, values); setEditing(null); }} onCancel={() => setEditing(null)} /></div>
                  ) : (
                    <TaskLine task={group.root} onStatus={onTaskStatus} onEdit={() => { setCreating(null); setEditing(group.root.id); }} onDelete={() => onDelete(group.root.id)} onAddChild={() => { setEditing(null); setCreating({ area: theme.area, parent: group.root.id }); }} />
                  )}
                  {group.children.filter(matches).map((child) => (
                    editing === child.id ? (
                      <div key={child.id} className="py-3 pl-6 sm:pl-10"><TaskForm title={`Editar ${child.name}`} initial={child} areas={areas} parents={tasks.filter((task) => !task.parent && task.id !== child.id)} onSubmit={(values) => { onUpdate(child.id, values); setEditing(null); }} onCancel={() => setEditing(null)} /></div>
                    ) : (
                      <TaskLine key={child.id} task={child} child onStatus={onTaskStatus} onEdit={() => { setCreating(null); setEditing(child.id); }} onDelete={() => onDelete(child.id)} />
                    )
                  ))}
                </div>
              ))}
            </div>
          </section>
        ))}
        {themes.length === 0 && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhuma tarefa neste filtro.</p>}
      </div>
    </div>
  );
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
    { label: "Crianças até 10 anos", value: guests.filter((guest) => guest.child).length },
    { label: "Sem responsável", value: allGuests.filter((guest) => !guest.host).length },
    { label: "Saldo de convites", value: allGuests.length - allGuests.filter((guest) => guest.child).length - allGuests.filter((guest) => guest.status === "Não confirmado").length },
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
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
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
            {guest.child && <Badge variant="secondary" className="text-[9px]">Criança até 10</Badge>}
            {isPrincipal && <Badge className="text-[9px]">Principal</Badge>}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">#{String(guest.id).padStart(3, "0")}{guest.phone && ` · ${guest.phone}`}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          <button onClick={() => onUpdate(guest.id, { virtual: !guest.virtual })} title="Convite virtual" className={`grid size-7 place-items-center rounded-md ${guest.virtual ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/40"}`}><Send className="size-3" /></button>
          <button onClick={() => onUpdate(guest.id, { physical: !guest.physical })} title="Convite físico" className={`grid size-7 place-items-center rounded-md ${guest.physical ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground/40"}`}><Gift className="size-3" /></button>
          <button onClick={() => onUpdate(guest.id, { child: !guest.child })} aria-pressed={guest.child} title="Criança até 10 anos (não pagante)" className={`grid size-7 place-items-center rounded-md ${guest.child ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground/40"}`}><Baby className="size-3" /></button>
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

function SupplierForm({ title, initial, onSubmit, onCancel }: { title: string; initial: Partial<Supplier>; onSubmit: (values: Omit<Supplier, "id">) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial.name ?? "");
  const [category, setCategory] = useState(initial.category ?? "");
  const [contact, setContact] = useState(initial.contact ?? "");
  const [status, setStatus] = useState(initial.status ?? "Orçamento");
  const [value, setValue] = useState(String(initial.value ?? ""));
  const [paid, setPaid] = useState(String(initial.paid ?? ""));
  const [due, setDue] = useState(initial.due ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), category: category.trim(), contact: contact.trim(), status, value: Number(value) || 0, paid: Number(paid) || 0, due, notes: notes.trim() });
  };

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
      <div className="text-xs font-semibold text-primary">{title}</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-[11px] text-muted-foreground">Fornecedor
          <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Buffet" className="mt-1 h-9 text-xs" />
        </label>
        <label className="text-[11px] text-muted-foreground">Categoria
          <Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Ex.: Alimentação" className="mt-1 h-9 text-xs" />
        </label>
        <label className="text-[11px] text-muted-foreground">Contato
          <Input value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Telefone ou e-mail" className="mt-1 h-9 text-xs" />
        </label>
        <label className="text-[11px] text-muted-foreground">Status
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={`mt-1 ${fieldClass}`}>{supplierStatuses.map((item) => <option key={item}>{item}</option>)}</select>
        </label>
        <label className="text-[11px] text-muted-foreground">Valor (R$)
          <Input type="number" value={value} onChange={(event) => setValue(event.target.value)} placeholder="0" className="mt-1 h-9 text-xs" />
        </label>
        <label className="text-[11px] text-muted-foreground">Já pago (R$)
          <Input type="number" value={paid} onChange={(event) => setPaid(event.target.value)} placeholder="0" className="mt-1 h-9 text-xs" />
        </label>
        <label className="text-[11px] text-muted-foreground">Vencimento
          <Input type="date" value={due} onChange={(event) => setDue(event.target.value)} className="mt-1 h-9 text-xs" />
        </label>
        <label className="text-[11px] text-muted-foreground">Observações
          <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anotações" className="mt-1 h-9 text-xs" />
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <Button size="sm" onClick={submit}>Salvar</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

function SuppliersView() {
  const { items, loading, create, update, remove } = useSuppliers();
  const parcels = useInstallments();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const contracted = items.filter((item) => item.status === "Contratado").length;
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const pending = items.filter((item) => item.status !== "Contratado").length;

  return <div className="space-y-7">
    <PageIntro eyebrow="Parceiros da festa" title="Fornecedores" description="Acompanhe contratos, valores e o que ainda precisa ser fechado." action={<Button onClick={() => { setCreating(true); setEditing(null); }}><Plus />Adicionar fornecedor</Button>} />
    <div className="grid gap-4 sm:grid-cols-3">
      <Metric icon={Store} label="Contratados" value={String(contracted)} detail={`de ${items.length} fornecedores`} tone="rose" onClick={() => undefined} />
      <Metric icon={CircleDollarSign} label="Valor contratado" value={money(total)} detail="soma dos contratos" tone="gold" onClick={() => undefined} />
      <Metric icon={Clock3} label="A contratar" value={String(pending)} detail="precisam de orçamento" tone="sage" onClick={() => undefined} />
    </div>
    {creating && <SupplierForm title="Novo fornecedor" initial={{}} onSubmit={(values) => { void create(values); setCreating(false); }} onCancel={() => setCreating(false)} />}
    {loading ? <div className="text-sm text-muted-foreground">Carregando fornecedores…</div>
      : items.length === 0 && !creating ? <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhum fornecedor cadastrado ainda. Use “Adicionar fornecedor”.</div>
      : <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => editing === item.id
            ? <div key={item.id} className="sm:col-span-2 xl:col-span-3"><SupplierForm title={`Editar ${item.name}`} initial={item} onSubmit={(values) => { void update(item.id, values); setEditing(null); }} onCancel={() => setEditing(null)} /></div>
            : <div key={item.id} className="rounded-xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between">
                  <span className="grid size-9 place-items-center rounded-lg bg-secondary text-secondary-foreground"><Store className="size-4" /></span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="size-7" aria-label="Editar fornecedor" onClick={() => { setEditing(item.id); setCreating(false); }}><Pencil className="size-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-destructive" aria-label="Excluir fornecedor" onClick={() => { if (confirm(`Excluir ${item.name}?`)) void remove(item.id); }}><Trash2 className="size-3.5" /></Button>
                  </div>
                </div>
                <div className="mt-5 font-medium">{item.name}</div>
                {item.category && <div className="mt-0.5 text-[11px] text-muted-foreground">{item.category}</div>}
                <Badge variant={item.status === "Contratado" ? "secondary" : item.status === "Em negociação" ? "default" : "outline"} className="mt-2 text-[10px]">{item.status}</Badge>
                <div className="mt-5 flex justify-between text-xs"><span className="text-muted-foreground">Valor</span><span className="font-semibold">{money(item.value)}</span></div>
                <div className="mt-2 flex justify-between text-xs"><span className="text-muted-foreground">Falta pagar</span><span className="font-medium text-primary">{money(item.value - item.paid)}</span></div>
                {item.contact && <div className="mt-2 text-[11px] text-muted-foreground">{item.contact}</div>}
                <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3 text-[11px] text-muted-foreground"><CalendarDays className="size-3.5" />Vencimento {formatDue(item.due)}</div>
                <InstallmentsPanel
                  parent={{ supplierId: item.id }}
                  items={parcels.forSupplier(item.id)}
                  onCreate={(values) => void parcels.create(values)}
                  onCreateMany={(list) => void parcels.createMany({ supplierId: item.id }, list)}
                  onSettle={(parcel, paidAt, payer) => void parcels.settle(parcel, paidAt, payer)}
                  onReopen={(parcel) => void parcels.reopen(parcel)}
                  onRemove={(parcel) => { if (confirm("Excluir esta parcela?")) void parcels.remove(parcel); }}
                />
              </div>)}
        </section>}
  </div>;
}

function ExpenseForm({ title, initial, onSubmit, onCancel }: { title: string; initial: Partial<Expense>; onSubmit: (values: Omit<Expense, "id">) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial.name ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [planned, setPlanned] = useState(String(initial.planned ?? ""));
  const [paid, setPaid] = useState(String(initial.paid ?? ""));
  const [due, setDue] = useState(initial.due ?? "");
  const [status, setStatus] = useState(initial.status ?? "Pendente");

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim(), planned: Number(planned) || 0, paid: Number(paid) || 0, due, status });
  };

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
      <div className="text-xs font-semibold text-primary">{title}</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label className="text-[11px] text-muted-foreground">Categoria
          <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Buffet" className="mt-1 h-9 text-xs" />
        </label>
        <label className="text-[11px] text-muted-foreground">Descrição
          <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Detalhe da despesa" className="mt-1 h-9 text-xs" />
        </label>
        <label className="text-[11px] text-muted-foreground">Status
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={`mt-1 ${fieldClass}`}>{expenseStatuses.map((item) => <option key={item}>{item}</option>)}</select>
        </label>
        <label className="text-[11px] text-muted-foreground">Previsto (R$)
          <Input type="number" value={planned} onChange={(event) => setPlanned(event.target.value)} placeholder="0" className="mt-1 h-9 text-xs" />
        </label>
        <label className="text-[11px] text-muted-foreground">Pago (R$)
          <Input type="number" value={paid} onChange={(event) => setPaid(event.target.value)} placeholder="0" className="mt-1 h-9 text-xs" />
        </label>
        <label className="text-[11px] text-muted-foreground">Vencimento
          <Input type="date" value={due} onChange={(event) => setDue(event.target.value)} className="mt-1 h-9 text-xs" />
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <Button size="sm" onClick={submit}>Salvar</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

function FinanceView() {
  return <FinanceViewInner />;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-background px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="truncate text-xs font-semibold">{value}</div>
    </div>
  );
}

function FinanceViewInner() {
  const { items, loading, create, update, remove } = useExpenses();
  const suppliers = useSuppliers();
  const parcels = useInstallments();
  const [openParcels, setOpenParcels] = useState<string | null>(null);
  const [openSupplierParcels, setOpenSupplierParcels] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const expensePlanned = items.reduce((sum, row) => sum + row.planned, 0);
  const expensePaid = items.reduce((sum, row) => sum + row.paid, 0);
  const supplierPlanned = suppliers.items.reduce((sum, row) => sum + row.value, 0);
  const supplierPaid = suppliers.items.reduce((sum, row) => sum + row.paid, 0);
  const planned = expensePlanned + supplierPlanned;
  const paid = expensePaid + supplierPaid;
  const expenseTotals = sumTotals(items.map((row) => computeTotals(row, parcels.forExpense(row.id))));
  const supplierTotals = sumTotals(suppliers.items.map((row) => computeTotals(row, parcels.forSupplier(row.id))));
  const totals = sumTotals([expenseTotals, supplierTotals]);
  const planned = totals.planned;
  const paid = totals.paid;
  const remaining = totals.remaining;

  return <div className="space-y-7">
    <PageIntro eyebrow="Controle do orçamento" title="Financeiro" description="Contratos dos fornecedores + despesas avulsas somados em um único orçamento." action={<Button onClick={() => { setCreating(true); setEditing(null); }}><Plus />Lançar despesa avulsa</Button>} />
    <div className="grid gap-4 sm:grid-cols-3">
      <Metric icon={CircleDollarSign} label="Total previsto" value={money(planned)} detail={`${money(supplierTotals.planned)} fornecedores + ${money(expenseTotals.planned)} avulsas`} tone="rose" onClick={() => undefined} />
      <Metric icon={Check} label="Total pago" value={money(paid)} detail={planned ? `${Math.round((paid / planned) * 100)}% do orçamento` : "sem despesas ainda"} tone="sage" onClick={() => undefined} />
      <Metric icon={WalletCards} label="Falta pagar" value={money(remaining)} detail={totals.overdue > 0 ? `${money(totals.overdue)} em atraso` : `${money(supplierTotals.remaining)} fornecedores + ${money(expenseTotals.remaining)} avulsas`} tone="gold" onClick={() => undefined} />
    </div>

    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border p-5 sm:p-6">
        <h2 className="font-serif text-2xl">Contratos com fornecedores</h2>
        <p className="mt-1 text-xs text-muted-foreground">Valores vindos da aba Fornecedores — edite-os por lá; aqui você acompanha e dá baixa nas prestações.</p>
      </div>
      {suppliers.loading ? <div className="p-6 text-sm text-muted-foreground">Carregando fornecedores…</div>
        : suppliers.items.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Nenhum fornecedor cadastrado ainda.</div>
        : <ul className="divide-y divide-border">
            {suppliers.items.map((row) => (
              <li key={row.id} className="p-4 sm:px-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">{row.name}</span>
                  {row.category && <span className="text-[11px] text-muted-foreground">{row.category}</span>}
                  <Badge variant={row.status === "Contratado" ? "secondary" : "outline"} className="text-[10px]">{row.status}</Badge>
                  <Button size="sm" variant="ghost" className="ml-auto h-7 text-[11px]" onClick={() => setOpenSupplierParcels((current) => current === row.id ? null : row.id)}>
                    {openSupplierParcels === row.id ? "Fechar" : `Prestações (${parcels.forSupplier(row.id).length})`}
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MiniStat label="Previsto" value={money(row.value)} />
                  <MiniStat label="Pago" value={money(row.paid)} />
                  <MiniStat label="Falta pagar" value={money(row.value - row.paid)} />
                  <MiniStat label="Vencimento" value={formatDue(row.due)} />
                </div>
                {openSupplierParcels === row.id && (
                  <InstallmentsPanel
                    parent={{ supplierId: row.id }}
                    items={parcels.forSupplier(row.id)}
                    onCreate={(values) => void parcels.create(values)}
                    onCreateMany={(list) => void parcels.createMany({ supplierId: row.id }, list)}
                    onSettle={(parcel, paidAt, payer) => void parcels.settle(parcel, paidAt, payer)}
                    onReopen={(parcel) => void parcels.reopen(parcel)}
                    onRemove={(parcel) => { if (confirm("Excluir esta parcela?")) void parcels.remove(parcel); }}
                  />
                )}
              </li>
            ))}
          </ul>}
    </section>

    {creating && <ExpenseForm title="Nova despesa" initial={{}} onSubmit={(values) => { void create(values); setCreating(false); }} onCancel={() => setCreating(false)} />}
    {editing && items.some((item) => item.id === editing) && <ExpenseForm title="Editar despesa" initial={items.find((item) => item.id === editing)!} onSubmit={(values) => { void update(editing, values); setEditing(null); }} onCancel={() => setEditing(null)} />}
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border p-5 sm:p-6"><h2 className="font-serif text-2xl">Despesas avulsas</h2><p className="mt-1 text-xs text-muted-foreground">Gastos sem fornecedor cadastrado (decoração comprada, taxas, extras)</p></div>
      {loading ? <div className="p-6 text-sm text-muted-foreground">Carregando despesas…</div>
        : items.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma despesa avulsa lançada. Use “Lançar despesa avulsa”.</div>
        : <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/45 text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th className="px-6 py-3 font-semibold">Categoria</th><th className="px-4 py-3 font-semibold">Previsto</th><th className="px-4 py-3 font-semibold">Pago</th><th className="px-4 py-3 font-semibold">Falta pagar</th><th className="px-4 py-3 font-semibold">Vencimento</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-6 py-3 font-semibold">Ações</th></tr></thead>
              <tbody>{items.map((row) => <tr key={row.id} className="border-t border-border">
                <td className="px-6 py-4 font-medium">{row.name}{row.description && <div className="mt-0.5 text-[11px] font-normal text-muted-foreground">{row.description}</div>}</td>
                <td className="px-4 py-4 text-muted-foreground">{money(row.planned)}</td>
                <td className="px-4 py-4">{money(row.paid)}</td>
                <td className="px-4 py-4 font-semibold text-primary">{money(row.planned - row.paid)}</td>
                <td className="px-4 py-4 text-xs text-muted-foreground">{formatDue(row.due)}</td>
                <td className="px-4 py-4"><Badge variant={row.status === "Parcial" ? "secondary" : row.status === "Pago" ? "default" : "outline"} className="text-[10px]">{row.status}</Badge></td>
                <td className="px-6 py-4"><div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="size-7" aria-label="Editar despesa" onClick={() => { setEditing(row.id); setCreating(false); }}><Pencil className="size-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-destructive" aria-label="Excluir despesa" onClick={() => { if (confirm(`Excluir ${row.name}?`)) void remove(row.id); }}><Trash2 className="size-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setOpenParcels((current) => current === row.id ? null : row.id)}>{openParcels === row.id ? "Fechar" : `Prestações (${parcels.forExpense(row.id).length})`}</Button>
                </div></td>
              </tr>).flatMap((node, index) => {
                const row = items[index]!;
                return openParcels === row.id
                  ? [node, <tr key={`${row.id}-parcels`} className="border-t border-border bg-muted/20"><td colSpan={7} className="px-6 pb-4 pt-0">
                      <InstallmentsPanel
                        parent={{ expenseId: row.id }}
                        items={parcels.forExpense(row.id)}
                        onCreate={(values) => void parcels.create(values)}
                        onCreateMany={(list) => void parcels.createMany({ expenseId: row.id }, list)}
                        onSettle={(parcel, paidAt, payer) => void parcels.settle(parcel, paidAt, payer)}
                        onReopen={(parcel) => void parcels.reopen(parcel)}
                        onRemove={(parcel) => { if (confirm("Excluir esta parcela?")) void parcels.remove(parcel); }}
                      />
                    </td></tr>]
                  : [node];
              })}</tbody>
            </table>
          </div>}
    </section>
  </div>;
}
