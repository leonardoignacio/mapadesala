# Melhorias aplicadas

## Sprint atual: calendário e Espelho

### Calendário (bugs encontrados e corrigidos)

| Bug | Correção |
|---|---|
| **"Baixar CSV" quebrado**: chamava `gerarCalendarioBaseCSV`, que não existia (erro de JavaScript, nada acontecia) | Gerador implementado: feriados nacionais fixos, Carnaval, Sexta-feira Santa e Corpus Christi (calculados pela Páscoa de cada ano) e **pontes** (feriado na terça gera ponte na segunda; na quinta, na sexta). O ano é validado (2000 a 2100) |
| **Formulário "Adicionar Exceção Manual" quebrado**: chamava `salvarExcecaoManual`, que não existia | Implementada, com bloqueio de data repetida |
| **Importação em lote nunca gravava nada**: exigia um campo `tipo` que o CSV não possui, então descartava todas as linhas | Importa `data`, `excecao` e `descricao`; descrição vazia assume o tipo |
| O CSV que o próprio sistema gera **não podia ser reimportado**: o BOM do Excel invalidava o cabeçalho | BOM tratado; aceita `;`, `,` ou TAB, aspas (inclusive com `;` dentro) e cabeçalhos com ou sem acento |
| Datas `DD/MM/AAAA` ou inválidas (ex.: 31/02) | Aceita os dois formatos, rejeita datas impossíveis e lista as linhas com erro (número da linha e motivo) |
| Lotes acima de 500 registros estourariam o limite do Firestore | Gravação em lotes de 400 |
| Registros antigos sem `dia_semana` ou só com `tipo` exibiam "undefined" e quebravam os filtros | Leitura normalizada: o dia da semana é calculado e `tipo`/`excecao` são unificados |
| Falha ao excluir exceção passava em silêncio | Mensagem de erro; botões desativados durante o salvamento (evita duplo clique) |

Observação: o nome do arquivo gerado agora é `feriados_pontes_AAAA.csv`. O gerador cobre apenas feriados nacionais; feriados estaduais/municipais e reuniões pedagógicas continuam sendo cadastrados manualmente ou no CSV.

### Espelho

- **Quantidade de encontros na distribuição in loco**: novo campo (input com lista) com "Todos" (padrão, assume todo o saldo restante da UC) ou um número. A lista vai até o saldo da UC, o campo volta para "Todos" ao trocar de UC e fica desabilitado em "TODAS". Se o número pedido passar do saldo, o sistema lança o saldo e avisa; se faltarem datas livres, avisa quantos foram possíveis.
- **Barras de status (previsto / distribuídos / faltam)** agora também no **encontro individual** e na **edição dos encontros selecionados**, atualizadas ao escolher a UC ou mudar o horário, com a projeção "ao salvar / ao aplicar" (e alerta amarelo se ultrapassar o previsto).
- **Botões por turma conforme a seleção**: sem seleção aparecem **＋ Lançar encontros in loco** e **− Remover encontros futuros da UC**; com seleção, eles dão lugar a **✎ Editar selecionados** e **× Excluir selecionados**. O **↺ Limpar seleção** aparece sempre que houver seleção (agora também para o Apoio, que antes não tinha como limpar).
- **Duplo clique** em qualquer encontro (ou data vaga) selecionado abre a edição dos selecionados. Para o Apoio, que não edita, abre o SS/SGO em lote. Sem seleção, continua abrindo a edição individual.
- **SS/SGO in loco (Apoio e Admin)**: a função já existia; foi ajustada para abrir já no escopo mais provável ("encontros selecionados" se houver seleção; senão, "toda a UC").
- **Erros dentro de formulários** (distribuição, encontro e edição em lote) agora aparecem em caixa de diálogo e **o formulário continua aberto**. Antes o modal fechava (perdendo o que foi digitado) ou a mensagem ficava escondida atrás dele.
- Arquivo novo: `espelho/app_espelho_progresso.js`.

### Próxima sprint (prioridade máxima): cota gratuita do Firebase

O `onSnapshot` de cada coleção relê todos os documentos a cada carregamento da página. Ponto de partida para o planejamento: sincronização incremental (buscar só o que mudou desde a última visita), carregar encontros apenas das turmas exibidas e reduzir listeners por perfil.

---

## Sprint anterior

Resumo da revisão do projeto Mapa de Sala. Tudo foi feito sem alterar o layout das telas.

## 1. Publicar primeiro: regras do Firestore (`RegrasFirebase`)

Copie o conteúdo do arquivo `RegrasFirebase` em **Firebase Console > Firestore Database > Regras > Publicar**.

Problemas corrigidos em relação às regras anteriores:

| Problema anterior | Como ficou |
|---|---|
| `allow create: if true` em `usuarios`: qualquer pessoa (até sem login) podia criar um cadastro com `cargo: 'root'` | Só cria quem está autenticado, com o **próprio e-mail**, e sempre como `pendente` (sem perfis/áreas) |
| O titular podia editar o próprio documento, inclusive `cargo` | O titular edita só os dados da solicitação; `cargo`, `perfis`, `areas` e `status` ficam bloqueados |
| A regra genérica `/{document=**}` dava escrita total a docentes, inclusive em `usuarios` (as regras se somam) | Sem regra genérica: cada coleção tem regra própria |
| Gestor podia promover a si mesmo ou alterar quem está acima dele | Hierarquia no servidor (root > admin > técnico > docente > apoio): só altera e atribui níveis inferiores ao seu |
| Usuário `inativo`/`bloqueado` mantinha acesso | Acesso cai imediatamente (status ausente continua valendo como ativo, como no app) |
| Apoio não conseguia gravar SS/SGO (a interface permitia, as regras negavam) | Apoio pode alterar **somente** `SS`, `SGO` e `atualizado_em` em `encontros` |
| Docentes liam justificativas e dados de usuários pendentes | Quem não é gestor lê apenas usuários com `status == 'ativo'` e o próprio documento |
| Exceções de calendário e salas gravadas por qualquer docente | Exceções: root/admin. Salas: root/admin/técnico (igual à interface) |
| Trilha `Alterações` editável/apagável | Só é possível criar registros; leitura apenas para gestores |

**Atenção:** usuários antigos precisam ter o campo `status: "ativo"` para aparecerem na lista de docentes do Espelho para docentes/apoio (a consulta filtra por esse campo). Usuários credenciados pelo painel já recebem esse campo.

Teste sugerido no **Rules Playground** do console (as regras não puderam ser executadas aqui, apenas revisadas):

1. Sem login, `create` em `usuarios/x@x.com` com `cargo: 'root'` deve ser **negado**.
2. Logado como docente, `update` em `usuarios/<ele mesmo>` mudando `cargo` deve ser **negado**; mudando só `nome` deve ser **permitido**.
3. Logado como docente, `update` em `usuarios/<outro>` deve ser **negado**.
4. Logado como apoio, `update` em `encontros/<id>` com `{SS: true}` deve ser **permitido**; com `{data: ...}` **negado**.
5. Logado como técnico, atribuir `cargo: 'admin'` a alguém deve ser **negado**.

## 2. Mensagens modais (`dialog.js`)

Todos os `alert()` e `confirm()` (49) foram substituídos por caixas modais no padrão visual do projeto:
`Dialog.sucesso`, `Dialog.erro`, `Dialog.aviso`, `Dialog.info` e `await Dialog.confirmar(msg, { perigo: true })`.
Recursos: fila (uma por vez), `Esc` cancela, foco preso na caixa, foco inicial em "Cancelar" nas exclusões, texto sempre tratado como texto (sem HTML).
Erros do Firebase são traduzidos (`util.js`): sem permissão, sem internet, limite diário atingido, senha fraca etc.
As exclusões de curso, UC, turma e exceção agora têm tratamento de erro (antes falhavam em silêncio).

## 3. Bugs corrigidos

- **Pré-cadastro por e-mail e senha**: o parâmetro estava invertido e a conta nunca era criada no Firebase Auth. Agora a conta é criada antes de gravar o documento e a confirmação de senha é validada.
- **`excluirCadastroProprio` e `reenviarSolicitacao`** eram chamadas pela tela do usuário pendente mas não existiam. Implementadas.
- **Login**: falha ao verificar o credenciamento (rede, regras, cota) deixava a tela travada em "Verificando…". Agora exibe a mensagem e volta ao login.
- Usuário pendente não abre mais os listeners de todas as coleções (menos leituras e menos erros de permissão).

## 4. Cache e consumo do banco

- Root, admin e técnico mantêm os dados completos de usuários (o técnico precisa deles no painel de credenciamento).
- Docente e apoio: a consulta de `usuarios` traz **apenas ativos** (menos leituras) e mantém só nome, e-mail, cargo, perfis, áreas e status de outros usuários, tanto na memória quanto no cache do navegador. Justificativas, datas de auditoria e usuários pendentes/inativos não são guardados. O cache restaurado também passa por esse filtro.
- Observação: o cache em `localStorage` acelera a primeira tela, mas o `onSnapshot` continua lendo cada coleção inteira a cada carregamento da página. Se a cota gratuita apertar, o próximo passo é sincronização incremental (buscar só o que mudou).

## 5. Segurança de interface

Escape de HTML (`Util.esc`) aplicado onde dados do Firestore entravam em `innerHTML`: credenciamento, calendário, cursos, turmas, pré-cadastro e barra lateral. O Espelho já escapava seus dados.

## 6. Espelho dividido

Os três arquivos grandes (77 KB, 33 KB e 24 KB) viraram 17 arquivos por funcionalidade, no padrão `app_` / `controller_` / `views_`. O maior tem 24 KB. A divisão foi verificada por comparação automática: 47 funções do controller, 7 das views e 103 do app, com código idêntico ao original.

## 7. Verificações executadas

- Sintaxe de todos os arquivos JS.
- `dialog.js` e `util.js` em Chromium: texto sem HTML, Esc, foco, fila, clique fora, tradução de erros.
- `Store` com Firestore simulado: filtro por `status`, projeção de campos, cache sem dados sensíveis, restauração de cache por perfil.
- Aplicação completa em Chromium com Firebase simulado: todos os scripts carregam, pré-cadastro cria a conta antes do documento, validação de senha, justificativa com HTML não executa, exclusão do próprio cadastro.

Não foi possível testar contra o Firebase real nem com o Tailwind carregado. Vale um teste manual rápido de login, credenciamento, Espelho e exclusões após publicar as regras.
