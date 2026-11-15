"""Gerador: Treino de chegada, Mapa 2 (reavaliação) e degrau Avaliação + Mapa no Cobrar. Uso: python3 tools/tests/jornada_gerador.py <index.html>"""
import sys
from playwright.sync_api import sync_playwright
STUB = open(__file__.replace('jornada_gerador.py','gpage.py'),encoding='utf-8').read().split('STUB="""')[1].split('"""')[0]
F=[]
def ok(c,m):
    print(('OK ' if c else 'FAIL ')+m)
    if not c: F.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1100,'height':700}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    pg.goto('file://'+sys.argv[1]); pg.wait_for_timeout(1500)
    r=pg.evaluate("""()=>{window.notify=()=>{};
      semanas=[{id:'sx',nome:'Base',fase:'base',duracaoSemanas:8,dias:[{id:'sxd1',nome:'A',blocos:[]}]}];
      mbModeloChegada('sx'); const d=semanas[0].dias[1]; return {n:semanas[0].dias.length,nome:d.nome,bl:d.blocos.length,ex:d.blocos[1].exercicios.length,obs:d.blocos[1].obs.indexOf('semana 1')>=0||d.blocos[1].obs.indexOf('Semana 1')>=0};}""")
    ok(r['n']==2 and r['nome']=='Chegada' and r['bl']==3 and r['ex']==5 and r['obs'],'Treino de chegada: dia novo com 3 blocos e 5 exercícios: '+str(r))
    r=pg.evaluate("""()=>{
      _mbAvaliacoesCache=[{id:'a1',status:'confirmada',data_avaliacao:'2026-08-01',peso:82,cintura:90,achados:[]},{id:'a2',status:'confirmada',data_avaliacao:'2026-11-01',peso:79.5,cintura:86,achados:[]}];
      const m1=mbMapaPadrao(_mbAvaliacoesCache[0]), m2=mbMapaPadrao(_mbAvaliacoesCache[1]);
      return {c1:m1.ciclo,c2:m2.ciclo,t1:m1.marcos[0].titulo,t2:m2.marcos[0].titulo,bom:m2.bom.join('|'),ant:!!mbMapaAnterior(_mbAvaliacoesCache[1]),ant1:!!mbMapaAnterior(_mbAvaliacoesCache[0])};}""")
    ok(r['c1']==1 and r['c2']==2 and r['t1']=='Chegada' and 'reavaliação' in r['t2'],'Mapa 1 x Mapa 2: '+str(r))
    ok('Peso: 82 → 79.5 kg' in r['bom'] and 'Cintura: 90 → 86 cm' in r['bom'],'Mapa 2 traz antes e depois de peso e cintura')
    ok(r['ant'] and not r['ant1'],'só a reavaliação conta como Mapa 2')
    r=pg.evaluate("""()=>{
      const m={inicio:'2026-11-02'}, t=[{semana:3,dia:'Quarta'}];
      return {s0:mbMapaDataAgenda(m,0,t),s4:mbMapaDataAgenda(m,4,t),s8:mbMapaDataAgenda(m,8,t),s12:mbMapaDataAgenda(m,12,[{semana:11,dia:'Sexta'}])};}""")
    ok(r['s0']=='2026-11-02' and r['s4']=='2026-11-25' and r['s8']=='2026-12-27' and r['s12']=='2027-01-22','agenda dos marcos segue os testes do treino: '+str(r))
    r=pg.evaluate("""()=>{
      const a1={id:'a1',status:'confirmada',data_avaliacao:'2026-08-01',foto_frontal_path:'p1',achados:[]}, a2={id:'a2',status:'confirmada',data_avaliacao:'2026-11-01',foto_frontal_path:'p2',achados:[]};
      _mbAvaliacoesCache=[a1,a2]; const m2=mbMapaPadrao(a2), m1=mbMapaPadrao(a1);
      _mbMapa={m:m2,row:a2,testes:[],urls:{},cache:{},avalId:'a2',alunoId:'x'};
      const h=mbMapaHtmlAluno(m2,a2,{frontal:'data:a',frontal_antes:'data:b'});
      return {antes:m2.fotos.frontal.antes,d:m2.fotos.frontal.antes_data,sem1:m1.fotos.frontal.antes,html:h.indexOf('Antes e depois')>=0&&h.indexOf('Agora')>=0};}""")
    ok(r['antes']=='p1' and r['d']=='2026-08-01' and r['sem1'] is None and r['html'],'Mapa 2 liga antes e depois e a prévia mostra os dois: '+str(r))
    r=pg.evaluate("""()=>{ window.mbAbrirAvaliacoes=async()=>{}; 
      const a2=_mbAvaliacoesCache[1]; _mbMapa={m:mbMapaPadrao(a2),row:a2,testes:[{semana:3,dia:'Quarta'}],protoIni:'2026-11-09',urls:{},cache:{},avalId:'a2',alunoId:'x',ab:{}};
      document.body.insertAdjacentHTML('beforeend','<div id="mb-mapa-body"></div>'); mbMapaRender(); const h=document.getElementById('mb-mapa-body').innerText;
      return {sec:['Meta e prazo','Fotos que o aluno vê','Diagnóstico em linguagem simples','Caminho e agenda'].every(x=>h.indexOf(x)>=0),aval:h.indexOf('Da avaliação de')>=0,ini:h.indexOf('diferente do início do treino')>=0,comp:h.indexOf('Comparar com')>=0};}""")
    ok(r['sec'] and r['aval'] and r['ini'] and r['comp'],'editor novo: seções, avaliação, aviso de início e comparação: '+str(r))
    r=pg.evaluate("PL_PRESENCIAL.some(function(x){return x.id==='av_mapa'&&x.precoBR===150&&/Degrau 1/.test(x.grupo)})")
    ok(r,'degrau 1 Avaliação + Mapa no catálogo do Cobrar R$ 150')
    ok(not errs,'sem pageerror '+str(errs[:2])); b.close()
print('FALHAS:',len(F)); sys.exit(1 if F else 0)
