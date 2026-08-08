# Alinhar as linhas de convidado e planejar a página de vendas

## O que é aquele dropdown da imagem

Cada linha de convidado tem dois seletores lado a lado:

1. **Família** — a que família aquela pessoa pertence ("Tio Luiz Carlos Nogueira"). Opções: "Sem família", "Tornar principal de família" e a lista das famílias já existentes. É o que agrupa o convite: quem é principal recebe o convite pela família inteira.
2. **Responsável** — quem convidou (William, Késya ou Mirella), usado para segmentar a lista por anfitrião.

Depois vem o status (Confirmado / Aguardando / Declinado).

## O problema de layout

Hoje os controles ficam em um `flex flex-wrap`: cada linha quebra em um ponto diferente conforme o tamanho do nome e dos rótulos. Por isso o "Principal" empurra o status para baixo e as demais linhas ficam em uma linha só — visualmente desalinhado, como na captura.

## Correção proposta (só apresentação)

- **Celular**: a linha vira um bloco empilhado — nome em cima, e abaixo uma grade de 2 colunas fixas para Família e Responsável, com o status ocupando a linha inteira e os botões de ícone (avião, presente, criança) em uma faixa própria. Nada de quebra imprevisível.
- **Desktop (lg+)**: grade com colunas de largura fixa — `[ícones auto] [família 1fr] [responsável 190px] [status 150px]` — para que todas as linhas fiquem com os campos exatamente nas mesmas posições, tenha o convidado badge "Principal" ou não.
- Os badges (Principal, Criança até 10, idade) passam a ficar sempre na coluna do nome, sem influenciar a posição dos seletores.
- Selects ganham `min-w-0` + `truncate` para nomes longos de família não esticarem a coluna.
- Mesmo tratamento no cabeçalho da família (convite virtual / retorno até / convite físico / responsável da família): grade de 1 coluna no celular, 2 colunas no tablet, linha única no desktop.
- Alvos de toque mínimos de 32px no celular para os botões de ícone.

Sem mudança de dados, regras ou contagens.

## Página de vendas: minha recomendação

**Fazer aqui mesmo, neste projeto**, como rota pública `/` separada do app.

Por quê:
- O app já é multi-evento com papéis e convites; a página de vendas precisa apontar para cadastro/login **deste** mesmo produto. Projeto separado significa dois deploys, dois domínios e integração manual de cadastro.
- SEO e cobrança futura (planos, checkout) vivem melhor no mesmo backend que já tem `events`, `event_members` e usuários.

Estrutura sugerida de rotas:

```text
/            → página de vendas pública (marketing)
/app         → painel atual (dashboard, convidados, tarefas, financeiro)
/auth        → login / cadastro
```

Conteúdo da página de vendas:
- Herói: "Organize a festa inteira em um lugar só" + prova visual (captura do painel).
- Blocos: lista de convidados com família e RSVP, tarefas com prazo, fornecedores, financeiro parcelado — cada um com uma imagem real do app.
- Seção para cerimonialista (vários eventos) e para família (evento único).
- Planos: Grátis (1 evento, 30 convidados), Evento único, Assessoria Pro — inicialmente com botão "Quero testar" levando ao cadastro, sem cobrança.
- FAQ + rodapé, metadados de SEO próprios e og:image.

A cobrança de verdade (Stripe/Paddle) fica para uma etapa seguinte, depois que a página estiver validando interesse.

## Ordem de execução

1. Corrigir o alinhamento das linhas de convidado e do cabeçalho de família.
2. Mover o painel para `/app` e criar a página de vendas em `/`.
3. Depois, planos e cobrança.

Se preferir, faço só o item 1 agora e tratamos a página de vendas em seguida.
