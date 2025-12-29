// WanderHawaii Tours App
// Load tours from JSON and render with descriptions

let toursData = [];
let filteredTours = [];
let displayedCount = 0;
const TOURS_PER_PAGE = 24;

// Load tours data
async function loadTours() {
    try {
        const response = await fetch('tours-data.json');
        toursData = await response.json();
        console.log(`Loaded ${toursData.length} tours`);
        
        // Initial shuffle for randomization
        shuffleArray(toursData);
        filteredTours = [...toursData];
        displayedCount = 0;
        renderTours();
        updateResultsCount();
    } catch (error) {
        console.error('Error loading tours:', error);
        document.getElementById('tours-grid').innerHTML = `
            <div class="error-state">
                <p>Unable to load tours. Please refresh the page.</p>
            </div>
        `;
    }
}

// Fisher-Yates shuffle
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Create tour card HTML
function createTourCard(tour) {
    const tags = tour.tags || [];
    const tagDisplay = tags.slice(0, 3).map(tag => 
        `<span class="tour-tag">${tag}</span>`
    ).join('');
    
    const description = tour.description || '';
    const truncatedDesc = description.length > 120 
        ? description.substring(0, 117) + '...' 
        : description;
    
    const isHighQuality = tour.qualityScore === 100;
    const qualityBadge = isHighQuality 
        ? '<span class="quality-badge">⭐ Top Rated</span>' 
        : '';
    
    return `
        <article class="tour-card" data-id="${tour.id}">
            <div class="tour-image">
                <img src="${tour.image}" alt="${tour.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1507876466758-bc54f384809c?w=400'">
                ${qualityBadge}
            </div>
            <div class="tour-content">
                <div class="tour-meta">
                    <span class="tour-location">📍 ${tour.location}, ${capitalizeIsland(tour.island)}</span>
                </div>
                <h3 class="tour-title">${tour.name}</h3>
                <p class="tour-description">${truncatedDesc}</p>
                <div class="tour-tags">${tagDisplay}</div>
                <div class="tour-footer">
                    <span class="tour-company">${tour.company}</span>
                    <a href="${tour.bookingLink}" target="_blank" rel="noopener" class="tour-book-btn">
                        Book Now →
                    </a>
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
    }
    
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
    shuffleArray(filteredTours);
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
    document.getElementById('island-filter')?.addEventListener('change', filterTours);
    document.getElementById('activity-filter')?.addEventListener('change', filterTours);
    document.getElementById('sort-filter')?.addEventListener('change', filterTours);
    
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

// FOMO notifications
const fomoNames = ['Sarah from California', 'Mike from Texas', 'Emily from New York', 'David from Florida', 'Jessica from Washington', 'Chris from Colorado', 'Amanda from Arizona', 'Ryan from Oregon'];
const fomoActions = ['just booked a snorkel tour!', 'booked a whale watching trip!', 'reserved a helicopter tour!', 'signed up for a luau!', 'booked a manta ray dive!', 'reserved a sunset sail!'];

function showNotification() {
    const notification = document.getElementById('notification');
    const nameEl = document.getElementById('notification-name');
    const actionEl = document.getElementById('notification-action');
    
    if (notification && nameEl && actionEl) {
        nameEl.textContent = fomoNames[Math.floor(Math.random() * fomoNames.length)];
        actionEl.textContent = fomoActions[Math.floor(Math.random() * fomoActions.length)];
        
        notification.classList.add('show');
        setTimeout(() => notification.classList.remove('show'), 4000);
    }
}

// Show FOMO notification periodically
setTimeout(() => {
    showNotification();
    setInterval(showNotification, 45000);
}, 15000);

// Weather widget
async function loadWeather() {
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=21.31&longitude=-157.86&current_weather=true&temperature_unit=fahrenheit');
        const data = await response.json();
        const temp = Math.round(data.current_weather.temperature);
        
        const weatherEl = document.getElementById('header-weather');
        if (weatherEl) {
            weatherEl.querySelector('.weather-temp').textContent = `${temp}°F`;
        }
    } catch (error) {
        console.log('Weather unavailable');
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
