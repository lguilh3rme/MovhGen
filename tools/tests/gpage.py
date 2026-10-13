import sys
from playwright.sync_api import sync_playwright
STUB="""window.supabase={createClient:function(){const q={select(){return q},eq(){return q},limit(){return q},maybeSingle(){return Promise.resolve({data:null,error:null})},order(){return q},in(){return q},insert(){return q},upsert(){return q},update(){return q},delete(){return q},then(r){r({data:[],error:null})}};
return {rpc:()=>Promise.resolve({data:null,error:null}),from:()=>q,auth:{getSession:()=>Promise.resolve({data:{session:null}}),signOut:()=>Promise.resolve(),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),refreshSession:()=>Promise.resolve({data:{}})}}}};"""
page, out, w, h = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
full = len(sys.argv)>5 and sys.argv[5]=='full'
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':w,'height':h})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    pg.goto('file://'+page); pg.wait_for_timeout(1500)
    pg.on('dialog',lambda d:d.accept())
    pg.evaluate("window.confirm=()=>true; _selSplit=DEFAULT_SPLITS[0]; loadSplit(); nav('config')")
    pg.wait_for_timeout(600)
    pg.evaluate("document.querySelector('#page-config .ec, #page-config .exr, #page-config [id^=d-]')&&0; window.scrollTo(0,0)")
    print(pg.evaluate("[...document.querySelectorAll('#page-config ~ *, .sb-day, [onclick*=selDay], [onclick*=selecionarDia]')].slice(0,3).map(e=>e.getAttribute('onclick'))"))
    print(pg.evaluate("(function(){var e=[...document.querySelectorAll('*')].find(x=>x.children.length==0&&x.textContent.trim()=='Segunda'&&x.closest('[onclick]'));return e?e.closest('[onclick]').getAttribute('onclick'):null})()"))
    pg.evaluate("nav('db-ex')"); pg.wait_for_timeout(900)
    pg.screenshot(path=out,full_page=full); print('errs',errs[:3])
