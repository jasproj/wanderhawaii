// WanderHawaii Tours App
// Load tours from JSON and render with descriptions

// Fallback for tour records with no image. Applied at render time, not just via
// onerror: `src="undefined"` costs a real 404 before onerror can rescue it.
// Local + Pexels-licensed; images/ATTRIBUTION.md records source slug
// "underwater-swim-with-tropical-fish-in-hawaii-31740971",
// which verifies the region from the source URL, not from our own caption.
const FALLBACK_IMAGE = '/images/hero-photo-1.jpg';

let toursData = [];

// ===== BOOKING PERFORMANCE OPTIMIZATIONS =====

// 1. URL Caching - Pre-cache FareHarbor URLs for instant clicks
const bookingUrlCache = {};

function cacheBookingUrl(tourId, url) {
    bookingUrlCache[tourId] = {
        url: url,
        cached_at: Date.now()
    };
    try {
        localStorage.setItem('fh_cache_' + tourId, JSON.stringify(bookingUrlCache[tourId]));
    } catch (e) {
        // localStorage full - continue without persistence
    }
}

function getBookingUrl(tourId, fallbackUrl) {
    const cached = bookingUrlCache[tourId];
    if (cached && Date.now() - cached.cached_at < 3600000) {
        return cached.url;
    }
    return fallbackUrl;
}

function preCacheBookingUrls(tours) {
    tours.forEach(tour => {
        if (tour.bookingUrl) {
            cacheBookingUrl(tour.id || tour.name, tour.bookingUrl);
        }
    });
}

// 2. GA4 Tracking Functions
// NOTE: Renamed from trackBookingClick to avoid shadowing the canonical
// 3-string global (defined in index.html <head> and /tracking.js). This
// enriched form fires on tour-grid clicks where company/price are known.
function trackTourBooking(tour) {
    gtag('event', 'booking_click', {
        tour_id: tour.id,
        tour_name: tour.name,
        island: tour.island,
        price: tour.price || 'unknown',
        company: tour.company,
        event_category: 'conversion'
    });
}

function trackFilterChange(filterType, value) {
    gtag('event', 'filter_used', {
        filter_type: filterType,
        value: value,
        event_category: 'engagement'
    });
}

function trackSearchUsed(searchTerm) {
    gtag('event', 'search_used', {
        query: searchTerm,
        event_category: 'engagement'
    });
}

function trackLoadMoreClick() {
    gtag('event', 'load_more_clicked', {
        event_category: 'engagement'
    });
}

// 3. Loading indicator with optimization
function openBookingWithLoader(url, tour) {
    event && event.preventDefault && event.preventDefault();

    // Track the booking click
    if (tour) {
        trackTourBooking(tour);
    }

    const loader = document.createElement('div');
    loader.id = 'booking-loader';
    loader.className = 'booking-loader';
    loader.innerHTML = `
        <div class="booking-loader-content">
            <div class="spinner"></div>
            <p>Opening booking...</p>
        </div>
    `;
    document.body.appendChild(loader);

    setTimeout(() => loader.style.opacity = '1', 10);
    window.open(url, '_blank', 'noopener,noreferrer');

    setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 300);
    }, 2500);
}
let filteredTours = [];
let displayedCount = 0;
const TOURS_PER_PAGE = 24;

// Load tours data
// Wire the homepage "Verified Tours" stat to the live (non-dead) catalog size,
// replacing the hardcoded value. No-op on pages without the element.
function updateVerifiedToursCount(n) {
    const el = document.getElementById('verified-tours-count');
    if (el) el.textContent = Number(n).toLocaleString();
}

async function loadTours() {
    // advertise.html loads app.js but has no #tours-grid. It was downloading the
    // whole of tours-data.json -- megabytes -- rendering none of it, and then
    // throwing in the catch below because there was no grid to write the error
    // into. Nothing to fill, nothing to fetch.
    if (!document.getElementById('tours-grid')) return;
    try {
        console.log('🔄 Fetching tours-data.json...');
        const response = await fetch('tours-data.json');
        console.log(`📥 Response status: ${response.status}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const _raw = await response.json();
        toursData = Array.isArray(_raw) ? _raw : _raw.tours;
        // Hide tours whose FareHarbor booking link is dead (audit 2026-05-28)
        // and any explicitly inactive tours, from every render surface.
        // A card with no price cannot convert, so unpriced tours are removed from the
        // DRAW POOL rather than rendered as "Price on request". Eligibility only --
        // page size, ordering and the shuffle are untouched.
        toursData = toursData.filter(t => t.status !== 'inactive' && !t.bookingDead
                                      && hasUsablePrice(t) && !isAddonOrRental(t));
        console.log(`✅ Loaded ${toursData.length} tours`);
        updateVerifiedToursCount(toursData.length);

        // Initial shuffle for randomization (per page load, non-mutating)
        toursData = shuffleArray(toursData);
        filteredTours = [...toursData];

        // Pre-cache booking URLs for instant clicks
        preCacheBookingUrls(toursData);

        displayedCount = 0;
        renderTours();
        updateResultsCount();
        console.log('✅ Tours rendered successfully');
    } catch (error) {
        console.error('❌ Error loading tours:', error.message);
        const grid = document.getElementById('tours-grid');
        if (grid) grid.innerHTML = `
            <div class="error-state">
                <p>⚠️ Unable to load tours. Please refresh the page.</p>
                <p style="font-size: 12px; color: #666;">Error: ${error.message}</p>
            </div>
        `;
    }
}

// Helper functions
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Add-on / rental exclusion. PORTED VERBATIM from the four island hubs
 * (oahu/maui/big-island/kauai .html -- sha256[:16] 79470a9ded732109 on all four,
 * extracted by brace balance rather than by an indentation guess). Not re-derived:
 * a guessed predicate is how this repo produced `ACTIVITY = 'Air'` and `'Luau'`,
 * both matching zero records while looking correct.
 *
 * It keys on priceBreakdown[].singular -- the customer-type labels -- which is the
 * field that distinguishes a wheelchair cushion from a snorkel tour. An earlier pass
 * declared no structural discriminator existed after checking company, tags, category
 * and priceLabel; the answer was already shipped on four pages in this repo.
 *
 * Removes 66 rows from the homepage draw pool: 25 vehicle rentals, 15 medical/baby
 * gear, 11 beach kit and lockers, 10 watersport gear rentals, 5 other. The 10
 * watersport rows are a KNOWN, DELIBERATE cost, filed as its own open decision --
 * all five surfaces exclude them today, so re-admitting is a five-surface call.
 */
function isAddonOrRental(tour) {
    const ACTIVITY_WORDS = /\b(charter|tours?|cruise|sail(?:ing)?|lessons?|courses?|classes?|excursion|trip|div(?:e|ing)|workshop|camp|photoshoot|photo shoot|safari|expedition|adventure|walk|snorkel|whale\s*watch|luau|sunset|sunrise|package|certification|certified|experience|voyage|paddle\s*board\s*tour|freedive|free\s*dive|self[- ]?guided)\b/i;
    const RENTAL_WORDS = /\b(rentals?|delivery|pick[- ]?up|drop[- ]?off)\b/i;
    const PEOPLE_WORDS = /\b(adults?|child(?:ren)?|kids?|keiki|youth|infant|senior|military|veteran|persons?|general|admission|vip|group|couple|family|guests?|participant|camper|private|shared|tandem|solo|traveler|passengers?|rider|divers?|snorkelers?|swimmers?|non[- ]?swimmer|toddler|teen|junior)\b/i;

    const name = tour.name || '';
    const pb = Array.isArray(tour.priceBreakdown) ? tour.priceBreakdown : [];
    const labels = pb.map(p => (p.singular || '').trim()).filter(Boolean);
    const haystacks = [name, ...labels];

    if (haystacks.some(h => ACTIVITY_WORDS.test(h))) return false;
    if (labels.length === 0) return false;
    if (labels.some(l => PEOPLE_WORDS.test(l))) return false;
    const rentalHits = labels.filter(l => RENTAL_WORDS.test(l)).length;
    return rentalHits === labels.length;
}

// Single source of truth for "this card can show a real price".
// formatPrice() renders from it and loadTours() filters the draw pool on it, so
// the renderer and the eligibility rule cannot drift apart. price > 1 rather than
// > 0 because one row (pk 286903, "Open Water Diver Course Day 2") publishes $1
// with confidence 'high' -- a broken price, and a priced-only pool concentrates it
// onto the first screen instead of removing it.
function hasUsablePrice(tour) {
    return Number.isFinite(tour.price) && tour.price > 1 && tour.priceConfidence !== 'low';
}

function formatPrice(price, confidence) {
    if (!hasUsablePrice({ price: price, priceConfidence: confidence })) return 'Price on request';
    return `From $${price}`;
}

// Pricing unit for the card badge — "per group", "whole unit", "per person".
// Ported verbatim from wanderengland/app.js priceUnit() (WENG #97, itself from
// wanderamsterdam #91 / keywestsandbartours via wandernewzealand #108): driven ONLY
// by the explicit _unknownFields.priceUnit string — no inference from priceLabel
// words. Empty for every row that does not carry one, so those cards render exactly
// as they did before this existed. formatPrice() is left alone: it answers "what is
// the number", this answers "what does the number buy".
function priceUnit(tour) {
    const u = (tour._unknownFields || {}).priceUnit;
    return (typeof u === "string" && u.trim()) ? u.trim() : "";
}

function cleanLocation(location = '') {
    return location
        .replace(/^United States\/Hawaii\//, '')
        .replace(/^Hawaii\//, '')
        .trim() || 'Hawaii';
}

// scoreLabel() removed 2026-08-21. It turned qualityScore into "Top Rated" /
// "Popular" beside a star glyph -- a claim about customer sentiment on a catalogue
// where `rating` and `reviewCount` are NULL on all 2,951 rows that carry them, and
// where no FareHarbor endpoint exposes a rating value to source one from.
// qualityScore is a SCRAPE-COMPLETENESS score, not a rating: it measures how much
// of our own record we managed to fill. It stays in the data as a sort key.
// Do not reinstate a badge, a star, or a superlative from it.

// --- s53 schema unit gate ---------------------------------------------------
// A bare Offer.price is read as per-person by the Bing/ChatGPT/Copilot
// ecosystem -- this network's primary conversion channel -- so a whole-boat
// charter emitted bare misquotes a $2,000 fare as $2,000/person. Ruled s52
// (network decision): the gate has THREE states, derived from the row's own
// evidence -- _unknownFields.priceUnit (the exact string the card renders),
// priceLabel, and the anchor tier (the priceBreakdown tier whose price equals
// the emitted price). A tier note is corroborating only and is never read here.
//   1. per-person affirmatively asserted   -> bare Offer.price, byte-identical
//      to what shipped before this gate existed.
//   2. non-per-person affirmatively asserted -> no bare price; a
//      UnitPriceSpecification whose unitText is the VERBATIM card string (the
//      same field the card reads) -- never a parallel wording. If the card
//      renders no unit string there is nothing to mirror, so no price at all.
//   3. no unit evidence either way -> no price at all. Absence of evidence is
//      not per-person; silence is honest, a guess is not.
// Every word list below is built from the pool's own vocabulary
// (scripts/evidence/s53-whaw-schema-gate/vocab-out.txt), and every string the
// lists do not reach falls to state 3 -- ambiguity resolves toward silence.

// Classify one evidence string: 'per-person', 'non-per-person', or '' (no
// verdict). Order matters twice: shared/semi-private formats sell seats on
// someone else's booking and must be read BEFORE the exclusivity words they
// contain ("Shared Charter", "Semi-Private Lesson"); and because every string
// containing shared/semi-private/non-private has already returned by then,
// the plain \bprivate\b test below cannot misfire on them.
function classifyUnitText(s) {
    if (typeof s !== 'string' || !s.trim()) return '';
    const SHARED_RE = /\b(?:shared|semi[-\s]?private|non[-\s]?private)\b/i;
    if (SHARED_RE.test(s)) return 'per-person';

    // Whole-unit evidence: exclusivity, per-group phrasing, vessel/vehicle/
    // equipment units, event pricing, capacity counts ("1-6 People",
    // "Up to 40 Guests", "5 passenger van", "1~5pax").
    const NON_PER_PERSON_RES = [
        /\bprivate\b/i,
        /\bcharter(?:s|ed)?\b/i,
        /\bper[\s-]?(?:group|booking|party|boat|couple|family|vehicle|van|unit|hour)\b/i,
        /\bby the hour\b/i,
        /\bwhole\s?(?:unit|boat|vessel|group)\b/i,
        /\bgroup\s?(?:of|size|rate)\b/i,
        /^\s*group\s*$/i,
        /\bexclusive\b/i,
        /\brentals?\b/i,
        /\bpax\b/i,
        /\bcouples?\b/i,
        /\b(?:yachts?|cabanas?|umbrellas?|coolers?|(?:e-?)?bikes?|suvs?|vans?)\b/i,
        /\bcar\s*\/\s*truck\b/i,
        /\b(?:wedding|ceremony|proposal|burial at sea|family session)\b/i,
        /\bpackages?\b/i,
        /\d\s*(?:[-–—~]|to)\s*\d+\s*(?:people|persons?|guests?|passengers?|hikers?|anglers?|surfers?)\b/i,
        /\bup\s?to\s+\d+\s*(?:people|persons?|guests?|passengers?)\b/i,
        /\b\d+\s*(?:people|guests|passengers)\b/i,
        /\b\d+\s?(?:passenger|seater)\b/i,
        /\b(?:one|two|three|four|five|six|seven|eight|nine|ten)\s+to\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:people|persons?|guests?|passengers?)\b/i
    ];
    for (const re of NON_PER_PERSON_RES) {
        if (re.test(s)) return 'non-per-person';
    }

    // Per-person evidence: explicit per-X phrasing, customer-type nouns, age
    // qualifiers, and per-student formats (courses, classes, lessons, camps).
    const PER_PERSON_RES = [
        /\bper[\s-]?(?:person|adult|child|guest|passenger|participant|rider|diver|snorkeler|surfer|student|swimmer|angler|hiker|traveler|golfer)\b/i,
        /\/\s?person\b/i,
        /\b(?:adults?|child(?:ren)?|kids?|keiki|youth|infants?|seniors?|teens?|juniors?|toddlers?|persons?|people|snorkele?rs?|(?:free)?divers?|surfers?|riders?|passengers?|participants?|guests?|students?|hikers?|anglers?|travele?rs?|visitors?|campers?|cyclists?|paddlers?|flyers?|birders?|hunters?|fisherm[ae]n|swimmers?|individuals?|attendees?|yogis?|golfers?|drivers?|zippers?|seats?|admission|tickets?|pass(?:es)?|scuba|certified|kamaʻ?'?[aā]ina)\b/i,
        /\bages?\s?\d+/i,
        /\b\d+\s?(?:&|and|or)\s?(?:up|under|over|younger|older)\b/i,
        /^\s*singles?\s*$/i,
        /\b(?:courses?|class(?:es)?|certifications?|camps?|lessons?)\b/i
    ];
    for (const re of PER_PERSON_RES) {
        if (re.test(s)) return 'per-person';
    }
    return '';
}

// Combine the row's three evidence sources into one state. Any whole-unit
// assertion outranks a per-person one: the harm of a wrong bare price (a
// charter read as per-person) dwarfs the harm of a suppressed one.
function unitStateFromEvidence(tour) {
    const pb = Array.isArray(tour.priceBreakdown) ? tour.priceBreakdown : [];
    const anchor = pb.find(p => p.price === tour.price);
    const verdicts = [
        priceUnit(tour),                        // the string the card renders
        (tour.priceLabel || '').trim(),
        anchor ? (anchor.singular || '').trim() : ''
    ].map(classifyUnitText);
    if (verdicts.includes('non-per-person')) return 'non-per-person';
    if (verdicts.includes('per-person')) return 'per-person';
    return 'none';
}

function generateTourSchema(tour) {
    const emitPrice = Number.isFinite(tour.price) && tour.priceConfidence !== 'low';
    const state = emitPrice ? unitStateFromEvidence(tour) : 'none';
    const cardUnit = priceUnit(tour);
    return {
        "@context": "https://schema.org",
        "@type": "TouristTrip",
        "name": tour.name,
        "description": tour.description || "",
        "touristType": tour.tags ? tour.tags.join(", ") : "",
        ...(state === 'per-person' && {
            "offers": {
                "@type": "Offer",
                "price": tour.price,
                "priceCurrency": "USD",
                "url": tour.bookingUrl
            }
        }),
        // unitText must mirror the visible card verbatim; a non-per-person row
        // whose card shows no unit string (or whose card string itself reads
        // per-person, a contradiction) has nothing honest to emit, so it emits
        // no price at all.
        ...(state === 'non-per-person' && cardUnit && classifyUnitText(cardUnit) !== 'per-person' && {
            "offers": {
                "@type": "Offer",
                "priceSpecification": {
                    "@type": "UnitPriceSpecification",
                    "price": tour.price,
                    "priceCurrency": "USD",
                    "unitText": cardUnit
                },
                "url": tour.bookingUrl
            }
        }),
        "provider": {
            "@type": "LocalBusiness",
            "name": tour.company
        }
    };
}

// Fisher-Yates shuffle (non-mutating)
function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Create tour card HTML
function createTourCard(tour) {
    const tags = tour.tags || [];
    const tagDisplay = tags.slice(0, 3).map(tag =>
        `<span class="tour-tag">${escapeHtml(tag)}</span>`
    ).join(' ');

    const description = tour.description || '';
    const safeDesc = (description || '').replace(/\s+/g, ' ').trim();
    const truncatedDesc = safeDesc.length > 120
        ? safeDesc.substring(0, safeDesc.lastIndexOf(' ', 117)) + '…'
        : safeDesc;


    const cleanLoc = cleanLocation(tour.location);
    const priceDisplay = formatPrice(tour.price, tour.priceConfidence);
    const unit = priceUnit(tour);
    const unitHtml = unit ? `<small>${escapeHtml(unit)}</small>` : '';

    const schema = generateTourSchema(tour);
    const schemaJson = JSON.stringify(schema).replace(/<\/script/gi, '<\\/script');

    let badgesHtml = '<div class="tour-badges">';
    if (tour.freeCancellation) {
        badgesHtml += '<span class="trust-badge free-cancel">Free Cancellation</span>';
    }
    badgesHtml += '</div>';

    return `
        <article class="tour-card" data-id="${tour.id ?? tour.pk}">
            <script type="application/ld+json">${schemaJson}</script>
            <div class="tour-image">
                <img src="${tour.image || FALLBACK_IMAGE}" alt="${escapeHtml(tour.name)}" loading="lazy" width="400" height="300" onerror="this.src='${FALLBACK_IMAGE}'" style="width: 100%; height: auto; object-fit: cover;">
                
            </div>
            <div class="tour-content">
                <div class="tour-meta">
                    <span class="tour-location">📍 ${escapeHtml(cleanLoc)}, ${escapeHtml(capitalizeIsland(tour.island))}</span>
                </div>
                <h3 class="tour-title">${escapeHtml(tour.name)}</h3>
                <p class="tour-description">${escapeHtml(truncatedDesc)}</p>
                <div class="tour-tags">${tagDisplay}</div>
                <div class="tour-footer">
                    <div class="tour-price">${priceDisplay}${unitHtml}</div>
                    <a href="${tour.bookingUrl}" target="_blank" rel="noopener" class="tour-book-btn book-now-btn" data-tour-id="${escapeHtml(tour.id ?? tour.pk)}" data-tour-name="${escapeHtml(tour.name)}" style="text-decoration: none;">Check Availability →</a>
                </div>
            </div>
        </article>
    `;
}

function capitalizeIsland(island) {
    if (!island) return '';
    if (island.toLowerCase() === 'big island') return 'Big Island';
    return island.charAt(0).toUpperCase() + island.slice(1);
}

// Inject the home in-grid MRec sponsor slot after the 8th tour card on the
// first page render. Re-rendering (filter change) wipes the grid via
// innerHTML, so we re-inject; load-more (append=true) leaves the existing
// slot in place and does not duplicate.
function injectHomeMrecAfterEighthCard(grid) {
    if (!grid || grid.querySelector('.home-mrec-injected')) return;
    const cards = grid.querySelectorAll('.tour-card');
    if (cards.length < 8) return;
    const slotHtml = '<div class="sponsor-slot home-mrec-injected"' +
        ' data-slot-id="home-mrec-1"' +
        ' data-slot-type="mrec"' +
        ' data-slot-page="home"></div>';
    cards[7].insertAdjacentHTML('afterend', slotHtml);
    if (window.SponsorSlot && typeof window.SponsorSlot.refresh === 'function') {
        window.SponsorSlot.refresh('home-mrec-1');
    }
}

// Render tours to grid
function renderTours(append = false) {
    const grid = document.getElementById('tours-grid');
    const toursToShow = filteredTours.slice(
        append ? displayedCount : 0,
        displayedCount + TOURS_PER_PAGE
    );

    const html = toursToShow.map(createTourCard).join('');

    if (append) {
        grid.insertAdjacentHTML('beforeend', html);
    } else {
        grid.innerHTML = html;
        injectHomeMrecAfterEighthCard(grid);
    }

    // The click delegation that used to call openBookingWithLoader was a
    // workaround for the previous <button> markup, which couldn't navigate
    // natively. Now that tour cards render as <a href target="_blank">,
    // navigation happens via the anchor's native click and tracking.js's
    // delegated handler still fires booking_click. No JS handler needed
    // here.

    displayedCount = append
        ? displayedCount + toursToShow.length
        : toursToShow.length;

    // Show/hide load more button
    const loadMoreBtn = document.getElementById('load-more');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = displayedCount >= filteredTours.length ? 'none' : 'block';
    }
}

// Load more tours
function loadMoreTours() {
    trackLoadMoreClick();
    renderTours(true);
}

// Update results count
function updateResultsCount() {
    const countEl = document.getElementById('results-count');
    if (countEl) {
        countEl.textContent = `Showing ${Math.min(displayedCount, filteredTours.length)} of ${filteredTours.length} adventures`;
    }
}

// Filter tours
function filterTours() {
    const islandFilter = document.getElementById('island-filter')?.value?.toLowerCase() || '';
    const activityFilter = document.getElementById('activity-filter')?.value || '';
    const sortFilter = document.getElementById('sort-filter')?.value || 'quality';
    const searchInput = document.getElementById('search-input')?.value?.toLowerCase() || '';

    // Track filter usage
    if (islandFilter) trackFilterChange('island', islandFilter);
    if (activityFilter) trackFilterChange('activity', activityFilter);
    if (searchInput) trackSearchUsed(searchInput);

    filteredTours = toursData.filter(tour => {
        // Island filter
        if (islandFilter && tour.island?.toLowerCase() !== islandFilter) {
            return false;
        }

        // Activity filter
        if (activityFilter && !tour.tags?.includes(activityFilter)) {
            return false;
        }

        // Search filter
        if (searchInput) {
            const searchFields = [
                tour.name,
                tour.company,
                tour.location,
                tour.description,
                ...(tour.tags || [])
            ].join(' ').toLowerCase();

            if (!searchFields.includes(searchInput)) {
                return false;
            }
        }

        return true;
    });

    // Sort
    if (sortFilter === 'quality') {
        filteredTours.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
    } else if (sortFilter === 'name') {
        filteredTours.sort((a, b) => a.name.localeCompare(b.name));
    }

    displayedCount = 0;
    renderTours();
    updateResultsCount();
}

// Shuffle visible tours
function shuffleTours() {
    filteredTours = shuffleArray(filteredTours);
    displayedCount = 0;
    renderTours();
}

// Clear all filters
function clearAllFilters() {
    const islandFilter = document.getElementById('island-filter');
    const activityFilter = document.getElementById('activity-filter');
    const sortFilter = document.getElementById('sort-filter');
    const searchInput = document.getElementById('search-input');

    if (islandFilter) islandFilter.value = '';
    if (activityFilter) activityFilter.value = '';
    if (sortFilter) sortFilter.value = 'quality';
    if (searchInput) searchInput.value = '';

    filterTours();
}

// Quick filter from tags/buttons
function quickFilter(term) {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = term;
    }
    filterTours();

    // Scroll to tours section
    document.getElementById('tours-section')?.scrollIntoView({ behavior: 'smooth' });
}

// Hero search
function executeHeroSearch() {
    const heroSearch = document.getElementById('hero-search');
    if (heroSearch?.value) {
        quickFilter(heroSearch.value);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadTours();

    // Filter change listeners
    document.getElementById('island-filter')?.addEventListener('change', () => {
        const val = document.getElementById('island-filter').value;
        if (val) trackFilterChange('island', val);
        filterTours();
    });
    document.getElementById('activity-filter')?.addEventListener('change', () => {
        const val = document.getElementById('activity-filter').value;
        if (val) trackFilterChange('activity', val);
        filterTours();
    });
    document.getElementById('sort-filter')?.addEventListener('change', () => {
        const val = document.getElementById('sort-filter').value;
        if (val) trackFilterChange('sort', val);
        filterTours();
    });

    // Search input with debounce
    let searchTimeout;
    document.getElementById('search-input')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(filterTours, 300);
    });

    // Hero search enter key
    document.getElementById('hero-search')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            executeHeroSearch();
        }
    });
});

// Mobile menu toggle
document.querySelector('.mobile-menu-btn')?.addEventListener('click', function() {
    document.querySelector('.nav-mobile')?.classList.toggle('active');
    this.classList.toggle('active');
});

// FOMO notifications - DISABLED
// These fake notifications were removed to improve user trust
// Users should see real booking confirmations only

// Weather widget
async function loadWeather() {
    const CACHE_KEY = 'wx-cache-whaw';
    const TTL_MS = 10 * 60 * 1000;
    const weatherEl = document.getElementById('header-weather');
    if (!weatherEl) return;
    try {
        const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
        if (cached && Date.now() - cached.ts < TTL_MS) {
            weatherEl.querySelector('.weather-temp').textContent = `${cached.temp}°F`;
            return;
        }
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=21.31&longitude=-157.86&current_weather=true&temperature_unit=fahrenheit');
        const data = await response.json();
        const temp = Math.round(data.current_weather.temperature);
        weatherEl.querySelector('.weather-temp').textContent = `${temp}°F`;
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ temp, ts: Date.now() }));
    } catch (error) {
        // Silent fail
    }
}

loadWeather();

// Promo Banner
function closeBanner() {
    const banner = document.getElementById('promo-banner');
    if (banner) {
        banner.classList.add('hidden');
        sessionStorage.setItem('promoBannerClosed', 'true');
    }
}

// Check if banner was closed this session
if (sessionStorage.getItem('promoBannerClosed') === 'true') {
    document.addEventListener('DOMContentLoaded', () => {
        const banner = document.getElementById('promo-banner');
        if (banner) banner.classList.add('hidden');
    });
}

// ===== STICKY MOBILE CTA BAR =====
document.addEventListener('DOMContentLoaded', () => {
    const stickyBar = document.getElementById('sticky-cta-bar');
    if (!stickyBar) return;

    const heroSection = document.querySelector('.hero') || document.querySelector('.tours-section');
    let heroScrolled = false;

    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY > (heroSection?.offsetHeight || 300);

        if (scrolled && !heroScrolled) {
            stickyBar.classList.add('visible');
            heroScrolled = true;
        } else if (!scrolled && heroScrolled) {
            stickyBar.classList.remove('visible');
            heroScrolled = false;
        }
    });

    const ctaButton = stickyBar.querySelector('button');
    if (ctaButton) {
        ctaButton.addEventListener('click', () => {
            const toursGrid = document.getElementById('tours-grid');
            if (toursGrid) {
                toursGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
});
