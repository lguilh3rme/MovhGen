"""Gerador: regra dos mesociclos (alteração em N reflete nos próximos, nunca nos anteriores). Uso: python3 tools/tests/meso_espelho.py <index.html>"""
import sys,json
from playwright.sync_api import sync_playwright
STUB = open(__file__.replace('meso_espelho.py','gpage.py'),encoding='utf-8').read().split('STUB="""')[1].split('"""')[0]
ok=0
def chk(c,m):
    global ok
    assert c,'FAIL '+m; ok+=1; print('OK',m[:70])
def meso(i,exs,extra=None):
    return {'id':'m%d'%i,'nome':'Fase %d'%i,'dias':[{'id':'m%dd1'%i,'nome':'Segunda','blocos':[{'id':'pri','nome':'Principal','meta':'RIR 2','exercicios':exs}]}]}
def ex(n,s,u='u_'+'x'): return {'nome':n,'url':'url_'+n,'series':s,'rest':"2'",'obs':''}
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    pg.goto('file://'+sys.argv[1]); pg.wait_for_timeout(1500)
    base=[meso(0,[ex('Agachamento','3x8'),ex('Supino','3x8')]),meso(1,[ex('Agachamento','4x8'),ex('Supino','4x8')]),meso(2,[ex('Agachamento','4x6'),ex('Supino','4x6')])]
    pg.evaluate("(b)=>{semanas=JSON.parse(JSON.stringify(b));_pbBase=JSON.stringify({s:b});}",base)
    # 1) troca de exercício no mesociclo 1 (índice 1): vai pro 2, NÃO pro 0; séries de cada um ficam
    r=pg.evaluate("()=>{const e=semanas[1].dias[0].blocos[0].exercicios[0];e.nome='Leg Press';e.url='url_Leg Press';return mesoEspelhar();}")
    s=pg.evaluate("semanas")
    n=lambda i,k:s[i]['dias'][0]['blocos'][0]['exercicios'][k]
    chk(n(2,0)['nome']=='Leg Press' and n(2,0)['url']=='url_Leg Press','troca no meso 2 espelhada no meso 3 (nome+url)')
    chk(n(0,0)['nome']=='Agachamento','meso anterior NÃO muda')
    chk(n(2,0)['series']=='4x6','séries da progressão do meso seguinte mantidas')
    chk(r['n']>=1 and r['ids']==['m2'],'retorno lista só o seguinte: %s'%r)
    # 2) seguinte já editado na sessão: não sobrescreve
    pg.evaluate("(b)=>{semanas=JSON.parse(JSON.stringify(b));_pbBase=JSON.stringify({s:b});}",base)
    pg.evaluate("()=>{semanas[1].dias[0].blocos[0].exercicios[0].nome='Leg Press';semanas[2].dias[0].blocos[0].exercicios[0].nome='Hack';mesoEspelhar();}")
    s=pg.evaluate("semanas")
    chk(n(2,0)['nome']=='Hack','seguinte editado pelo dono nesta sessão não é sobrescrito')
    # 3) seguinte que já divergia (exercício diferente no snapshot): não toca
    b2=json.loads(json.dumps(base)); b2[2]['dias'][0]['blocos'][0]['exercicios'][0]['nome']='Afundo'
    pg.evaluate("(b)=>{semanas=JSON.parse(JSON.stringify(b));_pbBase=JSON.stringify({s:b});}",b2)
    pg.evaluate("()=>{semanas[1].dias[0].blocos[0].exercicios[0].nome='Leg Press';mesoEspelhar();}")
    s=pg.evaluate("semanas")
    chk(n(2,0)['nome']=='Afundo','seguinte que já divergia do original fica como está')
    # 4) mudança de séries/descanso/meta no meso 0 vai para os iguais antes; série diferente (progressão) fica
    pg.evaluate("(b)=>{semanas=JSON.parse(JSON.stringify(b));_pbBase=JSON.stringify({s:b});}",base)
    pg.evaluate("()=>{const bl=semanas[0].dias[0].blocos[0];bl.meta='RIR 1';bl.exercicios[1].rest=\"3'\";bl.exercicios[1].series='5x5';mesoEspelhar();}")
    s=pg.evaluate("semanas")
    chk(s[1]['dias'][0]['blocos'][0]['meta']=='RIR 1' and s[2]['dias'][0]['blocos'][0]['meta']=='RIR 1','meta do bloco espelhada nos seguintes')
    chk(n(1,1)['rest']=="3'" and n(2,1)['rest']=="3'",'descanso espelhado')
    chk(n(1,1)['series']=='4x8' and n(2,1)['series']=='4x6','séries diferentes (progressão) não são sobrescritas')
    # 5) lista com tamanho diferente: copia lista inteira só se igual antes
    b3=[meso(0,[ex('A','3x8'),ex('B','3x8')]),meso(1,[ex('A','3x8'),ex('B','3x8')]),meso(2,[ex('A','3x8'),ex('B','3x8')])]
    pg.evaluate("(b)=>{semanas=JSON.parse(JSON.stringify(b));_pbBase=JSON.stringify({s:b});}",b3)
    pg.evaluate("()=>{semanas[0].dias[0].blocos[0].exercicios.push({nome:'C',url:'',series:'3x10',rest:'1',obs:''});mesoEspelhar();}")
    s=pg.evaluate("semanas")
    chk(len(s[1]['dias'][0]['blocos'][0]['exercicios'])==3 and len(s[2]['dias'][0]['blocos'][0]['exercicios'])==3,'exercício adicionado em meso com lista igual antes vai para os seguintes')
    # 6) sem alteração / sem base: nada
    pg.evaluate("(b)=>{semanas=JSON.parse(JSON.stringify(b));_pbBase=JSON.stringify({s:b});}",base)
    chk(pg.evaluate("mesoEspelhar().n")==0,'sem alteração: 0')
    pg.evaluate("()=>{_pbBase='';semanas[0].dias[0].blocos[0].meta='X';}")
    chk(pg.evaluate("mesoEspelhar().n")==0,'sem snapshot: não faz nada')
    print('erros',errs[:2]); b.close(); sys.exit(1 if errs else 0)
