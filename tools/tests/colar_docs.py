"""Colar treino com a tabela do Google Docs (cabeçalho SEG–SEX separado, 'Sequência de', quebra suave, carga entre parênteses). Uso: python3 tools/tests/colar_docs.py <index.html>"""
import sys
from playwright.sync_api import sync_playwright
HERE = __file__.rsplit('/',1)[0]
STUB = open(HERE+'/gpage.py',encoding='utf-8').read().split('STUB="""')[1].split('"""')[0]
T = open(HERE+'/fixtures/docs_musculacao.txt',encoding='utf-8').read()
F=[]
def ok(c,m):
    print(('OK ' if c else 'FAIL ')+m)
    if not c: F.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1100,'height':700}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    pg.goto('file://'+sys.argv[1]); pg.wait_for_timeout(1500)
    i=T.index('Semana 2')
    r=pg.evaluate("""([a,c])=>{window.notify=()=>{};
      const f=t=>mbParsearTreinoTexto(t).map(d=>({dia:d.diaSemana,obs:d.blocos.map(b=>b.obs||'').join('|'),exs:d.blocos.flatMap(b=>(b.exercicios||[]).map(e=>({n:e.nome,s:e.series,o:e.obs})))}));
      return {s1:f(a),s2:f(c)};}""",[T[:i],T[i:]])
    s1,s2=r['s1'],r['s2']
    ok([d['dia'] for d in s1]==['Segunda','Terça','Quarta','Quinta','Sexta'],'semana 1: 5 dias na ordem SEG–SEX')
    ok(all(len(d['exs'])>=3 for d in s1),'semana 1: nenhum dia vazio (antes tudo caía na Sexta): '+str([len(d['exs']) for d in s1]))
    ok(s1[0]['exs'][0]['n']=='Supino Inclinado' and s1[0]['exs'][0]['s']=='3×8 a 10','semana 1 segunda começa em Supino Inclinado 3×8 a 10')
    ok(s1[1]['exs'][0]['n']=='Agachamento' and s1[3]['exs'][0]['n']=='Terra','semana 1 terça=Agachamento, quinta=Terra')
    ok(not any(e['n'].lower().startswith('sequência') for d in s1+s2 for e in d['exs']),'"Sequência de" não vira exercício')
    ok([d['dia'] for d in s2]==['Segunda','Terça','Quarta','Quinta','Sexta'],'semana 2: 5 dias')
    h=s2[0]['exs'][0]
    ok(h['n']=='Hip Thrust Maq' and h['s']=='5×6 a 8' and 'Hip Thrust Maq: (60–80 kg)' in s2[0]['obs'],'nome numa linha e spec na outra juntam; carga fica na observação do bloco: '+str((h,s2[0]['obs'][:80])))
    q=s2[2]['exs']
    ok(q[0]['n']=='Back Squat' and q[0]['s']=='5×5' and q[0]['o']=='40–60 kg' and len(q)==5,'semana 2 quarta: Back Squat 5×5 (40–60 kg), 5 exercícios: '+str(q[0]))
    ok(not errs,'sem pageerror '+str(errs[:2])); b.close()
print('FALHAS:',len(F)); sys.exit(1 if F else 0)
