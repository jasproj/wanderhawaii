#!/usr/bin/env node
/**
 * Split hyphen-joined compound tags in tours-data.json.
 *   node scripts/normalize-tags.mjs           report only
 *   node scripts/normalize-tags.mjs --write   apply
 *
 * WHY. The FareHarbor DN marketplace export ships `tags` as a single hyphen-joined
 * string, e.g. "Boat Tour-Eco Tour-Guided Tour-Hiking". Rows imported without
 * splitting carry that whole string as ONE tag, so an exact-match filter option
 * finds them under nothing. 11 rows in this catalogue are in that state; split,
 * they become reachable under 12 distinct shipped options.
 *
 * THE HYPHENATED-TOKEN GUARD. A naive split('-') also breaks legitimate tokens that
 * contain a hyphen. Measured across 5,152 export rows: "E-Bike" is the only such
 * token, affecting 20 of 4,529 non-empty tag values (0.44%). ZERO wanderhawaii rows
 * are affected today. The guard is here because it belongs wherever the split lives,
 * not wherever it currently bites -- when the Hawaii export lands and tags are joined
 * at ingest, that step must call splitTagValue() rather than reimplement it.
 *
 * Idempotent: an already-split array is left alone.
 */
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(new URL('..', import.meta.url).pathname);
const FILE = path.join(REPO, 'tours-data.json');

/** Tokens that legitimately contain a hyphen and must survive the split. */
export const HYPHENATED_TOKENS = ['E-Bike'];

/**
 * Compound iff it contains a hyphen. Known hyphenated tokens are preserved by
 * re-merging after the split (see splitTagValue), so they need no exclusion here.
 *
 * THE THRESHOLD IS DELIBERATELY LOOSE, and the asymmetry is why. Over-splitting is
 * free: the filter option list is a CURATED allow-list of 23, so any token a split
 * produces that is not an option is inert and can never render. Under-splitting
 * leaves rows unreachable by every option. An earlier cutoff of `>=3 segments AND
 * >25 chars` caught 11 live rows; `>=3 segments` caught 12; this rule catches 26.
 * Those were three answers to three different questions, and only the last one was
 * about compound tags.
 */
export const isCompound = (v) => typeof v === 'string' && v.includes('-');

/**
 * Split one hyphen-joined tag value, re-merging known hyphenated tokens.
 *
 * Split-then-remerge rather than protect-then-restore: a sentinel-based guard needs
 * a placeholder character that cannot occur in the data, and the first draft of this
 * file used a literal NUL for it -- which worked, and made the source binary to git.
 * No sentinel means no such trap.
 */
export function splitTagValue(value) {
  if (!isCompound(value)) return [value];
  const parts = value.split('-').map((p) => p.trim()).filter(Boolean);
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const pair = parts[i] + '-' + (parts[i + 1] || '');
    const known = HYPHENATED_TOKENS.some((t) => t.toLowerCase() === pair.toLowerCase());
    if (i + 1 < parts.length && known) { out.push(pair); i++; }
    else out.push(parts[i]);
  }
  return out;
}

// ---- runner ---------------------------------------------------------------
const isMain = process.argv[1] && process.argv[1].endsWith('normalize-tags.mjs');
if (isMain) {
  const write = process.argv.includes('--write');
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  let changed = 0, before = 0, after = 0;
  const report = [];
  for (const t of data.tours) {
    const tags = t.tags;
    if (!Array.isArray(tags) || !tags.some(isCompound)) continue;
    const out = [];
    for (const v of tags) for (const p of splitTagValue(v)) if (!out.includes(p)) out.push(p);
    report.push({ pk: t.pk, name: (t.name || '').slice(0, 38), from: tags, to: out });
    before += tags.length;
    after += out.length;
    changed++;
    if (write) t.tags = out;
  }
  console.log('rows carrying a compound tag: ' + changed);
  for (const r of report) {
    console.log('  pk=' + r.pk + '  ' + r.name);
    console.log('     from ' + JSON.stringify(r.from));
    console.log('       to ' + JSON.stringify(r.to));
  }
  console.log('\ntag values ' + before + ' -> ' + after);
  if (write) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
    console.log('WROTE tours-data.json');
  } else {
    console.log('(report only; pass --write to apply)');
  }
}
