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
      const hj=aColetivasDateKey(new Date()); const ont=new Date(); ont.setDate(ont.getDate()-1); const ok_=aColetivasDateKey(ont);
      const chamadas=[]; window.__chamadas=chamadas;
      const dados={}; dados[hj]=[{id:'b1',nome:'Peito',exercicios:[{nome:'Supino reto',series:'3',reps:'10'}]}];
      aClient.rpc=(fn,args)=>{chamadas.push([fn,args]);
        if(fn==='get_personal_painel')return Promise.resolve({data:{alunos:[{id:'a1',nome:'Ana',dados:dados},{id:'a2',nome:'Beto',dados:{}}]},error:null});
        if(fn==='get_personal_registros')return Promise.resolve({data:[{data:ok_,chave:'b1|supino reto',exercicio:'Supino reto',carga:'40kg',obs:'ok',feito:true}],error:null});
        if(fn==='salvar_personal_registro')return Promise.resolve({data:true,error:null});
        return Promise.resolve({data:null,error:null});};
      aPerSemana=null; aPerDia=null; aVerPersonal(); await new Promise(r=>setTimeout(r,400));
      const box=document.getElementById('tPersonalConteudo');
      o.tela=document.getElementById('tPersonal').style.display+'/'+document.getElementById('tDashboard').style.display;
      o.visual=box.querySelectorAll('.semana-strip-dia').length+':'+box.querySelectorAll('.bloco').length+':'+box.querySelectorAll('select.pr-sel option').length;
      o.ultima=(box.querySelector('.pr-last')||{}).textContent||'';
      o.semIframe=!box.querySelector('iframe');
      const inp=box.querySelector('.pr-carga'); inp.value='50'; inp.dispatchEvent(new Event('change',{bubbles:true}));
      await new Promise(r=>setTimeout(r,200));
      const sv=chamadas.filter(c=>c[0]==='salvar_personal_registro').pop();
      o.salvou=!!sv&&sv[1].p_token==='tk1'&&sv[1].p_aluno==='a1'&&sv[1].p_chave==='b1|supino reto'&&sv[1].p_carga==='50'&&sv[1].p_data===hj&&sv[1].p_feito===false;
      o.status=box.querySelector('.pr-st').textContent;
      box.querySelector('.pr-obsb').click(); o.obsAbre=box.querySelector('.pr-obs').style.display;
      const ck=box.querySelector('.pr-ck'); ck.checked=true; ck.dispatchEvent(new Event('change',{bubbles:true})); await new Promise(r=>setTimeout(r,200));
      const sv2=chamadas.filter(c=>c[0]==='salvar_personal_registro').pop(); o.feito=sv2[1].p_feito===true&&sv2[1].p_carga==='50';
      await aPerTrocarAluno('a2'); o.outro=document.getElementById('tPersonalConteudo').textContent.indexOf('Sem treino neste dia')>=0;
      aVoltarHoje(); o.voltou=document.getElementById('tPersonal').style.display+'/'+document.getElementById('tDashboard').style.display;
      return o;}""")
    ok=(r['outroEmail']=='none' and r['criaToken'].startswith('block') and r['erroRLS']=='none' and r['liberado']=='block' and r['tela']=='block/none' and r['visual']=='7:1:2' and 'Última: 40kg' in r['ultima'] and r['semIframe'] and r['salvou'] and r['status']=='✓' and r['obsAbre']=='block' and r['feito'] and r['outro'] and r['voltou']=='none/block')
    print('OK' if ok else 'FAIL','Personal: libera só o professor; visual das coletivas (7 dias, bloco, aluno); Última carga; salva carga/obs/feito nas RPCs; troca de aluno; volta',r)
    m=pg.evaluate("""()=>{const d=document.getElementById('tDashboard'),f=document.getElementById('tFooter'),a=d.querySelector('.dash-actions');
      return {padDash:getComputedStyle(d).paddingBottom,gapAcoesRodape:Math.round(f.getBoundingClientRect().top-a.getBoundingClientRect().bottom),padFooter:getComputedStyle(f).paddingBottom,
        btnConcl:!!document.querySelector('.concl-btn'),conclW:document.querySelector('.concl-btn')?Math.round(document.querySelector('.concl-btn').getBoundingClientRect().width):0}}""")
    ok2=(m['padDash']=='6px' and m['gapAcoesRodape']<=24 and m['btnConcl'] and m['conclW']>300)
    print('OK' if ok2 else 'FAIL','Layout: sem espaço morto e botão concluir de largura total',m)
    pg.evaluate("document.body.classList.add('xo-bar')"); pg.wait_for_timeout(100)
    print('COM BARRA padFooter',pg.evaluate("getComputedStyle(document.getElementById('tFooter')).paddingBottom"))
    pg.evaluate("document.body.classList.remove('xo-bar');window.scrollTo(0,document.body.scrollHeight)"); pg.wait_for_timeout(300)
    print('OK' if not errs else 'FAIL','sem pageerror',errs[:2]); b.close()
