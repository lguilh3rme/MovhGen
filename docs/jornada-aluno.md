# Jornada do aluno — proposta (14/11/2026, NADA aplicado ao código)

Objetivo: o aluno enxergar UM caminho só (começo, meio e fim), com nomes simples, um primeiro treino pensado e corrida/condicionamento que progride sem jargão. Reaproveita o que já existe; não mexe nos motores (`cpPlano`, `PF_COND`, fase `base`).

## 1. O que já existe (conferido no código)
- Caminho/Mapa (v63.x): 12 semanas, marcos 0, 4, 8 e 12 (`mbMapaPadrao`). A etapa mostrada é Começo/Meio/Fim por terços (`aCaminhoFase`): com 12 sem dá 1–4, 5–8 e 9–12.
- Treino: Adaptação 4 sem (só iniciante/retorno; RPE 5–7, RIR 3–4, 50–65%), Base 8 sem (progressão dupla, RIR 2), Consolidação (hoje só cópia da Base, sem fase própria). Card do aluno já fala "Esforço / Como evoluir / Descanso".
- Corrida: 7 modelos (`CP_MODELOS`), ciclos 3+1 (+8%/sem, sem 4 e 8 assentam), decisão progride/mantém/recua (`PF_COND`), zonas pelo teste de 3 km.
- Lacunas: (a) o Caminho e o treino falam línguas diferentes (Começo/Meio/Fim × Adaptação/Base/Consolidação); (b) não há desenho do primeiro treino (hoje "hoje = 1º treino"); (c) o teste de 3 km só é agendado na semana 12 (`mbPrograma12`), mas `PF_COND` sem teste só deixa MANTER: quem não tem teste nunca progride corrida; (d) siglas (RPE, RIR, Z2, VDOT) vazam para o texto.

## 2. Jornada única (nomes para o aluno)
| Etapa | Semanas | Técnica por baixo | Marco |
|---|---|---|---|
| Chegada | 0 | Avaliação + Mapa + 1º treino | Fotos, medidas, teste |
| Aprender | 1–4 | Adaptação (iniciante/retorno) ou Base com folga maior (RIR 3) | Check sem 4 |
| Construir | 5–8 | Base (progressão dupla) | Check sem 8 |
| Fechar | 9–12 | Consolidação (mantém cargas, entra qualidade) | Testes + reavaliação sem 12 |
| Próximo ciclo | 13+ | Próxima fase | Novo Mapa |
Iniciante: Adaptação 4 sem + Base 8 sem = 12; "Fechar" é só o nome das 4 últimas semanas da Base (a técnica não muda). Assim todo aluno vê as mesmas 3 etapas de 4 semanas.

## 3. Primeiro treino e os próximos
- Sessão 1 ("treino de chegada"): 35–40 min; mobilidade + 1 exercício por padrão (empurrar, puxar, agachar, dobrar quadril, core), 2 séries com folga de 3–4 repetições; condicionamento leve de 8–10 min (caminhada). Objetivo: achar a carga, não cansar. Registrar carga é parte do treino (alimenta a progressão dupla).
- Fim da sessão 1: 2 toques que já existem (esforço e dor); nada novo no banco.
- Semana 1: repetir o mesmo treino 3× ("semana de acerto"). Progressão só a partir da semana 2: topo da faixa em todas as séries com folga → sobe a menor carga.
- Cabeçalho do dia: "Treino 4 de 36 · Semana 2 de 12 · Aprender" (36 = treinos por semana × 12, ajusta pelo protocolo).
- Meta do dia: "bata sua última": +1 repetição ou mais peso (usa histórico de cargas e PR que já existem).

## 4. Corrida e condicionamento (2 trilhas pela anamnese: "corre com frequência?")
- Não corre: caminhada-corrida em Aprender e Construir (+1 min correndo por ciclo, motor atual). Teste de 3 km caminhando/trotando na SEMANA 4 (para liberar zonas e a progressão), de novo na 12.
- Já corre: teste de 3 km na semana 0 e na 12. Aprender = contínuo fácil; Construir = contínuo + longão; Fechar = 1 sessão de qualidade (começar por fartlek, por percepção) só se: 8 semanas em ritmo fácil, teste ≤ 8 sem, sem dor (regra de 09/11).
- Condicionamento que não é corrida (bike, remo, escada, circuito): mesmos modelos e mesma regra de 80% fácil; sem motor novo.
- Medida para o aluno: "tempo correndo sem parar", "distância em 30 min", tempo do 3 km. Sem sigla.
- Em aberto: a caminhada-corrida atual (+1 min por ciclo de 4 sem) é bem conservadora (1 → 3 min correndo em 12 sem). Decidir se acelera; sem fonte conferida aqui (lacuna "gestão de carga de corrida" em `base-teorica.md`).

## 5. Linguagem (aluno nunca vê a sigla; ícone "?" explica)
| Técnico | Para o aluno |
|---|---|
| Adaptação / Base / Consolidação | Aprender / Construir / Fechar |
| Deload | Semana leve |
| RIR 2 / RPE 7–8 | "Termine sobrando 2 repetições" |
| Progressão dupla | "Primeiro mais repetições, depois mais peso" |
| Z1–Z2 | "Ritmo de conversa (dá para falar frases curtas)" |
| Intervalado / Tempo run | "Tiros" / "Ritmo forte e firme" |
| Assimilação | "Semana de assentar" |
| Volume | "Séries" |

## 6. Como aplicar (se aprovado; app = 1 deploy só, junto da próxima mudança)
1. Só Gerador: marcos padrão do Mapa com os nomes novos e teste de 3 km nas semanas 0 ou 4 e 12; `mbPrograma12` agenda o teste da semana 4; fase própria "Consolidação" com texto humano; Próxima fase gera 8+4.
2. App (1 deploy): card do Caminho mostra a etapa (Aprender/Construir/Fechar) e "Treino X de N"; textos de fase e corrida sem siglas; mensagem de abertura do 1º treino.
3. Gerador: modelo "treino de chegada" ao criar protocolo novo (semana 1 = acerto).

## Decisões pendentes do dono
1. Nomes Aprender / Construir / Fechar (ou outros)?
2. Iniciante com 4 adaptação + 8 base e "Fechar" só como rótulo (recomendado) ou programa de 16 semanas?
3. Acelerar a caminhada-corrida (+1 min a cada 2 semanas) ou manter conservadora?
