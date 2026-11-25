"""Personal (/personal/) e Coletivas (/coletivas/) como apps próprios: rota, manifest, título, token, colar link, chaves de instalação.
Uso: python3 tools/tests/modos_pwa.py <pasta_export> [pasta_prints]   (pasta_export = a que tem app.html, personal/, coletivas/)"""
import sys, os, threading, http.server, socketserver, functools, json, datetime
from playwright.sync_api import sync_playwright
ROOT=sys.argv[1]; PRINTS=sys.argv[2] if len(sys.argv)>2 else None
hoje=datetime.date.today().isoformat()
def blocos(): return [
 {"id":"b1","nome":"Força","exercicios":[{"nome":"Agachamento livre","series":"4","reps":"8","url":"https://youtu.be/x"},{"nome":"Supino reto","series":"3","reps":"10-12"}]},
 {"id":"b2","tipo":"condicionamento","formato":"3 rounds for time","materiais":"Kettlebell 12 kg","exercicios":[{"nome":"Swing","reps":"20"},{"nome":"Burpee","reps":"10"}]}]
STUB = """
window.__RPC=[];
window.supabase={createClient:function(){
 const q={select(){return q},eq(){return q},limit(){return q},maybeSingle(){return Promise.resolve({data:null,error:null})},single(){return Promise.resolve({data:null,error:null})},order(){return q},in(){return q},then(r){r({data:[],error:null})},insert(){return q},update(){return q}};
 return {rpc:function(n,a){window.__RPC.push(n+':'+JSON.stringify(a));
   const B=%s, H='%s';
   if(n==='get_personal_painel') return Promise.resolve({data:{alunos:[{id:'a1',nome:'Marcos',dados:{[H]:B}},{id:'a2',nome:'Vinicius',dados:{}}]},error:null});
   if(n==='get_personal_registros') return Promise.resolve({data:[],error:null});
   if(n==='salvar_personal_registro') return Promise.resolve({data:true,error:null});
   if(n==='get_coletivas_publico') return Promise.resolve({data:{[H]:B},error:null});
   return Promise.resolve({data:null,error:null})},
  from:function(){return q},
  auth:{getSession:()=>Promise.resolve({data:{session:null}}),signOut:()=>Promise.resolve(),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),refreshSession:()=>Promise.resolve({data:{}})}}
}};
""" % (json.dumps(blocos()), hoje)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
    def translate_path(self,path):
        if path.startswith('/movh/'): path=path[5:]
        return super().translate_path(path)
srv=socketserver.TCPServer(('127.0.0.1',0),functools.partial(Q,directory=ROOT)); port=srv.server_address[1]
threading.Thread(target=srv.serve_forever,daemon=True).start()
ok=fail=0
def chk(n,c,extra=''):
    global ok,fail
    if c: ok+=1; print('OK',n)
    else: fail+=1; print('FAIL',n,extra)
with sync_playwright() as p:
    b=p.chromium.launch()
    def novo(ua=None):
        c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,user_agent=ua) if ua else b.new_context(viewport={'width':390,'height':844},device_scale_factor=2)
        pg=c.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
        pg.route('**/fonts.googleapis.com/**',lambda r:r.abort()); pg.route('**/i.ytimg.com/**',lambda r:r.abort())
        return c,pg,errs
    ver=lambda pg,i:pg.evaluate("id=>{const e=document.getElementById(id);return e?getComputedStyle(e).display:'none'}",i)
    # ---- Personal com token na URL ----
    c,pg,errs=novo(); pg.goto(f'http://127.0.0.1:{port}/personal/?t=TOKENabc12345'); pg.wait_for_timeout(1500)
    chk('personal: tela do personal visível',ver(pg,'tPersonal')=='block' and ver(pg,'treinoScreen')=='block')
    chk('personal: usou o token da URL',any('get_personal_painel:{"p_token":"TOKENabc12345"}'==r for r in pg.evaluate('window.__RPC')),pg.evaluate('window.__RPC'))
    chk('personal: guardou o token no aparelho',pg.evaluate("localStorage.getItem('movh_pp_token')")=='TOKENabc12345')
    chk('personal: mostra exercícios e campo de carga',pg.evaluate("document.querySelectorAll('#tPersonalConteudo .pr-ex').length")>=2)
    pg.fill('.pr-carga >> nth=0','80'); pg.click('.pr-ck >> nth=0'); pg.wait_for_timeout(500)
    chk('personal: marcar feito grava e mostra ✓',pg.evaluate("document.querySelector('.pr-st').textContent")=='✓' and any(r.startswith('salvar_personal_registro:') and '"p_feito":true' in r and '"p_carga":"80"' in r for r in pg.evaluate('window.__RPC')))
    chk('personal: título e manifest próprios',pg.title()=='MOVH Personal' and pg.evaluate("document.querySelector('link[rel=manifest]').getAttribute('href')")=='manifest.webmanifest')
    chk('personal: sem treino do aluno nem botão sair',ver(pg,'tDashboard')!='block' and ver(pg,'tSairBtn')=='none')
    chk('personal: título do topo',pg.evaluate("document.getElementById('tSaudacaoTitulo').textContent").strip()=='MOVH Personal')
    chk('personal: chaves de instalação separadas',pg.evaluate("aInstKey('movh-install')")=='movh-install-personal')
    chk('personal: não grava como aluno (preview)',pg.evaluate('window._movhPreview===true'))
    if PRINTS: pg.screenshot(path=PRINTS+'/personal.png',full_page=False)
    chk('personal: sem erro de JS',not errs,errs)
    c.close()
    # ---- Personal sem token: colar link ----
    c,pg,errs=novo(); pg.goto(f'http://127.0.0.1:{port}/personal/'); pg.wait_for_timeout(1200)
    chk('personal sem token: pede o link',pg.evaluate("!!document.getElementById('aPerLinkIn')"))
    pg.fill('#aPerLinkIn','olha: https://movh.netlify.app/personal/?t=ZZtoken987654 valeu'); pg.click('#tPersonalConteudo button'); pg.wait_for_timeout(900)
    chk('personal sem token: link colado carrega',pg.evaluate("document.querySelectorAll('#tPersonalConteudo .pr-ex').length")>=2 and pg.evaluate("localStorage.getItem('movh_pp_token')")=='ZZtoken987654')
    chk('personal sem token: erro de JS',not errs,errs)
    c.close()
    # ---- Personal reabre com token guardado (Android/desktop) e formato antigo ?personal=TOKEN ----
    c,pg,errs=novo(); pg.goto(f'http://127.0.0.1:{port}/personal/?personal=OLDtoken123456'); pg.wait_for_timeout(1200)
    chk('personal: formato antigo ?personal=',any('OLDtoken123456' in r for r in pg.evaluate('window.__RPC')))
    pg.goto(f'http://127.0.0.1:{port}/personal/'); pg.wait_for_timeout(1200)
    chk('personal: reabre sem token na URL usando o guardado',any('OLDtoken123456' in r for r in pg.evaluate('window.__RPC')))
    c.close()
    # ---- Coletivas ----
    for caminho in ('/coletivas/','/coletivas'):
        c,pg,errs=novo(); pg.goto(f'http://127.0.0.1:{port}{caminho}'); pg.wait_for_timeout(1500)
        chk(f'coletivas {caminho}: tela visível e conteúdo',ver(pg,'tColetivas')=='block' and pg.evaluate("document.getElementById('tColetivasConteudo').textContent.length")>40)
        if caminho=='/coletivas/':
            chk('coletivas: título e manifest próprios',pg.title()=='MOVH Coletivas' and pg.evaluate("document.querySelector('link[rel=manifest]').getAttribute('href')")=='manifest.webmanifest')
            chk('coletivas: chaves de instalação separadas',pg.evaluate("aInstKey('movh-install')")=='movh-install-coletivas')
            chk('coletivas: título do topo',pg.evaluate("document.getElementById('tSaudacaoTitulo').textContent").strip()=='MOVH Coletivas')
            if PRINTS: pg.screenshot(path=PRINTS+'/coletivas.png',full_page=False)
        chk(f'coletivas {caminho}: erro de JS',not errs,errs)
        c.close()
    # ---- manifests independentes (id próprio, escopo só da pasta, ícones existem) e funcionamento sob /movh/ (GitHub Pages) ----
    for pre in ('','/movh'):
        for d,nome in (('personal','MOVH Personal'),('coletivas','MOVH Coletivas')):
            c,pg,errs=novo(); pg.goto(f'http://127.0.0.1:{port}{pre}/{d}/'+('?t=TOKENabc12345' if d=='personal' else '')); pg.wait_for_timeout(1300)
            r=pg.evaluate('''async()=>{const l=document.querySelector('link[rel=manifest]');const u=new URL(l.getAttribute('href'),location.href);const m=await (await fetch(u)).json();
              const ic=await Promise.all(m.icons.map(async i=>(await fetch(new URL(i.src,u))).status));
              const sw=(await fetch(new URL('sw.js',location.href))).status;const ver=(await fetch(new URL('../version.json',location.href))).status;
              return {m:m,ic:ic,sw:sw,ver:ver,u:u.pathname,page:location.pathname}}''')
            m=r['m']
            chk(f'manifest {pre or "/"}{d}: nome, escopo só da pasta e sem id herdado',m['name']==nome and m['scope']=='./' and m['start_url']=='./' and 'id' not in m and r['u']==r['page']+'manifest.webmanifest',r)
            chk(f'manifest {pre or "/"}{d}: ícones, sw.js e version.json acessíveis',r['ic']==[200,200,200] and r['sw']==200 and r['ver']==200,r)
            chk(f'{pre or "/"}{d}: abre e sem erro de JS',pg.evaluate("document.getElementById('treinoScreen').style.display")=='block' and not errs,errs)
            c.close()
    # ---- iPhone: botão instalar aparece no Personal ----
    ua='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
    c,pg,errs=novo(ua); pg.goto(f'http://127.0.0.1:{port}/personal/?t=TOKENabc12345'); pg.wait_for_timeout(1500)
    pg.evaluate("aInstallInit()")
    chk('iphone: botão Instalar visível no Personal',ver(pg,'tInstBtn')!='none')
    if PRINTS: pg.screenshot(path=PRINTS+'/personal_iphone.png')
    c.close()
    # ---- app do aluno intacto ----
    c,pg,errs=novo(); pg.goto(f'http://127.0.0.1:{port}/app.html'); pg.wait_for_timeout(1200)
    chk('aluno: manifest e título do aluno',pg.title()=='MOVH — Meu Treino' and pg.evaluate("document.querySelector('link[rel=manifest]').getAttribute('href')")=='manifest.webmanifest')
    chk('aluno: chave de instalação original',pg.evaluate("aInstKey('movh-install')")=='movh-install')
    c.close()
    b.close()
srv.shutdown()
print(f'OK={ok} FAIL={fail}')
