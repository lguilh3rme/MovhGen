#!/usr/bin/env bash
# Publica o app do aluno no repo `movh` (push direto no main = 1 deploy no Netlify, ~15 créditos).
# Uso (raiz do MovhGen): bash tools/release.sh [CLONE_DO_MOVH] [--push] [-m "mensagem"]
#   sem --push = ensaio (nada é commitado nem enviado). Trailer de atribuição: export MOVH_TRAILER=$'Co-Authored-By: ...'
cd "$(dirname "$0")/.." || exit 1
M=/home/claude/movh; PUSH=0; MSG="app do aluno"
while [ $# -gt 0 ]; do case "$1" in --push) PUSH=1;; -m) shift; MSG=$1;; *) M=$1;; esac; shift; done
[ -d "$M/.git" ] || { echo "ERRO: clone do movh não encontrado em $M (add_repo push + git clone --depth 1)"; exit 1; }
X=/tmp/movh_release; rm -rf "$X"; mkdir -p "$X"
node tools/export_app.js index.html tools/config.json "$X/app.html" | tail -1 || exit 1
BUILD=$(grep -o "A_BUILD = '[^']*'" "$X/app.html" | cut -d"'" -f2); VJ=$(grep -o '"build":"[^"]*"' "$X/version.json" | cut -d'"' -f4)
[ "$BUILD" = "$VJ" ] && echo "OK A_BUILD == version.json ($BUILD)" || { echo "ERRO: A_BUILD ($BUILD) != version.json ($VJ)"; exit 1; }
VER=$(grep -o "MOVH_VER = '[^']*'" index.html | cut -d"'" -f2)
PUB=$(git -C "$M" show HEAD:version.json 2>/dev/null | grep -o '"build":"[^"]*"' | cut -d'"' -f4)
echo "Gerador $VER | publicado: ${PUB:-?} | novo: $BUILD"
if cmp -s "$X/app.html" "$M/index.html"; then echo "IDÊNTICO: nada a publicar (não gasta crédito)"; exit 0; fi
if [ $PUSH = 0 ]; then echo "ENSAIO: o app mudou (publicaria $BUILD). Rode com --push para publicar."; exit 0; fi
cp "$X/app.html" "$M/index.html"; cp "$X/version.json" "$X/sw.js" "$X/manifest.webmanifest" "$M/"
cp -r "$X/icons/." "$M/icons/"; cp -r "$X/personal/." "$M/personal/"
git -C "$M" add -A
git -C "$M" commit -q -m "$VER: $MSG${MOVH_TRAILER:+

$MOVH_TRAILER}" || exit 1
git -C "$M" fetch -q origin main && git -C "$M" rebase -q origin/main || exit 1
git -C "$M" push origin HEAD:main 2>&1 | grep -E "main|rejected|error"
echo "PUBLICADO $BUILD em $(git -C "$M" rev-parse --short HEAD). Confira Netlify > Deploys: Production main@$(git -C "$M" rev-parse --short HEAD)"
