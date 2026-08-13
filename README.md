# Mirella's 15th Journey

Copie e cole este prompt no Claude. Anexe também a planilha Lista Mirella .xlsx e, se quiser manter o protótipo visual, o arquivo app-festa-15/index.html.

Quero que você continue e evolua um projeto de organização para o aniversário de 15 anos da Mirella.

Objetivo:
Criar um sistema simples, visual, prático e compartilhável para controlar convidados, tarefas, fornecedores e orçamento. A festa será em 02/10/2026 — este é o prazo final absoluto de todo o planejamento.

Planilha Google já criada:
https://docs.google.com/spreadsheets/d/1DuXLT-TlOz65czufedFFbAeqwU2hPtxd9L-MZbyanrk/edit?usp=sharing

O que já foi inserido nessa planilha:
- Página1: tarefas, responsáveis, prazos, subtarefas e dependências.
- Página2: convidados, confirmação e controle de convites.
- Página3: fornecedores.
- Página4: financeiro.
As abas ainda estão com nomes genéricos; renomeie para:
1. Tarefas
2. Convidados
3. Fornecedores
4. Financeiro
Crie também uma aba “Visão geral” com indicadores e próximos passos.

Importante: quero que essa planilha tenha aparência organizada e seja fácil de usar no celular e no computador. Use cores leves, filtros, congelamento de cabeçalho, validações de dados e fórmulas automáticas.

1) ABA TAREFAS
Campos:
- Prioridade: Alta, Média, Baixa
- Tarefa
- Responsável
- Prazo
- Tarefa principal
- Depende de
- Status: Pendente, Em andamento, Aguardando dependência, Concluído
- Observações

Regra principal:
Uma tarefa dependente não pode ser considerada iniciada/concluída até que sua dependência esteja concluída. Na planilha, sinalize isso automaticamente como “Aguardando dependência”.

Filtros obrigatórios:
- Responsável
- Status
- Prioridade
- Tarefa principal

Tarefas já definidas:
- Escolher músicas — Mirella — 06/08/2026
- Lista das meninas da dança — Mirella — 06/08/2026
- Definir ida ao Barra Shopping — Família — 06/08/2026
- Finalizar lista de convidados — Mirella — 07/08/2026 — em andamento
- Aprovar arte do convite físico — William — depende de Finalizar lista de convidados
- Produção dos convites físicos — Gráfica — depende de Aprovar arte do convite físico
- Entrega dos convites físicos — Gráfica — depende de Produção dos convites físicos
- Envio de convites pelos Correios — William — depende de Entrega dos convites físicos
- Envio pessoal — definir destinatários — William — depende de Entrega dos convites físicos
- Definir template dos chinelos
- Produção dos chinelos — Fornecedor — depende de Definir template dos chinelos
- Entrega dos chinelos — Fornecedor — depende de Produção dos chinelos
- Confirmar fornecedores e pagamentos — Família — até 15/09/2026
- Fechar playlist e roteiro da cerimônia — Mirella — até 25/09/2026 — depende de Escolher músicas
- Organização final e conferência — Família — até 30/09/2026
- Festa de 15 anos — Família — 02/10/2026 — depende da Organização final e conferência

Exemplo de subtarefas:
Tarefa principal “Convites físicos”:
1. Aprovar arte
2. Produção
3. Entrega
4. Envio pelos Correios
5. Envio pessoal

Tarefa principal “Chinelos”:
1. Definir template
2. Produção
3. Entrega

No envio pessoal, preciso conseguir marcar quais convidados/famílias receberão o convite em mãos.

2) ABA CONVIDADOS
Existe uma planilha anexa chamada “Lista Mirella .xlsx”.
Ela contém uma lista mestre numerada de 1 a 125, organizada em blocos lado a lado. Existem 123 nomes preenchidos; os itens 124 e 125 estão vazios. Alguns convidados têm telefone e alguns nomes contêm idade entre parênteses.

Importe/normalize essa lista: uma pessoa por linha.

Campos:
- Código
- Grupo: Família Pai, Família Mãe, Amigos da Aniversariante
- Família / núcleo familiar
- Nome do convidado
- Idade
- Quantidade (padrão 1; usar para acompanhante quando necessário)
- Telefone
- Data de envio
- Data de retorno
- Confirmação: Aguardando, Confirmado, Não confirmado
- Convite virtual: Não enviado, Enviado
- Convite físico: Não enviado, Enviado
- Envio pessoal?: Sim, Não
- Responsável pelo envio pessoal
- Observações

Criar indicadores automáticos:
- Total de convidados
- Total confirmado
- Total aguardando
- Total não confirmado
- Total por Família Pai
- Total por Família Mãe
- Total por Amigos da Aniversariante
- Quantidade de convites virtuais enviados
- Quantidade de convites físicos enviados
- Quantidade de entregas pessoais pendentes

Não invente o grupo familiar dos nomes. Deixe o campo em branco para preenchimento quando não for possível identificar.

3) ABA FORNECEDORES
Campos:
- Serviço
- Empresa
- Contato
- Status: A cotar, Cotado, Contratado, Pago parcialmente, Pago, Cancelado
- Valor contratado
- Valor pago
- Falta pagar
- Vencimento
- Observações

Serviços iniciais:
Buffet, Fotógrafo, DJ, Decoração, Vestido, Maquiagem, Chinelos e Lembrancinhas.

4) ABA FINANCEIRO
Campos:
- Item
- Valor previsto
- Valor pago
- Falta pagar (fórmula)
- Vencimento
- Status
- Observações

Itens iniciais:
Buffet, Vestido, Fotógrafo, DJ, Decoração, Doces, Lembranças e Outros.
Criar totalizadores automáticos.

5) ABA VISÃO GERAL
Criar um painel simples e bonito com:
- Contagem de tarefas concluídas / total
- Tarefas em andamento
- Tarefas bloqueadas por dependência
- Próximos prazos
- Convidados confirmados / total
- Saldo financeiro a pagar
- Fornecedores ainda não contratados
- Alerta para tarefas com prazo próximo ou vencido

Preferência técnica:
Quero usar Google Sheets como fonte de dados inicialmente, pois é simples para a família editar remotamente. Se for necessário criar um app visual, ele pode usar Google Sheets como base no começo. Não quero depender de Supabase agora.

Também quero poder enviar atualizações por chat, por exemplo:
“Produção dos chinelos concluída”
ou
“Adicionar Ana Souza, Família Pai, 3 pessoas, convite virtual enviado, confirmado”
e você deve indicar exatamente quais linhas/valores atualizar.

Antes de mudar dados reais, mostre um resumo do que você entendeu e do plano de organização.

Se quiser, também posso preparar uma versão mais curta, focada só em o Claude organizar a planilha existente.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mirella15anos.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/58d33dfd-b190-4b71-bb09-21f2493b5cdd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
