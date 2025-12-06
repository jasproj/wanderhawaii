// WANDERHAWAII - CLEAN FINAL VERSION

let allTours = [];
let displayedTours = [];
let currentPage = 0;
const toursPerPage = 12;

// Shuffle array
function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Load tours
async function loadTours() {
    try {
        const response = await fetch('tours-data.json');
        allTours = await response.json();
        allTours = shuffleArray(allTours);
        displayedTours = [...allTours];
        renderTours();
        updateIslandCounts();
    } catch (error) {
        document.getElementById('tours-grid').innerHTML = '<p class="loading">Error loading tours. Please refresh.</p>';
    }
}

// Render tours
function renderTours(append = false) {
    const grid = document.getElementById('tours-grid');
    
    if (!append) {
        grid.innerHTML = '';
        currentPage = 0;
    }
    
    const start = currentPage * toursPerPage;
    const end = start + toursPerPage;
    const toShow = displayedTours.slice(start, end);
    
    if (toShow.length === 0 && !append) {
        grid.innerHTML = `
            <div class="no-results">
                <h3>No adventures found</h3>
                <p>Try different filters:</p>
                <div class="suggestions">
                    <button class="suggestion-pill" onclick="searchFor('snorkel')">Snorkeling</button>
                    <button class="suggestion-pill" onclick="searchFor('whale')">Whales</button>
                    <button class="suggestion-pill" onclick="searchFor('boat')">Boat Tours</button>
                    <button class="suggestion-pill" onclick="clearFilters()">Clear All</button>
                </div>
            </div>
        `;
        document.getElementById('load-more-container').style.display = 'none';
        return;
    }
    
    toShow.forEach(tour => grid.appendChild(createTourCard(tour)));
    
    document.getElementById('load-more-container').style.display = 
        end < displayedTours.length ? 'block' : 'none';
    
    updateResultsCount();
}

// Create tour card
function createTourCard(tour) {
    const card = document.createElement('article');
    card.className = 'tour-card';
    
    // Badge - only for special tours
    let badge = '';
    if (tour.tags.includes('Private') && tour.quality === 100) {
        badge = '<div class="tour-badge vip">👑 VIP</div>';
    } else if (tour.quality === 100 && tour.availability > 500) {
        badge = '<div class="tour-badge hot">🔥 HOT</div>';
    } else if (tour.availability > 800) {
        badge = '<div class="tour-badge popular">⭐ POPULAR</div>';
    }
    
    const tags = tour.tags.slice(0, 3).map(t => `<span class="tour-tag">${t}</span>`).join('');
    const price = `$${tour.priceMin}+`;
    
    card.innerHTML = `
        <div class="tour-image">
            ${tour.image ? `<img src="${tour.image}" alt="${tour.name}" loading="lazy" onerror="this.style.display='none'">` : ''}
            ${badge}
            <div class="tour-price">From ${price}</div>
        </div>
        <div class="tour-content">
            <span class="tour-island">📍 ${tour.island}</span>
            <h3>${tour.name}</h3>
            <div class="tour-tags">${tags}</div>
            <div class="tour-meta">
                <span class="tour-info">⭐ ${(tour.quality/20).toFixed(1)} • ${tour.availability} spots</span>
                <a href="${tour.bookingLink}" target="_blank" class="book-btn">Book Now</a>
            </div>
        </div>
    `;
    
    card.onclick = (e) => {
        if (!e.target.classList.contains('book-btn')) {
            window.open(tour.bookingLink, '_blank');
        }
    };
    
    return card;
}

// Filters
function applyFilters() {
    const search = document.getElementById('search-input').value.toLowerCase().trim();
    const island = document.getElementById('island-filter').value;
    const activity = document.getElementById('activity-filter').value;
    const price = document.getElementById('price-filter').value;
    const sort = document.getElementById('sort-filter').value;
    
    displayedTours = allTours.filter(tour => {
        // Search
        if (search) {
            const text = `${tour.name} ${tour.company} ${tour.island} ${tour.tags.join(' ')}`.toLowerCase();
            if (!text.includes(search)) return false;
        }
        
        // Island
        if (island && tour.island !== island) return false;
        
        // Activity
        if (activity && !tour.tags.some(t => t.toLowerCase().includes(activity.toLowerCase()))) return false;
        
        // Price
        if (price) {
            const [min, max] = price.split('-').map(Number);
            if (tour.priceMin > max || tour.priceMax < min) return false;
        }
        
        return true;
    });
    
    // Sort
    switch(sort) {
        case 'price-low':
            displayedTours.sort((a, b) => a.priceMin - b.priceMin);
            break;
        case 'price-high':
            displayedTours.sort((a, b) => b.priceMax - a.priceMax);
            break;
        case 'popular':
            displayedTours.sort((a, b) => b.availability - a.availability);
            break;
        default: // featured
            displayedTours.sort((a, b) => (b.quality * b.priceMax) - (a.quality * a.priceMax));
    }
    
    renderTours();
    document.getElementById('tours-section').scrollIntoView({ behavior: 'smooth' });
}

function filterByIsland(island) {
    document.getElementById('island-filter').value = island;
    applyFilters();
}

function searchFor(term) {
    document.getElementById('search-input').value = term;
    applyFilters();
}

function clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('island-filter').value = '';
    document.getElementById('activity-filter').value = '';
    document.getElementById('price-filter').value = '';
    document.getElementById('sort-filter').value = 'featured';
    displayedTours = shuffleArray([...allTours]);
    renderTours();
}

// Update counts
function updateResultsCount() {
    document.getElementById('results-count').textContent = 
        `Showing ${Math.min(displayedTours.length, (currentPage + 1) * toursPerPage)} of ${displayedTours.length} adventures`;
}

function updateIslandCounts() {
    const counts = { Oahu: 0, Maui: 0, 'Big Island': 0, Kauai: 0 };
    allTours.forEach(t => counts[t.island]++);
    
    document.getElementById('oahu-count').textContent = `${counts.Oahu} Adventures`;
    document.getElementById('maui-count').textContent = `${counts.Maui} Adventures`;
    document.getElementById('bigisland-count').textContent = `${counts['Big Island']} Adventures`;
    document.getElementById('kauai-count').textContent = `${counts.Kauai} Adventures`;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadTours();
    
    // Search
    document.getElementById('search-btn').onclick = applyFilters;
    document.getElementById('search-input').onkeypress = (e) => {
        if (e.key === 'Enter') applyFilters();
    };
    
    // Filters
    document.getElementById('island-filter').onchange = applyFilters;
    document.getElementById('activity-filter').onchange = applyFilters;
    document.getElementById('price-filter').onchange = applyFilters;
    document.getElementById('sort-filter').onchange = applyFilters;
    document.getElementById('clear-filters').onclick = clearFilters;
    
    // Carousel pills
    document.querySelectorAll('.carousel-pill').forEach(pill => {
        pill.onclick = () => searchFor(pill.dataset.search);
    });
    
    // Island cards
    document.querySelectorAll('.island-card').forEach(card => {
        card.onclick = () => filterByIsland(card.dataset.island);
    });
    
    // Load more
    document.getElementById('load-more-btn').onclick = () => {
        currentPage++;
        renderTours(true);
    };
    
    // Shuffle
    document.getElementById('shuffle-btn').onclick = () => {
        displayedTours = shuffleArray(displayedTours);
        renderTours();
    };
    
    // Email
    document.getElementById('email-form').onsubmit = (e) => {
        e.preventDefault();
        alert('Mahalo! You\'ll receive our best deals soon! 🌺');
        document.getElementById('email-input').value = '';
    };
    
    // Logo
    document.querySelector('.logo-container').onclick = (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
});

// Notifications
const notifications = [
    ['Sarah from Tampa', 'sunset sail'],
    ['Mike from Seattle', 'volcano tour'],
    ['Jessica from NYC', 'snorkel trip'],
    ['David from Boston', 'whale watching'],
    ['Amanda from LA', 'helicopter tour'],
    ['Ryan from Denver', 'kayak tour'],
    ['Emma from Chicago', 'dolphin swim'],
    ['Chris from Austin', 'manta dive'],
    ['Lisa from Miami', 'zipline'],
    ['Tom from Phoenix', 'fishing trip']
];

let notifIndex = 0;
let notifVisible = true;
let notifCount = 0;

function showNotification() {
    const el = document.getElementById('notification');
    const [name, activity] = notifications[notifIndex];
    
    el.querySelector('.notification-name').textContent = name;
    el.querySelector('.notification-text').innerHTML = `<strong class="notification-name">${name}</strong> just booked a ${activity}!`;
    
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
    
    notifIndex = (notifIndex + 1) % notifications.length;
    notifCount++;
    
    // After showing 5, hide for 30 seconds
    if (notifCount >= 5) {
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            notifCount = 0;
            setTimeout(showNotification, 30000);
        }, 4000);
    } else {
        setTimeout(showNotification, 5000);
    }
}

setTimeout(showNotification, 3000);

// Global
window.filterByIsland = filterByIsland;
window.searchFor = searchFor;
window.clearFilters = clearFilters;
