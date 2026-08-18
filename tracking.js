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
})();
