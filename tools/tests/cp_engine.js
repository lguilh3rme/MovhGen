// Teste do motor de corrida/condicionamento: node tools/tests/cp_engine.js index.html
const s=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const i=s.indexOf('var CP_ZONAS='),j=s.indexOf('// UI do editor (só Gerador)');
const code=s.slice(i,j);
const ctx={};new Function('ctx',code+';Object.assign(ctx,{cpPlano,cpResumo,cpObs,cpFator,cpNum,cpRitmoSeg,cpRitmoTxt,cpSemanaGlobal});')(ctx);
let ok=0,bad=0;const t=(n,c)=>{if(c){ok++;console.log('OK  ',n);}else{bad++;console.log('FAIL',n);}};
const P=(b,w,z)=>ctx.cpPlano(b,w,8,z);
// contínuo 40 min: 40,43,46,40,45,48,51,45
t('continuo rampa',[1,2,3,4,5,6,7,8].map(w=>P({modelo:'continuo',duracao:'40 min'},w).tempo).join()==='40,43,46,40,45,48,51,45');
t('teto 30%',P({modelo:'continuo',duracao:'40'},12).tempo<=52);
t('regenerativo não progride',[1,5,7].every(w=>P({modelo:'regenerativo',duracao:'20 min'},w).tempo===20));
// intervalado Natan: 4 tiros 1 min / 2 min
const nat={modelo:'intervalado',tiros:4,esf:1,rec:2};
t('intervalado tiros',[1,2,3,4,5,6,7,8].map(w=>P(nat,w).tiros).join()==='4,4,5,4,4,5,5,4');
t('intervalado tempo total sem1 = 10+4*3',P(nat,1).tempo===22);
t('intervalado zona Repetição (esforço ≤2 min)',P(nat,1).zonaIdx===5);
t('intervalado 3 min usa Intervalo',P({modelo:'intervalado',tiros:4,esf:3,rec:3},1).zonaIdx===4);
// distância/ritmo
const z=i=>[420,345,330,300,270,250][i]; // seg/km (7:00 .. 4:10)
const c=P({modelo:'continuo',duracao:'30 min'},1,z);
t('ritmo automático da zona Fácil',c.ritmoSeg===345&&c.ritmoAuto===true);
t('distância = tempo/ritmo',Math.abs(c.dist-5.22)<0.02);
t('tempo+dist → ritmo',ctx.cpRitmoTxt(P({modelo:'continuo',duracao:'30 min',dist:'5'},1).ritmoSeg)==='6:00');
t('dist+ritmo → tempo',P({modelo:'continuo',dist:'5',ritmo:'6:00'},1).tempo===30);
t('ritmo manual vence a zona',P({modelo:'continuo',duracao:'30',ritmo:'6:00'},1,z).ritmoAuto===false);
// fartlek e caminhada
const f=P({modelo:'fartlek',duracao:'30 min'},3);t('fartlek % esforço',f.pctEsf===25&&f.esf>0);
const k=[1,2,3,4,5,6,7,8,9].map(w=>P({modelo:'caminhada',duracao:'21 min',esf:1,rec:2},w).corre).join();t('caminhada: +1 min correndo por ciclo (1,1,1,1,2,2,2,2,3)',k==='1,1,1,1,2,2,2,2,3');
t('caminhada reps fixos',P({modelo:'caminhada',duracao:'21 min',esf:1,rec:2},1).reps===7);
// robustez
t('sem modelo → null',P({duracao:'20 min'},1)===null);
t('"15-30 min" → 15',ctx.cpNum('15-30 min')===15);
t('semana global limitada',ctx.cpSemanaGlobal('2020-01-01',[{duracaoSemanas:4},{duracaoSemanas:2}]).w===6);
t('resumo contínuo',/46 min/.test(ctx.cpResumo(P({modelo:'continuo',duracao:'40 min'},3))));
console.log('OK='+ok+' FAIL='+bad);process.exit(bad?1:0);
