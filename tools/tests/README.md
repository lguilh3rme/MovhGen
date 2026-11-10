# Testes (Playwright + Chromium, Supabase simulado)
Rodar da raiz do repo MovhGen. Cada script imprime OK/FAIL.
- `python3 tools/tests/reg_all.py index.html tools/tests/gpage.py /tmp` → 10 páginas, editor, kanban, dock, exportação (desktop + mobile)
- `python3 tools/tests/bulk.py index.html tools/tests/gpage.py /tmp` → edição em massa (página do dia)
- `python3 tools/tests/kbm.py` → edição em massa no Quadro (usa `tools/tests/gpage.py` para o stub)
- `python3 tools/tests/t.py <app.html>` → link público `?treino=`: caminho OK e caminho de erro
- `python3 tools/tests/reg.py <app.html> tools/tests/t.py /tmp` → botão "Fazer o registro" leva a "Criar conta"
Sintaxe: extrair o maior `<script>` e `node --check`.
Obs: botões com animação infinita precisam de `click(force=True)`. `alert/confirm` são dispensados em silêncio pelo Playwright.
- `node tools/tests/cp_engine.js index.html` → motor de corrida (`cpPlano`, 19 OK); `node tools/tests/pf_cond.js index.html` → decisão progride/mantém/recua (`PF_COND`, 33 OK)
- `python3 tools/tests/prox_fase.py $PWD/index.html` → Próxima fase → Editar no Quadro (8 OK); `python3 tools/tests/prox_cond.py $PWD/index.html` → corrida na Próxima fase com aderência/RPE/dor/teste simulados (14 OK)
