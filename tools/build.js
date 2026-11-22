#!/usr/bin/env node
// JS do app do aluno em ARQUIVO PROPRIO (src/app/app.js, JS puro, sem escape de template literal).
// O index.html (Gerador) continua um arquivo unico: a regiao entre os marcadores abaixo e GERADA daqui.
//   node tools/build.js            -> reescreve a regiao do index.html a partir de src/app/app.js
//   node tools/build.js --check    -> sai 1 se a regiao do index.html nao bate com src/app/app.js
//   node tools/build.js --extract  -> faz o caminho inverso (index.html -> src/app/app.js), p/ recuperar edicao feita no index.html
// Marcadores = interpolacao vazia no template (nao aparecem no app exportado, o export fica identico).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const HTML = path.join(root, 'index.html'), APP = path.join(root, 'src/app/app.js');
const BEG = "${''/*@@APP_JS_BEGIN@@*/}", END = "${''/*@@APP_JS_END@@*/}";
// Escape para dentro de template literal (inverso do "cozimento"): \ ` ${ e </script
const esc = s => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${').replace(/<\/script/gi, '<\\/script');
const cook = t => new Function('return `' + t + '`')(); // mesmo cozimento que o export faz
const mode = process.argv[2] || '';
const html = fs.readFileSync(HTML, 'utf8');
const a = html.indexOf(BEG), b = html.indexOf(END);
if (a < 0 || b < 0 || b < a || html.indexOf(BEG, a + 1) >= 0) { console.error('marcadores APP_JS_BEGIN/END ausentes ou duplicados em index.html'); process.exit(2); }
const ini = a + BEG.length + 1, fim = b - 1; // regiao = depois do \n do marcador inicial, ate antes do \n que antecede o marcador final
if (html[ini - 1] !== '\n' || html[fim] !== '\n') { console.error('marcador BEGIN deve terminar a linha e END iniciar a sua'); process.exit(2); }
const regiao = html.slice(ini, fim);
if (mode === '--extract') {
  fs.mkdirSync(path.dirname(APP), { recursive: true });
  fs.writeFileSync(APP, cook(regiao)); console.log('extraido', APP, cook(regiao).split('\n').length, 'linhas'); process.exit(0);
}
const app = fs.readFileSync(APP, 'utf8');
const novo = esc(app);
if (mode === '--check') {
  if (novo === regiao) { console.log('build OK: regiao do index.html == src/app/app.js'); process.exit(0); }
  // tolerancia: textos diferentes mas que "cozem" igual (ex.: \u2019 vs ’) contam como em dia
  if (cook(regiao) === app) { console.log('build OK (escape equivalente; rode node tools/build.js para normalizar)'); process.exit(0); }
  console.error('FALHA: index.html fora de sincronia com src/app/app.js. Editou o index.html direto? Use: node tools/build.js --extract (traz p/ app.js) ou node tools/build.js (app.js -> index.html)'); process.exit(1);
}
if (novo === regiao) { console.log('nada a fazer (ja em dia)'); process.exit(0); }
fs.writeFileSync(HTML, html.slice(0, ini) + novo + html.slice(fim));
console.log('index.html atualizado a partir de src/app/app.js');
