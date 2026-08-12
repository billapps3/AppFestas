# Recuperar os vínculos e eliminar definitivamente a sobrescrita em massa

## Diagnóstico confirmado

- Às **21:10:05 UTC de 12/08**, uma única gravação atualizou os **124 convidados ao mesmo tempo**.
- Antes do incidente, os vínculos haviam sido recuperados. Agora o banco tem apenas **6 convidados com família** e **1 com responsável**; **118 famílias** e **123 responsáveis** foram removidos nessa operação.
- Não foi o relatório nem uma exclusão de famílias: as 39 famílias e os 3 responsáveis continuam no banco, sem vínculos órfãos. O que foi sobrescrito foram `family_id` e `host_id` em `guests`.
- A cópia íntegra `mirella15-backup-v2` e a cópia do navegador ainda têm **123 convidados, 121 com família e 123 com responsável**. Os 123 nomes correspondem exatamente aos registros atuais; apenas o convidado extra **Lucas Gomes Camaz** não está no backup.
- A causa estrutural está em `saveMirellaState`: qualquer pequena edição envia novamente os **124 convidados completos**. Uma aba antiga, outro usuário ou uma carga incompleta pode, portanto, regravar campos que ninguém editou.
- A proteção adicionada anteriormente não é suficiente:
  - a carga considera sucesso mesmo se as consultas de famílias/responsáveis falharem;
  - a trava ignora o erro da própria consulta de conferência e, nesse caso, deixa a gravação seguir;
  - ela aceita apagar até 5 vínculos por operação;
  - não existe controle de versão, então uma aba antiga vence uma edição mais nova;
  - o evento ativo é global e os dados não são recarregados com segurança ao trocar de evento.

## Plano de correção

### 1. Congelar o mecanismo perigoso e restaurar os dados

- Fazer um snapshot da situação atual antes de alterar qualquer registro.
- Restaurar, por correspondência exata de nome, somente `family_id`, `host_id` e `is_primary` dos 123 convidados presentes no backup.
- Preservar os dados mais recentes do banco: status, criança, idade, telefone, convites e prazos.
- Manter Lucas Gomes Camaz sem vínculo até revisão manual, pois ele não existe na cópia íntegra.
- Conferir antes de liberar o app: **124 convidados, 121 com família, 123 com responsável**, além dos totais por William, Késya e Mirella.

### 2. Remover completamente o “salvar a lista inteira”

- Excluir o autosave de `guests` em lote.
- Cada ação passará a atualizar somente o registro e os campos realmente alterados:
  - status altera apenas `status`;
  - criança altera apenas `is_child`/idade;
  - família altera apenas `family_id` e `is_primary`;
  - responsável altera apenas `host_id`;
  - convite altera apenas os campos de convite;
  - inclusão e exclusão continuam operações individuais.
- Tarefas também deixam de provocar uma regravação indireta dos convidados.
- A tela só confirma “Salvo” depois de reler/confirmar a linha persistida.

### 3. Blindagem no próprio banco

- Criar uma proteção transacional que bloqueie qualquer operação comum que tente remover família ou responsável de vários convidados de uma vez.
- A restauração administrativa controlada terá um caminho explícito e separado; clientes antigos não poderão contornar a proteção.
- Registrar auditoria de alterações de vínculo: convidado, valor anterior, valor novo, usuário e horário.
- Criar snapshots automáticos dos vínculos para permitir recuperação sem depender do navegador.

### 4. Corrigir carga, concorrência e troca de evento

- Tratar falha em qualquer consulta de convidados, famílias ou responsáveis como falha total de carga e manter a tela somente leitura.
- Passar `eventId` explicitamente para cada leitura/gravação; remover a dependência do evento global mutável durante operações assíncronas.
- Ao trocar de evento: cancelar gravações pendentes, zerar o estado, carregar o novo evento e só então liberar edição.
- Adicionar controle de concorrência por `updated_at`: uma aba antiga não poderá sobrescrever uma alteração mais recente; mostrará conflito e recarregará a linha.
- Sincronizar alterações feitas por outro perfil/aba, sem reenviar registros não editados.

### 5. Validação contra reincidência

- Testar edição simultânea em duas abas e com dois perfis.
- Testar falha das consultas de famílias/responsáveis: nenhuma gravação pode ocorrer.
- Testar aba antiga aberta antes da restauração: o banco deve recusar qualquer limpeza em massa.
- Testar troca de evento sem vazamento ou sobrescrita entre eventos.
- Testar individualmente status, família, responsável, criança, convites, inclusão e exclusão.
- Reabrir o app e confirmar que os vínculos permanecem após recarregar.

## Resultado esperado

A recuperação resolve o incidente atual, mas a mudança principal é arquitetural: **nenhum cliente voltará a ter permissão funcional para regravar a lista completa**. Uma edição em um convidado tocará somente aquele campo daquela linha, e uma aba desatualizada será impedida de apagar dados mais novos.
