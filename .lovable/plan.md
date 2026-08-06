# Convidados: gravar família e responsável em tabelas de verdade

## O que eu verifiquei agora no banco

- Existe **uma única tabela** (`app_state`) com **uma única linha** (`mirella15`). Tudo — 123 convidados e 10 tarefas — está dentro de um campo de texto JSON dessa linha.
- Os dados **estão sendo salvos**, mas praticamente vazios nos campos que você quer:
  - Responsável: **118 convidados sem responsável**, apenas **5 com "William"**.
  - Família: **118 convidados sem família**, apenas **5 em "Tio Luiz Carlos Nogueira"**.
- A planilha original não traz família nem responsável (só nome, telefone e os 5 blocos de colunas), então esses campos só serão preenchidos conforme você marcar no app.

Ou seja: o app grava certo, mas o formato é um blocão de JSON — por isso você não consegue ver cada convidado com sua família e responsável na tela do banco.

## O que vou fazer

1. **Criar tabelas reais**, uma linha por registro:
   - `hosts` (responsáveis): William, Késya, Mirella.
   - `families` (famílias/grupos): inclui os grupos fixos Mirella Colégio, Mirella CNA, Mirella Vôlei, Mirella Igreja, e as famílias criadas a partir do titular.
   - `guests` (convidados): nome, telefone, idade, criança, status, convite virtual/físico/pessoal, **família** e **responsável** ligados por referência (não texto solto).
   - `tasks` (tarefas), no mesmo padrão.
2. **Migrar** os 123 convidados e as 10 tarefas de hoje para as novas tabelas, preservando o que já foi marcado (a família Nogueira e os 5 do William).
3. **Ligar o app às novas tabelas**: cada mudança de responsável, família ou confirmação vira um `UPDATE` na linha daquele convidado — visível na tabela `guests` imediatamente.
4. **Ajustar a tela de convidados** para atribuir família/responsável em lote (marcar vários e aplicar de uma vez), para não precisar preencher 118 dropdowns um a um.
5. Aposentar o uso da `app_state` para convidados/tarefas depois da migração conferida.

## Detalhes técnicos

- Migração SQL cria `hosts`, `families`, `guests`, `tasks` com `GRANT` + RLS (leitura/escrita liberadas, igual ao modelo atual sem login).
- `guests.family_id` e `guests.host_id` como chaves estrangeiras com `ON DELETE SET NULL`; índice em ambas.
- `guests.is_primary` marca o titular da família.
- Carga inicial: `INSERT` na própria migração a partir do estado atual do JSON.
- Front: `src/lib/mirella-store.ts` passa a fazer leituras/escritas por tabela (mutações pontuais em vez de salvar o objeto inteiro), com atualização otimista na UI.
