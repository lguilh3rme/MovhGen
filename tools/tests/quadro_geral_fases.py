"""Quadro geral v61.7: chips de volume, período por fase, duplicar, salvar só a fase; Análise técnica recolhida com volume.
Uso: python3 tools/tests/quadro_geral_fases.py $PWD/index.html"""
import sys
from playwright.sync_api import sync_playwright
exec(open(__file__.replace('quadro_geral_fases.py','quadro_geral.py'), encoding='utf-8').read().split('R = []')[0].split('from playwright.sync_api import sync_playwright')[1])
R = []
def ck(n, c): R.append((n, bool(c))); print(('OK   ' if c else 'FAIL ') + n)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1300, 'height': 900})
    pg.set_default_timeout(15000)
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*supabase-js*', lambda r: r.fulfill(body=STUB, content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    pg.goto('file://' + sys.argv[1]); pg.wait_for_timeout(1200)
    pg.evaluate("()=>{window.confirm=()=>true;_selSplit=DEFAULT_SPLITS[0];loadSplit();dupSem(semanas[0].id);dupSem(semanas[semanas.length-1].id);mbProtoDataInicio='2026-10-19';semanas[0].dataInicio='2026-10-19';}")
    n = pg.evaluate("semanas.length")
    # Quadro de uma fase: análise recolhida mostra os chips de volume
    sid0 = pg.evaluate("semanas[0].id")
    pg.evaluate("localStorage.setItem('movh_pf_analise','0')")
    pg.evaluate("nav('kb-%s')" % sid0); pg.wait_for_timeout(400)
    ck('análise recolhida', pg.evaluate("!document.querySelector('#page-kb-%s details.pf-an').open" % sid0))
    ck('chips de volume visíveis no resumo recolhido', pg.evaluate("(()=>{const s=document.querySelector('#page-kb-%s details.pf-an summary');return s.querySelectorAll('.an-chip').length==PF_MUSCULOS.length&&s.getBoundingClientRect().height>0})()" % sid0))
    ck('resumo mostra pontos de atenção', 'alerta' in pg.evaluate("document.querySelector('#page-kb-%s details.pf-an summary').innerText" % sid0) or 'sem alertas' in pg.evaluate("document.querySelector('#page-kb-%s details.pf-an summary').innerText" % sid0))
    pg.evaluate("document.querySelector('#page-kb-%s details.pf-an summary').click()" % sid0); pg.wait_for_timeout(200)
    ck('expande com contexto', pg.evaluate("(()=>{const d=document.querySelector('#page-kb-%s details.pf-an');return d.open&&d.querySelector('.pf-an-ctx')&&d.querySelector('.pf-an-ctx')})()" % sid0))
    # Quadro geral
    pg.evaluate("nav('kb-geral')"); pg.wait_for_timeout(500)
    ck('chips por fase no geral', pg.evaluate("[...document.querySelectorAll('#page-kb-geral .kbg-sec')].every(s=>s.querySelectorAll('.kbg-chips .an-chip').length==PF_MUSCULOS.length)"))
    ck('botões por fase', pg.evaluate("[...document.querySelectorAll('#page-kb-geral .kbg-sec')].every(s=>s.querySelector('.kbg-per-btn')&&s.querySelector('.kbg-save')&&s.innerText.includes('Duplicar'))"))
    ck('período exibido (19/10/26 →)', '19/10/26' in pg.evaluate("document.querySelector('#kbg-%s').innerText" % sid0))
    ck('Duplicar mostra a data seguinte', 'p/ ' in pg.evaluate("document.querySelector('#kbg-%s .kbg-acts').innerText" % sid0))
    # Período abre/fecha só nessa fase
    pg.locator('#kbg-%s .kbg-per-btn' % sid0).click(); pg.wait_for_timeout(250)
    ck('painel de período abriu só na fase 1', pg.evaluate("document.querySelectorAll('#page-kb-geral .kbg-per').length") == 1)
    ck('continua no geral', pg.evaluate("(document.querySelector('.page.active')||{}).id") == 'page-kb-geral')
    # mudar duração desloca as seguintes
    ini2 = pg.evaluate("semanas[1].dataInicio||''")
    pg.evaluate("kbgSetDur(semanas[0].id, 6)"); pg.wait_for_timeout(250)
    d = pg.evaluate("semanas.map(s=>s.dataInicio||'')")
    ck('duração 6 sem: fase 2 começa 2026-11-30', d[1] == '2026-11-30')
    ck('fase 3 acompanha a cascata', d[2] > d[1] and d[2] != '')
    # travar a fase 3 e mudar início da 1: 3 não muda
    pg.evaluate("kbgTravar(semanas[2].id)"); d3 = pg.evaluate("semanas[2].dataInicio")
    pg.evaluate("kbgSetInicio(semanas[0].id,'2026-10-26')"); pg.wait_for_timeout(200)
    d = pg.evaluate("semanas.map(s=>s.dataInicio||'')")
    ck('fase travada não muda na cascata', d[2] == d3)
    ck('fase 2 deslocou', d[1] == '2026-12-07')
    pg.evaluate("kbgTravar(semanas[2].id)")
    # duplicar
    antes = pg.evaluate("semanas.length"); fim1 = pg.evaluate("kbFaseDatas()[0].b.toISOString().slice(0,10)")
    pg.evaluate("kbgDuplicar(semanas[0].id)"); pg.wait_for_timeout(400)
    ck('uma fase a mais', pg.evaluate("semanas.length") == antes + 1)
    ck('cópia logo após a original, com nome (cópia)', '(cópia)' in pg.evaluate("semanas[1].nome"))
    ck('cópia começa no dia seguinte ao fim', pg.evaluate("new Date(semanas[1].dataInicio+'T00:00:00').getTime()-new Date(semanas[0].dataInicio+'T00:00:00').getTime()") == 6 * 7 * 86400000)
    ck('ids dos dias únicos', pg.evaluate("(()=>{const a=semanas.flatMap(s=>s.dias.map(d=>d.id));return new Set(a).size==a.length})()"))
    ck('seção da cópia no geral', pg.evaluate("document.querySelectorAll('#page-kb-geral .kbg-sec').length") == antes + 1)
    # salvar fase: só ela no banco
    pg.evaluate("""()=>{window.__upd=[];mbProtoCarregadoId='P1';mbProfessor={id:'prof1'};
      window.__resp=function(st){ if(st.op==='update'){window.__upd.push(st.update[0][0]);return {data:null,error:null};}
        return {data:{conteudo:{nome:'X',semanas:[{id:semanas[0].id,nome:'ANTIGA-1',dias:[]},{id:'zz',nome:'OUTRA-NAO-MEXER',dias:[]}]}},error:null};};}""")
    pg.evaluate("semanas[0].nome='EDITADA-1'; semanas[2].nome='NAO-SALVA'")
    pg.evaluate("kbgSalvarFase(semanas[0].id)"); pg.wait_for_timeout(500)
    up = pg.evaluate("JSON.stringify(window.__upd)")
    ck('um update gravado', pg.evaluate("window.__upd.length") == 1)
    ck('fase 1 gravada com o novo nome', 'EDITADA-1' in up and 'ANTIGA-1' not in up)
    ck('outra fase do banco preservada', 'OUTRA-NAO-MEXER' in up)
    ck('fase não salva não foi junto', 'NAO-SALVA' not in up)
    ck('data_inicio do treino acompanha a fase 1', pg.evaluate("window.__upd[0].data_inicio") == '2026-10-26')
    # sem treino carregado: não grava
    pg.evaluate("window.__upd=[];mbProtoCarregadoId=null"); pg.evaluate("kbgSalvarFase(semanas[1].id)"); pg.wait_for_timeout(300)
    ck('sem treino carregado não grava', pg.evaluate("window.__upd.length") == 0)
    ck('sem pageerror', not errs)
    if errs: print(errs[:3])
    b.close()
print('RESULT: %d/%d' % (sum(1 for _, c in R if c), len(R)))
sys.exit(0 if all(c for _, c in R) else 1)
