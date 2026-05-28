/* ============================================
   WanderHawaii — booking_click tracking
   ============================================
   Single source of truth for the booking_click GA4 conversion event.
   Loaded site-wide via <script src="/tracking.js" defer> in <head>.

   Wires every Check Availability anchor (FareHarbor links and CTA-class
   anchors) via document-level click delegation — no per-anchor onclick
   required. Survives runtime-rendered anchors.

   Coexistence notes:
   - Anchors with an existing onclick="trackBookingClick(...)" are skipped
     so they do not double-fire (10 such anchors live in blog/*).
   - app.js defines its own trackBookingClick(tour) that overrides the
     global on pages where app.js loads (homepage and tour grids). That
     path is intentionally left alone; app.js fires through its own grid
     handler, and our delegation does not match <button> elements.

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

    var CTA_CLASSES = [
        'book-btn',
        'book-btn-inline',
        'btn-primary',
        'tour-book-btn',
        'cta-btn',
        'final-cta-btn',
        'browse-cta-btn',
        'mobile-cta-btn',
        'primary-cta',
        'island-cta',
        'footer-cta',
        'sidebar-cta',
        'blog-cta'
    ];

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

    function hasCtaClass(link) {
        if (!link.classList) return false;
        for (var i = 0; i < CTA_CLASSES.length; i++) {
            if (link.classList.contains(CTA_CLASSES[i])) return true;
        }
        return false;
    }

    document.addEventListener('click', function (e) {
        var link = e.target.closest && e.target.closest('a');
        if (!link) return;
        var onclickAttr = link.getAttribute('onclick') || '';
        if (onclickAttr.indexOf('trackBookingClick') !== -1) return;
        var href = link.getAttribute('href') || '';
        var isFareHarbor = href.indexOf('fareharbor.com') !== -1;
        if (!isFareHarbor && !hasCtaClass(link)) return;
        if (isFareHarbor) {
            link.href = appendUtmSource(link.href, 'wanderhawaii');
        }
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
