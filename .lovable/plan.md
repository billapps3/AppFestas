# Convidados: recuperar os dados e gravar família e responsável em tabelas de verdade

## O que eu verifiquei agora

- No **banco** existe uma única tabela (`app_state`), uma única linha (`mirella15`), com tudo dentro de um campo JSON: 123 convidados, mas só **5 com família** e **5 com responsável**.
- No **seu navegador** ainda existe a versão anterior (`mirella15-demo-v2`) com os mesmos **123 convidados: 123 com responsável e 121 com família**.
- Ou seja: **o preenchimento não foi perdido** e você **não precisa refazer** a ligação de família e responsável. A gravação nova começou vazia e passou a ser a referência da tela.

## O que vou fazer

1. **Recuperar** os dados do navegador (`mirella15-demo-v2`): família, responsável, confirmações e convites de cada convidado.
2. **Criar tabelas reais**, uma linha por registro:
   - `hosts` (responsáveis): William, Késya, Mirella.
   - `families` (famílias/grupos): inclui Mirella Colégio, Mirella CNA, Mirella Vôlei, Mirella Igreja e as famílias criadas a partir do titular.
   - `guests` (convidados): nome, telefone, idade, criança, status, convite virtual/físico/pessoal, **família** e **responsável** ligados por referência (não texto solto).
   - `tasks` (tarefas), no mesmo padrão.
3. **Migrar** os dados recuperados para as novas tabelas, conferindo os totais (123 convidados, 123 com responsável, 121 com família) antes de concluir.
4. **Ligar o app às novas tabelas**: cada mudança vira uma alteração na linha daquele convidado, visível na tabela `guests` na hora.
5. **Proteção contra perda**: a tela só grava depois de carregar, e nunca substitui uma lista preenchida por uma lista vazia.
6. Preencher no app as poucas pendências restantes (2 sem família).

## Detalhes técnicos

- Recuperação: leitura de `localStorage['mirella15-demo-v2']` no navegador e importação única para o banco, com conferência do total antes de gravar.
- Migração SQL cria `hosts`, `families`, `guests`, `tasks` com `GRANT` + RLS (leitura/escrita liberadas, igual ao modelo atual sem login).
- `guests.family_id` e `guests.host_id` como chaves estrangeiras `ON DELETE SET NULL`, com índice; `guests.is_primary` marca o titular da família.
- Front: `src/lib/mirella-store.ts` passa a fazer mutações pontuais por linha em vez de salvar o objeto inteiro, com atualização otimista e guarda contra escrita vazia.
- `app_state` fica preservada como backup até a conferência final.
