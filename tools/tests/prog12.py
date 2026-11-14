"""Gerador: botão Programa de 12 semanas (completa Consolidação + testes nas semanas 4, 8 e 12). Uso: python3 tools/tests/prog12.py <index.html>"""
import sys
from playwright.sync_api import sync_playwright
STUB = open(__file__.replace('prog12.py','gpage.py'),encoding='utf-8').read().split('STUB="""')[1].split('"""')[0]
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
      semanas=[{id:'sx',nome:'Base',fase:'base',duracaoSemanas:8,dias:[{id:'sxd1',nome:'A',blocos:[]}]}]; testesAgendados=[];
      mbPrograma12(); const a={n:semanas.length,nome:semanas[1]&&semanas[1].nome,dur:semanas[1]&&semanas[1].duracaoSemanas,t:JSON.stringify(testesAgendados)};
      mbPrograma12(); a.n2=semanas.length; a.t2=testesAgendados.length; return a;}""")
    ok(r['n']==2 and r['nome']=='Consolidação' and r['dur']==4,'8 sem -> cria Consolidação de 4: '+str(r))
    ok(all(('"semana":%d'%i) in r['t'] for i in (3,7,11)),'testes nas semanas 4, 8 e 12 (índices 3, 7, 11)')
    ok(r['n2']==2 and r['t2']==3,'idempotente (3 testes, sem duplicar)')
    ok(not errs,'sem pageerror '+str(errs[:2])); b.close()
print('FALHAS:',len(F)); sys.exit(1 if F else 0)
