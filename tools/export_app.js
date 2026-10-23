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
// Carimbo da versão (hash do conteúdo): vai em A_BUILD dentro do app e em version.json ao lado da saída.
// O app consulta version.json e recarrega sozinho quando o carimbo muda (ver aChecarVersao no Gerador).
const crypto = require('crypto'), path = require('path');
if (out.split('__MOVH_BUILD__').length !== 2) throw new Error('placeholder __MOVH_BUILD__ deve aparecer 1x no app');
const build = crypto.createHash('sha1').update(out).digest('hex').slice(0, 12);
const final = out.replace('__MOVH_BUILD__', build);
fs.writeFileSync(outPath, final);
fs.writeFileSync(path.join(path.dirname(outPath), 'version.json'), JSON.stringify({ build }) + '\n');
console.log('ok', outPath, final.length, 'bytes', 'build', build);
