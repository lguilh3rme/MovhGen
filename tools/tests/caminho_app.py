"""App do aluno: card 'Seu caminho' (só com chave ligada + Mapa publicado) e tela.
Uso: python3 tools/tests/caminho_app.py <app.html> [pasta_prints]"""
import sys, datetime
from playwright.sync_api import sync_playwright
OUT = sys.argv[2] if len(sys.argv) > 2 else None
ini = (datetime.date.today() - datetime.timedelta(days=30)).isoformat()
STUB = """
window.__CAM = {on:true, pub:true};
const SVG='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#7aa"/><circle cx="150" cy="90" r="40" fill="#fff"/><rect x="100" y="140" width="100" height="200" fill="#fff"/></svg>');
window.supabase={createClient:function(){
 function mk(t){const q={select(){return q},eq(){return q},not(){return q},is(){return q},limit(){return q},order(){return q},in(){return q},insert(){return q},update(){return q},
  maybeSingle(){return Promise.resolve({data:null,error:null})},single(){return Promise.resolve({data:null,error:null})},
  then(r){ if(t==='avaliacoes_fisicas') return r({data:[{id:'v1',mapa:{publicado:window.__CAM.pub,objetivo:'Emagrecer 5 kg e melhorar a postura dos ombros',semanas:12,inicio:'__INI__',
     bom:['Joelhos alinhados','Boa mobilidade de quadril'],melhorar:['Ombros mais à frente','Quadril inclinado para frente'],depende:['Treinar 3x por semana','Dormir 7h por noite'],
     marcos:[{sem:0,titulo:'Início',texto:''},{sem:4,titulo:'Check 1',texto:''},{sem:8,titulo:'Check 2',texto:''},{sem:12,titulo:'Reavaliação',texto:''}],fotos:{}},
     peso:82,cintura:90,quadril:100,foto_frontal_path:'a/f.jpg',foto_posterior_path:'a/p.jpg',foto_lateral_d_path:'a/d.jpg',foto_lateral_e_path:'a/e.jpg'}],error:null});
    return r({data:[],error:null}); }};return q;}
 return {rpc:function(){return Promise.resolve({data:{nome:'Treino X',professor_id:'p1',exercicios:[],conteudo:{nome:'Treino X',semanas:[{dias:[{nome:'A',blocos:[{id:'b1',nome:'Força',exercicios:[{nome:'Agachamento',series:3,reps:'10'}]}]}]}]}},error:null})},
  from:function(t){return mk(t)},
  storage:{from(){return {createSignedUrls(ps){return Promise.resolve({data:ps.map(p=>({path:p,signedUrl:SVG})),error:null})}}}},
  auth:{getSession:()=>Promise.resolve({data:{session:null}}),signOut:()=>Promise.resolve(),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),refreshSession:()=>Promise.resolve({data:{}})}}
}};
""".replace('__INI__', ini)
F=[]
def ok(c,m):
    print(('OK ' if c else 'FAIL ')+m)
    if not c: F.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844},device_scale_factor=2); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    pg.goto('file://'+sys.argv[1]+'?treino=abc123'); pg.wait_for_timeout(1800)
    vis=lambda: pg.evaluate("getComputedStyle(document.getElementById('tCaminhoCard')).display!=='none'")
    ok(not vis(),'chave desligada: card oculto')
    pg.evaluate("aAlunoRow={id:'a1',caminho_ativo:true}; window.__CAM.pub=false; aCaminhoCarregar()"); pg.wait_for_timeout(500)
    ok(not vis(),'ligado mas Mapa não publicado: oculto')
    pg.evaluate("window.__CAM.pub=true; aCaminhoCarregar()"); pg.wait_for_timeout(500)
    ok(vis(),'ligado + publicado: card visível')
    pg.evaluate("document.getElementById('tCaminhoCard').scrollIntoView({block:'center'})")
    if OUT: pg.screenshot(path=OUT+'/caminho_card.png')
    pg.evaluate("document.getElementById('tCaminhoCard').click()"); pg.wait_for_timeout(1200)
    ok(pg.evaluate("document.getElementById('tCaminho').style.display==='block' && document.getElementById('tDashboard').style.display==='none'"),'toque abre a tela')
    ok(pg.evaluate("document.querySelectorAll('#tCamFotos img').length")==4,'4 fotos de postura')
    if OUT:
        pg.screenshot(path=OUT+'/caminho_tela.png',full_page=True)
    pg.evaluate("aVoltarHoje()")
    ok(pg.evaluate("document.getElementById('tDashboard').style.display==='block' && document.getElementById('tCaminho').style.display==='none'"),'voltar funciona')
    ok(not errs,'sem pageerror '+str(errs[:2])); b.close()
print('FALHAS:',len(F)); sys.exit(1 if F else 0)
