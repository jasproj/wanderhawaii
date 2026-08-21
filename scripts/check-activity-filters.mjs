#!/usr/bin/env node
/**
 * Activity-filter vocabulary test. Run: node scripts/check-activity-filters.mjs
 * Exits non-zero on failure so CI or a pre-merge check fails loudly.
 *
 * WHY THIS EXISTS. `ACTIVITY = 'Air'` and `ACTIVITY = 'Luau'` sat on two live pages
 * matching ZERO records while looking perfectly correct, because a hand-maintained
 * filter vocabulary silently diverges from the data it filters. This binds the two
 * together on every run.
 *
 * THE VOCABULARY IS CURATED, NOT DERIVED -- and that is deliberate. `tags` is
 * SUPPLIER taxonomy, not visitor intent: a purely mechanical derivation (every tag
 * with >=24 items) yields 26 options including "Transportation", "Events",
 * "Bus Tour" and "Boat Rental". Deriving from data is necessary to stop divergence
 * and insufficient to produce a menu, so CURATED below is the editorial layer and
 * this test is what keeps it honest against the data.
 *
 * TWO ASSERTIONS, both directions:
 *   1. every option RENDERED on a page has a non-zero population on that page's
 *      own surface  -> no dead filters
 *   2. every CURATED option with a non-zero population on a surface IS rendered
 *      there                                                -> no unreachable inventory
 *
 * Options are parsed by ELEMENT BOUNDARY, never by a line window: a fixed +14-line
 * read of maui.html once overran </select> into the next control and invented a
 * defect that did not exist.
 */
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(new URL('..', import.meta.url).pathname);
const read = f => fs.readFileSync(path.join(REPO, f), 'utf8');

// --- the curated layer -------------------------------------------------------
export const CURATED = [
  'Snorkel', 'Boat Tour', 'Whale Watch', 'Dolphin', 'Scuba', 'Kayak', 'Surf', 'SUP',
  'Sailing', 'Catamaran', 'Fishing', 'Hiking', 'Zipline', 'ATV/UTV', 'Air Tour',
  'Food Tour', 'Farm', 'Private', 'Guided Tour',
  'Eco Tour', 'Water Activities', 'Sightseeing Tour', 'History Tour',
];

// --- the surfaces, each with the pool predicate ITS OWN renderer uses ---------
// These are ported verbatim from the pages, not approximated. An earlier draft of
// this file guessed the hub pool as `t.price && island === isl`; the hubs actually
// do NOT filter on price and DO filter on isAddonOrRental, so the test was checking
// a population no page renders.
const tours = JSON.parse(read('tours-data.json')).tours
  .filter(t => t.status !== 'inactive' && !t.bookingDead);
const finite = x => Number.isFinite(x);

// verbatim from oahu/maui/big-island/kauai .html (identical sha on all four)
const ACTIVITY_WORDS = /\b(charter|tours?|cruise|sail(?:ing)?|lessons?|courses?|classes?|excursion|trip|div(?:e|ing)|workshop|camp|photoshoot|photo shoot|safari|expedition|adventure|walk|snorkel|whale\s*watch|luau|sunset|sunrise|package|certification|certified|experience|voyage|paddle\s*board\s*tour|freedive|free\s*dive|self[- ]?guided)\b/i;
const RENTAL_WORDS = /\b(rentals?|delivery|pick[- ]?up|drop[- ]?off)\b/i;
const PEOPLE_WORDS = /\b(adults?|child(?:ren)?|kids?|keiki|youth|infant|senior|military|veteran|persons?|general|admission|vip|group|couple|family|guests?|participant|camper|private|shared|tandem|solo|traveler|passengers?|rider|divers?|snorkelers?|swimmers?|non[- ]?swimmer|toddler|teen|junior)\b/i;
function isAddonOrRental(tour) {
  const name = tour.name || '';
  const pb = Array.isArray(tour.priceBreakdown) ? tour.priceBreakdown : [];
  const labels = pb.map(x => (x.singular || '').trim()).filter(Boolean);
  if ([name, ...labels].some(h => ACTIVITY_WORDS.test(h))) return false;
  if (labels.length === 0) return false;
  if (labels.some(l => PEOPLE_WORDS.test(l))) return false;
  return labels.filter(l => RENTAL_WORDS.test(l)).length === labels.length;
}

const SURFACES = [
  { file: 'index.html',      select: 'activity-filter',      // app.js loadTours()
    pool: tours.filter(t => finite(t.price) && t.price > 1 && t.priceConfidence !== 'low') },
  ...['oahu', 'maui', 'big island', 'kauai'].map(isl => ({   // hub allTours filter
    file: (isl === 'big island' ? 'big-island' : isl) + '.html', select: 'activityFilter',
    pool: tours.filter(t => (t.island || '').toLowerCase() === isl && !isAddonOrRental(t)) })),
];

const optionsOf = (html, id) => {
  const m = html.match(new RegExp('<select id="' + id + '"[^>]*>([\\s\\S]*?)</select>'));
  if (!m) throw new Error(`#${id} not found`);
  return [...m[1].matchAll(/<option value="([^"]*)"/g)].map(x => x[1]).filter(Boolean);
};
const popOf = (pool, tag) => pool.filter(t => (t.tags || []).includes(tag)).length;

let attempted = 0, failures = [];
for (const s of SURFACES) {
  const rendered = optionsOf(read(s.file), s.select);
  for (const opt of rendered) {                       // assertion 1
    attempted++;
    const n = popOf(s.pool, opt);
    if (n === 0) failures.push(`${s.file}: renders "${opt}" but its population there is 0 (DEAD FILTER)`);
    if (!CURATED.includes(opt)) failures.push(`${s.file}: renders "${opt}" which is not in CURATED`);
  }
  for (const opt of CURATED) {                        // assertion 2
    attempted++;
    const n = popOf(s.pool, opt);
    if (n > 0 && !rendered.includes(opt))
      failures.push(`${s.file}: "${opt}" has ${n} items but is NOT rendered (UNREACHABLE INVENTORY)`);
  }
  console.log(`  ${s.file.padEnd(16)} pool=${String(s.pool.length).padStart(5)}  renders ${String(rendered.length).padStart(2)} options  ` +
              rendered.map(o => `${o}:${popOf(s.pool, o)}`).join(' '));
}
console.log(`\nassertions attempted=${attempted} failed=${failures.length}`);
failures.forEach(f => console.error('  FAIL ' + f));
if (failures.length) { console.error('\nactivity-filter vocabulary check FAILED'); process.exit(1); }
console.log('activity-filter vocabulary check PASSED');
