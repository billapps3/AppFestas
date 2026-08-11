# Recuperar famílias/responsáveis e refazer o relatório

## O que realmente aconteceu (verificado agora no banco)

- Hoje às 19:01 UTC **todos os 124 convidados foram regravados de uma vez**. Depois disso restaram apenas **6 com família e 6 com responsável** (antes eram 121 e 123).
- A causa não é o relatório. É o jeito como a tela grava: a página abre com uma **lista embutida no código** (sem família e sem responsável), tenta carregar o banco e, **mesmo quando a carga falha ou volta incompleta, o salvamento automático dispara e sobrescreve os 124 convidados** com o que estiver na tela. Uma falha de leitura vira apagamento em massa.
- Onde os dados ainda existem: a cópia `mirella15-backup-v2` (banco) e a mesma cópia no navegador têm **123 convidados, 123 com responsável e 121 com família**. Os status mais novos (76 confirmados, 11 crianças) estão na tabela atual.
- Observação honesta: os **5 "Declinados"** marcados recentemente não sobreviveram em nenhuma cópia; será preciso remarcar esses 5 na tela.

## Plano

### 1. Restaurar (prioridade)
- Recompor por nome: **família e responsável** vêm da cópia de backup; **status, criança, telefone, idade e convites** ficam como estão hoje (são os mais recentes).
- Conferência antes e depois: 123 nomes, 123 com responsável, 121 com família. O convidado extra (124º) é revisado e removido se for duplicado da lista embutida.
- Backup da situação atual é guardado antes de qualquer alteração.

### 2. Impedir que isso se repita
- Nada de "lista embutida" como estado inicial: a tela começa vazia e só habilita a gravação **depois** de uma leitura bem-sucedida do banco.
- Se a leitura falhar, a tela mostra erro e **fica em modo somente leitura** — nenhuma gravação automática.
- Gravação passa a ser **por convidado alterado**, não a lista inteira.
- Trava de segurança: qualquer gravação que apagaria família/responsável de vários convidados de uma vez é bloqueada.
- Snapshot diário automático da lista, para recuperação rápida.

### 2b. Botão de salvar? Recomendação
Não vale a pena um botão de salvar manual — ele cria justamente o risco que você quer evitar (esquecer de salvar e perder a edição). O problema nunca foi salvar demais, foi **salvar a coisa errada**.
O que faço no lugar:
- Cada alteração (status, família, responsável, convite) grava **na hora, só aquele campo daquele convidado**.
- Indicador visível no topo: "Salvando… / Salvo às 16:12 / Erro ao salvar" — nada de dúvida sobre o que foi gravado.
- Se a gravação falhar, um aviso fica na tela com botão **"Tentar salvar de novo"**, e a alteração não some.
- Aviso ao sair da página só quando houver alteração pendente de gravação (falha ou envio em andamento) — sem incomodar no uso normal.

### 3. Refazer o relatório
- Volta a espelhar exatamente a tela: **Responsável → Família (titular + dependentes) → convidados individuais**, um convidado por linha, com **status legível** (Confirmado / Aguardando / Declinado) e marcação de criança.
- Números no topo mantidos (convidados, confirmados, aguardando, declinados, crianças, saldo pagante) e subtotais por responsável e por família.
- Fim do texto corrido em uma linha só — foi o que quebrou a leitura e jogou quase todo mundo em "Sem responsável".
- Exportação em PDF (A4, sem cortar famílias entre páginas) e JPG.

## Detalhes técnicos

- Restauração via SQL: casamento por `name` dentro do `event_id` da Mirella, preenchendo `family_id`/`host_id` a partir do JSON de `app_state.mirella15-backup-v2`, criando as `families`/`hosts` que faltarem e recalculando `is_primary`.
- `src/routes/app.tsx`: remover `importedGuests` como estado inicial; `loaded` só se torna verdadeiro em sucesso; autosave de lista inteira substituído por mutações pontuais em `src/lib/mirella-store.ts` (update por `legacy_id`), com estado `saving/saved/error`, botão de retry e `beforeunload` apenas quando há pendência.
- `saveMirellaState` deixa de fazer upsert de lista completa; guarda adicional rejeita lote em que vários convidados perderiam `family_id`/`host_id`.
- `src/components/guest-report.tsx`: layout em blocos por responsável/família com linhas por convidado e `break-inside: avoid` no corte de página.