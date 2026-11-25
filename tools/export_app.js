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
const lpIni = src.indexOf('const LOGO_PRONTAS = {'), lpFim = src.indexOf('\n};', lpIni) + 3;
const logosProntas = lpIni >= 0 ? src.slice(lpIni, lpFim) : 'const LOGO_PRONTAS={};';
const code = logosProntas + '\nconst localStorage={getItem:(k)=>k==="movh_logo_custom"?(' + JSON.stringify(cfg.logo || '') + '||null):null};' +
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
// Personal (/personal) e Coletivas (/coletivas): o MESMO app do aluno em modo próprio (ver A_MODO no app), instalável à parte:
// cada um tem manifest, ícone e nome próprios (tools/pwa) e abre direto na visualização dele, sem login.
const VARIANTES = [
  { dir: 'personal', nome: 'MOVH Personal', curto: 'Personal' },
  { dir: 'coletivas', nome: 'MOVH Coletivas', curto: 'Coletivas' }
];
const troca = (h, de, para, n) => { if (h.split(de).length - 1 !== n) throw new Error('variante: "' + de + '" esperado ' + n + 'x'); return h.split(de).join(para); };
for (const v of VARIANTES) {
  let h = final;
  h = troca(h, 'href="manifest.webmanifest"', 'href="/manifest-' + v.dir + '.webmanifest"', 1);
  h = troca(h, 'href="icons/apple-touch-icon.png"', 'href="/icons/' + v.dir + '-apple-touch.png"', 1);
  h = troca(h, 'href="icons/favicon-32.png"', 'href="/icons/favicon-32.png"', 1);
  h = troca(h, '<title>MOVH — Meu Treino</title>', '<title>' + v.nome + '</title>', 1);
  h = troca(h, '<meta name="apple-mobile-web-app-title" content="MOVH">', '<meta name="apple-mobile-web-app-title" content="' + v.curto + '">', 1);
  h = troca(h, "'sw.js'", "'/sw.js'", 1);
  h = troca(h, "'version.json?", "'/version.json?", 1);
  h = troca(h, "'icons/icon-192.png'", "'/icons/" + v.dir + "-192.png'", 2);
  const vdir = path.join(path.dirname(outPath), v.dir); fs.mkdirSync(vdir, { recursive: true });
  fs.writeFileSync(path.join(vdir, 'index.html'), h);
}
// PWA (v62.2): manifest, service worker e ícones de tools/pwa vão para a raiz do app.
const pwaSrc = path.join(__dirname, 'pwa');
if (fs.existsSync(pwaSrc)) {
  const copyDir = (from, to) => { fs.mkdirSync(to, { recursive: true }); for (const f of fs.readdirSync(from, { withFileTypes: true })) { const a = path.join(from, f.name), b = path.join(to, f.name); if (f.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b); } };
  copyDir(pwaSrc, path.dirname(outPath));
}
console.log('ok', outPath, final.length, 'bytes', 'build', build);
