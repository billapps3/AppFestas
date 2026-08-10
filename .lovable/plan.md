# Transformar o app em produto vendável (SaaS por evento)

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

**Ordem sugerida**
1. Migração de assinatura + criação de festa em autoatendimento + teste de 14 dias.
2. Modo leitura e limites por plano.
3. Pagamentos e webhook.
4. Painel administrativo.