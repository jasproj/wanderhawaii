#!/usr/bin/env python3
"""s44 / D-574 (as amended by D-588/D-600) Phase 0 — live FareHarbor probe of the
priceLabel=='charter' population in tours-data.json.

READ-ONLY against tours-data.json. Writes one JSON observation file.
Template: keywestsandbartours scripts/probe-charter-ladders.py (KWST #240).

WHY THIS EXISTS
  extract-price-v5.js:135-143 selects `Math.max(...allPrices)` whenever the
  page text matches /private charter|full day charter|half day charter/ and
  stamps `priceLabel: 'charter'`. No other writer emits that label, so the rows
  carrying it are the COMPLETE population of the Math.max branch, bounded from
  the code rather than by sampling stored values.

INSTRUMENT RULES (each earned by a wrong reading somewhere in this network)
  * DATE VALIDITY. availability.start_at echoes the NEXT departure on/after the
    requested date. A reading is VALID only when start_at[0:10] == the requested
    date; everything else is a fallback echo and is DISCARDED, never repaired.
  * $0 TIERS ARE NOT FARES (D-575). Recorded separately, excluded from floor
    and ceiling.
  * GRATUITY / TIP / SERVICE tiers are never a fare (s42 rule). Recorded
    separately, excluded from floor and ceiling.
  * ABSENCE IS UNSAMPLED, NEVER ZERO. An item missing from items[] means no
    availability published for that date.
  * THE ITEM KEY IS `id`, NOT `pk`.
  * TIER ID IS NOT A KEY. Products are keyed on
    (id, singular, note, min_party_size).
  * WRONG-SHORTNAME RULE. A wrong company shortname 400s/404s identically to a
    dead product, so the HTTP status of every distinct shortname is recorded,
    and /api/v1/companies/{sn}/ is probed once per shortname.

FALSIFIABILITY. A deliberately impossible shortname is probed first; if it
returns 200 the instrument cannot discriminate and the run aborts.

No clock reads: every date comes from --anchor, so the file regenerates
identically from the same sweep inputs.
"""
import argparse, collections, json, re, sys, time, urllib.error, urllib.request
from datetime import date, timedelta
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
TOURS = REPO / "tours-data.json"
API = ("https://fareharbor.com/api/embed/{sn}/price-preview/per-item/v2/"
       "?item_pks={pks}&include_breakdown=yes&date={date}")
COMPANY = "https://fareharbor.com/api/v1/companies/{sn}/"
UA = "WanderRenderMonitor/1.0 (+internal-qa)"
BATCH = 20
MIN_VALID = 3
IMPOSSIBLE_SN = "definitely-not-a-real-fh-shortname-zzz"
GRATUITY = re.compile(r"\b(gratuit|tip|service charge|fuel surcharge|deposit)", re.I)


def build_dates(anchor):
    """14 consecutive days from the anchor, then +30/+60/+90 (17 total, s43 shape)."""
    d0 = date.fromisoformat(anchor)
    out = [(d0 + timedelta(days=i)).isoformat() for i in range(14)]
    out += [(d0 + timedelta(days=n)).isoformat() for n in (30, 60, 90)]
    return out


def get(url, sn):
    req = urllib.request.Request(url, headers={
        "User-Agent": UA, "Accept": "application/json",
        "Referer": f"https://fareharbor.com/embeds/book/{sn}/"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, resp.read().decode("utf-8", "replace"), None
    except urllib.error.HTTPError as e:
        return e.code, None, f"HTTP {e.code}"
    except Exception as e:                                   # noqa: BLE001
        return None, None, str(e)[:140]


def fetch(sn, pks, day):
    return get(API.format(sn=sn, pks=",".join(str(p) for p in pks), date=day), sn)


def tiers_of(item):
    """Purchasable customer types keyed on the full tuple. $0 and gratuity
    tiers are recorded but never counted as a fare."""
    br = ((item.get("price") or {}).get("breakdown") or {})
    out, zeros, grat = [], [], []
    for c in br.get("customer_types") or []:
        cents = c.get("price")
        if not isinstance(cents, (int, float)):
            continue
        rec = {"tier_id": c.get("id"), "singular": c.get("singular"),
               "plural": c.get("plural"), "note": c.get("note"),
               "min_party_size": c.get("min_party_size"), "dollars": cents / 100.0}
        if cents == 0:
            zeros.append(rec)                                # D-575
        elif GRATUITY.search(f"{c.get('singular') or ''} {c.get('note') or ''}"):
            grat.append(rec)                                 # s42 gratuity rule
        else:
            out.append(rec)
    return out, zeros, grat


def shortname_of(row):
    m = re.search(r"fareharbor\.com/embeds/book/([^/]+)/", row.get("bookingUrl") or "")
    return m.group(1) if m else None


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", required=True)
    ap.add_argument("--anchor", required=True, help="first of the 14 consecutive dates, YYYY-MM-DD")
    ap.add_argument("--sleep", type=float, default=0.25)
    args = ap.parse_args()

    dates = build_dates(args.anchor)
    doc = json.loads(TOURS.read_text(encoding="utf-8"))
    targets = [t for t in doc["tours"] if t.get("priceLabel") == "charter"]
    print(f"[population] priceLabel=='charter' rows: {len(targets)}", file=sys.stderr)

    code, _, err = fetch(IMPOSSIBLE_SN, [1], dates[0])
    print(f"[control] impossible shortname -> code={code} err={err}", file=sys.stderr)
    if code == 200:
        sys.exit("FATAL: bogus shortname returned 200 — instrument is not falsifiable")

    bysn = collections.defaultdict(list)
    meta = {}
    for t in targets:
        sn = shortname_of(t)
        bysn[sn].append(t["pk"])
        meta[str(t["pk"])] = {"shortname": sn, "name": t.get("name"), "island": t.get("island"),
                              "status": t.get("status"), "storedPrice": t.get("price"),
                              "durationText": t.get("durationText"), "tags": t.get("tags")}

    company = {}
    for sn in sorted(bysn):
        c, body, e = get(COMPANY.format(sn=sn), sn)
        company[sn] = {"code": c, "err": e, "pks": sorted(bysn[sn])}
        time.sleep(args.sleep)
    print(f"[companies] {len(company)} shortnames probed", file=sys.stderr)

    obs = collections.defaultdict(dict)
    httpcodes = collections.defaultdict(dict)
    nreq = 0
    for di, day in enumerate(dates, 1):
        for sn in sorted(bysn):
            pks = sorted(set(bysn[sn]))
            for j in range(0, len(pks), BATCH):
                chunk = pks[j:j + BATCH]
                status, body, ferr = fetch(sn, chunk, day)
                nreq += 1
                for pk in chunk:
                    httpcodes[pk][day] = status
                if ferr or not body or not body.lstrip().startswith("{"):
                    for pk in chunk:
                        obs[pk][day] = {"status": "ERROR", "err": ferr or "non-JSON body"}
                    time.sleep(args.sleep)
                    continue
                data = json.loads(body)
                seen = {int(it.get("id", -1)): it for it in (data.get("items") or [])}
                for pk in chunk:
                    it = seen.get(pk)
                    if it is None:
                        obs[pk][day] = {"status": "UNSAMPLED"}
                        continue
                    start_at = (it.get("availability") or {}).get("start_at")
                    tiers, zeros, grat = tiers_of(it)
                    valid = bool(start_at) and start_at[0:10] == day
                    obs[pk][day] = {
                        "status": "OK" if valid else "FALLBACK",
                        "start_at": start_at, "requested": day, "date_valid": valid,
                        "tiers": tiers, "zero_tiers": zeros, "gratuity_tiers": grat,
                        "low": (it.get("price") or {}).get("low"),
                        "high": (it.get("price") or {}).get("high"),
                    }
                time.sleep(args.sleep)
        print(f"  ...date {di}/{len(dates)} ({day}) done, {nreq} requests so far", file=sys.stderr)

    json.dump({"anchor": args.anchor, "dates": dates, "min_valid": MIN_VALID,
               "population": len(targets), "requests": nreq,
               "control": {"shortname": IMPOSSIBLE_SN, "code": code, "falsifiable": code != 200},
               "companies": company, "meta": meta,
               "obs": {str(k): v for k, v in obs.items()},
               "http": {str(k): v for k, v in httpcodes.items()}},
              open(args.out, "w"), indent=1, sort_keys=True)
    print(f"WROTE {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
