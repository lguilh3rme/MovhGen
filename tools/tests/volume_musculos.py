"""Gerador: contagem de volume por músculo (direta=1, sinergista=0,5, core/panturrilha/delt. post., razões, composto do banco). Uso: python3 tools/tests/volume_musculos.py <index.html>"""
import sys
from playwright.sync_api import sync_playwright
STUB = open(__file__.replace('volume_musculos.py','gpage.py'),encoding='utf-8').read().split('STUB="""')[1].split('"""')[0]
ok=0
def chk(c,m):
    global ok
    assert c,'FAIL '+m; ok+=1; print('OK',m[:60])
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    pg.goto('file://'+sys.argv[1]); pg.wait_for_timeout(1500)
    pg.evaluate("""()=>{ REP={'💪 Push Horizontal':[{n:'Bench Press',gp:'peitoral',ms:['triceps','ombros'],mx:true}],
      '💪 Pull Horizontal':[{n:'Barbell Row',gp:'dorsais',ms:['biceps','deltoide_post','trapezio'],mx:true}],
      '🦵 Lower Acessórios':[{n:'Panturrilha',gp:'panturrilha',ms:[],mx:false},{n:'Cadeira Extensora',gp:'quadriceps',ms:[],mx:false}],
      '🔩 Core Base':[{n:'Hollow Hold',gp:'core',ms:[],mx:false}],
      '💪 Carries & Compostos':[{n:'Push Press',gp:'condicionamento',ms:[],mx:false}],
      '💪 Push Vertical':[{n:'Push Press',gp:'ombros',ms:['triceps'],mx:true}]}; pfIndexarMusculos(); }""")
    sem="{dias:[{blocos:[{id:'pri',exercicios:[{nome:'Bench Press',series:'4x8'},{nome:'Barbell Row',series:'4x8'},{nome:'Panturrilha',series:'3x15'},{nome:'Hollow Hold',series:'3x30'},{nome:'Skull Crusher',series:'3x12'}]},{id:'con',exercicios:[{nome:'Bench Press',series:'9x9'}]}]}]}"
    v=pg.evaluate("pfVolume(%s)"%sem); d=pg.evaluate("pfVolume(%s,true)"%sem)
    chk(v['Peito']==4 and d['Peito']==4,'peito 4 diretas (supino não vira 100%% de outro músculo): %s'%v)
    chk(v['Tríceps']==5,'tríceps = 0,5x4 (supino) + 3 diretas (regex reserva) = 5: %s'%v['Tríceps'])
    chk(v['Ombros']==2 and 'Ombros' not in d,'ombros só indireto 0,5x4; sem direto')
    chk(v['Bíceps']==2 and v['Deltoide post.']==2 and v['Costas']==4,'remada: costas 4, bíceps 2, delt. post. 2')
    chk(v['Panturrilha']==3 and v['Core']==3,'panturrilha e core contados')
    chk(pg.evaluate("pfEhComposto('Push Press')") is True and pg.evaluate("pfEhComposto('Panturrilha')") is False and pg.evaluate("pfEhComposto('Cadeira Extensora')") is False,'composto vem do banco (Push Press de força vence o de condicionamento)')
    chk(pg.evaluate("pfEhComposto('Supino Reto Qualquer')") is True,'sem dados no banco: reserva por regex')
    r=pg.evaluate("pfRazoes({dias:[{blocos:[{id:'pri',exercicios:[{nome:'Bench Press',series:'6x8'},{nome:'Barbell Row',series:'3x8'}]}]}]})")
    chk(len(r)==1 and 'puxar 3' in r[0],'razão puxar<empurrar avisa: %s'%r)
    z=pg.evaluate("(async()=>JSON.stringify((await kbAnaliseDados({dias:[{blocos:[{id:'pri',exercicios:[{nome:'Bench Press',series:'4x8'}]}]}]})).alertas))()")
    chk('ZERO' in z and not any(k in z for k in ('Core','Panturrilha','Deltoide')),'core/panturrilha/delt. post. opcionais não geram alerta de volume zero')
    print('erros',errs[:2]); b.close(); sys.exit(1 if errs else 0)
