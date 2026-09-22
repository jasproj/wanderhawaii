/* ============================================
   WanderHawaii — booking_click tracking
   ============================================
   Single source of truth for the booking_click GA4 conversion event.
   Loaded site-wide via <script src="/tracking.js" defer> in <head>.

   Wires every Check Availability anchor that links to fareharbor.com via
   document-level click delegation — no per-anchor onclick required.
   Survives runtime-rendered anchors. A CTA class alone never fires this
   event; only a FareHarbor href does.

   Coexistence notes:
   - Anchors with an existing onclick="trackBookingClick(...)" are skipped
     so they do not double-fire. Measured 2026-08-08: 0 such anchors in
     blog/*; index.html carried 7 (4 island-decision-cards, shuffle,
     load-more, mobile scroll CTA) — all removed as non-booking actions
     that were firing the canonical conversion event. This guard stays as
     a defensive no-op for any future onclick="trackBookingClick(...)".
   - app.js defines its own trackTourBooking(tour) for grid clicks (renamed
     from trackBookingClick specifically to avoid shadowing the global);
     that path is intentionally left alone, and our delegation does not
     match <button> elements.

   utm_source tagging:
   - On every FareHarbor link click, we append utm_source=wanderhawaii
     so GA4 can attribute the booking to WHAW.
   - appendUtmSource is a vendored copy of _tools/generators/source-tag.js
     (PR _tools#84, 4e73885). Inlined here instead of loaded as a
     separate <script> to avoid editing 114 page <head> blocks.
*/

(function () {
    /* HOSTNAME GUARD — booking_click is emitted from the live domain only.
       ------------------------------------------------------------------
       Measured 2026-08-18 across the network: 84 of 1,066 booking_click
       events came from 127.0.0.1 — local preview servers and Playwright
       runs, not users. This property recorded 2 localhost booking_click.

       EXACT hostname match, never a heuristic. www 301s to the bare host on
       all nine domains, so location.hostname is always the bare form at
       execution time; the www form is accepted anyway so a future DNS or
       Pages change cannot silently zero conversions.

       Installed as a gtag wrapper rather than a return at each call site
       because this repo emits booking_click from 68 call site(s) across
       67 file(s). Guarding only this file would leave the other emitters
       live and the localhost traffic would simply move to them. Every page
       carrying an inline emitter loads this file, and the inline
       `function gtag()` is defined in <head> before this deferred script
       runs, so the wrapper is installed before any click can fire.

       Only booking_click is suppressed. page_view and every other event are
       passed through untouched, so local QA still renders and reports
       normally — this removes a false conversion, not the tag. */
    var BOOKING_CLICK_ALLOWED_HOSTS = ['wanderhawaii.com', 'www.wanderhawaii.com'];
    function bookingClickHostIsLive() {
        return BOOKING_CLICK_ALLOWED_HOSTS.indexOf(location.hostname) !== -1;
    }
    if (!bookingClickHostIsLive()) {
        var _realGtagForGuard = (typeof window.gtag === 'function') ? window.gtag : null;
        window.gtag = function () {
            if (arguments[0] === 'event' && arguments[1] === 'booking_click') return;
            if (_realGtagForGuard) return _realGtagForGuard.apply(this, arguments);
            (window.dataLayer = window.dataLayer || []).push(arguments);
        };
    }

    function appendUtmSource(url, slug) {
        if (typeof url !== 'string' || !url) return url;
        if (typeof slug !== 'string' || !slug) return url;
        if (url.indexOf('fareharbor.com') === -1) return url;
        if (/[?&]utm_source=/.test(url)) return url;
        var sep = url.indexOf('?') === -1 ? '?' : '&';
        return url + sep + 'utm_source=' + encodeURIComponent(slug);
    }

    function detectRegion() {
        var path = (location && location.pathname) || '';
        if (path.indexOf('/oahu') !== -1) return 'oahu';
        if (path.indexOf('/maui') !== -1) return 'maui';
        if (path.indexOf('/big-island') !== -1 || path.indexOf('big-island') !== -1) return 'big-island';
        if (path.indexOf('/kauai') !== -1) return 'kauai';
        return 'hawaii';
    }

    function readContext(link) {
        var href = link.getAttribute('href') || '';
        var name = link.dataset.tourName
            || link.textContent.replace(/[→➤➔\s]+$/, '').trim()
            || 'unknown';
        var id = link.dataset.tourId || href || 'unknown';
        return { name: name, id: id, href: href };
    }

    if (typeof window.trackBookingClick !== 'function') {
        window.trackBookingClick = function (tourName, tourId, island) {
            if (typeof gtag === 'undefined') return;
            gtag('event', 'booking_click', {
                event_category: 'conversion',
                event_label: tourName,
                tour_name: tourName,
                tour_id: tourId,
                island: island || detectRegion(),
                source: 'list'
            });
        };
    }

    document.addEventListener('click', function (e) {
        var link = e.target.closest && e.target.closest('a');
        if (!link) return;
        var onclickAttr = link.getAttribute('onclick') || '';
        if (onclickAttr.indexOf('trackBookingClick') !== -1) return;
        var href = link.getAttribute('href') || '';
        var isFareHarbor = href.indexOf('fareharbor.com') !== -1;
        if (!isFareHarbor) return;
        link.href = appendUtmSource(link.href, 'wanderhawaii');
        var ctx = readContext(link);
        if (typeof gtag === 'undefined') return;
        // Attribution source: "map" when the CTA opts in via data-source,
        // else "list" so existing list/grid clicks are unchanged.
        var source = (link.dataset && link.dataset.source) || 'list';
        gtag('event', 'booking_click', {
            event_category: 'conversion',
            event_label: ctx.name,
            tour_name: ctx.name,
            tour_id: ctx.id,
            island: detectRegion(),
            source: source
        });
    });
    /* ATTRIBUTION ENRICHMENT (2026-09-22) — every booking_click, whichever code
       emits it, is stamped with what FareHarbor's booking report can be joined on:
         fh_company  operator shortname from the href  (/book/<company>/)
         fh_item     item pk from the href             (/items/<pk>/)
         price_shown the price on the card at click time, as a number
         page_path   location.pathname
         site        this site's slug
       A capture-phase click listener records the clicked FareHarbor anchor
       before any inline onclick runs; a gtag wrapper merges those fields into
       the next booking_click within 3s. Nothing else about the event changes,
       so the existing GA4 conversion keeps counting. */
    var SITE_SLUG = 'wh';
    var _lastFH = null;
    function _priceFrom(link) {
        var card = link.closest && (link.closest('.tour-card') || link.closest('article') || link.closest('.card') || link.parentElement);
        var txt = (link.dataset.price || (card && ((card.querySelector('.tour-price, .price, [data-price]') || {}).textContent || (card.querySelector('[data-price]') || {dataset:{}}).dataset.price)) || '');
        var m = /(\d[\d,]*(?:\.\d+)?)/.exec(String(txt).replace(/,/g, ''));
        return m ? Number(m[1]) : undefined;
    }
    document.addEventListener('click', function (e) {
        var link = e.target && e.target.closest && e.target.closest('a[href*="fareharbor.com"]');
        if (!link) return;
        var href = link.getAttribute('href') || '';
        var co = /\/(?:embeds\/)?book\/([^\/?#]+)/.exec(href), pk = /\/items\/(\d+)/.exec(href);
        _lastFH = { fh_company: co ? co[1] : undefined, fh_item: pk ? pk[1] : undefined, price_shown: _priceFrom(link), page_path: location.pathname, site: SITE_SLUG, t: Date.now() };
    }, true);
    (function installEnricher() {
        var real = window.gtag;
        if (typeof real !== 'function' || real.__enriched) return;
        var wrapped = function () {
            if (arguments[0] === 'event' && arguments[1] === 'booking_click') {
                var p = (arguments[2] && typeof arguments[2] === 'object') ? arguments[2] : {};
                var extra = (_lastFH && Date.now() - _lastFH.t < 3000) ? _lastFH : { page_path: location.pathname, site: SITE_SLUG };
                for (var k in extra) if (k !== 't' && extra[k] !== undefined && p[k] === undefined) p[k] = extra[k];
                arguments[2] = p; arguments.length = Math.max(arguments.length, 3);
            }
            return real.apply(this, arguments);
        };
        wrapped.__enriched = true; window.gtag = wrapped;
    })();
})();
