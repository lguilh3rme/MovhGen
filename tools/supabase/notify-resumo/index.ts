// Envia um texto livre ao Telegram do professor. POST JSON {"texto": "..."}.
// Reaproveita os secrets do notify-vencimentos: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
// verify_jwt = true (chamar com a anon key do projeto). Sem dependências.
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('use POST', { status: 405 })
  let texto = ''
  try { texto = String((await req.json()).texto || '').trim() } catch (_) {}
  if (!texto) return new Response('texto vazio', { status: 400 })
  const tok = Deno.env.get('TELEGRAM_BOT_TOKEN'), chat = Deno.env.get('TELEGRAM_CHAT_ID')
  if (!tok || !chat) return new Response('secrets do Telegram ausentes', { status: 500 })
  const res = await fetch('https://api.telegram.org/bot' + tok + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: texto.slice(0, 4000) }),
  })
  return new Response(res.ok ? 'ok enviado' : 'telegram ' + res.status, { status: res.ok ? 200 : 502 })
})
