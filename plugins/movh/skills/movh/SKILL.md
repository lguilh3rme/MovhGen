---
name: "movh"
description: "Tudo do MOVH: Gerador do professor, app do aluno e landing (bugs, features, PRs, deploy) em lguilh3rme/MovhGen e lguilh3rme/movh. Procedimento enxuto; o estado fica no CONTEXTO.md."
---

# MOVH — procedimento enxuto
Dono: LGuilherme (personal trainer, dev solo). Responder em português, direto, compacto. Pouco orçamento de tokens e créditos Netlify: poucas rodadas, tudo testado, um merge por repo por rodada.

## Regra de ouro: commitar o progresso SEMPRE (os tokens podem acabar a qualquer momento)
O sandbox é descartável: o que não está no GitHub some quando a sessão/conta acaba. Então:
- Depois de CADA bloco que funciona (um item concluído, um teste que passou, ~1 edição relevante), dar `git add -A && git commit -m "[skip netlify] WIP: <o que ficou pronto>"` e `git push origin HEAD` (rascunho temporário vale; squash depois). Nunca acumular várias edições só no sandbox.
- Mudança de código em andamento → branch `wip/<assunto>` (push a cada bloco); `main` só recebe o que passou nos testes. Mudança só de doc (CONTEXTO/skill) → direto no `main`.
- No `CONTEXTO.md` seção 0, manter a lista do plano com `[x]` feito / `[ ]` falta + nome da branch `wip/...` + SHA do último commit, e atualizar a cada commit. Quem retomar: `git fetch && git checkout wip/<assunto>` e seguir do primeiro `[ ]`.
- Ao concluir: PR/squash da `wip/` no `main`, apagar a branch (`git push origin --delete wip/...`), limpar a seção 0.
- Token: usar `$GITHUB_TOKEN` só em variável de ambiente; nunca gravar em arquivo, remote, commit ou resposta. Se o usuário colou o token no chat, lembrar de revogar no fim.

## Passo 0 (gastar poucos tokens)
0. ANTES de executar qualquer tarefa: gravar no `CONTEXTO.md` do MovhGen, na seção `0. EM ANDAMENTO`, data/hora + pedido + plano (2-4 linhas), e dar commit `[skip netlify]` + push direto no `main` (só docs). Assim, se a sessão acabar, outra conta retoma do ponto certo clonando o repo (estado = CONTEXTO.md; procedimento = esta skill; a conexão é o GitHub vinculado à conta + `add_repo`, não o plugin). Ao concluir, apagar a entrada e registrar o estado final nas seções certas.
1. Anexar e clonar SÓ `lguilh3rme/MovhGen` (`git clone --depth 1`, timeout ~10 min). Clonar `lguilh3rme/movh` (app) só se o app exportado mudar (compare com `cmp`); `lguilh3rme/movhtemplate` = landing (planmovh.netlify.app; planos vêm do Supabase `landing_config`, presencial fixo em `PRES`/`PL_ADAPT`). Clone anônimo é SÓ leitura: para push use `add_repo` com `access:"push"` (o clone fica em `/home/claude/<repo>`).
2. NÃO ler o CONTEXTO.md inteiro por padrão: `grep -n '^## ' CONTEXTO.md` e ler só as seções do pedido (seção 4 = regras do template, 8 = testes, 11 = pendências). O estado (versão, decisões, gotchas) mora lá; esta skill só guarda o procedimento.
3. Nunca ler `index.html` inteiro (~17k linhas): `grep -n` + `sed -n` e diffs cirúrgicos (script Python com `assert s.count(old)==1`).
4. Sincronia skill↔repo: a fonte da verdade desta skill é `plugins/movh/skills/movh/SKILL.md` no MovhGen (versão em `plugins/movh/.claude-plugin/plugin.json`). Depois do clone: `cmp /mnt/skills/plugin-files/movh/skills/movh/SKILL.md plugins/movh/skills/movh/SKILL.md`. Se diferir, SEGUIR a versão do repo e avisar o usuário para reinstalar o plugin (zip ou `/plugin marketplace update`); reinstalar também remove a skill antiga `movh-gerador`, que não existe mais: o nome do plugin e da skill é só `movh`. Mudou procedimento, regra ou agent → editar em `plugins/movh/`, subir a versão (plugin.json + marketplace.json) e incluir no PR da rodada. Estado do projeto vai no CONTEXTO.md; procedimento vai no plugin. Nunca guardar token em arquivo do repo (público).

## Regras que quebram coisas
- O app do aluno é um template literal dentro de `exportarComLogin()` no `index.html` do MovhGen: JS do app é TEXTO (barra invertida dobrada, evitar crases e `${`; nunca usar `MOVH_CONFIG` ali). `movh/index.html` é GERADO: `node tools/export_app.js index.html tools/config.json /tmp/x/app.html` e copiar `index.html` + `version.json`. Se o export sair idêntico ao atual (`cmp`), não tocar no repo `movh`.
- Mudança só do Gerador → GitHub Pages, sem deploy do app. Cada deploy do `movh` custa ~15 créditos. Em 08/11 um merge com `[skip netlify]` NÃO publicou: para publicar, commit SEM a tag direto no `main` do `movh` (1 deploy, sem preview de PR) e pedir ao usuário que confira em Deploys ("Production: main@SHA"). Só mexer no app quando necessário e avisar.
- Atualizar `MOVH_VER` (rótulo do Gerador) a cada merge. Antes de mesclar no `movh`: `A_BUILD` do `index.html` == `version.json`.
- Visual: regras antigas `.vbtn` e `.ec-name-row .vbtn` usam `!important`; componente novo precisa de `!important` ou escopo (`body.classe`) e conferência por PRINT real, porque os testes não pegam layout. Em `onclick` do template evitar aspas escapadas (`==1`, não `==='1'`). Pedir/mostrar print antes de aplicar visual: Playwright 390x844 dpr 2 com o stub de `tools/tests/t.py`; o sandbox não alcança YouTube (`i.ytimg.com`), então as imagens do print são ilustrativas: avisar.
- Netlify: cada push num PR do `movh` gera Deploy Preview (~15 créditos) e o merge gera produção (~15): um único push por rodada. O sandbox não alcança movh.netlify.app; o usuário confirma em Deploys ("Production: main@SHA").
- Supabase (conector, projeto `cfanjhuzrcgxrbfmhahi`): só SELECT por padrão; escrita, DDL e deploy de Edge Function só com autorização dele; para dados reais de aluno em print, buscar um recorte pequeno (`jsonb_build_object`), nunca o protocolo inteiro.
- Mudança de banco: SQL idempotente no script de configuração do Gerador E entregue ao usuário no fim; o app deve falhar em silêncio sem a coluna/tabela.

- Fase `base` = fase única 8 sem, progressão dupla: `fatorSemanaDentroFase`/`aFatorSemanaDentroFase` devolvem fator neutro para `base` (nunca voltar a cair reps/subir descanso por semana). Protocolo novo já nasce assim (`REGRA_BASE`/`nbBase()`).
- Próxima fase: botão "✨ Próxima fase" em Protocolos do aluno → `mbSugerirProximaFase` (rascunho INATIVO; regras em `PF_MUSCULOS`/`PF_COMPOSTO`; não toca o ativo). Mudou a regra → mexer ali e no agent `movh-treino`.
- `const`/`let` usados pelo estado inicial (`let semanas=[...]`) precisam ser declarados ANTES dele (TDZ); `function` é içada, `const` não.

## Retomar em outra conta/sessão (3 passos)
1. Conta nova precisa de: GitHub vinculado (Customize → Connectors), conector Supabase (só SELECT por padrão) e o plugin `movh` instalado/atualizado. Sem conector, usar `$GITHUB_TOKEN` colado só pra clonar/pushar.
2. `git clone` do MovhGen; `git branch -r | grep wip/` e `git log -5 --format='%h %ad %s'`; ler a seção 0 do `CONTEXTO.md`.
3. Se existir `wip/...`, fazer checkout e continuar do primeiro `[ ]`; se não, o repo está limpo e vale o pedido atual. Comparar a skill (`cmp`, passo 4) e avisar se o plugin estiver velho.

## Git
`git fetch`; branch nova a partir do `origin/main`; commit com as linhas de atribuição do system-reminder; PR via `gh api repos/lguilh3rme/REPO/pulls` (GraphQL bloqueado); merge squash por `gh api -X PUT .../merge -f merge_method=squash -f commit_title='[skip netlify] ...'`. `gh pr create` falha (GraphQL): sempre `gh api`. Depois `git checkout -B main origin/main` e apagar a branch local. Aviso do hook de stop "unpushed commit(s)" após squash é falso positivo se `git diff --stat origin/main BRANCH` for vazio: não repushar.

## Sem `gh` (chat do claude.ai)
Sem `$GITHUB_TOKEN` não há push: entregar `index.html` + patch (`git diff`) do MovhGen, `index.html`+`version.json` do app e o zip do plugin, e dizer o que o usuário deve commitar. Se `gh` não existir, usar `curl` com `$GITHUB_TOKEN` (api.github.com liberada): `git push https://x-access-token:$GITHUB_TOKEN@github.com/lguilh3rme/REPO.git BRANCH`; PR: `curl -s -X POST -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/repos/lguilh3rme/REPO/pulls -d '{"title":"...","head":"BRANCH","base":"main"}'`; merge: `PUT .../pulls/N/merge` com `{"merge_method":"squash","commit_title":"[skip netlify] ..."}`. Nunca imprimir nem gravar o token em arquivo/commit. Configurar `git config user.name/user.email` antes do commit.

## Agents (repo MovhGen, `.claude/agents/`)
`movh-treino` (montar/revisar protocolos; conhece a fase única base 8 sem e a progressão dupla) e `movh-gestao` (vencimentos, cobrança, mensagens). Só leem e sugerem. Dúvida de treino → movh-treino; cobrança/renovação → movh-gestao.

## Testes (da raiz do MovhGen, caminhos ABSOLUTOS)
`node --check` do maior `<script>` extraído; `python3 tools/tests/reg_all.py $PWD/index.html $PWD/tools/tests/gpage.py <dir>` (38 OK), `bulk.py` (mesmos args, 26 OK), `kbm.py` (20 OK), `t.py`/`reg.py` com o app exportado. `kbm.py` abre `/home/claude/movhgen/index.html` (minúsculo): `ln -sfn /home/claude/MovhGen /home/claude/movhgen`. `t.py` imprime OK e depois um `FAIL` esperado (caminho de erro; igual no app em produção). Feature nova: teste curto com o stub de `gpage.py`; depois de `nav('home')` esperar ~1,5 s antes de injetar dados simulados (o carregamento sobrescreve).

## No terminal local (Claude Code)
- Usar `git`/`gh` normais com o login do `gh` (não `add_repo`, não `$GITHUB_TOKEN`).
- `kbm.py` usa caminho relativo (`$PWD/index.html`), não `/home/claude/movhgen`.
- ⚠️ Se o Claude Code estiver atrás de proxy (ex.: `fcc-claude`), o modelo pode NÃO ser da Anthropic → NÃO consultar Supabase com dados de aluno nem colar segredos.

## Fechamento da rodada
Resumo curto (o que mudou, PR/merge, testes, o que NÃO foi testado, ação do usuário). Registrar o aprendizado no CONTEXTO.md (PR junto) e na memória.