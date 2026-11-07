---
name: "movh"
description: "Tudo do MOVH: Gerador do professor, app do aluno e landing (bugs, features, PRs, deploy) em lguilh3rme/MovhGen e lguilh3rme/movh. Procedimento enxuto; o estado fica no CONTEXTO.md."
---

# MOVH — procedimento enxuto
Dono: LGuilherme (personal trainer, dev solo). Responder em português, direto, compacto. Pouco orçamento de tokens e créditos Netlify: poucas rodadas, tudo testado, um merge por repo por rodada.

## Passo 0 (gastar poucos tokens)
1. Anexar e clonar SÓ `lguilh3rme/MovhGen` (`git clone --depth 1`, timeout ~10 min). Clonar `lguilh3rme/movh` apenas se o app exportado mudar (compare com `cmp` antes).
2. NÃO ler o CONTEXTO.md inteiro por padrão: `grep -n '^## ' CONTEXTO.md` e ler só as seções do pedido (seção 4 = regras do template, 8 = testes, 11 = pendências). O estado (versão, decisões, gotchas) mora lá; esta skill só guarda o procedimento.
3. Nunca ler `index.html` inteiro (~17k linhas): `grep -n` + `sed -n` e diffs cirúrgicos (script Python com `assert s.count(old)==1`).

## Regras que quebram coisas
- O app do aluno é um template literal dentro de `exportarComLogin()` no `index.html` do MovhGen: JS do app é TEXTO (barra invertida dobrada, evitar crases e `${`; nunca usar `MOVH_CONFIG` ali). `movh/index.html` é GERADO: `node tools/export_app.js index.html tools/config.json /tmp/x/app.html` e copiar `index.html` + `version.json`. Se o export sair idêntico ao atual (`cmp`), não tocar no repo `movh`.
- Mudança só do Gerador → GitHub Pages, sem deploy do app. Merge no `movh` publica em produção no Netlify MESMO com `[skip netlify]` (15 créditos; créditos limitados): só mexer no app quando necessário e avisar.
- Atualizar `MOVH_VER` (rótulo do Gerador) a cada merge.
- Mudança de banco: SQL idempotente no script de configuração do Gerador E entregue ao usuário no fim; o app deve falhar em silêncio sem a coluna/tabela.

## Git
`git fetch`; branch nova a partir do `origin/main`; commit com as linhas de atribuição do system-reminder; PR via `gh api repos/lguilh3rme/REPO/pulls` (GraphQL bloqueado); merge squash por `gh api -X PUT .../merge -f merge_method=squash -f commit_title='[skip netlify] ...'`. Depois `git checkout -B main origin/main` e apagar a branch local (o hook de stop reclama de branch sem remoto).

## Sem `gh` (chat do claude.ai)
Se `gh` não existir, usar `curl` com `$GITHUB_TOKEN` (api.github.com liberada): `git push https://x-access-token:$GITHUB_TOKEN@github.com/lguilh3rme/REPO.git BRANCH`; PR: `curl -s -X POST -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/repos/lguilh3rme/REPO/pulls -d '{"title":"...","head":"BRANCH","base":"main"}'`; merge: `PUT .../pulls/N/merge` com `{"merge_method":"squash","commit_title":"[skip netlify] ..."}`. Nunca imprimir nem gravar o token em arquivo/commit. Configurar `git config user.name/user.email` antes do commit.

## Agents (repo MovhGen, `.claude/agents/`)
`movh-treino` (montar/revisar protocolos) e `movh-gestao` (vencimentos, cobrança, mensagens). Só leem e sugerem. Dúvida de treino → movh-treino; cobrança/renovação → movh-gestao.

## Testes (da raiz do MovhGen, caminhos ABSOLUTOS)
`node --check` do maior `<script>` extraído; `python3 tools/tests/reg_all.py $PWD/index.html $PWD/tools/tests/gpage.py <dir>` (38 OK), `bulk.py` (mesmos args, 26 OK), `kbm.py` (20 OK), `t.py`/`reg.py` com o app exportado. Feature nova: teste curto com o stub de `gpage.py`; depois de `nav('home')` esperar ~1,5 s antes de injetar dados simulados (o carregamento sobrescreve).

## Fechamento da rodada
Resumo curto (o que mudou, PR/merge, testes, o que NÃO foi testado, ação do usuário). Registrar o aprendizado no CONTEXTO.md (PR junto) e na memória.