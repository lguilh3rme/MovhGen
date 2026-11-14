// Teste do PF_COND (progride/mantém/recua da corrida na próxima fase): node tools/tests/pf_cond.js index.html
const s=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const i=s.indexOf('var CP_ZONAS='),j=s.indexOf('// UI do editor (só Gerador)'),k=s.indexOf('// ==PF_COND=='),l=s.indexOf('// ==/PF_COND==');
if(i<0||j<0||k<0||l<0){console.log('FAIL marcadores não encontrados');process.exit(1);}
const ctx={};new Function('ctx',s.slice(i,j)+s.slice(k,l)+';Object.assign(ctx,{PF_COND,pfCondDecisao,pfCondProximo,pfCondAplicar,pfCondResumo,cpPlano,cpNum});')(ctx);
let ok=0,bad=0;const t=(n,c)=>{if(c){ok++;console.log('OK  ',n);}else{bad++;console.log('FAIL',n);}};
const D=ctx.pfCondDecisao,N=ctx.pfCondProximo;
// decisão
t('progride: 86%, RPE 7,2, teste 5 sem',D({ader:86,rpeMed:7.2,testeSem:5,dor:false}).nivel==='progride');
t('limites inclusivos: 80%, RPE 8, teste 8 sem progride',D({ader:80,rpeMed:8,testeSem:8,dor:false}).nivel==='progride');
t('mantém: aderência 79%',D({ader:79,rpeMed:7,testeSem:3,dor:false}).nivel==='mantem');
t('mantém: aderência 60%',D({ader:60,rpeMed:7,testeSem:3,dor:false}).nivel==='mantem');
t('mantém: RPE 8,5',D({ader:90,rpeMed:8.5,testeSem:3,dor:false}).nivel==='mantem');
t('mantém: sem teste de 3 km (não recua)',D({ader:90,rpeMed:7,testeSem:null,dor:false}).nivel==='mantem');
t('mantém: sem RPE suficiente',D({ader:90,rpeMed:null,testeSem:3,dor:false}).nivel==='mantem');
t('mantém: sem dado de aderência',D({ader:null,rpeMed:7,testeSem:3,dor:false}).nivel==='mantem');
t('recua: aderência 59%',D({ader:59,rpeMed:7,testeSem:3,dor:false}).nivel==='recua');
t('recua: dor ativa (mesmo com tudo bom)',D({ader:95,rpeMed:6,testeSem:2,dor:true}).nivel==='recua');
t('recua: teste há 9 sem',D({ader:95,rpeMed:6,testeSem:9,dor:false}).nivel==='recua');
t('motivo traz os números',/86%/.test(D({ader:86,rpeMed:7.2,testeSem:5,dor:false}).motivos.join())&&/7,2/.test(D({ader:86,rpeMed:7.2,testeSem:5,dor:false}).motivos.join()));
// próximo bloco
const c20={id:'con',modelo:'continuo',duracao:'20 min',progressaoAuto:true};
t('progride: 20 -> 22 min (patamar do 2º ciclo)',N(c20,'progride').duracao==='22 min');
t('encadeia: 22 -> 25 min',N(N(c20,'progride'),'progride').duracao==='25 min');
t('mantém: repete 20 min',N(c20,'mantem').duracao==='20 min');
t('recua: 20 -> 16 min',N(c20,'recua').duracao==='16 min');
t('não altera o bloco original',c20.duracao==='20 min');
t('duração sem "min" continua sem "min"',N({modelo:'continuo',duracao:'20'},'progride').duracao==='22');
t('distância acompanha o tempo (mesmo ritmo)',(()=>{const n=N({modelo:'continuo',duracao:'30 min',dist:'5'},'progride');return n.duracao==='34 min'&&n.dist==='5,7';})());
const nat={modelo:'intervalado',tiros:4,esf:1,rec:2};
t('intervalado progride: tiros nunca caem',+N(nat,'progride').tiros>=4);
t('intervalado 6 tiros: 6 -> 7',+N({modelo:'intervalado',tiros:6,esf:1,rec:2},'progride').tiros===7);
t('intervalado recua: vira contínuo fácil, sem tiros',(()=>{const n=N(nat,'recua');return n.modelo==='continuo'&&n.duracao==='18 min'&&n.tiros===undefined;})());
t('tempo run recua: vira contínuo',N({modelo:'tempo',duracao:'30 min'},'recua').modelo==='continuo');
t('fartlek recua: vira contínuo',N({modelo:'fartlek',duracao:'30 min'},'recua').modelo==='continuo');
const cam={modelo:'caminhada',duracao:'21 min',esf:1,rec:2};
t('caminhada progride: patamar da sem 5 (corre 4 min, 24 min)',(()=>{const n=N(cam,'progride');return n.esf==='4'&&n.duracao==='24 min';})());
t('caminhada progride com vigente de 12 sem: patamar da sem 9 (corre 7 min)',(()=>{const n=ctx.pfCondProximo(cam,'progride',9);return n.esf==='7';})());
t('caminhada recua: mantém 1 min correndo, volume menor',(()=>{const n=N(cam,'recua');return String(n.esf)==='1'&&n.duracao==='17 min';})());
t('regenerativo não entra',N({modelo:'regenerativo',duracao:'20 min'},'progride')===null);
t('progressaoAuto false não entra',N({modelo:'continuo',duracao:'20 min',progressaoAuto:false},'progride')===null);
t('sem modelo não entra',N({id:'con',duracao:'20 min'},'progride')===null);
// aplicar aos dias
const dias=[{nome:'Seg',blocos:[{id:'pri'},{id:'con',modelo:'continuo',duracao:'20 min'}]},{nome:'Qua',blocos:[{id:'con',modelo:'tempo',duracao:'30 min'}]},{nome:'Sex',blocos:[{id:'con',tipo:'Aeróbico',duracao:'20 min'}]}];
const out=ctx.pfCondAplicar(dias,'progride');
t('aplicar: 2 blocos com modelo; o antigo (sem modelo) fica',out.length===2&&dias[2].blocos[0].duracao==='20 min');
t('aplicar: bloco novo gravado no dia',dias[0].blocos[1].duracao==='22 min'&&dias[0].blocos[0].id==='pri');
t('aplicar: marca fácil/qualidade',out[0].facil===true&&out[1].facil===false);
t('resumo antes/depois',/20 min/.test(out[0].de)&&/22 min/.test(out[0].para));
console.log('OK='+ok+' FAIL='+bad);process.exit(bad?1:0);
