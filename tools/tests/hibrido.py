"""Gerador: modelo Híbrido por padrões (5 dias), ênfases como camada e painel (joelho x quadril, híbrido). Uso: python3 tools/tests/hibrido.py <index.html>"""
import sys
from playwright.sync_api import sync_playwright
STUB = open(__file__.replace('hibrido.py','gpage.py'),encoding='utf-8').read().split('STUB="""')[1].split('"""')[0]
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
    r=pg.evaluate("""()=>{window.notify=()=>{};window.confirm=()=>true;
      const d=DEFAULT_SPLITS.find(x=>x.id==='hibrido'); const o={existe:!!d,idx:DEFAULT_SPLITS.indexOf(d),nsp:DEFAULT_SPLITS.length};
      o.dias=d.semanas[0].dias.map(x=>x.sub).join('|');
      o.exs=d.semanas[0].dias.map(x=>x.blocos.reduce((a,bl)=>a+(bl.exercicios||[]).length,0)).join(',');
      const g=hxAplicarEnfase(d,'gluteo'),s=hxAplicarEnfase(d,'superior'),n0=hxAplicarEnfase(d,'');
      const cnt=x=>x.semanas[0].dias.reduce((a,dd)=>a+dd.blocos.reduce((q,bl)=>q+(bl.exercicios||[]).length,0),0);
      o.base=cnt(d);o.g=cnt(g);o.s=cnt(s);o.sem=cnt(n0);o.gnome=g.nome;o.orig=cnt(d);
      _selSplit=DEFAULT_SPLITS.find(x=>x.id==='hibrido'); const el=document.getElementById('sp-enfase'); if(el){el.value='gluteo';}
      loadSplit(); o.carregado=semanas[0].dias.length; o.ex=semanas[0].dias.reduce((a,dd)=>a+dd.blocos.reduce((q,bl)=>q+(bl.exercicios||[]).length,0),0);
      // painel
      const c=colPadraoDia([{id:'pri',exercicios:[{nome:'Agachamento Hack'},{nome:'Bulgarian Split Squat'},{nome:'RDL Barra'},{nome:'Hip Thrust'},{nome:'KB Swing'},{nome:'Farmer Carry'},{nome:'Cadeira Extensora'},{nome:'Mesa Flexora'}]}]);
      o.joe=c.joe;o.qua=c.qua;o.hib=c.hib;o.inf=c.inf;
      return o;}""")
    ok(r['existe'] and r['idx']==r['nsp']-1 and r['idx']>0,'modelo hibrido existe e fica no fim (DEFAULT_SPLITS[0] intacto): '+str(r['idx']))
    ok(r['dias']=='Empurrar|Pernas · joelho|Puxar|Pernas · quadril|Superior misto','5 dias pelo vocabulário do dono: '+r['dias'])
    ok(r['g']==r['base']+2 and r['s']==r['base']+4 and r['sem']==r['base'],'ênfase glúteo +2 e superior +4 exercícios; sem ênfase igual ao base: '+str((r['base'],r['g'],r['s'],r['sem'])))
    ok(r['orig']==r['base'] and 'glúteo' in r['gnome'],'ênfase não altera o modelo original')
    ok(r['carregado']==5 and r['ex']==r['base']+2,'loadSplit aplica a ênfase escolhida: '+str((r['carregado'],r['ex'])))
    ok(r['joe']==3 and r['qua']==3 and r['hib']==2 and r['inf']==6,'painel separa joelho x quadril e conta híbrido: '+str((r['joe'],r['qua'],r['hib'],r['inf'])))
    ok(not errs,'sem pageerror '+str(errs[:2])); b.close()
print('FALHAS:',len(F)); sys.exit(1 if F else 0)
