import sys, json
from playwright.sync_api import sync_playwright
STUB = """
window.supabase={createClient:function(){
 const ok=!window.__FAIL;
 const q={select(){return q},eq(){return q},limit(){return q},maybeSingle(){return Promise.resolve({data:null,error:null})},single(){return Promise.resolve({data:null,error:null})},order(){return q},in(){return q},then(r){r({data:[],error:null})},insert(){return q},update(){return q}};
 return {rpc:function(n,a){console.log('RPC',n,JSON.stringify(a));
   if(window.__FAIL) return Promise.resolve({data:null,error:{message:'boom'}});
   return Promise.resolve({data:{nome:'Treino X',professor_id:'p1',exercicios:[],conteudo:{nome:'Treino X',semanas:[{dias:[{nome:'A',blocos:[{id:'b1',nome:'Força',exercicios:[{nome:'Agachamento',series:3,reps:'10'}]}]}]}]}},error:null})},
  from:function(){return q},
  auth:{getSession:()=>Promise.resolve({data:{session:null}}),signOut:()=>Promise.resolve(),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),refreshSession:()=>Promise.resolve({data:{}})}}
}};
"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium' if False else None)
    for fail in (False,True):
        pg=b.new_page()
        logs=[]
        pg.on('console',lambda m:logs.append(m.text)); pg.on('pageerror',lambda e:logs.append('PAGEERR '+str(e)))
        pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
        pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
        pg.add_init_script(f"window.__FAIL={'true' if fail else 'false'}")
        pg.goto('file://'+sys.argv[1]+'?treino=abc123')
        pg.wait_for_timeout(1500)
        vis=pg.evaluate("['authScreen','loadingScreen','treinoScreen'].map(i=>i+':'+(document.getElementById(i)?getComputedStyle(document.getElementById(i)).display:'none'))")
        print('FAIL' if fail else 'OK',vis,logs[:6])
        pg.close()
