# MOVH — Contexto v54.7 (28/10/2026)

Leia ANTES de mexer em qualquer coisa. Dono: LGuilherme (personal trainer, Cariacica-ES, dev solo). Responder em português, direto, compacto. Ele tem pouco orçamento de tokens e de créditos Netlify: poucas rodadas, tudo testado, um merge por rodada.


## 1. Repositórios (ambos públicos) e relação
- `lguilh3rme/MovhGen` → Gerador do professor, `index.html` único (~14.4k linhas) = FONTE de tudo. Site: movhgen.netlify.app.
- `lguilh3rme/movh` → app do aluno, `index.html` GERADO (nunca editar à mão). Site: movh.netlify.app.
- Gerar o app (em MovhGen): `node tools/export_app.js index.html tools/config.json <saida.html>` e copiar para `movh/index.html`. Checar igualdade: `git -C movh show origin/main:index.html | cmp - saida.html` (deve dar "APP == GERADOR").
- O app é um template literal dentro de `exportarComLogin()` do Gerador. Gancho `window._movhSoHTML` devolve o HTML como string (usado na prévia "Como aluno").

## 2. Hospedagem / créditos
- App do aluno: continua em `movh.netlify.app` (link curto importa para vendas). Plano por créditos: cada deploy de produção = 15; previews de PR = 0 (confirmar no Billing no primeiro PR). Saldo estimado após v46/v47: Gerador ~29–44, app ~150–165 (confirmar em Team settings → Billing; não inventar saldo).
- Gerador: DECISÃO = hospedar no GitHub Pages: `https://lguilh3rme.github.io/MovhGen/` (usuário já abriu e funciona). Também existe cópia na Cloudflare Workers (`movhgen.lguilh3rme.workers.dev`, status "Workers Builds: movhgen" no GitHub, reconstrói a cada push no main). Falta o usuário PARAR os builds do Netlify da conta do Gerador (Build & deploy → Continuous deployment) para não gastar 15 créditos por merge.
- Trocar de endereço do Gerador perde o que está só em `localStorage` (cada origem tem o seu). Ver seção 11 (integração para o banco) antes de migrar.
- Domínio próprio para o app do aluno (ex.: .com.br) fica para depois; ao trocar, mudar o redirect fixo `https://movh.netlify.app/` no código do app e adicionar o domínio nas URLs de redirect do Supabase. Encurtador de link só serve de atalho.
- Ativar Deploy Previews do Netlify (Project configuration → Build & deploy → Continuous Deployment → Branches and deploy contexts → Configure) nos dois sites, para ver o PR antes de mergear. No preview o login pode falhar se o Supabase não aceitar o domínio de preview como redirect.
- Regras mantidas: um merge por repo por rodada; `[skip netlify]` no título do PR quando não precisa de deploy. Nesta rodada o MovhGen e o movh precisam de deploy (a v48 mexe no Gerador e no app).
- Pedir à sessão: atualizar o rótulo de versão na tela do Gerador a cada merge (hoje fica fixo em "v13 · 12/10 19:45" e não prova o que está no ar).

## 3. Fluxo Git (aprendido na dor)
1. `git fetch`; `git checkout -f -B minha-branch origin/main` (partir SEMPRE do main atualizado; branch antiga fica obsoleta após squash).
2. Editar, testar, `node --check`, exportar o app, regravar `movh/index.html` E `movh/version.json` (o export grava os dois; o app consulta `version.json` e se recarrega sozinho quando o carimbo muda).
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
- DECISÕES VISUAIS (opção A, v48): botão séries×reps vermelho `#b10000` (claro avermelhado; preenche como barra), ocupa o lugar do ✓ antes do nome; o ✓ de concluir foi para a linha de baixo (início); carga com rótulo "carga usada · reps" e unidade colada; MESMO verde `#1A9E72` em dia de hoje, séries completas, carga registrada, ✓ salvar. Tema: claro "avelã" `#EEE4D3` e escuro "preto azulado" `#0B101A` (valores aproximados; ajustar se o usuário passar hex). Tudo num bloco CSS `!important` no fim do `<style>` do template.

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
- Card "Conta e armazenamento" (Config): status Conectado + Sair; seletor "Salvar em" (Aluno | Split | Nenhum, ligado ao destino explícito `_dest` da v48); aluno escolhido + "+ Novo"; linha "Editando: protocolo, semana"; botão principal "Atualizar protocolo"; sincronizar URLs e traduzir viram ícones; "Carregar protocolo existente como base" recolhido.
- Modal "Salvar como": opção "Protocolo para aluno" (select) e "Novo split" (nome).
- Central de alertas (`mbAlertas`), presença (`mbPresenca`, pontos verde/âmbar/vermelho) e gaveta do Quadro com prévia lateral ("Neste bloco · N", novos destacados, numeração na ordem dos cliques) já estão no código da v48: verificar e testar, não refazer.

## 8. Testes
- `reg_all.py` e `bulk.py` precisam de caminhos ABSOLUTOS (`$PWD/index.html`, `$PWD/tools/tests/gpage.py`). `t.py` imprime uma linha FAIL no caminho de erro do link público: é esperada (existe no baseline).
- `node --check` não aceita .html: extrair o maior `<script>` sem `src` e checar.
- `tools/tests/` (ver README): Playwright + Chromium, Supabase simulado, desktop 1366 e mobile 390/450. Rodar da raiz do MovhGen. Nenhum teste toca o banco real nem o site publicado.
- Sempre: `node --check` (script extraído) nos dois HTML, `t.py` (link público), `reg.py` (botão registro), `reg_all.py`, `bulk.py`, `kbm.py`, e comparar app gerado == app no GitHub.
- Para ver o app: script com conteúdo de protocolo embutido + stub (ex.: viewport 450x900, DPR 2).

## 9. Pendências
- AÇÃO DO USUÁRIO no Supabase (SQL idempotente):
  ```sql
  ALTER TABLE alunos ADD COLUMN IF NOT EXISTS ultimo_acesso timestamptz;
  ALTER TABLE alunos ADD COLUMN IF NOT EXISTS treino_visto_em timestamptz;
  ALTER TABLE alunos ADD COLUMN IF NOT EXISTS avulso_link text;
  ALTER TABLE alunos ALTER COLUMN email DROP NOT NULL;
  ```
  Conferir também: "Allow anonymous sign-ins" ligado (aluno avulso) e política SELECT de `rpe_sessoes`. Passo a passo de verificação já foi entregue ao usuário.
- v47/v48 NÃO testados no banco real (redirect pós-anamnese, `ultimo_acesso`, `treino_visto_em`).
- PIX: feito na v48 em versão manual (ver seção 10). Falta: modernizar/verificar a página de Planos, QR Code, e decidir se vale um PSP para confirmação automática.
- Controle financeiro dentro do Gerador (alunos e mensalidades, sem planilha): ideia para depois, junto com o PIX/Planos.
- Verificar no plano do Supabase: pausa por inatividade e backup automático; exportar tabelas em CSV de vez em quando.
- Privacidade: o app guarda anamnese e PAR-Q (dados de saúde). Futuro: termos de uso e política de privacidade conforme LGPD, revisados por profissional da área jurídica.

## 10. Rodada v48 — estado (21/10/2026) — MERGEADA (Gerador PR #25 [skip netlify]; app PRs #19 [skip] e #20 deploy)
FEITO e testado em Playwright com Supabase simulado (reg_all, bulk, kbm, t, reg sem FAIL novo; modal Pix testado; CRC do BR Code validado). NÃO testado no banco real. Branch `v48-rodada` nos dois repos, ainda SEM PR/merge:
- Salvar com destino explícito (`_dest`, `pbDestInfo`: split | aluno | aluno novo | sem destino), "Salvar como…", rascunho local `movh-rascunho-v1`, ● de não salvo.
- Config: card "Conta e armazenamento" reorganizado (conectado + Sair, aluno, Atualizar protocolo, Salvar como novo, 🔄/🌐 como ícones, carregar protocolo recolhido).
- Alunos: Central de alertas, presença (`mbPresenca`), `treino_visto_em`, Pix pendente com ✓ Confirmar / ✖ (`mbConfirmarPix`, `mbRecusarPix`: estende `acesso_fim` a partir do vencimento atual se ainda válido, senão de hoje; idempotente).
- Gaveta do Quadro com ordem de clique e prévia lateral.
- PIX (chave própria, SEM Asaas): Planos → card "💠 Pix" (nome, cidade, chaves por banco, mensagem; vai em `landing_config.config.pix`). App: banner "renove" (≤7 dias) e tela de acesso vencido abrem o card `aAbrirRenovar` (plano → Pix ou Cartão); Pix gera BR Code copia-e-cola estático com valor e txid (`aPixPayload`, CRC16), aluno toca "Já paguei" → linha em `pagamentos_pix` (pendente) → professor confirma no painel. Não há detecção automática do pagamento (exigiria PSP/webhook). Sem QR Code (só copia-e-cola e chave).
- App do aluno (opção A + ajustes de 21/10): séries×reps vermelho `#b10000` na linha de baixo, contagem `0/` antes do nº de séries; carga com rótulo "carga utilizada" centralizado e caixa menor; cabeçalho de bloco fino com barra de progresso de 3 px; verde único `#1A9E72`; fundo claro `#E0C79D`, escuro `#0B101A`.
- `asaasKey` removida da landing exportada; rótulo de versão v48.
SQL para rodar (idempotente): colunas `ultimo_acesso`, `treino_visto_em`, `avulso_link`, email nullable e a tabela `pagamentos_pix` com RLS (está no script de configuração do Gerador, em Publicar app). A landing_config precisa estar legível pelo aluno (a landing já lê com a chave anon).
FALTA: `professores.config jsonb` (seção 11), QR Code do Pix, revisar a página de Planos, controle financeiro, Web Push; PR + merge (Gerador com `[skip netlify]`, hospedado no GitHub Pages; app com deploy normal).

v48c (21/10, tarde): app do aluno — círculo de concluir some quando o exercício tem botão de séries (`.ec:has(.ec-chip-progresso)`; o checkbox continua no DOM), botão de vídeo vermelho como o de séries, progresso do bloco = preenchimento do título (`--bp`), ✓ do bloco corrigido (um só ícone: `font-size:0` + `::after`). Aulas Coletivas (Gerador): editor de UM dia por vez com abas Seg–Dom (`coletivasRenderEditor`), campos largos, textarea auto-ajustável (`detalhes` agora existe em TODO bloco, normal e condicionamento; o app do aluno mostra), mover/duplicar bloco e exercício, copiar dia para outra data, limpar dia, aviso ao sair com alterações. Modelo de dados em `aulas_coletivas.dados` não mudou (só `detalhes` passou a valer em blocos normais).

v48d (21/10, noite): (1) Pix agora é PUBLICADO direto em `landing_config.config.pix` ao editar o card (antes só ia no rascunho `editor_state`; só "Sincronizar Landing" publicava): `plPixPublicar` faz merge do `config` existente e, se `planos` estiver vazio, publica os planos ativos; status em `#pl-pix-status`. (2) App: aulas coletivas no formato de treino (faixa semanal `.semana-strip` + um dia por vez + blocos recolhíveis); notificações na home (`aMontarNotifs`: avaliação física solicitada, teste de condicionamento) que levam a "Meu progresso"; "Avaliação de movimento" virou "Análise de movimento"; cabeçalho (`.toprow`) rola com a página também no modo prévia.
REGRA DE MERGE: PR de 1 commit usa a mensagem do COMMIT (não o título do PR) no squash. Para pular o Netlify passar `-f commit_title='[skip netlify] ...'` na chamada de merge da API.
PWA/app nas lojas (resposta dada ao usuário): 1º PWA (manifest + service worker + ícones; instalar pelo navegador; push no iOS só com o PWA instalado, iOS 16.4+), depois, se houver demanda, Capacitor/TWA para Play Store (US$25 único) e App Store (US$99/ano; Apple pode recusar wrapper sem valor nativo).

v49 (23/10, noite): feedback de aluno + pedidos do usuário, tudo no app do aluno.
- Badge de carga COMPACTO (`.cargabox`, 28 px, mesma altura dos outros chips): fechado mostra só `🏋️ 32.5kg` (vazio `🏋️ — kg`) ou, em exercício de tempo, `⏱️ 45s` (vazio `⏱️ — s`). Tocar abre (`aCargaAbrir`, classe `.aberto`) kg × reps (ou só segundos) + botão "salvar" (pílula; o ✓ redondo saiu porque confundia com o check de concluir). Ao salvar, `aCargaFechar` volta ao compacto e atualiza o resumo. O botão salvar tem `event.stopPropagation()` (senão o clique sobe e reabre o badge). Verde = `carga-registrada` como antes.
- Removidos da home do aluno o badge do dia ("📅 Sexta · 23/10") e o "📈 Periodização prevista" (`aMontarLinhaBadges` mostra só o badge de fase, se houver). `aMontarBadgeTimeline` ficou no código, sem uso.
- Descanso agora é `💤 90s` (antes ⏱); o ⏱️ ficou para tempo executado.
- Botão de vídeo: ícone ▶ redondo ANTES do nome do exercício (dentro de `.ec-name-row`).
- Avisos da home (`aMontarNotifs`): ficam ACIMA da barra de progresso, numa linha só, com × (`aNotifFechar`; localStorage `movh-notif-x-<id>`: "cond" some por 7 dias, "aval" por 1 dia).
- ATUALIZAÇÃO AUTOMÁTICA: `tools/export_app.js` troca `__MOVH_BUILD__` por um hash do conteúdo e grava `version.json` ao lado da saída. O app (`aChecarVersao`) busca `version.json` (no-store) ao carregar (3 s), ao voltar para a aba, no `pageshow` e a cada 10 min; se o carimbo for diferente e o aluno não estiver digitando, faz `location.reload()` (1x por versão, guarda em sessionStorage). Sempre copiar `version.json` junto com `index.html` para o repo `movh`. CONFERIR antes do merge: `version.json` do `movh` == `A_BUILD` do `index.html` (`grep -o "A_BUILD = '[a-f0-9]*'" index.html`). Testes que mexem em `version.json` devem usar CÓPIA do diretório de saída, não o arquivo exportado (na v49 um teste sobrescreveu o carimbo e foi preciso um 2º deploy). No Gerador/prévia (placeholder não substituído) não faz nada.
- Créditos Netlify do app: 104 antes desta rodada; 1 deploy (15) → ~89.
- Testes: `tools/tests/` sem falhas novas; teste próprio do badge/aviso/auto-update (stub, http local) passou.

v50 (25/10): LINK PÚBLICO DAS COLETIVAS `https://movh.netlify.app/coletivas` (sem login, só leitura).
- Rota: `aEhRotaColetivas()` (caminho termina em /coletivas, sem diferenciar caixa/barra final, ou `?coletivas=1`) → `aBootColetivas()` no `aBoot` (só sem sessão): esconde cabeçalho/dashboard, mostra só `#tColetivas` (sem "voltar"), botão "Fazer o registro" leva a `/?bemvindo=1` (`aBaseApp()`; antes usava o pathname, que voltaria para /coletivas).
- Dados: RPC `get_coletivas_publico()` (SECURITY DEFINER, devolve `aulas_coletivas.dados` da linha mais recente; EXECUTE para anon). SQL está no script do Gerador (Publicar app → SQL) e precisa rodar no Supabase UMA vez. Sem o SQL, a página mostra "Não foi possível carregar as aulas coletivas".
- Netlify: repo `movh` ganhou `_redirects` (`/coletivas /index.html 200`, também com barra final). O `_redirects` NÃO é gerado pelo export: fica no repo do app, não apagar.
- Gerador: botão "🔗 Copiar link" na página Aulas Coletivas (usa a URL do app em Planos, senão movh.netlify.app).
- Tudo que o professor publica nas coletivas fica visível a quem tiver o link (é público de propósito). Testes: `tools/tests` sem falha nova; teste próprio (rota, RPC, erro, /Coletivas/, ?coletivas=1, registro, raiz intacta) passou com servidor local que simula o rewrite.

v51 (25/10): SELETOR EM CASCATA no Gerador (Grupo › Categoria › Exercício, com busca e "exercício livre") — MERGEADO ([skip netlify], hospedado no GitHub Pages; o app do aluno NÃO mudou, mesmo A_BUILD).
- Grupos vêm do 1º emoji da categoria (`MV_GRUPOS`: 🦵 Pernas, 💪 Superiores, 🔩 Core, 🌀 Mobilidade, 🏋 CrossFit, 🏃 Cardio; sem emoji conhecido → "Outros"). Módulo `mv*` (mvAbrir, mvRender, mvAbrirParaInput, mvCatCascata) ao lado da gaveta do Quadro.
- Onde aparece: editor do dia (botão da categoria abre o seletor; o input continua aceitando digitação, datalist único `ex-datalist`), modal do Quadro (botão de categoria + gaveta agrupada), Aulas Coletivas (botão 📂), Biblioteca (títulos de grupo) e selects só de categoria (modal exercício, "salvar exercício novo", pendentes) via `mvCatCascata` (select de grupo + categoria; o select original mantém id/value).
- O seletor escreve no input e dispara `input`/`change`, então os handlers de cada editor (setEx, kbSetExField, coletivasSetEx) rodam como se tivesse digitado. O botão de categoria do editor guarda a categoria em `.value` (usado por `abrirModalNovoEx`). Não testado no uso real do dia a dia.
DECISÕES DE MARCA (25/10): o usuário PREFERE A LOGO ATUAL (barra curva + gráfico, feita no Canva) e rejeitou a proposta de barra reta/gráfico novo e os ícones. Cores da página aprovadas (inspiração rubro-negra): escuro azulado `#0B101A` e creme/avelã `#E0C79D`; vermelho da marca `#B10000`. NÃO mudar logo nem paleta sem pedido.
PENDENTE (opcional, ainda não pedido): no login escuro, "MOV" e a frase da logo são PRETOS sobre azul-escuro (contraste ~1,1:1, quase invisíveis). Correção que preserva a arte dele: variante da MESMA logo com o preto trocado pelo creme, só no tema escuro (2 <img> + CSS por `data-theme`; logo personalizada continua única). Exige 1 deploy do app (15 créditos) — juntar com a próxima mudança do app.
PENDENTE: `/coletivas` já abre no Netlify, mas mostra "Não foi possível carregar as aulas coletivas" até o usuário rodar o SQL `get_coletivas_publico()` no Supabase (seção v50). Se continuar após rodar: abrir o console (F12) e ler "[MOVH] Erro ao carregar coletivas".
Créditos Netlify do app: ~59 estimados (104 − 3 deploys de 15 em 23–25/10; confirmar no Billing). Próximas ideias: PWA (manifest + service worker que NÃO cacheie o index.html, para não desfazer a atualização automática), Web Push, QR do Pix.

v54 (26/10): alunos, vídeo editável, logos e visual clean (Gerador + 1 deploy do app).
- Alunos: 📱 "ver como aluno" (`mbPreviaAluno`: troca `semanas` temporariamente pelo treino do aluno, gera `alunoPreviewHTML` num modal e restaura) e 🗂️ "editar no Quadro" (`mbEditarNoQuadro` → `mbCarregarProtoAluno` → `mbAplicarProtoNoEditor`, extraído de `mbOnLoadSelectChange`; também corrigiu a corrida do botão "Editar este protocolo"). Pede confirmação só se o editor tem alterações não salvas (`_pbDirty`).
- Atividade recente em linha: hora compacta antes (`mbTempoC`: agora/min/h/d), clique leva ao aluno (`mbIrParaAluno`: rola, destaca `al-flash`; cartão tem `id="al-<id>"`). Os chips da Central também levam ao aluno.
- Fim de treino/acesso (`mbFimAvisos`, `mbPrevisaoFim`): LARANJA ≤ 14 dias, VERMELHO ≤ 7 dias ou vencido; badge `.al-fim`, tira lateral `.al-lv-o/.al-lv-r`, chips da Central e aviso (toast) 1x ao carregar o painel + contador no menu. Ignora bloqueados/lixeira. O app do aluno já mostra o banner de renovar com ≤ 7 dias (não mudou).
- Visual clean: `body.clean` (padrão; botão "🎨 Visual" no rodapé do menu volta ao clássico, `localStorage movh-visual`). Cartões translúcidos com blur, linhas finas, sem sombra, chips de aluno em contorno, modais com blur. Todo o CSS está no fim do 1º `<style>` do Gerador.
- Vídeo editável (`mvVideo`): ▶ no editor do dia (`mvVideoEx`) e nas Aulas Coletivas (`coletivasVideo`). Painel por cima com player (youtube-nocookie), nome e link editáveis, categoria (cascata) e 3 modos: "só neste treino" (não toca no banco) / "atualizar no banco" (sobrescreve; pergunta se propaga aos treinos ativos via `mbPropagarExercicio`) / "salvar como novo no banco". Link fora do YouTube abre em outra aba.
- Coletivas no app: `mbSalvarAulasColetivas` embute `url` (do banco) em cada exercício sem link; o app mostra ▶ vermelho (`aColPlay`, mesmo modal de vídeo dos treinos) no acesso e no link público `/coletivas`. Só exercícios com link ganham o botão. Logo no rodapé da página de coletivas (`aColLogo`, lê `#aLogoClaro/#aLogoEscuro` do login).
- Logos: `LOGO_PRONTAS` (lg16 padrão do login, lg15 com LG) com variante clara e escura (tinta preta↔creme, vermelho mantido); o export gera `<img class="lg-claro">` + `<img class="lg-escuro">` (troca por `[data-theme=dark]`). Página "Logo do login" tem as 3 opções (lg16, lg15, antiga) e `movh_logo_preset`; upload personalizado continua prevalecendo. `tools/export_app.js` agora extrai `LOGO_PRONTAS` do Gerador. SUPOSIÇÃO: lg16 = versão MOVH creme (sem LG) e lg15 = versão com LG; se estiver trocado, inverter as chaves em `LOGO_PRONTAS` e o padrão em `logoAtivaSrc`/export.
- Créditos Netlify do app: 58 (25/10) − 15 (v53) − 15 (v54) = ~28 estimados (confirmar em Team settings → Billing; o ciclo reseta na data do ciclo da conta, não necessariamente dia 11).
- v54.1 Logos salvas (só Gerador): "Minhas logos salvas" (`movh_logo_salvas` = [{id,n,src}] no localStorage): ao salvar um recorte pede um nome e guarda na lista; clicar usa (`logoUsarSalva` → `movh_logo_custom`, que o export já lê); ✂️ reajusta enquadramento/zoom (`logoAjustarSalva`), ✏️ renomeia, 🗑️ exclui. "✂️ Ajustar enquadramento / zoom" em "Logo atual" abre qualquer logo (pronta ou salva) no recorte. "Voltar a uma logo pronta" só para de usar a personalizada (continua na lista). A lista fica só neste navegador. Testes: tools/tests + teste da lista OK.
- v54.2 (Gerador + 1 deploy do app): (1) LOGO REMOTA — a escolha de logo (preset, salva ou personalizada) agora é PUBLICADA em `landing_config.config.logo_login` {c,e,t} (`logoPublicar`, exige login do professor no Gerador); o app lê ao abrir (`aLogoRemota`: cache em localStorage `movh-logo-login` + `aClient.from('landing_config').select('config').limit(5)`, pega a de maior `t`) e troca `#aLogoClaro/#aLogoEscuro` SEM novo deploy. Motivo: antes a logo ficava só no localStorage do navegador e o app online (gerado de tools/config.json, logo vazia) nunca a recebia. (2) Presets ORIGINAIS sem alteração: `lg16o`/`lg15o` (imagem exatamente como enviada, mesma nos dois temas; no tema escuro a barra preta some — por isso as `lg16`/`lg15` "adaptadas ao tema" continuam). (3) Vídeo das coletivas: `getUrl` agora casa nome sem acento/caixa e por "contém" (≥6 letras); iframe com `referrerpolicy`, link "↗ Abrir no YouTube" sempre sob o player e "🔎 buscar no YouTube" quando não há link.
- VOLT: rascunho da logo APROVADO como bom, GUARDADO (não usar ainda) em `tools/assets/volt/` (volt_claro/escuro .png e .svg). Quando for usar, transformar em preset (ver `LOGO_PRONTAS`).
PENDENTE: logo da VOLT (guardada, uso adiado); notificar o aluno 14 dias antes (hoje só ≤ 7 dias); levar o visual em 3 colunas para a Biblioteca.

v54.3 (27/10): TEMPO PREVISTO do Quadro + divergência Quadro × visão do aluno (Gerador + app; app merge com `[skip netlify]`, SEM deploy ainda).
- Causa da divergência: `aSugestaoVolumeFase` (app) e `sugestaoVolumeFase` (Gerador) usavam `Math.max(2, …)` nas séries da progressão automática da fase → "Cobra 1×10" virava 2×10 para o aluno. Agora o piso é `Math.min(2, p.sets)` (nunca sobe o que o professor definiu). A nota "base do professor: …" só aparece quando série ou descanso realmente diferem da sugestão. `aParseRestSegundos`/`parseRestSegundos` agora leem "1'30" (antes viravam 1'; só "1'30\"" funcionava).
- Por design a progressão automática (por bloco, `progressaoAuto`) ainda ajusta reps/descanso por semana da fase (ex.: semana 4: 3×10-12 → 2×11-13, descanso +5%); para o aluno ver exatamente o que está no Quadro, desmarcar "progressão automática" no bloco.
- Tempo previsto (`kbEstimarDia`, rodapé de cada coluna do Quadro): por exercício = séries × (execução + descanso) + 15 s de preparo. Execução = reps × 3 s (média da faixa "10-12"; ×2 se "/lado" ou "unilateral" no nome) OU o tempo da série em isometria ("30 a 40 segundos" → 35 s; `reg:'tempo'`). Conjugado: sets × (soma das execuções + UM descanso: `restAfter`, senão o 1º `rest`, senão 60 s). Condicionamento: soma a `duracao` do bloco. Bug corrigido: `kbParseSeg("1'")` lia 1 SEGUNDO (por isso o Quadro mostrava ~11 min num dia de ~30). Constantes `KB_SEG_REP=3` e `KB_SEG_PREPARO=15` no código. Tooltip no rodapé explica a conta.
- Rótulo do Gerador: v54.3 · 27/10. Créditos Netlify do app: ~13 estimados antes desta rodada (confirmar no Billing); app NÃO foi deployado nesta rodada para não estourar o saldo — o fix só chega ao aluno no próximo deploy (Netlify → Deploys → Trigger deploy, 15 créditos).

v54.4 (27/10): PRÉVIA "COMO ALUNO" FIEL AO QUADRO + logo lg15r (Gerador + app; ambos `[skip netlify]`, app SEM deploy).
- Causa: `alunoPreviewHTML` (dock "Como aluno" e modal "ver como aluno" dos Alunos) SEMPRE reescrevia `diaSemana` como sequência a partir de HOJE (editado = hoje, depois um por dia), ignorando Seg/Ter/Qua/Qui do Quadro (segunda ficava sem treino, o treino de quarta aparecia noutro dia). Agora `pvDiaReal(sem)` mantém o dia real de cada treino; os sem dia ganham o 1º dia livre (Seg→Dom). O payload leva `conteudo.diasReais=true` e o app (`if (hojeCasa || proto.conteudo.diasReais) return;`) não reembaralha mais. Link público `?treino=` (sem `diasReais`) continua com a sequência a partir de hoje quando hoje não casa.
- `dockIrParaDia(fr,did)`: ao carregar a prévia fora do Quadro, seleciona a data (da semana corrente) do treino que está sendo editado (`aSelecionarDiaSemana` dentro do iframe). No Quadro mantém o dia de hoje; os outros dias se escolhem na faixa de dias (todos com ponto).
- Logo `lg15r` "lg (15) · barra vermelha" em `LOGO_PRONTAS` (barra + gráfico recoloridos para o vermelho do LG `#A1130F`, claro e escuro; texto MOVH/legenda continuam preto↔creme) e na lista de "Logo do login". Gerada recolorindo os pixels neutros da região da barra (y<178) do lg15 adaptado; o lg15 e os originais não mudaram.
- Gerador hospedado no GitHub Pages: depois do merge pode levar ~1 min e o navegador pode ter cache — Ctrl+F5 e conferir o rótulo "v54.4 · 27/10" no rodapé do menu (se ainda aparece ~11 min no Sup. A é versão antiga).
- Créditos Netlify do app: ~13 estimados (v54.3 e v54.4 NÃO foram deployadas; o próximo deploy publica as duas correções do app).

v54.5 (28/10): CALENDÁRIO DO TREINO NO QUADRO + CENTRAL AGRUPADA + REATIVAR (só Gerador; app do aluno NÃO mudou, sem deploy).
- Causa do "continua faltando 3 dias" (Izabella): a previsão de fim (`mbPrevisaoFim`) era SÓ `data_inicio + Σ duracaoSemanas × 7`; incluir um dia no treino nunca mexia nela. Agora existe fim manual: `conteudo.fimPrevisto` (AAAA-MM-DD, ÚLTIMO dia, inclusivo) ↔ global `mbProtoFim` (null = pelas fases). `mbPrevisaoFim` devolve o dia SEGUINTE ao último (convenção antiga: "acaba em Nd" conta hoje) e o cartão do aluno mostra o último dia. Gravado por `mbAtualizarProtocolo` (que agora também grava `protocolos.data_inicio` se editado) e `mbSalvarProtocolo`; entra no `pbSnap` (● de não salvo). Sem SQL novo (vai dentro do jsonb).
- Quadro: o texto "fase · foco" do subtítulo saiu; no lugar, `<details class="kb-cal">` RECOLHIDO (`kbCalHTML`, estado `_kbCalAberto`): resumo "📅 04/10 → 31/10 · faltam N dias" (laranja ≤14, vermelho ≤7/vencido), dentro: início e fim editáveis (input date), botões +1 dia / +1 sem. / ↺ pelas fases, lista das fases com datas (fase atual destacada, "◂ editando", clique abre a fase), linha "➕ Extensão" se o fim passar da soma das fases. Mudar o início desloca as datas das fases. Só aparece com protocolo de aluno carregado (`mbProtoCarregadoId` + `mbProtoDataInicio`). Calendário mensal por dia continua em Configuração.
- Central de atividade: UMA linha por aluno por dia (`mbRenderFeed`), cada ação com a hora (HH:MM) — `e.s` = texto curto de cada ação; linha com 1 ação mantém o texto completo; tempo relativo à esquerda é da ação mais recente; clique leva ao aluno. Máx. 30 linhas.
- Histórico de protocolos do aluno (🗂 Todos os treinos): botão "↩ Reativar" nos inativos (`mbReativarProtocolo`: desativa o ativo, ativa o escolhido, repontua `links_treino` do antigo para o reativado, desfaz se falhar) e mostra "fim previsto". Se as datas já venceram, ajustar no calendário do Quadro.
- Testes: tools/tests (reg_all, bulk, kbm) sem FAIL; teste próprio (desktop+mobile): calendário, +1 dia, reset, `mbFimAvisos` com/sem fim manual, Central agrupada — OK. NÃO testado no banco real (gravar fim/início e reativar).
- Rótulo do Gerador: v54.5 · 28/10.

v54.6 (28/10): o `<details>` do calendário NÃO abria no navegador do usuário (clicar no resumo não expandia). Agora é botão `📅 Calendário` na barra do protocolo (`pbarHTML`, ao lado de 🗂️ Quadro e 📱 Como aluno) que abre painel/modal `#pb-cal` (`pbCalAbrir`/`pbCalRender`; mesmo conteúdo de `kbCalHTML`, agora um `<div>`). Editar início/fim/+1 dia/↺ re-renderiza o painel (`kbCalRefresh`). O início/fim só afetam datas de fases e alertas; os dias da semana do treino seguem como antes. Lição: evitar `<details>` com re-render do Quadro; preferir botão + modal (padrão do `pb-saveas`). Só Gerador, `[skip netlify]`.

v54.7 (28/10): protocolos SEM `data_inicio` existem no banco (ex.: o da Izabella): o painel 📅 mostrava só o aviso. Agora o painel funciona sem início (inputs de início e fim, +1 dia/+1 sem.; sem lista de fases até haver início) e o aviso explica que sem início o app mostra a 1ª fase como sempre. `mbPrevisaoFim` aceita `conteudo.fimPrevisto` mesmo sem `data_inicio` (alertas); sem fim manual e sem início segue sem previsão. ATENÇÃO: definir o início faz o app passar a seguir as fases por data (muda o comportamento de quem estava sem data). Rótulo v54.7 · 28/10.

v53 (25/10): prévia no seletor em massa + colar inteligente em splits + 3 ajustes do app (1 deploy do app).
- Seletor em massa (`mvAbrir({onMulti,base,pos})`): 4ª coluna "Neste bloco · N" com o que já existe + o marcado (destaque, × para tirar) na posição real de inserção. Também em "📂 vários" (editor do dia, Quadro e Aulas Coletivas: `addExVarios`, `coletivasAddVarios`).
- Colar treino de splits/protocolos (`mbParsearTreinoTexto`): dia por "Treino A", "Dia N" ou dia da semana (sugere o dia); formato antigo (nome + "3x 8 a 10" na linha seguinte) OU estilo livre (reaproveita `coletivasParsearDia`: seções → blocos Ativação/Principal/Condicionamento, A1/A2 = conjugado `cj:0`, EMOM/For time → obs do bloco). Séries salvas como "S×reps". Nome casado com o banco (`mvAcharEx`) e `url` já preenchida via `getUrl` (não precisa mais do botão Sincronizar). Prévia ao colar com ✓ no banco / ➕ fora do banco / 📝 instruções.
- App do aluno: (1) X do aviso agora também some o banner em "Meu progresso" (a avaliação solicitada respeitava o X só na home; reteste 7 dias, avaliação 1 dia); (2) "‹ Voltar para hoje" virou pílula que PULSA (`vhPulse`); (3) `aHeaderForcar`: a faixa de dias do topo recolhe sozinha em Meu progresso, Semana completa e Aulas coletivas e volta ao estado anterior em `aVoltarHoje`.
- Netlify: o crédito mensal reseta no início do ciclo de cobrança da conta (o dia varia por conta; ver Team settings → Billing), crédito mensal não acumula. Créditos do app: 58 antes + 1 deploy (15) = ~43 (confirmar no Billing).
PENDENTE (opcional, não pedido): variante da logo para tema escuro (juntar com o próximo deploy do app); Biblioteca/Exercícios com o mesmo visual em 3 colunas.

v52 (25/10): SELETOR EM 3 COLUNAS + COLAR PLANO INTELIGENTE (só Gerador; app do aluno inalterado, mesmo A_BUILD).
- Seletor (`mvAbrir`): Grupo › Subgrupo › Exercício lado a lado (clique); no celular vira passo a passo com "‹ Voltar". Modo em massa `mvAbrir({onMulti})`: caixinhas numeradas na ordem dos cliques + "＋ Adicionar N". A gaveta antiga do Quadro (accordions `kb-gav*`) foi REMOVIDA; `kbGavToggle` abre o seletor em massa e `kbGavAplicar` segue igual.
- Colar plano das Coletivas (`coletivasParsearTexto`): dia por nome ou sigla (Segunda/Terça…/SEG…), "Semana N" soma 7 dias, colunas separadas por TAB; seções Ativação / Força (A1/A2 = conjugado) / Localizada / C. Funcional / Endurance. Linhas que NÃO são exercício (EMOM, AMRAP, For time, 2R, Circuito, obs., texto entre parênteses) vão para `detalhes`/`formato` do bloco; "2 series" na linha da seção vira série dos exercícios; "15 Remador", "8/8 Thruster", `20" Hollow` viram reps + nome; "A + B" vira dois exercícios. Prévia ao colar (`coletivasPreviewColar`).
- Banco x vídeo: `mvAcharEx` casa o nome (sem acento/pontuação/maiúscula, singular/plural, com ou sem parênteses, nome PT/EN) e troca pelo nome canônico, que é o que puxa o vídeo. Conservador de propósito (sem chute): o que não casa fica como texto livre e ganha o selo ＋ na linha; `mvCadastrar` abre a Biblioteca com o nome para colar o vídeo (depois disso o mesmo nome passa a casar).
- PENDENTE: usar o mesmo parser e casamento no "Colar treino" de splits/protocolos (`mbParsearTreinoTexto`, hoje só "Treino A / nome / 3x reps") para montar splits rápido sem gastar token. Colagem de tabela do Docs com TAB entre colunas é suposta, ainda não vista com texto real. Hover-cascata do seletor não feito (só clique).

v48e (21-23/10, diagnóstico): app v48d CONFIRMADO no ar (Netlify movh, deploy #22 publicado 18:35; 104 créditos restantes). Pix só apareceu para o aluno depois de: (a) rodar no Supabase `CREATE POLICY "aluno le landing" ON landing_config FOR SELECT TO authenticated USING (true)` e (b) o Gerador republicar (status "✅ Pix ativo e publicado"). Se o Pix sumir do modal, checar `landing_config.config.pix` (ativo + itens com chave) e essa policy. Modal de Renovar = planos + forma de pagamento (Pix/Cartão).
PENDENTE: cabeçalho (relógio/aviso/Sair, `.toprow`) "não desce junto" segundo o usuário. Teste Playwright (390 e 1366 px) mostra `.toprow` static e rolando junto (top 0 → -700). Antes do v48d só o preview-mode era sticky; o normal já era static. Precisa do print da tela rolada e do `getComputedStyle(#treinoScreen .toprow).position` do navegador do usuário (Firefox-like). Hipótese: a rolagem ocorre em outro elemento, ou o usuário se refere a outro bloco (ex.: aviso na Home).
Dica: a sandbox não alcança movh.netlify.app (403 do proxy) nem a API de Pages; verificar deploy só pelo print do usuário.

## 11. O que fica só no `localStorage` do Gerador (inventário e plano de integração)
Já vão para o banco (confirmado no código): exercícios (`mova_rep` → tabela `exercicios`; migra e remove a chave local, local só como fallback), splits (`mova_splits` → tabela `splits`, upsert, local só como cache), planos/landing (`movh_planos`, com controle de "sujo" e última sincronização com o banco).

Só no navegador, por origem (perdem-se ao trocar de endereço):
| Chave | O que é | Plano |
|---|---|---|
| `movh_pl_keys` | chaves Asaas/Stripe (API key, webhook, secret) | NÃO migrar para o banco. Ver segurança abaixo; com PIX próprio deixam de ser necessárias |
| `movh_logo_custom` | logo da tela de login (base64) | levar para o banco |
| `mova_pre` | presets de séries/reps e descanso | levar para o banco |
| `mova_modelos_condic` | modelos de condicionamento editados | levar para o banco |
| `movh_lang`, `mova_theme` | idioma e tema do Gerador | opcional (preferência do aparelho; pode ficar local) |
| `movh-rascunho-v1` | rascunho do protocolo (a cada 3 s) | manter local (cache); sincronizar depois, se quiser |

Proposta (uma rodada, baixo risco): coluna `professores.config jsonb` (SQL: `ALTER TABLE professores ADD COLUMN IF NOT EXISTS config jsonb DEFAULT '{}'::jsonb;`) guardando `{ presets, modelos_condic, logo_login, lang, theme }`. Ler ao logar; se o banco estiver vazio e houver dado local, subir o local uma vez (migração automática, como foi feito em exercícios e splits); a cada salvar, upsert; o local vira cache. Logo: limitar o tamanho (comprimir) ou usar bucket do Supabase Storage. Conferir que a RLS de `professores` permite o professor atualizar a própria linha. Depois disso trocar de endereço ou de navegador não perde nada.

## 12. ALERTA DE SEGURANÇA
`plExportarLanding()` exige ao menos uma chave de pagamento e grava `asaasKey: '${keys.mpToken}'` dentro do `MOVH_CONFIG` do HTML da landing exportada (linha ~14258; `asaasKey` não é usado em outro ponto do arquivo). Se a landing publicada foi exportada com a Asaas API Key preenchida, a chave está visível no código-fonte público. Ação: (1) o usuário abre o código-fonte da landing publicada e procura `asaasKey`; (2) se aparecer a chave, REVOGAR e gerar outra no Asaas; (3) FEITO nesta rodada: removido `asaasKey` do template da landing e tirar a exigência de chave no export; chaves secretas só em Supabase secrets/edge functions, nunca no navegador nem em HTML público.
