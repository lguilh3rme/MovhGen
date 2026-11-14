# Jornada do aluno — decisões de 14/11/2026 (NADA aplicado ao código)

Objetivo: o aluno enxergar UM caminho só (começo, meio e fim), com nomes simples, um primeiro treino pensado e corrida/condicionamento que progride sem jargão. Reaproveita o que existe; não mexe nos motores (`cpPlano`, `PF_COND`, fase `base`) até a implementação.

## Decisões do dono (14/11)
1. Etapas: **Base · Construção · [3º nome cortado na mensagem]**. Provisório neste doc: **Fechamento** (confirmar).
2. **Programa de 16 semanas** (não 12).
3. **Acelerar a caminhada-corrida** e preencher a lacuna com ciência e prática (seção 4).

## 1. O que já existe (conferido no código)
- Caminho/Mapa (v63.x): 12 sem, marcos 0/4/8/12 (`mbMapaPadrao`); etapa por terços Começo/Meio/Fim (`aCaminhoFase`).
- Treino: Adaptação 4 sem (só iniciante/retorno; RPE 5–7, RIR 3–4, 50–65%), Base 8 sem (progressão dupla, RIR 2), Consolidação (hoje cópia da Base).
- Corrida: 7 modelos (`CP_MODELOS`), ciclos 3+1 (+8%/sem, sem 4 e 8 assentam), `PF_COND` (progride/mantém/recua; teste de 3 km ≤ 8 sem).
- Lacunas: (a) Caminho e treino falam línguas diferentes; (b) não há desenho do primeiro treino; (c) teste de 3 km só agendado na semana 12 e `PF_COND` sem teste só MANTÉM; (d) siglas vazam para o texto.

## 2. Jornada única de 16 semanas
| Etapa | Semanas | Técnica por baixo | Marco |
|---|---|---|---|
| Chegada | 0 | Avaliação + Mapa + 1º treino | Fotos, medidas, teste |
| Base | 1–4 | Adaptação (iniciante/retorno) ou calibração com folga RIR 3 (quem já treina) | Check sem 4 |
| Construção | 5–12 | Base (progressão dupla, 8 sem) | Check sem 8 e 12 |
| Fechamento | 13–16 | Consolidação: mantém cargas, afina técnica | Testes + reavaliação sem 16 |
| Próximo ciclo | 17+ | Próxima fase | Novo Mapa |
Todo aluno vê as mesmas 3 etapas (4 + 8 + 4). Para quem já treina, a etapa Base é 4 sem de calibração (mesma técnica da Base, folga maior).
Impacto comercial a decidir: o Programa de 12 sem presencial (3 meses, R$1.728/2.448) e o trimestral online passam a 16 sem (4 meses). Opções: cobrar 4 meses (mensal × 4, o Cobrar já aceita 1–3; precisa ir a 4) ou manter 12 sem só para quem já treina.

## 3. Primeiro treino e os próximos
- Sessão 1 ("treino de chegada"): 35–40 min; mobilidade + 1 exercício por padrão (empurrar, puxar, agachar, dobrar quadril, core), 2 séries sobrando 3–4 repetições; 8–10 min leves de condicionamento. Objetivo: achar a carga, não cansar; registrar carga faz parte (alimenta a progressão dupla).
- Fim da sessão 1: esforço e dor (registros que já existem).
- Semana 1: repetir o mesmo treino ("semana de acerto"); progressão de carga só a partir da semana 2.
- Cabeçalho do dia: "Treino 4 de 48 · Semana 2 de 16 · Base" (48 = treinos/sem × 16, ajusta pelo protocolo).
- Meta do dia: "bata a sua última" (+1 repetição ou mais peso; usa histórico e PR existentes).

## 4. Corrida e condicionamento
Trilhas pela anamnese ("corre com frequência?"):
- **Não corre**: caminhada-corrida acelerada (abaixo). Teste de 3 km (caminhando/trotando) na semana 4.
- **Já corre**: teste na semana 0; contínuo fácil na Base; contínuo + longão na Construção; 1 sessão de qualidade (começar por fartlek) a partir da semana 9, só se: 8 sem em ritmo fácil, teste ≤ 8 sem, sem dor.
- **Testes de 3 km a cada 8 semanas**: sem 0 ou 4, **8**, 16 (assim o teste da semana 8 libera a qualidade da 9 pela regra `PF_COND`).
- Condicionamento que não é corrida (bike, remo, escada, circuito): mesmos modelos e 80% fácil; sem motor novo.
- Medida para o aluno: "tempo correndo sem parar", "distância em 30 min", tempo do 3 km.

### Caminhada-corrida acelerada (proposta)
Hoje: +1 min correndo por ciclo de 4 sem (1 → 3 min em 12 sem). Proposta: **+1 min correndo por semana de carga**, semanas 4, 8, 12 e 16 repetem a anterior (assentam); duração total da sessão segue +8%/sem do motor, completada com caminhada.
Tempo correndo por série: sem 1: 1 · 2: 2 · 3: 3 · 4: 3 (assenta) · 5: 4 · 6: 5 · 7: 6 · 8: 6 (assenta) · 9: 7 · 10: 8 · 11: 9 · 12: 9 (assenta) · 13: 10 · 14: 11 · 15: 12 · 16: 12 (assenta). Passa a modelo **contínuo** quando fizer 10 min seguidos em 2 sessões. Dor ou RPE ≥ 9: repete a semana anterior (regra já usada na Base).
Essa curva é prática moderada, não protocolo validado: é mais lenta que o NHS C25K no início e mais rápida que o motor atual.

### Base científica e prática (conferida em 14/11)
| Fonte | O que diz | Uso |
|---|---|---|
| NHS Couch to 5K (página healthwell.eani.org.uk/node/2247) | Semana 1: 1 min corre + 1,5 caminha (20 min); sem 3: blocos de 1,5 e 3 min; sem 5: 20 min contínuos; sem 9: 30 min | Referência de prática para iniciantes sedentários: ritmo mais rápido que o do motor atual |
| Buist et al. 2008, *Am J Sports Med* 36(1):33-39 (RCT, 532 novatos, GRONORUN) | Programa gradual de 13 sem (regra dos 10%) não reduziu lesões: 20,8% × 20,3% (padrão 8 sem) | Ir devagar demais não protege; a taxa de lesão em novatos é ~20% de qualquer jeito |
| Nielsen et al. 2014, *J Orthop Sports Phys Ther* 44(10):739-747 (coorte, 874 novatos) | Aumento >30% da distância semanal: sem diferença significativa no total de lesões; nas lesões ligadas à distância, HR 1,59 (IC 0,96–2,66, p=0,07, não significativo). Autores sugerem aumentos <30% em 2 sem; estudo exploratório | Teto de segurança: não passar de ~30% de aumento de volume em 2 semanas |
Limites: nenhum desses estudos valida uma curva específica de caminhada-corrida; as páginas foram lidas por resumo. Reflexo na regra: semanas de assentar, volume total +8%/sem (bem abaixo de 30% em 2 sem), parada por dor, e o aluno com dor recua (`PF_COND`).

## 5. Linguagem (aluno nunca vê a sigla; ícone "?" explica)
| Técnico | Para o aluno |
|---|---|
| Adaptação / Base / Consolidação | Base / Construção / Fechamento |
| Deload | Semana leve |
| RIR 2 / RPE 7–8 | "Termine sobrando 2 repetições" |
| Progressão dupla | "Primeiro mais repetições, depois mais peso" |
| Z1–Z2 | "Ritmo de conversa (dá para falar frases curtas)" |
| Intervalado / Tempo run | "Tiros" / "Ritmo forte e firme" |
| Assimilação | "Semana de assentar" |
| Volume | "Séries" |

## 6. Como aplicar (app = 1 deploy só, junto da próxima mudança)
1. Só Gerador: Mapa padrão com 16 sem, marcos 0/4/8/12/16 e testes de 3 km (0 ou 4, 8, 16); `mbPrograma12` vira programa de 16 (Base 4 + Construção 8 + Fechamento 4) e agenda os testes; fase própria "Consolidação" com texto humano; Próxima fase gera 8+4; Cobrar com 4 meses.
2. Motor: caminhada-corrida acelerada em `cpPlano` nas DUAS cópias (Gerador e template do app) + teste.
3. App (1 deploy): card do Caminho com a etapa e "Treino X de N"; textos de fase e corrida sem siglas; abertura do 1º treino.
4. Gerador: modelo "treino de chegada" ao criar protocolo novo.

## Pendente do dono
- Nome da 3ª etapa (Fechamento provisório).
- Preço/duração do programa de 16 sem (4 meses) no presencial e online.
