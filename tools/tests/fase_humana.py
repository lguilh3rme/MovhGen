"""App do aluno: card de fase em linguagem comum (sem RPE/RIR). Uso: python3 tools/tests/fase_humana.py <app.html>"""
import sys
from playwright.sync_api import sync_playwright
STUB = open(__file__.replace('fase_humana.py', 'app_header.py'), encoding='utf-8').read().split('STUB = """')[1].split('"""')[0]
F = []
def ok(c, m):
    print(('OK ' if c else 'FAIL ') + m)
    if not c: F.append(m)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*supabase-js*', lambda r: r.fulfill(body=STUB, content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    pg.goto('file://' + sys.argv[1] + '?treino=abc123'); pg.wait_for_timeout(1500)
    for fase in ('base', 'intensificacao', 'densidade', 'deload'):
        h = pg.evaluate("(f) => aMontarCardFase({ fase: f }, 1, 'tst-' + f)", fase)
        ok('Esforço:' in h and 'Descanso:' in h and 'RPE' not in h and 'RIR' not in h and 'termo-btn' not in h, 'fase ' + fase + ' em linguagem comum')
    h = pg.evaluate("aMontarCardFase({ fase: 'base' }, 1, 'x')")
    ok('2 repetições' in h and 'menor peso possível' in h, 'base: texto essencial (esforço, evoluir, descanso)')
    pg.evaluate("aLang = 'en'"); h = pg.evaluate("aMontarCardFase({ fase: 'base' }, 1, 'x')")
    ok('Effort:' in h and 'RPE' not in h, 'versão em inglês')
    ok(not errs, 'sem pageerror ' + str(errs[:2]))
    b.close()
print('FALHAS:', len(F)); sys.exit(1 if F else 0)
