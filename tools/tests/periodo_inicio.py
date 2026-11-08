"""v61.8: calendário mensal do Período (Quadro geral), Análise técnica compacta, Início (treinos a vencer -> fase atual/próxima).
Uso: python3 tools/tests/periodo_inicio.py $PWD/index.html"""
import sys
from playwright.sync_api import sync_playwright
STUB = open(__file__.replace('periodo_inicio.py','quadro_geral.py'), encoding='utf-8').read().split('STUB = ')[1].split('R = []')[0]
ns = {}; exec('STUB = ' + STUB, ns); STUB = ns['STUB']
R = []
def ck(n, c): R.append((n, bool(c))); print(('OK   ' if c else 'FAIL ') + n)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1300, 'height': 900})
    pg.set_default_timeout(15000)
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*supabase-js*', lambda r: r.fulfill(body=STUB, content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    pg.goto('file://' + sys.argv[1]); pg.wait_for_timeout(1200)
    pg.evaluate("()=>{window.confirm=()=>true;_selSplit=DEFAULT_SPLITS[0];loadSplit();dupSem(semanas[0].id);mbProtoDataInicio='2026-10-19';semanas[0].dataInicio='2026-10-19';semanas[0].duracaoSemanas=4;}")
    # --- análise compacta
    pg.evaluate("localStorage.setItem('movh_pf_analise','1')"); pg.evaluate("nav('kb-'+semanas[0].id)"); pg.wait_for_timeout(400)
    t = pg.evaluate("document.querySelector('.page.active details.pf-an').innerText")
    ck('lista de alertas sem duplicar o volume dos chips', 'Volume ZERO' not in t and 'abaixo do mínimo' not in t)
    ck('sem linha Destino/Início/Dias por semana', 'Destino' not in t and 'Dias por semana' not in t)
    ck('análise aberta ocupa pouco (<190px)', pg.evaluate("document.querySelector('.page.active details.pf-an').getBoundingClientRect().height") < 190)
    # --- calendário
    pg.evaluate("nav('kb-geral');kbgPeriodo(semanas[0].id)"); pg.wait_for_timeout(400)
    sid = pg.evaluate("semanas[0].id")
    ck('calendário mensal do mês do início (Outubro 2026)', 'Outubro 2026' in pg.evaluate("document.querySelector('#kbg-%s .kc-nav').innerText" % sid))
    ck('início e fim em destaque', pg.evaluate("document.querySelectorAll('#kbg-%s .kc-d.ini').length" % sid) == 1)
    ck('faixa do período marcada', pg.evaluate("document.querySelectorAll('#kbg-%s .kc-d.in').length" % sid) >= 12)
    pg.locator('#kbg-%s .kc-nav button' % sid).nth(1).click(); pg.wait_for_timeout(250)
    ck('próximo mês (Novembro) mostra o fim 15', pg.evaluate("document.querySelector('#kbg-%s .kc-d.fim').dataset.k" % sid) == '2026-11-15')
    pg.locator('#kbg-%s .kc-nav button' % sid).nth(0).click(); pg.wait_for_timeout(250)
    # clicar dia 26 = novo início; duração mantida; modo passa a Fim
    pg.locator('#kbg-%s .kc-d[data-k="2026-10-26"]' % sid).click(); pg.wait_for_timeout(300)
    ck('clique define o início', pg.evaluate("semanas[0].dataInicio") == '2026-10-26')
    ck('duração mantida (4)', pg.evaluate("semanas[0].duracaoSemanas") == 4)
    ck('modo vira Fim', pg.evaluate("document.querySelector('#kbg-%s .kc-modo button.on small').innerText" % sid) == 'Fim')
    ck('painel segue aberto no mesmo mês', pg.evaluate("document.querySelectorAll('#kbg-%s .kc').length" % sid) == 1)
    # clicar fim 2026-12-06 => 6 semanas (26/10 + 42d - 1 = 06/12)
    pg.locator('#kbg-%s .kc-nav button' % sid).nth(1).click(); pg.wait_for_timeout(150)
    pg.locator('#kbg-%s .kc-nav button' % sid).nth(1).click(); pg.wait_for_timeout(250)
    pg.locator('#kbg-%s .kc-d[data-k="2026-12-06"]' % sid).click(); pg.wait_for_timeout(300)
    ck('clique no fim ajusta a duração (6 sem)', pg.evaluate("semanas[0].duracaoSemanas") == 6)
    ck('fase 2 acompanha (07/12)', pg.evaluate("semanas[1].dataInicio") == '2026-12-07')
    # fim fora da semana inteira arredonda para cima
    pg.evaluate("_kbgModo[semanas[0].id]='fim'"); pg.evaluate("kbgCalClick(semanas[0].id,'2026-11-18')"); pg.wait_for_timeout(250)
    ck('fim 18/11 -> 4 semanas (até 22/11)', pg.evaluate("semanas[0].duracaoSemanas") == 4)
    # travada bloqueia mudar início
    pg.evaluate("kbgTravar(semanas[0].id)"); pg.evaluate("_kbgModo[semanas[0].id]='ini'")
    pg.evaluate("kbgCalClick(semanas[0].id,'2026-10-12')"); pg.wait_for_timeout(200)
    ck('fase travada não muda o início', pg.evaluate("semanas[0].dataInicio") == '2026-10-26')
    # fim antes do início
    pg.evaluate("kbgTravar(semanas[0].id);_kbgModo[semanas[0].id]='fim'"); pg.evaluate("kbgCalClick(semanas[0].id,'2026-10-10')"); pg.wait_for_timeout(200)
    ck('fim antes do início é recusado', pg.evaluate("semanas[0].duracaoSemanas") == 4)
    # --- Início
    pg.evaluate("nav('home')"); pg.wait_for_timeout(1700)
    pg.evaluate("""()=>{
      const H=new Date();H.setHours(0,0,0,0);const dk=o=>{const d=new Date(H);d.setDate(d.getDate()+o);return calDateKey(d)};
      const mk=(id,nome,ini,sem,fim)=>({id:id,nome:nome,ativo:true,_lixeira:false,protocoloAtivo:{id:'p'+id,data_inicio:ini,conteudo:{semanas:sem,fimPrevisto:fim||null}}});
      const f=(n,d)=>({id:'x'+n,nome:n,duracaoSemanas:d||4,dias:[]});
      mbProfessor={id:'prof',nome:'Gui Teste'};
      mbPainelAlunos=[mk('a','Natan Souza',dk(-24),[f('Base',4)]), mk('b','Bia Lima',dk(-5),[f('Base',4),f('Base 2',4)],dk(3)), mk('c','Ludmila Reis',dk(-40),[f('Base',4)]), mk('d','Longe Alguem',dk(-3),[f('Base',4)])];
      homeRender();}""")
    t = pg.evaluate("document.getElementById('home-grid').innerText")
    ck('card Treinos a vencer aparece', 'Treinos a vencer' in t)
    ck('3 alunos listados (não o que tem 25d)', pg.evaluate("document.querySelectorAll('#home-grid > section:first-child .hm-it').length") == 3 and 'Longe' not in t)
    ck('vencido mostra "treino venceu"', 'Ludmila Reis' in t and 'treino venceu' in t)
    ck('acaba em 4d', 'acaba em 4d' in t)
    ck('Bia (com fase seguinte) -> Editar próxima fase', pg.evaluate("[...document.querySelectorAll('#home-grid .hm-it')].find(e=>e.innerText.includes('Bia')).innerText.includes('Editar próxima fase')"))
    ck('Natan (sem fase seguinte) -> ✨ Próxima fase', pg.evaluate("[...document.querySelectorAll('#home-grid .hm-it')].find(e=>e.innerText.includes('Natan')).innerText.includes('✨ Próxima fase')"))
    ck('item 🏁 não repete em Vencimentos e atenção', pg.evaluate("[...document.querySelectorAll('#home-grid section')].filter(s=>s.innerText.includes('Vencimentos')).every(s=>!s.innerText.includes('treino venceu'))"))
    ck('ordenado: vencido primeiro', pg.evaluate("document.querySelector('#home-grid > section:first-child .hm-it').innerText.includes('Ludmila')"))
    # ações
    pg.evaluate("""()=>{window.__sug=[];window.mbSugerirProximaFase=async function(p,a){window.__sug.push([p,a])};
      window.mbCarregarProtoAluno=async function(id){const a=mbPainelAlunos.find(x=>x.id===id),pr=a.protocoloAtivo;semanas.length=0;pr.conteudo.semanas.forEach((s,i)=>{const c=JSON.parse(JSON.stringify(s));c.dias=[{id:c.id+'d1',nome:'Seg',blocos:[]}];semanas.push(c)});mbProtoCarregadoId=pr.id;mbProtoDataInicio=pr.data_inicio;return true}}""")
    pg.evaluate("homeAbrirFase('b','prox')"); pg.wait_for_timeout(500)
    ck('Bia: próxima fase abre kb da fase 2', pg.evaluate("(document.querySelector('.page.active')||{}).id") == 'page-kb-xBase 2')
    pg.evaluate("homeAbrirFase('b','atual')"); pg.wait_for_timeout(500)
    ck('Bia: fase atual abre a fase 1', pg.evaluate("(document.querySelector('.page.active')||{}).id") == 'page-kb-xBase')
    pg.evaluate("homeAbrirFase('a','prox')"); pg.wait_for_timeout(300)
    ck('Natan: gera próxima fase (sugestão chamada)', pg.evaluate("window.__sug.length") == 1 and pg.evaluate("window.__sug[0][1]") == 'a')
    ck('sem pageerror', not errs)
    if errs: print(errs[:3])
    b.close()
print('RESULT: %d/%d' % (sum(1 for _, c in R if c), len(R)))
sys.exit(0 if all(c for _, c in R) else 1)
