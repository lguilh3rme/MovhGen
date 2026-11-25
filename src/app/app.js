const aClient = window.supabase.createClient(MB_URL, MB_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'movh-aluno-auth' }
});

let aAlunoRow = null;
let aProtocolo = null;
let aTestesAgendados = []; // vem de proto.conteudo.testesAgendados — ver aRenderProtocolo
let aUltimaCargaPorExercicio = {};
let aUltimoRPE = null; // RPE (1-10) da última sessão concluída — usado pra ajustar a próxima sugestão
let aBaselineCargaPorExercicio = {};
let aExerciciosMeta = {};
let aExVideoMap = {}; // nome do exercício -> url do vídeo, fallback quando ex.url não vem preenchido
let aAvaliacoesFisicas = [];
let aTodosRegistros = [];
let aTestesFisicos = [];
let aLang = 'pt'; // idioma do protocolo do aluno logado (definido em aRenderProtocolo, a partir de c.lang)

// ── Barra de progresso da sessão de hoje ──
// Conta quantos exercícios do dashboard de hoje (#tDashConteudo) estão
// marcados como feitos e atualiza a barra + texto. Chamada em toda mudança
// de estado (marcar exercício/bloco) e ao carregar/restaurar a sessão.
function aAtualizarProgressoSessao(){
  const wrap = document.getElementById('tSessaoProgresso');
  const cont = document.getElementById('tDashConteudo');
  if(!wrap || !cont) return;
  const cards = [...cont.querySelectorAll('.ec')];
  const total = cards.length;
  if(!total){ wrap.style.display='none'; return; }
  wrap.style.display='flex';
  const feitos = cards.filter(c=>c.classList.contains('done')).length;
  let somaFr = 0;
  cards.forEach(function(c){
    if (c.classList.contains('done')) { somaFr += 1; return; }
    const bd = document.getElementById(c.id + '-series-badge');
    const tt = bd ? (parseInt(bd.dataset.total, 10) || 0) : 0;
    if (tt) somaFr += Math.min(1, (aSeriesFeitas[c.id] || 0) / tt);
  });
  const pct = feitos >= total ? 100 : Math.min(99, Math.round((somaFr/total)*100));
  const fill = document.getElementById('tSpFill');
  const texto = document.getElementById('tSpTexto');
  if(fill) fill.style.width = pct+'%';
  var restSeg = 0;
  cards.forEach(function(c){
    if (c.classList.contains('done')) return;
    var bd2 = document.getElementById(c.id + '-series-badge');
    var t2 = bd2 ? (parseInt(bd2.dataset.total, 10) || 0) : 0;
    var rem = t2 ? Math.max(0, t2 - (aSeriesFeitas[c.id] || 0)) : 1;
    var ch = c.querySelector('.ec-chip-clicavel');
    var rs = ch ? (aParseTempoParaSegundos(ch.dataset.tempo) || 60) : 60;
    restSeg += rem * (rs + 40);
  });
  var nomeDia = '';
  var ptEl = cont.querySelector('.pt');
  if (ptEl && ptEl.firstChild) nomeDia = String(ptEl.firstChild.textContent || '').trim();
  let msg = feitos+' '+(aLang==='en'?'of':'de')+' '+total+' '+(aLang==='en'?'exercises done':'exercícios feitos');
  if(pct>=100) msg = aLang==='en' ? '🏆 All done — don’t forget to log your loads!' : '🏆 Tudo feito — não esquece de registrar as cargas!';
  else if(pct>=50) msg += aLang==='en' ? ' — halfway there, keep going! 💪' : ' — na metade, bora! 💪';
  else if(feitos>0) msg += aLang==='en' ? ' — nice start!' : ' — começou bem!';
  if(texto){
    if (pct >= 100) texto.textContent = msg;
    else texto.innerHTML = '<span><b>' + aEsc(nomeDia) + '</b>' + (nomeDia ? ' · ' : '') + feitos + ' ' + (aLang==='en'?'of':'de') + ' ' + total + '</span><span>~' + Math.max(1, Math.round(restSeg/60)) + ' min ' + (aLang==='en'?'left':'restantes') + '</span>';
  }
  aXoBarraProximo();
  wrap.classList.toggle('sp-completo', pct>=100);
  wrap.style.display = 'flex';
  aAtualizarTodosBlocos();
  aDicaSeriesMontar();
}

// ── Persistência de sessão de treino ──
// Guarda no localStorage quais blocos/exercícios foram marcados "feito" hoje,
// evitando perda ao recarregar a página. Chave inclui o protocolo e a data.
// aSessaoRegistroId guarda o id da linha em "rpe_sessoes" criada quando a
// sessão de hoje é concluída (todos os blocos marcados) — é isso que o
// painel do professor lê pra montar o badge "x/y sessões no mês". Fica
// nulo até a sessão ser concluída pela 1ª vez hoje; depois é persistido
// dentro do próprio estado salvo no localStorage (chave "_registroId"),
// pra não duplicar o registro se a página for recarregada.
let aSessaoRegistroId = null;
function aSessaoKey(){
  const hoje = new Date().toISOString().slice(0,10);
  const pid = (aProtocolo && aProtocolo.id) ? aProtocolo.id : 'proto';
  return 'movh-sessao-' + pid + '-' + hoje;
}
function aSessaoSalvar(){
  try {
    const blocos = [...document.querySelectorAll('#tDashboard .bloco')];
    const estado = {};
    blocos.forEach(bloco => {
      const bCards = [...bloco.querySelectorAll('.ec')];
      bCards.forEach(card => {
        estado[card.id] = card.classList.contains('done');
      });
    });
    if (aSessaoRegistroId) estado._registroId = aSessaoRegistroId;
    localStorage.setItem(aSessaoKey(), JSON.stringify(estado));
  } catch(e) {}
  aAtualizarProgressoSessao();
}
function aSessaoRestaurar(){
  try {
    const raw = localStorage.getItem(aSessaoKey());
    if (!raw) { aAtualizarProgressoSessao(); return; }
    const estado = JSON.parse(raw);
    if (estado._registroId) aSessaoRegistroId = estado._registroId;
    Object.entries(estado).forEach(([eid, done]) => {
      if (done) {
        const card = document.getElementById(eid);
        if (card) {
          card.classList.add('done');
          const btn = document.getElementById(eid+'-done');
          if (btn) btn.checked = true;
          aSeriesSync(eid, true);
        }
      }
    });
    // recalcula estado dos blocos após restaurar
    document.querySelectorAll('#tDashboard .bloco').forEach(bloco => {
      const exCards = [...bloco.querySelectorAll('.ec')];
      const all = exCards.length && exCards.every(x => x.classList.contains('done'));
      bloco.classList.toggle('bloco-concluido', all);
      const bid = bloco.id.replace('bloco-','');
      const bbtn = document.getElementById('bdone-'+bid);
      if (bbtn) bbtn.textContent = all ? '↩' : '✓';
      if (all) {
        // recolhe bloco concluído restaurado
        const body = document.getElementById(bid);
        if (body) body.style.display = 'none';
        const arr = bloco.querySelector('.bh .bt-arr');
        if (arr) arr.style.transform = 'rotate(-90deg)';
      }
    });
    aVerificarTreinoConcluido();
  } catch(e) {}
  aAtualizarProgressoSessao();
}

// Dicionário de textos fixos da interface do app do aluno (tudo que NÃO vem
// do conteúdo do protocolo — esses textos digitados pelo professor já são
// traduzidos no momento de salvar, via trNome/dicionário de nomes). Cobre o
// que foi reportado como faltando: carga, repetições, séries, badges, etc.
// A tela de login/cadastro fica de fora propositalmente: nesse momento o
// app ainda não sabe qual protocolo (e portanto qual idioma) o aluno tem.
const aUI = {
  pt: {
    dia: 'dia', dias: 'dias', por_semana: 'por semana',
    logado_como: 'Logado como',
    sair: 'Sair',
    ver_semana_completa: '📋 Ver semana completa',
    meu_progresso: '📈 Meu progresso',
    voltar_para_hoje: '‹ Voltar para hoje',
    treino_de_hoje: '📅 Treino de hoje',
    nenhum_protocolo: '⏳ Seu treino está a caminho!',
    nenhum_protocolo_desc: 'Suas respostas foram recebidas e seu professor já está avaliando. Em breve seu protocolo de treino estará disponível aqui. 💪',
    nao_identificou_hoje: 'Não foi possível identificar o treino de hoje.',
    confira_semana: 'Confira a semana completa abaixo.',
    dia_descanso_titulo: 'Hoje é dia de descanso',
    dia_descanso_desc: 'Aproveite para recuperar — confira a semana completa se quiser adiantar algo.',
    serie: 'série', series: 'séries',
    repeticao: 'repetição', repeticoes: 'repetições',
    ate: 'a',
    carga: 'Carga', reps: 'Reps', tempo: 'Tempo', salvar: 'Salvar',
    ultima: 'última', sugestao: 'sugestão', sugestao_fase: 'Sugestão da fase', base_professor: 'base do professor',
    o_que_e_isso: 'o que é isso?',
    progresso_titulo: '📈 Meu progresso',
    progresso_desc: 'Evolução de carga por exercício, a partir do seu histórico de treinos.',
    progresso_vazio_titulo: 'Você ainda não registrou nenhuma carga.',
    progresso_vazio_desc: 'Quando salvar um treino, seu progresso aparece aqui.',
    descanso_apos_grupo: 'descanso após o grupo',
    conjugado: 'Conjugado',
    rpe_titulo: 'RPE', rpe_texto: 'Esforço Percebido — o quão difícil você sentiu a série, numa escala de 0 a 10. RPE 10 é o máximo que você conseguiria fazer; RPE 6 é algo que ainda sobra fôlego.',
    rir_titulo: 'RIR', rir_texto: 'Repetições em Reserva — quantas repetições a mais você ainda conseguiria fazer antes de falhar. RIR 2 significa que você parou a série podendo fazer mais 2 reps.',
    carga_titulo: 'Carga', carga_texto: 'O peso que você usa no exercício, mostrado como % do seu máximo (1RM). Se sua sugestão é "~70%", e seu máximo numa cadeira extensora é 100kg, a ideia é usar perto de 70kg.',
    volume_titulo: 'Volume', volume_texto: 'Quantidade total de trabalho na semana (séries × repetições). Volume alto = mais séries/exercícios; volume baixo = menos, para você recuperar.',
    descanso_titulo: 'Descanso', descanso_texto: 'Tempo de pausa entre as séries. Descanso maior favorece força máxima; descanso menor mantém o coração acelerado e ajuda no condicionamento.',
    descanso_label: 'Descanso:',
    hoje: 'Hoje',
  },
  en: {
    dia: 'day', dias: 'days', por_semana: 'per week',
    logado_como: 'Logged in as',
    sair: 'Log out',
    ver_semana_completa: '📋 View full week',
    meu_progresso: '📈 My progress',
    voltar_para_hoje: '‹ Back to today',
    treino_de_hoje: '📅 Today\'s workout',
    nenhum_protocolo: '⏳ Your workout is on the way!',
    nenhum_protocolo_desc: 'Your answers have been received. Your coach is evaluating them and your training protocol will be available here soon. 💪',
    nao_identificou_hoje: 'Couldn\'t identify today\'s workout.',
    confira_semana: 'Check the full week below.',
    dia_descanso_titulo: 'Today is a rest day',
    dia_descanso_desc: 'Take the time to recover — check the full week if you want to get ahead.',
    serie: 'set', series: 'sets',
    repeticao: 'rep', repeticoes: 'reps',
    ate: 'to',
    carga: 'Load', reps: 'Reps', tempo: 'Time', salvar: 'Save',
    ultima: 'last', sugestao: 'suggestion', sugestao_fase: 'Phase suggestion', base_professor: "coach's base",
    o_que_e_isso: 'what does this mean?',
    progresso_titulo: '📈 My progress',
    progresso_desc: 'Load progression per exercise, based on your training history.',
    progresso_vazio_titulo: 'You haven\'t logged any load yet.',
    progresso_vazio_desc: 'Once you save a workout, your progress will show up here.',
    descanso_apos_grupo: 'rest after the group',
    conjugado: 'Superset',
    rpe_titulo: 'RPE', rpe_texto: 'Rate of Perceived Exertion — how hard the set felt, on a scale from 0 to 10. RPE 10 is the most you could possibly do; RPE 6 still leaves gas in the tank.',
    rir_titulo: 'RIR', rir_texto: 'Reps in Reserve — how many more reps you could still do before failing. RIR 2 means you stopped the set with about 2 reps left.',
    carga_titulo: 'Load', carga_texto: 'The weight you use on the exercise, shown as % of your max (1RM). If your suggestion is "~70%" and your max on a leg extension is 100kg, aim for around 70kg.',
    volume_titulo: 'Volume', volume_texto: 'Total weekly workload (sets × reps). Higher volume = more sets/exercises; lower volume = less, so you can recover.',
    descanso_titulo: 'Rest', descanso_texto: 'Pause time between sets. Longer rest favors max strength; shorter rest keeps your heart rate up and helps conditioning.',
    descanso_label: 'Rest:',
    hoje: 'Today',
  }
};
// Busca uma string de UI no idioma atual do protocolo (aLang), com fallback pro PT.
function aT(key){
  return (aUI[aLang] && aUI[aLang][key]) || aUI.pt[key] || key;
}
// Nome do dia da semana só para EXIBIÇÃO no idioma do protocolo. A lógica de
// agenda/comparação continua usando DIAS_SEMANA_ORDEM (sempre em PT) — isso
// aqui é puramente cosmético, não deve ser usado pra comparar nada.
const aDIAS_EXIBICAO_EN = { 'Domingo':'Sunday','Segunda':'Monday','Terça':'Tuesday','Quarta':'Wednesday','Quinta':'Thursday','Sexta':'Friday','Sábado':'Saturday' };
function aDiaExibicao(nomePt){
  if (aLang !== 'en') return nomePt;
  return aDIAS_EXIBICAO_EN[nomePt] || nomePt;
}

// tema claro/escuro: preferência puramente visual, guardada no navegador do aluno
function aApplyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  const authBtn = document.getElementById('authThemeBtn');
  if (authBtn) authBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
  try { localStorage.setItem('mova-theme', theme); } catch(e) {}
  const tc = document.querySelector('meta[name=theme-color]'); if (tc) tc.setAttribute('content', theme === 'dark' ? '#111110' : '#F2F1EE');
}
function aToggleTheme(){
  const atual = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  aApplyTheme(atual === 'dark' ? 'light' : 'dark');
}
(function aInitTheme(){
  let saved = 'dark';
  try { saved = localStorage.getItem('mova-theme') || 'dark'; } catch(e) {}
  aApplyTheme(saved);
})();

// ── Hidratação ──
let _movhHidraTimer = null;
let _movhHidraSnooze = false;
const HIDRA_INTERVALO = 20 * 60 * 1000; // 20 min

function aIniciarHidratacao(){
  if (_movhHidraTimer) return;
  _movhHidraTimer = setInterval(aMostrarHidra, HIDRA_INTERVALO);
}

function aMostrarHidra(){
  if (_movhHidraSnooze) { _movhHidraSnooze = false; return; }
  const el = document.getElementById('hidra-toast');
  if (el) el.remove();
  const div = document.createElement('div');
  div.id = 'hidra-toast';
  div.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--P);color:#fff;padding:10px 18px;border-radius:12px;font-size:13px;font-weight:700;z-index:999;display:flex;align-items:center;gap:10px;box-shadow:0 4px 20px rgba(0,0,0,.2);animation:slideUp .3s ease';
  div.innerHTML = '<span>💧 Hora de beber água!</span><button onclick="this.parentElement.remove();_movhHidraSnooze=true" style="background:rgba(255,255,255,.25);border:none;border-radius:6px;padding:3px 8px;color:#fff;font-size:11px;cursor:pointer">+5 min</button><button onclick="this.parentElement.remove()" style="background:rgba(255,255,255,.15);border:none;border-radius:6px;padding:3px 8px;color:#fff;font-size:11px;cursor:pointer">✓ Bebi</button>';
  document.body.appendChild(div);
  setTimeout(() => { if (div.parentElement) div.remove(); }, 15000);
}

// ── Saudação e relógio ──
// Paleta que o relógio do topo percorre a cada 30s — dá a sensação de
// "cronômetro" visual, sem precisar de nenhuma contagem regressiva de verdade.
const A_RELOGIO_CORES = ['#B5121B', '#1D9E72', '#D4A017', '#2563EB'];
function aAtualizarRelogio(){
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  const s = String(now.getSeconds()).padStart(2,'0');
  const txt = h + ':' + m + ':' + s;
  const cor = A_RELOGIO_CORES[Math.floor(now.getTime() / 30000) % A_RELOGIO_CORES.length];
  const el = document.getElementById('tRelogio');
  if (el) el.textContent = txt;
  const elTop = document.getElementById('tRelogioTop');
  if (elTop) {
    // descanso em andamento: 💤 + contagem regressiva no lugar da hora (aDescansoTimer é let declarado mais abaixo: try/catch por causa da TDZ)
    let rest = 0;
    try { rest = aDescansoTimer && aDescansoTimer.fim ? Math.ceil((aDescansoTimer.fim - Date.now()) / 1000) : 0; } catch(x) {}
    if (rest > 0) {
      elTop.textContent = '💤 ' + Math.floor(rest / 60) + ':' + String(rest % 60).padStart(2, '0');
      elTop.style.color = rest <= 5 ? '#B5121B' : 'var(--P)';
    } else {
      elTop.textContent = (now.getHours() >= 6 && now.getHours() < 18 ? '☀️ ' : '🌙 ') + txt;
      elTop.style.color = cor;
    }
  }
  const elAuthTop = document.getElementById('authRelogioTop');
  if (elAuthTop) { elAuthTop.textContent = txt; elAuthTop.style.color = cor; }
}
// ── Instalar como app (PWA): Android = botão nativo; iOS = passo a passo; some quando já está instalado ──
var aInstEvt = null, aInstArmado = false;
window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); aInstEvt = e; try { aInstallInit(); } catch(x) {} });
window.addEventListener('appinstalled', function(){ try { localStorage.setItem('movh-install', 'done'); } catch(x) {} aInstFechar(); });
if ('serviceWorker' in navigator) window.addEventListener('load', function(){ navigator.serviceWorker.register('sw.js').catch(function(){}); });
function aInstStandalone(){
  try { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; } catch(x) { return false; }
}
var aInstAguardando = false;
function aInstFechar(){ var b = document.getElementById('tInstBtn'); if (b) b.style.display = 'none'; var o = document.getElementById('aInstBox'); if (o) o.remove(); }
function aInstAdiar(){ try { localStorage.setItem('movh-install-adiar', String(Date.now() + 7 * 86400000)); } catch(x) {} aInstFechar(); }
function aInstFeito(){ try { localStorage.setItem('movh-install', 'done'); } catch(x) {} aInstFechar(); }
function aInstSO(){
  var ua = navigator.userAgent || '';
  return {
    ios: /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    and: /Android/.test(ua),
    inapp: /Instagram|FBAN|FBAV|FB_IAB|Snapchat|TikTok|Twitter/.test(ua)
  };
}
// Botão "Instalar" na linha do topo (igual ao "Fazer o registro"), só aparece se precisar.
// Android: abre o diálogo nativo e some sozinho ao instalar. iOS: abre o Compartilhar e o botão vira
// "Já instalei" (a Apple não avisa a instalação); o app aberto pela tela de início nunca mostra o botão.
function aToastApp(msg){
  var t = document.getElementById('aToastApp');
  if (!t) { t = document.createElement('div'); t.id = 'aToastApp'; t.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:900;background:var(--tx);color:var(--bg);border-radius:12px;padding:10px 14px;font-size:13px;text-align:center;display:none;max-width:380px;margin:0 auto'; document.body.appendChild(t); }
  t.textContent = msg; t.style.display = 'block'; clearTimeout(t._h); t._h = setTimeout(function(){ t.style.display = 'none'; }, 4000);
}
function aInstallClick(){
  var en = (typeof aLang !== 'undefined' && aLang === 'en');
  if (aInstAguardando) { aInstFeito(); return; }
  if (aInstEvt) {
    var ev = aInstEvt; aInstEvt = null;
    try {
      ev.prompt();
      ev.userChoice.then(function(c){ if (c && c.outcome === 'accepted') aInstFeito(); else aInstAdiar(); }).catch(function(){ aInstAdiar(); });
    } catch(x) { aInstAdiar(); }
    return;
  }
  var so = aInstSO();
  if (so.inapp) { aToastApp(en ? 'Open this link in Safari to install.' : 'Abra este link no Safari para instalar.'); return; }
  aToastApp(en ? 'Tap Add to Home Screen (scroll the list).' : 'Toque em Adicionar à Tela de Início (role a lista).');
  if (navigator.share) { try { navigator.share({ title: 'MOVH', url: location.href.split('#')[0] }).catch(function(){}); } catch(x) {} }
  aInstAguardando = true;
  var b = document.getElementById('tInstBtn'); if (b) b.textContent = en ? '✓ Installed' : '✓ Já instalei';
  try { localStorage.setItem('movh-install-adiar', String(Date.now() + 3 * 86400000)); } catch(x) {}
}
function aInstallInit(){
  try {
    var b = document.getElementById('tInstBtn'); if (!b) return;
    var ts = document.getElementById('treinoScreen');
    var so = aInstSO(), en = (typeof aLang !== 'undefined' && aLang === 'en');
    var adiar = parseInt(localStorage.getItem('movh-install-adiar') || '0', 10);
    var esconde = aInstStandalone() || !ts || getComputedStyle(ts).display === 'none' || localStorage.getItem('movh-install') === 'done'
      || (adiar && Date.now() < adiar && !aInstAguardando) || !(so.ios || (so.and && aInstEvt));
    if (esconde) { b.style.display = 'none'; return; }
    b.style.display = 'inline-block';
    if (!aInstAguardando) b.textContent = '📲 ' + (en ? 'Install' : 'Instalar');
  } catch(x) {}
}
// Saudação do topo: começa em 17px e encolhe (até 12px) só o necessário para caber ao lado dos botões.
function aFitSaudacao(el){
  try {
    if (!el || !el.clientWidth) return;
    var chave = el.textContent + '|' + el.clientWidth;
    if (el.getAttribute('data-fit') === chave) return;
    var f = 17; el.style.setProperty('font-size', f + 'px', 'important');
    while (f > 12 && el.scrollWidth > el.clientWidth + 1) { f--; el.style.setProperty('font-size', f + 'px', 'important'); }
    el.setAttribute('data-fit', chave);
  } catch(x) {}
}
window.addEventListener('resize', function(){ aFitSaudacao(document.getElementById('tSaudacaoTitulo')); });
setInterval(function(){ aInstallInit(); aFitSaudacao(document.getElementById('tSaudacaoTitulo')); }, 3000);
function aAtualizarSaudacao(){
  const h = new Date().getHours();
  const nomeCompleto = (aAlunoRow && aAlunoRow.nome) ? aAlunoRow.nome.trim() : '';
  const primeiroNome = nomeCompleto ? nomeCompleto.split(/\s+/)[0] : '';
  let msg;
  if (aLang === 'en') {
    msg = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  } else {
    msg = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  }
  msg = msg + (primeiroNome ? ', ' + primeiroNome : '') + '! 👊';
  const el = document.getElementById('tSaudacaoTitulo');
  if (el) el.textContent = msg;
  try { aFitSaudacao(el); aInstallInit(); } catch(x) {}
}
function aShowTelARenovar(fim){
  // Remove qualquer tela de renovação existente
  const old = document.getElementById('tela-renovar');
  if (old) old.remove();
  const url = A_NETLIFY_URL || '';
  const dataStr = fim ? fim.toLocaleDateString(aLang==='en'?'en-GB':'pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
  const titulo = aLang==='en' ? 'Access Expired' : 'Acesso Encerrado';
  const msg = aLang==='en'
    ? `Your access expired on ${dataStr}. Choose a plan below to continue training!`
    : `Seu acesso venceu em ${dataStr}. Escolha um plano abaixo para continuar treinando!`;
  const btnTxt = aLang==='en' ? '💳 Renew Now' : '💳 Renovar Agora';
  const sairTxt = aLang==='en' ? 'Sign out' : 'Sair da conta';
  const div = document.createElement('div');
  div.id = 'tela-renovar';
  div.className = 'tela-renovar';
  const btnRenovar = '<button class="btn-renovar-principal" onclick="aAbrirRenovar()">'+btnTxt+'</button>';
  div.innerHTML = '<div class="tela-renovar-icon">🔒</div>'
    + '<h2>' + titulo + '</h2>'
    + '<p>' + msg + '</p>' + (aOfertaSituacao() === 'reativacao' ? '<p>' + (aLang==='en' ? 'Reactivate to go back to your current workout.' : 'Reative o acesso para voltar ao seu treino atual.') + '</p>' : '')
    + btnRenovar
    + '<button class="btn-renovar-sair" onclick="aLogout()">' + sairTxt + '</button>';
  document.body.appendChild(div);
}

function aPixCRC(str){var crc=0xFFFF;for(var i=0;i<str.length;i++){crc^=str.charCodeAt(i)<<8;for(var j=0;j<8;j++){crc=(crc&0x8000)?((crc<<1)^0x1021):(crc<<1);crc&=0xFFFF;}}var h=crc.toString(16).toUpperCase();while(h.length<4)h='0'+h;return h;}
function aPixTLV(id,v){var l=String(v.length);if(l.length<2)l='0'+l;return id+l+v;}
function aPixPayload(chave,nome,cidade,valor,txid){
  var limpa=function(t,n){return String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9 ]/g,'').toUpperCase().trim().slice(0,n);};
  var conta=aPixTLV('00','br.gov.bcb.pix')+aPixTLV('01',String(chave||'').trim());
  var tx=String(txid||'').replace(/[^A-Za-z0-9]/g,'').slice(0,25)||'***';
  var p=aPixTLV('00','01')+aPixTLV('01','11')+aPixTLV('26',conta)+aPixTLV('52','0000')+aPixTLV('53','986')+aPixTLV('54',Number(valor).toFixed(2))+aPixTLV('58','BR')+aPixTLV('59',limpa(nome,25)||'MOVH')+aPixTLV('60',limpa(cidade,15)||'BRASIL')+aPixTLV('62',aPixTLV('05',tx));
  p+='6304';return p+aPixCRC(p);
}
var aPixEst = { etapa:'escolha', plano:null, item:0, txid:'', msg:'', pend:null };
async function aPixCarregar(){
  if (window._aPixCfg) return window._aPixCfg;
  var cfg = { planos:[], pix:null };
  try {
    var r = await aClient.from('landing_config').select('planos,config').eq('professor_id', aAlunoRow.professor_id).maybeSingle();
    var d = r && r.data;
    if (d) { cfg.planos = Array.isArray(d.planos) ? d.planos : []; cfg.pix = (d.config && d.config.pix) || null; }
  } catch(e) {}
  window._aPixCfg = cfg;
  return cfg;
}
function aOfertaSituacao(){
  var f = aAlunoRow && aAlunoRow.acesso_fim; if (!f) return 'novo';
  var hoje = new Date(); hoje.setHours(12, 0, 0, 0);
  var d = Math.round((hoje - new Date(f + 'T12:00:00')) / 86400000);
  return d > 7 ? 'reativacao' : 'renovacao';
}
function aOfertaAtiva(){
  var c = aAlunoRow && aAlunoRow.cobranca;
  if (!c || typeof c !== 'object' || c.status !== 'aberta' || !(Number(c.valor) > 0)) return null;
  try { if (localStorage.getItem('movh-oferta-paga-' + (c.criado_em || ''))) return null; } catch(e) {}
  return c;
}
// Planos mostrados no fluxo de renovar, conforme a situação do aluno; a oferta do professor (plano e valor combinados) vem primeiro
function aPixPlanosSituacao(todos){
  var sit = aOfertaSituacao(), of = aOfertaAtiva();
  var tp = function(p){ return p.tipo || 'novo'; };
  var lista = sit === 'novo' ? todos.filter(function(p){ return tp(p) === 'novo'; }) : todos.filter(function(p){ return tp(p) === sit || (tp(p) === 'novo' && p.dias > 30); });
  if (!lista.length) lista = todos;
  lista = lista.filter(function(p){ return tp(p) === sit; }).concat(lista.filter(function(p){ return tp(p) !== sit; }));
  if (of) {
    var base = null; todos.forEach(function(p){ if (p.id === of.plano_id) base = p; });
    var op = { id: of.plano_id || 'oferta', nome: of.plano_nome || (base && base.nome) || 'Plano', dias: of.dias || (base && base.dias) || 30, precoBR: Number(of.valor), precoUK: (base && base.precoUK) || 0, tipo: of.tipo || sit, oferta: true };
    lista = [op].concat(lista.filter(function(p){ return p.id !== op.id; }));
  }
  return lista;
}
async function aAbrirRenovar(){
  var cfg = await aPixCarregar();
  if (!cfg.todos) cfg.todos = cfg.planos;
  cfg.planos = aPixPlanosSituacao(cfg.todos);
  var ofAtiva = aOfertaAtiva();
  aPixEst = { etapa:'escolha', plano:((ofAtiva || aOfertaSituacao() !== 'novo') ? cfg.planos[0].id : (cfg.planos.length === 1 ? cfg.planos[0].id : null)), item:0, txid:'', msg:'', pend:null };
  var old = document.getElementById('movh-renovar-overlay'); if (old) old.remove();
  var ov = document.createElement('div'); ov.id = 'movh-renovar-overlay'; ov.className = 'sessao-concluida-overlay';
  ov.innerHTML = '<div class="sessao-concluida-card rn-card" id="rn-card"></div>';
  ov.onclick = function(e){
    if (e.target === ov) { ov.remove(); return; }
    var t = e.target.closest ? e.target.closest('[data-rn]') : null;
    if (t) aPixAcao(t.dataset.rn, t.dataset.v);
  };
  document.body.appendChild(ov);
  aPixDesenhar();
  try {
    var q = await aClient.from('pagamentos_pix').select('id,valor,plano_nome').eq('aluno_id', aAlunoRow.id).eq('status', 'pendente').order('criado_em', { ascending:false }).limit(1);
    if (q && q.data && q.data[0]) { aPixEst.pend = q.data[0]; aPixDesenhar(); }
  } catch(e) {}
}
function aPixMoeda(v){ return 'R$ ' + Number(v).toFixed(2).replace('.', ','); }
function aPixDesenhar(){
  var box = document.getElementById('rn-card'); if (!box) return;
  var en = aLang === 'en', cfg = window._aPixCfg || { planos:[], pix:null };
  var pix = cfg.pix && cfg.pix.ativo ? cfg.pix : null;
  var itens = pix ? (pix.itens || []).filter(function(i){ return i && i.chave; }) : [];
  var pl = null; cfg.planos.forEach(function(p){ if (p.id === aPixEst.plano) pl = p; });
  var sitR = aOfertaSituacao();
  var tituloR = sitR === 'novo' ? (en ? 'Activate access' : 'Ativar acesso') : sitR === 'reativacao' ? (en ? 'Reactivate access' : 'Reativar acesso') : (en ? 'Renew access' : 'Renovar acesso');
  var h = '<div class="rn-x" data-rn="fechar">×</div><div class="sc-emoji">💳</div><div class="sc-titulo">' + tituloR + '</div>';
  if (aOfertaAtiva() && aPixEst.etapa !== 'aguardando') h += '<div class="rn-pend">🔒 ' + (en ? 'Renewal offer' : 'Oferta de renovação') + '</div>';
  if (aPixEst.etapa === 'aguardando') {
    h += '<div class="sc-sub">' + (en ? 'Thanks! Your coach was notified and will release your access as soon as the payment is confirmed.' : 'Obrigado! Avisei o professor. Seu acesso é liberado assim que ele confirmar o pagamento.') + '</div>';
    h += '<button class="rpe-enviar" data-rn="zap">' + (en ? '💬 Send receipt on WhatsApp' : '💬 Enviar comprovante no WhatsApp') + '</button>';
    h += '<button class="sc-btn-sec" data-rn="recarregar">' + (en ? '🔄 Already released? Refresh' : '🔄 Já liberou? Atualizar') + '</button>';
    h += '<button class="sc-btn-sec" data-rn="fechar">' + (en ? 'Close' : 'Fechar') + '</button>';
    box.innerHTML = h; return;
  }
  if (aPixEst.pend) h += '<div class="rn-pend">💠 ' + (en ? 'Pix in review: ' : 'Pix em análise: ') + aEsc(aPixMoeda(aPixEst.pend.valor)) + (aPixEst.pend.plano_nome ? ' · ' + aEsc(aPixEst.pend.plano_nome) : '') + '</div>';
  if (!cfg.planos.length) {
    h += '<div class="sc-sub">' + (en ? 'Ask your coach for the renewal options.' : 'Fale com o professor para renovar.') + '</div>';
    h += '<button class="rpe-enviar" data-rn="zap0">💬 WhatsApp</button><button class="sc-btn-sec" data-rn="fechar">' + (en ? 'Close' : 'Fechar') + '</button>';
    box.innerHTML = h; return;
  }
  h += '<div class="rn-lbl">' + (en ? 'Plan' : 'Plano') + '</div><div class="rn-pl">';
  cfg.planos.forEach(function(p){
    h += '<button type="button" class="rn-opt' + (p.id === aPixEst.plano ? ' on' : '') + '" data-rn="plano" data-v="' + aEsc(p.id) + '"><b>' + aEsc(p.nome) + '</b><span>' + aEsc(aPixMoeda(p.precoBR)) + '</span></button>';
  });
  h += '</div>';
  if (pl) {
    if (aPixEst.etapa === 'pix' && itens.length) {
      var it = itens[Math.min(aPixEst.item, itens.length - 1)];
      if (!aPixEst.txid) aPixEst.txid = 'MV' + Date.now().toString(36).toUpperCase();
      var code = aPixPayload(it.chave, pix.nome, pix.cidade, pl.precoBR, aPixEst.txid);
      h += '<div class="rn-lbl">' + (en ? 'Pay with Pix' : 'Pagar com Pix') + ' · ' + aEsc(aPixMoeda(pl.precoBR)) + '</div>';
      if (itens.length > 1) {
        h += '<div class="rn-pl">';
        itens.forEach(function(x, i){ h += '<button type="button" class="rn-opt sm' + (i === aPixEst.item ? ' on' : '') + '" data-rn="banco" data-v="' + i + '"><b>' + aEsc(x.banco || ('Pix ' + (i + 1))) + '</b></button>'; });
        h += '</div>';
      }
      h += '<textarea class="rn-code" id="rn-code" readonly rows="4">' + aEsc(code) + '</textarea>';
      h += '<button class="rpe-enviar" data-rn="copiar">' + (en ? '📋 Copy Pix code' : '📋 Copiar código Pix') + '</button>';
      h += '<div class="rn-key">' + (en ? 'Or use the key: ' : 'Ou use a chave: ') + '<b>' + aEsc(it.chave) + '</b>' + (pix.nome ? '<br>' + aEsc(pix.nome) : '') + '</div>';
      if (pix.msg) h += '<div class="rn-key">' + aEsc(pix.msg) + '</div>';
      if (aPixEst.msg) h += '<div class="rn-err">' + aEsc(aPixEst.msg) + '</div>';
      h += '<button class="rpe-enviar rn-pago" data-rn="paguei">' + (en ? '✅ I have paid' : '✅ Já paguei') + '</button>';
      h += '<button class="sc-btn-sec" data-rn="voltar">' + (en ? 'Back' : 'Voltar') + '</button>';
    } else {
      h += '<div class="rn-lbl">' + (en ? 'Payment method' : 'Forma de pagamento') + '</div><div class="rn-pl">';
      if (itens.length) h += '<button type="button" class="rn-opt" data-rn="pix"><b>💠 Pix</b><span>' + (en ? 'released after confirmation' : 'liberado após confirmação') + '</span></button>';
      if (A_NETLIFY_URL) h += '<button type="button" class="rn-opt" data-rn="cartao"><b>💳 ' + (en ? 'Card' : 'Cartão') + '</b><span>' + (en ? 'automatic release' : 'liberação automática') + '</span></button>';
      h += '</div>';
      if (!itens.length && !A_NETLIFY_URL) h += '<div class="sc-sub">' + (en ? 'Ask your coach how to pay.' : 'Fale com o professor para pagar.') + '</div><button class="rpe-enviar" data-rn="zap0">💬 WhatsApp</button>';
      h += '<button class="sc-btn-sec" data-rn="fechar">' + (en ? 'Close' : 'Fechar') + '</button>';
    }
  } else {
    h += '<div class="sc-sub">' + (en ? 'Pick a plan to continue.' : 'Escolha um plano para continuar.') + '</div><button class="sc-btn-sec" data-rn="fechar">' + (en ? 'Close' : 'Fechar') + '</button>';
  }
  box.innerHTML = h;
}
async function aPixAcao(acao, v){
  var cfg = window._aPixCfg || { planos:[], pix:null };
  var pl = null; cfg.planos.forEach(function(p){ if (p.id === aPixEst.plano) pl = p; });
  if (acao === 'fechar') { var o = document.getElementById('movh-renovar-overlay'); if (o) o.remove(); return; }
  if (acao === 'plano') { aPixEst.plano = v; aPixEst.etapa = 'escolha'; aPixEst.txid = ''; aPixEst.msg = ''; aPixDesenhar(); return; }
  if (acao === 'pix') { aPixEst.etapa = 'pix'; aPixEst.item = 0; aPixEst.txid = ''; aPixDesenhar(); return; }
  if (acao === 'voltar') { aPixEst.etapa = 'escolha'; aPixEst.msg = ''; aPixDesenhar(); return; }
  if (acao === 'banco') { aPixEst.item = parseInt(v, 10) || 0; aPixDesenhar(); return; }
  if (acao === 'cartao') { var u = A_NETLIFY_URL || ''; if (u) window.open(u + (u.indexOf('?') >= 0 ? '&' : '?') + 'renovar=1', '_blank'); return; }
  if (acao === 'recarregar') { location.reload(); return; }
  if (acao === 'copiar') {
    var ta = document.getElementById('rn-code'); if (!ta) return;
    try { await navigator.clipboard.writeText(ta.value); } catch(e) { ta.select(); try { document.execCommand('copy'); } catch(e2) {} }
    var b = document.querySelector('#rn-card [data-rn=copiar]'); if (b) b.textContent = (aLang === 'en' ? '✓ Copied' : '✓ Copiado');
    return;
  }
  if (acao === 'zap0' || acao === 'zap') {
    var nm = (aAlunoRow && (aAlunoRow.nome || aAlunoRow.email)) || '';
    var msg = acao === 'zap' && pl ? ('Oi! Sou ' + nm + '. Paguei o Pix de ' + aPixMoeda(pl.precoBR) + ' (' + pl.nome + ', ref ' + aPixEst.txid + '). Segue o comprovante.') : ('Oi! Sou ' + nm + ' e quero renovar meu acesso.');
    window.open('https://wa.me/' + A_WHATSAPP_NUM + '?text=' + encodeURIComponent(msg), '_blank');
    return;
  }
  if (acao === 'paguei') {
    if (!pl) return;
    var btn = document.querySelector('#rn-card [data-rn=paguei]'); if (btn) btn.disabled = true;
    var r = await aClient.from('pagamentos_pix').insert({ aluno_id: aAlunoRow.id, professor_id: aAlunoRow.professor_id, plano_id: pl.id, plano_nome: pl.nome, dias: pl.dias, valor: pl.precoBR, txid: aPixEst.txid, status: 'pendente' });
    try { var ofP = aOfertaAtiva(); if (ofP && !r.error) localStorage.setItem('movh-oferta-paga-' + (ofP.criado_em || ''), '1'); } catch(e) {}
    if (r && r.error) { aPixEst.msg = (aLang === 'en' ? 'Could not notify your coach. Send the receipt on WhatsApp.' : 'Não consegui avisar o professor. Envie o comprovante pelo WhatsApp.'); aPixDesenhar(); return; }
    aPixEst.etapa = 'aguardando'; aPixDesenhar();
  }
}

function aIniciarRelogio(){
  aAtualizarRelogio();
  aAtualizarSaudacao();
  setInterval(aAtualizarRelogio, 1000);
  aIniciarHidratacao();
}
// Relógio já começa a rodar na tela de login (antes do aluno logar), não só depois
if (!window._movhRelogioClockIniciado) { window._movhRelogioClockIniciado = true; aAtualizarRelogio(); setInterval(aAtualizarRelogio, 1000); }


let aDiasTesteAtivo = null; // setado por aCheckTeste() quando a URL tem ?teste=N — dias de acesso grátis a conceder no cadastro
// ── LINK PÚBLICO DE TREINO (?treino=TOKEN): visualização sem login ──
// Lê o treino ao vivo via RPC get_treino_publico (sempre a versão mais recente
// salva pelo professor). Não grava nada: escritas são bloqueadas.
function aPreviewToast(msg){
  let t = document.getElementById('aPreviewToast');
  if (!t) {
    t = document.createElement('div'); t.id = 'aPreviewToast';
    t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#1A1A18;color:#fff;padding:10px 16px;border-radius:99px;font-size:12px;font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.3);max-width:90%;text-align:center';
    document.body.appendChild(t);
  }
  t.textContent = msg; t.style.display = 'block';
  clearTimeout(window._aPreviewToastT);
  window._aPreviewToastT = setTimeout(function(){ t.style.display = 'none'; }, 3200);
}
function aPreviewBloqueado(){
  if (!window._movhPreview) return false;
  aPreviewToast(aLang === 'en' ? 'Create your account to log your workouts' : 'Crie sua conta para registrar seus treinos');
  return true;
}
function aPreviewSafetyNet(){
  const orig = aClient.from.bind(aClient);
  const dead = { data: null, error: { message: 'preview' } };
  const chain = new Proxy(function(){}, {
    get: function(_, p){ if (p === 'then') return function(res){ res(dead); }; return function(){ return chain; }; },
    apply: function(){ return chain; }
  });
  aClient.from = function(t){
    const q = orig(t);
    ['insert','update','upsert','delete'].forEach(function(m){ q[m] = function(){ return chain; }; });
    return q;
  };
}
const A_APP_URL = 'https://movh.netlify.app/';
function aIrParaRegistro(){
  try { sessionStorage.setItem('movh-via-treino', '1'); } catch(e){}
  window.location.href = aBaseApp() + '?bemvindo=1';
}
function aPreviewErroTela(err){
  const en = (navigator.language || '').toLowerCase().indexOf('en') === 0;
  let d = document.getElementById('aPreviewErro');
  if (!d) {
    d = document.createElement('div'); d.id = 'aPreviewErro';
    d.style.cssText = 'position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;padding:1.5rem;background:var(--bg,#F2F1EE);color:var(--tx,#1A1A18);text-align:center;font-family:inherit';
    document.body.appendChild(d);
  }
  const box = document.createElement('div'); box.style.cssText = 'max-width:380px';
  const h = document.createElement('div'); h.style.cssText = 'font-size:40px;margin-bottom:8px'; h.textContent = '🔗';
  const t = document.createElement('div'); t.style.cssText = 'font-size:16px;font-weight:800;margin-bottom:8px';
  t.textContent = err ? (en ? 'Could not load this workout' : 'Não foi possível carregar este treino') : (en ? 'This workout link is no longer available' : 'Este link de treino não está mais disponível');
  const m = document.createElement('div'); m.style.cssText = 'font-size:13px;opacity:.75;margin-bottom:16px';
  m.textContent = err ? (en ? 'Try again in a moment or ask your trainer for a new link.' : 'Tente novamente em instantes ou peça um novo link ao seu professor.') : (en ? 'It was removed or replaced. Ask your trainer for a new link.' : 'Ele foi removido ou substituído. Peça um novo link ao seu professor.');
  box.appendChild(h); box.appendChild(t); box.appendChild(m);
  if (err) { const c = document.createElement('div'); c.style.cssText = 'font-size:11px;opacity:.45;margin-bottom:16px;word-break:break-word'; c.textContent = String(err.message || err.code || err); box.appendChild(c); }
  const b = document.createElement('button'); b.style.cssText = 'padding:10px 18px;border-radius:99px;border:1px solid var(--bd,#DDDBD4);background:var(--card,#fff);color:inherit;font-weight:700;cursor:pointer';
  b.textContent = en ? 'Go to login' : 'Ir para o login';
  b.onclick = function(){ window.location.href = aBaseApp(); };
  box.appendChild(b);
  d.innerHTML = ''; d.appendChild(box);
}
async function aBootPreview(token){
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('loadingScreen').style.display = 'flex';
  let res = null, err = null;
  try {
    const r = await aClient.rpc('get_treino_publico', { p_token: token });
    res = r.data; err = r.error;
  } catch(e) { err = e; }
  document.getElementById('loadingScreen').style.display = 'none';
  if (err || !res || !res.conteudo) {
    console.error('[MOVH] Link de treino inválido ou erro:', err);
    aPreviewErroTela(err);
    return;
  }
  window._movhPreview = true;
  aPreviewSafetyNet();
  const h = new Date();
  const iso = h.getFullYear() + '-' + String(h.getMonth()+1).padStart(2,'0') + '-' + String(h.getDate()).padStart(2,'0');
  aAlunoRow = { id: null, nome: '', email: '', professor_id: res.professor_id || null, mostra_aulas_coletivas: false };
  aTodosRegistros = []; aTestesFisicos = []; aAvaliacoesFisicas = [];
  aUltimaCargaPorExercicio = {}; aBaselineCargaPorExercicio = {}; aExerciciosMeta = {}; aExVideoMap = {};
  (res.exercicios || []).forEach(function(e){ if (e && e.nome && e.url) aExVideoMap[e.nome] = e.url; });
  const proto = { id: null, aluno_id: null, professor_id: res.professor_id || null, nome: res.nome, conteudo: res.conteudo, data_inicio: iso, ativo: true };
  aProtocolo = proto;
  // splits salvos no banco não trazem ids/cores (loadSplit do Gerador gera na hora): normaliza igual
  (proto.conteudo.semanas || []).forEach(function(sem, si){
    if (!sem.id) sem.id = 'sp_s' + si;
    (sem.dias || []).forEach(function(d, di){
      if (!d.id) d.id = 'sp_s' + si + 'd' + di;
      (d.blocos || []).forEach(function(b){
        if (!b.cor) b.cor = b.id === 'con' ? '#D45828' : '#3580D8';
        if (!b.exercicios) b.exercicios = [];
        if (b.id === 'con' && !b.metconExs) b.metconExs = [];
      });
    });
  });
  // link público = amostra "sem calendário": se o dia real de hoje não casa com
  // nenhum dia montado (dias sem "dia real" definido, ou hoje é folga), roda a
  // sequência da semana montada a partir de hoje (hoje = 1º treino, amanhã = 2º...)
  // e repete em ciclo, em vez de mostrar dias vazios.
  (function(){
    const dow = h.getDay();
    const hojeCasa = (proto.conteudo.semanas || []).every(function(sem){ return (sem.dias || []).some(function(d){ return aDiaSemanaEfetivo(d) === DIAS_SEMANA_ORDEM[dow]; }); });
    if (hojeCasa || (proto.conteudo && proto.conteudo.diasReais)) return;
    (proto.conteudo.semanas || []).forEach(function(sem){
      (sem.dias || []).forEach(function(d, di){ d.diaSemana = DIAS_SEMANA_ORDEM[(dow + di) % 7]; });
    });
  })();
  aRenderProtocolo(proto);
  document.body.classList.add('preview-mode');
  const en = aLang === 'en';
  const btn = document.getElementById('tRegistroBtn');
  if (btn) { btn.textContent = en ? 'Create account' : 'Fazer o registro'; btn.style.display = 'inline-block'; }
  const box = document.getElementById('tHeaderRecolhivel');
  if (box && !document.getElementById('tPreviewAviso')) {
    const av = document.createElement('div'); av.id = 'tPreviewAviso'; av.className = 'preview-aviso';
    av.textContent = en ? 'You are viewing a sample workout. Create your account to track your progress.' : 'Você está vendo um treino de exemplo. Crie sua conta para registrar seu progresso.';
    box.insertBefore(av, box.firstChild);
  }
}

function aCheckBemVindo(){
  try {
    const p = new URLSearchParams(window.location.search);
    // se veio com ?teste= junto, o banner de teste grátis (aCheckTeste) já
    // cobre a mensagem de boas-vindas — mostrar os dois juntos ficaria poluído
    if (p.get('bemvindo') === '1' && !p.get('teste')) {
      document.getElementById('aWelcomeBanner').classList.add('show');
      aSwitchTab('signup');
    }
  } catch(e){}
}
// Link de teste grátis: professor compartilha algo como
// "https://SEUDOMINIO/?teste=7" pra dar 7 dias de acesso grátis a quem
// se cadastrar por ali. Fica de fora da landing de propósito — é um link
// à parte, só pra quem o professor mandar diretamente. O número de dias
// vem da própria URL (não precisa reexportar o app pra mudar o prazo).
function aCheckTeste(){
  try {
    const p = new URLSearchParams(window.location.search);
    const dias = parseInt(p.get('teste'), 10);
    if (dias && dias > 0) {
      aDiasTesteAtivo = dias;
      const txt = document.getElementById('aTesteBannerTxt');
      if (txt) txt.innerHTML = 'Você tem <b>' + dias + ' dia' + (dias!==1?'s':'') + ' de acesso grátis</b>! Crie sua conta abaixo, responda o questionário e comece a treinar hoje mesmo.';
      const banner = document.getElementById('aTesteBanner');
      if (banner) banner.classList.add('show');
      aSwitchTab('signup');
    }
  } catch(e){}
}
function aShowMsg(text, type){ const el=document.getElementById('aMsg'); el.textContent=text; el.className='amsg show '+type; }
function aHideMsg(){ document.getElementById('aMsg').className='amsg'; }
function aSwitchTab(which){
  aHideMsg();
  document.getElementById('aTabLogin').classList.toggle('active', which==='login');
  document.getElementById('aTabSignup').classList.toggle('active', which==='signup');
  document.getElementById('aFormLogin').style.display = which==='login' ? 'block' : 'none';
  document.getElementById('aFormSignup').style.display = which==='signup' ? 'block' : 'none';
  if (which === 'signup') { try { aInstSignupInit(); } catch(x) {} }
}
// ── Cartão "instale o app" na aba Criar conta (iOS = passo a passo; Android = botão nativo) ──
function aInstSignupInit(){
  var card = document.getElementById('aInstCard'); if (!card) return;
  var so = aInstSO(), en = (typeof aLang !== 'undefined' && aLang === 'en');
  var adiar = 0; try { adiar = parseInt(localStorage.getItem('movh-signup-inst-pular') || '0', 10); } catch(x) {}
  var feito = false; try { feito = localStorage.getItem('movh-install') === 'done'; } catch(x) {}
  if (aInstStandalone() || feito || (adiar && Date.now() < adiar) || !(so.ios || so.and)) { card.style.display = 'none'; return; }
  var t = document.getElementById('aInstT'), s = document.getElementById('aInstS'), ol = document.getElementById('aInstOl');
  var bt = document.getElementById('aInstAcao'), pu = document.getElementById('aInstPular');
  var passos = [], acao = '', modo = '';
  if (so.ios && so.inapp) {
    modo = 'copiar';
    t.textContent = '📲 ' + (en ? 'Open in Safari to install' : 'Abra no Safari para instalar');
    s.textContent = en ? 'This browser cannot install apps. Copy the link, open it in Safari and install from there.' : 'Este navegador não instala apps. Copie o link, abra no Safari e instale por lá.';
    acao = en ? 'Copy link' : 'Copiar link';
  } else if (so.ios) {
    modo = 'compartilhar';
    t.textContent = '📲 ' + (en ? 'Install the app first' : 'Instale o app primeiro');
    s.textContent = en ? 'Opens full screen and keeps you signed in. On iPhone, install first and create your account inside the app.' : 'Abre em tela cheia e mantém você conectado. No iPhone, instale antes e crie a conta dentro do app.';
    passos = en
      ? ['Tap <b>Share</b> (square with an arrow) in Safari', 'Scroll and tap <b>Add to Home Screen</b>', 'Open <b>MOVH</b> from the icon and tap <b>Create account</b>']
      : ['Toque em <b>Compartilhar</b> (quadrado com seta) no Safari', 'Role e toque em <b>Adicionar à Tela de Início</b>', 'Abra o <b>MOVH</b> pelo ícone e toque em <b>Criar conta</b>'];
    acao = en ? 'Open Share menu' : 'Abrir o Compartilhar';
  } else if (aInstEvt) {
    modo = 'nativo';
    t.textContent = '📲 ' + (en ? 'Install the app for a better experience' : 'Instale o app para a melhor experiência');
    s.textContent = en ? 'Opens full screen from your home screen and keeps you signed in.' : 'Abre em tela cheia pela tela inicial e mantém você conectado.';
    acao = en ? 'Install now' : 'Instalar agora';
  } else {
    modo = 'menu';
    t.textContent = '📲 ' + (en ? 'Install the app for a better experience' : 'Instale o app para a melhor experiência');
    s.textContent = en ? 'Opens full screen from your home screen and keeps you signed in.' : 'Abre em tela cheia pela tela inicial e mantém você conectado.';
    passos = en ? ['Tap the <b>⋮</b> menu in Chrome', 'Tap <b>Install app</b> (or <b>Add to Home screen</b>)'] : ['Toque no menu <b>⋮</b> do Chrome', 'Toque em <b>Instalar app</b> (ou <b>Adicionar à tela inicial</b>)'];
  }
  ol.innerHTML = passos.map(function(p){ return '<li>' + p + '</li>'; }).join('');
  ol.style.display = passos.length ? 'block' : 'none';
  bt.style.display = acao ? 'block' : 'none'; bt.textContent = acao; bt.setAttribute('data-modo', modo);
  pu.textContent = en ? 'Not now, create account here' : 'Agora não, criar conta aqui';
  card.style.display = 'block';
}
function aInstSignupAcao(){
  var bt = document.getElementById('aInstAcao'), modo = bt ? bt.getAttribute('data-modo') : '';
  var en = (typeof aLang !== 'undefined' && aLang === 'en');
  if (modo === 'nativo' && aInstEvt) {
    var ev = aInstEvt; aInstEvt = null;
    try { ev.prompt(); ev.userChoice.then(function(c){ if (c && c.outcome === 'accepted') { aInstFeito(); aInstSignupInit(); } }).catch(function(){}); } catch(x) {}
    return;
  }
  var url = location.href.split('#')[0];
  if (modo === 'copiar') {
    try { navigator.clipboard.writeText(url).then(function(){ aToastApp(en ? 'Link copied. Paste it in Safari.' : 'Link copiado. Cole no Safari.'); }); } catch(x) { aToastApp(url); }
    return;
  }
  if (navigator.share) { try { navigator.share({ title: 'MOVH', url: url }).catch(function(){}); } catch(x) {} }
  else aToastApp(en ? 'Tap Share, then Add to Home Screen.' : 'Toque em Compartilhar e depois em Adicionar à Tela de Início.');
}
function aInstSignupPular(){
  try { localStorage.setItem('movh-signup-inst-pular', String(Date.now() + 3 * 86400000)); } catch(x) {}
  var c = document.getElementById('aInstCard'); if (c) c.style.display = 'none';
}

async function aDoLogin(e){
  e.preventDefault(); aHideMsg();
  const email = document.getElementById('aLoginEmail').value.trim();
  const password = document.getElementById('aLoginPassword').value;
  const btn = document.getElementById('aLoginBtn');
  btn.disabled = true; btn.textContent = 'Entrando…';
  try {
    const { data: signInData, error } = await aClient.auth.signInWithPassword({ email, password });
    if (error) { aShowMsg('Erro ao entrar: ' + error.message, 'err'); btn.disabled=false; btn.textContent='Entrar'; return; }
    console.log('[MOVA] Login OK, session:', signInData.session ? 'presente' : 'AUSENTE');
    await aBoot(signInData.session);
  } catch(ex) {
    console.error('[MOVA] Erro inesperado no login:', ex);
    aShowMsg('Erro inesperado: ' + ex.message, 'err');
  }
  btn.disabled=false; btn.textContent='Entrar';
}

async function aDoSignup(e){
  e.preventDefault(); aHideMsg();
  const nome = document.getElementById('aSignupNome').value.trim();
  const email = document.getElementById('aSignupEmail').value.trim();
  const password = document.getElementById('aSignupPassword').value;
  const btn = document.getElementById('aSignupBtn');
  btn.disabled = true; btn.textContent = 'Criando…';
  const { data, error } = await aClient.auth.signUp({ email, password });
  if (error) { aShowMsg('Erro ao criar conta: ' + error.message, 'err'); btn.disabled=false; btn.textContent='Criar conta'; return; }
  if (!data.session) { aShowMsg('Conta criada! Verifique seu email para confirmar.', 'info'); btn.disabled=false; btn.textContent='Criar conta'; return; }
  await aEnsureAlunoRow(data.user, nome, aDiasTesteAtivo);
  await aBoot(data.session);
}

function aLogoutConfirma(){
  const en = (typeof aLang !== 'undefined' && aLang === 'en');
  if (confirm(en ? 'Log out of your account?' : 'Sair da conta?')) aLogout();
}
async function aLogout(){
  await aClient.auth.signOut();
  aAlunoRow = null; aProtocolo = null;
  document.getElementById('treinoScreen').style.display = 'none';
  document.getElementById('authScreen').style.display = 'flex';
}

async function aEnsureAlunoRow(user, nomeSugerido, diasTeste){
  // 1) Tenta achar por auth_id
  const { data: existente, error: err1 } = await aClient.from('alunos').select('*').eq('auth_id', user.id).maybeSingle();
  if (err1) { console.error('[MOVA] alunos/auth_id query error:', err1); }
  if (existente) return existente;

  // 2) Tenta vincular pelo email (aluno criado pelo professor sem auth_id)
  const { data: vinculado, error: err2 } = await aClient.from('alunos')
    .update({ auth_id: user.id })
    .is('auth_id', null)
    .eq('email', user.email)
    .select().maybeSingle();
  if (err2) { console.error('[MOVA] alunos/email update error:', err2); }
  if (vinculado) return vinculado;

  // 3) Tenta ler o professor para criar um registro novo
  const { data: profs, error: err3 } = await aClient.from('professores').select('id').limit(1);
  if (err3) { console.error('[MOVA] professores query error:', err3); }
  if (!profs || profs.length === 0) {
    console.error('[MOVA] Nenhum professor encontrado na tabela professores');
    return null;
  }
  const novoRegistro = { auth_id: user.id, professor_id: profs[0].id, nome: nomeSugerido || user.email, email: user.email };
  // Só aplica prazo de teste em cadastro GENUINAMENTE NOVO (não em vínculo
  // de um aluno que o professor já tinha cadastrado antes) — pra não
  // encurtar sem querer o acesso de alguém que já é aluno pagante e por
  // acaso clicou no link de teste.
  if (diasTeste && diasTeste > 0) {
    const hoje = new Date();
    const fim = new Date(hoje.getTime() + diasTeste*86400000);
    novoRegistro.acesso_inicio = hoje.toISOString().slice(0,10);
    novoRegistro.acesso_fim = fim.toISOString().slice(0,10);
  }
  const { data: criado, error: err4 } = await aClient.from('alunos')
    .insert(novoRegistro)
    .select().maybeSingle();
  if (err4) { console.error('[MOVA] alunos/insert error:', err4); }
  return criado;
}

// grava alunos.ultimo_acesso (no máx. 1x a cada 20 min) pro professor ver em "Atividade recente".
// Silencioso: se a coluna ainda não existe no Supabase, o erro é ignorado.
// grava alunos.app_instalado_em / app_plataforma quando o app é aberto instalado (modo standalone), 1x por aparelho.
// Silencioso: sem as colunas no Supabase o erro é ignorado.
function aRegistrarInstalacao(){
  try {
    if (window._movhPreview || !aAlunoRow || !aAlunoRow.id || !aInstStandalone()) return;
    if (localStorage.getItem('movh-inst-reg') === '1') return;
    var so = aInstSO(), plat = so.ios ? 'ios' : (so.and ? 'android' : 'desktop');
    var q = aClient.from('alunos').update({ app_instalado_em: new Date().toISOString(), app_plataforma: plat }).eq('id', aAlunoRow.id);
    q.then(function(r){ if (r && !r.error) { try { localStorage.setItem('movh-inst-reg', '1'); } catch(x) {} } }, function(){});
  } catch(e){}
}
function aRegistrarAcesso(){
  try { aRegistrarInstalacao(); } catch(e){}
  try {
    if (window._movhPreview || !aAlunoRow || !aAlunoRow.id) return;
    const k = 'movh-ult-acesso';
    const ult = parseInt(localStorage.getItem(k) || '0', 10);
    if (Date.now() - ult < 20 * 60000) return;
    localStorage.setItem(k, String(Date.now()));
    aClient.from('alunos').update({ ultimo_acesso: new Date().toISOString() }).eq('id', aAlunoRow.id).then(function(){}, function(){});
  } catch(e){}
}
function aRegistrarVisto(){
  try {
    if (window._movhPreview || !aAlunoRow || !aAlunoRow.id) return;
    if (!window._movhVistoHook) { window._movhVistoHook = true; document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible') aRegistrarVisto(); }); }
    const k = 'movh-ult-visto';
    const ult = parseInt(localStorage.getItem(k) || '0', 10);
    if (Date.now() - ult < 20 * 60000) return;
    localStorage.setItem(k, String(Date.now()));
    aClient.from('alunos').update({ treino_visto_em: new Date().toISOString() }).eq('id', aAlunoRow.id).then(function(){}, function(){});
  } catch(e){}
}
// Rota pública /coletivas (ou ?coletivas=1): aulas coletivas sem login. O Netlify reescreve
// /coletivas para o index.html (arquivo _redirects do repo do app).
function aEhRotaColetivas(){
  let p = window.location.pathname.toLowerCase();
  while (p.length > 1 && p.charAt(p.length - 1) === '/') p = p.slice(0, -1);
  return p.slice(-10) === '/coletivas' || new URLSearchParams(window.location.search).get('coletivas') === '1';
}
function aBaseApp(){
  const p = window.location.pathname;
  const i = p.toLowerCase().lastIndexOf('/coletivas');
  return (aEhRotaColetivas() && i >= 0) ? (p.slice(0, i) + '/') : p;
}
async function aBootColetivas(){
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('loadingScreen').style.display = 'flex';
  let dados = null, err = null;
  try { const r = await aClient.rpc('get_coletivas_publico'); dados = r.data; err = r.error; } catch(e) { err = e; }
  document.getElementById('loadingScreen').style.display = 'none';
  window._movhPreview = true; window._movhColetivasPublico = true;
  aAlunoRow = { id: null, nome: '', email: '', professor_id: null, mostra_aulas_coletivas: true };
  document.body.classList.add('preview-mode');
  const ph = document.querySelector('#treinoScreen .ph'); if (ph) ph.style.display = 'none';
  ['tDashboard','tSemanaCompleta','tProgresso','tAvaliacaoUpload'].forEach(function(id){ const e = document.getElementById(id); if (e) e.style.display = 'none'; });
  document.getElementById('tColetivas').style.display = 'block';
  document.querySelectorAll('#tColetivas .tBtnVoltar').forEach(function(b){ b.style.display = 'none'; });
  const en = aLang === 'en';
  const btn = document.getElementById('tRegistroBtn');
  if (btn) { btn.textContent = en ? 'Create account' : 'Fazer o registro'; btn.style.display = 'inline-block'; }
  document.getElementById('treinoScreen').style.display = 'block';
  if (!window._movhRelogioIniciado) { window._movhRelogioIniciado = true; try { aIniciarRelogio(); } catch(e) {} }
  const el = document.getElementById('tColetivasConteudo');
  if (err) {
    console.error('[MOVH] Erro ao carregar coletivas:', err);
    el.innerHTML = '<div style="padding:24px 8px;text-align:center;color:var(--t2)">' + (en ? 'Could not load the group classes. Try again in a moment.' : 'Não foi possível carregar as aulas coletivas. Tente novamente em instantes.') + '</div>';
    return;
  }
  aColetivasCache = (dados && typeof dados === 'object') ? dados : {};
  aColetivasSemana = aColetivasSegundaDaSemana(new Date());
  el.innerHTML = aMontarColetivas(aColetivasCache);
}
async function aBoot(sessionParam){
  if (!sessionParam) {
    const tkTreino = new URLSearchParams(window.location.search).get('treino');
    if (tkTreino) { await aBootPreview(tkTreino); return; }
    if (aEhRotaColetivas()) { await aBootColetivas(); return; }
  }
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('loadingScreen').style.display = 'flex';

  let session = sessionParam;
  if (!session) {
    // Link de convite (aluno avulso, sem senha): ?convite=REFRESH_TOKEN
    // restaura a sessão anônima criada pelo professor. Só tenta uma vez —
    // depois de restaurar, limpa da URL (o token já pode ter rotacionado,
    // então não adianta manter ali, e evita reenviar o mesmo token de novo
    // se a página recarregar).
    const params = new URLSearchParams(window.location.search);
    const convite = params.get('convite');
    if (convite) {
      try {
        const { data: refreshed, error: errRefresh } = await aClient.auth.refreshSession({ refresh_token: convite });
        if (!errRefresh && refreshed && refreshed.session) session = refreshed.session;
        else console.error('[MOVA] Falha ao restaurar convite:', errRefresh);
      } catch(e) { console.error('[MOVA] Erro ao restaurar convite:', e); }
      // limpa o token da URL independente do resultado — não fica exposto
      // no histórico do navegador nem se reenvia sozinho num reload
      params.delete('convite');
      const novaUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState({}, '', novaUrl);
    }
  }
  if (!session) {
    // fallback: carregamento inicial (página aberta sem login recente)
    const { data } = await aClient.auth.getSession();
    session = data.session;
  }
  if (!session) {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('authScreen').style.display = 'flex';
    aCheckBemVindo();
    aCheckTeste();
    return;
  }

  aAlunoRow = await aEnsureAlunoRow(session.user, session.user.email);
  console.log('[MOVA] aBoot — session.user.id:', session.user.id, '| email:', session.user.email, '| aAlunoRow:', aAlunoRow);
  if (!aAlunoRow) {
    document.getElementById('loadingScreen').style.display = 'none';
    // Diagnóstico: verifica se o problema é RLS bloqueando a leitura
    const { data: testRow, error: testErr } = await aClient.from('alunos').select('id,ativo').eq('email', session.user.email).maybeSingle();
    console.error('[MOVA] Diagnóstico alunos por email:', testRow, testErr);
    let msg = 'Cadastro de aluno não encontrado para ' + session.user.email + '.';
    if (testErr) msg += ' Erro de permissão (RLS): ' + testErr.message;
    else if (!testRow) msg += ' Verifique se seu email foi cadastrado pelo professor.';
    aShowMsg(msg, 'err');
    document.getElementById('authScreen').style.display = 'flex';
    return;
  }

  // Acesso bloqueado pelo professor
  if (aAlunoRow.ativo === false) {
    document.getElementById('loadingScreen').style.display = 'none';
    aShowMsg('Seu acesso está temporariamente bloqueado. Entre em contato com seu professor para liberar o acesso.', 'err');
    document.getElementById('authScreen').style.display = 'flex';
    await aClient.auth.signOut();
    return;
  }

  aRegistrarAcesso();

  // Verificar período de acesso (acesso_fim)
  if (aAlunoRow.acesso_fim) {
    const fim = new Date(aAlunoRow.acesso_fim + 'T23:59:59');
    if (new Date() > fim) {
      document.getElementById('loadingScreen').style.display = 'none';
      await aClient.auth.signOut();
      aShowTelARenovar(fim);
      return;
    }
    // Banner aviso 7 dias antes
    const diasRestantes = Math.ceil((fim - new Date()) / (1000 * 60 * 60 * 24));
    if (diasRestantes <= 7) { window._movhAvisoRenovar = diasRestantes; }
  }

  // Verificar Anamnese (obrigatória no 1º acesso)
  // v60.2: as 7 consultas rodam em paralelo (antes eram em sequência); as não críticas falham em silêncio
  const _sf = function(p){ return Promise.resolve(p).then(function(r){ return r || { data: null }; }, function(){ return { data: null }; }); };
  const [_rAn, _rPr, _rRg, _rRp, _rTe, _rEx, _rAv] = await Promise.all([
    aClient.from('anamneses')
    .select('id, tipo, respostas, solicitado_em')
    .eq('aluno_id', aAlunoRow.id)
    .order('criado_em', { ascending: false }),
    aClient.from('protocolos')
    .select('*')
    .eq('aluno_id', aAlunoRow.id)
    .eq('ativo', true)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle(),
    aClient.from('registros_sessao')
    .select('exercicio_nome, carga, reps, data_sessao, criado_em')
    .eq('aluno_id', aAlunoRow.id)
    .order('criado_em', { ascending: false })
    .limit(1000),
    _sf(aClient.from('rpe_sessoes')
      .select('rpe').eq('aluno_id', aAlunoRow.id)
      .order('criado_em', { ascending: false }).limit(1).maybeSingle()),
    _sf(aClient.from('testes_fisicos')
    .select('padrao_movimento, exercicio_nome, valor, unidade, distancia_km, observacoes, data')
    .eq('aluno_id', aAlunoRow.id)
    .order('data', { ascending: true })),
    _sf(aClient.from('exercicios')
    .select('nome, padrao_movimento, percentual_rm, url')
    .eq('professor_id', aAlunoRow.professor_id)),
    _sf(aClient.from('avaliacoes_fisicas')
    .select('id, status, data_avaliacao, diagnostico, achados, composicao, medidas, created_at')
    .eq('aluno_id', aAlunoRow.id)
    .order('created_at', { ascending: false }))
  ]);
  const { data: anamneses } = _rAn;
  // IMPORTANTE: considera apenas a anamnese MAIS RECENTE (anamneses já vem ordenado
  // desc por criado_em). Usar .some() aqui é o bug que fazia uma anamnese antiga já
  // respondida "esconder" uma nova solicitação do professor (respostas: null) — o
  // aluno nunca via o formulário de novo porque .some() achava a resposta antiga.
  const ultimaAnamnese = anamneses && anamneses.find(x => x.tipo === 'anamnese');
  const anamneseFeita = !!(ultimaAnamnese && ultimaAnamnese.respostas);
  const parqPendente = anamneses && anamneses.find(x => x.tipo === 'parq' && !x.respostas);
  const anamneseRec = anamneses && anamneses.find(x => x.tipo === 'anamnese' && x.respostas);
  window._aInteresseCorrida = anamneseRec ? (anamneseRec.respostas.interesse_corrida || (anamneseRec.respostas.pratica_corrida === 'nao' ? 'nao' : '')) : '';

  // Se nunca fez anamnese → mostrar tela de anamnese ANTES do treino
  if (!anamneseFeita) {
    document.getElementById('loadingScreen').style.display = 'none';
    aShowAnamnese();
    return;
  }

  // Se há PAR-Q pendente → mostrar PAR-Q antes do treino
  if (parqPendente) {
    document.getElementById('loadingScreen').style.display = 'none';
    aShowParq(parqPendente.id);
    return;
  }

  const { data: proto, error: protoErr } = _rPr;

  document.getElementById('loadingScreen').style.display = 'none';

  if (protoErr || !proto) {
    document.getElementById('treinoScreen').style.display = 'block';
    document.getElementById('tAlunoNome').textContent = aAlunoRow.nome;
    document.getElementById('tProtoNome').textContent = aT('nenhum_protocolo');
    document.getElementById('tProtoDesc').textContent = aT('nenhum_protocolo_desc');
    return;
  }

  aProtocolo = proto;

  // busca o histórico de registros do aluno: usado para (a) pré-preencher o
  // campo de carga com a ÚLTIMA salva, (b) calcular a carga BASELINE (a
  // primeira que o aluno registrou) que serve de ponto de partida pra
  // projetar a carga sugerida nas fases seguintes, e (c) alimentar a tela
  // de progresso (histórico completo por exercício).
  const { data: registros } = _rRg;

  aTodosRegistros = (registros || []).slice().reverse(); // veio do mais novo para o mais antigo (limite 1000)
  aUltimaCargaPorExercicio = {};
  aBaselineCargaPorExercicio = {};
  aTodosRegistros.forEach(r => {
    if (!r.exercicio_nome || r.carga == null) return;
    // ascendente: o primeiro que aparece pra cada exercício é o mais antigo (baseline)
    if (!aBaselineCargaPorExercicio[r.exercicio_nome]) {
      aBaselineCargaPorExercicio[r.exercicio_nome] = r;
    }
    // sempre sobrescreve, então no fim sobra o mais recente (última carga)
    aUltimaCargaPorExercicio[r.exercicio_nome] = r;
  });

  // RPE (1-10) da última sessão concluída — usado como multiplicador leve na
  // sugestão de volume/descanso da fase (ver aFatorRPE). Puramente informal:
  // não substitui a fase, só afina pra cima/baixo com base em como a última
  // sessão realmente foi sentida.
  try {
    const ultRpe = (_rRp && _rRp.data) || null;
    aUltimoRPE = ultRpe ? ultRpe.rpe : null;
  } catch(e) { aUltimoRPE = null; }

  // testes de RM/condicionamento lançados pelo professor ou pelo aluno
  // (alimenta a seção "🏋️ Meus Testes" e a sugestão de carga por padrão de
  // movimento, dentro da tela de progresso)
  const { data: testes } = _rTe;
  aTestesFisicos = testes || [];

  // metadados dos exercícios do banco do professor (padrão de movimento,
  // % do teste de referência e url do vídeo) — a url também alimenta o
  // fallback de vídeo quando o bloco não tem b.exercicios[].url preenchido
  // direto (ex: treinos digitados/colados a partir de PDF, que só têm o
  // nome do exercício — sem isso o botão ▶ simplesmente não aparecia).
  const { data: exMeta } = _rEx;
  aExerciciosMeta = {};
  aExVideoMap = {};
  (exMeta || []).forEach(e => {
    if (e.padrao_movimento && e.percentual_rm != null) aExerciciosMeta[e.nome] = e;
    if (e.url) aExVideoMap[e.nome] = e.url;
  });

  // Avaliações físicas/posturais — só o status/pedido por enquanto (a
  // ferramenta de captura ainda não está integrada ao app do aluno)
  const { data: avals } = _rAv;
  aAvaliacoesFisicas = avals || [];

  aRenderProtocolo(proto);
  try { aCaminhoCarregar(); } catch (e) {}
  try { aPrimeiroTreino(); } catch (e) {}
}

function aEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function aAttr(s){ return aEsc(s); }
function aEhAtiv(b){ if(b && b.ativacao===true) return true; var n=String((b&&b.nome)||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(); return /^(ativacao|aquecimento|mobilidade|preparacao)(?![a-z])/.test(n); }
function aEmbedUrl(url){ if(!url) return ''; const m=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?\/]+)/); return m ? 'https://www.youtube-nocookie.com/embed/'+m[1] : ''; }

// Converte formatos compactos de série/reps (ex: "3x12", "4×[6-10→10-12→4-6]")
// num texto mais didático pro aluno (ex: "3 séries — 12 repetições"), no
// idioma atual do protocolo (aLang). Em formatos que não reconhece, devolve
// o texto original sem quebrar nada.
function aFormatarSeries(raw){
  if (!raw) return '';
  const s = String(raw).trim();
  const lblSeries = (n) => n === '1' ? aT('serie') : aT('series');
  const lblReps = aT('repeticoes');
  const ate = aT('ate');

  // Caso 1: "3x12" ou "3×12" ou "3 x 12" → "3 séries — 12 repetições"
  let m = s.match(/^(\d+)\s*[x×]\s*(\d+)$/i);
  if (m) {
    const [, series, reps] = m;
    return series + ' ' + lblSeries(series) + ' — ' + reps + ' ' + lblReps;
  }

  // Caso 2: "3x10-12" ou "3×10-12" → "3 séries — 10 a 12 repetições"
  m = s.match(/^(\d+)\s*[x×]\s*(\d+)\s*-\s*(\d+)$/i);
  if (m) {
    const [, series, repMin, repMax] = m;
    return series + ' ' + lblSeries(series) + ' — ' + repMin + ' ' + ate + ' ' + repMax + ' ' + lblReps;
  }

  // Caso 3: "4×[6-10→10-12→4-6]" (progressão por etapa dentro da série) →
  // "4 séries — 6 a 10 / 10 a 12 / 4 a 6 repetições"
  m = s.match(/^(\d+)\s*[x×]\s*\[([^\]]+)\]$/i);
  if (m) {
    const [, series, etapas] = m;
    const etapasFormatadas = etapas.split('→').map(e => {
      const em = e.trim().match(/^(\d+)\s*-\s*(\d+)$/);
      return em ? em[1] + ' ' + ate + ' ' + em[2] : e.trim();
    }).join(' / ');
    return series + ' ' + lblSeries(series) + ' — ' + etapasFormatadas + ' ' + lblReps;
  }

  // Caso 4: "N×<resto>" genérico — cobre formatos como "3×10 cada", "3×1min",
  // "3×30s", "5×submáximo 70%", "3×máx". Em vez de devolver tudo cru, ao
  // menos formata o "N séries —" e preserva o resto exatamente como foi
  // escrito (não tenta adivinhar se é tempo, %, texto etc).
  m = s.match(/^(\d+)\s*[x×]\s*(.+)$/i);
  if (m) {
    const [, series, resto] = m;
    return series + ' ' + lblSeries(series) + ' — ' + resto.trim();
  }

  // Formato não reconhecido (sem nenhum "x"/"×", ex: "AMRAP", "Máx reps"):
  // devolve como veio, sem quebrar
  return s;
}

// Projeta uma carga sugerida pro exercício, cruzando com a fase vigente do
// mesociclo. Duas origens possíveis:
//  1) 'progressao' — o aluno já registrou carga própria nesse exercício antes:
//     usa a BASELINE (primeiro registro) ajustada pelo fator da fase atual.
//  2) 'padrao_movimento' — o aluno NUNCA registrou esse exercício, mas ele
//     tem %RM configurado pelo professor em relação a um padrão de movimento
//     (ex: Leg Press = 140% do Back Squat): usa o teste de referência mais
//     recente daquele padrão × o % configurado, também ajustado pela fase.
// É sempre só uma referência — o aluno pode digitar o que sentir que é certo.
// Ajustes por fase (mesma linha dos % de carga já usados nos cards de fase):
//   Base: mantém perto da referência (foco é consolidar volume)
//   Intensificação: referência + 7%
//   Densidade: mantém referência (foco é reduzir descanso, não subir peso)
//   Deload: referência − 35% (recuperação)
const COND_AJUSTE_FASE = { base: 1.0, intensificacao: 1.07, densidade: 1.0, deload: 0.65 };

// ── Progressão automática de VOLUME (séries×reps) e DESCANSO por fase ──
// Mesma lógica do editor do professor (ver VOLUME_AJUSTE_FASE/sugestaoVolumeFase
// no Gerador) — replicada aqui pro app do aluno. Puramente informativo: não
// altera o que o professor digitou em série/descanso, só sugere um alvo pra
// fase vigente do mesociclo.
const A_VOLUME_AJUSTE_FASE = {
  base:           { sets: 0,  repMinF: 1.0,  repMaxF: 1.0,  restF: 1.0  },
  intensificacao: { sets: 0,  repMinF: 0.85, repMaxF: 0.85, restF: 1.2  },
  densidade:      { sets: 0,  repMinF: 1.0,  repMaxF: 1.0,  restF: 0.65 },
  deload:         { sets: -1, repMinF: 1.15, repMaxF: 1.15, restF: 1.15 }
};
function aParseSeriesSimples(txt){
  const m = String(txt||'').trim().match(/^(\d+)\s*[x×X]\s*(\d+)(?:\s*[-–a]\s*(\d+))?\s*$/);
  if (!m) return null;
  const sets = parseInt(m[1]);
  const repMin = parseInt(m[2]);
  const repMax = m[3] ? parseInt(m[3]) : repMin;
  return { sets, repMin, repMax };
}
function aFormatSeriesSimples(p){
  return p.sets + '×' + (p.repMin === p.repMax ? p.repMin : p.repMin + '-' + p.repMax);
}
function aParseRestSegundos(txt){
  const s = String(txt||'').trim();
  if (!s) return null;
  let min = 0, sec = 0, achou = false;
  const mm = s.match(/(\d+)\s*'/); if (mm) { min = parseInt(mm[1]); achou = true; }
  const ss = s.match(/(\d+)\s*"/) || s.match(/'\s*(\d+)/); if (ss) { sec = parseInt(ss[1]); achou = true; }
  if (!achou) {
    const mMin = s.match(/(\d+)\s*(min|m)\b/i); if (mMin) { min = parseInt(mMin[1]); achou = true; }
    const mSeg = s.match(/(\d+)\s*(s|seg)\b/i); if (mSeg) { sec = parseInt(mSeg[1]); achou = true; }
    if (!achou) { const mNum = s.match(/^(\d+)$/); if (mNum) { sec = parseInt(mNum[1]); achou = true; } }
  }
  if (!achou) return null;
  const total = min*60 + sec;
  return total > 0 ? total : null;
}
function aFormatRestSegundos(totalSeg){
  totalSeg = Math.max(10, Math.round(totalSeg/5)*5);
  const min = Math.floor(totalSeg/60), sec = totalSeg%60;
  if (min === 0) return sec + 's';
  if (sec === 0) return min + "'";
  return min + "'" + String(sec).padStart(2,'0') + '"';
}
// Progressão DENTRO do mesociclo (step loading): a cada semana que passa
// dentro da mesma fase, sobe um pouco a intensidade/descanso (mais perto de
// falha, mais fadiga acumulada); na última semana do bloco (se ele tiver 3+
// semanas) faz um "step-back" — reduz 1 série e alivia um pouco, preparando
// a transição pra próxima fase. Fase 'deload' já é o alívio, não reduz de novo.
function aFatorSemanaDentroFase(semanaDentroFase, duracaoSemanas, faseKey){
  duracaoSemanas = duracaoSemanas || 4;
  semanaDentroFase = Math.min(Math.max(semanaDentroFase || 1, 1), duracaoSemanas);
  if (faseKey === 'deload' || faseKey === 'base') return { sets: 0, repF: 1.0, restF: 1.0 }; // base = progressão dupla (carga sobe pelo registro, não por fator de reps/descanso)
  const ultimaSemana = semanaDentroFase === duracaoSemanas && duracaoSemanas >= 3;
  if (ultimaSemana) return { sets: -1, repF: 1.08, restF: 1.10 };
  const passo = semanaDentroFase - 1; // 0 na semana 1, 1 na semana 2...
  return { sets: 0, repF: Math.max(0.85, 1 - passo * 0.04), restF: 1 + passo * 0.05 };
}
// Multiplicador leve baseado no RPE (1-10) que o aluno reportou na ÚLTIMA
// sessão concluída. Não reformula o treino — só afina um pouco a sugestão:
// sessão anterior muito puxada (RPE 9-10) alivia um pouco a próxima; sessão
// anterior fácil demais (RPE ≤4) aperta um pouco. Entre 5-8 não mexe (zona
// esperada de esforço, sem ajuste).
function aFatorRPE(ultimoRPE){
  if (ultimoRPE == null) return { repF: 1.0, restF: 1.0 };
  if (ultimoRPE >= 9) return { repF: 1.06, restF: 1.08 };
  if (ultimoRPE <= 4) return { repF: 0.97, restF: 0.95 };
  return { repF: 1.0, restF: 1.0 };
}
function aSugestaoVolumeFase(seriesTxt, restTxt, faseKey, semanaDentroFase, duracaoSemanas){
  const ajuste = A_VOLUME_AJUSTE_FASE[faseKey];
  if (!ajuste) return null;
  const p = aParseSeriesSimples(seriesTxt);
  if (!p) return null;
  const semFator = aFatorSemanaDentroFase(semanaDentroFase, duracaoSemanas, faseKey);
  const rpeFator = aFatorRPE(aUltimoRPE);
  const sets = Math.max(Math.min(2, p.sets), p.sets + ajuste.sets + semFator.sets);
  const repMin = Math.max(1, Math.round(p.repMin * ajuste.repMinF * semFator.repF * rpeFator.repF));
  const repMax = Math.max(repMin, Math.round(p.repMax * ajuste.repMaxF * semFator.repF * rpeFator.repF));
  const seriesSug = aFormatSeriesSimples({ sets, repMin, repMax });
  const restSeg = aParseRestSegundos(restTxt);
  const restSug = restSeg ? aFormatRestSegundos(restSeg * ajuste.restF * semFator.restF * rpeFator.restF) : null;
  return { series: seriesSug, rest: restSug };
}

// Acha o teste de RM mais recente (em kg) pra um padrão de movimento — usado
// só como referência pra sugerir carga INICIAL em exercícios que o aluno
// nunca registrou (ver aCargaSugerida). Ignora testes em reps/tempo, porque
// não dá pra derivar uma carga em kg a partir deles com segurança.
function aUltimoTesteKgPorPadrao(padraoId){
  const info = aPadraoInfo(padraoId);
  if (!info) return null;
  const doPadrao = aTestesFisicos.filter(t => t.padrao_movimento === info.label && t.unidade === 'kg' && t.valor != null);
  if (!doPadrao.length) return null;
  return doPadrao[doPadrao.length - 1]; // aTestesFisicos vem ordenado ascendente por data
}

function aCargaSugerida(nomeExercicio, faseAtual){
  const fator = faseAtual ? COND_AJUSTE_FASE[faseAtual] : 1.0;
  const baseline = aBaselineCargaPorExercicio[nomeExercicio];
  if (baseline && baseline.carga != null && faseAtual && fator != null) {
    const valor = Math.round(baseline.carga * fator * 2) / 2; // arredonda pra 0.5kg
    return { valor, baseline: baseline.carga, origem: 'progressao' };
  }
  // sem histórico próprio ainda: tenta sugerir a partir do %RM do padrão de
  // movimento do exercício, cruzado com o teste de referência do aluno
  const meta = aExerciciosMeta[nomeExercicio];
  if (!meta) return null;
  const teste = aUltimoTesteKgPorPadrao(meta.padrao_movimento);
  if (!teste) return null;
  const base = teste.valor * (meta.percentual_rm / 100);
  const valor = Math.round(base * (fator || 1.0) * 2) / 2;
  return { valor, baseline: teste.valor, origem: 'padrao_movimento', padraoLabel: aPadraoInfo(meta.padrao_movimento)?.label, refExercicio: teste.exercicio_nome };
}

// ── Cronômetro de descanso ──
// Ao clicar no badge "⏱ descanso", inicia uma contagem em segundo plano —
// usa um TIMESTAMP de término real (não um contador decrescente ingênuo),
// então mesmo que o navegador atrase os ticks do setInterval enquanto o
// aluno está em outro app, o tempo mostrado sempre recalcula certo assim
// que a tela volta. A notificação (Notification API) é best-effort: com o
// site aberto numa aba em segundo plano ela dispara normalmente na entrada
// dos celulares mais comuns, mas isso NÃO é uma push notification de
// verdade — se o navegador for fechado por completo ou o sistema suspender
// a aba, o aviso pode não disparar. Funciona bem pro uso típico (trocar de
// app rapidinho, tela travada por pouco tempo).
let aDescansoTimer = null;
let aDescansoInterval = null;
let aDescansoTimeout = null;
function aParseTempoParaSegundos(txt){
  if (!txt) return null;
  txt = String(txt).trim();
  let m = txt.match(/(\d+)\s*['´]\s*(\d+)?/);
  if (m) return parseInt(m[1],10)*60 + (m[2]?parseInt(m[2],10):0);
  m = txt.match(/(\d+)\s*:\s*(\d+)/);
  if (m) return parseInt(m[1],10)*60 + parseInt(m[2],10);
  m = txt.match(/(\d+)\s*s/i);
  if (m) return parseInt(m[1],10);
  m = txt.match(/^(\d+)$/);
  if (m) return parseInt(m[1],10);
  return null;
}
let aAudioCtxDescanso = null;
let aSeriesFeitas = {}; // eid -> séries contadas (toque no badge de séries); guardado por dia no aparelho
function aSeriesChaveHoje(){ const h=new Date(); return 'movh-series-'+h.getFullYear()+'-'+(h.getMonth()+1)+'-'+h.getDate(); }
(function aSeriesCarregar(){ try { const raw = localStorage.getItem(aSeriesChaveHoje()); if (raw) aSeriesFeitas = JSON.parse(raw) || {}; } catch(e){} })();
function aSeriesSalvar(){ if (window._movhPreview) return; try { localStorage.setItem(aSeriesChaveHoje(), JSON.stringify(aSeriesFeitas)); } catch(e){} }
function aIniciarDescanso(txtOriginal, nomeExercicio, eid){
  const segundos = aParseTempoParaSegundos(txtOriginal);
  if (!segundos || segundos <= 0) { aToastApp(aLang==='en' ? "Couldn't read this rest time." : 'Não consegui entender esse tempo de descanso.'); return; }
  if ('Notification' in window && Notification.permission === 'default') {
    try { Notification.requestPermission(); } catch(e){}
  }
  // Cria o AudioContext aqui, no clique (gesto do usuário) — navegadores
  // bloqueiam áudio iniciado fora de uma interação direta, então criar isso
  // só depois, dentro do setTimeout do final da contagem, não tocaria nada.
  try { aAudioCtxDescanso = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ aAudioCtxDescanso = null; }
  aDescansoTimer = { fim: Date.now() + segundos*1000, nome: nomeExercicio || '', eid: eid || null };
  aDescansoAgendarNotificacao();
  aMontarWidgetDescanso();
}
// Toque no badge de séries: conta uma série feita (0/3 → 1/3 → 2/3 → 3/3) e
// preenche o fundo do badge aos poucos. Com tudo feito, o próximo toque zera
// (serve de "desfazer" se o aluno contou a mais).
function aSeriesAtualizarUI(eid){
  const badge = document.getElementById(eid + '-series-badge');
  if (!badge) return;
  const total = parseInt(badge.dataset.total, 10) || 0;
  const feitas = Math.min(aSeriesFeitas[eid] || 0, total || (aSeriesFeitas[eid] || 0));
  const contTxt = document.getElementById(eid + '-series-count');
  if (contTxt) contTxt.textContent = (total && feitas >= total ? '✓ ' : '') + feitas + (contTxt.classList.contains('sx-cnt') ? '/' : '/' + total);
  badge.style.setProperty('--fill', (total ? Math.min(100, (feitas/total)*100) : 0) + '%');
  const rg = document.getElementById(eid + '-ring'); if (rg) rg.style.setProperty('--p', (total ? Math.min(100, (feitas/total)*100) : 0) + '%');
  badge.classList.toggle('ec-chip-completo', !!total && feitas >= total);
  const card = document.getElementById(eid);
  if (card) aAtualizarBlocoProgresso(card.closest('.bloco'));
}
// Série <-> exercício feito: completar N/N marca o exercício como feito; voltar
// o contador (ou desmarcar o check) desfaz. Marcar o check manualmente completa
// as séries. O bloco acompanha pelo estado dos exercícios.
function aSeriesSync(eid, done){
  const badge = document.getElementById(eid + '-series-badge');
  if (!badge) return;
  const total = parseInt(badge.dataset.total, 10) || 0;
  if (!total) return;
  aSeriesFeitas[eid] = done ? total : 0;
  aSeriesSalvar();
  aSeriesAtualizarUI(eid);
}
function aMarcarFeito(eid, done){
  const btn = document.getElementById(eid + '-done');
  if (!btn || btn.checked === done) return;
  btn.checked = done;
  aToggleDone(eid, true);
}
function aContarSerieConcluida(eid){
  if (!eid) return;
  const badge = document.getElementById(eid + '-series-badge');
  const total = badge ? (parseInt(badge.dataset.total, 10) || 0) : 0;
  const atual = aSeriesFeitas[eid] || 0;
  aSeriesFeitas[eid] = (total && atual >= total) ? 0 : atual + 1;
  aSeriesSalvar();
  aSeriesAtualizarUI(eid);
  if (total) {
    if (aSeriesFeitas[eid] >= total) aMarcarFeito(eid, true);
    else if (atual >= total) aMarcarFeito(eid, false);
  }
  if (aDicaSeriesAtiva()) aDicaSeriesFechar();
  if (!badge) return;
  if (navigator.vibrate) { try { navigator.vibrate(aSeriesFeitas[eid] ? 15 : [10,40,10]); } catch(e){} }
  badge.classList.remove('ec-series-pulse'); void badge.offsetWidth; badge.classList.add('ec-series-pulse');
  setTimeout(function(){ badge.classList.remove('ec-series-pulse'); }, 500);
  if (aSeriesFeitas[eid] > atual) {
    const fim = total && aSeriesFeitas[eid] >= total;
    if (fim) aScrollProximo(eid);
    if (!(fim && !aProximoPendente(eid))) aAutoDescanso(eid);
  }
}
function aProximoPendente(eid){
  const todos = [].slice.call(document.querySelectorAll('.ec'));
  const i = todos.findIndex(function(x){ return x.id === eid; });
  for (let k = i + 1; k < todos.length; k++) { if (!todos[k].classList.contains('done')) return todos[k]; }
  return null;
}
// ao tocar numa série, já inicia o cronômetro de descanso do exercício
// (desligável: localStorage movh-autotimer = 0). Fora do modo prévia.
function aAutoDescanso(eid){
  if (window._movhPreview) return;
  try { if (localStorage.getItem('movh-autotimer') === '0') return; } catch(e){}
  const chip = document.querySelector('.ec-chip-clicavel[data-eid="' + eid + '"]');
  if (chip) aIniciarDescanso(chip.dataset.tempo, chip.dataset.nome, eid);
}
// exercício concluído: abre o bloco do próximo pendente e rola até ele
function aScrollProximo(eid){
  const nx = aProximoPendente(eid);
  if (!nx) return;
  const bl = nx.closest('.bloco');
  if (bl) { const body = document.getElementById(bl.id.replace('bloco-','')); if (body && body.style.display === 'none') { body.style.display = 'block'; const ar = bl.querySelector('.bh .bt-arr'); if (ar) ar.style.transform = 'rotate(0deg)'; } }
  setTimeout(function(){ try { nx.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e){} }, 650);
}
// blocos começam ABERTOS; recolhem sozinhos ao concluir (ver aToggleDone / aBlocoToggleDone)
function aConfete(){
  const cores = ['#7C6FE0','#E3A82B','#1A9E72','#D45828','#3580D8','#E0457B'];
  for (let i = 0; i < 46; i++) {
    const p = document.createElement('i'); p.className = 'cf-p';
    p.style.left = (Math.random() * 100) + 'vw';
    p.style.background = cores[i % cores.length];
    p.style.animationDuration = (1.6 + Math.random() * 1.6) + 's';
    p.style.animationDelay = (Math.random() * 0.4) + 's';
    p.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
    document.body.appendChild(p);
    setTimeout(function(el){ el.remove(); }, 3800, p);
  }
}
async function aStreakSemana(){
  if (window._movhPreview || !aAlunoRow) return;
  try {
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    await new Promise(function(r){ setTimeout(r, 1800); });
    const res = await aClient.from('rpe_sessoes').select('criado_em').eq('aluno_id', aAlunoRow.id).gte('criado_em', d.toISOString());
    const dias = new Set((res.data || []).map(function(x){ return String(x.criado_em).slice(0,10); }));
    const n = dias.size; if (!n) return;
    const t = document.querySelector('#movh-sessao-overlay .sc-titulo'); if (!t || document.getElementById('sc-streak')) return;
    const el = document.createElement('div'); el.id = 'sc-streak'; el.className = 'sc-streak';
    el.textContent = aLang === 'en' ? ('🔥 ' + n + ' workout' + (n > 1 ? 's' : '') + ' this week') : ('🔥 ' + n + (n > 1 ? ' treinos' : ' treino') + ' nesta semana');
    t.insertAdjacentElement('afterend', el);
  } catch(e){}
}
// progresso do bloco: exercícios feitos contam 1, os em andamento contam a fração de séries
function aAtualizarBlocoProgresso(bloco){
  if (!bloco) return;
  const cards = [...bloco.querySelectorAll('.ec')];
  if (!cards.length) return;
  let soma = 0, feitos = 0;
  cards.forEach(function(c){
    if (c.classList.contains('done')) { soma += 1; feitos += 1; return; }
    const b = document.getElementById(c.id + '-series-badge');
    const t = b ? (parseInt(b.dataset.total, 10) || 0) : 0;
    if (t) soma += Math.min(1, (aSeriesFeitas[c.id] || 0) / t);
  });
  const bh = bloco.querySelector('.bh');
  if (bh) bh.style.setProperty('--bp', Math.round(soma / cards.length * 100) + '%');
  const bid = bloco.id.replace('bloco-', '');
  const pill = document.getElementById('bp-' + bid);
  if (pill) pill.textContent = feitos + '/' + cards.length;
}

// ── Modo exercício (tela de foco: séries, carga, descanso, vídeo) ──
let aXoEid = null, aXoTimer = null, aXoVid = false, aXoPlay = false;
function aXoInfo(eid){
  const card = document.getElementById(eid);
  if (!card) return null;
  const bd = document.getElementById(eid + '-series-badge');
  const total = bd ? (parseInt(bd.dataset.total, 10) || 0) : 0;
  const n = card.querySelector('.ec-n');
  const nome = n && n.firstChild ? String(n.firstChild.textContent || '').trim() : '';
  const bs = card.querySelectorAll('.sx-c b');
  const reps = bs.length > 1 ? bs[1].textContent : '';
  const ch = card.querySelector('.ec-chip-clicavel');
  const vb = card.querySelector('.vbtn');
  return { card: card, total: total, nome: nome, reps: reps, rest: ch ? ch.dataset.tempo : '', emb: vb ? vb.dataset.emb : '', sh: !!(vb && vb.dataset.sh == 1) };
}
function aXoBarraProximo(){
  const box = document.getElementById('aXoNext');
  if (!box) return;
  const todos = [].slice.call(document.querySelectorAll('#tDashConteudo .ec'));
  const prox = todos.find(function(c){ return !c.classList.contains('done'); });
  if (!prox || !todos.length || document.getElementById('aXi')) { box.style.display = 'none'; box.innerHTML = ''; document.body.classList.remove('xo-bar'); return; }
  todos.forEach(function(c){ c.classList.toggle('ec-prox', c === prox); });
  const cont = document.getElementById('tDashConteudo');
  const bAtual = prox.closest ? prox.closest('.bloco') : null;
  if (cont && bAtual && !cont.querySelector('.bloco[data-foco]')) {
    cont.querySelectorAll('.bloco').forEach(function(b){
      b.setAttribute('data-foco', '1');
      if (b === bAtual) return;
      const corpo = b.querySelector('.exl'), seta = b.querySelector('.bt-arr');
      if (corpo) corpo.style.display = 'none';
      if (seta) seta.style.transform = 'rotate(-90deg)';
    });
  } else if (window._aXoUlt && window._aXoUlt !== prox.id) {
    try { prox.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch(e) {}
  }
  window._aXoUlt = prox.id;
  const i = aXoInfo(prox.id);
  const ult = aUltimaCargaPorExercicio[i.nome];
  const sub = (ult && ult.carga != null) ? ((aLang==='en'?'last load ':'última carga ') + ult.carga + ' kg') : (i.total ? i.total + ' ' + (aLang==='en'?'sets':'séries') : '');
  box.innerHTML = '<div class="xn-t"><i class="xn-l">' + (aLang==='en'?'Next':'Próximo') + '</i><b>' + aEsc(i.nome) + '</b><span>' + aEsc(sub) + '</span></div><button class="xo-btn" data-eid="' + prox.id + '" onclick="aXoAbrir(this.dataset.eid)">' + (aLang==='en'?'Start':'Iniciar') + '</button>';
  box.style.display = 'flex';
  document.body.classList.add('xo-bar');
}
// Modo exercício INLINE: abre dentro do próprio cartão (sem tela separada)
function aXoAbrir(eid){
  const card = document.getElementById(eid);
  if (!card) return;
  aXoEid = eid;
  const body = card.closest('.exl');
  if (body && body.style.display === 'none') {
    body.style.display = 'block';
    const bl = card.closest('.bloco'); const arr = bl ? bl.querySelector('.bh .bt-arr') : null;
    if (arr) arr.style.transform = 'rotate(0deg)';
  }
  aXoRender();
  aXoBarraProximo();
  try { card.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch(e){}
  if (aDicaSeriesAtiva()) aDicaSeriesFechar();
}
function aXoFechar(){
  const el = document.getElementById('aXi');
  if (el) el.remove();
  document.querySelectorAll('.ec.xi-open').forEach(function(c){ c.classList.remove('xi-open'); });
  aXoEid = null;
  aXoBarraProximo();
}
function aXoRender(){
  const i = aXoEid ? aXoInfo(aXoEid) : null;
  if (!i) { aXoFechar(); return; }
  document.querySelectorAll('.ec.xi-open').forEach(function(c){ if (c !== i.card) c.classList.remove('xi-open'); });
  i.card.classList.add('xi-open');
  let el = document.getElementById('aXi');
  if (!el) { el = document.createElement('div'); el.id = 'aXi'; el.className = 'xi'; }
  if (el.parentNode !== i.card) i.card.appendChild(el);
  const tot = i.total || 1;
  const feitas = Math.min(aSeriesFeitas[aXoEid] || 0, tot);
  const completo = feitas >= tot;
  let dots = '';
  for (let n = 1; n <= tot; n++) {
    dots += '<button class="xo-dot' + (n <= feitas ? ' on' : (n === feitas + 1 ? ' cur' : '')) + '" data-n="' + n + '" onclick="aXoDot(this.dataset.n)">' + (n <= feitas ? '✓' : n) + '</button>';
  }
  const ult = aUltimaCargaPorExercicio[i.nome];
  let rec = 0;
  (aTodosRegistros || []).forEach(function(r){ if (r.exercicio_nome === i.nome && r.carga != null && r.carga > rec) rec = r.carga; });
  const cin = document.getElementById(aXoEid + '-carga');
  let carga = cin && cin.value !== '' ? cin.value : '';
  if (carga === '' && ult && ult.carga != null) { carga = String(ult.carga); aXoGravarCarga(carga); }
  const info = [ (ult && ult.carga != null) ? ((aLang==='en'?'Last time ':'Última vez ') + ult.carga + ' kg') : '', rec ? ('🏆 ' + (aLang==='en'?'best ':'recorde ') + rec + ' kg') : '' ].filter(Boolean).join(' · ');
  const rotulo = completo ? (aLang==='en'?'Next exercise':'Próximo exercício') : ((aLang==='en'?'Finish set ':'Concluir série ') + (feitas + 1));
  el.innerHTML =
    '<div class="xi-top"><div class="xi-dots">' + dots + '</div><button type="button" class="xi-x" onclick="aXoFechar()" aria-label="' + (aLang==='en'?'Exit':'Sair') + '">✕ ' + (aLang==='en'?'Exit':'Sair') + '</button></div>' +
    '<div class="xi-row"><button class="xi-b" aria-label="-" onclick="aXoAjustar(-2.5)">−</button>' +
    '<label class="xi-c"><input type="number" inputmode="decimal" step="0.5" min="0" id="aXoCargaIn" placeholder="0" value="' + aEsc(carga) + '" oninput="aXoGravarCarga(this.value)"><span>kg</span></label>' +
    '<button class="xi-b" aria-label="+" onclick="aXoAjustar(2.5)">+</button>' +
    '<button class="xo-btn xi-go' + (completo ? ' ok' : '') + '" onclick="aXoConcluir()">' + rotulo + '</button></div>' +
    (info ? '<div class="xo-info">' + aEsc(info) + '</div>' : '');
}
function aXoTick(){
  const r = document.getElementById('aXoRest');
  if (!r) return;
  const t = aDescansoTimer && aDescansoTimer.fim ? Math.ceil((aDescansoTimer.fim - Date.now()) / 1000) : 0;
  if (t > 0) {
    r.style.display = 'block';
    const m = Math.floor(t / 60), sg = t % 60;
    document.getElementById('aXoRestT').textContent = m + ':' + (sg < 10 ? '0' : '') + sg;
  } else r.style.display = 'none';
}
function aXoGravarCarga(v){
  v = String(v == null ? '' : v);
  const cin = document.getElementById(aXoEid + '-carga');
  if (cin) cin.value = v;
  const sm = document.getElementById(aXoEid + '-sum');
  if (sm) sm.textContent = v === '' ? '🏋️ — kg' : '🏋️ ' + v + 'kg';
}
function aXoAjustar(d){
  const inp = document.getElementById('aXoCargaIn');
  const v = Math.max(0, Math.round(((parseFloat(inp ? inp.value : '') || 0) + d) * 100) / 100);
  if (inp) inp.value = String(v);
  aXoGravarCarga(String(v));
}
function aXoDot(n){
  n = parseInt(n, 10);
  const i = aXoInfo(aXoEid);
  if (!i) return;
  const feitas = Math.min(aSeriesFeitas[aXoEid] || 0, i.total || 1);
  if (n === feitas + 1 && feitas < (i.total || 1)) aXoConcluir();
  else if (n === feitas && feitas > 0) { aSeriesFeitas[aXoEid] = feitas - 1; aSeriesSalvar(); aSeriesAtualizarUI(aXoEid); aMarcarFeito(aXoEid, false); aXoRender(); }
}
function aXoProximo(eid){
  const todos = [].slice.call(document.querySelectorAll('#tDashConteudo .ec'));
  const prox = todos.find(function(c){ return c.id !== eid && !c.classList.contains('done'); });
  if (prox) aXoAbrir(prox.id); else aXoFechar();
}
function aXoConcluir(){
  const i = aXoInfo(aXoEid);
  if (!i) { aXoFechar(); return; }
  const eid = aXoEid;
  const feitas = Math.min(aSeriesFeitas[eid] || 0, i.total || 1);
  if (i.total && feitas >= i.total) { aXoProximo(eid); return; }
  const ultima = i.total && feitas + 1 >= i.total;
  if (ultima) { try { aSalvarCarga(eid, i.nome); } catch(e){} }
  aContarSerieConcluida(eid);
  aXoRender();
  if (ultima) setTimeout(function(){ if (aXoEid === eid) aXoProximo(eid); }, 700);
}
// ✓ pequeno por exercício (anel que acompanha as séries)
function aRingToggle(eid){
  const cb = document.getElementById(eid + '-done');
  if (!cb) return;
  cb.checked = !cb.checked;
  aToggleDone(eid);
  if (navigator.vibrate) { try { navigator.vibrate(cb.checked ? 15 : [10,40,10]); } catch(e){} }
  if (aXoEid === eid) { if (cb.checked) aXoProximo(eid); else aXoRender(); }
}
// tocar no nome do exercício abre/fecha o modo inline
document.addEventListener('click', function(ev){
  const n = ev.target && ev.target.closest ? ev.target.closest('.ec-n') : null;
  if (!n) return;
  const card = n.closest('.ec');
  if (!card || !card.querySelector('.ec-chip-progresso')) return;
  if (aXoEid === card.id) aXoFechar(); else aXoAbrir(card.id);
});

function aAtualizarTodosBlocos(){ document.querySelectorAll('.bloco').forEach(aAtualizarBlocoProgresso); }
// dica de uso (some no primeiro toque ou no OK)
function aDicaSeriesAtiva(){ if (window._aDicaFechada) return false; try { return !localStorage.getItem('movh-dica-series'); } catch(e){ return true; } }
function aDicaSeriesMontar(){
  const wrap = document.getElementById('tSessaoProgresso');
  if (!wrap) return;
  // pulso no badge de séries do 1º exercício ainda sem nenhuma série contada
  document.querySelectorAll('.ec-dica-pulse').forEach(function(x){ x.classList.remove('ec-dica-pulse'); });
  const pend = Array.prototype.find.call(document.querySelectorAll('#tDashConteudo .ec-chip-progresso'), function(c){ return !(aSeriesFeitas[c.dataset.eid] > 0) && !(c.closest('.ec') && c.closest('.ec').classList.contains('done')); });
  const primeiro = document.querySelector('#tDashConteudo .ec-chip-progresso');
  let d = document.getElementById('aDicaSeries');
  if (!primeiro || !aDicaSeriesAtiva()) {
    if (d) d.remove();
    return;
  }
  if (!d) { d = document.createElement('div'); d.id = 'aDicaSeries'; d.className = 'dica-series'; wrap.appendChild(d); }
  d.innerHTML = '<span>👆 ' + (aLang==='en' ? 'Tap <b>Start</b> or the exercise name.' : 'Toque em <b>Iniciar</b> ou no nome do exercício.') + '</span><button type="button" onclick="aDicaSeriesFechar()">OK</button>';
}
function aBlocoDica(bid){ var e = document.getElementById('bobs-' + bid); if (e) e.classList.toggle('on'); }
function aDicaSeriesFechar(){
  window._aDicaFechada = true;
  if (!window._movhPreview) { try { localStorage.setItem('movh-dica-series', '1'); } catch(e){} }
  aDicaSeriesMontar();
}
function aTocarBeepDescanso(){
  // sino de ringue (fim de round): 3 batidas rápidas + a última ressoando; síntese por WebAudio (sem arquivo)
  try {
    const ctx = aAudioCtxDescanso || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const base = 1046, parc = [[1, 1], [2.76, 0.55], [5.4, 0.3], [8.93, 0.14]];
    [[0, 0.7], [0.2, 0.7], [0.4, 1.9]].forEach(function(b){
      parc.forEach(function(p){
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = base * p[0];
        const t0 = ctx.currentTime + b[0];
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.32 * p[1], t0 + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + b[1] / (p[0] > 3 ? 2.2 : 1));
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t0); osc.stop(t0 + b[1] + 0.05);
      });
    });
  } catch(e){}
}
function aDescansoAgendarNotificacao(){
  clearTimeout(aDescansoTimeout);
  if (!aDescansoTimer) return;
  const restante = aDescansoTimer.fim - Date.now();
  aDescansoTimeout = setTimeout(aDescansoFinalizar, Math.max(0, restante));
  aWakeLockPedir();
}
function aDescansoFinalizar(){
  if (!aDescansoTimer) return;
  if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
    const tit = aLang==='en' ? 'Rest done! 💪' : 'Descanso acabou! 💪';
    const opt = { body: aDescansoTimer.nome ? ((aLang==='en'?'Back to: ':'Hora de voltar pro: ') + aDescansoTimer.nome) : '', tag: 'movh-descanso', renotify: true, vibrate: [250,120,250,120,400], icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' };
    let feito = false;
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        feito = true;
        navigator.serviceWorker.ready.then(function(reg){ reg.showNotification(tit, opt); }).catch(function(){ try { new Notification(tit, opt); } catch(e){} });
      }
    } catch(e){}
    if (!feito) { try { new Notification(tit, opt); } catch(e){} }
  }
  if (navigator.vibrate) { try { navigator.vibrate([250,120,250]); } catch(e){} }
  aTocarBeepDescanso();
  aFecharWidgetDescanso();
}
// mantém a tela acesa durante o descanso (o navegador pausa os timers com a
// tela apagada) e, ao voltar pro app, avisa na hora se o descanso já acabou
let aWakeLock = null;
async function aWakeLockPedir(){
  try { if ('wakeLock' in navigator && !aWakeLock) { aWakeLock = await navigator.wakeLock.request('screen'); aWakeLock.addEventListener('release', function(){ aWakeLock = null; }); } } catch(e){}
}
function aWakeLockSoltar(){ try { if (aWakeLock) { aWakeLock.release(); aWakeLock = null; } } catch(e){} }
document.addEventListener('visibilitychange', function(){
  if (document.visibilityState !== 'visible' || !aDescansoTimer) return;
  if (aDescansoTimer.fim <= Date.now()) aDescansoFinalizar(); else aWakeLockPedir();
});
function aAjustarDescanso(deltaSeg){
  if (!aDescansoTimer) return;
  aDescansoTimer.fim += deltaSeg*1000;
  aDescansoAgendarNotificacao();
  aAtualizarWidgetDescanso();
}
function aMontarWidgetDescanso(){
  let w = document.getElementById('movh-descanso-widget');
  if (!w) {
    w = document.createElement('div');
    w.id = 'movh-descanso-widget';
    w.className = 'descanso-widget';
    document.body.appendChild(w);
  }
  w.style.display = 'flex';
  clearInterval(aDescansoInterval);
  aDescansoInterval = setInterval(aAtualizarWidgetDescanso, 250);
  aAtualizarWidgetDescanso();
}
function aAtualizarWidgetDescanso(){
  const w = document.getElementById('movh-descanso-widget');
  if (!w || !aDescansoTimer) return;
  const restanteMs = aDescansoTimer.fim - Date.now();
  if (restanteMs <= 0) { aFecharWidgetDescanso(); return; }
  const restanteS = Math.ceil(restanteMs/1000);
  const m = Math.floor(restanteS/60), s = restanteS%60;
  try { aAtualizarRelogio(); } catch(e){}
  w.innerHTML = '<span class="dw-tempo">💤 ' + m + ':' + String(s).padStart(2,'0') + '</span>' +
    (aDescansoTimer.nome ? '<span class="dw-nome">' + aEsc(aDescansoTimer.nome) + '</span>' : '') +
    '<button onclick="aAjustarDescanso(15)">+15s</button>' +
    '<button onclick="aFecharWidgetDescanso()">✕</button>';
}
function aFecharWidgetDescanso(){
  aWakeLockSoltar();
  clearInterval(aDescansoInterval);
  clearTimeout(aDescansoTimeout);
  const w = document.getElementById('movh-descanso-widget');
  if (w) w.style.display = 'none';
  aDescansoTimer = null;
  try { aAtualizarRelogio(); } catch(e){}
}
function aExCard(ex, faseAtual, eid, progressaoAuto, semanaDentroFase, duracaoSemanas, emConj){
  const emb = aEmbedUrl(ex.url || (ex.nome && aExVideoMap[ex.nome]) || '');
  const isTempo = ex.reg === 'tempo';
  const ultimo = aUltimaCargaPorExercicio[ex.nome];
  // Exercícios marcados como "tempo" pelo professor (ex: prancha) não têm
  // sugestão de carga em kg — não faz sentido pra esse tipo de registro.
  const sugestao = isTempo ? null : aCargaSugerida(ex.nome, faseAtual);
  // só mostra a sugestão se for diferente do que o aluno já fez por último
  // (evita ruído repetindo a mesma informação dos dois jeitos)
  const mostrarSugestao = sugestao && (!ultimo || ultimo.carga == null || Math.abs(ultimo.carga - sugestao.valor) > 0.01);
  const sugestaoTitle = sugestao && sugestao.origem === 'padrao_movimento'
    ? 'Estimativa inicial: ' + sugestao.baseline + 'kg no teste de ' + aPadraoLabelLocalizado(sugestao.padraoLabel||'') + ' × % configurado pelo professor'
    : (sugestao ? 'Baseado na sua carga inicial (' + sugestao.baseline + 'kg), ajustada pra fase atual' : '');
  const sugVolume = (progressaoAuto && faseAtual) ? aSugestaoVolumeFase(ex.series, ex.rest, faseAtual, semanaDentroFase, duracaoSemanas) : null;
  // Quando há progressão automática: os números AJUSTADOS pela fase viram os
  // chips principais (é isso que o aluno deve seguir hoje) — o que o
  // professor escreveu no bloco vira só uma notinha de referência ("base"),
  // discreta, em vez de um segundo bloco colorido competindo com o primeiro.
  const seriesExibir = sugVolume ? aFormatarSeries(sugVolume.series) : aFormatarSeries(ex.series);
  const seriesTotalMatch = seriesExibir ? String(seriesExibir).match(/^(\d+)/) : null;
  const seriesTotal = seriesTotalMatch ? parseInt(seriesTotalMatch[1], 10) : 0;
  const restExibir = sugVolume && sugVolume.rest ? sugVolume.rest : ex.rest;
  // texto curto do badge ("4×8"); formatos que não reconhece caem no texto longo
  const serieRaw = String(sugVolume ? sugVolume.series : (ex.series || '')).trim();
  const serieCurtoM = serieRaw.match(/^(\d+)\s*[x×]\s*([^\[\]]+)$/i);
  const seriesCurto = serieCurtoM ? (serieCurtoM[1] + '×' + serieCurtoM[2].trim()) : seriesExibir;
  // badge legível: "4 séries × 8 reps" (número antes do × = séries, depois = reps)
  let seriesBadgeHTML = aEsc(seriesCurto);
  if (serieCurtoM) {
    const repsM = serieCurtoM[2].trim().match(/^([\d\-–\/]+)\s*(.*)$/);
    const lblS = aLang==='en' ? 'sets' : 'séries';
    seriesBadgeHTML = '<span class="sx-c"><i>' + lblS + '</i><b>' + (seriesTotal ? '<span class="sx-cnt" id="'+eid+'-series-count">' + (Math.min(aSeriesFeitas[eid]||0,seriesTotal)>=seriesTotal?'✓ ':'') + Math.min(aSeriesFeitas[eid]||0,seriesTotal) + '/</span>' : '') + aEsc(serieCurtoM[1]) + '</b></span><span class="sx-x">×</span>' +
      (repsM ? (function(){ const sfx = repsM[2].trim(); const tk = sfx.split(' ')[0].toLowerCase(); const ehT = ['s','seg','min','m',"'",'"'].indexOf(tk) >= 0; const resto = ehT ? sfx.slice(tk.length).trim() : sfx; return '<span class="sx-c"><i>' + (ehT ? (aLang==='en'?'time':'tempo') : 'reps') + '</i><b>' + aEsc(repsM[1].replace(/\s*[-–]\s*/g, ' ' + aT('ate') + ' ')) + (ehT ? aEsc(tk) : '') + '</b></span>' + (resto ? '<span class="sx-ex">' + aEsc(resto) + '</span>' : ''); })() : '<span class="sx-c"><i>reps</i><b>' + aEsc(serieCurtoM[2].trim()) + '</b></span>');
  }
  const seriesFeitasHoje = Math.min(aSeriesFeitas[eid] || 0, seriesTotal || 0);
  const seriesFillPct = seriesTotal ? Math.min(100, (seriesFeitasHoje/seriesTotal)*100) : 0;
  const baseRefHTML = (sugVolume && (aFormatarSeries(sugVolume.series) !== aFormatarSeries(ex.series) || aParseRestSegundos(sugVolume.rest) !== aParseRestSegundos(ex.rest)))
    ? '<div class="ec-base-ref">' + aT('base_professor') + ': ' + aEsc(aFormatarSeries(ex.series)) + (ex.rest && !emConj ? ' · ' + aEsc(ex.rest) : '') + '</div>'
    : '';
  const cargaBadge = isTempo
    ? '<span class="ec-chip cargabox tempobox'+((ultimo&&ultimo.reps!=null)?' carga-registrada':'')+'" data-eid="'+eid+'" onclick="aCargaAbrir(this)"><span class="cb-sum" id="'+eid+'-sum">⏱️ '+((ultimo&&ultimo.reps!=null)?aEsc(ultimo.reps)+'s':'— s')+'</span><span class="cb-l">'+aEsc(aT('tempo'))+' ⏱️</span>' +
        '<input type="number" step="1" placeholder="seg" class="tempobox-input" id="'+eid+'-tempo" value="'+(ultimo&&ultimo.reps!=null?aEsc(ultimo.reps):'')+'"><span class="u">s</span>' +
        '<button class="salvar-mini" data-eid="'+eid+'" data-nome="'+aEsc(ex.nome||'')+'" onclick="event.stopPropagation();aSalvarTempo(this.dataset.eid,this.dataset.nome)" title="'+aEsc(aT('salvar'))+'">✓</button>' +
        '<span class="cargasalvo" id="'+eid+'-ok">✓</span>' +
      '</span>'
    : '<span class="ec-chip cargabox'+((ultimo&&ultimo.carga!=null)?' carga-registrada':'')+'" title="'+aEsc(aT('carga'))+'" data-eid="'+eid+'" onclick="aCargaAbrir(this)"><span class="cb-sum" id="'+eid+'-sum">🏋️ '+((ultimo&&ultimo.carga!=null)?aEsc(ultimo.carga)+'kg':'— kg')+'</span><span class="cb-l">'+(aLang==='en'?'load used':'carga utilizada')+'</span><span class="cb-r"><span class="ic">🏋️</span>' +
        '<input type="number" inputmode="decimal" step="0.5" placeholder="0" aria-label="kg" id="'+eid+'-carga" value="'+(ultimo&&ultimo.carga!=null?aEsc(ultimo.carga):'')+'"><span class="u">kg</span>' +
        '<span class="sep">×</span>' +
        '<input type="number" inputmode="numeric" placeholder="0" aria-label="reps" id="'+eid+'-reps" value="'+(ultimo&&ultimo.reps!=null?aEsc(ultimo.reps):'')+'"><span class="u">reps</span>' +
        '<button class="salvar-mini" data-eid="'+eid+'" data-nome="'+aEsc(ex.nome||'')+'" onclick="event.stopPropagation();aSalvarCarga(this.dataset.eid,this.dataset.nome)" title="'+aEsc(aT('salvar'))+'">✓</button>' +
        '<span class="cargasalvo" id="'+eid+'-ok">✓</span>' +
      '</span></span>';
  const serChip = ex.series ? '<span class="ec-chip'+(sugVolume?' ec-chip-fase':' ec-chip-s')+(seriesTotal?' ec-chip-progresso'+(seriesFeitasHoje>=seriesTotal?' ec-chip-completo':''):'')+'" id="'+eid+'-series-badge" data-total="'+seriesTotal+'" title="'+aEsc(seriesExibir)+(seriesTotal?(aLang==='en'?' — tap to count a set':' — toque para contar uma série'):'')+'"'+(seriesTotal?' role="button" data-eid="'+eid+'" onclick="aContarSerieConcluida(this.dataset.eid)" style="--fill:'+seriesFillPct+'%"':'')+'>'+(sugVolume?'🧭 ':'')+seriesBadgeHTML+((seriesTotal && !serieCurtoM)?' <span id="'+eid+'-series-count" style="opacity:.8;font-variant-numeric:tabular-nums">'+(seriesFeitasHoje>=seriesTotal?'✓ ':'')+seriesFeitasHoje+'/'+seriesTotal+'</span>':'')+'</span>' : '';
  const chips = [
    serChip,
    emConj ? '' : '<span class="ec-chip'+(sugVolume?' ec-chip-fase':' ec-chip-r')+(restExibir?'':' ec-chip-rlivre')+' ec-chip-clicavel" data-tempo="'+aEsc(restExibir||'60s')+'" data-nome="'+aEsc(ex.nome||'')+'" data-eid="'+eid+'" onclick="aIniciarDescanso(this.dataset.tempo,this.dataset.nome,this.dataset.eid)" title="'+(aLang==='en'?'Tap to start a rest timer':'Toque pra iniciar o cronômetro de descanso')+'">💤 '+aEsc(restExibir||'60s')+'</span>',
    mostrarSugestao ? '<span class="ec-chip ec-chip-sug" title="'+aEsc(sugestaoTitle)+'">'+(sugestao.origem==='padrao_movimento'?'🎯 ':'💡 ')+aEsc(sugestao.valor)+'kg</span>' : '',
    cargaBadge
  ].filter(Boolean).join('');
  return '<div class="ec" id="'+eid+'">' +
    '<div class="ec-hd">' +
      '<div class="ec-info">' +
        '<div class="ec-name-row">' +
          (emb ? '<button class="vbtn vthumb" aria-label="Vídeo" data-emb="'+aEsc(emb)+'" data-sh="'+(String(ex.url || (ex.nome && aExVideoMap[ex.nome]) || '').indexOf('/shorts/') >= 0 ? '1' : '0')+'" data-vs="'+eid+'-vs" onclick="aToggleVideo(this,this.dataset.vs,this.dataset.emb)"><span>'+(aLang==='en'?'Video':'Vídeo')+'</span><i class="vplay">▶</i></button>' : '') +
          '<span class="ec-n">'+aEsc(ex.nome)+(ex.obs ? '<span class="ec-o"> (<span class="ec-o-i">💬</span> '+aEsc(ex.obs)+')</span>' : '')+'</span>' +
          '<button type="button" class="ec-ring" id="'+eid+'-ring" data-eid="'+eid+'" style="--p:'+seriesFillPct+'%" onclick="event.stopPropagation();aRingToggle(this.dataset.eid)" aria-label="'+aEsc(aT('marcar_feito'))+'"></button>' +
        '</div>' +
        '<div class="ec-chips">' +
          '<span class="ec-done-wrap">' +
            '<input type="checkbox" class="ec-done-cb" id="'+eid+'-done" data-eid="'+eid+'" onchange="aToggleDone(this.dataset.eid)" title="'+aEsc(aT('marcar_feito'))+'">' +
            '<span class="ec-done-hint" aria-hidden="true">✔️</span>' +
          '</span>' +
        chips + '</div>' +
        baseRefHTML +
      '</div>' +
    '</div>' +
    '<div class="vs" id="'+eid+'-vs" style="display:none"></div>' +
  '</div>';
}

// Mesmo número usado no botão de suporte da tela de login — se o professor
// trocar o WhatsApp, precisa atualizar aqui e nos dois "wa-btn" do authScreen.
const A_WHATSAPP_NUM = '5527988225340';
// Atualização automática: o export grava o carimbo da versão em A_BUILD e em version.json.
// Se o app ficou aberto/restaurado de uma versão antiga, recarrega sozinho (1x por versão).
const A_BUILD = '__MOVH_BUILD__';
async function aChecarVersao(){
  try {
    if (A_BUILD.indexOf('__') === 0) return;
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json();
    if (!j || !j.build || j.build === A_BUILD) return;
    // há versão nova: o 🔄 do topo pulsa até atualizar (se recarregar sozinho, a página nova já abre normal)
    const rb = document.getElementById('tReloadBtn');
    if (rb) { rb.classList.add('upd'); rb.title = (typeof aLang !== 'undefined' && aLang === 'en') ? 'New version: tap to update' : 'Nova versão: toque para atualizar'; }
    if (sessionStorage.getItem('movh-build-reload') === j.build) return;
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
    if (typeof aXoEid !== 'undefined' && aXoEid) return; // não recarrega no meio do exercício: fica pulsando
    sessionStorage.setItem('movh-build-reload', j.build);
    location.reload();
  } catch(e) {}
}
function aLogoAplicar(j){
  try {
    var c = document.getElementById('aLogoClaro'), e = document.getElementById('aLogoEscuro');
    if (!j || !j.c) return;
    if (c) c.src = j.c;
    if (e) e.src = j.e || j.c;
    document.querySelectorAll('img[data-lg="c"]').forEach(function(x){ x.src = j.c; });
    document.querySelectorAll('img[data-lg="e"]').forEach(function(x){ x.src = j.e || j.c; });
    aLogoRodapeAplicar(null, j);
  } catch(x) {}
}
// rodapé: usa a logo própria (logo_rodape) se houver; senão acompanha a do login
function aLogoRodapeAplicar(r, j){
  try {
    var f = (r && r.c) ? r : (aLogoRodapeFonte() || j);
    if (!f || !f.c) return;
    document.querySelectorAll('img[data-lr="c"]').forEach(function(x){ x.src = f.c; });
    document.querySelectorAll('img[data-lr="e"]').forEach(function(x){ x.src = f.e || f.c; });
  } catch(x) {}
}
async function aLogoRemota(){
  try { var ch = localStorage.getItem('movh-logo-login'); if (ch) aLogoAplicar(JSON.parse(ch)); } catch(x) {}
  try {
    var r = await aClient.from('landing_config').select('config').limit(5);
    var rows = (r && r.data) || [], j = null;
    var rr = null, achouCfg = false;
    for (var i = 0; i < rows.length; i++) {
      var cf = rows[i].config || {}; achouCfg = true;
      var l = cf.logo_login; if (l && l.c && (!j || (l.t || 0) > (j.t || 0))) j = l;
      var lr = cf.logo_rodape; if (lr && lr.c && (!rr || (lr.t || 0) > (rr.t || 0))) rr = lr;
    }
    if (achouCfg) { try { if (rr) localStorage.setItem('movh-logo-rodape', JSON.stringify(rr)); else localStorage.removeItem('movh-logo-rodape'); } catch(x) {} }
    if (j) { aLogoAplicar(j); try { localStorage.setItem('movh-logo-login', JSON.stringify(j)); } catch(x) {} }
    aLogoRodapeAplicar(rr, j);
  } catch(x) {}
}
window.addEventListener('load', function(){ aLogoRemota(); });
window.addEventListener('load', function(){ setTimeout(aChecarVersao, 3000); });
document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible') aChecarVersao(); });
window.addEventListener('pageshow', function(ev){ if (ev.persisted) aChecarVersao(); });
setInterval(aChecarVersao, 600000);
function aSolicitarAvaliacao(nomesExercicios){
  const lista = Array.isArray(nomesExercicios) ? nomesExercicios : [nomesExercicios];
  const alunoNome = (aAlunoRow && (aAlunoRow.nome || aAlunoRow.email)) || (aLang==='en'?'a student':'um aluno');
  const exsTxt = lista.filter(Boolean).join(aLang==='en'?' and ':' e ');
  const msg = aLang==='en'
    ? ('Hi! I\'m ' + alunoNome + ' and I\'d like to send a video for you to check my form on: ' + exsTxt + '.')
    : ('Oi! Sou ' + alunoNome + ' e queria mandar um vídeo pra você analisar minha execução de: ' + exsTxt + '.');
  window.open('https://wa.me/' + A_WHATSAPP_NUM + '?text=' + encodeURIComponent(msg), '_blank');
}
// Botão único (rodapé) em vez de um por exercício: abre uma seleção com os
// exercícios da sessão de hoje, o aluno marca quais quer que sejam
// avaliados, e só então abre o WhatsApp já com o contexto pronto.
function aAbrirSolicitarAvaliacao(){
  const nomes = aListaExerciciosHoje();
  const existing = document.getElementById('movh-avaliacao-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'movh-avaliacao-overlay';
  overlay.className = 'sessao-concluida-overlay';
  const semExercicios = !nomes.length;
  const itensHTML = nomes.map(function(n, i){
    const safe = n.replace(/'/g, "\\'");
    return '<label class="rpe-dor-ex-item"><input type="checkbox" id="av-ex-'+i+'" onchange="aToggleAvExercicio(\'' + safe + '\', this.checked)"> ' + aEsc(n) + '</label>';
  }).join('');
  overlay.innerHTML = `<div class="sessao-concluida-card">
    <div class="sc-emoji">🎥</div>
    <div class="sc-titulo">${aLang==='en'?'Movement analysis':'Análise de movimento'}</div>
    <div class="sc-sub">${semExercicios
      ? (aLang==='en'?'No workout logged for today, but you can still reach out.':'Sem treino de hoje pra listar, mas você pode chamar direto.')
      : (aLang==='en'?'Pick which exercise(s) you want feedback on, then send it over WhatsApp.':'Marque qual (ou quais) exercício você quer que eu avalie, e manda pelo WhatsApp.')}</div>
    ${semExercicios ? '' : '<div style="text-align:left;margin:10px 0">'+itensHTML+'</div>'}
    <button class="rpe-enviar" onclick="aConfirmarSolicitarAvaliacao()">${aLang==='en'?'💬 Send on WhatsApp':'💬 Enviar no WhatsApp'}</button>
    <button class="sc-btn-sec" onclick="document.getElementById('movh-avaliacao-overlay').remove()">${aLang==='en'?'Cancel':'Cancelar'}</button>
  </div>`;
  document.body.appendChild(overlay);
  aAvExerciciosSelecionados = [];
}
let aAvExerciciosSelecionados = [];
function aToggleAvExercicio(nome, marcado){
  const i = aAvExerciciosSelecionados.indexOf(nome);
  if (marcado && i===-1) aAvExerciciosSelecionados.push(nome);
  if (!marcado && i>-1) aAvExerciciosSelecionados.splice(i,1);
}
function aConfirmarSolicitarAvaliacao(){
  aSolicitarAvaliacao(aAvExerciciosSelecionados);
  const ov = document.getElementById('movh-avaliacao-overlay');
  if (ov) ov.remove();
}
function aToggleDone(eid, auto){
  const card = document.getElementById(eid);
  const btn = document.getElementById(eid+'-done');
  if(!card || !btn) return;
  const done = btn.checked;
  card.classList.toggle('done', done);
  if(done){ card.classList.remove('ec-just-done'); void card.offsetWidth; card.classList.add('ec-just-done'); } else card.classList.remove('ec-just-done');
  if(auto !== true) aSeriesSync(eid, done);
  const bloco = card.closest('.bloco');
  if(bloco){
    const exCards = [...bloco.querySelectorAll('.ec')];
    const all = exCards.length && exCards.every(x => x.classList.contains('done'));
    bloco.classList.toggle('bloco-concluido', all);
    const bid = bloco.id.replace('bloco-','');
    const bbtn = document.getElementById('bdone-'+bid);
    if(bbtn) bbtn.textContent = all ? '↩' : '✓';
    // recolhe o bloco quando todos feitos (só no check manual, pra dar tempo de registrar a carga); reabre ao desmarcar
    const body = document.getElementById(bid);
    const arr = bloco.querySelector('.bh .bt-arr');
    if(all && body && auto !== true){
      body.style.display = 'none';
      if(arr) arr.style.transform = 'rotate(-90deg)';
    } else if(all && body && auto === true){
      setTimeout(function(){ if(bloco.classList.contains('bloco-concluido')){ body.style.display = 'none'; if(arr) arr.style.transform = 'rotate(-90deg)'; } }, 400);
    } else if(!done && body){
      body.style.display = 'block';
      if(arr) arr.style.transform = 'rotate(0deg)';
    }
    aAtualizarBlocoProgresso(bloco);
    if(all && done){ const nb = bloco.nextElementSibling; if(nb && nb.classList.contains('bloco')){ const nbody = document.getElementById(nb.id.replace('bloco-','')); if(nbody){ nbody.style.display='block'; const nar = nb.querySelector('.bh .bt-arr'); if(nar) nar.style.transform='rotate(0deg)'; } } }
  }
  if(done && auto !== true) aScrollProximo(eid);
  aSessaoSalvar();
  aVerificarTreinoConcluido();
}

function aBlocoToggleDone(bid){
  const bloco = document.getElementById('bloco-'+bid);
  const btn = document.getElementById('bdone-'+bid);
  if(!bloco || !btn) return;
  const done = bloco.classList.toggle('bloco-concluido');
  btn.textContent = done ? '↩' : '✓';
  btn.title = done ? (aLang==='en'?'Undo':'Desfazer') : (aLang==='en'?'Complete block':'Concluir bloco');
  bloco.querySelectorAll('.ec').forEach(card => {
    card.classList.toggle('done', done);
    const eb = document.getElementById(card.id+'-done');
    if(eb) eb.checked = done;
    aSeriesSync(card.id, done);
  });
  aAtualizarBlocoProgresso(bloco);
  // recolhe bloco ao concluir; reabre ao desfazer
  const body = document.getElementById(bid);
  const arr = bloco.querySelector('.bh .bt-arr');
  if(body){
    body.style.display = done ? 'none' : 'block';
    if(arr) arr.style.transform = done ? 'rotate(-90deg)' : 'rotate(0deg)';
  }
  aSessaoSalvar();
  aVerificarTreinoConcluido();
}

function aVerificarTreinoConcluido(forcar){
  if (window._movhPreview) return;
  const dash = document.getElementById('tDashboard');
  if(!dash) return;
  const blocos = [...dash.querySelectorAll('.bloco')];
  if(!blocos.length) return;
  const allDone = forcar || blocos.every(b => b.classList.contains('bloco-concluido'));
  // remove overlay anterior se existir (pode ser recriado)
  const existing = document.getElementById('movh-sessao-overlay');
  if(existing && !allDone){ existing.remove(); return; }
  if(!allDone) return;
  if(existing) return; // já mostrado
  // cria tela de conclusão
  const overlay = document.createElement('div');
  overlay.id = 'movh-sessao-overlay';
  overlay.className = 'sessao-concluida-overlay';
  const emojis = ['😌','🙂','😊','😐','😕','😓','😣','😖','🥵','🤯'];
  const emojisHTML = emojis.map((em,idx) => {
    const rpe = idx+1;
    return '<button class="rpe-em-btn" data-rpe="'+rpe+'" onclick="aSelecionarRPE('+rpe+',this)">'+em+'<span class="rpe-em-num">'+rpe+'</span></button>';
  }).join('');
  overlay.innerHTML = `<div class="sessao-concluida-card">
    <div class="sc-emoji">🏆</div>
    <div class="sc-titulo">${aLang==='en'?'Workout complete!':'Treino concluído!'}</div>
    <div class="sc-sub">${aLang==='en'?'Great job today. Don’t forget to log your loads before leaving.':'Ótimo trabalho hoje! Não se esqueça de registrar suas cargas antes de sair.'}</div>
    <div class="sc-registro-status" id="sc-registro-status">${aLang==='en'?'⏳ Sending progress to your coach…':'⏳ Enviando progresso pro seu professor…'}</div>
    <div class="rpe-box" id="rpe-box">
      <div class="rpe-pergunta">${aLang==='en'?'How hard did today’s session feel?':'Como foi o esforço do treino hoje?'}</div>
      <div class="rpe-emojis" id="rpe-emojis">${emojisHTML}</div>
      <div class="rpe-legenda"><span>${aLang==='en'?'very light':'muito leve'}</span><span>${aLang==='en'?'maximum':'máximo'}</span></div>
      <div id="rpe-dor-area" style="display:none">
        <div class="rpe-pergunta">${aLang==='en'?'Any joint pain or inability to perform an exercise?':'Alguma dor articular ou impossibilidade de execução?'}</div>
        <div class="rpe-dor-row">
          <button class="rpe-dor-btn" id="rpe-dor-sim" onclick="aSelecionarDor(true)">${aLang==='en'?'😖 Yes':'😖 Sim'}</button>
          <button class="rpe-dor-btn" id="rpe-dor-nao" onclick="aSelecionarDor(false)">${aLang==='en'?'🙌 No':'🙌 Não'}</button>
        </div>
        <div id="rpe-dor-ex-lista" style="display:none">${aMontarChecklistExerciciosDor()}</div>
        <textarea class="rpe-dor-obs" id="rpe-dor-obs" style="display:none" placeholder="${aLang==='en'?'Describe it (optional)':'Descreva (opcional)'}"></textarea>
      </div>
      <button class="rpe-enviar" id="rpe-enviar-btn" disabled onclick="aSalvarRPE()">${aLang==='en'?'Send':'Enviar'}</button>
      <div class="rpe-obrigado" id="rpe-obrigado" style="display:none">${aLang==='en'?'✓ Thanks — see you next session!':'✓ Valeu — até o próximo treino!'}</div>
    </div>
    <button class="sc-btn" onclick="aFecharConclusao(false)">${aLang==='en'?'View progress 📈':'Ver progresso 📈'}</button>
    <button class="sc-btn-sec" onclick="aFecharConclusao(true)">${aLang==='en'?'Back to workout':'Voltar ao treino'}</button>
  </div>`;
  document.body.appendChild(overlay);
  aDorExerciciosSelecionados = [];
  aConfete(); aStreakSemana();
  aChecarSolicitacaoMudanca(overlay);
  // registra a sessão como concluída pro professor (badge "x/y sessões no
  // mês" no painel) mesmo que o aluno feche a tela sem enviar o RPE —
  // ver aRegistrarSessaoConcluidaSeNecessario. Chamado com o overlay já no
  // DOM pra conseguir atualizar o texto de status (#sc-registro-status).
  aRegistrarSessaoConcluidaSeNecessario();
}
// Registra que a sessão de hoje foi concluída assim que todos os blocos
// são marcados "feito" — independente do aluno preencher o RPE ou não.
// É essa linha em "rpe_sessoes" (rpe/dor ficam nulos até o RPE ser
// enviado, se for) que o painel do professor conta pro badge "x/y sessões
// no mês". Sem isso, um aluno que fecha a tela de conclusão sem enviar o
// RPE nunca aparecia como tendo treinado naquele dia.
async function aRegistrarSessaoConcluidaSeNecessario(){
  const statusEl = document.getElementById('sc-registro-status');
  if (aSessaoRegistroId) {
    // já registrada nesta sessão (ou restaurada do localStorage de hoje)
    if (statusEl) {
      statusEl.textContent = aLang==='en' ? '✓ Progress sent to your coach' : '✓ Progresso enviado pro seu professor';
      statusEl.classList.add('sc-reg-ok');
    }
    return;
  }
  if (!aAlunoRow) return;
  try {
    const { data, error } = await aClient.from('rpe_sessoes').insert({
      aluno_id: aAlunoRow.id,
      protocolo_id: aProtocolo ? aProtocolo.id : null,
      rpe: null,
      dor: null
    }).select('id').single();
    if (error || !data) throw error || new Error('sem retorno');
    aSessaoRegistroId = data.id;
    aSessaoSalvar();
    const elOk = document.getElementById('sc-registro-status');
    if (elOk) {
      elOk.textContent = aLang==='en' ? '✓ Progress sent to your coach' : '✓ Progresso enviado pro seu professor';
      elOk.classList.add('sc-reg-ok');
    }
  } catch(e) {
    console.error('[MOVH] Falha ao registrar sessão em rpe_sessoes:', e);
    const elErr = document.getElementById('sc-registro-status');
    if (elErr) {
      elErr.textContent = aLang==='en' ? '⚠️ Couldn’t send progress — check your connection' : '⚠️ Não deu pra enviar o progresso — confira sua conexão';
      elErr.classList.add('sc-reg-erro');
    }
  }
}
let aRpeSelecionado = null, aDorSelecionada = null, aDorExerciciosSelecionados = [];
// Nomes dos exercícios da sessão de hoje, pra deixar o aluno marcar
// especificamente qual (ou quais) doeu — em vez de só um campo de texto
// livre, que dependia dele lembrar/escrever certinho o nome.
function aListaExerciciosHoje(){
  if (!aSemanasAtual || !aAgendaAtual || !aAgendaAtual.diaSemanaHoje) return [];
  const semanaAtual = aSemanasAtual[aAgendaAtual.semanaIdx];
  if (!semanaAtual) return [];
  const diaHoje = (semanaAtual.dias||[]).find(d => aDiaSemanaEfetivo(d) === aAgendaAtual.diaSemanaHoje);
  if (!diaHoje) return [];
  const nomes = [];
  (diaHoje.blocos||[]).forEach(b => {
    (b.exercicios||[]).forEach(ex => { if (ex && ex.nome && nomes.indexOf(ex.nome)===-1) nomes.push(ex.nome); });
    (b.metconExs||[]).forEach(ex => { if (ex && ex.nome && nomes.indexOf(ex.nome)===-1) nomes.push(ex.nome); });
  });
  return nomes;
}
function aMontarChecklistExerciciosDor(){
  const nomes = aListaExerciciosHoje();
  if (!nomes.length) return '';
  const itens = nomes.map(function(n){
    const safe = n.replace(/'/g, "\\'");
    return '<label class="rpe-dor-ex-item"><input type="checkbox" onchange="aToggleDorExercicio(\'' + safe + '\', this.checked)"> ' + aEsc(n) + '</label>';
  }).join('');
  return '<div class="rpe-dor-ex-titulo">' + (aLang==='en'?'Which exercise(s)? (optional)':'Qual (ou quais) exercício? (opcional)') + '</div>' + itens;
}
function aToggleDorExercicio(nome, marcado){
  const i = aDorExerciciosSelecionados.indexOf(nome);
  if (marcado && i===-1) aDorExerciciosSelecionados.push(nome);
  if (!marcado && i>-1) aDorExerciciosSelecionados.splice(i,1);
}
function aSelecionarRPE(v, btn){
  aRpeSelecionado = v;
  document.querySelectorAll('#rpe-emojis .rpe-em-btn').forEach(b => b.classList.toggle('sel', b === btn));
  document.getElementById('rpe-dor-area').style.display = 'block';
  aAtualizarBotaoEnviarRPE();
}
function aSelecionarDor(sim){
  aDorSelecionada = sim;
  document.getElementById('rpe-dor-sim').classList.toggle('sel-sim', sim === true);
  document.getElementById('rpe-dor-nao').classList.toggle('sel-nao', sim === false);
  document.getElementById('rpe-dor-obs').style.display = sim ? 'block' : 'none';
  const listaEl = document.getElementById('rpe-dor-ex-lista');
  if (listaEl) listaEl.style.display = sim ? 'block' : 'none';
  if (!sim) aDorExerciciosSelecionados = [];
  aAtualizarBotaoEnviarRPE();
}
function aAtualizarBotaoEnviarRPE(){
  const btn = document.getElementById('rpe-enviar-btn');
  if (btn) btn.disabled = !(aRpeSelecionado != null && aDorSelecionada != null);
}
async function aSalvarRPE(){
  if (aPreviewBloqueado()) return;
  if (aRpeSelecionado == null || aDorSelecionada == null || !aAlunoRow) return;
  const btn = document.getElementById('rpe-enviar-btn');
  if (btn) { btn.disabled = true; btn.textContent = aLang==='en' ? 'Sending...' : 'Enviando...'; }
  const dorObsEl = document.getElementById('rpe-dor-obs');
  try {
    const payloadRpe = {
      rpe: aRpeSelecionado,
      dor: !!aDorSelecionada,
      dor_obs: aDorSelecionada && dorObsEl ? (dorObsEl.value || null) : null,
      dor_exercicios: aDorSelecionada && aDorExerciciosSelecionados.length ? aDorExerciciosSelecionados : null
    };
    if (aSessaoRegistroId) {
      // atualiza a linha já criada quando a sessão foi concluída, em vez
      // de inserir uma segunda linha (evitaria contar 2 sessões no dia)
      await aClient.from('rpe_sessoes').update(payloadRpe).eq('id', aSessaoRegistroId);
    } else {
      const { data } = await aClient.from('rpe_sessoes').insert({
        aluno_id: aAlunoRow.id,
        protocolo_id: aProtocolo ? aProtocolo.id : null,
        ...payloadRpe
      }).select('id').single();
      if (data) { aSessaoRegistroId = data.id; aSessaoSalvar(); }
    }
    aUltimoRPE = aRpeSelecionado;
    document.getElementById('rpe-box').querySelectorAll('.rpe-pergunta, .rpe-emojis, .rpe-legenda, #rpe-dor-area, #rpe-enviar-btn').forEach(el => el.style.display = 'none');
    const obr = document.getElementById('rpe-obrigado');
    if (obr) obr.style.display = 'block';
  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = aLang==='en' ? 'Send' : 'Enviar'; }
  }
}
function aFecharConclusao(voltarTreino){
  const overlay = document.getElementById('movh-sessao-overlay');
  if(overlay) overlay.remove();
  if(!voltarTreino) aVerProgresso();
}

// ── Solicitar mudança de treino ao completar 45 dias no protocolo atual ──
// Verificado a cada sessão concluída (chamado de dentro de aVerificarTreinoConcluido).
// Se o aluno já está há 45+ dias no protocolo ativo e ainda não solicitou
// mudança (ou a solicitação já foi respondida), mostra um convite na tela
// de conclusão de treino com um botão para enviar a solicitação.
function aDiasNoProtocolo(){
  if(!aProtocolo || !aProtocolo.data_inicio) return 0;
  const inicio = new Date(aProtocolo.data_inicio + 'T00:00:00');
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  return Math.floor((hoje - inicio) / (1000*60*60*24));
}
async function aChecarSolicitacaoMudanca(overlay){
  const dias = aDiasNoProtocolo();
  if(dias < 45 || !aAlunoRow || !aProtocolo) return;
  let jaExiste = false, pendente = false;
  try{
    const { data } = await aClient.from('solicitacoes_treino')
      .select('id,status')
      .eq('aluno_id', aAlunoRow.id)
      .eq('protocolo_id', aProtocolo.id)
      .order('solicitado_em', {ascending:false})
      .limit(1);
    if(data && data.length){ jaExiste = true; pendente = data[0].status === 'pendente'; }
  } catch(e){ return; }
  if(jaExiste && !pendente) return; // já respondida pelo professor, não incomoda mais
  if(!overlay) return;
  const card = overlay.querySelector('.sessao-concluida-card');
  if(!card) return;
  const div = document.createElement('div');
  div.id = 'movh-solicitacao-mudanca';
  div.style.marginTop = '10px';
  div.style.paddingTop = '10px';
  div.style.borderTop = '1px solid rgba(0,0,0,.08)';
  if(jaExiste && pendente){
    div.innerHTML = '<div class="sc-sub">' + (aLang==='en' ? 'Change request sent — waiting for your coach.' : 'Solicitação de mudança enviada — aguardando seu professor.') + '</div>';
  } else {
    const txt = aLang==='en'
      ? ('You have been on this program for ' + dias + ' days. Want to request a new one from your coach?')
      : ('Você está há ' + dias + ' dias neste treino. Quer solicitar um novo treino ao seu professor?');
    div.innerHTML = '<div class="sc-sub">' + txt + '</div>' +
      '<button class="sc-btn-sec" onclick="aSolicitarMudancaTreino()">' + (aLang==='en'?'Request training change':'Solicitar mudança de treino') + '</button>';
  }
  card.appendChild(div);
}
async function aSolicitarMudancaTreino(){
  if (aPreviewBloqueado()) return;
  if(!aAlunoRow || !aProtocolo) return;
  const dias = aDiasNoProtocolo();
  const { error } = await aClient.from('solicitacoes_treino').insert({
    aluno_id: aAlunoRow.id,
    protocolo_id: aProtocolo.id,
    dias_no_protocolo: dias
  });
  const div = document.getElementById('movh-solicitacao-mudanca');
  if(error){
    if(div) div.innerHTML = '<div class="sc-sub">' + (aLang==='en'?'Error sending request: ':'Erro ao enviar solicitação: ') + error.message + '</div>';
    return;
  }
  if(div){
    div.innerHTML = '<div class="sc-sub">' + (aLang==='en'?'Request sent! Your coach has been notified.':'Solicitação enviada! Seu professor foi notificado.') + '</div>';
  }
}

function aToggleVideo(btn, slotId, src){ aAbrirVideoModal(src, btn && btn.dataset.sh == 1); }
function aAbrirVideoModal(src, sh){
  const m=document.getElementById('a-video-modal');
  const ld=document.getElementById('a-video-load'); if(ld) ld.style.display='flex';
  var vw = document.getElementById('a-video-wrap'), vf = document.getElementById('a-video-iframe');
  if (vw) vw.style.width = sh ? 'min(92vw,calc(82vh * 9 / 16))' : 'min(92vw,840px)';
  if (vf) vf.style.aspectRatio = sh ? '9/16' : '16/9';
  var yid=String(src).match(/embed\/([^?&\/]+)/), yl=document.getElementById('a-video-yt'); if(yl) yl.href = yid ? 'https://www.youtube.com/watch?v='+yid[1] : String(src);
  document.getElementById('a-video-iframe').src=src+'?autoplay=1&rel=0&mute=1&playsinline=1&modestbranding=1';
  clearTimeout(window._avT); window._avT=setTimeout(function(){ var l=document.getElementById('a-video-load'); if(l && l.style.display!=='none') l.textContent='⏳ Está demorando… toque em “Abrir no YouTube” abaixo.'; },9000);
  m.style.display='flex';
  document.body.style.overflow='hidden';
}
function aFecharVideoModal(){
  clearTimeout(window._avT);
  document.getElementById('a-video-iframe').src='';
  document.getElementById('a-video-modal').style.display='none';
  document.body.style.overflow='';
}
document.addEventListener('keydown',function(e){if(e.key==='Escape')aFecharVideoModal();});

function aCargaAbrir(box){
  if (!box || box.classList.contains('aberto')) return;
  box.classList.add('aberto');
  const i = box.querySelector('input');
  if (i) { try { i.focus(); } catch(e){} }
}
function aCargaFechar(eid){
  const sum = document.getElementById(eid+'-sum'); if (!sum) return;
  const box = sum.closest('.cargabox'); if (!box) return;
  const tp = document.getElementById(eid+'-tempo');
  if (tp) { sum.textContent = '⏱️ ' + (tp.value ? tp.value + 's' : '— s'); }
  else { const c = document.getElementById(eid+'-carga'); sum.textContent = '🏋️ ' + (c && c.value ? c.value + 'kg' : '— kg'); }
  box.classList.remove('aberto');
}
async function aSalvarCarga(eid, exercicioNome){
  if (aPreviewBloqueado()) return;
  const carga = document.getElementById(eid+'-carga').value;
  const reps = document.getElementById(eid+'-reps').value;
  if (!carga && !reps) return;
  const cargaNum = carga ? parseFloat(carga) : null;
  let maxAnt = 0;
  (aTodosRegistros || []).forEach(function(r){ if (r.exercicio_nome === exercicioNome && r.carga != null && r.carga > maxAnt) maxAnt = r.carga; });
  const { error } = await aClient.from('registros_sessao').insert({
    aluno_id: aAlunoRow.id,
    protocolo_id: aProtocolo.id,
    exercicio_nome: exercicioNome,
    carga: carga ? parseFloat(carga) : null,
    reps: reps ? parseInt(reps) : null
  });
  const okEl = document.getElementById(eid+'-ok');
  if (error) { alert('Erro ao salvar: ' + error.message); return; }
  okEl.classList.add('show');
  setTimeout(()=>okEl.classList.remove('show'), 2000);
  // destaca a badge de carga (fica verde) pra indicar que já tem registro
  const cargabox = okEl ? okEl.closest('.cargabox') : null;
  if(cargabox) cargabox.classList.add('carga-registrada');
  aCargaFechar(eid);
  if (cargaNum != null) {
    (aTodosRegistros = aTodosRegistros || []).push({ exercicio_nome: exercicioNome, carga: cargaNum, reps: reps ? parseInt(reps) : null });
    if (maxAnt > 0 && cargaNum > maxAnt) {
      if (cargabox) cargabox.classList.add('carga-pr');
      const hd = document.getElementById(eid) ? document.getElementById(eid).querySelector('.ec-n') : null;
      if (hd && !hd.querySelector('.ec-pr')) { const s = document.createElement('span'); s.className = 'ec-pr'; s.textContent = '🏆 PR +' + (Math.round((cargaNum - maxAnt) * 10) / 10) + 'kg'; hd.appendChild(s); }
      if (navigator.vibrate) { try { navigator.vibrate([20,40,20,40,60]); } catch(e){} }
    }
  }
}

async function aSalvarTempo(eid, exercicioNome){
  if (aPreviewBloqueado()) return;
  const tempoEl = document.getElementById(eid+'-tempo');
  const tempo = tempoEl ? tempoEl.value : '';
  if (!tempo) return;
  const { error } = await aClient.from('registros_sessao').insert({
    aluno_id: aAlunoRow.id,
    protocolo_id: aProtocolo.id,
    exercicio_nome: exercicioNome,
    carga: null,
    reps: parseInt(tempo)
  });
  const okEl = document.getElementById(eid+'-ok');
  if (error) { alert('Erro ao salvar: ' + error.message); return; }
  okEl.classList.add('show');
  setTimeout(()=>okEl.classList.remove('show'), 2000);
  const box = okEl ? okEl.closest('.cargabox') : null;
  if(box) box.classList.add('carga-registrada');
  aCargaFechar(eid);
}

function aToggleProg(id, header){
  const body = document.getElementById(id);
  if (!body) return;
  const estiloAtual = body.style.display || window.getComputedStyle(body).display;
  const open = estiloAtual !== 'none';
  body.style.display = open ? 'none' : 'block';
  const arr = header.querySelector('.prog-arr');
  if (arr) arr.style.transform = open ? '' : 'rotate(180deg)';
}
function aToggleBloco(id, header){
  const body = document.getElementById(id);
  if (!body) return;
  // usa o estilo computado (não só inline) pra saber o estado real na primeira interação,
  // já que antes do primeiro clique body.style.display é '' (nunca foi setado via JS),
  // o que causava precisar de 2 cliques pra perceber o efeito
  const estiloAtual = body.style.display || window.getComputedStyle(body).display;
  const open = estiloAtual !== 'none';
  body.style.display = open ? 'none' : 'block';
  const arr = header.querySelector('.bt-arr');
  if (arr) arr.style.transform = open ? 'rotate(-90deg)' : 'rotate(0deg)';
}

// ── Agenda: calcula em que fase (Semana A/B/...) e dia da semana real
// estamos hoje, com base na data_inicio do protocolo e na duração
// (em semanas de calendário) de cada fase.
const FASES_TEMPLATE_PT = {
  base: { label:'Base', emoji:'🔵', rpe:'7–8', rir:'2 (última série 1)', carga:'Progressão dupla', volume:'Alto', descanso:'Compostos 2 min · isoladores 1 min',
    progressao:['Fase única de 8 semanas','Topo da faixa em todas as séries com RIR ≥2 → sobe a menor carga','Revisão a cada 4 semanas pelos registros e dor'],
    humano:['Esforço: termine cada série sentindo que ainda dava para fazer mais 2 repetições (na última série, 1).','Como evoluir: quando fizer o máximo de repetições em todas as séries e ainda sobrar fôlego, suba o menor peso possível.','Descanso: 2 min nos exercícios grandes e 1 min nos menores.'] },
  consolidacao: { label:'Consolidação', emoji:'🟢', rpe:'7–8', rir:'2', carga:'Manter e afinar', volume:'Alto', descanso:'Compostos 2 min · isoladores 1 min',
    progressao:['Semanas 9 a 12 do programa','Mantém as cargas da Construção e afina a técnica','Semana 12: testes e reavaliação'],
    humano:['Objetivo: fixar o que você conquistou e afinar a técnica.','Esforço: mantenha as cargas da Construção e termine sobrando 2 repetições.','Como evoluir: só suba o peso se fizer todas as repetições com boa técnica.','Corrida: se o teste da semana 8 foi bom, entra 1 treino de tiros por semana.','Semana 12: testes e reavaliação para o seu próximo Mapa.'] },
  intensificacao: { label:'Intensificação', emoji:'🔴', rpe:'7–9', rir:'1–3', carga:'~75–90%', volume:'Moderado', descanso:'Maior',
    progressao:['Semana 1: sobe carga','Semana 2: mantém carga + melhora execução','Semana 3: aproxima da falha (RIR 1–2)'],
    humano:['Esforço: mais pesado; termine as séries sentindo que dava para fazer de 1 a 3 repetições a mais.','Como evoluir: na semana 1 suba o peso, na 2 mantenha e capriche na execução, na 3 chegue mais perto do limite.','Descanso: um pouco maior entre as séries.'] },
  densidade: { label:'Densidade', emoji:'🟡', rpe:'7–9', rir:'1–2', carga:'Moderada (~65–80%)', volume:'Moderado/Alto', descanso:'Curto',
    progressao:['Reduz descanso','Mantém carga moderada, aumenta esforço total'],
    humano:['Esforço: peso moderado, séries mais cheias.','Como evoluir: descanse menos entre as séries, mantendo o mesmo peso.','Descanso: curto.'] },
  deload: { label:'Deload', emoji:'⚫', rpe:'4–6', rir:'4–6', carga:'~50–60%', volume:'Baixo', descanso:'Livre',
    progressao:['Reduz tudo (carga + volume)','Mantém padrão de movimento'],
    humano:['Esforço: leve; termine as séries sobrando bastante, com 4 a 6 repetições a mais.','Como evoluir: semana de recuperação, sem aumentar o peso.','Descanso: livre.'] }
};
const FASES_TEMPLATE_EN = {
  consolidacao: { label:'Consolidation', emoji:'🟢', rpe:'7–8', rir:'2', carga:'Hold and refine', volume:'High', descanso:'Compounds 2 min · isolations 1 min',
    progressao:['Weeks 9 to 12 of the program','Keeps the Build loads and refines technique','Week 12: tests and reassessment'],
    humano:['Goal: lock in what you gained and polish your technique.','Effort: keep the Build loads and finish each set with 2 reps left.','How to progress: only add weight if every rep is clean.','Running: if your week 8 test went well, one speed session per week starts.','Week 12: tests and reassessment for your next Map.'] },
  base: { label:'Base', emoji:'🔵', rpe:'7–8', rir:'2 (last set 1)', carga:'Double progression', volume:'High', descanso:'Compounds 2 min · isolations 1 min',
    progressao:['Single 8-week phase','Top of the range on all sets with RIR ≥2 → raise the lightest load','Review every 4 weeks using logs and pain'],
    humano:['Effort: finish each set feeling you could still do 2 more reps (1 on the last set).','How to progress: when you hit the top reps on every set and still have energy left, go up by the smallest weight step.','Rest: 2 min on big lifts and 1 min on smaller ones.'] },
  intensificacao: { label:'Intensification', emoji:'🔴', rpe:'7–9', rir:'1–3', carga:'~75–90%', volume:'Moderate', descanso:'Longer',
    progressao:['Week 1: raise load','Week 2: keep load + refine form','Week 3: approach failure (RIR 1–2)'],
    humano:['Effort: heavier; finish sets feeling you could do 1 to 3 more reps.','How to progress: week 1 go up in weight, week 2 hold and polish form, week 3 get closer to your limit.','Rest: a bit longer between sets.'] },
  densidade: { label:'Density', emoji:'🟡', rpe:'7–9', rir:'1–2', carga:'Moderate (~65–80%)', volume:'Moderate/High', descanso:'Short',
    progressao:['Cut rest time','Keep load moderate, raise total effort'],
    humano:['Effort: moderate weight, fuller sets.','How to progress: rest less between sets, same weight.','Rest: short.'] },
  deload: { label:'Deload', emoji:'⚫', rpe:'4–6', rir:'4–6', carga:'~50–60%', volume:'Low', descanso:'Free',
    progressao:['Reduce everything (load + volume)','Keep the movement pattern'],
    humano:['Effort: light; finish sets with plenty left, 4 to 6 more reps.','How to progress: recovery week, do not add weight.','Rest: free.'] }
};
function aFasesTemplate(){ return aLang === 'en' ? FASES_TEMPLATE_EN : FASES_TEMPLATE_PT; }

const A_FASES_COR = { base:'#3580D8', intensificacao:'#D43A3A', densidade:'#D4A017', deload:'#666666' };
function aPztDetId(ctxPrefix){ return 'pztdet-' + ctxPrefix; }
function aToggleTimelinePeriodizacao(btn){
  const id = btn.dataset.tgt;
  const el = document.getElementById(id);
  if (!el) return;
  const aberto = el.style.display !== 'none';
  el.style.display = aberto ? 'none' : 'block';
  btn.classList.toggle('open', !aberto);
}
// Linha de badges do dia: só o badge de fase (data e "periodização prevista" saíram na v49).
function aMontarLinhaBadges(semanaAtual){
  const b = aMontarBadgeFase(semanaAtual, 'dash');
  const slot = document.getElementById('tFaseBadgeSlot');
  if (slot) { slot.innerHTML = b; return ''; } // v62.14: o badge de fase mora na linha da divisão, no cabeçalho
  return b ? '<div class="dash-badges-row">' + b + '</div>' : '';
}
// Badge compacto e clicável ("📈 Periodização prevista ▾") — mesmo padrão do
// badge de fase (aMontarBadgeFase/aToggleFaseDetalhe): recolhido por padrão,
// só mostra/esconde o gráfico ao clicar.
function aMontarBadgeTimeline(ctxPrefix){
  const detId = aPztDetId(ctxPrefix);
  return '<button type="button" class="fase-badge" data-tgt="' + detId + '" onclick="aToggleTimelinePeriodizacao(this)">📈 ' + (aLang==='en'?'Planned periodization':'Periodização prevista') + ' <span class="fase-badge-arrow">▾</span></button>';
}
// Espelha a mesma lógica do Gerador (montarTimelinePeriodizacao), mas aqui
// dentro de um card recolhível — "você está aqui", calculado a partir de
// agenda.semanaGlobal (semanas corridas desde o início do protocolo).
function aMontarTimelinePeriodizacao(lista, semanaAtualGlobal, ctxPrefix){
  const ft = aFasesTemplate();
  const total = lista.reduce((acc,s)=>acc+(s.duracaoSemanas||4),0) || 1;
  const segs = lista.map(s=>{
    const dur = s.duracaoSemanas||4;
    const f = ft[s.fase];
    const bg = f ? A_FASES_COR[s.fase] : null;
    const txtCompleto = f ? (f.emoji+' '+f.label) : (aLang==='en'?'— no phase —':'— sem fase —');
    // Nome da fase já está na legenda abaixo — dentro do segmento mostra só
    // emoji + duração, e omite tudo se o segmento for estreito demais pra
    // caber (o tooltip no hover continua com a informação completa).
    const estreito = (dur/total) < 0.07;
    const lbl = estreito ? '' : '<span class="a-pzt-seg-lbl">'+(f?f.emoji:'—')+' '+dur+(aLang==='en'?'wk':'sem')+'</span>';
    return '<div class="a-pzt-seg'+(!f?' a-pzt-sem-fase':'')+'" style="flex:'+dur+' '+dur+' 0;'+(bg?'background:'+bg:'')+'" title="'+aEsc(s.nome)+' — '+aEsc(txtCompleto)+' — '+dur+(aLang==='en'?' wk':' sem')+'.">'+
      lbl+'</div>';
  }).join('');
  const marker = (semanaAtualGlobal!=null) ? '<div class="a-pzt-marker" data-label="'+(aLang==='en'?'you are here ▾':'você está aqui ▾')+'" style="left:'+Math.min(99,Math.max(0,semanaAtualGlobal/total*100))+'%"></div>' : '';
  const testeMarkers = (aTestesAgendados||[]).map(t=>
    '<div class="a-pzt-teste-marker" style="left:'+Math.min(99,Math.max(0,t.semana/total*100))+'%" title="🎯 '+(aLang==='en'?'Test':'Teste')+' — '+(aLang==='en'?'week ':'semana ')+(t.semana+1)+(t.dia?' · '+aEsc(aDiaExibicao(t.dia)):'')+'">🎯</div>'
  ).join('');
  const legenda = Object.keys(ft).filter(k=>k!=='deload').map(k=>'<span>'+ft[k].emoji+' '+ft[k].label+'</span>').join('');
  const detId = aPztDetId(ctxPrefix);
  return '<div class="a-pzt-wrap" id="' + detId + '" style="display:none">'+
    '<div class="a-pzt-title">'+(aLang==='en'?'Planned periodization':'Periodização prevista')+' ('+total+(aLang==='en'?' weeks)':' semanas)')+'</div>'+
    '<div class="a-pzt-track">'+segs+marker+testeMarkers+'</div>'+
    '<div class="a-pzt-legend">'+legenda+'</div>'+
  '</div>';
}

const DIAS_SEMANA_ORDEM = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const DIAS_SEMANA_INICIAL = ['D','S','T','Q','Q','S','S'];
let aDataSelecionadaISO = null; // null = hoje (comportamento padrão, sem navegação manual)
function aDatasDaSemanaAtual(){
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const domingo = new Date(hoje); domingo.setDate(hoje.getDate() - hoje.getDay());
  const arr = [];
  for (let i=0;i<7;i++){ const d = new Date(domingo); d.setDate(domingo.getDate()+i); arr.push(d); }
  return arr;
}
function aToggleHeader(){
  const el = document.getElementById('tHeaderRecolhivel');
  const btn = document.getElementById('tHeaderToggle');
  const txt = document.getElementById('tHeaderToggleTxt');
  if (!el) return;
  const recolhido = el.style.display === 'none';
  el.style.display = recolhido ? '' : 'none';
  if (btn) btn.firstChild.textContent = recolhido ? '▲ ' : '▼ ';
  if (txt) txt.textContent = recolhido ? (aLang==='en'?'collapse':'recolher') : (aLang==='en'?'expand':'expandir');
}
function aMontarStripDias(){
  const el = document.getElementById('tSemanaStrip');
  if (!el || !aSemanasAtual || !aProtoAtual) return;
  const hojeKey = aDataParaChave(new Date());
  const selKey = aDataSelecionadaISO || hojeKey;
  const datas = aDatasDaSemanaAtual();
  el.innerHTML = datas.map(function(d){
    const key = aDataParaChave(d);
    const diaSemana = DIAS_SEMANA_ORDEM[d.getDay()];
    const ag = aCalcularAgendaHoje(aProtoAtual, aSemanasAtual, key);
    const semanaObj = aSemanasAtual[ag.semanaIdx];
    const temTreino = semanaObj ? (semanaObj.dias||[]).some(function(dd){ return aDiaSemanaEfetivo(dd) === diaSemana; }) : false;
    const classes = ['semana-strip-dia'];
    if (key === hojeKey) classes.push('hoje');
    if (key === selKey) classes.push('sel');
    if (temTreino) classes.push('tem-treino');
    return '<div class="' + classes.join(' ') + '" onclick="aSelecionarDiaSemana(\'' + key + '\')" title="' + aEsc(diaSemana) + ' — ' + d.getDate() + '/' + (d.getMonth()+1) + '">' +
      '<span>' + DIAS_SEMANA_INICIAL[d.getDay()] + '</span><span class="ssd-data">' + d.getDate() + '/' + (d.getMonth()+1) + '</span><span class="ssd-dot"></span></div>';
  }).join('') + '<div class="semana-strip-dia semana-strip-mais" onclick="aVerSemanaCompleta()" title="' + (aLang==='en'?'See full protocol':'Ver protocolo completo') + '"><span>+</span></div>';
}
function aDataParaChave(d){ return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function aSelecionarDiaSemana(dataISO){
  const hojeKey = aDataParaChave(new Date());
  aDataSelecionadaISO = (dataISO === hojeKey) ? null : dataISO;
  aDiaSubstituto = null;
  aAgendaAtual = aCalcularAgendaHoje(aProtoAtual, aSemanasAtual, dataISO);
  const cont = document.getElementById('tDashConteudo');
  if (cont) cont.innerHTML = aMontarDashboardHoje(aSemanasAtual, aAgendaAtual);
  aMontarStripDias();
  aSessaoRestaurar();
}
const DIAS_SEMANA_SET = new Set(DIAS_SEMANA_ORDEM.map(d => d.toLowerCase()));

// resolve o "dia real da semana" de um dia do protocolo: usa diaSemana se
// estiver definido; senão tenta usar o próprio nome de exibição, CASO ele
// já seja um nome de dia da semana reconhecível (protocolos antigos, salvos
// antes do campo diaSemana existir, costumam ter o nome = dia da semana).
function aDiaSemanaEfetivo(d){
  if (d.diaSemana) return d.diaSemana;
  const nomeNorm = (d.nome || '').trim().toLowerCase();
  if (DIAS_SEMANA_SET.has(nomeNorm)) {
    return DIAS_SEMANA_ORDEM.find(x => x.toLowerCase() === nomeNorm);
  }
  return null;
}

function aFormatarDataCurta(d){
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  return dd + '/' + mm;
}

function aAddDias(data, n){
  const d = new Date(data);
  d.setDate(d.getDate() + n);
  return d;
}

// retorna {inicio: Date, fim: Date} de cada mesociclo (semana/fase), em ordem,
// com base na data_inicio do protocolo e na duração (em semanas) de cada um
function aCalcularIntervalosMesociclos(proto, semanas){
  const intervalos = [];
  if (!proto.data_inicio) return intervalos;
  let cursor = new Date(proto.data_inicio + 'T00:00:00');
  semanas.forEach(s => {
    const dur = s.duracaoSemanas || 4;
    const inicio = new Date(cursor);
    const fim = aAddDias(cursor, dur * 7 - 1);
    intervalos.push({ inicio, fim });
    cursor = aAddDias(cursor, dur * 7);
  });
  return intervalos;
}

function aCalcularAgendaHoje(proto, semanas, dataAlvoISO){
  if (!proto.data_inicio || !semanas.length) return { semanaIdx: 0, diaSemanaHoje: null, semanaDentroFase: 1 };

  const inicio = new Date(proto.data_inicio + 'T00:00:00');
  const hoje = dataAlvoISO ? new Date(dataAlvoISO + 'T00:00:00') : new Date();
  hoje.setHours(0,0,0,0);

  const diffMs = hoje - inicio;
  let diffSemanasCorridas = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  // Loop: quando o professor liga, o treino recomeça da semana 1 em vez de travar na última fase
  if (diffSemanasCorridas > 0 && (proto.loop || (proto.conteudo && proto.conteudo.loop))) {
    const totSem = semanas.reduce((x, sm) => x + (sm.duracaoSemanas || 4), 0);
    if (totSem > 0) diffSemanasCorridas = diffSemanasCorridas % totSem;
  }

  let semanaIdx = 0;
  let semanaDentroFase = 1;
  if (diffSemanasCorridas >= 0) {
    let acumulado = 0;
    for (let i = 0; i < semanas.length; i++) {
      const dur = semanas[i].duracaoSemanas || 4;
      if (diffSemanasCorridas < acumulado + dur) {
        semanaIdx = i;
        semanaDentroFase = (diffSemanasCorridas - acumulado) + 1; // 1-based
        break;
      }
      acumulado += dur;
      semanaIdx = i; // se passar de todas, fica na última (repete/mantém)
      semanaDentroFase = dur; // trava no fim da última fase
    }
  }

  const diaSemanaHoje = DIAS_SEMANA_ORDEM[hoje.getDay()];
  return { semanaIdx, diaSemanaHoje, semanaDentroFase, semanaGlobal: Math.max(0, diffSemanasCorridas) };
}

// Mesma lógica de condSugestao() do Gerador, replicada aqui pro app do aluno
// (puramente informativo — deriva duração/zona sugeridas a partir da fase do
// mesociclo, sem mudar nada do que o professor já digitou).
// ── Plano de corrida/condicionamento por modelo (mesmo código no Gerador e no app) ──
// Campos do bloco: modelo, duracao (tempo), dist (km), ritmo (min/km), tiros, esf, rec. Dois de (tempo, dist, ritmo) fecham o terceiro.
// Progressão: volume antes de intensidade, +8%/sem em 3 sem de carga + 1 de assimilação (ciclo de 4); 2º ciclo parte 12% acima; teto +30%.
// Pace automático: zonas de Daniels (VDOT do teste de 3 km do aluno) quando não há ritmo digitado.
var CP_ZONAS=['Recuperação','Fácil','Maratona','Limiar','Intervalo','Repetição'];
var CP_MODELOS={
 continuo:{nome:'Contínuo',zona:1,obs:'ritmo de conversa (dá para falar frases curtas); cerca de 80% do que você corre na semana deve ser assim'},
 regenerativo:{nome:'Regenerativo',zona:0,obs:'bem leve e sem progressão: serve para recuperar'},
 longao:{nome:'Longão',zona:1,obs:'a sessão mais longa da semana, sempre em ritmo fácil'},
 tempo:{nome:'Tempo run (limiar)',zona:3,obs:'ritmo forte e firme, dá para falar só poucas palavras; só com base de corrida e sem dor'},
 fartlek:{nome:'Fartlek',zona:3,obs:'alterna trechos fortes por percepção com trotes leves, sem relógio rígido'},
 intervalado:{nome:'Intervalado',zona:4,obs:'tiros com recuperação ativa; aumenta o número de tiros antes de acelerar'},
 caminhada:{nome:'Caminhada-corrida',zona:0,obs:'alterna corrida leve e caminhada; aumenta o tempo correndo aos poucos'}
};
function cpFator(w){w=Math.max(1,parseInt(w,10)||1);var k=(w-1)%4,c=Math.floor((w-1)/4);return{f:Math.min(1+0.12*c+(k===3?0:0.08*k),1.3),assim:k===3,ciclo:c};}
function cpNum(x){var s=String(x==null?'':x).replace(',','.'),t='',ok=false,i,c;for(i=0;i<s.length;i++){c=s.charAt(i);if((c>='0'&&c<='9')||(c==='.'&&ok&&t.indexOf('.')<0)){t+=c;ok=true;}else if(ok)break;}return ok?parseFloat(t):null;}
function cpRitmoSeg(r){var p=String(r||'').split(':');if(p.length<2)return null;var m=parseInt(p[0],10),q=parseInt(p[1],10);return(isNaN(m)||isNaN(q))?null:m*60+q;}
function cpRitmoTxt(sg){sg=Math.round(sg);var q=sg%60;return Math.floor(sg/60)+':'+(q<10?'0':'')+q;}
function cpR2(x){return Math.round(x*100)/100;}
function cpKm(x){return String(Math.round(x*10)/10).replace('.',',');}
function cpPlano(b,w,N,zonaSeg){
  var mod=b&&b.modelo,M=CP_MODELOS[mod];if(!M)return null;
  var r=cpFator(w),f=r.f,tb=cpNum(b.duracao),d0=cpNum(b.dist),rit=cpRitmoSeg(b.ritmo),auto=false;
  var esf=cpNum(b.esf),rec=cpNum(b.rec),zi=M.zona,ser=(mod!=='intervalado'&&mod!=='caminhada');
  if(mod==='intervalado')zi=((esf||1)<=2)?5:4;
  if(!rit&&tb&&d0&&ser)rit=tb*60/d0;
  if(!rit&&typeof zonaSeg==='function'){var zs=zonaSeg(zi);if(zs){rit=zs;auto=true;}}
  if(!tb&&d0&&rit&&ser)tb=d0*rit/60;
  var o={modelo:mod,w:w,N:N,assim:r.assim,ciclo:r.ciclo,zonaIdx:zi,ritmoSeg:rit,ritmoAuto:auto,tempo:null,dist:null,tiros:null,esf:null,rec:null,pctEsf:null,corre:null,anda:null,reps:null};
  if(mod==='intervalado'){
    var n0=parseInt(b.tiros,10)||4;esf=esf||1;rec=rec||(2*esf);
    o.tiros=Math.max(n0,Math.round(n0*f));o.esf=esf;o.rec=rec;o.tempo=Math.round(10+o.tiros*(esf+rec));
    if(rit)o.dist=cpR2(o.tiros*esf*60/rit);
  }else if(mod==='caminhada'){
    var c0=esf||1,a0=rec||2,T=tb||20,cs=c0-1+(w-Math.floor(w/4));cs=Math.max(c0,Math.min(cs,Math.max(c0,T-a0)));
    var reps=Math.max(1,Math.round(T/(cs+a0)));
    o.corre=cs;o.anda=a0;o.reps=reps;o.tempo=reps*(o.corre+o.anda);
    if(rit)o.dist=cpR2(reps*o.corre*60/rit);
  }else if(tb){
    o.tempo=(mod==='regenerativo')?Math.round(tb):Math.round(tb*f);
    if(mod==='fartlek'){o.pctEsf=Math.min(35,20+Math.round((f-1)*30));o.esf=Math.max(1,Math.round(o.tempo*o.pctEsf/100));}
    if(rit)o.dist=cpR2(o.tempo*60/rit);
  }
  return o;
}
function cpResumo(p){
  var pc=p.ritmoSeg?(cpRitmoTxt(p.ritmoSeg)+'/km'+(p.ritmoAuto?' ('+CP_ZONAS[p.zonaIdx]+')':'')):'';
  if(p.modelo==='intervalado')return p.tiros+' x '+p.esf+' min forte + '+p.rec+' min leve'+(pc?' · tiro a '+pc:'')+' · ~'+p.tempo+' min no total';
  if(p.modelo==='caminhada')return p.reps+' x ('+p.corre+' min corre + '+p.anda+' min anda) · '+p.tempo+' min'+(p.dist?' · ~'+cpKm(p.dist)+' km correndo':'')+(pc?' · '+pc:'');
  var t=p.tempo+' min';
  if(p.modelo==='fartlek')t+=' · ~'+p.esf+' min em esforço ('+p.pctEsf+'%)';
  return t+(p.dist?' · ~'+cpKm(p.dist)+' km':'')+(pc?' · ritmo '+pc:'');
}
function cpObs(p){
  var M=CP_MODELOS[p.modelo];
  var fase=(p.modelo==='regenerativo')?'sem progressão (recuperação)':(p.assim?'semana de assentar: repete o nível da anterior, sem aumentar':(p.w>1?'semana de aumento: um pouco mais que a anterior':'semana de partida'));
  return fase+'; '+M.obs+'; se sentir dor ou ficar muito cansado, repita a semana passada';
}
function cpSemanaGlobal(inicio,sems){
  var N=0,i;for(i=0;i<(sems||[]).length;i++)N+=parseInt(sems[i].duracaoSemanas,10)||4;if(!N)N=1;
  var w=1;if(inicio){var d=Math.floor((new Date()-new Date(inicio+'T00:00:00'))/604800000)+1;w=Math.min(Math.max(d,1),N);}
  return{w:w,N:N};
}
function cpZonaSeg(i){var z=(typeof aZonasAtuais==='function')?aZonasAtuais():null;if(!z||!z[i])return null;return cpRitmoSeg(z[i].pace);}
function aCondFatorBase(w){
  w = Math.max(1, parseInt(w) || 1); const k = (w-1)%4, c = Math.floor((w-1)/4);
  return { f: 1 + 0.12*c + (k===3 ? 0 : 0.08*k), assim: k===3, ciclo: c };
}
function aCondSugestao(faseKey, duracaoBase, zonaBase, sem, durSem){
  const ft = aFasesTemplate()[faseKey];
  if (!ft) return null;
  const m = String(duracaoBase||'').match(/(\d+)/);
  const minBase = m ? parseInt(m[1]) : null;
  const zonas = ['Z1','Z2','Z3','Z4','Z5'];
  const zIdx = zonaBase ? zonas.indexOf(zonaBase) : 1;
  let minutos = minBase, zonaSug = zonaBase || 'Z2', obsTxt = '';
  if (faseKey === 'base') {
    minutos = minBase; zonaSug = zonaBase || 'Z2'; obsTxt = 'ritmo constante, construção de base';
    const w = parseInt(sem) || 0;
    if (minBase && w) {
      const N = parseInt(durSem) || 8, r = aCondFatorBase(w);
      minutos = Math.min(Math.round(minBase*r.f), Math.round(minBase*1.3));
      obsTxt = (r.assim ? 'semana de assimilação: consolida, só Z2, sem intervalado' : 'semana de carga ' + w + '/' + N + (w > 1 ? ': +8% sobre a anterior' : ': duração de partida')) + '; ~80% em Z1–Z2 (fala frases curtas)' + ((!r.assim && r.ciclo >= 1) ? '; opcional 1 sessão/sem de qualidade Z4 (4 × 3-4 min, 2-3 min leve) se RPE ≤7 e sem dor' : '') + '; dor ou RPE ≥9: repita a semana anterior';
    }
  } else if (faseKey === 'intensificacao') {
    minutos = minBase ? Math.max(10, Math.round(minBase*0.85)) : minBase;
    zonaSug = zonas[Math.min(zIdx+1,4)]; obsTxt = 'menos duração, mais intensidade';
  } else if (faseKey === 'densidade') {
    minutos = minBase ? Math.max(8, Math.round(minBase*0.7)) : minBase;
    zonaSug = zonas[Math.min(zIdx+1,4)]; obsTxt = 'intervalado, descansos curtos';
  } else if (faseKey === 'deload') {
    minutos = minBase ? Math.max(8, Math.round(minBase*0.6)) : minBase;
    zonaSug = zonas[Math.max(zIdx-1,0)]; obsTxt = 'recuperação ativa, sem esforço alto';
  }
  return { duracaoTxt: minutos ? minutos+' min' : (duracaoBase||'—'), zonaTxt: zonaSug, obsTxt };
}

// Labels da zona de FC (dropdown do bloco Condicionamento) — escala própria,
// diferente da escala de pace (A_ZONAS_PCT) usada pelo marcador (z#) no texto
// livre. Usar o nome aqui em vez do código Z1-Z5 evita mostrar "Z4" duas vezes
// com significados diferentes no mesmo bloco.
const A_ZONA_FC_LABEL = { Z1:'Recuperação', Z2:'Base', Z3:'Moderado', Z4:'Intenso', Z5:'Máximo' };
function aBlocoOut(b, faseAtual, ctxPrefix, bIdx, semanaDentroFase, duracaoSemanas){
  const bid = (ctxPrefix||'bl') + '-b' + (bIdx!=null?bIdx:Math.random().toString(36).slice(2,9));
  if (b.id === 'con') {
    // Nome descritivo em vez do código "Z1".."Z5" cru: o código sozinho colide
    // visualmente com os badges "Z1".."Z6" gerados pelo marcador (z#) no texto
    // livre — que é uma escala DIFERENTE (zonas de pace do teste de 3km), então
    // mostrar "Z4" nos dois lugares parecia informação duplicada/conflitante.
    const zonaChip = b.zonaFC ? '<span class="cond-chip">💓 '+aEsc(A_ZONA_FC_LABEL[b.zonaFC]||b.zonaFC)+'</span>' : '';
    let progHTML = '';
    if (b.progressaoAuto && b.modelo && typeof cpPlano === 'function') {
      const g = cpSemanaGlobal(aProtocolo && aProtocolo.data_inicio, (aProtocolo && aProtocolo.conteudo && aProtocolo.conteudo.semanas) || []);
      const pl = cpPlano(b, g.w, g.N, cpZonaSeg);
      if (pl && pl.tempo) progHTML = '<div class="cond-prog">📍 Hoje (semana ' + g.w + '/' + g.N + '): ' + aEsc(cpResumo(pl)) + '</div><div class="cond-prog" style="opacity:.75;font-size:11px">' + aEsc(cpObs(pl)) + '</div>';
    }
    if (!progHTML && b.progressaoAuto && faseAtual) {
      const sug = aCondSugestao(faseAtual, b.duracao, b.zonaFC, semanaDentroFase, duracaoSemanas);
      if (sug) {
        progHTML = '<div class="cond-prog">📍 Hoje: ' + aEsc(sug.duracaoTxt) + ' · ' + aEsc(sug.zonaTxt) + (sug.obsTxt ? ' — ' + aEsc(sug.obsTxt) : '') + '</div>';
      }
    }
    const exsCon = aRenderExercicios(b, faseAtual, bid, semanaDentroFase, duracaoSemanas);
    return '<div class="bloco" id="bloco-'+bid+'"><div class="bh" data-bid="'+bid+'" onclick="aToggleBloco(this.dataset.bid,this)"><div class="dot" style="border-left-color:'+(b.cor||'#999')+'"></div><span class="bt">'+aEsc(b.nome)+'</span>'+(b.duracao?'<span class="bm">'+aEsc(b.duracao)+'</span>':'')+'<span class="bt-arr" style="transform:rotate(-90deg)">▾</span><button class="bloco-done-btn" id="bdone-'+bid+'" data-bid="'+bid+'" onclick="event.stopPropagation();aBlocoToggleDone(this.dataset.bid)" title="Concluir bloco">✓</button></div><div class="exl" id="'+bid+'" style="padding:12px;display:none"><div style="font-size:13.5px;font-weight:700;color:var(--tx);letter-spacing:-.01em">'+aProcessarZonasTexto(aEsc(b.titulo||''))+'</div><div style="font-size:11.5px;color:var(--t2);margin-top:4px;line-height:1.5">'+aProcessarZonasTexto(aEsc(b.desc||'').replace(/\n/g,'<br>'))+'</div>'+(zonaChip?'<div style="margin-top:8px">'+zonaChip+'</div>':'')+progHTML+(b.url?"<div style='margin-top:10px'><button data-url='"+aEsc(b.url)+"' onclick='aAbrirVideoModal(this.dataset.url)' style='font-size:12px;color:var(--P);font-weight:600;background:none;border:none;cursor:pointer;padding:0;display:inline-flex;align-items:center;gap:4px'>▶️ " + (aLang==='en'?"Watch video":"Ver vídeo") + "</button></div>":"")+(exsCon?'<div style="margin-top:10px">'+exsCon+'</div>':'')+'</div></div>';
  }
  const exs = aRenderExercicios(b, faseAtual, bid, semanaDentroFase, duracaoSemanas);
  const obsBloco = b.obs ? '<div class="b-obs" id="bobs-'+bid+'">'+aEsc(b.obs)+'</div>' : '';
  const dicaBtn = b.obs ? '<button type="button" class="b-tip" data-bid="'+bid+'" onclick="event.stopPropagation();aBlocoDica(this.dataset.bid)" aria-label="Dica">💡</button>' : '';
  return '<div class="bloco'+(aEhAtiv(b)?' bloco-ativ':'')+'" id="bloco-'+bid+'"><div class="bh" data-bid="'+bid+'" onclick="aToggleBloco(this.dataset.bid,this)"><div class="dot" style="border-left-color:'+(b.cor||'#999')+'"></div><span class="bt">'+aEsc(b.nome)+'</span>'+dicaBtn+(b.meta?'<span class="bm">'+aEsc(b.meta)+'</span>':'')+'<span class="bp" id="bp-'+bid+'"></span><span class="bt-arr">▾</span><button class="bloco-done-btn" id="bdone-'+bid+'" data-bid="'+bid+'" onclick="event.stopPropagation();aBlocoToggleDone(this.dataset.bid)" title="Concluir bloco">✓</button></div>'+obsBloco+'<div class="exl" id="'+bid+'">'+exs+'</div></div>';
}

// Monta a lista de exercícios de um bloco, agrupando os que estão marcados
// como "conjugado" (cj) no mesmo card visual — espelha o agrupamento que já
// existe no editor do Gerador (cj-group), pra o aluno ver claramente quais
// exercícios são feitos em sequência, sem descanso entre eles.
const A_METODOS = {
  conjugado: { e:'🔗', pt:'Faça em sequência, descansando só ao fim do grupo.', en:'Do them back to back, rest only after the group.' },
  progressivo: { e:'📈', pt:'Aumente a carga a cada série, mantendo a execução.', en:'Increase the load every set, keeping form.' },
  piramide: { e:'🔺', pt:'A carga sobe e as repetições descem a cada série.', en:'Load goes up and reps go down every set.' },
  dropset: { e:'⬇️', pt:'Ao chegar perto da falha, reduza a carga e continue.', en:'Near failure, drop the load and keep going.' }
};
function aRenderExercicios(b, faseAtual, ctxPrefix, semanaDentroFase, duracaoSemanas){
  const cgs = b.conjGroups || {};
  const exercicios = b.exercicios || [];
  const renderedGroups = new Set();
  let h = '';
  exercicios.forEach((ex, idx) => {
    const gk = String(ex.cj);
    const eid = ctxPrefix + '-e' + idx;
    if (ex.cj != null) {
      if (renderedGroups.has(gk)) return; // já renderizou esse grupo inteiro
      renderedGroups.add(gk);
      const g = cgs[gk] || { label: aT('conjugado'), rest: '', restAfter: '' };
      const mt = A_METODOS[g.metodo] || A_METODOS.conjugado;
      const gExsIdx = [];
      exercicios.forEach((e,i) => { if (String(e.cj) === gk) gExsIdx.push(i); });
      const itensHTML = gExsIdx.map(i => aExCard(exercicios[i], faseAtual, ctxPrefix + '-e' + i, b.progressaoAuto, semanaDentroFase, duracaoSemanas, true)).join('');
      // Descanso do GRUPO (um só): "após o grupo" se o professor definiu; senão o
      // descanso do 1º exercício que tiver; senão 60s. O chip fica no cabeçalho e
      // o cronômetro automático dispara ao concluir a série do ÚLTIMO exercício.
      let gRest = g.restAfter || '';
      if (!gRest) { gExsIdx.forEach(function(i){ if (!gRest && exercicios[i].rest) gRest = exercicios[i].rest; }); }
      const gLabel = (g.label || aT('conjugado')) + ((!g.metodo || g.metodo === 'conjugado') ? (aLang === 'en' ? ' · quick transition' : ' · transição rápida') : '');
      const gDica = aLang === 'en' ? mt.en : mt.pt;
      const gLastEid = ctxPrefix + '-e' + gExsIdx[gExsIdx.length - 1];
      const gChip = '<span class="ec-chip ec-chip-r ec-chip-clicavel a-cj-rest' + (gRest ? '' : ' ec-chip-rlivre') + '" data-tempo="' + aEsc(gRest || '60s') + '" data-nome="' + aEsc(gLabel) + '" data-eid="' + gLastEid + '" onclick="aIniciarDescanso(this.dataset.tempo,this.dataset.nome,this.dataset.eid)" title="' + aEsc(aT('descanso_apos_grupo')) + '">💤 ' + aEsc(gRest || '60s') + '</span>';
      h += '<div class="a-cj-group">' +
        '<div class="a-cj-head" title="' + aEsc(gDica) + '"><span class="a-cj-ic">' + mt.e + '</span><span class="a-cj-label">' + aEsc(gLabel) + '</span>' + gChip + '</div>' +
        (g.metodo && g.metodo !== 'conjugado' ? '<div class="a-cj-dica">' + aEsc(gDica) + '</div>' : '') +
        '<div class="a-cj-items">' + itensHTML + '</div>' +
      '</div>';
    } else {
      h += aExCard(ex, faseAtual, eid, b.progressaoAuto, semanaDentroFase, duracaoSemanas);
    }
  });
  return h;
}

let aProtoAtual = null;
let aSemanasAtual = null;
let aAgendaAtual = null;

function aDataCompacta(){
  const hoje = new Date();
  const dd = String(hoje.getDate()).padStart(2,'0');
  const mm = String(hoje.getMonth()+1).padStart(2,'0');
  return dd + '/' + mm;
}

// Explicações simples dos termos técnicos de fase, pro aluno que não conhece
// a jargão de treino. Mostrado via botão "o que é isso?" — puramente textual,
// não interfere em nenhum cálculo. Os textos vêm do dicionário aUI (traduzido).
function aMontarTermosHelp(){
  const termos = ['rpe','rir','carga','volume','descanso'];
  const itens = termos.map(t =>
    '<div class="termo-item"><b>' + aEsc(aT(t+'_titulo')) + '</b> — ' + aEsc(aT(t+'_texto')) + '</div>'
  ).join('');
  return '<div class="termos-help">' + itens + '</div>';
}

// ID determinístico do bloco de detalhe da fase, a partir de um prefixo de contexto
// estável (ex: 'dash' no Dashboard hoje, 'sem-<semanaId>' na Semana completa).
// Evita o mesmo problema já corrigido nos cards de exercício: Math.random() geraria
// um id novo a cada re-render e quebraria a referência entre o badge e o card.
function aFaseDetId(ctxPrefix){ return 'fasedet-' + ctxPrefix; }

// Badge compacto e clicável ("🔵 Base ▾") — substitui o card de fase sempre visível.
// Ao clicar, alterna a exibição do card de detalhe (aMontarCardFase) correspondente.
function aMontarBadgeFase(semana, ctxPrefix){
  const FT = aFasesTemplate();
  const _fk = (semana.nome === 'Consolidação' && FT.consolidacao) ? 'consolidacao' : semana.fase;
  if (!semana.fase || !FT[_fk]) return '';
  const ft = FT[_fk];
  const detId = aFaseDetId(ctxPrefix);
  return '<button type="button" class="fase-badge" data-tgt="' + detId + '" onclick="aToggleFaseDetalhe(this)">' + ft.emoji + ' ' + aEsc(ft.label) + ' <span class="fase-badge-arrow">▾</span></button>';
}

function aToggleFaseDetalhe(btn){
  const id = btn.dataset.tgt;
  const el = document.getElementById(id);
  if (!el) return;
  const aberto = el.style.display !== 'none';
  el.style.display = aberto ? 'none' : 'block';
  btn.classList.toggle('open', !aberto);
}

function aMontarCardFase(semana, semanaDentroFase, ctxPrefix){
  const FT = aFasesTemplate();
  const _fk = (semana.nome === 'Consolidação' && FT.consolidacao) ? 'consolidacao' : semana.fase;
  if (!semana.fase || !FT[_fk]) return '';
  const ft = FT[_fk];
  const detId = aFaseDetId(ctxPrefix);
  const helpId = 'th-' + detId;
  if (ft.humano) {
    return '<div class="fase-card" id="' + detId + '" style="display:none">' +
      '<div class="fase-tag">' + ft.emoji + ' ' + aEsc(ft.label) + '</div>' +
      '<ul class="fase-hum" style="margin:6px 0 0;padding-left:16px;font-size:12px;line-height:1.5;color:var(--t2)">' + ft.humano.map(function(t){ return '<li>' + aEsc(t) + '</li>'; }).join('') + '</ul>' +
    '</div>';
  }
  return '<div class="fase-card" id="' + detId + '" style="display:none">' +
    '<div class="fase-tag">' + ft.emoji + ' ' + aEsc(ft.label) + '</div>' +
    '<div class="fase-params">RPE ' + aEsc(ft.rpe) + ' · RIR ' + aEsc(ft.rir) + ' · ' + aEsc(aT('carga')) + ' ' + aEsc(ft.carga) + ' · ' + aEsc(aT('volume_titulo')) + ' ' + aEsc(ft.volume) + ' · ' + aEsc(aT('descanso_titulo')) + ' ' + aEsc(ft.descanso) +
      ' <button class="termo-btn" data-tgt="' + helpId + '" onclick="aToggleTermos(this.dataset.tgt)">' + aEsc(aT('o_que_e_isso')) + '</button>' +
    '</div>' +
    '<div id="' + helpId + '" style="display:none">' + aMontarTermosHelp() + '</div>' +
  '</div>';
}

function aToggleTermos(id){
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

let aDiaSubstituto = null; // quando o aluno escolhe puxar o treino de outro dia num dia sem treino previsto
function aExecutarDiaSubstituto(){
  const sel = document.getElementById('dia-substituto-sel');
  if (!sel || !sel.value) return;
  aDiaSubstituto = sel.value;
  const cont = document.getElementById('tDashConteudo');
  if (cont) cont.innerHTML = aMontarDashboardHoje(aSemanasAtual, aAgendaAtual);
}
function aMontarDashboardHoje(semanas, agenda){
  const dataCompacta = aDataCompacta();

  if (!agenda.diaSemanaHoje) {
    return '<div class="dash-empty"><div class="ic">🗓️</div>' + aT('nao_identificou_hoje') + '<br>' + aT('confira_semana') + '</div>';
  }

  const semanaAtual = semanas[agenda.semanaIdx];
  if (!semanaAtual) {
    return '<div class="dash-empty"><div class="ic">🗓️</div>' + aT('nao_identificou_hoje') + '</div>';
  }

  let diaHoje = (semanaAtual.dias || []).find(d => aDiaSemanaEfetivo(d) === agenda.diaSemanaHoje);
  let usandoSubstituto = false;
  if (!diaHoje && aDiaSubstituto) {
    diaHoje = (semanaAtual.dias || []).find(d => d.id === aDiaSubstituto);
    usandoSubstituto = !!diaHoje;
  }
  if (!diaHoje) {
    const opcoesSub = (semanaAtual.dias || []).map(d => '<option value="' + aEsc(d.id) + '">' + aEsc(d.nome) + '</option>').join('');
    // Nem todo dia sem treino previsto é "descanso de propósito" — às vezes a
    // rotina muda na semana e o aluno quer/precisa treinar mesmo assim. Deixa
    // escolher um treino de outro dia pra rodar hoje, sem perder o controle
    // de que dia realmente foi feito (a sessão é registrada com a data de
    // hoje, não a do dia copiado).
    const seletorSub = opcoesSub ? (
      '<div style="margin-top:14px;max-width:320px;margin-left:auto;margin-right:auto">' +
        '<div style="font-size:11px;color:var(--t3);margin-bottom:6px">' + (aLang==='en'?'Want to run a different workout today anyway?':'Saiu da rotina? Dá pra puxar outro treino pra hoje mesmo assim:') + '</div>' +
        '<select id="dia-substituto-sel" style="font-size:12px;padding:7px 9px;width:100%;margin-bottom:8px"><option value="">' + (aLang==='en'?'— choose a workout —':'— escolher um treino —') + '</option>' + opcoesSub + '</select>' +
        '<button class="btn bs" style="width:100%;font-size:12px;padding:8px" onclick="aExecutarDiaSubstituto()">' + (aLang==='en'?'▶ Run this workout today':'▶ Executar este treino hoje') + '</button>' +
      '</div>'
    ) : '';
    return aMontarLinhaBadges(semanaAtual) +
      aMontarCardFase(semanaAtual, agenda.semanaDentroFase, 'dash') +
      aMontarTimelinePeriodizacao(semanas, agenda.semanaGlobal, 'dash') +
      '<div class="dash-empty"><div class="ic">😌</div>' + aT('dia_descanso_titulo') + '<br>' + aT('dia_descanso_desc') + '</div>' +
      seletorSub;
  }

  let h = aMontarLinhaBadges(semanaAtual);
  h += aMontarCardFase(semanaAtual, agenda.semanaDentroFase, 'dash');
  h += aMontarTimelinePeriodizacao(semanas, agenda.semanaGlobal, 'dash');
  const _dsx = diaHoje.diaSemana ? aDiaExibicao(diaHoje.diaSemana) : '';
  const _rep = _dsx && String(_dsx).trim().toLowerCase() === String(diaHoje.nome || '').trim().toLowerCase();
  h += '<div class="pt" title="' + aAttr(diaHoje.sub || '') + '" style="font-size:17px;margin-bottom:8px">' + aEsc(diaHoje.nome) + (diaHoje.diaSemana && !_rep ? ' <span style="font-weight:400;color:var(--t3);font-size:14px">(' + aEsc(aDiaExibicao(diaHoje.diaSemana)) + ')</span>' : '') + '</div>';
  if (usandoSubstituto) {
    h += '<div class="dash-banner-teste" style="background:var(--Pl);color:var(--Pd)"><span>🔀 ' +
      (aLang==='en' ? 'Running a different workout today, by your choice.' : 'Você escolheu rodar esse treino hoje, fora da rotina normal.') +
      '</span><button onclick="aDiaSubstituto=null;document.getElementById(\'tDashConteudo\').innerHTML=aMontarDashboardHoje(aSemanasAtual,aAgendaAtual);">' + (aLang==='en'?'Undo':'Desfazer') + '</button></div>';
  }
  const testeAgendadoHoje = (aTestesAgendados||[]).find(t => t.semana === agenda.semanaGlobal && t.dia === agenda.diaSemanaHoje);
  if (testeAgendadoHoje) {
    const tipoTeste = testeAgendadoHoje.tipo || 'condicionamento';
    const infoTeste = aPadraoInfo(tipoTeste);
    const hojeISO = new Date().toISOString().slice(0,10);
    // some o banner assim que o aluno já registrou esse teste hoje — antes
    // ele ficava preso na tela mesmo depois de salvar, porque nada checava
    // se o teste do dia já tinha sido enviado
    const jaTestouHoje = (aTestesFisicos||[]).some(t => t.data === hojeISO && t.padrao_movimento === (infoTeste ? infoTeste.label : 'Condicionamento'));
    if (!jaTestouHoje) {
      const nomeTeste = infoTeste ? (aLang==='en' && infoTeste.labelEn ? infoTeste.labelEn : infoTeste.label) : 'Condicionamento';
      h += '<div class="dash-banner-teste">'
        + '<span>🎯 ' + (aLang==='en' ? ('Today is a test day: ' + nomeTeste + '.') : ('Hoje é dia de teste: ' + nomeTeste + '.')) + '</span>'
        + '<button onclick="aAbrirNovoTeste(\'' + tipoTeste + '\')">' + (aLang==='en' ? 'Log test' : 'Registrar teste') + '</button>'
        + '</div>';
    }
  }
  h += (diaHoje.blocos || []).map((b,bIdx) => aBlocoOut(b, semanaAtual.fase, 'dash-'+diaHoje.id, bIdx, agenda.semanaDentroFase, semanaAtual.duracaoSemanas||4)).join('');
  // Botão manual de conclusão — a detecção automática (aVerificarTreinoConcluido)
  // só dispara quando TODOS os blocos/exercícios são marcados "feito" um a um.
  // Na prática muitos alunos treinam mas não ficam marcando checkbox por
  // checkbox, então a sessão nunca era registrada em rpe_sessoes e o badge
  // do professor ficava travado em "0/x sessões". Este botão garante que dá
  // pra fechar a sessão de qualquer jeito.
  h += '<div class="concl-wrap"><button class="concl-btn" onclick="aVerificarTreinoConcluido(true)">' +
    '<span class="concl-ic">✓</span><span>' + (aLang==='en' ? 'Mark workout as done' : 'Marcar treino como concluído') + '</span></button></div>';
  return h;
}

function aVerSemanaCompleta(){
  document.getElementById('tDashboard').style.display = 'none';
  document.getElementById('tProgresso').style.display = 'none';
  document.getElementById('tColetivas').style.display = 'none';
  document.getElementById('tSemanaCompleta').style.display = 'block';
  aHeaderForcar(true);
}
// ── Caminho (Mapa do aluno): card na Início + tela própria ──
// Só aparece com alunos.caminho_ativo ligado E um Mapa publicado pelo professor (avaliacoes_fisicas.mapa.publicado).
let aCaminhoMapa = null, aCaminhoRow = null, aCaminhoUrls = {}, aCaminhoImgs = {};
const A_CAM_VISTAS = [['frontal','Frontal'],['posterior','Posterior'],['lateral_d','Lateral D'],['lateral_e','Lateral E']];
function aCaminhoDiaMarco(m, sem){
  const d = new Date((m.inicio || '') + 'T12:00:00'); if (isNaN(d)) return null;
  d.setDate(d.getDate() + (Number(sem) || 0) * 7); return d;
}
function aCaminhoDataMarco(m, x){
  if (x && x.data) { const d = new Date(x.data + 'T12:00:00'); if (!isNaN(d)) return d; }
  return aCaminhoDiaMarco(m, x && x.sem);
}
function aCaminhoFmtIso(t){ t = String(t || ''); return t.length >= 10 ? t.slice(8,10) + '/' + t.slice(5,7) : ''; }
function aCaminhoFmt(d){ return d ? String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') : ''; }
function aCaminhoSemana(m){
  const d0 = new Date((m.inicio || '') + 'T12:00:00'); const tot = m.semanas || 12;
  if (isNaN(d0)) return 1;
  const dias = Math.floor((Date.now() - d0.getTime()) / 86400000);
  return Math.min(Math.max(Math.floor(dias / 7) + 1, 1), tot);
}
function aCaminhoFase(m, sem){
  const t = m.semanas || 12;
  return sem <= Math.round(t / 3) ? 'Base' : (sem <= Math.round(t * 2 / 3) ? 'Construção' : 'Consolidação');
}
// Treinos por semana do protocolo (dias da semana 1) e treinos já feitos desde o início do Mapa.
let aCaminhoFeitos = null;
function aCaminhoDiasSem(){
  try { const sm = aProtocolo && aProtocolo.conteudo && aProtocolo.conteudo.semanas; const d = sm && sm[0] && sm[0].dias; return d && d.length ? d.length : 0; } catch (e) { return 0; }
}
function aCaminhoTreinoTxt(m){
  const ds = aCaminhoDiasSem(), tot = m.semanas || 12;
  if (!ds || aCaminhoFeitos == null) return '';
  return 'Treino ' + Math.min(aCaminhoFeitos + 1, ds * tot) + ' de ' + (ds * tot);
}
// Treino de chegada: só para quem ainda não registrou nenhuma sessão. Semana 1 = acerto de carga.
async function aPrimeiroTreino(){
  const el = document.getElementById('tPrimeiroTreino'); if (!el) return;
  el.style.display = 'none';
  if (window._movhPreview || !aAlunoRow || !aAlunoRow.id) return;
  try {
    const q = await aClient.from('rpe_sessoes').select('id').eq('aluno_id', aAlunoRow.id).limit(1);
    if (q.error || (q.data && q.data.length)) return;
  } catch (e) { return; }
  el.innerHTML = '<div class="cam-top"><b>👋 Seu primeiro treino</b></div>' +
    '<div class="cam-prox" style="font-size:12.5px;line-height:1.5;color:var(--tx)">Hoje o objetivo é achar a sua carga, não cansar: pare cada série sobrando 3 ou 4 repetições.</div>' +
    '<div class="cam-prox">A semana 1 é de acerto: você repete este treino e a carga sobe a partir da semana 2. Anotar a carga faz parte do treino.</div>';
  el.style.display = 'block';
}
async function aCaminhoCarregar(){
  aCaminhoMapa = null; aCaminhoRow = null;
  const card = document.getElementById('tCaminhoCard'); if (card) card.style.display = 'none';
  if (!aAlunoRow || !aAlunoRow.id || !aAlunoRow.caminho_ativo) return;
  try {
    const r = await aClient.from('avaliacoes_fisicas')
      .select('id, data_avaliacao, created_at, mapa, peso, cintura, quadril, foto_frontal_path, foto_posterior_path, foto_lateral_d_path, foto_lateral_e_path')
      .eq('aluno_id', aAlunoRow.id).eq('status', 'confirmada').not('mapa', 'is', null)
      .order('created_at', { ascending: false }).limit(5);
    if (r.error) return;
    const row = (r.data || []).find(function(x){ return x.mapa && x.mapa.publicado; });
    if (!row) return;
    aCaminhoRow = row; aCaminhoMapa = row.mapa;
  } catch (e) { return; }
  aCaminhoFeitos = null;
  try {
    const q = await aClient.from('rpe_sessoes').select('criado_em').eq('aluno_id', aAlunoRow.id).gte('criado_em', (aCaminhoMapa.inicio || '2000-01-01') + 'T00:00:00');
    if (!q.error) aCaminhoFeitos = new Set((q.data || []).map(function(x){ return String(x.criado_em).slice(0,10); })).size;
  } catch (e) {}
  aCaminhoRenderCard();
}
function aCaminhoRenderCard(){
  const card = document.getElementById('tCaminhoCard'); const m = aCaminhoMapa;
  if (!card || !m) return;
  const sem = aCaminhoSemana(m), tot = m.semanas || 12;
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const prox = (m.marcos || []).slice().sort(function(a,b){ return a.sem - b.sem; }).find(function(x){ const d = aCaminhoDataMarco(m, x); return d && d >= hoje; });
  const trn = aCaminhoTreinoTxt(m);
  const d0 = new Date((m.inicio || '') + 'T12:00:00');
  if (!isNaN(d0) && Date.now() - d0.getTime() >= tot * 7 * 86400000) {
    card.innerHTML = '<div class="cam-top"><b>🧭 Seu caminho</b><span>✅ Ciclo concluído ›</span></div>' +
      '<div class="cam-bar"><i style="width:100%"></i></div>' +
      '<div class="cam-prox">Você completou as ' + tot + ' semanas. Toque para rever o caminho; o próximo Mapa vem na sua reavaliação.</div>';
    card.style.display = 'block';
    return;
  }
  card.innerHTML = '<div class="cam-top"><b>🧭 Seu caminho</b><span>' + aCaminhoFase(m, sem) + ' · Semana ' + sem + ' de ' + tot + ' ›</span></div>' +
    '<div class="cam-bar"><i style="width:' + Math.round(sem / tot * 100) + '%"></i></div>' +
    (trn ? '<div class="cam-prox">' + trn + '</div>' : '') +
    (prox ? '<div class="cam-prox">Próximo: ' + aEsc(prox.titulo) + ' · ' + aCaminhoFmt(aCaminhoDataMarco(m, prox)) + '</div>' : '');
  card.style.display = 'block';
}
function aCaminhoPixelar(x, W, H, r){
  const px = Math.round(r.x * W), py = Math.round(r.y * H), pw = Math.max(1, Math.round(r.w * W)), ph = Math.max(1, Math.round(r.h * H)), bs = 18;
  const t = document.createElement('canvas'); t.width = Math.max(1, Math.ceil(pw / bs)); t.height = Math.max(1, Math.ceil(ph / bs));
  t.getContext('2d').drawImage(x.canvas, px, py, pw, ph, 0, 0, t.width, t.height);
  x.imageSmoothingEnabled = false; x.drawImage(t, 0, 0, t.width, t.height, px, py, pw, ph);
}
async function aCaminhoFotoUrl(k, antes){
  const m = aCaminhoMapa, row = aCaminhoRow; const f = (m.fotos && m.fotos[k]) || {};
  if (f.show === false) return null;
  const src = antes ? f.antes : (f.src || row['foto_' + k + '_path']); const url = src && aCaminhoUrls[src]; if (!url) return null;
  const ck = [src, f.rot, f.zoom, JSON.stringify(f.blur || [])].join('|'); if (aCaminhoImgs[ck]) return aCaminhoImgs[ck];
  try {
    const img = await new Promise(function(ok, er){ const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = function(){ ok(i); }; i.onerror = er; i.src = url; });
    const W = 300, H = 400, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); x.fillStyle = '#1a2438'; x.fillRect(0, 0, W, H);
    x.translate(W / 2, H / 2); x.rotate((f.rot || 0) * Math.PI / 180);
    const giro = (f.rot || 0) % 180 !== 0, iw = giro ? img.height : img.width, ih = giro ? img.width : img.height;
    const s = Math.max(W / iw, H / ih) * (f.zoom || 1); x.scale(s, s); x.drawImage(img, -img.width / 2, -img.height / 2);
    x.setTransform(1, 0, 0, 1, 0, 0); (f.blur || []).forEach(function(r){ aCaminhoPixelar(x, W, H, r); });
    return (aCaminhoImgs[ck] = c.toDataURL('image/jpeg', 0.82));
  } catch (e) { return null; }
}
function aCaminhoLista(arr){
  return (arr || []).map(function(t){ return '<div class="cam-li">' + aEsc(t) + '</div>'; }).join('');
}
function aCaminhoBox(tit, inner){ return '<div class="cam-box"><h4>' + tit + '</h4>' + inner + '</div>'; }
async function aVerCaminho(){
  const m = aCaminhoMapa, row = aCaminhoRow; if (!m) return;
  ['tDashboard','tSemanaCompleta','tProgresso','tColetivas','tPersonal'].forEach(function(id){ const e = document.getElementById(id); if (e) e.style.display = 'none'; });
  document.getElementById('tCaminho').style.display = 'block';
  aHeaderForcar(true);
  const sem = aCaminhoSemana(m), tot = m.semanas || 12, fase = aCaminhoFase(m, sem);
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const marcos = (m.marcos || []).slice().sort(function(a,b){ return a.sem - b.sem; });
  let achouAtual = false;
  const tl = marcos.map(function(x){
    const d = aCaminhoDataMarco(m, x); const feito = d && d < hoje;
    let cls = feito ? 'ok' : ''; if (!feito && !achouAtual) { cls = 'now'; achouAtual = true; }
    return '<div class="cam-st ' + cls + '"><span class="cam-dot"></span><b>' + aEsc(x.titulo) + '</b><div class="cam-d">Semana ' + x.sem + ' · ' + aCaminhoFmt(d) + (feito ? ' · feito' : '') + '</div>' + (x.texto ? '<p>' + aEsc(x.texto) + '</p>' : '') + '</div>';
  }).join('');
  const med = [row.peso ? ['Peso', row.peso + ' kg'] : null, row.cintura ? ['Cintura', row.cintura + ' cm'] : null, (row.cintura && row.quadril) ? ['RCQ', (row.cintura / row.quadril).toFixed(2)] : null].filter(Boolean)
    .map(function(x){ return '<div class="cam-med"><small>' + x[0] + '</small><b>' + x[1] + '</b></div>'; }).join('');
  document.getElementById('tCaminhoConteudo').innerHTML =
    '<div class="cam-hd"><b>🧭 Seu caminho</b><span class="cam-chip">' + fase + ' · Semana ' + sem + ' de ' + tot + '</span></div>' +
    (aCaminhoTreinoTxt(m) ? '<div class="cam-sub" style="margin:-4px 2px 8px">' + aCaminhoTreinoTxt(m) + '</div>' : '') +
    aCaminhoBox('Sua meta', '<div class="cam-big">' + aEsc(m.objetivo || 'Seu objetivo') + '</div><div class="cam-sub">' + tot + ' semanas · reavaliação na semana ' + tot + '</div><div class="cam-bar"><i style="width:' + Math.round(sem / tot * 100) + '%"></i></div>') +
    aCaminhoBox('Marcos', '<div class="cam-tl">' + tl + '</div>') +
    '<button class="vksbtn cam-link" onclick="aVerProgresso()">📈 Cargas e histórico ›</button>' +
    (med ? '<div class="cam-meds">' + med + '</div>' : '') +
    '<div id="tCamFotos"></div>' +
    ((m.bom || []).length ? aCaminhoBox('O que está bom', aCaminhoLista(m.bom)) : '') +
    ((m.melhorar || []).length ? aCaminhoBox('O que vamos melhorar primeiro', aCaminhoLista(m.melhorar)) : '') +
    ((m.depende || []).length ? aCaminhoBox('O que depende de você', aCaminhoLista(m.depende)) : '');
  window.scrollTo(0, 0);
  try {
    const paths = []; A_CAM_VISTAS.forEach(function(v){ const f = (m.fotos && m.fotos[v[0]]) || {}; [f.src || row['foto_' + v[0] + '_path'], f.antes].forEach(function(p){ if (p && paths.indexOf(p) < 0) paths.push(p); }); });
    if (paths.length) { const r = await aClient.storage.from('avaliacoes').createSignedUrls(paths, 3600); (r.data || []).forEach(function(s){ if (s && s.path && s.signedUrl) aCaminhoUrls[s.path] = s.signedUrl; }); }
    const fts = [], cmp = [];
    for (const v of A_CAM_VISTAS) {
      const f = (m.fotos && m.fotos[v[0]]) || {}; const u = await aCaminhoFotoUrl(v[0]); if (!u) continue;
      const ua = f.antes ? await aCaminhoFotoUrl(v[0], true) : null;
      const dAgora = f.src_data || row.data_avaliacao;
      if (ua) cmp.push('<div class="cam-cmp-t">' + v[1] + '</div><div class="cam-fts"><div class="cam-ft"><img src="' + ua + '" alt="">Antes' + (f.antes_data ? ' · ' + aCaminhoFmtIso(f.antes_data) : '') + '</div><div class="cam-ft"><img src="' + u + '" alt="">Agora' + (dAgora ? ' · ' + aCaminhoFmtIso(dAgora) : '') + '</div></div>');
      else fts.push('<div class="cam-ft"><img src="' + u + '" alt="">' + v[1] + '</div>');
    }
    const box = document.getElementById('tCamFotos');
    if (box && (fts.length || cmp.length)) box.innerHTML = (fts.length ? aCaminhoBox('Postura', '<div class="cam-fts">' + fts.join('') + '</div>') : '') + (cmp.length ? aCaminhoBox('Antes e depois', cmp.join('')) : '');
  } catch (e) {}
}
function aVoltarHoje(){
  { const _tc = document.getElementById('tCaminho'); if (_tc) _tc.style.display = 'none'; }
  document.getElementById('tSemanaCompleta').style.display = 'none';
  document.getElementById('tProgresso').style.display = 'none';
  document.getElementById('tColetivas').style.display = 'none';
  { const _tp = document.getElementById('tPersonal'); if (_tp) _tp.style.display = 'none'; }
  document.getElementById('tDashboard').style.display = 'block';
  aHeaderForcar(false);
  { const _hb = document.getElementById('tHeaderRecolhivel'); if (_hb && _hb.style.display === 'none') aToggleHeader(); window._aHdrPrev = null; }
}
// Recolhe sozinho a faixa da semana no topo nas telas em que ela não serve (progresso, semana completa, coletivas) e devolve ao estado anterior ao voltar para hoje.
function aHeaderForcar(rec){
  const el = document.getElementById('tHeaderRecolhivel'); if (!el) return;
  if (rec) {
    if (window._aHdrPrev == null) window._aHdrPrev = el.style.display === 'none';
    if (el.style.display !== 'none') aToggleHeader();
  } else if (window._aHdrPrev != null) {
    const prev = window._aHdrPrev; window._aHdrPrev = null;
    if ((el.style.display === 'none') !== prev) aToggleHeader();
  }
}
// Espelha mbAvalMontarPreviewHTML (painel do professor), com labels
// traduzidos e aEsc no lugar de escAttr. Cai pro texto simples (pre-wrap) se
// a avaliação for antiga e não tiver achados/composicao estruturados salvos.
// IMPORTANTE: essas funções ficam no escopo global (fora de
// aMontarAvisoAvaliacao) de propósito — os onclick inline do HTML gerado
// (ex: aToggleMedidaDetalhe(this)) chamam funções globais, e uma função
// declarada dentro de outra function só existe naquele escopo local.
let _aMedBadgeSeq = 0;
function aToggleMedidaDetalhe(btn){
  const el = document.getElementById(btn.dataset.tgt);
  if (!el) return;
  const aberto = el.style.display !== 'none';
  el.style.display = aberto ? 'none' : 'block';
  btn.classList.toggle('open', !aberto);
}
function aMontarTabelaRef(linhas, valorAtual, campoComp){
  return '<table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:6px">' +
    linhas.map(l => {
      const ativo = l[2] && l[2](valorAtual);
      return '<tr style="'+(ativo?'font-weight:700;color:var(--Pd)':'color:var(--t2)')+'"><td style="padding:2px 6px 2px 0">'+aEsc(l[0])+'</td><td style="padding:2px 0">'+aEsc(l[1])+'</td></tr>';
    }).join('') + '</table>';
}
// Badges clicáveis de medidas (IMC, RCQ, Proporção tronco/membros) — cada um
// expande uma tabelinha de referência ao clicar, em vez do parágrafo corrido
// que existia antes. Também mostra peso/altura/cintura/quadril brutos
// daquela avaliação específica (fica salvo por avaliação, então reavaliações
// futuras têm histórico preciso pra comparar).
function aMontarBadgesMedidas(m){
  if (!m) return '';
  const badges = [];
  if (m.peso || m.altura) {
    const partes = [];
    if (m.peso) partes.push(m.peso+'kg');
    if (m.altura) partes.push(m.altura+'cm');
    if (m.cintura) partes.push((aLang==='en'?'waist ':'cintura ')+m.cintura+'cm');
    if (m.quadril) partes.push((aLang==='en'?'hip ':'quadril ')+m.quadril+'cm');
    badges.push('<span class="fase-badge" style="cursor:default">📏 '+aEsc(partes.join(' · '))+'</span>');
  }
  if (m.imc != null) {
    const id = 'medb-imc-'+(_aMedBadgeSeq++);
    const tabela = [
      ['< 18.5', aLang==='en'?'Underweight':'Abaixo do peso', v=>v<18.5],
      ['18.5 – 24.9', aLang==='en'?'Healthy range':'Peso saudável', v=>v>=18.5&&v<25],
      ['25.0 – 29.9', aLang==='en'?'Overweight':'Sobrepeso', v=>v>=25&&v<30],
      ['≥ 30.0', aLang==='en'?'Obesity':'Obesidade', v=>v>=30]
    ];
    badges.push('<button type="button" class="fase-badge" data-tgt="'+id+'" onclick="aToggleMedidaDetalhe(this)">📐 IMC '+m.imc+' <span class="fase-badge-arrow">▾</span></button>'+
      '<div id="'+id+'" class="a-med-detail" style="display:none">'+
      '<div style="font-size:11px;color:var(--t2);margin-bottom:2px">'+(aLang==='en'?'IMC is only a starting point — it does not tell muscle from fat.':'IMC é só um ponto de partida — não diferencia massa muscular de gordura.')+'</div>'+
      aMontarTabelaRef(tabela, m.imc) + '</div>');
  }
  if (m.rcq != null) {
    const id = 'medb-rcq-'+(_aMedBadgeSeq++);
    const fem = m.sexo === 'F';
    const tabela = fem ? [
      ['< 0.80', aLang==='en'?'Low risk':'Baixo risco', v=>v<0.80],
      ['0.80 – 0.84', aLang==='en'?'Moderate risk':'Risco moderado', v=>v>=0.80&&v<0.85],
      ['≥ 0.85', aLang==='en'?'Elevated risk':'Risco elevado', v=>v>=0.85]
    ] : [
      ['< 0.90', aLang==='en'?'Low risk':'Baixo risco', v=>v<0.90],
      ['0.90 – 0.99', aLang==='en'?'Moderate risk':'Risco moderado', v=>v>=0.90&&v<1.00],
      ['≥ 1.00', aLang==='en'?'Elevated risk':'Risco elevado', v=>v>=1.00]
    ];
    badges.push('<button type="button" class="fase-badge" data-tgt="'+id+'" onclick="aToggleMedidaDetalhe(this)">⚖️ RCQ '+m.rcq+' <span class="fase-badge-arrow">▾</span></button>'+
      '<div id="'+id+'" class="a-med-detail" style="display:none">'+
      '<div style="font-size:11px;color:var(--t2);margin-bottom:2px">'+(aLang==='en'?'Waist-to-hip ratio (WHO reference).':'Relação cintura/quadril (referência OMS).')+'</div>'+
      aMontarTabelaRef(tabela, m.rcq) + '</div>');
  }
  if (m.propTM != null) {
    const id = 'medb-tm-'+(_aMedBadgeSeq++);
    // propTM = comprimento do tronco (ombro→quadril) / comprimento da perna
    // (quadril→tornozelo). Convertido pra % desse "vão" tronco+perna, que é
    // mais intuitivo pro aluno do que o número decimal isolado — mas o
    // decimal continua exibido, porque as faixas de referência (e a lógica
    // de achados do professor) são calibradas nele.
    const torsoPct = Math.round((m.propTM/(1+m.propTM))*100);
    const legsPct = 100 - torsoPct;
    const tabela = [
      ['< 0.48', aLang==='en'?'Relatively long legs/femur':'Pernas/fêmur relativamente longos', v=>v<0.48],
      ['0.48 – 0.58', aLang==='en'?'Common proportion':'Proporção comum', v=>v>=0.48&&v<=0.58],
      ['> 0.58', aLang==='en'?'Relatively long torso':'Tronco relativamente longo', v=>v>0.58]
    ];
    badges.push('<button type="button" class="fase-badge" data-tgt="'+id+'" onclick="aToggleMedidaDetalhe(this)">📏 '+(aLang==='en'?'Torso/legs':'Tronco/pernas')+' '+torsoPct+'%·'+legsPct+'% <span class="fase-badge-arrow">▾</span></button>'+
      '<div id="'+id+'" class="a-med-detail" style="display:none">'+
      '<div style="font-size:11px;color:var(--t2);margin-bottom:2px">'+(aLang==='en'?'Torso vs. lower-limb length — affects squat/deadlift biomechanics (a relatively long femur usually needs more forward torso lean).':'Comprimento do tronco vs. membros inferiores — muda a biomecânica de agachamento/terra (fêmur relativamente mais longo geralmente pede mais inclinação de tronco).')+'</div>'+
      '<div style="font-size:11px;font-weight:700;color:var(--tx);margin-bottom:2px">'+(aLang==='en'?'Torso':'Tronco')+' '+torsoPct+'% · '+(aLang==='en'?'legs':'pernas')+' '+legsPct+'%<span style="font-weight:400;color:var(--t3)"> ('+(aLang==='en'?'ratio':'proporção')+' '+m.propTM+')</span></div>'+
      aMontarTabelaRef(tabela, m.propTM) + '</div>');
  }
  return badges.length ? '<div class="a-med-badges">'+badges.join('')+'</div>' : '';
}
function aAvalMontarCardsHTML(achados, composicao, medidas){
  const fortes = (achados||[]).filter(a => a.sev === 'ok');
  const melhorar = (achados||[]).filter(a => a.sev !== 'ok').sort((a,b) => (a.sev==='critico'?0:1) - (b.sev==='critico'?0:1));
  const icone = { ok: '●', atencao: '▲', critico: '✕' };
  const cor = { ok: 'var(--G)', atencao: '#c07a1f', critico: '#c0392b' };
  const card = a => '<div style="display:flex;gap:8px;padding:8px 10px;border-radius:8px;margin-bottom:5px;background:var(--card);border-left:3px solid '+cor[a.sev]+'">'+
    '<span>'+icone[a.sev]+'</span><span style="font-size:11.5px;line-height:1.5">'+aEsc(a.texto)+(a.detalhe?'<span style="display:block;color:var(--t3);font-size:11px;margin-top:2px">'+aEsc(a.detalhe)+'</span>':'')+'</span></div>';
  // Se tem "medidas" estruturadas (avaliações feitas depois desta atualização),
  // mostra badges clicáveis em vez do parágrafo corrido. Avaliações antigas
  // sem essa estrutura caem no texto corrido de sempre.
  const compHtml = medidas ? aMontarBadgesMedidas(medidas)
    : ((composicao||[]).length ? '<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:700;color:var(--t2);text-transform:uppercase;margin-bottom:4px">'+(aLang==='en'?'Body composition':'Composição corporal')+'</div>'+composicao.map(t=>'<div style="font-size:11.5px;padding:3px 0;color:var(--tx)">◆ '+aEsc(t)+'</div>').join('')+'</div>' : '');
  const fortesHtml = fortes.length ? '<div style="font-size:11px;font-weight:700;color:var(--t2);text-transform:uppercase;margin-bottom:4px">'+(aLang==='en'?'Strengths':'Pontos fortes')+'</div>'+fortes.map(card).join('') : '';
  const melhorarHtml = melhorar.length ? '<div style="font-size:11px;font-weight:700;color:var(--t2);text-transform:uppercase;margin:10px 0 4px">'+(aLang==='en'?'Points to improve':'Pontos de melhoria')+'</div>'+melhorar.map(card).join('') : '';
  return compHtml + fortesHtml + melhorarHtml;
}
function aAvalDiagnosticoHTML(v){
  if (v.achados && v.achados.length) return aAvalMontarCardsHTML(v.achados, v.composicao || [], v.medidas || null);
  return '<span style="font-size:11.5px;white-space:pre-wrap">' + aEsc(v.diagnostico) + '</span>';
}
function aMontarAvisoAvaliacao(){
  const solicitada = aAvaliacoesFisicas.find(v => v.status === 'solicitada');
  const emRevisao = aAvaliacoesFisicas.find(v => v.status === 'pendente_revisao');
  if (solicitada && !aNotifFechada('aval', 1)) {
    return '<div style="background:#FFF8E1;border:1px solid #F59E0B;border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:12.5px;color:#92400E">' +
      '📸 <b>Seu professor pediu uma avaliação física/postural.</b><br>' +
      '<span style="font-size:11px">Envie as fotos pelo app — leva menos de 2 minutos.</span><br>' +
      '<button onclick="aAbrirEnvioAvaliacao(\'' + solicitada.id + '\')" style="margin-top:8px;font-size:11.5px;font-weight:700;padding:7px 14px;border-radius:8px;border:none;background:#F59E0B;color:#fff;cursor:pointer">📸 Enviar fotos agora</button>' +
    '</div>';
  }
  if (emRevisao) {
    return '<div style="background:var(--Pl);border:1px solid var(--P);border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:12.5px;color:var(--tx)">' +
      '📋 <b>Fotos enviadas!</b><br>' +
      '<span style="font-size:11px">Seu professor vai revisar e te avisar quando o diagnóstico estiver pronto.</span>' +
    '</div>';
  }
  const confirmada = aAvaliacoesFisicas.find(v => v.status === 'confirmada' && v.diagnostico);
  if (confirmada) {
    // Recolhível: na primeira vez que o aluno vê essa avaliação confirmada,
    // fica expandida (e marca como "vista" no localStorage). Da próxima vez
    // em diante, some da tela de progresso já recolhida — o aluno clica pra
    // reabrir se quiser reler, mas ela deixa de ocupar espaço fixo o tempo todo.
    let vistoKey = null, jaVisto = false;
    try {
      vistoKey = 'movh_aval_vista_' + confirmada.id;
      jaVisto = !!localStorage.getItem(vistoKey);
      if (!jaVisto) localStorage.setItem(vistoKey, '1');
    } catch (e) {}
    const detId = 'aval-confirmada-detalhe';
    return '<div style="background:var(--Gl,var(--Pl));border:1px solid var(--G);border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:12.5px;color:var(--tx)">' +
      '<button type="button" class="fase-badge" data-tgt="' + detId + '" onclick="aToggleFaseDetalhe(this)" style="background:transparent;border:none;padding:0;color:var(--tx);font-size:12.5px">' +
        '✅ <b>' + (aLang==='en'?'Your physical assessment is complete':'Sua avaliação física foi concluída') + '</b> <span class="fase-badge-arrow">▾</span>' +
      '</button>' +
      '<div id="' + detId + '" style="display:' + (jaVisto ? 'none' : 'block') + ';margin-top:8px">' + aAvalDiagnosticoHTML(confirmada) + '</div>' +
    '</div>';
  }
  return '';
}

// Aviso de reteste de condicionamento — janela recomendada de 6 a 8 semanas
// entre testes de 3km. Sem teste ainda, incentiva o primeiro em vez de cobrar
// um "atraso" que não existe. Na semana 1 do protocolo, o teste é oficialmente
// agendado (banner específico); depois da semana 1, cai pro aviso genérico.
function aMontarAvisoReteste(){
  if (window._aInteresseCorrida === 'nao') return '';
  const testesCondic = aTestesFisicos.filter(function(t){
    return t.padrao_movimento === 'Condicionamento' && t.unidade === 'tempo' && t.distancia_km;
  });
  if (!testesCondic.length) {
    let diasProtocolo = null;
    if (aProtocolo && aProtocolo.data_inicio) {
      const inicioProto = new Date(aProtocolo.data_inicio + 'T00:00:00');
      if (!isNaN(inicioProto)) diasProtocolo = Math.floor((new Date() - inicioProto) / 86400000);
    }
    // Semana 1 do protocolo (dias 0–6 desde o início): teste oficialmente agendado.
    if (diasProtocolo !== null && diasProtocolo >= 0 && diasProtocolo <= 6) {
      return '<div style="background:var(--Pl);border:1px solid var(--P);border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:12.5px;color:var(--tx)">' +
        '📅 <b>Teste de 3km — Semana 1 do seu protocolo.</b><br>' +
        '<span style="font-size:11px">Essa é a semana oficial pra registrar seu teste de condicionamento inicial. Registre em "🏋️ Meus Testes" assim que puder pra já sair com suas zonas de treino personalizadas.</span>' +
      '</div>';
    }
    return '<div style="background:var(--Pl);border:1px solid var(--P);border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:12.5px;color:var(--tx)">' +
      '🏃 <b>Você ainda não tem teste de condicionamento registrado.</b><br>' +
      '<span style="font-size:11px">Registre seu teste de 3km em "🏋️ Meus Testes" pra desbloquear suas zonas de treino personalizadas.</span>' +
    '</div>';
  }
  const ultimo = testesCondic[testesCondic.length - 1];
  const d = new Date(ultimo.data + 'T00:00:00');
  const semanas = isNaN(d) ? 0 : Math.floor((new Date() - d) / (7*86400000));
  if (semanas < 6) return '';
  const urgente = semanas >= 8;
  const cor = urgente ? '#DC5A3C' : '#F59E0B';
  const bg = urgente ? '#FFF3F0' : '#FFF8E1';
  const txt = urgente ? '#7A2E1C' : '#92400E';
  return '<div style="background:' + bg + ';border:1px solid ' + cor + ';border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:12.5px;color:' + txt + '">' +
    '🏃 <b>Já fazem ' + semanas + ' semanas do seu último teste de 3km.</b><br>' +
    '<span style="font-size:11px">Refazer o teste ajusta suas zonas de treino ao seu condicionamento atual. Registre em "🏋️ Meus Testes".</span>' +
  '</div>';
}

// ── Avaliação física/postural — envio de fotos pelo app ──
let aAvaliacaoEnvioId = null;

// Referência visual de como o aluno deve se posicionar nas 4 fotos
// (frontal, lateral, posterior, lateral) - imagem estática embutida em base64
// pra não depender de host externo nem de storage.
function aSvgReferenciaPostura(){
  return '<img src="data:image/jpeg;base64,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" alt="Referência de posicionamento para as fotos" style="width:100%;max-width:520px;display:block;margin:0 auto;border-radius:8px"/>';
}

function aAbrirEnvioAvaliacao(avaliacaoId){
  aAvaliacaoEnvioId = avaliacaoId;
  document.getElementById('tDashboard').style.display = 'none';
  document.getElementById('tSemanaCompleta').style.display = 'none';
  document.getElementById('tProgresso').style.display = 'none';
  document.getElementById('tAvaliacaoUpload').style.display = 'block';
  const campoFoto = function(id, label, obrigatorio){
    return '<div style="margin-bottom:10px">' +
      '<label style="font-size:11.5px;font-weight:600;color:var(--tx);display:block;margin-bottom:4px">' + label + (obrigatorio ? ' *' : '') + '</label>' +
      '<input type="file" accept="image/*" capture="environment" id="' + id + '" style="font-size:11px;width:100%"/>' +
    '</div>';
  };
  const campoNum = function(id, label, placeholder){
    return '<div style="flex:1;min-width:100px">' +
      '<label style="font-size:11px;color:var(--t2);display:block;margin-bottom:3px">' + label + '</label>' +
      '<input type="number" step="0.1" id="' + id + '" placeholder="' + placeholder + '" style="font-size:12px;padding:7px;width:100%;border:1px solid var(--bd);border-radius:8px;background:var(--ip);color:var(--tx)"/>' +
    '</div>';
  };
  const html =
    '<div class="pt" style="font-size:16px;margin-bottom:4px">📸 Enviar avaliação física</div>' +
    '<div style="font-size:12px;color:var(--t2);margin-bottom:12px">Tire as fotos com roupa justa/de treino, fundo neutro e boa iluminação. Sem maquiagem pesada ou acessórios que escondam a postura.</div>' +
    '<div style="background:var(--card2,var(--bg));border:1px solid var(--bd);border-radius:10px;padding:10px;margin-bottom:14px">' + aSvgReferenciaPostura() +
      '<div style="font-size:11px;color:var(--t3);text-align:center;margin-top:2px">Braços levemente afastados do corpo, mãos abertas, pés na largura do quadril</div>' +
    '</div>' +
    campoFoto('av-foto-frontal', 'Foto Frontal', true) +
    campoFoto('av-foto-posterior', 'Foto Posterior (de costas)', true) +
    campoFoto('av-foto-lateral-e', 'Foto Lateral Esquerda', true) +
    campoFoto('av-foto-lateral-d', 'Foto Lateral Direita', false) +
    '<div style="font-size:11.5px;font-weight:600;color:var(--tx);margin:14px 0 8px">Dados corporais (opcional, ajuda no diagnóstico)</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">' +
      campoNum('av-peso', 'Peso (kg)', 'Ex: 72.5') + campoNum('av-altura', 'Altura (cm)', 'Ex: 175') +
    '</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
      campoNum('av-cintura', 'Cintura (cm)', 'Ex: 82') + campoNum('av-quadril', 'Quadril (cm)', 'Ex: 98') +
    '</div>' +
    '<div style="margin-bottom:16px">' +
      '<label style="font-size:11px;color:var(--t2);display:block;margin-bottom:3px">Sexo (referência OMS p/ RCQ)</label>' +
      '<select id="av-sexo" style="font-size:12px;padding:7px;width:100%;border:1px solid var(--bd);border-radius:8px;background:var(--ip);color:var(--tx)">' +
        '<option value="">— não informar —</option><option value="M">Masculino</option><option value="F">Feminino</option>' +
      '</select>' +
    '</div>' +
    '<div id="av-status" style="font-size:11px;color:var(--t3);margin-bottom:8px"></div>' +
    '<button id="av-btn-enviar" onclick="aEnviarFotosAvaliacao()" style="width:100%;font-size:13px;font-weight:700;padding:11px;border-radius:9px;border:none;background:var(--P);color:#fff;cursor:pointer">Enviar avaliação</button>';
  document.getElementById('tAvaliacaoUploadConteudo').innerHTML = html;
}

function aFecharEnvioAvaliacao(){
  aAvaliacaoEnvioId = null;
  document.getElementById('tAvaliacaoUpload').style.display = 'none';
  aVerProgresso();
}

async function aEnviarFotosAvaliacao(){
  if (aPreviewBloqueado()) return;
  const fFrontal = document.getElementById('av-foto-frontal').files[0];
  const fPosterior = document.getElementById('av-foto-posterior').files[0];
  const fLateralE = document.getElementById('av-foto-lateral-e').files[0];
  const fLateralD = document.getElementById('av-foto-lateral-d').files[0];
  const status = document.getElementById('av-status');
  if (!fFrontal || !fPosterior || !fLateralE) {
    status.textContent = 'Frontal, Posterior e Lateral Esquerda são obrigatórias.';
    status.style.color = '#c03030';
    return;
  }
  const btn = document.getElementById('av-btn-enviar');
  btn.disabled = true; btn.textContent = 'Enviando...';
  status.style.color = 'var(--t3)'; status.textContent = 'Enviando fotos...';
  try {
    const extensao = function(f){ const m = (f.name||'').match(/\.([a-zA-Z0-9]+)$/); return m ? m[1].toLowerCase() : 'jpg'; };
    const caminhoBase = aAlunoRow.id + '/' + aAvaliacaoEnvioId + '/';
    const enviar = async function(arquivo, nome){
      const caminho = caminhoBase + nome + '.' + extensao(arquivo);
      const { error } = await aClient.storage.from('avaliacoes').upload(caminho, arquivo, { upsert: true });
      if (error) throw error;
      return caminho;
    };
    const pathFrontal = await enviar(fFrontal, 'frontal');
    const pathPosterior = await enviar(fPosterior, 'posterior');
    const pathLateralE = await enviar(fLateralE, 'lateral_e');
    const pathLateralD = fLateralD ? await enviar(fLateralD, 'lateral_d') : null;

    const peso = document.getElementById('av-peso').value;
    const altura = document.getElementById('av-altura').value;
    const cintura = document.getElementById('av-cintura').value;
    const quadril = document.getElementById('av-quadril').value;
    const sexo = document.getElementById('av-sexo').value;

    const payload = {
      status: 'pendente_revisao',
      enviado_em: new Date().toISOString(),
      foto_frontal_path: pathFrontal,
      foto_posterior_path: pathPosterior,
      foto_lateral_e_path: pathLateralE,
      foto_lateral_d_path: pathLateralD,
      peso: peso ? parseFloat(peso) : null,
      altura: altura ? parseFloat(altura) : null,
      cintura: cintura ? parseFloat(cintura) : null,
      quadril: quadril ? parseFloat(quadril) : null,
      sexo: sexo || null
    };
    const { error: errUpdate } = await aClient.from('avaliacoes_fisicas').update(payload).eq('id', aAvaliacaoEnvioId);
    if (errUpdate) throw errUpdate;

    const item = aAvaliacoesFisicas.find(function(v){ return v.id === aAvaliacaoEnvioId; });
    if (item) item.status = 'pendente_revisao';
    status.style.color = 'var(--G)';
    status.textContent = 'Enviado! Seu professor vai revisar em breve.';
    setTimeout(aFecharEnvioAvaliacao, 1200);
  } catch (e) {
    status.style.color = '#c03030';
    status.textContent = 'Erro ao enviar: ' + (e && e.message ? e.message : 'tente novamente');
    btn.disabled = false; btn.textContent = 'Enviar avaliação';
  }
}

function aNotifFechada(id, dias){
  try { const t = parseInt(localStorage.getItem('movh-notif-x-' + id) || '0', 10); return !!t && (Date.now() - t) < dias * 86400000; } catch(e) { return false; }
}
function aNotifFechar(id){
  try { localStorage.setItem('movh-notif-x-' + id, String(Date.now())); } catch(e) {}
  aMontarNotifs();
}
function aMontarNotifs(){
  const box = document.getElementById('tNotifs'); if (!box) return;
  const en = aLang === 'en', it = [];
  const ofN = aOfertaAtiva();
  if (ofN && !aNotifFechada('oferta', 1)) it.push({ k:'oferta', i:'🔒', go:'aAbrirRenovar()', t: en ? 'Renewal offer' : 'Oferta de renovação', s: aEsc(ofN.plano_nome || '') + ' · ' + aPixMoeda(ofN.valor) + (en ? ' — tap to pay' : ' — toque para pagar') });
  const sol = (aAvaliacoesFisicas || []).find(function(v){ return v.status === 'solicitada'; });
  if (sol && !aNotifFechada('aval', 1)) it.push({ k:'aval', i:'📸', t: en ? 'Physical assessment requested' : 'Avaliação física solicitada', s: en ? 'Send your photos' : 'Toque para enviar suas fotos' });
  let re = ''; try { re = aMontarAvisoReteste(); } catch(e) {}
  if (re && !aNotifFechada('cond', 7)) it.push({ k:'cond', i:'🏃', t: en ? 'Conditioning test' : 'Teste de condicionamento', s: en ? 'Tap to see the details' : 'Toque para ver os detalhes' });
  box.innerHTML = it.map(function(n){
    return '<span class="nt-b"><button type="button" class="nt-bt" title="' + String(n.s || '').replace(/<[^>]*>/g, '').replace(/"/g, '') + '" onclick="' + (n.go || 'aVerProgresso();window.scrollTo(0,0)') + '"><span>' + n.i + '</span><span>' + n.t + '</span></button>' +
      '<button type="button" class="nt-bx" data-k="' + n.k + '" onclick="aNotifFechar(this.dataset.k)" aria-label="' + (en ? 'Dismiss' : 'Dispensar') + '">×</button></span>';
  }).join('');
}
function aVerProgresso(){
  { const _tc = document.getElementById('tCaminho'); if (_tc) _tc.style.display = 'none'; }
  document.getElementById('tDashboard').style.display = 'none';
  document.getElementById('tSemanaCompleta').style.display = 'none';
  document.getElementById('tColetivas').style.display = 'none';
  document.getElementById('tProgresso').style.display = 'block';
  aHeaderForcar(true);
  document.getElementById('tProgressoConteudo').innerHTML = aMontarAvisoAvaliacao() + (aNotifFechada('cond', 7) ? '' : aMontarAvisoReteste()) + aMontarProgresso() + aMontarTestes();
}

// Aulas coletivas — tela opcional, só visível se o professor ativou
// "mostra_aulas_coletivas" pra este aluno (aAlunoRow.mostra_aulas_coletivas).
// Lista compacta e somente-leitura: sem vídeo, sem carga editável. Os
// dados são guardados por DATA específica (não repete automaticamente
// toda semana) — por isso essa tela tem navegação de semana (‹ ›), igual
// ao Gerador.
let aColetivasSemana = null;
function aColetivasSegundaDaSemana(d){
  const dt = new Date(d);
  dt.setHours(0,0,0,0);
  const dow = dt.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  dt.setDate(dt.getDate() + diff);
  return dt;
}
function aColetivasDateKey(d){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
  return y + '-' + m + '-' + day;
}
function aVerColetivas(){
  document.getElementById('tDashboard').style.display = 'none';
  document.getElementById('tSemanaCompleta').style.display = 'none';
  document.getElementById('tProgresso').style.display = 'none';
  document.getElementById('tColetivas').style.display = 'block';
  aHeaderForcar(true);
  if (!aColetivasSemana) aColetivasSemana = aColetivasSegundaDaSemana(new Date());
  aCarregarColetivas();
}
// Personal dentro do app: só para quem estiver liberado (A_PERSONAL_EMAILS) E for o professor dono do acesso
// (o servidor só devolve o token de personal_acesso para o próprio professor: RLS professor_id = auth.uid()).
const A_PERSONAL_EMAILS = ['lguilh3rme@gmail.com'];
let aPersonalToken = null;
async function aPersonalVerificar(){
  const b = document.getElementById('tBtnPersonal'); if (!b) return;
  b.style.display = 'none';
  try {
    const sess = await aClient.auth.getSession();
    const u = sess && sess.data && sess.data.session && sess.data.session.user;
    const email = String((aAlunoRow && aAlunoRow.email) || (u && u.email) || '').toLowerCase();
    if (!u || A_PERSONAL_EMAILS.indexOf(email) < 0) return;
    let r = await aClient.from('personal_acesso').select('token').maybeSingle();
    if (r.error) return;
    if (!r.data) { r = await aClient.from('personal_acesso').insert({ professor_id: u.id }).select('token').single(); if (r.error || !r.data) return; }
    if (!r.data.token) return;
    aPersonalToken = r.data.token; b.style.display = 'inline-block';
  } catch(x) {}
}
function aVerPersonal(){
  if (!aPersonalToken) return;
  document.getElementById('tDashboard').style.display = 'none';
  document.getElementById('tSemanaCompleta').style.display = 'none';
  document.getElementById('tProgresso').style.display = 'none';
  document.getElementById('tColetivas').style.display = 'none';
  document.getElementById('tPersonal').style.display = 'block';
  aHeaderForcar(true);
  aPerCarregar();
}
// Personal no app: mesmo visual das Aulas coletivas; grava carga / 💬 obs / ✓ feito nas mesmas RPCs da página /personal/
var aPerAlunos = [], aPerAid = null, aPerDados = {}, aPerReg = {}, aPerHist = [], aPerSemana = null, aPerDia = null;
function aPerKey(s){ return String(s == null ? '' : s).toLowerCase().normalize('NFD').split('').filter(function(c){ var n = c.charCodeAt(0); return n < 768 || n > 879; }).join('').replace(/[^a-z0-9]+/g, ' ').trim(); }
function aPerBr(iso){ var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] : ''; }
function aPerPick(a){ aPerAid = a.id; aPerDados = (a.dados && typeof a.dados === 'object') ? a.dados : {}; }
async function aPerCarregar(){
  var el = document.getElementById('tPersonalConteudo'); if (!el) return;
  el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--t3)">Carregando…</div>';
  try {
    var r = await aClient.rpc('get_personal_painel', { p_token: aPersonalToken }); if (r.error) throw r.error;
    var l = (r.data && Array.isArray(r.data.alunos)) ? r.data.alunos : null;
    if (!l || !l.length) { el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--t3)">Nenhum aluno com treino salvo ainda.</div>'; return; }
    aPerAlunos = l; var want = null; try { want = localStorage.getItem('movh_pp_aluno'); } catch(x) {}
    aPerPick(l.find(function(x){ return x.id === want; }) || l[0]);
    if (!aPerSemana) aPerSemana = aColetivasSegundaDaSemana(new Date());
    await aPerCarregarReg(); aPerRender();
  } catch(e) {
    el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--t3)">Não foi possível carregar.<br><br><button class="vksbtn" style="width:auto;padding:8px 16px" onclick="aPerCarregar()">Tentar de novo</button></div>';
  }
}
async function aPerCarregarReg(){
  aPerReg = {}; aPerHist = []; if (!aPerAid) return;
  try {
    var r = await aClient.rpc('get_personal_registros', { p_token: aPersonalToken, p_aluno: aPerAid });
    if (r.error || !Array.isArray(r.data)) return;
    aPerHist = r.data; r.data.forEach(function(x){ aPerReg[x.data + '|' + x.chave] = { carga: x.carga || '', obs: x.obs || '', feito: !!x.feito }; });
  } catch(x) {}
}
async function aPerTrocarAluno(id){
  var x = aPerAlunos.find(function(y){ return y.id === id; }); if (!x) return;
  aPerPick(x); aPerDia = null; try { localStorage.setItem('movh_pp_aluno', id); } catch(e) {}
  await aPerCarregarReg(); aPerRender();
}
function aPerSemanaMudar(d){ var x = new Date(aPerSemana); x.setDate(x.getDate() + d * 7); aPerSemana = x; aPerDia = null; aPerRender(); }
function aPerHoje(){ aPerSemana = aColetivasSegundaDaSemana(new Date()); aPerDia = null; aPerRender(); }
function aPerSelDia(k){ aPerDia = k; aPerRender(); }
function aPerObsToggle(b){
  var w = b.closest('.pr-ex'); if (!w) return; var o = w.querySelector('.pr-obs'); if (!o) return;
  var abre = o.style.display !== 'block'; o.style.display = abre ? 'block' : 'none'; if (abre) o.focus();
}
function aPerHist1(w){ var h = w.querySelector('.pr-hint'); if (h) h.style.display = h.style.display === 'none' ? 'block' : 'none'; }
async function aPerSalvar(el){
  var row = el.closest('.pr-ex'); if (!row) return;
  var ch = row.dataset.ch, n = row.dataset.ex, dd = aPerDia, al = aPerAid;
  var carga = row.querySelector('.pr-carga').value.trim(), obs = row.querySelector('.pr-obs').value.trim(), feito = row.querySelector('.pr-ck').checked;
  var st = row.querySelector('.pr-st'); st.textContent = '…'; st.style.color = '';
  var ob = row.querySelector('.pr-obsb'); if (ob) ob.classList.toggle('on', !!obs);
  aPerReg[dd + '|' + ch] = { carga: carga, obs: obs, feito: feito };
  try {
    var r = await aClient.rpc('salvar_personal_registro', { p_token: aPersonalToken, p_aluno: al, p_data: dd, p_chave: ch, p_exercicio: n, p_carga: carga, p_obs: obs, p_feito: feito });
    if (r.error || r.data !== true) throw (r.error || new Error('nao salvou'));
    st.textContent = '✓';
    if (aPerAid === al) {
      aPerHist = aPerHist.filter(function(h){ return !(h.data === dd && h.chave === ch); });
      aPerHist.unshift({ data: dd, chave: ch, exercicio: n, carga: carga, obs: obs, feito: feito });
      aPerHist.sort(function(a, b){ return a.data < b.data ? 1 : (a.data > b.data ? -1 : 0); });
    }
  } catch(e) { st.textContent = '⚠'; st.style.color = '#ff6b6b'; st.title = 'Não salvou. Mexa no campo de novo para tentar outra vez.'; }
}
function aPerRender(){
  var el = document.getElementById('tPersonalConteudo'); if (!el) return;
  var letras = ['D','S','T','Q','Q','S','S'], diasLabel = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  var hojeKey = aColetivasDateKey(new Date());
  var fmt = function(d){ return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0'); };
  var dados = aPerDados || {}, datas = [];
  for (var i = 0; i < 7; i++) { var d0 = new Date(aPerSemana); d0.setDate(d0.getDate() + i); datas.push(d0); }
  var keys = datas.map(aColetivasDateKey);
  if (!aPerDia || keys.indexOf(aPerDia) < 0) aPerDia = keys.indexOf(hojeKey) >= 0 ? hojeKey : (keys.filter(function(k){ return (dados[k] || []).length; })[0] || keys[0]);
  var nome = ''; aPerAlunos.forEach(function(a){ if (a.id === aPerAid) nome = a.nome || ''; });
  var html = '<div class="pr-top">';
  if (aPerAlunos.length > 1) html += '<select class="pr-sel" onchange="aPerTrocarAluno(this.value)">' + aPerAlunos.map(function(x){ return '<option value="' + aEsc(x.id) + '"' + (x.id === aPerAid ? ' selected' : '') + '>' + aEsc(x.nome || '') + '</option>'; }).join('') + '</select>';
  else html += '<span class="pr-nome">🏋️ ' + aEsc(nome || 'Personal') + '</span>';
  html += '<button class="vksbtn pr-nb" onclick="aPerSemanaMudar(-1)">‹</button><button class="vksbtn pr-nb" onclick="aPerSemanaMudar(1)">›</button><button class="vksbtn pr-nb pr-hoje" onclick="aPerHoje()">Hoje</button></div><div class="semana-strip">';
  datas.forEach(function(d){
    var k = aColetivasDateKey(d), tem = (dados[k] || []).length > 0;
    html += '<div class="semana-strip-dia' + (tem ? ' tem-treino' : '') + (k === hojeKey ? ' hoje' : '') + (k === aPerDia ? ' sel' : '') + '" onclick="aPerSelDia(this.dataset.k)" data-k="' + k + '"><span>' + letras[d.getDay()] + '</span><span class="ssd-dot"></span><span class="ssd-data">' + fmt(d) + '</span></div>';
  });
  html += '</div>';
  var dSel = datas[keys.indexOf(aPerDia)];
  html += '<div style="font-size:14px;font-weight:800;margin:8px 0 6px">' + diasLabel[dSel.getDay()] + ' <span style="font-weight:600;color:var(--t3);font-size:12px">' + fmt(dSel) + (aPerDia === hojeKey ? ' · hoje' : '') + ' · sem. ' + fmt(datas[0]) + '–' + fmt(datas[6]) + '</span></div>';
  var blocos = dados[aPerDia] || [];
  if (!blocos.length) { el.innerHTML = html + '<div style="font-size:12px;color:var(--t3);padding:10px 0">Sem treino neste dia.</div>'; return; }
  blocos.forEach(function(b){
    var isC = b.tipo === 'condicionamento';
    var titulo = isC ? '🔥 Condicionamento' : ('🏋️ ' + (b.nome ? aEsc(b.nome) : 'Bloco'));
    var meta = (!isC && b.conjugado) ? 'Conjugado' + (b.series ? (' · ' + aEsc(b.series) + ' séries') : '') : '';
    var cor = (b.cor && /^#[0-9a-fA-F]{6}$/.test(b.cor)) ? b.cor : '';
    var corpo = '';
    if (isC) {
      if (b.formato) corpo += '<div class="cl-meta"><b>Formato:</b> ' + aEsc(b.formato) + '</div>';
      if (b.materiais) corpo += '<div class="cl-meta"><b>Materiais:</b> ' + aEsc(b.materiais) + '</div>';
    }
    (b.exercicios || []).forEach(function(ex){
      if (!ex.nome) return;
      var sr = b.conjugado ? (ex.reps ? (aEsc(ex.reps) + ' reps') : '') : ((ex.series || ex.reps) ? (aEsc(ex.series || '') + (ex.series && ex.reps ? '×' : '') + aEsc(ex.reps || '')) : '');
      var pl = (ex.url && String(ex.url).indexOf('http') === 0) ? '<button type="button" class="cl-play" data-u="' + aEsc(ex.url) + '" onclick="aColPlay(this)" aria-label="Video">▶</button>' : '';
      var ch = (b.id || 'b') + '|' + aPerKey(ex.nome), kn = aPerKey(ex.nome);
      var v = aPerReg[aPerDia + '|' + ch] || { carga: '', obs: '', feito: false };
      var hs = aPerHist.filter(function(x){ return aPerKey(x.exercicio || '') === kn && x.data < aPerDia && ((x.carga || '').trim() || (x.obs || '').trim()); }).slice(0, 6);
      corpo += '<div class="pr-ex" data-ch="' + aEsc(ch) + '" data-ex="' + aEsc(ex.nome) + '">' +
        '<div class="pr-n">' + pl + '<span class="pr-nm">' + aEsc(ex.nome) + '</span>' + (sr ? '<span class="pr-sr">' + sr + '</span>' : '') + '<span class="pr-st"></span></div>' +
        '<input class="pr-in pr-carga" type="text" inputmode="decimal" placeholder="kg" value="' + aEsc(v.carga) + '" onchange="aPerSalvar(this)">' +
        '<button type="button" class="pr-obsb' + (v.obs ? ' on' : '') + '" onclick="aPerObsToggle(this)" aria-label="Observação">💬</button>' +
        '<input class="pr-ck" type="checkbox"' + (v.feito ? ' checked' : '') + ' onchange="aPerSalvar(this)" aria-label="Feito">' +
        '<input class="pr-in pr-obs" type="text" placeholder="observação" value="' + aEsc(v.obs) + '" style="display:' + (v.obs ? 'block' : 'none') + '" onchange="aPerSalvar(this)">' +
        (hs.length ? '<div class="pr-last" onclick="aPerHist1(this.parentNode)">Última: ' + aEsc(hs[0].carga || hs[0].obs) + ' · ' + aPerBr(hs[0].data) + ' ▾</div><div class="pr-hint" style="display:none">' + hs.map(function(x){ return aPerBr(x.data) + ' — ' + aEsc(x.carga || '') + (x.obs ? ' · ' + aEsc(x.obs) : ''); }).join('<br>') + '</div>' : '') +
        '</div>';
    });
    if (b.detalhes) corpo += '<div class="cl-det">' + aEsc(b.detalhes) + '</div>';
    html += '<div class="bloco"' + (cor ? ' style="border-left:4px solid ' + cor + '"' : '') + '><div class="bh" onclick="aColToggle(this)"><div class="dot" style="border-left-color:' + (cor || (isC ? '#D45828' : 'var(--P)')) + '"></div><span class="bt">' + titulo + '</span>' + (meta ? '<span class="bm">' + meta + '</span>' : '') + '<span class="bt-arr">▾</span></div><div class="exl" style="padding:2px 10px 6px' + (cor ? ';background:color-mix(in srgb,' + cor + ' 7%,transparent)' : '') + '">' + corpo + '</div></div>';
  });
  el.innerHTML = html + aColLogo();
}
let aColetivasCache = null;
async function aCarregarColetivas(){
  const el = document.getElementById('tColetivasConteudo');
  if (!el) return;
  el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--t3)">Carregando…</div>';
  if (!aColetivasCache) {
    try {
      const { data, error } = await aClient.from('aulas_coletivas').select('dados').maybeSingle();
      if (error) throw error;
      aColetivasCache = (data && data.dados && typeof data.dados === 'object') ? data.dados : {};
    } catch(e) {
      aColetivasCache = {};
    }
  }
  el.innerHTML = aMontarColetivas(aColetivasCache);
}
function aColetivasMudarSemana(delta){
  const d = new Date(aColetivasSemana);
  d.setDate(d.getDate() + delta*7);
  aColetivasSemana = d;
  aCarregarColetivas();
}
var aColetivasDiaSel = null;
function aColetivasSelDia(k){ aColetivasDiaSel = k; var el = document.getElementById('tColetivasConteudo'); if (el) el.innerHTML = aMontarColetivas(aColetivasCache || {}); }
function aColToggle(h){ var n = h.nextElementSibling; if (!n) return; var abre = n.style.display === 'none'; n.style.display = abre ? 'block' : 'none'; var a = h.querySelector('.bt-arr'); if (a) a.style.transform = abre ? '' : 'rotate(-90deg)'; }
function aMontarColetivas(dados){
  var en = aLang === 'en';
  var diasLabel = en ? ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] : ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  var letras = en ? ['S','M','T','W','T','F','S'] : ['D','S','T','Q','Q','S','S'];
  var hojeKey = aColetivasDateKey(new Date());
  var fmt = function(d){ return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0'); };
  var datas = [];
  for (var i = 0; i < 7; i++) { var d0 = new Date(aColetivasSemana); d0.setDate(d0.getDate() + i); datas.push(d0); }
  var keys = datas.map(aColetivasDateKey);
  if (!aColetivasDiaSel || keys.indexOf(aColetivasDiaSel) < 0) {
    aColetivasDiaSel = keys.indexOf(hojeKey) >= 0 ? hojeKey : (keys.filter(function(k){ return ((dados && dados[k]) || []).length; })[0] || keys[0]);
  }
  var html = '<div class="pt" style="margin-bottom:6px">🤸 ' + (en ? 'Group classes' : 'Aulas coletivas') + '</div>';
  html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
  html += '<button class="vksbtn" style="padding:4px 12px;margin:0;width:auto" onclick="aColetivasMudarSemana(-1)">‹</button>';
  html += '<span style="font-size:11px;font-weight:700;flex:1;text-align:center">' + fmt(datas[0]) + ' – ' + fmt(datas[6]) + '</span>';
  html += '<button class="vksbtn" style="padding:4px 12px;margin:0;width:auto" onclick="aColetivasMudarSemana(1)">›</button>';
  html += '</div><div class="semana-strip">';
  datas.forEach(function(d){
    var k = aColetivasDateKey(d), tem = ((dados && dados[k]) || []).length > 0;
    html += '<div class="semana-strip-dia' + (tem ? ' tem-treino' : '') + (k === hojeKey ? ' hoje' : '') + (k === aColetivasDiaSel ? ' sel' : '') + '" onclick="aColetivasSelDia(this.dataset.k)" data-k="' + k + '"><span>' + letras[d.getDay()] + '</span><span class="ssd-dot"></span><span class="ssd-data">' + fmt(d) + '</span></div>';
  });
  html += '</div>';
  var di = keys.indexOf(aColetivasDiaSel), dSel = datas[di];
  html += '<div style="font-size:15px;font-weight:800;margin:12px 0 8px">' + diasLabel[dSel.getDay()] + ' <span style="font-weight:600;color:var(--t3);font-size:12px">' + fmt(dSel) + (aColetivasDiaSel === hojeKey ? (en ? ' · today' : ' · hoje') : '') + '</span></div>';
  var blocos = (dados && dados[aColetivasDiaSel]) || [];
  if (!blocos.length) { html += '<div style="font-size:12px;color:var(--t3);padding:10px 0">' + (en ? 'No group class.' : 'Sem aula coletiva.') + '</div>' + aColLogo(); return html; }
  blocos.forEach(function(b){
    var isC = b.tipo === 'condicionamento';
    var titulo = isC ? ('🔥 ' + (en ? 'Conditioning' : 'Condicionamento')) : ('🏋️ ' + (b.nome ? aEsc(b.nome) : (en ? 'Block' : 'Bloco')));
    var meta = (!isC && b.conjugado) ? (en ? 'Superset' : 'Conjugado') + (b.series ? (' · ' + aEsc(b.series) + (en ? ' sets' : ' séries')) : '') : '';
    var cor = (b.cor && /^#[0-9a-fA-F]{6}$/.test(b.cor)) ? b.cor : '';
    var corpo = '';
    if (isC) {
      if (b.formato) corpo += '<div class="cl-meta"><b>' + (en ? 'Format' : 'Formato') + ':</b> ' + aEsc(b.formato) + '</div>';
      if (b.materiais) corpo += '<div class="cl-meta"><b>' + (en ? 'Equipment' : 'Materiais') + ':</b> ' + aEsc(b.materiais) + '</div>';
    }
    (b.exercicios || []).forEach(function(ex){
      if (!ex.nome) return;
      var sr = b.conjugado ? (ex.reps ? (aEsc(ex.reps) + ' reps') : '') : ((ex.series || ex.reps) ? (aEsc(ex.series || '') + (ex.series && ex.reps ? '×' : '') + aEsc(ex.reps || '')) : '');
      var pl = (ex.url && String(ex.url).indexOf('http') === 0) ? '<button type="button" class="cl-play" data-u="' + aEsc(ex.url) + '" onclick="aColPlay(this)" aria-label="Video">▶</button>' : '';
      corpo += '<div class="cl-ex-r"><span class="cl-ex-n">' + pl + '<span>' + aEsc(ex.nome) + '</span></span><span class="cl-ex-c">' + sr + '</span></div>';
    });
    if (b.detalhes) corpo += '<div class="cl-det">' + aEsc(b.detalhes) + '</div>';
    html += '<div class="bloco"' + (cor ? ' style="border-left:4px solid ' + cor + '"' : '') + '><div class="bh" onclick="aColToggle(this)"><div class="dot" style="border-left-color:' + (cor || (isC ? '#D45828' : 'var(--P)')) + '"></div><span class="bt">' + titulo + '</span>' + (meta ? '<span class="bm">' + meta + '</span>' : '') + '<span class="bt-arr">▾</span></div><div class="exl" style="padding:6px 12px 10px' + (cor ? ';background:color-mix(in srgb,' + cor + ' 7%,transparent)' : '') + '">' + corpo + '</div></div>';
  });
  return html + aColLogo();
}
function aColPlay(btn){
  var u = btn.getAttribute('data-u') || '';
  var e = aEmbedUrl(u);
  if (e) aAbrirVideoModal(e); else window.open(u, '_blank', 'noopener');
}
function aColLogo(){
  var c = document.getElementById('aLogoClaro'), e = document.getElementById('aLogoEscuro');
  if (!c) return '';
  if (document.querySelector('#tFooter .footer-logo')) return '';
  var r = aLogoRodapeFonte();
  return '<div class="col-logo"><img class="lg-claro" data-lr="c" src="' + (r ? r.c : c.src) + '" alt="MOVH"/><img class="lg-escuro" data-lr="e" src="' + (r ? (r.e || r.c) : (e ? e.src : c.src)) + '" alt="MOVH"/></div>';
}
function aLogoRodapeFonte(){ try { var r = JSON.parse(localStorage.getItem('movh-logo-rodape') || 'null'); if (r && r.c) return r; } catch(x) {} return null; }
function aLogoRodape(){
  // logo do rodapé: a escolhida em "Logo do rodapé" no Gerador; sem escolha, a mesma do login
  var c = document.getElementById('aLogoClaro'), e = document.getElementById('aLogoEscuro');
  var r = aLogoRodapeFonte();
  if (!r && !c) return '';
  var sc = r ? r.c : c.src, se = r ? (r.e || r.c) : (e ? e.src : c.src);
  return '<img class="footer-logo lg-claro" data-lr="c" src="' + sc + '" alt="MOVH"/><img class="footer-logo lg-escuro" data-lr="e" src="' + se + '" alt="MOVH"/>';
}

// Monta um pequeno gráfico de evolução (SVG puro, sem libs externas) a partir
// de uma lista de registros [{carga, criado_em}, ...] já em ordem cronológica.
function aSparkline(registros){
  const pontos = registros.filter(r => r.carga != null);
  if (pontos.length === 0) return '';
  const W = 280, H = 64, PAD = 8;
  // Com um único registro ainda não há "evolução" pra traçar uma linha, mas
  // mostramos um ponto único centralizado em vez de simplesmente omitir o
  // gráfico — assim o card fica visualmente consistente desde o primeiro
  // registro, sem exigir que o aluno registre 2x pra "desbloquear" o gráfico.
  if (pontos.length === 1) {
    const cy = H / 2;
    return '<svg class="spark" width="100%" height="'+H+'" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">' +
      '<line x1="'+PAD+'" y1="'+cy+'" x2="'+(W-PAD)+'" y2="'+cy+'" stroke="var(--bd)" stroke-width="1" stroke-dasharray="3,3"/>' +
      '<circle cx="'+(W/2).toFixed(1)+'" cy="'+cy+'" r="4" fill="var(--P)"/>' +
    '</svg>';
  }
  const cargas = pontos.map(p => p.carga);
  const min = Math.min(...cargas), max = Math.max(...cargas);
  const span = (max - min) || 1;
  const stepX = (W - PAD*2) / (pontos.length - 1);
  const coords = pontos.map((p, i) => {
    const x = PAD + i*stepX;
    const y = H - PAD - ((p.carga - min) / span) * (H - PAD*2);
    return [x, y];
  });
  const pathD = coords.map((c,i) => (i===0?'M':'L') + c[0].toFixed(1) + ',' + c[1].toFixed(1)).join(' ');
  const ultimo = coords[coords.length-1];
  const subiu = pontos[pontos.length-1].carga >= pontos[0].carga;
  const corLinha = subiu ? 'var(--G)' : 'var(--P)';
  return '<svg class="spark" width="100%" height="'+H+'" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">' +
    '<path d="'+pathD+'" fill="none" stroke="'+corLinha+'" stroke-width="2" vector-effect="non-scaling-stroke"/>' +
    '<circle cx="'+ultimo[0].toFixed(1)+'" cy="'+ultimo[1].toFixed(1)+'" r="3.5" fill="'+corLinha+'"/>' +
  '</svg>';
}

function aFormatarDataLonga(iso){
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return aFormatarDataCurta(d) + '/' + String(d.getFullYear()).slice(2);
}

function aMontarProgresso(){
  if (!aTodosRegistros.length) {
    return '<div class="dash-empty"><div class="ic">📈</div>' + aT('progresso_vazio_titulo') + '<br>' + aT('progresso_vazio_desc') + '</div>';
  }
  // agrupa por exercício, em ordem cronológica
  const porExercicio = {};
  aTodosRegistros.forEach(r => {
    if (!r.exercicio_nome) return;
    if (!porExercicio[r.exercicio_nome]) porExercicio[r.exercicio_nome] = [];
    porExercicio[r.exercicio_nome].push(r);
  });
  const nomes = Object.keys(porExercicio).sort((a,b) => a.localeCompare(b, aLang === 'en' ? 'en' : 'pt-BR'));

  let h = '<div class="prog-head"><div class="pt" style="font-size:17px;margin-bottom:4px">' + aEsc(aT('progresso_titulo')) + '</div><div style="font-size:12px;color:var(--t2)">' + aEsc(aT('progresso_desc')) + '</div></div>';

  nomes.forEach((nome, idx) => {
    const regs = porExercicio[nome];
    const primeiro = regs.find(r => r.carga != null);
    const ultimo = [...regs].reverse().find(r => r.carga != null);
    const variacao = (primeiro && ultimo && primeiro.carga) ? (((ultimo.carga - primeiro.carga) / primeiro.carga) * 100) : null;
    const spark = aSparkline(regs);
    const linhasHist = [...regs].reverse().slice(0, 6).map(r =>
      '<div class="prog-hist-row"><span>' + aFormatarDataLonga(r.criado_em) + '</span><span>' + (r.carga!=null?aEsc(r.carga)+'kg':'—') + (r.reps!=null?' × '+aEsc(r.reps):'') + '</span></div>'
    ).join('');
    const detId = 'prog-detalhe-' + idx;
    h += '<div class="prog-card">' +
      '<div class="prog-card-hd" onclick="aToggleProg(\'' + detId + '\',this)">' +
        '<span class="prog-ex-nome">' + aEsc(nome) + '</span>' +
        '<span style="display:flex;align-items:center;gap:6px">' +
        (variacao != null ? '<span class="prog-var '+(variacao>=0?'up':'down')+'">' + (variacao>=0?'▲':'▼') + ' ' + Math.abs(variacao).toFixed(0) + '%</span>' : '') +
        '<span class="prog-arr">▾</span>' +
        '</span>' +
      '</div>' +
      '<div class="prog-detalhe" id="' + detId + '" style="display:none">' +
        (spark ? '<div class="prog-spark">' + spark + '</div>' : '') +
        '<div class="prog-hist">' + linhasHist + '</div>' +
      '</div>' +
    '</div>';
  });

  return h;
}

// % da velocidade de limiar por zona (mesma referência do magic.training/calculadora).
// FTP = tempo do teste de 3km − 6% (aEsc não é aplicado aqui pois são só números).
const A_ZONAS_PCT = [
  { nome:'Recuperação', pct:0.65 }, { nome:'Fácil', pct:0.76 }, { nome:'Maratona', pct:0.85 },
  { nome:'Limiar', pct:1.00 }, { nome:'Intervalo', pct:1.12 }, { nome:'Repetição', pct:1.30 }
];
const A_ZONA_DESC = {
  'Recuperação':'corrida bem leve, regenerativa',
  'Fácil':'rodagem leve, base aeróbica',
  'Maratona':'ritmo de prova longa',
  'Limiar':'ritmo forte e sustentável (20–40min)',
  'Intervalo':'tiros de 3–5min, no limite',
  'Repetição':'tiros curtos e rápidos, velocidade'
};
function aSegundosParaPace(seg){
  seg = Math.round(seg);
  const m = Math.floor(seg/60), s = seg%60;
  return m + ':' + String(s).padStart(2,'0');
}
// Estimativa de VDOT (Jack Daniels' Running Formula) a partir de um teste de
// tempo numa distância conhecida. Diferente do cálculo anterior (fator fixo
// de 0.94 sobre o tempo), aqui o %VO2max sustentável depende também da
// DURAÇÃO do teste — um teste de 3km e um de 10km no mesmo pace de hoje não
// geram mais as mesmas zonas, porque fisiologicamente não é o mesmo esforço.
function aVDOT(tempoSegundos, distanciaKm){
  const t = tempoSegundos / 60; // minutos
  const v = (distanciaKm * 1000) / t; // metros por minuto
  const vo2 = -4.60 + 0.182258*v + 0.000104*v*v;
  const pctVO2max = 0.8 + 0.1894393*Math.exp(-0.012778*t) + 0.2989558*Math.exp(-0.1932605*t);
  return vo2 / pctVO2max;
}
// Inverte a fórmula de VO2 pra achar a velocidade (m/min) que exige um
// determinado %VO2max, dado o VDOT do aluno — usada pra achar o pace de
// cada zona de treino a partir do VDOT calculado acima.
function aVelocidadeParaVO2(vo2alvo){
  const a = 0.000104, b = 0.182258, c = -(4.60 + vo2alvo);
  return (-b + Math.sqrt(b*b - 4*a*c)) / (2*a); // m/min
}
// %VO2max alvo de cada zona (referência: tabelas de Jack Daniels — Easy
// 59-74%, Marathon ~79-84%, Threshold ~88%, Interval ~100% (vVO2max),
// Repetition ~105-120%). "Recuperação" é uma extensão nossa, mais leve que
// o Easy padrão, pra cobrir dias de regeneração.
const A_ZONAS_PCTVO2 = [0.60, 0.70, 0.82, 0.88, 1.00, 1.10];
function aCalcularZonasCondicionamento(tempoSegundos, distanciaKm){
  if (!tempoSegundos || !distanciaKm) return null;
  const vdot = aVDOT(tempoSegundos, distanciaKm);
  return A_ZONAS_PCT.map((z, i) => {
    const vo2alvo = vdot * A_ZONAS_PCTVO2[i];
    const vMetrosMin = aVelocidadeParaVO2(vo2alvo);
    const segPorKm = 1000 / vMetrosMin * 60;
    return { nome: z.nome, pace: aSegundosParaPace(segPorKm) };
  });
}
// Zonas de pace calculadas a partir do teste de 3km (Condicionamento) mais
// recente do aluno — alimenta os badges "(z2 = 5:20/km)" no texto livre dos
// blocos de Condicionamento. aTestesFisicos vem ordenado ascendente por data.
function aZonasAtuais(){
  const testesCondic = aTestesFisicos.filter(t => t.padrao_movimento === 'Condicionamento' && t.unidade === 'tempo' && t.distancia_km);
  if (!testesCondic.length) return null;
  const ultimo = testesCondic[testesCondic.length - 1];
  return aCalcularZonasCondicionamento(ultimo.valor, ultimo.distancia_km);
}
// Substitui "(z1)".."(z6)" (case-insensitive), digitados livremente pelo
// professor dentro do texto do bloco de Condicionamento, por um badge com o
// pace daquele aluno. Espera receber texto JÁ escapado (aEsc) — os padrões
// são ASCII simples, então o escape não interfere na busca. Sem teste
// registrado ainda, mostra o badge indicando isso, sem sumir com a marcação.
function aProcessarZonasTexto(txtEscapado){
  if (!txtEscapado) return txtEscapado;
  const zonas = aZonasAtuais();
  // ATENÇÃO escaping: esta função inteira vive dentro do template literal
  // gigante de exportarComLogin(). Uma barra invertida simples aqui (s, (,
  // )) é engolida no "cozimento" do template e some no index.html final —
  // por isso PRECISA de barra dupla (\s, \(, \)) pra sobreviver e virar
  // barra simples de verdade no arquivo exportado. Sem isso os parênteses
  // deixam de ser literais e viram grupo de captura, quebrando a regex
  // inteira (foi exatamente o bug do "ZZ4" e do "sem teste ainda" preso).
  return txtEscapado.replace(/z?\s*\(z([1-6])\)/gi, function(_, n){
    const idx = parseInt(n, 10) - 1;
    const nomeZona = A_ZONAS_PCT[idx] ? A_ZONAS_PCT[idx].nome : ('Z' + n);
    const valorTxt = (zonas && zonas[idx]) ? (zonas[idx].pace + '/km') : (aLang === 'en' ? 'no test yet' : 'sem teste ainda');
    return '<span class="zona-badge">Z' + n + ' = ' + aEsc(valorTxt) + '</span>';
  });
}

// ── Auto-lançamento de teste pelo próprio aluno ──
// Histórico é somente-adição por design: o aluno pode registrar um novo teste
// a qualquer momento, mas não editar/apagar testes já enviados (nem os dele
// mesmo, nem os do professor). Isso preserva o histórico como registro de
// progressão real. RLS no Supabase reforça essa regra no banco.
const A_PADROES_MOVIMENTO = [
  { id:'joelho',     label:'Dominante de joelho',   labelEn:'Knee dominant',      exercicio:'Agachamento livre',            exercicioEn:'Free squat',            tipo:'forca' },
  { id:'quadril',    label:'Dominante de quadril',  labelEn:'Hip dominant',       exercicio:'Levantamento terra',           exercicioEn:'Deadlift',               tipo:'forca' },
  { id:'empurrar_h', label:'Empurrar horizontal',   labelEn:'Horizontal push',    exercicio:'Supino reto',                  exercicioEn:'Bench press',            tipo:'forca' },
  { id:'empurrar_v', label:'Empurrar vertical',     labelEn:'Vertical push',      exercicio:'Desenvolvimento militar',      exercicioEn:'Overhead press',         tipo:'forca' },
  { id:'puxar_h',    label:'Puxar horizontal',      labelEn:'Horizontal pull',    exercicio:'Remada curvada',               exercicioEn:'Bent-over row',          tipo:'forca' },
  { id:'puxar_v',    label:'Puxar vertical',        labelEn:'Vertical pull',      exercicio:'Barra fixa / Puxada',          exercicioEn:'Pull-up / Lat pulldown',  tipo:'forca_dual' },
  { id:'core',       label:'Core / tronco',         labelEn:'Core / trunk',       exercicio:'Prancha isométrica',           exercicioEn:'Plank hold',             tipo:'tempo' },
  { id:'condicionamento', label:'Condicionamento',  labelEn:'Conditioning',       exercicio:'3km (esteira ou rua/pista)',   exercicioEn:'3km (treadmill or road/track)', tipo:'condicionamento' }
];
function aPadraoInfo(id){ return A_PADROES_MOVIMENTO.find(p => p.id === id) || null; }
// Localiza um rótulo de padrão de movimento pro idioma atual (aLang). Aceita
// tanto o label em PT (como fica salvo em testes_fisicos.padrao_movimento)
// quanto o próprio objeto de A_PADROES_MOVIMENTO.
function aPadraoLabelLocalizado(labelPt){
  if (aLang !== 'en') return labelPt;
  const info = A_PADROES_MOVIMENTO.find(p => p.label === labelPt);
  return (info && info.labelEn) ? info.labelEn : labelPt;
}
function aTempoParaSegundos(str){
  if (!str) return null;
  const partes = String(str).split(':').map(Number);
  if (partes.some(isNaN)) return null;
  if (partes.length === 2) return partes[0]*60 + partes[1];
  if (partes.length === 3) return partes[0]*3600 + partes[1]*60 + partes[2];
  return null;
}
function aAbrirNovoTeste(padraoPreSelecionado){
  const sel = document.getElementById('at-padrao');
  sel.innerHTML = A_PADROES_MOVIMENTO.map(p => '<option value="' + p.id + '">' + aEsc(aLang === 'en' && p.labelEn ? p.labelEn : p.label) + '</option>').join('');
  if (padraoPreSelecionado) sel.value = padraoPreSelecionado;
  aTestesAtualizarCampos();
  document.getElementById('at-data').value = new Date().toISOString().slice(0,10);
  document.getElementById('at-valor').value = '';
  document.getElementById('at-tempo').value = '';
  document.getElementById('at-exercicio').value = '';
  document.getElementById('at-obs').value = '';
  document.getElementById('a-teste-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function aFecharTesteModal(){
  document.getElementById('a-teste-modal').style.display = 'none';
  document.body.style.overflow = '';
}
function aTestesAtualizarCampos(){
  const info = aPadraoInfo(document.getElementById('at-padrao').value);
  if (!info) return;
  document.getElementById('at-exercicio').placeholder = (aLang === 'en' && info.exercicioEn) ? info.exercicioEn : info.exercicio;
  document.getElementById('at-campo-dual').style.display = info.tipo === 'forca_dual' ? 'flex' : 'none';
  document.getElementById('at-campo-condic').style.display = info.tipo === 'condicionamento' ? 'flex' : 'none';
  document.getElementById('at-valor').style.display = (info.tipo === 'condicionamento') ? 'none' : 'block';
  document.getElementById('at-valor').placeholder = info.tipo === 'tempo' ? 'Tempo sustentado (segundos)' : 'Valor (kg)';
}
async function aSalvarMeuTeste(){
  if (aPreviewBloqueado()) return;
  const info = aPadraoInfo(document.getElementById('at-padrao').value);
  if (!info) { alert('Selecione um padrão de movimento.'); return; }
  const exercicio = document.getElementById('at-exercicio').value.trim() || info.exercicio;
  const data = document.getElementById('at-data').value || new Date().toISOString().slice(0,10);
  const obs = document.getElementById('at-obs').value.trim() || null;

  const payload = {
    aluno_id: aAlunoRow.id, professor_id: aAlunoRow.professor_id,
    padrao_movimento: info.label, exercicio_nome: exercicio, observacoes: obs, data, origem: 'aluno'
  };

  if (info.tipo === 'condicionamento') {
    const segundos = aTempoParaSegundos(document.getElementById('at-tempo').value);
    const km = parseFloat(document.getElementById('at-distancia').value) || 3;
    if (!segundos) { alert('Informe o tempo do teste (mm:ss).'); return; }
    payload.valor = segundos; payload.unidade = 'tempo'; payload.distancia_km = km;
    payload.observacoes = (document.getElementById('at-local').value + (obs ? ' — ' + obs : ''));
  } else if (info.tipo === 'forca_dual') {
    const unidade = document.querySelector('input[name="at-unidade-dual"]:checked').value;
    const valor = parseFloat(document.getElementById('at-valor').value);
    if (isNaN(valor)) { alert('Informe o valor do teste.'); return; }
    payload.valor = valor; payload.unidade = unidade;
  } else {
    const valor = parseFloat(document.getElementById('at-valor').value);
    if (isNaN(valor)) { alert('Informe o valor do teste.'); return; }
    payload.valor = valor; payload.unidade = (info.tipo === 'tempo') ? 'segundos' : 'kg';
  }

  const { error } = await aClient.from('testes_fisicos').insert(payload);
  if (error) { alert('Erro ao salvar teste: ' + error.message); return; }
  aFecharTesteModal();
  const { data: testes } = await aClient.from('testes_fisicos')
    .select('padrao_movimento, exercicio_nome, valor, unidade, distancia_km, observacoes, data')
    .eq('aluno_id', aAlunoRow.id)
    .order('data', { ascending: true });
  aTestesFisicos = testes || [];
  document.getElementById('tProgressoConteudo').innerHTML = aMontarAvisoAvaliacao() + aMontarProgresso() + aMontarTestes();
  // Redesenha o dashboard também — é lá que vivem os badges de zona (z#) no
  // texto do condicionamento e o banner "hoje é dia de teste". Sem isso,
  // depois de salvar o teste nada mudava na tela até um reload manual.
  if (aSemanasAtual && aAgendaAtual && document.getElementById('tDashConteudo')) {
    document.getElementById('tDashConteudo').innerHTML = aMontarDashboardHoje(aSemanasAtual, aAgendaAtual);
    aSessaoRestaurar();
  }
}

// Seção "🏋️ Meus Testes" — RM e condicionamento por padrão de movimento,
// lançados pelo professor. Aparece dentro da mesma tela de "Meu progresso".
function aMontarGraficoPaceCondicionamento(regs){
  const validos = regs.filter(r => r.unidade === 'tempo' && r.distancia_km);
  if (validos.length < 2) return '';
  const pontos = validos.map(r => {
    const zonas = aCalcularZonasCondicionamento(r.valor, r.distancia_km);
    const limiar = zonas ? zonas.filter(function(z){return z.nome==='Limiar';})[0] : null;
    const partes = (limiar ? limiar.pace : '0:00').split(':');
    const segundos = parseInt(partes[0],10)*60 + parseInt(partes[1],10);
    return { data: r.data, segundos: segundos };
  });
  const w = 280, h = 90, pad = 12;
  const segsList = pontos.map(function(p){return p.segundos;});
  const min = Math.min.apply(null, segsList), max = Math.max.apply(null, segsList);
  const range = Math.max(max - min, 5);
  const xStep = pontos.length > 1 ? (w - 2*pad) / (pontos.length - 1) : 0;
  const coords = pontos.map(function(p, i){
    const x = pad + i * xStep;
    const y = pad + ((p.segundos - min) / range) * (h - 2*pad);
    return { x: x, y: y, segundos: p.segundos, data: p.data };
  });
  const pathD = coords.map(function(c, i){ return (i===0?'M':'L') + c.x.toFixed(1) + ',' + c.y.toFixed(1); }).join(' ');
  const dots = coords.map(function(c, i){
    const melhor = c.segundos === min;
    return '<circle cx="' + c.x.toFixed(1) + '" cy="' + c.y.toFixed(1) + '" r="' + (melhor?3.5:2.5) + '" fill="' + (melhor?'var(--G)':'var(--P)') + '"><title>' + aFormatarDataLonga(c.data) + ' — ' + aSegundosParaPace(c.segundos) + '/km</title></circle>';
  }).join('');
  const melhora = pontos[0].segundos - pontos[pontos.length-1].segundos; // positivo = ficou mais rápido
  const melhoraTxt = melhora > 0
    ? ('🔥 ' + aSegundosParaPace(Math.abs(melhora)) + ' mais rápido desde o primeiro teste')
    : (melhora < 0 ? ('pace de limiar ' + aSegundosParaPace(Math.abs(melhora)) + ' mais lento desde o primeiro teste') : '');
  return '<div style="margin-top:10px">' +
    '<div style="font-size:11px;font-weight:700;color:var(--tx)">📈 Evolução do pace de limiar</div>' +
    '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:' + h + 'px;margin-top:4px">' +
      '<path d="' + pathD + '" fill="none" stroke="var(--P)" stroke-width="2"/>' +
      dots +
    '</svg>' +
    '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t3);margin-top:2px">' +
      '<span>' + aFormatarDataLonga(pontos[0].data) + '</span><span>' + aFormatarDataLonga(pontos[pontos.length-1].data) + '</span>' +
    '</div>' +
    (melhoraTxt ? '<div style="font-size:11px;color:var(--t2);margin-top:4px">' + melhoraTxt + '</div>' : '') +
  '</div>';
}
function aMontarTestes(){
  if (!aTestesFisicos.length) {
    return '<div class="prog-head" style="margin-top:20px;display:flex;justify-content:space-between;align-items:flex-end;gap:8px">' +
      '<div><div class="pt" style="font-size:17px;margin-bottom:4px">🏋️ Meus Testes</div><div style="font-size:12px;color:var(--t2)">Nenhum teste registrado ainda.</div></div>' +
      '<button onclick="aAbrirNovoTeste()" style="font-size:11px;font-weight:700;color:var(--P);background:none;border:1px solid var(--P);border-radius:8px;padding:6px 10px;white-space:nowrap;cursor:pointer">+ Registrar teste</button>' +
    '</div>';
  }
  const porPadrao = {};
  aTestesFisicos.forEach(t => {
    if (!t.padrao_movimento) return;
    if (!porPadrao[t.padrao_movimento]) porPadrao[t.padrao_movimento] = [];
    porPadrao[t.padrao_movimento].push(t);
  });
  const padroes = Object.keys(porPadrao);

  let h = '<div class="prog-head" style="margin-top:20px;display:flex;justify-content:space-between;align-items:flex-end;gap:8px">' +
    '<div><div class="pt" style="font-size:17px;margin-bottom:4px">🏋️ Meus Testes</div><div style="font-size:12px;color:var(--t2)">Testes de força e condicionamento, por padrão de movimento.</div></div>' +
    '<button onclick="aAbrirNovoTeste()" style="font-size:11px;font-weight:700;color:var(--P);background:none;border:1px solid var(--P);border-radius:8px;padding:6px 10px;white-space:nowrap;cursor:pointer">+ Registrar teste</button>' +
  '</div>';

  padroes.forEach((padrao, idx) => {
    const regs = porPadrao[padrao];
    const ultimo = regs[regs.length - 1];
    const detId = 'teste-detalhe-' + idx;
    let valorTxt = ultimo.unidade === 'tempo'
      ? aSegundosParaPace(ultimo.valor) + (ultimo.distancia_km ? ' / ' + ultimo.distancia_km + 'km' : '')
      : (aEsc(ultimo.valor) + ' ' + aEsc(ultimo.unidade || ''));
    let zonasHTML = '';
    let graficoHTML = '';
    if (ultimo.unidade === 'tempo' && ultimo.distancia_km) {
      const zonas = aCalcularZonasCondicionamento(ultimo.valor, ultimo.distancia_km);
      if (zonas) {
        zonasHTML = '<div style="font-size:11px;font-weight:700;color:var(--tx);margin-top:8px">🎯 Suas zonas de treino</div>' +
          '<div style="font-size:11px;color:var(--t3);margin-bottom:4px">Alvo de pace (min:seg por km) pra cada tipo de treino:</div>' +
          '<div class="prog-hist">' + zonas.map(z =>
          '<div class="prog-hist-row"><span>' + aEsc(z.nome) + ' <span style="opacity:.7">— ' + aEsc(A_ZONA_DESC[z.nome]||'') + '</span></span><span style="font-weight:700;color:var(--tx)">' + aEsc(z.pace) + '/km</span></div>'
        ).join('') + '</div>';
      }
      if (padrao === 'Condicionamento') graficoHTML = aMontarGraficoPaceCondicionamento(regs);
    }
    const linhasHist = [...regs].reverse().slice(0, 6).map(r => {
      const rv = r.unidade === 'tempo' ? aSegundosParaPace(r.valor) : (aEsc(r.valor) + ' ' + aEsc(r.unidade || ''));
      return '<div class="prog-hist-row"><span>' + aFormatarDataLonga(r.data) + '</span><span>' + rv + '</span></div>';
    }).join('');
    h += '<div class="prog-card">' +
      '<div class="prog-card-hd" onclick="aToggleProg(\'' + detId + '\',this)">' +
        '<span class="prog-ex-nome">' + aEsc(aPadraoLabelLocalizado(padrao)) + '</span>' +
        '<span style="display:flex;align-items:center;gap:6px"><span class="prog-var up">' + valorTxt + '</span><span class="prog-arr">▾</span></span>' +
      '</div>' +
      '<div class="prog-detalhe" id="' + detId + '" style="display:none">' +
        '<div style="font-size:11px;color:var(--t3);margin-bottom:4px">' + aEsc(ultimo.exercicio_nome || '') + '</div>' +
        zonasHTML +
        graficoHTML +
        '<div class="prog-hist" style="margin-top:6px">' + linhasHist + '</div>' +
      '</div>' +
    '</div>';
  });

  return h;
}

// Acha a primeira data, dentro do intervalo [inicio, fim] de um mesociclo, que
// cai no dia da semana informado. Usado para mostrar "Segunda 22/06" etc.
function aPrimeiraDataNoIntervalo(inicio, fim, diaSemanaNome){
  if (!diaSemanaNome) return null;
  const alvo = DIAS_SEMANA_ORDEM.indexOf(diaSemanaNome);
  if (alvo < 0) return null;
  let cursor = new Date(inicio);
  for (let i = 0; i < 7; i++) {
    if (cursor.getDay() === alvo) return cursor <= fim ? cursor : null;
    cursor = aAddDias(cursor, 1);
  }
  return null;
}

function aRenderProtocolo(proto){
  const c = proto.conteudo || {};
  aLang = (c.lang === 'en') ? 'en' : 'pt';
  aTestesAgendados = c.testesAgendados || [];
  document.getElementById('tLogadoComo').textContent = aT('logado_como');
  { const sb = document.getElementById('tSairBtn'); sb.title = aT('sair'); sb.setAttribute('aria-label', aT('sair')); }
  document.getElementById('tBtnProgresso').textContent = aT('meu_progresso');
  document.querySelectorAll('.tBtnVoltar').forEach(btn => btn.textContent = aT('voltar_para_hoje'));
  document.getElementById('tAlunoNome').textContent = aAlunoRow.email || aAlunoRow.nome;
  aAtualizarSaudacao();
  aRegistrarVisto();
  if (!window._movhRelogioIniciado) { window._movhRelogioIniciado = true; aIniciarRelogio(); }
  // Banner aviso renovação
  const bannerRen = document.getElementById('banner-renovar');
  if (bannerRen && window._movhAvisoRenovar) {
    const d = window._movhAvisoRenovar;
    const txt = aLang==='en'
      ? `⚠️ Your access expires in ${d} day${d!==1?'s':''}!`
      : `⚠️ Seu acesso vence em ${d} dia${d!==1?'s':''}!`;
    document.getElementById('banner-renovar-txt').textContent = txt;
    bannerRen.style.display = 'inline-flex';
  }
  document.getElementById('tProtoNome').textContent = c.nome || proto.nome || 'Treino';
  document.getElementById('tProtoDesc').textContent = c.desc || '';
  document.getElementById('tFooter').innerHTML = aEsc((c.nome||'') + (c.divisao ? ' · '+c.divisao : '')) + aLogoRodape();

  const semanas = c.semanas || [];
  const agenda = aCalcularAgendaHoje(proto, semanas);
  const intervalos = aCalcularIntervalosMesociclos(proto, semanas);
  aProtoAtual = proto; aSemanasAtual = semanas; aAgendaAtual = agenda;
  aMontarStripDias();

  const maxD = semanas.length ? Math.max(...semanas.map(s => (s.dias||[]).length)) : 0;
  document.getElementById('tBadgeNome').textContent = (c.icone || '💪') + ' ' + (c.nome || 'Treino');
  if (maxD > 0) {
    document.getElementById('tBadgeDias').textContent = maxD + ' ' + (maxD !== 1 ? aT('dias') : aT('dia')) + ' ' + aT('por_semana');
    document.getElementById('tBadgeDias').style.display = 'inline-block';
  }
  if (c.divisao) {
    document.getElementById('tProtoDiv').textContent = c.divisao;
    document.getElementById('tProtoDiv').style.display = 'block';
  }

  // ── Dashboard: treino de hoje, já expandido ──
  document.getElementById('tDashConteudo').innerHTML = aMontarDashboardHoje(semanas, agenda);
  aMontarNotifs();
  // restaura estado de conclusão da sessão de hoje (persistido no localStorage)
  aSessaoRestaurar();

  // ── Semana completa: navegação por semana/dia (como antes) ──
  const semNav = semanas.map((s,si) => {
    const intv = intervalos[si];
    const dataLabel = intv ? ' <span class="sbt-datas">' + aFormatarDataCurta(intv.inicio) + '–' + aFormatarDataCurta(intv.fim) + '</span>' : '';
    return '<button class="sbt'+(si===agenda.semanaIdx?' active':'')+'" data-sid="'+aEsc(s.id)+'" onclick="aShowSemana(this.dataset.sid,this)">'+aEsc(s.nome)+dataLabel+'</button>';
  }).join('');
  document.getElementById('tSemNav').innerHTML = semNav;
  document.getElementById('tSemTimelineWrap').innerHTML = aMontarBadgeTimeline('semcompleta') + aMontarTimelinePeriodizacao(semanas, agenda.semanaGlobal, 'semcompleta');

  let semsH = '';
  semanas.forEach((s, si) => {
    const isSemanaAtiva = si === agenda.semanaIdx;
    const intv = intervalos[si];
    const intervaloLabel = intv ? '<div class="meso-datas">🗓️ ' + aFormatarDataCurta(intv.inicio) + ' — ' + aFormatarDataCurta(intv.fim) + '</div>' : '';
    const faseCtxSem = 'sem-' + s.id;
    semsH += '<div class="sem'+(isSemanaAtiva?' active':'')+'" id="sem-'+aAttr(s.id)+'">' + intervaloLabel + aMontarBadgeFase(s, faseCtxSem) + aMontarCardFase(s, isSemanaAtiva ? agenda.semanaDentroFase : 1, faseCtxSem) + '<div class="dias-nav">';
    (s.dias||[]).forEach((d,di) => {
      const ehHoje = isSemanaAtiva && agenda.diaSemanaHoje && aDiaSemanaEfetivo(d) === agenda.diaSemanaHoje;
      const dataDia = intv ? aPrimeiraDataNoIntervalo(intv.inicio, intv.fim, aDiaSemanaEfetivo(d)) : null;
      const dataDiaLabel = dataDia ? ' <span class="dbt-data">' + aFormatarDataCurta(dataDia) + '</span>' : '';
      semsH += '<button class="dbt'+(di===0?' active':'')+' dbt-' + d.id + '" data-sid="'+aEsc(s.id)+'" data-did="'+aEsc(d.id)+'" onclick="aShowDia(this.dataset.sid,this.dataset.did,this)">'+aEsc(d.nome)+dataDiaLabel+(ehHoje?' <span class="hoje-dot">●</span>':'')+'</button>';
    });
    semsH += '</div>';
    (s.dias||[]).forEach((d,di) => {
      const ehHoje = isSemanaAtiva && agenda.diaSemanaHoje && aDiaSemanaEfetivo(d) === agenda.diaSemanaHoje;
      semsH += '<div class="dia'+(di===0?' active':'')+'" id="d-'+aAttr(d.id)+'">' + (ehHoje?'<div class="hoje-banner">📅 Treino de hoje · '+aEsc(agenda.diaSemanaHoje)+' · '+aDataCompacta()+'</div>':'') + (d.sub?'<div class="dsub">'+aEsc(d.sub)+'</div>':'') + (d.blocos||[]).map((b,bIdx)=>aBlocoOut(b, s.fase, 'sem-'+s.id+'-'+d.id, bIdx, isSemanaAtiva ? agenda.semanaDentroFase : 1, s.duracaoSemanas||4)).join('') + '</div>';
    });
    semsH += '</div>';
  });
  document.getElementById('tSemanas').innerHTML = semsH;

  // ativa visualmente o dia de hoje na navegação da semana completa
  if (agenda.diaSemanaHoje) {
    semanas.forEach((s, si) => {
      if (si !== agenda.semanaIdx) return;
      (s.dias||[]).forEach(d => {
        if (aDiaSemanaEfetivo(d) === agenda.diaSemanaHoje) {
          document.querySelectorAll('#sem-'+CSS.escape(s.id)+' .dbt').forEach(b=>b.classList.remove('active'));
          document.querySelectorAll('#sem-'+CSS.escape(s.id)+' .dia').forEach(el=>el.classList.remove('active'));
          const btn = document.querySelector('#sem-'+CSS.escape(s.id)+' .dbt-'+CSS.escape(d.id));
          if (btn) btn.classList.add('active');
          const diaEl = document.getElementById('d-'+d.id);
          if (diaEl) diaEl.classList.add('active');
        }
      });
    });
  }

  // Botão de Aulas Coletivas — só aparece pros alunos com a opção ativada
  // pelo professor (aluno.mostra_aulas_coletivas)
  const btnColetivas = document.getElementById('tBtnColetivas');
  if (btnColetivas) btnColetivas.style.display = aAlunoRow.mostra_aulas_coletivas ? 'inline-block' : 'none';
  aPersonalVerificar();

  // mostra o dashboard por padrão (visão "Hoje")
  document.getElementById('tDashboard').style.display = 'block';
  document.getElementById('tSemanaCompleta').style.display = 'none';
  window._aHdrPrev = null; // v60.4: o cabeçalho (saudação, descrição, faixa de dias) sempre volta visível ao abrir o treino
  { const _hb = document.getElementById('tHeaderRecolhivel'); if (_hb && _hb.style.display === 'none') aToggleHeader(); }
  document.getElementById('treinoScreen').style.display = 'block';
}

function aShowSemana(id, btn){
  document.querySelectorAll('.sem').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.sbt').forEach(b=>b.classList.remove('active'));
  document.getElementById('sem-'+id).classList.add('active');
  btn.classList.add('active');
}
function aShowDia(sid, did, btn){
  const s = document.getElementById('sem-'+sid);
  s.querySelectorAll('.dia').forEach(d=>d.classList.remove('active'));
  s.querySelectorAll('.dbt').forEach(b=>b.classList.remove('active'));
  document.getElementById('d-'+did).classList.add('active');
  btn.classList.add('active');
}

// ══ ANAMNESE ══
let aAnamneseAluno = null; // dados temporários
function aShowAnamnese() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('treinoScreen').style.display = 'none';
  document.getElementById('anamneseScreen').style.display = 'flex';
  // nome já vem do cadastro: só pergunta se estiver vazio
  var nm = document.querySelector('#anamneseScreen input[name="nome"]');
  var nomeCad = (aAlunoRow && aAlunoRow.nome) ? String(aAlunoRow.nome) : '';
  if (nm && !nm.value) nm.value = nomeCad;
  var w = document.getElementById('av-nome-w');
  if (w) w.style.display = nomeCad ? 'none' : 'block';
  aAnamStep(1);
}
var AV_TXT = [
  ['Vamos começar por você', 'Só o essencial para montar seu treino.'],
  ['Seu objetivo e sua rotina', 'Com isso já sugerimos o ponto de partida.'],
  ['Saúde e cuidados', 'Para evitar exercícios que atrapalhem você.']
];
function aAnamVal(n) {
  var el = document.querySelector('#anamneseScreen [name="' + n + '"]');
  return el ? String(el.value || '') : '';
}
function aAnamCheck() {
  var n = window._anamStep || 1, ok = true, i, d = 0, s;
  if (n === 1) {
    s = aAnamVal('whatsapp');
    for (i = 0; i < s.length; i++) { var c = s.charAt(i); if (c >= '0' && c <= '9') d++; }
    if (d < 10) ok = false;
    var w = document.getElementById('av-nome-w');
    if (w && w.style.display !== 'none' && !aAnamVal('nome').trim()) ok = false;
  }
  if (n === 2) {
    if (!aAnamVal('objetivo') || !aAnamVal('tempo_treino') || !aAnamVal('dias_semana')) ok = false;
  }
  var nx = document.getElementById('anam-next');
  if (nx) nx.disabled = !ok;
}
function aAnamStep(n) {
  if (n < 1 || n > 3) return;
  document.querySelectorAll('.anam-step').forEach(function(s){ s.style.display = 'none'; });
  var el = document.getElementById('anam-step-' + n);
  if (el) el.style.display = 'block';
  document.getElementById('anam-progress').textContent = 'Passo ' + n + ' de 3';
  document.getElementById('av-t').textContent = AV_TXT[n-1][0];
  document.getElementById('av-s').textContent = AV_TXT[n-1][1];
  var bars = document.querySelectorAll('#anamneseScreen .av-bar i');
  for (var i = 0; i < bars.length; i++) bars[i].className = (i < n) ? 'on' : '';
  document.getElementById('anam-prev').style.visibility = n > 1 ? 'visible' : 'hidden';
  document.getElementById('anam-next').style.display = n < 3 ? 'inline-flex' : 'none';
  document.getElementById('anam-submit').style.display = n === 3 ? 'inline-flex' : 'none';
  window._anamStep = n;
  window.scrollTo(0, 0);
  aAnamCheck();
}
function aChip(b) {
  var n = b.getAttribute('data-n'), v = b.getAttribute('data-v'), g = b.parentNode;
  var multi = g.getAttribute('data-multi') === '1';
  var chips = g.querySelectorAll('.av-chip'), i, vals = [];
  if (multi) {
    if (v === 'Nenhuma') {
      for (i = 0; i < chips.length; i++) chips[i].classList.remove('sel');
      b.classList.add('sel');
    } else {
      b.classList.toggle('sel');
      for (i = 0; i < chips.length; i++) if (chips[i].getAttribute('data-v') === 'Nenhuma') chips[i].classList.remove('sel');
    }
    for (i = 0; i < chips.length; i++) if (chips[i].classList.contains('sel')) vals.push(chips[i].getAttribute('data-v'));
    v = vals.join(', ');
  } else {
    for (i = 0; i < chips.length; i++) chips[i].classList.remove('sel');
    b.classList.add('sel');
  }
  var hid = document.querySelector('#anamneseScreen input[name="' + n + '"]');
  if (hid) hid.value = v;
  if (n === 'pratica_corrida') aToggleNivelCorrida(v);
  aAnamCheck();
}
function aMaskWa(el) {
  var s = el.value, d = '', i;
  for (i = 0; i < s.length; i++) { var c = s.charAt(i); if (c >= '0' && c <= '9') d += c; }
  d = d.slice(0, 11);
  var k = d.length > 10 ? 7 : 6, o = '';
  if (d.length > 0) o = '(' + d.slice(0, 2);
  if (d.length > 2) o += ') ' + d.slice(2, k);
  if (d.length > k) o += '-' + d.slice(k);
  el.value = o;
  aAnamCheck();
}
// Mostra "Há quanto tempo corre" e km só se o aluno disse que corre.
function aToggleNivelCorrida(val) {
  var el = document.getElementById('fld-nivel-corrida');
  if (el) el.style.display = (val === 'sim') ? 'block' : 'none';
  if (val !== 'sim') {
    var h = document.querySelector('#anamneseScreen input[name="nivel_corrida"]');
    if (h) h.value = '';
    document.querySelectorAll('#fld-nivel-corrida .av-chip').forEach(function(c){ c.classList.remove('sel'); });
    var km = document.querySelector('input[name="corrida_km"]');
    if (km) km.value = '';
  }
}
async function aAnamSubmit() {
  var bt = document.getElementById('anam-submit');
  if (bt && bt.disabled) return;
  if (bt) bt.disabled = true;
  const r = {};
  document.querySelectorAll('.anam-step input, .anam-step textarea, .anam-step select').forEach(el => {
    if (el.name) r[el.name] = el.type === 'checkbox' ? el.checked : el.value;
  });
  // regiões de dor viram texto em condicoes_saude (o Gerador e os alertas leem esse campo)
  var reg = (r.dor_regioes || '').split(',').map(function(x){ return x.trim(); }).filter(function(x){ return x && x !== 'Nenhuma'; });
  delete r.dor_regioes;
  var det = (r.condicoes_saude || '').trim();
  r.condicoes_saude = reg.length ? (reg.join(', ') + (det ? '. ' + det : '')) : det;
  const { error } = await aClient.from('anamneses').insert({
    aluno_id: aAlunoRow.id, tipo: 'anamnese', respostas: r
  });
  if (error) { if (bt) bt.disabled = false; alert('Não foi possível salvar: ' + error.message); return; }
  document.getElementById('anamneseScreen').style.display = 'none';
  // Mostra boas-vindas brevemente
  document.getElementById('anam-bvscreen').style.display = 'flex';
  setTimeout(() => {
    document.getElementById('anam-bvscreen').style.display = 'none';
    // veio do link público do treino: leva o aluno ao app já logado (mesma origem = mesma sessão)
    let viaTreino = false;
    try { viaTreino = sessionStorage.getItem('movh-via-treino') === '1'; sessionStorage.removeItem('movh-via-treino'); } catch(e){}
    if (viaTreino && window.location.origin === new URL(A_APP_URL).origin) { window.location.replace(A_APP_URL); return; }
    aBoot(null); // reinicia sem forçar session — vai buscar do cache
  }, 1800);
}

// ══ PAR-Q ══
let aParqId = null;
function aShowParq(id) {
  aParqId = id;
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('treinoScreen').style.display = 'none';
  document.getElementById('parqScreen').style.display = 'flex';
  aParqStep(1);
}
function aParqStep(n) {
  document.querySelectorAll('.parq-step').forEach(s => s.style.display = 'none');
  const el = document.getElementById('parq-step-'+n);
  if (el) el.style.display = 'block';
  document.getElementById('parq-progress').textContent = 'Passo ' + n + ' de 4';
  document.getElementById('parq-prev').style.visibility = n > 1 ? 'visible' : 'hidden';
  document.getElementById('parq-next').style.display = n < 4 ? 'inline-flex' : 'none';
  document.getElementById('parq-submit').style.display = n === 4 ? 'inline-flex' : 'none';
  window._parqStep = n;
}
async function aParqSubmit() {
  const r = {};
  document.querySelectorAll('.parq-step input, .parq-step select, .parq-step textarea').forEach(el => {
    if (el.name) r[el.name] = el.type === 'radio' ? undefined : (el.type === 'checkbox' ? el.checked : el.value);
  });
  // coleta rádios
  document.querySelectorAll('.parq-step').forEach(step => {
    step.querySelectorAll('input[type=radio]:checked').forEach(el => { r[el.name] = el.value === 'sim'; });
  });
  // Atualiza o registro pendente (insere respostas no registro existente)
  const { error } = await aClient.from('anamneses').update({ respostas: r }).eq('id', aParqId);
  if (error) { alert('Erro ao salvar PAR-Q: ' + error.message); return; }
  document.getElementById('parqScreen').style.display = 'none';
  aBoot(null);
}

aBoot();