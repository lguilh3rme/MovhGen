"""Gerador: editor do Mapa do aluno (abrir, editar, girar foto, prévia, salvar/publicar).
Uso: python3 tools/tests/mapa_ed.py <index.html> [pasta_prints]"""
import sys
from playwright.sync_api import sync_playwright
STUB = open(__file__.replace('mapa_ed.py', 'gpage.py'), encoding='utf-8').read().split('STUB="""')[1].split('"""')[0]
OUT = sys.argv[2] if len(sys.argv) > 2 else None
FALHAS = []
def ok(c, msg):
    print(('OK ' if c else 'FAIL ') + msg)
    if not c: FALHAS.append(msg)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1100, 'height': 1000}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*supabase-js*', lambda r: r.fulfill(body=STUB, content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    pg.goto('file://' + sys.argv[1]); pg.wait_for_timeout(1500)
    pg.evaluate("""() => {
      const svg = c => "data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='300' height='400'><rect width='300' height='400' fill='#394150'/><circle cx='150' cy='90' r='42' fill='" + c + "'/><rect x='95' y='145' width='110' height='200' rx='40' fill='" + c + "'/></svg>");
      window.__upd = null; window.__col = true;
      _mbAvaliacoesAlunoId = 'al1';
      _mbAvaliacoesCache = [
        { id: 'a2', status: 'confirmada', data_avaliacao: '2026-11-05', created_at: '2026-11-05T12:00:00Z', foto_frontal_path: 'f2', foto_posterior_path: 'p2', foto_lateral_e_path: 'l2', foto_lateral_d_path: 'd2', peso: 78.4, cintura: 88, quadril: 98,
          achados: [{ area: 'Joelhos', sev: 'ok', texto: 'Seus joelhos estão bem alinhados.' }, { area: 'Ombros', sev: 'critico', texto: 'Um ombro está mais alto que o outro.' }] },
        { id: 'a1', status: 'confirmada', data_avaliacao: '2026-07-12', created_at: '2026-07-12T12:00:00Z', foto_frontal_path: 'f1', foto_posterior_path: 'p1', foto_lateral_e_path: 'l1' }];
      const q = { select() { return q; }, eq() { return q; }, maybeSingle() { return Promise.resolve(window.__col ? { data: { mapa: null }, error: null } : { data: null, error: { message: 'column mapa does not exist' } }); },
                  update(pl) { window.__upd = pl; return { eq() { return Promise.resolve({ error: null }); } }; } };
      mbClient.from = () => q;
      mbClient.storage = { from: () => ({ createSignedUrls: c => Promise.resolve({ data: c.map((x, i) => ({ path: x, signedUrl: svg(['#707a8c', '#8a93a6'][i % 2]) })) }) }) };
      openM('modal-avaliacoes-view'); document.getElementById('mb-aval-titulo').textContent = '📸 Avaliações físicas — Aluno exemplo';
    }""")
    pg.evaluate("mbMapaAbrir('a2')"); pg.wait_for_timeout(1200)
    ok(pg.evaluate("document.getElementById('modal-mapa-editor').classList.contains('open')"), 'modal do Mapa abre')
    ok(pg.evaluate("MAPA_VISTAS.every(([k]) => (document.getElementById('mapa-ft-' + k).innerHTML.indexOf('data:image/jpeg') > -1))"), '4 fotos renderizadas (3:4)')
    ok(pg.evaluate("_mbMapa.m.bom.length === 1 && _mbMapa.m.melhorar.length === 1"), 'bom/melhorar vêm do diagnóstico')
    ok(pg.evaluate("_mbMapa.m.marcos.length === 4 && _mbMapa.m.semanas === 12"), 'marcos padrão 0/4/8/12')
    if OUT: pg.screenshot(path=OUT + '/mapa_editor.png')
    pg.evaluate("mbMapaSet('objetivo', 'Recomposição corporal'); mbMapaLista('depende', 'Treinar 3x\\nDormir bem'); mbMapaMarco(1, 'titulo', 'Check 4 semanas'); mbMapaFoto('frontal', 'rot'); mbMapaFoto('posterior', 'show', false)")
    pg.wait_for_timeout(500)
    pg.evaluate("mbMapaTogglePrevia()"); pg.wait_for_timeout(900)
    h = pg.evaluate("document.getElementById('mb-mapa-prev').innerHTML")
    ok('Recomposição corporal' in h and 'Check 4 semanas' in h and 'Dormir bem' in h, 'prévia reflete as edições')
    ok(h.count('data:image/jpeg') == 3, 'foto ocultada some da prévia (3 de 4)')
    ok('Sem 12' in h and '/' in h, 'marcos com data calculada')
    if OUT: pg.locator('#mb-mapa-prev').screenshot(path=OUT + '/mapa_previa.png')
    pg.evaluate("mbMapaSalvar(true)"); pg.wait_for_timeout(400)
    u = pg.evaluate("window.__upd")
    ok(u and u['mapa']['publicado'] is True and u['mapa']['fotos']['frontal']['rot'] == 90 and u['mapa']['fotos']['posterior']['show'] is False, 'publicar grava mapa (publicado, rotação, ocultar)')
    pg.evaluate("window.__col = false; mbMapaAbrir('a2')"); pg.wait_for_timeout(900)
    ok('Falta a coluna' in pg.evaluate("document.getElementById('mb-mapa-body').innerText"), 'sem a coluna: avisa e mostra o SQL')
    ok(not errs, 'sem pageerror ' + str(errs[:2]))
    b.close()
print('FALHAS:', len(FALHAS)); sys.exit(1 if FALHAS else 0)
