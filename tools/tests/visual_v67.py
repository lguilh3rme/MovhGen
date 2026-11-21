"""Gerador v67: Quadro enxuto + Configuração. Uso: python3 tools/tests/visual_v67.py <index.html>  (15 OK)"""
import sys
from playwright.sync_api import sync_playwright
STUB=open(__file__.replace('visual_v67.py','gpage.py'),encoding='utf-8').read().split('STUB="""')[1].split('"""')[0]
R=[]
def ck(n,c): R.append((n,bool(c))); print(('OK ' if c else 'FAIL ')+n)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':820}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    pg.goto('file://'+sys.argv[1]); pg.wait_for_timeout(1500)
    pg.evaluate("window.confirm=()=>true; try{localStorage.removeItem('movh_pf_analise')}catch(e){} _selSplit=DEFAULT_SPLITS[0]; loadSplit(); nav('kb-'+semanas[0].id)"); pg.wait_for_timeout(800)
    q=lambda js: pg.evaluate(js)
    ck('Quadro: sem chips de dia nem ＋', q("document.querySelectorAll('.page.active .pbar .pb-chip[data-did]').length")==0 and q("[...document.querySelectorAll('.page.active .pbar .pb-chip')].every(e=>e.textContent.trim()!=='＋')"))
    ck('Quadro: chips de semana A/B', q("document.querySelectorAll('.page.active .pbar .pb-chip[data-sid]').length")>=2)
    ck('Editor clássico só no menu ⋯', q("document.querySelectorAll('.page.active .pbar > .pb-btn[onclick*=config]').length")==0 and q("document.querySelectorAll('.page.active .pbar .pb-more .pb-pop button').length")==3)
    ck('destino neutro e texto novo', q("(()=>{const d=document.querySelector('.page.active .pbar .dest');return d&&d.classList.contains('vazio')&&d.textContent.includes('Escolher destino')})()"))
    ck('Salvar é o último da barra', q("(()=>{const k=document.querySelector('.page.active .pbar').lastElementChild;return k.classList.contains('sv')})()"))
    ck('sem botão Quadro no modo kb', q("[...document.querySelectorAll('.page.active .pbar .pb-btn')].every(e=>e.textContent.trim()!=='🗂️ Quadro')"))
    ck('título com resumo', q("(document.querySelector('.page.active .kb-resumo')||{textContent:''}).textContent.includes('dias')"))
    ck('análise recolhida por padrão', q("document.querySelector('.page.active details.pf-an').open")==False)
    ck('árvore Treino recolhida no Quadro', q("document.getElementById('treino-grp').classList.contains('open')")==False)
    pg.evaluate("nav('config')"); pg.wait_for_timeout(500)
    ck('Geral: Treino em edição oculto, sem Próximo', q("getComputedStyle(document.getElementById('cfg-treino')).display")=='none' and q("[...document.querySelectorAll('#page-config .btn')].every(e=>!e.textContent.includes('Próximo'))"))
    ck('Geral: campos cfg-* seguem no DOM', q("['cfg-nome','cfg-icone','cfg-desc','cfg-div'].every(i=>!!document.getElementById(i))"))
    pg.evaluate("nav('branding')"); pg.wait_for_timeout(400); pg.evaluate("logoTab('rodape')")
    ck('Logos: aba Rodapé mostra só o card do rodapé', q("(()=>{const v=s=>[...document.querySelectorAll('#page-branding '+s)].every(e=>getComputedStyle(e).display!=='none');const h=s=>[...document.querySelectorAll('#page-branding '+s)].every(e=>getComputedStyle(e).display==='none');return v('.lt-rodape')&&h('.lt-login')&&h('.lt-topo')})()"))
    m=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True).new_page()
    m.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript')); m.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    m.goto('file://'+sys.argv[1]); m.wait_for_timeout(1200); m.evaluate("_selSplit=DEFAULT_SPLITS[0]; loadSplit(); nav('kb-'+semanas[0].id)"); m.wait_for_timeout(600)
    ck('celular: Salvar e destino visíveis sem rolar', m.evaluate("(()=>{const r=e=>document.querySelector('.page.active .pbar '+e).getBoundingClientRect().right;return r('.sv')<=392&&r('.dest')<=392})()"))
    m.evaluate("nav('planos')"); m.wait_for_timeout(500)
    ck('celular: Planos tem dica de rolagem', m.evaluate("(()=>{const d=document.querySelector('.pl-dica');return !!d&&getComputedStyle(d).display!=='none'})()"))
    ck('sem erros de JS', not errs)
    n=sum(1 for _,c in R if c); print('OK=%d FAIL=%d'%(n,len(R)-n))
    sys.exit(0 if n==len(R) else 1)
