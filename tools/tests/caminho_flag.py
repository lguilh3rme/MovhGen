"""Gerador: interruptor 'Caminho' por aluno (padrão desligado; sem coluna não quebra).
Uso: python3 tools/tests/caminho_flag.py <index.html> [pasta_prints]"""
import sys
from playwright.sync_api import sync_playwright
STUB = open(__file__.replace('caminho_flag.py', 'gpage.py'), encoding='utf-8').read().split('STUB="""')[1].split('"""')[0]
OUT = sys.argv[2] if len(sys.argv) > 2 else None
F = []
def ok(c, m):
    print(('OK ' if c else 'FAIL ') + m)
    if not c: F.append(m)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1100, 'height': 700}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*supabase-js*', lambda r: r.fulfill(body=STUB, content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    pg.goto('file://' + sys.argv[1]); pg.wait_for_timeout(1500)
    ok(pg.evaluate("typeof mbCaminhoToggle === 'function' && /_renderPainelAlunosOrig/.test(renderPainelAlunos.toString())"), 'renderPainelAlunos envolvido e funções presentes')
    pg.evaluate("""() => {
      window.__upd = null; window.__col = true; window.__n = [];
      document.body.insertAdjacentHTML('beforeend', '<div id="t-cam" style="position:fixed;left:20px;top:20px;display:flex;gap:6px;background:#111;padding:10px;border-radius:10px"><button class="btn bs" data-caminho="a1">🧭 Caminho</button><button class="btn bs" data-caminho="a2">🧭 Caminho</button></div>');
      const q = { select() { return window.__col ? Promise.resolve({ data: [{ id: 'a1', caminho_ativo: true }, { id: 'a2', caminho_ativo: false }], error: null }) : Promise.resolve({ data: null, error: { message: 'column alunos.caminho_ativo does not exist' } }); },
                  update(pl) { window.__upd = pl; return { eq() { return Promise.resolve({ error: null }); } }; } };
      mbClient.from = () => q; _mbCaminho = null; const n0 = notify; window.notify = m => { window.__n.push(m); };
    }""")
    pg.evaluate("mbCaminhoAtualizarBotoes()"); pg.wait_for_timeout(400)
    t = pg.evaluate("[...document.querySelectorAll('[data-caminho]')].map(b => b.textContent)")
    ok(t == ['🧭 Caminho: ligado', '🧭 Caminho: desligado'], 'botões mostram ligado/desligado por aluno: ' + str(t))
    if OUT: pg.locator('#t-cam').screenshot(path=OUT + '/caminho_botoes.png')
    pg.evaluate("mbCaminhoToggle('a2')"); pg.wait_for_timeout(400)
    ok(pg.evaluate("window.__upd") == {'caminho_ativo': True}, 'ligar grava caminho_ativo=true')
    ok(pg.evaluate("document.querySelector('[data-caminho=a2]').textContent") == '🧭 Caminho: ligado', 'botão atualiza após ligar')
    pg.evaluate("window.__col = false; _mbCaminho = null; window.__upd = null; mbCaminhoToggle('a1')"); pg.wait_for_timeout(400)
    ok(pg.evaluate("window.__upd") is None and 'Falta criar a coluna' in ' '.join(pg.evaluate("window.__n")), 'sem a coluna: não grava e avisa')
    ok(not errs, 'sem pageerror ' + str(errs[:2]))
    b.close()
print('FALHAS:', len(F)); sys.exit(1 if F else 0)
