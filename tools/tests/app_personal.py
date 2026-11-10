"""App do aluno: botão Personal (só e-mail liberado + professor dono do token), espaço do rodapé e botão concluir.
Uso: python3 tools/tests/app_personal.py <app.html>"""
import sys
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
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':412,'height':900},device_scale_factor=2); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    pg.route('**/personal/**',lambda r:r.fulfill(body='<html><body>personal ok</body></html>',content_type='text/html'))
    pg.add_init_script("window.__FAIL=false")
    pg.goto('file://'+sys.argv[1]+'?treino=abc123'); pg.wait_for_timeout(1800); pg.evaluate("document.body.classList.remove('preview-mode')")
    r=pg.evaluate("""async()=>{
      const o={};
      const sessao=(em)=>({data:{session:{user:{id:'u1',email:em}}}});
      const tabela=(tk)=>({select(){return this},insert(){return this},maybeSingle(){return Promise.resolve({data:tk?{token:tk}:null,error:null})},single(){return Promise.resolve({data:{token:'novo'},error:null})}});
      aClient.auth.getSession=()=>Promise.resolve(sessao('outro@x.com'));
      aClient.from=()=>tabela('tk1'); aAlunoRow={email:'outro@x.com'};
      await aPersonalVerificar(); o.outroEmail=getComputedStyle(document.getElementById('tBtnPersonal')).display;
      aClient.auth.getSession=()=>Promise.resolve(sessao('LGuilh3rme@gmail.com'));
      aAlunoRow={email:'LGuilh3rme@gmail.com'};
      aClient.from=()=>tabela(null);
      await aPersonalVerificar(); o.criaToken=getComputedStyle(document.getElementById('tBtnPersonal')).display+':'+aPersonalToken;
      aClient.from=()=>({select(){return this},maybeSingle(){return Promise.resolve({data:null,error:{message:'rls'}})}});
      await aPersonalVerificar(); o.erroRLS=getComputedStyle(document.getElementById('tBtnPersonal')).display;
      aClient.from=()=>tabela('tk1');
      await aPersonalVerificar(); o.liberado=getComputedStyle(document.getElementById('tBtnPersonal')).display;
      aVerPersonal();
      o.tela=document.getElementById('tPersonal').style.display+'/'+document.getElementById('tDashboard').style.display;
      o.src=(document.querySelector('#tPersonalConteudo iframe')||{}).src||'';
      aVoltarHoje(); o.voltou=document.getElementById('tPersonal').style.display+'/'+document.getElementById('tDashboard').style.display;
      return o;}""")
    ok=(r['outroEmail']=='none' and r['criaToken'].startswith('block') and r['erroRLS']=='none' and r['liberado']=='block' and r['tela']=='block/none' and 'personal/?personal=tk1' in r['src'] and r['voltou']=='none/block')
    print('OK' if ok else 'FAIL','Personal: libera só o e-mail do professor com token; some em outro e-mail/erro de RLS; abre e volta',r)
    m=pg.evaluate("""()=>{const d=document.getElementById('tDashboard'),f=document.getElementById('tFooter'),a=d.querySelector('.dash-actions');
      return {padDash:getComputedStyle(d).paddingBottom,gapAcoesRodape:Math.round(f.getBoundingClientRect().top-a.getBoundingClientRect().bottom),padFooter:getComputedStyle(f).paddingBottom,
        btnConcl:!!document.querySelector('.concl-btn'),conclW:document.querySelector('.concl-btn')?Math.round(document.querySelector('.concl-btn').getBoundingClientRect().width):0}}""")
    ok2=(m['padDash']=='6px' and m['gapAcoesRodape']<=24 and m['btnConcl'] and m['conclW']>300)
    print('OK' if ok2 else 'FAIL','Layout: sem espaço morto e botão concluir de largura total',m)
    pg.evaluate("document.body.classList.add('xo-bar')"); pg.wait_for_timeout(100)
    print('COM BARRA padFooter',pg.evaluate("getComputedStyle(document.getElementById('tFooter')).paddingBottom"))
    pg.evaluate("document.body.classList.remove('xo-bar');window.scrollTo(0,document.body.scrollHeight)"); pg.wait_for_timeout(300)
    print('OK' if not errs else 'FAIL','sem pageerror',errs[:2]); b.close()
