"""Próxima fase: corrida/condicionamento progride, mantém ou recua (PF_COND) com Supabase simulado.
Uso: python3 tools/tests/prox_cond.py $PWD/index.html"""
import sys
from playwright.sync_api import sync_playwright

STUB = """window.__resp=function(){return {data:null,error:null}};
window.supabase={createClient:function(){function mk(t){const st={t:t,op:'select'};const q=new Proxy(function(){},{get(_,k){
 if(k==='then'){return function(res,rej){Promise.resolve(window.__resp(st)).then(res,rej)}}
 return function(){var a=[].slice.call(arguments);if(['insert','update','delete','upsert'].indexOf(k)>=0)st.op=k;(st[k]=st[k]||[]).push(a);return q}},apply(){return q}});return q}
return {from:mk,rpc:function(){return Promise.resolve({data:null,error:null})},auth:{getSession:function(){return Promise.resolve({data:{session:null}})},signOut:function(){return Promise.resolve()},onAuthStateChange:function(){return {data:{subscription:{unsubscribe(){}}}}},signInWithPassword:function(){return Promise.resolve({data:null,error:null})}},storage:{from:function(){return {}}},channel:function(){return {on(){return this},subscribe(){return this}}}}}};"""
R = []
def ck(n, c): R.append((n, bool(c))); print(('OK   ' if c else 'FAIL ') + n)

SETUP = """(cfg)=>{window.confirm=()=>true;_selSplit=DEFAULT_SPLITS[0];loadSplit();mbProfessor={id:'prof1'};
  semanas.forEach(s=>{s.dias=s.dias.slice(0,3);const d0=s.dias[0];d0.blocos=(d0.blocos||[]).filter(b=>b.id!=='con');
    d0.blocos.push({id:'con',nome:'Condicionamento',tipo:'Aeróbico',modelo:cfg.modelo,duracao:cfg.duracao,tiros:cfg.tiros,esf:cfg.esf,rec:cfg.rec,progressaoAuto:true,exercicios:[]});});
  const dpw=3, hoje=Date.now(), D=86400000, N=Math.round(dpw*4*cfg.ader/100);
  const rpes=[];for(let i=0;i<N;i++){rpes.push({rpe:cfg.rpe,dor:cfg.dor&&i===0,criado_em:new Date(hoje-(i*(27/Math.max(N,1))+0.5)*D).toISOString()});}
  window.__resp=function(st){
    if(st.t==='anamneses')return {data:[{respostas:{tempo_treino:'avancado'}}],error:null};
    if(st.t==='rpe_sessoes')return {data:rpes,error:null};
    if(st.t==='registros_sessao')return {data:[],error:null};
    if(st.t==='testes_fisicos')return {data:cfg.teste==null?[]:[{data:new Date(hoje-cfg.teste*7*D).toISOString().slice(0,10)}],error:null};
    if(st.t==='protocolos'&&st.op==='select'&&(st.maybeSingle||st.single))return {data:mbPainelAlunos[0].protocoloAtivo,error:null};
    return {data:[],error:null};};
  mbPainelAlunos=[{id:'a1',nome:'Aluno',protocoloAtivo:{id:'p1',nome:'x',ativo:true,data_inicio:new Date(hoje-70*D).toISOString().slice(0,10),conteudo:{nome:'x',semanas:JSON.parse(JSON.stringify(semanas))}}}];
  return dpw;}"""

def cenario(pg, nome, cfg):
    pg.evaluate("()=>{const a=document.getElementById('mb-aluno-select');if(![...a.options].some(o=>o.value==='a1')){const o=document.createElement('option');o.value='a1';o.textContent='Aluno';a.appendChild(o);}}")
    pg.evaluate(SETUP, cfg)
    pg.evaluate("()=>{const o=document.getElementById('pf-overlay');if(o)o.remove();_pf=null;mbSugerirProximaFase('p1','a1')}")
    pg.wait_for_function("()=>_pf!==null", timeout=8000)
    r = pg.evaluate("()=>{const b=_pf.sem.dias[0].blocos.find(b=>b.id==='con');return {mod:b.modelo,dur:b.duracao,tiros:b.tiros,al:_pf.alertas.map(a=>a.x),ctx:_pf.ctx.map(c=>c[0]+': '+c[1])}}")
    print('  ', nome, '->', r['mod'], r['dur'], r['tiros'], '|', [x for x in r['al'] if 'Corrida' in x][:1])
    return r

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1200, 'height': 800})
    pg.set_default_timeout(15000)
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*supabase-js*', lambda r: r.fulfill(body=STUB, content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    pg.goto('file://' + sys.argv[1]); pg.wait_for_timeout(1200)
    base = dict(modelo='continuo', duracao='20 min', tiros=None, esf=None, rec=None, ader=90, rpe=7, dor=False, teste=5)
    r = cenario(pg, 'progride', base)
    ck('progride: contínuo 20 -> 22 min', r['dur'] == '22 min')
    ck('progride: motivo com aderência/RPE/teste', any('Corrida: progride' in x and 'aderência' in x and 'RPE' in x and 'teste de 3 km' in x for x in r['al']))
    ck('progride: linha antes -> depois no painel', any('20 min' in x and '22 min' in x and '→' in x for x in r['al']))
    ck('progride: contexto mostra aderência e teste', any(c.startswith('Aderência') for c in r['ctx']) and any(c.startswith('Teste de 3 km') for c in r['ctx']))
    ck('progride: sugere qualidade (fase toda em Fácil)', any('qualidade' in x for x in r['al']))
    r = cenario(pg, 'mantém (aderência 70%)', dict(base, ader=70))
    ck('mantém: segue 20 min', r['dur'] == '20 min' and any('Corrida: mantém' in x for x in r['al']))
    r = cenario(pg, 'mantém (sem teste de 3 km)', dict(base, teste=None))
    ck('sem teste: mantém e avisa', r['dur'] == '20 min' and any('sem teste de 3 km' in x for x in r['al']))
    r = cenario(pg, 'recua (aderência 40%)', dict(base, ader=40))
    ck('recua: 16 min', r['dur'] == '16 min' and any('Corrida: recua' in x for x in r['al']))
    ck('recua: pede refazer 3 km', any('refazer o teste de 3 km' in x for x in r['al']))
    r = cenario(pg, 'recua (dor)', dict(base, dor=True))
    ck('recua por dor', r['dur'] == '16 min' and any('dor relatada' in x for x in r['al']))
    r = cenario(pg, 'recua (teste há 10 sem)', dict(base, teste=10))
    ck('recua por teste velho', r['dur'] == '16 min')
    r = cenario(pg, 'intervalado recua', dict(base, modelo='intervalado', duracao=None, tiros='4', esf='1', rec='2', ader=40))
    ck('intervalado recua: vira contínuo 18 min', r['mod'] == 'continuo' and r['dur'] == '18 min')
    ck('intervalado: qualidade não é sugerida', not any('qualidade' in x for x in r['al']))
    ck('sem pageerror', not errs)
    if errs: print(errs[:2])
    b.close()
bad = [n for n, c in R if not c]
print('FALHAS:', bad if bad else 'nenhuma')
sys.exit(1 if bad else 0)
