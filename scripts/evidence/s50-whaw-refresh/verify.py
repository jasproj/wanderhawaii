#!/usr/bin/env python3
"""s50-whaw-refresh verify: before/after decomposition. usage: verify.py <before.json> <after.json> <render-before.json> <render-after.json> <apply-summary.json>"""
import json,sys,hashlib,collections
b=json.load(open(sys.argv[1]))['tours']; a=json.load(open(sys.argv[2]))['tours']
RB=json.load(open(sys.argv[3])); RA=json.load(open(sys.argv[4])); rb=RB['rows']; ra=RA['rows']; gatedA=set(RA['addonRentalGated']); gatedB=set(RB['addonRentalGated']); S=json.load(open(sys.argv[5]))
pop=set(json.load(open('scripts/evidence/s50-whaw-refresh/population.json'))['population'])
assert len(a)==len(b) and [t['pk'] for t in a]==[t['pk'] for t in b]
bb={t['pk']:t for t in b}; aa={t['pk']:t for t in a}
changed={pk for pk in aa if json.dumps(aa[pk],sort_keys=True)!=json.dumps(bb[pk],sort_keys=True)}
outside=changed-pop
stamped=[pk for pk in pop if aa[pk].get('priceSource')=='s50-whaw-refresh' and all(k in aa[pk] for k in ('priceBasis','priceTiers','priceConfidence','priceEnrichmentAt'))]
dated=[pk for pk in pop if str(aa[pk].get('priceEnrichmentAt',''))[:10]>='2026-08-25']
undated_before=sum(1 for pk in pop if not bb[pk].get('priceEnrichmentAt'))
usable=lambda t:isinstance(t.get('price'),(int,float)) and t['price']>1 and t.get('priceConfidence')!='low'
nowlow=[pk for pk in pop if aa[pk].get('priceConfidence')=='low']
units=collections.Counter((aa[pk].get('_unknownFields') or {}).get('priceUnit') for pk in pop if (aa[pk].get('_unknownFields') or {}).get('priceUnit'))
# render: outside-population rows byte-identical
r_out_diff=[k for k in ra if int(k) not in pop and (k not in rb or ra[k]['html']!=rb[k]['html'])]
r_out_missing=[k for k in rb if int(k) not in pop and k not in ra]
pop_rendered_after=[k for k in ra if int(k) in pop]; pop_rendered_before=[k for k in rb if int(k) in pop]
pop_released=[pk for pk in pop if usable(aa[pk])]
pop_gated=[pk for pk in pop_released if pk in gatedA]; pop_gated_before=[pk for pk in pop if pk in gatedB]
sm=lambda p:hashlib.sha256(open(p,'rb').read()).hexdigest()
out={'population':len(pop),'attempted':S['attempted'],'succeeded':S['succeeded'],'rowsChanged':len(changed),'outsidePopulationChanged':len(outside),
 'fullyStamped':len(stamped),'datedStamp2026_08_25plus':len(dated),'undatedBefore':undated_before,
 'disposition':S['disposition'],'nowLow(unpublished)':len(nowlow),'released(usable)':len(pop_released),'unitsAssigned':sum(units.values()),'topUnits':units.most_common(12),
 'render':{'loadedBefore':len(rb),'loadedAfter':len(ra),'popRenderedBefore':len(pop_rendered_before),'popRenderedAfter':len(pop_rendered_after),'popNotInDrawPoolBeforeViaIsAddonOrRental':len(pop)-len(pop_rendered_before),'popReleasedGatedByIsAddonOrRental':len(pop_gated),'popGatedByIsAddonOrRentalBefore':len(pop_gated_before),'gatedRowsHadNoBreakdownBefore':sum(1 for pk in pop_gated if not bb[pk].get('priceBreakdown')),'popRenderedAfterPlusGatedEqualsReleased':len(pop_rendered_after)+len(pop_gated)==len(pop_released),
  'nonPopHtmlDiff':len(r_out_diff),'nonPopMissingAfter':len(r_out_missing),'popCardsWithSmall':sum(1 for k in pop_rendered_after if ra[k]['hasSmall'])},
 'sha256':{'before':sm(sys.argv[1]),'after':sm(sys.argv[2])}}
out['PASS']=(out['attempted']==1814==out['succeeded']==out['fullyStamped']==out['datedStamp2026_08_25plus']==out['rowsChanged'] and not outside and not r_out_diff and not r_out_missing and out['render']['popRenderedAfterPlusGatedEqualsReleased'] and out['render']['loadedAfter']==out['render']['loadedBefore']-(len(pop_rendered_before)-len(pop_rendered_after)) and len(pop_rendered_before)-len(pop_rendered_after)==out['nowLow(unpublished)']+len(pop_gated)-len(pop_gated_before))
print(json.dumps(out,indent=1))
