# S41 — the 290 conf-low sole-clause population, near-window census

Recon + one status write. Tree: `main` @ `1505bec` at census time; branch `fix/deactivate-25-no-published-rate` off `origin/main` @ `1505bec`.
Untracked scratch. Not staged, not committed.

**This file is the record that did not exist for the carried "24 DEAD".** The s39/s40 hub record
carried the count, the two operator concentrations (`blowglasshawaii` 7, `hawaiireisetipps` 4) and
"then 12 singletons" — but no pk list, in either repo or in hub git history. Enumerating it was the
open TASKS item; this is the enumeration.

## Method

- Population: the **290** rows where `priceConfidence: "low"` is the SOLE clause excluding the row
  from the `app.js:139` draw pool. Measured through `isAddonOrRental()` (`app.js:194-209`) and
  `hasUsablePrice()` (`app.js:217-219`) **extracted from the file by brace balance and verified
  byte-exact against those line ranges**, never reimplemented.
- Predicate: `status !== "inactive" && !bookingDead && !isAddonOrRental(t) && !hasUsablePrice(t)`
  `&& Number.isFinite(t.price) && t.price > 1 && t.priceConfidence === "low"` — the last three
  clauses decompose the composite `hasUsablePrice` so that confidence is provably the only failure.
- Endpoint: `https://fareharbor.com/api/embed/{sn}/price-preview/per-item/v2/`
  `?item_pks={csv}&include_breakdown=yes&date={d}`
- Shortname parsed **exact-segment** from each row own `bookingUrl`: locate the literal `items`
  path segment, shortname is the segment before it, pk the segment after. **0 parse failures,
  0 pk mismatches across all 290**, single host `fareharbor.com`, 137 distinct shortnames.
- Dates: **2026-08-23 … 2026-09-05**, 14 consecutive from the day after the census.
  **No `+30`/`+60`/`+90` and no undated pull**, per **D-505** — far-horizon zeros are unloaded
  rates, not price evidence, and an undated call resolves to "next availability", which is a
  far-horizon reading in disguise. This is the one methodological difference from the s39 census.
- Batched by shortname per date, cap 20 `item_pks`/request; no shortname exceeded 20, so
  batches == shortnames.

| quantity | value |
|---|---|
| dates | 14 |
| shortnames | 137 |
| batches per date | 137 |
| **requests** | **1918** |
| attempts | 1918 (0 retries fired) |
| **failures** | **0** |
| HTTP status | 200 on all 1918 |

Prices arrive **in cents** (`19700` = $197.00); all dollar figures below are converted. The zero
test is unaffected either way.

## Classification rule

- **DEAD-candidate / all-zero** — the item returned tiers, and every tier on every date it appeared
  was $0.00.
- **DEAD-candidate / no-tiers** — the item was absent from the response on all 14 dates.
- **PRICED** — at least one nonzero tier on at least one date.
- **ERROR** — any HTTP failure. **Empty: no row is unclassifiable.**

```
PRICED                     265
DEAD-candidate / all-zero   23     record: "23 priced $0.00 on all 18 dates"   EXACT
DEAD-candidate / no-tiers    2     record: "1 returning no tier at all"        +1
ERROR                        0
                           ---
DEAD-candidate total        25     vs the record 24  ->  delta +1
```

### Reconciliation against the hub record

- **`blowglasshawaii` — 7 DEAD-candidate.** Record said 7. The block had exactly 7 rows inside the
  290, so set equality was already forced by arithmetic before any request was made; the census
  confirms it independently.
- **`hawaiireisetipps` — 4 of 5 DEAD-candidate.** Record said 4 but never said which. The census
  names them: `360607`, `360609`, `361806`, `362055` dead; **`595694` (Step-On Guide) PRICED at
  $450.00, exactly its stored price.**
- **The +1 sits entirely in the no-tiers arm** (2 measured vs 1 recorded); the all-zero arm
  reproduces exactly at 23. The mechanism is one-directional and worth recording: s39 DEAD rule
  was `$0.00 on all 18 dates` where the 18 included undated and `+30`/`+60`/`+90`. A row silent in
  the near window but priced at a far date **fails** that rule and **passes** this one. A
  near-window-only census can therefore only meet or exceed the s39 count, never fall below it,
  and +1 is the smallest such excess. **Untested here** — testing it needs the far-horizon pulls
  this pass deliberately excludes. Clean follow-up: one far pull on the two no-tiers pks.

## The 25 DEAD-candidates

`dates w/ tiers` = dates on which the item appeared at all (of 14).

| pk | shortname | company | name | stored | kind | dates w/ tiers |
|---|---|---|---|---|---|---|
| `180538` | `808escaperoom` | 808 Escape Room | Tiki’s Shack | $45 | **all-zero** | 14/14 |
| `166073` | `blowglasshawaii` | Moana Glass by Ryan Staub | 1 Piece Private Lesson (1 hour) | $300 | **all-zero** | 14/14 |
| `166074` | `blowglasshawaii` | Moana Glass by Ryan Staub | 2 Piece Private Lesson (1.5 hours) | $300 | **all-zero** | 14/14 |
| `166075` | `blowglasshawaii` | Moana Glass by Ryan Staub | 3 Piece Private Lesson (2 hours) | $300 | **all-zero** | 14/14 |
| `166076` | `blowglasshawaii` | Moana Glass by Ryan Staub | 4 Piece Private Lesson (2 hours) | $300 | **all-zero** | 14/14 |
| `166077` | `blowglasshawaii` | Moana Glass by Ryan Staub | 5 Piece Private Lesson (2.5 hours) | $300 | **all-zero** | 14/14 |
| `166078` | `blowglasshawaii` | Moana Glass by Ryan Staub | 6 Piece Private Lesson (3 hours) | $300 | **all-zero** | 14/14 |
| `166079` | `blowglasshawaii` | Moana Glass by Ryan Staub | 7 Piece Private Lesson (3 hours) | $300 | **all-zero** | 14/14 |
| `76285` | `divekauai` | Dive Kauai | DIVEMASTER INTERNSHIP | $2137 | **all-zero** | 14/14 |
| `58566` | `escapehilo` | Escape Hilo | Lava Cave Mystery | $35 | **all-zero** | 14/14 |
| `410187` | `halatreecoffee` | Hala Tree | Kona Coffee Farm Tour | $100 | **all-zero** | 14/14 |
| `346916` | `hawaiibackroad` | Big Island Backroad Adventures LLC | The Full Circle Big Island Tour | $1102 | **all-zero** | 14/14 |
| `360607` | `hawaiireisetipps` | DanielsHawaii | Pearl Harbor ALLE MUSEEN, USS Arizona, I‘olani Palast & Honolulu | $100 | **all-zero** | 14/14 |
| `360609` | `hawaiireisetipps` | DanielsHawaii | Pearl Harbor USS Arizona All Access Private Tour | $299 | **all-zero** | 14/14 |
| `361806` | `hawaiireisetipps` | DanielsHawaii | Private Airport to Hotel Shuttle | $150 | **all-zero** | 14/14 |
| `362055` | `hawaiireisetipps` | DanielsHawaii | Private Hotel to Airport Shuttle | $150 | **all-zero** | 14/14 |
| `43208` | `hilooceanadventures` | Hilo Ocean Adventures | Snorkel Gear Rental | $15 | **all-zero** | 14/14 |
| `659318` | `kailanitourshawaii` | Kailani Tours Hawaii | Volcano Shuttle Tour | $209 | **no-tiers** | 0/14 |
| `5350` | `kailuasailboards` | Kailua Beach Adventures | 各種レンタル (Rental) | $89 | **all-zero** | 14/14 |
| `7043` | `konaboys` | Kona Boys | Kealakekua Bay Kayak and Paddle Board rentals | $64 | **all-zero** | 14/14 |
| `506567` | `manoachocolate` | Manoa Chocolate Hawaii | Sip & Pair Wine and Chocolate Experience | $45 | **all-zero** | 14/14 |
| `580644` | `proartsmaui` | ProArts Playhouse | Free Range Comedy | $15 | **no-tiers** | 0/14 |
| `693778` | `ritzcarltonmauiluau` | *(no company field)* | Native Hawaiian Crafts | $79.5 | **all-zero** | 4/14 |
| `232723` | `uniquehawaiiexperience` | Unique Maui Tours | 7 Sacred Pools & Bamboo Forest Hike | $215 | **all-zero** | 14/14 |
| `232724` | `uniquehawaiiexperience` | Unique Maui Tours | Bird Lovers' Road to Hana | $1435 | **all-zero** | 14/14 |

### Controls on the two no-tiers rows — both absences are item-specific, not request failures

- `kailanitourshawaii` batch = `600939, 483351, 605508, 659318, 659692`. On **all 14 dates** the
  response returned `[483351, 659692, 600939, 605508]` — four siblings every time, **`659318`
  never once**. All four siblings are PRICED at $1,499–$2,337.
- `proartsmaui` batch = `580645, 580644`. On **all 14 dates** the response returned `[580645]` —
  sibling present every time, **`580644` never once**. `580645` is PRICED at $21.20.

### One partial-availability row, read explicitly

`693778` (`ritzcarltonmauiluau`, Native Hawaiian Crafts) is the only DEAD-candidate not present on
all 14 dates: it appeared on 2026-08-23/24/25/26 and returned nothing on the following ten. It is
**all-zero, not no-tiers** — every tier it did return was $0.00. It is also the only one of the 25
that carried neither a `status` nor a `statusReason` key before this PR.

## The 265 PRICED rows

**Near-window price stability is near-total.** Distinct tier-price vectors across the 14 dates:
**245** rows at 1, **19** at 2, **1** at 3 (`426`, Waikiki Dive Center).
Only 1 of the 265 has partial availability. So a stored-vs-live gap in this population is a real
gap, not a date artifact — which is the condition D-505 was written to separate out.

Stored price vs cheapest live tier: **119 equal, 124 stored above, 22 stored below**.
Cheapest-tier range $1.00 – $2337.17. 12 rows have `min_party_size > 1`.

**No rulings are drawn here.** Cheapest-nonzero-tier is a census observation, not a base-fare
nomination: D-482 (buyer-purchasable cheapest), D-494 (ancillary exclusion) and D-495 (thing-token
needs a second signal) all bear on that and none of them was applied. Several cheapest tiers below
are visibly not base fares — rider/observer seats, gratuity lines, defog purchases, trekking poles.

### Flagged tier names (Buy Rate / Wholesale / Agent / Complimentary / Empty Seat)

**1 row across all 290.**

- `60961` · Leis of Hawaii · item name *"Wholesale 9 Leis-Gift Pack $540.00"* · stored $495 ·
  cheapest and only tier **`Wholesale 9 Leis-Gift Pack`** at $495.00, note empty, mps 1, 1 vector.
  Observation only: the live tier agrees with the stored $495 and disagrees with the $540.00
  written into the item own name — the open `60961` name/price item already logged in the hub.

### Full table, grouped by operator, cheapest nonzero tier only

| pk | operator | name | stored | cheapest | tier `singular` | `plural` | mps | vectors | `note` |
|---|---|---|---|---|---|---|---|---|---|
| `5274` | Action Sports Maui | Surfing Lessons | $95 | **$95.00** | Surf Beginner Group (2 hours) | Surf Beginner Group (2 hours) | 1 | 1 | Surf Beginner Group (2 hours) |
| `5278` | Action Sports Maui | Multi Day Surf Course | $270 | **$270.00** | Surf Group 3-day (6 hours) | Surf Group 3-day (6 hours) | 1 | 1 | Group class, 3xDays, 2hrs/day |
| `5279` | Action Sports Maui | Stand-Up-Paddle Lesson | $165 | **$165.00** | SUP Semi-Private (1.5 hours) | SUP Semi-Private (1.5 hours) | 1 | 1 | SUP Semi-Private (1.5 hours) |
| `5281` | Action Sports Maui | Kiteboarding Lessons | $350 | **$300.00** | Kiteboard - Shared/Group (2.5 hours) | Kiteboard - Shared/Group (2.5 hours) | 1 | 1 | ‍ |
| `5282` | Action Sports Maui | Kiteboarding Multi-Day Course | $20 | **$1125.00** | Kiteboard Private 3-Day (9 hours) | Kiteboard Private 3-Day (9 hours) | 1 | 1 | All Ages Welcome! • 3 Hours per Day • Gear Included |
| `5284` | Action Sports Maui | Kiting for Kids | $20 | **$195.00** | Kiteboarding for Kids Private (2hrs) | Kiteboarding for Kids Private (2hrs) | 1 | 1 | Kiteboarding for Kids Private (2hrs) |
| `5287` | Action Sports Maui | Windsurf Multi-Day Courses | $975 | **$550.00** | Windsurf Group 3-Day (6 hours) | Windsurf Group 3-Day (6 hours) | 1 | 1 | Group 3-Day, 2 hours per day |
| `5288` | Action Sports Maui | Windsurf Advanced Classes | $325 | **$325.00** | Windsurf Advanced Private (2 hours) | Windsurf Advanced Private (2 hours) | 1 | 1 | ‍ |
| `5292` | Action Sports Maui | Kids Surf Camp | $295 | **$295.00** | Child | Children | 1 | 2 | Ages 10-15 |
| `89895` | Action Sports Maui | Kitefoilboarding Lessons | $295 | **$295.00** | Kitefoilboarding Private (2 hours) | Kitefoilboarding Private (2 hours) | 1 | 1 | Kitefoilboarding Private (2 hours) |
| `256725` | Action Sports Maui | Private Wingsurfing Lesson on Maui | $345 | **$345.00** | Wing-surf Private Lesson 2hrs | Wing-surf Private Lesson 2hrs | 1 | 1 | 2 hours with a Senior Wing Instructor |
| `346502` | Big Island Backroad Adventures LLC | The Ultimate Waterfall Experience | $991 | **$990.87** | Private SUV | Private SUV | 1 | 1 | Private Big Island Waterfall Tour |
| `346901` | Big Island Backroad Adventures LLC | Volcanoes, Lava Tubes & Black Sand Beaches Adventures | $881 | **$1212.30** | Private SUV | Private SUV | 1 | 2 | Private SUV - 8 Hour Volcanoes, Lava Tubes & Black Sand Beaches Tour |
| `427010` | Big Island Backroad Adventures LLC | Water and Fire | $881 | **$1212.30** | Private SUV | Private SUV | 1 | 2 | Private SUV - 8 Hour Waterfalls and Volcanoes Tour |
| `502798` | Big Island Backroad Adventures LLC | Meet you at Kilauea Volcano! | $825 | **$824.80** | Private SUV | Private SUV | 1 | 1 | Private Meet you at Kilauea Volcano Tour |
| `505941` | Big Island Backroad Adventures LLC | Hilo Cruise Ship Guest Special - Water and Fire | $881 | **$880.16** | Private SUV | Private SUV | 1 | 1 | Private Hilo Waterfall and Volcano Tour |
| `509403` | Big Island Backroad Adventures LLC | Hilo Cruise Ship Guest Special - Botanical Gardens, Waterfalls, and Farmers Market | $897 | **$896.77** | Private SUV | Private SUV | 1 | 1 | Private Hilo Botanical Gardens, Waterfalls, and Farmers Market Tour |
| `510966` | Big Island Backroad Adventures LLC | Kona Cruise Ship Guest Special - Kona Historical Tour | $659 | **$658.74** | Private SUV | Private SUV | 1 | 2 | Private 4 Hour Kona Historical Tour |
| `640693` | Big Island Backroad Adventures LLC | Big Island Birdwatching | $881 | **$1212.30** | Private SUV | Private SUV | 1 | 1 | Private Big Island Birdwatching Tour |
| `3108` | Dive Oahu | Night Dives | $231 | **$99.00** | Rider | Riders | 1 | 1 | Ages 16+ |
| `8984` | Dive Oahu | Shallow Reefs Tour | $231 | **$79.00** | Rider Youth | Riders Youth | 1 | 1 | 8-12 years old. Must be accompanied by an adult at all times |
| `9120` | Dive Oahu | Wreck & Reef Tour | $231 | **$99.00** | Rider | Riders | 1 | 1 | Ages 16+ |
| `212159` | Dive Oahu | Turtle Canyon Adventure | $131 | **$79.00** | Rider Youth | Riders Youth | 1 | 1 | 8-12 years old. Must be accompanied by an adult at all times |
| `212164` | Dive Oahu | Introductory Diving | $251 | **$79.00** | Rider Youth | Riders Youth | 1 | 1 | 8-12 years old |
| `655224` | Dive Oahu | Wai'anae - Two Shallows Reef Tour | $206 | **$99.00** | Rider | Riders | 1 | 1 | Ages 16+ |
| `655372` | Dive Oahu | Wai'anae Natural Reef & Wreck | $206 | **$99.00** | Rider | Riders | 1 | 1 | Ages 16+ |
| `506246` | Wai Kai | Lagoon Sport Rentals | $40 | **$10.00** | Bring Your Own Equipment | Bring Your Own Equipment | 1 | 1 | Ages 4+ • Equipment subject to approval and inspection |
| `506683` | Wai Kai | Nalo Kai Club Lounge | $25 | **$25.00** | Nalo Kai Day Pass | Nalo Kai Day Pass | 1 | 1 | Ages 6 and under free w/paying adult (1 per guest) |
| `506952` | Wai Kai | Surf Lesson | $149 | **$149.00** | VIP Surf Lesson (Ages 10+) | VIP Surf Lesson | 1 | 1 | Ages 10+ / VIP Perks Included |
| `508775` | Wai Kai | Shuttle - Round Trip Waikiki | $35 | **$35.00** | Shuttle Transportation | Shuttle Transportation | 1 | 1 |  |
| `542637` | Wai Kai | Waterfont Tent Rental | $250 | **$250.00** | Waterfront Tent | Waterfront Tent | 1 | 2 | Half Day Rental |
| `559007` | Wai Kai | Waterfront Cabanas | $150 | **$150.00** | Waterfront Cabana | Waterfront Cabanas | 1 | 2 | Suggested for 6-8 people |
| `670586` | Wai Kai | Wai Kai Lagoon Adventure | $20 | **$20.00** | Keiki Course Half Day Pass (Ages 4-6) | Keiki Course Half Day Pass (Ages 4-6) | 1 | 2 | Adult pass & supervision required |
| `309841` | Hanalei Trading | Adult Snorkel Set | $17 | **$6.99** | One Day Rental | One Day Rentals | 1 | 1 | 24 Hours |
| `309868` | Hanalei Trading | Snorkel Fins Only | $15 | **$4.99** | One Day Rental | One Day Rentals | 1 | 1 | 24 Hours |
| `309895` | Hanalei Trading | Snorkel Floatation Devices | $15 | **$5.99** | One Day Rental | One Day Rentals | 1 | 1 | 24 Hours |
| `377496` | Hanalei Trading | Adult Dry Snorkel+ Mask | $19 | **$4.99** | One Day Rental | One Day Rentals | 1 | 1 | 24 Hours |
| `377497` | Hanalei Trading | Kids Dry Snorkel + Mask | $19 | **$4.99** | One Day Rental | One Day Rentals | 1 | 1 | 24 Hours |
| `377499` | Hanalei Trading | Kids Snorkel Set | $17 | **$6.99** | One Day Rental | One Day Rentals | 1 | 1 | 24 Hours |
| `42448` | Hilo Ocean Adventures | Stand Up Paddleboard Rental | $30 | **$10.00** | Vehicle Mount System (Daily - 24 Hours) | Vehicle Mount Systems (Daily - 24 Hours) | 1 | 1 |  |
| `43206` | Hilo Ocean Adventures | Scuba Gear Rental | $20 | **$5.00** | Booties (24h) | Booties (24h) | 1 | 1 |  |
| `43210` | Hilo Ocean Adventures | Beach Accessory Rental | $40 | **$5.00** | Number of Coolers (Daily - 24 Hours) | Number of Coolers (Daily - 24 Hours) | 1 | 1 |  |
| `43250` | Hilo Ocean Adventures | Surf Board Rental | $170 | **$10.00** | Vehicle Mount System (Daily - 24 Hours) | Vehicle Mount Systems (Daily - 24 Hours) | 1 | 1 |  |
| `491348` | Hilo Ocean Adventures | Padi Re-Activate Course | $325 | **$325.00** | Padi Re-Activate Refresher | Padi Re-Activate Refresher | 1 | 1 |  |
| `663614` | Hilo Ocean Adventures | Near Shore Fishing Charter | $599 | **$449.00** | 3 Hour Fishing Charter | 3 Hour Fishing Charter | 1 | 1 |  |
| `284519` | Living Ocean Tours | Turtle Canyons Snorkel Excursion | $109 | **$79.00** | Person Ages 3+: Non-Refundable • All Sales are Final | People Ages 3+: Non-Refundable • All Sales are Final | 1 | 1 | Ages 3+ • This Rate is NON-REFUNDABLE • All Sales are Final |
| `323935` | Living Ocean Tours | Waikiki Sunset Cruise BYOB | $59 | **$59.00** | Person Ages 3+: Non-Refundable • All Sales are Final | People Ages 3+: Non-Refundable • All Sales are Final | 1 | 1 | Ages 3+ • This Rate is NON-REFUNDABLE • All Sales are Final |
| `397265` | Living Ocean Tours | Waikiki Whale Watching | $59 | **$49.00** | Person Ages 3+: Non-Refundable • All Sales are Final | People Ages 3+: Non-Refundable • All Sales are Final | 1 | 1 | Ages 3+ • This Rate is NON-REFUNDABLE • All Sales are Final |
| `494462` | Living Ocean Tours | Deluxe Snorkel and Wildlife Cruise | $99 | **$79.00** | Person Ages 3+: Non-Refundable • All Sales are Final | People Ages 3+: Non-Refundable • All Sales are Final | 1 | 1 | Ages 3+ • This Rate is NON-REFUNDABLE • All Sales are Final |
| `575157` | Living Ocean Tours | Friday Night Waikiki Fireworks Cruise | $49 | **$59.00** | Person Ages 3+: Non-Refundable • All Sales are Final | People Ages 3+: Non-Refundable • All Sales are Final | 1 | 2 | Ages 3+ • This Rate is NON-REFUNDABLE • All Sales are Final |
| `616406` | Living Ocean Tours | Sunset Cruise Waikiki - Cash Bar | $49 | **$49.00** | Person Ages 3+: Non-Refundable • All Sales are Final | People Ages 3+: Non-Refundable • All Sales are Final | 1 | 1 | Ages 3+ • This Rate is NON-REFUNDABLE • All Sales are Final |
| `131872` | Kona Shore Divers | Open Water Diver Course Day 1 | $186 | **$185.50** | Certified Dive Buddy | Certified Dive Buddies | 1 | 1 |  |
| `131874` | Kona Shore Divers | Advanced Open Water Day 1 | $186 | **$185.50** | Certified Dive Buddy | Certified Dive Buddies | 1 | 1 |  |
| `176102` | Kona Shore Divers | The Combo | $165 | **$164.95** | Certified Diver | Certified Diver | 1 | 1 | Ages 10+, 3 Hours |
| `266870` | Kona Shore Divers | Open Water Referral Dives Day 1 or 2 | $186 | **$185.50** | Certified Dive Buddy | Certified Dive Buddies | 1 | 1 |  |
| `569816` | Kona Shore Divers | Private Boat Charter | $599 | **$599.00** | Private Boat Charter | Private Boat Charter | 1 | 1 |  |
| `176548` | Aloha Motorsports Kihei | 2024 Polaris Slingshot R | $149 | **$149.00** | Two Hour Quick Trip | Two Hour Quick Trip | 1 | 1 |  |
| `220158` | Aloha Motorsports Kihei | Haleakala Volcano Summit Sunrise or Sunset Adventure Tour - Navigation Guided | $450 | **$450.00** | 24 Hour Rental | 24 Hour Rentals | 1 | 1 | 24 Hours • Ages 21+ |
| `220159` | Aloha Motorsports Kihei | North Loop Coast Slingshot Adventure - Navigation Guided | $350 | **$350.00** | Eight Hour Rental | Eight Hour Rental | 1 | 1 | Ages 21+ |
| `220160` | Aloha Motorsports Kihei | Road to Hana Adventure Tour - Navigation Guided | $450 | **$450.00** | 24 Hour Rental | 24 Hour Rentals | 1 | 1 |  |
| `178383` | Aloha Motorsports Lahaina | Polaris Slingshot R | $149 | **$149.00** | Two Hour Quick Trip | Two Hour Quick Trip | 1 | 1 |  |
| `220144` | Aloha Motorsports Lahaina | Road to Hana Slingshot Adventure Tour - Navigation Guided | $450 | **$450.00** | Slingshot R - Tour 24 Hours | Slingshot R - Tour 24 Hours | 1 | 1 |  |
| `220146` | Aloha Motorsports Lahaina | North Loop Coast Slingshot Adventure - Navigation Guided | $350 | **$350.00** | Slingshot R - Tour 8 Hours | Slingshot R - Tour 8 Hours | 1 | 1 |  |
| `220147` | Aloha Motorsports Lahaina | Haleakala Volcano Summit Sunrise or Sunset Adventure Tour - Navigation Guided | $450 | **$450.00** | Slingshot R - Tour 24 Hours | Slingshot R - Tour 24 Hours | 1 | 1 |  |
| `220155` | Aloha Motorsports Waikiki | Sights and Shopping Tour - Navigation Guided | $350 | **$350.00** | Eight Hour Rental | Eight Hour Rental | 1 | 1 | Ages 21+ |
| `220156` | Aloha Motorsports Waikiki | Cultural Food Tour - Navigation Guided | $450 | **$450.00** | 24 Hour Rental | 24 Hour Rentals | 1 | 1 | 24 Hours • Ages 21+ |
| `468036` | Aloha Motorsports Waikiki | Oahu Top 13 Things to See Slingshot Aloha Tour - Navigation Guided | $450 | **$450.00** | 24 Hour Rental | 24 Hour Rentals | 1 | 1 | 24 Hours • Ages 21+ |
| `468039` | Aloha Motorsports Waikiki | Instagram Influencer Best Photo Spot Tour - Navigation Guided | $450 | **$450.00** | 24 Hour Rental | 24 Hour Rentals | 1 | 1 | 24 Hours • Ages 21+ |
| `220149` | Aloha Motorsports Waikoloa | North Coast Loop Tour - Navigation Guided | $250 | **$250.00** | Four Hour Rental | Four Hour Rental | 1 | 1 | Ages 21+ |
| `220150` | Aloha Motorsports Waikoloa | Waterfall Wonders Slingshot Adventure Tour - Navigation Guided | $350 | **$350.00** | Eight Hour Rental | Eight Hour Rental | 1 | 1 | Ages 21+ |
| `220151` | Aloha Motorsports Waikoloa | Double Valley Slingshot Adventure Tour - Navigation Guided | $250 | **$250.00** | Four Hour Rental | Four Hour Rental | 1 | 1 |  |
| `220152` | Aloha Motorsports Waikoloa | Volcano Slingshot Grand Adventure Tour - Navigation Guided | $450 | **$450.00** | 24 Hour Rental | 24 Hour Rentals | 1 | 1 | 24 Hours • Ages 21+ |
| `90209` | Aloha Scuba Diving Co. | Advanced Open Water Certification | $659 | **$99.00** | Snorkelers & Ride-Alongs | Snorkelers & Ride-Alongs | 1 | 1 | Join the fun as a non-diver |
| `90647` | Aloha Scuba Diving Co. | Gear Rentals | $35 | **$35.00** | Mask/Fin/Snorkel Set | Mask/Fin/Snorkel Set | 1 | 1 |  |
| `222383` | Aloha Scuba Diving Co. | Open Water Certification | $749 | **$499.00** | Open Water Checkout Dives only | Open Water Checkout Dives only | 1 | 1 | PADI referral Form and Course materials required |
| `663537` | Aloha Scuba Diving Co. | Divemaster | $543 | **$1999.00** | Divemaster | Divemasters | 1 | 1 |  |
| `493621` | Experience Aloha Co | Beach Proposal Picnic | $595 | **$100.00** | Additional Guest | Additional Guests | 1 | 1 |  |
| `493649` | Experience Aloha Co | Luxury Celebration Picnic : Three - Twenty Guests | $145 | **$159.00** | Attendee | Attendees | 1 | 1 | Ages 2+ |
| `547236` | Experience Aloha Co | Proposal Photography Session | $795 | **$795.00** | Proposal (Couple) | Proposal (Couple) | 1 | 1 | Price Includes 2 People |
| `560446` | Experience Aloha Co | Luxury Private Chef Experience | $795 | **$195.00** | Additional Guest | Additional Guests | 1 | 1 |  |
| `296378` | Hawaiian Style Tours & Transportation | Luxury Full-Circle Road to Hana Tour - Private Cadillac Escalade | $200 | **$200.00** | Cadillac Escalade Gratuity | Cadillac Escalade Gratuities | 1 | 1 |  |
| `296384` | Hawaiian Style Tours & Transportation | Hike into Heritage: Luxury Rainforest Hike & Waterfall Swim - Private Cadillac Escalade | $200 | **$200.00** | Cadillac Escalade Gratuity | Cadillac Escalade Gratuities | 1 | 1 |  |
| `327395` | Hawaiian Style Tours & Transportation | Luxury Full-Circle Road to Hana Tour - Private Platinum Minibus | $300 | **$300.00** | Platinum Minibus Gratuity | Platinum Minibus Gratuities | 1 | 1 |  |
| `362311` | Hawaiian Style Tours & Transportation | Hike into Heritage: Luxury Rainforest Hike & Waterfall Swim - Private Platinum Minibus | $400 | **$400.00** | Platinum Minibus Gratuity | Platinum Minibus Gratuities | 1 | 1 |  |
| `483351` | Kailani Tours Hawaii | Private Big Island Highlights Volcano Day Tour | $2338 | **$2337.17** | Private Luxury Experience (1-5 ppl) | Private Luxury Experience (1-5 ppl) | 1 | 1 | Up to 5 adults or 4 Adults and 1 Child • All Ages |
| `600939` | Kailani Tours Hawaii | Private Wild and Scenic Hawaii: Waterfalls and Wonders | $2254 | **$2253.40** | Private Luxury Experience (1-5 ppl) | Private Luxury Experience (1-5 ppl) | 1 | 1 | Up to 5 adults or 4 Adults and 1 Child • All Ages |
| `605508` | Kailani Tours Hawaii | Private South Kona Tour | $1500 | **$1499.48** | Private Luxury Experience (1-5 ppl) | Private Luxury Experience (1-5 ppl) | 1 | 1 | Up to 5 adults or 4 Adults and 1 Child • All Ages |
| `659692` | Kailani Tours Hawaii | Private Volcano Shuttle Tour | $1668 | **$1667.02** | Private Luxury Experience (1-5 ppl) | Private Luxury Experience (1-5 ppl) | 1 | 1 | Up to 5 adults or 4 Adults and 1 Child • All Ages |
| `747` | Kohala Divers | Scuba Pool Lesson | $155 | **$155.00** | Scuba Pool Session -Discover Scuba or Refresher | Scuba Pool Session -Discover Scuba or Refreshers | 1 | 1 |  |
| `564357` | Kohala Divers | One Day Rental Custom Fit Snorkel Gear | $15 | **$8.00** | Fins Only | Fins Only | 1 | 1 | not snorkel combo |
| `564395` | Kohala Divers | Two Day Rental Custom Fit Snorkel Gear | $20 | **$10.99** | Purchase: Defog | Purchase: Defog | 1 | 1 | Return Defog container and get $10.99 credit for anything in the store. |
| `564396` | Kohala Divers | Three Day Rental Custom Fit Snorkel Gear | $30 | **$10.99** | Purchase: Defog | Purchase: Defog | 1 | 1 | Return Defog container and get $10.99 credit for anything in the store. |
| `67260` | LeiGreeting.com | Honeymoon Lei Greeting - Honolulu Airport, Oahu | $75 | **$75.00** | Classic Orchid Honeymoon Special (Set of 2) | Classic Orchid Honeymoon Special (Set of 2) | 1 | 1 | Two single strand orchid lei |
| `69116` | LeiGreeting.com | Honeymoon Lei Greeting - Kahului Maui Airport | $95 | **$95.00** | Classic Orchid Honeymoon Special (Set of 2) | Classic Orchid Honeymoon Special (Set of 2) | 1 | 1 | Two single strand orchid lei |
| `69146` | LeiGreeting.com | Honeymoon Lei Greeting - Kona Hawaii Airport | $95 | **$95.00** | Classic Orchid Honeymoon Special (Set of 2) | Classic Orchid Honeymoon Special (Set of 2) | 1 | 1 | Two single strand orchid lei |
| `69177` | LeiGreeting.com | Honeymoon Lei Greeting - Līhuʻe Kaua'i Airport | $95 | **$95.00** | Classic Orchid Honeymoon Special (Set of 2) | Classic Orchid Honeymoon Special (Set of 2) | 1 | 1 | Two single strand orchid lei |
| `632771` | Local Photographer | Maui Professional Photographer Couples and Families | $100 | **$100.00** | Group | Group | 1 | 1 | 1 - 15 People |
| `633065` | Local Photographer | Oahu Professional Photographer Couples and Families | $100 | **$100.00** | Group | Group | 1 | 1 | 1 - 15 People |
| `633066` | Local Photographer | Kauai Professional Photographer Couples and Families | $100 | **$100.00** | Group | Group | 1 | 1 | 1 - 15 People |
| `633067` | Local Photographer | The Big Island Professional Photographer Couples and Families | $100 | **$100.00** | Group | Group | 1 | 1 | 1 - 15 People |
| `8630` | Royal Hawaiian Surf Academy | Group Surf Lesson | $125 | **$115.00** | Group Lesson | Group Lessons | 1 | 1 | Included: Surfboard, long sleeve UV rash guards, reef shoes |
| `8631` | Royal Hawaiian Surf Academy | Private & Semi Private Surf Lesson | $250 | **$150.00** | Exclusive Private Group • 2 Hours | Exclusive Private Group • 2 Hours | 1 | 1 | 2 to 4 students in a private group with a dedicated instructor |
| `8632` | Royal Hawaiian Surf Academy | SUP Lesson | $250 | **$175.00** | Exclusive Private Group • 2 Hours | Exclusive Private Group • 2 Hours | 1 | 2 | 2 to 4 students in a private group with a dedicated instructor |
| `111757` | Royal Hawaiian Surf Academy | Group SUP | $125 | **$115.00** | Group Lesson | Group Lessons | 2 | 2 | Ages 10+ |
| `470` | Surf HNL | Surf Ala Moana | $139 | **$109.00** | Group Adult Lesson | Group Adult Lesson | 1 | 1 | 4 students/Instructor (Appropriate for good swimmers and athletes.) |
| `471` | Surf HNL | Surf Kapolei | $129 | **$149.00** | Group Adult Lesson | Group Adult Lesson | 1 | 1 | 4 students/Instructor (Appropriate for good swimmers and athletes.) |
| `476` | Surf HNL | SUP Ala Moana | $109 | **$99.00** | Group Adult Lesson | Group Adult Lesson | 1 | 1 | 4 students/Instructor (Appropriate for good swimmers and athletes.) |
| `477` | Surf HNL | SUP Pokai Bay | $109 | **$89.00** | Group Adult Lesson | Group Adult Lesson | 1 | 1 | 4 students/Instructor (Appropriate for good swimmers and athletes.) |
| `499095` | 'Gondola Cruises - Hawaii WOW | Daytime Waikiki Gondola Cruise | $78 | **$66.00** | Party of 4 Deal | Party of 4 Deal | 1 | 1 | Limited Time Promo! First 2 people Regular Price, 3rd and 4th people Half Price! |
| `499194` | 'Gondola Cruises - Hawaii WOW | Sunset/Evening Waikiki Gondola Cruise | $98 | **$78.00** | Party of 4 Deal | Party of 4 Deal | 1 | 1 | Limited Time Promo! First 2 people Regular Price, 3rd and 4th people Half Price! |
| `499196` | 'Gondola Cruises - Hawaii WOW | Fireworks Waikiki Gondola Cruise | $432 | **$108.00** | Shared Gondola Ticket | Shared Gondola Tickets | 1 | 1 | Other passengers may join the cruise. Children 2 and under go free! Minimum 2 passengers, if single passenger please call |
| `348460` | Boomkanani Inshore Adventure Company, LLC | Whale Watch and/or Scenic Wildlife Tour | $150 | **$150.00** | Kayaker | Kayakers | 2 | 1 | Ages 8+ • Max weight per kayak is 425lbs |
| `348481` | Boomkanani Inshore Adventure Company, LLC | Pelagic Kayak Fishing Charter | $599 | **$599.00** | Private Fisherman | Private Fishermen | 1 | 1 | Ages 8+ • Initial Price based on 1 fisherman |
| `348483` | Boomkanani Inshore Adventure Company, LLC | Group Bottom Fishing Tour | $275 | **$275.00** | Fisherman | Fishermen | 1 | 1 | Ages 8+ |
| `334326` | Break'N Anger | Rage Room | $70 | **$70.00** | 3-10 People | 3-10 People | 1 | 1 | Price is per person |
| `334341` | Break'N Anger | Splatter Art Studio | $76 | **$69.00** | 3-10 People | 3-10 People | 1 | 1 | Price is per person |
| `334350` | Break'N Anger | Rage & Splatter | $146 | **$132.00** | Regular Combo 3 - 10 people | Regular Combo 3 - 10 people | 1 | 1 | Price is per person |
| `307103` | E Foil | SOLO MID LENGTH eFOIL EXPERIENCE. Up to 4 participants (call if more then 2 participants) | $199 | **$199.00** | Single | Single | 1 | 1 | Price is per Student |
| `307119` | E Foil | SOLO FULL LENGTH eFOIL LESSON. Up to 4 participants (Call if more than 2 participants) | $249 | **$249.00** | Single | Single | 1 | 1 | Price is per Student |
| `307126` | E Foil | GROUP MID LENGTH EFOIL EXPERIENCE. Up to 10 participants (call if more than 4 participants) | $149 | **$149.00** | Group | Group | 2 | 1 | Minimum of 2 participants, $149 per student |
| `214406` | Eco Sea Scooter Snorkeling Academy | Yamaha 350LI Sea Scooter Rentals | $250 | **$79.00** | Seven hour rental | Seven hour rental | 1 | 1 | Divng certificate required! |
| `217646` | Eco Sea Scooter Snorkeling Academy | Eco Rash Guard for Sale | $25 | **$25.00** | Rash Guard | Rash Guards | 1 | 1 |  |
| `218748` | Eco Sea Scooter Snorkeling Academy | Reef and Skin Safe Sunscreen | $25 | **$25.00** | Reef and Skin Safe Sunscreen | Reef and Skin Safe Sunscreen | 1 | 1 |  |
| `990` | Hans Hedemann South Shore (Queen Kapiolani) | SUP Lessons | $100 | **$100.00** | Group Lesson | Group Lessons | 1 | 1 | Minimum of 2 for Stand Up Paddle Lesson |
| `991` | Hans Hedemann South Shore (Queen Kapiolani) | Surf Lessons | $100 | **$100.00** | Group Lesson | Group Lessons | 1 | 1 | Participant must be ages 14 & older and must be able to swim. If children age 13 and below, must book private lesson. |
| `1751` | Hans Hedemann South Shore (Queen Kapiolani) | Surfboard Rental | $35 | **$10.00** | Bodyboard Fins | Bodyboard Fins | 1 | 1 | Rental Is For 24 Hours |
| `13715` | Kona Snorkel Trips | Whale Watch | $109 | **$109.00** | Person: Non-Refundable • All Sales are Final | People: Non-Refundable • All Sales are Final | 1 | 1 | Ages 3+ • This Rate is NON-REFUNDABLE • All Sales are Final |
| `139321` | Kona Snorkel Trips | Kona Snorkeling in Pawai Bay | $99 | **$99.00** | Person: Non-Refundable • All Sales are Final | People: Non-Refundable • All Sales are Final | 1 | 1 | Ages 3+ • This Rate is NON-REFUNDABLE • All Sales are Final |
| `595691` | Kona Snorkel Trips | COMBO: Whale Watch & Manta Ray Night Snorkel | $209 | **$209.00** | Person: Non-Refundable • All Sales are Final | People: Non-Refundable • All Sales are Final | 1 | 1 | Ages 3+ • This Rate is NON-REFUNDABLE • All Sales are Final |
| `95014` | Maui Diamond Sea Sports | Molokini Crater | $219 | **$189.00** | Snorkeler | Snorkeler | 1 | 1 | Age 10+ |
| `341489` | Maui Diamond Sea Sports | 2 Tank Afternoon Charter | $30 | **$169.00** | Snorkeler | Snorkeler | 1 | 1 | Age 10+ |
| `627936` | Maui Diamond Sea Sports | Mala Pier + Pali Dive Adventure | $219 | **$189.00** | Snorkeler | Snorkeler | 1 | 1 | Age 10+ |
| `69333` | Maui Escape Rooms | Ka Puka Bunker @ Whaler's Village | $60 | **$45.00** | Eight or More People | Eight or More People | 2 | 1 | Price per person • Select the number of people ages 7+ in your party |
| `70051` | Maui Escape Rooms | Tesla's Inheritance @ Whaler's Village | $60 | **$55.00** | Four to Five People | Four to Five People | 2 | 1 | Price per person • Select the number of people ages 7+ in your party |
| `70434` | Maui Escape Rooms | Pirate Ship @ Whaler's Village | $60 | **$45.00** | Eight or More People | Eight or More People | 2 | 1 | Price per person • Select the number of people ages 7+ in your party |
| `202793` | Ola ParaDive | 2 Tank Beginner Discovery Scuba Diving - Boat Charter | $199 | **$109.99** | Snorkeler | Snorkeler | 1 | 1 |  |
| `202926` | Ola ParaDive | PADI Advanced Open Water Course - 2 Days | $549 | **$348.88** | Enriched Air Nitrox Course | Enriched Air Nitrox Course | 1 | 1 |  |
| `306452` | Ola ParaDive | Shore Diving For Beginners And/Or Certified Divers | $169 | **$169.99** | Beginner Scuba Diver | Beginner Scuba Diver | 1 | 1 | Ages 10+ |
| `683657` | Pono Photo Maui | Mini Package | $499 | **$499.00** | Mini Package | Mini Packages | 1 | 1 | 30 minute session/6 people |
| `683711` | Pono Photo Maui | Ohana Session | $650 | **$650.00** | Ohana Package | Ohana Packages | 1 | 1 | 60 minute session/8 people |
| `683720` | Pono Photo Maui | Kohola Package | $875 | **$875.00** | Kohola Package | Kohola Packages | 1 | 1 | 90 minute session/6 people |
| `414003` | Prodiver Maui | Molokini Snorkel & Dive - Pro Diver II | $229 | **$99.00** | Passenger | Passengers | 1 | 1 |  |
| `414008` | Prodiver Maui | Guided Beach Dives | $229 | **$159.00** | Diver 1 Tank | Diver 1 Tank | 1 | 1 |  |
| `427752` | Prodiver Maui | Molokini Snorkel & Dive - Kilikina II | $229 | **$99.00** | Passenger | Passengers | 1 | 1 |  |
| `423` | Waikiki Dive Center | Magnificent 2 Tank Shipwreck and/or Reef Boat Dive - Certified Only | $79 | **$89.00** | Optional Snorkeler/Rider | Optional Snorkelers/Riders | 1 | 2 | Age 10+, Optional snorkeling - Free gear rental/Must know how to swim/Not a tour |
| `426` | Waikiki Dive Center | Extremely Fun, 2 Tank Reef Boat Dives \| Certified & Beginners Welcome | $79 | **$79.00** | Rider Package | Riders or Snorkelers | 1 | 3 | Rider/Not a tour, Min 10 years old, One rider per diver - Not suitable for non-swimmer with seasickness |
| `377807` | Waikiki Dive Center | Conservation Diving Tour - Coral Reef Ecology and Monitoring with Certification | $79 | **$79.00** | Optional Snorkeler/Rider | Optional Snorkelers/Riders | 1 | 1 |  |
| `478805` | Aina Explorer LLC | Oahu Private Circle Island Tour | $400 | **$425.00** | Private Tour | Private Tours | 1 | 1 |  |
| `522845` | Aina Explorer LLC | Custom Oahu Private Tour | $425 | **$450.00** | Private Tour | Private Tours | 1 | 1 |  |
| `67694` | Aquatic Life Divers | The Twilight Reef & Kona Manta Ray Experience: Two Tank Charter | $215 | **$195.00** | Snorkeler | Snorkelers | 1 | 2 |  |
| `115578` | Aquatic Life Divers | The Kona Manta Ray Night Experience: One Tank Dive or Snorkel Charter | $155 | **$135.00** | Snorkeler | Snorkelers | 1 | 1 |  |
| `6702` | Big Island Divers | Twilight & Manta Ray Two Tank Dive | $209 | **$139.00** | Snorkeler | Snorkelers | 1 | 2 | 10+ years old |
| `6703` | Big Island Divers | Manta Ray Night Charter | $149 | **$129.00** | Snorkeler | Snorkelers | 1 | 1 | SNORKELER (ages 10+) |
| `104326` | Big Kahuna Water Sports | Advanced Boat Dive | $189 | **$189.00** | Two Tank Certified Dive | Two Tank Certified Dives | 1 | 1 | Certified Divers Only • Age 10+ |
| `109145` | Big Kahuna Water Sports | Certified Boat Dive | $159 | **$159.00** | Two Tank Certified Dive | Two Tank Certified Dives | 1 | 1 | Certified Divers Only • Age 10+ |
| `65099` | Dolphin Divers | Two Tank Wreck and Lava Tube Dive | $229 | **$90.00** | Rider/Passenger | Riders/Passengers | 2 | 1 |  |
| `65112` | Dolphin Divers | Two Tank Lava Tube, Reef and Intro to Scuba Dives | $229 | **$90.00** | Rider/Passenger | Riders/Passengers | 1 | 1 |  |
| `620548` | Emountain Bike Tour Maui llc | The Experience Tour | $260 | **$260.00** | Small Ebike | Small Ebikes | 1 | 1 | Best fits guests 5' to 5'5" tall |
| `647490` | Emountain Bike Tour Maui llc | The Grand Tour | $260 | **$260.00** | Small Ebike | Small Ebikes | 1 | 1 | Best fits guests 5' to 5'5" tall |
| `340194` | H2O Sports Hawaii | Packages | $50 | **$15.00** | UPGRADE - Higher Flyer | UPGRADE - Higher Flyer | 1 | 1 |  |
| `340195` | H2O Sports Hawaii | Parasail | $90 | **$50.00** | Observer | Observer | 1 | 1 |  |
| `503918` | Hawaii Scooters | Wheel chair | $35 | **$35.00** | Wheel chair | Wheel chairs | 1 | 1 |  |
| `503920` | Hawaii Scooters | Single stroller | $35 | **$35.00** | Single stroller | Single strollers | 1 | 1 |  |
| `235838` | Kapalua Ziplines | 6 Line Tour - Most Popular! | $240 | **$240.00** | Guest | Guests | 1 | 1 | 250 lbs. maximum, fully clothed with shoes. Minimum 60 lbs. &4 ft. tall Ages 10+. Ages 10-17 must be accompanied by an Adult. |
| `304505` | Kapalua Ziplines | 4 Line Tour | $198 | **$198.00** | Guest | Guests | 1 | 1 | 250 lbs. maximum, fully clothed with shoes. Minimum 60 lbs. &4 ft. tall Ages 10+. Ages 10-17 must be accompanied by an Adult. |
| `265337` | Kauai Surf School | Private Surf Lessons | $360 | **$275.00** | Private lesson | Private lesson | 1 | 1 | 1 Surfer • Ages 12 and up • Must know how to swim |
| `265338` | Kauai Surf School | Kids Private Surf Lessons | $275 | **$275.00** | Semi-Private lesson | Semi-Private lesson | 1 | 1 | For up to 2 children ages 4-12 years old • Must know how to swim |
| `20969` | Kona Ocean Adventures | Discovery Scuba | $399 | **$265.00** | Ride Along | Ride Along | 1 | 1 |  |
| `238638` | Kona Ocean Adventures | Scuba Instruction: Padi E-learning Code | $275 | **$180.00** | E-learning ReActivate Touch Course | E-learning ReActivate Touch Courses | 1 | 1 |  |
| `60961` | Leis of Hawaii | Wholesale 9 Leis-Gift Pack $540.00 | $495 | **$495.00** | Wholesale 9 Leis-Gift Pack | Wholesale 9 Leis-Gift Packs | 1 | 1 |  |
| `151830` | Leis of Hawaii | Harbor Lei Greeting / Oahu, Honolulu $250.00 | $250 | **$250.00** | Harbor Rates | Harbor Rates | 1 | 1 | (2 to 3) Person / Sonia Orchid |
| `86330` | Maui Goat Yoga | Sunset Maui Goat Yoga with Live Music | $58 | **$58.00** | Kama'aina Rate | Kama'aina Rate | 1 | 1 | Proof of Hi Drivers license required |
| `86331` | Maui Goat Yoga | Maui Goat Yoga with Our Miniature Goats | $48 | **$48.00** | Kama'aina Rate | Kama'aina Rate | 1 | 1 | Proof of Hi Drivers license required |
| `4486` | Maui Sports Unlimited | Paddleboard Class | $165 | **$49.00** | SUP Paddleboard Rental (2 hours) | SUP Paddleboard Rental (2 hours) | 1 | 1 | SUP Paddleboard Rental (2 hours) |
| `4488` | Maui Sports Unlimited | Kiteboarding Courses | $345 | **$49.00** | Kiteboard Rental (2 hours) | Kiteboard Rental (2 hours) | 1 | 1 | *experienced kiters only |
| `36571` | Maui Wave Riders- Kihei | Private & Semi\|Private Stand Up Paddle Boarding Lesson | $150 | **$105.00** | Semi-Private SUP Lesson | Semi-Private SUP Lessons | 1 | 1 | 2 to 6 students per instructor |
| `36578` | Maui Wave Riders- Kihei | Private & Semi\|Private SURF Lesson | $150 | **$105.00** | Semi-Private Surf Lesson | Semi-Private Surf Lessons | 1 | 1 | 2 or more students in closed party/ Price per person |
| `23564` | Mauna Loa Helicopter Tours - Big Island | Private Big Island Experience | $958 | **$639.00** | Groups of 3 | Groups of 3 | 1 | 1 | Per Person Rate |
| `589297` | Mauna Loa Helicopter Tours - Big Island | Kona Coffee & Coastline Adventure | $958 | **$639.00** | Groups of 3 | Groups of 3 | 1 | 1 | Per Person Rate |
| `595342` | Mid-Pacific Tours | Manta Ray Night Snorkel | $155 | **$135.00** | Kama'aina | Kama'aina | 1 | 1 | Valid Hawaii ID Required |
| `596041` | Mid-Pacific Tours | Snorkeling & Marine Animal Excursion | $150 | **$125.00** | Kama'aina | Kama'aina | 1 | 1 | Valid Hawaii ID Required |
| `60850` | North Shore Surf Girls | Private & Semi\|Private Surf Lessons | $149 | **$119.95** | Semi Private 1 Hour Lesson | Semi Private 1 Hour Lessons | 1 | 1 | Price is per person, 2-on-1 Instruction, Ages 2+ |
| `436466` | North Shore Surf Girls | River Turtle Tour and SUP Lesson | $149 | **$79.95** | Group SUP Lesson | Group SUP Lessons | 1 | 1 | Price is per person, 4-on-1 Instruction, Ages 8+ • Minimum 3 to book |
| `631170` | Ohana Ranch | Ohana Ranch ATV Tour | $109 | **$119.00** | Multi Rider ATV (Side-by-Side) | Multi Rider ATV (Side-by-Side) | 1 | 1 | Ages 3+ \| Price is per person \| Seats 4–6 passengers \| One licensed driver required (you may switch drivers) \| 2 person min |
| `637415` | Ohana Ranch | Petting Zoo + Hand Feed & Cuddle Baby Goats Farm Experience | $29 | **$29.00** | Participant | Participants | 1 | 1 | under 2 years old free |
| `418354` | Palehua Trail Rides LLC | Mountain Vista - Sunshine Group Horseback Ride | $138 | **$148.00** | Group Ride | Group Ride | 1 | 1 | Adult/Child (Age 8 & over) |
| `418365` | Palehua Trail Rides LLC | Mountain Vista - Sunset Group Horseback Ride | $158 | **$168.00** | Group Ride | Group Ride | 1 | 1 | Adult/Child (Age 8 & over) |
| `669723` | Puako Dive Adventures | Close Encounters: Manta Edition | $180 | **$150.00** | Snorkeler | Snorkelers | 1 | 1 | Must know how to swim! |
| `669728` | Puako Dive Adventures | Sunrise Explorer: The Reef Awakens | $210 | **$150.00** | Snorkeler | Snorkelers | 1 | 1 | Must know how to swim! |
| `212218` | Saray Sharvit Photography | Ohana Nui - 1 Hour Photoshoot | $545 | **$545.00** | Photography Session | Photography Sessions | 1 | 1 |  |
| `212227` | Saray Sharvit Photography | Hele Hele - 90 Min Photoshoot | $695 | **$695.00** | Photography Session | Photography Sessions | 1 | 1 |  |
| `5651` | Sea & Board Sports Hawaii LLC | Nature & Turtle Tour | $165 | **$140.00** | Group Rate | Group Rate | 1 | 1 | Open Group. Great for making new friends! |
| `40692` | Sea & Board Sports Hawaii LLC | CIRCLE ISLAND JEEP TOUR | $700 | **$299.00** | Private Group Tour \| 3-8 People | Private Group Tour \| 3-8 People | 1 | 1 | Private Group Tour \| 3-8 People |
| `665953` | Ty Gurney Surf School | Surf Lessons | $190 | **$110.00** | Semi-Private 1HR Lesson | Semi-Private 1HR Lessons | 1 | 2 | Price is per person and requires 2 students over the age of 13 with their own instructor |
| `665983` | Ty Gurney Surf School | Standup Paddleboard Lessons | $135 | **$110.00** | Semi-Private 1HR Lesson | Semi-Private 1HR Lessons | 1 | 2 | 2 students per instructor • Select number of students |
| `430526` | <no company field> | Tandem Surf Lesson | $165 | **$165.00** | 1 Hour Lesson | 1 Hour Lessons | 1 | 1 |  |
| `400903` | 808 Goat Yoga Kauai | Group Session | $65 | **$45.00** | Kama'aina | Kama'ainas | 2 | 1 | Must show valid Hawaii state ID during check in. |
| `491549` | Active Oahu Tours | Popoia Island & Kailua Bay Guided Kayak Tour | $145 | **$31.41** | Transportation | Transportation | 1 | 1 | I choose to add an e-bike and trailer for each person to transport the kayaks to the beach (Riders 16+ or 8 and Under) |
| `370554` | Adventures in Paradise Oahu | Circle Island Adventure Tour | $185 | **$160.00** | Person in group of 4-10 | People in group of 4-10 | 2 | 1 | Select the number of people. |
| `621361` | AMS Motorcycle Lahaina | Suzuki Vstrom Adventure 800DE | $159 | **$159.00** | 4 Hour Rental | 4 Hour Rentals | 1 | 1 |  |
| `51780` | AWAPUHI ADVENTURES | Maui Farm Tours | $675 | **$675.00** | Private Excursion | Private Excursion | 1 | 1 |  |
| `366730` | Better Together Photography | Laulima Photo Package | $475 | **$475.00** | Private Photo Session | Private Photo Session | 1 | 1 |  |
| `2866` | Big Kahuna Adventures | Paddleboard Lessons | $175 | **$175.00** | Semi-private SUP Lesson (1.5hrs) | Semi-private SUP Lesson (1.5hrs) | 1 | 1 |  |
| `458342` | Blue Planet Adventure Company | Surf and Beach Rentals | $39 | **$8.00** | 2 Hour Snorkel Set | 2 Hour Snorkel Set | 1 | 1 |  |
| `232` | Botanical World Adventures - Segway Off Road and Zip Isle Zip Line | Hakalau Segway Mala Pua Tour (90 minutes - Rating: EASY to MODERATE) | $197 | **$197.00** | 1.5 Hour Mala Pua Garden | 1.5 Hour Mala Pua Garden | 1 | 1 | Must weigh between 70 and 270 pounds and 14+ years old or Call 888-947-4753 |
| `344852` | Bring Me a Kayak | Wailua Delivery (Secret Falls) | $125 | **$70.00** | Paddle board | Paddle boards | 1 | 1 |  |
| `595694` | DanielsHawaii | Step-On Guide | $450 | **$450.00** | Step On Guide | Step On Guide | 1 | 1 |  |
| `331183` | E Noa Corporation | Trial of Fears | $35 | **$31.00** | General Admission Online - Large Group Rate | General Admissions Online - Large Group Rate | 1 | 1 | Must book a minimum of 20 or more. 10% off per person |
| `411446` | Ehukai Fishing 2 | Fishing Charter | $600 | **$600.00** | 2 Hour Private Charter | 2 Hour Private Charters | 1 | 2 | Up to 6 people |
| `638780` | Glass Experience Maui | Flameworking Glass Experience | $199 | **$199.00** | Turtle | Turtles | 1 | 1 | 1 Hour Flamework Glass Experience • 5 People Max per Workshop |
| `476798` | Go Hawaii Watersports | Parasailing | $80 | **$45.00** | Observer | Observers | 1 | 1 | Adults or Supervised Children from 2 years and up |
| `620878` | Hawaii Forest Farms | Hawaii Forest Farms Tours | $64 | **$48.00** | Aloha Aina Tour Ticket | Aloha Aina Tour Tickets | 1 | 1 | This ticket rate is for bookings of 4-9 visitors at $48 per visitor. |
| `464674` | Hawaii Island & Ocean Tours | Weekly Rental Gear | $70 | **$70.76** | Mask, Snorkel & Fins | Mask, Snorkel & Fins | 1 | 1 |  |
| `389183` | Hawaii Polo Trail Rides | Oceanfront Sunset Private Ride | $436 | **$872.00** | Group of 4 Private Ride | Group of 4 Private Ride | 1 | 2 |  |
| `492438` | Hawaiian Ocean Sports | Umbrella & 2 Beach Chairs | $75 | **$75.00** | Umbrella and 2 Beach Chairs | Umbrella and 2 Beach Chairs | 1 | 1 |  |
| `17239` | Hawaiian Surfing Adventures | SUP Lessons | $175 | **$175.00** | Private Lesson | Private Lessons | 1 | 1 | One on One Instruction |
| `131061` | Hele Wai Tours | Honolua Ridgeline Hike: A Conservation Experience | $125 | **$499.00** | Private Tour Buyout | Private Tour Buyout | 1 | 1 |  |
| `411827` | Hi Surf Club | Private Surf Lessons | $250 | **$250.00** | Private Surf Lesson | Private Lesson For 1 (One Instructor) | 1 | 1 | Private Lesson For 1 Surfer with 1 Instructor |
| `459712` | Honolulu Snorkel Company | Gear Rental with Honolulu Snorkel | $30 | **$1.00** | Gift Voucher | Gift Voucher | 1 | 1 | Must present Voucher upon check-in |
| `454801` | IES Hawai'i | Grand Circle Island Tour | $143 | **$129.00** | Shared Shuttle Island Tour | Shared Shuttle Island Tour | 1 | 1 | Seats up to 14 Passengers • Shared |
| `504158` | Iruka Hawaii | Dolphin Warrior Private Charters | $750 | **$750.00** | One Hour Ash Scattering Ceremony | One Hour Ash Scattering Ceremony | 1 | 1 |  |
| `400707` | Island Style Diving | 2-Tank Molokini Crater and 2nd Site | $249 | **$199.00** | Snorkeler | Snorkelers | 1 | 1 | Ages 2+ |
| `155757` | Kauai Coffee | Farm Tour | $45 | **$40.00** | Kama'aina Child | Kama'aina Children | 1 | 1 | Must present a Hawaii drivers license or ID at check-in |
| `662869` | Kauai Hiking Adventures | KHA Island Survival Skills | $680 | **$680.00** | Private Group | Private Group | 1 | 1 | Price includes 4 people |
| `627189` | Kauai Mobile Recovery LLC | Community Pop-Up Experience | $20 | **$20.00** | Workout Only | Workouts Only | 1 | 1 | Breathwork and Foundation Training. Please bring a yoga mat for workout! |
| `687533` | Kaula Luau | Kaula Luau: Ocean's Edge at Ko Olina | $249 | **$85.00** | Mocktail & Show Only \| Child | Mocktail & Show Only \| Children | 1 | 1 | Ages 4 - 11 years |
| `480429` | Kayaking in Kauai | Double Kayak | $95 | **$10.00** | Trekking Pole | Trekking Poles | 1 | 1 | Comes as a pair of trekking poles |
| `122806` | Keko Adventure Tours | Waimea Canyon Downhill Bike Ride Adventure | $156 | **$166.00** | Biker | Bikers | 1 | 1 | Ages 14+ \| Price per Biker |
| `6981` | Kona Boys | Paddleboard Tours / Lessons | $129 | **$129.00** | Group Lesson | Group Lessons | 2 | 1 |  |
| `471173` | Kona Cloud Forest Sanctuary | Private Cloud Forest Tour - Pantropical Trail (1.5 hr) | $750 | **$750.00** | Private Group Minimum | Private Group Minimum | 1 | 1 | Includes first 10 guests |
| `353682` | Kona Diving Company | 2-tank Manta Ray Night Charter | $190 | **$190.00** | Snorkeler | Snorkelers | 1 | 2 |  |
| `469092` | Kona Sea Salt – The Farm | Deep Ocean Cold Water Mineral Foot Soak | $20 | **$20.00** | Add on: Deep Ocean Water Mineral Foot Soak - 20 Minutes | Add on: Deep Ocean Water Mineral Foot Soak - 20 Minutes | 1 | 1 | Join us for a refreshing Deep Ocean Cold Water Foot Soak in our ocean view Cabana. |
| `552129` | Kona Sea Sports Inc | Private Fishing Charters | $850 | **$850.00** | 4 Hour Fishing Trip | 4 Hour Fishing Trips | 1 | 1 |  |
| `206137` | Liljestrand Foundation | 90-Minute Group Tour | $75 | **$55.00** | Student | Students | 1 | 1 | Ages 10+ \| Must have valid student ID |
| `22700` | Local Pros Maui | Surf Lessons | $220 | **$220.00** | Private one-on-one Lesson | Private one-on-one lesson | 1 | 1 |  |
| `122310` | Maui Eco Tours/South Pacific Kayak/Kelii's Kayaks | SUP Tour Makena Landing | $169 | **$169.00** | SUP Makena Landing 101 - Private | Private SUP Makena Landing | 1 | 1 |  |
| `494924` | Maui Photography Tours | Maui Birding Tour | $720 | **$720.00** | Four Hour Tour | Four Hour Tours | 1 | 1 | Price includes 2 people |
| `316146` | Maui Surf and Soul | Private Surfing Lessons | $278 | **$150.00** | Extra Child | Extra Child | 1 | 1 | Aged 10 or under / Please contact the shop directly for any group larger than 4. |
| `423223` | Maui Surf Clinics | Semi\|Private - 3 Days Clinic | $400 | **$400.00** | Semi Private - 1.5 Hours | Semi Private - 1.5 Hours | 2 | 1 |  |
| `403603` | Na ‘Āina Kai Botanical Gardens | Formal Gardens • Self\|Guided Walking Tour | $25 | **$11.25** | Kama'aina Children | Kama'aina Children | 1 | 1 | Kama'aina children must be booked with an adult who has a valid Hawaii State ID at check in. |
| `178543` | Nalu's Adventure Center | Hokuala Nature Tour | $20 | **$20.00** | Owner | Owner | 1 | 1 | *Owner* |
| `406584` | North Shore Dive Shop | West Side Private Guided Shore Dive Tour | $400 | **$400.00** | Tour for One | Tour for One | 1 | 1 | 1 Participant • Ages 13+ • Dive Certification Required |
| `72430` | North Shore Ohana School of Surfing | Private Kapu Surf Lesson | $225 | **$225.00** | Private 1-on-1 Surf Lesson - 1.5 Hour | Private 1-on-1 Surf Lesson - 1.5 Hour | 1 | 1 |  |
| `354212` | North Shore Stables | Beachfront ATV, Farm Animals & Native Hawaiian Plant Experience | $125 | **$75.00** | ATV Passenger | ATV Passengers | 1 | 1 | 8 years and older |
| `503685` | Ocean Therapy Charters | Scuba Diving Excursion - Wreck and Reef | $179 | **$120.00** | Ride along | Ride along | 1 | 1 |  |
| `414087` | Oeno Winemaking | VIP Winery Tour & Tasting - $129 per couple | $129 | **$129.00** | Couple | Couples | 1 | 1 |  |
| `7571` | Ohana Surf Project | Surf Lessons! | $205 | **$120.00** | Open Group Lesson (2HR) | Open Group Lessons (2HR) | 1 | 1 | Ages 13+ with the ability to swim may join our Open Group lesson (shared experience with other NOVICE students) |
| `580645` | ProArts Playhouse | Magic in Paradise Starring David Kuraya | $37 | **$21.20** | Partially-Obstructed View Seat | Partially-Obstructed View Seats | 1 | 1 |  |
| `676117` | Salty Blue Concierge | Kids Swim Lesson | $308 | **$154.00** | Private | Private | 1 | 1 |  |
| `302046` | Sea Maui Surf | Rental Equipment | $30 | **$15.00** | Boogie Board - Hour Rental | Boogie Board - Hour Rental | 1 | 1 |  |
| `336502` | Seasport Divers | Seasport Divers Rentals | $50 | **$50.00** | Emergency O2 Kit | Emergency O2 Kits | 1 | 1 |  |
| `633027` | SUPDog Hawaii LLC | SUPDog Lessons | $150 | **$150.00** | Private SUPDog Lesson | Private SUPDog Lesson | 1 | 1 | We train you how to SUP with your dog! |
| `319323` | Surf Cycling Hawaii LLC | Water Bike Tour- Makena Bay | $125 | **$99.00** | Kama'aina | Kama'aina | 2 | 1 | Hawaiian Resident • Valid state ID required |
| `304484` | Swell Maui Surf Lessons | Private Surf Lesson | $229 | **$229.00** | Private Lesson | Private Lessons | 1 | 1 | All ages • 1-on-1 instruction |
| `88844` | Take a Hike Oahu | Full Day Custom Adventure (8 hours) | $700 | **$500.00** | Private Small Tour | Private Small Tour | 1 | 1 | Up to 4 people |
| `691165` | The Pele Express | Big Island Volcano & Hilo Highlights Tour | $181 | **$181.00** | Guaranteed You'll Lava It! GROUP TOUR | Guaranteed You'll Lava It! GROUP TOUR | 1 | 1 | Shared tour |
| `552034` | The Valley Alley | Topgolf Swing Suite at The Valley Alley | $47 | **$47.12** | 1 Hour Top Golf Reservation | 1 Hour Top Golf Reservations | 1 | 1 | For 1-8 golfers |
| `601736` | Ultimate Boating Adventures | Nearshore Bottom Fishing and Trolling Trip | $999 | **$799.00** | 4H Near-Shore Fishing | 4H Near-Shore Fishing | 1 | 1 |  |
| `498755` | Waikiki Parasail | Parasail | $75 | **$45.00** | Observer | Observer | 1 | 2 | Adults or Supervised Children from 2 years and up |
| `547218` | Waikiki Sailing Tours | Waikiki Day & Sunset Sail For Couples | $300 | **$300.00** | Private Tour | Private Tours | 1 | 1 | Price for two people |
| `565829` | We Wave Logistics (Jeep Tours) | Private Half-Day HĀNA Maui Open-Air Jeep Tour | $899 | **$899.00** | Private Group | Private Groups | 1 | 1 |  |
| `314433` | Wildlife Hawaii | Round Trip North Shore Haleiwa Shuttle | $70 | **$70.00** | Passenger | Passengers | 1 | 1 | Up to 12 Passengers |
| `247` | X-Treme Parasail & Diamond Head Parasail | Parasail | $105 | **$50.00** | Observer | Observers | 1 | 1 |  |
| `70910` | Yoga Floats | Class Packages | $180 | **$180.00** | Five Class Package | Five Class Packages | 1 | 1 |  |
| `666226` | Yulia Maui Art | After School Art Classes | $168 | **$59.00** | Drop in keiki | Drop in Keiki | 1 | 1 | under 16 yo |

## What shipped from this census

PR `fix(whaw): deactivate 25 no-published-rate rows (s41 near-window census)` sets
`status: "inactive"` + `statusReason: "no-published-rate"` on exactly the 25 DEAD-candidates,
touching no other field and no other row.

**`bookingDead` was deliberately NOT used.** The census tested price availability, not link
liveness: it never called the item endpoint, so it has no evidence about whether the FareHarbor
item resolves. `bookingDead` in this repo is also already overloaded — `4f8b74b` set it for dead
booking links and `dbc1645` set it for 131 "confident non-tour listings" — and stamping it here
would assert a claim the instrument did not test. `statusReason: "dead-item"` is likewise wrong:
that value denotes a `/api/v1/.../items/{pk}/` 404, which was not probed. Every remedy the hub
record names for these rows is `status: inactive` or an operator conversation, and that is what
shipped. **The write is fully reversible** — `status` flips back and both fields are the only
bytes that moved.

**The draw pool does not move.** All 25 were already excluded by `priceConfidence: low`, so the
`app.js:139` pool is 2,379 before and 2,379 after. The change is not a pool change; it is a
provenance change — it moves 25 rows from "excluded for a reason nobody recorded" to "excluded
for a reason stated on the row", so the next census stops re-deriving them.

**Still open after this PR:** 265 rows remain in the conf-low sole-clause population, all of them
now proven to have a purchasable nonzero tier in the near window. That is a unit-ruling backlog,
not a liveness question.
