"""ESCADA v2: 13 padrões, níveis N1..N4, nomes existem no banco (lista fixa), sem nome repetido, sugestão sobe dentro do padrão. Uso: python3 tools/tests/escada.py <index.html>"""
import sys
from playwright.sync_api import sync_playwright
STUB = open(__file__.replace('escada.py','gpage.py'),encoding='utf-8').read().split('STUB="""')[1].split('"""')[0]
F=[]
def ok(c,m):
    print(('OK ' if c else 'FAIL ')+m)
    if not c: F.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    pg.goto('file://'+sys.argv[1]); pg.wait_for_timeout(1200)
    r=pg.evaluate("""()=>{const o={};o.keys=Object.keys(ESCADA).join(',');
      o.niv=Object.keys(ESCADA).every(k=>ESCADA[k].length===4);
      const all=[];for(const k in ESCADA)ESCADA[k].forEach(l=>l.forEach(x=>all.push(x.toLowerCase())));
      o.dup=all.length-new Set(all).size;o.total=all.length;
      o.mesa=escadaInfo('Mesa Flexora');o.nordic=escadaInfo('Nordic Curl');o.pallof=escadaInfo('Pallof Press');o.swing=escadaInfo('KB Swing');o.bike=escadaInfo('Bike Assault/Ergômetro');
      o.sug=escadaSugestao('Cad. Flexora',['Cad. Flexora']);o.sug2=escadaSugestao('KB Swing',[]);
      return o;}""")
    ok(r['keys']=='joelho,quadril,gluteo,emp_h,emp_v,puxar_v,puxar_h,core,carregar,isquio,core_rot,potencia,locomocao','13 padrões: '+r['keys'])
    ok(r['niv'],'todo padrão tem 4 níveis'); ok(r['dup']==0,'nenhum nome repetido (total %d)'%r['total'])
    ok(r['mesa']=={'padrao':'isquio','nivel':1},'Mesa Flexora = isquio N1'); ok(r['nordic']=={'padrao':'isquio','nivel':4},'Nordic Curl = isquio N4')
    ok(r['pallof']=={'padrao':'core_rot','nivel':2},'Pallof = core_rot N2'); ok(r['swing']=={'padrao':'potencia','nivel':1},'KB Swing = potência N1')
    ok(r['bike']=={'padrao':'locomocao','nivel':2},'Bike = locomoção N2')
    ok(r['sug'] and r['sug']['nivelPara']==2 and r['sug']['padrao']=='isquio','sugestão isquio sobe para N2: %s'%r['sug'])
    ok(r['sug2'] and r['sug2']['nivelPara']==2,'sugestão potência sobe para N2')
    ok(not errs,'sem erro de página %s'%errs[:1]); b.close()
print('FALHAS' if F else 'TUDO OK'); sys.exit(1 if F else 0)
