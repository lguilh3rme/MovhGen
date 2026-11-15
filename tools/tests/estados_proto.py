"""Gerador: badges de estado do treino (No app / Próximo / Rascunho / Histórico) e botão Publicar.
Uso: python3 tools/tests/estados_proto.py <index.html> [pasta_prints]"""
import sys
from playwright.sync_api import sync_playwright
STUB = open(__file__.replace('estados_proto.py', 'gpage.py'), encoding='utf-8').read().split('STUB="""')[1].split('"""')[0]
OUT = sys.argv[2] if len(sys.argv) > 2 else None
FALHAS = []
def ok(c, msg):
    print(('OK ' if c else 'FAIL ') + msg)
    if not c: FALHAS.append(msg)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1100, 'height': 800}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*supabase-js*', lambda r: r.fulfill(body=STUB, content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    pg.goto('file://' + sys.argv[1]); pg.wait_for_timeout(1500)
    ok(pg.evaluate("mbEstadoProto(true,'2026-07-10',null)") == 'on', 'ativo = on')
    ok(pg.evaluate("mbEstadoProto(false,'2999-01-01','2026-07-10')") == 'prox', 'inativo com início futuro = próximo')
    ok(pg.evaluate("mbEstadoProto(false,'2026-01-01','2026-07-10')") == 'hist', 'inativo mais antigo que o ativo = histórico')
    ok(pg.evaluate("mbEstadoProto(false,'2026-08-14','2026-07-10')") == 'rasc', 'inativo recente sem data futura = rascunho')
    pg.evaluate("""() => {
      mbPainelAlunos = [{ id: 'al1', nome: 'LGuilh3rme' }]; mbProfessor = { id: 'pr1' };
      const mk = (id, ini, ex) => ({ id, ativo: false, data_inicio: ini, conteudo: { nome: 'Treino ' + id, semanas: [{ dias: [{ blocos: [{ exercicios: ex }] }] }] } });
      const rows = [ { id: 'aaaaaaaa1', ativo: true, data_inicio: '2026-07-10', conteudo: { nome: 'Treino Jul/26', semanas: [{ dias: [{ blocos: [{ exercicios: [{}, {}] }] }] }] } },
        mk('bbbbbbbb2', '2999-01-01', [{}]), mk('cccccccc3', '2026-08-14', [{}, {}, {}]), mk('dddddddd4', '2026-03-01', [{}]) ];
      const q = { select() { return q; }, eq() { return q; }, order() { return Promise.resolve({ data: rows, error: null }); } };
      mbClient.from = () => q;
    }""")
    pg.evaluate("mbGerenciarProtocolos('al1')"); pg.wait_for_timeout(700)
    h = pg.evaluate("document.getElementById('mb-protos-aluno-body').innerText")
    ok('No app' in h and 'Próximo' in h and 'Rascunho' in h and 'Histórico' in h, 'modal mostra os 4 estados')
    ok(pg.evaluate("document.getElementById('mb-protos-aluno-body').innerHTML.split('🚀 Publicar').length") == 3, 'Publicar em próximo e rascunho; Reativar no histórico')
    if OUT: pg.screenshot(path=OUT + '/estados_modal.png')
    pg.evaluate("mbProtoCarregadoId='bbbbbbbb2'; _mbProtoAtivo=false; _mbProtoEstado='prox'; mbProtoDataInicio='2999-01-01'; mbAlunoSelecionadoId='al1'; refreshPBars(); closeM('modal-protos-aluno'); nav('config')")
    pg.wait_for_timeout(500)
    bar = pg.evaluate("Array.from(document.querySelectorAll('.pbar')).map(e => e.innerText).join(' | ')")
    ok('Próximo' in bar and 'Publicar para o aluno' in bar, 'barra do editor: badge + Publicar')
    if OUT and pg.locator('.pbar:visible').count(): pg.locator('.pbar:visible').first.screenshot(path=OUT + '/estados_barra.png')
    elif OUT: pg.screenshot(path=OUT + '/estados_barra.png')
    cfg = pg.evaluate("renderCfgTreino(), document.getElementById('cfg-treino').textContent")
    ok('Próximo' in cfg and 'Publicar para o aluno' in cfg, 'cabeçalho da Configuração: badge + Publicar')
    if OUT: pg.locator('#cfg-treino').screenshot(path=OUT + '/estados_cfg.png')
    ok(not errs, 'sem pageerror ' + str(errs[:2]))
    b.close()
print('FALHAS:', len(FALHAS)); sys.exit(1 if FALHAS else 0)
