"""Gerador: diagnóstico da avaliação em linguagem simples (sem jargão), com as mesmas chaves (area/sev) de antes.
Uso: python3 tools/tests/aval_texto.py <index.html>"""
import sys
from playwright.sync_api import sync_playwright
STUB = open(__file__.replace('aval_texto.py', 'gpage.py'), encoding='utf-8').read().split('STUB="""')[1].split('"""')[0]
JARGAO = ['valgo', 'varo', 'craniovertebral', 'cervical', 'torácica', 'core', 'px', 'compensações', 'gluteo médio', 'glúteo médio', 'projetada']
AREAS = {'Ombros (vista frontal)', 'Quadril (vista frontal)', 'Joelhos', 'Cabeça (lateral)', 'Ombro (lateral)'}

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1100, 'height': 900}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*supabase-js*', lambda r: r.fulfill(body=STUB, content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    pg.goto('file://' + sys.argv[1]); pg.wait_for_timeout(1500)
    r = pg.evaluate("""() => {
      const P = (x, y) => ({ x, y });
      _mbAvalEditor = { row: { peso: 78.4, altura: 175, cintura: 88, quadril: 98, sexo: 'M' }, views: {
        frontal: { w: 1000, h: 1000, confirmed: true, points: { ombro_e: P(.3, .30), ombro_d: P(.7, .356), quadril_e: P(.35, .5), quadril_d: P(.65, .5), joelho_e: P(.4, .7), joelho_d: P(.6, .7) } },
        lateral_e: { w: 1000, h: 1000, confirmed: true, points: { tornozelo: P(.5, .9), orelha: P(.46, .1), ombro: P(.55, .2), quadril: P(.5, .5) } } } };
      const g = mbAvalGerarAchados();
      const txt = mbAvalDiagnosticoTexto(g.achados, g.composicao);
      return { achados: g.achados, comp: g.composicao, txt };
    }""")
    ach = r['achados']; todo = ' '.join([a['texto'] + ' ' + (a.get('detalhe') or '') for a in ach] + r['comp']).lower()
    ok1 = {a['area'] for a in ach} == AREAS
    sev = {a['area']: a['sev'] for a in ach}
    ok2 = sev.get('Ombros (vista frontal)') == 'critico' and sev.get('Quadril (vista frontal)') == 'ok' and sev.get('Joelhos') == 'atencao' and sev.get('Cabeça (lateral)') == 'atencao' and sev.get('Ombro (lateral)') == 'atencao'
    ok3 = not [j for j in JARGAO if j.lower() in todo]
    ok4 = 'O que está bom:' in r['txt'] and 'O que vamos melhorar primeiro:' in r['txt']
    print('OK' if ok1 else 'FAIL', 'mesmas áreas (chaves da comparação):', sorted(sev))
    print('OK' if ok2 else 'FAIL', 'mesmas severidades:', sev)
    print('OK' if ok3 else 'FAIL', 'sem jargão:', [j for j in JARGAO if j.lower() in todo])
    print('OK' if ok4 else 'FAIL', 'texto final em 2 blocos (bom / melhorar primeiro)')
    print('OK' if not errs else 'FAIL', 'sem pageerror', errs[:2])
    print(r['txt']); b.close()
