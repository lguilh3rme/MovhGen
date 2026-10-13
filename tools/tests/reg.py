import sys
from playwright.sync_api import sync_playwright
exec(open(sys.argv[2]).read().split('with sync_playwright')[0].split('STUB = ')[0]) if False else None
src=open(sys.argv[2]).read()
STUB=src.split('STUB = """')[1].split('"""')[0]
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=b.new_page(viewport={'width':390,'height':800})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    pg.goto('file://'+sys.argv[1]+'?treino=abc123'); pg.wait_for_timeout(1500)
    print('btn visible:',pg.is_visible('#tRegistroBtn'), pg.inner_text('#tRegistroBtn'))
    pg.screenshot(path=sys.argv[3]+'/reg1.png')
    pg.click('#tRegistroBtn',force=True); pg.wait_for_timeout(1500)
    print('url:',pg.url.split('index.html')[-1])
    print('auth:',pg.evaluate("getComputedStyle(document.getElementById('authScreen')).display"), 'tab signup active:',pg.evaluate("(document.querySelector('.atab.active,.auth-tab.active,[data-tab].active')||{}).textContent"))
    pg.screenshot(path=sys.argv[3]+'/reg2.png'); print(errs)
