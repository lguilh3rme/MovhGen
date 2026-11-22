# Triagem das pendências antigas (A6, concluída em 22/11/2026)

Fonte: `docs/historico-secao0.md` (os ~118 `[ ]` originais, que se repetiam em várias entradas = ~35 itens distintos). Cada item foi verificado no código (`index.html`, `src/app/app.js`) e no banco (Supabase, só SELECT em metadados e nomes de exercícios; nenhum dado de aluno lido). "Aberto" = sem implementação encontrada; mesmo assim, se o dono tiver feito por fora, é só dar baixa aqui.

## FEITO (verificado; pode ignorar no histórico)
| Item antigo | Evidência |
|---|---|
| SQL `avaliacoes_fisicas.mapa` e `alunos.caminho_ativo` | colunas existem no banco |
| `padrao_movimento` e `nivel` em `exercicios` (ESCADA) | colunas existem; 125 de 195 exercícios com `padrao_movimento` |
| Oferta de renovação no app | `aShowTelARenovar` em `src/app/app.js` |
| Contraste `--t3` (Rodada B) | `#8E8E8A` no Gerador e no CSS do app escuro |
| Card do Caminho com "Treino X de N" | `src/app/app.js` (~L2953) |
| Barra de progresso das fases na gestão | `mbBarraFases` |
| PDF do Mapa (botão) | `mbMapaPDF` (falta só testar no navegador real = dono) |
| Fila de treinos recolhida | teste `fila_recolhida.py` no `run_all` |
| Modelo Híbrido, Próxima fase que progride, Comparar fases, ativação agendada, volume por músculo | v65.x–v68.6 mesclados, com testes no `run_all` |
| Progressões da semana (Natan, Enes, João, Izabella) | 13 rascunhos inativos criados em 21/11; falta o dono publicar no Quadro |

## ABERTO (verificado: nada implementado)
**Banco / backend**
1. **Política de INSERT/UPDATE do professor no bucket `avaliacoes`** (hoje só SELECT; só o aluno insere). Necessária para trocar foto da avaliação por upload no Gerador. **SQL pronto em `docs/sql-pendentes.sql` (NÃO aplicado)**; precisa de autorização do dono (DDL).
2. **Aviso diário de vencimentos no Telegram** (pg_cron + função). O único cron é `ativar-agendados`; `notify-pix` só avisa Pix por evento. Depende também da secret `GERADOR_URL` (ação do dono).
3. **Exercícios que faltam no banco:** Flexão inclinada, Barra fixa com elástico, Agachamento na caixa. Conferido em 22/11: não há Flexão nem Barra fixa por nome em português (checar `nome_en`) e Agachamento só como Hack/Sumo. **O dono define nomes e categorias antes de inserir** (nota em `docs/sql-pendentes.sql`). Ainda 70 de 195 exercícios sem `padrao_movimento`.
4. UK do bimestral e Pix-only em `create-checkout-asaas` (exige autorização de deploy).

**Gerador**
5. Login só por e-mail com código de 6 dígitos (`signInWithOtp`): era um parecer, 0 ocorrências.
6. Campo de bioimpedância na avaliação/Mapa.
7. Botão "Copiar como texto" (plataforma → Docs).
8. Protocolo Metabólico reutilizável (chip), semana-modelo, progressão por padrão nas fases, dominância explícita.

**Visual**
9. Apagar CSS morto dos visuais Clean/Clássico (~37 referências ainda no arquivo).
10. Piso de 11 px nos textos de 9–10,5 px (63 ocorrências no CSS do app; muda o app = 1 deploy).
11. Abas da Configuração rolando na horizontal no celular (sem `overflow-x`).

**Confirmar com o dono (decisão de design ou termo ambíguo no código)**
12. Botão de vídeo redondo → quadrado/retângulo compacto; bloco Ativação como sequência compacta (opções A/B nos prints de 16/11).
13. Glossário/descrição da fase em linguagem simples no app; abertura do 1º treino; "treino de chegada" ao criar protocolo; Mapa 2 a partir da reavaliação.

## Só o dono resolve (não é código)
- ~~Conferir no Netlify "Production: main@99dbc8f" (v68.5)~~ **feito pelo dono (22/11)**. Falta testar no celular real e o PDF do Mapa.
- ~~Criar a secret `GERADOR_URL`~~ **feita pelo dono (22/11)**: o aviso do Telegram já pode sair com botão quando o item 2 for implementado.
- Revogar tokens do GitHub colados em conversas.
- Landing/Canva com R$150/130 e os degraus; logo e rodapé da landing (repo `movhtemplate`, não verificado aqui).
- Vínculo/cobrança de alunos com treino vencido há meses (Jocimar, Ludmila, Iasmim); Personal do Cris; coletivas da semana; reabrir/salvar Mapas publicados para alinhar datas.
- Branches `wip/*` e antigas (~110) no remoto: apagáveis em lote por API com autorização.

## Bug achado na fase B (não é pendência antiga)
`aAtualizarSaudacao` (`src/app/app.js`): `split(/s+/)` deveria ser `/\s+/`. Ver seção 11 do CONTEXTO.
