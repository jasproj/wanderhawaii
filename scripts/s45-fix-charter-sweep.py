#!/usr/bin/env python3
"""s45 — apply the charter-sweep rulings to tours-data.json.
DETERMINISTIC. No network. Reads the frozen evidence
scripts-staging/s45-whaw-recon/s45-live-18-2026-08-24.json and asserts every
written value against it before any byte changes.

Stamps on every priced row: _unknownFields.priceSource='s45-fix-charter',
_unknownFields.priceBasis (names the tier), _unknownFields.tiers (the full
date-valid live ladder), priceConfidence='high'.
332728 takes the #254 HELD-NONVESSEL shape exactly as the 40 held rows carry it:
priceLabel='unknown', priceConfidence='low', no stamp (no published price path).
"""
import json, sys, collections
from pathlib import Path
REPO=Path(__file__).resolve().parent.parent
TOURS=REPO/'tours-data.json'; EV=REPO/'scripts-staging/s45-whaw-recon/s45-live-18-2026-08-24.json'
SRC='s45-fix-charter'
# pk -> (new_price, tier singular, basis note)
RESTAMP={476368:(1400,'Private Charter','live floor; single tier'),
 492381:(900,'Half Day Charter (4hrs)','live floor of the private ladder'),
 506372:(850,'Four Hour Private Charter','live floor'),
 509332:(1650,'Four Hour Private Charter','live floor'),
 513910:(1199,'7H Offshore fishing','live floor; single tier'),
 611584:(900,'Private charter','live floor; single tier'),
 670258:(950,'Two Hour Private Charter','live floor'),
 593603:(1999,'Two Hour Private Charter','the 2h Private Charter fare; stored $499 was an add-on tier (Additional Hours / TRANSPORTATION Add-On), never a fare'),
 1321:(900,'Four Hour Private Charter','private 4h floor; charter label stands'),
 186807:(2398.8,'Ten hour private charter','D-601: durationText "10 Hour" names this tier'),
 203410:(1199,'Four Hour Private Charter','D-601: durationText "4 Hours" names this tier'),
 565618:(1499,'Six Hour Private Charter','D-601: durationText "6 hour" names this tier')}
RELABEL={57549:(325,'Person','per person','primary per-person tier; price unchanged'),
 391875:(189,'Passenger','per person','per-seat product; $1,800 matched no tier')}
HELD={332728}
UNTOUCHED={674343,674389,224702}
ev=json.load(open(EV)); assert ev['control']['falsifiable']
def ladder(pk):
    days=ev['obs'][str(pk)]; lad=collections.defaultdict(list)
    for v in days.values():
        if not v.get('date_valid'): continue
        for t in v['tiers']: lad[(t['singular'],t['note'] or '',t['min_party_size'])].append(t['dollars'])
    assert sum(1 for v in days.values() if v.get('date_valid'))>=3, pk
    return [{'singular':k[0],'note':k[1],'minPartySize':k[2],'price':(int(min(p)) if float(min(p)).is_integer() else min(p)),'observations':len(p)} for k,p in sorted(lad.items(),key=lambda kv:min(kv[1]))]
raw=TOURS.read_text(encoding='utf-8'); doc=json.loads(raw)
assert json.dumps(doc,indent=2,ensure_ascii=False)+'\n'==raw, 'no byte round-trip'
by={t['pk']:t for t in doc['tours']}
assert set(RESTAMP)|set(RELABEL)|HELD|UNTOUCHED==set(map(int,ev['obs'])), 'plan != evidence population'
before={pk:json.dumps(by[pk],sort_keys=True) for pk in UNTOUCHED}
def stamp(row,price,tier,basis,label=None):
    lad=ladder(row['pk']); m=[t for t in lad if t['singular']==tier]
    assert m and abs(m[0]['price']-price)<0.005, (row['pk'],tier,price,[(t['singular'],t['price']) for t in lad])
    assert all(abs(d-price)<0.005 for v in ev['obs'][str(row['pk'])].values() if v.get('date_valid') for t in v['tiers'] if t['singular']==tier for d in [t['dollars']]), ('unstable tier',row['pk'])
    row['price']=int(price) if float(price).is_integer() else price
    row['priceConfidence']='high'
    if label: row['priceLabel']=label
    uf=row.get('_unknownFields') or {}; uf['priceSource']=SRC; uf['priceBasis']=f'{tier}: {basis}'; uf['tiers']=lad; row['_unknownFields']=uf
for pk,(p,tier,why) in RESTAMP.items(): stamp(by[pk],p,tier,why)
for pk,(p,tier,label,why) in RELABEL.items(): stamp(by[pk],p,tier,why,label)
for pk in HELD:
    r=by[pk]; assert r['priceLabel']=='charter'; r['priceLabel']='unknown'; r['priceConfidence']='low'
for pk in UNTOUCHED: assert json.dumps(by[pk],sort_keys=True)==before[pk]
out=json.dumps(doc,indent=2,ensure_ascii=False)+'\n'
if '--execute' in sys.argv: TOURS.write_text(out,encoding='utf-8'); print('WROTE',len(raw),'->',len(out))
else: print('DRY RUN ok; would write',len(out))
