# MOVH — Contexto v47 (20/10/2026)

Leia ANTES de mexer em qualquer coisa. Dono: LGuilherme (personal trainer, Cariacica-ES, dev solo). Responder em português, direto, compacto. Ele tem pouco orçamento de tokens e de créditos Netlify: poucas rodadas, tudo testado, um merge por rodada.

## 1. Repositórios (ambos públicos) e relação
- `lguilh3rme/MovhGen` → Gerador do professor, `index.html` único (~14.4k linhas) = FONTE de tudo. Site: movhgen.netlify.app.
- `lguilh3rme/movh` → app do aluno, `index.html` GERADO (nunca editar à mão). Site: movh.netlify.app.
- Gerar o app (em MovhGen): `node tools/export_app.js index.html tools/config.json <saida.html>` e copiar para `movh/index.html`. Checar igualdade: `git -C movh show origin/main:index.html | cmp - saida.html` (deve dar "APP == GERADOR").
- O app é um template literal dentro de `exportarComLogin()` do Gerador. Gancho `window._movhSoHTML` devolve o HTML como string (usado na prévia "Como aluno").

## 2. Netlify / créditos (IMPORTANTE)
- Duas contas Netlify separadas (Gerador numa, app do aluno noutra). Plano Free por créditos: cada deploy de produção = 15 créditos; previews de PR = 0.
- Saldo em 13/10 (aprox.): Gerador ~59–74 (aviso "Low on credits"); app do aluno ~180–195. Quando zera, o site pode ser pausado (confirmar nas regras do Netlify). O usuário tem medo disso.
- O saldo NÃO é visível pelo shell; o usuário confere em Netlify → Team settings → Billing (não inventar saldo). Todo commit no `main` dispara deploy, inclusive edição feita direto no GitHub; só `[skip netlify]` no título evita. O MovhGen também mostra status "Workers Builds: movhgen" (Cloudflare) no GitHub — confirmar com o usuário onde o Gerador é hospedado.
- Regras: UM merge por rodada; juntar mudanças; usar `[skip netlify]` no TÍTULO do PR (vira título do squash) quando não precisa de deploy (docs, testes, mudança só no template exportado do Gerador, já que o app é commitado no outro repo).
- Alternativa gratuita sem créditos: GitHub Pages nos dois repos (HTML estático, sem build). Ainda não ativado; seria só liberar o novo domínio no Supabase (URL redirect) se o login exigir. Oferecer ao usuário.
- Não dá para ver o Netlify nem o site no ar pelo shell (proxy bloqueia). WebFetch lê o site mas trunca página grande (scripts no fim) — só confiável para marcadores no início do HTML.

## 3. Fluxo Git (aprendido na dor)
1. `git fetch`; `git checkout -f -B minha-branch origin/main` (partir SEMPRE do main atualizado; branch antiga fica obsoleta após squash).
2. Editar, testar, `node --check`, exportar o app, regravar `movh/index.html`.
3. Commit (com `Co-Authored-By: Claude ...` e `Claude-Session: ...` conforme o system-reminder), `git push -u origin branch`.
4. PR via `gh api repos/lguilh3rme/REPO/pulls -f title=... -f head=... -f base=main -f body=...` (GraphQL é bloqueado). Merge: `gh api -X PUT repos/.../pulls/N/merge -f merge_method=squash`.
5. Depois: `git fetch origin` e `git branch -u origin/BRANCH` (o hook de stop reclama de branch sem upstream). Se o fetch não atualizar `refs/remotes`, `git config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'`.
- NUNCA rodar `git checkout <branch> -- .` nem trocar de branch com alterações não commitadas (já perdeu trabalho assim). Commitar antes de trocar.
- Permissões já dadas pelo usuário: pode mergear direto e corrigir direto no site.

## 4. Regras do template (app dentro de template literal)
- Barra invertida dobrada (`\\d`, `\\s`, `\\'`). Evitar crases e `${` em código novo do app. Preferir `data-*`/`this.dataset` a escapar aspas em onclick.
- Código do Gerador (fora do template) usa JS normal, barras simples.
- CSS do app: blocos com `!important` empilhados (v90…v98). O bloco NOVO vai por ÚLTIMO, antes do `</style>` do template. Ordem importa.
- Checar sintaxe: extrair o maior `<script>` e `node --check` (nos dois arquivos).

## 5. Backend (Supabase cfanjhuzrcgxrbfmhahi)
- Clients: `mbClient` (professor), `mbClientAvulso` (anon), `aClient` (aluno).
- Link público `?treino=TOKEN`: RPC `get_treino_publico` (SECURITY DEFINER, tabela `links_treino`). Sempre mostra o protocolo salvo mais recente. Erro/inválido → tela de erro própria (não login). Botão "Fazer o registro" → `?bemvindo=1` → aba "Criar conta". Verificado em 13/10 (ambiente simulado).
- Modo preview `window._movhPreview`: escritas bloqueadas; se hoje não casa com nenhum "dia real", monta sequência a partir de hoje.
- Tabelas usadas: `protocolos`, `registros_sessao`, `rpe_sessoes`, `anamneses`, `links_treino`, etc.

## 6. App do aluno — estado e UX
- Séries: `aSeriesFeitas[eid]` (localStorage `movh-series-AAAA-M-D`) ⇄ check do exercício ⇄ bloco. Badge tocável "séries × reps|tempo n/N" (preenche como barra); 1ª badge pendente pulsa.
- Tocar série → cronômetro de descanso automático (`aAutoDescanso`; desliga com `localStorage movh-autotimer=0`; não roda na prévia nem após o último). Fim do exercício → abre o bloco do próximo e rola até ele.
- Cronômetro: usa timers do navegador. Mantém tela acesa (Wake Lock) durante o descanso e avisa ao voltar ao app se já acabou. NÃO notifica com tela bloqueada/app fechado (limite de navegador; iPhone não vibra). Solução real = Web Push (Service Worker + função no Supabase), não feito.
- Recorde: ao registrar carga maior que o máximo anterior do exercício → selo "🏆 PR +Xkg" + vibração. Conclusão do treino: confete + "🔥 N treinos nesta semana" (conta dias em `rpe_sessoes`).
- Blocos: começam TODOS abertos (v47 removeu `aBlocosColapsoPadrao`); recolhem ao concluir (✓ do bloco, ou última série do último exercício, com 0,4 s de atraso) e concluir abre o próximo.
- Conjugado (v46): descanso único por grupo no cabeçalho (`.a-cj-rest`); `restAfter` do grupo, senão o 1º `rest` do grupo, senão 60s; o timer automático só dispara na série do ÚLTIMO exercício do grupo.
- Link público → "Fazer o registro" (`aIrParaRegistro` grava `sessionStorage movh-via-treino`) → criar conta → anamnese → ao terminar, se a flag existe e a origem é movh.netlify.app, `location.replace('https://movh.netlify.app/')` (v47).
- Último acesso (v47): `aRegistrarAcesso()` grava `alunos.ultimo_acesso` no máx. 1x/20 min; silencioso se a coluna não existir.
- Métodos de grupo (`conjGroups[id].metodo`): conjugado 🔗, progressivo 📈, pirâmide 🔺, drop-set ⬇️ (`A_METODOS`, com dica curta pt/en).
- Obs do exercício: inline `(💬 texto)`, pequena e apagada, na frente do nome. Chip de descanso sempre presente (60s tracejado se vazio).
- Vídeo: YouTube `youtube-nocookie.com`, preconnect, indicador "Carregando vídeo…". Ainda pode demorar (rede/YouTube). Ideia: miniatura + player só ao tocar.
- Layout compacto/mobile (v98): título de bloco em 1 linha, descrição (`.bm`) na 2ª linha, topbar (`.toprow`) estática (sticky com fundo só em `body.preview-mode`), faixa de dias baixa, fontes menores.

## 7. Gerador — o que existe
- Menu: Protocolo (Configuração, Alunos, semanas/dias), Biblioteca (Exercícios, Presets, Splits), Gestão (Planos, Publicar app, Logo do login, Aulas Coletivas). "Carregar Split" saiu do menu: botão na Configuração e na página Splits. Ações ↑↓⧉× aparecem no hover/ativo.
- Barra do protocolo (`.pbar`, fixa em dia e quadro): ⚙️, chips de semana/dia, ＋dia, ☑ Em massa, 💾 Salvar/Atualizar aluno (`pbSalvar`: usa `mbProtoCarregadoId` → `mbAtualizarProtocolo`, senão `mbSalvarProtocolo` com aluno selecionado; sem nenhum → leva à Configuração), 🗂️ Quadro, 📱 Como aluno.
- "Como aluno" (`toggleDock`): iframe com o app REAL exportado (Supabase stub), atualiza ao vivo; no PC acopla à direita, no celular tela cheia.
- Editor do dia: ajustes (dia real, fase, foco, idioma) numa linha; blocos recolhíveis (`_blClosed`, 1º aberto se >2 blocos; "abrir/fechar todos"); "Carregar modelo de bloco" e "mais opções do bloco" recolhidos (`<details>`).
- Quadro (kanban): colunas por dia, grid responsivo (rolagem com snap no celular).
- Edição em massa (página do dia E Quadro): ☑ Em massa mostra caixinhas (exercício e bloco); no Quadro tocar no card seleciona. Barra inferior: séries/reps/descanso → Aplicar (preserva o que não foi preenchido), +1/−1 série, método + Agrupar (conjugado exige 2+ no mesmo bloco), Desagrupar, Duplicar, Excluir, "todos", "sair". Estado: `_bkSel` (Set de objetos exercício), escopo = dia ou semana inteira (`bkDias`). Salvar continua manual.
- v46: lista de alunos compacta (⚙️ abre detalhes; WhatsApp clicável vindo de `anamnese.respostas.whatsapp`, busca por número); Quadro: botão 🗂️ "gaveta" no modal do exercício (subgavetas por categoria, multi-seleção, filtro); editar nome/link na Biblioteca oferece propagar para protocolos ATIVOS (`mbPropagarExercicio`, com confirmação).
- v47: "Atividade recente" (`mbMontarAtividade`) inclui acessos (7 dias), novos cadastros e anamnese (30 dias) e pedidos de mudança de treino, além de treino concluído, cargas e dor; lista até 30 itens.
- Config: card "Treino em edição" (atalhos de dias/quadro/prévia/Carregar split). Página "Publicar app": só a versão com login + SQL de RLS recolhido (export estático antigo foi removido).
- Splits padrão vêm SEM "dia real da semana" (causa dos dias vazios no app real): definir no quadro/editor.

## 8. Testes
- `reg_all.py` e `bulk.py` precisam de caminhos ABSOLUTOS (`$PWD/index.html`, `$PWD/tools/tests/gpage.py`). `t.py` imprime uma linha FAIL no caminho de erro do link público: é esperada (existe no baseline).
- `node --check` não aceita .html: extrair o maior `<script>` sem `src` e checar.
- `tools/tests/` (ver README): Playwright + Chromium, Supabase simulado, desktop 1366 e mobile 390/450. Rodar da raiz do MovhGen. Nenhum teste toca o banco real nem o site publicado.
- Sempre: `node --check` (script extraído) nos dois HTML, `t.py` (link público), `reg.py` (botão registro), `reg_all.py`, `bulk.py`, `kbm.py`, e comparar app gerado == app no GitHub.
- Para ver o app: script com conteúdo de protocolo embutido + stub (ex.: viewport 450x900, DPR 2).

## 9. Pendências / ideias
- AÇÃO DO USUÁRIO: rodar no Supabase `ALTER TABLE alunos ADD COLUMN IF NOT EXISTS ultimo_acesso timestamptz;` (sem isso o item "👀 acessou o app" da Atividade recente não aparece; também falha em silêncio se a RLS não deixar o aluno atualizar a própria linha — não testado no banco real).
- v47 NÃO testado no banco real: redirecionamento após a anamnese (só lido no código) e gravação de `ultimo_acesso`.
- Skill `movh-gerador` foi reescrita em 20/10 (procedimento: repos, PR, testes, créditos); este arquivo guarda o ESTADO.
- Web Push para o fim do descanso com tela bloqueada (Service Worker + Supabase Edge Function).
- Miniatura de vídeo no card (player só ao tocar) para acelerar.
- Mover hospedagem para GitHub Pages (elimina risco de créditos).
- Do Gerador: editar clicando na prévia "Como aluno", atalhos de teclado e desfazer, copiar semana A→B, histórico de versões do protocolo, fase/foco/progressão dentro do quadro, indicador de "alterações não salvas".
- Interruptor na tela para ligar/desligar o timer automático.
- Verificar no banco real: `links_treino` e `get_treino_publico`.
- Confirmado pelo usuário no uso real (13/10): edição em massa (página do dia e Quadro) e layout compacto/mobile do app estão bons. O restante (timer em 2º plano, vídeos) segue com as limitações da seção 6.
