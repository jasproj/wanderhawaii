/* ============================================
   WANDERHAWAII.COM - MAIN APPLICATION
   ============================================ */

const CONFIG = {
    toursPerPage: 12,
    fomoInterval: 45000,
    fomoNames: [
        'Sarah from California', 'Mike from Texas', 'Jennifer from New York',
        'David from Florida', 'Lisa from Washington', 'Chris from Colorado',
        'Amanda from Arizona', 'Brian from Oregon', 'Emily from Illinois',
        'Kevin from Georgia', 'Rachel from Ohio', 'Jason from Nevada',
        'Michelle from Virginia', 'Ryan from North Carolina', 'Stephanie from Michigan',
        'Tom from Pennsylvania', 'Katie from Massachusetts', 'Dan from New Jersey'
    ],
    fomoActions: [
        'just booked a snorkel tour!',
        'just booked a whale watching tour!',
        'just booked a boat tour!',
        'just booked a dolphin swim!',
        'just booked a kayak adventure!',
        'just booked a sailing trip!',
        'just booked a scuba dive!',
        'just booked a surf lesson!'
    ]
};

// State
let allTours = [];
let filteredTours = [];
let displayedCount = 0;
let currentFilters = {
    island: '',
    activity: '',
    search: '',
    sort: 'quality'
};

// COMPREHENSIVE Search synonyms - maps user input to tour tags/content
const SYNONYMS = {
    // Water Activities
    'snorkel': ['Snorkel', 'snorkeling', 'reef', 'underwater', 'coral'],
    'scuba': ['Scuba', 'diving', 'dive', 'Free Diving', 'underwater', 'tank'],
    'swim': ['swim', 'swimming', 'snorkel', 'water'],
    
    // Marine Life
    'whale': ['Whale Watch', 'whale watching', 'whales', 'humpback', 'cetacean'],
    'dolphin': ['Dolphin', 'dolphins', 'swim with dolphins', 'spinner', 'pod'],
    'manta': ['manta', 'manta ray', 'night snorkel', 'night dive', 'kona'],
    'turtle': ['turtle', 'sea turtle', 'honu', 'green sea'],
    'shark': ['shark', 'shark dive', 'cage'],
    'fish': ['Fishing', 'fish', 'deep sea', 'sportfishing', 'charter'],
    
    // Boat Types
    'boat': ['Boat Tour', 'Boat Rental', 'cruise', 'vessel', 'charter'],
    'sail': ['Sailing', 'Catamaran', 'sail', 'sailboat', 'yacht'],
    'catamaran': ['Catamaran', 'cat', 'sailing'],
    'raft': ['Rafting', 'raft', 'zodiac', 'inflatable'],
    'kayak': ['Kayak', 'kayaking', 'paddle', 'paddling', 'outrigger'],
    'canoe': ['Canoe', 'outrigger', 'paddle', 'traditional'],
    'sup': ['SUP', 'stand up paddle', 'paddleboard', 'paddle board'],
    'jet': ['jet ski', 'jetski', 'waverunner', 'watercraft'],
    
    // Air Activities
    'helicopter': ['Air Tour', 'Air Activities', 'helicopter', 'heli', 'aerial', 'flight', 'chopper'],
    'skydive': ['skydive', 'skydiving', 'parachute', 'tandem'],
    'parasail': ['Parasail', 'parasailing', 'parachute'],
    'glider': ['glider', 'gliding', 'soar'],
    
    // Land Activities
    'hike': ['Hiking', 'hike', 'trek', 'trail', 'Walking Tour', 'walk', 'nature walk'],
    'zipline': ['Zipline', 'zip line', 'ziplining', 'zip', 'canopy'],
    'atv': ['ATV/UTV', 'atv', 'utv', 'off road', 'offroad', '4x4', 'quad'],
    'bike': ['Bike', 'Bike Tour', 'Bike Rental', 'bicycle', 'cycling', 'ebike', 'e-bike'],
    'horse': ['Horse', 'horseback', 'riding', 'ranch', 'pony'],
    'golf': ['Golf', 'golfing', 'course'],
    
    // Tours & Experiences
    'food': ['Food Tour', 'food', 'culinary', 'tasting', 'dining', 'eat', 'restaurant'],
    'farm': ['Farm', 'coffee', 'plantation', 'agricultural', 'chocolate', 'pineapple', 'macadamia'],
    'coffee': ['coffee', 'kona coffee', 'farm', 'plantation', 'roast'],
    'luau': ['luau', 'feast', 'traditional', 'hawaiian show', 'hula', 'dinner show'],
    'history': ['History Tour', 'historical', 'pearl harbor', 'cultural', 'heritage'],
    'pearl': ['pearl harbor', 'arizona', 'memorial', 'ww2', 'wwii', 'military'],
    'photo': ['Photography Tour', 'photo', 'photography', 'instagram', 'pictures'],
    'eco': ['Eco Tour', 'eco', 'nature', 'wildlife', 'environmental', 'green'],
    'wildlife': ['Wildlife', 'nature', 'animals', 'birds', 'sanctuary'],
    
    // Time of Day
    'sunset': ['sunset', 'evening', 'Dinner Boat', 'dusk', 'golden hour'],
    'sunrise': ['sunrise', 'morning', 'dawn', 'early'],
    'night': ['night', 'evening', 'stargazing', 'manta', 'after dark', 'nocturnal'],
    
    // Experience Types
    'private': ['Private', 'exclusive', 'charter', 'vip', 'custom', 'personalized'],
    'family': ['family', 'kids', 'children', 'kid friendly', 'all ages'],
    'romantic': ['romantic', 'couples', 'honeymoon', 'anniversary', 'proposal'],
    'adventure': ['adventure', 'extreme', 'thrill', 'adrenaline', 'exciting'],
    'relaxing': ['relaxing', 'peaceful', 'calm', 'serene', 'gentle'],
    'luxury': ['luxury', 'premium', 'upscale', 'high end', 'deluxe'],
    
    // Locations
    'volcano': ['volcano', 'lava', 'kilauea', 'volcanoes', 'crater', 'caldera'],
    'waterfall': ['waterfall', 'falls', 'cascade', 'hana'],
    'beach': ['beach', 'shore', 'sand', 'coast', 'bay'],
    'mountain': ['mountain', 'mauna kea', 'haleakala', 'summit', 'peak'],
    'canyon': ['canyon', 'waimea', 'gorge'],
    'napali': ['napali', 'na pali', 'coast', 'cliff'],
    'hana': ['hana', 'road to hana', 'waterfall'],
    'molokini': ['molokini', 'crater', 'snorkel'],
    'kealakekua': ['kealakekua', 'captain cook', 'bay', 'monument'],
    'waikiki': ['waikiki', 'honolulu', 'diamond head'],
    'north shore': ['north shore', 'haleiwa', 'pipeline', 'surf'],
    
    // Surf
    'surf': ['Surf', 'surfing', 'wave', 'waves', 'lesson', 'board', 'longboard'],
    'beginner': ['beginner', 'lesson', 'learn', 'first time', 'intro'],
    
    // Transportation
    'bus': ['Bus Tour', 'bus', 'coach', 'van'],
    'shuttle': ['Shuttle', 'transfer', 'transportation', 'pickup'],
    'jeep': ['Jeep', 'off road', '4x4']
};

// Location keywords for smarter matching
const LOCATION_KEYWORDS = {
    'oahu': ['oahu', 'honolulu', 'waikiki', 'pearl harbor', 'north shore', 'diamond head', 'hanauma', 'kailua'],
    'maui': ['maui', 'lahaina', 'kihei', 'hana', 'haleakala', 'molokini', 'kapalua', 'wailea'],
    'big island': ['big island', 'hawaii island', 'kona', 'hilo', 'volcano', 'kilauea', 'kohala', 'waimea'],
    'kauai': ['kauai', 'napali', 'na pali', 'waimea canyon', 'poipu', 'hanalei', 'lihue', 'princeville']
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    setupEventListeners();
    await loadTours();
    initMobileMenu();
    initStickyHeader();
    initMobileCTA();
    initFOMO();
    checkURLParams();
}

// ============================================
// LOAD TOURS
// ============================================

async function loadTours() {
    try {
        const response = await fetch('tours-data.json');
        if (!response.ok) throw new Error('Failed to load tours');
        
        allTours = await response.json();
        filteredTours = [...allTours];
        displayTours();
        updateResultsCount();
        
    } catch (error) {
        console.error('Error loading tours:', error);
        showErrorState();
    }
}

// ============================================
// DISPLAY
// ============================================

function displayTours(reset = true) {
    const grid = document.getElementById('tours-grid');
    if (!grid) return;
    
    if (reset) {
        grid.innerHTML = '';
        displayedCount = 0;
    }
    
    const toursToShow = filteredTours.slice(displayedCount, displayedCount + CONFIG.toursPerPage);
    
    if (filteredTours.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">🏝️</div>
                <h3>No adventures found</h3>
                <p>Try adjusting your filters or search terms</p>
                <button class="btn-secondary" onclick="clearAllFilters()">Clear All Filters</button>
            </div>
        `;
        hideLoadMore();
        return;
    }
    
    toursToShow.forEach((tour, index) => {
        const card = createTourCard(tour, displayedCount + index);
        grid.appendChild(card);
    });
    
    displayedCount += toursToShow.length;
    
    if (displayedCount >= filteredTours.length) {
        hideLoadMore();
    } else {
        showLoadMore();
    }
    
    lazyLoadImages();
}

function createTourCard(tour, index) {
    const card = document.createElement('div');
    card.className = 'tour-card';
    card.style.animationDelay = `${(index % CONFIG.toursPerPage) * 50}ms`;
    
    const badge = getBadge(tour);
    const tags = (tour.tags || []).slice(0, 3);
    const imageUrl = tour.image || 'https://images.unsplash.com/photo-1507876466758-bc54f384809c?w=400';
    
    // Format island name
    const islandDisplay = tour.island === 'big island' ? 'Big Island' : 
                          tour.island.charAt(0).toUpperCase() + tour.island.slice(1);
    
    card.innerHTML = `
        <div class="tour-image">
            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect fill='%23e5e5e5' width='400' height='300'/%3E%3C/svg%3E" 
                 data-src="${imageUrl}" 
                 alt="${tour.name}"
                 loading="lazy"
                 onerror="this.src='https://images.unsplash.com/photo-1507876466758-bc54f384809c?w=400'">
            ${badge ? `<span class="tour-badge ${badge.class}">${badge.text}</span>` : ''}
            <span class="tour-island">${islandDisplay}</span>
        </div>
        <div class="tour-content">
            <div class="tour-company">${tour.company || 'Local Operator'}</div>
            <h3 class="tour-name">${tour.name}</h3>
            <div class="tour-tags">
                ${tags.map(tag => `<span class="tour-tag">${tag}</span>`).join('')}
            </div>
            <div class="tour-footer">
                <a href="${tour.bookingLink}" target="_blank" rel="noopener" class="tour-book-btn">
                    Book Now →
                </a>
            </div>
        </div>
    `;
    
    return card;
}

function getBadge(tour) {
    if (tour.qualityScore >= 95) {
        return { text: '⭐ Top Rated', class: 'top-rated' };
    }
    if (tour.qualityScore >= 85) {
        return { text: '🔥 Popular', class: 'popular' };
    }
    return null;
}

// ============================================
// FILTERING & SEARCH
// ============================================

function setupEventListeners() {
    const islandFilter = document.getElementById('island-filter');
    const activityFilter = document.getElementById('activity-filter');
    const sortFilter = document.getElementById('sort-filter');
    const searchInput = document.getElementById('search-input');
    const heroSearch = document.getElementById('hero-search');
    
    if (islandFilter) {
        islandFilter.addEventListener('change', (e) => {
            currentFilters.island = e.target.value;
            applyFilters();
        });
    }
    
    if (activityFilter) {
        activityFilter.addEventListener('change', (e) => {
            currentFilters.activity = e.target.value;
            applyFilters();
        });
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', (e) => {
            currentFilters.sort = e.target.value;
            applyFilters();
        });
    }
    
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentFilters.search = e.target.value.toLowerCase().trim();
                applyFilters();
            }, 300);
        });
    }
    
    if (heroSearch) {
        heroSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                executeHeroSearch();
            }
        });
    }
    
    // Email form
    const emailForm = document.getElementById('email-form');
    if (emailForm) {
        emailForm.addEventListener('submit', handleEmailSubmit);
    }
}

function applyFilters() {
    filteredTours = allTours.filter(tour => {
        // Island filter
        if (currentFilters.island && tour.island !== currentFilters.island) {
            return false;
        }
        
        // Activity filter (match tag)
        if (currentFilters.activity) {
            const hasTag = tour.tags && tour.tags.some(tag => 
                tag.toLowerCase().includes(currentFilters.activity.toLowerCase()) ||
                currentFilters.activity.toLowerCase().includes(tag.toLowerCase())
            );
            if (!hasTag) return false;
        }
        
        // Search filter
        if (currentFilters.search) {
            const searchMatch = matchesSearch(tour, currentFilters.search);
            if (!searchMatch) return false;
        }
        
        return true;
    });
    
    sortTours();
    displayTours(true);
    updateResultsCount();
}

function matchesSearch(tour, search) {
    const searchLower = search.toLowerCase().trim();
    
    // Build comprehensive tour text for searching
    const tourText = [
        tour.name,
        tour.company || '',
        tour.island,
        tour.location || '',
        (tour.tags || []).join(' ')
    ].join(' ').toLowerCase();
    
    // Split search into individual words for multi-term matching
    const searchWords = searchLower.split(/\s+/).filter(w => w.length > 1);
    
    // Expand each word with synonyms
    let allSearchTerms = new Set([searchLower]);
    
    searchWords.forEach(word => {
        allSearchTerms.add(word);
        
        // Check each synonym category
        Object.entries(SYNONYMS).forEach(([key, values]) => {
            // If the word matches the key or any synonym value
            if (key.includes(word) || word.includes(key) || 
                values.some(v => v.toLowerCase().includes(word) || word.includes(v.toLowerCase()))) {
                allSearchTerms.add(key);
                values.forEach(v => allSearchTerms.add(v.toLowerCase()));
            }
        });
        
        // Check location keywords for island matching
        Object.entries(LOCATION_KEYWORDS).forEach(([island, keywords]) => {
            if (keywords.some(k => k.includes(word) || word.includes(k))) {
                keywords.forEach(k => allSearchTerms.add(k));
            }
        });
    });
    
    // Convert to array and check if ANY term matches
    const termsArray = Array.from(allSearchTerms);
    
    // For single word searches, just check if it appears anywhere
    if (searchWords.length === 1) {
        return termsArray.some(term => tourText.includes(term));
    }
    
    // For multi-word searches, check if the original phrase OR all individual words match
    if (tourText.includes(searchLower)) {
        return true; // Exact phrase match
    }
    
    // Check if most search words appear (fuzzy multi-word match)
    const matchCount = searchWords.filter(word => {
        // Word matches directly or via synonyms
        const wordTerms = [word];
        Object.entries(SYNONYMS).forEach(([key, values]) => {
            if (key.includes(word) || word.includes(key)) {
                wordTerms.push(key, ...values.map(v => v.toLowerCase()));
            }
        });
        return wordTerms.some(t => tourText.includes(t));
    }).length;
    
    // Return true if at least 60% of words match (allows some flexibility)
    return matchCount >= Math.ceil(searchWords.length * 0.6);
}

// Smart search suggestions based on what user is typing
function getSearchSuggestions(input) {
    const inputLower = input.toLowerCase();
    const suggestions = [];
    
    Object.keys(SYNONYMS).forEach(key => {
        if (key.includes(inputLower) || SYNONYMS[key].some(v => v.toLowerCase().includes(inputLower))) {
            suggestions.push(key);
        }
    });
    
    return suggestions.slice(0, 5);
}

function sortTours() {
    switch (currentFilters.sort) {
        case 'name':
            filteredTours.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'quality':
        default:
            filteredTours.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
            break;
    }
}

function clearAllFilters() {
    currentFilters = {
        island: '',
        activity: '',
        search: '',
        sort: 'quality'
    };
    
    const islandFilter = document.getElementById('island-filter');
    const activityFilter = document.getElementById('activity-filter');
    const sortFilter = document.getElementById('sort-filter');
    const searchInput = document.getElementById('search-input');
    
    if (islandFilter) islandFilter.value = '';
    if (activityFilter) activityFilter.value = '';
    if (sortFilter) sortFilter.value = 'quality';
    if (searchInput) searchInput.value = '';
    
    filteredTours = [...allTours];
    sortTours();
    displayTours(true);
    updateResultsCount();
}

function quickFilter(term) {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = term;
    }
    currentFilters.search = term.toLowerCase();
    applyFilters();
    scrollToTours();
}

function executeHeroSearch() {
    const heroSearch = document.getElementById('hero-search');
    const searchInput = document.getElementById('search-input');
    
    if (heroSearch && heroSearch.value) {
        const value = heroSearch.value.toLowerCase().trim();
        if (searchInput) searchInput.value = value;
        currentFilters.search = value;
        applyFilters();
        scrollToTours();
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function updateResultsCount() {
    const countEl = document.getElementById('results-count');
    if (countEl) {
        countEl.textContent = `Showing ${filteredTours.length} adventure${filteredTours.length !== 1 ? 's' : ''}`;
    }
}

function loadMoreTours() {
    displayTours(false);
}

function shuffleTours() {
    filteredTours = filteredTours.sort(() => Math.random() - 0.5);
    displayTours(true);
}

function scrollToTours() {
    const toursSection = document.getElementById('tours-section');
    if (toursSection) {
        const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
        const top = toursSection.offsetTop - headerHeight - 20;
        window.scrollTo({ top, behavior: 'smooth' });
    }
}

function showLoadMore() {
    const btn = document.getElementById('load-more');
    if (btn) btn.style.display = 'inline-flex';
}

function hideLoadMore() {
    const btn = document.getElementById('load-more');
    if (btn) btn.style.display = 'none';
}

function showErrorState() {
    const grid = document.getElementById('tours-grid');
    if (grid) {
        grid.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">😔</div>
                <h3>Unable to load adventures</h3>
                <p>Please refresh the page to try again</p>
                <button class="btn-secondary" onclick="location.reload()">Refresh Page</button>
            </div>
        `;
    }
}

// ============================================
// LAZY LOADING
// ============================================

function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            });
        }, { rootMargin: '100px' });
        
        images.forEach(img => observer.observe(img));
    } else {
        images.forEach(img => {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        });
    }
}

// ============================================
// MOBILE MENU
// ============================================

function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const mobileNav = document.querySelector('.nav-mobile');
    
    if (menuBtn && mobileNav) {
        menuBtn.addEventListener('click', () => {
            mobileNav.classList.toggle('active');
            menuBtn.classList.toggle('active');
        });
        
        mobileNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileNav.classList.remove('active');
                menuBtn.classList.remove('active');
            });
        });
    }
}

// ============================================
// STICKY HEADER
// ============================================

function initStickyHeader() {
    const header = document.querySelector('.header');
    if (!header) return;
    
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }, { passive: true });
}

// ============================================
// MOBILE CTA
// ============================================

function initMobileCTA() {
    const cta = document.getElementById('mobile-cta');
    const hero = document.querySelector('.hero');
    
    if (!cta || !hero) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                cta.classList.add('visible');
            } else {
                cta.classList.remove('visible');
            }
        });
    }, { threshold: 0 });
    
    observer.observe(hero);
}

// ============================================
// FOMO NOTIFICATIONS
// ============================================

function initFOMO() {
    setTimeout(showFOMO, 5000);
    setInterval(showFOMO, CONFIG.fomoInterval);
}

function showFOMO() {
    const notification = document.getElementById('notification');
    const nameEl = document.getElementById('notification-name');
    const actionEl = document.getElementById('notification-action');
    
    if (!notification || !nameEl || !actionEl) return;
    
    const name = CONFIG.fomoNames[Math.floor(Math.random() * CONFIG.fomoNames.length)];
    const action = CONFIG.fomoActions[Math.floor(Math.random() * CONFIG.fomoActions.length)];
    
    nameEl.textContent = name;
    actionEl.textContent = action;
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

// ============================================
// EMAIL SIGNUP
// ============================================

function handleEmailSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const emailInput = form.querySelector('input[type="email"]');
    const button = form.querySelector('button');
    
    if (!emailInput || !emailInput.value) return;
    
    emailInput.disabled = true;
    button.disabled = true;
    button.textContent = 'Joining...';
    
    setTimeout(() => {
        form.innerHTML = `
            <div style="color: white; text-align: center; padding: 1rem;">
                <strong>🎉 Mahalo!</strong><br>
                Check your inbox for your free Hawaii guide.
            </div>
        `;
    }, 1000);
}

// ============================================
// URL PARAMETERS
// ============================================

function checkURLParams() {
    const params = new URLSearchParams(window.location.search);
    
    const island = params.get('island');
    const activity = params.get('activity');
    const search = params.get('q');
    
    if (island) {
        currentFilters.island = island.toLowerCase();
        const islandFilter = document.getElementById('island-filter');
        if (islandFilter) islandFilter.value = island.toLowerCase();
    }
    
    if (activity) {
        currentFilters.activity = activity;
        const activityFilter = document.getElementById('activity-filter');
        if (activityFilter) activityFilter.value = activity;
    }
    
    if (search) {
        currentFilters.search = search.toLowerCase();
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = search;
    }
    
    if (island || activity || search) {
        applyFilters();
    }
}

// ============================================
// GLOBAL FUNCTIONS
// ============================================

window.quickFilter = quickFilter;
window.clearAllFilters = clearAllFilters;
window.shuffleTours = shuffleTours;
window.loadMoreTours = loadMoreTours;
window.scrollToTours = scrollToTours;
window.executeHeroSearch = executeHeroSearch;
