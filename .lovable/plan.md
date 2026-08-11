# Aba Comunicados + fazer os avisos chegarem na Késya

## O que está acontecendo hoje

- A Central de avisos existe, mas fica escondida **no fim da Visão geral**. Por isso você não encontra as caixinhas de escolher pessoas e tipos de mensagem — elas estão lá embaixo, dentro das abas "Enviar aviso" e "Automáticos".
- Verifiquei os aparelhos cadastrados: **você tem 2 aparelhos ativos; Késya e Mirella têm zero**. Nenhum aviso pode chegar nelas porque nenhum celular delas foi ativado ainda — não é falta de permissão no sistema (Késya é organizadora e recebe todos os tipos).

## O que a Késya precisa fazer

1. Abrir o app no celular dela e entrar com o Google dela.
2. Ir na nova aba **Comunicados** e tocar em "Ativar neste aparelho", aceitando o aviso do navegador.
3. **No iPhone**: antes disso, é obrigatório abrir no Safari, tocar em Compartilhar e "Adicionar à Tela de Início", e então ativar por dentro desse ícone. O iPhone não envia avisos por site aberto no navegador.

Para nunca mais ficar na dúvida, a nova aba vai mostrar a situação de cada pessoa da equipe: "recebendo em 2 aparelhos" ou "ainda não ativou".

## A nova aba Comunicados

Entra no menu lateral, entre Convidados e Equipe, visível para todos os perfis (inclusive recepção e aniversariante).

Conteúdo, em cartões, um abaixo do outro:

1. **Meu aparelho** — botão grande de ativar/desativar, com aviso claro quando o navegador bloqueou a permissão e a instrução do iPhone.
2. **Escrever comunicado** (só dono e organizador) — título, mensagem, as caixinhas de **papéis** (dono, organizador, cerimonialista, recepção, aniversariante, visualizador) e a lista de **pessoas** com caixinha em cada nome, marcando quantos aparelhos cada uma tem. Botão "Enviar para X pessoa(s)".
3. **Avisos automáticos** (só dono e organizador) — liga/desliga e papéis de cada tipo: tarefa concluída, confirmação/declínio de convidado, relatório diário de convites sem resposta.
4. **Mensagens recebidas** — histórico do evento para todo mundo, com título, texto, quem enviou, para quem foi e quando. É aqui que você "vê as mensagens" mesmo sem o push ter aparecido no celular.
5. **Quem está recebendo** (só dono e organizador) — lista da equipe com aparelhos ativos e um botão "Enviar teste" para conferir na hora.

A Central de avisos sai da Visão geral e da aba Convidados, para não existir em dois lugares.

## Detalhes técnicos

- `src/routes/app.tsx`: novo `View` `"messages"`, item no `navItems` sem restrição em `visibleNav`, e remoção das duas instâncias antigas de `PushPanel`. O perfil `rsvp` passa a poder alternar entre Convidados e Comunicados (o `useEffect` que trava em `guests` precisa aceitar `messages`).
- `src/components/push-panel.tsx` reescrito como `MessagesView` em cartões, sem as abas internas; composição e automáticos condicionados a `canManage`. Componentes auxiliares (`DeviceCard`, `ComposeCard`, `AutoRulesCard`, `HistoryList`, `TeamReachCard`) no mesmo arquivo ou em `src/components/messages/`.
- Histórico passa a trazer o nome de quem enviou: `select` com `profiles:sent_by(display_name)` em `push_messages`; a política atual já limita a membros do evento.
- Nova função em `src/lib/push.functions.ts`: `listPushReach` (owner/organizer) devolvendo, por membro, papel, nome e contagem de inscrições — lida via `event_members` + `push_subscriptions` com o cliente autenticado; e `sendTestPush` reaproveitando `deliverPush` com `userIds: [caller]` ou o membro escolhido.
- `listEventMembersForPush` passa a ser chamada também quando o usuário não é gestor? Não: continua restrita, e o cartão "Quem está recebendo" só aparece para gestor.
- Deteção de iPhone/PWA no cartão do aparelho: `navigator.standalone`/`display-mode: standalone` para mostrar a instrução certa em vez de um erro seco de permissão.

---

# Guardado para depois: transformar o app em produto vendável (SaaS por evento)

## Como fica o banco de dados

Cada cliente **não** ganha um banco separado. Continua um único banco, e cada festa é uma "caixa" isolada:

```text
Cliente A  ->  Evento A  ->  convidados, tarefas, fornecedores, financeiro de A
Cliente B  ->  Evento B  ->  convidados, tarefas, fornecedores, financeiro de B
```

O isolamento já existe hoje: toda tabela é ligada a um evento e as regras de acesso do banco só liberam linhas de eventos em que a pessoa é membro. Um cliente nunca enxerga a festa de outro, mesmo que tente. É o mesmo modelo usado por praticamente todo SaaS — mais barato, mais fácil de atualizar e sem trabalho manual a cada venda.

A festa da Mirella continua sendo apenas mais um evento nesse conjunto, sem risco de mistura.

## Como o cliente entra (autoatendimento)

1. Entra pela página de vendas e clica em "Começar teste grátis".
2. Cria a conta (e-mail/senha ou Google).
3. Cai numa tela curta: nome da festa, data e tipo. Ao salvar, ele vira **dono** do evento.
4. Começam **14 dias** de acesso completo, com um aviso no topo mostrando quantos dias restam.
5. Convida esposo(a), cerimonialista e recepção pela aba Equipe — quem é convidado para a equipe não paga nada.

## Como funciona a cobrança (pagamento único por festa)

- Cada festa é comprada uma vez. Sem mensalidade e sem cobrança surpresa depois da festa.
- Durante o teste, tudo liberado. Quando os 14 dias acabam sem pagamento, a festa entra em **modo leitura**: o cliente continua vendo e exportando tudo, mas não cria nem edita. Nada é apagado.
- Ao pagar, aquela festa fica liberada de forma definitiva, inclusive depois da data do evento.
- Quem quiser organizar uma segunda festa compra de novo.
- Os três planos da página de vendas passam a valer por tamanho de festa (limite de convidados) — o plano gratuito da página vira o próprio teste de 14 dias, para não prometer duas coisas diferentes.

## O que muda na tela

- **Página de vendas**: botão principal vira "Criar minha festa grátis por 14 dias"; a tabela de planos mostra preço por festa e limite de convidados.
- **Novo passo "Criar festa"** logo após o cadastro.
- **Faixa de status** dentro do app: "Teste: faltam 9 dias — liberar minha festa".
- **Tela de pagamento** com os planos e retorno para o app já liberado.
- **Modo leitura** quando o teste vence: ações de criar/editar desativadas com explicação e botão de pagamento.
- **Painel do administrador** (seu acesso): lista de festas, dono, plano, situação e data do evento.

## Detalhes técnicos

**Banco**
- `events` ganha `subscription_status` (`trial | active | expired`), `trial_ends_at`, `plan`, `guest_limit`, `paid_at` e `payment_ref`.
- Nova tabela `event_orders` (evento, valor, moeda, provedor, id externo, situação) para histórico de compras, com GRANT + RLS: dono lê os pedidos da própria festa; escrita apenas pelo servidor (`service_role`).
- Função `public.event_is_active(_event uuid)` (security definer) devolvendo se a festa está em teste válido ou paga. As políticas de escrita de `guests`, `tasks`, `suppliers`, `expenses`, `installments`, `families`, `hosts` e `payers` passam a exigir essa função além do papel, para o bloqueio valer mesmo fora da interface.
- Limite de convidados validado por trigger em `guests`, comparando com `events.guest_limit`.

**Pagamento**
- Usar a solução de pagamentos integrada da Lovable. Antes de ligar, rodar a verificação de elegibilidade do produto e confirmar o provedor recomendado com você; produto digital vendido a partir do Brasil normalmente cai em Paddle como responsável fiscal.
- Checkout iniciado por `createServerFn` autenticado, validando que quem paga é dono da festa.
- Webhook em `src/routes/api/public/hooks/payments.ts`, verificando assinatura antes de gravar; ao confirmar, marca `subscription_status = 'active'`, grava `paid_at`, `plan`, `guest_limit` e fecha o pedido em `event_orders`.

**App**
- `src/routes/index.tsx`: CTA e planos atualizados.
- Novas rotas `src/routes/onboarding.tsx` (criar a primeira festa) e `src/routes/checkout.tsx`.
- `src/lib/event-access.ts` passa a expor `subscription` (situação, dias restantes, limite) e `can.write`, usados para desativar ações em `app.tsx`.
- Novo `src/lib/billing.functions.ts` com `createEventForOwner`, `startCheckout` e `getEventBilling`.
- Painel administrativo simples em `src/routes/_authenticated/admin.tsx`, restrito ao papel `admin`.

**Ordem sugerida (quando retomarmos)**
1. Migração de assinatura + criação de festa em autoatendimento + teste de 14 dias.
2. Modo leitura e limites por plano.
3. Pagamentos e webhook.
4. Painel administrativo.