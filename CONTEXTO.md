# MOVH — Contexto v59.2 (05/11/2026) — consolidado

Leia ANTES de mexer em qualquer coisa. Dono: LGuilherme (personal trainer, Cariacica-ES, dev solo). Responder em português, direto, compacto. Pouco orçamento de tokens e de créditos Netlify: poucas rodadas, tudo testado, um merge por repo por rodada. Registrar aprendizado e progresso a cada rodada (este arquivo + memória).
Histórico detalhado de cada versão fica no git (`git log`); aqui só o ESTADO e as LIÇÕES.

## 1. Repositórios e relação
- `lguilh3rme/MovhGen` → Gerador do professor, `index.html` único (~17k linhas) = FONTE de tudo (Gerador + app do aluno dentro do template literal de `exportarComLogin()`, ~linhas 11148–15600). Gerador hospedado no GitHub Pages: `https://lguilh3rme.github.io/MovhGen/` (também existe cópia em Cloudflare Workers `movhgen.lguilh3rme.workers.dev`).
- `lguilh3rme/movh` → app do aluno, `index.html` GERADO (nunca editar à mão) + `version.json` + `_redirects` (`/coletivas`; NÃO é gerado, não apagar) + workflow keep-alive do Supabase. Site: movh.netlify.app.
- Gerar o app: `node tools/export_app.js index.html tools/config.json <saida.html>` (grava também `version.json` ao lado); copiar os DOIS para `movh/`. Conferir: `git -C movh show origin/main:index.html | cmp - saida.html`.
- Se o app exportado sai IDÊNTICO ao anterior (`cmp`), não mexer no repo `movh` (sem deploy).
- Gancho `window._movhSoHTML` devolve o HTML do app como string (prévia "Como aluno").

## 2. Hospedagem, deploy e créditos (consolidado)
- App (`movh`): o Netlify faz deploy de PRODUÇÃO a cada merge no main, MESMO com `[skip netlify]` (confirmado em print, PR #33, 02/11). Nunca afirmar "app sem deploy" só por causa disso; dizer que o merge pode ter publicado. Cada deploy = 15 créditos.
- Estado de créditos: ~13 em 02/11; em 04/11 o Netlify mostrava time em "operational credits" com deploys de produção PAUSADOS até o próximo ciclo (renova ~semana de 09/11; confirmar em Team settings → Billing; não inventar saldo). Mudanças só do Gerador vão para o GitHub Pages e não gastam crédito do app.
- Pendente do usuário: parar os builds do Netlify da conta do Gerador (Build & deploy → Continuous deployment) para não gastar crédito por merge.
- Trocar o endereço do Gerador perde o que está só em `localStorage` (por origem; ver seção 10). Domínio próprio do app: depois (mudar o redirect fixo `https://movh.netlify.app/` e as URLs de redirect do Supabase).
- Atualização automática do app: `export_app.js` troca `__MOVH_BUILD__` por hash e grava `version.json`; o app (`aChecarVersao`) consulta ao abrir, ao voltar à aba e a cada 10 min, e recarrega se mudou. Conferir antes do merge: `version.json` == `A_BUILD` do `index.html`. Testes que mexem em `version.json` usam CÓPIA do diretório de saída.
- Sandbox não alcança movh.netlify.app (403 do proxy): verificar deploy só por print do usuário.

## 3. Fluxo Git
1. `git fetch`; `git checkout -f -B minha-branch origin/main` (sempre do main atualizado).
2. Editar com diff cirúrgico (nunca reescrever o arquivo: `grep -n`, `sed -n`, script Python com `assert s.count(old)==1`, ou Edit), testar, `node --check`, exportar o app.
3. Commit (linhas de atribuição do system-reminder), `git push -u origin branch`.
4. PR: `gh api repos/lguilh3rme/REPO/pulls -f title=... -f head=... -f base=main -f body=...` (GraphQL é bloqueado). Merge: `gh api -X PUT repos/.../pulls/N/merge -f merge_method=squash`; PR de 1 commit usa a mensagem do COMMIT no squash → passar `-f commit_title='[skip netlify] ...'` se quiser a marca.
5. Depois: `git fetch origin` e `git branch -u origin/BRANCH`. Se o fetch não atualizar refs: `git config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'`.
- NUNCA `git checkout <branch> -- .` nem trocar de branch com alterações não commitadas. Usuário já autorizou merge direto nos dois repos.

## 4. Regras do template (app dentro de template literal)
- Todo JS do app é TEXTO dentro do template: barra invertida dobrada (`\\d`, `\\s`, `\\'`). Evitar crases e `${` em código novo do app; preferir `data-*`/`this.dataset` a escapar aspas em onclick. Código do Gerador (fora do template) usa JS normal.
- `${...}` no template é interpolação no export; `\${...}` é texto literal no JS exportado. NUNCA referenciar `MOVH_CONFIG` dentro de `exportarComLogin()` (só existe na landing): embutir a constante no export.
- CSS do app: blocos `!important` empilhados; o bloco NOVO vai por ÚLTIMO, antes do `</style>` do template.
- i18n: landing usa `MOVH_CONFIG.i18n`/`t(k)`; app usa `aT(k)` sobre `MOVH_STRINGS[aLang]`; nomes de plano usam `nomeEn`.
- Lição: evitar `<details>` com re-render do Quadro; usar botão + modal (padrão `pb-saveas`). Ao restaurar rascunho do editor, derivar datas do banco (`mbCalSync`).

## 5. Backend (Supabase `cfanjhuzrcgxrbfmhahi`)
- Clients: `mbClient` (professor, storageKey `movh-professor-auth`), `mbClientAvulso` (anônimo), `aClient` (aluno, `movh-aluno-auth`). Login do aluno: `aDoLogin()` → `aBoot()` → `aEnsureAlunoRow()` (auth_id, depois email, senão cria). Se o login some sem erro, suspeitar de SyntaxError por escaping.
- Tabelas: `professores`, `alunos` (ativo, acesso_inicio, acesso_fim, auth_id, professor_id, email nullable, ultimo_acesso, treino_visto_em, avulso_link, cobranca jsonb), `protocolos` (conteudo jsonb, data_inicio, ativo), `registros_sessao`, `rpe_sessoes`, `anamneses`, `avaliacoes_fisicas`, `links_treino`, `exercicios`, `splits`, `landing_config` (planos, config: pix, logo_login), `pagamentos_pix`, `aulas_coletivas` (dados jsonb), `treinos_personal`, `personal_acesso`, `personal_registros`, `notas`.
- RPCs públicas: `get_treino_publico`, `get_coletivas_publico`, `get_treino_personal_publico`, `get_personal_painel`, `get_personal_registros`, `salvar_personal_registro` (SECURITY DEFINER). Policy necessária: `landing_config` legível por `authenticated` (Pix/planos no app).
- SQL: o script de configuração do Gerador (Publicar app → SQL / botão de policies) é IDEMPOTENTE e contém tudo; reexecutar inteiro quando uma rodada acrescentar tabela/coluna. O app deve falhar em silêncio se coluna/tabela ainda não existir.
- Telegram (aviso do "Já paguei"): `tools/supabase/notify-pix` + README (deploy e Database Webhook em `pagamentos_pix` ficam com o usuário). Edge Functions já existentes: `webhook-mp`, `webhook-stripe`, `create-checkout`. Pix próprio (SEM Asaas, para evitar taxas); `asaasKey` foi removida da landing exportada.

## 6. App do aluno — estado e UX
- Séries: `aSeriesFeitas[eid]` (localStorage `movh-series-AAAA-M-D`) ⇄ check do exercício ⇄ bloco; badge "séries × reps|tempo" vermelho `#b10000`; tocar série dispara descanso automático (`aAutoDescanso`; Wake Lock; NÃO notifica com tela bloqueada — solução real = Web Push, não feito). Carga: badge compacto `🏋️ kg` que abre kg×reps + "salvar". Recorde → "🏆 PR". Blocos começam abertos, recolhem ao concluir e abrem o próximo. Conjugado: descanso único no cabeçalho do grupo; métodos 🔗📈🔺⬇️.
- Cores: verde único `#1A9E72`; fundo claro avelã (`#E0C79D`/`#EEE4D3`) e escuro `#0B101A`. Descanso `💤 90s`, tempo executado `⏱️`. Botão de vídeo ▶ redondo antes do nome.
- Home: avisos (`aMontarNotifs`: avaliação, teste de condicionamento, oferta) acima da barra de progresso, com × (`movh-notif-x-<id>`). `aHeaderForcar` recolhe a faixa de dias em progresso/semana/coletivas; "‹ Voltar para hoje" pulsa.
- Aulas coletivas (`/coletivas` público e dentro do app): dia por vez, blocos recolhíveis, `cor` por bloco (regex `#RRGGBB`), ▶ vídeo (`aColPlay`; `url` embutida no save). Rodapé único = logo escolhida em "Logo do login" (`aLogoRodape`).
- Logo do login: publicada em `landing_config.config.logo_login` e lida sem deploy (`aLogoRemota`). Presets em `LOGO_PRONTAS` (lg16, lg15, lg15r, originais, lgv, movhv).
- Renovação/oferta: `aOfertaSituacao()` (sem `acesso_fim` = novo; vencido > 7 dias = reativação; senão renovação), `aPixPlanosSituacao()` filtra planos; oferta do professor em `alunos.cobranca` vira notificação na home; Pix copia-e-cola estático (`aPixPayload`, CRC16) + "Já paguei" → `pagamentos_pix` pendente → professor confirma (`mbConfirmarPix`). Sem detecção automática do pagamento.
- Modo preview `window._movhPreview`: escritas bloqueadas; `conteudo.diasReais=true` impede reembaralhar os dias (link público `?treino=` sem a flag segue a sequência a partir de hoje).
- Último acesso: `aRegistrarAcesso()` no máx. 1×/20 min. Link público → "Fazer o registro" → `?bemvindo=1` → criar conta → anamnese → redireciona para movh.netlify.app.

## 7. Gerador — o que existe
- Menu (v59): Início, Alunos, Aulas Coletivas, Personal, Treino (compacto, semanas), Configuração (abas Geral, App do aluno, Planos e cobrança, Aparência; `CFG_MAP` em `nav()`), Biblioteca (Exercícios, Presets, Splits). Visual rubro-negro translúcido (`body.rn`, `movh-visual2`), barra superior `#tb` (busca, 🔔, 📝, 🎨). Rótulo de versão: `MOVH_VER` (rodapé do menu); atualizar a cada merge.
- Início (`homeCarregar`): KPIs compactos (ativos, vencendo 7/14 d, sem treino, demandas, treinos no mês), demandas, vencimentos, agenda de hoje, "Alunos recentes" (mesmo agrupamento da gestão de alunos via `mbFeedGrupos`: uma linha por aluno/dia, hora de cada ação; clique abre o aluno), notas fixadas.
- Barra do protocolo (`pbarHTML`): chips de semana/dia, ☑ Em massa, 💾 Salvar/Atualizar aluno (destino explícito `_dest`), 🗂️ Quadro, 📅 Calendário, 📱 Como aluno. Rascunho local `movh-rascunho-v1`.
- Quadro (kanban): tempo previsto por dia (`kbEstimarDia`: séries × (execução + descanso) + 15 s; `KB_SEG_REP=3`); edição em massa (`_bkSel`); gaveta/seletor.
- Seletor em cascata (`mv*`: Grupo › Subgrupo › Exercício, modo em massa com prévia "Neste bloco · N"); `mvAcharEx` casa nomes sem acento/plural; `mvCadastrar` abre a Biblioteca. Vídeo editável (`mvVideo`) com 3 modos (só neste treino / atualizar no banco / salvar novo).
- Colar plano: Coletivas (`coletivasParsearTexto`, cor automática por seção) e splits/protocolos (`mbParsearTreinoTexto`, mesmo casamento).
- Alunos: lista compacta, ⚙️ detalhes, WhatsApp clicável, presença, Central de alertas (`mbAlertas`), atividade agrupada por aluno/dia com hora, alertas de fim de treino/acesso (laranja ≤14 d, vermelho ≤7 d/vencido; `mbFimAvisos`), 📱 ver como aluno, 🗂️ editar no Quadro, histórico de protocolos com "↩ Reativar", 💰 Cobrar (`mbCobrar`: situação, Pix + WhatsApp, "📲 Só no app", "✓ Recebi").
- Calendário do treino (`pbCalAbrir`): início e fim editáveis; fim manual `conteudo.fimPrevisto` (último dia, inclusivo) vale nos alertas; sem início o app mostra a 1ª fase.
- Planos (`PL_DEFAULT`, `tipo` novo|renovacao|reativacao): Mensal 180, Trimestral 420, Semestral 780, Renovação 150, Reativação 165 (escada renovação < reativação < novo); publicados em `landing_config.planos`. Presencial R$80/sessão (pacote 8 = 576, 12 = 816), fora do app. Pix próprio em Planos (card 💠). Planos: tolerância de 7 dias após o fim do acesso.
- Personal (🏋️): editor reaproveita o das coletivas por aluno (`treinos_personal`); "＋ Novo aluno" só com nome; "🔗 Unificar com cadastro do app"; link único `?personal=TOKEN` (guardado em `movh_pp_token`; atalho `<Gerador>/personal/`, pasta `personal/`) com seletor de aluno, carga/obs/feito e "Última" com histórico (`personal_registros`). Token = senha; "↻ Novo link" invalida. O aluno NÃO vê o treino de personal.
- Notas 📝 (`notas`: geral/aluno/dia/exercício) com atalho ao Google Keep (sem API para Gmail pessoal: link + copiar).
- Logos: "Minhas logos salvas" (`movh_logo_salvas`), ajuste de enquadramento, presets (seção 9). Splits padrão vêm SEM "dia real da semana".

## 8. Testes (da raiz do MovhGen, Playwright + Chromium, Supabase simulado; nada toca o banco real)
- `python3 tools/tests/reg_all.py $PWD/index.html $PWD/tools/tests/gpage.py <dir>` (caminhos ABSOLUTOS; 38 OK), `bulk.py` (mesmos args; 26 OK), `kbm.py` (20 OK), `t.py <app.html>` (uma linha FAIL no caminho de erro do link público é esperada), `reg.py <app.html> tools/tests/t.py /tmp`.
- Sintaxe: extrair o maior `<script>` sem `src` e `node --check` nos dois HTML. Sempre conferir app exportado == `movh/index.html` (`cmp`).
- Referência atual (05/11, v59.1): reg_all 38, bulk 26, kbm 20, 0 FAIL; Início renderiza sem pageerror.
- NÃO testado no banco real: tudo de v47+ (ultimo_acesso, treino_visto_em, Cobrar/oferta, calendário/fim manual, Reativar, Personal, Notas).

## 9. Marca e identidade
- Papéis: MOVH = assessoria (marca principal); LG = assinatura pessoal; VOLT = metodologia de treino intenso (uso adiado; rascunho aprovado em `tools/assets/volt/`). O "H" nasceu para diferenciar de MOVA.
- Cores: vermelho `#b10000` (LG vermelho `#a1130f`), creme `#d3cbb8`, preto; no app: avelã `#E0C79D`/`#EEE4D3` e escuro `#0B101A`. Turquesa e verde-limão são só rascunhos do Canva (fora da paleta).
- Logo preferida: barra curva + gráfico (Canva); não mudar logo/paleta do app sem aprovação (propostas de marca podem ser prototipadas). Fontes: Tomorrow (wordmarks) e Comfortaa (slogans). SVGs de origem em `tools/assets/marca/`.
- Canva: designs "LG" `DAHMeQ_M7bc`, "Mova e Personal" `DAFc6gJphlE`, "Sobre mim" `DAHNnebDiqc`; brand kit "MOVA" `kAHFtg2TLmg` ainda com nome antigo. Sandbox não sobe/baixa arquivos no Canva; chat com conector fica bloqueado para gravar memória: registrar a memória ANTES.
- Propostas não aprovadas: vermelho mais claro (~`#e03a3a`) para texto em fundo escuro; MOVH sem o LG dentro; VOLT como "VOLT · by MOVH"; slogan único; checar INPI.

## 10. O que fica só no `localStorage` do Gerador
Já no banco: exercícios, splits, planos/landing. Só no navegador (por origem): `movh_pl_keys` (chaves de pagamento; NÃO migrar), `movh_logo_custom`/`movh_logo_salvas`, `mova_pre` (presets), `mova_modelos_condic`, `movh_lang`/`mova_theme`/`movh-visual2`, `movh-rascunho-v1`, `movh_pp_token`/`movh_pp_aluno`.
Plano (uma rodada): `ALTER TABLE professores ADD COLUMN IF NOT EXISTS config jsonb DEFAULT '{}'::jsonb;` guardando `{presets, modelos_condic, logo_login, lang, theme}`; ler ao logar, subir o local uma vez, upsert a cada salvar; conferir RLS de `professores`.

## 11. Pendências
- AÇÃO DO USUÁRIO: reexecutar o script SQL idempotente do Gerador (Publicar app → SQL) para garantir `notas`, `personal_*`, `treinos_personal`, `pagamentos_pix`, colunas de `alunos`; conferir "Allow anonymous sign-ins" e policy SELECT de `rpe_sessoes`; deploy e webhook do `notify-pix`; parar builds do Netlify do Gerador; confirmar créditos Netlify no Billing e acionar deploy do app quando renovarem (se houver mudança no app).
- Bloqueio de acesso com tolerância de 7 dias após o fim; avisar o aluno 14 dias antes (hoje só ≤ 7 dias no app). Conferir `A_WHATSAPP_NUM` do app.
- Histórico de cargas do Personal dentro do editor do Gerador (hoje só na página de atendimento); "Repetir semana anterior".
- Limpeza do TEMPLATE do app (funções/CSS sem uso dentro de `exportarComLogin()`): não feita, exige regenerar `movh/index.html` e deploy; juntar com a próxima mudança do app. Ex.: `aMontarBadgeTimeline` sem uso.
- Backlog: Web Push; PWA (service worker que NÃO cacheie o `index.html`); QR do Pix; controle financeiro no Gerador; periodização dirigindo sobrecarga progressiva; título de bloco sobrepondo subtítulo no mobile (`.b-obs`/`.bh`); ✓ de "feito" que não sobrevive ao refresh (confirmado em teste real); `.toprow` "não desce junto" (sem print, em aberto); `professores.config`; LGPD (termos/política); backup/pausa do Supabase (keep-alive existe); VOLT; Biblioteca em 3 colunas.

## 12. Rodada de limpeza v59.1 (05/11/2026) — só Gerador, app inalterado (export idêntico, repo `movh` não tocado)
- Removido: `indexx.html` (1,5 MB, cópia antiga sem referência), funções órfãs (`visualToggle`, `buildCatOptions`, `onCatFiltroChange`, `buildExDatalistForCat`, `saveSplitFromEditor`, `mbFiltrarAluno`), CSS morto (`.ai-*`, `.sb-vis`, `.exi-badge`, `.badge-bloqueado`, `.al-more-btn`, `.al-det`, `.al-feed-tx`, `.kb-card.kb-drag-over`), card "Atualizações"/`MOVH_NOVIDADES`/`.hm-nv` do Início. Rótulo v59.1 · 05/11. `index.html` 17095 → 17027 linhas.
- Método (reutilizável): função com 1 única ocorrência no arquivo = órfã; classe CSS sem uso fora da definição = morta. CUIDADO com classes montadas dinamicamente (`al-lv-o/r`, `.al-al.n2/n3`, `lv-o`): conferir por substring antes de apagar. Não há função definida duas vezes no nível raiz.
- Próxima rodada de limpeza (se quiser mais): template do app (ver pendências), CSS sobreposto em `body.clean` × `body.rn`, blocos `!important` do app empilhados.

## 13. Lições de processo (consolidado)
- `[skip netlify]` não evita deploy do app; hospedar só-Gerador no GitHub Pages.
- Antes de afirmar "o app mostra X", considerar a progressão automática por fase (`progressaoAuto`) e o piso de séries (`Math.min(2, p.sets)`).
- Estado/versão: o rótulo `MOVH_VER` é a prova do que está no ar (Ctrl+F5 no GitHub Pages leva ~1 min).
- Segurança: chaves secretas só em Supabase secrets/Edge Functions, nunca em HTML público.

## 14. v59.2 (05/11/2026) — só Gerador
- Início: "Atividade recente" virou "Alunos recentes" (helper `mbFeedGrupos`/`mbFeedHH`, compartilhado com `mbRenderFeed`); KPIs menores (`.hm-k` 18 px). Testes: reg_all 38, bulk 26, kbm 20, 0 FAIL; Início testado com eventos simulados (desktop e 390 px). App inalterado, sem deploy.

## 15. v59.3 (05/11/2026) — só Gerador
- Quadro: resumo (exercícios · tempo) agora no cabeçalho da coluna; exercício em 1 linha (séries·descanso à direita); "vários/conjugado" só no hover (desktop); Condicionamento em `<details>` recolhido (estado em `_kbCondAb`); `--kbn` + coluna "Novo dia" fina; botão ⛶ Foco recolhe o menu lateral só no Quadro (`nav()` remove a classe fora de `kb-*`; preferência em `movh_kb_foco`).
- Editor do dia: dia real/fase/foco/idioma dentro de "⚙ Detalhes do dia" (`_diaDetAb`).
- Agentes do repo: `.claude/agents/movh-treino.md` (consultor de treino) e `movh-gestao.md` (administração); só leem e sugerem. Invocar pelo nome numa sessão com o MovhGen anexado.
- Lista de exercícios mais usados: SQL em `protocolos.conteudo` (semanas→dias→blocos→exercicios[].nome), rodado pelo usuário no Supabase; base para o roteiro de gravação de vídeos.
- Testes: reg_all 38, bulk 26, kbm 20, 0 FAIL. App inalterado, sem deploy.

## 16. v59.4 (05/11/2026) — só Gerador
- Aulas Coletivas: `.cl-day` sem limite de 920px; blocos dentro de `.cl-blocos` em colunas CSS (`column-width:500px`, só ≥1000px, `break-inside:avoid`); blocos/linhas mais compactos; textarea `data-min` 44 (normal) / 110 (condicionamento); abas dos dias `sticky`; cabeçalho da página sem quebra de linha (botões ao lado do título). Dia de 4 blocos: altura 1521→823 px (1700 px de largura). Estilos escopados em `#page-coletivas` (o app e o link público não mudam).

## 17. v59.5 (05/11/2026) — só Gerador (app idêntico, sem deploy)
- Planos online (`PL_DEFAULT`): Mensal 180, Bimestral 320 (`pl6`, 60 dias, UK 69 = sugestão a confirmar), Trimestral 420, Renovação 150, Reativação 165; Semestral removido. Para valer: aba Planos → "↺ Valores definidos" e publicar; planos salvos no navegador/banco continuam com os antigos até isso.
- `PL_PRESENCIAL` (só Gerador, não publica na landing nem no app): adaptação online 120; presencial individual 220/77 avulsa/576/816; dupla por pessoa 180/70 avulsa/528/744. `dias` assumidos: 30 (pacotes e adaptação presencial), 7 (avulsa), 28 (adaptação online) — é o acesso liberado ao confirmar o Pix; ajustar na constante se preferir.
- Cobrar: lista agrupada (online + catálogo); oferta do catálogo grava `cobranca` com `tipo` = situação do aluno e `plano_nome`/`valor`/`dias`, e o app já paga por Pix e registra em `pagamentos_pix`. Mensagem própria para itens do catálogo.
- Pendente: site/landing com os templates novos (adaptação online como plano de entrada, UK da adaptação) e rótulos de desconto do presencial (com avulsa 77, 8 sessões = ~6% e 12 = ~12%; usar "Economia de R$40/R$108").
- Testes: reg_all 38, bulk 26, kbm 20, 0 FAIL; Cobrar testado com aluno simulado.

## 18. Retomar amanhã (05/11/2026, fim do dia)
- Hospedagem: landing = repo `lguilh3rme/movhtemplate` → planmovh.netlify.app, em OUTRA conta Netlify com ~209 créditos (anexar com `add_repo`). App `movh.netlify.app` e Gerador estão na conta com poucos créditos (renovam na semana de 09/11, a confirmar).
- Decisões pendentes do usuário: (a) levar `movh.netlify.app` para a conta com créditos — caminhos: transferir o site para o time de lá, ou criar o site lá, renomear o antigo e dar o nome `movh` ao novo (copiar variáveis de ambiente; reautorizar o GitHub); (b) link curto para o Gerador — recomendado um site Netlify só com redirecionamento (`/* https://lguilh3rme.github.io/MovhGen/ 301`), 1 deploy único; NÃO mover o Gerador de origem (o `localStorage` da seção 10 ficaria vazio).
- Ações do usuário: aba Planos → "↺ Valores definidos" e publicar; confirmar £69 do bimestral e os `dias` de `PL_PRESENCIAL`; rodar o SQL idempotente quando houver tabela nova.
- Próximas frentes: (1) templates novos no site (online: adaptação 120, mensal 180, bimestral 320, trimestral 420, renovação 150, reativação 165; presencial: ver §17) — precisa dos arquivos/Canva; rótulos de desconto do presencial viram "Economia de R$ 40/R$ 108"; alinhar regra de pagamento (Pix antes da 1ª sessão x Pix ou cartão); (2) roteiro de gravação de vídeos (por equipamento; os 21 exercícios mais usados; nenhum vídeo é do professor ainda) e padronizar nomes duplicados da biblioteca (adutora/cadeira abdutora/cadeira abdtora, rdl/rdl barra, tríceps polia/triceps corda, face pull/facepull); (3) testar os agentes `movh-treino` e `movh-gestao`; (4) Quadro: arrastar exercício entre dias e comparar Semana A × B; (5) bloqueio com tolerância de 7 dias e aviso de 14 dias.
- Conector Supabase está ligado (projeto `cfanjhuzrcgxrbfmhahi`): usar só leitura por padrão e avisar antes de qualquer escrita.

## 19. Landing atualizada (06/11/2026) — repo `lguilh3rme/movhtemplate` (PR #1, planmovh.netlify.app); Gerador e app inalterados
- Fallback dos planos online: Mensal 180, Bimestral 320 (mais popular), Trimestral 420 (UK 39/69/99). Os planos reais vêm de `landing_config.planos` (aba Planos do Gerador → publicar); a landing agora filtra `tipo==='novo'` (Renovação/Reativação não viram card).
- Card "Adaptação online" R$120 (28 dias, só BR/Asaas, `PL_ADAPT` no código da landing; sem UK). Seção "Personal presencial" só em PT (individual/dupla; adaptação 220/180, avulsa 80/77, 8 sessões 576/528, 12 sessões 816/744; botão WhatsApp 5527988225340).
- Presencial na landing é fixo no código (a aba Planos só edita a consultoria online). Ao mudar valores, editar `PRES` e `PL_ADAPT` em `movhtemplate/index.html`.
- DECIDIDO (06/11): avulsa 77 (individual) e 70 (dupla); economia em reais (individual 40/108, dupla 32/96). Landing e Gerador alinhados; os templates do Canva (v7/v8) ainda mostram 80/77 e 10%/15%: atualizar.
- DECIDIDO (06/11): Pix é a forma principal; cartão só em planos acima de 1 mês, o resto é Pix. Landing já diz isso; a Edge Function `create-checkout-asaas` ainda usa `billingType UNDEFINED` (Pix/Boleto/Cartão) para planos ≤30 dias: trocar para PIX exige deploy (pendente de autorização).
- ALERTA: a `asaasKey` de produção (sem uso, a cobrança já passa pela Edge Function) foi removida do HTML, mas continua no histórico do Git: revogar/gerar nova no painel do Asaas e atualizar o secret `ASAAS_API_KEY` no Supabase.
- Lição: teste visual da landing com Playwright, bloqueando requisições externas (`file://` + `route.abort`).

