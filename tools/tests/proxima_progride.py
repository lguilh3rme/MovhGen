"""Gerador: Próxima fase progride (série/faixa, troca de variante pela escada) e Início reconhece rascunho. Uso: python3 tools/tests/proxima_progride.py <index.html>  (6 OK)"""
import sys, datetime as D
from playwright.sync_api import sync_playwright
STUB=open(__file__.replace('proxima_progride.py','gpage.py'),encoding='utf-8').read().split('STUB="""')[1].split('"""')[0]
t=D.date.today(); ini=(t-D.timedelta(days=40)).isoformat(); hoje=t.isoformat()
E=lambda n,s,r="1'":{'nome':n,'series':s,'rest':r}
SEM={'nome':'Base','fase':'base','dias':[{'nome':'Lower','blocos':[{'id':'pri','exercicios':[E('Leg Press','3×10-12',"2'"),E('Elevação Lateral','3×10-12')]}]},{'nome':'Pull','blocos':[{'id':'pri','exercicios':[E('Supino Maquina','3×10-12',"2'"),E('Rosca Direta','3×10-12')]}]}]}
JS="""([sem,ctx])=>{ const r=pfProgredir(JSON.parse(JSON.stringify(sem)),{fase:'base',nome:'Base'},ctx); return r; }"""
JS2="""([sem,ctx])=>{ const s=JSON.parse(JSON.stringify(sem)); const al=pfProgredir(s,{fase:'base',nome:'Base'},ctx); return {s:s,al:al}; }"""
H="""(args)=>{ const [ini,hoje,comRasc]=args; const a={id:'a1',nome:'Iasmim Santos',ativo:true,protocoloAtivo:{id:'p0',data_inicio:ini,conteudo:{semanas:[{nome:'Base',duracaoSemanas:6,dias:[]}]}},protosInativos:comRasc?[{id:'r1',nome:'Treino v2 (rascunho)',data_inicio:hoje}]:[],registrosCarga:[],rpeMes:[]}; return homeVencerHTML([a]); }"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    pg.goto('file://'+sys.argv[1]); pg.wait_for_timeout(1200)
    R=pg.evaluate(JS2,[SEM,{'dor':False,'ader':90,'sobe':[],'joelho':False}]); s=R['s']
    ex=s['dias'][0]['blocos'][0]['exercicios']
    assert s['nome']=='Construção' and s['fase']=='construcao' and s['duracaoSemanas']==8,s['nome']; print('OK base -> Construção 8 sem')
    assert ex[0].get('_troca')=='Leg Press' and ex[0]['nome']!='Leg Press' and ex[0]['series']=='4×8-10',ex[0]; print('OK principal: +1 série, faixa 8-10 e troca de variante pela escada')
    assert ex[1]['series']=='3×12-15',ex[1]; print('OK acessório sobe reps (12-15)')
    assert s['dias'][1]['blocos'][0]['exercicios'][0].get('_troca')=='Supino Maquina'; print('OK 1 troca por dia em outro padrão')
    R2=pg.evaluate(JS2,[SEM,{'dor':True,'ader':90,'sobe':[],'joelho':False}])['s']
    assert not any(e.get('_troca') for d in R2['dias'] for b in d['blocos'] for e in b['exercicios']) and R2['dias'][0]['blocos'][0]['exercicios'][0]['series']=='4×8-10'; print('OK com dor: progride a carga/reps mas não troca variante')
    h1=pg.evaluate(H,[ini,hoje,True]); h0=pg.evaluate(H,[ini,hoje,False])
    assert 'Revisar rascunho' in h1 and 'Próxima fase</button>' not in h1 and '✨ Próxima fase' in h0,(h1[:200],h0[:200]); print('OK Início: com rascunho mostra Revisar rascunho; sem, Próxima fase')
    assert not errs,errs[:2]
