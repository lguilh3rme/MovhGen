# MOVH — Contexto v44 (10/10/2026)

Leia este arquivo antes de mexer em qualquer coisa. Dono: LGuilherme (personal trainer, dev solo). Português, respostas diretas.

## Repositórios e deploy
- `lguilh3rme/MovhGen` → Gerador do professor (movhgen.netlify.app). Arquivo único `index.html` (~14k linhas). É a FONTE de tudo.
- `lguilh3rme/movh` → app do aluno (movh.netlify.app). `index.html` é GERADO a partir do Gerador. Nunca editar à mão.
- Gerar o app: `node tools/export_app.js index.html tools/config.json <saida.html>` (em MovhGen). Copiar a saída para `movh/index.html`.
- Toda mudança no app do aluno = editar o Gerador (template dentro de `exportarComLogin()`), exportar e commitar nos DOIS repos.
- Netlify Free: cada deploy de produção = 15 créditos (300/mês, trava o site). Previews de PR = 0. Fluxo: branch → PR (`gh api`, GraphQL é bloqueado) → preview → merge squash. Commit só de docs: pôr `[skip netlify]` no título.

## Regras do template (exportarComLogin é template literal)
- Barra invertida dobrada (`\\d`, `\\'`). Evitar crases e `${` em código novo do app.
- Preferir `data-*` + `this.dataset.x` a escapar aspas em onclick.
- Checar sintaxe: extrair maior `<script>` e `node --check`.

## Backend (Supabase cfanjhuzrcgxrbfmhahi)
- Clients: `mbClient` (professor), `mbClientAvulso` (anon), `aClient` (aluno).
- Link público `?treino=TOKEN` usa RPC `get_treino_publico` (SECURITY DEFINER; tabela `links_treino`; `NOTIFY pgrst, 'reload schema'`). Erro mostra tela de erro própria, não login.
- Modo preview (`window._movhPreview`): data_inicio=hoje; se hoje não casa com nenhum "dia real da semana", roda a sequência da semana montada a partir de hoje, em ciclo.

## App do aluno — modelo de estado
- `aSeriesFeitas[eid]` (por exercício, localStorage `movh-series-AAAA-M-D`) ⇄ check do exercício ⇄ bloco (`bloco-concluido`): `aSeriesSync`, `aMarcarFeito`, `aAtualizarBlocoProgresso`.
- Badge de séries tocável: "séries 4 × reps 8 0/4" (empilhado), preenche como barra. Dica `aDicaSeries` some no 1º toque.
- Carga: `kg × reps ✓` inline, largura fixa, à direita. Vídeo: pílula no canto direito da linha do nome. Descanso: chip ⏱ (tracejado "60s" livre se vazio). Conjugado: grupo com borda roxa + faixa 🔗.
- Topo compacto: barra de progresso + texto na mesma linha.

## Gerador — o que existe
- Menu lateral: gaveta no celular (`sbToggle`), densidade no PC. Alunos: card compacto com "⚙️ Acesso, pedidos e testes" recolhível (mobile).
- Editor do dia: séries/descanso inline, arrastar `⋮⋮`, duplicar exercício/bloco/dia. Kanban (🗂️) abre de primeira (`nav` renderiza antes de ativar) e tem seletor de dia real + duplicar dia.
- Só no editor completo do dia: fase, foco, idioma, progressão automática, carregar modelo de bloco, obs do bloco.
- Splits padrão vêm SEM "dia real da semana" (causa dos dias vazios no app real do aluno): definir no kanban/editor.

## Testes (ambiente da IA)
- Playwright + Chromium, Supabase simulado por stub (`window.supabase.createClient`), viewport 390x844.
- Shell sem rede (só npm/pip/GitHub). Não dá para verificar o site no ar nem o banco real.

## Pendências / ideias
- Gamificação: timer de descanso automático ao tocar série, selo de recorde pessoal, sequência semanal, confete no fim, rolar para o próximo exercício.
- Levar fase/foco/progressão automática para o kanban.
- Blocos fechados por padrão (só o 1º aberto) para o treino caber na tela.
- Verificar no banco real: tabela `links_treino` e função `get_treino_publico` (SQL no Gerador, aba de configuração).
