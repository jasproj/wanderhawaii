# wanderhawaii v5.2 Dry-Run Report — null-price tour re-extraction

**Generated:** 2026-05-03T19:55:04.937Z
**Branch:** `feat/wh-v52-price-extraction`
**Mode:** `--dry-run-only` (no writes to tours-data.json)

## 1. Inputs

- wanderhawaii total tours: 3142
- Tours with `price: null` evaluated: **1249**
- Extractor: v5.4 baseline + v5.2 dominant-price gate (ported verbatim from wanderusvi)
- Page fetch: Playwright (chromium headless), 1.5 s settle wait

## 2. Result distribution

| Outcome | Count | Disposition |
|---|---:|---|
| **high** (v5.4 Method 1/2 — adult/per-person anchor) | 5 | "From $X" if applied |
| **medium** (v5.4 native — Method 3/4/6) | 46 | "From $X" if applied |
| **medium** (v5.2 dominant-price gate) | 50 | "From $X" if applied |
| **low** (Method 5 unanchored, gate FAILed) | 7 | stays "Check availability" |
| **no-price** (extractor returned null) | 1141 | stays "Check availability" |
| **error** (fetch/parse) | 0 | stays "Check availability" |
| **Total** | 1249 | |

**Net effect if applied --live:** 101 tours flip from "Check availability" → "From $X" (8.1% of the 1,249 null-price targets, 3.2% of the 3,142 total catalog). 1,148 stay hidden.

## 3. Cat-E candidate sanity check

**0 Cat-E candidates** detected among gate PASSes. Disqualifier blocklist (`additional, extra, option, optional, rental, nitrox, upgrade, supplement, add-on, addon, surcharge` + `+$` literal) appears to be holding.

## 4. Sample 10 promoted tours

### 549439 — Private Boat Charter

- company: Go Kauai Tours
- extracted price: **$2500** (medium, unknown)
- priceSource: `v52-dominant-gate`
- gate distinct $-values: [2500,5500]
- gate matched token: `$2,500`
- gate ±40 char window:

  ```
  ay of fun and adventure! Rates Half Day $2,500 Full Day $5,500 About ʻO koʻu waʻa kou 
  ```
- all $-hits in page: ["$2,500","$5,500"]

### 567448 — Locals' Favorites: Private Maui Tour Pickup Included

- company: JourneyJill LLC
- extracted price: **$1400** (medium, unknown)
- priceSource: `v52-dominant-gate`
- gate distinct $-values: [1400,2600]
- gate matched token: `$1,400`
- gate ±40 char window:

  ```
   Free cancellation Instant confirmation $1,400 8 Hour Private Group (1 - 4 people) Pri
  ```
- all $-hits in page: ["$1,400","$2,600"]

### 432601 — Hana & Back Adventure Tour: Luxury Expedition

- company: Hawaii By Storm Tours, LLC
- extracted price: **$1149** (medium, unknown)
- priceSource: `v52-dominant-gate`
- gate distinct $-values: [13,1149]
- gate matched token: `$1,149.95`
- gate ±40 char window:

  ```
   Free cancellation Instant confirmation $1,149.95 Private Tour Up to 7 Guests! Prices for
  ```
- all $-hits in page: ["$1,149.95","$13"]

### 551675 — Private Snorkel Charter

- company: Maui Snorkel Charters
- extracted price: **$3250** (medium, unknown)
- priceSource: `v52-dominant-gate`
- gate distinct $-values: [3250]
- gate matched token: `$3,250`
- gate ±40 char window:

  ```
  Experience 4.9 stars 473 Google reviews $3,250 Private Charters Prices for Wednesday, 
  ```
- all $-hits in page: ["$3,250"]

### 594242 — Wedding Package

- company: Frank Bernasek Photography
- extracted price: **$1495** (medium, unknown)
- priceSource: `v52-dominant-gate`
- gate distinct $-values: [1495]
- gate matched token: `$1,495`
- gate ±40 char window:

  ```
   People • 80-100 Edited High Res-Photos $1,495 Private Photo Shoot Prices for Monday, 
  ```
- all $-hits in page: ["$1,495"]

### 585174 — Maui Redwood Experience

- company: Switchbacks Hawaii
- extracted price: **$1495** (medium, unknown)
- priceSource: `v52-dominant-gate`
- gate distinct $-values: [1495]
- gate matched token: `$1,495`
- gate ±40 char window:

  ```
   Experience Maui's Redwood's Experience $1,495 Private Group Up to 7 Up to 7 people Pr
  ```
- all $-hits in page: ["$1,495"]

### 418658 — 90 Minute Elopement

- company: Lokahi Photography
- extracted price: **$1495** (medium, unknown)
- priceSource: `v52-dominant-gate`
- gate distinct $-values: [1495]
- gate matched token: `$1,495`
- gate ±40 char window:

  ```
   Free cancellation Instant confirmation $1,495 Private Photoshoots Up to 10 people Pri
  ```
- all $-hits in page: ["$1,495"]

### 480165 — Catamaran Private Morning Snorkel & Sail

- company: Maui Custom Charters
- extracted price: **$6000** (medium, unknown)
- priceSource: `v52-dominant-gate`
- gate distinct $-values: [6000,7200]
- gate matched token: `$6,000`
- gate ±40 char window:

  ```
  & Sail 5-6 Hours • Up to 6 Passengers • $6,000-$7,200 5 stars 151 Google reviews Activ
  ```
- all $-hits in page: ["$6,000","$7,200","$6,000","$7,200"]

### 501865 — Private Tours: Road to Hana & Haleakala National Park or Customized Adventures

- company: Aloha Eco Adventures
- extracted price: **$2290** (medium, unknown)
- priceSource: `v52-dominant-gate`
- gate distinct $-values: [2290]
- gate matched token: `$2,290`
- gate ±40 char window:

  ```
  nter vans. 4.8 stars 469 Google reviews $2,290 Private Van For up to 13 passengers Pri
  ```
- all $-hits in page: ["$2,290"]

### 526271 — Full Day Snorkel & Sail • Catamaran Artemis

- company: Maui Custom Charters
- extracted price: **$8400** (medium, unknown)
- priceSource: `v52-dominant-gate`
- gate distinct $-values: [8400,11200]
- gate matched token: `$8,400`
- gate ±40 char window:

  ```
   Artemis 7 Hours • Up to 6 Passengers • $8,400 5 stars 151 Google reviews Activity det
  ```
- all $-hits in page: ["$8,400","$8,400","$11,200"]

## 5. Sample 5 stays-hidden tours

### 79556 — SURF INTO YOGA EXPERIENCE

- outcome: low
- gate criterion failed: 2
- distinct $-values: [2485,2995,3925,4825]
- all $-hits: ["$2,485","$2,995","$3,925","$4,825"]

### 79552 — SUP YOGA EXPERIENCE

- outcome: low
- gate criterion failed: 2
- distinct $-values: [1890,2430,3245,3950]
- all $-hits: ["$1,890","$2,430","$3,245","$3,950"]

### 522867 — 「Maui Arrival」Kahului Airport ⮕ Kihei/Wailea Hotels Private Transfer

- outcome: low
- gate criterion failed: 2
- distinct $-values: [80,120,180]
- all $-hits: ["$80","$120","$180"]

### 547245 — Custom Floral Proposal

- outcome: low
- gate criterion failed: 4
- disqualifier hit: `discount`
- distinct $-values: [795]
- window:

  ```
  on with a 10% discount code: SPRINGSALE $795 Proposal (Couple) Price Includes 2 Peop
  ```
- all $-hits: ["$795"]

### 333003 — 「One-Way Transfer」North Shore & Leeward Coast  ⮕ Waikiki Hotels

- outcome: low
- gate criterion failed: 2
- distinct $-values: [145,215,240,270,285]
- all $-hits: ["$215","$285","$270","$240","$145"]

## 6. No-price decomposition (1,141 / 1,249 tours)

The extractor returned `null` on 91% of targets — markedly higher than KWST (75%) or USVI's audit set. Decomposing the 1,141:

| Sub-bucket | Count | What it means |
|---|---:|---|
| Page contains no `$N` at all | **980** (86% of no-price) | Genuinely no public price — booking-flow gated, page didn't render the price section, or 3rd-party operator that doesn't surface FareHarbor's standard pricing markup. No remediation via extractor improvements. |
| Page has `$N` but all 6 v5.4 methods returned null | **161** (14% of no-price) | Recoverable in a future extractor revision. Single-price pages with no anchor verb, calendar pages where Method 6 didn't anchor 3+ adjacent day numbers, or sub-threshold tiers (`$N < $15`). |

**Implication:** the practical ceiling for WH gate-driven graduation is **~101 + 161 = ~262** of 1,249 (~21%) without bigger extractor changes. The remaining ~980 require a different remediation path (manual price entry, operator outreach, or alternate scraping target — many appear to be Hawaii-specific operators not on standard FareHarbor templates).

## 7. Comparison vs. KWST and USVI baselines

| Metric | USVI v5.2 (156 lows) | KWST v5.2 (428 nulls) | **WH v5.2 (1,249 nulls)** |
|---|---:|---:|---:|
| Targets evaluated | 156 | 428 | **1,249** |
| v5.4 native promotions (high+medium) | n/a (started from low) | 53 | **51** |
| v5.2 gate promotions (low → medium) | 77 | 41 | **50** |
| Net promoted | 77 (49%) | 94 (22%) | **101 (8.1%)** |
| Stayed hidden | 79 (51%) | 334 (78%) | **1,148 (91.9%)** |
| % of total catalog flipping | 16.6% (77/465) | 9.3% (94/1,010) | **3.2% (101/3,142)** |
| Cat-E policy violations | **0** ✓ | **0** ✓ | **0** ✓ |

The gate behavior is consistent across all three repos (zero Cat-E violations, same disqualifier blocklist), but the **per-target recovery rate falls sharply** as the no-price ratio rises. WH has the largest absolute number of null-price tours network-wide (1,249) but the lowest per-target recovery rate because 86% of those pages have no `$N` markup at all.

## 8. Out of scope for this run

- No edits to `tours-data.json`.
- No commits, no push, no deploy.
- `--live` mode not implemented yet — adopt USVI's `apply-v52-live.js` pattern when ready.
