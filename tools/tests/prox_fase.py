"""Regressão: Próxima fase -> Editar no Quadro não pode travar.
Uso: python3 tools/tests/prox_fase.py $PWD/index.html"""
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
    pg = b.new_page(viewport={'width': 1200, 'height': 800})
    pg.set_default_timeout(15000)
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*supabase-js*', lambda r: r.fulfill(body=STUB, content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    pg.goto('file://' + sys.argv[1]); pg.wait_for_timeout(1200)
    pg.evaluate("""()=>{window.confirm=()=>true;_selSplit=DEFAULT_SPLITS[0];loadSplit();
      const a=document.getElementById('mb-aluno-select');const o=document.createElement('option');o.value='a1';o.textContent='Aluno';a.appendChild(o);
      window.__n=0;const ra=window.renderAll;window.renderAll=function(){window.__n++;return ra.apply(this,arguments)};
      mbProfessor={id:'prof1'};
      window.__resp=function(st){
        if(st.t==='anamneses')return {data:[{respostas:{objetivo:'hipertrofia',tempo_treino:'avancado',dias_semana:'4',duracao_sessao:'60'}}],error:null};
        if(st.t==='rpe_sessoes')return {data:[{rpe:6},{rpe:7}],error:null};
        if(st.t==='registros_sessao')return {data:[],error:null};
        if(st.t==='protocolos'&&st.op==='insert')return {data:{id:'novo1'},error:null};
        if(st.t==='protocolos'&&st.op==='select'&&(st.maybeSingle||st.single))return {data:mbPainelAlunos[0].protocoloAtivo,error:null};
        return {data:[],error:null};};
      mbPainelAlunos=[{id:'a1',nome:'Aluno',protocoloAtivo:{id:'p1',nome:'x',ativo:true,data_inicio:'2026-09-06',conteudo:{nome:'x',semanas:JSON.parse(JSON.stringify(semanas))}}}];}""")
    pg.evaluate("document.getElementById('mb-aluno-select').value='a1';mbOnAlunoChange(true)")
    pg.wait_for_timeout(800)
    ck('treino ativo carregado', pg.evaluate("mbProtoCarregadoId") == 'p1')
    pg.evaluate("pbProximaFase()"); pg.wait_for_timeout(2500)
    ck('overlay Próxima fase abriu', pg.evaluate("!!document.getElementById('pf-overlay')"))
    t = time.time()
    pg.locator('#pf-overlay button:has-text("Editar no Quadro")').click()
    pg.wait_for_timeout(1500)
    ck('Editar no Quadro: sem travar (<8s)', time.time() - t < 8)
    ck('overlay fechou', pg.evaluate("!document.getElementById('pf-overlay')"))
    ck('abriu no Quadro', pg.evaluate("(document.querySelector('.page.active')||{}).id||''").startswith('page-kb-'))
    ck('rascunho inativo carregado', pg.evaluate("mbProtoCarregadoId") == 'novo1' and pg.evaluate("_mbProtoAtivo") is False)
    ck('renderAll <= 6x', pg.evaluate("window.__n") <= 6)
    ck('sem pageerror', not errs)
    if errs: print(errs[:2])
    b.close()
bad = [n for n, c in R if not c]
print('FALHAS:', bad if bad else 'nenhuma')
sys.exit(1 if bad else 0)
