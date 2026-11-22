"""App do aluno: anamnese v2 (chips, validação, máscara WhatsApp, payload 1:1). Uso: python3 tools/tests/anamnese_v2.py <app.html exportado> [pasta_prints]  (9 OK)"""
import sys, os
from playwright.sync_api import sync_playwright
STUB=open(__file__.replace('anamnese_v2.py','t.py'),encoding='utf-8').read().split('STUB = """')[1].split('"""')[0]
out=sys.argv[2] if len(sys.argv)>2 else None
def val(pg,n): return pg.evaluate("n=>document.querySelector('#anamneseScreen [name=\"'+n+'\"]').value",n)
def chip(pg,n,v): pg.click('#anamneseScreen .av-chip[data-n="%s"][data-v="%s"]'%(n,v))
def shot(pg,nome):
    if out: os.makedirs(out,exist_ok=True); pg.screenshot(path=os.path.join(out,nome),full_page=True)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2); pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    pg.goto('file://'+sys.argv[1]); pg.wait_for_timeout(1500)
    pg.evaluate("""()=>{aAlunoRow={id:'a1',nome:'Ana Souza',professor_id:'p1'}; window.__ins=null; window.aBoot=function(){};
      aClient.from=function(t){return {insert:function(o){window.__ins={t:t,o:o};return Promise.resolve({error:null})}}}; aShowAnamnese();}""")
    nx=lambda: pg.evaluate("document.getElementById('anam-next').disabled")
    assert nx() is True and pg.is_hidden('#av-nome-w'); print('OK passo1 bloqueado sem WhatsApp; nome do cadastro nao e pedido de novo')
    pg.fill('#anamneseScreen input[name=whatsapp]','27999991234'); pg.dispatch_event('#anamneseScreen input[name=whatsapp]','input')
    assert val(pg,'whatsapp')=='(27) 99999-1234' and nx() is False; print('OK mascara WhatsApp e libera Continuar')
    chip(pg,'sexo','feminino'); shot(pg,'real-1.png'); pg.click('#anam-next')
    assert pg.is_visible('#anam-step-2') and 'Passo 2 de 3' in pg.inner_text('#anam-progress') and nx() is True; print('OK passo2 bloqueado ate objetivo+experiencia+dias')
    chip(pg,'objetivo','hipertrofia'); chip(pg,'tempo_treino','intermediario'); assert nx() is True
    chip(pg,'dias_semana','4'); assert nx() is False; print('OK passo2 libera com os 3 obrigatorios')
    chip(pg,'duracao_sessao','60'); chip(pg,'pratica_corrida','sim')
    assert pg.is_visible('#fld-nivel-corrida'); chip(pg,'nivel_corrida','iniciante'); pg.fill('#anamneseScreen input[name=corrida_km]','5')
    chip(pg,'pratica_corrida','nao'); assert pg.is_hidden('#fld-nivel-corrida') and val(pg,'nivel_corrida')=='' and val(pg,'corrida_km')==''; print('OK corrida: Nao esconde e limpa nivel/km')
    chip(pg,'pratica_corrida','sim'); chip(pg,'nivel_corrida','intermediario'); shot(pg,'real-2.png'); pg.click('#anam-next')
    assert pg.is_visible('#anam-submit') and pg.is_hidden('#anam-next'); print('OK passo3 mostra Concluir')
    chip(pg,'dor_regioes','Joelho'); chip(pg,'dor_regioes','Lombar'); chip(pg,'dor_regioes','Nenhuma')
    assert val(pg,'dor_regioes')=='Nenhuma'; chip(pg,'dor_regioes','Joelho'); chip(pg,'dor_regioes','Lombar')
    assert val(pg,'dor_regioes')=='Joelho,Lombar'; print('OK dor multipla; Nenhuma e exclusiva')
    pg.fill('#anamneseScreen textarea[name=condicoes_saude]','operado em 2023'); shot(pg,'real-3.png')
    pg.click('#anam-submit'); pg.wait_for_timeout(300)
    ins=pg.evaluate('window.__ins'); r=ins['o']['respostas']
    assert ins['t']=='anamneses' and ins['o']['aluno_id']=='a1' and ins['o']['tipo']=='anamnese'
    assert r['nome']=='Ana Souza' and r['whatsapp']=='(27) 99999-1234' and r['objetivo']=='hipertrofia' and r['tempo_treino']=='intermediario' and r['dias_semana']=='4' and r['duracao_sessao']=='60' and r['pratica_corrida']=='sim' and r['nivel_corrida']=='intermediario' and r['sexo']=='feminino'; print('OK payload com os mesmos campos/valores de antes')
    assert r['condicoes_saude']=='Joelho, Lombar. operado em 2023' and 'dor_regioes' not in r; print('OK dor vira texto em condicoes_saude (alertas do Gerador)')
    assert not errs,errs[:2]; b.close()
