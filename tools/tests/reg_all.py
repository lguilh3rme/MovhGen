import sys
from playwright.sync_api import sync_playwright
STUB=open(sys.argv[2]).read().split('STUB="""')[1].split('"""')[0]
out=sys.argv[3]
res=[]
def ck(n,c): res.append((n,bool(c))); 
with sync_playwright() as p:
    b=p.chromium.launch()
    for name,vp in (('desk',{'width':1366,'height':800}),('mob',{'width':390,'height':800})):
        pg=b.new_page(viewport=vp); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
        pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
        pg.goto('file://'+sys.argv[1]); pg.wait_for_timeout(1200)
        pg.evaluate("window.confirm=()=>true;window.prompt=()=>'x';_selSplit=DEFAULT_SPLITS[0]; loadSplit()"); pg.wait_for_timeout(400)
        for n in ['config','alunos','splits','db-ex','db-pre','db-splits','planos','export','branding','coletivas']:
            pg.evaluate("nav('%s')"%n); pg.wait_for_timeout(300)
            ck(name+' page '+n, pg.evaluate("document.getElementById('page-%s').classList.contains('active')"%n))
        pg.evaluate("nav(semanas[0].dias[0].id)"); pg.wait_for_timeout(300)
        did=pg.evaluate("semanas[0].dias[0].id")
        n0=pg.evaluate("fDia('%s').blocos[0].exercicios.length"%did)
        pg.evaluate("addEx('%s',0)"%did); ck(name+' addEx',pg.evaluate("fDia('%s').blocos[0].exercicios.length"%did)==n0+1)
        # toggle closed block
        pg.evaluate("document.querySelector('#page-%s [id^=bb-]:not([id$=\"-0\"])').previousElementSibling.click()"%did)
        ck(name+' toggle block open',pg.evaluate("(()=>{const e=document.querySelector('#page-%s [id^=bb-]:not([id$=\"-0\"])');return e.style.display=='block'})()"%did))
        pg.evaluate("blToggleTodos('%s')"%did); pg.evaluate("blToggleTodos('%s')"%did)
        nb=pg.evaluate("fDia('%s').blocos.length"%did)
        pg.evaluate("dupBloco('%s',0)"%did); ck(name+' dupBloco',pg.evaluate("fDia('%s').blocos.length"%did)==nb+1)
        nd=pg.evaluate("semanas[0].dias.length"); pg.evaluate("dupDia(semanas[0].id,'%s')"%did); ck(name+' dupDia',pg.evaluate("semanas[0].dias.length")==nd+1)
        pg.evaluate("addDia(semanas[0].id)"); ck(name+' addDia',pg.evaluate("semanas[0].dias.length")==nd+2)
        pg.evaluate("nav('kb-'+semanas[0].id)"); pg.wait_for_timeout(300); ck(name+' kanban',pg.evaluate("document.querySelectorAll('.kb-col, .kb-board > *').length")>2)
        pg.screenshot(path=f'{out}/r_{name}_kb.png')
        pg.evaluate("nav(semanas[0].dias[0].id)"); pg.evaluate("toggleDock()"); pg.wait_for_timeout(2500)
        ck(name+' dock iframe',pg.evaluate("document.getElementById('dock-frame').srcdoc.length>1000 || !!document.getElementById('dock-frame').src"))
        pg.screenshot(path=f'{out}/r_{name}_dock.png'); pg.evaluate("toggleDock()")
        pg.evaluate("nav(semanas[0].dias[0].id)"); pg.wait_for_timeout(300); pg.screenshot(path=f'{out}/r_{name}_dia.png')
        pg.evaluate("window._movhSoHTML=true"); 
        html=pg.evaluate("(async()=>{const r=await exportarComLogin();return typeof r==='string'?r.length:-1})()"); ck(name+' exportarComLogin string',html>100000)
        ck(name+' no pageerror',not errs); 
        if errs: print(name,errs[:4])
for n,c in res: print('OK  ' if c else 'FAIL',n)
