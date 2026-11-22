#!/usr/bin/env bash
# Mapa do index.html SEM abrir o arquivo (economiza tokens). Gerado na hora: nunca fica velho.
#   bash tools/map.sh            -> regioes + resumo por prefixo (curto, ~40 linhas)
#   bash tools/map.sh mbCobrar   -> onde esta a funcao/const (linha inicial e tamanho aproximado)
#   bash tools/map.sh -a         -> lista completa (funcoes e consts) em /tmp/movh_mapa.txt
# Depois: sed -n 'INICIO,FIMp' index.html  (ler so o trecho).
cd "$(dirname "$0")/.." || exit 1
python3 - "$@" <<'PY'
import re,sys,collections
arg=sys.argv[1] if len(sys.argv)>1 else ''
L=open('index.html',encoding='utf-8').read().split('\n')
n=len(L)
defs=[]  # (linha, indent, nome, tipo)
for i,l in enumerate(L,1):
    m=re.match(r'(\s*)(?:async\s+)?function\s+([A-Za-z0-9_$]+)',l)
    if m: defs.append((i,len(m.group(1)),m.group(2),'fn')); continue
    m=re.match(r'(\s*)(?:const|let|var)\s+([A-Z][A-Z0-9_]{2,})\s*=',l)
    if m: defs.append((i,len(m.group(1)),m.group(2),'const'))
def fim(k):
    i,ind,_,t=defs[k]
    for j in range(k+1,len(defs)):
        if defs[j][1]<=ind and defs[j][3]=='fn': return defs[j][0]-1
    return n
reg=[]
for i,l in enumerate(L,1):
    m=re.match(r'\s*<(/?)(script|style)\b',l)
    if m: reg.append((i,('fim ' if m.group(1) else 'ini ')+m.group(2)))
    if re.match(r'\s*(?:async\s+)?function\s+exportarComLogin',l): reg.append((i,'>>> exportarComLogin: daqui em diante o APP DO ALUNO e TEXTO de template literal (regras da secao 4)'))
if arg and arg!='-a':
    q=arg.lower(); hit=0
    for k,(i,ind,nome,t) in enumerate(defs):
        if q in nome.lower():
            hit+=1; print(f'L{i}\t{t}\t{nome}\t~{fim(k)-i+1} linhas')
    if not hit: print('nada; tente grep -n no index.html')
    sys.exit()
out=[f'index.html: {n} linhas, {sum(d[3]=="fn" for d in defs)} funcoes, {sum(d[3]=="const" for d in defs)} consts MAIUSCULAS','','REGIOES (linha: marca)']
out+= [f'  {i}: {t}' for i,t in reg]
pre=collections.OrderedDict()
for i,ind,nome,t in defs:
    if t!='fn': continue
    p=re.match(r'[a-z]+',nome); p=p.group(0) if p else '_'
    pre.setdefault(p,[]).append(i)
out+=['','PREFIXO: qtd, de-ate (linhas)']
for p,v in sorted(pre.items(),key=lambda x:-len(x[1])):
    if len(v)>=4: out.append(f'  {p}*: {len(v)} fn, {min(v)}-{max(v)}')
if arg=='-a':
    out+=['','LISTA COMPLETA (linha nome)']+[f'{i} {nome}' for i,_,nome,t in defs]
    open('/tmp/movh_mapa.txt','w').write('\n'.join(out)); print('/tmp/movh_mapa.txt',len(out),'linhas')
else: print('\n'.join(out)); print('\n(busca: bash tools/map.sh <termo>; tudo: bash tools/map.sh -a)')
PY
