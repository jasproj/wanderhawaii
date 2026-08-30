# S42 — fixed-instrument re-sweep and base-type rule application (265 conf-low PRICED-held rows)

Recon + this evidence file only. **No `tours-data.json` write, no branch, no commit.**
Tree: `main` @ `4a33740`, clean but for untracked `scripts-staging/` evidence. Untracked scratch.

Supersedes the price readings in `s41-290-census-evidence.md` for this population: that census
did not test whether the availability FareHarbor returned was the availability we asked for.
It was not, on 916 of 4,476 readings.

## 1. The instrument fix

The v2 price-preview endpoint accepts `&date=` but **falls back to next-availability without
signalling it**. The response carries `availability.start_at`; when the item has nothing bookable
on the requested date, FareHarbor answers with a different date's availability and the caller
cannot tell from the price block alone. s41 read `price.*` and never read `availability.start_at`,
so its "245 of 265 rows at one distinct price vector = near-total stability" partly counts one
availability re-read up to fourteen times.

**Fix:** a reading counts only when `availability.start_at[0:10] == requested date`. Everything
else is discarded, not repaired.

| quantity | value |
|---|---|
| rows | 265 |
| dates probed | 17 (14 consecutive 2026-08-23…09-05, plus +30/+60/+90) |
| requests | 2,176 (128 shortname batches x 17) |
| attempts / failures | 2,176 / **0** |
| readings returned | 4,476 |
| readings **valid** (resolved date == requested date) | **3,560** |
| readings discarded as next-availability fallback | **916 (20.5%)** |

Per-row valid-reading distribution:

| valid of 17 | rows |
|---|---|
| 17 | 103 |
| 9–16 | 121 |
| 3–8 | 23 |
| **1–2** | **10** |
| **0** | **8** |

Median 15, min 0, max 17. **18 rows have <3 valid readings and are INSUFFICIENT** — they join the
abstain queue rather than the publish set, regardless of what the rule would have said.

## 2. Traps handled

**Duplicate `customer_type.id` in one response (the `477` shape).** Within a single date's payload,
the same id can appear twice at two prices — pk `477` returns id `1875` "Group Adult Lesson" at both
$89.00 and $99.00, 11 types for 7 distinct ids. Handling: identical id+price is deduped; id with
conflicting prices makes the reading self-contradictory and the row abstains. `477` and `478805`
carry the shape; `477` reached INSUFFICIENT first (0/17 valid — every probe fell back, worst case
441 days).

**$0 variant products (the `427010` shape).** Product identity is the tuple
`(customer_type.id, singular, note, min_party_size)` — **never the label alone**. `510966` alternates
"Private SUV"/*4 Hour* $658.74 with "Private SUV"/*6 Hour* $813.73 across the window; `427010`
alternates 8-Hour $1,212.30 with 10-Hour **$0.00**. Keying on the label would let the zero-filter
slide the surviving price onto a different product. Keyed on the tuple, the $0 variant is its own
unpublished product and is dropped as itself. All three rows are in the adjudicated human-eyes queue
regardless.

## 3. Rule as adopted (2026-08-22), with the step-5 prose branch

1. Drop products with no nonzero price across **valid** readings.
2. Drop never-a-fare labels: `gratuity|tip|voucher|gift card|wholesale|agent|buy rate|owner|staff|complimentary|upgrade|transportation|^add on:|^purchase:`.
3. Drop non-participant: `rider|observer|ride-along|passenger|dive buddy|additional guest|spectator|companion` — unless nothing survives.
4. Drop age/eligibility-gated: `child|children|keiki|youth|infant|toddler|kama'aina|resident|student|military|senior|veteran` — unless the **item name** carries the same gate.
5. Drop `min_party_size > 1` **or** a party condition in the label prose (`group of N`, `N-M people`, `party of N`, `N or more`, `group rate`) — unless nothing survives.
6. Base = lowest-priced survivor.
7. Abstain if zero survivors, or if base < 50% of the dearest survivor.

`unit` is derived from the winning tier's label and note, not assumed: `whole-unit` on a vehicle/
boat/room/party/set token or a note reading "price includes N"/"up to N"; `per-person` on a person-
noun label or a "per person"/"ages N" note; `per-item/duration` on an object-plus-duration label;
`other` when neither fires.

## 4. Rollup

| outcome | rows |
|---|---|
| **PUBLISH** | **173** |
| ABSTAIN | 74 |
| INSUFFICIENT | 18 |
| total | 265 |

Which step decided each PUBLISH row:

| step | rows |
|---|---|
| step6 lowest survivor (no exclusion moved it) | 133 |
| step3 non-participant | 21 |
| step4 age/eligibility gate | 9 |
| step2 never-a-fare | 6 |
| step5 party condition | 4 |

Abstain reasons:

| reason | rows |
|---|---|
| step7 spread guard | 52 |
| adjudicated human-eyes | 22 |

Unit mix on PUBLISH rows:

| unit | rows |
|---|---|
| per-person | 71 |
| whole-unit | 52 |
| other | 44 |
| per-item/duration | 6 |

## 5. Stored price vs adjudicated live base — PUBLISH rows only

| comparison | rows |
|---|---|
| exact match to the cent | 104 |
| within $1 (stored rounded) | 12 |
| **mismatch** | **57** |

Live wins in all 57. Of those, **23 live higher** and **34 live lower**; 11 differ by more than 2x.

| Δ | direction | pk | operator | name | stored | live base |
|---|---|---|---|---|---|---|
| $3641.75 | live higher | `131872` | Kona Shore Divers | Open Water Diver Course Day 1 | $186 | **$3827.75** |
| $2699.99 | live higher | `327395` | Hawaiian Style Tours & Transportation | Luxury Full-Circle Road to Hana Tour - Private Platinum Minibus | $300 | **$2999.99** |
| $1799.99 | live higher | `296378` | Hawaiian Style Tours & Transportation | Luxury Full-Circle Road to Hana Tour - Private Cadillac Escalade | $200 | **$1999.99** |
| $1799.99 | live higher | `296384` | Hawaiian Style Tours & Transportation | Hike into Heritage: Luxury Rainforest Hike & Waterfall Swim - Private Cadillac Escalade | $200 | **$1999.99** |
| $1456.00 | live higher | `663537` | Aloha Scuba Diving Co. | Divemaster | $543 | **$1999.00** |
| $350.00 | live lower | `40692` | Sea & Board Sports Hawaii LLC | CIRCLE ISLAND JEEP TOUR | $700 | **$350.00** |
| $331.30 | live higher | `640693` | Big Island Backroad Adventures LLC | Big Island Birdwatching | $881 | **$1212.30** |
| $213.50 | live higher | `266870` | Kona Shore Divers | Open Water Referral Dives Day 1 or 2 | $186 | **$399.50** |
| $200.00 | live lower | `601736` | Ultimate Boating Adventures | Nearshore Bottom Fishing and Trolling Trip | $999 | **$799.00** |
| $175.00 | live higher | `5284` | Action Sports Maui | Kiting for Kids | $20 | **$195.00** |
| $159.50 | live higher | `131874` | Kona Shore Divers | Advanced Open Water Day 1 | $186 | **$345.50** |
| $154.00 | live lower | `676117` | Salty Blue Concierge | Kids Swim Lesson | $308 | **$154.00** |
| $150.00 | live lower | `663614` | Hilo Ocean Adventures | Near Shore Fishing Charter | $599 | **$449.00** |
| $120.00 | live lower | `212164` | Dive Oahu | Introductory Diving | $251 | **$131.00** |
| $110.00 | live higher | `340194` | H2O Sports Hawaii | Packages | $50 | **$160.00** |
| $100.00 | live lower | `8631` | Royal Hawaiian Surf Academy | Private & Semi Private Surf Lesson | $250 | **$150.00** |
| $100.00 | live lower | `8984` | Dive Oahu | Shallow Reefs Tour | $231 | **$131.00** |
| $100.00 | live higher | `423` | Waikiki Dive Center | Magnificent 2 Tank Shipwreck and/or Reef Boat Dive - Certified Only | $79 | **$179.00** |
| $100.00 | live higher | `426` | Waikiki Dive Center | Extremely Fun, 2 Tank Reef Boat Dives \| Certified & Beginners Welcome | $79 | **$179.00** |
| $95.00 | live lower | `238638` | Kona Ocean Adventures | Scuba Instruction: Padi E-learning Code | $275 | **$180.00** |
| $89.01 | live lower | `202793` | Ola ParaDive | 2 Tank Beginner Discovery Scuba Diving - Boat Charter | $199 | **$109.99** |
| $85.00 | live lower | `265337` | Kauai Surf School | Private Surf Lessons | $360 | **$275.00** |
| $75.00 | live lower | `655224` | Dive Oahu | Wai'anae - Two Shallows Reef Tour | $206 | **$131.00** |
| $69.05 | live lower | `436466` | North Shore Surf Girls | River Turtle Tour and SUP Lesson | $149 | **$79.95** |
| $55.00 | live lower | `344852` | Bring Me a Kayak | Wailua Delivery (Secret Falls) | $125 | **$70.00** |
| $54.00 | live lower | `503685` | Ocean Therapy Charters | Scuba Diving Excursion - Wreck and Reef | $179 | **$125.00** |
| $50.00 | live lower | `5281` | Action Sports Maui | Kiteboarding Lessons | $350 | **$300.00** |
| $50.00 | live higher | `560446` | Experience Aloha Co | Luxury Private Chef Experience | $795 | **$845.00** |
| $50.00 | live higher | `493621` | Experience Aloha Co | Beach Proposal Picnic | $595 | **$645.00** |
| $49.00 | live lower | `316146` | Maui Surf and Soul | Private Surfing Lessons | $278 | **$229.00** |
| $45.00 | live lower | `36571` | Maui Wave Riders- Kihei | Private & Semi\|Private Stand Up Paddle Boarding Lesson | $150 | **$105.00** |
| $45.00 | live lower | `36578` | Maui Wave Riders- Kihei | Private & Semi\|Private SURF Lesson | $150 | **$105.00** |
| $40.00 | live higher | `670586` | Wai Kai | Wai Kai Lagoon Adventure | $20 | **$60.00** |
| $30.00 | live lower | `95014` | Maui Diamond Sea Sports | Molokini Crater | $219 | **$189.00** |
| $30.00 | live lower | `284519` | Living Ocean Tours | Turtle Canyons Snorkel Excursion | $109 | **$79.00** |
| $30.00 | live lower | `470` | Surf HNL | Surf Ala Moana | $139 | **$109.00** |
| $30.00 | live lower | `340195` | H2O Sports Hawaii | Parasail | $90 | **$60.00** |
| $29.05 | live lower | `60850` | North Shore Surf Girls | Private & Semi\|Private Surf Lessons | $149 | **$119.95** |
| $25.00 | live lower | `665983` | Ty Gurney Surf School | Standup Paddleboard Lessons | $135 | **$110.00** |
| $25.00 | live higher | `655372` | Dive Oahu | Wai'anae Natural Reef & Wreck | $206 | **$231.00** |
| $25.00 | live lower | `370554` | Adventures in Paradise Oahu | Circle Island Adventure Tour | $185 | **$160.00** |
| $25.00 | live higher | `478805` | Aina Explorer LLC | Oahu Private Circle Island Tour | $400 | **$425.00** |
| $25.00 | live higher | `522845` | Aina Explorer LLC | Custom Oahu Private Tour | $425 | **$450.00** |
| $20.00 | live lower | `494462` | Living Ocean Tours | Deluxe Snorkel and Wildlife Cruise | $99 | **$79.00** |
| $15.00 | live lower | `70434` | Maui Escape Rooms | Pirate Ship @ Whaler's Village | $60 | **$45.00** |
| $15.00 | live lower | `69333` | Maui Escape Rooms | Ka Puka Bunker @ Whaler's Village | $60 | **$45.00** |
| $14.00 | live higher | `86331` | Maui Goat Yoga | Maui Goat Yoga with Our Miniature Goats | $48 | **$62.00** |
| $14.00 | live lower | `334350` | Break'N Anger | Rage & Splatter | $146 | **$132.00** |
| $14.00 | live lower | `454801` | IES Hawai'i | Grand Circle Island Tour | $143 | **$129.00** |
| $14.00 | live higher | `493649` | Experience Aloha Co | Luxury Celebration Picnic : Three - Twenty Guests | $145 | **$159.00** |
| $10.00 | live higher | `122806` | Keko Adventure Tours | Waimea Canyon Downhill Bike Ride Adventure | $156 | **$166.00** |
| $10.00 | live higher | `178543` | Nalu's Adventure Center | Hokuala Nature Tour | $20 | **$30.00** |
| $10.00 | live lower | `8630` | Royal Hawaiian Surf Academy | Group Surf Lesson | $125 | **$115.00** |
| $10.00 | live lower | `476` | Surf HNL | SUP Ala Moana | $109 | **$99.00** |
| $7.00 | live lower | `334341` | Break'N Anger | Splatter Art Studio | $76 | **$69.00** |
| $5.00 | live higher | `155757` | Kauai Coffee | Farm Tour | $45 | **$50.00** |
| $5.00 | live lower | `70051` | Maui Escape Rooms | Tesla's Inheritance @ Whaler's Village | $60 | **$55.00** |

## 6. Full table, all 265 rows

`valid` = valid readings of 17. `base` = adjudicated base tier. Price is the minimum nonzero across
valid readings for the winning product.

| pk | name | base tier label | base price | unit | decided by | outcome |
|---|---|---|---|---|---|---|
| `430526` | Tandem Surf Lesson | 1 Hour Lesson | $165.00 | per-item/duration | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `400903` | Group Session | Person | $65.00 | per-person | step4 age/eligibility gate | **PUBLISH** |
| `5281` | Kiteboarding Lessons | Kiteboard - Shared/Group (2.5 hours) | $300.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `5278` | Multi Day Surf Course | Surf Group 3-day (6 hours) | $270.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `5279` | Stand-Up-Paddle Lesson | SUP Semi-Private (1.5 hours) | $165.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `5292` | Kids Surf Camp | Surf Kids Camp 3-Days (6 hours) | $295.00 | per-person | step4 age/eligibility gate | **PUBLISH** |
| `5288` | Windsurf Advanced Classes | Windsurf Advanced Private (2 hours) | $325.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `5284` | Kiting for Kids | Kiteboarding for Kids Private (2hrs) | $195.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `256725` | Private Wingsurfing Lesson on Maui | Wing-surf Private Lesson 2hrs | $345.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `491549` | Popoia Island & Kailua Bay Guided Kayak Tour | Visitor | $145.00 | per-person | step2 never-a-fare | **PUBLISH** |
| `370554` | Circle Island Adventure Tour | Person in group of 4-10 | $160.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `478805` | Oahu Private Circle Island Tour | Private Tour | $425.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `522845` | Custom Oahu Private Tour | Private Tour | $450.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `220158` | Haleakala Volcano Summit Sunrise or Sunset Adventure T | 24 Hour Rental | $450.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `220159` | North Loop Coast Slingshot Adventure - Navigation Guid | Eight Hour Rental | $350.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `220160` | Road to Hana Adventure Tour - Navigation Guided | 24 Hour Rental | $450.00 | per-item/duration | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `220144` | Road to Hana Slingshot Adventure Tour - Navigation Gui | Slingshot R  - Tour 24 Hours | $450.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `220146` | North Loop Coast Slingshot Adventure - Navigation Guid | Slingshot R  - Tour 8 Hours | $350.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `220147` | Haleakala Volcano Summit Sunrise or Sunset Adventure T | Slingshot R  - Tour 24 Hours | $450.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `220155` | Sights and Shopping Tour - Navigation Guided | Eight Hour Rental | $350.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `220156` | Cultural Food Tour - Navigation Guided | 24 Hour Rental | $450.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `468036` | Oahu Top 13 Things to See Slingshot Aloha Tour - Navig | 24 Hour Rental | $450.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `468039` | Instagram Influencer Best Photo Spot Tour - Navigation | 24 Hour Rental | $450.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `220149` | North Coast Loop Tour - Navigation Guided | Four Hour Rental | $250.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `220150` | Waterfall Wonders Slingshot Adventure Tour - Navigatio | Eight Hour Rental | $350.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `220151` | Double Valley Slingshot Adventure Tour - Navigation Gu | Four Hour Rental | $250.00 | per-item/duration | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `220152` | Volcano Slingshot Grand Adventure Tour - Navigation Gu | 24 Hour Rental | $450.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `663537` | Divemaster | Divemaster | $1999.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `90647` | Gear Rentals | Mask/Fin/Snorkel Set | $35.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `51780` | Maui Farm Tours | Private Excursion | $675.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `366730` | Laulima Photo Package | Private Photo Session | $475.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `346502` | The Ultimate Waterfall Experience | Private SUV | $990.87 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `505941` | Hilo Cruise Ship Guest Special - Water and Fire | Private SUV | $880.16 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `509403` | Hilo Cruise Ship Guest Special - Botanical Gardens, Wa | Private SUV | $896.77 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `502798` | Meet you at Kilauea Volcano! | Private SUV | $824.80 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `640693` | Big Island Birdwatching | Private SUV | $1212.30 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `2866` | Paddleboard Lessons | Semi-private SUP Lesson (1.5hrs) | $175.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `104326` | Advanced Boat Dive | Two Tank Certified Dive | $189.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `109145` | Certified Boat Dive | Two Tank Certified Dive | $159.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `348481` | Pelagic Kayak Fishing Charter | Private Fisherman | $599.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `348460` | Whale Watch and/or Scenic Wildlife Tour | Kayaker | $150.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `348483` | Group Bottom Fishing Tour | Fisherman | $275.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `232` | Hakalau Segway Mala Pua Tour (90 minutes - Rating: EAS | 1.5 Hour Mala Pua Garden | $197.00 | per-item/duration | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `334350` | Rage & Splatter | Regular Combo 3 - 10 people | $132.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `334341` | Splatter Art Studio | 3-10 People | $69.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `334326` | Rage Room | 3-10 People | $70.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `344852` | Wailua Delivery (Secret Falls) | Paddle board | $70.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `595694` | Step-On Guide | Step On Guide | $450.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `9120` | Wreck & Reef Tour | Certified Diver | $231.00 | per-person | step3 non-participant | **PUBLISH** |
| `8984` | Shallow Reefs Tour | Snorkeler | $131.00 | per-person | step3 non-participant | **PUBLISH** |
| `3108` | Night Dives | Certified Diver | $231.00 | per-person | step3 non-participant | **PUBLISH** |
| `655224` | Wai'anae - Two Shallows Reef Tour | Snorkeler | $131.00 | per-person | step3 non-participant | **PUBLISH** |
| `212159` | Turtle Canyon Adventure | Snorkeler | $131.00 | per-person | step3 non-participant | **PUBLISH** |
| `655372` | Wai'anae Natural Reef & Wreck | Certified Diver | $231.00 | per-person | step3 non-participant | **PUBLISH** |
| `212164` | Introductory Diving | Snorkeler | $131.00 | per-person | step3 non-participant | **PUBLISH** |
| `65099` | Two Tank Wreck and Lava Tube Dive | Certified Diver | $229.00 | per-person | step3 non-participant | **PUBLISH** |
| `307119` | SOLO FULL LENGTH eFOIL LESSON. Up to 4 participants (C | Single | $249.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `307126` | GROUP MID LENGTH EFOIL EXPERIENCE. Up to 10 participan | Group | $149.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `307103` | SOLO MID LENGTH eFOIL EXPERIENCE. Up to 4 participants | Single | $199.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `217646` | Eco Rash Guard for Sale | Rash Guard | $25.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `218748` | Reef and Skin Safe Sunscreen | Reef and Skin Safe Sunscreen | $25.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `620548` | The Experience Tour | Small Ebike | $260.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `647490` | The Grand Tour | Small Ebike | $260.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `547236` | Proposal Photography Session | Proposal (Couple) | $795.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `560446` | Luxury Private Chef Experience | Couple | $845.00 | whole-unit | step3 non-participant | **PUBLISH** |
| `493649` | Luxury Celebration Picnic : Three - Twenty Guests | Attendee | $159.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `493621` | Beach Proposal Picnic | Couple | $645.00 | whole-unit | step3 non-participant | **PUBLISH** |
| `638780` | Flameworking Glass Experience | Turtle | $199.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `476798` | Parasailing | Parasailing Experience (600ft) | $80.00 | other | step3 non-participant | **PUBLISH** |
| `340194` | Packages | 600' Parasail + Tandem Jet Ski | $160.00 | other | step2 never-a-fare | **PUBLISH** |
| `340195` | Parasail | ADD Bumper Tube | $60.00 | other | step3 non-participant | **PUBLISH** |
| `990` | SUP Lessons | Group Lesson | $100.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `464674` | Weekly Rental Gear | Mask, Snorkel & Fins | $70.76 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `503920` | Single stroller | Single stroller | $35.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `503918` | Wheel chair | Wheel chair | $35.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `492438` | Umbrella & 2 Beach Chairs | Umbrella and 2 Beach Chairs | $75.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `296378` | Luxury Full-Circle Road to Hana Tour - Private Cadilla | Luxury Cadillac Escalade | $1999.99 | whole-unit | step2 never-a-fare | **PUBLISH** |
| `327395` | Luxury Full-Circle Road to Hana Tour - Private Platinu | Platinum Edition Minibus | $2999.99 | whole-unit | step2 never-a-fare | **PUBLISH** |
| `296384` | Hike into Heritage: Luxury Rainforest Hike & Waterfall | Luxury Cadillac Escalade | $1999.99 | whole-unit | step2 never-a-fare | **PUBLISH** |
| `17239` | SUP Lessons | Private Lesson | $175.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `411827` | Private Surf Lessons | Private Surf Lesson | $250.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `663614` | Near Shore Fishing Charter | 3 Hour Fishing Charter | $449.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `491348` | Padi Re-Activate Course | Padi Re-Activate Refresher | $325.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `454801` | Grand Circle Island Tour | Shared Shuttle Island Tour | $129.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `600939` | Private Wild and Scenic Hawaii: Waterfalls and Wonders | Private Luxury Experience (1-5 ppl) | $2253.40 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `483351` | Private Big Island Highlights Volcano Day Tour | Private Luxury Experience (1-5 ppl) | $2337.17 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `659692` | Private Volcano Shuttle Tour | Private Luxury Experience (1-5 ppl) | $1667.02 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `235838` | 6 Line Tour - Most Popular! | Guest | $240.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `304505` | 4 Line Tour | Guest | $198.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `155757` | Farm Tour | Adult | $50.00 | per-person | step4 age/eligibility gate | **PUBLISH** |
| `662869` | KHA Island Survival Skills | Private Group | $680.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `265338` | Kids Private Surf Lessons | Semi-Private lesson | $275.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `265337` | Private Surf Lessons | Private lesson | $275.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `122806` | Waimea Canyon Downhill Bike Ride Adventure | Biker | $166.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `6981` | Paddleboard Tours / Lessons | Group Lesson | $129.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `20969` | Discovery Scuba | Discover Scuba | $399.00 | other | step3 non-participant | **PUBLISH** |
| `238638` | Scuba Instruction: Padi E-learning Code | E-learning ReActivate Touch Course | $180.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `469092` | Deep Ocean Cold Water Mineral Foot Soak | Add on: Deep Ocean Water Mineral Foot Soak - 20 Minutes | $20.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `266870` | Open Water Referral Dives Day 1 or 2 | Referal Student | $399.50 | per-person | step3 non-participant | **PUBLISH** |
| `131872` | Open Water Diver Course Day 1 | Non-Certified Diver | $3827.75 | per-person | step3 non-participant | **PUBLISH** |
| `131874` | Advanced Open Water Day 1 | Non-Certified Diver | $345.50 | per-person | step3 non-participant | **PUBLISH** |
| `569816` | Private Boat Charter | Private Boat Charter | $599.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `139321` | Kona Snorkeling in Pawai Bay | Person:  Non-Refundable • All Sales are Final | $99.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `67260` | Honeymoon Lei Greeting - Honolulu Airport, Oahu | Classic Orchid Honeymoon Special (Set of 2) | $75.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `69116` | Honeymoon Lei Greeting - Kahului Maui Airport | Classic Orchid Honeymoon Special (Set of 2) | $95.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `69146` | Honeymoon Lei Greeting - Kona Hawaii Airport | Classic Orchid Honeymoon Special (Set of 2) | $95.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `69177` | Honeymoon Lei Greeting - Līhuʻe Kaua'i Airport | Classic Orchid Honeymoon Special (Set of 2) | $95.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `151830` | Harbor Lei Greeting / Oahu, Honolulu $250.00 | Harbor Rates | $250.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `60961` | Wholesale 9 Leis-Gift Pack $540.00 | Wholesale 9 Leis-Gift Pack | $495.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `206137` | 90-Minute Group Tour | Person | $75.00 | per-person | step4 age/eligibility gate | **PUBLISH** |
| `284519` | Turtle Canyons Snorkel Excursion | Person Ages 3+:  Non-Refundable • All Sales are Final | $79.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `323935` | Waikiki Sunset Cruise BYOB | Person Ages 3+:  Non-Refundable • All Sales are Final | $59.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `494462` | Deluxe Snorkel and Wildlife Cruise | Person Ages 3+:  Non-Refundable • All Sales are Final | $79.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `616406` | Sunset Cruise Waikiki - Cash Bar | Person Ages 3+:  Non-Refundable • All Sales are Final | $49.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `633066` | Kauai Professional Photographer Couples and Families | Group | $100.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `632771` | Maui Professional Photographer Couples and Families | Group | $100.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `633065` | Oahu Professional Photographer Couples and Families | Group | $100.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `633067` | The Big Island Professional Photographer Couples and F | Group | $100.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `22700` | Surf Lessons | Private one-on-one Lesson | $220.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `95014` | Molokini Crater | Snorkeler | $189.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `122310` | SUP Tour Makena Landing | SUP Makena Landing 101 - Private | $169.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `70051` | Tesla's Inheritance @ Whaler's Village | Four to Five People | $55.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `70434` | Pirate Ship @ Whaler's Village | Eight or More People | $45.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `69333` | Ka Puka Bunker @ Whaler's Village | Eight or More People | $45.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `86331` | Maui Goat Yoga with Our Miniature Goats | Person | $62.00 | per-person | step4 age/eligibility gate | **PUBLISH** |
| `494924` | Maui Birding Tour | Four Hour Tour | $720.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `316146` | Private Surfing Lessons | Private Lesson | $229.00 | other | step4 age/eligibility gate | **PUBLISH** |
| `423223` | Semi\|Private - 3 Days Clinic | Semi Private - 1.5 Hours | $400.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `36571` | Private & Semi\|Private Stand Up Paddle Boarding Lesson | Semi-Private SUP Lesson | $105.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `36578` | Private & Semi\|Private SURF Lesson | Semi-Private Surf Lesson | $105.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `23564` | Private Big Island Experience | 2 People | $958.50 | per-person | step5 party condition | **PUBLISH** |
| `589297` | Kona Coffee & Coastline Adventure | 2 People | $958.50 | per-person | step5 party condition | **PUBLISH** |
| `403603` | Formal Gardens • Self\|Guided Walking Tour | Guest | $25.00 | per-person | step4 age/eligibility gate | **PUBLISH** |
| `178543` | Hokuala Nature Tour | Leisure Guests | $30.00 | per-person | step2 never-a-fare | **PUBLISH** |
| `72430` | Private Kapu Surf Lesson | Private 1-on-1 Surf Lesson - 1.5 Hour | $225.00 | per-item/duration | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `354212` | Beachfront ATV, Farm Animals & Native Hawaiian Plant E | Large ATV Driver | $125.00 | other | step3 non-participant | **PUBLISH** |
| `60850` | Private & Semi\|Private Surf Lessons | Semi Private 1 Hour Lesson | $119.95 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `436466` | River Turtle Tour and SUP Lesson | Group SUP Lesson | $79.95 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `503685` | Scuba Diving Excursion - Wreck and Reef | Snorkeler | $125.00 | per-person | step3 non-participant | **PUBLISH** |
| `414087` | VIP Winery Tour & Tasting - $129 per couple | Couple | $129.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `637415` | Petting Zoo + Hand Feed & Cuddle Baby Goats Farm Exper | Participant | $29.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `202793` | 2 Tank Beginner Discovery Scuba Diving - Boat Charter | Snorkeler | $109.99 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `306452` | Shore Diving For Beginners And/Or Certified Divers | Beginner Scuba Diver | $169.99 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `418365` | Mountain Vista - Sunset Group Horseback Ride | Group Ride | $158.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `418354` | Mountain Vista - Sunshine Group Horseback Ride | Group Ride | $138.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `683657` | Mini Package | Mini Package | $499.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `683711` | Ohana Session | Ohana Package | $650.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `683720` | Kohola Package | Kohola Package | $875.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `8630` | Group Surf Lesson | Group Lesson | $115.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `8631` | Private & Semi Private Surf Lesson | Exclusive Private Group • 2 Hours | $150.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `676117` | Kids Swim Lesson | Private | $154.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `212218` | Ohana Nui - 1 Hour Photoshoot | Photography Session | $545.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `212227` | Hele Hele - 90 Min Photoshoot | Photography Session | $695.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `40692` | CIRCLE ISLAND JEEP TOUR | Private Group Tour \| 2 People | $350.00 | whole-unit | step5 party condition | **PUBLISH** |
| `5651` | Nature & Turtle Tour | Private Group \| 3 People or More | $165.00 | whole-unit | step5 party condition | **PUBLISH** |
| `319323` | Water Bike Tour- Makena Bay | Person | $125.00 | per-person | step4 age/eligibility gate | **PUBLISH** |
| `470` | Surf Ala Moana | Group Adult Lesson | $109.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `476` | SUP Ala Moana | Group Adult Lesson | $99.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `304484` | Private Surf Lesson | Private Lesson | $229.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `552034` | Topgolf Swing Suite at The Valley Alley | 1 Hour Top Golf Reservation | $47.12 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `665983` | Standup Paddleboard Lessons | Semi-Private 1HR Lesson | $110.00 | per-item/duration | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `601736` | Nearshore Bottom Fishing and Trolling Trip | 4H Near-Shore Fishing | $799.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `559007` | Waterfront Cabanas | Waterfront Cabana | $150.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `670586` | Wai Kai Lagoon Adventure | AquaVenture & AquaPeakz (Half Day) | $60.00 | per-person | step4 age/eligibility gate | **PUBLISH** |
| `542637` | Waterfont Tent Rental | Waterfront Tent | $250.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `506683` | Nalo Kai Club Lounge | Nalo Kai Day Pass | $25.00 | per-person | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `508775` | Shuttle - Round Trip Waikiki | Shuttle Transportation | $35.00 | other | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `423` | Magnificent 2 Tank Shipwreck and/or Reef Boat Dive - C | Advanced Certified Diver | $179.00 | per-person | step3 non-participant | **PUBLISH** |
| `426` | Extremely Fun, 2 Tank Reef Boat Dives \| Certified & Be | Certified Diver | $179.00 | per-person | step3 non-participant | **PUBLISH** |
| `498755` | Parasail | Parasailing Experience (600ft) | $75.00 | other | step3 non-participant | **PUBLISH** |
| `565829` | Private Half-Day HĀNA Maui Open-Air Jeep Tour | Private Group | $899.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `314433` | Round Trip North Shore Haleiwa Shuttle | Passenger | $70.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `70910` | Class Packages | Five Class Package | $180.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | **PUBLISH** |
| `499095` | Daytime Waikiki Gondola Cruise | Shared Gondola Ticket | $78.00 | whole-unit | step5 party condition | ABSTAIN(step7 spread) |
| `499194` | Sunset/Evening Waikiki Gondola Cruise | Shared Gondola Ticket | $98.00 | whole-unit | step5 party condition | ABSTAIN(step7 spread) |
| `5274` | Surfing Lessons | Surf Beginner Group (2 hours) | $95.00 | other | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `89895` | Kitefoilboarding Lessons | Kitefoilboarding Private (2 hours) | $295.00 | other | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `5282` | Kiteboarding Multi-Day Course | Kiteboard Private 3-Day (9 hours) | $1125.00 | other | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `5287` | Windsurf Multi-Day Courses | Windsurf Group 3-Day (6 hours) | $550.00 | other | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `176548` | 2024 Polaris Slingshot R | Two Hour Quick Trip | $149.00 | other | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `178383` | Polaris Slingshot R | Two Hour Quick Trip | $149.00 | other | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `90209` | Advanced Open Water Certification | Snorkelers & Ride-Alongs | $99.00 | other | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `222383` | Open Water Certification | Open Water Checkout Dives only | $499.00 | other | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `621361` | Suzuki Vstrom Adventure 800DE | 4 Hour Rental | $159.00 | per-item/duration | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `115578` | The Kona Manta Ray Night Experience: One Tank Dive or  | — | — | - | pre-rule (2026-08-22 adjudication) | ABSTAIN(human-eyes: snorkeler-on-dive-charter) |
| `67694` | The Twilight Reef & Kona Manta Ray Experience: Two Tan | — | — | - | pre-rule (2026-08-22 adjudication) | ABSTAIN(human-eyes: snorkeler-on-dive-charter) |
| `346901` | Volcanoes, Lava Tubes & Black Sand Beaches Adventures | — | — | - | pre-rule (2026-08-22 adjudication) | ABSTAIN(human-eyes: same-label-different-product-by-date) |
| `427010` | Water and Fire | — | — | - | pre-rule (2026-08-22 adjudication) | ABSTAIN(human-eyes: same-label-different-product-by-date) |
| `510966` | Kona Cruise Ship Guest Special - Kona Historical Tour | — | — | - | pre-rule (2026-08-22 adjudication) | ABSTAIN(human-eyes: same-label-different-product-by-date) |
| `6702` | Twilight & Manta Ray Two Tank Dive | — | — | - | pre-rule (2026-08-22 adjudication) | ABSTAIN(human-eyes: snorkeler-on-dive-charter) |
| `6703` | Manta Ray Night Charter | — | — | - | pre-rule (2026-08-22 adjudication) | ABSTAIN(human-eyes: snorkeler-on-dive-charter) |
| `458342` | Surf and Beach Rentals | — | — | - | pre-rule (2026-08-22 adjudication) | ABSTAIN(human-eyes: cheapest-tier-tie-across-kinds) |
| `65112` | Two Tank Lava Tube, Reef and Intro to Scuba Dives | Snorkeler | $120.00 | per-person | step3 non-participant | ABSTAIN(step7 spread) |
| `214406` | Yamaha 350LI Sea Scooter Rentals | Seven hour rental | $79.00 | per-item/duration | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `411446` | Fishing Charter | 2 Hour Private Charter | $600.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `309841` | Adult Snorkel Set | One Day Rental | $6.99 | per-item/duration | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `309895` | Snorkel Floatation Devices | One Day Rental | $5.99 | per-item/duration | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `377496` | Adult Dry Snorkel+ Mask | One Day Rental | $4.99 | per-item/duration | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `377497` | Kids Dry Snorkel + Mask | One Day Rental | $4.99 | per-item/duration | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `377499` | Kids Snorkel Set | One Day Rental | $6.99 | per-item/duration | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `309868` | Snorkel Fins Only | One Day Rental | $4.99 | per-item/duration | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `991` | Surf Lessons | Group Lesson | $100.00 | per-person | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `1751` | Surfboard Rental | — | — | - | pre-rule (2026-08-22 adjudication) | ABSTAIN(human-eyes: cheapest-tier-tie-across-kinds) |
| `620878` | Hawaii Forest Farms Tours | Aloha Aina Tour Ticket | $48.00 | other | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `389183` | Oceanfront Sunset Private Ride | — | — | - | pre-rule (2026-08-22 adjudication) | ABSTAIN(human-eyes: stored-matches-no-live-tier) |
| `131061` | Honolua Ridgeline Hike: A Conservation Experience | — | — | - | pre-rule (2026-08-22 adjudication) | ABSTAIN(human-eyes: stored-matches-no-live-tier) |
| `42448` | Stand Up Paddleboard Rental | — | — | - | pre-rule (2026-08-22 adjudication) | ABSTAIN(human-eyes: cheapest-tier-tie-across-kinds) |
| `43206` | Scuba Gear Rental | Booties (24h) | $5.00 | per-item/duration | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `43210` | Beach Accessory Rental | — | — | - | pre-rule (2026-08-22 adjudication) | ABSTAIN(human-eyes: cheapest-tier-tie-across-kinds) |
| `43250` | Surf Board Rental | — | — | - | pre-rule (2026-08-22 adjudication) | ABSTAIN(human-eyes: cheapest-tier-tie-across-kinds) |
| `459712` | Gear Rental with Honolulu Snorkel | Water Resistant Phone Case - Daily Rental | $4.95 | per-item/duration | step2 never-a-fare | ABSTAIN(step7 spread) |
| `504158` | Dolphin Warrior Private Charters | One Hour Ash Scattering Ceremony | $750.00 | other | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `400707` | 2-Tank Molokini Crater and 2nd Site | — | — | - | pre-rule (2026-08-22 adjudication) | ABSTAIN(human-eyes: snorkeler-on-dive-charter) |
| `687533` | Kaula Luau: Ocean's Edge at Ko Olina | Cocktail & Show Only \| Adult | $119.00 | per-person | step4 age/eligibility gate | ABSTAIN(step7 spread) |
| `480429` | Double Kayak | Trekking Pole | $10.00 | other | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `564357` | One Day Rental Custom Fit Snorkel Gear | Fins Only | $8.00 | other | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `564395` | Two Day Rental Custom Fit Snorkel Gear | Fins Only | $16.00 | other | step2 never-a-fare | ABSTAIN(step7 spread) |
| `564396` | Three Day Rental Custom Fit Snorkel Gear | Fins Only | $24.00 | other | step2 never-a-fare | ABSTAIN(step7 spread) |
| `353682` | 2-tank Manta Ray Night Charter | — | — | - | pre-rule (2026-08-22 adjudication) | ABSTAIN(human-eyes: snorkeler-on-dive-charter) |
| `552129` | Private Fishing Charters | 4 Hour Fishing Trip | $850.00 | per-item/duration | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `176102` | The Combo | Certified Diver | $164.95 | per-person | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `4488` | Kiteboarding Courses | Kiteboard Rental (2 hours) | $49.00 | per-item/duration | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `4486` | Paddleboard Class | SUP Paddleboard Rental (2 hours) | $49.00 | per-item/duration | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `595342` | Manta Ray Night Snorkel | Person | $145.00 | per-person | step4 age/eligibility gate | ABSTAIN(step7 spread) |
| `596041` | Snorkeling & Marine Animal Excursion | Person | $135.00 | per-person | step4 age/eligibility gate | ABSTAIN(step7 spread) |
| `406584` | West Side Private Guided Shore Dive Tour | Tour for One | $400.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `631170` | Ohana Ranch ATV Tour | — | — | - | pre-rule (2026-08-22 adjudication) | ABSTAIN(human-eyes: cheapest-tier-tie-across-kinds) |
| `7571` | Surf Lessons! | Open Group Lesson (2HR) | $120.00 | per-person | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `202926` | PADI Advanced Open Water Course - 2 Days | Enriched Air Nitrox Course | $348.88 | other | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `414003` | Molokini Snorkel & Dive - Pro Diver II | Snorkeler | $169.00 | per-person | step3 non-participant | ABSTAIN(step7 spread) |
| `414008` | Guided Beach Dives | Diver 1 Tank | $159.00 | per-person | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `427752` | Molokini Snorkel & Dive - Kilikina II | Snorkeler | $169.00 | per-person | step3 non-participant | ABSTAIN(step7 spread) |
| `669728` | Sunrise Explorer: The Reef Awakens | — | — | - | pre-rule (2026-08-22 adjudication) | ABSTAIN(human-eyes: snorkeler-on-dive-charter) |
| `669723` | Close Encounters: Manta Edition | — | — | - | pre-rule (2026-08-22 adjudication) | ABSTAIN(human-eyes: snorkeler-on-dive-charter) |
| `8632` | SUP Lesson | Exclusive Private Group • 2 Hours | $175.00 | whole-unit | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `111757` | Group SUP | Group Lesson | $115.00 | per-person | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `302046` | Rental Equipment | — | — | - | pre-rule (2026-08-22 adjudication) | ABSTAIN(human-eyes: cheapest-tier-tie-across-kinds) |
| `336502` | Seasport Divers Rentals | — | — | - | pre-rule (2026-08-22 adjudication) | ABSTAIN(human-eyes: menu-unpublished-accessory-only) |
| `633027` | SUPDog Lessons | Private SUPDog Lesson | $150.00 | other | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `471` | Surf Kapolei | Group Adult Lesson | $149.00 | per-person | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `88844` | Full Day Custom Adventure (8 hours) | — | — | - | pre-rule (2026-08-22 adjudication) | ABSTAIN(human-eyes: stored-matches-no-live-tier) |
| `691165` | Big Island Volcano & Hilo Highlights Tour | Guaranteed You'll Lava It! GROUP TOUR | $181.00 | other | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `665953` | Surf Lessons | Semi-Private 1HR Lesson | $110.00 | per-person | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `506952` | Surf Lesson | VIP Surf Lesson (Ages 10+) | $149.00 | per-person | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `506246` | Lagoon Sport Rentals | Bring Your Own Equipment | $10.00 | per-person | step6 lowest survivor (no exclusion moved it) | ABSTAIN(step7 spread) |
| `377807` | Conservation Diving Tour - Coral Reef Ecology and Moni | Certified Diver | $279.00 | per-person | step3 non-participant | ABSTAIN(step7 spread) |
| `247` | Parasail | Standard Parasailer | $75.00 | other | step3 non-participant | ABSTAIN(step7 spread) |
| `499196` | Fireworks Waikiki Gondola Cruise | — | — | - | — | INSUFFICIENT (2/17) |
| `331183` | Trial of Fears | — | — | - | — | INSUFFICIENT (1/17) |
| `362311` | Hike into Heritage: Luxury Rainforest Hike & Waterfall | — | — | - | — | INSUFFICIENT (1/17) |
| `605508` | Private South Kona Tour | — | — | - | — | INSUFFICIENT (0/17) |
| `627189` | Community Pop-Up Experience | — | — | - | — | INSUFFICIENT (2/17) |
| `747` | Scuba Pool Lesson | — | — | - | — | INSUFFICIENT (1/17) |
| `471173` | Private Cloud Forest Tour - Pantropical Trail (1.5 hr) | — | — | - | — | INSUFFICIENT (0/17) |
| `13715` | Whale Watch | — | — | - | — | INSUFFICIENT (0/17) |
| `595691` | COMBO: Whale Watch & Manta Ray Night Snorkel | — | — | - | — | INSUFFICIENT (0/17) |
| `397265` | Waikiki Whale Watching | — | — | - | — | INSUFFICIENT (0/17) |
| `575157` | Friday Night Waikiki Fireworks Cruise | — | — | - | — | INSUFFICIENT (2/17) |
| `341489` | 2 Tank Afternoon Charter | — | — | - | — | INSUFFICIENT (0/17) |
| `627936` | Mala Pier + Pali Dive Adventure | — | — | - | — | INSUFFICIENT (2/17) |
| `86330` | Sunset Maui Goat Yoga with Live Music | — | — | - | — | INSUFFICIENT (2/17) |
| `580645` | Magic in Paradise Starring David Kuraya | — | — | - | — | INSUFFICIENT (2/17) |
| `477` | SUP Pokai Bay | — | — | - | pre-rule (2026-08-22 adjudication) | INSUFFICIENT (0/17) |
| `547218` | Waikiki Day & Sunset Sail For Couples | — | — | - | — | INSUFFICIENT (2/17) |
| `666226` | After School Art Classes | — | — | - | — | INSUFFICIENT (0/17) |

## 7. What this pass found that the rule owner should see

**The step-7 spread guard is the dominant abstain cause — 52 of 74 — and most of those are not leaks.**
24 of the 52 have a cheapest survivor that is plainly a rung on a duration or format ladder, where the
lowest rung is the correct "from" price by any reading: `309841` One Day Rental $6.99 vs Five Day $34.95,
`621361` 4 Hour Rental $159 vs 7 Day $1,113, `991` Group Lesson $100 vs Surf with a Pro $400. A further
group in the remaining 28 is the same shape — `247` Standard Parasailer $75 (abstained against a $1,500
private charter), `471` Group Adult Lesson $149, `406584` Tour for One $400. Against that, the guard
genuinely catches roughly ten non-fare survivors steps 2–5 missed: `480429` Trekking Pole $10,
`43206` Booties $5, `564357`/`564395`/`564396` Fins Only, `506246` Bring Your Own Equipment $10,
`90209` Snorkelers & Ride-Alongs $99, `414003`/`427752` Snorkeler $169, `459712` phone case $4.95.

So as adopted the guard trades about 42 correct publishes for about 10 real catches. It is doing the
job it was specified to do — flagging wide intra-item spread — but intra-item spread is not the same
signal as non-fare-ness, and in a population full of duration ladders the two come apart. Not changed
here: the rule was adopted as written and is applied as written.

**The step-5 escape hatch cancels the prose branch on the rows it was written for.** Steps 3, 4 and 5
each carry an "unless nothing survives" clause. Step 5's fires on **18 rows**, and on **7 of them it
restores exactly the party-conditional leak the prose branch was adopted to catch**: `70434` and
`69333` "Eight or More People" $45.00, `70051` "Four to Five People" $55.00, `334326`/`334341`
"3-10 People" $70.00/$69.00, `334350` "Regular Combo 3 - 10 people" $132.00, `370554` "Person in
group of 4-10" $160.00. The mechanism: on those items **every** tier is party-conditioned, so the
filter empties the set, the hatch restores all of it, and the largest-party (therefore cheapest) rung
wins. `70434` publishes $45.00 for an escape room whose cheapest purchasable party is eight people.

The prose branch itself is sound — it fired correctly and moved the base on `23564` and three others.
The defect is the hatch: "unless nothing survives" is the right instinct for step 3 (an item that sells
only a ride-along seat, `314433`) and step 4 (`266870`, where every tier is a student rate), each of
which fires exactly once and correctly. For step 5 it is wrong, because an item where every tier is
party-priced has no per-person base to fall back to — the honest outcome is ABSTAIN, not "publish the
biggest-party rate". Recommend the hatch be removed from step 5 only. Not changed here.

**Step 4's gate vocabulary omits `kid`/`kids`.** Six rows carry the token (`265338`, `377497`, `377499`,
`5292`, `676117`, `5284`). No row published a wrong price because of it, but `5292` "Kids Surf Camp"
published $295.00 for the right number and the wrong reason: the name-gate exemption never fired, the
"Child" tier was dropped, and the sibling "Surf Kids Camp 3-Days (6 hours)" happened to tie at $295.00.
Adding `kid|kids` to the vocabulary used by both the tier test and the item-name exemption makes that
row right by rule rather than by coincidence, and changes no published price in this population.

**Two of the three released snorkeler-tie rows did not survive the instrument.** `95014` publishes at
$189.00 (8/17 valid). `341489` has **0/17** valid readings and `627936` has 2/17 — both INSUFFICIENT.
The release was sound; the data was not there to act on it.

**The 8 zero-valid rows are a seasonality signal, not noise.** `13715`, `397265`, `595691` are whale-
watch products whose next availability sits ~132 days out, in winter season; `477` is 441 days out.
A 14-day near window cannot price a seasonal product, and a rule reading `price.low` without
`availability.start_at` would have published the winter price as today's.

**`unit` derivation is weakest where it matters least.** 44 of 173 PUBLISH rows derive `other` —
mostly private-lesson labels ("Private Lesson", "Semi-Private SUP Lesson") that name a format, not a
party size, and carry an empty note. None of them is wrong, but none is confirmed per-person either;
if the card renders a "per person" qualifier, those 44 need a second signal before it can be shown.

## 8. Provenance

- Population predicates extracted from `app.js` by brace balance and asserted byte-exact against the
  file before use: `isAddonOrRental` sha256[:16] `03c129f85f88f507`, `hasUsablePrice` `e504e18a60c054d9`.
- Population re-derived from the tree at 265, draw pool at 2,379 — both reconcile with s41 exactly.
- Endpoint `https://fareharbor.com/api/embed/{sn}/price-preview/per-item/v2/?item_pks={csv}&include_breakdown=yes&date={d}`.
- Shortname/pk parsed exact-segment from each row's own `bookingUrl`: 0 parse failures, 0 pk mismatches,
  single host `fareharbor.com`, 128 distinct shortnames.
- Prices arrive in cents; all figures above converted.
- **No data edits. This file is the only artifact written.**

---

# S42 Phase 2 — amended rule adopted, per-person rows published

Adjudicated 2026-08-22, executed 2026-08-24 on branch `whaw-priced-publish-s42` off
`origin/main` @ `4a33740`.

## D-?? — base-type rule, amended

**Hub number not assignable from this repo** (the hub is not readable here; s41 recorded the same
constraint). The rule below is the adopted text and needs a `D-` number minted hub-side.

The 7-step rule of §3 above, with three changes:

1. **Step-5 escape hatch REMOVED.** An item whose every product is party-conditioned has no
   per-person base and **ABSTAINS**. Steps 3 and 4 keep their hatches — each fires exactly once
   in this population and correctly (`314433` sells only a passenger seat; `266870` is all
   student rates).
2. **Step-4 vocabulary gains `kid|kids`,** in both the tier test and the item-name exemption.
3. **Step-7 spread guard unchanged.** The ladder-aware refinement is queued, not adopted.

### A third vocabulary gap, found while applying amendment 1 — needs ratification

`PARTY_PROSE` covered `group of N`, `N-M people`, `party of N`, `N or more`, `group rate`, but
**not the bare `N People` / `N Person` form**. Under the amendment as literally written, `23564`
and `589297` (Mauna Loa Helicopter) would publish at **$958.50 — the "2 People" rate** — while a
solo buyer pays $1,917.00. That is precisely the leak amendment 1 exists to stop, surviving on a
label form the regex did not enumerate.

Closed with an **anchored** alternation `^(N|one..ten)\s+(person|people|ppl|pax)$`. Anchoring is
load-bearing: unanchored, it would swallow "Person in Double Kayak 1.5 Hour" and similar. Measured
blast radius across all 265 rows: **exactly 2 labels on exactly those 2 rows, zero collateral.**
Both rows now ABSTAIN as all-party. This is the same class of defect as the `kid|kids` gap — an
enumerated vocabulary missing a surface form — and it is reported here rather than folded in
silently.

## Rule outcomes, amended vs unamended

| outcome | unamended | amended |
|---|---|---|
| PUBLISH | 173 | **154** |
| ABSTAIN | 74 | 93 |
| INSUFFICIENT | 18 | 18 |

19 rows moved PUBLISH -> ABSTAIN, every one of them `step5 all-party`: `400903` `423223` `348460`
`600939` `23564` `483351` `589297` `659692` `6981` `307126` `334350` `334341` `334326` `370554`
`65099` `70051` `70434` `69333` `319323`. One row kept PUBLISH but changed base tier: `5292`
"Surf Kids Camp 3-Days (6 hours)" -> **"Child"**, both $295.00 — the kid/kids amendment making that
row right by rule instead of by a price tie.

## Write population

| unit (derived) | PUBLISH rows | disposition |
|---|---|---|
| **per-person** | **59** | **WRITTEN** |
| whole-unit | 47 | held for the charter-unit template |
| other | 38 | held for the charter-unit template |
| per-item/duration | 10 | held for the charter-unit template |

## Fields touched — declared before writing, verified after

Re-derived byte-exact from `app.js`: `isAddonOrRental` sha256[:16] `03c129f85f88f507`,
`hasUsablePrice` `e504e18a60c054d9`. Gate is
`status !== 'inactive' && !bookingDead && hasUsablePrice(t) && !isAddonOrRental(t)`, and
`hasUsablePrice` is `Number.isFinite(price) && price > 1 && priceConfidence !== 'low'`.

Exactly four fields, matching the #247 convention:

| field | before (all 59) | after |
|---|---|---|
| `price` | stored scrape value | live-verified base floor (changes on 27 of 59) |
| `priceLabel` | `"unknown"` | `"per person"` |
| `priceConfidence` | `"low"` | `"high"` |
| `priceBreakdown` | absent | live tier array, `{id, singular, plural, note, priceCents, price, minPartySize}` |

No `status`, no `bookingDead`, no `priceEnrichment*`. **`priceBreakdown` carries every live tier,
including the leak tiers steps 2-5 exclude** — so its minimum sits below the published base by
design on 20 of the 59. That is the rule working, not a defect; the detector asserts the published
base is *present as a tier*, never that it is the minimum.

`isAddonOrRental` ejection risk (the #247 hazard, where arriving `priceBreakdown` flips a row out
of the pool) was dry-run before writing: **0 of 59 ejected**, pool 2,379 -> 2,438.

## Verification

**Semantic diff vs `origin/main` — 13/13 guards passed.** 4,666 rows before and after; identical
`id` sequence and pk set; 59 rows changed and 4,607 byte-identical; only
`{price, priceBreakdown, priceConfidence, priceLabel}` moved anywhere; every changed row is in the
declared write population and every declared row changed; pool 2,379 -> 2,438 (+59); exactly the 59
entered and 0 rows left.

**Detector** — deterministic every-4th sample (15 rows, above the N>=10 floor) and a full 59-row
run, asserting stored `price` == live floor from the valid-reading sweep, `priceConfidence` ==
`high`, `priceLabel` == `per person`, the published base present as a tier, breakdown floor <= base,
and `priceCents`/`price` consistency. Clean run 0 violations on both. Five corruption controls, each
on a row that is genuinely in the sample (the first attempt corrupted `206137`, which the every-4th
sample does not contain — the control proved nothing until it was aimed correctly):

| control | fired |
|---|---|
| `price` 179 -> 999 | yes |
| `priceConfidence` -> `low` | yes |
| `priceLabel` -> `per adult` | yes |
| base tier removed from `priceBreakdown` | yes |
| tier `priceCents`/`price` desync | yes |

Revert then `cmp` against the pre-corruption baseline: identical. Detector and semantic diff both
clean after revert.

**Rendered check.** There is no artifact named `safeContext` in this repo — searched filenames and
file contents case-insensitively; there is no `package.json` and no `node_modules`. The instrument
used is the one #247's render check describes: headless Chrome via a global **playwright 1.62.1**,
analytics aborted at the resolver, served over `127.0.0.1`.

- `document.fonts.ready` resolved; load-more driven in-page to a count **stall** (not to button
  visibility) — 101 rounds, whole pool paged in at 2,438 cards in 1.7s.
- 2,438/2,438 cards, 0 page errors, 0 degenerate price strings (`NaN`, `undefined`, `From $0`,
  `Price on request`) across the entire pool.
- All 59 written rows present and rendering `From $X` at exactly the written price.
- **0 held rows entered the render pool.**
- The card surface asserts "per adult" 0 times.
- Curated-page gate **exercised on real rows**: across the 13 curated pages, 213 cards, of which
  **14 are written rows, and 0 of the 14 assert a price** — all render "Check live price", because
  those pages gate on `priceLabel === 'per adult'` and the honest label here is `per person`.

## Two consequences worth stating plainly

**The 12 curated pages will not show these prices.** They gate on `priceLabel === 'per adult'`
exactly and never consult `priceConfidence`. Labelling honestly as `per person` therefore buys the
main grid and forgoes the curated surface. The alternative — writing `per adult` for a Student,
Snorkeler or Child base — was rejected. Worth knowing given that curated pages carry a
disproportionate share of booking clicks; widening that gate to accept `per person` is a separate,
render-side change and is not in this PR.

**`map.html`'s label surface was not exercised.** It reads `priceLabel` and skips the literal
`'unknown'`, so these rows will begin showing a unit there; the marker labels render into popups
rather than body text, so the assertion returned 0 occurrences and proves nothing either way. The
underlying field is set correctly; the surface is unverified.
