// Load tours data
let allTours = [];
let displayedTours = [];
let currentPage = 0;
const toursPerPage = 12;

// Load tours from JSON
async function loadTours() {
    try {
        const response = await fetch('tours-data.json');
        allTours = await response.json();
        displayedTours = [...allTours];
        renderTours();
        updateStats();
    } catch (error) {
        console.error('Error loading tours:', error);
        document.getElementById('tours-grid').innerHTML = '<p class="loading">Oops! Adventures taking a break. Refresh to try again! 🌴</p>';
    }
}

// Render tours to the grid
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
        grid.innerHTML = '<p class="loading">No adventures found! Try different filters 🤔</p>';
        document.getElementById('load-more-container').style.display = 'none';
        return;
    }
    
    toursToShow.forEach((tour, index) => {
        const card = createTourCard(tour, start + index);
        grid.appendChild(card);
    });
    
    // Show/hide load more button
    const loadMoreContainer = document.getElementById('load-more-container');
    if (end < displayedTours.length) {
        loadMoreContainer.style.display = 'block';
    } else {
        loadMoreContainer.style.display = 'none';
    }
    
    // Update results count
    updateResultsCount();
}

// Create a tour card element
function createTourCard(tour, index) {
    const card = document.createElement('div');
    card.className = 'tour-card';
    card.setAttribute('data-tour-id', tour.id);
    
    // Determine badge
    let badge = '';
    if (tour.quality === 100) {
        badge = '<div class="tour-badge hot">🌋 HOT!</div>';
    } else if (tour.quality >= 99) {
        badge = '<div class="tour-badge">⭐ TOP RATED!</div>';
    } else if (tour.availability > 500) {
        badge = '<div class="tour-badge">💎 POPULAR!</div>';
    }
    
    // Get first few tags
    const displayTags = tour.tags.slice(0, 3);
    const tagsHTML = displayTags.map(tag => `<span class="tour-tag">${tag}</span>`).join('');
    
    card.innerHTML = `
        <div class="tour-image">
            ${tour.image ? `<img src="${tour.image}" alt="${tour.name}" onerror="this.style.display='none'">` : ''}
            ${badge}
        </div>
        <div class="tour-content">
            <span class="tour-island">📍 ${tour.island}</span>
            <h3>${tour.name}</h3>
            <div class="tour-tags">${tagsHTML}</div>
            <div class="tour-meta">
                <div class="tour-info">
                    <div>⭐ ${(tour.quality / 20).toFixed(1)} Rating</div>
                    <div>🎫 ${tour.availability} spots</div>
                </div>
                <a href="${tour.bookingLink}" target="_blank" rel="noopener" class="book-btn">Book It!</a>
            </div>
        </div>
    `;
    
    // Add click event to whole card
    card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('book-btn')) {
            window.open(tour.bookingLink, '_blank');
        }
    });
    
    return card;
}

// Filter and search functions
function applyFilters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const islandFilter = document.getElementById('island-filter').value;
    const activityFilter = document.getElementById('activity-filter').value;
    const sortFilter = document.getElementById('sort-filter').value;
    
    // Filter tours
    displayedTours = allTours.filter(tour => {
        const matchesSearch = !searchTerm || 
            tour.name.toLowerCase().includes(searchTerm) ||
            tour.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
            tour.island.toLowerCase().includes(searchTerm);
        
        const matchesIsland = !islandFilter || tour.island === islandFilter;
        
        const matchesActivity = !activityFilter || 
            tour.tags.some(tag => tag.toLowerCase().includes(activityFilter.toLowerCase()));
        
        return matchesSearch && matchesIsland && matchesActivity;
    });
    
    // Sort tours
    if (sortFilter === 'quality') {
        displayedTours.sort((a, b) => b.quality - a.quality);
    } else if (sortFilter === 'availability') {
        displayedTours.sort((a, b) => b.availability - a.availability);
    } else {
        // Default: popular (by quality + availability)
        displayedTours.sort((a, b) => (b.quality + b.availability) - (a.quality + a.availability));
    }
    
    currentPage = 0;
    renderTours();
    
    // Scroll to results
    document.getElementById('tours-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateResultsCount() {
    const resultsCount = document.getElementById('results-count');
    const total = displayedTours.length;
    const showing = Math.min((currentPage + 1) * toursPerPage, total);
    
    if (total === allTours.length) {
        resultsCount.textContent = `Showing all ${total} adventures`;
    } else {
        resultsCount.textContent = `Found ${total} adventures • Showing ${showing}`;
    }
}

function updateStats() {
    document.getElementById('total-tours').textContent = `${allTours.length}+`;
    
    // Update island counts
    const islandCounts = {};
    allTours.forEach(tour => {
        islandCounts[tour.island] = (islandCounts[tour.island] || 0) + 1;
    });
    
    document.getElementById('oahu-count').textContent = `${islandCounts['Oahu'] || 0} Adventures`;
    document.getElementById('maui-count').textContent = `${islandCounts['Maui'] || 0} Adventures`;
    document.getElementById('bigisland-count').textContent = `${islandCounts['Big Island'] || 0} Adventures`;
    document.getElementById('kauai-count').textContent = `${islandCounts['Kauai'] || 0} Adventures`;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadTours();
    
    // Search button
    document.getElementById('search-btn').addEventListener('click', applyFilters);
    
    // Search on Enter key
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    });
    
    // Filter changes
    document.getElementById('island-filter').addEventListener('change', applyFilters);
    document.getElementById('activity-filter').addEventListener('change', applyFilters);
    document.getElementById('sort-filter').addEventListener('change', applyFilters);
    
    // Clear filters
    document.getElementById('clear-filters').addEventListener('click', () => {
        document.getElementById('search-input').value = '';
        document.getElementById('island-filter').value = '';
        document.getElementById('activity-filter').value = '';
        document.getElementById('sort-filter').value = 'popular';
        
        // Remove active class from pills
        document.querySelectorAll('.pill').forEach(pill => pill.classList.remove('active'));
        
        applyFilters();
    });
    
    // Quick filter pills
    document.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', () => {
            // Toggle active state
            pill.classList.toggle('active');
            
            // Apply filter
            if (pill.dataset.island) {
                const currentIsland = document.getElementById('island-filter').value;
                document.getElementById('island-filter').value = 
                    pill.classList.contains('active') ? pill.dataset.island : '';
            } else if (pill.dataset.tag) {
                const currentActivity = document.getElementById('activity-filter').value;
                document.getElementById('activity-filter').value = 
                    pill.classList.contains('active') ? pill.dataset.tag : '';
            }
            
            applyFilters();
        });
    });
    
    // Load more button
    document.getElementById('load-more-btn').addEventListener('click', () => {
        currentPage++;
        renderTours(true);
    });
    
    // Island cards
    document.querySelectorAll('.island-card').forEach(card => {
        card.addEventListener('click', () => {
            const island = card.dataset.island;
            document.getElementById('island-filter').value = island;
            applyFilters();
        });
    });
    
    // Email form
    document.getElementById('email-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email-input').value;
        alert(`🎉 Awesome! We'll send epic deals to ${email}! Check your inbox soon! 🌺`);
        document.getElementById('email-input').value = '';
    });
    
    // Logo click - scroll to top
    document.querySelector('.logo').addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

// FOMO Notifications
const notifications = [
    { name: 'Sarah from Tampa', activity: 'snorkel tour', emoji: '🤿' },
    { name: 'Mike from Seattle', activity: 'zipline adventure', emoji: '⚡' },
    { name: 'Jessica from NYC', activity: 'sunset cruise', emoji: '🌅' },
    { name: 'David from Boston', activity: 'helicopter tour', emoji: '🚁' },
    { name: 'Amanda from LA', activity: 'surf lesson', emoji: '🏄' },
    { name: 'Ryan from Denver', activity: 'volcano tour', emoji: '🌋' },
    { name: 'Emma from Portland', activity: 'kayak adventure', emoji: '🚣' },
    { name: 'Chris from Austin', activity: 'luau experience', emoji: '🌺' }
];

let notificationIndex = 0;
setInterval(() => {
    notificationIndex = (notificationIndex + 1) % notifications.length;
    const notif = notifications[notificationIndex];
    
    const notificationEl = document.getElementById('notification');
    notificationEl.style.animation = 'none';
    setTimeout(() => {
        document.querySelector('.notification-icon').textContent = notif.emoji;
        document.querySelector('.notification-text').innerHTML = 
            `<strong class="notification-name">${notif.name}</strong> just booked a ${notif.activity}!`;
        notificationEl.style.animation = 'notification-bounce 0.6s ease-out';
    }, 50);
}, 8000);
