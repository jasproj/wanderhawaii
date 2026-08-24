#!/usr/bin/env node
/**
 * S43 — add the charter-unit branch to Gate A. Run: node scripts/s43-charter-unit-gate.mjs [--check]
 * Exits non-zero on any assertion failure.
 *
 * TRACKED for the same reason scripts/s43-widen-gate-a.mjs is (KWST precedent,
 * D-581): the same edit lands at 13 call sites and a hand-applied 13x edit is not
 * auditable as mechanical.
 *
 * This is the SECOND migration of Gate A. The first (s43-widen-gate-a.mjs, merged
 * as #253 / cdeabe79) replaced the exact-equality gate with the normalized
 * per-person allowlist. That script's OLD_RE no longer matches anything and it must
 * NOT be re-run; this file owns the current shape.
 *
 * FROM (13 sites, byte-identical, trimmed sha256 3f4afa2b70eb4125):
 *   const unitKey = String(tour.priceLabel ?? '').trim().toLowerCase();
 *   const priceUnit = (unitKey === 'per adult' || unitKey === 'adult') ? 'per adult'
 *       : (unitKey === 'per person' || unitKey === 'person') ? 'per person' : null;
 *   const price = (priceUnit && Number.isFinite(tour.price) && tour.price > 0) ? `From $${tour.price} ${priceUnit}` : 'Check live price';
 *
 * TO: the same, plus one branch mapping 'private boat' -> '· private boat'.
 *
 * The separator travels INSIDE priceUnit rather than being appended at the emit
 * site, so the emitting expression is untouched and the per-adult / per-person
 * renderings are provably unchanged: "From $131 per person" still, and
 * "From $599 · private boat" for the new unit. One idiom, one emit path.
 *
 * SCOPE. This branch carries exactly 2 rows tonight (569816, 663614) — the only
 * two watercraft in the 42-row whole-unit cleared set. s44 extends it: the other
 * 40 need a per-kind label and a catalogue-scope ruling first, since "private
 * boat" asserts a product kind and an SUV, a tent or a lei set is not one.
 *
 * NOT TOUCHED, deliberately: app.js, oahu/maui/kauai/big-island .html and map.html.
 * Four price idioms exist in this tree; converging them is a separate task.
 */
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(new URL('..', import.meta.url).pathname);
const CHECK = process.argv.includes('--check');

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

// Element-level, anchored on the whole three-line priceUnit assignment plus the
// emit line. Never a bare substring: a substring would also hit prose in a comment.
const OLD_RE = /^([ \t]*)const priceUnit = \(unitKey === 'per adult' \|\| unitKey === 'adult'\) \? 'per adult'\n[ \t]*: \(unitKey === 'per person' \|\| unitKey === 'person'\) \? 'per person' : null;$/gm;

const NEW = (indent) => [
  `${indent}const priceUnit = (unitKey === 'per adult' || unitKey === 'adult') ? 'per adult'`,
  `${indent}    : (unitKey === 'per person' || unitKey === 'person') ? 'per person'`,
  `${indent}    : (unitKey === 'private boat') ? '· private boat' : null;`,
].join('\n');

let replaced = 0;
const failures = [];

for (const rel of SITES) {
  const abs = path.join(REPO, rel);
  const src = fs.readFileSync(abs, 'utf8');

  OLD_RE.lastIndex = 0;
  const hits = [...src.matchAll(OLD_RE)];
  if (hits.length !== 1) { failures.push(`${rel}: expected exactly 1 priceUnit block, found ${hits.length}`); continue; }

  OLD_RE.lastIndex = 0;
  const out = src.replace(OLD_RE, (_m, indent) => NEW(indent));
  if (out === src) { failures.push(`${rel}: replacement was a no-op`); continue; }

  OLD_RE.lastIndex = 0;
  if (OLD_RE.test(out)) { failures.push(`${rel}: residual old priceUnit block after replace`); continue; }
  const n = (out.match(/unitKey === 'private boat'/g) || []).length;
  if (n !== 1) { failures.push(`${rel}: new branch present ${n} times, expected 1`); continue; }
  // the emit line must be untouched by this migration
  if ((out.match(/const price = \(priceUnit && Number\.isFinite\(tour\.price\) && tour\.price > 0\)/g) || []).length !== 1)
    { failures.push(`${rel}: emit line altered or missing`); continue; }

  if (!CHECK) fs.writeFileSync(abs, out);
  replaced++;
  console.log(`  ${CHECK ? 'would update' : 'updated'}  ${rel}`);
}

// tree-wide residual sweep
const walk = (d, acc = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'scripts-staging') continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc); else if (e.name.endsWith('.html') || e.name.endsWith('.js')) acc.push(p);
  }
  return acc;
};
let residual = 0;
for (const p of walk(REPO)) {
  OLD_RE.lastIndex = 0;
  residual += [...fs.readFileSync(p, 'utf8').matchAll(OLD_RE)].length;
}

console.log(`\nsites expected=13 ${CHECK ? 'matched' : 'updated'}=${replaced}  residual old-shape occurrences tree-wide=${residual}`);
if (replaced !== 13) failures.push(`expected 13 sites, got ${replaced}`);
if (!CHECK && residual !== 0) failures.push(`expected 0 residual, got ${residual}`);
if (failures.length) { failures.forEach((f) => console.error('  FAIL ' + f)); process.exit(1); }
console.log('s43 charter-unit gate OK');
