#!/usr/bin/env python3
"""s50 read-only report: pairwise-check every hardcoded curated-page card (data-tour-id anchor with a
static '$N' price on its own line) against the row in tours-data.json. Three data-tour-id forms:
bare pk, shortname/pk, and the JS template literal (no static price — reported as 'template', skipped).
usage: python3 curated-cards-check.py <tours-data.json> > report.json"""
import json,re,sys,glob,collections
data=json.load(open(sys.argv[1]))['tours']; by={t['pk']:t for t in data}
cards=[];forms=collections.Counter()
for f in sorted(glob.glob('*.html')):
    lines=open(f,encoding='utf-8').read().split('\n')
    for ln,line in enumerate(lines,1):
        for m in re.finditer(r'data-tour-id="([^"]*)"',line):
            v=m.group(1)
            if v.startswith('${'): forms['template']+=1; continue
            mm=re.fullmatch(r'(?:([a-z0-9-]+)/)?(\d+)',v)
            if not mm: forms['unparsed']+=1; cards.append({'file':f,'line':ln,'id':v,'form':'unparsed'}); continue
            form='shortname/pk' if mm.group(1) else 'bare-pk'; forms[form]+=1; pk=int(mm.group(2))
            # the static price precedes the anchor inside the card: anchor line, then upward to the card
            # boundary (<tr>, .tour-card-inline, <h2/<h3 heading start, max 8 lines), then 8 lines down.
            BOUND=re.compile(r'<tr\b|tour-card-inline|<h2\b|<article\b|<section\b')
            win=[(ln,line)]
            for i in range(1,9):
                if ln-1-i<0: break
                wt=lines[ln-1-i]; win.append((ln-i,wt))
                if BOUND.search(wt): break
            win+=[(ln+i,lines[ln-1+i]) for i in range(1,9) if ln-1+i<len(lines)]
            prices=[];src=None
            for wl,wt in win:
                found=[float(x.replace(',','')) for x in re.findall(r'\$(\d[\d,]*(?:\.\d+)?)',wt)]
                if found: prices=found;src=wl;break
            row=by.get(pk); c={'file':f,'line':ln,'id':v,'form':form,'pk':pk,'staticPrices':prices,'priceLine':src}
            if row is None: c['verdict']='NO_ROW'
            elif not prices: c['verdict']='NO_STATIC_PRICE_IN_WINDOW'
            else:
                c.update({'rowPrice':row.get('price'),'rowConf':row.get('priceConfidence'),'rowLabel':row.get('priceLabel'),'rowUnit':(row.get('_unknownFields') or {}).get('priceUnit'),'rowStatus':row.get('status'),'rowSource':row.get('priceSource')})
                usable=isinstance(row.get('price'),(int,float)) and row['price']>1 and row.get('priceConfidence')!='low'
                c['verdict']='MATCH' if usable and row['price'] in prices else ('ROW_UNPUBLISHED' if not usable else 'DISAGREE')
            cards.append(c)
out={'forms':dict(forms),'cards':len(cards),'verdicts':dict(collections.Counter(c.get('verdict') for c in cards)),'items':cards}
print(json.dumps(out,indent=1))
