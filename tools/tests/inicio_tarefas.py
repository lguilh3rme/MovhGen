"""v69.0: Início como lista de tarefas (Treinos em cima, Pagamentos e vencimentos abaixo).
Uso: python3 tools/tests/inicio_tarefas.py $PWD/index.html"""
import sys
from playwright.sync_api import sync_playwright
STUB = open(__file__.replace('inicio_tarefas.py','quadro_geral.py'), encoding='utf-8').read().split('STUB = ')[1].split('R = []')[0]
ns = {}; exec('STUB = ' + STUB, ns); STUB = ns['STUB']
R = []
def ck(n, c): R.append((n, bool(c))); print(('OK   ' if c else 'FAIL ') + n)
JS = """()=>{
 mbProfessor={id:'p1',nome:'Teste'};
 const d=new Date();d.setDate(d.getDate()+30);const fut=d.toISOString().slice(0,10);
 const ini=new Date();ini.setDate(ini.getDate()-60);const ini1=ini.toISOString().slice(0,10);
 const rasc=new Date();rasc.setDate(rasc.getDate()-1);
 const mk=(id,nome,x)=>Object.assign({id:id,nome:nome,ativo:true,protosInativos:[]},x||{});
 mbPainelAlunos=[
  mk('a1','Marcos Silva',{pixPendente:{valor:180},acesso_fim:fut,protocoloAtivo:{data_inicio:ini1,_conteudo:{semanas:[{duracaoSemanas:20}]}}}),
  mk('a2','Paulo Lima',{acesso_fim:'2020-01-01',protocoloAtivo:{data_inicio:ini1,_conteudo:{semanas:[{duracaoSemanas:20}]}}}),
  mk('a3','Izabella Souza',{protocoloAtivo:{data_inicio:ini1,_conteudo:{semanas:[{duracaoSemanas:20}]}},protosInativos:[{id:'r1',data_inicio:rasc.toISOString().slice(0,10),ativar_em:'2026-11-30'}]}),
  mk('a4','Enes Costa',{protocoloAtivo:{data_inicio:ini1,_conteudo:{semanas:[{duracaoSemanas:20}]}}}),
  mk('a5','Natan Lima',{alertaDor:{ultimo:{},total:1},protocoloAtivo:{data_inicio:ini1,_conteudo:{semanas:[{duracaoSemanas:20}]}}})
 ];
 homeVivo=true;homeRender();
 return document.getElementById('home-grid').innerText;
}"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 900}); pg.set_default_timeout(15000)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*supabase-js*', lambda r: r.fulfill(body=STUB, content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    pg.goto('file://' + sys.argv[1]); pg.wait_for_timeout(1200)
    t = pg.evaluate(JS)
    ck('sem erro de JS', not errs)
    ck('card Tarefas de hoje', 'Tarefas de hoje' in t)
    ck('Treinos vem antes de Pagamentos', 0 <= t.find('Treinos') < t.find('Pagamentos e vencimentos'))
    ck('rascunho agendado listado em Treinos', 'Izabella' in t and 'ativa em 30/11' in t)
    ck('Pix a confirmar em Pagamentos', t.find('Pagamentos e vencimentos') < t.find('Marcos'))
    ck('acesso vencido em Pagamentos', t.find('Pagamentos e vencimentos') < t.find('Paulo'))
    ck('dor tem botão Visto', 'Natan' in t and 'Visto' in t)
    ck('aviso de alunos sem data de acesso', 'sem data de acesso' in t)
    ck('Demandas/Vencimentos antigos removidos', 'Demandas' not in t and 'Vencimentos e atenção' not in t)
    n = sum(1 for _, c in R if c); f = len(R) - n; print('OK=%d FAIL=%d' % (n, f)); sys.exit(1 if f else 0)
