// Aviso diário no Telegram: vencimentos + Pix pendentes. Chamada pelo pg_cron (08:00 BRT = 0 11 * * * UTC) via pg_net.
// Deploy: Supabase (verify_jwt = true; o cron manda a anon key). Secrets (os mesmos do notify-pix): TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, GERADOR_URL (opcional).
// Job: select cron.schedule('aviso-vencimentos','0 11 * * *', $$select net.http_post(url:='https://<ref>.supabase.co/functions/v1/notify-vencimentos', headers:='{"Content-Type":"application/json","Authorization":"Bearer <ANON_KEY>"}'::jsonb, body:='{}'::jsonb, timeout_milliseconds:=30000)$$);
const U = Deno.env.get('SUPABASE_URL')!, K = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const H = { apikey: K, Authorization: 'Bearer ' + K }
const brt = (d: Date) => new Date(d.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10)
const dif = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86400000)
const fmt = (s: string) => s.split('-').reverse().slice(0, 2).join('/')

Deno.serve(async () => {
  const hoje = brt(new Date())
  const ra = await fetch(U + '/rest/v1/alunos?select=nome,acesso_fim&ativo=eq.true', { headers: H })
  if (!ra.ok) return new Response('erro alunos ' + ra.status, { status: 500 })
  const al: any[] = await ra.json()
  const rp = await fetch(U + '/rest/v1/pagamentos_pix?select=id&status=eq.pendente', { headers: { ...H, Prefer: 'count=exact', Range: '0-0' } })
  const pix = rp.ok ? Number((rp.headers.get('content-range') || '').split('/')[1]) || 0 : 0
  const venc: string[] = [], prox: string[] = []
  let semData = 0
  for (const a of al) {
    if (!a.acesso_fim) { semData++; continue }
    const f = String(a.acesso_fim).slice(0, 10), d = dif(f, hoje)
    if (d < 0) venc.push('🔴 ' + a.nome + ' · venceu ' + fmt(f) + ' (' + Math.abs(d) + ' d)')
    else if (d <= 7) prox.push('🟠 ' + a.nome + ' · vence ' + (d === 0 ? 'hoje' : d === 1 ? 'amanhã' : fmt(f) + ' (' + d + ' d)'))
  }
  if (!venc.length && !prox.length && !pix) return new Response('nada a avisar', { status: 200 })
  const L = ['📋 MOVH · pendências de hoje']
  if (pix) L.push('💠 ' + pix + ' Pix aguardando confirmação')
  if (venc.length) L.push('', 'Vencidos:', ...venc.slice(0, 15))
  if (prox.length) L.push('', 'Vencem em até 7 dias:', ...prox.slice(0, 15))
  if (semData) L.push('', '⚪ ' + semData + ' aluno(s) ativo(s) sem data de acesso (não entram no aviso)')
  const base = (Deno.env.get('GERADOR_URL') || '').replace(/\/+$/, '')
  const reply_markup = base ? { inline_keyboard: [[{ text: 'Abrir o Gerador', url: base }]] } : undefined
  const res = await fetch('https://api.telegram.org/bot' + Deno.env.get('TELEGRAM_BOT_TOKEN') + '/sendMessage', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: Deno.env.get('TELEGRAM_CHAT_ID'), text: L.join('\n'), reply_markup }),
  })
  return new Response(res.ok ? 'ok enviado' : 'telegram ' + res.status, { status: res.ok ? 200 : 502 })
})
