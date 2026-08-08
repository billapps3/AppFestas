# Corrigir a contagem de convidados do dashboard

## O que encontrei nos dados

Hoje o banco tem 123 convidados, 5 declinados e 12 marcados como "criança até 10 anos" — por isso o saldo aparece 106.

Ao conferir a lista de crianças, uma delas está fora da regra:

- Sophia Meneguetti, 11 anos, marcada como criança até 10 anos.

Retirando ela, ficam 11 crianças e 112 convidados sem crianças — exatamente o número que você contou à mão. Não há convidados duplicados na lista.

## O que vou ajustar

1. Desmarcar a flag de criança de quem tem idade acima de 10 anos (hoje, só a Sophia).
2. Manter a flag consistente com a idade: idade preenchida acima de 10 não pode ficar marcada como criança; 10 ou menos é sugerido automaticamente. Idade em branco continua manual.
3. Corrigir o saldo para nunca descontar a mesma pessoa duas vezes. Hoje, se alguém for criança **e** declinar, é subtraído duas vezes. O saldo passa a ser: total geral − (pessoas que são criança **ou** declinadas), contadas uma única vez.
4. Deixar os cards explícitos para o custo:
   - Total de convidados (lista geral)
   - Confirmados / Aguardando / Declinados
   - Crianças até 10 anos (não pagantes)
   - Saldo de convites (pagantes) = total − crianças − declinados, com a fórmula visível
   Resultado hoje: 123 − 11 − 5 = **107** (e 112 pagantes antes dos declínios).
5. Aplicar a mesma correção nos totais da aba Convidados, para os dois lugares sempre baterem.

## Detalhes técnicos

- Migração pontual: `update guests set is_child = false where age > 10`.
- `src/routes/index.tsx`: em `Overview` e no bloco de métricas da aba Convidados, trocar `total - children - declined` por contagem única com `guest.child || guest.status === "Declinado"`.
- No toggle de criança e no formulário de convidado, validar contra a idade informada.