# Escada por padrão (proposta, 17/11/2026) — meso: progressão técnica e de estímulo

Nada aplicado ao código nem ao banco. Fonte dos nomes: tabela `exercicios` do Supabase (167 exercícios, consultada em 17/11).
Estado do banco: `padrao_movimento` está vazio (só 1 linha), `percentual_rm` vazio, não existe campo de nível. Por isso a escada precisa de um parâmetro explícito.

## Três níveis de progressão
- **Micro (semana a semana):** mesmo exercício, mesma técnica; sobe repetição dentro da faixa, depois carga (progressão dupla, RIR 2). Semanas 4, 8 e 12 assentam.
- **Meso (etapa de ~4 semanas):** troca a VARIANTE do exercício por uma mais exigente (esta escada) ou a valência (técnica → carga/volume → intensidade). Regra: uma coisa por vez; exercícios-âncora mantidos para comparar.
- **Macro (jornada):** programa de 12 semanas + Ciclo 2 (Construção 8 + Consolidação 4, sem voltar à Base), com reavaliação e Mapa 2 entre ciclos; o objetivo do aluno decide a ênfase do ciclo seguinte.

## Níveis dos exercícios
- **N1 Aprender:** guiado, máquina, apoio ou peso corporal simples; baixa demanda de estabilidade.
- **N2 Construir:** carga livre ou unilateral guiada; demanda moderada de estabilidade e coordenação.
- **N3 Desafiar:** barra, unilateral livre, maior amplitude ou coordenação.
- **N4 Avançado:** só quando o aluno pede ou domina o N3.

## Escada por padrão (v2, 17/11: 13 padrões; nomes como estão no banco; * = falta no banco)
| Padrão | N1 | N2 | N3 | N4 |
|---|---|---|---|---|
| Agachar (joelho) | Goblet Squat Heels Elevated; Leg Press; Agachamento Hack; Sumo Squat KB; Spanish Squat VMO; *Agachamento na caixa | Back Squat; Front Squat; Step Up; Split Squat Smith; Recuo Alternado no Smith; Bulgaro Guiado(Smith); Leg Press Unilateral | Reverse Lunge; Afundo; Split Lunges; Bulgarian Split Squat; Cossack Squat; Bulgarian Hipertrofia 2/3; Lunge Thruster | Box Pistol; Back Squat 1½ |
| Quadril (hinge) | Pull-through no Cabo; Hiperextensão Lombar | RDL; Stiff; Good Morning | RDL Barra; Romanian Deadlift Hip 2/3; Deadlift; Deadlift Sumo | RDL DB Single Leg |
| Isquiotibiais (flexão de joelho) | Cad. Flexora; Mesa Flexora | Flexora Unilateral; Mesa Flexora Unilateral | GHD Raises | Nordic Curl |
| Glúteo | Glute Bridge; Elevação Pélvica Máquina; Coice Polia Alta; Extensão Glu Polia | Hip Thrust | Hip Thrust Unilateral; Gluteo 4 apoios (caneleira) | — |
| Empurrar horizontal | Supino Maquina; Supino Inclinado Máquina; *Flexão inclinada | DB Press; Supino Inclinado; Chest Press DB Single Arm | Bench Press; Supino Pegada Fechada; Deficit Push Up | Ring Dip Strict |
| Empurrar vertical | Desenvolvimento Máquina | Shoulder Press DB; Arnold Press | Landmine Press; Z Press; Push Press | KB Bottom Up Press; HSPU Strict |
| Puxar vertical | Puxada Neutra; Puxada Alta | *Barra fixa com elástico | Chin-Up; Pull-Up Strict | L-Sit Pull-Up; Pull Up CTB |
| Puxar horizontal | Remada Máquina; Remada Baixa no Cabo | Remada Unilateral; DB Row; Remada Curvada DB; Ring Row; Chinese Row | Remada Cavalinho T-Bar; Barbell Row; Pendlay Row | Renegade Row; See Saw Row |
| Core: anti-extensão e flexão | Dead Bug; Bird Dog; Prancha; Hollow Hold | Hollow Rock; Leg Raise | Ab Rolinho; V-Ups; L-Sit Hold; Hollow Pullover | Strict TTB; Toes to Bar |
| Core: anti-rotação, rotação e lateral | Prancha lateral c/ joelho apoiado; Plank Shoulder Tap | Pallof Press; Prancha com Rotação; Russian Twist | Plank Toe Touch; GHD Oblique Crunches | GHD Torture Twist |
| Carregar | Farmer Carry | Suitcase Carry | OH Walk | — |
| Potência (explosivo) | KB Swing; Jump Squat | Box Jump; Wall Ball | Clean; Snatch | Jerk |
| Locomoção e condicionamento (cíclicos) | Elíptico; Esteira Inclinada; Remo Ergômetro | Bike Assault/Ergômetro; Pular Corda; (Meio Burpee) Sprawn +  Recuo | Burpee; Escalador(M. Climber) | — |

## Cobertura (v2)
- **Dominantes:** joelho, quadril, empurrar (H/V), puxar (H/V), carregar, core. As 4 lacunas da v1 viraram padrões: **isquio** (flexão de joelho saiu do quadril: Mesa Flexora e Nordic Curl), **core_rot** (anti-rotação/rotação/lateral saiu do core: Pallof, Prancha com Rotação), **potência** (swing, saltos, clean, snatch) e **locomoção** (remo, bike, corda, burpee).
- **Subdivisões:** quadril = dobradiça (hinge) × glúteo × isquio; joelho = bilateral (N1–N2) × unilateral (N2–N4); core = anti-extensão/flexão × anti-rotação/lateral (função, não "abdominal"); empurrar e puxar = horizontal × vertical.
- **Fora da escada (micro):** acessórios (bíceps, tríceps, ombro, panturrilha, adutora/abdutora), mobilidade e ginástica avançada (muscle up, rope climb, HSPU kipping).
- Ênfases: Glúteo sobe também isquio; Emagrecimento sobe também locomoção. Teste: `tools/tests/escada.py` (12 OK).

## Trilhas sem troca de exercício (o degrau é volume, modelo e intensidade, não o nome)
Valem para corrida e condicionamento: o motor `CP_*`/`PF_COND` já progride (ciclos 3+1, +8%/sem, 2º ciclo +12%, teto +30%); o degrau abaixo diz **o que entra** e **quando**.
| Trilha | N1 Aprender | N2 Construir | N3 Desafiar | N4 Avançado |
|---|---|---|---|---|
| Corrida | Caminhada-corrida (+1 min correndo por ciclo) | Contínuo fácil Z1–Z2 (20–40 min) e regenerativo | Longão e fartlek (1 sessão de qualidade por semana) | Tempo/limiar e intervalado (pace do teste de 3 km) |
| Condicionamento | Cíclico contínuo leve (elíptico, remo, esteira) em Z2 | Intervalado 40/20, circuito resistido, bike/corda | Intervalos ≥2 min (HIIT), EMOM/AMRAP funcional | Metcon com barra e ginástica, sprints |
| Híbrido (força + corrida) | Força 3×/sem + corrida fácil 1–2×/sem | Corrida em dia separado das pernas pesadas | 1 qualidade na corrida, sem tiro no dia anterior de perna | Duas qualidades por semana só com RPE ≤8 e sem dor |
Regras: qualidade só depois de 1 fase inteira em Fácil e teste de 3 km ≤8 sem; aderência <60% ou dor recua; volume de corrida limitado na fase de força.

## Fontes por padrão (status honesto)
- **Conferidas na `base-teorica.md` (resumo lido):** ACSM 2026 (progressão e individualização); Schoenfeld 2017, Robinson 2024, Pelland 2026 (volume e proximidade da falha); Huiberts 2024 e Wilson 2012 (híbrido); Stöggl e Sperlich 2015 e meta-análise de HIIT 2019 (corrida e intervalos); Ramos-Campo 2021, Claudino 2018, HIFT 2024, NSCA 2014 e Falatic 2015 (circuito, funcional, kettlebell).
- **A confirmar:** Schumann 2022 (concorrente sem prejuízo de hipertrofia; fonte secundária).
- **De memória, não reabertas (usar como prática, não como prova):** padrões de movimento (Boyle, *Advances in Functional Training*; Cook, *Movement*, articulação a articulação; Dan John, cinco movimentos humanos); core por função (McGill: anti-extensão, anti-rotação, anti-flexão lateral); corrida (Daniels, *Running Formula*, zonas pelo VDOT; Seiler, distribuição ~80/20). Antes de citar a aluno, conferir.
- A ordem das variantes dentro de cada padrão continua sendo parâmetro do MOVH, sem validação direta na literatura.

Acessórios (bíceps, tríceps, ombro/escapular, panturrilha, adutora/abdutora) não entram na escada: seguem micro (repetição e carga).

## Regras de subida e descida
- **Sobe um degrau** quando bateu o topo da faixa em 2 sessões seguidas, com RIR 2 ou mais, sem dor e com técnica ok (o professor confirma).
- No máximo 1 a 2 trocas de variante por treino e 1 padrão por vez (uma coisa por vez).
- **Desce** se a técnica cair, houver dor ou RPE 9 ou mais por 2 sessões.
- Por etapa: Base = N1 (N2 se já treina); Construção = N2 nos principais e N3 em 1 padrão; Consolidação = mantém e sobe carga (testes), sem trocar variante de novo.
- Ênfases (glúteo, superior) sobem o degrau do padrão ENFATIZADO primeiro.

## Base e honestidade da evidência
- Progressão de sobrecarga e individualização por adesão: ACSM (posicionamento de 2009 e atualização de 2026, na `base-teorica.md`).
- Periodizado × não periodizado: pequena vantagem do periodizado (Williams 2017, na `base-teorica.md`). Entre linear e ondulado as diferenças são pequenas ou nulas (de memória, a conferir antes de citar).
- A escada em si (níveis e ordem das variantes) NÃO tem validação na literatura: é prática e princípios gerais (carga progressiva, especificidade, estabilidade crescente). Tratar como parâmetro do MOVH, revisável com os dados dos alunos (`registros_sessao`, `rpe_sessoes`).

## O que falta cadastrar no banco (complemento)
As 4 novas trilhas funcionam por nome (sem SQL); `padrao_movimento` dos novos padrões (isquio, core_rot, potencia, locomocao) só entra no banco com autorização. Cadastrar: Agachamento na caixa, Flexão inclinada, Barra fixa com elástico, Thruster (o Metabólico do Híbrido usa; hoje só existe Lunge Thruster) e, se quiser, Remada no banco inclinado. Vídeo: nenhum é seu ainda (ver lista de gravação).

## Como entra no sistema (sem deploy do app)
1. Banco (SQL idempotente, precisa de autorização dele): preencher `padrao_movimento` pelas categorias/nomes acima e criar a coluna `nivel smallint`.
2. Gerador: constante `ESCADA` (padrão → níveis → nomes) usada por `mbSugerirProximaFase`; botão ✨ Próxima fase sugere o degrau seguinte quando a regra de subida for atendida (usa `registros_sessao` e `rpe_sessoes`).
3. Painel da semana usa `padrao_movimento` explícito (hoje deduz por categoria/nome) e passa a mostrar o nível médio do dia.
4. Agente `movh-treino` lê este arquivo.
