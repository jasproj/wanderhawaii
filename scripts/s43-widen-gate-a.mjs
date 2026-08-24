#!/usr/bin/env node
/**
 * S43 — Gate A unit widening. Run: node scripts/s43-widen-gate-a.mjs [--check]
 * Exits non-zero on any assertion failure.
 *
 * TRACKED IN THE COMMIT ON PURPOSE (KWST precedent, D-581). The same edit lands at
 * 13 call sites; a hand-applied 13x edit is not auditable as mechanical and this repo
 * has already shipped a rule applied at one call site and missed at a sibling. The
 * script IS the evidence that all 13 insertions are the same insertion.
 *
 * WHAT IT REPLACES. Gate A, byte-identical at all 13 sites on dfc2718
 * (sha256 of the trimmed line = a69e51833132387c, 8-space indent, 132 chars):
 *
 *   const price = (tour.priceLabel === 'per adult' && Number.isFinite(tour.price)) ? `From $${tour.price}` : 'Check live price';
 *
 * The old gate tests EXACT string equality against 'per adult'. 576 of 4,666 rows
 * carry that exact string, so a row labelled 'per person', 'Adult' or 'Person' —
 * semantically identical units, differing only in case or wording — is hidden behind
 * "Check live price" even when it carries a verified published fare.
 *
 * WHAT IT WRITES. A normalized (trim + toLowerCase) allowlist, exhaustive:
 *
 *   'per adult', 'adult'   -> `From $${tour.price} per adult`
 *   'per person', 'person' -> `From $${tour.price} per person`
 *   anything else          -> 'Check live price'   (UNCHANGED)
 *
 * plus Number.isFinite(tour.price) && tour.price > 0 on the emitting branches.
 *
 * DELIBERATELY NOT DONE HERE:
 *   - No whole-boat / charter form. 'per group', 'charter', 'Private Charter' and
 *     'per booking' are the charter-unit template's population and keep
 *     'Check live price'. There is no "· private boat" string in this change.
 *   - No change to null / no-price behavior. The element still always renders;
 *     suppression is a later task.
 *   - app.js, the four island hubs and map.html are NOT touched. Four price idioms
 *     exist in this tree; converging them is a separate change.
 *   - ACTIVITY = 'Luau' / 'Air' (dead vocabulary on maui/luau.html and
 *     oahu/helicopter.html, 0 matching rows each) are NOT touched. Next task.
 *
 * The mapping is written as a chained conditional, not an object-literal lookup:
 * `{...}[key]` returns a truthy function for key 'constructor' or '__proto__'. No row
 * carries those labels today (checked: 0 of 4,666), but a lookup table would make the
 * gate depend on that staying true.
 */
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(new URL('..', import.meta.url).pathname);
const CHECK = process.argv.includes('--check');

// The 13 Gate A call sites, enumerated. Not globbed: a glob would silently pick up a
// 14th page added later and silently miss one renamed, and neither shows up in review.
const SITES = [
  'big-island/kayaking.html',
  'family-tours-oahu.html',
  'fishing.html',
  'kauai/napali-coast.html',
  'luau-maui.html',
  'maui/luau.html',
  'maui/whale-watching.html',
  'oahu/helicopter.html',
  'oahu/snorkeling.html',
  'oahu/sunset-cruise.html',
  'snorkeling-tours-hawaii.html',
  'snorkeling.html',
  'whale-watching.html',
];

// Element-level anchored match on the whole assignment, never a bare substring grep:
// a substring would also hit the string inside a comment or a neighbouring block.
const OLD_RE = /^([ \t]*)const price = \(tour\.priceLabel === 'per adult' && Number\.isFinite\(tour\.price\)\) \? `From \$\$\{tour\.price\}` : 'Check live price';[ \t]*$/gm;

const NEW = (indent) => [
  `${indent}const unitKey = String(tour.priceLabel ?? '').trim().toLowerCase();`,
  `${indent}const priceUnit = (unitKey === 'per adult' || unitKey === 'adult') ? 'per adult'`,
  `${indent}    : (unitKey === 'per person' || unitKey === 'person') ? 'per person' : null;`,
  `${indent}const price = (priceUnit && Number.isFinite(tour.price) && tour.price > 0) ? \`From $\${tour.price} \${priceUnit}\` : 'Check live price';`,
].join('\n');

let replaced = 0;
const failures = [];

for (const rel of SITES) {
  const abs = path.join(REPO, rel);
  const src = fs.readFileSync(abs, 'utf8');

  OLD_RE.lastIndex = 0;
  const hits = [...src.matchAll(OLD_RE)];
  if (hits.length !== 1) {
    failures.push(`${rel}: expected exactly 1 Gate A occurrence, found ${hits.length}`);
    continue;
  }

  OLD_RE.lastIndex = 0;
  const out = src.replace(OLD_RE, (_m, indent) => NEW(indent));
  if (out === src) { failures.push(`${rel}: replacement was a no-op`); continue; }

  // post-condition, per file: old line gone, new gate present exactly once
  OLD_RE.lastIndex = 0;
  if (OLD_RE.test(out)) { failures.push(`${rel}: residual old Gate A after replace`); continue; }
  const newCount = (out.match(/const priceUnit = \(unitKey === 'per adult'/g) || []).length;
  if (newCount !== 1) { failures.push(`${rel}: new gate present ${newCount} times, expected 1`); continue; }

  if (!CHECK) fs.writeFileSync(abs, out);
  replaced++;
  console.log(`  ${CHECK ? 'would replace' : 'replaced'}  ${rel}`);
}

// tree-wide residual sweep: nothing anywhere may still carry the old gate
const walk = (d, acc = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'scripts-staging') continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html') || e.name.endsWith('.js')) acc.push(p);
  }
  return acc;
};
let residual = 0;
for (const p of walk(REPO)) {
  OLD_RE.lastIndex = 0;
  const n = [...fs.readFileSync(p, 'utf8').matchAll(OLD_RE)].length;
  if (n) { residual += n; if (!CHECK) failures.push(`residual old Gate A in ${path.relative(REPO, p)} x${n}`); }
}

console.log(`\nsites expected=13 ${CHECK ? 'matched' : 'replaced'}=${replaced}  residual old-gate occurrences tree-wide=${residual}`);
if (replaced !== 13) failures.push(`expected 13 sites, got ${replaced}`);
if (!CHECK && residual !== 0) failures.push(`expected 0 residual, got ${residual}`);

if (failures.length) { failures.forEach((f) => console.error('  FAIL ' + f)); process.exit(1); }
console.log('s43 gate widening OK');
