#!/usr/bin/env node
/* ============================================================
   WanderHawaii — geocode tour locations for the interactive map
   ============================================================
   Reads tours-data.json, collects distinct `location` strings from LIVE
   (not bookingDead) tours, and geocodes them into data/locations.geo.json:

     "United States/Hawaii/Lahaina": {
       "lat": 20.87, "lng": -156.68, "island": "maui",
       "confidence": "town_centroid",
       "pinKey": "United States/Hawaii/Lahaina", "cityLabel": "Lahaina"
     }

   Two location shapes are mapped:
   - slash path  "United States/Hawaii/{Town}"  -> geocode the leaf town
   - flat town   "{Town}"                        -> geocode the town

   The per-tour `island` label is unreliable (Lahaina/Wailea are mis-tagged
   "kauai"), so island is ALWAYS derived from the geocoded coordinate.

   DEDUPE: entries whose coordinates fall within ~2km of each other are the
   same place; they share a `pinKey` (the canonical key, preferring the
   slash-path member) so the map renders ONE pin and merges their tours.

   AMBIGUITY GUARD: if a town name resolves to settlements on 2+ different
   Hawaiian islands (e.g. "Waimea" = Kauai AND Big Island), it is NOT
   auto-picked — it is written to data/map-geocode-review.json and left OFF
   the map until manually resolved.

   Idempotent: locations already geocoded, or already flagged ambiguous, are
   not re-queried. Nominatim @ 1 req/sec.
   ============================================================ */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TOURS = join(ROOT, 'tours-data.json');
const GEO = join(ROOT, 'data', 'locations.geo.json');
const EXCLUDED = join(ROOT, 'data', 'map-excluded.json');
const REVIEW = join(ROOT, 'data', 'map-geocode-review.json');

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'wanderhawaii-geocode';
const HI_VIEWBOX = '-160.6,22.5,-154.5,18.7'; // left,top,right,bottom
const RATE_MS = 1100;
const DEDUPE_KM = 2;

const ISLAND_BOXES = [
    { name: 'kauai',      minLat: 21.80, maxLat: 22.30, minLng: -159.85, maxLng: -159.28 },
    { name: 'oahu',       minLat: 21.20, maxLat: 21.75, minLng: -158.35, maxLng: -157.60 },
    { name: 'molokai',    minLat: 21.05, maxLat: 21.25, minLng: -157.35, maxLng: -156.70 },
    { name: 'lanai',      minLat: 20.70, maxLat: 20.95, minLng: -157.10, maxLng: -156.80 },
    { name: 'maui',       minLat: 20.45, maxLat: 21.05, minLng: -156.75, maxLng: -155.95 },
    { name: 'big island', minLat: 18.85, maxLat: 20.30, minLng: -156.10, maxLng: -154.75 },
];
const ISLAND_NAMES = new Set(['oahu', 'maui', 'kauai', 'big island', 'hawaii', 'lanai', 'molokai', 'niihau', 'kahoolawe']);
const SETTLEMENT = new Set(['city', 'town', 'village', 'hamlet', 'suburb', 'neighbourhood', 'municipality', 'locality', 'census', 'isolated_dwelling']);
// Strip Hawaiian diacritics/okina so "Kapaʻa"=="Kapaa", "Pāhoa"=="Pahoa".
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʻʼ'’`]/g, '').toLowerCase().trim();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function islandFromCoords(lat, lng) {
    for (const b of ISLAND_BOXES) {
        if (lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng) return b.name;
    }
    return null;
}

function haversineKm(aLat, aLng, bLat, bLng) {
    const R = 6371, toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
}

// location -> { city, kind } | null
function classifyLocation(loc) {
    const parts = String(loc || '').split('/').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 3 && parts[1].toLowerCase() === 'hawaii') {
        const leaf = parts[parts.length - 1];
        if (leaf && leaf.toLowerCase() !== 'hawaii') return { city: leaf, kind: 'slash' };
        return null;
    }
    if (parts.length === 1) {
        const lower = parts[0].toLowerCase();
        if (lower === 'united states' || ISLAND_NAMES.has(lower)) return null;
        return { city: parts[0], kind: 'flat' };
    }
    return null;
}
const townLabel = (key) => (key.indexOf('/') !== -1 ? key.split('/').pop().trim() : key);

async function geocodeCandidates(city) {
    const q = `${city}, Hawaii, USA`;
    const url = `${NOMINATIM}?format=jsonv2&limit=15&countrycodes=us&bounded=1&addressdetails=1`
        + `&viewbox=${encodeURIComponent(HI_VIEWBOX)}&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status} for "${q}"`);
    const arr = await res.json();
    if (!Array.isArray(arr)) return [];
    // Keep settlement results on a known Hawaiian island whose name matches
    // the queried town (diacritic-insensitive; startsWith handles
    // "Waimea/Kamuela" and multi-word towns). jsonv2 uses `category`.
    const nt = norm(city);
    const out = [];
    for (const r of arr) {
        const lat = Number(r.lat), lng = Number(r.lon);
        const island = islandFromCoords(lat, lng);
        if (!island) continue;
        const cat = r.category || r.class;
        const isPlace = SETTLEMENT.has(r.type) || cat === 'place';
        if (!isPlace) continue;
        if (!norm(r.name).startsWith(nt)) continue;
        out.push({ lat, lng, island, type: r.type, importance: r.importance || 0, display: r.display_name });
    }
    return out;
}

async function main() {
    const raw = JSON.parse(readFileSync(TOURS, 'utf8'));
    const { tours, schemaVersion } = raw;

    // Live-tour counts per distinct location.
    const liveCount = new Map();
    for (const t of tours) {
        if (t.bookingDead || !t.location) continue;
        liveCount.set(t.location, (liveCount.get(t.location) || 0) + 1);
    }

    const geo = existsSync(GEO) ? JSON.parse(readFileSync(GEO, 'utf8')) : {};
    const review = existsSync(REVIEW) ? JSON.parse(readFileSync(REVIEW, 'utf8')) : { ambiguous: [] };
    const ambiguousSet = new Set((review.ambiguous || []).map((a) => a.location));

    // Locations to consider: live tours + a mappable town shape.
    const candidates = [...liveCount.keys()]
        .map((loc) => ({ loc, ...((classifyLocation(loc)) || {}) }))
        .filter((c) => c.city);

    const todo = candidates.filter((c) => !(c.loc in geo) && !ambiguousSet.has(c.loc)).sort((a, b) => a.loc.localeCompare(b.loc));
    console.error(`${liveCount.size} live locations; ${candidates.length} mappable town shapes; ${todo.length} new to geocode.`);

    let resolved = 0, flagged = 0;
    const failed = [];
    for (const c of todo) {
        try {
            const cands = await geocodeCandidates(c.city);
            await sleep(RATE_MS);
            if (!cands.length) { failed.push(`${c.loc} (no Hawaii settlement match for "${c.city}")`); continue; }
            const islands = new Set(cands.map((x) => x.island));
            if (islands.size >= 2) {
                // Ambiguous: distinct islands share this town name.
                const seen = new Map();
                for (const x of cands) if (!seen.has(x.island)) seen.set(x.island, x);
                review.ambiguous.push({
                    location: c.loc, tours: liveCount.get(c.loc) || 0,
                    candidates: [...seen.values()].map((x) => ({ island: x.island, lat: Number(x.lat.toFixed(5)), lng: Number(x.lng.toFixed(5)), display: x.display })),
                });
                ambiguousSet.add(c.loc);
                flagged++;
                console.error(`AMBIGUOUS  ${c.loc} -> islands: ${[...islands].join(', ')} (held for review)`);
                continue;
            }
            const best = cands.sort((a, b) => b.importance - a.importance)[0];
            geo[c.loc] = { lat: Number(best.lat.toFixed(5)), lng: Number(best.lng.toFixed(5)), island: best.island, confidence: 'town_centroid' };
            resolved++;
            console.error(`ok  ${c.loc} -> ${best.lat.toFixed(4)},${best.lng.toFixed(4)} ${best.island}`);
        } catch (err) {
            failed.push(`${c.loc} (${err.message})`);
        }
    }

    // Fallback: a flat-town location that failed to geocode but matches an
    // existing slash-path town by name inherits that town's coordinate (same
    // place). Only when exactly one slash town matches (else leave unresolved).
    let aliased = 0;
    for (const c of candidates) {
        if (c.kind !== 'flat' || (c.loc in geo) || ambiguousSet.has(c.loc)) continue;
        const matches = Object.keys(geo).filter((k) => k.indexOf('/') !== -1 && norm(townLabel(k)) === norm(c.city));
        if (matches.length === 1) {
            const s = geo[matches[0]];
            geo[c.loc] = { lat: s.lat, lng: s.lng, island: s.island, confidence: 'town_centroid' };
            aliased++;
            console.error(`alias ${c.loc} -> ${matches[0]} (${s.island})`);
        }
    }

    // ---- Dedupe within DEDUPE_KM -> shared pinKey; recompute pinKey/cityLabel for ALL entries ----
    const keys = Object.keys(geo);
    const parent = new Map(keys.map((k) => [k, k]));
    const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
    const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
    for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
            const A = geo[keys[i]], B = geo[keys[j]];
            if (haversineKm(A.lat, A.lng, B.lat, B.lng) <= DEDUPE_KM) union(keys[i], keys[j]);
        }
    }
    // canonical per cluster: prefer a slash-path key, then shortest/lowest key.
    const clusterMembers = new Map();
    for (const k of keys) { const r = find(k); if (!clusterMembers.has(r)) clusterMembers.set(r, []); clusterMembers.get(r).push(k); }
    const canonicalOf = new Map();
    for (const [, members] of clusterMembers) {
        const slash = members.filter((m) => m.indexOf('/') !== -1).sort();
        const canonical = (slash.length ? slash : [...members].sort())[0];
        for (const m of members) canonicalOf.set(m, canonical);
    }
    for (const k of keys) {
        const pinKey = canonicalOf.get(k);
        geo[k].pinKey = pinKey;
        geo[k].cityLabel = townLabel(pinKey);
    }

    // Write geo (keys sorted, field order stable)
    const sortedGeo = {};
    for (const k of Object.keys(geo).sort()) {
        const e = geo[k];
        sortedGeo[k] = { lat: e.lat, lng: e.lng, island: e.island, confidence: e.confidence, pinKey: e.pinKey, cityLabel: e.cityLabel };
    }
    writeFileSync(GEO, JSON.stringify(sortedGeo, null, 2) + '\n');

    // Review file
    review.ambiguous.sort((a, b) => b.tours - a.tours);
    writeFileSync(REVIEW, JSON.stringify({
        note: 'Flat-town locations whose name matches settlements on 2+ Hawaiian islands. Held OFF the map until manually resolved (pick the correct island, then add a slash-path or manual_override geo entry).',
        generatedAt: new Date().toISOString().slice(0, 10), sourceSchemaVersion: schemaVersion ?? null,
        count: review.ambiguous.length, ambiguous: review.ambiguous,
    }, null, 2) + '\n');

    // Excluded worklist: live locations still not on the map and not ambiguous.
    const mapped = new Set(Object.keys(geo));
    const island_only = [], vague_or_foreign = [], unresolved_towns = [];
    for (const loc of [...liveCount.keys()].sort()) {
        if (mapped.has(loc) || ambiguousSet.has(loc)) continue;
        const parts = loc.split('/').map((x) => x.trim()).filter(Boolean);
        const lower = loc.toLowerCase();
        const entry = { location: loc, tours: liveCount.get(loc) };
        if (parts.length === 1 && ISLAND_NAMES.has(lower)) island_only.push(entry);
        else if (classifyLocation(loc)) unresolved_towns.push(entry); // had a town shape but no geocode
        else vague_or_foreign.push(entry);
    }
    const byTours = (a, b) => b.tours - a.tours;
    [island_only, vague_or_foreign, unresolved_towns].forEach((a) => a.sort(byTours));
    writeFileSync(EXCLUDED, JSON.stringify({
        note: 'Live tours NOT on the map: island-only locations, vague/foreign, or towns that failed to geocode. (Ambiguous towns are in map-geocode-review.json.)',
        generatedAt: new Date().toISOString().slice(0, 10),
        summary: { island_only: island_only.length, vague_or_foreign: vague_or_foreign.length, unresolved_towns: unresolved_towns.length },
        island_only, vague_or_foreign, unresolved_towns,
    }, null, 2) + '\n');

    const pins = new Set(Object.values(sortedGeo).map((e) => e.pinKey)).size;
    console.error(`\nDone. Geocoded ${resolved} new; flagged ${flagged} ambiguous. ${Object.keys(sortedGeo).length} geo entries -> ${pins} distinct pins (after ${DEDUPE_KM}km dedupe).`);
    if (failed.length) { console.error(`Geocode failures (${failed.length}):`); failed.forEach((f) => console.error('  ' + f)); }
}

main().catch((e) => { console.error(e); process.exit(1); });
