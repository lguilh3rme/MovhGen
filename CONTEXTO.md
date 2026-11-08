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
- Agentes do repo: FONTE ÚNICA em `plugins/movh/agents/` (`.claude/agents` é um link simbólico para lá): `movh-treino.md` (consultor de treino) e `movh-gestao.md` (administração); só leem e sugerem. Editar só em `plugins/movh/agents/` e subir a versão do plugin. Invocar pelo nome numa sessão com o MovhGen anexado.
- Plugin `movh` (skills `movh` e `movh-gerador` + agents): fonte em `plugins/movh/`, instalável por `/plugin marketplace add lguilh3rme/MovhGen`. Sincronia: a skill compara a cópia instalada com a do repo a cada rodada (Passo 0, item 4) e o repo registra aqui o que muda; ao alterar o plugin, subir a versão em `plugin.json` e `marketplace.json`.
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

## 20. Proposta visual do app do aluno (06/11/2026) — APLICADA EM PARTE na v60.1 (06/11 noite)
**v60.1 (app + Gerador, deploy do app; Netlify do app agora na conta com 179 créditos):** tema rubro-negro via variáveis (dark: `--bg/--card/--bd/--cl` com `!important` porque existe regra antiga `[data-theme=dark]{--card:rgba(...)!important}` perto da linha 11657; claro só troca o acento para vermelho); progresso = barra de 5 px + linha "A · Inferiores · 2 de 9 | ~N min restantes" (`aAtualizarProgressoSessao`); Condicionamento recolhido por padrão; bloco concluído com cabeçalho baixo; barra fixa "próximo exercício + Iniciar" (`aXoBarraProximo`); tela de foco do exercício (`aXoAbrir/aXoRender/aXoConcluir`, overlay `#aXo`): vídeo ~150 px em loop mudo que recolhe para "Ver execução" após a 1ª série, bolinhas de série, carga − / + (passo 2,5; salva em `registros_sessao` ao concluir a última série), descanso em contagem, "Última vez"/recorde. Reusa `aSeriesFeitas`, `aContarSerieConcluida`, `aSalvarCarga` (nada novo no banco).
**NÃO feito ainda:** Pix-only em `create-checkout-asaas` (exige autorização de deploy), tela 4 do personal (sessões do pacote = tabela/coluna nova), tela de renovação redesenhada (só herda as cores novas), aulas coletivas em abas Seg–Sáb (hoje já mostra um dia por vez), modo claro refinado.
Teste: `kbm.py` tem caminho fixo `/home/claude/movhgen` → `ln -sfn <clone> /home/claude/movhgen`.
Detalhes da proposta original (mantidos):
Protótipo e prints em `docs/proposta-app-aluno/` (`proposta.html` abre no navegador; `proposta.png`; `app-atual.png` = como está hoje). Aplicar mexe no app (`exportarComLogin()` no Gerador → export → repo `movh`) e exige deploy no Netlify (créditos: confirmar saldo; ciclo renova na semana de 09/11). Fazer tudo numa rodada só, junto com Pix-only na função `create-checkout-asaas` (planos ≤30 dias).
- Direção: trocar o roxo/bege do app pelo mesmo visual rubro-negro do Gerador e da landing: fundo #0B1220, cartão #111A2E, borda #1F2B45, vermelho #D62839/#FF4D5A, creme #F3EAD8, cinza #9AA3BD, verde #3DDC97 só para "feito", fonte Inter. Manter modo claro/escuro se já existe (o claro pode ficar para depois).
- Pedidos do Guilherme sobre o protótipo: (1) o PROGRESSO ocupa mais área que o treino: reduzir para uma barra fina de 5 px com "A · Inferiores · 2 de 9" e "~40 min restantes" na mesma linha (no lugar do cartão grande com anel); (2) reduzir a parte de ATIVAÇÃO: bloco concluído/recolhido vira uma linha de 1 exercício de altura ("Ativação · 2 exercícios · 2/2 ✓"), aberto só se tiver pendência; Condicionamento também recolhido por padrão.
- Tela 1, treino de hoje: saudação menor, faixa da semana baixa (dias feitos com ✓), blocos como cartões, exercício em 2 linhas (nome; séries × reps · descanso) + chip de carga, barra fixa embaixo com próximo exercício e "Iniciar".
- Tela 2, durante o exercício: séries como bolinhas grandes tocáveis; carga e repetições com − e +; descanso em contagem; "Última vez" e recorde; botão "Concluir série N" na barra fixa.
- Vídeo: ao entrar no exercício aparece em tamanho médio (16:9, ~140 px, loop sem som, toque para ampliar); ao concluir a 1ª série recolhe para uma miniatura de uma linha ("Ver execução"). Exercício sem vídeo (28 da biblioteca estavam sem link em 05/11): a área não aparece e o registro sobe.
- Tela 3, aulas coletivas: abas Seg–Sáb, só a aula do dia aberta, blocos (aquecimento, bloco 1, bloco 2, finalizador) em linhas rotuladas, ponto nos dias com aula. Os blocos do protótipo são ilustrativos: usar a estrutura real de `aulas_coletivas.dados` (função `aMontarColetivas` no app).
- Tela 4, personal (professor): página `?personal=TOKEN` (`personalPubBoot` no Gerador, hoje só leitura): chips para trocar de aluno (individual/dupla), cartão "Sessão N de M · vence em" (saldo do pacote, depende de registrar sessões: hoje não existe), treino do dia com carga − / + e botão "Concluir sessão". O aluno presencial não vê esse treino. O controle de sessões do pacote é funcionalidade nova (precisa de tabela/coluna).
- Tela de renovação: aviso "acesso termina em N dias" (tolerância 7 dias), planos com economia em reais (mensal 150 renovação, bimestral 320, trimestral 420), Pix em destaque (QR + copia-e-cola), "Já paguei"; cartão só em planos acima de 1 mês.
- Regras de implementação: JS do app é TEXTO dentro do template literal (barra invertida dobrada, sem crases e `${`); `movh/index.html` é gerado pelo export; testar com `t.py`/`reg.py`; um merge por repo por rodada; pedir print antes de aplicar mudanças visuais maiores.


## 21. Retomar (06/11/2026, 21h) — pós v60.1
- App v60.1 mesclado (movh PR #34, 21h04); no print do Netlify às 21h05 aparecia só o Preview #34 e o último Production era o anterior: conferir em Deploys se existe Production `1a9904d`; se não, Trigger deploy. Cada preview/deploy do app gasta ~15 créditos (conta nova: 179 → 164 após o preview).
- Landing v2 mesclada (movhtemplate PR #3). Tela de login do app só trocou o roxo por vermelho.
- PR #63 do MovhGen (v60.0: presencial editável + Formas de pagamento) está com conflito com a v60.1: precisa de rebase sobre `main`, `MOVH_VER` v60.2 e rodar reg_all 38 / bulk 26 / kbm 20.
- Seguem pendentes: Pix-only em `create-checkout-asaas` (aguarda autorização de deploy), tela do personal com sessões do pacote (tabela/coluna nova), renovação redesenhada, revogar chave Asaas, templates do Canva (80/77 e 10%/15% antigos).

## 22. v60.2 (07/11/2026) — Gerador + app do aluno (deploy do app, Netlify com ~149 créditos)
- Planos: Bimestral 290 (60 d, UK 69 a confirmar); Reativação 90 = só reabre o acesso ao treino ATUAL (30 d), sem treino novo; ao confirmar o Pix de reativação o protocolo ativo recebe `conteudo.loop = true`; Renovação 150 (treino novo). Para valer: aba Planos → "↺ Valores definidos" → publicar. Escada por mês: novo 180 > renovação 150 > bimestral 145 > trimestral 140.
- Loop: botão 🔁 em Gerenciar protocolos (`mbToggleLoop`); aviso "faltam N dias: deixar em loop?" nos últimos 7 dias e "treino acabou: deixar em loop?".
- App do aluno: miniatura 54 px do vídeo na linha do exercício (`.vbtn.vthumb`, `aThumbHtml`, imagem `i.ytimg.com/vi/ID/mqdefault.jpg`; shorts com zoom 1.75 no centro); tela de foco só carrega o player do YouTube ao tocar (`aXoPlay`); abertura com as 7 consultas em paralelo (`Promise.all`, as não críticas falham em silêncio); registros buscados do mais novo para o mais antigo (limite 1000) e invertidos, corrige o teto de 1000 antigos.
- Lição: regras antigas `.vbtn` / `.ec-name-row .vbtn` usam `!important`; qualquer variante nova do botão precisa de `!important` e `position:relative` ou a imagem `absolute` cobre o cartão (pego só no print real, não nos testes).
- Barra de páginas embaixo (proposta de protótipo): REJEITADA; as seções continuam no fim da página rolando.
- Não feito (próximo): escolher o quadro do vídeo na biblioteca (coluna `thumb` em `exercicios`, 0-3 = capa, início, meio, fim), progresso com resumo/gráficos, remover `indeex.html`/`indeeex.html`/`indexx.html`/`deploy.txt` do repo `movh`.
- Testes: reg_all 38, bulk 26, kbm 0 falhas, t.py ok/erro. Miniaturas não testadas com YouTube real (sandbox sem acesso).

## 23. v60.3 (07/11/2026, noite) — Gerador + app do aluno (deploy do app)
- Pedido dele: lista compacta só com o botão de play (sem quadro de preview), com botão pequeno para ligar/desligar a miniatura; melhor enquadramento de shorts; manter o visual compacto.
- Padrão = botão de play circular compacto. Botão 🖼 no topo (`#thumbToggle`, `aThumbsToggle`) liga/desliga o modo miniatura (`body.thumbs-on`, preferência em `localStorage movh-thumbs`); as imagens só são buscadas com o modo ligado (`aThumbsApply` injeta o `<img>` e roda após `aRenderProtocolo`).
- Shorts (`data-sh="1"` quando a URL tem `/shorts/`): na tela de foco o player vira vertical 9:16 (`.xo-vid.xo-sh`, altura ~40vh) e no modal ampliado vira `min(92vw, 82vh*9/16)` com `aspect-ratio 9/16` (`aAbrirVideoModal(src, sh)`). O pôster usa `object-fit:cover`, que recorta o centro da capa 16:9 e mostra só a parte vertical.
- Cuidado no template: dentro de `exportarComLogin()` evitar aspas escapadas (`\'`) e `${`; use `==1` em vez de `==='1'` em atributos `onclick`.
- Testes: reg_all 38, bulk 26, kbm 0 falhas, t.py ok/erro; miniatura ligada mede 54 px; short abre em 9:16. Não testado com YouTube real (sandbox sem acesso).

## 24. v60.4 (07/11/2026, noite) — Gerador + app do aluno (deploy do app)
- Vídeo: a tela de foco não tem mais player inline nem pôster; só a linha "Ver execução" (`.xo-vmini`) que abre o modal `#a-video-modal` (fundo translúcido, iframe do YouTube criado só ao tocar; short em 9:16). Era assim antes da v60.1; o player inline em loop era o que pesava.
- Cabeçalho (saudação, descrição, faixa de dias = `#tHeaderRecolhivel`): `aHeaderForcar(true)` o recolhe em Progresso/Semana/Coletivas; agora `aVoltarHoje()` e o fim de `aRenderProtocolo()` sempre o devolvem visível (`_aHdrPrev = null`). Causa exata do "sumiu" não confirmada pelo usuário; se persistir, pedir print do que falta.
- Testes: reg_all 38, bulk 26, kbm 0 falhas; header block→none→block; modal abre com iframe só após o toque.

## 25. Retomar (08/11/2026, 00h) — v60.4 no ar (confirmado pelo usuário)
- Feedback dele sobre a v60.4: NÃO gostou do botão 🖼 no topo (liga/desliga miniaturas) nem de como algumas coisas estão apresentadas/organizadas no app do aluno. Detalhes ainda não dados: PEDIR PRINTS do celular do que incomoda antes de mexer (um push no app gasta ~30 créditos entre preview e produção).
- Ideias a propor: remover o modo miniatura (deixar só o play compacto) ou mover o 🖼 para dentro de uma seção, em vez do topo; enxugar a barra do topo (registro, relógio, Sair, 🖼, tema); revisar ordem selos → saudação → descrição → faixa de dias → avisos.
- Cabeçalho "sumiu": não reproduzido no Playwright (aluno logado simulado mostra selos, saudação, descrição, "Logado como", faixa de dias). v60.4 já o restaura ao voltar do Progresso e ao recarregar o treino. Se voltar a faltar, pedir print.
- Bloqueio de rede: o sandbox NÃO alcança movh.netlify.app (nem via Playwright; `ERR_TUNNEL_CONNECTION_FAILED`); só GitHub e registries. Plano gratuito não muda isso. Para ver o app real: prints dele, ou reproduzir com Playwright 390x844 dpr 2 + stub do `tools/tests/t.py` (rota `?treino=abc123`, bloquear `i.ytimg.com`) com dados reais lidos pelo conector Supabase.
- Pendências: escolher o quadro do vídeo na biblioteca (coluna `thumb` em `exercicios`); progresso com resumo/gráficos; limpar `indeex.html`/`indeeex.html`/`indexx.html`/`deploy.txt` e ~34 branches antigos do repo `movh`; aba Planos → "↺ Valores definidos" e publicar; UK do bimestral (69?); Pix-only em `create-checkout-asaas` (precisa autorização de deploy); revogar a chave Asaas; templates do Canva (80/77 e 10%/15% antigos); PR #63 do MovhGen (v60.0 presencial editável) com conflito, provavelmente obsoleto; reinstalar o plugin movh 1.0.3.
