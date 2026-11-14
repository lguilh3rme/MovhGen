# Jornada do aluno — decisões de 14/11/2026 (NADA aplicado ao código)

Objetivo: o aluno enxergar UM caminho só (começo, meio e fim), com nomes simples, um primeiro treino pensado e corrida/condicionamento que progride sem jargão. Reaproveita o que existe; não mexe nos motores (`cpPlano`, `PF_COND`, fase `base`) até a implementação.

## Decisões do dono (14/11)
1. Etapas: **Base · Construção · Consolidação** (10h36).
2. **Programa de 12 semanas (3 meses)** (10h37: "ao invés de 16 semanas, pensar em um novo ciclo para quem quiser continuar, sem voltar ao início"). Preços do Programa presencial e trimestral online não mudam.
3. **Acelerar a caminhada-corrida** com base em ciência e prática (seção 4).
4. **Próximo ciclo** para quem continua, sem voltar ao início (seção 6).

## 1. O que já existe (conferido no código)
- Caminho/Mapa (v63.x): 12 sem, marcos 0/4/8/12 (`mbMapaPadrao`); etapa por terços Começo/Meio/Fim (`aCaminhoFase`); marcos chamados "Check 1/2".
- Treino: Adaptação 4 sem (só iniciante/retorno; RPE 5–7, RIR 3–4, 50–65%), Base 8 sem (progressão dupla, RIR 2), Consolidação (hoje cópia da Base).
- Corrida: 7 modelos (`CP_MODELOS`), ciclos 3+1, `PF_COND` (progride/mantém/recua; teste de 3 km ≤ 8 sem).
- Lacunas: (a) Caminho e treino falam línguas diferentes; (b) não há desenho do primeiro treino; (c) teste de 3 km só agendado na semana 12 e `PF_COND` sem teste só MANTÉM; (d) siglas vazam para o texto.

## 2. Jornada única de 12 semanas
| Etapa | Semanas | Técnica por baixo | Marco |
|---|---|---|---|
| Chegada | 0 | Avaliação + Mapa + 1º treino | Fotos, medidas, teste |
| Base | 1–4 | Adaptação (iniciante/retorno) ou calibração com folga RIR 3 (quem já treina) | Check sem 4 |
| Construção | 5–8 | Base técnica (progressão dupla) | Check sem 8 |
| Consolidação | 9–12 | Consolida cargas, afina técnica, entra qualidade na corrida | Testes + reavaliação sem 12 |
| Próximo ciclo | 13+ | Seção 6 | Mapa 2 |
Iniciante: Adaptação 4 + Base 8 = 12; Consolidação é o nome das 4 últimas semanas da Base. Quem já treina: Base 8 + Consolidação 4 (a técnica de cada etapa muda, o nome para o aluno é o mesmo).

## 3. Primeiro treino e os próximos
- Sessão 1 ("treino de chegada"): 35–40 min; mobilidade + 1 exercício por padrão (empurrar, puxar, agachar, dobrar quadril, core), 2 séries sobrando 3–4 repetições; 8–10 min leves de condicionamento. Objetivo: achar a carga, não cansar; registrar carga faz parte (alimenta a progressão dupla).
- Fim da sessão 1: esforço e dor (registros que já existem).
- Semana 1: repetir o mesmo treino ("semana de acerto"); progressão de carga só a partir da semana 2.
- Cabeçalho do dia: "Treino 4 de 36 · Semana 2 de 12 · Base" (36 = treinos/sem × 12, ajusta pelo protocolo).
- Meta do dia: "bata a sua última" (+1 repetição ou mais peso; usa histórico e PR existentes).

## 4. Corrida e condicionamento
Trilhas pela anamnese ("corre com frequência?"):
- **Não corre**: caminhada-corrida acelerada (abaixo). Teste de 3 km (caminhando/trotando) na semana 4.
- **Já corre**: teste na semana 0; contínuo fácil na Base; contínuo + longão na Construção; 1 sessão de qualidade (começar por fartlek) a partir da semana 9, só se: 8 sem em ritmo fácil, teste ≤ 8 sem, sem dor.
- **Testes de 3 km**: sem 0 ou 4, **8** e 12 (o da semana 8 libera a qualidade da 9 pela regra `PF_COND`; o da 12 dá o antes e depois e a partida do ciclo 2).
- Condicionamento que não é corrida (bike, remo, escada, circuito): mesmos modelos e 80% fácil; sem motor novo.
- Medida para o aluno: "tempo correndo sem parar", "distância em 30 min", tempo do 3 km.

### Caminhada-corrida acelerada (proposta)
Hoje (conferido no `cpPlano`, 14/11): corre = 1 + ciclo, anda = 2, repetições = duração base ÷ 3 (7 para 20 min). O minuto a mais por ciclo também estica a sessão: 21 min (sem 1–4) → 28 (5–8) → 35 (9–12), com tempo correndo total 7 → 14 → 21 min.
Proposta: **+1 min correndo por semana de carga**, semanas 4, 8 e 12 repetem a anterior (assentam); duração total da sessão FIXA na duração base (ex.: 25–30 min) e repetições recalculadas (reps = duração ÷ (corre + anda)), então a caminhada diminui sozinha. Muda `cpPlano` (ramo caminhada) nas duas cópias (Gerador e template do app).
Tempo correndo por série: sem 1: 1 · 2: 2 · 3: 3 · 4: 3 (assenta) · 5: 4 · 6: 5 · 7: 6 · 8: 6 (assenta) · 9: 7 · 10: 8 · 11: 9 · 12: 9 (assenta). Passa a modelo **contínuo** quando fizer 10 min seguidos em 2 sessões (continua no ciclo 2). Dor ou RPE ≥ 9: repete a semana anterior.
Curva de prática moderada, não protocolo validado: mais lenta que o NHS C25K no início e mais rápida que o motor atual.

### Base científica e prática (lida por resumo em 14/11)
| Fonte | O que diz | Uso |
|---|---|---|
| NHS Couch to 5K (healthwell.eani.org.uk/node/2247) | Sem 1: 1 min corre + 1,5 caminha (20 min); sem 5: 20 min contínuos; sem 9: 30 min | Referência de prática para sedentários |
| Buist et al. 2008, *Am J Sports Med* 36(1):33-39 (RCT, 532 novatos) | Programa gradual de 13 sem (regra dos 10%) não reduziu lesões: 20,8% × 20,3% | Ir devagar demais não protege; ~20% de lesão em novatos de qualquer jeito |
| Nielsen et al. 2014, *J Orthop Sports Phys Ther* 44(10):739-747 (coorte, 874 novatos) | >30% de aumento semanal: sem diferença significativa no total; lesões ligadas à distância HR 1,59 (IC 0,96–2,66, p=0,07). Exploratório | Teto: não passar de ~30% de aumento de volume em 2 semanas |
Limites: nenhum valida uma curva específica de caminhada-corrida. Salvaguardas: semanas de assentar, parada por dor, recuo por `PF_COND`.

## 5. Linguagem (aluno nunca vê a sigla; ícone "?" explica)
| Técnico | Para o aluno |
|---|---|
| Adaptação / Base técnica / Consolidação | Base / Construção / Consolidação |
| Deload | Semana leve |
| RIR 2 / RPE 7–8 | "Termine sobrando 2 repetições" |
| Progressão dupla | "Primeiro mais repetições, depois mais peso" |
| Z1–Z2 | "Ritmo de conversa (dá para falar frases curtas)" |
| Intervalado / Tempo run | "Tiros" / "Ritmo forte e firme" |
| Assimilação | "Semana de assentar" |
| Volume | "Séries" |

## 6. Próximo ciclo (quem continua; NÃO volta ao início)
Regra: o ciclo 2 parte de onde o aluno chegou. Reavaliação e testes da semana 12 viram a partida do **Mapa 2** (sem avaliação nova); venda = renovação (R$150, treino novo) ou reativação (R$90) conforme o caso.
- **Não repetir a Adaptação**, salvo pausa longa, dor ou retorno de lesão (regra prática; limite exato de dias parado sem fonte conferida: lacuna). Pausa curta = 1 semana de reacerto (como a semana 1 do ciclo 1).
- **Trocar o estímulo, não recomeçar**: exercícios variados, faixa de repetições diferente da do ciclo anterior e cargas de partida = as do histórico (`mbSugerirProximaFase` já inverte faixas e clona o vigente). Ciclo 2 = 12 sem: 1 reacerto + Construção (sem 2–8) + Consolidação (sem 9–12), com marcos 4, 8 e 12.
- **Cresce o nível**: ao completar o ciclo 1 o aluno passa a ~3 meses de treino consistente; a partir de ~6 meses o ACSM trata como intermediário (faixa mais ampla de cargas, periodizada, com ênfase gradual em cargas mais altas). No MOVH, simples: um ciclo ondulado (reps 8–12 → 6–10 → 12–15) a cada ciclo, sem periodização de atleta.
- **Corrida segue**: parte do patamar da semana 9 do ciclo 1 (regra `PF_COND.semPartida`), não volta ao S1; quem passou a contínuo mantém; qualidade só se os critérios da seção 4 valerem; novo teste na semana 8 do ciclo 2.
- **Decisão por dados** (`PF_COND`): progride = parte do patamar; mantém = repete o patamar; recua = reduz volume 20% e refaz o teste.
- **Semana leve**: semanas 4 e 8 de cada ciclo já assentam (corrida e carga); deload formal só por dor/RPE alto. Fonte de deload NÃO lida (página bloqueada): prática.

### Base científica (lida por resumo em 14/11)
| Fonte | O que diz | Uso |
|---|---|---|
| ACSM 2009, *Med Sci Sports Exerc* (Progression models, posição oficial) | Iniciantes: 8–12 RM, 2–3 dias/sem; intermediários/avançados: 1–12 RM periodizados com ênfase gradual em cargas altas; sobe 2–10% quando faz 1–2 repetições além da meta; intermediário ≈ 6 meses de treino consistente | Progressão dupla e passagem de nível |
| Williams et al. 2017, *Sports Med* 47(10):2083-2100 (meta-análise, 18 estudos) | Periodizado > não periodizado na força máxima (ES 0,43); ondulado favorável; efeito maior em não treinados (moderador) | Variar o estímulo por ciclo; sem periodização complexa |
Limites: lidos por resumo; estudos de força máxima, não de saúde/estética geral.

## 7. Como aplicar (app = 1 deploy só, junto da próxima mudança)
1. Só Gerador: Mapa padrão com marcos 0/4/8/12 nomeados (Base, Construção, Consolidação) e testes de 3 km (0 ou 4, 8, 12); `mbPrograma12` agenda os testes; fase própria "Consolidação" com texto humano; Próxima fase vira "Ciclo 2" (reacerto + Construção 7 sem + Consolidação 4) partindo do histórico e do patamar de corrida; Mapa 2 a partir da reavaliação.
2. Motor: caminhada-corrida acelerada em `cpPlano` (duas cópias) + teste.
3. App (1 deploy): card do Caminho com a etapa e "Treino X de N"; textos de fase e corrida sem siglas; abertura do 1º treino.
4. Gerador: modelo "treino de chegada" ao criar protocolo novo.

## Pendente do dono
- Aprovar a seção 6 (Próximo ciclo) e a ordem da seção 7.
