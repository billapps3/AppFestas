import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarCheck, CheckCircle2, ClipboardList, Gift, Users, WalletCards } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const title = "Festa Simples — organize convidados, tarefas e orçamento do evento";
const description =
  "Lista de convidados por família com RSVP, tarefas com prazo, fornecedores e financeiro parcelado. Feito para famílias e cerimonialistas.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SalesPage,
});

const features = [
  {
    icon: Users,
    title: "Convidados por família",
    text: "Agrupe dependentes sob o principal, marque crianças até 10 anos e acompanhe confirmado, aguardando e declinado.",
  },
  {
    icon: Gift,
    title: "Convites virtual e físico",
    text: "Registre a data de envio de cada convite e o prazo de retorno, com alerta de quem passou do prazo.",
  },
  {
    icon: ClipboardList,
    title: "Tarefas com prazo",
    text: "Divida por tema, atribua responsável e veja o que está no prazo, atrasado ou crítico.",
  },
  {
    icon: WalletCards,
    title: "Financeiro parcelado",
    text: "Contrate fornecedores, gere parcelas com vencimentos diferentes e dê baixa informando data e pagante.",
  },
  {
    icon: CalendarCheck,
    title: "Contagem regressiva",
    text: "Painel único com saldo de convites pagantes, orçamento e o que falta fazer até o grande dia.",
  },
  {
    icon: CheckCircle2,
    title: "Equipe com papéis",
    text: "Convide por e-mail e defina o que cada pessoa vê. Quem é RSVP só confirma presença, sem ver o orçamento.",
  },
];

const plans = [
  {
    name: "Grátis",
    price: "R$ 0",
    note: "para experimentar",
    items: ["1 evento", "Até 30 convidados", "Tarefas e convites", "Sem módulo financeiro"],
    highlight: false,
  },
  {
    name: "Evento único",
    price: "R$ 129",
    note: "pagamento único por evento",
    items: ["Convidados ilimitados", "Financeiro com parcelas", "Fornecedores", "Equipe com papéis", "Ativo até 30 dias após a festa"],
    highlight: true,
  },
  {
    name: "Assessoria Pro",
    price: "R$ 99",
    note: "por mês",
    items: ["Eventos ilimitados", "Painel com todos os eventos", "Equipe por evento", "Prioridade no suporte"],
    highlight: false,
  },
];

const faq = [
  { q: "Preciso instalar alguma coisa?", a: "Não. Funciona no navegador e pode ser adicionado à tela inicial do celular como aplicativo." },
  { q: "Consigo dividir os convites entre as pessoas da família?", a: "Sim. Cada convidado tem um responsável pelo convite, e a lista aparece separada por responsável." },
  { q: "A cerimonialista vê o financeiro?", a: "Você decide. Cada pessoa recebe um papel no evento e as regras valem no banco de dados, não só no menu." },
  { q: "Já posso pagar?", a: "Ainda não. Nesta fase o acesso é liberado para teste e os planos entram em seguida." },
];

function SalesPage() {
  const navigate = useNavigate();
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let active = true;

    const openAppIfSignedIn = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        await navigate({ to: "/app", replace: true });
        return;
      }
      setSessionChecked(true);
    };

    void openAppIfSignedIn();
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        void navigate({ to: "/app", replace: true });
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [navigate]);

  if (!sessionChecked) {
    return <div className="min-h-screen bg-background" aria-label="Verificando acesso" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <span className="font-serif text-lg">Festa Simples</span>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/auth">Entrar</Link></Button>
            <Button asChild size="sm"><Link to="/auth">Começar grátis</Link></Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <div className="min-w-0">
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">15 anos · casamento · bodas · formatura</Badge>
              <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">
                Organize a festa inteira em um lugar só
              </h1>
              <p className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
                Convidados por família com confirmação de presença, tarefas com prazo, fornecedores e o dinheiro parcelado —
                sem planilha, no computador e no celular.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg"><Link to="/auth">Quero testar grátis</Link></Button>
                <Button asChild size="lg" variant="outline"><a href="#recursos">Ver o que faz</a></Button>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">Sem cartão de crédito. Comece com um evento.</p>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] p-5 sm:p-6">
              <div className="text-[10px] uppercase tracking-wider text-primary">Prévia do painel</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  ["Convidados", "123"],
                  ["Confirmados", "47"],
                  ["Saldo pagante", "107"],
                  ["Falta pagar", "R$ 18.400"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-border bg-card p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
                    <div className="mt-1 font-serif text-2xl">{value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
                Família Nogueira · 4 dependentes · convite virtual enviado · retorno até 10/08
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" className="border-y border-border bg-muted/25 py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-serif text-3xl">Tudo o que a organização precisa</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-xl border border-border bg-card p-5">
                  <feature.icon className="size-5 text-primary" />
                  <div className="mt-3 font-medium">{feature.title}</div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Para a família</div>
              <h3 className="mt-2 font-serif text-2xl">Um evento, todo mundo junto</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Pai, mãe e aniversariante dividem a lista por responsável, cada um cuida dos seus convites e o painel soma tudo.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Para a cerimonialista</div>
              <h3 className="mt-2 font-serif text-2xl">Vários eventos, um painel</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Troque de evento no topo, convide a equipe do cliente com o papel certo e mantenha o financeiro separado por festa.
              </p>
            </div>
          </div>
        </section>

        <section id="planos" className="border-y border-border bg-muted/25 py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-serif text-3xl">Planos</h2>
            <p className="mt-2 text-sm text-muted-foreground">Valores de lançamento. Enquanto validamos, o acesso é liberado para teste.</p>
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {plans.map((plan) => (
                <div key={plan.name} className={`rounded-2xl border p-6 ${plan.highlight ? "border-primary bg-primary/[0.06]" : "border-border bg-card"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{plan.name}</span>
                    {plan.highlight && <Badge className="text-[10px]">Mais escolhido</Badge>}
                  </div>
                  <div className="mt-3 font-serif text-3xl">{plan.price}</div>
                  <div className="text-[11px] text-muted-foreground">{plan.note}</div>
                  <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {plan.items.map((item) => (
                      <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />{item}</li>
                    ))}
                  </ul>
                  <Button asChild className="mt-6 w-full" variant={plan.highlight ? "default" : "outline"}>
                    <Link to="/auth">Quero testar</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
          <h2 className="font-serif text-3xl">Perguntas frequentes</h2>
          <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
            {faq.map((item) => (
              <div key={item.q} className="p-5">
                <div className="font-medium">{item.q}</div>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-primary/25 bg-primary/[0.05] p-6 text-center">
            <h3 className="font-serif text-2xl">Pronto para tirar a festa da planilha?</h3>
            <Button asChild size="lg" className="mt-4"><Link to="/auth">Começar agora</Link></Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>Festa Simples · organização de eventos</span>
          <Link to="/app" className="hover:text-foreground">Acessar meu painel</Link>
        </div>
      </footer>
    </div>
  );
}