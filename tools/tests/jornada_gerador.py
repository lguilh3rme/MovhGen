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
    r=pg.evaluate("PL_PRESENCIAL.some(function(x){return x.id==='av_mapa'&&x.precoBR===0&&/Degrau 1/.test(x.grupo)})")
    ok(r,'degrau 1 Avaliação + Mapa no catálogo do Cobrar (valor a digitar)')
    ok(not errs,'sem pageerror '+str(errs[:2])); b.close()
print('FALHAS:',len(F)); sys.exit(1 if F else 0)
