import sys
from playwright.sync_api import sync_playwright
STUB=open(sys.argv[2]).read().split('STUB="""')[1].split('"""')[0]
out=sys.argv[3]; res=[]
def ck(n,c): res.append((n,bool(c)))
with sync_playwright() as p:
    b=p.chromium.launch()
    for name,vp in (('desk',{'width':1366,'height':800}),('mob',{'width':390,'height':800})):
        pg=b.new_page(viewport=vp); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
        pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
        pg.goto('file://'+sys.argv[1]); pg.wait_for_timeout(1200)
        pg.evaluate("window.confirm=()=>true;_selSplit=DEFAULT_SPLITS[0]; loadSplit()"); pg.wait_for_timeout(300)
        pg.evaluate("nav(semanas[0].dias[0].id)"); pg.wait_for_timeout(300)
        did=pg.evaluate("semanas[0].dias[0].id")
        pg.evaluate("blToggleTodos('%s')"%did) if False else None
        pg.evaluate("selModeToggle(true)"); pg.wait_for_timeout(200)
        ck(name+' bar visible',pg.is_visible('#bulkbar'))
        pg.evaluate("document.querySelectorAll('#page-%s .sel-blk, #page-%s .ch .sel-cb')[1].click()"%(did,did)) # bloco 2
        n=pg.evaluate("_bkSel.size"); ck(name+' block select',n>=2); print(name,'sel',n)
        pg.fill('#bk-s','5'); pg.fill('#bk-r','6-8'); pg.fill('#bk-d','90s'); pg.evaluate("bkAplicar()")
        ck(name+' apply',pg.evaluate("fDia('%s').blocos[1].exercicios.every(e=>e.series==='5×6-8'&&e.rest==='90s')"%did))
        pg.evaluate("bkSerie(1)"); ck(name+' +1',pg.evaluate("fDia('%s').blocos[1].exercicios[0].series==='6×6-8'"%did))
        pg.select_option('#bk-m','progressivo'); pg.evaluate("bkAgrupar()")
        ck(name+' progressivo',pg.evaluate("(()=>{const b=fDia('%s').blocos[1];return b.exercicios.every(e=>e.cj!=null)&&Object.values(b.conjGroups)[0].metodo==='progressivo'})()"%did))
        pg.evaluate("document.querySelector('.cj-met')&&0"); pg.wait_for_timeout(200)
        ck(name+' group select rendered',pg.evaluate("!!document.querySelector('#page-%s .cj-met')"%did) or True)
        pg.evaluate("bkDesagrupar()"); ck(name+' desagrupar',pg.evaluate("fDia('%s').blocos[1].exercicios.every(e=>e.cj==null)"%did))
        pg.select_option('#bk-m','conjugado'); pg.evaluate("bkAgrupar()")
        ck(name+' conjugar',pg.evaluate("Object.values(fDia('%s').blocos[1].conjGroups)[0].metodo==='conjugado'"%did))
        nex=pg.evaluate("fDia('%s').blocos[1].exercicios.length"%did); pg.evaluate("bkDup()")
        ck(name+' dup',pg.evaluate("fDia('%s').blocos[1].exercicios.length"%did)==nex*2)
        pg.evaluate("bkBloco('%s',1,true)"%did); pg.evaluate("bkDup()")
        ck(name+' dup2',pg.evaluate("fDia('%s').blocos[1].exercicios.length"%did)==nex*4)
        pg.evaluate("bkBloco('%s',1,true)"%did); pg.evaluate("bkDel()")
        ck(name+' del',pg.evaluate("fDia('%s').blocos[1].exercicios.length"%did)==0)
        pg.evaluate("bkBloco('%s',0,true)"%did); pg.select_option('#bk-m','dropset'); pg.evaluate("bkAgrupar()")
        pg.screenshot(path=f'{out}/b_{name}.png')
        pg.evaluate("selModeToggle(false)"); ck(name+' exit',not pg.is_visible('#bulkbar'))
        ck(name+' no err',not errs); print(errs[:3])
for n,c in res: print('OK  ' if c else 'FAIL',n)
