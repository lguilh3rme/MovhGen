# Procedimentos raros do MOVH (movidos da SKILL.md em 22/11/2026, texto original)

Só abrir quando o caso se aplicar. A SKILL.md aponta para cá.

## (original) Retomar em outra conta/sessão
1. Conta nova precisa de: GitHub vinculado (Customize → Connectors), conector Supabase (só SELECT por padrão) e o plugin `movh` instalado/atualizado. Sem conector, usar `$GITHUB_TOKEN` colado só pra clonar/pushar.
2. `git clone` do MovhGen; `git branch -r | grep wip/` e `git log -5 --format='%h %ad %s'`; ler a seção 0 do `CONTEXTO.md`.
3. Se existir `wip/...`, fazer checkout e continuar do primeiro `[ ]`; se não, o repo está limpo e vale o pedido atual. Comparar a skill (`cmp`, passo 4) e avisar se o plugin estiver velho.

## (original) Testes: lista detalhada, só para depurar um teste (da raiz do MovhGen, caminhos ABSOLUTOS)

`node --check` do maior `<script>` extraído; `python3 tools/tests/reg_all.py $PWD/index.html $PWD/tools/tests/gpage.py <dir>` (38 OK), `bulk.py` (mesmos args, 26 OK), `kbm.py` (20 OK), `t.py`/`reg.py` com o app exportado. `kbm.py` abre `/home/claude/movhgen/index.html` (minúsculo): `ln -sfn /home/claude/MovhGen /home/claude/movhgen`. `t.py` imprime OK e depois um `FAIL` esperado (caminho de erro; igual no app em produção). Feature nova: teste curto com o stub de `gpage.py`; depois de `nav('home')` esperar ~1,5 s antes de injetar dados simulados (o carregamento sobrescreve).
