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

## Escada por padrão (nomes como estão no banco; * = falta no banco)
| Padrão | N1 | N2 | N3 | N4 |
|---|---|---|---|---|
| Agachar (joelho) | Goblet Squat Heels Elevated; Leg Press; Agachamento Hack; Sumo Squat KB; *Agachamento na caixa | Back Squat; Front Squat; Step Up; Split Squat Smith; Recuo Alternado no Smith; Bulgaro Guiado (Smith) | Reverse Lunge; Afundo; Split Lunges; Bulgarian Split Squat; Cossack Squat | Box Pistol; Back Squat 1½ |
| Quadril (hinge) | Pull-through no Cabo; Hiperextensão Lombar; Mesa Flexora | RDL; Stiff; Good Morning | RDL Barra; Romanian Deadlift Hip 2/3; Deadlift; Deadlift Sumo | RDL DB Single Leg; Nordic Curl |
| Glúteo | Glute Bridge; Elevação Pélvica Máquina; Coice Polia Alta; Extensão Glu Polia | Hip Thrust | Hip Thrust Unilateral; Gluteo 4 apoios (caneleira) | — |
| Empurrar horizontal | Supino Maquina; Supino Inclinado Máquina; *Flexão inclinada | DB Press; Supino Inclinado; Chest Press DB Single Arm | Bench Press; Supino Pegada Fechada; Deficit Push Up | Ring Dip Strict |
| Empurrar vertical | Desenvolvimento Máquina | Shoulder Press DB; Arnold Press | Landmine Press; Z Press; Push Press | KB Bottom Up Press |
| Puxar vertical | Puxada Neutra; Puxada Alta | *Barra fixa com elástico | Chin-Up; Pull-Up Strict | L-Sit Pull-Up; Pull Up CTB |
| Puxar horizontal | Remada Máquina; Remada Baixa no Cabo | Remada Unilateral; DB Row; Remada Curvada DB | Remada Cavalinho T-Bar; Barbell Row; Pendlay Row | Renegade Row; See Saw Row |
| Core | Dead Bug; Bird Dog; Prancha; Hollow Hold | Prancha com Rotação; Pallof Press; Hollow Rock; Leg Raise | Ab Rolinho; V-Ups; L-Sit Hold; Hollow Pullover | Strict TTB; Toes to Bar |
| Carregar | Farmer Carry | Suitcase Carry | OH Walk | — |

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
Agachamento na caixa, Flexão inclinada, Barra fixa com elástico, Thruster (o Metabólico do Híbrido usa; hoje só existe Lunge Thruster) e, se quiser, Remada no banco inclinado. Vídeo: nenhum é seu ainda (ver lista de gravação).

## Como entra no sistema (sem deploy do app)
1. Banco (SQL idempotente, precisa de autorização dele): preencher `padrao_movimento` pelas categorias/nomes acima e criar a coluna `nivel smallint`.
2. Gerador: constante `ESCADA` (padrão → níveis → nomes) usada por `mbSugerirProximaFase`; botão ✨ Próxima fase sugere o degrau seguinte quando a regra de subida for atendida (usa `registros_sessao` e `rpe_sessoes`).
3. Painel da semana usa `padrao_movimento` explícito (hoje deduz por categoria/nome) e passa a mostrar o nível médio do dia.
4. Agente `movh-treino` lê este arquivo.
