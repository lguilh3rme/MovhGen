# MOVH Gerador

- `index.html` — o Gerador (painel do professor). Publicado em movhgen.netlify.app.
- `tools/export_app.js` — gera o `index.html` do app do aluno (repo `movh`, movh.netlify.app) a partir do Gerador. Mesmo resultado do botão "Exportar".
- `tools/config.json` — dados que entram na exportação: `netlifyUrl` (URL da landing de planos) e `logo` (data URI; vazio = logo padrão).

## Atualizar o app do aluno
```
node tools/export_app.js index.html tools/config.json ../movh/index.html
```
Depois: commit + push no repo `movh` (o Netlify republica sozinho).
