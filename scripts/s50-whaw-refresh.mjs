#!/usr/bin/env node
// s50-whaw-refresh: 88-day price-stamp refresh of the 1,814 EXPOSED stale rows (WENG s48/s49 playbook port).
//   Purpose of the batch: END THE UNDATED-OVERWRITE ERA. Every s39–s45 pass rewrote price/priceConfidence/
//   priceLabel with no date stamp; after this batch every touched row carries priceSource / priceBasis /
//   priceTiers / priceConfidence / priceEnrichmentAt so the next census selects by stamp, not by commit diff.
//   Population: scripts/evidence/s50-whaw-refresh/population.json (1,814 pks derived at origin/main
//   c0685fea… — rendered with a visible price + JSON-LD offer whose newest price evidence predates
//   2026-08-01). Re-asserted in-branch at run time: pk present, FH embeds URL pk match, numeric price,
//   status!=inactive, !bookingDead, hasUsablePrice, no priceSource, no post-08-01 stamp.
//   Endpoint/batching per the vendored extract-prices-v7-api.js lineage (D-613): price-preview/per-item/v2,
//   include_breakdown=yes, ≤20 pks/request, 1 req/s, dated requests (D-606 date-validity instrument).
//   Rules: D-624 cheapest ADULT/BASE per-person tier anchors "From" (child/infant/senior/add-on/gratuity/
//   deposit tiers never anchor — deposits never anchor). D-625 same-type ladders → cheapest base wins.
//   Group-only ladders (s49 unit rules): D-614 party-size/party-total floor OR s48-R1 falling per-head
//   largest band — in both the cheapest group tier anchors, tier label VERBATIM as _unknownFields.priceUnit,
//   never derived from priceLabel. D-621 whole-boat same. Anchor tier itself add-on-shaped → HELD low
//   (add-on abort per row). hire/rental floor must carry a duration and not be a skill grade → else HELD.
//   Child-audience product (never-only ladder) anchors on its child tier. D-620 non-USD → HELD low,
//   true currency stamped. UNSAMPLED → low (stored price retained unpublished). zero_price → low, null.
//   usage: node scripts/s50-whaw-refresh.mjs probe|apply [--dry-run]
import fs from 'node:fs';
const FILE = 'tours-data.json';
const EV = 'scripts/evidence/s50-whaw-refresh';
const SOURCE = 's50-whaw-refresh';
const DATES = ['2026-08-31', '2026-09-14', '2026-09-28', '2026-10-19'];
const BATCH = 20, RATE_MS = 1000, TIMEOUT_MS = 25000;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const mode = process.argv[2]; const DRY = process.argv.includes('--dry-run');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const u = c => Number((c / 100).toFixed(2));

function parseFhUrl(bookingUrl) {   // identical to v7
  if (!bookingUrl || !bookingUrl.includes('fareharbor.com')) return null;
  const m = bookingUrl.match(/fareharbor\.com\/(?:embeds\/book\/)?([^/]+)\/items\/(\d+)/);
  if (!m) return null; const [, shortname, pk] = m;
  if (shortname === 'embeds' || shortname === 'items') return null;
  return { shortname, pk: Number(pk) };
}
const raw = fs.readFileSync(FILE, 'utf8'); const doc = JSON.parse(raw);
if (JSON.stringify(doc, null, 2) + '\n' !== raw) { console.error('ABORT: no byte round-trip (D-599)'); process.exit(2); }
const POP = JSON.parse(fs.readFileSync(`${EV}/population.json`, 'utf8'));
const popSet = new Set(POP.population);
// app.js gates, copied verbatim (app.js hasUsablePrice + loader predicate)
const hasUsablePrice = t => Number.isFinite(t.price) && t.price > 1 && t.priceConfidence !== 'low';
const byPk = new Map(doc.tours.map(t => [t.pk, t]));
const pop = [];
for (const pk of POP.population) {
  const t = byPk.get(pk); if (!t) { console.error('ABORT: population pk missing', pk); process.exit(2); }
  const p = parseFhUrl(t.bookingUrl); if (!p || p.pk !== pk) { console.error('ABORT: bookingUrl pk mismatch', pk); process.exit(2); }
  if (t.status === 'inactive' || t.bookingDead || !hasUsablePrice(t)) { console.error('ABORT: population row no longer exposed', pk); process.exit(2); }
  if ('priceSource' in t || String(t.priceEnrichmentAt || '').slice(0, 10) >= '2026-08-01' || String(t.lastUpdated || '').slice(0, 10) >= '2026-08-01') { console.error('ABORT: population row already freshly stamped', pk); process.exit(2); }
  pop.push(t);
}
if (pop.length !== 1814) { console.error('ABORT: population is not 1,814:', pop.length); process.exit(2); }
console.error(`population ${pop.length} rows`);

async function get(url, ms) {
  const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: ac.signal });
    if (r.status !== 200) return { err: 'HTTP ' + r.status }; return { j: await r.json() }; }
  catch (e) { return { err: String(e.name === 'AbortError' ? 'timeout' : e.message) }; } finally { clearTimeout(tm); }
}
const batchUrl = (sn, pks, date) => `https://fareharbor.com/api/embed/${sn}/price-preview/per-item/v2/?item_pks=${pks.join(',')}&include_breakdown=yes&date=${date}`;

async function probe() {
  const bySn = new Map();
  for (const t of pop) { const { shortname } = parseFhUrl(t.bookingUrl); if (!bySn.has(shortname)) bySn.set(shortname, []); bySn.get(shortname).push(t.pk); }
  const out = { startedAt: new Date().toISOString(), dates: DATES, population: pop.length, shortnames: bySn.size, requests: 0, retries: [], perPk: {} };
  for (const t of pop) out.perPk[t.pk] = { probes: [] };
  async function run(sn, pks, date, depth) {
    out.requests++;
    const x = await get(batchUrl(sn, pks, date), TIMEOUT_MS); await sleep(RATE_MS);
    if (x.err && /timeout|HTTP 5|fetch failed/.test(x.err) && pks.length > 1 && depth < 2) {
      out.retries.push({ sn, date, size: pks.length, err: x.err, split: true });
      const h = Math.ceil(pks.length / 2); await sleep(2000);
      await run(sn, pks.slice(0, h), date, depth + 1); await run(sn, pks.slice(h), date, depth + 1); return;
    }
    if (x.err && /timeout|HTTP 5|fetch failed/.test(x.err) && depth < 2) {   // single-pk bounded retry
      out.retries.push({ sn, date, size: pks.length, err: x.err, split: false }); await sleep(3000); return run(sn, pks, date, depth + 1);
    }
    const items = new Map(((x.j && x.j.items) || []).map(it => [Number(it.id), it]));
    for (const pk of pks) {
      const it = items.get(pk); const p = { date, error: x.err || null };
      if (!x.err) { p.absent = !it; p.liveCurrency = x.j.details?.currency ?? null; p.includeFees = x.j.details?.prices_include_booking_fees ?? null; p.includeTaxes = x.j.details?.prices_include_taxes ?? null; }
      if (it) { const sa = it.availability?.start_at || null; p.start_at = sa; p.dateValid = !!sa && sa.slice(0, 10) === date;
        const cts = Array.isArray(it.price?.breakdown?.customer_types) ? it.price.breakdown.customer_types : [];
        p.tiers = cts.map(c => ({ id: c.id, singular: c.singular, plural: c.plural, note: c.note, priceCents: c.price, min: c.min_party_size }));
        p.low = it.price?.low ?? null; p.zeroOnly = !cts.some(c => c.price > 0); }
      out.perPk[pk].probes.push(p);
    }
  }
  let n = 0;
  for (const [sn, pks] of bySn) {
    for (let i = 0; i < pks.length; i += BATCH) for (const date of DATES) await run(sn, pks.slice(i, i + BATCH), date, 0);
    n++; if (n % 10 === 0) process.stderr.write(`${new Date().toISOString()} ${n}/${bySn.size} operators, ${out.requests} req\n`);
    if (n % 10 === 0) fs.writeFileSync(`${EV}/probe.json`, JSON.stringify(out));
  }
  out.finishedAt = new Date().toISOString();
  const bad = Object.entries(out.perPk).filter(([, v]) => v.probes.length !== DATES.length);
  out.reconcile = { population: pop.length, attempted: Object.keys(out.perPk).length, pksWithFullProbeSet: pop.length - bad.length, incomplete: bad.map(([k]) => k) };
  fs.writeFileSync(`${EV}/probe.json`, JSON.stringify(out));
  console.log(JSON.stringify({ requests: out.requests, retries: out.retries.length, reconcile: out.reconcile }));
}

// ---- tier classification (D-624 / D-625 / D-621 / D-614 / s48-R1 / s49 deltas) ----
const NEVER = /\b(child|childs|child's|children|childrens|children's|kid|kids|kid's|keiki|infant|infants|baby|babies|toddler|junior|juniors|youth|youths|teen|teenager|teens|adolescent|adolescents|young adult|student|students|senior|seniors|kupuna|kama'aina|kamaaina|kama’aina|military|concession|concessions|pensioner|disabled|wheelchair|carer|companion|discount|under\s*\d+s?|\d+\s*(and|&)\s*under|family|families|bundle|package|add[- ]?on|extra|extras|additional|supplement|upgrade|gratuity|tip|tips|donation|deposit|deposits|voucher|gift card|redemption|per additional|spectator|rider[- ]?along|ride[- ]?along|non[- ]?participant|non[- ]?diver|non[- ]?snorkeler|observer|dog|dogs|pet|pets|merchandise|parking|photo|photos|video|rash ?guard|wetsuit|fins|gopro|meal|lunch|elearn|e-learn|online only|waitlist|unconfirmed|niño|niños|niña|niñas|bebé|bebe|infante|儿童|孩子|学生|老年|优惠)\b|儿童|孩子|学生|老年|优惠/i;
// a tier that is ONLY transport ("R/T Transportation", "Shuttle only") is an add-on; a product tier "…with Round-Trip Transportation" is not
const TRANSPORT_ONLY = /^(r\/t|round[- ]trip|one[- ]way)?\s*(transportation|transport|shuttle|transfer)\s*(only)?$/i;
const AGE_RANGE = /\b\d{1,2}\s*(-|–|to)\s*\d{1,2}\s*(yrs|rys|years|year olds|yr olds|y\/o|y\/old|yo|años|ans|anni)\b/i;
const WORDNUM = '(two|three|four|five|six|seven|eight|nine|ten|twelve|\\d+)';
const GROUP = new RegExp('\\b(per group|group|groups|party|parties|private|exclusive|charter|boat|vessel|vehicle|car|van|minibus|coach|table|room|cabin|pod|lane|court|couple|couples|for two|for 2|whole|hire|rental|raft|canoe|kayak|seater|privado|privada|grupo|nights?|berth|capacity|hasta \\d+|' + WORDNUM + '\\s*(people|persons|ppl|pax|guests|players|riders|passengers|adults|students|divers|paddlers|pasajeros|personas)|up to \\d+)\\b', 'i');
const BASE_WORDS = 'adult|adults|person|per person|standard|general|guest|guests|visitor|participant|passenger|rider|player|diver|snorkeler|paddler|ticket|seat|single|individual|one person|1 person|per seat';
const BASE = new RegExp('\\b(' + BASE_WORDS + ')\\b', 'i');
const BASE_HEAD = new RegExp('^(' + BASE_WORDS + ')\\b', 'i');
const PER_PERSON = /\b(per (person|player|participant|head|adult|guest|rider|passenger|student|diver|pp))\b|\beach person\b|\bpp\b|\b(1|one) (person|student|player|diver)\b(?!\s*(or|to|-|–))/i;
const NOTE_NEVER = /^\s*extras?\b|\ban (optional )?extra\b|\bprice per item\b|\badd[- ]on\b|\bdeposit\b|\b(each|per) additional\b|\badditional (guest|person|adult|passenger|people)s?\b/i;
const VOLUME = new RegExp('^(' + WORDNUM + '\\s*(people|persons|adults|guests|players|passengers|students|divers|paddlers)|groups? of|([2-9]|\\d{2,})\\s*(-|–|to|\\+)\\s*\\d*\\s*(people|persons|adults|guests|players|passengers|students|divers|paddlers))\\b', 'i');
const NAME_GROUP = /\b(hire|rental|rentals|charter|charters|private|boat|vessel|whole)\b/i;
function classifyTier(t, productName) {
  const sing = (t.singular || '').trim(); const note = t.note || '';
  if (!(t.priceCents > 0)) return 'zero';
  if (NEVER.test(sing) || AGE_RANGE.test(sing) || TRANSPORT_ONLY.test(sing)) return 'never';
  if (NOTE_NEVER.test(note)) return 'never';
  if (VOLUME.test(sing)) return 'group';
  if (BASE_HEAD.test(sing)) return 'base';
  if (BASE.test(sing) && !GROUP.test(sing)) return 'base';
  if (PER_PERSON.test(note)) return 'base';
  if (GROUP.test(sing) || GROUP.test(note)) return 'group';
  if (NAME_GROUP.test(productName || '')) return 'group';
  return 'base';
}
// s49 deltas
const ADDON_LABEL = /per additional|\badditional\b|\bextra\b|\badd[- ]?on\b|\bsupplement\b|\bper item\b|\bdeposit\b/i;
const ADDON_NOTE = /\b(each|per) additional\b|\badditional (guest|person|adult|passenger|people)s?\b|\bprice per item\b|\badd[- ]?on\b|\bdeposit\b/i;
// product-name affinity: when a ladder bundles sibling products, a tier that names the product outranks a cheaper tier that does not
const STOP = new Set(['private','tours','hawaii','hawaiian','island','oahu','maui','kauai','kona','with','from','adventure','experience']);
const tokens = name => (name || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(w => w.length >= 5 && !STOP.has(w));
function affine(cands, productName) { const tk = tokens(productName); if (!tk.length) return cands; const hit = cands.filter(x => { const n = (x.singular || '').toLowerCase(); return tk.some(w => n.includes(w)); }); return hit.length ? hit : cands; }
const DURATION = /\b(\d+(\.\d+)?|one|two|three|four|five|six|half|full|all)[\s-]*(hour|hours|hr|hrs|day|days|minute|minutes|min|mins|night|nights|week|weeks)\b|\bhalf[\s-]?(day|hour)\b|\ball[\s-]?day\b|\bovernight\b|\bday (hire|rental)\b|\bweekly\b|\bdaily\b|\bhourly\b/i;
const SKILL = /\b(beginner|beginners|intermediate|advanced|novice|expert|improver)\b/i;
const HIRE = /\b(hire|rental|rentals|rent)\b/i;
const CHILD_PRODUCT = /\b(kids?|keiki|children|child|junior|youth)\b/i;

function apply() {
  const ev = JSON.parse(fs.readFileSync(`${EV}/probe.json`, 'utf8'));
  if (!ev.reconcile || ev.reconcile.incomplete.length) { console.error('ABORT: probe incomplete'); process.exit(5); }
  if (ev.population !== pop.length || ev.reconcile.attempted !== pop.length) { console.error('ABORT: population drift since probe'); process.exit(5); }
  const moved = Object.values(ev.perPk).some(v => new Set(v.probes.filter(p => p.start_at).map(p => p.start_at)).size > 1);
  if (!moved) { console.error('ABORT: date parameter ignored (no start_at moved)'); process.exit(6); }
  const ts = new Date().toISOString();   // REAL dated stamp — the purpose of this batch
  const before = doc.tours.map(t => JSON.stringify(t));
  const summary = []; const disp = {}; const bump = k => { disp[k] = (disp[k] || 0) + 1; };
  const fmt = L => L.map(x => `${x.name} $${x.price}`).join(' / ');
  for (const t of pop) {
    const v = ev.perPk[t.pk]; const ok = v.probes.filter(p => !p.error); const sampled = ok.filter(p => !p.absent);
    const old = { price: t.price, label: t.priceLabel, conf: t.priceConfidence };
    const rec = { pk: t.pk, name: t.name, old: old.price, oldLabel: old.label };
    const tiersOf = p => p.tiers.map(x => ({ name: x.singular, note: x.note || '', price: u(x.priceCents), minPartySize: x.min ?? null }));
    const stamp = status => { t.priceSource = SOURCE; t.priceEnrichmentSource = 'extract-prices-v7-api'; t.priceEnrichmentAt = ts; t.priceEnrichmentStatus = status; };
    const hold = (status, basis, dispo) => { t.priceConfidence = 'low'; stamp(status); t.priceBasis = basis; if (t._unknownFields) delete t._unknownFields.priceUnit; Object.assign(rec, { disposition: dispo, new: t.price }); bump(dispo); summary.push(rec); };
    if (sampled.length === 0) {
      t.priceTiers = (t.priceBreakdown || []).map(x => ({ name: x.singular, note: x.note || '', price: x.price, minPartySize: x.minPartySize ?? null }));
      rec.probeErrors = v.probes.filter(p => p.error).map(p => p.error);
      hold(ok.length ? 'unsampled' : 'probe_error', `UNSAMPLED: absent from price-preview items[] on ${ok.length}/${DATES.length} dated probes (${DATES.join(', ')})${ok.length < DATES.length ? `, ${DATES.length - ok.length} probe error(s)` : ''}; stored $${old.price}${old.label ? ` (${old.label})` : ''} retained unpublished pending a live reading`, ok.length ? 'UNSAMPLED' : 'PROBE_ERROR');
      continue;
    }
    const key = p => JSON.stringify(p.tiers.map(x => [x.singular, x.priceCents]));
    const counts = new Map(); for (const p of sampled) counts.set(key(p), (counts.get(key(p)) || 0) + 1);
    const majKey = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]; const maj = sampled.find(p => key(p) === majKey);
    const valid = sampled.filter(p => p.dateValid).length;
    const evid = `${sampled.length}/${DATES.length} dated readings (${valid} date-valid), ${counts.size} ladder shape(s)`;
    const cur = maj.liveCurrency; const L = tiersOf(maj);
    t.priceBreakdown = maj.tiers.map(c => ({ id: c.id, singular: c.singular, plural: c.plural, note: c.note, priceCents: c.priceCents, price: u(c.priceCents), minPartySize: c.min }));
    t.priceIncludesBookingFees = maj.includeFees; t.priceIncludesTaxes = maj.includeTaxes; t.priceTiers = L;
    const classes = maj.tiers.map(x => ({ x, cls: classifyTier(x, t.name) }));
    rec.tiers = classes.map(c => ({ singular: c.x.singular, note: c.x.note || '', price: u(c.x.priceCents), min: c.x.min, cls: c.cls }));
    const base = classes.filter(c => c.cls === 'base').map(c => c.x); const group = classes.filter(c => c.cls === 'group').map(c => c.x);
    const nz = maj.tiers.filter(x => x.priceCents > 0); const cheapest = xs => xs.reduce((a, b) => b.priceCents < a.priceCents ? b : a);
    const release = (anchor, unit, rule, extra) => {
      if (ADDON_LABEL.test(anchor.singular) || ADDON_NOTE.test(anchor.note || '')) { hold('high', `HELD (add-on abort): anchor tier "${anchor.singular}"${anchor.note ? ` (${anchor.note})` : ''} is itself add-on/deposit-shaped; ladder ${fmt(L.filter(x => x.price > 0))}; ${evid}; live USD`, 'HELD-addon'); return; }
      t.currency = 'USD'; t.price = u(anchor.priceCents); t.priceLabel = anchor.singular; t.priceConfidence = 'high'; stamp('high');
      t.priceBasis = `${rule}: ${extra}; ${evid}; live USD`;
      if (unit) t._unknownFields = { ...(t._unknownFields || {}), priceUnit: unit }; else if (t._unknownFields) delete t._unknownFields.priceUnit;
      const changed = old.price !== t.price;
      Object.assign(rec, { disposition: changed ? 'repriced' : 'unchanged', new: t.price, label: anchor.singular, unit: unit || null, rule }); bump(changed ? 'repriced' : 'unchanged'); summary.push(rec);
    };
    if (!nz.length) {
      t.price = null; t.priceLabel = null;
      hold('zero_price', `zero_price: every live tier is $0 on the majority reading (${L.map(x => x.name).join(' / ')}); ${evid}; live ${cur}`, 'zero_price'); continue;
    }
    if (cur !== 'USD') {
      const anchor = cheapest(base.length ? base : nz); t.currency = cur; t.price = u(anchor.priceCents); t.priceLabel = anchor.singular;
      hold(`non_usd_currency:${cur}`, `HELD (D-620): live details.currency ${cur} ≠ site USD; true amount ${cur} ${t.price} (${anchor.singular}) stamped, unpublished; ${evid}`, 'D-620'); continue;
    }
    if (base.length) {
      const aff = affine(base, t.name); const anchor = cheapest(aff);
      const affNote = aff.length !== base.length ? `; product-name affinity preferred ${aff.map(x => x.singular).join(' / ')} over ${base.filter(x => !aff.includes(x)).map(x => `${x.singular} $${u(x.priceCents)}`).join(', ')}` : '';
      const skipped = classes.filter(c => c.cls !== 'base' && c.x.priceCents > 0).map(c => `${c.x.singular} $${u(c.x.priceCents)} [${c.cls}]`);
      release(anchor, null, 'D-624 cheapest adult/base per-person tier', `${anchor.singular} $${u(anchor.priceCents)}${base.length > 1 ? ` of ${base.length} base tiers (D-625)` : ''}${affNote}${skipped.length ? `; not anchoring: ${skipped.join(', ')}` : ''}`); continue;
    }
    if (group.length) {
      const ga = affine(group, t.name); const g = ga.sort((a, b) => a.priceCents - b.priceCents); const anchor = g[0];
      const gAff = ga.length !== group.length ? `; product-name affinity preferred ${ga.map(x => x.singular).join(' / ')} over ${group.filter(x => !ga.includes(x)).map(x => `${x.singular} $${u(x.priceCents)}`).join(', ')}` : '';
      if (HIRE.test(t.name)) {
        if (SKILL.test(anchor.singular)) { hold('high', `HELD (hire/rental rule): floor label "${anchor.singular}" is a skill grade, not a duration/unit; ladder ${fmt(L.filter(x => x.price > 0))}; ${evid}; live USD`, 'HELD-hire'); continue; }
        if (!DURATION.test(anchor.singular + ' ' + (anchor.note || '')) && DURATION.test(t.name)) { release(anchor, `${anchor.singular.trim()} · ${t.name.trim()}`, 'hire/rental (s49 delta, duration from product name)', `item priced per duration — floor tier "${anchor.singular}" $${u(anchor.priceCents)} anchors; the duration is the product name "${t.name}" quoted verbatim in the unit; ladder ${fmt(L.filter(x => x.price > 0))}`); continue; }
        if (!DURATION.test(anchor.singular + ' ' + (anchor.note || ''))) { hold('high', `HELD (hire/rental rule): floor label "${anchor.singular}"${anchor.note ? ` (${anchor.note})` : ''} carries no duration/unit; ladder ${fmt(L.filter(x => x.price > 0))}; ${evid}; live USD`, 'HELD-hire'); continue; }
        release(anchor, anchor.singular.trim(), 'hire/rental (s49 delta)', `item priced per duration — floor tier "${anchor.singular}" $${u(anchor.priceCents)} anchors with the tier label verbatim as unit; ladder ${fmt(L.filter(x => x.price > 0))}`); continue;
      }
      // party ladders: party-total (price rises with band) → D-614 floor; per-head (price falls as band grows) → s48-R1 largest band. Both = cheapest group tier, label verbatim as unit.
      const rule = group.length === 1 ? 'D-621 whole-boat/whole-unit' : 'D-614 party-size/party-total ladder floor (s48-R1 when per-head)';
      release(anchor, anchor.singular.trim(), rule, `floor tier "${anchor.singular}" $${u(anchor.priceCents)}${anchor.note ? ` (${anchor.note})` : ''} anchors with the tier label verbatim as unit${gAff}; ladder ${fmt(L.filter(x => x.price > 0))}`); continue;
    }
    // never-only ladder
    if (CHILD_PRODUCT.test(t.name)) { const anchor = cheapest(nz); release(anchor, anchor.singular.trim(), 'child-audience product (s49 delta)', `product audience is children, anchors on its child tier "${anchor.singular}" $${u(anchor.priceCents)}, label verbatim as unit; ladder ${fmt(L.filter(x => x.price > 0))}`); continue; }
    if (nz.length === 1) { const anchor = nz[0]; release(anchor, anchor.singular.trim(), 'single-tier product (s49 delta)', `sole tier "${anchor.singular}" $${u(anchor.priceCents)} is the audience, anchors with label verbatim as unit; ladder ${fmt(L.filter(x => x.price > 0))}`); continue; }
    const floor = cheapest(nz); t.currency = 'USD'; t.price = u(floor.priceCents); t.priceLabel = floor.singular;
    hold('high', `HELD (no adult/base tier): live ladder ${fmt(L.filter(x => x.price > 0))} has only never-anchor tiers; floor $${t.price} (${floor.singular}) stamped unpublished pending ruling; ${evid}; live USD`, 'HELD-never-only');
  }
  const after = doc.tours.map(t => JSON.stringify(t));
  const changedIdx = after.map((s, i) => s !== before[i] ? i : -1).filter(i => i >= 0);
  const outside = changedIdx.filter(i => !popSet.has(doc.tours[i].pk));
  if (outside.length || doc.tours.length !== before.length) { console.error('ABORT: rows outside population changed', outside.length); process.exit(4); }
  const untouchedInPop = pop.length - changedIdx.length;
  if (summary.length !== pop.length) { console.error('ABORT: summary/population mismatch', summary.length); process.exit(4); }
  const result = { purpose: 'end the undated-overwrite era: every touched row carries priceSource/priceBasis/priceTiers/priceConfidence/priceEnrichmentAt', stampedAt: ts, population: pop.length, attempted: ev.reconcile.attempted, succeeded: summary.length, rowsChanged: changedIdx.length, untouchedInPop, disposition: disp, summary };
  if (!DRY) { fs.writeFileSync(FILE, JSON.stringify(doc, null, 2) + '\n'); fs.writeFileSync(`${EV}/apply-summary.json`, JSON.stringify(result, null, 1) + '\n'); }
  else if (process.env.DRY_OUT) fs.writeFileSync(process.env.DRY_OUT, JSON.stringify(result, null, 1) + '\n');
  console.log(JSON.stringify({ stampedAt: ts, population: pop.length, rowsChanged: changedIdx.length, untouchedInPop, disposition: disp, dry: DRY }));
}
if (mode === 'probe') probe(); else if (mode === 'apply') apply(); else { console.error('usage: probe|apply'); process.exit(1); }
