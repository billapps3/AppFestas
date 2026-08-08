# De app da festa da Mirella para SaaS de organização de eventos

## Onde o app está hoje

O app já resolve o miolo difícil de um planejador de festas: convidados normalizados com família/grupo, responsável (anfitrião), convite virtual e físico com datas, prazo de RSVP com alerta de pendência, tarefas por tema com subtarefas e saúde de prazo, fornecedores, despesas avulsas, parcelamento com baixa e pagante, push para os organizadores e PWA.

Três limitações bloqueiam a venda hoje:

1. **É de um evento só.** Nenhuma tabela tem dono/evento — quem entrar vê a festa da Mirella. As políticas de acesso das tabelas de dados liberam tudo para qualquer pessoa logada.
2. **Os papéis são cosméticos.** `admin`, `organizador` e `aniversariante` filtram o menu no navegador; o banco continua permitindo leitura e escrita a qualquer logado. Um perfil RSVP restrito, como você descreveu, não é seguro sem política no banco.
3. **Não há entrada de dinheiro nem convite de equipe.** Quem contrata, como paga, quantos eventos pode criar e como convida a cerimonialista — nada disso existe.

## Oportunidade de mercado

Público brasileiro direto: 15 anos, casamento, bodas, batizado, formatura, aniversário infantil. Quem compra é (a) a família organizadora, compra única por evento, e (b) a **cerimonialista/assessoria**, que roda 10 a 40 eventos por ano e é o cliente recorrente que sustenta um SaaS.

O que o mercado já tem: sites de lista de casamento e convite digital com RSVP, e planilhas. O que quase ninguém junta bem é **RSVP + tarefas + fornecedores + fluxo de caixa parcelado no mesmo lugar**, que é exatamente o que este app faz. O financeiro por parcelas com pagante é o diferencial mais defensável — é o que faz a assessoria abandonar a planilha.

Posicionamento recomendado: **ferramenta de gestão para quem organiza**, não site de convite. Vender por evento para a família e por assinatura para a assessoria.

Preço sugerido para validar:
- **Família / evento único**: pagamento único por evento, faixa R$ 79–149, ativo até 30 dias depois da data.
- **Assessoria Pro**: mensal, faixa R$ 79–129, eventos ilimitados, marca própria na página de RSVP.
- **Grátis**: 1 evento, até 30 convidados, sem financeiro — a amostra que converte.

## Perfis de acesso (o ponto que você levantou)

Modelo por evento, com convite emitido pelo administrador:

| Perfil | Convidados | Tarefas | Fornecedores/Financeiro | Configurações |
|---|---|---|---|---|
| Proprietário (admin) | tudo | tudo | tudo | tudo |
| Organizador | tudo | tudo | tudo | não |
| Cerimonialista | tudo | tudo | ver, sem apagar | não |
| **RSVP / recepção** | **só ver e mudar status de confirmação** | não | não | não |
| Aniversariante | ver | ver e concluir | nada | não |
| Convidado (link público) | só o próprio RSVP | não | não | não |

O perfil RSVP é o caso mais claro: a pessoa da recepção ou a tia que liga confirmando não pode ver orçamento nem excluir convidado. Isso precisa valer no banco, não só no menu.

## Roteiro em fases

**Fase 1 — Multi-evento (base de tudo)**
Tabelas `events` e `event_members` com papel por evento; `event_id` em convidados, famílias, tarefas, fornecedores, despesas e parcelas; políticas passam a exigir participação no evento; migração da festa da Mirella para o primeiro evento; seletor de evento no topo.

**Fase 2 — Papéis reais e convite de equipe**
Permissão verificada no banco por papel (ler/escrever por módulo), tela de equipe onde o admin convida por e-mail e define o papel, perfil RSVP entregue de ponta a ponta.

**Fase 3 — Página pública de RSVP**
Link e QR por família ou convidado, o próprio convidado confirma, alimenta a mesma lista e reduz o trabalho manual — é também o canal de marketing do produto.

**Fase 4 — Cobrança e planos**
Pagamentos integrados, limites por plano (eventos, convidados, financeiro), tela de assinatura e período de teste.

**Fase 5 — Escala para assessoria**
Modelos de checklist por tipo de evento, duplicar evento, painel com todos os eventos, exportar PDF/Excel, marca da assessoria.

## Detalhes técnicos

- `events(id, owner_id, name, event_date, type, plan, status)` e `event_members(event_id, user_id, role)`, com função `security definer` `has_event_role(event_id, roles[])` para evitar recursão nas políticas.
- Cada tabela de dados ganha `event_id not null` com índice; leitura por `has_event_access(event_id)` e escrita conforme o papel; grants explícitos para `authenticated`.
- Migração: criar o evento "15 anos da Mirella", preencher `event_id` em todas as linhas existentes, tornar a coluna obrigatória e inserir William, Késya e Mirella em `event_members`.
- Os hooks atuais (`mirella-store`, `mirella-finance`, `mirella-installments`) passam a receber o evento ativo por contexto; a leitura continua filtrada pelas políticas e o insert grava `event_id`.
- `user_roles` global vira apenas papel de plataforma (suporte); o papel de festa migra para `event_members`.
- Renomear gradualmente os módulos `mirella-*` para nomes genéricos quando a Fase 1 estiver estável.

## Recomendação

Começar pelas Fases 1 e 2. Sem multi-evento e sem permissão no banco, cobrar seria vender algo que ainda não isola um cliente do outro. Com essas duas fases prontas o app já pode ser testado com uma cerimonialista real, e a Fase 3 vira o gancho de venda.

## Execução aprovada: Fases 1 e 2

### Preservar os dados da Mirella

Nenhuma linha é apagada nem recriada. A migração é aditiva e em passos:

1. Antes de qualquer coisa, cópia de segurança das tabelas atuais (convidados, famílias, anfitriões, tarefas, fornecedores, despesas, parcelas, perfis) em tabelas `backup_*` dentro do próprio banco.
2. Criar `events` e `event_members` e inserir o evento "15 anos da Mirella" (02/10/2026).
3. Adicionar `event_id` **nullable** em cada tabela de dados.
4. Preencher `event_id` de todas as linhas existentes com o evento da Mirella e só então torná-lo obrigatório.
5. Inserir William (proprietário), Késya e Mirella em `event_members` com os papéis atuais.
6. Conferir a contagem por tabela antes e depois; se algo divergir, a migração não avança.

As colunas antigas (`user_roles`, `can_finance`, `party_role`) continuam existindo durante a transição, para o app não quebrar enquanto a interface é atualizada.

### Segurança

- Toda tabela de dados troca a política atual "qualquer logado faz tudo" por acesso condicionado a ser membro do evento, via função `security definer` (evita recursão nas políticas).
- Escrita separada por papel: RSVP só altera o campo de confirmação do convidado, checado por gatilho no banco — não só na tela; cerimonialista não apaga; financeiro exige papel com permissão.
- `events` e `event_members`: só membros leem; só o proprietário e o admin do evento convidam, mudam papel ou removem alguém, sem possibilidade de alguém elevar o próprio papel.
- Convites de equipe por token de uso único com validade, associado ao e-mail convidado — nada de virar membro só por adivinhar um link.
- Grants explícitos para `authenticated`, sem acesso `anon` a nenhuma tabela nesta fase.
- Ao final rodo o verificador de segurança do banco e testo na prática: um usuário RSVP não consegue ler fornecedores nem financeiro, e um usuário de outro evento não enxerga nada da Mirella.

### O que muda na tela

- Seletor de evento no topo (com um evento só, aparece discreto).
- Nova tela **Equipe**: lista de membros, convite por e-mail, papel por pessoa, remover acesso — substitui o card "Acessos e permissões" atual.
- Menu e ações passam a respeitar o papel no evento; o perfil RSVP abre direto na lista de convidados, sem o resto.