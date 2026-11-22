#!/usr/bin/env bash
# Mapa do codigo SEM abrir os arquivos (economiza tokens). Gerado na hora: nunca fica velho.
#   bash tools/map.sh            -> regioes + resumo por prefixo (curto)
#   bash tools/map.sh mbCobrar   -> onde esta a funcao/const: arquivo, linha inicial, tamanho aproximado
#   bash tools/map.sh -a         -> lista completa em /tmp/movh_mapa.txt
# Arquivos: index.html (Gerador) e src/app/app.js (JS do app do aluno). A regiao gerada do app dentro do index.html e ignorada.
# Depois: sed -n 'INICIO,FIMp' <arquivo>   (ler so o trecho).
cd "$(dirname "$0")/.." || exit 1
python3 - "$@" <<'PY'
import re,sys,collections,os
arg=sys.argv[1] if len(sys.argv)>1 else ''
srcs=[]
H=open('index.html',encoding='utf-8').read().split('\n')
b=next((i for i,l in enumerate(H) if 'APP_JS_BEGIN@@' in l),None); e=next((i for i,l in enumerate(H) if 'APP_JS_END@@' in l),None)
srcs.append(('index.html',H,set(range(b+1,e)) if b is not None and e is not None else set()))
if os.path.exists('src/app/app.js'): srcs.append(('app.js',open('src/app/app.js',encoding='utf-8').read().split('\n'),set()))
defs=[]  # (arquivo, linha, indent, nome, tipo, fimaprox)
for nome,L,skip in srcs:
    d=[]
    for i,l in enumerate(L,1):
        if (i-1) in skip: continue
        m=re.match(r'(\s*)(?:async\s+)?function\s+([A-Za-z0-9_$]+)',l)
        if m: d.append([i,len(m.group(1)),m.group(2),'fn']); continue
        m=re.match(r'(\s*)(?:const|let|var)\s+([A-Z][A-Z0-9_]{2,})\s*=',l)
        if m: d.append([i,len(m.group(1)),m.group(2),'const'])
    for k,(i,ind,nm,t) in enumerate(d):
        f=len(L)
        for j in range(k+1,len(d)):
            if d[j][1]<=ind and d[j][3]=='fn': f=d[j][0]-1;break
        defs.append((nome,i,ind,nm,t,f))
if arg and arg!='-a':
    q=arg.lower(); hit=0
    for nome,i,ind,nm,t,f in defs:
        if q in nm.lower(): hit+=1; print(f'{nome}:L{i}\t{t}\t{nm}\t~{f-i+1} linhas')
    if not hit: print('nada; tente grep -n nos arquivos')
    sys.exit()
out=[]
for nome,L,skip in srcs:
    nf=sum(1 for d in defs if d[0]==nome and d[4]=='fn'); out.append(f'{nome}: {len(L)} linhas, {nf} funcoes')
out.append('')
Hr=[]
for i,l in enumerate(H,1):
    m=re.match(r'\s*<(/?)(script|style)\b',l)
    if m: Hr.append((i,('fim ' if m.group(1) else 'ini ')+m.group(2)))
    if re.match(r'\s*(?:async\s+)?function\s+exportarComLogin',l): Hr.append((i,'>>> exportarComLogin: template do app (CSS/HTML = TEXTO de template literal)'))
    if 'APP_JS_BEGIN@@' in l: Hr.append((i,'>>> REGIAO GERADA do JS do app (NAO editar; fonte: src/app/app.js; node tools/build.js)'))
    if 'APP_JS_END@@' in l: Hr.append((i,'<<< fim da regiao gerada'))
out.append('REGIOES do index.html (linha: marca)'); out+=[f'  {i}: {t}' for i,t in Hr]
pre=collections.OrderedDict()
for nome,i,ind,nm,t,f in defs:
    if t!='fn': continue
    p=re.match(r'[a-z]+',nm); p=p.group(0) if p else '_'
    pre.setdefault((nome,p),[]).append(i)
out+=['','PREFIXO: qtd, de-ate (linhas) [arquivo]']
for (nome,p),v in sorted(pre.items(),key=lambda x:-len(x[1])):
    if len(v)>=6: out.append(f'  {p}*: {len(v)} fn, {min(v)}-{max(v)} [{nome}]')
if arg=='-a':
    out+=['','LISTA COMPLETA (arquivo linha nome)']+[f'{n} {i} {nm}' for n,i,ind,nm,t,f in defs]
    open('/tmp/movh_mapa.txt','w').write('\n'.join(out)); print('/tmp/movh_mapa.txt',len(out),'linhas')
else: print('\n'.join(out)); print('\n(busca: bash tools/map.sh <termo>; tudo: bash tools/map.sh -a)')
PY
