"""App do aluno: aviso 'Abrir no YouTube' só aparece se o vídeo não iniciar em 5 s (ou der erro). Uso: python3 tools/tests/video_aviso.py <app.html>  (4 OK)"""
import sys
from playwright.sync_api import sync_playwright
STUB=open(__file__.replace('video_aviso.py','app_header.py'),encoding='utf-8').read().split('STUB = """')[1].split('"""')[0]
ok=0; fail=0
def chk(n,c,x=''):
    global ok,fail
    if c: ok+=1; print('OK  ',n)
    else: fail+=1; print('FAIL',n,x)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':412,'height':900}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    pg.route('**/youtube-nocookie.com/**',lambda r:r.fulfill(body='<html></html>',content_type='text/html'))
    pg.goto('file://'+sys.argv[1]+'?treino=abc123'); pg.wait_for_timeout(1500)
    pg.evaluate("aAbrirVideoModal('https://www.youtube-nocookie.com/embed/abcdefghijk',true)"); pg.wait_for_timeout(800)
    vis=lambda: pg.evaluate("getComputedStyle(document.getElementById('a-video-ytw')).display")
    chk('link oculto ao abrir',vis()=='none',vis())
    pg.wait_for_timeout(1500); chk('link oculto aos ~2 s',vis()=='none',vis())
    pg.wait_for_timeout(3800); chk('link aparece após 5 s sem iniciar',vis()!='none',vis())
    pg.evaluate("aFecharVideoModal();aAbrirVideoModal('https://www.youtube-nocookie.com/embed/abcdefghijk',false)"); pg.wait_for_timeout(300)
    chk('reabrir esconde o link de novo',vis()=='none',vis())
    pg.evaluate("window.dispatchEvent(new MessageEvent('message',{origin:'https://www.youtube-nocookie.com',data:JSON.stringify({event:'onError',info:101})}))")
    chk('erro do player mostra o link na hora',vis()!='none',vis())
    pg.evaluate("aFecharVideoModal();aAbrirVideoModal('https://www.youtube-nocookie.com/embed/abcdefghijk',false)")
    pg.evaluate("window.dispatchEvent(new MessageEvent('message',{origin:'https://www.youtube-nocookie.com',data:JSON.stringify({event:'infoDelivery',info:{playerState:1}})}))")
    pg.wait_for_timeout(5600); chk('vídeo tocando: link nunca aparece',vis()=='none',vis())
    chk('sem erro de JS',not errs,errs)
print(f'OK={ok} FAIL={fail}'); sys.exit(1 if fail else 0)
