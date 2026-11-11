#!/usr/bin/env bash
# Roda a suíte inteira do MOVH e imprime só o resumo. Uso (da raiz do MovhGen): bash tools/run_all.sh
# Sai com código 1 se alguma contagem divergir do esperado. Detalhe de um teste: bash tools/run_all.sh -v
cd "$(dirname "$0")/.." || exit 1
R=$PWD; T=$R/tools/tests; X=/tmp/movh_run; V=0; [ "$1" = "-v" ] && V=1
mkdir -p "$X/app"; FAIL=0
python3 - "$R/index.html" "$X/big.js" <<'PY' || exit 1
import re,sys
s=open(sys.argv[1],encoding='utf-8').read()
open(sys.argv[2],'w').write(max(re.findall(r'<script[^>]*>(.*?)</script>',s,re.S),key=len))
PY
node --check "$X/big.js" && echo "PASS sintaxe" || { echo "FAIL sintaxe"; exit 1; }
node tools/export_app.js index.html tools/config.json "$X/app/app.html" | tail -1
# kbm.py abre /home/claude/movhgen/index.html
[ "$R" = /home/claude/movhgen ] || ln -sfn "$R" /home/claude/movhgen
chk(){ # nome esperado_ok esperado_fail comando...
  local n=$1 eo=$2 ef=$3; shift 3
  local out; out=$("$@" 2>&1); local o f
  if printf '%s\n' "$out" | grep -q '^OK=[0-9]* FAIL=[0-9]*'; then   # scripts node imprimem "OK=n FAIL=m"
    o=$(printf '%s\n' "$out" | grep -o '^OK=[0-9]*' | tail -1 | cut -d= -f2); f=$(printf '%s\n' "$out" | grep -o 'FAIL=[0-9]*' | tail -1 | cut -d= -f2)
  else o=$(printf '%s\n' "$out" | grep -c 'OK'); f=$(printf '%s\n' "$out" | grep -c '^FAIL'); fi
  if [ "$o" -eq "$eo" ] && [ "$f" -eq "$ef" ]; then echo "PASS $n ($o OK)"; else echo "FAIL $n (OK $o/$eo, FAIL $f/$ef)"; FAIL=1; printf '%s\n' "$out" | grep -i 'FAIL' | head -3 | cut -c1-200; fi
  [ $V = 1 ] && printf '%s\n' "$out" | tail -5
}
chk reg_all 38 0 python3 $T/reg_all.py $R/index.html $T/gpage.py $X
chk bulk 26 0 python3 $T/bulk.py $R/index.html $T/gpage.py $X
chk kbm 20 0 python3 $T/kbm.py
chk prox_fase 8 0 python3 $T/prox_fase.py $R/index.html
chk prox_cond 14 0 python3 $T/prox_cond.py $R/index.html
chk cp_engine 19 0 node $T/cp_engine.js $R/index.html
chk pf_cond 33 0 node $T/pf_cond.js $R/index.html
chk app_header 2 0 python3 $T/app_header.py $X/app/app.html
chk app_personal 3 0 python3 $T/app_personal.py $X/app/app.html
chk t.py_link 1 1 python3 $T/t.py $X/app/app.html   # 1 FAIL esperado (caminho de erro de propósito)
[ $FAIL = 0 ] && echo "== TUDO OK ==" || echo "== HÁ FALHAS =="
exit $FAIL
