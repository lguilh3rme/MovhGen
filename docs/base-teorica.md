# Base teórica do MOVH (o movh-treino lê este arquivo junto com aprendizados-treino.md)

Arquivo vivo, criado em 09/11/2026. Serve para JUSTIFICAR o método, não para mudá-lo sozinho: a decisão é sempre do professor. Regras vigentes ficam no CONTEXTO.md (§12 e §0); prática de aula fica em `docs/aprendizados-treino.md`; aqui ficam as fontes.

## Como usar (agente)
- Ao justificar uma regra, citar a fonte pelo autor/ano abaixo e dizer o nível de certeza (campo Status).
- Nunca citar algo que não esteja aqui sem avisar que é do conhecimento geral e não verificado.
- Fonte nova entra só pelo fluxo "Entrada de fontes" (final do arquivo), com DOI e status.

Status: **resumo conferido** = li o resumo/página da revista, não o texto completo. **Secundária** = só vi relato de terceiros. Nenhuma fonte abaixo teve texto completo lido.

## 1. Força e hipertrofia
| Fonte | O que diz (em resumo) | Sustenta no MOVH | Status |
|---|---|---|---|
| ACSM 2026, Currier et al., *Med Sci Sports Exerc* 58(4):851-872. doi:10.1249/MSS.000000000003897 | Atualiza o posicionamento de 2009 (137 revisões, +30 mil participantes); individualizar para manter a adesão pesa mais que variáveis exatas. | Referência-mãe; progressão e periodização | resumo conferido |
| Pelland et al. 2026, *Sports Med* 56(2):481-505 | Volume semanal com retorno decrescente; contar séries diretas e indiretas (indireta = 0,5); frequência só tem efeito claro na força. | Possível refino da contagem de volume por músculo (NÃO implementado) | resumo conferido |
| Schoenfeld, Ogborn, Krieger 2017, *J Sports Sci*. doi:10.1080/02640414.2016.1210197 | Relação graduada: mais volume semanal, mais hipertrofia. | Volume mínimo ~10 séries/sem/músculo; citada na Análise técnica | resumo conferido |
| Robinson et al. 2024, *Sports Med*. doi:10.1007/s40279-024-02069-2 | Hipertrofia melhora perto da falha; força varia pouco numa faixa ampla de RIR. Análise exploratória. | RIR 2 (última série RIR 1) | resumo conferido |
| Singer et al. 2024, *Front Sports Act Living* 6:1429789. doi:10.3389/fspor.2024.1429789 | Pequeno benefício com descanso >60 s; sem diferença apreciável acima de ~90 s. | Descanso 2' nos compostos; 1' nos isoladores fica na fronteira | resumo conferido |

## 2. Treino híbrido (força + corrida)
| Fonte | O que diz | Sustenta | Status |
|---|---|---|---|
| Huiberts et al. 2024, *Sports Med*. doi:10.1007/s40279-023-01943-9 | Interferência pequena na força de pernas em homens, não em mulheres; efeito depende do status de treino. | Corrida fora do dia pesado de pernas | resumo conferido |
| Schumann et al. 2022, *Sports Med* | Treino concorrente não compromete hipertrofia nem força máxima. | Conviver força e corrida no mesmo protocolo | secundária / preprint; confirmar |
| Wilson et al. 2012, *J Strength Cond Res* 26(8):2293-2307 | Mais frequência e duração do aeróbio se associam a menor ganho de força/potência. | Limitar volume de corrida em fase de força | resumo conferido |

## 3. Corrida e condicionamento
| Fonte | O que diz | Sustenta | Status |
|---|---|---|---|
| Stöggl e Sperlich 2015, *Front Physiol*. doi:10.3389/fphys.2015.00295 | Atletas de resistência treinam ~75-80% em baixa intensidade; modelos polarizado e piramidal. | Regra "~80% em Z1-Z2" (`condSugestao`) | resumo conferido |
| Revisão TID em corredores, *Int J Sports Med*. doi:10.1055/a-1559-3623 | Muito volume leve (≥70%) e pouco limiar/alta (≤30%) rende mais que treinar no limiar. | Mesmo que acima | resumo conferido |
| Meta-análise polarizado vs outros, *Sports Med* 2024. doi:10.1007/s40279-024-02034-z; revisão *Front Physiol* 2025. doi:10.3389/fphys.2025.1657892 | Polarizado melhor para VO2pico; a revisão de 2025 diz que nenhum modelo vence sempre. | Não vender o 80/20 como verdade única | resumo conferido |
| Meta-análise HIIT, *J Sci Med Sport* 2019;22(8):941-947. doi:10.1016/j.jsams.2019.01.013 | Para VO2máx, intervalos longos (≥2 min), volume ≥15 min e 4-12 sem rendem mais. | CONFRONTAR com intervalado de tiros de 1 min (ex.: Natan) | resumo conferido |
| Daniels (VDOT), Seiler, magic.training | Citados no código (zonas de pace pelo teste de 3 km, 80% fácil). | Zonas e pace | NÃO reverificado aqui |

## 4. Circuitos, funcional, CrossFit e kettlebell
| Fonte | O que diz | Sustenta | Status |
|---|---|---|---|
| Ramos-Campo et al. 2021, *Biology* 10(5):377. doi:10.3390/biology10050377 | Circuito resistido: VO2máx +6,3%, ganho de força e massa, perda de gordura; descanso curto e intensidade baixa/moderada favorecem gordura. | Circuito funcional metabólico das coletivas | resumo conferido |
| Claudino et al. 2018, *Sports Med Open* 4:11. doi:10.1186/s40798-018-0124-5 | Poucos estudos de alto nível sobre CrossFit; adesão e motivação altas. Lembra o risco de lesão sem progressão de carga. | Honestidade sobre a força da evidência | resumo conferido |
| Lesões no CrossFit, *German J Sports Med* 2021 (nº 7) | Taxa de lesão comparável a levantamento de peso e powerlifting. | Segurança do formato | resumo conferido |
| HIFT em atletas, *PLOS ONE* 2024. doi:10.1371/journal.pone.0295531 | Efeitos positivos em força, potência e desempenho específico. | Método funcional de alta intensidade | resumo conferido |
| Kettlebell: revisão NSCA 2014; scoping review *BMC Sports Sci Med Rehabil* 2019. doi:10.1186/s13102-019-0130-z; Falatic et al. 2015, *J Strength Cond Res* 29:1943-7. doi:10.1519/JSC.0000000000000845 | Melhora a potência; força e aptidão aeróbica têm evidência equívoca; snatch 15s/15s elevou VO2máx. | Swing/snatch nas coletivas; formato 40'/20' | resumo conferido |

Leitura honesta: o método funcional/CrossFit tem a evidência DIRETA mais fraca; ele se sustenta pelos pilares melhor estudados (força, HIIT, circuito resistido).

## 5. Lacunas (ainda sem fonte)
- Mobilidade e ativação (aquecimento); cadência lenta 3-1-1 / tempo sob tensão (tensional); teste de 3 km e avaliação física; gestão de carga de corrida e lesão; core (Pallof, prancha lateral); idosos/retorno; livros-base (ver abaixo).

## 6. Repertório técnico e decisões
- Exercícios: biblioteca do MOVH (banco `exercicios`; o agente prefere os exercícios dela).
- Decisões datadas do método: CONTEXTO.md §0 e §12. Este arquivo não duplica.

## 7. Entrada de fontes (fluxo)
1. Candidatas caem em `docs/leituras/inbox.md` (título, link/DOI, 1 linha de por quê).
2. Revisão mensal com o professor: aprovar, descartar ou pedir texto completo.
3. Aprovadas entram nas tabelas acima com status; o que mudar de regra vai antes para o CONTEXTO.md §0 e depois para o código.
4. Livros: guardar só resumo próprio com capítulo/página; não copiar trechos.

## Diário de leitura (acrescentar no topo)
- 14/11/2026: progressão de iniciantes na corrida (lacuna "gestão de carga"): NHS Couch to 5K, Buist 2008 (RCT, regra dos 10% não reduziu lesão), Nielsen 2014 (coorte, >30% em 2 sem sem diferença significativa). Lidos por resumo; detalhe em `docs/jornada-aluno.md` seção 4.
- 09/11/2026: primeira curadoria (14 áreas de fonte acima). Nenhum texto completo lido.
