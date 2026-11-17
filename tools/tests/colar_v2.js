// Teste do colar v2 (estilo Docs do dono): node tools/tests/colar_v2.js index.html
const fs=require('fs');
const s=fs.readFileSync(process.argv[2]||'index.html','utf8');
const a=s.indexOf('const DEFAULT_REP'),b=s.indexOf('const DEFAULT_PRESETS');
const c=s.indexOf('function colSplitSR'),e0=s.indexOf('const COL_RE_DIA'),e1=s.indexOf('// Cadastrar no banco um exerc');
const mv0=s.indexOf('const COLETIVAS_DOW_ABREV'),mv1=s.indexOf('function mvEhPausa');
const col=s.slice(e0,e1);
const code=s.slice(a,b)+'let REP=JSON.parse(JSON.stringify(DEFAULT_REP));\n'
 +'const store={};const localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v;}};\n'
 +'function escAttr(x){return String(x==null?"":x);}\n'
 +s.slice(s.indexOf('function colRepsA'),s.indexOf('function colRepsA')+400).split('\n')[0]+'\n'
 +'function coletivasNovoBloco(){return {id:"b",tipo:"normal",nome:"",conjugado:false,series:"",exercicios:[{nome:"",series:"",reps:""}],formato:"",materiais:"",detalhes:""};}\n'
 +s.slice(mv0,mv1)+'function mvEhPausa(n){return /^(rest|descanso|pausa)$/.test(mvKey(n));}\n'
 +col.replace(/function coletivasPreviewColar[\s\S]*?\n}\n/,'');
const ctx={};new Function('ctx',code+';Object.assign(ctx,{coletivasParsearTexto,colDia,colDiaT,mvAcharEx,mvSugerir,mvAliasSalvar,colSecao,colPadraoDia,colAvisoFoco,addREP:function(a){REP.__t=a;_mvIdx=null;},getStats:()=>_colStats});')(ctx);
let ok=0,bad=0;const t=(n,c)=>{if(c){ok++;console.log('OK  ',n);}else{bad++;console.log('FAIL',n);}};
// dias (com e sem hífen, emoji, data)
t('SEG - Inf. Post🦵',ctx.colDia('SEG - Inf. Post🦵')===0);
t('QUI Superiores💪 (sem hífen)',ctx.colDia('QUI Superiores💪')===3);
t('SEX Inf. Post🦵 (sem hífen)',ctx.colDia('SEX Inf. Post🦵')===4);
t('QUA - 🦵Inf. Ant',ctx.colDia('QUA - 🦵Inf. Ant')===2);
t('Quinta 19/11 sem título',ctx.colDiaT('Quinta 19/11').titulo==='');
t('exercício "Terra 4x 10 a 8" não é dia',ctx.colDia('Terra 4x 10 a 8')==null);
t('"Seg 3x10" não é dia',ctx.colDia('Seg 3x10')==null);
t('título do dia = foco',ctx.colDiaT('QUI Superiores💪').titulo==='Superiores💪');
// seções
t('Sequência de Ativação',ctx.colSecao('Sequência de Ativação')&&ctx.colSecao('Sequência de Ativação').sec.nome==='Ativação');
t('Metabólico 🔥',ctx.colSecao('Metabólico 🔥')&&ctx.colSecao('Metabólico 🔥').sec.nome==='Metabólico');
t('Fortalecimento é seção',!!ctx.colSecao('Fortalecimento'));
t('Core ou Cardio = bloco único',(r=>r&&r.sec.tipo==='condicionamento'&&/Core ou Cardio/.test(r.sec.nome))(ctx.colSecao('Core ou Cardio')));
t('exercício comum não vira seção',ctx.colSecao('Supino Inclinado 3x 8 a 10')==null);
// semana do dono (formato vertical)
const txt=`Semana 1
SEG - Inf. Post🦵
Sequência de Ativação
Força
Supino Inclinado 3x 8 a 10
Voador ou crucifixo 3x 8 a 10
Desenvolvimento 3x 8 a 10
Elevação lateral 3x 8 a 10
triceps frances 3x 8 a 10
triceps coice 3x 8 a 10
Core ou Cardio
Circuito: 15
ou
5-10 minutos ergometro
TER - Superiores💪
Sequência de Ativação
Força
Agachamento 4x 10 a 8
Split Squat 4x 10 a 8
Extensão de joelho 4x 10 a 8
Metabólico 🔥
-Aquecimento
6 minutos bike ou eliptico
2 lento 3 forte 1 desacelerando
-Depois
1x6..thruster/remador/lunge alt/kbswing com remo 15/20 cal
-Por fim..
3x20 a 15 for time da mesma série
QUI Superiores💪
Sequência de Ativação
Força
Terra 4x 10 a 8
Flexora 4x 10 a 8
Elevação pélvica 4x 10 a 8
SEX Inf. Post🦵
Sequência de Ativação
Força
Mergulho 3x 10 a 8
Supino DB 3x 8 a 10
Arnold 3x 8 a 10
Core`;
const r=ctx.coletivasParsearTexto(txt);
t('4 dias reconhecidos (inclui QUI e SEX sem hífen)',Object.keys(r).join()==='0,1,3,4');
const nomes=k=>r[k].map(b=>b.nome);
t('SEG: Ativação, Força, Core ou Cardio',/Ativação.*Força.*Core ou Cardio/.test(nomes(0).join('|')));
t('"Sequência de Ativação" não virou exercício',!r[0].some(b=>b.exercicios.some(e=>/sequ/i.test(e.nome))));
t('SEG: 6 exercícios de força',r[0].find(b=>b.nome==='Força').exercicios.length===6);
t('séries/reps lidas (3 / 8 a 10)',(e=>e.series==='3'&&e.reps==='8 a 10')(r[0].find(b=>b.nome==='Força').exercicios[0]));
t('Core ou Cardio guarda circuito e "ou" na descrição',(b=>b&&/Circuito: 15/.test(b.detalhes)&&/5-10 minutos ergometro/.test(b.detalhes)&&!b.exercicios.some(e=>e.nome==='ou'))(r[0].find(b=>/Core ou Cardio/.test(b.nome))));
t('TER: Metabólico é UM bloco (sem Ativação falsa)',nomes(1).filter(n=>n==='Ativação').length===1&&nomes(1).includes('Metabólico'));
t('TER Metabólico: protocolo todo na descrição',(b=>/Aquecimento/.test(b.detalhes)&&/6 minutos bike/.test(b.detalhes)&&/Por fim/.test(b.detalhes)&&/for time/.test(b.detalhes))(r[1].find(b=>b.nome==='Metabólico')));
t('TER Metabólico sem exercício falso "x6"',r[1].find(b=>b.nome==='Metabólico').exercicios.every(e=>!e.nome||!/minutos/.test(e.nome)));
t('Metabólico e Core ou Cardio mostram o título (campo Formato)',r[1].find(b=>b.nome==='Metabólico').formato==='Metabólico'&&/Core ou Cardio/.test(r[0].find(b=>/Core ou Cardio/.test(b.nome)).formato));
t('foco do dia guardado',r[0][0].foco==='Inf. Post🦵'&&r[3][0].foco==='Superiores💪');
t('SEX: Core vira bloco',nomes(4).includes('Core'));
// banco + apelidos
const st=ctx.getStats();if(process.env.DBG)console.log(JSON.stringify(st));
t('exercícios do banco reconhecidos',st.ok>=2);
t('banco padrão: "Voador ou crucifixo" sugere parecido',!!st.sug['Voador ou crucifixo']);
ctx.addREP([{n:'Tríceps Francês'},{n:'Levantamento Terra'},{n:'Remada curvada'},{n:'Remada baixa'},{n:'Agachamento Livre'},{n:'Mesa Flexora'},{n:'Elevação Pélvica'},{n:'Panturrilha Sentado Especial'}]);
t('sugere por typo ("triceps fances")',(x=>x&&x.n==='Tríceps Francês')(ctx.mvSugerir('triceps fances')));
t('sugere nome abreviado único ("Terra")',(x=>x&&x.n==='Levantamento Terra')(ctx.mvSugerir('Terra')));
t('ambíguo não sugere ("Remada")',ctx.mvSugerir('Remada')===null);
t('nome curto que cabe em 2+ nomes não sugere ("Agachamento")',ctx.mvSugerir('Agachamento')===null);
ctx.addREP([{n:'Levantamento Terra'},{n:'Levantamento Terra Sumô'},{n:'Tríceps Francês'},{n:'Remada curvada'},{n:'Remada baixa'},{n:'Agachamento Livre'},{n:'Elevação Pélvica'},{n:'Panturrilha Sentado Especial'}]);
t('"Terra" com Terra e Terra Sumô no banco = ambíguo',ctx.mvSugerir('Terra')===null);
ctx.addREP([{n:'Levantamento Terra'},{n:'Tríceps Francês'},{n:'Remada curvada'},{n:'Remada baixa'},{n:'Agachamento Livre'},{n:'Elevação Pélvica'},{n:'Panturrilha Sentado Especial'}]);
t('typo "Panturilha especial"',(x=>x&&x.n==='Panturrilha Sentado Especial')(ctx.mvSugerir('Panturilha especial')));
t('nada parecido → null',ctx.mvSugerir('Zzzz Qqqq')===null);
ctx.mvAliasSalvar('triceps do dono','Tríceps Francês');
t('apelido salvo casa sozinho',(x=>x&&x.n==='Tríceps Francês')(ctx.mvAcharEx('Triceps do Dono')));
ctx.mvAliasSalvar('triceps coice','Tríceps Coice');
t('alias inexistente no banco não quebra',ctx.mvAcharEx('triceps coice')===null||true);
const alvo=ctx.mvAcharEx('Supino reto');
if(alvo){ctx.mvAliasSalvar('supino do dono',alvo.n);t('apelido aprendido casa sozinho depois',(x=>x&&x.n===alvo.n)(ctx.mvAcharEx('Supino do Dono')));}
else{ctx.mvAliasSalvar('supino do dono','Supino reto');t('(sem Supino reto no banco) apelido não quebra',ctx.mvAcharEx('Supino do Dono')===null);}
// formato com TAB (tabela do Docs)
const tab='SEG - Inf. Post\tTER - Superiores\tQUI Superiores💪\nSequência de Ativação\tSequência de Ativação\tSequência de Ativação\nForça\tForça\tForça\nSupino Inclinado 3x 8 a 10\tAgachamento 4x 10 a 8\tTerra 4x 10 a 8';
const rt=ctx.coletivasParsearTexto(tab);
t('TAB: 3 colunas, incluindo QUI sem hífen',Object.keys(rt).join()==='0,1,3');
t('TAB: exercício na coluna certa',rt[3].find(b=>b.nome==='Força').exercicios[0].nome.toLowerCase().indexOf('terra')>=0||rt[3].find(b=>b.nome==='Força').exercicios[0].nome==='Levantamento Terra');
// padrão do dia + aviso título×conteúdo (categorias do banco)
const dia=ex=>[{tipo:'normal',exercicios:ex.map(n=>({nome:n}))}];
const push=ctx.colPadraoDia(dia(['Supino Inclinado','DB Press','Arnold Press','Tríceps Pulley']));
t('padrão: dia de empurrar conta push',push.push===4&&push.inf===0);
t('título "Inf. Post" em dia de empurrar = aviso',/inferior/.test(ctx.colAvisoFoco('Inf. Post🦵',push)));
t('título "Empurrar" em dia de empurrar = sem aviso',ctx.colAvisoFoco('Empurrar',push)==='');
const low=ctx.colPadraoDia(dia(['Back Squat','Deadlift','Hip Thrust','Leg Press']));
t('título "Superiores" em dia de pernas = aviso',/superior/.test(ctx.colAvisoFoco('Superiores💪',low)));
t('título "Inf. Ant" em dia de pernas = sem aviso',ctx.colAvisoFoco('Inf. Ant',low)==='');
const pull=ctx.colPadraoDia(dia(['Puxada Alta','Remada Curvada DB','Rosca Direta','Face Pull']));
t('título "Empurrar" em dia de puxar = aviso',/puxar/.test(ctx.colAvisoFoco('Empurrar',pull)));
t('poucos exercícios reconhecidos = sem aviso',ctx.colAvisoFoco('Inf. Post',ctx.colPadraoDia(dia(['Supino Inclinado','Zzz'])))==='');
console.log('OK='+ok+' FAIL='+bad);process.exit(bad?1:0);
