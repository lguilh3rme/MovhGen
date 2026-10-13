import sys
STUB=open('tools/tests/gpage.py').read().split('STUB="""')[1].split('"""')[0]
from playwright.sync_api import sync_playwright
S='/tmp'
R=[]
def ck(n,c): R.append((n,bool(c)))
with sync_playwright() as p:
    b=p.chromium.launch()
    for name,vp in (('desk',{'width':1366,'height':800}),('mob',{'width':390,'height':800})):
        pg=b.new_page(viewport=vp); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
        pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
        pg.goto('file:///home/claude/movhgen/index.html'); pg.wait_for_timeout(1200)
        pg.evaluate("window.confirm=()=>true;_selSplit=DEFAULT_SPLITS[0]; loadSplit(); nav('kb-'+semanas[0].id)"); pg.wait_for_timeout(500)
        pg.locator('.page.active .pbar button:has-text("Em massa")').click(); pg.wait_for_timeout(300)
        ck(name+' bar',pg.is_visible('#bulkbar'))
        # clicar no card (não na caixinha) seleciona e não abre modal
        pg.locator('.page.active .kb-card').first.click(position={'x':60,'y':10}); pg.wait_for_timeout(200)
        ck(name+' card click selects',pg.evaluate("_bkSel.size")==1)
        ck(name+' modal not open',pg.evaluate("![...document.querySelectorAll('.mbg')].some(m=>m.classList.contains('open')||m.classList.contains('on')||getComputedStyle(m).display==='flex')"))
        # bloco inteiro de outro dia
        pg.locator('.page.active .kb-col').nth(1).locator('.kb-grupo-hd .sel-cb').first.check(); pg.wait_for_timeout(200)
        n=pg.evaluate("_bkSel.size"); ck(name+' block select multi-day',n>=3); print(name,'sel',n)
        pg.fill('#bk-s','4'); pg.fill('#bk-r','10'); pg.fill('#bk-d','75s'); pg.click('#bulkbar >> text=Aplicar'); pg.wait_for_timeout(300)
        ck(name+' applied',pg.evaluate("[..._bkSel].every(e=>e.series==='4×10'&&e.rest==='75s')"))
        ck(name+' kb rerendered w/ sel',pg.evaluate("document.querySelectorAll('.page.active .kb-card.sel').length")==n)
        pg.select_option('#bk-m','progressivo'); pg.click('#bulkbar >> text=Agrupar'); pg.wait_for_timeout(300)
        ck(name+' group in kb',pg.evaluate("document.querySelectorAll('.page.active .kb-cj').length")>=1)
        pg.screenshot(path=f'/tmp/kbm_{name}.png')
        pg.click('#bulkbar >> text=sair'); pg.wait_for_timeout(300)
        ck(name+' exit',not pg.is_visible('#bulkbar'))
        pg.locator('.page.active .kb-card').first.click(); pg.wait_for_timeout(300)
        ck(name+' normal click opens modal',pg.evaluate("[...document.querySelectorAll('.mbg')].some(m=>getComputedStyle(m).display!=='none')"))
        ck(name+' no err',not errs); print(errs[:2])
for n,c in R: print('OK  ' if c else 'FAIL',n)
