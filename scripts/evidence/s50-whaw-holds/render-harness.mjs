// s50-whaw-refresh: evaluate app.js's card renderer + JSON-LD in node against a
// tours-data.json (served-bytes substitution — Chrome extension dark this session).
// Uses app.js's OWN loader predicate (status/bookingDead/hasUsablePrice/isAddonOrRental)
// so the loaded set is the real draw pool. Emits per-pk {html, schema, priceText, unit}.
// usage: node render-harness.mjs <app.js> <tours-data.json> <out.json>
import fs from 'fs'; import vm from 'vm';
const [,, appPath, dataPath, outPath] = process.argv;
const src = fs.readFileSync(appPath, 'utf8');
const d = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const noop = () => {};
const el = { addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], classList: { add: noop, remove: noop }, getElementById: () => null, style: {} };
const ctx = { console, document: { ...el, body: el }, window: { addEventListener: noop, scrollY: 0, gtag: noop }, sessionStorage: { getItem: () => null, setItem: noop }, localStorage: { getItem: () => null, setItem: noop }, fetch: () => new Promise(() => {}), gtag: noop, setTimeout, URL, Number, JSON, Math, String, Array, Object };
vm.createContext(ctx);
vm.runInContext(src + '\n;globalThis.__x={createTourCard,generateTourSchema,hasUsablePrice,isAddonOrRental};', ctx);
const { createTourCard, generateTourSchema, hasUsablePrice, isAddonOrRental } = ctx.__x;
const all = Array.isArray(d) ? d : d.tours;
const loaded = all.filter(t => t.status !== 'inactive' && !t.bookingDead && hasUsablePrice(t) && !isAddonOrRental(t));
const gated = all.filter(t => t.status !== 'inactive' && !t.bookingDead && hasUsablePrice(t) && isAddonOrRental(t)).map(t => t.pk);
const out = {};
for (const t of loaded) {
  const html = createTourCard(t);
  const m = html.match(/<div class="tour-price">(.*?)<\/div>/);
  const inner = m ? m[1] : null;
  const sm = inner ? inner.match(/<small>(.*?)<\/small>/) : null;
  out[t.pk] = { confidence: t.priceConfidence ?? null, price: t.price ?? null, priceText: inner ? inner.replace(/<small>.*<\/small>/, '') : null,
    unit: sm ? sm[1] : null, hasSmall: /<small/.test(html), html, schema: generateTourSchema(t) };
}
fs.writeFileSync(outPath, JSON.stringify({ rows: out, addonRentalGated: gated }));
const rows = Object.values(out);
const sum0 = { addonRentalGated: gated.length };
const visible = rows.filter(r => r.priceText && r.priceText.startsWith('From '));
const withUnit = rows.filter(r => r.unit !== null);
const sum = { ...sum0, totalRows: all.length, loaded: rows.length, visiblePrice: visible.length, jsonLdOffers: rows.filter(r => r.schema.offers).length,
  cardsWithSmall: rows.filter(r => r.hasSmall).length,
  unitsByValue: Object.fromEntries([...new Set(withUnit.map(r => r.unit))].sort().map(u => [u, withUnit.filter(r => r.unit === u).length])),
  priceTextButNoOffer: rows.filter(r => (r.priceText||'').startsWith('From ') !== !!r.schema.offers).length };
console.log(JSON.stringify(sum));
