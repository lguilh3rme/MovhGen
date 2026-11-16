"""Gerador: Publicar rascunho com início no passado pede nova data. Uso: python3 tools/tests/publicar_data.py <index.html>"""
import sys
from playwright.sync_api import sync_playwright
STUB = open(__file__.replace('publicar_data.py','gpage.py'),encoding='utf-8').read().split('STUB="""')[1].split('"""')[0]
ok=0
def chk(c,m):
    global ok
    assert c,'FAIL '+m; ok+=1; print('OK',m[:40])
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    pg.goto('file://'+sys.argv[1]); pg.wait_for_timeout(1500)
    pg.evaluate("""()=>{ window.__calls=[]; window.__ini='2026-08-14';
      mbClient.from=((t)=>{const st={t,op:'select',payload:null,f:[]};const q={select(){return q},update(x){st.op='update';st.payload=x;return q},eq(k,v){st.f.push([k,v]);return q},in(k,v){st.f.push([k,v]);return q},
        maybeSingle(){return Promise.resolve({data:{data_inicio:window.__ini,conteudo:{semanas:[{duracaoSemanas:8}],fimPrevisto:'2026-10-08'}},error:null})},
        then(res,rej){window.__calls.push(st);return Promise.resolve({data:[],error:null}).then(res,rej)}};return q});
      window.confirm=()=>true; mbGerenciarProtocolos=()=>{}; mbCarregarPainelAlunos=()=>{}; }""")
    hoje=pg.evaluate("mbIsoLocal(new Date())")
    # 1) início no passado: pede data e grava início novo, sem fim manual antigo
    pg.evaluate("(h)=>{window.prompt=()=>h; window.__calls.length=0;}",hoje)
    r=pg.evaluate("mbReativarProtocolo('p1','a1')")
    up=pg.evaluate("window.__calls.filter(c=>c.op==='update'&&c.payload&&c.payload.ativo===true)")
    chk(r['ok'] and r['ini']==hoje and r['semFim'],'retorno '+str(r))
    chk(len(up)==1 and up[0]['payload']['data_inicio']==hoje and 'fimPrevisto' not in up[0]['payload']['conteudo'],'payload '+str(up))
    # 2) cancelar no prompt: nada é ativado
    pg.evaluate("()=>{window.prompt=()=>null; window.__calls.length=0;}")
    r=pg.evaluate("mbReativarProtocolo('p1','a1')")
    chk(r['ok'] is False and pg.evaluate("window.__calls.filter(c=>c.op==='update').length")==0,'cancelar')
    # 3) data inválida
    pg.evaluate("()=>{window.prompt=()=>'amanha'; window.__calls.length=0;}")
    r=pg.evaluate("mbReativarProtocolo('p1','a1')")
    chk(r['ok'] is False and pg.evaluate("window.__calls.filter(c=>c.op==='update').length")==0,'invalida')
    # 4) início já no futuro: não pergunta e não mexe na data
    pg.evaluate("()=>{window.__ini='2099-01-01'; window.prompt=()=>{throw new Error('nao deveria perguntar')}; window.__calls.length=0;}")
    r=pg.evaluate("mbReativarProtocolo('p1','a1')")
    up=pg.evaluate("window.__calls.filter(c=>c.op==='update'&&c.payload&&c.payload.ativo===true)")
    chk(r['ok'] and r['ini'] is None and len(up)==1 and 'data_inicio' not in up[0]['payload'],'futuro '+str(r))
    print('erros',errs[:2]); b.close(); sys.exit(1 if errs else 0)
