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
