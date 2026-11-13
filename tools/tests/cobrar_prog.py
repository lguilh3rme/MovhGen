"""Gerador: Cobrar > Programa (1 a 3 meses) ajusta valor/acesso/mensagem. Uso: python3 tools/tests/cobrar_prog.py <index.html>"""
import sys
from playwright.sync_api import sync_playwright
STUB = open(__file__.replace('cobrar_prog.py','gpage.py'),encoding='utf-8').read().split('STUB="""')[1].split('"""')[0]
F=[]
def ok(c,m):
    print(('OK ' if c else 'FAIL ')+m)
    if not c: F.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1100,'height':800}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    pg.goto('file://'+sys.argv[1]); pg.wait_for_timeout(1500)
    pg.evaluate("""()=>{ mbPainelAlunos=[{id:'a1',nome:'Iasmim Silva',ativo:true,acesso_fim:'2026-09-01',whatsapp:'27999999999'}]; mbCobrar('a1'); }""")
    pg.wait_for_timeout(500)
    def estado():
        return pg.evaluate("({v:document.getElementById('cob-valor').value,m:document.getElementById('cob-meses').style.display,t:document.getElementById('cob-msg').value,pl:mbCobrarPlano()})")
    pg.select_option('#cob-plano','pg_i_8'); pg.wait_for_timeout(200)
    e=estado(); ok(e['v']=='1728' and e['m']=='' and '3 meses' in e['t'],'8 sessões, 3 meses = 1728 e seletor visível: '+str(e['v']))
    pg.select_option('#cob-meses','2'); pg.wait_for_timeout(200)
    e=estado(); ok(e['v']=='1152' and e['pl']['dias']==60 and '2 meses' in e['t'] and 'R$' in e['t'],'2 meses = 1152, 60 dias, mensagem atualizada')
    pg.select_option('#cob-meses','1'); pg.select_option('#cob-plano','pg_i_12'); pg.wait_for_timeout(200)
    e=estado(); ok(e['v']=='816' and e['pl']['dias']==30 and '1 mês' in e['t'],'12 sessões, 1 mês = 816 e 30 dias')
    pg.select_option('#cob-plano','pr_i_8'); pg.wait_for_timeout(200)
    e=estado(); ok(e['v']=='576' and e['m']=='none','plano comum: seletor some, valor normal')
    ok(not errs,'sem pageerror '+str(errs[:2])); b.close()
print('FALHAS:',len(F)); sys.exit(1 if F else 0)
