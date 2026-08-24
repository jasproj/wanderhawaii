import json, collections, sys
L=json.load(open('s45-live-18-2026-08-24.json')); cls=json.load(open('step2-classification.json'))
print("control falsifiable:",L['control']); print("errors:",len(L['errors']),"reanchored:",L['reanchored'])
print("companies:",{sn:c['code'] for sn,c in L['companies'].items()})
print("\n| pk | class | product | stored | live floor | every tier (date-valid, floor–ceil, n) | $0-only dates | gratuity tiers | OK/FB/UNS/ERR | stored∈ladder? |")
print("|---|---|---|---|---|---|---|---|---|---|")
out={}
for pk in sorted(L['obs'],key=int):
    days=L['obs'][pk]; m=L['meta'][pk]
    valid=[v for v in days.values() if v.get('date_valid')]
    lad=collections.defaultdict(list); zeros=set(); grat=set(); zeroOnly=[]
    for d,v in days.items():
        if not v.get('date_valid'): continue
        if v.get('zeroOnly'): zeroOnly.append(d)
        for t in v['tiers']: lad[(t['singular'],t['note'] or '',t['min_party_size'])].append(t['dollars'])
        for t in v['zero_tiers']: zeros.add(t['singular'])
        for t in v['gratuity_tiers']: grat.add(t['singular'])
    tiers=sorted([(min(p),max(p),len(p),k) for k,p in lad.items()])
    st=collections.Counter(v['status'] for v in days.values())
    floor=tiers[0][0] if tiers else None
    stored=float(m['stored']); inlad=any(abs(f-stored)<0.005 for f,_,_,_ in tiers)
    tt=" / ".join(f"{k[0]}{(' ['+k[1][:30]+']') if k[1] else ''}{(' mps='+str(k[2])) if k[2] else ''} ${f:,.2f}{'' if f==c else '–$'+format(c,',.2f')} n={n}" for f,c,n,k in tiers)
    print(f"| {pk} | {m['class']} | {m['name'][:36]} | ${stored:,.0f} | {('$%s'%format(floor,',.2f')) if floor is not None else 'NO VALID READING'} | {tt or '—'} | {len(zeroOnly)} | {sorted(grat) or '—'} | {st.get('OK',0)}/{st.get('FALLBACK',0)}/{st.get('UNSAMPLED',0)}/{st.get('ERROR',0)} | {'yes' if inlad else 'NO'} |")
    out[pk]={"class":m['class'],"stored":stored,"floor":floor,"tiers":[{"singular":k[0],"note":k[1],"mps":k[2],"floor":f,"ceil":c,"n":n} for f,c,n,k in tiers],"zeroOnlyDates":zeroOnly,"zeroTiers":sorted(zeros),"gratuity":sorted(grat),"statuses":dict(st),"validReadings":len(valid),"storedInLadder":inlad}
json.dump(out,open('step6-live-summary.json','w'),indent=1)
