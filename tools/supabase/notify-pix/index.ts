// Edge Function: avisa no Telegram quando o aluno toca "Já paguei" (linha nova em pagamentos_pix, status 'pendente').
// Disparada por Database Webhook (INSERT em pagamentos_pix). Ver tools/supabase/README-notify-pix.md.
// Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (use os MESMOS nomes do bot que já existe), NOTIFY_PIX_SECRET (opcional, recomendado).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const brl = (v: number) => 'R$ ' + Number(v).toFixed(2).replace('.', ',')

Deno.serve(async (req) => {
  const segredo = Deno.env.get('NOTIFY_PIX_SECRET')
  if (segredo && req.headers.get('x-webhook-secret') !== segredo) return new Response('unauthorized', { status: 401 })
  let body: any
  try { body = await req.json() } catch { return new Response('bad json', { status: 400 }) }
  const r = body && body.record
  if (!r || body.type !== 'INSERT' || r.status !== 'pendente') return new Response('ignorado', { status: 200 })

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: al } = await sb.from('alunos').select('nome, acesso_fim').eq('id', r.aluno_id).maybeSingle()

  const linhas = [
    '💠 Pix: o aluno tocou "Já paguei"',
    '👤 ' + (al?.nome || 'Aluno'),
    '📦 ' + (r.plano_nome || 'plano') + ' · ' + r.dias + ' dias',
    '💰 ' + brl(r.valor),
    al?.acesso_fim ? '🗓 Acesso atual até ' + String(al.acesso_fim).split('-').reverse().join('/') : '🗓 Sem acesso ativo ainda',
    'Confira no banco e toque em ✓ Confirmar no Gerador (Alunos).',
  ]
  const res = await fetch('https://api.telegram.org/bot' + Deno.env.get('TELEGRAM_BOT_TOKEN') + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: Deno.env.get('TELEGRAM_CHAT_ID'), text: linhas.join('\n') }),
  })
  return new Response(res.ok ? 'ok' : 'telegram ' + res.status, { status: res.ok ? 200 : 502 })
})
