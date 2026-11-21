"""Gerador: Comparar fases (Quadro ⋯): diff entre duas fases. Uso: python3 tools/tests/comparar_fases.py <index.html> [png]  (5 OK)"""
import sys
from playwright.sync_api import sync_playwright
STUB=open(__file__.replace('comparar_fases.py','gpage.py'),encoding='utf-8').read().split('STUB="""')[1].split('"""')[0]
E=lambda n,s,r='60s':{'nome':n,'series':s,'rest':r}
A={'nome':'Base','dias':[{'nome':'Push','blocos':[{'id':'pri','exercicios':[E('Supino Inclinado','3×10-12'),E('Voador Peitoral','3×10-12'),E('Elevação Lateral','3×10-12')]}]},{'nome':'Legs','blocos':[{'id':'pri','exercicios':[E('Back Squat','3×10-12'),E('Deadlift Sumo','4×10-8')]}]}]}
B={'nome':'Intensificação','dias':[{'nome':'Push','blocos':[{'id':'pri','exercicios':[E('Supino Inclinado','4×6-10','90s'),E('Voador Peitoral','3×10-12'),E('Arnold Press','3×8-12')]}]},{'nome':'Legs','blocos':[{'id':'pri','exercicios':[E('Back Squat','4×6-10','90s'),E('RDL Barra','4×6-10','90s')]}]}]}
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1100,'height':800}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    pg.goto('file://'+sys.argv[1]); pg.wait_for_timeout(1200)
    R=pg.evaluate("([a,b])=>cmpDiff(a,b)",[A,B])
    assert (R['nov'],R['sai'],R['alt'])==(2,2,2),R; print('OK diff 2 novos / 2 sairam / 2 alterados')
    assert (R['sa'],R['sb'])==(16,18),R; print('OK total de series 16 -> 18')
    assert len(R['dias'])==2 and R['dias'][0]['na']=='Push','FAIL pareamento'; print('OK pareia os dias')
    pg.evaluate("([a,b])=>{semanas=[a,b]; nav('home'); }",[A,B]); pg.wait_for_timeout(300)
    pg.evaluate("cmpAbrir()"); pg.wait_for_timeout(800)
    assert pg.evaluate("document.querySelectorAll('#cmp-modal .cmp-r.novo').length")==2; print('OK modal abre e mostra os novos')
    if len(sys.argv)>2: pg.screenshot(path=sys.argv[2])
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    assert pg.evaluate("!document.getElementById('cmp-modal')"); print('OK Esc fecha')
    assert not errs,errs[:2]
