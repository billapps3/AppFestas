# Central de avisos (push) com escolha de quem recebe

## O que muda para você

Hoje o aviso vai para todos os aparelhos cadastrados e só existe o envio manual e o resumo diário. Passa a existir uma central de avisos onde você escolhe o público de cada mensagem e liga/desliga os avisos automáticos.

### 1. Escolher quem recebe
Ao escrever um aviso, você marca:
- **Papéis**: dono, organizador, cerimonialista, recepção (RSVP), aniversariante, visualizador.
- **Pessoas**: lista da equipe do evento com uma caixinha em cada nome, para incluir alguém fora dos papéis marcados ou tirar alguém de dentro.

O aviso só chega nos aparelhos das pessoas selecionadas. Se ninguém for selecionado, o botão de enviar fica bloqueado.

### 2. Avisos automáticos (com liga/desliga por tipo)
- **Tarefa concluída** — "Késya concluiu: Fechar buffet". Público padrão: dono, organizador, cerimonialista.
- **Confirmação ou declínio de convidado** — "Luiz Carlos confirmou presença (família Nogueira) — registrado por Recepção". Diz quem confirmou e quem registrou. Público padrão: dono, organizador, recepção.
- **Relatório de convites sem confirmação** — resumo diário: quantos aguardando, quantos passaram do prazo de retorno e as 5 famílias mais atrasadas. Público padrão: dono, organizador, cerimonialista. Entra no mesmo horário do resumo atual.

Cada tipo tem sua linha na central: ligado/desligado + papéis que recebem.

### 3. Perfil de recepção (RSVP)
Usamos o papel **RSVP** que já existe, sem criar papel novo. O que ele ganha:
- Pode ativar avisos no aparelho e ver o histórico de avisos do evento.
- Aparece como autor nos avisos de confirmação ("registrado por ...").
- Continua sem acesso a financeiro, fornecedores e tarefas.

### 4. Histórico
A lista de avisos passa a mostrar o público de cada mensagem e o tipo (manual, tarefa, RSVP, relatório).

## Detalhes técnicos

**Banco**
- `push_subscriptions`: adicionar `event_id` para saber a qual evento o aparelho pertence.
- `push_messages`: adicionar `event_id`, `kind` (`manual|task_done|rsvp|pending_report`), `audience_roles event_member_role[]`, `audience_user_ids uuid[]`.
- Nova `notification_settings` (por evento e por `kind`): `enabled boolean`, `audience_roles event_member_role[]`, com os padrões acima.
- RLS: leitura de `push_messages` e `notification_settings` para membros do evento; escrita de settings só para `owner`/`organizer`. GRANTs para `authenticated` e `service_role` em toda tabela nova.

**Envio**
- `src/lib/push.server.ts`: `deliverPush` passa a receber `{ eventId, roles, userIds }` e resolve destinatários via `event_members` + `push_subscriptions` (dedup por endpoint), em vez de buscar todas as inscrições.
- `src/lib/push.functions.ts`: `sendPushMessage` aceita `audienceRoles`/`audienceUserIds` e valida que o remetente é `owner`/`organizer` do evento (no lugar do `has_role admin`); novas funções `notifyTaskDone`, `notifyGuestRsvp`, `getNotificationSettings`, `updateNotificationSettings`, `listEventMembersForPush`.
- Avisos de tarefa e RSVP são disparados pelo app após a gravação (em `mirella-store` / handlers de status), respeitando `notification_settings`; sem trigger no banco.
- Relatório de pendentes entra em `buildDigest`, no hook `/api/public/hooks/push-digest` já agendado, agora por evento.

**Interface**
- `src/components/push-panel.tsx`: reescrito com abas "Enviar aviso" (título, mensagem, chips de papéis, lista de pessoas), "Automáticos" (switches + papéis por tipo) e "Histórico". Chips e listas em grade de 2 colunas no celular. Visível para todos os membros; composição e automáticos só para `owner`/`organizer`.