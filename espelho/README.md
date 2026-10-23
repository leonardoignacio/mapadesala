# Espelho de Classe — Mapa de Aulas

Módulo separado em `views_espelho.js`, `app_espelho.js` e `controller_espelho.js`, carregado pelo `index.html` e inicializado pela rota `#/espelho` em `app.js`.

## Seleção de turmas e docentes

A caixa “Turmas exibidas por área e curso” é um único acordeon; as áreas e cursos permanecem expandidos dentro dela, com seleção em nível de área, curso ou turma. Docentes apresentados para escala precisam estar ativos (`status: "ativo"`), ter cargo principal `cargo: "docente"`, perfil `"docente"` e habilitação para a área do curso (ou todas as áreas). O cargo principal é necessário porque os perfis do sistema são acumulados e coordenadores/técnicos também podem conter `"docente"` em `perfis`. A seleção é por checkbox e aceita dupla ou múltipla docência.

O mapa mostra as datas do mês ativo conforme o filtro de dias da semana. Domingos são destacados em vermelho claro; a coluna de datas inclui um filtro por dia da semana, com todos os dias marcados por padrão nas abas Manhã, Tarde e Noite, e somente sábado marcado por padrão na aba Sábados. Células ocupadas e vazias têm fundos distintos. O cabeçalho compartilhado das turmas fica acima e fora dos acordeons de ano/mês, fixo junto com as abas de período durante a rolagem vertical; a coluna de data permanece ancorada à esquerda na rolagem horizontal. As larguras de colunas são compartilhadas pelo cabeçalho e pelas tabelas mensais.

## Modelo Firestore adotado

Os documentos serão gravados em `encontros`, com ID gerado pelo Firestore:

```js
{
  id_turma: "id da turma",
  turma_referencia: "TI-35",
  data: "AAAA-MM-DD",
  tipo: "aula", // ou "cancelamento"
  id_uc: "id da UC incluída na turma",
  uc_referencia: "UC-01",
  uc_titulo: "Título da UC",
  uc_carga_horaria: 96,
  h_inicio: "08:00", // herdado da turma, mas editável por encontro
  h_termino: "12:00", // herdado da turma, mas editável por encontro
  ch_encontro: 4, // calculado pelos horários do encontro
  modalidade: "Presencial", // ou "Remoto"
  docentes: [{ id: "email/document-id", email: "...", nome: "..." }],
  SS: false,
  SGO: false,
  sala_id: "", // opcional
  sala_nome: "", // opcional
  descricao: "", // observações
  criado_em: "ISO-8601",
  atualizado_em: "ISO-8601"
}
```

A coleção `datas_excecoes` existente continua sendo a fonte das exceções globais de calendário, identificadas por data `AAAA-MM-DD`; essas datas são exibidas no mapa e excluídas da distribuição automática e dos destinos de arraste. Cancelamentos específicos de turma ficam como documentos `tipo: "cancelamento"` em `encontros`.

Ao arrastar um encontro sobre uma data ocupada, o ocupante é provisoriamente transferido para a próxima data de aula livre, respeitando período da turma e exceções; a pré-visualização acontece no dragover e a grade é consolidada ao soltar. Ao arrastar junto às bordas do painel, a tabela rola vertical e horizontalmente para permitir alcançar datas fora da área visível. **Salvar Alterações** valida destinos, limita batches abaixo do teto do Firestore, mostra erros sem apagar o estado pendente e atualiza a grade local em sucesso. **Descartar** reverte as movimentações ainda não salvas somente da turma correspondente. Duplo clique em um cartão abre o modal de edição; duplo clique em uma linha/célula do calendário destaca a linha inteira. Os modais têm cabeçalho e rodapé fixos com ações acessíveis e impedem submissões duplicadas enquanto salvam.

A carga horária total da UC dividida pela CH aplicada à distribuição gera o total de encontros, usando arredondamento para cima. O seletor de distribuição lista somente UCs com saldo pendente e inicia na primeira pendente; `TODAS` permanece como última opção para distribuir os saldos das UCs. Três barras resumem o total previsto, encontros já distribuídos e o saldo restante. A distribuição percorre somente datas vazias e não excepcionadas que coincidam com os dias da semana marcados, sem preencher outros dias. Docentes são selecionados em um modal por dia da semana. Início, término, CH calculada, modalidade/tipo, sala e observações são preenchidos uma única vez e aplicados a todos os encontros daquela distribuição; horários herdam o padrão da turma. O CSV usa `data;referencia_uc;docentes_email`; os dados gerais do formulário aplicam-se às linhas importadas e as datas do arquivo também precisam coincidir com dias da semana marcados. Docentes em dupla podem ser separados por `|`.

O painel de cronograma tem abas Manhã, Tarde, Noite e Sábados; a legenda redundante de cores foi removida. Turmas com sábado entre os dias letivos aparecem na aba Sábados; as demais são agrupadas pelo período cadastrado. Nos filtros das abas Manhã, Tarde e Noite, o sábado inicia desmarcado; na aba Sábados, somente sábado inicia marcado. O filtro **ANOS**, ao lado do filtro de dias, lista os anos cobertos pelas turmas e permite ativar/desativar cada ano e seus 12 meses; o padrão inicial seleciona o mês atual e os seis seguintes, e pode ser restaurado pelo próprio filtro. Cada coluna recebe uma paleta estável por turma e os cartões/células ocupados recebem tonalidades diferentes por UC, mantendo domingos destacados em vermelho claro. As cores vermelho e amarelo permanecem reservadas a significados de calendário/cancelamento, não às colunas ou UCs.

O módulo consulta a coleção `salas_aula` e cria documentos com `referencia`, `tipo` (`Comum` ou `Laboratório`), `numero_cadeiras` e `observacoes`. Há uma guia **Recursos** para cadastrar e listar salas; sala continua opcional e não é requerida para encontros remotos. Uma leitura legada de `salas_laboratorios` é tentada se a coleção nova não estiver acessível.

## Permissões e implantação

O mapa filtra turmas de usuários com `cargo: "docente"` pelas áreas habilitadas em `usuarios.areas`, incluindo compatibilidade entre área da turma e área/tipo do curso. As gravações repetem a verificação de permissão da turma e validam perfil, status e área do docente escalado.

Essas verificações são validações na aplicação cliente. As regras de segurança do Firestore precisam aplicar as mesmas restrições no servidor antes de produção; o projeto recebido não continha `firestore.rules` para atualização. As coleções `encontros` e `salas_aula` precisam de regras apropriadas: leitura dos recursos para perfis que usam o mapa e gravação de salas restrita aos perfis de gestão.

O ZIP inicial não continha `firebase-config.js`, portanto a conexão real com Firebase precisa ser validada no projeto original após substituir/mesclar os arquivos atualizados.


**Apresentação e distribuição:** as cores vermelho e amarelo não são usadas nas paletas das turmas. Vermelho destaca feriados e cancelamentos; amarelo destaca pontes e reuniões pedagógicas. Domingos são destacados em vermelho claro. Cartões usam altura mínima compacta de 88 px: o título da UC ocupa uma linha exclusiva, em caixa colorida de largura total e texto centralizado, com a modalidade concatenada após `|`. Na linha seguinte o docente aparece em destaque e, à direita, ficam as caixas Encontro, SS e SGO; SS e SGO têm alturas iguais. Em cartões estreitos, os controles quebram para outra linha para preservar a legibilidade. Sala/observações ocupam uma faixa inferior flexível. Os horários e CH ficam no modal. Células vazias e exceções usam a mesma altura mínima e a tabela tem bordas discretas. SS e SGO são checkboxes no cartão: alterar um deles solicita confirmação e salva a alteração imediatamente. Ao mover um encontro, ambos passam para desativados e a mudança é gravada junto com o movimento. Os dias da semana começam desmarcados na distribuição in loco e são ativados ao selecionar docentes para o respectivo dia.


Ações compactas com ícones **Distribuir** e **Remover** ficam empilhadas no cabeçalho de cada turma. Enquanto houver mudanças de drag/drop, há também **Salvar** e **Descartar**: descartar reverte somente a prévia não persistida daquela turma. A remoção oferece somente UCs já distribuídas e uma opção `TODAS`; pode apagar somente encontros com data estritamente futura, tanto na interface quanto no controlador. Encontros de hoje ou do passado e cancelamentos são preservados. O filtro da coluna Data fecha ao clicar fora, permite marcar dias individualmente e restaurar o padrão próprio da aba. Cabeçalho e grades mensais mantêm largura fluida e compartilham o mesmo `colgroup`, alinhados também pela área interna comum.
