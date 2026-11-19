"""Gerador: link do Telegram ?pix=<id> abre a confirmação do Pix. Uso: python3 tools/tests/pix_link.py <index.html>  (3 OK)"""
import sys
from playwright.sync_api import sync_playwright
STUB=open(__file__.replace('pix_link.py','gpage.py'),encoding='utf-8').read().split('STUB="""')[1].split('"""')[0]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1200,'height':800}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    pg.goto('file://'+sys.argv[1]+'?pix=px1'); pg.wait_for_timeout(1200)
    r=pg.evaluate("""()=>{ const o={}; o.lido=_pixLink;
      window._cf=[]; window._nt=[]; mbConfirmarPix=function(id){window._cf.push(id)}; notify=function(m){window._nt.push(m)}; nav=function(){};
      mbPainelAlunos=[{id:'a1',nome:'Teste',pixPendente:{id:'px1',valor:180,plano_nome:'Mensal',dias:30}}];
      mbPixLinkAbrir(); o.cf=window._cf.slice(); o.zerou=_pixLink; o.url=location.search;
      _pixLink='zzz'; mbPixLinkAbrir(); o.nt=window._nt.slice(); o.cf2=window._cf.slice(); return o; }""")
    print(r)
    assert r['lido']=='px1','FAIL leitura do ?pix'
    assert r['cf']==['px1'] and r['zerou'] is None and 'pix' not in r['url'],'FAIL abre confirmacao e limpa a URL'
    assert r['cf2']==['px1'] and r['nt'] and 'tratado' in r['nt'][0],'FAIL id desconhecido so avisa'
    assert not errs,errs[:2]
    print('OK 3')
