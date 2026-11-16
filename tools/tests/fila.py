"""Gerador: Fila de treinos. Uso: python3 tools/tests/fila.py <index.html> [png]"""
import sys, datetime as D
from playwright.sync_api import sync_playwright
STUB = open(__file__.replace('fila.py','gpage.py'),encoding='utf-8').read().split('STUB="""')[1].split('"""')[0]
t=D.date.today(); iso=lambda d:d.isoformat()
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1200,'height':800}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    pg.goto('file://'+sys.argv[1]); pg.wait_for_timeout(1500)
    js="""(ini)=>{ try{nav('alunos')}catch(e){}
     const P=(i,s)=>({id:'p'+i,data_inicio:ini[i],conteudo:{semanas:[{duracaoSemanas:s}]}});
     mbPainelAlunos=[{id:'a1',nome:'Iasmim',ativo:true,protocoloAtivo:P(0,6),protosInativos:[{id:'r1',data_inicio:ini[1]},{id:'h0',data_inicio:'2020-01-01'}]},{id:'a2',nome:'Felipe M',ativo:true,protocoloAtivo:P(1,6)},{id:'a3',nome:'Enes',ativo:true,protocoloAtivo:P(2,12)},{id:'a4',nome:'Sem treino',ativo:true,protocoloAtivo:null}];
     renderPainelAlunos(); const f=document.getElementById('al-fila'); if(!f) return 'sem fila';
     const o=document.createElement('div'); o.style.cssText='position:fixed;left:210px;top:60px;width:950px;z-index:9999;background:#0b0b0d'; o.id='ov'; o.appendChild(f.cloneNode(true)); document.body.appendChild(o);
     return f.innerText.replace(/\\n+/g,' | '); }"""
    r=pg.evaluate(js,[iso(t-D.timedelta(days=60)),iso(t-D.timedelta(days=25)),iso(t-D.timedelta(days=20))])
    print(r)
    h=pg.evaluate("document.getElementById('al-fila').innerHTML")
    ia=h.split('Felipe M')[0]
    assert 'Fase atual' in h and "mbAbrirProtoNoQuadro('r1','a1')" in ia and 'Rascunho' in ia and 'Próxima fase' not in ia, 'FAIL rascunho de Iasmim'
    assert 'Próxima fase' in h.split('Felipe M')[1].split('Enes')[0], 'FAIL gerar para Felipe'
    assert "'h0'" not in h, 'FAIL historico nao e rascunho'
    assert 'Iasmim' in r and 'Felipe M' in r and 'venceu' in r and 'Sem treino' not in r and '1 em andamento' in r, 'FAIL'
    if len(sys.argv)>2: pg.screenshot(path=sys.argv[2],clip=pg.query_selector('#ov').bounding_box())
    print('erros',errs[:2]); b.close(); sys.exit(1 if errs else 0)
