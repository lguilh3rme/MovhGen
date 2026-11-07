---
name: movh-gerador
description: >
  Skill para manutenção e evolução do MOVH_Gerador — arquivo HTML single-file (~6000 linhas)
  que exporta o index.html (app do aluno). Use sempre que o usuário mencionar bugs, melhorias,
  novas features ou qualquer alteração no Gerador ou no index.html exportado. Cobre: fixes de
  escaping em template literals, diff cirúrgico em arquivos grandes, tradução i18n, banners de
  renovação, fluxo de login do aluno, exportarComLogin(), e problemas de sintaxe JS no arquivo
  exportado.
---

# MOVH Gerador — Skill de Manutenção

## Stack

| Camada | Detalhe |
|--------|---------|
| Frontend | HTML/CSS/JS puro, single-file |
| Gerador | `MOVH_Gerador_vNN.html` (~6000 linhas) |
| App aluno | `index.html` exportado por `exportarComLogin()` |
| Backend | Supabase `cfanjhuzrcgxrbfmhahi` |
| Tabelas principais | `professores`, `alunos`, `protocolos`, `registros_sessao`, `anamneses` |
| Auth professor | `mbClient` (storageKey: `movh-professor-auth`) |
| Auth aluno | `aClient` (storageKey: `movh-aluno-auth`) |
| Professor | lguilh3rme@gmail.com · id: `750da6f3-4210-40d9-9f7e-9c328ec2fc9b` |

---

## Regra #1 — Trabalhar sempre por diff

O arquivo tem ~6000 linhas. **Nunca reescrever do zero.** Sempre:

1. Localizar a linha exata com `grep -n` ou `sed -n 'N,Mp'`
2. Confirmar o conteúdo antes de editar
3. Fazer a alteração mínima necessária (substituição cirúrgica com Python bytes ou `str_replace`)
4. Verificar o resultado após a edição

---

## Regra #2 — Escaping em template literals (`exportarComLogin`)

A função `exportarComLogin()` usa um template literal backtick (`` ` ``) que vai da linha ~4479
até ~6103. **Todo JS que aparece dentro desse template é texto, não código** — o JS só executa
no browser quando o aluno abre o `index.html` exportado.

### Tabela de conversão de escaping

| Nível | Onde | O que quer dizer `\'` | O que quer dizer `\\'` |
|-------|------|-----------------------|------------------------|
| Arquivo Gerador | Dentro do template literal | `'` (char único) | `\'` no output |
| index.html exportado | JS do browser | `'` (char único dentro de string single-quoted) | — |

**Regra prática:** Para que o `index.html` contenha `\'` (que o browser interpreta como aspas
simples escapadas dentro de uma string JS), o template no Gerador precisa ter `\\'`.

### Exemplo clássico de bug (botão de renovar)

```
# ERRADO no template (gera '' no index.html → SyntaxError no browser)
onclick=\"window.open(\'' + url + '\','_blank')\"

# CORRETO no template (gera \' no index.html → JS válido)
onclick=\"window.open(\\'' + url + '\\','_blank')\"
```

Para verificar o que está no arquivo em bytes:
```bash
python3 -c "
with open('MOVH_Gerador_vNN.html','rb') as f: c = f.read()
idx = c.find(b'window.open(')
print(list(c[idx:idx+20]))
# 92=backslash, 39=single-quote
"
```

Para fazer fix por bytes (mais seguro que str_replace para este caso):
```python
broken = b"onclick=\"window.open(\\'' + url + '\\',"
fixed  = b"onclick=\"window.open(\\\\'' + url + '\\\\',"
content = content.replace(broken, fixed, 1)
```

---

## Regra #3 — Fluxo de login do aluno (index.html)

```
aDoLogin()
  → aClient.auth.signInWithPassword()
  → aBoot(session)
    → aEnsureAlunoRow(user)   ← busca por auth_id, depois email, cria se não achar
    → verifica: ativo, acesso_fim, anamnese, PAR-Q
    → busca protocolo ativo
    → aRenderProtocolo(proto)
```

Se o login some sem mensagem de erro → provavelmente SyntaxError em JS causado por escaping
quebrado (ver Regra #2).

---

## Regra #4 — i18n / tradução

Strings traduzíveis ficam em dois lugares:

**Landing page** (dentro do template em `exportarComLogin`):
```js
MOVH_CONFIG.i18n = {
  pt: { plLabel:'Planos', access:'dias de acesso', popular:'⭐ Mais popular', ... },
  en: { plLabel:'Plans', access:'days access',    popular:'⭐ Most popular', ... }
}
function t(k){ return MOVH_CONFIG.i18n[lang]?.[k] ?? MOVH_CONFIG.i18n.pt[k] ?? k; }
```

**App do aluno** (também dentro do template):
```js
function aT(k){ return MOVH_STRINGS[aLang]?.[k] ?? MOVH_STRINGS.pt[k] ?? k; }
```

**Nomes dos planos** (`p.nome`) — vêm de `MOVH_CONFIG.planos` e **não** passam pela função
`t()`. Para traduzir, precisa de campo `nomeEn` no objeto plano e lógica no card:
```js
const nomePlano = (lang === 'en' && p.nomeEn) ? p.nomeEn : p.nome;
```

---

## Workflow padrão de fix

```
1. Receber descrição do bug
2. grep -n 'palavra-chave' arquivo | head -20   ← localizar
3. sed -n 'N,Mp' arquivo                        ← ler contexto
4. cp arquivo /home/claude/MOVH_Gerador_vNN.html  ← copiar para edição
5. python3 fix.py                               ← aplicar diff mínimo
6. Verificar resultado com sed ou python
7. cp para /mnt/user-data/outputs/
8. present_files
```

---

## Localizações frequentes (atualizar conforme versão)

| Função | Linha aprox. (v40) |
|--------|--------------------|
| `exportarComLogin()` início | 4478 |
| Template literal início | 4479 |
| `aShowTelARenovar()` | 4970 |
| `btnRenovar` (botão de renovar) | 4985 |
| Template literal fim (`</html>`) | ~6103 |
| `aBoot()` / `aRenderProtocolo()` | 5825–5845 |
| `MOVH_CONFIG` na landing | 6597 |
| `i18n` objeto | 6605 |
| Renderização dos cards de plano | 6777–6795 |
| Defaults dos planos (`PL_PROTO_DEFAULT`) | 6184–6186 |

---

## Checklist antes de entregar

- [ ] Arquivo editado é cópia em `/home/claude/`, não o upload original
- [ ] Fix foi feito por substituição de bytes ou str_replace pontual
- [ ] Para fixes de escaping: simulou os 3 níveis (template → index.html → browser)?
- [ ] Verificou com `sed -n 'Np'` que o resultado ficou correto
- [ ] Versão bumped (v39 → v40 → v41…)
- [ ] `present_files` chamado no final
