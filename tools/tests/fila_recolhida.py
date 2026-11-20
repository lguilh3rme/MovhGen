"""Gerador: Fila de treinos começa recolhida e lembra a escolha. Uso: python3 tools/tests/fila_recolhida.py <index.html>  (3 OK)"""
import sys, datetime as D
from playwright.sync_api import sync_playwright
STUB=open(__file__.replace('fila_recolhida.py','gpage.py'),encoding='utf-8').read().split('STUB="""')[1].split('"""')[0]
t=D.date.today()
JS="""(ini)=>{ try{nav('alunos')}catch(e){}
 mbPainelAlunos=[{id:'a1',nome:'Iasmim',ativo:true,protocoloAtivo:{id:'p0',data_inicio:ini,conteudo:{semanas:[{duracaoSemanas:6}]}},protosInativos:[],registrosCarga:[],rpeMes:[]}];
 renderPainelAlunos(); return document.getElementById('al-fila').open; }"""
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1200,'height':800}); pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    for q in (pg,):
        q.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
        q.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    ini=(t-D.timedelta(days=20)).isoformat()
    pg.goto('file://'+sys.argv[1]); pg.wait_for_timeout(1200)
    a=pg.evaluate(JS,ini); assert a is False,'FAIL deveria iniciar recolhida'; print('OK recolhida')
    pg.evaluate("document.getElementById('al-fila').open=true"); pg.wait_for_timeout(200)
    assert pg.evaluate("localStorage.getItem('movh-fila-aberta')")=='1','FAIL nao salvou aberta'; print('OK salvou')
    pg.reload(); pg.wait_for_timeout(1200)
    c=pg.evaluate(JS,ini); assert c is True,'FAIL deveria lembrar aberta'; print('OK lembrou')
    assert not errs,errs[:2]
