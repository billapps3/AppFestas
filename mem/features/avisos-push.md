---
name: Central de avisos (push)
description: Regras dos avisos push por evento — público por papel/pessoa, avisos automáticos e perfil RSVP
type: feature
---
- Todo aviso é por evento; público = papéis marcados + pessoas marcadas (união), resolvido em `event_members`.
- Só `owner`/`organizer` escrevem avisos manuais e mudam as configurações automáticas.
- Automáticos (tabela `notification_settings`, um registro por evento+tipo): `task_done`, `rsvp`, `pending_report`.
  Padrões: tarefa → owner/organizer/planner; RSVP → owner/organizer/rsvp; relatório → owner/organizer/planner.
- Aviso de RSVP informa o convidado, a família e quem registrou a mudança.
- Não criar papel novo para avisos: o perfil de recepção é o `rsvp` já existente, que só recebe avisos e vê o histórico.
- Relatório de pendentes sai junto do resumo diário, pelo hook `/api/public/hooks/push-digest` no pg_cron.