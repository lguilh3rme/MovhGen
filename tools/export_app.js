#!/usr/bin/env node
// Gera o index.html do app do aluno a partir do Gerador (mesma lógica do botão "Exportar" -> exportarComLogin()).
// Uso: node tools/export_app.js <gerador.html> <config.json> <saida.html>
// config.json: { "netlifyUrl": "...", "logo": "data:image/... (opcional; vazio = logo padrão do Gerador)" }
const fs = require('fs');
const [,, gen, cfgPath, outPath] = process.argv;
if (!gen || !cfgPath || !outPath) { console.error('uso: export_app.js <gerador.html> <config.json> <saida.html>'); process.exit(1); }
const src = fs.readFileSync(gen, 'utf8');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const lines = src.split('\n');
const start = lines.findIndex(l => l.startsWith('function exportarComLogin('));
if (start < 0) throw new Error('exportarComLogin não encontrada');
let end = -1;
for (let i = start; i < lines.length; i++) { if (lines[i].startsWith('</html>`;')) { end = i; break; } }
if (end < 0) throw new Error('fim do template não encontrado');
const body = lines.slice(start, end + 1).join('\n').replace(/^function exportarComLogin\(\)\{/, '');
const defLogo = (src.match(/const DEFAULT_LOGIN_LOGO = "([^"]*)"/) || [])[1] || '';
const code = 'const localStorage={getItem:(k)=>k==="movh_logo_custom"?(' + JSON.stringify(cfg.logo || '') + '||null):null};' +
  'const DEFAULT_LOGIN_LOGO=' + JSON.stringify(defLogo) + ';' +
  'const plLand={appUrl:"",netlifyUrl:' + JSON.stringify(cfg.netlifyUrl || '') + '};\n' + body + '\nreturn out;';
const out = new Function('return (function(){' + code + '})()')();
fs.writeFileSync(outPath, out);
console.log('ok', outPath, out.length, 'bytes');
