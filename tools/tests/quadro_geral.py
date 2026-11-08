"""Quadro geral: fases empilhadas, edição isolada por fase.
Uso: python3 tools/tests/quadro_geral.py $PWD/index.html"""
import sys, time
from playwright.sync_api import sync_playwright

STUB = """window.__resp=function(){return {data:null,error:null}};
window.supabase={createClient:function(){function mk(t){const st={t:t,op:'select'};const q=new Proxy(function(){},{get(_,k){
 if(k==='then'){return function(res,rej){Promise.resolve(window.__resp(st)).then(res,rej)}}
 return function(){var a=[].slice.call(arguments);if(['insert','update','delete','upsert'].indexOf(k)>=0)st.op=k;(st[k]=st[k]||[]).push(a);return q}},apply(){return q}});return q}
return {from:mk,rpc:function(){return Promise.resolve({data:null,error:null})},auth:{getSession:function(){return Promise.resolve({data:{session:null}})},signOut:function(){return Promise.resolve()},onAuthStateChange:function(){return {data:{subscription:{unsubscribe(){}}}}},signInWithPassword:function(){return Promise.resolve({data:null,error:null})}},storage:{from:function(){return {}}},channel:function(){return {on(){return this},subscribe(){return this}}}}}};"""
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
    pg.evaluate("()=>{window.confirm=()=>true;_selSplit=DEFAULT_SPLITS[0];loadSplit();dupSem(semanas[0].id);dupSem(semanas[semanas.length-1].id);}")
    n = pg.evaluate("semanas.length")
    ck('>=3 fases (%d)' % n, n >= 3)
    pg.evaluate("nav('kb-geral')"); pg.wait_for_timeout(500)
    ck('página geral ativa', pg.evaluate("(document.querySelector('.page.active')||{}).id") == 'page-kb-geral')
    ck('uma seção por fase', pg.evaluate("document.querySelectorAll('#page-kb-geral .kbg-sec').length") == n)
    nd = pg.evaluate("semanas[0].dias.length")
    ck('colunas de cada fase = dias', pg.evaluate("[...document.querySelectorAll('#page-kb-geral .kbg-board')].every((b,i)=>b.querySelectorAll('.kb-col').length==semanas[i].dias.length)"))
    # alinhamento: coluna 1 da fase 1 e da fase 3 com o mesmo x
    ck('dias alinhados em coluna', pg.evaluate("(()=>{const b=[...document.querySelectorAll('#page-kb-geral .kbg-board')];const x=b.map(e=>Math.round(e.querySelector('.kb-col').getBoundingClientRect().left));return x.every(v=>v===x[0])})()"))
    # edição isolada: renomeia exercício 1 do dia 1 na fase 2
    antes = pg.evaluate("JSON.stringify(semanas.map(s=>s.dias[0].blocos[1].exercicios.map(e=>e.nome)))")
    did = pg.evaluate("semanas[1].dias[0].id")
    pg.evaluate("(d)=>{const bi=fDia(d).blocos.findIndex(b=>b.exercicios&&b.exercicios.length);setEx(d,bi,0,'nome','EXERCICIO TESTE');kbRefresh(d);}", did)
    pg.wait_for_timeout(300)
    nomes = pg.evaluate("semanas.map(s=>{const bl=s.dias[0].blocos.find(b=>b.exercicios&&b.exercicios.length);return bl.exercicios[0].nome})")
    ck('edição só na fase 2', nomes[1] == 'EXERCICIO TESTE' and nomes[0] != 'EXERCICIO TESTE' and nomes[2] != 'EXERCICIO TESTE')
    ck('continua no Quadro geral após editar', pg.evaluate("(document.querySelector('.page.active')||{}).id") == 'page-kb-geral')
    ck('célula da fase 2 mostra o novo nome', 'EXERCICIO TESTE' in pg.evaluate("document.querySelectorAll('#page-kb-geral .kbg-board')[1].innerText"))
    ck('fases 1 e 3 sem o nome novo na tela', 'EXERCICIO TESTE' not in pg.evaluate("document.querySelectorAll('#page-kb-geral .kbg-board')[0].innerText+document.querySelectorAll('#page-kb-geral .kbg-board')[2].innerText"))
    # + exercício na fase 3 pelo botão do Quadro geral
    c0 = pg.evaluate("semanas.map(s=>s.dias[0].blocos.reduce((a,b)=>a+(b.exercicios||[]).length,0))")
    did3 = pg.evaluate("semanas[2].dias[0].id")
    pg.evaluate("(d)=>{const bi=fDia(d).blocos.findIndex(b=>b.exercicios);kbAddBloco(d)}", did3); pg.wait_for_timeout(300)
    ck('novo bloco só na fase 3', pg.evaluate("semanas.map(s=>s.dias[0].blocos.length)") [2] > pg.evaluate("semanas[0].dias[0].blocos.length"))
    ck('segue no geral após kbAddBloco', pg.evaluate("(document.querySelector('.page.active')||{}).id") == 'page-kb-geral')
    # abrir só uma fase e voltar
    sid2 = pg.evaluate("semanas[1].id")
    pg.locator('#kbg-%s button[aria-label="Abrir só esta fase"]' % sid2).click(); pg.wait_for_timeout(400)
    ck('Abrir só esta fase -> Quadro da fase', pg.evaluate("(document.querySelector('.page.active')||{}).id") == 'page-kb-' + sid2)
    ck('Quadro da fase renderizou colunas', pg.evaluate("document.querySelectorAll('#page-kb-%s .kb-col').length" % sid2) >= nd)
    pg.evaluate("kbRefresh(semanas[1].dias[0].id)"); pg.wait_for_timeout(200)
    ck('editar na fase única não vira geral', pg.evaluate("(document.querySelector('.page.active')||{}).id") == 'page-kb-' + sid2)
    pg.locator('.page.active .pbar button:has-text("Quadro geral")').click(); pg.wait_for_timeout(400)
    ck('botão Quadro geral da barra', pg.evaluate("(document.querySelector('.page.active')||{}).id") == 'page-kb-geral')
    ck('sem pageerror', not errs)
    if errs: print(errs[:3])
    b.close()
bad = [n for n, c in R if not c]
print('FALHAS:', bad if bad else 'nenhuma')
sys.exit(1 if bad else 0)
