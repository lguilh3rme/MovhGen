"""App do aluno: badge de fase na linha da Divisão (cabeçalho), sem a linha de descrição da fase; toque abre os detalhes.
Uso: python3 tools/tests/app_header.py <app.html>"""
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
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':412,'height':900}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    pg.add_init_script("window.__FAIL=false")
    pg.goto('file://'+sys.argv[1]+'?treino=abc123'); pg.wait_for_timeout(1800)
    r=pg.evaluate("""()=>{const o={};
      const d=document.getElementById('tProtoDiv'); d.textContent='Divisão 5x/semana'; d.style.display='block';
      aSemanasAtual.forEach(x=>{x.fase='deload'; x.nome='Deload'; (x.dias||[]).forEach(y=>{y.sub='Lower posterior + Pull — força real';});});
      const html=aMontarDashboardHoje(aSemanasAtual,aAgendaAtual);
      document.getElementById('tDashConteudo').innerHTML=html;
      o.semDescricao=html.indexOf('dash-semfase')<0 && html.indexOf('força real</div>')<0;
      o.semLinhaBadgesNoDash=html.indexOf('dash-badges-row')<0;
      const slot=document.getElementById('tFaseBadgeSlot'); const bd=slot.querySelector('.fase-badge');
      o.badgeNoCabecalho=!!bd;
      const a=d.getBoundingClientRect(), c=bd?bd.getBoundingClientRect():{top:999,left:0};
      o.mesmaLinha=Math.abs((a.top+a.height/2)-(c.top+c.height/2))<14;
      o.aDireita=bd?c.left>a.left:false;
      const card=document.getElementById(bd.dataset.tgt); o.cardFechado=!!card&&card.style.display==='none';
      bd.click(); o.abre=card.style.display!=='none'; bd.click(); o.fecha=card.style.display==='none';
      return o;}""")
    ok=all(r.values())
    print('OK' if ok else 'FAIL','Cabeçalho: badge de fase na linha da divisão, sem descrição, abre/fecha detalhes',r)
    print('OK' if not errs else 'FAIL','sem pageerror',errs[:2]); b.close()
