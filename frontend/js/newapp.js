// Naco - Modern Artisan Finder App
// Complete JavaScript implementation with React-like patterns

import * as API from '../../api/mock-api.js';
import { pb } from '../../api/mock-api.js';

class NacoApp {
  constructor() {
    this.state = {
      user: null,
      artisans: [],
      filteredArtisans: [],
      featuredArtisans: [],
      searchQuery: '',
      selectedCity: '',
      cities: [],
      favorites: new Set(),
      notifications: [],
      notificationCount: 0,
      isSearchActive: false,
      isDarkMode: false,
      isNavOpen: false,
      isProfileDropdownOpen: false,
      deferredPrompt: null,
      currentLocation: null,
      notificationsPoller: null,
      isLoading: false
    };

    this.debounceTimers = new Map();
    this.init();
  }

  // Utility Methods
  $(selector) { return document.querySelector(selector); }
  $$(selector) { return Array.from(document.querySelectorAll(selector)); }

  debounce(fn, delay = 300) {
    const key = fn.toString();
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }
    const timer = setTimeout(fn, delay);
    this.debounceTimers.set(key, timer);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} fade-in`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
      z-index: 1000;
      max-width: 300px;
    `;
    
    if (type === 'success') toast.style.borderLeftColor = 'var(--green)';
    if (type === 'error') toast.style.borderLeftColor = '#ef4444';
    
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // State Management
  setState(updates) {
    Object.assign(this.state, updates);
    this.render();
  }

 /** updateState(key, value) {
    this.state[key] = value;
    this.render();
  }**/
  
  updateState(key, value) {
  if (this.state[key] === value) return; // no change → skip
  this.state[key] = value;

  // Update only what’s needed
  switch (key) {
    case "searchResults":
      this.renderSearchResults();
      break;
    case "notifications":
      this.updateNotificationBadge(); // 🔥 Only badge re-renders
      break;
    case "theme":
      this.loadTheme(); 
      break;
    case "favorites":
      this.loadFavorites();
      break;
    default:
      // For major changes, fall back to full render
      this.render();
  }
}

  // Initialization
  async init() {
    try {
      this.setState({ isLoading: true });
      
      this.bindEventListeners();
      
      this.loadSession();
      this.loadTheme();
      this.loadFavorites();
      
      await this.loadArtisans();
      this.loadArtisansWithRatings();
      this.tryGetLocation();
      this.setupInstallPrompt();
      await this.registerServiceWorker();
      
      if (this.state.user) {
        await this.requestNotificationPermission();
        this.startNotificationPolling();
      }
      
      this.render();
      this.setState({ isLoading: false });
      
      this.handleNotificationFromURL();
      
    } catch (error) {
      console.error('App initialization failed:', error);
      this.setState({ isLoading: false });
      this.showToast('Failed to initialize app', 'error');
    }
  }

  // Event Binding
  bindEventListeners() {
    // Header events
    this.$('#search-input')?.addEventListener('click', () => this.openSearchPage());
    this.$('#notif-btn')?.addEventListener('click', () => this.openNotificationsPage());
    this.$('#profile-btn')?.addEventListener('click', () => this.openProfilePage());
    this.$('#menu-btn')?.addEventListener('click', () => this.toggleSideMenu());
    
       // In bindEventListeners():
document.addEventListener('click', (e) => {
  if (e.target.closest('#login-btn') || e.target.closest('.login-trigger')) {
    e.preventDefault();
    this.openLoginModal();
  }
});

this.$('#view-all-featured')?.addEventListener('click', () => this.showAllFeaturedArtisans());

// Add this method:




    // Page close buttons
    this.$('#close-search')?.addEventListener('click', () => this.closeSearchPage());
    this.$('#close-notifications')?.addEventListener('click', () => this.closeNotificationsPage());
    this.$('#close-profile')?.addEventListener('click', () => this.closeProfilePage());
    this.$('#edit-profile')?.addEventListener('click', () => this.openProfileUpdate());

    // Main search input
    this.$('#main-search-input')?.addEventListener('input', (e) => {
      this.debounce(() => this.handleMainSearch(e.target.value), 250);
    });
    this.$('#clear-search')?.addEventListener('click', () => this.clearMainSearch());

    // Notifications page
    this.$('#mark-all-read')?.addEventListener('click', () => this.markAllNotificationsRead());

    // Role switch
    this.$('#roleSwitch')?.addEventListener('change', (e) => this.handleRoleSwitch(e));

    // Search and filters
    this.$('#search-clear')?.addEventListener('click', () => this.clearSearch());
    this.$('#city-select')?.addEventListener('change', (e) => this.handleCityFilter(e.target.value));

    // FAB
    this.$('#fab-book')?.addEventListener('click', () => this.handleFabClick());

    // Install button
    this.$('#install-btn')?.addEventListener('click', () => this.installApp());

    // View all featured
    this.$('#view-all-featured')?.addEventListener('click', () => this.viewAllFeatured());

    // Modal background click
    this.$('#modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.hideModal();
    });

    // Global event listeners
    document.addEventListener('click', (e) => this.handleGlobalClick(e));
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('beforeinstallprompt', (e) => this.handleInstallPrompt(e));

    // Event delegation for dynamic content
    this.bindDynamicEvents();
  }

  bindDynamicEvents() {
    const main = document.querySelector('main');
    
    if (main) {
      main.addEventListener('click', (e) => {
        // Featured artisans
        const featCard = e.target.closest('#featured-list .feat-card');
        if (featCard) {
          e.preventDefault();
          e.stopPropagation();
          const artisanId = featCard.dataset.id;
          if (artisanId) this.openArtisanProfile(artisanId);
          return;
        }
        
        document.addEventListener('click', (e) => {
  const artisanCard = e.target.closest('.artisan-card');
  if (artisanCard) {
    e.preventDefault();
    const artisanId = artisanCard.dataset.id;
    
    if (e.target.closest('.btn-book')) {
      this.openBookingForm(artisanId);
    } else if (e.target.closest('.btn-fav')) {
      this.toggleFavorite(artisanId);
    } else if (e.target.closest('.btn-wa')) {
      this.openWhatsApp(artisanId);
    } else {
      this.openArtisanProfile(artisanId);
    }
  }
});  


        // Main search results
        const artisanCard = e.target.closest('#results-list .artisan-card');
        if (artisanCard) {
          e.preventDefault();
          e.stopPropagation();
          const artisanId = artisanCard.dataset.id;
          
          if (e.target.closest('.btn-book')) {
            this.openBookingForm(artisanId);
          } else if (e.target.closest('.btn-fav')) {
            this.toggleFavorite(artisanId);
          } else if (e.target.closest('.btn-wa')) {
            this.openWhatsApp(artisanId);
          } else {
            this.openArtisanProfile(artisanId);
          }
          return;
        }

        // Quick categories
        const chip = e.target.closest('#quick-cats .chip');
        if (chip) {
          const category = chip.dataset.cat;
          if (category) {
            this.setState({ searchQuery: category, isSearchActive: true });
            this.handleSearch(category);
          }
          return;
        }

        // Search page categories
        const searchChip = e.target.closest('#search-quick-cats .search-chip');
        if (searchChip) {
          const category = searchChip.dataset.cat;
          if (category) {
            this.$('#main-search-input').value = category;
            this.handleMainSearch(category);
          }
          return;
        }
      });
    }

    // Search results page
    const searchPage = this.$('#search-page');
    if (searchPage) {
      searchPage.addEventListener('click', (e) => {
        const resultCard = e.target.closest('.search-result-card');
        if (resultCard) {
          e.preventDefault();
          e.stopPropagation();
          const artisanId = resultCard.dataset.id;
          this.closeSearchPage();
          setTimeout(() => {
            this.openArtisanProfile(artisanId);
          }, 350);
        }
      });
    }

    // Notifications page
    const notifPage = this.$('#notifications-page');
    if (notifPage) {
      notifPage.addEventListener('click', (e) => {
        const notifItem = e.target.closest('.notification-item');
        if (notifItem) {
          e.preventDefault();
          e.stopPropagation();
          const notificationId = notifItem.dataset.id;
          this.handleNotificationClick(notificationId);
        }
      });
    }

    // Profile page
    const profilePage = this.$('#profile-page');
    if (profilePage) {
      profilePage.addEventListener('click', (e) => {
        const target = e.target.closest('[id]');
        if (!target) return;

        e.preventDefault();
        e.stopPropagation();

        switch (target.id) {
          case 'login-from-profile':
            this.closeProfilePage();
            this.openLoginModal();
            break;
          case 'profile-bookings':
            this.closeProfilePage();
            if (this.state.user?.role === 'artisan') {
              this.openMyClients();
            } else {
              this.openMyBookings();
            }
            break;
          case 'profile-favorites':
            this.closeProfilePage();
            this.openFavorites();
            break;
          case 'profile-clients':
            this.closeProfilePage();
            this.openMyClients();
            break;
          case 'profile-settings':
            this.closeProfilePage();
            this.openSettings();
            break;
          case 'profile-upgrade':
            this.closeProfilePage();
            this.openPremiumUpgrade();
            break;
          case 'profile-theme':
            this.toggleTheme();
            this.showToast('Theme updated', 'success');
            break;
          case 'profile-logout':
            this.logout();
            this.closeProfilePage();
            break;
        }

        if (target.id === 'profile-role-switch') {
          this.handleRoleSwitch({ target });
        }
      });
    }

    // Modal delegation
    const modal = this.$('#modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        const target = e.target;
        
        if (target.id === 'book-artisan') {
          const artisanId = target.dataset.artisanId;
          if (!this.state.user) {
            this.hideModal();
            this.openLoginModal();
            return;
          }
          this.openBookingForm(artisanId);
        }

        if (target.id === 'save-artisan') {
          const artisanId = target.dataset.artisanId;
          if (!this.state.user) {
            this.hideModal();
            this.openLoginModal();
            return;
          }
          this.toggleFavorite(artisanId);
        }

        if (target.id === 'chat-artisan') {
          const artisanId = target.dataset.artisanId;
          this.openWhatsApp(artisanId);
        }

        if (target.id === 'confirm-booking') {
          const artisanId = target.dataset.artisanId;
          this.handleBookingConfirmationById(artisanId);
        }
      });
    }
  }


// Handle class main visibility
  updateMainVisibility() {
    const mainElement = this.$('.hero');
    if (!mainElement) return;
    
    // Toggle visibility based on user auth state
    mainElement.classList.toggle('hidden', !!this.state.user);
  }
    
 /**   async showAllFeaturedArtisans() {
  try {
    const featured = this.state.artisans.filter(a => a.premium);
    
    const html = `
      <div class="featured-modal">
        <h2>Featured Artisans</h2>
        <div class="featured-grid">
          ${featured.map(artisan => `
            <div class="featured-card" data-id="${artisan.id}">
              <img src="${artisan.photo || 'default-profile.jpg'}" alt="${artisan.name}">
              <h3>${artisan.name}</h3>
              <p>${artisan.skill}</p>
              <button class="btn-view-profile" data-id="${artisan.id}">View Profile</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.showModal(html, () => {
      this.$$('.btn-view-profile').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          this.hideModal();
          setTimeout(() => this.openArtisanProfile(id), 300);
        });
      });
    });
  } catch (error) {
    console.error('Failed to load featured artisans:', error);
    this.showToast('Failed to load featured artisans', 'error');
  }
}**/

renderNotificationItem(notification) {
  return `
    <div class="notification-item ${notification.read ? 'read' : 'unread'}" data-id="${notification.id}">
      <div class="notification-icon">
        <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
      </div>
      <div class="notification-content">
        <h4>${this.escapeHtml(notification.title)}</h4>
        <p>${this.escapeHtml(notification.message)}</p>
        <span class="notification-time">${new Date(notification.created).toLocaleString()}</span>
      </div>
    </div>
  `;
}

async handleNotificationClick(notificationId) {
  const notification = this.state.notifications.find(n => n.id === notificationId);
  
  // Mark as read
  if (notification && !notification.read) {
    try {
      await pb.collection('notifications').update(notificationId, { read: true });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }
  
  // Navigate to relevant page
  if (notification?.data?.bookingId) {
    this.closeNotificationsPage();
    setTimeout(() => {
      this.openBookingDetails(notification.data.bookingId);
    }, 300);
  }
}

// Profile Page Functions
async openProfilePage() {
  const profilePage = this.$('#profile-page');
  profilePage.classList.remove('hidden');
  setTimeout(() => {
    profilePage.classList.add('active');
  }, 10);
  
  await this.loadProfilePage();
}

closeProfilePage() {
  const profilePage = this.$('#profile-page');
  profilePage.classList.remove('active');
  setTimeout(() => {
    profilePage.classList.add('hidden');
  }, 300);
}
    
    
  // Search Functions
/**  async handleMainSearch(query) {
  // Don't clear if query is empty - let user type
  if (!query || query.trim().length === 0) {
    this.$('#clear-search')?.classList.add('hidden');
    this.$('#search-results-container')?.classList.add('hidden');
    return;
  }

  // Only search if query is at least 2 characters
  if (query.trim().length < 2) {
    return;
  }

  const resultsContainer = this.$('#search-results-container');
  const resultsList = this.$('#search-results-list');
  const clearBtn = this.$('#clear-search');
  
  if (!resultsContainer || !resultsList) return;

  try {
    clearBtn?.classList.remove('hidden');
    resultsContainer.classList.remove('hidden');
    
    const city = this.$('#search-city-select')?.value || '';
    const results = await this.withRetry(() => API.searchArtisans(query, city));
    
    if (results.length > 0) {
      resultsList.innerHTML = results.map(artisan => 
        this.renderSearchResultCard(artisan, query)
      ).join('');

    } else {
      resultsList.innerHTML = `<p class="muted">No results found for "${this.escapeHtml(query)}"</p>`;
    }
  } catch (error) {
    console.error('Search failed:', error);
    resultsList.innerHTML = '<p class="muted">Search error. Please try again.</p>';
  }
}**/

// Update your clearMainSearch function to not interfere with typing
clearMainSearch() {
  const searchInput = this.$('#main-search-input');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus(); // Keep focus after clearing
  }
  this.$('#clear-search')?.classList.add('hidden');
  this.$('#search-results-container')?.classList.add('hidden');
}

// Update your search input event binding
bindSearchEvents() {
  const searchInput = this.$('#main-search-input');
  if (searchInput) {
    // Remove any existing listeners
    searchInput.removeEventListener('input', this.searchInputHandler);
    
    // Create bound handler to preserve 'this' context
    this.searchInputHandler = (e) => {
      const value = e.target.value;
      this.debounce(() => this.handleMainSearch(value), 300);
    };
    
    searchInput.addEventListener('input', this.searchInputHandler);
  }
  
  this.bindEvent('#clear-search', 'click', () => this.clearMainSearch());
  this.bindEvent('#close-search', 'click', () => this.closeSearchPage());
}

generateSearchSuggestion(query) {
  // Common profession spellings and corrections
  const corrections = {
    'electrcian': 'electrician',
    'elctrician': 'electrician',
    'beuty': 'beauty',
    'beatician': 'beautician',
    'mecanic': 'mechanic',
    'plumer': 'plumber',
    'carpentr': 'carpenter',
    'tailr': 'tailor',
    'brog': 'prog', // Example from your question
    'bright': 'wright' // Example from your question
  };
  
  const lowercaseQuery = query.toLowerCase();
  
  // Check direct corrections first
  if (corrections[lowercaseQuery]) {
    return corrections[lowercaseQuery];
  }
  
  // Fuzzy search implementation with typo tolerance
function applyFuzzySearch(artisans, searchTerm) {
  const results = artisans.map(artisan => {
    const profile = artisan.expand?.artisan_profiles_via_user?.[0] || {};
    
    // Fields to search in
    const searchableFields = {
      name: artisan.name || '',
      skill: profile.skill || artisan.skill || '',
      description: profile.description || artisan.description || '',
      location: artisan.location || '',
      specialties: (profile.specialties || artisan.specialties || []).join(' ')
    };
    
    let relevanceScore = 0;
    let matchedFields = [];
    
    // Calculate relevance score
    Object.entries(searchableFields).forEach(([field, value]) => {
      const fieldValue = value.toLowerCase();
      const score = calculateFieldRelevance(fieldValue, searchTerm);
      
      if (score > 0) {
        relevanceScore += score * getFieldWeight(field);
        matchedFields.push(field);
      }
    });
    
    return {
      ...artisan,
      relevanceScore,
      matchedFields
    };
  })
  .filter(artisan => artisan.relevanceScore > 0)
  .sort((a, b) => {
    // Sort by premium first, then relevance score
    if (a.premium && !b.premium) return -1;
    if (!a.premium && b.premium) return 1;
    return b.relevanceScore - a.relevanceScore;
  });
  
  return results;
}

function calculateFieldRelevance(fieldValue, searchTerm) {
  let score = 0;
  
  // Exact match (highest score)
  if (fieldValue.includes(searchTerm)) {
    score += 100;
  }
  
  // Word matches
  const searchWords = searchTerm.split(' ').filter(word => word.length >= 2);
  searchWords.forEach(word => {
    if (fieldValue.includes(word)) {
      score += 50;
    }
  });
  
  // Fuzzy matching for typos (using simple edit distance)
  const words = fieldValue.split(' ');
  words.forEach(word => {
    if (word.length >= 3) {
      const similarity = calculateSimilarity(word, searchTerm);
      if (similarity > 0.7) { // 70% similarity threshold
        score += Math.round(similarity * 30);
      }
      
      // Check similarity with individual search words
      searchWords.forEach(searchWord => {
        if (searchWord.length >= 3) {
          const wordSimilarity = calculateSimilarity(word, searchWord);
          if (wordSimilarity > 0.7) {
            score += Math.round(wordSimilarity * 25);
          }
        }
      });
    }
  });
  
  return score;
}

function getFieldWeight(field) {
  const weights = {
    name: 3.0,
    skill: 2.5,
    specialties: 2.0,
    location: 1.5,
    description: 1.0
  };
  return weights[field] || 1.0;
}

// Simple Levenshtein distance-based similarity
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}
       
  
  // Find closest match using similarity
  const commonTerms = Object.keys(corrections).concat(Object.values(corrections));
  let bestMatch = '';
  let bestSimilarity = 0;
  
  commonTerms.forEach(term => {
    const similarity = calculateSimilarity(lowercaseQuery, term.toLowerCase());
    if (similarity > bestSimilarity && similarity > 0.6) {
      bestSimilarity = similarity;
      bestMatch = term;
    }
  });
  
  return bestMatch || null;
}

  async handleMainSearch(query) {
    const resultsContainer = this.$('#search-results-container');
    const resultsList = this.$('#search-results-list');
    const clearBtn = this.$('#clear-search');
    
    if (query.trim()) {
      clearBtn?.classList.remove('hidden');
      resultsContainer?.classList.remove('hidden');
      
      try {
        const city = this.$('#search-city-select')?.value || '';
        const results = await API.searchArtisans(query, city);
        
        if (results.length > 0) {
          resultsList.innerHTML = results.map(artisan => this.renderSearchResultCard(artisan)).join('');
        } else {
          resultsList.innerHTML = '<p class="muted">No artisans found for your search.</p>';
        }
      } catch (error) {
        console.error('Search failed:', error);
        resultsList.innerHTML = '<p class="muted">Error searching artisans. Please try again.</p>';
      }
    } else {
      clearBtn?.classList.add('hidden');
      resultsContainer?.classList.add('hidden');
    }
  }
  
  async loadArtisansWithRatings() {
  try {
    const artisans = await API.getArtisans();
    
    // Get ALL reviews for ALL artisans in ONE API call
    const allReviews = await pb.collection('reviews').getFullList({
      // No filter - get all reviews
    });
    
    // Group reviews by artisan ID
    const reviewsByArtisan = {};
    allReviews.forEach(review => {
      const artisanId = review.artisan; // or review.artisan.id depending on your schema
      if (!reviewsByArtisan[artisanId]) {
        reviewsByArtisan[artisanId] = [];
      }
      reviewsByArtisan[artisanId].push(review);
    });
    
    // Calculate ratings for each artisan
    const artisansWithRatings = artisans.map(artisan => {
      const artisanReviews = reviewsByArtisan[artisan.id] || [];
      
      const averageRating = artisanReviews.length > 0 
        ? (artisanReviews.reduce((sum, review) => sum + review.rating, 0) / artisanReviews.length)
        : 0;

      return {
        ...artisan,
        rating: averageRating,
        reviewCount: artisanReviews.length
      };
    });

    this.state.filteredArtisans = artisansWithRatings;
    this.renderSearchResults();
    
  } catch (error) {
    console.error('Error loading artisans with ratings:', error);
    // Fallback - load without ratings
    this.state.filteredArtisans = await this.loadArtisansWithRatings();
    this.renderSearchResults();
  }
}

   

// Helper method for batch processing
async processBatch(items, batchSize, processor) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  return results;
}


renderSearchResultCard(artisan) {
  // No API call here - just use the pre-calculated rating
  const averageRating = (artisan.rating || 0).toFixed(1);
  const reviewCount = artisan.reviewCount || 0;

  return `
    <div class="search-result-card" data-id="${artisan.id}">
      <img style="width: 100px; height: 100px;" src="${artisan.photo || '../assets/avatar-placeholder.png'}" 
           alt="${this.escapeHtml(artisan.name)}"
           onerror="this.src='../assets/avatar-placeholder.png'">
      <div class="search-result-info">
        <h4>${this.escapeHtml(artisan.name)} ${this.renderVerificationBadge(artisan)}</h4>
        <p class="search-result-skill">${this.escapeHtml(artisan.skill)}</p>
        <p class="search-result-location">${this.escapeHtml(artisan.location)}</p>
        <div class="search-result-rating">
          <i class="fas fa-star"></i> ${averageRating} (${reviewCount} reviews)
          ${artisan.premium ? '<span class="premium-badge">PREMIUM</span>' : ''}
        </div>
      </div>
      <div class="search-result-price">
        ${this.formatCurrency(artisan.rate)}
      </div>
    </div>
  `;
}


/**renderSearchResultCard(artisan, searchQuery) {
  const highlightText = (text, query) => {
    if (!query || !text) return text;
    const words = query.split(' ').filter(w => w.length >= 2);
    let highlighted = text;
    
    words.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });
    
    return highlighted;
  };

  const profile = artisan.expand?.artisan_profiles_via_user?.[0] || {};
  
  return `
    <div class="search-result-card" data-id="${artisan.id}">
      <img style="max-width: 120px; max-height: 120px;" src="${artisan.photo || '../assets/avatar-placeholder.png'}" 
           alt="${this.escapeHtml(artisan.name)}"
           onerror="this.src='../assets/avatar-placeholder.png'">
      <div class="search-result-info">
        <h4>${highlightText(this.escapeHtml(artisan.name), searchQuery)} ${this.renderVerificationBadge(artisan)}</h4>
        <p class="search-result-skill">${highlightText(this.escapeHtml(profile.skill || artisan.skill || ''), searchQuery)}</p>
        <p class="search-result-location">${this.escapeHtml(artisan.location)}</p>
        <div class="search-result-rating">
          <i class="fas fa-star"></i> ${(artisan.rating || 0).toFixed(1)}
          ${artisan.premium ? '<span class="premium-badge">PREMIUM</span>' : ''}
          ${artisan.matchedFields ? `<small class="matched-in">Found in: ${artisan.matchedFields.join(', ')}</small>` : ''}
        </div>
      </div>
      <div class="search-result-price">
        ${this.formatCurrency(profile.rate || artisan.rate || 0)}
      </div>
    </div>
  `;
}**/
 

  clearMainSearch() {
    this.$('#main-search-input').value = '';
    this.$('#clear-search')?.classList.add('hidden');
    this.$('#search-results-container')?.classList.add('hidden');
  }

  // Page Navigation
  openSearchPage() {
    const searchPage = this.$('#search-page');
    if (!searchPage) {
      console.error('Search page element not found');
      return;
    }
    
    searchPage.classList.remove('hidden');
    setTimeout(() => {
      searchPage.classList.add('active');
      this.$('#main-search-input')?.focus();
    }, 10);
    
    this.populateSearchCategories();
    this.buildCitySelect();
  }

  closeSearchPage() {
    const searchPage = this.$('#search-page');
    if (!searchPage) return;
    
    searchPage.classList.remove('active');
    setTimeout(() => {
      searchPage.classList.add('hidden');
      this.clearMainSearch();
    }, 300);
  }

  populateSearchCategories() {
    const container = this.$('#search-quick-cats');
    if (!container) return;

    const categories = [
      { name: 'Electrician', icon: 'fas fa-bolt' },
      { name: 'Plumber', icon: 'fas fa-wrench' },
      { name: 'Tailor', icon: 'fas fa-cut' },
      { name: 'Mechanic', icon: 'fas fa-car' },
      { name: 'Beautician', icon: 'fas fa-spa' },
      { name: 'Carpenter', icon: 'fas fa-hammer' }
    ];

    container.innerHTML = categories.map(category => `
      <button class="search-chip" data-cat="${category.name}">
        <i class="${category.icon}"></i> ${category.name}
      </button>
    `).join('');
  }

  // Data Loading
  async loadArtisans() {
    try {
      const artisans = await API.getArtisans();
      const cities = [...new Set(artisans.map(a => a.location).filter(Boolean))];
      
      this.setState({
        artisans,
        filteredArtisans: artisans,
        cities,
        featuredArtisans: artisans.filter(a => a.premium).slice(0, 8)
      });

      this.buildCitySelect();
    } catch (error) {
      console.error('Failed to load artisans:', error);
      this.showToast('Failed to load artisans', 'error');
    }
  }

  buildCitySelect() {
    const selects = ['#city-select', '#search-city-select'];
    
    selects.forEach(selector => {
      const select = this.$(selector);
      if (!select) return;

      const options = [
        '<option value="">All Cities</option>',
        ...this.state.cities.map(city => 
          `<option value="${this.escapeHtml(city)}">${this.escapeHtml(city)}</option>`
        )
      ];

      select.innerHTML = options.join('');
      if (this.state.selectedCity) {
        select.value = this.state.selectedCity;
      }
    });
  }

  // Location Services
  tryGetLocation() {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude } = position.coords;
        let city = 'Lagos'; // default
        
        if (latitude > 9) city = 'Abuja';
        else if (latitude < 5) city = 'Port Harcourt';
        
        this.setState({ 
          currentLocation: { latitude, longitude: position.coords.longitude },
          selectedCity: city 
        });
        
        if (this.$('#city-select')) {
          this.$('#city-select').value = city;
        }
        
        this.applyFilters();
      },
      (error) => {
        console.warn('Location access denied:', error);
      }
    );
  }
  
  // Handle class main visibility
  updateMainVisibility() {
    const mainElement = this.$('.hero');
    if (!mainElement) return;
    
    // Toggle visibility based on user auth state
    mainElement.classList.toggle('hidden', !!this.state.user);
  }

  // Search and Filtering
  async handleSearch(query) {
    this.setState({ searchQuery: query, isSearchActive: query.length > 0 });
    
    if (query.trim()) {
      try {
        const results = await API.searchArtisans(query, this.state.selectedCity);
        this.setState({ filteredArtisans: results });
      } catch (error) {
        console.error('Search failed:', error);
        this.setState({ filteredArtisans: [] });
      }
    } else {
      this.applyFilters();
    }

    this.updateSearchUI();
  }

  clearSearch() {
    this.$('#search-input').value = '';
    this.setState({ searchQuery: '', isSearchActive: false });
    this.applyFilters();
    this.updateSearchUI();
    this.$('#search-input').focus();
  }

  handleCityFilter(city) {
    this.setState({ selectedCity: city });
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.state.artisans];

    if (this.state.selectedCity) {
      filtered = filtered.filter(a => a.location === this.state.selectedCity);
    }

    filtered.sort((a, b) => {
      if (a.premium && !b.premium) return -1;
      if (!a.premium && b.premium) return 1;
      return (b.rating || 0) - (a.rating || 0);
    });

    this.setState({ filteredArtisans: filtered });
  }

  updateSearchUI() {
    const body = document.body;
    const searchClear = this.$('#search-clear');
    
    if (this.state.isSearchActive) {
      body.classList.add('search-active');
      searchClear?.classList.remove('hidden');
    } else {
      body.classList.remove('search-active');
      searchClear?.classList.add('hidden');
    }
  }

  // Event Handlers
  handleGlobalClick(e) {
    if (!e.target.closest('.profile-dropdown')) {
      this.closeProfileDropdown();
    }

    if (!e.target.closest('#side-menu') && !e.target.closest('#menu-btn')) {
      this.closeSideMenu();
    }
  }

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      this.hideModal();
      this.closeSideMenu();
      this.closeProfileDropdown();
    }
  }

  async handleRoleSwitch(e) {
    const isArtisan = e.target.checked;
    
    if (!this.state.user) {
      e.target.checked = !isArtisan;
      this.openLoginModal();
      return;
    }

    const newRole = isArtisan ? 'artisan' : 'client';
    
    try {
      const updatedUser = await API.switchUserRole(this.state.user.id, newRole);
      this.setState({ user: updatedUser });
      this.saveSession();
      this.showToast(`Switched to ${newRole} mode`, 'success');
      this.closeProfileDropdown();
    } catch (error) {
      console.error('Role switch failed:', error);
      e.target.checked = !isArtisan;
      this.showToast('Failed to switch role', 'error');
    }
  }

  handleFabClick() {
    if (this.state.user?.role === 'artisan') {
      this.openMyClients();
    } else {
      this.openQuickBooking();
    }
  }

  // Profile and Authentication
  toggleProfileDropdown(e) {
    e.stopPropagation();
    this.setState({ isProfileDropdownOpen: !this.state.isProfileDropdownOpen });
  }

  closeProfileDropdown() {
    this.setState({ isProfileDropdownOpen: false });
  }

  async openLoginModal() {
    const html = `
      <div class="auth-modal">
        <h2>Welcome to Naco</h2>
        <p class="muted">Login or create an account to get started</p>
        
        <form id="auth-form" class="booking-form">
          <label>
            Email
            <input id="auth-email" type="email" required autocomplete="email">
          </label>
          <label>
            Password
            <input id="auth-pass" type="password" required autocomplete="current-password">
          </label>
          <label>
            I am a
            <select id="auth-role">
            <option value="artisan">Artisan (Providing services)</option>
              <option value="client">Client (Looking for services)</option>
              
            </select>
          </label>
          
          <div style="display: flex; gap: 12px; margin-top: 20px;">
            <button type="button" id="login-btn" class="btn-primary" style="flex: 1;">
              <i class="fas fa-sign-in-alt"></i> Login
            </button>
            <button type="button" id="signup-btn" class="btn-primary" style="flex: 1; background: var(--green-light);">
              <i class="fas fa-user-plus"></i> Sign Up
            </button>
          </div>
        </form>
      </div>
    `;

    this.showModal(html, () => {
      this.$('#login-btn')?.addEventListener('click', () => this.handleLogin());
      this.$('#signup-btn')?.addEventListener('click', () => this.handleSignup());
      this.$('#auth-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    });
  }


    
    async handleLogin() {
    const email = this.$('#auth-email')?.value;
    const password = this.$('#auth-pass')?.value;

    if (!email || !password) {
      this.showToast('Please fill in all fields', 'error');
      return;
    }

    try {
      const user = await API.loginUser(email, password);
      this.setState({ user });
      this.saveSession();
      this.hideModal();
      this.showToast(`Welcome back, ${user.name}!`, 'success');
      setTimeout(async () => {
        await this.requestNotificationPermission();
        this.startNotificationPolling();
        window.location.reload();
      }, 1000);
      this.updateMainVisibility();
console.log("User state after login:", this.state.user);
    } catch (error) {
      console.error('Login failed:', error);
      this.showToast('Login failed. Please check your credentials.', 'error');
    }
  }



  async handleSignup() {
    const email = this.$('#auth-email')?.value;
    const password = this.$('#auth-pass')?.value;
    const role = this.$('#auth-role')?.value;

    if (!email || !password) {
      this.showToast('Please fill in all fields', 'error');
      return;
    }

    try {
      const userData = {
        name: email.split('@')[0],
        email,
        password,
        role,
        location: this.state.selectedCity || 'Lagos'
      };

      const user = await API.registerUser(userData);
      this.setState({ user });
      this.saveSession();
      this.hideModal();
      this.showToast(`Welcome to Naco, ${user.name}!`, 'success');
      setTimeout(async () => {
        await this.requestNotificationPermission();
        this.startNotificationPolling();
      }, 1000);
      this.updateMainVisibility();
console.log("User state after login:", this.state.user);
    } catch (error) {
      console.error('Signup failed:', error);
      this.showToast('Signup failed. Please try again.', 'error');
    }
  }

  async openProfileUpdate() {
    if (!this.state.user) {
      this.openLoginModal();
      return;
    }

    const user = this.state.user;
    const html = `
      <div class="profile-update-modal">
        <h2>Update Profile</h2>
        
        <form id="profile-form" class="booking-form">
          <label>
            Name
            <input id="upd-name" type="text" value="${this.escapeHtml(user.name || '')}" required>
          </label>
          
                    <label>
            Skill
            <input id="upd-skill" type="text" value="${this.escapeHtml(user.skill || 'General services')}" required>
          </label>
          
          <label>
            Years of Experience
            <input id="upd-experience" type="text" value="${this.escapeHtml(user.years_experience || '')}" required>
          </label>
         <!-- <label>
            Email
            <input id="upd-email" type="email" value="${this.escapeHtml(user.email || '')}" required>
          </label> -->
          <label>
            Phone(WhatsApp)
            <input id="upd-phone" type="tel" value="${this.escapeHtml(user.phone || '')}" placeholder="08123456789">
          </label>
          
          <label>
            About
            <input id="upd-about" type="text" value="${this.escapeHtml(user.about || 'A professional with more than 5 years experience.')}" required>
          </label>
          
          <label>
            Location
            <select id="upd-location">
              ${this.state.cities.map(city => 
                `<option value="${city}" ${city === user.location ? 'selected' : ''}>${city}</option>`
              ).join('')}
            </select>
          </label>
          
          <div style="display: flex; gap: 12px; margin-top: 20px;">
            <button type="button" id="save-profile" class="btn-primary">
              <i class="fas fa-save"></i> Save Changes
            </button>
            <button type="button" id="cancel-profile" class="link-btn">Cancel</button>
          </div>
        </form>
      </div>
    `;

    this.showModal(html, () => {
      this.$('#save-profile')?.addEventListener('click', () => this.handleProfileUpdate());
      this.$('#cancel-profile')?.addEventListener('click', () => this.hideModal());
    });
  }


    
    async openProfileUpdate() {
  if (!this.state.user) {
    this.openLoginModal();
    return;
  }

  const user = this.state.user;
  const html = `
    <div class="profile-update-modal">
      <h2>Update Profile</h2>
      
      <form id="profile-form" class="booking-form">
        <div class="profile-image-upload">
          <label for="profile-image" class="upload-label">
            <img id="profile-preview" src="${user.photo || '../assets/avatar-placeholder.png'}" 
                 alt="Profile preview" class="profile-preview">
            <div class="upload-overlay">
              <i class="fas fa-camera"></i>
              <span>Change Photo</span>
            </div>
          </label>
          <input type="file" id="profile-image" accept="image/*" style="display: none;">
        </div>
        
        <label>
          Name
          <input id="upd-name" type="text" value="${this.escapeHtml(user.name || '')}" required>
        </label>
        
        <label>
          Skill
          <input id="upd-skill" type="text" value="${this.escapeHtml(user.skill || 'General services')}" required>
        </label>
        
        <label>
          Years of Experience
          <input id="upd-experience" type="number" value="${this.escapeHtml(user.years_experience || '')}" min="0" required>
        </label>
        
        <label>
          Phone (WhatsApp)
          <input id="upd-phone" type="tel" value="${this.escapeHtml(user.phone || '')}" placeholder="08123456789">
        </label>
        
        <label>
          About
          <textarea id="upd-about" rows="3" required>${this.escapeHtml(user.about || 'A professional with more than 5 years experience.')}</textarea>
        </label>
        
        <label>
          Location
          <select id="upd-location">
            ${this.state.cities.map(city => 
              `<option value="${city}" ${city === user.location ? 'selected' : ''}>${city}</option>`
            ).join('')}
          </select>
        </label>
        
        <div style="display: flex; gap: 12px; margin-top: 20px;">
          <button type="button" id="save-profile" class="btn-primary">
            <i class="fas fa-save"></i> Save Changes
          </button>
          <button type="button" id="cancel-profile" class="link-btn">Cancel</button>
        </div>
      </form>
    </div>
  `;

  this.showModal(html, () => {
    // Image preview functionality
    const imageInput = this.$('#profile-image');
    const imagePreview = this.$('#profile-preview');
    
    imageInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          imagePreview.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });

    this.$('#save-profile')?.addEventListener('click', () => this.handleProfileUpdate());
    this.$('#cancel-profile')?.addEventListener('click', () => this.hideModal());
  });
}

async handleProfileUpdate() {
  const updates = {
    name: this.$('#upd-name')?.value,
    skill: this.$('#upd-skill')?.value,
    years_experience: this.$('#upd-experience')?.value,
    phone: this.$('#upd-phone')?.value,
    about: this.$('#upd-about')?.value,
    location: this.$('#upd-location')?.value
  };

  if (!updates.name) {
    this.showToast('Name is required', 'error');
    return;
  }

  try {
    // Handle image upload if a new image was selected
    const imageInput = this.$('#profile-image');
    const imageFile = imageInput?.files[0];
    
    if (imageFile) {
      this.showToast('Uploading image...', 'info');
      
      // Upload image first
      const imageUrl = await API.uploadProfileImage(this.state.user.id, imageFile);
      updates.photo = imageUrl;
    }

    const updatedUser = await API.updateUserProfile(this.state.user.id, updates);
    this.setState({ user: updatedUser });
    this.saveSession();
    this.hideModal();
    this.showToast('Profile updated successfully', 'success');
  } catch (error) {
    console.error('Profile update failed:', error);
    this.showToast('Failed to update profile', 'error');
  }
}
  /**async handleProfileUpdate() {
    const updates = {
      name: this.$('#upd-name')?.value,
      skill: this.$('#upd-skill')?.value,
      years_experience: this.$('#upd-experience')?.value,
      email: this.$('#upd-email')?.value,
      phone: this.$('#upd-phone')?.value,
      about: this.$('#upd-about')?.value,
      location: this.$('#upd-location')?.value
    };

    if /**(!updates.name || !updates.email)**
        (!updates.name){
      this.showToast('Name is required', 'error');
      return;
    }

    try {
      const updatedUser = await API.updateUserProfile(this.state.user.id, updates);
      this.setState({ user: updatedUser });
      this.saveSession();
      this.hideModal();
      this.showToast('Profile updated successfully', 'success');
    } catch (error) {
      console.error('Profile update failed:', error);
      this.showToast('Failed to update profile', 'error');
    }
  }**/

  logout() {
  this.setState({ user: null, notifications: [], notificationCount: 0 });

  this.clearSession();

  // Also clear API authentication
  if (API?.pb?.authStore) {
    API.pb.authStore.clear();
  }

  this.stopNotificationPolling();
  this.showToast('Logged out successfully', 'success');
}
  
  

  // Artisan Profile and Booking
  
  async openArtisanProfile(artisanId) {
  try {
    // Get artisan user record with profile expanded
    const artisan = await API.getFullArtisanData(artisanId);
    const artisanProfile = artisan.expand?.artisan_profiles_via_user || null;
    const profile = artisanProfile || await API.getFullArtisanData(artisanId);

    const reviews = await API.getReviewsForArtisan(artisanId);
    
    // Calculate average rating
    const averageRating = reviews.length > 0 
      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
      : 0;

    // Use getList with high limit instead of getFullList
    let completedJobs = 0;
    try {
      const result = await pb.collection('bookings').getList(1, 200, { // High limit instead of getFullList
        filter: `artisan = "${artisanId}"`
      });
      
      console.log(`Total bookings for artisan ${artisanId}:`, result.totalItems);
      console.log(`Bookings retrieved:`, result.items.length);
      console.log('All statuses:', result.items.map(b => b.status));
      
      completedJobs = result.items.filter(b => b.status === 'completed').length;
      console.log('Completed jobs count:', completedJobs);
      
      // Also log the total items vs actual items
      console.log('Total items in DB:', result.totalItems);
      console.log('Items retrieved:', result.items.length);
      
    } catch (error) {
      console.error('Failed to load completed jobs:', error);
    }
    
    /**const user = this.state.user;**/
    
    const distance = this.calculateDistance(artisan.location);
    const isFavorite = this.state.favorites.has(artisanId);

    const html = `
      <div class="artisan-profile-modal">
        <div class="profile-header">
          <img style="max-width: 320px; max-height: 320px; border-radius: 10px;" 
               src="${artisan.photo || '../assets/avatar-placeholder.png'}" 
               alt="${this.escapeHtml(artisan.name)}" 
               class="profile-avatar">
          <div class="profile-info">
            <h2>
              ${this.escapeHtml(artisan.name)} 
              ${this.renderVerificationBadge(artisan)}
              ${artisan.premium ? '<span class="premium-badge">PREMIUM</span>' : ''}
            </h2>
            <p class="profile-skill">${this.escapeHtml(profile?.skill || '')}</p>
            <p class="profile-location">
              <i class="fas fa-map-marker-alt"></i> 
              ${this.escapeHtml(artisan.location)} • ${distance} km away
            </p>
            <div class="profile-stats">
              <span><i class="fas fa-star"></i> ${averageRating} (${reviews.length} reviews)</span>
              <span><i class="fas fa-check-circle"></i> ${completedJobs} jobs</span>
              <span><i class="fas fa-clock"></i> ${artisan.yearsExperience || 0} years</span>
            </div>
            <div class="profile-rate">${this.formatCurrency(profile?.rate || 0)}</div>
          </div>
        </div>

        <div class="profile-section">
          <h4>About</h4>
          <p>${this.escapeHtml(artisan.about || 'Professional artisan with years of experience.')}</p>
        </div>

        ${artisan.specialties && artisan.specialties.length ? `
          <div class="profile-section">
            <h4>Specialties</h4>
            <div class="chips">
              ${artisan.specialties.map(s => `<span class="chip">${this.escapeHtml(s)}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        <div class="profile-section">
          <h4>Reviews (${reviews.length})</h4>
          <div class="reviews-list">
            ${reviews.length ? reviews.slice(0, 3).map(review => `
              <div class="review-item">
                <div class="review-header">
                  <strong>
                    ${this.escapeHtml(review.reviewerName)}
                    ${review.reviewerPremium ? this.renderVerificationBadge({premium: true}) : ''}
                  </strong>
                  <span class="review-rating">${'⭐'.repeat(review.rating)} (${review.rating}/5)</span>
                </div>
                <p class="review-text">${this.escapeHtml(review.text)}</p>
                <small class="muted">${new Date(review.date).toLocaleDateString()}</small>
              </div>
            `).join('') : '<p class="muted">No reviews yet</p>'}
          </div>
        </div>

        <div class="profile-actions">
          <button id="book-artisan" class="btn-primary">
            <i class="fas fa-calendar-plus"></i> Book Now
          </button>
          <button id="save-artisan" class="link-btn ${isFavorite ? 'active' : ''}">
            <i class="fas fa-heart"></i> ${isFavorite ? 'Saved' : 'Save'}
          </button>
          <button id="chat-artisan" class="link-btn">
            <i class="fab fa-whatsapp"></i> Chat
          </button>
        </div>
      </div>
    `;

    this.showModal(html, () => {
      this.$('#book-artisan')?.addEventListener('click', () => {
        if (!this.state.user) {
          this.hideModal();
          this.openLoginModal();
          return;
        }
        this.openBookingForm(artisanId);
      });
      
      this.$('#save-artisan')?.addEventListener('click', () => {
        if (!this.state.user) {
          this.hideModal();
          this.openLoginModal();
          return;
        }
        this.toggleFavorite(artisanId);
      });
      
      this.$('#chat-artisan')?.addEventListener('click', () => this.openWhatsApp(artisanId));
    });

  } catch (error) {
    console.error('Failed to load artisan profile:', error);
    this.showToast('Failed to load artisan profile', 'error');
  }
}
  /**async openArtisanProfile(artisanId) {
  try {
    // Get artisan user record with profile expanded
    const artisan = await API.getFullArtisanData(artisanId);
    const artisanProfile = artisan.expand?.artisan_profiles_via_user || null;
    const profile = artisanProfile || await API.getFullArtisanData(artisanId);

    const reviews = await API.getReviewsForArtisan(artisanId);
    
    // Calculate average rating
    const averageRating = reviews.length > 0 
      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
      : 0;

    // Count completed jobs exactly like in user stats
    let completedJobs = 0;
    try {
      const bookings = await pb.collection('bookings').getFullList({
        filter: `artisan.id = "${artisanId}"`
      });
      completedJobs = bookings.filter(b => b.status === 'completed').length;
    } catch (error) {
      console.error('Failed to load completed jobs:', error);
    }

    const distance = this.calculateDistance(artisan.location);
    const isFavorite = this.state.favorites.has(artisanId);

    const html = `
      <div class="artisan-profile-modal">
        <div class="profile-header">
          <img style="max-width: 320px; max-height: 320px; border-radius: 10px;" 
               src="${artisan.photo || '../assets/avatar-placeholder.png'}" 
               alt="${this.escapeHtml(artisan.name)}" 
               class="profile-avatar">
          <div class="profile-info">
            <h2>
              ${this.escapeHtml(artisan.name)} 
              ${this.renderVerificationBadge(artisan)}
              ${artisan.premium ? '<span class="premium-badge">PREMIUM</span>' : ''}
            </h2>
            <p class="profile-skill">${this.escapeHtml(profile?.skill || '')}</p>
            <p class="profile-location">
              <i class="fas fa-map-marker-alt"></i> 
              ${this.escapeHtml(artisan.location)} • ${distance} km away
            </p>
            <div class="profile-stats">
              <span><i class="fas fa-star"></i> ${averageRating} (${reviews.length} reviews)</span>
              <span><i class="fas fa-check-circle"></i> ${completedJobs} jobs</span>
              <span><i class="fas fa-clock"></i> ${profile?.years_experience || 0} years</span>
            </div>
            <div class="profile-rate">${this.formatCurrency(profile?.rate || 0)}</div>
          </div>
        </div>

        <div class="profile-section">
          <h4>About</h4>
          <p>${this.escapeHtml(profile?.description || 'Professional artisan with years of experience.')}</p>
        </div>

        ${artisan.specialties && artisan.specialties.length ? `
          <div class="profile-section">
            <h4>Specialties</h4>
            <div class="chips">
              ${artisan.specialties.map(s => `<span class="chip">${this.escapeHtml(s)}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        <div class="profile-section">
          <h4>Reviews (${reviews.length})</h4>
          <div class="reviews-list">
            ${reviews.length ? reviews.slice(0, 3).map(review => `
              <div class="review-item">
                <div class="review-header">
                  <strong>
                    ${this.escapeHtml(review.reviewerName)}
                    ${review.reviewerPremium ? this.renderVerificationBadge({premium: true}) : ''}
                  </strong>
                  <span class="review-rating">${'⭐'.repeat(review.rating)} (${review.rating}/5)</span>
                </div>
                <p class="review-text">${this.escapeHtml(review.text)}</p>
                <small class="muted">${new Date(review.date).toLocaleDateString()}</small>
              </div>
            `).join('') : '<p class="muted">No reviews yet</p>'}
          </div>
        </div>

        <div class="profile-actions">
          <button id="book-artisan" class="btn-primary">
            <i class="fas fa-calendar-plus"></i> Book Now
          </button>
          <button id="save-artisan" class="link-btn ${isFavorite ? 'active' : ''}">
            <i class="fas fa-heart"></i> ${isFavorite ? 'Saved' : 'Save'}
          </button>
          <button id="chat-artisan" class="link-btn">
            <i class="fab fa-whatsapp"></i> Chat
          </button>
        </div>
      </div>
    `;

    this.showModal(html, () => {
      this.$('#book-artisan')?.addEventListener('click', () => {
        if (!this.state.user) {
          this.hideModal();
          this.openLoginModal();
          return;
        }
        this.openBookingForm(artisanId);
      });
      
      this.$('#save-artisan')?.addEventListener('click', () => {
        if (!this.state.user) {
          this.hideModal();
          this.openLoginModal();
          return;
        }
        this.toggleFavorite(artisanId);
      });
      
      this.$('#chat-artisan')?.addEventListener('click', () => this.openWhatsApp(artisanId));
    });

  } catch (error) {
    console.error('Failed to load artisan profile:', error);
    this.showToast('Failed to load artisan profile', 'error');
  }
}**/

/**  async openArtisanProfile(artisanId) {
  try {
    // Get artisan user record with profile expanded
    const artisan = await API.getFullArtisanData(artisanId);
    const artisanProfile = artisan.expand?.artisan_profiles_via_user || null;
    const profile = artisanProfile || await API.getFullArtisanData(artisanId);

    const reviews = await API.getReviewsForArtisan(artisanId);
    
    // Calculate average rating
    const averageRating = reviews.length > 0 
      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
      : 0;

    const distance = this.calculateDistance(artisan.location);
    const isFavorite = this.state.favorites.has(artisanId);

    const html = `
      <div class="artisan-profile-modal">
        <div class="profile-header">
          <img style="max-width: 320px; max-height: 320px; border-radius: 10px;" 
               src="${artisan.photo || '../assets/avatar-placeholder.png'}" 
               alt="${this.escapeHtml(artisan.name)}" 
               class="profile-avatar">
          <div class="profile-info">
            <h2>
              ${this.escapeHtml(artisan.name)} 
              ${this.renderVerificationBadge(artisan)}
              ${artisan.premium ? '<span class="premium-badge">PREMIUM</span>' : ''}
            </h2>
            <p class="profile-skill">${this.escapeHtml(profile?.skill || '')}</p>
            <p class="profile-location">
              <i class="fas fa-map-marker-alt"></i> 
              ${this.escapeHtml(artisan.location)} • ${distance} km away
            </p>
            <div class="profile-stats">
              <span><i class="fas fa-star"></i> ${averageRating} (${reviews.length} reviews)</span>
              <span><i class="fas fa-check-circle"></i> ${artisan.completed_jobs || 0} jobs</span>
              <span><i class="fas fa-clock"></i> ${profile?.years_experience || 0} years</span>
            </div>
            <div class="profile-rate">${this.formatCurrency(profile?.rate || 0)}</div>
          </div>
        </div>

        <div class="profile-section">
          <h4>About</h4>
          <p>${this.escapeHtml(profile?.description || 'Professional artisan with years of experience.')}</p>
        </div>

        ${artisan.specialties && artisan.specialties.length ? `
          <div class="profile-section">
            <h4>Specialties</h4>
            <div class="chips">
              ${artisan.specialties.map(s => `<span class="chip">${this.escapeHtml(s)}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        <div class="profile-section">
          <h4>Reviews (${reviews.length})</h4>
          <div class="reviews-list">
            ${reviews.length ? reviews.slice(0, 3).map(review => `
              <div class="review-item">
                <div class="review-header">
                  <strong>
                    ${this.escapeHtml(review.reviewerName)}
                    ${review.reviewerPremium ? this.renderVerificationBadge({premium: true}) : ''}
                  </strong>
                  <span class="review-rating">${'⭐'.repeat(review.rating)} (${review.rating}/5)</span>
                </div>
                <p class="review-text">${this.escapeHtml(review.text)}</p>
                <small class="muted">${new Date(review.date).toLocaleDateString()}</small>
              </div>
            `).join('') : '<p class="muted">No reviews yet</p>'}
          </div>
        </div>

        <div class="profile-actions">
          <button id="book-artisan" class="btn-primary">
            <i class="fas fa-calendar-plus"></i> Book Now
          </button>
          <button id="save-artisan" class="link-btn ${isFavorite ? 'active' : ''}">
            <i class="fas fa-heart"></i> ${isFavorite ? 'Saved' : 'Save'}
          </button>
          <button id="chat-artisan" class="link-btn">
            <i class="fab fa-whatsapp"></i> Chat
          </button>
        </div>
      </div>
    `;

    this.showModal(html, () => {
      this.$('#book-artisan')?.addEventListener('click', () => {
        if (!this.state.user) {
          this.hideModal();
          this.openLoginModal();
          return;
        }
        this.openBookingForm(artisanId);
      });
      
      this.$('#save-artisan')?.addEventListener('click', () => {
        if (!this.state.user) {
          this.hideModal();
          this.openLoginModal();
          return;
        }
        this.toggleFavorite(artisanId);
      });
      
      this.$('#chat-artisan')?.addEventListener('click', () => this.openWhatsApp(artisanId));
    });

  } catch (error) {
    console.error('Failed to load artisan profile:', error);
    this.showToast('Failed to load artisan profile', 'error');
  }
}**/
  
/**  
  // Artisan Profile and Booking
async openArtisanProfile(artisanId) {
  try {
    // Get artisan user record with profile expanded
    const artisan = await API.getFullArtisanData(artisanId);

    // The artisan profile is available via expand (if you set it up that way)
    const artisanProfile = artisan.expand?.artisan_profiles_via_user || null;

    // Fallback: fetch directly if expand is missing
    const profile = artisanProfile || await API.getFullArtisanData(artisanId);

    const reviews = await API.getReviewsForArtisan(artisanId);

    const distance = this.calculateDistance(artisan.location);
    const isFavorite = this.state.favorites.has(artisanId);

    const html = `
      <div class="artisan-profile-modal">
        <div class="profile-header">
          <img style="max-width: 320px; max-height: 320px; border-radius: 10px;" 
               src="${artisan.photo || '../assets/avatar-placeholder.png'}" 
               alt="${this.escapeHtml(artisan.name)}" 
               class="profile-avatar">
          <div class="profile-info">
            <h2>
              ${this.escapeHtml(artisan.name)} 
              ${this.renderVerificationBadge(artisan)}
              ${artisan.premium ? '<span class="premium-badge">PREMIUM</span>' : ''}
            </h2>
            <p class="profile-skill">${this.escapeHtml(profile?.skill || '')}</p>
            <p class="profile-location">
              <i class="fas fa-map-marker-alt"></i> 
              ${this.escapeHtml(artisan.location)} • ${distance} km away
            </p>
            <div class="profile-stats">
              <span><i class="fas fa-star"></i> ${profile?.rating || 0}</span>
              <span><i class="fas fa-check-circle"></i> ${profile?.completed_jobs || 0} jobs</span>
              <span><i class="fas fa-clock"></i> ${profile?.years_experience || 0} years</span>
            </div>
            <div class="profile-rate">${this.formatCurrency(profile?.rate || 0)}</div>
          </div>
        </div>

        <div class="profile-section">
          <h4>About</h4>
          <p>${this.escapeHtml(profile?.description || 'Professional artisan with years of experience.')}</p>
        </div>

        ${artisan.specialties && artisan.specialties.length ? `
          <div class="profile-section">
            <h4>Specialties</h4>
            <div class="chips">
              ${artisan.specialties.map(s => `<span class="chip">${this.escapeHtml(s)}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        <div class="profile-section">
          <h4>Reviews (${reviews.length})</h4>
          <div class="reviews-list">
            ${reviews.length ? reviews.slice(0, 3).map(review => `
              <div class="review-item">
                <div class="review-header">
                  <strong>
                    ${this.escapeHtml(review.reviewerName)}
                    ${review.reviewerPremium ? this.renderVerificationBadge({premium: true}) : ''}
                  </strong>
                  <span class="review-rating">${'⭐'.repeat(review.rating)}</span>
                </div>
                <p class="review-text">${this.escapeHtml(review.text)}</p>
                <small class="muted">${new Date(review.date).toLocaleDateString()}</small>
              </div>
            `).join('') : '<p class="muted">No reviews yet</p>'}
          </div>
        </div>

        <div class="profile-actions">
          <button id="book-artisan" class="btn-primary">
            <i class="fas fa-calendar-plus"></i> Book Now
          </button>
          <button id="save-artisan" class="link-btn ${isFavorite ? 'active' : ''}">
            <i class="fas fa-heart"></i> ${isFavorite ? 'Saved' : 'Save'}
          </button>
          <button id="chat-artisan" class="link-btn">
            <i class="fab fa-whatsapp"></i> Chat
          </button>
        </div>
      </div>
    `;

    this.showModal(html, () => {
      this.$('#book-artisan')?.addEventListener('click', () => {
        if (!this.state.user) {
          this.hideModal();
          this.openLoginModal();
          return;
        }
        this.openBookingForm(artisanId);
      });
      
      this.$('#save-artisan')?.addEventListener('click', () => {
        if (!this.state.user) {
          this.hideModal();
          this.openLoginModal();
          return;
        }
        this.toggleFavorite(artisanId);
      });
      
      this.$('#chat-artisan')?.addEventListener('click', () => this.openWhatsApp(artisanId));
    });

  } catch (error) {
    console.error('Failed to load artisan profile:', error);
    this.showToast('Failed to load artisan profile', 'error');
  }
}**/

 /** async openArtisanProfile(artisanId) {
    try {
      const artisan = await API.getArtisanById(artisanId);
      const artisan_profiles = await API.getArtisanProfilesById(artisan_profilesId);
      const reviews = await API.getReviewsForArtisan(artisanId);
      
      const distance = this.calculateDistance(artisan.location);
      const isFavorite = this.state.favorites.has(artisanId);

      const html = `
        <div class="artisan-profile-modal">
          <div class="profile-header">
            <img style="max-width: 320px; max-height: 320px; border-radius: 10px;" src="${artisan.photo || '../assets/avatar-placeholder.png'}" alt="${this.escapeHtml(artisan.name)}" class="profile-avatar">
            <div class="profile-info">
              <h2>
                ${this.escapeHtml(artisan.name)} 
                ${this.renderVerificationBadge(artisan)}
                ${artisan.premium ? '<span class="premium-badge">PREMIUM</span>' : ''}
              </h2>
              <p class="profile-skill">${this.escapeHtml(artisan.skill)}</p>
              <p class="profile-location"><i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(artisan.location)} • ${distance} km away</p>
              <div class="profile-stats">
                <span><i class="fas fa-star"></i> ${artisan.rating || 0}</span>
                <span><i class="fas fa-check-circle"></i> ${artisan.completedJobs || 0} jobs</span>
                <span><i class="fas fa-clock"></i> ${artisan.yearsExperience || 0} years</span>
              </div>
              <div class="profile-rate">${this.formatCurrency(artisan.rate)}</div>
            </div>
          </div>

          <div class="profile-section">
            <h4>b</h4>
            <p>${this.escapeHtml(artisan.description || 'Professional artisan with years of experience.')}</p>
          </div>

          ${artisan.specialties && artisan.specialties.length ? `
            <div class="profile-section">
              <h4>Specialties</h4>
              <div class="chips">
                ${artisan.specialties.map(s => `<span class="chip">${this.escapeHtml(s)}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          <div class="profile-section">
            <h4>Reviews (${reviews.length})</h4>
            <div class="reviews-list">
              ${reviews.length ? reviews.slice(0, 3).map(review => `
                <div class="review-item">
                  <div class="review-header">
                    <strong>
                      ${this.escapeHtml(review.reviewerName)}
                      ${review.reviewerPremium ? this.renderVerificationBadge({premium: true}) : ''}
                    </strong>
                    <span class="review-rating">${'⭐'.repeat(review.rating)}</span>
                  </div>
                  <p class="review-text">${this.escapeHtml(review.text)}</p>
                  <small class="muted">${new Date(review.date).toLocaleDateString()}</small>
                </div>
              `).join('') : '<p class="muted">No reviews yet</p>'}
            </div>
          </div>

          <div class="profile-actions">
            <button id="book-artisan" class="btn-primary">
              <i class="fas fa-calendar-plus"></i> Book Now
            </button>
            <button id="save-artisan" class="link-btn ${isFavorite ? 'active' : ''}">
              <i class="fas fa-heart"></i> ${isFavorite ? 'Saved' : 'Save'}
            </button>
            <button id="chat-artisan" class="link-btn">
              <i class="fab fa-whatsapp"></i> Chat
            </button>
          </div>
        </div>
      `;

      this.showModal(html, () => {
        this.$('#book-artisan')?.addEventListener('click', () => {
          if (!this.state.user) {
            this.hideModal();
            this.openLoginModal();
            return;
          }
          this.openBookingForm(artisanId);
        });
        
        this.$('#save-artisan')?.addEventListener('click', () => {
          if (!this.state.user) {
            this.hideModal();
            this.openLoginModal();
            return;
          }
          this.toggleFavorite(artisanId);
        });
        
        this.$('#chat-artisan')?.addEventListener('click', () => this.openWhatsApp(artisanId));
      });

    } catch (error) {
      console.error('Failed to load artisan profile:', error);
      this.showToast('Failed to load artisan profile', 'error');
    }
  }**/

  async openBookingForm(artisanId) {
    if (!this.state.user) {
      this.openLoginModal();
      return;
    }

    try {
      const artisan = await API.getFullArtisanData(artisanId);
      
      const html = `
        <div class="booking-modal">
          <h2>Book ${this.escapeHtml(artisan.name)}</h2>
          <div class="booking-summary">
            <img style="max-width: 320px; max-height: 320px; border-radius: 10px;" src="${artisan.photo || '../assets/avatar-placeholder.png'}" alt="${this.escapeHtml(artisan.name)}">
            <div>
              <strong>${this.escapeHtml(artisan.name)}</strong>
              <p class="muted">${this.escapeHtml(artisan.skill)} • ${this.formatCurrency(artisan.rate)}</p>
            </div>
          </div>

          <form id="booking-form" class="booking-form">
            <label>
              Service Date
              <input id="book-date" type="date" required min="${new Date().toISOString().split('T')[0]}">
            </label>
            <label>
              Service Time
              <input id="book-time" type="time" required>
            </label>
            <label>
              Service Location/Address
              <textarea id="book-location" placeholder="Enter the address where the service will be performed..." rows="2" required></textarea>
            </label>
            <label>
              Service Description
              <textarea id="book-notes" placeholder="Describe what you need done..." rows="4" required></textarea>
            </label>
            <label>
              Payment Method
              <select id="book-payment" required>
                <option value="">Select payment method</option>
                <option value="cash">Cash on Completion</option>
                <option value="transfer">Bank Transfer</option>
                <option value="paystack">Card Payment (Paystack)</option>
              </select>
            </label>

            <div class="booking-total">
              <div class="total-line">
                <span>Service Fee</span>
                <span>${this.formatCurrency(artisan.rate)}</span>
              </div>
              <div class="total-line">
                <span>Platform Fee</span>
                <span>₦500</span>
              </div>
              <div class="total-line total">
                <strong>Total: ${this.formatCurrency(artisan.rate + 500)}</strong>
              </div>
            </div>

            <div style="display: flex; gap: 12px; margin-top: 20px;">
              <button type="button" id="confirm-booking" class="btn-primary" style="flex: 1;">
                <i class="fas fa-check"></i> Confirm Booking
              </button>
              <button type="button" id="cancel-booking" class="link-btn">Cancel</button>
            </div>
          </form>
        </div>
      `;

      this.showModal(html, () => {
        this.$('#confirm-booking')?.addEventListener('click', () => this.handleBookingConfirmation(artisan));
        this.$('#cancel-booking')?.addEventListener('click', () => this.hideModal());
      });

    } catch (error) {
      console.error('Failed to open booking form:', error);
      this.showToast('Failed to open booking form', 'error');
    }
  }
  
  async handleBookingConfirmation(artisan) {
    const date = this.$('#book-date')?.value;
    const time = this.$('#book-time')?.value;
    const location = this.$('#book-location')?.value;
    const notes = this.$('#book-notes')?.value;
    const payment = this.$('#book-payment')?.value;

    if (!date || !time || !location || !notes || !payment) {
      this.showToast('Please fill in all fields', 'error');
      return;
    }

    const bookingData = {
      artisanId: artisan.id,
      clientName: this.state.user.name,
      service: artisan.skill,
      date,
      time,
      location,
      notes,
      payment,
      amount: artisan.rate + 500
    };

    try {
      await API.createBooking(bookingData);
      const reference = 'NACO-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      
      this.hideModal();
      
      const confirmationHtml = `
        <div class="booking-confirmation">
          <div class="success-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <h2>Booking Confirmed!</h2>
          <p>Your booking with <strong>${this.escapeHtml(artisan.name)}</strong> has been confirmed.</p>
          
          <div class="booking-details">
            <div class="detail-row">
              <span>Reference:</span>
              <strong>${reference}</strong>
            </div>
            <div class="detail-row">
              <span>Date:</span>
              <strong>${new Date(date).toLocaleDateString()}</strong>
            </div>
            <div class="detail-row">
              <span>Time:</span>
              <strong>${time}</strong>
            </div>
            <div class="detail-row">
              <span>Location:</span>
              <strong>${this.escapeHtml(location)}</strong>
            </div>
            <div class="detail-row">
              <span>Total:</span>
              <strong>${this.formatCurrency(bookingData.amount)}</strong>
            </div>
          </div>

          <div style="display: flex; gap: 12px; margin-top: 20px;">
            <button id="view-booking" class="btn-primary">View Booking</button>
            <button id="close-confirmation" class="link-btn">Close</button>
          </div>
        </div>
      `;

      this.showModal(confirmationHtml, () => {
        this.$('#view-booking')?.addEventListener('click', () => this.openMyBookings());
        this.$('#close-confirmation')?.addEventListener('click', () => this.hideModal());
      });

      this.showToast('Booking confirmed successfully!', 'success');
      
    } catch (error) {
      console.error('Booking failed:', error);
      this.showToast('Booking failed. Please try again.', 'error');
    }
  }

  // Favorites
  toggleFavorite(artisanId) {
    const favorites = new Set(this.state.favorites);
    
    if (favorites.has(artisanId)) {
      favorites.delete(artisanId);
      this.showToast('Removed from favorites', 'info');
    } else {
      favorites.add(artisanId);
      this.showToast('Added to favorites', 'success');
    }

    this.setState({ favorites });
    this.saveFavorites();
  }

  loadFavorites() {
    try {
      const saved = localStorage.getItem('naco_favorites');
      if (saved) {
        this.setState({ favorites: new Set(JSON.parse(saved)) });
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  }

  saveFavorites() {
    try {
      localStorage.setItem('naco_favorites', JSON.stringify([...this.state.favorites]));
    } catch (error) {
      console.error('Failed to save favorites:', error);
    }
  }

  // WhatsApp Integration
  openWhatsApp(artisanId) {
    const artisan = this.state.artisans.find(a => a.id === artisanId);
    if (!artisan) return;

    const phone = artisan.phone || '0000000000';
    const message = `Hi ${artisan.name}, I found you on Naco and I'm interested in your ${artisan.skill} services. Can we discuss?`;
    const whatsappUrl = `https://wa.me/234${phone.replace(/^0/, '')}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  }

  // Quick Actions
  openQuickBooking() {
    if (!this.state.user) {
      this.openLoginModal();
      return;
    }

    const html = `
      <div class="quick-booking-modal">
        <h2>Quick Book</h2>
        <p class="muted">Choose an artisan from the list below to start booking, or use the search to find specific services.</p>
        
        <div class="quick-actions">
          <button id="emergency-service" class="btn-primary" style="background: #ef4444;">
            <i class="fas fa-exclamation-triangle"></i> Emergency Service
          </button>
          <button id="browse-services" class="btn-primary">
            <i class="fas fa-search"></i> Browse Services
          </button>
        </div>

        <div style="text-align: center; margin-top: 20px;">
          <button id="close-quick" class="link-btn">Close</button>
        </div>
      </div>
    `;

    this.showModal(html, () => {
      this.$('#emergency-service')?.addEventListener('click', () => this.openEmergencyBooking());
      this.$('#browse-services')?.addEventListener('click', () => {
        this.hideModal();
        this.$('#search-input')?.focus();
      });
      this.$('#close-quick')?.addEventListener('click', () => this.hideModal());
    });
  }

  openEmergencyBooking() {
    const emergencyArtisans = this.state.artisans
      .filter(a => a.premium && a.availability === 'Available')
      .slice(0, 5);

    const html = `
      <div class="emergency-booking-modal">
        <h2 style="color: #ef4444;">
          <i class="fas fa-exclamation-triangle"></i> Emergency Service
        </h2>
        <p class="muted">Available artisans for immediate service:</p>
        
        <div class="emergency-list">
          ${emergencyArtisans.map(artisan => `
            <div class="emergency-item" data-id="${artisan.id}">
              <img style="width: 300px; height: 300px; border-radius: 10px;" src="${artisan.photo || '../assets/avatar-placeholder.png'}" alt="${this.escapeHtml(artisan.name)}">
              <div>
                <strong>${this.escapeHtml(artisan.name)}</strong>
                <p class="muted">${this.escapeHtml(artisan.skill)} • ${this.escapeHtml(artisan.location)}</p>
                <p style="color: var(--green);"><i class="fas fa-circle" style="font-size: 8px;"></i> Available Now</p>
              </div>
              <button class="btn-cta emergency-book" data-id="${artisan.id}">Book</button>
            </div>
          `).join('')}
        </div>

        <div style="text-align: center; margin-top: 20px;">
          <button id="close-emergency" class="link-btn">Close</button>
        </div>
      </div>
    `;

    this.showModal(html, () => {
      this.$$('.emergency-book').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const artisanId = e.target.dataset.id;
          this.openBookingForm(artisanId);
        });
      });
      this.$('#close-emergency')?.addEventListener('click', () => this.hideModal());
    });
  }

  // My Services (for artisans)
  async openMyClients() {
  if (!this.state.user || this.state.user.role !== 'artisan') return;

  try {
    const bookings = await API.getUserBookings(this.state.user.id);
    
    const html = `
      <div class="my-clients-modal">
        <h2>My Clients</h2>
        <p class="muted">Manage your bookings and client requests</p>
        
        <div class="client-stats">
          <div class="stat-item">
            <strong>${bookings.filter(b => b.status === 'pending').length}</strong>
            <span>Pending</span>
          </div>
          <div class="stat-item">
            <strong>${bookings.filter(b => b.status === 'confirmed').length}</strong>
            <span>Active</span>
          </div>
          <div class="stat-item">
            <strong>${bookings.filter(b => b.status === 'pending_confirmation').length}</strong>
            <span>Awaiting Confirmation</span>
          </div>
          <div class="stat-item">
            <strong>${bookings.filter(b => b.status === 'completed').length}</strong>
            <span>Completed</span>
          </div>
        </div>

        <div class="bookings-list">
          ${bookings.length ? bookings.map(booking => {
            let statusText = (booking.status || 'pending').toUpperCase();
            let statusClass = booking.status || 'pending';
            
            if (booking.status === 'pending_confirmation') {
              statusText = 'AWAITING CLIENT CONFIRMATION';
              statusClass = 'pending-confirmation';
            }
            
            return `
              <div class="booking-item ${booking.status}">
                <div class="booking-info">
                  <strong>${this.escapeHtml(booking.clientName)}</strong>
                  <p class="muted">${this.escapeHtml(booking.service)} • ${new Date(booking.date).toLocaleDateString()} ${booking.time}</p>
                  <p class="muted">Amount: ${this.formatCurrency(booking.amount || 0)}</p>
                  <span class="status-badge status-${statusClass}">${statusText}</span>
                  
                  ${booking.status === 'pending_confirmation' ? `
                    <div class="info-notice">
                      <i class="fas fa-clock"></i> You've marked this job as completed. Waiting for client confirmation.
                    </div>
                  ` : ''}
                </div>
                <div class="booking-actions">
                  ${booking.status === 'pending' ? `
                    <button class="btn-cta accept-booking" data-id="${booking.id}">Accept</button>
                    <button class="link-btn decline-booking" data-id="${booking.id}">Decline</button>
                  ` : booking.status === 'confirmed' ? `
                    <button class="btn-cta complete-booking" data-id="${booking.id}">Mark Complete</button>
                    <button class="link-btn view-booking-details" data-id="${booking.id}">View</button>
                  ` : `
                    <button class="link-btn view-booking-details" data-id="${booking.id}">View</button>
                  `}
                </div>
              </div>
            `;
          }).join('') : '<p class="muted">No client bookings yet.</p>'}
        </div>

        <div style="text-align: center; margin-top: 20px;">
          <button id="close-clients" class="link-btn">Close</button>
        </div>
      </div>
    `;
    
    this.showModal(html, () => {
      this.$$('.accept-booking').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleBookingAction(e.target.dataset.id, 'confirmed');
        });
      });

      this.$$('.decline-booking').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleBookingAction(e.target.dataset.id, 'declined');
        });
      });

      this.$$('.complete-booking').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm('Are you sure you have completed this job? The client will be asked to confirm.')) {
            this.handleBookingAction(e.target.dataset.id, 'completed');
          }
        });
      });
      
      this.$$('.view-booking-details').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openBookingDetails(e.target.dataset.id);
        });
      });
      
      this.$('#close-clients')?.addEventListener('click', () => this.hideModal());
    });

  } catch (error) {
    console.error('Failed to load client bookings:', error);
    this.showToast('Failed to load bookings', 'error');
  }
}
  
    async handleBookingAction(bookingId, action) {
  // require login
  if (!this.state.user) {
    this.openLoginModal();
    return;
  }

  try {
    const role = (this.state.user.role || 'client').toLowerCase();
    const a = String(action || '').trim().toLowerCase();

    // map UI actions to canonical DB statuses (role-aware)
    let status;
    // explicit action groups
    const confirmedActions = new Set(['accept', 'accept_booking', 'confirm', 'confirmed']);
    const declinedActions   = new Set(['decline', 'declined']);
    const startActions      = new Set(['start', 'in_progress']);
    const cancelActions     = new Set(['cancel', 'cancelled']);
    const clientConfirm     = 'confirm_completion';
    const clientReject      = 'reject_completion';
    const artisanCompleteActions = new Set(['completed', 'mark_completed', 'artisan_completed']);

    if (confirmedActions.has(a)) {
      status = 'confirmed';
    } else if (declinedActions.has(a)) {
      status = 'declined';
    } else if (startActions.has(a)) {
      status = 'in_progress';
    } else if (cancelActions.has(a)) {
      status = 'cancelled';
    } else if (a === clientConfirm) {
      // client explicitly confirms — store final 'completed' status
      status = 'completed';
    } else if (a === clientReject) {
      // client rejects completion — return to 'confirmed' so work continues
      status = 'confirmed';
    } else if (artisanCompleteActions.has(a)) {
      // artisan marks as completed → client must confirm
      status = role === 'artisan' ? 'pending_confirmation' : 'completed';
    } else {
      // unknown action — fail early with clear error
      throw new Error(`Unknown action: ${action}`);
    }

    // whitelist DB statuses (server should also enforce)
    const allowedStatuses = ['confirmed', 'declined', 'pending_confirmation', 'completed', 'cancelled', 'in_progress'];
    if (!allowedStatuses.includes(status)) {
      throw new Error(`Mapped to invalid status: ${status}`);
    }

    // perform the update via your API wrapper
    const updatedBooking = await API.updateBookingStatus(bookingId, status);

    // user-friendly messages per status
    const statusMessages = {
      pending_confirmation: 'Job marked as completed by artisan. Waiting for client confirmation.',
      completed:            'Job marked completed.',
      confirmed:            'Booking confirmed.',
      declined:             'Booking declined.',
      cancelled:            'Booking cancelled.',
      in_progress:          'Booking is now in progress.'
    };

    this.showToast(statusMessages[status] || `Booking updated to ${status}`, 'success');

    // refresh the relevant view so the UI reflects the change
    if (role === 'artisan') {
      // openMyClients expects artisan to view clients/bookings for them
      if (typeof this.openMyClients === 'function') await this.openMyClients();
    } else {
      if (typeof this.openMyBookings === 'function') await this.openMyBookings();
    }

    return updatedBooking;
  } catch (err) {
    console.error('Failed to update booking:', err);
    // Try to parse a useful message from different error shapes
    const msg = err?.message ||
                err?.response?.data?.message ||
                (err?.originalError && err.originalError.message) ||
                'Failed to update booking';
    this.showToast(msg, 'error');
    // rethrow if caller needs to handle it
    throw err;
  }
}

   /** async handleBookingAction(bookingId, action) {
  try {
    let status;
    switch(action) {
      case 'accept':
      case 'confirmed':
        status = 'confirmed';
        break;
      case 'decline':
        status = 'declined';
        break;
      case 'completed':
        // When artisan marks as completed, set status to 'pending_confirmation'
        if (this.state.user.role === 'artisan') {
          status = 'pending_confirmation';
        } else {
          status = 'completed';
        }
        break;
      case 'confirm_completion':
        // Client confirms the completion
        status = 'completed';
        break;
      case 'reject_completion':
        // Client rejects completion, returns to confirmed
        status = 'confirmed';
        break;
      default:
        status = action;
    }

    await API.updateBookingStatus(bookingId, status);
    
    let message;
    if (status === 'pending_confirmation') {
      message = 'Job marked as completed. Waiting for client confirmation.';
    } else if (status === 'completed' && action === 'confirm_completion') {
      message = 'Job completion confirmed. Payment can now be processed.';
    } else if (status === 'confirmed' && action === 'reject_completion') {
      message = 'Job completion rejected. Booking returned to confirmed status.';
    } else {
      message = `Booking ${status} successfully`;
    }
    
    this.showToast(message, 'success');
    
    // Refresh the current modal
    if (this.state.user.role === 'artisan') {
      this.openMyClients();
    } else {
      this.openMyBookings();
    }
    
    console.log('Status to send:', status); // Debug log
    
    const result = await API.updateBookingStatus(bookingId, status);
    console.log('API result:', result); // Debug log
    
    
  } catch (error) {
    console.error('Failed to update booking:', error);
    this.showToast('Failed to update booking', 'error');
  }
}**/
  /**async handleBookingAction(bookingId, action) {
    try {
      let status;
      switch(action) {
        case 'accept':
        case 'confirmed':
          status = 'confirmed';
          break;
        case 'decline':
          status = 'declined';
          break;
        case 'completed':
          status = 'completed';
          break;
        default:
          status = action;
      }

      await API.updateBookingStatus(bookingId, status);
      this.showToast(`Booking ${status} successfully`, 'success');
      
      // Refresh the current modal
      if (this.state.user.role === 'artisan') {
        this.openMyClients();
      } else {
        this.openMyBookings();
      }
    } catch (error) {
      console.error(`Failed to update booking:`, error);
      this.showToast(`Failed to update booking`, 'error');
    }
  }**/

  // User Bookings
   
  async openMyBookings() {
  if (!this.state.user) {
    this.openLoginModal();
    return;
  }

  try {
    const bookings = await API.getUserBookings(this.state.user.id);
    
    const html = `
      <div class="my-bookings-modal" style="width: 100% !important; height: 100% !important;">
        <h2>My Bookings</h2>
        <p class="muted">Track your service requests and appointments</p>
        
        <div class="bookings-list">
          ${bookings.length ? bookings.map(booking => {
            let statusText = (booking.status || 'pending').toUpperCase();
            let statusClass = booking.status || 'pending';
            
            if (booking.status === 'pending_confirmation') {
              statusText = 'AWAITING YOUR CONFIRMATION';
              statusClass = 'pending-confirmation';
            }
            
            return `
              <div class="booking-item">
                <div class="booking-header">
                  <strong>${this.escapeHtml(booking.service)}</strong>
                  <span class="status-badge status-${statusClass}">${statusText}</span>
                </div>
                <p class="muted">with ${this.escapeHtml(booking.artisanName || 'Artisan')}</p>
                <p><i class="fas fa-calendar"></i> ${new Date(booking.date).toLocaleDateString()} at ${booking.time}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(booking.location || 'Location TBD')}</p>
                <p><i class="fas fa-money-bill"></i> Amount: ${this.formatCurrency(booking.amount || 0)}</p>
                
                ${booking.status === 'pending_confirmation' ? `
                  <div class="urgent-notice">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Action Required:</strong> Artisan has marked this job as completed. Please review and confirm.
                  </div>
                ` : ''}
                
                <div class="booking-actions">
                  ${booking.status === 'pending' ? `
                    <button class="link-btn cancel-booking" data-id="${booking.id}">Cancel</button>
                  ` : ''}
                  ${booking.status === 'pending_confirmation' ? `
                    <button class="btn-cta confirm-completion-btn" data-id="${booking.id}">Confirm Completion</button>
                    <button class="link-btn reject-completion-btn" data-id="${booking.id}">Reject</button>
                  ` : ''}
                  ${booking.status === 'completed' && this.state.user.role === 'client' ? `
                    <button class="btn-cta review-booking" data-id="${booking.id}" data-artisan="${booking.artisanId}">Leave Review</button>
                  ` : ''}
                  <button class="link-btn view-booking-details" data-id="${booking.id}">Details</button>
                </div>
              </div>
            `;
          }).join('') : '<p class="muted">No bookings yet. Start by booking an artisan!</p>'}
        </div>

        <div style="text-align: center; margin-top: 20px;">
          <button id="close-bookings" class="link-btn">Close</button>
        </div>
      </div>
    `;
    
    this.showModal(html, () => {
      this.$$('.cancel-booking').forEach(btn => {
        btn.addEventListener('click', (e) => this.cancelBooking(e.target.dataset.id));
      });
      
      this.$$('.view-booking-details').forEach(btn => {
        btn.addEventListener('click', (e) => this.openBookingDetails(e.target.dataset.id));
      });

      this.$$('.review-booking').forEach(btn => {
        btn.addEventListener('click', (e) => this.openReviewModal(e.target.dataset.id, e.target.dataset.artisan));
      });

      // New handlers for completion confirmation
      this.$$('.confirm-completion-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          if (confirm('Are you satisfied with the completed work?')) {
            this.handleBookingAction(e.target.dataset.id, 'confirm_completion');
          }
        });
      });

      this.$$('.reject-completion-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          if (confirm('Are you sure the work is not completed to your satisfaction? This will return the booking to active status.')) {
            this.handleBookingAction(e.target.dataset.id, 'reject_completion');
          }
        });
      });
      
      this.$('#close-bookings')?.addEventListener('click', () => this.hideModal());
    });

  } catch (error) {
    console.error('Failed to load bookings:', error);
    this.showToast('Failed to load bookings', 'error');
  }
}
    /**async openMyBookings() {
    if (!this.state.user) {
      this.openLoginModal();
      return;
    }

    try {
      const bookings = await API.getUserBookings(this.state.user.id);
      
      const html = `
        <div class="my-bookings-modal" style="width: 100% !important;
  height: 100% !important;">
          <h2>My Bookings</h2>
          <p class="muted">Track your service requests and appointments</p>
          
          <div class="bookings-list">
            ${bookings.length ? bookings.map(booking => `
              <div class="booking-item">
                <div class="booking-header">
                  <strong>${this.escapeHtml(booking.service)}</strong>
                  <span class="status-badge status-${booking.status}">${booking.status.toUpperCase()}</span>
                </div>
                <p class="muted">with ${this.escapeHtml(booking.artisanName || 'Artisan')}</p>
                <p><i class="fas fa-calendar"></i> ${new Date(booking.date).toLocaleDateString()} at ${booking.time}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(booking.location || 'Location TBD')}</p>
                <p><i class="fas fa-money-bill"></i> Amount: ${this.formatCurrency(booking.amount || 0)}</p>
                
                <div class="booking-actions">
                  ${booking.status === 'pending' ? `
                    <button class="link-btn cancel-booking" data-id="${booking.id}">Cancel</button>
                  ` : ''}
                  ${booking.status === 'completed' && this.state.user.role === 'client' ? `
                    <button class="btn-cta review-booking" data-id="${booking.id}" data-artisan="${booking.artisanId}">Leave Review</button>
                  ` : ''}
                  <button class="link-btn view-booking-details" data-id="${booking.id}">Details</button>
                </div>
              </div>
            `).join('') : '<p class="muted">No bookings yet. Start by booking an artisan!</p>'}
          </div>

          <div style="text-align: center; margin-top: 20px;">
            <button id="close-bookings" class="link-btn">Close</button>
          </div>
        </div>
      `;
      
      this.showModal(html, () => {
        this.$$('.cancel-booking').forEach(btn => {
          btn.addEventListener('click', (e) => this.cancelBooking(e.target.dataset.id));
        });
        
        this.$$('.view-booking-details').forEach(btn => {
          btn.addEventListener('click', (e) => this.openBookingDetails(e.target.dataset.id));
        });

        this.$$('.review-booking').forEach(btn => {
          btn.addEventListener('click', (e) => this.openReviewModal(e.target.dataset.id, e.target.dataset.artisan));
        });
        
        this.$('#close-bookings')?.addEventListener('click', () => this.hideModal());
      });

    } catch (error) {
      console.error('Failed to load bookings:', error);
      this.showToast('Failed to load bookings', 'error');
    }
  }**/
  
  
  async openBookingDetails(bookingId) {
  try {
    const bookings = await API.getUserBookings();
    const booking = bookings.find(b => b.id === bookingId);
    
    if (!booking) {
      this.showToast('Booking not found', 'error');
      return;
    }

    // Count completed jobs exactly like in user stats
    let artisanCompletedJobs = 0;
    if (booking.artisanId && this.state.user.role === 'client') {
      try {
        const artisanBookings = await pb.collection('bookings').getFullList({
          filter: `artisan.id = "${booking.artisanId}"`
        });
        artisanCompletedJobs = artisanBookings.filter(b => b.status === 'completed').length;
      } catch (error) {
        console.error('Failed to count completed jobs:', error);
      }
    }

    // Status display logic
    let statusText = (booking.status || 'pending').toUpperCase();
    let statusClass = booking.status || 'pending';
    
    if (booking.status === 'pending_confirmation') {
      statusText = 'AWAITING CLIENT CONFIRMATION';
      statusClass = 'pending-confirmation';
    }

    const html = `
      <div class="booking-details-modal">
        <h2>Booking Details</h2>
        
        <div class="booking-info-card">
          <div class="booking-ref">
            <strong>Reference: ${booking.reference || 'N/A'}</strong>
            <span class="status-badge status-${statusClass}">${statusText}</span>
          </div>
          
          <div class="booking-service">
            <h4>${this.escapeHtml(booking.service)}</h4>
            <p class="muted">${this.escapeHtml(booking.description)}</p>
          </div>
          
          <div class="booking-details-grid">
            <div class="detail-item">
              <i class="fas fa-user"></i>
              <span>${this.state.user.role === 'client' ? 'Artisan' : 'Client'}: 
                <strong>${this.escapeHtml(this.state.user.role === 'client' ? booking.artisanName : booking.clientName)}</strong>
                ${this.state.user.role === 'client' ? 
                  `<br><small class="muted"><i class="fas fa-check-circle"></i> ${artisanCompletedJobs} completed jobs</small>` 
                  : ''}
              </span>
            </div>
            <div class="detail-item">
              <i class="fas fa-calendar"></i>
              <span>Date: <strong>${new Date(booking.date).toLocaleDateString()}</strong></span>
            </div>
            <div class="detail-item">
              <i class="fas fa-clock"></i>
              <span>Time: <strong>${booking.time}</strong></span>
            </div>
            <div class="detail-item">
              <i class="fas fa-map-marker-alt"></i>
              <span>Location: <strong>${this.escapeHtml(booking.location || 'TBD')}</strong></span>
            </div>
            <div class="detail-item">
              <i class="fas fa-money-bill"></i>
              <span>Amount: <strong>${this.formatCurrency(booking.amount || 0)}</strong></span>
            </div>
            <div class="detail-item">
              <i class="fas fa-credit-card"></i>
              <span>Payment: <strong>${this.escapeHtml(booking.paymentMethod || 'TBD')}</strong></span>
            </div>
            <div class="detail-item">
              <i class="fas fa-file-text"></i>
              <span>Description: <strong>${this.escapeHtml(booking.description || 'No description')}</strong></span>
            </div>
          </div>
        </div>

        <div class="booking-actions-modal">
          ${booking.status === 'pending' && this.state.user.role === 'artisan' ? `
            <button id="confirm-booking-detail" class="btn-primary" data-id="${booking.id}">
              <i class="fas fa-check"></i> Accept Booking
            </button>
            <button id="decline-booking-detail" class="link-btn" data-id="${booking.id}">
              Decline
            </button>
          ` : ''}
          
          ${booking.status === 'confirmed' && this.state.user.role === 'artisan' ? `
            <button id="complete-booking-detail" class="btn-primary" data-id="${booking.id}">
              <i class="fas fa-check-circle"></i> Mark as Completed
            </button>
          ` : ''}
          
          ${booking.status === 'pending_confirmation' && this.state.user.role === 'client' ? `
            <div class="confirmation-section">
              <h4>Artisan has marked this job as completed. Please confirm:</h4>
              <div style="display: flex; gap: 12px; margin-top: 16px;">
                <button id="confirm-completion" class="btn-primary" data-id="${booking.id}">
                  <i class="fas fa-check"></i> Confirm Completion
                </button>
                <button id="reject-completion" class="link-btn" data-id="${booking.id}">
                  <i class="fas fa-times"></i> Reject - Work Not Complete
                </button>
              </div>
            </div>
          ` : ''}
          
          ${booking.status === 'pending_confirmation' && this.state.user.role === 'artisan' ? `
            <div class="waiting-section">
              <p class="muted">
                <i class="fas fa-clock"></i> Waiting for client to confirm job completion...
              </p>
            </div>
          ` : ''}
          
          ${booking.status === 'completed' && this.state.user.role === 'client' ? `
            <button id="review-booking-detail" class="btn-primary" data-id="${booking.id}" data-artisan="${booking.artisanId}">
              <i class="fas fa-star"></i> Leave Review
            </button>
          ` : ''}
          
          ${booking.status === 'completed' && this.state.user.role === 'artisan' ? `
            <div class="completed-section">
              <p style="color: var(--green);">
                <i class="fas fa-check-circle"></i> Job completed and confirmed by client
              </p>
            </div>
          ` : ''}
        </div>

        <div style="text-align: center; margin-top: 20px;">
          <button id="close-booking-details" class="link-btn">Close</button>
        </div>
      </div>
    `;

    this.showModal(html, () => {
      this.$('#confirm-booking-detail')?.addEventListener('click', (e) => {
        this.handleBookingAction(e.target.dataset.id, 'confirmed');
      });

      this.$('#decline-booking-detail')?.addEventListener('click', (e) => {
        this.handleBookingAction(e.target.dataset.id, 'declined');
      });

      this.$('#complete-booking-detail')?.addEventListener('click', (e) => {
        if (confirm('Are you sure you have completed this job? The client will be asked to confirm.')) {
          this.handleBookingAction(e.target.dataset.id, 'completed');
        }
      });
      
      this.$('#confirm-completion')?.addEventListener('click', (e) => {
        if (confirm('Are you satisfied with the completed work?')) {
          this.handleBookingAction(e.target.dataset.id, 'confirm_completion');
        }
      });
      
      this.$('#reject-completion')?.addEventListener('click', (e) => {
        if (confirm('Are you sure the work is not completed to your satisfaction? This will return the booking to active status.')) {
          this.handleBookingAction(e.target.dataset.id, 'reject_completion');
        }
      });
      
      this.$('#review-booking-detail')?.addEventListener('click', (e) => 
        this.openReviewModal(e.target.dataset.id, e.target.dataset.artisan));
      this.$('#close-booking-details')?.addEventListener('click', () => this.hideModal());
    });

  } catch (error) {
    console.error('Failed to load booking details:', error);
    this.showToast('Failed to load booking details', 'error');
  }
}
 /** async openBookingDetails(bookingId) {
  try {
    const bookings = await API.getUserBookings();
    const booking = bookings.find(b => b.id === bookingId);
    
    if (!booking) {
      this.showToast('Booking not found', 'error');
      return;
    }

    // Count completed jobs exactly like in user stats
    let artisanCompletedJobs = 0;
    if (booking.artisanId && this.state.user.role === 'client') {
      try {
        const artisanBookings = await pb.collection('bookings').getFullList({
          filter: `artisan.id = "${booking.artisanId}"`
        });
        artisanCompletedJobs = artisanBookings.filter(b => b.status === 'completed').length;
      } catch (error) {
        console.error('Failed to count completed jobs:', error);
      }
    }

      const html = `
        <div class="booking-details-modal">
          <h2>Booking Details</h2>
          
          <div class="booking-info-card">
            <div class="booking-ref">
              <strong>Reference: ${booking.reference || 'N/A'}</strong>
              <span class="status-badge status-${booking.status}">${booking.status.toUpperCase()}</span>
            </div>
            
            <div class="booking-service">
              <h4>${this.escapeHtml(booking.service)}</h4>
              <p class="muted">${this.escapeHtml(booking.description)}</p>
            </div>
            
            <div class="detail-item">
          <i class="fas fa-user"></i>
          <span>${this.state.user.role === 'client' ? 'Artisan' : 'Client'}: 
            <strong>${this.escapeHtml(this.state.user.role === 'client' ? booking.artisanName : booking.clientName)}</strong>
            ${this.state.user.role === 'client' ? 
              `<br><small class="muted"><i class="fas fa-check-circle"></i> ${artisanCompletedJobs} completed jobs</small>` 
              : ''}
          </span>
        </div> 
              <!--<div class="detail-item">
                <i class="fas fa-user"></i>
                <span>${this.state.user.role === 'client' ? 'Artisan' : 'Client'}: 
                  <strong>${this.escapeHtml(this.state.user.role === 'client' ? booking.artisanName : booking.clientName)}</strong>
                </span>
              </div>-->
              <div class="detail-item">
                <i class="fas fa-calendar"></i>
                <span>Date: <strong>${new Date(booking.date).toLocaleDateString()}</strong></span>
              </div>
              <div class="detail-item">
                <i class="fas fa-clock"></i>
                <span>Time: <strong>${booking.time}</strong></span>
              </div>
              <div class="detail-item">
                <i class="fas fa-map-marker-alt"></i>
                <span>Location: <strong>${this.escapeHtml(booking.location || 'TBD')}</strong></span>
              </div>
              <div class="detail-item">
                <i class="fas fa-money-bill"></i>
                <span>Amount: <strong>${this.formatCurrency(booking.amount || 0)}</strong></span>
              </div>
              <div class="detail-item">
                <i class="fas fa-credit-card"></i>
                <span>Payment: <strong>${this.escapeHtml(booking.paymentMethod || 'TBD')}</strong></span>
              </div>
              <div class="detail-item">
                <i class="fas fa-file-text"></i>
                <span>Description: <strong>${this.escapeHtml(booking.description || 'No description')}</strong></span>
              </div>
            </div>
          </div>

          <div class="booking-actions-modal">
            ${booking.status === 'pending' && this.state.user.role === 'artisan' ? `
              <button id="confirm-booking-detail" class="btn-primary" data-id="${booking.id}">
                <i class="fas fa-check"></i> Confirm Booking
              </button>
              <button id="decline-booking-detail" class="link-btn" data-id="${booking.id}">
                Decline
              </button>
            ` : ''}
            
            ${booking.status === 'confirmed' && this.state.user.role === 'artisan' ? `
              <button id="complete-booking-detail" class="btn-primary" data-id="${booking.id}">
                <i class="fas fa-check-circle"></i> Mark as Completed
              </button>
            ` : ''}
            
            ${booking.status === 'completed' && this.state.user.role === 'client' ? `
              <button id="review-booking-detail" class="btn-primary" data-id="${booking.id}" data-artisan="${booking.artisanId}">
                <i class="fas fa-star"></i> Leave Review
              </button>
            ` : ''}
          </div>

          <div style="text-align: center; margin-top: 20px;">
            <button id="close-booking-details" class="link-btn">Close</button>
          </div>
        </div>
      `;

      this.showModal(html, () => {
        this.$('#confirm-booking-detail')?.addEventListener('click', (e) => {
          this.handleBookingAction(e.target.dataset.id, 'confirmed');
        });

        this.$('#decline-booking-detail')?.addEventListener('click', (e) => {
          this.handleBookingAction(e.target.dataset.id, 'declined');
        });

        this.$('#complete-booking-detail')?.addEventListener('click', (e) => {
          this.handleBookingAction(e.target.dataset.id, 'completed');
        });
        
        this.$('#review-booking-detail')?.addEventListener('click', (e) => 
          this.openReviewModal(e.target.dataset.id, e.target.dataset.artisan));
        this.$('#close-booking-details')?.addEventListener('click', () => this.hideModal());
      });

    } catch (error) {
      console.error('Failed to load booking details:', error);
      this.showToast('Failed to load booking details', 'error');
    }
  }**/

  async cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      await API.updateBookingStatus(bookingId, 'cancelled');
      this.showToast('Booking cancelled successfully', 'success');
      this.openMyBookings(); // Refresh
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      this.showToast('Failed to cancel booking', 'error');
    }
  }

  // Notifications
  async startNotificationPolling() {
    if (!this.state.user) return;

    if (this.state.notificationsPoller) {
      clearInterval(this.state.notificationsPoller);
    }

    let lastNotificationCheck = Date.now();
    let knownNotificationIds = new Set();

    const poll = async () => {
      try {
        const notifications = await API.getNotifications(this.state.user.id);
        const unreadCount = notifications.filter(n => !n.read).length;
        
        const newNotifications = notifications.filter(n => {
          const notificationTime = new Date(n.created).getTime();
          const isNew = notificationTime > lastNotificationCheck && !knownNotificationIds.has(n.id);
          knownNotificationIds.add(n.id);
          return isNew && !n.read;
        });
        
        for (const notification of newNotifications) {
          await this.showPushNotification(
            notification.title || 'Naco Update',
            notification.message || 'You have a new notification',
            notification.data || {}
          );
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        lastNotificationCheck = Date.now();
        
        this.setState({ 
          notifications,
          notificationCount: unreadCount
        });
      } catch (error) {
        console.warn('Notification polling failed:', error);
      }
    };

    await poll();
    
    this.setState({ 
      notificationsPoller: setInterval(poll, 5000)
    });
  }

  stopNotificationPolling() {
    if (this.state.notificationsPoller) {
      clearInterval(this.state.notificationsPoller);
      this.setState({ notificationsPoller: null });
    }
  }
  
  async enableNotifications() {
    const granted = await this.requestNotificationPermission();
    if (granted) {
      this.showPushNotification(
        'Notifications Enabled!',
        'You will now receive booking updates and important notifications.',
        {}
      );
    }
  }
  
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      console.log('Notification permission already granted');
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notifications are blocked. Please enable them in your browser settings.');
      this.showToast('Please enable notifications in your browser settings to receive updates', 'info');
      return false;
    }

    try {
      this.showToast('Please allow notifications to stay updated on your bookings', 'info');
      
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('Notification permission granted');
        this.showToast('Notifications enabled! You\'ll receive booking updates.', 'success');
        
        setTimeout(() => {
          this.showPushNotification(
            'Notifications Active!',
            'You will now receive important updates about your bookings.',
            {}
          );
        }, 1000);
        
        return true;
      } else {
        console.log('Notification permission denied');
        this.showToast('Notifications disabled. You can enable them later in settings.', 'info');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async showPushNotification(title, message, data = {}) {
    console.log('Attempting to show notification:', { title, message, data });
    
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      this.showToast(`${title}: ${message}`, 'info');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        if (registration && registration.showNotification) {
          await registration.showNotification(title, {
            body: message,
            icon: '/assets/icon-192.png',
            badge: '/assets/icon-192.png',
            tag: `naco-${data.bookingId || Date.now()}`,
            data: data,
            requireInteraction: false,
            silent: false,
            vibrate: [200, 100, 200],
            actions: [
              {
                action: 'view',
                title: 'View',
                icon: '/assets/icon-192.png'
              }
            ]
          });
          console.log('Service Worker notification sent');
          return;
        }
      }

      const notification = new Notification(title, {
        body: message,
        icon: '/assets/icon-192.png',
        tag: `naco-${data.bookingId || Date.now()}`,
        requireInteraction: false,
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        if (data.bookingId) {
          this.openBookingDetails(data.bookingId);
        }
        notification.close();
      };

      setTimeout(() => notification.close(), 5000);
      console.log('Regular notification sent');

    } catch (error) {
      console.error('Failed to show notification:', error);
      this.showToast(`${title}: ${message}`, 'info');
    }
  }

  async markAllNotificationsRead() {
    try {
      await API.markNotificationsRead(this.state.user.id);
      this.setState({ 
        notifications: this.state.notifications.map(n => ({ ...n, read: true })),
        notificationCount: 0 
      });
      this.showToast('All notifications marked as read', 'success');
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      this.showToast('Failed to update notifications', 'error');
    }
  }

  async openNotifications() {
    if (!this.state.user) {
      this.openLoginModal();
      return;
    }

    try {
      const notifications = await API.getNotifications();
      
      const html = `
        <div class="notifications-modal">
          <h2>Notifications</h2>
          
          <div class="notifications-list">
            ${notifications.length ? notifications.map(notification => `
              <div class="notification-item ${notification.read ? 'read' : 'unread'}" 
                   data-id="${notification.id}" 
                   data-booking-id="${notification.data?.bookingId || ''}"
                   style="cursor: pointer;">
                <div class="notification-icon ${notification.read ? 'read-icon' : 'unread-icon'}">
                  <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                  <strong>${this.escapeHtml(notification.title)}</strong>
                  <p>${this.escapeHtml(notification.message)}</p>
                  <small class="muted">${new Date(notification.created).toLocaleString()}</small>
                </div>
                ${!notification.read ? '<div class="notification-badge"></div>' : ''}
              </div>
            `).join('') : '<p class="muted">No notifications yet</p>'}
          </div>

          <div style="display: flex; gap: 12px; margin-top: 20px;">
            ${notifications.some(n => !n.read) ? `
              <button id="mark-all-read" class="btn-primary">Mark All Read</button>
            ` : ''}
            <button id="close-notifications" class="link-btn">Close</button>
          </div>
        </div>
      `;

      this.showModal(html, () => {
        this.$$('.notification-item').forEach(item => {
          item.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const notificationId = item.dataset.id;
            const bookingId = item.dataset.bookingId;
            const notification = notifications.find(n => n.id === notificationId);
            
            if (notification && !notification.read) {
              try {
                await pb.collection('notifications').update(notificationId, { read: true });
                item.classList.remove('unread');
                item.classList.add('read');
                item.querySelector('.notification-icon').classList.remove('unread-icon');
                item.querySelector('.notification-icon').classList.add('read-icon');
                const badge = item.querySelector('.notification-badge');
                if (badge) badge.remove();
              } catch (error) {
                console.error('Failed to mark as read:', error);
              }
            }
            
            if (bookingId) {
              this.hideModal();
              setTimeout(() => {
                this.openBookingDetails(bookingId);
              }, 300);
            }
          });
        });

        this.$('#mark-all-read')?.addEventListener('click', async () => {
          await this.markAllNotificationsRead();
          setTimeout(() => {
            this.openNotifications();
          }, 200);
        });
        
        this.$('#close-notifications')?.addEventListener('click', () => this.hideModal());
      });
    } catch (error) {
      console.error('Failed to load notifications:', error);
      this.showToast('Failed to load notifications', 'error');
    }
  }

  getNotificationIcon(type) {
    const icons = {
      booking: 'fa-calendar',
      payment: 'fa-credit-card',
      message: 'fa-comment',
      system: 'fa-bell',
      default: 'fa-info-circle'
    };
    return icons[type] || icons.default;
  }

  async openReviewModal(bookingId, artisanId) {
    try {
      const artisan = await API.getFullArtisanData(artisanId);
      
      const html = `
        <div class="review-modal">
          <h2>Review ${this.escapeHtml(artisan.name)}</h2>
          
          <div class="review-artisan-info">
            <img src="${artisan.photo || '../assets/avatar-placeholder.png'}" alt="${this.escapeHtml(artisan.name)}">
            <div>
              <strong>${this.escapeHtml(artisan.name)}</strong>
              <p class="muted">${this.escapeHtml(artisan.skill)}</p>
            </div>
          </div>

          <form id="review-form" class="booking-form">
            <label>
              Rating
              <div class="star-rating" id="star-rating">
                ${[1,2,3,4,5].map(i => `
                  <i class="fas fa-star star-btn" data-rating="${i}"></i>
                `).join('')}
              </div>
              <input type="hidden" id="review-rating" required>
            </label>
            
            <label>
              Your Review
              <textarea id="review-text" placeholder="Share your experience..." rows="4" required></textarea>
            </label>

            <div style="display: flex; gap: 12px; margin-top: 20px;">
              <button type="button" id="submit-review" class="btn-primary">
                <i class="fas fa-star"></i> Submit Review
              </button>
              <button type="button" id="cancel-review" class="link-btn">Cancel</button>
              </div>
            </form>
          </div>
        `;

      this.showModal(html, () => {
        const stars = this.$$('.star-btn');
        const ratingInput = this.$('#review-rating');
        
        stars.forEach((star, index) => {
          star.addEventListener('click', () => {
            const rating = index + 1;
            ratingInput.value = rating;
            
            stars.forEach((s, i) => {
              if (i < rating) {
                s.style.color = '#ffd700';
              } else {
                s.style.color = '#ddd';
              }
            });
          });
        });

        this.$('#submit-review')?.addEventListener('click', async () => {
          const rating = parseInt(this.$('#review-rating').value);
          const text = this.$('#review-text').value;

          if (!rating || !text) {
            this.showToast('Please provide rating and review text', 'error');
            return;
          }

          try {
            await API.createReview({
              bookingId,
              artisanId,
              rating,
              text
            });
            
            this.hideModal();
            this.showToast('Review submitted successfully!', 'success');
          } catch (error) {
            this.showToast('Failed to submit review', 'error');
          }
        });

        this.$('#cancel-review')?.addEventListener('click', () => this.hideModal());
      });

    } catch (error) {
      console.error('Failed to open review modal:', error);
      this.showToast('Failed to load review form', 'error');
    }
  }

  // Premium Upgrade
  openPremiumUpgrade() {
    const html = `
      <div class="premium-modal">
        <div class="premium-header">
          <i class="fas fa-star premium-icon"></i>
          <h2>Upgrade to Premium</h2>
          <p class="muted">Get featured placement and exclusive benefits</p>
        </div>

        <div class="premium-benefits">
          <div class="benefit-item">
            <i class="fas fa-arrow-up"></i>
            <span>Featured placement in search results</span>
          </div>
          <div class="benefit-item">
            <i class="fas fa-star"></i>
            <span>Premium badge on your profile</span>
          </div>
          <div class="benefit-item">
            <i class="fas fa-chart-line"></i>
            <span>Advanced analytics and insights</span>
          </div>
          <div class="benefit-item">
            <i class="fas fa-headset"></i>
            <span>Priority customer support</span>
          </div>
          <div class="benefit-item">
            <i class="fas fa-bolt"></i>
            <span>Instant booking notifications</span>
          </div>
        </div>

        <div class="premium-pricing">
          <div class="price-card active">
            <h3>Monthly</h3>
            <div class="price">₦5,000<span>/month</span></div>
            <button class="btn-primary premium-subscribe" data-plan="monthly">Choose Plan</button>
          </div>
          <div class="price-card">
            <h3>Yearly</h3>
            <div class="price">₦50,000<span>/year</span></div>
            <div class="savings">Save ₦10,000</div>
            <button class="btn-primary premium-subscribe" data-plan="yearly">Choose Plan</button>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px;">
          <button id="close-premium" class="link-btn">Maybe Later</button>
        </div>
      </div>
    `;

    this.showModal(html, () => {
      this.$$('.premium-subscribe').forEach(btn => {
        btn.addEventListener('click', (e) => this.handlePremiumSubscription(e.target.dataset.plan));
      });
      this.$('#close-premium')?.addEventListener('click', () => this.hideModal());
    });
  }

  async handlePremiumSubscription(plan) {
    if (!this.state.user) {
      this.openLoginModal();
      return;
    }

    try {
      const success = await new Promise(resolve => {
        setTimeout(() => resolve(Math.random() > 0.3), 1000);
      });

      if (success) {
        const updatedUser = { ...this.state.user, premium: true };
        this.setState({ user: updatedUser });
        this.saveSession();
        this.hideModal();
        this.showToast('Premium subscription activated!', 'success');
      } else {
        this.showToast('Payment failed. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Premium subscription failed:', error);
      this.showToast('Subscription failed. Please try again.', 'error');
    }
  }

  // View All Featured
  async viewAllFeatured() {
  try {
    // Get all featured artisans
    const featuredArtisans = this.state.artisans.filter(a => a.premium);
    
    // Fetch reviews for all featured artisans to calculate average ratings
    const artisansWithRatings = await Promise.all(
      featuredArtisans.map(async (artisan) => {
        try {
          const reviews = await API.getReviewsForArtisan(artisan.id);
          const averageRating = reviews.length > 0 
            ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
            : 0;
          
          return {
            ...artisan,
            averageRating,
            reviewCount: reviews.length
          };
        } catch (error) {
          console.error(`Failed to fetch reviews for artisan ${artisan.id}:`, error);
          return {
            ...artisan,
            averageRating: 0,
            reviewCount: 0
          };
        }
      })
    );

    const html = `
      <div class="all-featured-modal">
        <h2>All Featured Artisans</h2>
        <p class="muted">Premium artisans in your area</p>
        
        <div class="featured-grid">
          ${artisansWithRatings.map(artisan => `
            <div class="featured-card" data-id="${artisan.id}">
              <img style="width: 300px; height: 250px; border-radius: 10px; object-fit: cover;" 
                   src="${artisan.photo || '../assets/avatar-placeholder.png'}" 
                   alt="${this.escapeHtml(artisan.name)}">
              <div class="featured-info">
                <strong>${this.escapeHtml(artisan.name)} ${this.renderVerificationBadge(artisan)}</strong>
                <p class="muted">${this.escapeHtml(artisan.skill)}</p>
                <p class="featured-location">${this.escapeHtml(artisan.location)}</p>
                <div class="featured-rating">
                  <i class="fas fa-star"></i> ${artisan.averageRating} (${artisan.reviewCount} reviews)
                </div>
                <div class="featured-rate">${this.formatCurrency(artisan.rate || 0)}</div>
                <hr>
                <br>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="text-align: center; margin-top: 20px;">
          <button id="close-featured" class="link-btn">Close</button>
        </div>
      </div>
    `;

    this.showModal(html, () => {
      this.$$('.featured-card').forEach(card => {
        card.addEventListener('click', () => {
          this.openArtisanProfile(card.dataset.id);
        });
      });
      this.$('#close-featured')?.addEventListener('click', () => this.hideModal());
    });

  } catch (error) {
    console.error('Failed to load featured artisans:', error);
    this.showToast('Failed to load featured artisans', 'error');
  }
}

  // Navigation
  toggleSideMenu() {
    this.setState({ isNavOpen: !this.state.isNavOpen });
    document.body.classList.toggle('nav-open', this.state.isNavOpen);
  }

  closeSideMenu() {
    this.setState({ isNavOpen: false });
    document.body.classList.remove('nav-open');
  }

  // Theme Management
  loadTheme() {
    const savedTheme = localStorage.getItem('naco_theme') || 
                      (this.state.user?.theme) || 
                      'light';
    
    this.setState({ isDarkMode: savedTheme === 'dark' });
    document.body.classList.toggle('dark', savedTheme === 'dark');
  }

  toggleTheme() {
    const newTheme = this.state.isDarkMode ? 'dark' : 'light';
    this.setState({ isDarkMode: !this.state.isDarkMode });
    document.body.classList.toggle('dark', !this.state.isDarkMode);
    localStorage.setItem('naco_theme', newTheme);

    if (this.state.user) {
      API.updateUserProfile(this.state.user.id, { theme: newTheme }).catch(console.error);
    }

    this.showToast(`Switched to ${newTheme} mode`, 'success');
  }

  // Session Management
  loadSession() {
    try {
      const sessionData = localStorage.getItem('naco_session');
      if (sessionData) {
        const user = JSON.parse(sessionData);
        this.setState({ user });
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      localStorage.removeItem('naco_session');
    }
  }

  saveSession() {
    try {
      if (this.state.user) {
        localStorage.setItem('naco_session', JSON.stringify(this.state.user));
      } else {
        localStorage.removeItem('naco_session');
      }
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  clearSession() {
    localStorage.removeItem('naco_session');
  }

  // PWA Installation
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.setState({ deferredPrompt: e });
      
      const installBtn = this.$('#install-btn');
      if (installBtn) {
        installBtn.classList.remove('hidden');
      }
    });
  }

  async installApp() {
    if (!this.state.deferredPrompt) return;

    try {
      this.state.deferredPrompt.prompt();
      const { outcome } = await this.state.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        this.showToast('App installed successfully!', 'success');
      }
      
      this.setState({ deferredPrompt: null });
      const installBtn = this.$('#install-btn');
      if (installBtn) installBtn.classList.add('hidden');
      
    } catch (error) {
      console.error('App installation failed:', error);
    }
  }
  
  setupServiceWorkerMessageListener() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'NOTIFICATION_CLICK') {
          const data = event.data.data;
          if (data.bookingId) {
            this.openBookingDetails(data.bookingId);
          }
        }
      });
    }
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('./service-worker.js');
        console.log('SW registered');
        
        this.setupServiceWorkerMessageListener();
        
        return registration;
      } catch (err) {
        console.warn('SW failed', err);
      }
    }
  }

  // Modal System
  
  showModal(content, callback) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <button style="color: green;" class="modal-close">&times;</button>
      ${content}
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  // Attach close handler directly to THIS modal instance
  const closeButton = modal.querySelector('.modal-close');
  closeButton.addEventListener('click', () => {
    this.hideSpecificModal(modal); // Close this specific modal
  });
  
  if (typeof callback === 'function') {
    callback();
  }
}

hideModal() {
  // Close the topmost modal (last one added)
  const modals = document.querySelectorAll('.modal-overlay');
  if (modals.length > 0) {
    const topModal = modals[modals.length - 1];
    this.hideSpecificModal(topModal);
  }
}

hideSpecificModal(modalElement) {
  if (modalElement) {
    modalElement.classList.add('fade-out');
    setTimeout(() => {
      modalElement.remove();
      
      // Only restore body overflow if no other modals exist
      const remainingModals = document.querySelectorAll('.modal-overlay');
      if (remainingModals.length === 0) {
        document.body.style.overflow = '';
      }
    }, 300);
  }
}

/**  showModal(content, callback) {
  const modal = document.createElement('div');
  modal.id = 'modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <button style="color: green;" class="modal-close">&times;</button>
      ${content}
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  modal.querySelector('.modal-close').addEventListener('click', () => this.hideModal());
  
  if (typeof callback === 'function') {
    callback();
  }
}

hideModal() {
  const modal = this.$('#modal');
  if (modal) {
    modal.classList.add('fade-out');
    setTimeout(() => {
      modal.remove();
      document.body.style.overflow = '';
    }, 300);
  }
}**/

  // Utility Methods
  renderVerificationBadge(user) {
    if (!user || !user.premium) return '';
    
    return `<i class="fas fa-check-circle verification-badge" title="Verified Premium User"></i>`;
  }

  calculateDistance(artisanLocation) {
    if (!this.state.currentLocation) {
      return Math.floor(Math.random() * 20) + 1;
    }

    if (this.state.selectedCity === artisanLocation) {
      return Math.floor(Math.random() * 5) + 1;
    } else {
      return Math.floor(Math.random() * 40) + 10;
    }
  }
  
 

  // Rendering Methods
  render() {
    this.renderHeader();
    this.updateMainVisibility();
    this.renderFeaturedArtisans();
    this.renderSearchResults();
    this.renderQuickCategories();
    this.renderSideNavigation();
    this.updateNotificationBadge();
    
    console.log('Render complete');
  }

  renderHeader() {
    const profilePic = this.$('#profile-pic');
    const menuName = this.$('#menu-name');
    const menuEmail = this.$('#menu-email');
    const roleLabel = this.$('#roleLabel');
    const roleSwitch = this.$('#roleSwitch');
    const profileDropdown = this.$('#profile-dropdown');

    if (this.state.user) {
      if (profilePic) {
        if (this.state.user?.avatar) {
          profilePic.src = pb.files.getUrl(this.state.user, this.state.user.avatar, { thumb: '100x100' });
        } else {
          profilePic.src = '../assets/avatar-placeholder.png';
        }
      }
      
      const menuAvatar = this.$('.menu-avatar');
      if (menuAvatar && this.state.user) {
        if (this.state.user?.avatar) {
          menuAvatar.src = pb.files.getUrl(this.state.user, this.state.user.avatar, { thumb: '100x100' });
        } else {
          menuAvatar.src = '../assets/avatar-placeholder.png';
        }
      }
      
      if (menuName) menuName.textContent = this.state.user.name || 'User';
      if (menuEmail) menuEmail.textContent = this.state.user.email || '';
      if (roleLabel) roleLabel.textContent = this.state.user.role === 'artisan' ? 'Artisan' : 'Client';
      if (roleSwitch) roleSwitch.checked = this.state.user.role === 'artisan';
    } else {
      if (menuName) menuName.textContent = 'Guest';
      if (menuEmail) menuEmail.textContent = 'Not signed in';
      if (roleLabel) roleLabel.textContent = 'Client';
      if (roleSwitch) roleSwitch.checked = false;
    }

    if (profileDropdown) {
      profileDropdown.classList.toggle('open', this.state.isProfileDropdownOpen);
    }

    const fab = this.$('#fab-book');
    if (fab) {
      if (this.state.user?.role === 'artisan') {
        fab.innerHTML = '<i class="fas fa-users"></i>';
        fab.title = 'My Clients';
      } else {
        fab.innerHTML = '<i class="fas fa-calendar-plus"></i>';
        fab.title = 'Quick Book';
      }
    }
  }

  renderFeaturedArtisans() {
    const container = this.$('#featured-list');
    if (!container) return;

    const featured = this.state.featuredArtisans
      .filter(artisan => !this.state.selectedCity || artisan.location === this.state.selectedCity)
      .slice(0, 8);

    container.innerHTML = featured.map(artisan => `
    <div class="step-container">
  <div class="feat-card" data-id="${artisan.id}" title="${this.escapeHtml(artisan.name)}">
    <img src="${artisan.photo || '../assets/avatar-placeholder.png'}" 
         alt="${this.escapeHtml(artisan.name)}"
         loading="lazy">

    <div class="feat-skill">
      ${this.escapeHtml(artisan.skill)}
    </div>
  </div>
</div>
    `).join('');

    container.classList.add('fade-in');
    this.bindFeaturedClickEvents();
  }

  bindFeaturedClickEvents() {
    const featuredList = this.$('#featured-list');
    if (!featuredList) return;

    const newFeaturedList = featuredList.cloneNode(true);
    featuredList.parentNode.replaceChild(newFeaturedList, featuredList);

    newFeaturedList.addEventListener('click', (e) => {
      const card = e.target.closest('.feat-card');
      if (!card) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const artisanId = card.dataset.id;
      if (artisanId) {
        this.openArtisanProfile(artisanId);
      }
    });
  }

  renderSearchResults() {
    const container = this.$('#results-list');
    if (!container) return;

    const sortedResults = [...this.state.filteredArtisans].sort((a, b) => {
      if (a.premium && !b.premium) return -1;
      if (!a.premium && b.premium) return 1;
      return (b.rating || 0) - (a.rating || 0);
    });

    container.innerHTML = sortedResults.map(artisan => {
      const distance = this.calculateDistance(artisan.location);
      const isFavorite = this.state.favorites.has(artisan.id);
      
      return `
  <div class="artisan-card fade-in" data-id="${artisan.id}">
    <div class="artisan-card-header">
      <img src="${artisan.photo || '../assets/avatar-placeholder.png'}" 
           alt="${this.escapeHtml(artisan.name)}"
           loading="lazy">
      <div class="artisan-info">
        <div class="artisan-title">
          <strong>
            ${this.escapeHtml(artisan.name)}
            ${this.renderVerificationBadge(artisan)}
          </strong>
          ${artisan.premium ? '<span class="premium-badge">PREMIUM</span>' : ''}
        </div>
        <div class="artisan-meta">
          ${this.escapeHtml(artisan.skill)} • ${this.escapeHtml(artisan.location)} • ${this.formatCurrency(artisan.rate)}
        </div>
        <div class="artisan-rating muted">
          <i class="fas fa-star"></i> ${(artisan.rating || 0).toFixed(1)} • 
          <i class="fas fa-map-marker-alt"></i> ${distance} km away
          ${artisan.availability ? ` • <span class="status-available">${artisan.availability}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="artisan-card-bottom">
      <div class="actions">
        <button class="btn-book btn-cta" aria-label="Book ${this.escapeHtml(artisan.name)}" data-action="book">
          <i class="fas fa-calendar-plus"></i>
        </button>
        <button class="btn-fav ${isFavorite ? 'active' : ''}" aria-label="${isFavorite ? 'Remove from' : 'Add to'} favorites" data-action="favorite">
          <i class="fas fa-heart"></i>
        </button>
        <button class="btn-wa" aria-label="WhatsApp ${this.escapeHtml(artisan.name)}" data-action="whatsapp">
          <i class="fab fa-whatsapp"></i>
        </button>
      </div>
    </div>
  </div>
`;
    }).join('');

    this.bindSearchResultsClickEvents();
  }

  bindSearchResultsClickEvents() {
    const resultsList = this.$('#results-list');
    if (!resultsList) return;

    const newResultsList = resultsList.cloneNode(true);
    resultsList.parentNode.replaceChild(newResultsList, resultsList);

    newResultsList.addEventListener('click', (e) => {
      const card = e.target.closest('.artisan-card');
      if (!card) return;

      const artisanId = card.dataset.id;
      const action = e.target.closest('[data-action]')?.dataset.action;

      e.preventDefault();
      e.stopPropagation();

      if (action === 'book') {
        this.openBookingForm(artisanId);
      } else if (action === 'favorite') {
        this.toggleFavorite(artisanId);
      } else if (action === 'whatsapp') {
        this.openWhatsApp(artisanId);
      } else {
        this.openArtisanProfile(artisanId);
      }
    });
  }

  renderQuickCategories() {
    const container = this.$('#quick-cats');
    if (!container) return;

    const categories = [
      { name: 'Electrician', icon: 'fas fa-bolt' },
      { name: 'Plumber', icon: 'fas fa-wrench' },
      { name: 'Tailor', icon: 'fas fa-cut' },
      { name: 'Mechanic', icon: 'fas fa-car' },
      { name: 'Beautician', icon: 'fas fa-spa' },
      { name: 'Tutor',},
      { name: 'Cleaner',},
      { name: 'Laundry',},
      { name: 'Carpenter', icon: 'fas fa-hammer' },
      { name: 'Graphic designer',},
      
      
      
      
      { name: 'General services',}
    ];

    container.innerHTML = categories.map(category => `
      <button class="chip" data-cat="${category.name}">
        <i class="${category.icon}"></i> ${category.name}
      </button>
    `).join('');
  }
  
  renderSideNavigation() {
    const profileMenu = this.$('#profile-menu');
    if (!profileMenu) return;

    const menuName = profileMenu.querySelector('#menu-name');
    const menuEmail = profileMenu.querySelector('#menu-email');
    const menuAvatar = profileMenu.querySelector('.menu-avatar');

    if (this.state.user) {
      menuName.textContent = this.state.user.name || 'User';
      menuEmail.textContent = this.state.user.email || '';
      menuAvatar.src = pb.files.getUrl(this.state.user, this.state.user.avatar, { thumb: '100x100' });
      menuAvatar.alt = `${this.state.user.name || 'User'} avatar`;
    } else {
      menuName.textContent = 'Guest';
      menuEmail.textContent = 'Not signed in';
      menuAvatar.src = 'assets/avatar-placeholder.png';
      menuAvatar.alt = 'Guest avatar';
    }

    const menuActions = {
      'nav-find': () => {
        this.closeProfileMenu?.();
        this.$('#search-input')?.focus();
      },
      'nav-bookings': () => {
        this.closeProfileMenu?.();
        this.openMyBookings?.();
      },
      'nav-favorites': () => {
        this.closeProfileMenu?.();
        this.openFavorites?.();
      },
      'nav-settings': () => {
        this.closeProfileMenu?.();
        this.openSettings?.();
      },
      'update-profile': () => {
        this.closeProfileMenu?.();
        this.openProfileUpdate?.();
      },
      'toggle-theme': () => {
        this.toggleTheme?.();
      },
      'upgrade-premium': () => {
        this.upgradeToPremium?.();
      },
      'logout': () => {
        this.logoutUser?.();
      }
    };

    Object.entries(menuActions).forEach(([id, action]) => {
      const btn = profileMenu.querySelector(`#${id}`);
      if (btn) {
        btn.onclick = action;
      }
    });

    const roleSwitch = profileMenu.querySelector('#roleSwitch');
    const roleLabel = profileMenu.querySelector('#roleLabel');
    if (roleSwitch) {
      roleSwitch.checked = this.state.user?.role === 'artisan';
      roleLabel.textContent = roleSwitch.checked ? 'Artisan' : 'Client';

      roleSwitch.onchange = () => {
        const newRole = roleSwitch.checked ? 'artisan' : 'client';
        if (this.switchUserRole) this.switchUserRole(newRole);
        roleLabel.textContent = newRole.charAt(0).toUpperCase() + newRole.slice(1);
      };
    }
  }
  
handleNotificationFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const notificationType = urlParams.get('notification');
  const notificationId = urlParams.get('id');
  
  if (notificationType === 'booking' && notificationId) {
    // Small delay to ensure app is initialized
    setTimeout(() => {
      this.openBookingDetails(notificationId);
    }, 1000);
  }
  
  // Clean up URL
  if (notificationType) {
    window.history.replaceState({}, '', window.location.pathname);
  }
}

  updateNotificationBadge() {
    const badge = this.$('#notif-count');
    if (!badge) return;

    if (this.state.notificationCount > 0) {
      badge.textContent = this.state.notificationCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
  
  async openNotificationsPage() {
  const notifPage = this.$('#notifications-page');
  if (!notifPage) {
    console.error('Notifications page element not found');
    // Fallback to old modal system
    this.openNotifications();
    return;
  }
  
  notifPage.classList.remove('hidden');
  setTimeout(() => {
    notifPage.classList.add('active');
  }, 10);
  
  await this.loadNotificationsPage();
}

// Missing function: closeNotificationsPage
closeNotificationsPage() {
  const notifPage = this.$('#notifications-page');
  if (!notifPage) return;
  
  notifPage.classList.remove('active');
  setTimeout(() => {
    notifPage.classList.add('hidden');
  }, 300);
}

 
// Update openLoginModal():
async openLoginModal() {
  // Close any open modals first
  this.hideModal();

  const html = `
    <div class="auth-modal">
  <div class="auth-header">
    <h2>Welcome to <span class="brand">Naco</span></h2>
    <p class="muted">Login or create an account to get started</p>
  </div>

  <form id="auth-form" class="auth-form">
    <div class="form-group">
      <label for="auth-email">Email</label>
      <input id="auth-email" type="email" placeholder="Enter your email" required autocomplete="email">
    </div>

    <div class="form-group">
      <label for="auth-pass">Password</label>
      <input id="auth-pass" type="password" placeholder="Enter your password" required autocomplete="current-password">
    </div>

    <div class="form-group">
      <label for="auth-role">I am</label>
      <select id="auth-role">
        <option value="artisan">An Artisan (Providing services)</option>
        <option value="client">A Client (Looking for services)</option>
      </select>
    </div>

    <div class="auth-actions">
      <button type="button" id="auth-login-btn" class="btn-primary">
        <i class="fas fa-sign-in-alt"></i> Login
      </button>
      <button type="button" id="auth-signup-btn" class="btn-secondary">
        <i class="fas fa-user-plus"></i> Sign Up
      </button>
    </div>
  </form>
</div>
  `;

  this.showModal(html, () => {
    this.$('#auth-login-btn')?.addEventListener('click', () => this.handleLogin());
    this.$('#auth-signup-btn')?.addEventListener('click', () => this.handleSignup());
  });
}

    async openProfilePage() {
  const profilePage = this.$('#profile-page');
  if (!profilePage) {
    console.error('Profile page element not found');
    return;
  }
  
  profilePage.classList.remove('hidden');
  setTimeout(() => {
    profilePage.classList.add('active');
  }, 10);
  
  await this.loadProfilePage();
}

// Missing function: closeProfilePage
closeProfilePage() {
  const profilePage = this.$('#profile-page');
  if (!profilePage) return;
  
  profilePage.classList.remove('active');
  setTimeout(() => {
    profilePage.classList.add('hidden');
  }, 300);
}

// Missing function: loadNotificationsPage
async loadNotificationsPage() {
  if (!this.state.user) return;
  
  const container = this.$('#notifications-content');
  const markAllBtn = this.$('#mark-all-read');
  
  if (!container) {
    console.error('Notifications content container not found');
    return;
  }
  
  try {
    const notifications = await API.getNotifications();
    const hasUnread = notifications.some(n => !n.read);
    
    if (hasUnread && markAllBtn) {
      markAllBtn.classList.remove('hidden');
    } else if (markAllBtn) {
      markAllBtn.classList.add('hidden');
    }
    
    if (notifications.length > 0) {
      container.innerHTML = notifications.map(notification => this.renderNotificationItem(notification)).join('');
    } else {
      container.innerHTML = '<p class="muted">No notifications yet</p>';
    }
  } catch (error) {
    console.error('Failed to load notifications:', error);
    container.innerHTML = '<p class="muted">Failed to load notifications</p>';
  }
}

// LoadProfilePage 


async loadProfilePage() {
  const container = this.$('.profile-container');
  if (!container) {
    console.error('Profile container not found');
    return;
  }

  // Not logged in
  if (!pb.authStore.isValid || !pb.authStore.model) {
    container.innerHTML = `
      <div class="profile-header">
        <h3>Welcome to Naco</h3>
        <p>Please log in to view your profile</p>
        <button id="login-from-profile" class="btn-primary">Login</button>
      </div>
    `;
    // attach login button
    const loginBtn = container.querySelector('#login-from-profile');
    if (loginBtn) loginBtn.addEventListener('click', () => this.showAuthModal?.());
    return;
  }

  // Use auth model as source of truth
  const user = pb.authStore.model;

  // Preload stats (safe fallbacks)
  let totalBookings = 0, completedJobs = 0, favoritesCount = 0;
  try {
    const [bookings, favorites] = await Promise.allSettled([
      API.getUserBookings?.() ?? Promise.resolve([]),
      API.getUserFavorites?.() ?? Promise.resolve([]),
    ]).then(results => results.map(r => (r.status === 'fulfilled' ? r.value : [])));

    totalBookings = bookings.length || 0;
    completedJobs = (bookings || []).filter(b => b.status === 'completed').length;
    favoritesCount = (favorites || []).length;
  } catch (e) {
    console.warn('Profile stats load warning:', e);
  }

  const avatarUrl = user.avatar
    ? pb.files.getUrl(user, user.avatar, { thumb: '200x200' })
    : '../assets/avatar-placeholder.png';

  // Build UI
  container.innerHTML = `
    <div class="profile-header">
      <img src="${avatarUrl}" alt="Profile" class="profile-avatar-large">
      <h3 class="profile-name">
        ${this.escapeHtml(user.name || '')}
        ${this.renderVerificationBadge?.(user) ?? ''}
      </h3>
      <p class="profile-role">${user.role === 'artisan' ? 'Artisan' : 'Client'}</p>

      <div class="profile-stats">
        <div class="profile-stat">
          <div class="profile-stat-number">${totalBookings}</div>
          <div class="profile-stat-label">Total Bookings</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-number">${completedJobs}</div>
          <div class="profile-stat-label">Completed</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-number">${favoritesCount}</div>
          <div class="profile-stat-label">Favorites</div>
        </div>
      </div>
    </div>

    <div class="profile-menu">
      <button class="profile-menu-item" id="profile-bookings">
        <i class="fas fa-calendar profile-menu-icon"></i>
        <span>My Bookings</span>
        <i class="fas fa-chevron-right" style="margin-left: auto;"></i>
      </button>

      <button class="profile-menu-item" id="profile-favorites">
        <i class="fas fa-heart profile-menu-icon"></i>
        <span>Favorites</span>
        <i class="fas fa-chevron-right" style="margin-left: auto;"></i>
      </button>

      ${user.role === 'artisan' ? `
        <button class="profile-menu-item" id="profile-clients">
          <i class="fas fa-users profile-menu-icon"></i>
          <span>My Clients</span>
          <i class="fas fa-chevron-right" style="margin-left: auto;"></i>
        </button>
      ` : ''}

      <button class="profile-menu-item" id="profile-settings">
        <i class="fas fa-cog profile-menu-icon"></i>
        <span>Settings</span>
        <i class="fas fa-chevron-right" style="margin-left: auto;"></i>
      </button>

      <button class="profile-menu-item role-switch-item" id="role-switch-item">
        <i class="fas fa-sync profile-menu-icon"></i>
        <div style="flex: 1; display: flex; align-items: center; gap: 12px;">
          <span id="role-switch-label">
            Switch to ${user.role === 'artisan' ? 'Client' : 'Artisan'}
          </span>
          <label class="switch" style="margin-left: auto;">
            <input type="checkbox" id="profile-role-switch" ${user.role === 'artisan' ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      </button>

      <button class="profile-menu-item" id="profile-upgrade">
        <i class="fas fa-star profile-menu-icon"></i>
        <span>Upgrade to Premium</span>
        <i class="fas fa-chevron-right" style="margin-left: auto;"></i>
      </button>

      <button class="profile-menu-item" id="profile-theme">
        <i class="fas fa-palette profile-menu-icon"></i>
        <span>Toggle Theme</span>
        <i class="fas fa-chevron-right" style="margin-left: auto;"></i>
      </button>

      <button class="profile-menu-item danger" id="profile-logout">
        <i class="fas fa-sign-out-alt profile-menu-icon"></i>
        <span>Logout</span>
      </button>
    </div>
  `;

  // ---- Attach listeners AFTER markup is in the DOM ----
  const roleSwitch = container.querySelector('#profile-role-switch');
  const roleItem   = container.querySelector('#role-switch-item');
  const roleLabel  = container.querySelector('#role-switch-label');
  const roleTextEl = container.querySelector('.profile-role');

  const setRoleUI = (role) => {
    // Update visible role text and label
    if (roleTextEl) roleTextEl.textContent = role === 'artisan' ? 'Artisan' : 'Client';
    if (roleLabel)  roleLabel.textContent  = `Switch to ${role === 'artisan' ? 'Client' : 'Artisan'}`;
    // Checkbox state (checked means artisan)
    if (roleSwitch) roleSwitch.checked = (role === 'artisan');
  };

  // Make whole row clickable (except the checkbox itself)
  if (roleItem) {
    roleItem.addEventListener('click', (e) => {
      if (e.target.closest('input[type="checkbox"]')) return; // ignore direct clicks on checkbox
      roleSwitch.checked = !roleSwitch.checked;
      roleSwitch.dispatchEvent(new Event('change', { bubbles: false }));
    });
  }

  if (roleSwitch) {
    roleSwitch.addEventListener('change', async (e) => {
      const isChecked = e.target.checked;
      const newRole = isChecked ? 'artisan' : 'client';
      const currentRole = (this.state.user?.role || user.role);
      const userId = pb.authStore.model.id;

      if (newRole === currentRole) return;

      roleSwitch.disabled = true;
      roleItem?.classList.add('loading');
      if (!this.state.user) {
    this.showToast('Please login to switch roles', 'error');
    return;
  }

      try {
        // Update on server (also creates artisan profile if needed per your switchUserRole)
        await API.switchUserRole(userId, newRole);

        // Refresh auth store to get the latest user
        await pb.collection('users').authRefresh();

        // Sync app state (no full render to avoid flicker)
        this.state.user = pb.authStore.model;
        this.saveSession?.();

        setRoleUI(this.state.user.role);
        this.showToast?.(`Switched to ${this.state.user.role}`, 'success');
      } catch (err) {
        console.error('Role switch failed:', err);
        // Revert toggle
        e.target.checked = !isChecked;
        this.showToast?.('Could not switch role. Please try again.', 'error');
      } finally {
        roleSwitch.disabled = false;
        roleItem?.classList.remove('loading');
      }
    });
  }

  // Other menu buttons (guarded so no errors if methods aren’t present)
  container.querySelector('#profile-bookings')?.addEventListener('click', () => this.openBookingsPage?.());
  container.querySelector('#profile-favorites')?.addEventListener('click', () => this.openFavoritesPage?.());
  container.querySelector('#profile-clients')?.addEventListener('click', () => this.openClientsPage?.());
  container.querySelector('#profile-settings')?.addEventListener('click', () => this.openSettingsPage?.());
  container.querySelector('#profile-upgrade')?.addEventListener('click', () => this.openUpgradeFlow?.());
  container.querySelector('#profile-theme')?.addEventListener('click', () => this.toggleTheme?.());
  container.querySelector('#profile-logout')?.addEventListener('click', () => this.logout?.());
}
/**async loadProfilePage() {
  const container = this.$('.profile-container');
  if (!container) {
    console.error('Profile container not found');
    return;
  }
  
  if (!this.state.user) {
    container.innerHTML = `
      <div class="profile-header">
        <h3>Welcome to Naco</h3>
        <p>Please log in to view your profile</p>
        <button id="login-from-profile" class="btn-primary">Login</button>
      </div>
    `;
    return;
  }
  
  // Get user stats
  let stats = { totalBookings: 0, favoritesCount: 0, completedJobs: 0 };
  try {
    const bookings = await API.getUserBookings();
    stats.totalBookings = bookings.length;
    stats.completedJobs = bookings.filter(b => b.status === 'completed').length;
    
    const favorites = await API.getUserFavorites();
    stats.favoritesCount = favorites.length;
  } catch (error) {
    console.error('Failed to load profile stats:', error);
  }
  
  container.innerHTML = `
    <div class="profile-header">
      <img src="${this.state.user.avatar ? pb.files.getUrl(this.state.user, this.state.user.avatar, { thumb: '200x200' }) : '../assets/avatar-placeholder.png'}" 
           alt="Profile" class="profile-avatar-large">
      <h3 class="profile-name">
        ${this.escapeHtml(this.state.user.name)} 
        ${this.renderVerificationBadge(this.state.user)}
      </h3>
      <p class="profile-role">${this.state.user.role === 'artisan' ? 'Artisan' : 'Client'}</p>
      
      <div class="profile-stats">
        <div class="profile-stat">
          <div class="profile-stat-number">${stats.totalBookings}</div>
          <div class="profile-stat-label">Total Bookings</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-number">${stats.completedJobs}</div>
          <div class="profile-stat-label">Completed</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-number">${stats.favoritesCount}</div>
          <div class="profile-stat-label">Favorites</div>
        </div>
      </div>
    </div>

    <div class="profile-menu">
      <button class="profile-menu-item" id="profile-bookings">
        <i class="fas fa-calendar profile-menu-icon"></i>
        <span>My Bookings</span>
        <i class="fas fa-chevron-right" style="margin-left: auto; "></i>
      </button>
      <button class="profile-menu-item" id="profile-favorites">
        <i class="fas fa-heart profile-menu-icon"></i>
        <span>Favorites</span>
        <i class="fas fa-chevron-right" style="margin-left: auto;"></i>
      </button>
      ${this.state.user.role === 'artisan' ? `
        <button class="profile-menu-item" id="profile-clients">
          <i class="fas fa-users profile-menu-icon"></i>
          <span>My Clients</span>
          <i class="fas fa-chevron-right" style="margin-left: auto;"></i>
        </button>
      ` : ''}
      <button class="profile-menu-item" id="profile-settings">
        <i class="fas fa-cog profile-menu-icon"></i>
        <span>Settings</span>
        <i class="fas fa-chevron-right" style="margin-left: auto;"></i>
      </button>
      <button class="profile-menu-item role-switch-item">
        <i class="fas fa-sync profile-menu-icon"></i>
        <div style="flex: 1;">
          <span>Switch to ${this.state.user.role === 'artisan' ? 'Client' : 'Artisan'}</span>
          <label class="switch" style="margin-left: auto;">
            <input type="checkbox" id="profile-role-switch" ${this.state.user.role === 'artisan' ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      </button>
      <button class="profile-menu-item" id="profile-upgrade">
        <i class="fas fa-star profile-menu-icon"></i>
        <span>Upgrade to Premium</span>
        <i class="fas fa-chevron-right" style="margin-left: auto;"></i>
      </button>
      <button class="profile-menu-item" id="profile-theme">
        <i class="fas fa-palette profile-menu-icon"></i>
        <span>Toggle Theme</span>
        <i class="fas fa-chevron-right" style="margin-left: auto;"></i>
      </button>
      <button class="profile-menu-item danger" id="profile-logout">
        <i class="fas fa-sign-out-alt profile-menu-icon"></i>
        <span>Logout</span>
      </button>
    </div>
  `;
}**/

    async openFavorites() {
    if (!this.state.user) {
      this.openLoginModal();
      return;
    }

    const favoriteArtisans = this.state.artisans.filter(a => this.state.favorites.has(a.id));

    const html = `
      <div class="favorites-modal">
        <h2>My Favorites</h2>
        <p class="muted">Your saved artisans</p>
        
        <div class="favorites-grid">
          ${favoriteArtisans.length ? favoriteArtisans.map(artisan => `
            <div class="favorite-card" data-id="${artisan.id}">
              <img style="max-width: 100px; max-height: 100px;" src="${artisan.photo || '../assets/avatar-placeholder.png'}" alt="${this.escapeHtml(artisan.name)}">
              <div class="favorite-info">
                <strong>${this.escapeHtml(artisan.name)}</strong>
                <p class="muted">${this.escapeHtml(artisan.skill)}</p>
                <p class="favorite-location">${this.escapeHtml(artisan.location)}</p>
                <div class="favorite-actions">
                  <button class="btn-cta book-favorite" data-id="${artisan.id}">Book</button>
                  <button class="link-btn remove-favorite" data-id="${artisan.id}">Remove</button>
                </div>
              </div>
            </div>
          `).join('') : '<p class="muted">No favorites yet. Start by saving some artisans!</p>'}
        </div>

        <div style="text-align: center; margin-top: 20px;">
          <button id="close-favorites" class="link-btn">Close</button>
        </div>
      </div>
    `;

    this.showModal(html, () => {
      this.$$('.favorite-card img, .favorite-card strong').forEach(el => {
        el.addEventListener('click', () => {
          const card = el.closest('.favorite-card');
          this.openArtisanProfile(card.dataset.id);
        });
      });

      this.$$('.book-favorite').forEach(btn => {
        btn.addEventListener('click', (e) => this.openBookingForm(e.target.dataset.id));
      });

      this.$$('.remove-favorite').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.toggleFavorite(e.target.dataset.id);
          this.openFavorites();
        });
      });

      this.$('#close-favorites')?.addEventListener('click', () => this.hideModal());
    });
  }

  openSettings() {
    const html = `
      <div class="settings-modal">
        <h2>Settings</h2>
        
        <div class="settings-section">
          <h4>Appearance</h4>
          <div class="setting-item">
            <label class="switch">
              <input type="checkbox" id="theme-toggle" ${this.state.isDarkMode ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <div class="setting-label">
              <strong>Dark/Light Mode</strong>
              <p class="muted">Toggle between light and dark themes</p>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <h4>Notifications</h4>
          <div class="setting-item">
            <button id="test-notifications" class="btn-primary">
              <i class="fas fa-bell"></i> Enable Notifications
            </button>
            <div class="setting-label">
              <strong>Push Notifications</strong>
              <p class="muted">Get notified about booking updates</p>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <h4>Location</h4>
          <div class="setting-item">
            <select id="default-city" class="setting-select">
              <option value="">Select default city</option>
              ${this.state.cities.map(city => `
                <option value="${city}" ${city === this.state.selectedCity ? 'selected' : ''}>${city}</option>
              `).join('')}
            </select>
            <div class="setting-label">
              <strong>Default City</strong>
              <p class="muted">Set your preferred location</p>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <h4>Account</h4>
          <div class="setting-item">
            <button id="clear-data" class="btn-secondary">Clear App Data</button>
            <div class="setting-label">
              <strong>Clear Data</strong>
              <p class="muted">Remove all stored preferences</p>
            </div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px;">
          <button id="close-settings" class="link-btn">Close</button>
        </div>
      </div>
    `;
    
    this.$('#test-notifications')?.addEventListener('click', async () => {
      await this.enableNotifications();
    });
    
    this.showModal(html, () => {
      this.$('#theme-toggle')?.addEventListener('change', () => this.toggleTheme());
      
      this.$('#default-city')?.addEventListener('change', (e) => {
        this.setState({ selectedCity: e.target.value });
        this.$('#city-select').value = e.target.value;
        this.applyFilters();
      });

      this.$('#clear-data')?.addEventListener('click', () => {
        if (confirm('Are you sure? This will clear all your preferences and favorites.')) {
          localStorage.clear();
          this.setState({ favorites: new Set() });
          this.showToast('App data cleared', 'success');
        }
      });

      this.$('#close-settings')?.addEventListener('click', () => this.hideModal());
    });
  }




  // Error Handling and Retry Logic
  async withRetry(fn, maxRetries = 3) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    throw lastError;
  }

  // Performance Optimization
  lazyLoadImages() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
          }
        });
      });

      this.$$('img[data-src]').forEach(img => imageObserver.observe(img));
    }
  }

  // Cleanup
  destroy() {
    this.stopNotificationPolling();
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}

// Initialize the application
const app = new NacoApp();

// Expose for debugging
window.NacoApp = app;
window.Naco = {
  state: app.state,
  openLoginModal: () => app.openLoginModal(),
  openArtisanProfile: (id) => app.openArtisanProfile(id),
  toggleTheme: () => app.toggleTheme(),
  app
};

// Handle page unload
window.addEventListener('beforeunload', () => {
  app.destroy();
});

// Export for module systems
export default NacoApp;