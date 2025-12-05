// Load tours data
let allTours = [];
let displayedTours = [];
let currentPage = 0;
const toursPerPage = 12;

// Shuffle array using Fisher-Yates algorithm
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Smart shuffle - keeps some top quality tours near the front
function smartShuffle(tours) {
    // Separate top-tier tours (quality 100) and others
    const topTours = tours.filter(t => t.quality === 100);
    const otherTours = tours.filter(t => t.quality < 100);
    
    // Shuffle both groups
    const shuffledTop = shuffleArray(topTours);
    const shuffledOthers = shuffleArray(otherTours);
    
    // Mix them: Put 3-5 top tours in first 12, rest randomized
    const result = [];
    const topToShow = Math.floor(Math.random() * 3) + 3; // 3-5 random
    
    // Add some top tours to beginning
    result.push(...shuffledTop.slice(0, topToShow));
    
    // Add random others
    result.push(...shuffledOthers.slice(0, 12 - topToShow));
    
    // Mix in remaining top tours randomly throughout
    const remainingTop = shuffledTop.slice(topToShow);
    const remainingOthers = shuffledOthers.slice(12 - topToShow);
    
    // Combine and shuffle the rest
    const remaining = shuffleArray([...remainingTop, ...remainingOthers]);
    result.push(...remaining);
    
    return result;
}

// Update section title with variety
function updateSectionTitle() {
    const titles = [
        '🔥 TODAY\'S HOTTEST PICKS 🔥',
        '⚡ FRESH PICKS FOR YOU ⚡',
        '🌟 DISCOVER THESE GEMS 🌟',
        '🎯 HANDPICKED ADVENTURES 🎯',
        '💎 FEATURED ADVENTURES 💎'
    ];
    
    const subtitles = [
        'Selling out fast!',
        'New selection just for you!',
        'Something amazing awaits!',
        'Your next adventure is here!',
        'Book before they\'re gone!'
    ];
    
    const randomIndex = Math.floor(Math.random() * titles.length);
    document.querySelector('.section-header h2').textContent = titles[randomIndex];
    document.getElementById('section-subtitle').textContent = subtitles[randomIndex];
}

// Load tours from JSON
async function loadTours() {
    try {
        const response = await fetch('tours-data.json');
        allTours = await response.json();
        
        // RANDOMIZE on every page load!
        allTours = smartShuffle(allTours);
        
        displayedTours = [...allTours];
        renderTours();
        updateStats();
        updateSectionTitle();
        
        // Show randomization indicator
        console.log('🎲 Tours randomized! Refresh for different selection.');
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
        // Show helpful suggestions when no results
        const searchTerm = document.getElementById('search-input').value;
        const suggestions = getSearchSuggestions();
        
        grid.innerHTML = `
            <div class="no-results">
                <h3>🤔 No adventures found!</h3>
                <p>Try searching for:</p>
                <div class="suggestions">
                    ${suggestions.map(s => `<button class="suggestion-pill" onclick="searchFor('${s}')">${s}</button>`).join('')}
                </div>
                <p style="margin-top: 2rem;">Or <button onclick="document.getElementById('clear-filters').click()" class="suggestion-pill">clear all filters</button></p>
            </div>
        `;
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

// Get popular search suggestions
function getSearchSuggestions() {
    return [
        'snorkeling', 'helicopter tour', 'surfing', 
        'zipline', 'kayaking', 'sunset cruise',
        'volcano tour', 'scuba diving', 'whale watching'
    ];
}

// Quick search helper
function searchFor(term) {
    document.getElementById('search-input').value = term;
    applyFilters();
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
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    const islandFilter = document.getElementById('island-filter').value;
    const activityFilter = document.getElementById('activity-filter').value;
    const sortFilter = document.getElementById('sort-filter').value;
    
    // Filter tours with ENHANCED SEARCH
    displayedTours = allTours.filter(tour => {
        // If no search term, only apply filters
        if (!searchTerm) {
            const matchesIsland = !islandFilter || tour.island === islandFilter;
            const matchesActivity = !activityFilter || 
                tour.tags.some(tag => tag.toLowerCase().includes(activityFilter.toLowerCase()));
            return matchesIsland && matchesActivity;
        }
        
        // ENHANCED SEARCH: Check multiple fields
        const searchableText = [
            tour.name.toLowerCase(),
            tour.company.toLowerCase(),
            tour.island.toLowerCase(),
            ...tour.tags.map(t => t.toLowerCase())
        ].join(' ');
        
        // Split search term into words for better matching
        const searchWords = searchTerm.split(' ').filter(w => w.length > 0);
        
        // Match if ALL search words are found somewhere in the tour data
        const matchesSearch = searchWords.every(word => searchableText.includes(word));
        
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
    
    // Shuffle button - show different tours!
    document.getElementById('shuffle-btn').addEventListener('click', () => {
        // Re-shuffle all tours
        allTours = smartShuffle(allTours);
        
        // Update section title
        updateSectionTitle();
        
        // Re-apply current filters with new order
        applyFilters();
        
        // Visual feedback
        const btn = document.getElementById('shuffle-btn');
        btn.textContent = '✨ Tours Shuffled!';
        btn.style.background = 'linear-gradient(135deg, var(--sunset-orange), var(--sunset-red))';
        
        setTimeout(() => {
            btn.textContent = '🎲 Show Me Different Tours!';
            btn.style.background = 'linear-gradient(135deg, var(--palm-green), var(--sky-blue))';
        }, 2000);
        
        // Scroll to tours
        document.getElementById('tours-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    document.querySelector('.logo-container').addEventListener('click', () => {
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
