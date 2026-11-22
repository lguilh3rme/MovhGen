# Triagem das pendências antigas (A6, 22/11/2026)

Fonte: `docs/historico-secao0.md` (os `[ ]` originais). Critério: busca de termos no código (`index.html`, `src/app/app.js`, `tools/supabase`). **Termo no código não prova que o item está pronto**: a coluna "Sugestão" é uma hipótese para o dono confirmar. Depois de confirmado, mover para a seção 11 do CONTEXTO (aberto) ou apagar daqui (feito).

## Provável FEITO (há implementação no código; confirmar e dar baixa)
| Item antigo | Sinal no código |
|---|---|
| Oferta de renovação no app (Rodada B) | 29 linhas em `app.js` |
| Card "Seu caminho" + etapa no app (jornada) | 3 linhas em `app.js`, 7 no Gerador |
| Fase Consolidação (Próxima fase / jornada) | 7 em `app.js`, 26 no Gerador |
| `padrao_movimento` explícito no painel (ESCADA) | 18 em `app.js`, 39 no Gerador |
| `--t3` do Gerador (contraste) | `index.html:27` já com `#8E8E8A` (conferir o `--t3` do app escuro) |
| Degraus Avaliação + Mapa (`av_mapa` 150/130) | 2 no Gerador (conferir o checklist no Cobrar) |
| Protocolo Metabólico reutilizável | 12 no Gerador |

## Provável ABERTO (sem sinal no código)
| Item antigo | Sinal |
|---|---|
| Login só por e-mail com código de 6 dígitos (`signInWithOtp`) | 0 ocorrências (era só parecer) |
| Campo de bioimpedância na avaliação/Mapa | 0 ocorrências |
| Aviso diário de vencimentos no Telegram (pg_cron + função) | 0 `pg_cron`; existem arquivos em `tools/supabase` que citam Telegram (aviso por evento, não diário) |
| Apagar CSS morto dos visuais Clean/Clássico | termo ainda presente |
| Piso de 11 px em textos de 9–10,5 px; abas da Configuração rolando na horizontal | sem evidência |

## Só o dono resolve (não é código)
- Conferir no Netlify "Production: main@99dbc8f" (v68.5) e testar no celular real.
- Criar a secret `GERADOR_URL` = `https://lguilh3rme.github.io/MovhGen` (aviso do Telegram sem botão enquanto não existir).
- Revogar tokens do GitHub colados em conversas.
- Preços/degraus finais (R$150 presencial / R$130 online) em landing e Canva.
- Branches `wip/*` e antigas no remoto (~110): apagáveis em lote por API quando o dono autorizar; o histórico fica nos PRs.

## Bug achado na fase B (não é pendência antiga)
`aAtualizarSaudacao` (`src/app/app.js`): `split(/s+/)` deveria ser `/\s+/`. Ver seção 11 do CONTEXTO.
