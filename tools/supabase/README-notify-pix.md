# Aviso no Telegram ao tocar "Já paguei" (feito 02/11/2026)
Só Supabase: não mexe no Gerador nem no app do aluno (sem deploy do Netlify).

1. Edge Function `notify-pix`: Dashboard → Edge Functions → Deploy new → colar `tools/supabase/notify-pix/index.ts`
   (ou `supabase functions deploy notify-pix --no-verify-jwt`; o webhook não envia JWT de usuário).
2. Secrets (Edge Functions → Secrets): `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` — use os mesmos valores do bot que já avisa os pagamentos
   (se lá os nomes forem outros, ajuste as duas linhas `Deno.env.get` no arquivo). Opcional: `NOTIFY_PIX_SECRET` (qualquer texto longo).
3. Gatilho: Dashboard → Database → Webhooks → Create: tabela `pagamentos_pix`, evento INSERT, tipo Supabase Edge Function → `notify-pix`
   (se criou `NOTIFY_PIX_SECRET`, adicione o header `x-webhook-secret` com o mesmo valor).
4. Teste: no app, tocar "Já paguei" com um aluno de teste, ou no SQL Editor:
   `insert into pagamentos_pix (aluno_id, professor_id, plano_nome, dias, valor, status) select id, professor_id, 'Teste', 30, 1, 'pendente' from alunos limit 1;` (apague a linha depois).
A função ignora linhas que não são `pendente` (o botão "✓ Recebi" do Cobrar grava `confirmado` e não dispara aviso).
