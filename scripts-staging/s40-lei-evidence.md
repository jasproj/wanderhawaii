# S40 — lei-block evidence pull

Recon only. No writes, no branch. Tree: `main` @ `4f1cc61`, clean.
Live source: `https://fareharbor.com/api/embed/{sn}/price-preview/per-item/v2/?item_pks={pks}&include_breakdown=yes&date={d}`
Sample: 17 dates — 2026-08-23 … 2026-09-05 (14 consecutive, from tomorrow) + 2026-09-22 (+30) + 2026-10-22 (+60) + 2026-11-21 (+90).
51 requests, 0 failures. Batched by shortname (≤20 item_pks/request).

## 1. Population re-derivation

| quantity | re-derived | carried | delta |
|---|---|---|---|
| catalogue rows | 4666 | 4666 | 0 |
| draw pool | 2358 | 2358 | 0 |
| conf-low as sole exclusion clause | **312** | 282 "HOLD" | **+30** |

`tours-data.json` stores **no hold-reason field**. `statusReason` is `null` on all 312;
a repo-wide grep for `D-482`/`D-483`/`D-484`/`REVIEW-UNIT` returns zero hits in any tracked file.
The D-rule split is therefore **not re-derivable from the tree** — it lives only in the hub record.

What the tree does support (arithmetic reconciliation against the #248 commit body, which is the only
in-tree record of the census):

```
  312 conf-low sole-clause
=  24 DEAD        (census verdict; NOT written to bookingDead, so still sole-clause in the file)
+ 282 HOLD        (the carried figure)
+   5 REVIEW-UNIT (5279, 122310, 620548, 647490, 569816)
+   1 reverted    (314433)
```

All 6 named pks verified present in the 312. The identity is exact, so 282 is confirmed as a
**subset** of 312, not as the full held population. Restated: 312 is the re-derivable figure; 282 is
282 only once DEAD, REVIEW-UNIT and the reverted pk are carved out by hub-side knowledge.

## 2. The lei block

Expected: 25 rows / 2 operators / 21 held on D-484. **Neither figure reproduces.**

| definition | rows | held (sole-confLow) | in pool | otherwise excluded |
|---|---|---|---|---|
| A: `company ∈ {LeiGreeting.com, Leis of Hawaii}` | **36** | **28** | 5 | 3 |
| B: A **and** name matches `/\blei(s)?\b/i` | 27 | 23 | 4 | 0 |

The carried 25/21 matches neither. Definition B is a property of the **name filter**, not of the
operator: it silently drops 4 held rows that are the same product ladder —
`Large Group Greeting (8 or more)` at all four airports (67269, 69135, 69158, 69207) — because the
word "lei" happens not to appear in their titles. It also drops held row 99910 (`Airport Departure`).
Everything below uses **definition A**, the operator superset, so the evidence covers either ruling.

Delta vs carried: **+11 rows, +7 held** (A), or **+2 rows, +2 held** (B).

## 3. Operator: LeiGreeting.com (`leigreeting`)

- Rows: **23** — held (conf-low sole clause): **20**; in draw pool: 0; otherwise excluded: 3
- pks: `67250, 67256, 67260, 67265, 67269, 69111, 69114, 69116, 69132, 69135, 69138, 69142, 69146, 69150, 69155, 69158, 69174, 69175, 69177, 69207, 69529, 69530, 69531`
- Held pks: `67250, 67256, 67260, 67265, 67269, 69111, 69114, 69116, 69132, 69135, 69138, 69142, 69146, 69150, 69155, 69158, 69174, 69175, 69177, 69207`

### pk 67250 — Classic Orchid Lei Greeting - Honolulu Airport, Oahu

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=45` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 15 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Exclusive (1 person) | — | $45 | 1 | *(empty)* |
| Ohana Small Group (2-7 people) | — | $39 | 1 | *(empty)* |
| Large Group (8 or more) | — | $35 | 1 | *(empty)* |

- Unit evidence: **person/people token** in tier text; **party-size band** in tier text
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 67256 — Exclusive Lei Greeting - Honolulu Airport, Oahu

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=45` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 15 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Classic Orchid Lei | — | $45 | 1 | A single strand of fresh orchids |
| Kukui Nut Lei | — | $45 | 1 | Traditional Kukui Nut Lei Keepsake |
| Ti Leaf Lei | — | $45 | 1 | Braided, Open-Ended Ti Leaf Lei |
| Keiki (Child) Lei | — | $45 | 1 | A single strand of orchids made shorter for kids up to 6 years old |
| Candy Lei | — | $45 | 1 | A fun alternative to flowers for the children! These treats are great for adults too. The type of candy varies in each lei. |
| Fragrant Tuberose & Orchid Lei | — | $50 | 1 | A single strand mix of fragrant tuberose and fresh orchids |
| Kukui Nut & Ti Leaf Twist Lei | — | $55 | 1 | Ti Leaf braid and polished kukui nut twist. |
| Deluxe Orchid Lei | — | $80 | 1 | Triple the flowers are used to create a thick beautiful festive orchid lei |
| Ti Leaf & Orchids Twist Lei | — | $70 | 1 | Ti leaf braid and purple orchid twist. |
| Deluxe Kukui Nut Lei | — | $80 | 1 | Kukui Nuts, Shells, and fresh greenery make up this handsome lei |
| Deluxe Tuberose & Orchid Lei | — | $80 | 1 | Triple the flowers are used to create this beautiful and fragrant lei |
| Deluxe Cigar Lei | — | $80 | 1 | Hundreds of tiny local cigar flowers are used to make this local favorite for the guys |

- Unit evidence: **tier name is a countable lei** (per-lei unit)
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 67260 — Honeymoon Lei Greeting - Honolulu Airport, Oahu

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=75` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 15 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Classic Orchid Honeymoon Special (Set of 2) | — | $75 | 1 | Two single strand orchid lei |
| Traditional Honeymoon Special (Set of 2) | — | $125 | 1 | One Deluxe Orchid Lei & one Ti Leaf/Orchid Lei |
| Deluxe Honeymoon Special (Set of 2) | — | $135 | 1 | Two Deluxe Orchid Lei |
| Aloha Honeymoon Special (Set of 2) | — | $75 | 1 | One Single Strand Orchid Lei & one Ti Leaf Lei |
| Makahiki Honeymoon Special (Set of 2) | — | $75 | 1 | One Single Strand Orchid Lei & one Kukui Nut Lei |
| Local Honeymoon Special (Set of 2) | — | $135 | 1 | One Deluxe Tuberose/Orchid & one Cigar Lei |

- Unit evidence: **pack / set-of-N** wording
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 67265 — Ohana Small Group Lei Greeting - Honolulu Airport, Oahu

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=39` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 15 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Classic Orchid Lei | — | $39 | 1 | A single strand of fresh orchids |
| Kukui Nut Lei | — | $39 | 1 | Traditional Kukui Nut Lei Keepsake |
| Ti Leaf Lei | — | $39 | 1 | Braided, Open-Ended Ti Leaf Lei |
| Keiki (Child) Lei | — | $39 | 1 | A single strand of orchids made shorter for kids up to 6 years old |
| Candy Lei | — | $39 | 1 | A fun alternative to flowers for the children! These treats are great for adults too. The type of candy varies in each lei. |
| Fragrant Tuberose & Orchid Lei | — | $45 | 1 | A single strand mix of fragrant tuberose and fresh orchids |
| Kukui Nut & Ti Leaf Twist Lei | — | $49 | 1 | Ti Leaf braid and polished kukui nut twist. |
| Deluxe Orchid Lei | — | $69 | 1 | Triple the flowers are used to create a thick beautiful festive orchid lei |
| Ti Leaf & Orchids Twist Lei | — | $59 | 1 | Ti leaf braid and purple orchid twist. |
| Deluxe Kukui Nut Lei | — | $69 | 1 | Kukui Nuts, Shells, and fresh greenery make up this handsome lei |
| Deluxe Tuberose & Orchid Lei | — | $69 | 1 | Triple the flowers are used to create this beautiful and fragrant lei |
| Deluxe Cigar Lei | — | $69 | 1 | Hundreds of tiny local cigar flowers are used to make this local favorite for the guys |

- Unit evidence: **tier name is a countable lei** (per-lei unit)
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 67269 — Large Group Greeting (8 or more) - Honolulu Airport, Oahu

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=35` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 15 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Classic Orchid Lei | — | $35 | 8 | A single strand of fresh orchids |
| Kukui Nut Lei | — | $35 | 8 | Traditional Kukui Nut Lei Keepsake |
| Ti Leaf Lei | — | $35 | 8 | Braided, Open-Ended Ti Leaf Lei |
| Keiki (Child) Lei | — | $35 | 8 | A single strand of orchids made shorter for kids up to 6 years old |
| Candy Lei | — | $35 | 8 | A fun alternative to flowers for the children! These treats are great for adults too. The type of candy varies in each lei. |
| Kukui Nut & Ti Leaf Twist Lei | — | $45 | 8 | Ti Leaf braid and polished kukui nut twist. |
| Deluxe Orchid Lei | — | $65 | 8 | Triple the flowers are used to create a thick beautiful festive orchid lei |
| Ti Leaf & Orchids Twist Lei | — | $55 | 8 | Ti leaf braid and purple orchid twist. |
| Deluxe Kukui Nut Lei | — | $65 | 8 | Kukui Nuts, Shells, and fresh greenery make up this handsome lei |
| Deluxe Cigar Lei | — | $65 | 8 | Hundreds of tiny local cigar flowers are used to make this local favorite for the guys |

- Unit evidence: **tier name is a countable lei** (per-lei unit); `min_party_size > 1` (8)
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 69111 — Classic Orchid Lei Greeting - Kahului Airport, Maui

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=59` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 14 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Exclusive (1 person) | — | $59 | 1 | *(empty)* |
| Ohana Small Group (2-7 people) | — | $49 | 1 | *(empty)* |
| Large Group (8 or more) | — | $39 | 1 | *(empty)* |

- Unit evidence: **person/people token** in tier text; **party-size band** in tier text
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 69114 — Exclusive Lei Greeting - Kahului Maui Airport

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=59` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 14 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Classic Orchid Lei | — | $59 | 1 | A single strand of fresh orchids |
| Kukui Nut Lei | — | $59 | 1 | Traditional Kukui Nut Lei Keepsake |
| Ti Leaf Lei | — | $59 | 1 | Braided, Open-Ended Ti Leaf Lei |
| Keiki (Child) Lei | — | $59 | 1 | A single strand of orchids made shorter for kids up to 6 years old |
| Candy Lei | — | $59 | 1 | A fun alternative to flowers for the children! These treats are great for adults too. The type of candy varies in each lei. |
| Kukui Nut & Ti Leaf Twist Lei | — | $89 | 1 | Ti Leaf braid and polished kukui nut twist. |
| Deluxe Orchid Lei | — | $95 | 1 | Triple the flowers are used to create a thick beautiful festive orchid lei |
| Ti Leaf & Orchids Twist Lei | — | $89 | 1 | Ti leaf braid and purple orchid twist. |

- Unit evidence: **tier name is a countable lei** (per-lei unit)
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 69116 — Honeymoon Lei Greeting - Kahului Maui Airport

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=95` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 14 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Classic Orchid Honeymoon Special (Set of 2) | — | $95 | 1 | Two single strand orchid lei |
| Traditional Honeymoon Special (Set of 2) | — | $159 | 1 | One Deluxe Orchid Lei & one Ti Leaf/Orchid Lei |
| Deluxe Honeymoon Special (Set of 2) | — | $165 | 1 | Two Deluxe Orchid Lei |
| Aloha Honeymoon Special (Set of 2) | — | $95 | 1 | One Single Strand Orchid Lei & one Ti Leaf Lei |
| Makahiki Honeymoon Special (Set of 2) | — | $95 | 1 | One Single Strand Orchid Lei & one Kukui Nut Lei |

- Unit evidence: **pack / set-of-N** wording
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 69132 — Ohana Small Group Lei Greeting (2-7 people) - Kahului Maui Airport

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=49` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 14 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Classic Orchid Lei | — | $49 | 2 | A single strand of fresh orchids |
| Kukui Nut Lei | — | $49 | 2 | Traditional Kukui Nut Lei Keepsake |
| Ti Leaf Lei | — | $49 | 2 | Braided, Open-Ended Ti Leaf Lei |
| Keiki (Child) Lei | — | $49 | 2 | A single strand of orchids made shorter for kids up to 6 years old |
| Candy Lei | — | $49 | 2 | A fun alternative to flowers for the children! These treats are great for adults too. The type of candy varies in each lei. |
| Kukui Nut & Ti Leaf Twist Lei | — | $79 | 2 | Ti Leaf braid and polished kukui nut twist. |
| Deluxe Orchid Lei | — | $85 | 2 | Triple the flowers are used to create a thick beautiful festive orchid lei |
| Ti Leaf & Orchids Twist Lei | — | $79 | 2 | Ti leaf braid and purple orchid twist. |

- Unit evidence: **tier name is a countable lei** (per-lei unit); `min_party_size > 1` (2)
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 69135 — Large Group Greeting (8 or more) - Kahului Maui Airport

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=39` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 14 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Classic Orchid Lei | — | $39 | 8 | A single strand of fresh orchids |
| Kukui Nut Lei | — | $39 | 8 | Traditional Kukui Nut Lei Keepsake |
| Ti Leaf Lei | — | $39 | 8 | Braided, Open-Ended Ti Leaf Lei |
| Keiki (Child) Lei | — | $39 | 8 | A single strand of orchids made shorter for kids up to 6 years old |
| Candy Lei | — | $39 | 8 | A fun alternative to flowers for the children! These treats are great for adults too. The type of candy varies in each lei. |
| Kukui Nut & Ti Leaf Twist Lei | — | $70 | 8 | Ti Leaf braid and polished kukui nut twist. |
| Deluxe Orchid Lei | — | $80 | 8 | Triple the flowers are used to create a thick beautiful festive orchid lei |
| Ti Leaf & Orchids Twist Lei | — | $70 | 8 | Ti leaf braid and purple orchid twist. |

- Unit evidence: **tier name is a countable lei** (per-lei unit); `min_party_size > 1` (8)
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 69138 — Classic Orchid Lei Greeting - Kona Hawaii Airport

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=59` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 13 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Exclusive (1 person) | — | $59 | 1 | *(empty)* |
| Ohana Small Group (2-7 people) | — | $49 | 1 | *(empty)* |
| Large Group (8 or more) | — | $39 | 1 | *(empty)* |

- Unit evidence: **person/people token** in tier text; **party-size band** in tier text
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 69142 — Exclusive Lei Greeting - Kona Hawaii Airport

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=59` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 13 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Classic Orchid Lei | — | $59 | 1 | A single strand of fresh orchids |
| Kukui Nut Lei | — | $59 | 1 | Traditional Kukui Nut Lei Keepsake |
| Ti Leaf Lei | — | $59 | 1 | Braided, Open-Ended Ti Leaf Lei |
| Keiki (Child) Lei | — | $59 | 1 | A single strand of orchids made shorter for kids up to 6 years old |
| Candy Lei | — | $59 | 1 | A fun alternative to flowers for the children! These treats are great for adults too. The type of candy varies in each lei. |
| Kukui Nut & Ti Leaf Twist Lei | — | $89 | 1 | Ti Leaf braid and polished kukui nut twist. |
| Deluxe Orchid Lei | — | $95 | 1 | Triple the flowers are used to create a thick beautiful festive orchid lei |
| Deluxe Kukui Nut Lei | — | $85 | 1 | Kukui Nuts, Shells, and fresh greenery make up this handsome lei |
| Deluxe Cigar Lei | — | $85 | 1 | Hundreds of tiny local cigar flowers are used to make this local favorite for the guys |

- Unit evidence: **tier name is a countable lei** (per-lei unit)
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 69146 — Honeymoon Lei Greeting - Kona Hawaii Airport

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=95` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 13 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Classic Orchid Honeymoon Special (Set of 2) | — | $95 | 1 | Two single strand orchid lei |
| Traditional Honeymoon Special (Set of 2) | — | $159 | 1 | One Deluxe Orchid Lei & one Ti Leaf/Orchid Lei |
| Deluxe Honeymoon Special (Set of 2) | — | $165 | 1 | Two Deluxe Orchid Lei |
| Aloha Honeymoon Special (Set of 2) | — | $95 | 1 | One Single Strand Orchid Lei & one Ti Leaf Lei |
| Makahiki Honeymoon Special (Set of 2) | — | $95 | 1 | One Single Strand Orchid Lei & one Kukui Nut Lei |

- Unit evidence: **pack / set-of-N** wording
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 69150 — Ohana Small Group Lei Greeting (2-7 people) - Kona Hawaii Airport

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=49` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 13 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Classic Orchid Lei | — | $49 | 2 | A single strand of fresh orchids |
| Kukui Nut Lei | — | $49 | 2 | Traditional Kukui Nut Lei Keepsake |
| Ti Leaf Lei | — | $49 | 2 | Braided, Open-Ended Ti Leaf Lei |
| Keiki (Child) Lei | — | $49 | 2 | A single strand of orchids made shorter for kids up to 6 years old |
| Candy Lei | — | $49 | 2 | A fun alternative to flowers for the children! These treats are great for adults too. The type of candy varies in each lei. |
| Kukui Nut & Ti Leaf Twist Lei | — | $79 | 2 | Ti Leaf braid and polished kukui nut twist. |
| Deluxe Orchid Lei | — | $85 | 2 | Triple the flowers are used to create a thick beautiful festive orchid lei |
| Ti Leaf & Orchids Twist Lei | — | $79 | 2 | Ti leaf braid and purple orchid twist. |
| Deluxe Kukui Nut Lei | — | $75 | 2 | Kukui Nuts, Shells, and fresh greenery make up this handsome lei |
| Deluxe Cigar Lei | — | $75 | 2 | Hundreds of tiny local cigar flowers are used to make this local favorite for the guys |

- Unit evidence: **tier name is a countable lei** (per-lei unit); `min_party_size > 1` (2)
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 69155 — Ohana Small Group Lei Greeting (2-7 people) - Līhuʻe Kaua'i Airport

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=49` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 13 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Classic Orchid Lei | — | $49 | 2 | A single strand of fresh orchids |
| Deluxe Orchid Lei | — | $85 | 2 | Triple the flowers are used to create a thick beautiful festive orchid lei |

- Unit evidence: **tier name is a countable lei** (per-lei unit); `min_party_size > 1` (2)
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 69158 — Large Group Greeting (8 or more) - Kona Hawaii Airport

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=39` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 13 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Classic Orchid Lei | — | $39 | 8 | A single strand of fresh orchids |
| Kukui Nut Lei | — | $39 | 8 | Traditional Kukui Nut Lei Keepsake |
| Ti Leaf Lei | — | $39 | 8 | Braided, Open-Ended Ti Leaf Lei |
| Keiki (Child) Lei | — | $39 | 8 | A single strand of orchids made shorter for kids up to 6 years old |
| Candy Lei | — | $39 | 8 | A fun alternative to flowers for the children! These treats are great for adults too. The type of candy varies in each lei. |
| Kukui Nut & Ti Leaf Twist Lei | — | $70 | 8 | Ti Leaf braid and polished kukui nut twist. |
| Deluxe Orchid Lei | — | $80 | 8 | Triple the flowers are used to create a thick beautiful festive orchid lei |
| Deluxe Kukui Nut Lei | — | $65 | 8 | Kukui Nuts, Shells, and fresh greenery make up this handsome lei |
| Deluxe Cigar Lei | — | $65 | 8 | Hundreds of tiny local cigar flowers are used to make this local favorite for the guys |

- Unit evidence: **tier name is a countable lei** (per-lei unit); `min_party_size > 1` (8)
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 69174 — Classic Orchid Lei Greeting - Līhuʻe Kaua'i Airport

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=59` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 13 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Exclusive (1 person) | — | $59 | 1 | *(empty)* |
| Ohana Small Group (2-7 people) | — | $49 | 1 | *(empty)* |
| Large Group (8 or more) | — | $39 | 1 | *(empty)* |

- Unit evidence: **person/people token** in tier text; **party-size band** in tier text
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 69175 — Exclusive Lei Greeting - Līhuʻe Kaua'i Airport

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=59` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 13 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Classic Orchid Lei | — | $59 | 1 | A single strand of fresh orchids |
| Deluxe Orchid Lei | — | $95 | 1 | Triple the flowers are used to create a thick beautiful festive orchid lei |

- Unit evidence: **tier name is a countable lei** (per-lei unit)
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 69177 — Honeymoon Lei Greeting - Līhuʻe Kaua'i Airport

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=95` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 13 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Classic Orchid Honeymoon Special (Set of 2) | — | $95 | 1 | Two single strand orchid lei |
| Deluxe Honeymoon Special (Set of 2) | — | $165 | 1 | Two Deluxe Orchid Lei |

- Unit evidence: **pack / set-of-N** wording
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 69207 — Large Group Greeting (8 or more) -  Līhuʻe Kaua'i Airport

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=39` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 13 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Classic Orchid Lei | — | $39 | 8 | A single strand of fresh orchids |
| Deluxe Orchid Lei | — | $80 | 8 | Triple the flowers are used to create a thick beautiful festive orchid lei |

- Unit evidence: **tier name is a countable lei** (per-lei unit); `min_party_size > 1` (8)
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 69529 — Oahu Transportation - Airport to Waikiki and Kahala

- Hold state: **not held — excluded by: inactive + noPrice**
- Stored: `price=null` `priceLabel=null` `priceConfidence=null`
- **Live: pk returned by the API on 0 of 17 dates — absent from every response.**

### pk 69530 — Oahu Transportation - Airport to Turtle Bay and North Shore

- Hold state: **not held — excluded by: inactive + noPrice**
- Stored: `price=null` `priceLabel=null` `priceConfidence=null`
- **Live: pk returned by the API on 0 of 17 dates — absent from every response.**

### pk 69531 — Oahu Transportation - Airport to East, West and Windward Oahu

- Hold state: **not held — excluded by: inactive + noPrice**
- Stored: `price=null` `priceLabel=null` `priceConfidence=null`
- **Live: pk returned by the API on 0 of 17 dates — absent from every response.**

## 3. Operator: Leis of Hawaii (`airportleigreeting`)

- Rows: **13** — held (conf-low sole clause): **8**; in draw pool: 5; otherwise excluded: 0
- pks: `35227, 35233, 48325, 48326, 60961, 78557, 86756, 91376, 99910, 151830, 163287, 166418, 271116`
- Held pks: `35233, 48325, 48326, 60961, 78557, 99910, 151830, 271116`

### pk 35227 — Airport Lei Greeting Daniel K. Inouye Intl / Oahu, Honolulu $75.00

- Hold state: **not held — IN DRAW POOL**
- Stored: `price=75` `priceLabel=Standard Lei` `priceConfidence=high`
- Live: availability on 17/17 dates; 17 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Standard Lei | Standard Leis | $75 | 1 | Book (4 or More) And Get Comp Kukui Nut Leis For All Sonia Orchid |
| Standard Kukui Nut Lei | — | $75 | 1 | Book (4 or More) And Get Comp Kukui Nut Leis For All Kukui Nut |
| Standard Upgrade Lei | Standard Upgrade Leis | $85 | 1 | Book (4 or More) And Get Comp Kukui Nut Leis For All Plumeria, Sonia Orchid & Tuberose, Ti-Leaf, Kukui Nut, White, Green Orchid, |
| Superior Lei | Superior Leis | $170 | 1 | Ti-Leaf & Sonia Orchid, White Orchid, Tuberose, Kukuna-o-kala, Crown Flower, He'e Moch Orange |
| Adult Deluxe Lei | Adult Deluxe Leis | $180 | 1 | Double Plumeria, Tuberose, Lantern Ilima, Sonia Orchid, Dendrobium |
| Adult Special Lei | Adult Special Leis | $200 | 1 | Crown Pikake Style, Micronesian Ginger, Ohai'i-Ali'i, Cigar, Kika, Maile, Puakenikeni, Haku, Kukui Mock Orange, Carnation |
| VIP | VIPs | $250 | 1 | Feather Sonia Orchid, Triple Ginger, Christina, Sweetheart, Black Beauty, King 11, Leilani |
| Celebrity Lei | Celebrity Leis | $280 | 1 | Haku & Deluxe Double Lei (Flowers: Tuberose, Sonia Orchid & Red Roses) Rope Pikake |
| Bride and Groom Lei | — | $300 | 1 | 1-Double Orchid, 1-Ti-Leaf & Orchid Twist - Open End (Orchids Use - Sonia, White, Green) |

- Unit evidence: **party-size band** in tier text; **tier name is a countable lei** (per-lei unit)
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 35233 — Airport Lei Greeting Maui, Kahului $85.00

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=85` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 17 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Group Rate 7 up Sonia | Group Rate (7 or More People) | $85 | 1 | Sonia Orchid |
| Group Rate 7 up Kukui | Group Rate (7 or More People) | $85 | 1 | Kukui Nut |
| Standard Lei | Standard Leis | $275 | 1 | Book (4 or More) And Get Comp Kukui Nut Leis For All Sonia Orchid |
| Standard Upgrade Lei | Standard Upgrade Leis | $320 | 1 | Book (4 or More) And Get Comp Kukui Nut Leis For All Plumeria, Sonia Orchid & Tuberose, Ti-Leaf, Kukui Nut, White, Green Orchid, |
| Superior Lei | Superior Leis | $340 | 1 | Ti-Leaf & Sonia Orchid, White Orchid, Tuberose, Kukuna-o-kala, Crown Flower, He'e Moch Orange |
| Adult Deluxe Lei | Adult Deluxe Leis | $360 | 1 | Double Plumeria, Tuberose, Lantern Ilima, Sonia Orchid, Dendrobium |
| Adult Special Lei | Adult Special Leis | $380 | 1 | Crown Pikake Style, Micronesian Ginger, Ohai'i-Ali'i, Cigar, Kika, Maile, Puakenikeni, Haku, Kukui Mock Orange, Carnation |
| VIP | VIPs | $400 | 1 | Feather Sonia Orchid, Triple Ginger, Christina, Sweetheart, Black Beauty, King 11, Leilani |
| Celebrity Lei | Celebrity Leis | $500 | 1 | Haku & Deluxe Double Lei (Flowers: Tuberose, Sonia Orchid & Red Roses) Rope Pikake |
| Bride and Groom Lei | — | $550 | 1 | 1-Double Orchid, 1-Ti-Leaf & Orchid Twist - Open End (Orchids Use - Sonia, White, Green) |

- Unit evidence: **person/people token** in tier text; **party-size band** in tier text; **tier name is a countable lei** (per-lei unit)
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 48325 — Airport Lei Greeting Kauai, Lihue $85.00

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=85` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 17 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Group Rate 7 up Sonia | Group Rate (7 or More People) | $85 | 1 | Sonia Orchid |
| Group Rate 7 up Kukui | Group Rate (7 or More People) | $85 | 1 | Kukui Nut |
| Standard Lei | Standard Leis | $595 | 1 | Book (4 or More) And Get Comp Kukui Nut Leis For All Sonia Orchid |
| Standard Upgrade Lei | Standard Upgrade Leis | $640 | 1 | Book (4 or More) And Get Comp Kukui Nut Leis For All Plumeria, Sonia Orchid & Tuberose, Ti-Leaf, Kukui Nut, White, Green Orchid, |
| Superior Lei | Superior Leis | $660 | 1 | Ti-Leaf & Sonia Orchid, White Orchid, Tuberose, Kukuna-o-kala, Crown Flower, He'e Moch Orange |
| Adult Deluxe Lei | Adult Deluxe Leis | $680 | 1 | Double Plumeria, Tuberose, Lantern Ilima, Sonia Orchid, Dendrobium |
| Adult Special Lei | Adult Special Leis | $700 | 1 | Crown Pikake Style, Micronesian Ginger, Ohai'i-Ali'i, Cigar, Kika, Maile, Puakenikeni, Haku, Kukui Mock Orange, Carnation |
| VIP | VIPs | $720 | 1 | Feather Sonia Orchid, Triple Ginger, Christina, Sweetheart, Black Beauty, King 11, Leilani |
| Celebrity Lei | Celebrity Leis | $820 | 1 | Haku & Deluxe Double Lei (Flowers: Tuberose, Sonia Orchid & Red Roses) Rope Pikake |
| Bride and Groom Lei | — | $870 | 1 | 1-Double Orchid, 1-Ti-Leaf & Orchid Twist - Open End (Orchids Use - Sonia, White, Green) |

- Unit evidence: **person/people token** in tier text; **party-size band** in tier text; **tier name is a countable lei** (per-lei unit)
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 48326 — Airport Lei Greeting Hawaii, Kona $85.00

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=85` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 17 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Group Rate 7 up Sonia | Group Rate (7 or More People) | $85 | 1 | Sonia Orchid |
| Group Rate 7 up Kukui | Group Rate (7 or More People) | $85 | 1 | Kukui Nut |
| Standard Lei | Standard Leis | $595 | 1 | Book (4 or More) And Get Comp Kukui Nut Leis For All Sonia Orchid |
| Standard Upgrade Lei | Standard Upgrade Leis | $640 | 1 | Book (4 or More) And Get Comp Kukui Nut Leis For All Plumeria, Sonia Orchid & Tuberose, Ti-Leaf, Kukui Nut, White, Green Orchid, |
| Superior Lei | Superior Leis | $660 | 1 | Ti-Leaf & Sonia Orchid, White Orchid, Tuberose, Kukuna-o-kala, Crown Flower, He'e Moch Orange |
| Adult Deluxe Lei | Adult Deluxe Leis | $680 | 1 | Double Plumeria, Tuberose, Lantern Ilima, Sonia Orchid, Dendrobium |
| Adult Special Lei | Adult Special Leis | $700 | 1 | Crown Pikake Style, Micronesian Ginger, Ohai'i-Ali'i, Cigar, Kika, Maile, Puakenikeni, Haku, Kukui Mock Orange, Carnation |
| VIP | VIPs | $720 | 1 | Feather Sonia Orchid, Triple Ginger, Christina, Sweetheart, Black Beauty, King 11, Leilani |
| Celebrity Lei | Celebrity Leis | $820 | 1 | Haku & Deluxe Double Lei (Flowers: Tuberose, Sonia Orchid & Red Roses) Rope Pikake |
| Bride and Groom Lei | — | $870 | 1 | 1-Double Orchid, 1-Ti-Leaf & Orchid Twist - Open End (Orchids Use - Sonia, White, Green) |

- Unit evidence: **person/people token** in tier text; **party-size band** in tier text; **tier name is a countable lei** (per-lei unit)
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 60961 — Wholesale 9 Leis-Gift Pack $540.00

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=495` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 17 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Wholesale 9 Leis-Gift Pack | Wholesale 9 Leis-Gift Packs | $495 | 1 | *(empty)* |

- Unit evidence: **tier name is a countable lei** (per-lei unit); **pack / set-of-N** wording
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 78557 — Wholesale Leis & Flowers $20.00

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=20` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 17 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Wholesale Sonia Orchid Lei 50-Pack | — | $1000 | 1 | *(empty)* |
| Wholesale White Orchid Lei 50-Pack | — | $1000 | 1 | *(empty)* |
| Wholesale Green Orchid Lei 50-Pack | — | $1000 | 1 | *(empty)* |
| Wholesale Plumeria Lei 50-Pack | — | $1000 | 1 | *(empty)* |
| Wholesale Kukui Nut Lei 50-Pack | — | $1000 | 1 | *(empty)* |
| Wholesale Loose Sonia Orchid 1,000 Pack | — | $400 | 1 | *(empty)* |
| Wholesale Loose White Orchid 1,000 Pack | — | $400 | 1 | *(empty)* |
| Wholesale Loose Green Orchid 1,000 Pack | — | $400 | 1 | *(empty)* |
| Wholesale Loose Plumeria 1,000 Pack | — | $400 | 1 | *(empty)* |
| Wholesale Loose Tuberose 1,000 Pack | — | $400 | 1 | *(empty)* |

- Unit evidence: **tier name is a countable lei** (per-lei unit); **pack / set-of-N** wording
- Stored price vs live tiers: **matches NO live tier ❌** (live: $400, $1000)
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 86756 — Fresh Flowers & Leis $25.00

- Hold state: **not held — IN DRAW POOL**
- Stored: `price=25` `priceLabel=Standard Lei` `priceConfidence=high`
- Live: availability on 17/17 dates; 17 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Standard Lei | Standard Leis | $25 | 1 | Book (4 or More) And Get Comp Kukui Nut Leis For All Sonia Orchid |
| Standard Upgrade Lei | Standard Upgrade Leis | $45 | 1 | Book (4 or More) And Get Comp Kukui Nut Leis For All Plumeria, Sonia Orchid & Tuberose, Ti-Leaf, Kukui Nut, White, Green Orchid, |
| Superior Lei | Superior Leis | $95 | 1 | Ti-Leaf & Sonia Orchid, White Orchid, Tuberose, Kukuna-o-kala, Crown Flower, He'e Moch Orange |
| Adult Deluxe Lei | Adult Deluxe Leis | $150 | 1 | Double Plumeria, Tuberose, Lantern Ilima, Sonia Orchid, Dendrobium |
| Adult Special Lei | Adult Special Leis | $155 | 1 | Crown Pikake Style, Micronesian Ginger, Ohai'i-Ali'i, Cigar, Kika, Maile, Puakenikeni, Haku, Kukui Mock Orange, Carnation |
| VIP | VIPs | $165 | 1 | Feather Sonia Orchid, Triple Ginger, Christina, Sweetheart, Black Beauty, King 11, Leilani |
| Celebrity Lei | Celebrity Leis | $175 | 1 | Haku & Deluxe Double Lei (Flowers: Tuberose, Sonia Orchid & Red Roses) Rope Pikake |
| Loose Plumeria | — | $0.50 | 1 | Each flower is $.50 each. We use 50 blooms per lei. For every 50 flowers add on 1 lei count to Packing and Fed/Ex. |
| Loose Sonia Orchid | — | $0.50 | 1 | Each flower is $.50 each. We use 50 blooms per lei. For every 50 flowers add on 1 lei count to Packing and Fed/Ex. |
| Loose White Orchid | — | $0.50 | 1 | Each flower is $.50 each. We use 50 blooms per lei. For every 50 flowers add on 1 lei count to Packing and Fed/Ex. |
| Loose Green Orchid | — | $0.50 | 1 | Each flower is $.50 each. We use 50 blooms per lei. For every 50 flowers add on 1 lei count to Packing and Fed/Ex. |
| Loose Tuberose | — | $0.50 | 1 | Each flower is $.50 each. We use 50 blooms per lei. For every 50 flowers add on 1 lei count to Packing and Fed/Ex. |

- Unit evidence: **party-size band** in tier text; **tier name is a countable lei** (per-lei unit)
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 91376 — Airport Lei Greeting Daniel K. Inouye Intl / Oahu, Honolulu / Group Rate $21.00

- Hold state: **not held — IN DRAW POOL**
- Stored: `price=21` `priceLabel=per person` `priceConfidence=high`
- Live: availability on 17/17 dates; 17 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Group Rate | Group Rate (26 or More People) | $21 | 1 | Sonia Orchid |
| Group Rates | Group Rates (26 or More People) | $21 | 1 | Kukui Nut |
| Large Group | Large Group (16-25) People | $35 | 1 | Sonia Orchid |
| Large Group | Large Group (16-25) People | $35 | 1 | Kukui Nut |
| Small Group | Small Group (5-15) People | $45 | 1 | Sonia Orchid |
| Small Group | Small Group (5-15) People | $45 | 1 | Kukui Nut |
| One Person | One Person (1-4 Person) | $75 | 1 | Book (4 or More) And Get Comp Kukui Nut Leis For All Sonia Orchid |
| One Person | One Person (1-4 Person) | $75 | 1 | Book (4 or More) And Get Comp Kukui Nut Leis For All Kukui Nut |
| Standard Upgrade Lei | Standard Upgrade Leis | $85 | 1 | Book (4 or More) And Get Comp Kukui Nut Leis For All Plumeria, Sonia Orchid & Tuberose, Ti-Leaf, Kukui Nut, White, Green Orchid, |
| Superior Lei | Superior Leis | $170 | 1 | Ti-Leaf & Sonia Orchid, White Orchid, Tuberose, Kukuna-o-kala, Crown Flower, He'e Moch Orange |
| Adult Deluxe Lei | Adult Deluxe Leis | $180 | 1 | Double Plumeria, Tuberose, Lantern Ilima, Sonia Orchid, Dendrobium |
| Adult Special Lei | Adult Special Leis | $200 | 1 | Crown Pikake Style, Micronesian Ginger, Ohai'i-Ali'i, Cigar, Kika, Maile, Puakenikeni, Haku, Kukui Mock Orange, Carnation |
| VIP | VIPs | $250 | 1 | Feather Sonia Orchid, Triple Ginger, Christina, Sweetheart, Black Beauty, King 11, Leilani |
| Celebrity Lei | Celebrity Leis | $280 | 1 | Haku & Deluxe Double Lei (Flowers: Tuberose, Sonia Orchid & Red Roses) Rope Pikake |
| Bride and Groom Lei | — | $300 | 1 | 1-Double Orchid, 1-Ti-Leaf & Orchid Twist - Open End (Orchids Use - Sonia, White, Green) |

- Unit evidence: **person/people token** in tier text; **party-size band** in tier text; **tier name is a countable lei** (per-lei unit)
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 99910 — Airport Departure / Oahu, Maui, Kauai, Hawaii $250.00

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=250` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 17 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Departure Rate | Departure Rates | $250 | 1 | (1 to 3) Per Person $250.00 each |
| Departure Family | — | $175 | 1 | (4 to 6) Per Person $175.00 each |
| Departure Small Group | — | $150 | 1 | (7 to 11) Per Person $150.00 each |
| Departure Large Group | — | $100 | 1 | (12 or More) Per Person $100.00 each |

- Unit evidence: **person/people token** in tier text; **party-size band** in tier text
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 151830 — Harbor Lei Greeting / Oahu, Honolulu $250.00

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=250` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 17 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Harbor Rates | — | $250 | 1 | (2 to 3) Person / Sonia Orchid |
| Harbor Family | — | $250 | 1 | (4 to 6) Person / Sonia Orchid |
| Harbor Small Group | — | $250 | 1 | (7 to 11) Person / Sonia Orchid |
| Harbor Large Group | — | $250 | 1 | (12 or More) Person / Sonia Orchid |
| Harbor - Upgrade Leis | — | $250 | 1 | Single Leis, Plumeria, Tuberose, Ti-Leaf, Plumeria & Sonia, Plumeria & Carnation, Tuberose & Sonia, Tuberose & Carnation |
| Harbor - Deluxe Leis | — | $250 | 1 | Double Leis, Sonia Orchid, Plumeria, Tuberose, Sonia & Plumeria, Sonia & Tuberose |

- Unit evidence: **person/people token** in tier text; **party-size band** in tier text; **tier name is a countable lei** (per-lei unit)
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 163287 — Leis From Hawaii

- Hold state: **not held — IN DRAW POOL**
- Stored: `price=39.95` `priceLabel=Leis` `priceConfidence=high`
- Live: availability on 17/17 dates; 17 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Leis | — | $39.95 | 1 | 50 Leis Or More Amount Includes: (Leis, Packing, Shipping) Tax not included |

- Unit evidence: **tier name is a countable lei** (per-lei unit)
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 166418 — Airlines ~ Arrivals & Departures

- Hold state: **not held — IN DRAW POOL**
- Stored: `price=18` `priceLabel=per person` `priceConfidence=high`
- Live: availability on 17/17 dates; 17 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Airlines - Arrival | — | $18 | 200 | (200 or more) Passengers |
| Airlines - Departure | — | $18 | 200 | (200 or more) Passengers |

- Unit evidence: **person/people token** in tier text; **party-size band** in tier text; `min_party_size > 1` (200)
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)

### pk 271116 — Airport Lei Greeting Hawaii, Hilo $85.00

- Hold state: **HELD (conf-low is the sole failing clause; hub reason D-484 "no assertable unit")**
- Stored: `price=85` `priceLabel=unknown` `priceConfidence=low`
- Live: availability on 17/17 dates; 17 distinct `start_at` (sample is real, not one pinned response)

| customer type (`singular`) | `plural` | price | `min_party_size` | `note` (verbatim) |
|---|---|---|---|---|
| Group Rate 7 up Sonia | Group Rate (7 or More People) | $85 | 1 | Sonia Orchid |
| Group Rate 7 up Kukui | Group Rate (7 or More People) | $85 | 1 | Kukui Nut |
| Standard Lei | Standard Leis | $595 | 1 | Book (4 or More) And Get Comp Kukui Nut Leis For All Sonia Orchid |
| Standard Kukui Nut Lei | — | $595 | 1 | Book (4 or More) And Get Comp Kukui Nut Leis For All Kukui Nut |
| Standard Upgrade Lei | Standard Upgrade Leis | $640 | 1 | Book (4 or More) And Get Comp Kukui Nut Leis For All Plumeria, Sonia Orchid & Tuberose, Ti-Leaf, Kukui Nut, White, Green Orchid, |
| Superior Lei | Superior Leis | $660 | 1 | Ti-Leaf & Sonia Orchid, White Orchid, Tuberose, Kukuna-o-kala, Crown Flower, He'e Moch Orange |
| Adult Deluxe Lei | Adult Deluxe Leis | $680 | 1 | Double Plumeria, Tuberose, Lantern Ilima, Sonia Orchid, Dendrobium |
| Adult Special Lei | Adult Special Leis | $700 | 1 | Crown Pikake Style, Micronesian Ginger, Ohai'i-Ali'i, Cigar, Kika, Maile, Puakenikeni, Haku, Kukui Mock Orange, Carnation |
| VIP | VIPs | $720 | 1 | Feather Sonia Orchid, Triple Ginger, Christina, Sweetheart, Black Beauty, King 11, Leilani |
| Celebrity Lei | Celebrity Leis | $820 | 1 | Haku & Deluxe Double Lei (Flowers: Tuberose, Sonia Orchid & Red Roses) Rope Pikake |
| Bride and Groom Lei | — | $870 | 1 | 1-Double Orchid, 1-Ti-Leaf & Orchid Twist - Open End (Orchids Use - Sonia, White, Green) |

- Unit evidence: **person/people token** in tier text; **party-size band** in tier text; **tier name is a countable lei** (per-lei unit)
- Stored price vs live tiers: matches a live tier ✅
- Price stability: every tier flat across all 17 dates (no drift, no date artifact)


## 4. Rows where live evidence contradicts the stored hold reason

The hub reason on the lei block is **D-484 — "no assertable unit". Live tier text contradicts that on all 28 held rows.**

| pk | operator | contradiction | the asserting text, verbatim |
|---|---|---|---|
| 99910 | Leis of Hawaii | Tier notes state the unit **in words**, with the price and the band | `(1 to 3) Per Person $250.00 each` · `(4 to 6) Per Person $175.00 each` · `(7 to 11) Per Person $150.00 each` · `(12 or More) Per Person $100.00 each` |
| 151830 | Leis of Hawaii | Bands are stated **and all four are the same $250** — that asserts a flat per-booking fee, not per person | `(2 to 3) Person / Sonia Orchid` · `(4 to 6) Person` · `(7 to 11) Person` · `(12 or More) Person`, every tier $250 |
| 35233 | Leis of Hawaii | Cheapest tier declares its party minimum in `plural` | `Group Rate (7 or More People)` |
| 48325 | Leis of Hawaii | same | `Group Rate (7 or More People)` |
| 48326 | Leis of Hawaii | same | `Group Rate (7 or More People)` |
| 271116 | Leis of Hawaii | same | `Group Rate (7 or More People)` |
| 60961 | Leis of Hawaii | Single tier; unit is a **pack of 9 leis**, stated in the tier name | `Wholesale 9 Leis-Gift Pack` |
| 78557 | Leis of Hawaii | Unit is a **pack**, stated in every tier name | `Wholesale Sonia Orchid Lei 50-Pack` · `Wholesale Loose Sonia Orchid 1,000 Pack` |
| 67250 / 69111 / 69138 / 69174 | LeiGreeting.com | The **tiers are the party bands**, and the price *falls* as the band widens — that is a per-person fare by construction | `Exclusive (1 person)` / `Ohana Small Group (2-7 people)` / `Large Group (8 or more)` — e.g. 67250: $45 / $39 / $35 |
| 67256, 67265, 67269, 69114, 69132, 69135, 69142, 69150, 69155, 69158, 69175, 69207 | LeiGreeting.com | Every tier **names one countable lei** and the note describes a single strand; the party band sits in `min_party_size` (1 / 2 / 8) and in the item title | `Classic Orchid Lei` — *"A single strand of fresh orchids"*; `Deluxe Orchid Lei` — *"Triple the flowers are used to create a thick beautiful festive orchid lei"* |
| 67260, 69116, 69146, 69177 | LeiGreeting.com | Tier name states the count explicitly | `Classic Orchid Honeymoon Special (Set of 2)` — *"Two single strand orchid lei"* |

**The one held row with genuinely no unit token:** none. The weakest is the LeiGreeting `Classic Orchid Lei` /
`Deluxe Orchid Lei` pattern (69175 is the thinnest — 2 tiers, no person word anywhere), but even there the
tier name is a countable object and `min_party_size` carries the band. A rule keyed only on person/guest
tokens reads that as "no assertable unit"; the unit is **per lei**, which for a greeting is one per arriving guest.

### Separate finding — a price contradiction, not a unit contradiction

**pk 78557 `Wholesale Leis & Flowers $20.00` — stored `price: 20` matches NO live tier on any of 17 dates.**
The cheapest live tier is `Wholesale Loose Sonia Orchid 1,000 Pack` at **$400**; the lei packs are **$1000**.
This is the same class as the pk 13713 / 247 / 95014 corrections: a stored fare that matches nothing live.
It is the only stored-vs-live price mismatch in the block — the other 27 held rows all match a live tier exactly.

**pk 60961** — stored `price: 495` matches the single live tier $495, but the row **name** says `$540.00`.
Name and price disagree; the live API sides with the stored price.

### Not a contradiction, but worth recording

- **69529 / 69530 / 69531** (`Oahu Transportation …`) return **zero items on all 17 dates** — the API omits them
  entirely. All three are already `status: inactive` with `price: null`, so the tree and the live API agree.
- **Every tier on every one of the 33 live rows is flat across all 17 dates.** No drift, no date artifact, and
  no `$0.00` far-future readings anywhere in this block.
- **Operator-level correlation holds.** On `airportleigreeting` the two rows already published at
  `priceConfidence: high` (35227 `Standard Lei`, 91376 `per person`) use the **same tier vocabulary** as the
  six held rows — `Standard Lei` / `Superior Lei` / `VIP` / `Celebrity Lei`, identical notes. The held rows are
  not a different kind of product from the published ones; they are the same ladder at other airports.
