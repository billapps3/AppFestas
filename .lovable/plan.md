# App visual — 15 anos da Mirella (02/10/2026)

Painel web em português, leve no celular e no computador, usando a planilha Google já existente como banco de dados. Sem Supabase.

## Fonte de dados

A planilha `1DuXLT-TlOz65czufedFFbAeqwU2hPtxd9L-MZbyanrk` é lida e gravada pelo app através do conector Google Sheets (conta que autorizar o acesso). Abas renomeadas para **Tarefas, Convidados, Fornecedores, Financeiro**. A aba "Visão geral" não precisa existir na planilha: o painel do app calcula os indicadores ao vivo.

Passo 1 do trabalho: ligar o conector Google Sheets e ler as 4 abas para conferir as colunas reais antes de escrever a leitura.

## Telas

**Visão geral (página inicial)**
- Contador regressivo para 02/10/2026
- Tarefas concluídas / total, em andamento, bloqueadas por dependência
- Próximos prazos (7 e 30 dias) e alerta vermelho para prazos vencidos
- Convidados confirmados / total, aguardando, não confirmados
- Saldo financeiro a pagar (previsto, pago, falta)
- Fornecedores ainda não contratados

**Tarefas**
- Lista agrupada por Tarefa principal (Convites físicos, Chinelos, etc.), com as 16 tarefas iniciais
- Filtros: Responsável, Status, Prioridade, Tarefa principal
- Status derivado: se a dependência não está Concluído, a tarefa aparece como **Aguardando dependência** e não pode ser marcada como iniciada/concluída
- Alterar status ou prazo grava na planilha

**Convidados**
- Uma pessoa por linha, com Código, Grupo, Família, Nome, Idade, Quantidade, Telefone, datas de envio/retorno, Confirmação, Convite virtual, Convite físico, Envio pessoal, Responsável, Observações
- Busca, filtros por Grupo/Confirmação/Convite e agrupamento por família
- Indicadores: totais por grupo, confirmados, aguardando, não confirmados, virtuais enviados, físicos enviados, entregas pessoais pendentes
- Marcação rápida de "Envio pessoal" para ligar convidados à tarefa Envio pessoal
- Grupo familiar nunca é inventado: fica em branco quando não dá para identificar

**Fornecedores**
- Buffet, Fotógrafo, DJ, Decoração, Vestido, Maquiagem, Chinelos, Lembrancinhas
- Status, valor contratado, valor pago, falta pagar (calculado), vencimento, observações

**Financeiro**
- Buffet, Vestido, Fotógrafo, DJ, Decoração, Doces, Lembranças, Outros
- Previsto, pago, falta pagar, vencimento, status, totalizadores

## Atualizações por chat

Você continua podendo me mandar frases como "Produção dos chinelos concluída" ou "Adicionar Ana Souza, Família Pai, 3 pessoas, convite virtual enviado, confirmado". Eu respondo com o resumo exato de qual aba/linha/coluna muda e só aplico depois da sua confirmação.

## Visual

Tons claros e festivos (rosa suave, dourado, off-white), tipografia elegante com títulos em serifada, cartões arredondados, tabelas que viram cartões no celular. Nada de roxo genérico.

## Pendências

- A planilha **Lista Mirella .xlsx** ainda não chegou. Assim que você anexar, normalizo os 123 nomes (blocos lado a lado → uma pessoa por linha, separando idade entre parênteses e telefone) e escrevo o resultado na aba Convidados.
- Se preferir, posso começar pelas outras abas enquanto o arquivo não vem.

## Detalhes técnicos

- TanStack Start; leitura/escrita do Sheets em server functions via gateway do conector (`/google_sheets/v4/spreadsheets/...`), chaves nunca no navegador
- TanStack Query com cache; escrita por `values:update` / `values:append`, seguida de recarga
- Cálculo de dependências e indicadores feito no app, não em fórmulas frágeis da planilha
- Rotas: `/` (visão geral), `/tarefas`, `/convidados`, `/fornecedores`, `/financeiro`
