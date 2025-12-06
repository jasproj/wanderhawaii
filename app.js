// ===================================
// WANDERHAWAII V3.0 - FULL FEATURED
// ===================================

let allTours = [];
let displayedTours = [];
let currentPage = 0;
const toursPerPage = 12;

// ===================================
// RANDOMIZATION
// ===================================
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function smartShuffle(tours) {
    // Featured/premium tours (high price + high quality)
    const premiumTours = tours.filter(t => t.priceMax >= 200 && t.quality >= 90);
    const otherTours = tours.filter(t => !(t.priceMax >= 200 && t.quality >= 90));
    
    const shuffledPremium = shuffleArray(premiumTours);
    const shuffledOthers = shuffleArray(otherTours);
    
    const result = [];
    const premiumToShow = Math.min(Math.floor(Math.random() * 3) + 4, shuffledPremium.length);
    
    result.push(...shuffledPremium.slice(0, premiumToShow));
    result.push(...shuffledOthers.slice(0, 12 - premiumToShow));
    
    const remainingPremium = shuffledPremium.slice(premiumToShow);
    const remainingOthers = shuffledOthers.slice(12 - premiumToShow);
    const remaining = shuffleArray([...remainingPremium, ...remainingOthers]);
    result.push(...remaining);
    
    return result;
}

// ===================================
// LOAD TOURS
// ===================================
async function loadTours() {
    try {
        const response = await fetch('tours-data.json');
        allTours = await response.json();
        
        // Randomize on every page load
        allTours = smartShuffle(allTours);
        displayedTours = [...allTours];
        
        renderTours();
        updateStats();
        updateSectionTitle();
        
        console.log('🌺 WanderHawaii loaded! ' + allTours.length + ' tours available.');
    } catch (error) {
        console.error('Error loading tours:', error);
        document.getElementById('tours-grid').innerHTML = 
            '<p class="loading">Loading tours... Please refresh if this persists. 🌴</p>';
    }
}

// ===================================
// RENDER TOURS
// ===================================
function renderTours(append = false) {
    const grid = document.getElementById('tours-grid');
    
    if (!append) {
        grid.innerHTML = '';
        currentPage = 0;
    }
    
    const start = currentPage * toursPerPage;
    const end = start + toursPerPage;
    const toursToShow = displayedTours.slice(start, end);
    
    if (toursToShow.length === 0 && !append) {
        const suggestions = getSearchSuggestions();
        grid.innerHTML = `
            <div class="no-results">
                <h3>🤔 No adventures found!</h3>
                <p>Try searching for:</p>
                <div class="suggestions">
                    ${suggestions.map(s => `<button class="suggestion-pill" onclick="searchFor('${s}')">${s}</button>`).join('')}
                </div>
                <p style="margin-top: 1.5rem;">Or <button onclick="document.getElementById('clear-filters').click()" class="suggestion-pill">clear all filters</button></p>
            </div>
        `;
        document.getElementById('load-more-container').style.display = 'none';
        return;
    }
    
    toursToShow.forEach((tour, index) => {
        const card = createTourCard(tour, start + index);
        grid.appendChild(card);
    });
    
    const loadMoreContainer = document.getElementById('load-more-container');
    if (end < displayedTours.length) {
        loadMoreContainer.style.display = 'block';
    } else {
        loadMoreContainer.style.display = 'none';
    }
    
    updateResultsCount();
}

function createTourCard(tour) {
    const card = document.createElement('article');
    card.className = 'tour-card';
    
    // Badge logic - only special tours get badges, not all
    let badge = '';
    if (tour.tags.includes('Private') && tour.priceMax >= 400) {
        badge = '<div class="tour-badge premium">👑 VIP</div>';
    } else if (tour.quality === 100 && tour.availability > 300) {
        badge = '<div class="tour-badge hot">🔥 HOT!</div>';
    } else if (tour.quality === 100) {
        badge = '<div class="tour-badge top">⭐ TOP RATED</div>';
    } else if (tour.availability > 700) {
        badge = '<div class="tour-badge popular">💎 POPULAR</div>';
    }
    // Note: Most tours won't have badges - that's intentional
    
    const displayTags = tour.tags.slice(0, 3);
    const tagsHTML = displayTags.map(tag => `<span class="tour-tag">${tag}</span>`).join('');
    
    // Price display
    const priceDisplay = `$${tour.priceMin}+`;
    
    card.innerHTML = `
        <div class="tour-image">
            ${tour.image ? `<img src="${tour.image}" alt="${tour.name}" loading="lazy" onerror="this.style.display='none'">` : ''}
            ${badge}
            <div class="tour-price-tag">From ${priceDisplay}</div>
        </div>
        <div class="tour-content">
            <span class="tour-island">📍 ${tour.island}</span>
            <h3>${tour.name}</h3>
            <div class="tour-tags">${tagsHTML}</div>
            <div class="tour-meta">
                <div class="tour-info">
                    ⭐ ${(tour.quality / 20).toFixed(1)} • 🎫 ${tour.availability} spots
                </div>
                <a href="${tour.bookingLink}" target="_blank" rel="noopener" class="book-btn">Book Now</a>
            </div>
        </div>
    `;
    
    card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('book-btn')) {
            window.open(tour.bookingLink, '_blank');
        }
    });
    
    return card;
}

// ===================================
// SEARCH & FILTERS
// ===================================
const searchSynonyms = {
    'fish': 'Fishing', 'fishing': 'Fishing',
    'whale': 'Whale Watch', 'whales': 'Whale Watch',
    'dolphin': 'Dolphin', 'dolphins': 'Dolphin',
    'snorkel': 'Snorkel', 'snorkeling': 'Snorkel',
    'dive': 'Scuba', 'diving': 'Scuba', 'scuba': 'Scuba',
    'surf': 'Surf', 'surfing': 'Surf',
    'kayak': 'Kayak', 'kayaking': 'Kayak',
    'paddle': 'SUP', 'paddleboard': 'SUP',
    'boat': 'Boat Tour', 'cruise': 'Boat Tour',
    'sail': 'Sailing', 'sailing': 'Sailing',
    'hike': 'Hiking', 'hiking': 'Hiking',
    'food': 'Food Tour', 'eat': 'Food Tour',
    'zipline': 'Zipline', 'zip': 'Zipline',
    'helicopter': 'Sightseeing', 'heli': 'Sightseeing',
    'raft': 'Rafting', 'rafting': 'Rafting',
    'turtle': 'Snorkel', 'turtles': 'Snorkel',
    'manta': 'Scuba', 'shark': 'Scuba',
    'private': 'Private', 'vip': 'Private',
    'museum': 'Museum', 'history': 'History Tour',
    'pearl harbor': 'History Tour',
    'farm': 'Farm', 'coffee': 'Farm',
    'luau': 'Events', 'party': 'Events'
};

function applyFilters() {
    let searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    const islandFilter = document.getElementById('island-filter').value;
    const activityFilter = document.getElementById('activity-filter').value;
    const priceFilter = document.getElementById('price-filter').value;
    const sortFilter = document.getElementById('sort-filter').value;
    
    let expandedSearch = searchTerm;
    if (searchSynonyms[searchTerm]) {
        expandedSearch = searchSynonyms[searchTerm].toLowerCase();
    }
    
    displayedTours = allTours.filter(tour => {
        // Search filter
        let matchesSearch = true;
        if (searchTerm) {
            const searchableText = [
                tour.name.toLowerCase(),
                tour.company.toLowerCase(),
                tour.island.toLowerCase(),
                tour.description.toLowerCase(),
                ...tour.tags.map(t => t.toLowerCase())
            ].join(' ');
            
            const searchWords = searchTerm.split(' ').filter(w => w.length > 0);
            const matchesOriginal = searchWords.every(word => searchableText.includes(word));
            const matchesExpanded = searchableText.includes(expandedSearch);
            matchesSearch = matchesOriginal || matchesExpanded;
        }
        
        // Island filter
        const matchesIsland = !islandFilter || tour.island === islandFilter;
        
        // Activity filter
        const matchesActivity = !activityFilter || 
            tour.tags.some(tag => tag.toLowerCase().includes(activityFilter.toLowerCase()));
        
        // Price filter
        let matchesPrice = true;
        if (priceFilter) {
            const [minPrice, maxPrice] = priceFilter.split('-').map(Number);
            matchesPrice = tour.priceMin <= maxPrice && tour.priceMax >= minPrice;
        }
        
        return matchesSearch && matchesIsland && matchesActivity && matchesPrice;
    });
    
    // Sort
    switch(sortFilter) {
        case 'featured':
            displayedTours.sort((a, b) => (b.priceMax * b.quality) - (a.priceMax * a.quality));
            break;
        case 'quality':
            displayedTours.sort((a, b) => b.quality - a.quality);
            break;
        case 'popular':
            displayedTours.sort((a, b) => b.availability - a.availability);
            break;
        case 'price-high':
            displayedTours.sort((a, b) => b.priceMax - a.priceMax);
            break;
        case 'price-low':
            displayedTours.sort((a, b) => a.priceMin - b.priceMin);
            break;
    }
    
    currentPage = 0;
    renderTours();
    
    document.getElementById('tours-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function filterByIsland(island) {
    document.getElementById('island-filter').value = island;
    document.getElementById('activity-filter').value = '';
    document.getElementById('price-filter').value = '';
    document.getElementById('search-input').value = '';
    applyFilters();
}

function getSearchSuggestions() {
    return ['snorkeling', 'boat tour', 'whale watching', 'dolphin', 'kayaking', 'fishing', 'surfing', 'sailing', 'private tour'];
}

function searchFor(term) {
    document.getElementById('search-input').value = term;
    applyFilters();
}

// ===================================
// UI UPDATES
// ===================================
function updateResultsCount() {
    const subtitle = document.getElementById('section-subtitle');
    const total = displayedTours.length;
    
    if (total === allTours.length) {
        subtitle.textContent = `Showing all ${total} adventures across the islands`;
    } else {
        subtitle.textContent = `Found ${total} adventures matching your search`;
    }
}

function updateStats() {
    document.getElementById('total-tours').textContent = `${allTours.length}+`;
    
    const islandCounts = {};
    allTours.forEach(tour => {
        islandCounts[tour.island] = (islandCounts[tour.island] || 0) + 1;
    });
    
    if (document.getElementById('oahu-count')) {
        document.getElementById('oahu-count').textContent = `${islandCounts['Oahu'] || 0} Adventures`;
    }
    if (document.getElementById('maui-count')) {
        document.getElementById('maui-count').textContent = `${islandCounts['Maui'] || 0} Adventures`;
    }
    if (document.getElementById('bigisland-count')) {
        document.getElementById('bigisland-count').textContent = `${islandCounts['Big Island'] || 0} Adventures`;
    }
    if (document.getElementById('kauai-count')) {
        document.getElementById('kauai-count').textContent = `${islandCounts['Kauai'] || 0} Adventures`;
    }
}

function updateSectionTitle() {
    const titles = [
        '🌺 ISLAND ADVENTURES AWAIT 🌺',
        '🌴 YOUR HAWAIIAN JOURNEY STARTS HERE 🌴',
        '🔥 TOP PICKS ACROSS THE ISLANDS 🔥',
        '✨ UNFORGETTABLE EXPERIENCES ✨',
        '🌊 DIVE INTO PARADISE 🌊'
    ];
    
    const idx = Math.floor(Math.random() * titles.length);
    const titleEl = document.getElementById('tours-title');
    if (titleEl) titleEl.textContent = titles[idx];
}

// ===================================
// EVENT LISTENERS
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    loadTours();
    
    // Search
    document.getElementById('search-btn').addEventListener('click', applyFilters);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') applyFilters();
    });
    
    // Filters
    document.getElementById('island-filter').addEventListener('change', applyFilters);
    document.getElementById('activity-filter').addEventListener('change', applyFilters);
    document.getElementById('price-filter').addEventListener('change', applyFilters);
    document.getElementById('sort-filter').addEventListener('change', applyFilters);
    
    // Clear filters
    document.getElementById('clear-filters').addEventListener('click', () => {
        document.getElementById('search-input').value = '';
        document.getElementById('island-filter').value = '';
        document.getElementById('activity-filter').value = '';
        document.getElementById('price-filter').value = '';
        document.getElementById('sort-filter').value = 'featured';
        displayedTours = [...allTours];
        renderTours();
    });
    
    // Carousel pills
    document.querySelectorAll('.carousel-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const searchTerm = pill.dataset.search;
            document.getElementById('search-input').value = searchTerm;
            applyFilters();
        });
    });
    
    // Island cards
    document.querySelectorAll('.island-card').forEach(card => {
        card.addEventListener('click', () => {
            filterByIsland(card.dataset.island);
        });
    });
    
    // Load more
    document.getElementById('load-more-btn').addEventListener('click', () => {
        currentPage++;
        renderTours(true);
    });
    
    // Shuffle
    document.getElementById('shuffle-btn').addEventListener('click', () => {
        allTours = smartShuffle(allTours);
        displayedTours = [...allTours];
        updateSectionTitle();
        renderTours();
        
        const btn = document.getElementById('shuffle-btn');
        btn.textContent = '✨ Refreshed!';
        setTimeout(() => {
            btn.textContent = '🎲 Surprise Me!';
        }, 2000);
    });
    
    // Email form
    document.getElementById('email-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email-input').value;
        alert(`🎉 Mahalo! We'll send amazing deals to ${email}! Check your inbox soon! 🌺`);
        document.getElementById('email-input').value = '';
    });
    
    // Logo click
    document.querySelector('.logo-container').addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

// ===================================
// FOMO NOTIFICATIONS - 4 ROTATING LISTS
// ===================================
const notificationLists = [
    // List 1
    [
        { name: 'Sarah from Tampa', activity: 'sunset sail', emoji: '⛵' },
        { name: 'Mike from Seattle', activity: 'volcano tour', emoji: '🌋' },
        { name: 'Jessica from NYC', activity: 'snorkel adventure', emoji: '🤿' },
        { name: 'David from Boston', activity: 'whale watching', emoji: '🐋' },
        { name: 'Amanda from LA', activity: 'helicopter tour', emoji: '🚁' },
    ],
    // List 2
    [
        { name: 'Ryan from Denver', activity: 'kayak tour', emoji: '🚣' },
        { name: 'Emma from Chicago', activity: 'dolphin swim', emoji: '🐬' },
        { name: 'Chris from Austin', activity: 'manta ray dive', emoji: '🦈' },
        { name: 'Lisa from Miami', activity: 'zipline adventure', emoji: '⚡' },
        { name: 'Tom from Phoenix', activity: 'fishing charter', emoji: '🎣' },
    ],
    // List 3
    [
        { name: 'Jennifer from Portland', activity: 'catamaran cruise', emoji: '🛥️' },
        { name: 'Matt from Atlanta', activity: 'surf lesson', emoji: '🏄' },
        { name: 'Nicole from Dallas', activity: 'food tour', emoji: '🍔' },
        { name: 'Kevin from San Diego', activity: 'scuba diving', emoji: '🤿' },
        { name: 'Rachel from Boston', activity: 'hiking tour', emoji: '🥾' },
    ],
    // List 4
    [
        { name: 'Brandon from Vegas', activity: 'private yacht', emoji: '🛥️' },
        { name: 'Megan from Houston', activity: 'pearl harbor tour', emoji: '📜' },
        { name: 'Tyler from Nashville', activity: 'parasailing', emoji: '🪂' },
        { name: 'Ashley from Orlando', activity: 'eco tour', emoji: '🌿' },
        { name: 'Josh from Philly', activity: 'paddleboard tour', emoji: '🏄' },
    ]
];

let currentListIndex = 0;
let currentNotifIndex = 0;
let isShowingNotifications = true;
let notificationTimer = null;
let pauseTimer = null;

function showNotification(notif) {
    const notificationEl = document.getElementById('notification');
    if (!notificationEl) return;
    
    // Slide out first
    notificationEl.style.transform = 'translateY(100px)';
    notificationEl.style.opacity = '0';
    
    setTimeout(() => {
        document.querySelector('.notification-icon').textContent = notif.emoji;
        document.querySelector('.notification-text').innerHTML = 
            `<strong class="notification-name">${notif.name}</strong> just booked a ${notif.activity}!`;
        
        // Slide in
        notificationEl.style.transform = 'translateY(0)';
        notificationEl.style.opacity = '1';
    }, 300);
}

function hideNotification() {
    const notificationEl = document.getElementById('notification');
    if (!notificationEl) return;
    
    notificationEl.style.transform = 'translateY(100px)';
    notificationEl.style.opacity = '0';
}

function runNotificationCycle() {
    const currentList = notificationLists[currentListIndex];
    
    if (isShowingNotifications) {
        if (currentNotifIndex < currentList.length) {
            showNotification(currentList[currentNotifIndex]);
            currentNotifIndex++;
            notificationTimer = setTimeout(runNotificationCycle, 4000);
        } else {
            // Finished this list, hide and pause
            hideNotification();
            isShowingNotifications = false;
            currentNotifIndex = 0;
            currentListIndex = (currentListIndex + 1) % notificationLists.length;
            pauseTimer = setTimeout(runNotificationCycle, 30000); // 30 sec pause
        }
    } else {
        // Start showing again
        isShowingNotifications = true;
        runNotificationCycle();
    }
}

// Start notifications after 5 seconds
setTimeout(() => {
    runNotificationCycle();
}, 5000);

// Global functions
window.filterByIsland = filterByIsland;
window.searchFor = searchFor;
