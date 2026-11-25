#!/usr/bin/env bash
# Publica o app do aluno no repo `movh` (push direto no main = 1 deploy no Netlify, ~15 créditos).
# Uso (raiz do MovhGen): bash tools/release.sh [CLONE_DO_MOVH] [--push] [-m "mensagem"]
#   sem --push = ensaio (nada é commitado nem enviado). Trailer de atribuição: export MOVH_TRAILER=$'Co-Authored-By: ...'
#   --pages = publica SÓ as pastas personal/ e coletivas/ (+ .nojekyll) com [skip netlify]: vai para o GitHub Pages (https://lguilh3rme.github.io/movh/...), NÃO gasta crédito Netlify e não mexe no app do aluno.
cd "$(dirname "$0")/.." || exit 1
M=/home/claude/movh; PUSH=0; PAGES=0; MSG="app do aluno"
while [ $# -gt 0 ]; do case "$1" in --push) PUSH=1;; --pages) PAGES=1;; -m) shift; MSG=$1;; *) M=$1;; esac; shift; done
[ -d "$M/.git" ] || { echo "ERRO: clone do movh não encontrado em $M (add_repo push + git clone --depth 1)"; exit 1; }
X=/tmp/movh_release; rm -rf "$X"; mkdir -p "$X"
node tools/export_app.js index.html tools/config.json "$X/app.html" | tail -1 || exit 1
BUILD=$(grep -o "A_BUILD = '[^']*'" "$X/app.html" | cut -d"'" -f2); VJ=$(grep -o '"build":"[^"]*"' "$X/version.json" | cut -d'"' -f4)
[ "$BUILD" = "$VJ" ] && echo "OK A_BUILD == version.json ($BUILD)" || { echo "ERRO: A_BUILD ($BUILD) != version.json ($VJ)"; exit 1; }
VER=$(grep -o "MOVH_VER = '[^']*'" index.html | cut -d"'" -f2)
PUB=$(git -C "$M" show HEAD:version.json 2>/dev/null | grep -o '"build":"[^"]*"' | cut -d'"' -f4)
echo "Gerador $VER | publicado: ${PUB:-?} | novo: $BUILD"
IGUAL=1
for f in personal/index.html personal/manifest.webmanifest personal/sw.js coletivas/index.html coletivas/manifest.webmanifest coletivas/sw.js icons/personal-512.png icons/coletivas-512.png; do cmp -s "$X/$f" "$M/$f" || IGUAL=0; done
[ -f "$M/.nojekyll" ] || IGUAL=0
if [ $PAGES = 0 ]; then cmp -s "$X/app.html" "$M/index.html" || IGUAL=0; cmp -s "$X/_redirects" "$M/_redirects" || IGUAL=0; fi
if [ $IGUAL = 1 ]; then echo "IDÊNTICO: nada a publicar (não gasta crédito)"; exit 0; fi
if [ $PUSH = 0 ]; then echo "ENSAIO: mudou (publicaria $BUILD${PAGES:+, modo $([ $PAGES = 1 ] && echo só-Pages)}). Rode com --push para publicar."; exit 0; fi
if [ $PAGES = 0 ]; then cp "$X/app.html" "$M/index.html"; cp "$X/version.json" "$X/sw.js" "$X/manifest.webmanifest" "$X/_redirects" "$M/"; fi
mkdir -p "$M/icons" "$M/personal" "$M/coletivas"; cp -r "$X/icons/." "$M/icons/"; cp -r "$X/personal/." "$M/personal/"; cp -r "$X/coletivas/." "$M/coletivas/"; touch "$M/.nojekyll"
rm -f "$M/manifest-personal.webmanifest" "$M/manifest-coletivas.webmanifest"
[ $PAGES = 1 ] && MSG="[skip netlify] $MSG"
git -C "$M" add -A
git -C "$M" commit -q -m "$VER: $MSG${MOVH_TRAILER:+

$MOVH_TRAILER}" || exit 1
git -C "$M" fetch -q origin main && git -C "$M" rebase -q origin/main || exit 1
git -C "$M" push origin HEAD:main 2>&1 | grep -E "main|rejected|error"
if [ $PAGES = 1 ]; then echo "PUBLICADO (só Pages, sem Netlify) em $(git -C "$M" rev-parse --short HEAD): https://lguilh3rme.github.io/movh/coletivas/ e .../personal/"; else echo "PUBLICADO $BUILD em $(git -C "$M" rev-parse --short HEAD). Confira Netlify > Deploys: Production main@$(git -C "$M" rev-parse --short HEAD)"; fi
