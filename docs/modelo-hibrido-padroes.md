# Modelo "Híbrido por padrões" + ênfases (proposta, 17/11/2026)

Origem: o jeito do dono de montar o treino no Google Docs (aba "Coletivas BT" do doc "Personal controle"):
por **padrão de movimento e dominância**, em blocos (Ativação · Força · Metabólico · Core/Cardio), estilo híbrido/cross/Hyrox.
Não é treino por músculo/estética.

## Semana-base (5 dias)
| Dia | Padrão | Dominância | Fecho |
|---|---|---|---|
| Seg | Empurrar | superior | Core ou Cardio |
| Ter | Pernas | joelho (agachar, split, extensão) | Metabólico |
| Qua | Puxar | superior | Core ou Cardio |
| Qui | Pernas | quadril (terra, flexora, elevação pélvica) | Metabólico |
| Sex | Superior misto (empurrar + puxar) | superior | Core |

Metabólico (Ter e Qui) = protocolo repetido: aquecimento 6 min bike/eliptico/esteira, "2 lento 3 forte 1 desacelerando",
depois 1x6 thruster/remador/lunge alt/kbswing com remo 15/20 cal, por fim 3x20 a 15 for time da mesma série.
Candidato a **protocolo reutilizável** (bloco nomeado inserido por chip).

## Ideias combinadas
1. **Modelo-base seu** com esse esqueleto (hoje nenhum modelo é assim: PPL/ABCDE são por músculo; Tensional é Upper/Lower/Full; Metabólico é full body em circuito).
2. **Ênfases como camada**, não modelos separados: ênfase glúteo (reforça quadril/elevação pélvica na quinta, acessório na terça) e
   ênfase superior (mais puxar/empurrar + acessório no fecho). Modelos puros (Glúteos, ABCDE MMII/Upper) continuam para estética.
3. **Progressão por padrão** dentro das fases decididas (Base · Construção · Consolidação, 12 semanas, ver `jornada-aluno.md`):
   Base = técnica + volume moderado + metabólico curto; Construção = carga/volume; Consolidação = intensidade/testes.
   Escada por padrão (ex.: bilateral → unilateral; horizontal → vertical).
4. **Apresentação com o vocabulário do dono**: dia pelo padrão ("Empurrar", "Pernas · joelho"), bloco pelos chips, fase em palavras, sem siglas.

## O que o banco já tem / falta (levantado em 17/11)
- Categorias do banco: Squat, Hinge, Glúteo, Unilateral, Lower Acessórios, Push H/V, Peitoral Isolado, Pull H/V, Ombro/Escapular, Bíceps, Tríceps,
  Carries & Compostos, Core Base/Dinâmico/Rotação/Estratégico, Mobilidade, CrossFit Ginástica/Levantamento, Mono Estrutural.
- Dominância é implícita (Squat/Unilateral = joelho; Hinge/Glúteo = quadril); **não há campo explícito**.
- `colPadraoDia`/`colSemanaResumo` (v64.8/v64.9) ainda **não contam** Carries, CrossFit e Mono Estrutural (lado híbrido) nem separam joelho × quadril.
- Títulos de dia no Docs do dono ainda desencontrados do conteúdo (Ter "Superiores" mas é joelho; Qua "Inf. Ant" mas é puxar); o aviso do Gerador pega isso.

## Decisões pendentes (dono)
- [ ] Por onde começar: (a) modelo-base + ênfases (só Gerador, sem deploy) ou (b) apresentação do Caminho/tela confusa (dono indica a tela ou manda print).
- [ ] Nome do modelo (sugestão: "Híbrido por padrões").
- [ ] Vocabulário final dos dias (sugestão: Empurrar · Pernas joelho · Puxar · Pernas quadril · Superior misto).
- [ ] Contar híbrido (Carries/CrossFit/Mono) e separar joelho×quadril no painel da semana (melhoria pequena, só Gerador).
