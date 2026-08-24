#!/usr/bin/env node
/**
 * S43 — apply the charter-unit template. Run: node scripts/s43-apply-charter-unit.mjs [--check]
 * Exits non-zero on any assertion failure.
 *
 * TRACKED, and it reads its input from the TRACKED evidence file
 * scripts-staging/s43-charter-unit-evidence.json rather than from a scratch
 * directory, so the write is reproducible from the commit alone.
 *
 * WHAT IT WRITES. Exactly the rows the evidence file marks disposition PUBLISH,
 * and on each of them exactly the four fields of the #247 convention:
 *
 *   price            -> the winning tier's own LIVE floor (stored value is untrusted)
 *   priceLabel       -> "private boat"
 *   priceConfidence  -> "high"
 *   priceBreakdown   -> the full live tier array
 *
 * priceBreakdown carries EVERY live tier including $0 ones. That matches what
 * #252 actually wrote (4 of its 59 rows carry a $0 tier), and it is why the
 * array minimum can sit below the published base — by design. D-575 governs
 * which tier may WIN the base, not what the array records.
 *
 * WHY ONLY TWO ROWS. 47 whole-unit rows cleared the fare-unit rule; 42 of those
 * had a whole-unit base. But "private boat" asserts a PRODUCT KIND, not just a
 * unit, and only two of the 42 are watercraft. The other 40 are SUVs, a minibus,
 * Slingshots, e-bikes, photo sessions, a Topgolf reservation, a tent, a cabana, a
 * yoga class package and airport lei greetings. Publishing "· private boat" on any
 * of those is a false claim, so they are HOLD and s44 adjudicates a per-kind label
 * and catalogue scope. Two of the holds outrank the unit clearance outright:
 * the Honeymoon four (67260/69116/69146/69177) are held PER-SET by #250, whose
 * commit body explicitly warns that a later pass would republish them; and 454801
 * bases on a tier reading "Seats up to 14 Passengers • Shared", where "private" is
 * false whatever the unit turns out to be.
 */
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(new URL('..', import.meta.url).pathname);
const CHECK = process.argv.includes('--check');
const read = (f) => fs.readFileSync(path.join(REPO, f), 'utf8');

const evidence = JSON.parse(read('scripts-staging/s43-charter-unit-evidence.json'));
const dataPath = path.join(REPO, 'tours-data.json');
const raw = read('tours-data.json');
const doc = JSON.parse(raw);
const tours = doc.tours;

const publish = evidence.rows.filter((r) => r.disposition === 'PUBLISH');
const failures = [];
console.log(`evidence rows=${evidence.rows.length}  disposition=${JSON.stringify(evidence._meta.disposition)}`);
console.log(`PUBLISH rows to write: ${publish.length}`);

// ---- pre-conditions on every target, asserted BEFORE any mutation ----------
const byPk = new Map(tours.map((t) => [t.pk, t]));
for (const r of publish) {
  const t = byPk.get(r.pk);
  if (!t) { failures.push(`pk ${r.pk}: not present in tours-data.json`); continue; }
  if (t.priceConfidence !== 'low') failures.push(`pk ${r.pk}: expected held state priceConfidence 'low', found ${JSON.stringify(t.priceConfidence)}`);
  if ('priceBreakdown' in t) failures.push(`pk ${r.pk}: already carries priceBreakdown; this pass must not overwrite one`);
  if (!r.published) failures.push(`pk ${r.pk}: PUBLISH row has no published block`);
  if (r.sweep.valid < 3) failures.push(`pk ${r.pk}: INSUFFICIENT (${r.sweep.valid}/17 valid)`);
  if (!r.winningTier) failures.push(`pk ${r.pk}: no winning tier recorded`);
  else if (r.published && r.published.price !== r.winningTier.floor)
    failures.push(`pk ${r.pk}: published price ${r.published.price} !== winning tier floor ${r.winningTier.floor}`);
  // the published base must be PRESENT as a live tier — never asserted to be the minimum
  const present = r.liveTiers.some((x) => x.floorCents === Math.round(r.published.price * 100));
  if (!present) failures.push(`pk ${r.pk}: published price $${r.published.price} matches no live tier`);
}
if (failures.length) { failures.forEach((f) => console.error('  FAIL ' + f)); process.exit(1); }
console.log('pre-conditions: OK on all ' + publish.length);

// ---- the write -------------------------------------------------------------
const FIELDS = ['price', 'priceLabel', 'priceConfidence', 'priceBreakdown'];
const changed = [];
for (const r of publish) {
  const t = byPk.get(r.pk);
  const before = JSON.stringify(t);
  t.price = r.published.price;
  t.priceLabel = r.published.priceLabel;
  t.priceConfidence = r.published.priceConfidence;
  // #252 shape: {id, singular, plural, note, priceCents, price, minPartySize}, ascending by price.
  t.priceBreakdown = r.liveTiers
    .slice()
    .sort((a, b) => a.floorCents - b.floorCents || a.id - b.id)
    .map((x) => ({ id: x.id, singular: x.singular, plural: x.plural, note: x.note,
      priceCents: x.floorCents, price: x.floorCents / 100, minPartySize: x.minPartySize }));
  changed.push({ pk: r.pk, before, after: JSON.stringify(t) });
}

// ---- post-conditions: nothing but the four fields moved, on nobody else -----
const original = JSON.parse(raw);
const origByPk = new Map(original.tours.map((t) => [t.pk, t]));
if (original.tours.length !== tours.length) failures.push('row count changed');
let touched = 0;
for (const t of tours) {
  const o = origByPk.get(t.pk);
  if (!o) { failures.push(`pk ${t.pk}: new row appeared`); continue; }
  if (JSON.stringify(o) === JSON.stringify(t)) continue;
  touched++;
  const keys = new Set([...Object.keys(o), ...Object.keys(t)]);
  const moved = [...keys].filter((k) => JSON.stringify(o[k]) !== JSON.stringify(t[k]));
  const illegal = moved.filter((k) => !FIELDS.includes(k));
  if (illegal.length) failures.push(`pk ${t.pk}: illegal field(s) moved: ${illegal.join(', ')}`);
  if (!publish.some((r) => r.pk === t.pk)) failures.push(`pk ${t.pk}: changed but is not a PUBLISH row`);
}
if (touched !== publish.length) failures.push(`expected exactly ${publish.length} rows touched, got ${touched}`);
console.log(`rows touched: ${touched}  (expected ${publish.length})`);

// ---- the #247 hazard: arriving priceBreakdown must not eject a row ---------
// isAddonOrRental ported verbatim from app.js.
const ACTIVITY_WORDS = /\b(charter|tours?|cruise|sail(?:ing)?|lessons?|courses?|classes?|excursion|trip|div(?:e|ing)|workshop|camp|photoshoot|photo shoot|safari|expedition|adventure|walk|snorkel|whale\s*watch|luau|sunset|sunrise|package|certification|certified|experience|voyage|paddle\s*board\s*tour|freedive|free\s*dive|self[- ]?guided)\b/i;
const RENTAL_WORDS = /\b(rentals?|delivery|pick[- ]?up|drop[- ]?off)\b/i;
const PEOPLE_WORDS = /\b(adults?|child(?:ren)?|kids?|keiki|youth|infant|senior|military|veteran|persons?|general|admission|vip|group|couple|family|guests?|participant|camper|private|shared|tandem|solo|traveler|passengers?|rider|divers?|snorkelers?|swimmers?|non[- ]?swimmer|toddler|teen|junior)\b/i;
function isAddonOrRental(tour) {
  const name = tour.name || '';
  const pb = Array.isArray(tour.priceBreakdown) ? tour.priceBreakdown : [];
  const labels = pb.map((p) => (p.singular || '').trim()).filter(Boolean);
  if ([name, ...labels].some((h) => ACTIVITY_WORDS.test(h))) return false;
  if (labels.length === 0) return false;
  if (labels.some((l) => PEOPLE_WORDS.test(l))) return false;
  return labels.filter((l) => RENTAL_WORDS.test(l)).length === labels.length;
}
const ejected = publish.filter((r) => isAddonOrRental(byPk.get(r.pk)));
console.log(`#247 ejection hazard (isAddonOrRental after the write): ${ejected.length} of ${publish.length} ejected` + (ejected.length ? ' -> ' + ejected.map((r) => r.pk).join(', ') : ''));
if (ejected.length) failures.push('a published row would be ejected from the pool by isAddonOrRental');

// draw-pool delta, using app.js's own eligibility rule
const hasUsablePrice = (t) => Number.isFinite(t.price) && t.price > 1 && t.priceConfidence !== 'low';
const poolOf = (arr) => arr.filter((t) => t.status !== 'inactive' && !t.bookingDead && hasUsablePrice(t) && !isAddonOrRental(t)).length;
console.log(`draw pool: ${poolOf(original.tours)} -> ${poolOf(tours)}`);

if (failures.length) { failures.forEach((f) => console.error('  FAIL ' + f)); process.exit(1); }

if (CHECK) { console.log('\n--check: no write performed'); process.exit(0); }
fs.writeFileSync(dataPath, JSON.stringify(doc, null, 2) + '\n');
console.log('\nwrote tours-data.json');
changed.forEach((c) => {
  const t = byPk.get(c.pk);
  console.log(`  pk ${c.pk}  $${t.price}  ${JSON.stringify(t.priceLabel)}  ${t.priceConfidence}  tiers=${t.priceBreakdown.length}`);
});
console.log('s43 charter-unit apply OK');
