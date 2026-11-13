"""Gerador: card do aluno com rodapé em seções. Uso: python3 tools/tests/card_aluno.py <index.html> [print.png]"""
import sys
from playwright.sync_api import sync_playwright
STUB = open(__file__.replace('card_aluno.py','gpage.py'),encoding='utf-8').read().split('STUB="""')[1].split('"""')[0]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1200,'height':800}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*supabase-js*',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    pg.goto('file://'+sys.argv[1]); pg.wait_for_timeout(1500)
    r=pg.evaluate("""()=>{ try{ nav('alunos'); }catch(e){}
      mbPainelAlunos=[{id:'a1',nome:'LGuilh3rme',email:'x@y.com',ativo:true,avaliacoes:[{id:'v1',status:'confirmada'}],registrosCarga:[],anamnese:null,mostra_aulas_coletivas:true,protocolos:[],cobranca:null}];
      try{ renderPainelAlunos(); }catch(e){ return 'ERR '+e.message; }
      const row=document.querySelector('.aluno-row'); if(!row) return 'sem card'; row.classList.add('al-open'); const o=document.createElement('div'); o.id='ov'; o.style.cssText='position:fixed;left:210px;top:60px;width:950px;z-index:9999;background:#0b0b0d'; o.appendChild(row.cloneNode(true)); document.body.appendChild(o);
      return [...row.querySelectorAll('.al-rodape > div')].map(d=>d.firstElementChild.textContent.trim()).join('|'); }""")
    print(r); pg.wait_for_timeout(300)
    if len(sys.argv)>2:
        e=pg.query_selector('#ov')
        pg.screenshot(path=sys.argv[2], clip=e.bounding_box() and {**e.bounding_box(),'height':max(e.bounding_box()['height'],10)} or None) if e and e.bounding_box() else pg.screenshot(path=sys.argv[2])
    print('erros',errs[:2]); b.close()
