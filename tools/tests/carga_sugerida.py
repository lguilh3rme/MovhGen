"""App do aluno: carga sugerida (apagada) quando não há registro; fallback pelo histórico do próprio aluno no mesmo padrão. Uso: python3 tools/tests/carga_sugerida.py <app.html>  (5 OK)"""
import sys
from playwright.sync_api import sync_playwright
STUB=open(__file__.replace('carga_sugerida.py','app_header.py'),encoding='utf-8').read().split('STUB = """')[1].split('"""')[0]
ok=0; fail=0
def chk(n,c,x=''):
    global ok,fail
    if c: ok+=1; print('OK  ',n)
    else: fail+=1; print('FAIL',n,x)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':412,'height':900}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    pg.goto('file://'+sys.argv[1]+'?treino=abc123'); pg.wait_for_timeout(1500)
    r=pg.evaluate("""()=>{
      const pad=(Object.keys(typeof A_PADROES!=='undefined'?A_PADROES:{})[0])||null;
      const info=(typeof aPadraoInfo==='function')?null:null;
      aTestesFisicos=[]; aUltimaCargaPorExercicio={}; aBaselineCargaPorExercicio={};
      aExerciciosMeta={'Supino Reto':{nome:'Supino Reto',padrao_movimento:'push_h',percentual_rm:80},'Supino Inclinado Máquina':{nome:'Supino Inclinado Máquina',padrao_movimento:'push_h',percentual_rm:60}};
      const sem=aCargaSugerida('Supino Inclinado Máquina',null);
      aUltimaCargaPorExercicio={'Supino Reto':{exercicio_nome:'Supino Reto',carga:60,reps:10,criado_em:'2026-11-20'}};
      const com=aCargaSugerida('Supino Inclinado Máquina',null);
      const html=aRenderExercicios({id:'b',nome:'F',exercicios:[{nome:'Supino Inclinado Máquina',series:'3x10',rest:'60s'}]},null,'t',0,1,4);
      aUltimaCargaPorExercicio['Supino Inclinado Máquina']={exercicio_nome:'Supino Inclinado Máquina',carga:30,reps:10,criado_em:'2026-11-21'};
      const html2=aRenderExercicios({id:'b',nome:'F',exercicios:[{nome:'Supino Inclinado Máquina',series:'3x10',rest:'60s'}]},null,'t',0,1,4);
      return {sem:sem,com:com,html:html,html2:html2};}""")
    chk('sem histórico no padrão: sem sugestão',r['sem'] is None,r['sem'])
    chk('com Supino Reto 60kg×10: sugere pelo %RM (≈48kg)',r['com'] and r['com']['origem']=='historico_padrao' and abs(r['com']['valor']-48)<=1.5,r['com'])
    chk('sem registro: caixa mostra ≈ valor, apagada e rotulada "carga sugerida"','≈ '+str(r['com']['valor'])+'kg' in r['html'] and 'carga-sugerida' in r['html'] and 'carga sugerida' in r['html'])
    chk('com registro: volta ao normal (carga-registrada, sem ≈)','carga-registrada' in r['html2'] and 'carga-sugerida' not in r['html2'] and '≈' not in r['html2'])
    chk('sem erro de JS',not errs,errs)
print(f'OK={ok} FAIL={fail}'); sys.exit(1 if fail else 0)
