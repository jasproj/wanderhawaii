#!/usr/bin/env node
/* ============================================================
   WanderHawaii — geocode tour locations for the map pilot
   ============================================================
   Reads tours-data.json, collects distinct `location` strings, and
   geocodes each (Nominatim, 1 req/sec) into data/locations.geo.json,
   keyed by the verbatim location string:

     "United States/Hawaii/Lahaina": {
       "lat": 20.87, "lng": -156.68,
       "island": "maui", "confidence": "town_centroid"
     }

   Idempotent: only NEW location strings (absent from the existing
   geo file) are queried on a re-run. Entries flagged
   confidence:"manual_override" are never overwritten.

   SCHEMA ADAPTATIONS (the data differs from the original brief):
   - `location` is a slash path "Country/State/City", not a flat town
     name. We geocode the leaf CITY segment.
   - The per-tour `island` field is unreliable (e.g. Lahaina/Wailea
     are tagged "kauai" in the data), so it is NOT used in the query.
     We query "{city}, Hawaii, USA" bounded to a Hawaii viewbox, then
     derive `island` from the resulting coordinates.
   - Location strings with no Hawaii city (e.g. "United States/Hawaii",
     "United States", non-Hawaii states, foreign countries) are left out
     of the geo file (no marker).

   PILOT SCOPE (Option 2 — active only): only locations that have >= 1
   tour with status "active" AND a slash-path Hawaii city are geocoded.
   Every other distinct location is recorded in data/map-excluded.json,
   bucketed into flat_town_named / island_only / vague_or_foreign, as the
   fast-follow backlog for a later map expansion.
   ============================================================ */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TOURS = join(ROOT, 'tours-data.json');
const GEO = join(ROOT, 'data', 'locations.geo.json');
const EXCLUDED = join(ROOT, 'data', 'map-excluded.json');

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'wanderhawaii-geocode';
// left,top,right,bottom (minLon,maxLat,maxLon,minLat) covering the
// main Hawaiian islands — forces results to land in Hawaii.
const HI_VIEWBOX = '-160.6,22.5,-154.5,18.7';
const RATE_MS = 1100; // >= 1 req/sec per Nominatim usage policy

// Approx bounding boxes to derive island from geocoded coordinates.
// "maui" here means Maui County (incl. Lanai/Molokai/Kahoolawe).
const ISLAND_BOXES = [
    { name: 'kauai',      minLat: 21.8,  maxLat: 22.30, minLng: -159.85, maxLng: -159.28 },
    { name: 'oahu',       minLat: 21.20, maxLat: 21.75, minLng: -158.35, maxLng: -157.60 },
    { name: 'maui',       minLat: 20.45, maxLat: 21.25, minLng: -157.35, maxLng: -155.95 },
    { name: 'big island', minLat: 18.85, maxLat: 20.30, minLng: -156.10, maxLng: -154.75 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cityOf(location) {
    // Returns the Hawaii city leaf, or null if the path has no Hawaii city.
    const parts = String(location || '').split('/').map((s) => s.trim()).filter(Boolean);
    if (parts.length < 3) return null;            // "United States" / "United States/Hawaii"
    if (parts[1].toLowerCase() !== 'hawaii') return null; // Maryland, California, foreign, etc.
    const leaf = parts[parts.length - 1];
    if (!leaf || leaf.toLowerCase() === 'hawaii') return null;
    return leaf;
}

function islandFromCoords(lat, lng, fallback) {
    for (const b of ISLAND_BOXES) {
        if (lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng) return b.name;
    }
    return fallback || null;
}

function classifyConfidence(result) {
    // We only ever query town names, so a settlement-level hit is a
    // town centroid (approximate), never an exact point. A hit that
    // resolves only to a region/state/island is an island centroid.
    const cls = result.class;
    const type = result.type;
    const addr = result.addresstype;
    const REGION = new Set(['state', 'county', 'region', 'island', 'archipelago', 'administrative']);
    if (REGION.has(addr) || REGION.has(type)) return 'island_centroid';
    if (cls === 'place' || cls === 'boundary') return 'town_centroid';
    return 'town_centroid';
}

async function geocode(city) {
    const q = `${city}, Hawaii, USA`;
    const url = `${NOMINATIM}?format=jsonv2&limit=1&countrycodes=us&bounded=1`
        + `&viewbox=${encodeURIComponent(HI_VIEWBOX)}&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status} for "${q}"`);
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr[0];
}

const ISLAND_NAMES = new Set([
    'oahu', 'maui', 'kauai', 'big island', 'hawaii', 'lanai', 'molokai', 'niihau', 'kahoolawe',
]);

async function main() {
    const raw = JSON.parse(readFileSync(TOURS, 'utf8'));
    const { tours, schemaVersion } = raw;

    // Per-location stats: total/active tour counts + island-label votes.
    // PILOT SCOPE (Option 2): only locations with an active, slash-path
    // Hawaii city get a marker. Everything else is excluded and recorded
    // in map-excluded.json as the fast-follow worklist.
    const stats = new Map(); // location -> { total, active, islandVotes:Map }
    for (const t of tours) {
        if (!t.location) continue;
        if (!stats.has(t.location)) stats.set(t.location, { total: 0, active: 0, islandVotes: new Map() });
        const s = stats.get(t.location);
        s.total++;
        if (t.status === 'active') s.active++;
        s.islandVotes.set(t.island, (s.islandVotes.get(t.island) || 0) + 1);
    }
    const modeIsland = (loc) => {
        const m = stats.get(loc)?.islandVotes;
        if (!m) return null;
        return [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
    };

    const geo = existsSync(GEO) ? JSON.parse(readFileSync(GEO, 'utf8')) : {};

    // Geocode only active + slash-path-with-Hawaii-city locations.
    const geocodable = [...stats.keys()].filter((loc) => stats.get(loc).active > 0 && cityOf(loc));
    const todo = geocodable.filter((loc) => !(loc in geo)).sort(); // idempotent: only the delta

    console.error(`${stats.size} distinct locations; ${geocodable.length} in pilot scope (active + town); ${todo.length} new to geocode.`);

    let resolved = 0;
    const failed = [];

    for (const loc of todo) {
        const city = cityOf(loc);
        try {
            const r = await geocode(city);
            await sleep(RATE_MS);
            if (!r) { failed.push(`${loc}  (no Nominatim match for "${city}")`); continue; }
            const lat = Number(r.lat);
            const lng = Number(r.lon);
            const confidence = classifyConfidence(r);
            const island = islandFromCoords(lat, lng, modeIsland(loc));
            geo[loc] = {
                lat: Number(lat.toFixed(5)),
                lng: Number(lng.toFixed(5)),
                island,
                confidence,
            };
            resolved++;
            console.error(`ok  ${loc} -> ${lat.toFixed(4)},${lng.toFixed(4)} ${island} ${confidence}`);
        } catch (err) {
            failed.push(`${loc}  (${err.message})`);
        }
    }

    // Write merged geo file, keys sorted for stable diffs.
    const sortedGeo = {};
    for (const k of Object.keys(geo).sort()) sortedGeo[k] = geo[k];
    writeFileSync(GEO, JSON.stringify(sortedGeo, null, 2) + '\n');

    // ---- Excluded worklist: every distinct location NOT on the pilot map ----
    const flat_town_named = [];
    const island_only = [];
    const vague_or_foreign = [];
    for (const loc of [...stats.keys()].sort()) {
        if (loc in geo) continue; // mapped
        const s = stats.get(loc);
        const entry = { location: loc, tours: s.total, activeTours: s.active };
        const parts = loc.split('/').map((x) => x.trim()).filter(Boolean);
        const lower = loc.toLowerCase();
        if (parts.length === 1) {
            if (ISLAND_NAMES.has(lower)) island_only.push(entry);
            else if (lower === 'united states') vague_or_foreign.push(entry);
            else flat_town_named.push(entry);
        } else {
            // Slash-path with no Hawaii city: "United States", "United
            // States/Hawaii", non-Hawaii states, or foreign countries.
            vague_or_foreign.push(entry);
        }
    }
    const byTours = (a, b) => b.tours - a.tours;
    flat_town_named.sort(byTours); island_only.sort(byTours); vague_or_foreign.sort(byTours);
    const sumTours = (arr) => arr.reduce((n, e) => n + e.tours, 0);

    const excluded = {
        note: 'Tours excluded from the active-only map pilot (Option 2). Fast-follow worklist — flat-town-named entries are the highest-value backlog once their booking-link status is verified.',
        generatedFrom: 'tours-data.json',
        sourceSchemaVersion: schemaVersion ?? null,
        generatedAt: new Date().toISOString().slice(0, 10),
        summary: {
            flat_town_named: { locations: flat_town_named.length, tours: sumTours(flat_town_named) },
            island_only: { locations: island_only.length, tours: sumTours(island_only) },
            vague_or_foreign: { locations: vague_or_foreign.length, tours: sumTours(vague_or_foreign) },
        },
        flat_town_named,
        island_only,
        vague_or_foreign,
    };
    writeFileSync(EXCLUDED, JSON.stringify(excluded, null, 2) + '\n');

    console.error(`\nDone. Geocoded ${resolved} new; ${Object.keys(geo).length} total marker locations.`);
    console.error(`Excluded worklist -> data/map-excluded.json: ${flat_town_named.length} flat-town (${sumTours(flat_town_named)} tours), ${island_only.length} island-only (${sumTours(island_only)} tours), ${vague_or_foreign.length} vague/foreign (${sumTours(vague_or_foreign)} tours).`);
    if (failed.length) {
        console.error(`\nGEOCODE FAILURES (${failed.length}) — in scope but unresolved:`);
        for (const u of failed) console.error('  ' + u);
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
