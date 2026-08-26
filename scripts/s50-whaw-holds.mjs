#!/usr/bin/env node
// s50-whaw-holds: rulings on the #259 hold classes + the Kamaʻāina data defect. No re-probe — every ladder is
//   the 4-date 2026-08-26 reading stored in priceTiers by s50-whaw-refresh.
//   1. Kamaʻāina class: the never-anchor test is now unicode-normalised (NFC, okina/ʻ/‘/’/' folded, macrons
//      stripped) — D-654. The rows whose anchor is a resident/military tier re-anchor on their public tier
//      via the s50 rules; resident-shaped units are stripped.
//   2. Explicit rulings (2026-08-26) on the 21 held rows and the 4 D-620 Tahiti rows (status → inactive,
//      reversible: outside WHAW's Hawaii scope + EUR — a scope violation, not a price question).
//   Every touched row: priceSource s50-whaw-holds, priceEnrichmentAt (real clock), priceBasis, priceTiers,
//   priceConfidence. Rows outside the ruled set byte-identical (round-trip assert).
//   usage: node scripts/s50-whaw-holds.mjs [--dry-run]
import fs from 'node:fs';
const FILE = 'tours-data.json', EV = 'scripts/evidence/s50-whaw-holds', SOURCE = 's50-whaw-holds';
const DRY = process.argv.includes('--dry-run');
const raw = fs.readFileSync(FILE, 'utf8'); const doc = JSON.parse(raw);
if (JSON.stringify(doc, null, 2) + '\n' !== raw) { console.error('ABORT: no byte round-trip (D-599)'); process.exit(2); }
const byPk = new Map(doc.tours.map(t => [t.pk, t]));
// ---- D-654: fold before any word test ----
const fold = s => (s || '').normalize('NFC').replace(/[ʻ‘’`´]/g, "'").normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const RESIDENT = /\bkama'?aina\b|\bkamaaina\b|\bresident\b|\bmilitary\b|\blocal rate\b/i;
// classifier — the s50-whaw-refresh regexes, applied to folded strings; WEEK/uppercase durations now match (case-insensitive already; fold adds okina variants)
const NEVER = /\b(child|childs|child's|children|childrens|children's|kid|kids|kid's|keiki|infant|infants|baby|babies|toddler|junior|juniors|youth|youths|teen|teenager|teens|adolescent|adolescents|young adult|student|students|senior|seniors|kupuna|kama'aina|kamaaina|military|concession|concessions|pensioner|disabled|wheelchair|carer|companion|discount|under\s*\d+s?|\d+\s*(and|&)\s*under|family|families|bundle|package|add[- ]?on|extra|extras|additional|supplement|upgrade|gratuity|tip|tips|donation|deposit|deposits|voucher|gift card|redemption|per additional|spectator|rider[- ]?along|ride[- ]?along|non[- ]?participant|non[- ]?diver|non[- ]?snorkeler|observer|dog|dogs|pet|pets|merchandise|parking|photo|photos|video|rash ?guard|wetsuit|fins|gopro|meal|lunch|elearn|e-learn|online only|waitlist|unconfirmed|resident|local rate)\b/i;
const TRANSPORT_ONLY = /^(r\/t|round[- ]trip|one[- ]way)?\s*(transportation|transport|shuttle|transfer)\s*(only)?$/i;
const NOTE_NEVER = /^\s*extras?\b|\ban (optional )?extra\b|\bprice per item\b|\badd[- ]on\b|\bdeposit\b|\b(each|per) additional\b|\badditional (guest|person|adult|passenger|people)s?\b/i;
const WORDNUM = '(two|three|four|five|six|seven|eight|nine|ten|twelve|\\d+)';
const GROUP = new RegExp('\\b(per group|group|groups|party|parties|private|exclusive|charter|boat|vessel|vehicle|car|van|minibus|coach|table|room|cabin|pod|lane|court|couple|couples|for two|for 2|whole|hire|rental|raft|canoe|kayak|seater|privado|privada|grupo|nights?|berth|capacity|hasta \\d+|' + WORDNUM + '\\s*(people|persons|ppl|pax|guests|players|riders|passengers|adults|students|divers|paddlers|pasajeros|personas)|up to \\d+)\\b', 'i');
const BASE_WORDS = 'adult|adults|person|per person|standard|general|guest|guests|visitor|participant|passenger|rider|player|diver|snorkeler|paddler|ticket|seat|single|individual|one person|1 person|per seat';
const BASE = new RegExp('\\b(' + BASE_WORDS + ')\\b', 'i'); const BASE_HEAD = new RegExp('^(' + BASE_WORDS + ')\\b', 'i');
const PER_PERSON = /\b(per (person|player|participant|head|adult|guest|rider|passenger|student|diver|pp))\b|\beach person\b|\bpp\b|\b(1|one) (person|student|player|diver)\b(?!\s*(or|to|-|–))/i;
const VOLUME = new RegExp('^(' + WORDNUM + '\\s*(people|persons|adults|guests|players|passengers|students|divers|paddlers)|groups? of|([2-9]|\\d{2,})\\s*(-|–|to|\\+)\\s*\\d*\\s*(people|persons|adults|guests|players|passengers|students|divers|paddlers))\\b', 'i');
const NAME_GROUP = /\b(hire|rental|rentals|charter|charters|private|boat|vessel|whole)\b/i;
function classifyTier(x, productName) {
  const sing = fold(x.name).trim(); const note = fold(x.note);
  if (!(x.price > 0)) return 'zero';
  if (NEVER.test(sing) || TRANSPORT_ONLY.test(sing)) return 'never';
  if (NOTE_NEVER.test(note)) return 'never';
  if (VOLUME.test(sing)) return 'group';
  if (BASE_HEAD.test(sing)) return 'base';
  if (BASE.test(sing) && !GROUP.test(sing)) return 'base';
  if (PER_PERSON.test(note)) return 'base';
  if (GROUP.test(sing) || GROUP.test(note)) return 'group';
  if (NAME_GROUP.test(fold(productName))) return 'group';
  return 'base';
}
const STOP = new Set(['private','tours','hawaii','hawaiian','island','oahu','maui','kauai','kona','with','from','adventure','experience']);
const tokens = name => fold(name).replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(w => w.length >= 5 && !STOP.has(w));
const affine = (c, name) => { const tk = tokens(name); if (!tk.length) return c; const h = c.filter(x => tk.some(w => fold(x.name).includes(w))); return h.length ? h : c; };
const cheapest = xs => xs.reduce((a, b) => b.price < a.price ? b : a);
const fmt = L => L.filter(x => x.price > 0).map(x => `${x.name} $${x.price}`).join(' / ');
const ts = new Date().toISOString();
const decisions = []; // {pk, kind, action:'release'|'hold'|'inactive', price, label, unit, basis, status}
const D = (pk, d) => { if (!byPk.has(pk)) throw new Error('missing ' + pk); decisions.push({ pk, ...d }); };

// ---- 1. Kamaʻāina class, derived from the data ----
const kama = doc.tours.filter(t => t.priceSource === 's50-whaw-refresh' && t.priceConfidence !== 'low' && RESIDENT.test(fold(t.priceLabel)));
const kamaUnits = doc.tours.filter(t => t.priceSource === 's50-whaw-refresh' && RESIDENT.test(fold((t._unknownFields || {}).priceUnit)));
if (kama.length !== 20) { console.error('ABORT: expected 20 resident-anchored rows, found', kama.length); process.exit(3); }
if (!kamaUnits.every(t => kama.includes(t)) || kamaUnits.length !== 2) { console.error('ABORT: resident-unit rows drift', kamaUnits.map(t => t.pk)); process.exit(3); }
for (const t of kama) {
  const L = t.priceTiers || []; const cls = L.map(x => ({ x, cls: classifyTier(x, t.name) }));
  const base = cls.filter(c => c.cls === 'base').map(c => c.x), group = cls.filter(c => c.cls === 'group').map(c => c.x), nz = L.filter(x => x.price > 0);
  const ladder = `ladder ${fmt(L)}; resident/military tier(s) ${L.filter(x => RESIDENT.test(fold(x.name))).map(x => `${x.name} $${x.price}`).join(', ')} never anchor (D-654: never-anchor test unicode-normalised — the okina/macron spelling evaded the ASCII regex in s50-whaw-refresh)`;
  const pub = nz.filter(x => !RESIDENT.test(fold(x.name)));
  if (!pub.length) { D(t.pk, { kind: 'kamaaina', action: 'hold', status: 'zero_price', price: null, label: null, basis: `zero_price: every non-resident tier is $0 (${ladder}); stored 2026-08-26 reading` }); continue; }
  if (base.length) { const a = cheapest(affine(base, t.name)); D(t.pk, { kind: 'kamaaina', action: 'release', price: a.price, label: a.name, unit: null, basis: `D-624 cheapest adult/base per-person tier ${a.name} $${a.price}; ${ladder}` }); continue; }
  if (group.length) { const a = cheapest(affine(group, t.name)); D(t.pk, { kind: 'kamaaina', action: 'release', price: a.price, label: a.name, unit: a.name.trim(), basis: `${group.length === 1 ? 'D-621 whole-unit' : 'D-614 ladder floor'}: tier "${a.name}" $${a.price} anchors, label verbatim as unit; ${ladder}` }); continue; }
  const a = cheapest(pub); D(t.pk, { kind: 'kamaaina', action: 'hold', status: 'high', price: a.price, label: a.name, basis: `HELD (no adult/base tier once resident tiers are excluded): floor $${a.price} (${a.name}) stamped unpublished; ${ladder}` });
}
// ---- 2. explicit rulings (2026-08-26) ----
const tier = (pk, label) => { const x = (byPk.get(pk).priceTiers || []).find(x => x.name === label); if (!x) throw new Error(`${pk}: tier "${label}" not in stored ladder`); return x; };
const REL = (pk, label, unit, rule) => { const x = tier(pk, label); D(pk, { kind: 'ruled', action: 'release', price: x.price, label: x.name, unit, basis: `${rule}: tier "${x.name}" $${x.price}${x.note ? ` (${x.note})` : ''} anchors${unit ? `, unit "${unit}"` : ''}; ladder ${fmt(byPk.get(pk).priceTiers)}; ruled 2026-08-26 on the 4-date 2026-08-26 reading` }); };
const HOLD = (pk, reason) => D(pk, { kind: 'ruled', action: 'hold', status: 'high', basis: `HELD (ruled 2026-08-26): ${reason}; ladder ${fmt(byPk.get(pk).priceTiers)}` });
// HELD-addon: the tier is the product, unit from the note
REL(50683, 'Birthday Party', 'per party, up to 16 people', 'wave-2 add-on refinement (note advertises extras; the tier is the product)');
REL(50739, 'Private Farm Tour', 'per party, up to 9 people', 'wave-2 add-on refinement (note advertises extras; the tier is the product)');
REL(493441, 'Shorefishing Private Group', 'per group, up to 2 anglers', 'wave-2 add-on refinement (note advertises extras; the tier is the product)');
REL(708433, 'Fireside S’mores Experience', 'per party, up to 4 guests', 'wave-2 add-on refinement (note advertises extras; the tier is the product)');
for (const pk of [357088, 436859, 357097, 516210]) HOLD(pk, 'the only priced tier is a deposit — deposits never anchor; the session price is not published on FareHarbor');
HOLD(651446, 'the sole tier is an ADD ON plate lunch — an add-on product, not a tour; status:inactive ruling queued for Jason');
// HELD-hire
REL(421678, 'Double Kayak', 'Double Kayak · Beach Gear - WEEK RENTAL', 'hire/rental — WEEK in the product name is the duration (case-insensitive duration test)');
REL(471510, 'Private Tour', 'up to 7 guests', 'D-621 whole-unit');
REL(538737, 'Small Surfside Cabana', '6 Guests allowed', 'hire/rental — floor tier with its capacity note as unit');
REL(560195, 'Beach Umbrella', 'Beach Umbrella · Multiple Items - Week Rental', 'hire/rental — Week in the product name is the duration; all five tiers $25');
REL(693804, 'Beginner Set Up - Four Hour Rental', 'Beginner Set Up - Four Hour Rental', 'hire/rental — gear-size label verbatim (not a skill grade)');
HOLD(402403, 'no duration anywhere (tier labels, notes, product name) for a rental floor');
HOLD(420371, 'no duration anywhere (tier labels, notes, product name) for a rental floor');
// HELD-never-only: bundle-is-the-product (s49 sole-audience / child-audience lineage)
REL(24677, 'Semi-private lesson (2:1 Student to Instructor ratio)', '2:1 Student to Instructor', 'sole-audience lineage — "student" names the participant, not a concession');
REL(24690, 'Semi-private lesson (2:1 Student to Instructor ratio)', '2:1 Student to Instructor', 'sole-audience lineage — "student" names the participant, not a concession');
REL(407740, 'Adult - Basic Package', 'Adult - Basic Package', 'bundle-is-the-product — the "package" is the product\'s own tier, cheapest adult tier anchors');
REL(633489, 'Beach Bundle Essential - Full Day Rentals', 'Beach Bundle Essential - Full Day Rentals', 'bundle-is-the-product');
REL(731191, 'AquaVenture, AquaPeakz & Paddle Bundle (Half Day)', 'AquaVenture, AquaPeakz & Paddle Bundle (Half Day)', 'bundle-is-the-product');
// D-620 Tahiti: scope violation → inactive (reversible)
for (const pk of [128706, 128707, 128714, 521666]) D(pk, { kind: 'scope', action: 'inactive', basis: `INACTIVE (ruled 2026-08-26, reversible): outside WHAW's Hawaii scope (Teahupo'o, Tahiti) + prices in EUR (D-620) — a scope violation, not a price question; ladder ${fmt(byPk.get(pk).priceTiers)}` });

// ---- apply ----
const seen = new Set(); for (const d of decisions) { if (seen.has(d.pk)) throw new Error('dup ' + d.pk); seen.add(d.pk); }
const before = doc.tours.map(t => JSON.stringify(t));
for (const d of decisions) {
  const t = byPk.get(d.pk); t.priceSource = SOURCE; t.priceEnrichmentAt = ts; t.priceBasis = d.basis; t.priceTiers = t.priceTiers || [];
  if (d.action === 'release') { t.currency = 'USD'; t.price = d.price; t.priceLabel = d.label; t.priceConfidence = 'high'; t.priceEnrichmentStatus = 'high';
    if (d.unit) t._unknownFields = { ...(t._unknownFields || {}), priceUnit: d.unit }; else if (t._unknownFields) delete t._unknownFields.priceUnit; }
  else if (d.action === 'hold') { t.priceConfidence = 'low'; if (d.status) t.priceEnrichmentStatus = d.status; if ('price' in d) { t.price = d.price; t.priceLabel = d.label; } if (t._unknownFields) delete t._unknownFields.priceUnit; }
  else if (d.action === 'inactive') { t.status = 'inactive'; t.statusReason = 'outside WHAW Hawaii scope (Tahiti) + EUR pricing (D-620); s50-whaw-holds 2026-08-26'; t.priceConfidence = 'low'; if (t._unknownFields) delete t._unknownFields.priceUnit; }
}
const after = doc.tours.map(t => JSON.stringify(t));
const changed = after.map((s, i) => s !== before[i] ? i : -1).filter(i => i >= 0);
const outside = changed.filter(i => !seen.has(doc.tours[i].pk)); if (outside.length || doc.tours.length !== before.length) { console.error('ABORT: rows outside ruled set changed'); process.exit(4); }
if (changed.length !== decisions.length) { console.error('ABORT: a ruled row did not change', changed.length, decisions.length); process.exit(4); }
const tally = {}; for (const d of decisions) { const k = `${d.kind}:${d.action}`; tally[k] = (tally[k] || 0) + 1; }
const result = { stampedAt: ts, ruled: decisions.length, rowsChanged: changed.length, tally, decisions: decisions.map(d => ({ ...d, name: byPk.get(d.pk).name })) };
if (!DRY) { fs.writeFileSync(FILE, JSON.stringify(doc, null, 2) + '\n'); fs.writeFileSync(`${EV}/apply-summary.json`, JSON.stringify(result, null, 1) + '\n'); }
console.log(JSON.stringify({ dry: DRY, ruled: decisions.length, rowsChanged: changed.length, tally }));
for (const d of decisions.filter(d => d.kind === 'kamaaina')) console.log(`  kama ${d.pk} ${byPk.get(d.pk).name.slice(0, 34)} | ${byPk.get(d.pk).price} ${byPk.get(d.pk).priceLabel} -> ${d.action} ${d.price ?? ''} ${d.label ?? ''} ${d.unit ? '«' + d.unit + '»' : ''}`);
