#!/usr/bin/env python3
"""s44 — repair the priceLabel=='charter' rows that stored a ladder CEILING.
D-574 as amended by D-588/D-600 (Math.max branch only). Template: KWST #240
scripts/fix-charter-maxtier.py.

DETERMINISTIC (D-599). No network. Reads ONE frozen input — the committed live
evidence scripts-staging/s44-charter-ladders-2026-08-24.json written by
scripts/s44-probe-charter-ladders.py — and asserts every value it writes against
that evidence before any byte changes. A single failed assert aborts the run and
writes nothing. Re-running on the written tree reports 0 rows to write.

WHAT WENT WRONG
  extract-price-v5.js:135-143 selects `Math.max(...allPrices)` whenever the page
  text matches /private charter|full day charter|half day charter/ and stamps
  `priceLabel: 'charter'`. No other writer emits that label, so the 85 rows
  carrying it are the complete population of that branch.

DISPOSITIONS (D-600), decided from the DATE-VALID live ladder only
  (a) CORRECT-BY-CONSTRUCTION — stored equals a live tier AND (the ladder has a
      single purchasable tier, or stored is the ladder floor, or the row's own
      name/durationText names the stored tier, or stored is the only whole-unit
      tier and every other tier is a per-person seat). Left alone.
  (b) MAX-TIER DEFECT — stored == ceiling of a ladder whose top tier the product
      does not name, AND the product carries a vessel assertion (D-596).
      Rewritten to the live floor of the confirmed whole-boat tier (D-597).
  (c) INSUFFICIENT — fewer than MIN_VALID date-valid readings, or no purchasable
      tier (every tier $0, D-575/D-505). Untouched.
  (d) DURATION-MATCHED — stored == ceiling but durationText names a MIDDLE tier
      (D-601). None in this population.
  HELD-NONVESSEL — stored == ceiling of a real ladder but the product is ground
      transport or the vessel assertion is absent (D-596). Untouched; listed.
  STALE — stored matches NO live tier. Not a Math.max pick; out of this
      template's scope (D-600). Untouched; listed for its own ruling.
  MISPAIR — stored equals a live tier that is neither floor, ceiling, nor the
      tier the row names. Not a ceiling pick; out of scope. Untouched; listed.

VESSEL LEXICON (D-596). A row passes only if name/company/description contains
  one of: boat, yacht, catamaran, vessel, sail/sailing/sailboat, cruise, raft,
  zodiac, ship, pontoon, or a hull length like 43'. 'captain' alone does NOT
  pass (587813). Ground-transport words (van, suv, sprinter, bus, vehicle)
  mark a row HELD-NONVESSEL.

WHAT IS WRITTEN (only on (b) rows)
  price            -> live floor of the whole-boat tier
  priceConfidence  -> 'high'
  priceLabel       -> UNCHANGED ('charter'). No render vocabulary changes here.
  _unknownFields   -> priceSource (this script's name, D-602), priceTier,
                      priceBaseRule, priceObservations, priceSweptDates — all
                      five already exist in this file's vocabulary.
"""
import argparse, json, re, sys
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
TOURS = REPO / "tours-data.json"
LADDERS = REPO / "scripts-staging" / "s44-charter-ladders-2026-08-24.json"
SRC = "s44-fix-charter-maxtier"
MIN_VALID = 3
EXPECTED_POPULATION = 85

VESSEL = re.compile(r"\b(boats?|yachts?|catamarans?|vessels?|sail(?:ing|boat)?|cruise|rafts?|zodiac|ships?|pontoon)\b|\b\d{2,3}'\s", re.I)
GROUND = re.compile(r"\b(van|suv|minivan|sprinter|bus|vehicle|ground transportation|escalade)\b", re.I)
# Tested against the tier SINGULAR only: notes say "All ages welcome" on whole-boat tiers.
PER_PERSON = re.compile(r"\b(person|passenger|adult|child|children|infant|kama.?aina|seat)\b", re.I)
WORD_DIGITS = {"one": "1", "two": "2", "three": "3", "four": "4", "five": "5", "six": "6",
               "seven": "7", "eight": "8", "nine": "9", "ten": "10", "eleven": "11", "twelve": "12"}

# pk -> (disposition, stored_now, new_price, tier_singular, why). Every ruling is
# re-asserted against the ladders file below; a stale ruling cannot survive.
RULINGS = {
    497012: ("b", 2500.0, 1500.0, "Small Private Charter",
             "capacity axis: stored was 'Large Private Charter' (16-24 people) ceiling; product names no size; "
             "floor is 'Small Private Charter' (up to 15). Vessel: company 'Hang Loose Boat Tours LLC'."),
    619810: ("b", 1800.0, 1400.0, "Half Day Fishing Charter",
             "duration axis: durationText '4hr' == floor tier 'Half Day Fishing Charter' (4 hours); stored was the "
             "Full Day 8h ceiling. Vessel: description names the 43' Viking Convertible, 'vessel'."),
    632619: ("b", 3000.0, 2300.0, "Party Option (No swim) - Transportation included",
             "option/capacity axis: stored was 'Snorkel/Swim/Slide, transportation, over 21 pax' ceiling; product "
             "'Pau Hana Cruise' names no option; floor is the party option $2,300 (two tiers at that price). Vessel: 'cruise'."),
    636915: ("b", 2500.0, 2300.0, "Party Option (No swim) - No Transportation",
             "option axis: stored was the 'Snorkel/Swim' ceiling; product 'Island Breeze Private Cruise' names no "
             "option; floor is the party option. Vessel: 'cruise', 'boat'."),
}


def duration_tokens(text):
    """Duration numbers a string commits to. '3/4 Day' -> 6, 'Half Day' -> 4,
    'Full Day' -> 8, 'Six Hour' -> 6, '4hr' -> 4. Fractions are normalised
    BEFORE digit extraction so '3/4' cannot leak a bare 4."""
    low = (text or "").lower()
    low = re.sub(r"\b3\s*/\s*4\b|three[- ]quarter", " 6 ", low)
    low = re.sub(r"\bhalf[- ]day\b", " 4 ", low)
    low = re.sub(r"\bfull[- ]day\b", " 8 ", low)
    out = set(re.findall(r"\d+(?:\.\d+)?", low))
    for w, d in WORD_DIGITS.items():
        if re.search(r"\b" + w + r"\b", low):
            out.add(d)
    return out


def aggregate(lad):
    """pk -> {valid, tiers:[{singular,note,mps,floor,ceil,n}], zeros, grat}
    from DATE-VALID readings only; $0 and gratuity tiers are never fares."""
    out = {}
    for pk, days in lad["obs"].items():
        valid = [v for v in days.values() if v.get("date_valid")]
        ladder = defaultdict(list)
        zeros, grat = set(), set()
        for v in valid:
            for t in v["tiers"]:
                ladder[(t["singular"], t["note"] or "", t["min_party_size"])].append(t["dollars"])
            for t in v["zero_tiers"]:
                zeros.add(t["singular"])
            for t in v["gratuity_tiers"]:
                grat.add(t["singular"])
        tiers = [{"singular": k[0], "note": k[1], "mps": k[2], "floor": min(p), "ceil": max(p), "n": len(p)}
                 for k, p in ladder.items()]
        tiers.sort(key=lambda t: (t["floor"], t["singular"]))
        out[int(pk)] = {"valid": len(valid), "tiers": tiers, "zeros": sorted(zeros), "grat": sorted(grat),
                        "statuses": {s: sum(1 for v in days.values() if v["status"] == s)
                                     for s in ("OK", "FALLBACK", "UNSAMPLED", "ERROR")}}
    return out


def classify(row, agg):
    """Return (class, detail). Pure function of the row and the live ladder."""
    stored = float(row["price"])
    if agg["valid"] < MIN_VALID:
        return "INSUFFICIENT", f"{agg['valid']} date-valid readings (<{MIN_VALID}); " + \
            ", ".join(f"{k}={v}" for k, v in agg["statuses"].items() if v)
    tiers = agg["tiers"]
    if not tiers:
        return "INSUFFICIENT", f"no purchasable tier ($0 tiers: {agg['zeros']})"
    floors = [t["floor"] for t in tiers]
    floor, ceil = min(floors), max(floors)
    match = [t for t in tiers if t["floor"] == stored]
    if not match:
        return "STALE", f"stored ${stored:,.2f} matches no live tier; ladder " + \
            " / ".join(f"{t['singular']} ${t['floor']:,.2f}" for t in tiers)
    blob = f"{row.get('name','')} {row.get('company','')} {row.get('description') or ''}"
    named = duration_tokens(row.get("durationText")) | duration_tokens(row.get("name"))
    stored_named = any(duration_tokens(t["singular"]) & named for t in match)
    whole_unit = [t for t in tiers if not PER_PERSON.search(t["singular"])]
    if len(tiers) == 1:
        return "a", "single purchasable tier; ceiling == floor"
    if stored == floor:
        return "a", "stored == ladder floor"
    if stored_named:
        return "a", f"name/durationText names the stored tier {match[0]['singular']!r}"
    if len(whole_unit) == 1 and whole_unit[0]["floor"] == stored:
        return "a", f"stored is the only whole-unit tier {whole_unit[0]['singular']!r}; other tiers are per-person seats"
    if stored == ceil:
        if GROUND.search(blob) or not VESSEL.search(blob):
            why = "ground transport" if GROUND.search(blob) else "no vessel assertion (D-596)"
            return "HELD-NONVESSEL", f"stored == ceiling {match[0]['singular']!r}; floor ${floor:,.2f}; {why}"
        floor_named = any(duration_tokens(t["singular"]) & named for t in tiers if t["floor"] == floor)
        mid = [t for t in tiers if t["floor"] not in (floor, ceil) and duration_tokens(t["singular"]) & named]
        if mid and not floor_named:
            return "d", f"ceiling stored; durationText names middle tier {mid[0]['singular']!r} ${mid[0]['floor']:,.2f}"
        return "b", f"stored == ceiling {match[0]['singular']!r}; floor ${floor:,.2f} {tiers[0]['singular']!r}"
    return "MISPAIR", f"stored == {match[0]['singular']!r}, neither floor ${floor:,.2f} nor ceiling ${ceil:,.2f}, not named by row"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--execute", action="store_true", help="write tours-data.json; default is dry run")
    ap.add_argument("--table", action="store_true", help="print the full 85-row classification table")
    args = ap.parse_args()

    lad = json.loads(LADDERS.read_text(encoding="utf-8"))
    assert lad["control"]["falsifiable"], "probe control was not falsifiable"
    agg = aggregate(lad)
    raw = TOURS.read_text(encoding="utf-8")
    doc = json.loads(raw)
    rows = doc["tours"]
    # Byte round-trip, or a whole-file reformat would hide inside the diff (D-599).
    assert json.dumps(doc, indent=2, ensure_ascii=False) + "\n" == raw, \
        "tours-data.json does not round-trip under json.dumps(indent=2, ensure_ascii=False)"

    charter = [t for t in rows if t.get("priceLabel") == "charter"]
    assert len(charter) == EXPECTED_POPULATION, f"expected {EXPECTED_POPULATION} charter rows, found {len(charter)}"
    assert lad["population"] == EXPECTED_POPULATION
    assert set(t["pk"] for t in charter) == set(agg), "ladder file population != tree population"

    classes = {}
    for t in charter:
        classes[t["pk"]] = classify(t, agg[t["pk"]])
    counts = defaultdict(int)
    for c, _ in classes.values():
        counts[c] += 1
    if args.table:
        print("=== CLASSIFICATION (85 rows) ===")
        for t in sorted(charter, key=lambda r: r["pk"]):
            c, why = classes[t["pk"]]
            print(f"  {c:<14} pk={t['pk']:<7} ${float(t['price']):>9,.2f} valid={agg[t['pk']]['valid']:>2} "
                  f"{t.get('status'):<8} {t['name'][:48]!r}\n{'':18}{why}")
    print("=== COUNTS === " + "  ".join(f"{k}={v}" for k, v in sorted(counts.items())) + f"  total={sum(counts.values())}")

    # The code-derived (b) set must equal the hand-written RULINGS exactly, both
    # ways. A ruling already applied re-classifies as (a) (stored == floor), so
    # the derived set is compared to the rulings NOT yet carried by the tree.
    by_pk = {t["pk"]: t for t in rows}
    derived_b = {pk for pk, (c, _) in classes.items() if c == "b"}
    applied = {pk for pk in RULINGS if by_pk[pk].get("_unknownFields", {}).get("priceSource") == SRC
               and float(by_pk[pk]["price"]) == RULINGS[pk][2]}
    assert derived_b == set(RULINGS) - applied, \
        f"derived (b) {sorted(derived_b)} != pending RULINGS {sorted(set(RULINGS) - applied)}"
    assert not any(c == "d" for c, _ in classes.values()), "a (d) row appeared; add a ruling"

    planned = []
    for pk, (disp, stored_expected, new_price, tier_name, why) in sorted(RULINGS.items()):
        row, a = by_pk[pk], agg[pk]
        already = row.get("_unknownFields", {}).get("priceSource") == SRC and float(row["price"]) == new_price
        if already:
            continue
        assert float(row["price"]) == stored_expected, f"pk {pk} stored {row['price']} != ruling basis {stored_expected}"
        assert a["valid"] >= MIN_VALID
        floors = [t["floor"] for t in a["tiers"]]
        assert stored_expected == max(floors), f"pk {pk}: stored is not the observed ceiling"
        assert new_price == min(floors), f"pk {pk}: (b) price {new_price} != observed floor {min(floors)}"
        names = [t["singular"] for t in a["tiers"] if t["floor"] == new_price]
        assert tier_name in names, f"pk {pk}: tier at {new_price} is {names}, ruling named {tier_name!r}"
        tier = next(t for t in a["tiers"] if t["singular"] == tier_name and t["floor"] == new_price)
        assert tier["floor"] == tier["ceil"], f"pk {pk}: floor tier {tier_name!r} not stable across readings"
        assert tier["n"] == a["valid"], f"pk {pk}: floor tier seen on {tier['n']} of {a['valid']} valid readings"
        blob = f"{row.get('name','')} {row.get('company','')} {row.get('description') or ''}"
        assert VESSEL.search(blob) and not GROUND.search(blob), f"pk {pk}: vessel assertion failed"
        planned.append((pk, new_price, tier, why))

    print("=== PLAN ===")
    for pk, new_price, tier, why in planned:
        row = by_pk[pk]
        print(f"  WRITE (b) pk={pk:<7} ${float(row['price']):>9,.2f} -> ${new_price:>9,.2f}  "
              f"{len(agg[pk]['tiers'])} tiers, {agg[pk]['valid']} valid  {row['name'][:44]!r}\n         {why}")
    print(f"  rows to write: {len(planned)}")
    if not args.execute:
        print("DRY RUN — tours-data.json NOT written.")
        return

    for pk, new_price, tier, why in planned:
        row = by_pk[pk]
        row["price"] = int(new_price) if new_price == int(new_price) else new_price
        row["priceConfidence"] = "high"
        uf = row.get("_unknownFields") or {}
        uf["priceSource"] = SRC
        uf["priceTier"] = tier["singular"]
        uf["priceBaseRule"] = ("D-597 live floor of the whole-boat tier; the Math.max ladder ceiling "
                               f"(${float(RULINGS[pk][1]):,.2f}) was rejected under D-600")
        uf["priceObservations"] = tier["n"]
        uf["priceSweptDates"] = len(lad["dates"])
        row["_unknownFields"] = uf
    out = json.dumps(doc, indent=2, ensure_ascii=False) + "\n"
    TOURS.write_text(out, encoding="utf-8")
    print(f"WROTE {TOURS} ({len(raw)} -> {len(out)} bytes)")


if __name__ == "__main__":
    main()
