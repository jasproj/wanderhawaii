// WHAW orphan-island stamp v1 — island ONLY, where null, reversible, plain append (no key re-sort).
// Does NOT touch status/company/counter. Ambiguous (waimea/waialua) + vague "hawaii" → review.
import fs from "node:fs";
const DRY = !process.argv.includes("--apply");
const F = "tours-data.json";
const GEO = "data/locations.geo.json";
const REVIEW = "data/map-geocode-review.json";

const norm = s => String(s||"").replace(/.*[Hh]awaii\//,"").normalize("NFD")
  .replace(/[̀-ͯ]/g,"").replace(/[ʻʼ'’`]/g,"").toLowerCase().trim();
const ISLAND_NAMES = new Set(["oahu","maui","kauai","big island","molokai","lanai","niihau"]);
const AMBIG = new Set(["waimea","waialua","hawaii"]);

const d = JSON.parse(fs.readFileSync(F,"utf8"));
const tours = d.tours || d;
const geoRaw = JSON.parse(fs.readFileSync(GEO,"utf8"));
const geoArr = Array.isArray(geoRaw)?geoRaw:Object.entries(geoRaw).map(([k,v])=>({location:k,...v}));
const geo = {};
for (const g of geoArr){ const k=norm(g.location||g.name||g.town); const isl=g.island||g.resolvedIsland;
  if(k && isl && !Array.isArray(isl)) geo[k]=isl; }

let stamped=0, skippedHasIsland=0; const toReview=[]; const after={};
for (const t of tours){
  if (!(t.status==null && !("company" in t) && t.bookingDead!==true)) continue;
  if (t.island != null){ skippedHasIsland++; continue; }
  const k = norm(t.location);
  if (AMBIG.has(k)){ toReview.push({pk:t.pk,name:t.name,location:t.location,bookingUrl:t.bookingUrl,reason:"ambiguous"}); continue; }
  let isl = ISLAND_NAMES.has(k) ? k : (geo[k] || null);
  if (isl){ if(!DRY) t.island = isl; stamped++; after[isl]=(after[isl]||0)+1; }
}

console.log(DRY?"=== DRY RUN ===":"=== APPLY ===");
console.log("stamped:",stamped,"| review:",toReview.length,"| skipped(had island):",skippedHasIsland,"| total:",stamped+toReview.length);
console.log("stamped dist:",after);
console.log("review dist:",toReview.reduce((a,r)=>{const k=norm(r.location);a[k]=(a[k]||0)+1;return a;},{}));

if(!DRY){
  d.lastNormalized = new Date().toISOString();
  fs.writeFileSync(F, JSON.stringify(d,null,2));
  let rev={}; try{ rev=JSON.parse(fs.readFileSync(REVIEW,"utf8")); }catch{}
  rev.orphanIslandReview = toReview;
  fs.writeFileSync(REVIEW, JSON.stringify(rev,null,2));
  console.log("WROTE",F,"+ appended",toReview.length,"to",REVIEW,"+ bumped lastNormalized");
}
