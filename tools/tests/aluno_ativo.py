"""Regressão v61.5: selecionar aluno com treino ativo não pode travar (recursão mbOnAlunoChange <-> mbCarregarProtoAluno).
Uso (da raiz do MovhGen): python3 tools/tests/aluno_ativo.py $PWD/index.html"""
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
      mbPainelAlunos=[{id:'a1',nome:'Aluno',protocoloAtivo:{id:'p1',nome:'x',ativo:true,data_inicio:'2026-09-06',conteudo:{nome:'x',semanas:JSON.parse(JSON.stringify(semanas))}}}];}""")
    # 1) código chamando sem flag NÃO carrega treino ativo
    pg.evaluate("document.getElementById('mb-aluno-select').value='a1';mbOnAlunoChange()")
    ck('chamada de código não carrega treino ativo', pg.evaluate("mbProtoCarregadoId") is None)
    # 2) troca pelo seletor carrega UMA vez e abre o Quadro, sem travar
    t = time.time()
    pg.evaluate("window.__n=0;document.getElementById('mb-aluno-select').value='';mbOnAlunoChange();document.getElementById('mb-aluno-select').value='a1';document.getElementById('mb-aluno-select').dispatchEvent(new Event('change'))")
    pg.wait_for_timeout(800)
    ck('seletor: sem travar (<8s)', time.time() - t < 8)
    ck('seletor: carregou o treino ativo', pg.evaluate("mbProtoCarregadoId") == 'p1')
    ck('seletor: renderAll <= 3x', pg.evaluate("window.__n") <= 3)
    ck('seletor: abriu no Quadro', pg.evaluate("(document.querySelector('.page.active')||{}).id||''").startswith('page-kb-'))
    # 3) mbCarregarProtoAluno direto também não recursa
    pg.evaluate("window.__n=0;mbProtoCarregadoId=null;_pbDirty=false;mbCarregarProtoAluno('a1')")
    pg.wait_for_timeout(500)
    ck('mbCarregarProtoAluno: 1 renderAll', pg.evaluate("window.__n") == 1)
    ck('sem pageerror', not errs)
    b.close()
bad = [n for n, c in R if not c]
print('FALHAS:', bad if bad else 'nenhuma')
sys.exit(1 if bad else 0)
