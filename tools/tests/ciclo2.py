"""Gerador: Próxima fase com vigente de 12 semanas vira Ciclo 2 (Construção 8 + Consolidação 4, testes 4/8/12).
Uso: python3 tools/tests/ciclo2.py $PWD/index.html"""
import sys, json
from playwright.sync_api import sync_playwright

STUB = open(__file__.replace('ciclo2.py', 'prox_fase.py'), encoding='utf-8').read().split('STUB = """')[1].split('"""')[0]
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
    pg.evaluate("""(dur)=>{window.confirm=()=>true;_selSplit=DEFAULT_SPLITS[0];loadSplit();
      const a=document.getElementById('mb-aluno-select');const o=document.createElement('option');o.value='a1';o.textContent='Aluno';a.appendChild(o);
      mbProfessor={id:'prof1'}; window.__ins=null;
      window.__resp=function(st){
        if(st.t==='anamneses')return {data:[{respostas:{objetivo:'hipertrofia',tempo_treino:'avancado',dias_semana:'4',duracao_sessao:'60'}}],error:null};
        if(st.t==='rpe_sessoes')return {data:[{rpe:6},{rpe:7},{rpe:7}],error:null};
        if(st.t==='registros_sessao')return {data:[],error:null};
        if(st.t==='protocolos'&&st.op==='insert'){window.__ins=st.insert[0][0];return {data:{id:'novo1'},error:null};}
        if(st.t==='protocolos'&&st.op==='select'&&(st.maybeSingle||st.single))return {data:mbPainelAlunos[0].protocoloAtivo,error:null};
        return {data:[],error:null};};
      const s1=JSON.parse(JSON.stringify(semanas[0])); s1.duracaoSemanas=8; s1.fase='base';
      const s2=JSON.parse(JSON.stringify(semanas[0])); s2.id='sc2'; s2.nome='Consolidação'; s2.duracaoSemanas=dur; s2.fase='base';
      mbPainelAlunos=[{id:'a1',nome:'Aluno',protocoloAtivo:{id:'p1',nome:'x',ativo:true,data_inicio:'2026-08-01',conteudo:{nome:'x',semanas:[s1,s2]}}}];}""", 4)
    pg.evaluate("mbSugerirProximaFase('p1','a1')"); pg.wait_for_timeout(2500)
    ck('overlay abriu', pg.evaluate("!!document.getElementById('pf-overlay')"))
    ck('ciclo2 ligado (vigente de 12 sem)', pg.evaluate("_pf && _pf.ciclo2 === true"))
    ck('alerta do Ciclo 2', pg.evaluate("_pf.alertas.some(a=>/Ciclo 2/.test(a.x))"))
    pg.evaluate("pfSalvar(false)"); pg.wait_for_timeout(1500)
    ins = pg.evaluate("window.__ins")
    c = (ins or {}).get('conteudo') or {}
    ck('nome com Ciclo 2 · 12 sem', 'Ciclo 2' in str((ins or {}).get('nome')))
    ck('2 mesociclos: 8 + 4 (Consolidação)', [x.get('duracaoSemanas') for x in c.get('semanas', [])] == [8, 4] and c['semanas'][1].get('nome') == 'Consolidação')
    ck('ids dos dias diferentes entre os mesociclos', c['semanas'][0]['dias'][0]['id'] != c['semanas'][1]['dias'][0]['id'])
    ck('testes de 3 km nas semanas 4, 8 e 12', sorted(t['semana'] for t in c.get('testesAgendados', [])) == [3, 7, 11])
    # vigente de 8 sem: continua sendo Base 8 sem (sem Ciclo 2)
    pg.evaluate("""()=>{const pa=mbPainelAlunos[0].protocoloAtivo; pa.conteudo.semanas=[pa.conteudo.semanas[0]]; pa.data_inicio='2026-06-01'; window.__ins=null;}""")
    pg.evaluate("mbSugerirProximaFase('p1','a1')"); pg.wait_for_timeout(2500)
    ck('vigente de 8 sem: sem Ciclo 2', pg.evaluate("_pf && _pf.ciclo2 === false"))
    ck('sem pageerror', not errs)
    if errs: print(errs[:2])
    b.close()
bad = [n for n, c in R if not c]
print('FALHAS:', bad if bad else 'nenhuma')
sys.exit(1 if bad else 0)
