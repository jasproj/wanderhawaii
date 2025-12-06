// ===================================
// WANDERHAWAII V2.0 - FULL FEATURED
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
    const topTours = tours.filter(t => t.quality === 100);
    const otherTours = tours.filter(t => t.quality < 100);
    
    const shuffledTop = shuffleArray(topTours);
    const shuffledOthers = shuffleArray(otherTours);
    
    const result = [];
    const topToShow = Math.floor(Math.random() * 3) + 3;
    
    result.push(...shuffledTop.slice(0, topToShow));
    result.push(...shuffledOthers.slice(0, 12 - topToShow));
    
    const remainingTop = shuffledTop.slice(topToShow);
    const remainingOthers = shuffledOthers.slice(12 - topToShow);
    const remaining = shuffleArray([...remainingTop, ...remainingOthers]);
    result.push(...remaining);
    
    return result;
}

// ===================================
// WEATHER INTEGRATION
// ===================================
const islandCoordinates = {
    'Oahu': { lat: 21.4389, lon: -158.0001 },
    'Maui': { lat: 20.7984, lon: -156.3319 },
    'Big Island': { lat: 19.5429, lon: -155.6659 },
    'Kauai': { lat: 22.0964, lon: -159.5261 }
};

const weatherSuggestions = {
    sunny: [
        "Perfect for snorkeling & beach activities!",
        "Great day for water sports!",
        "Ideal conditions for outdoor adventures!"
    ],
    cloudy: [
        "Good for hiking & sightseeing!",
        "Nice for tours & cultural activities!",
        "Perfect weather for exploring!"
    ],
    rainy: [
        "Try indoor activities or drive to sunny side!",
        "Great for waterfalls & lush scenery!",
        "Museums & luaus are perfect today!"
    ]
};

async function loadWeather() {
    for (const [island, coords] of Object.entries(islandCoordinates)) {
        try {
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`
            );
            const data = await response.json();
            updateWeatherCard(island, data.current);
        } catch (error) {
            console.log(`Weather unavailable for ${island}`);
            setFallbackWeather(island);
        }
    }
}

function updateWeatherCard(island, weather) {
    const islandKey = island.replace(' ', '').toLowerCase();
    const tempEl = document.querySelector(`#weather-${islandKey} .weather-temp`);
    const condEl = document.querySelector(`#weather-${islandKey} .weather-condition`);
    const suggEl = document.getElementById(`suggestion-${islandKey}`);
    
    if (!tempEl) return;
    
    const temp = Math.round(weather.temperature_2m);
    const code = weather.weather_code;
    
    let condition = 'Sunny ☀️';
    let suggestionType = 'sunny';
    
    if (code >= 0 && code <= 1) {
        condition = 'Sunny ☀️';
        suggestionType = 'sunny';
    } else if (code >= 2 && code <= 3) {
        condition = 'Partly Cloudy ⛅';
        suggestionType = 'sunny';
    } else if (code >= 45 && code <= 48) {
        condition = 'Foggy 🌫️';
        suggestionType = 'cloudy';
    } else if (code >= 51 && code <= 67) {
        condition = 'Rainy 🌧️';
        suggestionType = 'rainy';
    } else if (code >= 80 && code <= 82) {
        condition = 'Showers 🌦️';
        suggestionType = 'rainy';
    } else {
        condition = 'Nice ⛅';
        suggestionType = 'cloudy';
    }
    
    tempEl.textContent = `${temp}°F`;
    condEl.textContent = condition;
    
    const suggestions = weatherSuggestions[suggestionType];
    suggEl.textContent = suggestions[Math.floor(Math.random() * suggestions.length)];
}

function setFallbackWeather(island) {
    const islandKey = island.replace(' ', '').toLowerCase();
    const tempEl = document.querySelector(`#weather-${islandKey} .weather-temp`);
    const condEl = document.querySelector(`#weather-${islandKey} .weather-condition`);
    const suggEl = document.getElementById(`suggestion-${islandKey}`);
    
    if (!tempEl) return;
    
    // Typical Hawaii weather
    tempEl.textContent = '78°F';
    condEl.textContent = 'Beautiful ☀️';
    suggEl.textContent = 'Perfect day for any adventure!';
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
    
    let badge = '';
    if (tour.quality === 100) {
        badge = '<div class="tour-badge hot">🌋 HOT!</div>';
    } else if (tour.quality >= 99) {
        badge = '<div class="tour-badge top">⭐ TOP RATED</div>';
    } else if (tour.availability > 500) {
        badge = '<div class="tour-badge popular">🔥 POPULAR</div>';
    }
    
    const displayTags = tour.tags.slice(0, 3);
    const tagsHTML = displayTags.map(tag => `<span class="tour-tag">${tag}</span>`).join('');
    
    card.innerHTML = `
        <div class="tour-image">
            ${tour.image ? `<img src="${tour.image}" alt="${tour.name}" loading="lazy" onerror="this.style.display='none'">` : ''}
            ${badge}
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
function applyFilters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    const islandFilter = document.getElementById('island-filter').value;
    const activityFilter = document.getElementById('activity-filter').value;
    const sortFilter = document.getElementById('sort-filter').value;
    
    displayedTours = allTours.filter(tour => {
        if (!searchTerm) {
            const matchesIsland = !islandFilter || tour.island === islandFilter;
            const matchesActivity = !activityFilter || 
                tour.tags.some(tag => tag.toLowerCase().includes(activityFilter.toLowerCase()));
            return matchesIsland && matchesActivity;
        }
        
        const searchableText = [
            tour.name.toLowerCase(),
            tour.company.toLowerCase(),
            tour.island.toLowerCase(),
            ...tour.tags.map(t => t.toLowerCase())
        ].join(' ');
        
        const searchWords = searchTerm.split(' ').filter(w => w.length > 0);
        const matchesSearch = searchWords.every(word => searchableText.includes(word));
        
        const matchesIsland = !islandFilter || tour.island === islandFilter;
        const matchesActivity = !activityFilter || 
            tour.tags.some(tag => tag.toLowerCase().includes(activityFilter.toLowerCase()));
        
        return matchesSearch && matchesIsland && matchesActivity;
    });
    
    // Sort
    if (sortFilter === 'quality') {
        displayedTours.sort((a, b) => b.quality - a.quality);
    } else if (sortFilter === 'availability') {
        displayedTours.sort((a, b) => b.availability - a.availability);
    }
    
    currentPage = 0;
    renderTours();
    
    document.getElementById('tours-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function filterByIsland(island) {
    document.getElementById('island-filter').value = island;
    document.getElementById('activity-filter').value = '';
    document.getElementById('search-input').value = '';
    applyFilters();
}

function getSearchSuggestions() {
    return ['snorkeling', 'helicopter', 'surfing', 'zipline', 'kayak', 'sunset cruise', 'volcano', 'luau', 'whale watching'];
}

function searchFor(term) {
    document.getElementById('search-input').value = term;
    applyFilters();
}

// ===================================
// UI UPDATES
// ===================================
function updateResultsCount() {
    const count = document.getElementById('results-count');
    const total = displayedTours.length;
    const showing = Math.min((currentPage + 1) * toursPerPage, total);
    
    if (total === allTours.length) {
        count.textContent = `Showing all ${total} adventures`;
    } else {
        count.textContent = `Found ${total} adventures • Showing ${showing}`;
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
        '🔥 TOURS AVAILABLE NOW 🔥',
        '⚡ FRESH PICKS FOR YOU ⚡',
        '🌟 DISCOVER THESE GEMS 🌟',
        '🎯 TODAY\'S TOP ADVENTURES 🎯',
        '💎 HANDPICKED FOR YOU 💎'
    ];
    
    const subtitles = [
        'Book instantly • Free cancellation on most tours',
        'Refreshed just for you!',
        'Something amazing awaits!',
        'Don\'t miss these experiences!',
        'Curated adventures across all islands'
    ];
    
    const idx = Math.floor(Math.random() * titles.length);
    const titleEl = document.getElementById('tours-title');
    const subEl = document.getElementById('section-subtitle');
    
    if (titleEl) titleEl.textContent = titles[idx];
    if (subEl) subEl.textContent = subtitles[idx];
}

// ===================================
// EVENT LISTENERS
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    loadTours();
    loadWeather();
    
    // Search
    document.getElementById('search-btn').addEventListener('click', applyFilters);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') applyFilters();
    });
    
    // Filters
    document.getElementById('island-filter').addEventListener('change', applyFilters);
    document.getElementById('activity-filter').addEventListener('change', applyFilters);
    document.getElementById('sort-filter').addEventListener('change', applyFilters);
    
    // Clear filters
    document.getElementById('clear-filters').addEventListener('click', () => {
        document.getElementById('search-input').value = '';
        document.getElementById('island-filter').value = '';
        document.getElementById('activity-filter').value = '';
        document.getElementById('sort-filter').value = 'popular';
        document.querySelectorAll('.pill').forEach(pill => pill.classList.remove('active'));
        displayedTours = [...allTours];
        renderTours();
    });
    
    // Quick filter pills
    document.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            
            if (pill.dataset.island) {
                document.getElementById('island-filter').value = pill.dataset.island;
            } else if (pill.dataset.tag) {
                document.getElementById('activity-filter').value = pill.dataset.tag;
            }
            applyFilters();
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
        updateSectionTitle();
        applyFilters();
        
        const btn = document.getElementById('shuffle-btn');
        btn.textContent = '✨ Shuffled!';
        setTimeout(() => {
            btn.textContent = '🎲 Show Me Different Tours!';
        }, 2000);
    });
    
    // Island cards
    document.querySelectorAll('.island-card').forEach(card => {
        card.addEventListener('click', () => {
            filterByIsland(card.dataset.island);
        });
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
// FOMO NOTIFICATIONS
// ===================================
const notifications = [
    { name: 'Sarah from Tampa', activity: 'snorkel tour', emoji: '🤿' },
    { name: 'Mike from Seattle', activity: 'helicopter tour', emoji: '🚁' },
    { name: 'Jessica from NYC', activity: 'sunset cruise', emoji: '🌅' },
    { name: 'David from Boston', activity: 'volcano tour', emoji: '🌋' },
    { name: 'Amanda from LA', activity: 'surf lesson', emoji: '🏄' },
    { name: 'Ryan from Denver', activity: 'kayak adventure', emoji: '🚣' },
    { name: 'Emma from Chicago', activity: 'luau experience', emoji: '🌺' },
    { name: 'Chris from Austin', activity: 'manta ray dive', emoji: '🦈' },
    { name: 'Lisa from Miami', activity: 'zipline tour', emoji: '⚡' },
    { name: 'Tom from Phoenix', activity: 'whale watching', emoji: '🐋' }
];

let notificationIndex = 0;
setInterval(() => {
    notificationIndex = (notificationIndex + 1) % notifications.length;
    const notif = notifications[notificationIndex];
    
    const notificationEl = document.getElementById('notification');
    if (!notificationEl) return;
    
    notificationEl.style.animation = 'none';
    setTimeout(() => {
        document.querySelector('.notification-icon').textContent = notif.emoji;
        document.querySelector('.notification-text').innerHTML = 
            `<strong class="notification-name">${notif.name}</strong> just booked a ${notif.activity}!`;
        notificationEl.style.animation = 'notification-slide 0.5s ease-out';
    }, 50);
}, 8000);

// Make filterByIsland available globally for onclick handlers
window.filterByIsland = filterByIsland;
window.searchFor = searchFor;
