"""App do aluno: carga padrao por sexo (4o degrau da sugestao). Uso: python3 tools/tests/carga_padrao.py <app.html>  (9 OK)"""
import sys
from playwright.sync_api import sync_playwright
STUB=open(__file__.replace('carga_padrao.py','app_header.py'),encoding='utf-8').read().split('STUB = """')[1].split('"""')[0]
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
      aTestesFisicos=[]; aUltimaCargaPorExercicio={}; aBaselineCargaPorExercicio={}; aExerciciosMeta={};
      aCargaPadrao={'Hip Thrust':{m:60,f:40,u:'kg',n:'total com barra'},'Cobra':{m:8,f:8,u:'pc',n:''},'Prancha':{m:30,f:20,u:'s',n:''},'Rosca Martelo':{m:8,f:4,u:'mao',n:'por mão'}};
      const R=(nm,reg)=>aRenderExercicios({id:'b',nome:'F',exercicios:[{nome:nm,series:'3x10',rest:'60s',reg:reg}]},null,'t',0,1,4);
      const o={};
      aSexoAluno=null; o.semSexo=aCargaSugerida('Hip Thrust',null);
      aSexoAluno='f'; o.f=aCargaSugerida('Hip Thrust',null); o.htmlF=R('Hip Thrust'); o.mao=aCargaSugerida('Rosca Martelo',null);
      aSexoAluno='m'; o.m=aCargaSugerida('Hip Thrust',null);
      aSexoAluno='f'; o.cobra=aCargaSugerida('Cobra',null); o.htmlCobra=R('Cobra'); o.htmlPran=R('Prancha','tempo');
      aUltimaCargaPorExercicio={'Hip Thrust':{exercicio_nome:'Hip Thrust',carga:55,reps:10,criado_em:'2026-11-20'}}; o.htmlReg=R('Hip Thrust');
      aUltimaCargaPorExercicio={'Supino Reto':{exercicio_nome:'Supino Reto',carga:60,reps:10,criado_em:'2026-11-20'}};
      aExerciciosMeta={'Supino Reto':{nome:'Supino Reto',padrao_movimento:'push_h',percentual_rm:80},'Hip Thrust':{nome:'Hip Thrust',padrao_movimento:'push_h',percentual_rm:60}};
      o.hist=aCargaSugerida('Hip Thrust',null);
      return o;}""")
    chk('sem sexo na anamnese: sem sugestao padrao',r['semSexo'] is None,r['semSexo'])
    chk('mulher: Hip Thrust 40 kg (padrao_sexo)',r['f'] and r['f']['origem']=='padrao_sexo' and r['f']['valor']==40,r['f'])
    chk('homem: Hip Thrust 60 kg',r['m'] and r['m']['valor']==60,r['m'])
    chk('caixa sem registro: "≈ 40kg" apagada (carga-sugerida)','≈ 40kg' in r['htmlF'] and 'carga-sugerida' in r['htmlF'],r['htmlF'][:200])
    chk('peso do corpo (Cobra): sem kg, mostra "peso do corpo"',r['cobra'] is None and 'peso do corpo' in r['htmlCobra'] and '≈' not in r['htmlCobra'])
    chk('tempo (Prancha F): "≈ 20s" apagado','≈ 20s' in r['htmlPran'] and 'carga-sugerida' in r['htmlPran'])
    chk('com registro: carga registrada vence (sem ≈, sem chip de sugestao)','carga-registrada' in r['htmlReg'] and '≈' not in r['htmlReg'] and 'ec-chip-sug' not in r['htmlReg'])
    chk('historico no padrao vence o padrao por sexo',r['hist'] and r['hist']['origem']=='historico_padrao',r['hist'])
    chk('sem erro de JS',not errs,errs)
print(f'OK={ok} FAIL={fail}'); sys.exit(1 if fail else 0)
