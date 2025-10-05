// Naco - Modern Artisan Finder App
// Complete JavaScript implementation with React-like patterns

import * as API from './api.js';

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
  
  // Initialize modal management system
  this.initializeModalSystem();
  
  this.modalStack = [];
  this.baseZIndex = 1000;
  this.modalContainer = null;
  
  this.init();
}

initializeModalSystem() {
  this.modalStack = [];
  this.baseZIndex = 1000;
  this.modalContainer = null;
  this.createModalContainer();
}

createModalContainer() {
  // Remove existing container if it exists
  const existing = document.getElementById('modal-container');
  if (existing) {
    existing.remove();
  }

  this.modalContainer = document.createElement('div');
  this.modalContainer.id = 'modal-container';
  this.modalContainer.className = 'modal-container';
  this.modalContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 999;
  `;
  document.body.appendChild(this.modalContainer);
}

  // Utility Methods
  $(selector) { return document.querySelector(selector); }
  $$(selector) { return Array.from(document.querySelectorAll(selector)); }


    debounce(fn, delay = 300) {
  let timer; // each fn gets its own timer
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
 /** debounce(fn, delay = 300) {
    const key = fn.toString();
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }
    const timer = setTimeout(fn, delay);
    this.debounceTimers.set(key, timer);
  }**/

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  showAllFeaturedArtisans() {
  this.viewAllFeatured(); // Calls the existing viewAllFeatured method
}

initializeModalCSS() {
  const modalStackingCSS = `
    <style id="modal-stacking-css">
    /* Modal stacking improvements */
    .modal-overlay {
      transition: opacity 0.2s ease;
      pointer-events: auto;
    }

    .modal-overlay.modal-closing {
      opacity: 0;
    }

    .modal-content {
      transform: translateY(20px);
      transition: transform 0.2s ease;
      pointer-events: auto;
    }

    .modal-overlay .modal-content {
      transform: translateY(0);
    }

    /* Improve z-index stacking */
    .modal-overlay:nth-child(1) { z-index: 1000; }
    .modal-overlay:nth-child(2) { z-index: 1010; }
    .modal-overlay:nth-child(3) { z-index: 1020; }
    .modal-overlay:nth-child(4) { z-index: 1030; }
    .modal-overlay:nth-child(5) { z-index: 1040; }

    /* Reduce backdrop opacity for stacked modals */
    .modal-overlay:not(:first-child) .modal-backdrop {
      background: rgba(0,0,0,0.2) !important;
    }

    /* Add subtle border to distinguish stacked modals */
    .modal-overlay:not(:first-child) .modal-content {
      border: 1px solid var(--border, #e5e7eb);
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.3);
    }

    /* Modal header with close button */
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid var(--border, #e5e7eb);
    }

    .modal-close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 5px;
      border-radius: 4px;
      transition: background-color 0.2s ease;
    }

    .modal-close-btn:hover {
      background-color: var(--hover, #f3f4f6);
    }

    /* Profile modal specific styles */
    .profile-modal-content {
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
    }
    </style>
  `;

  // Only inject if not already present
  if (!document.getElementById('modal-stacking-css')) {
    document.head.insertAdjacentHTML('beforeend', modalStackingCSS);
  }
}
  
setupNetworkMonitoring() {
  // Monitor online/offline status
  window.addEventListener('online', () => {
    this.showToast('Connection restored', 'success');
    // Retry failed operations if needed
    if (this.state.user && !this.state.notificationsPoller) {
      this.startNotificationPolling();
    }
  });

  window.addEventListener('offline', () => {
    this.showToast('You are now offline', 'warning');
    this.stopNotificationPolling();
  });

  // Initial status check
  if (!navigator.onLine) {
    this.showToast('You are currently offline', 'warning');
  }
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
  let needsFullRender = false;
  
  Object.entries(updates).forEach(([key, value]) => {
    if (this.state[key] !== value) {
      this.state[key] = value;
      
      // Check if this change requires full render
      const fullRenderKeys = ['artisans', 'cities', 'isSearchActive', 'searchQuery', 'selectedCity'];
      if (fullRenderKeys.includes(key)) {
        needsFullRender = true;
      }
    }
  });
  
  if (needsFullRender) {
    this.render();
  } else {
    // Handle specific updates
    Object.keys(updates).forEach(key => {
      this.updateState(key, updates[key]);
    });
  }
}
  
  updateState(key, value) {
  if (this.state[key] === value) return; // no change → skip
  this.state[key] = value;

  // Update only what's needed instead of full render
  switch (key) {
    case "notifications":
      this.updateNotificationBadge(); // Only update badge
      break;
    case "notificationCount":
      this.updateNotificationBadge(); // Only update badge  
      break;
    case "filteredArtisans":
      this.renderSearchResults();
      break;
    case "featuredArtisans":
      this.renderFeaturedArtisans();
      break;
    case "isDarkMode":
      this.loadTheme(); 
      break;
    case "favorites":
      // Only re-render if favorites view is currently open
      if (document.querySelector('.favorites-modal')) {
        this.openFavorites();
      }
      break;
    case "user":
      this.renderHeader();
      this.updateMainVisibility();
      break;
    default:
      // For other changes that need full render
      this.render();
  }
}

  // Initialization
  async init() {
  try {
    this.setState({ isLoading: true });
    
    // CRITICAL: Initialize modal system FIRST
    this.createModalContainer();
    this.initializeModalCSS();
    
    this.setupNetworkMonitoring();
    this.debounceTimers = new Map();
    
    await this.loadSession();
    await this.loadArtisans();
    this.loadFavorites();
    this.loadTheme();
    
    // Setup event listeners
    this.bindEventListeners();
    this.bindDynamicEvents();
    this.bindSearchEvents();
    
    // Setup PWA features
    this.setupInstallPrompt();
    this.setupServiceWorkerMessageListener();
    this.registerServiceWorker();
    
    if (this.state.user) {
      this.startNotificationPolling();
    }
    
    this.handleNotificationFromURL();
    
    this.setState({ isLoading: false });
    this.render();
    
    console.log('App initialized successfully');
  } catch (error) {
    console.error('App initialization failed:', error);
    this.setState({ isLoading: false });
  }
}
  

  // Event Binding
  bindEventListeners() {
    // Header events
    this.$('#search-input')?.addEventListener('click', () => this.openSearchPage());
    this.$('#notif-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  this.openNotifications(); // This should use the modal system, not the page system
});
    this.$('#profile-btn')?.addEventListener('click', () => this.openProfilePage());
    this.$('#menu-btn')?.addEventListener('click', () => this.toggleSideMenu());
    
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
    document.addEventListener('change', (e) => {
  if (e.target.matches('#roleSwitch, #profile-role-switch')) {
    e.preventDefault();
    this.handleRoleSwitch(e);
  }
});

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
    
    async function createNotification(userId, title, message, type = 'booking', data = {}) {
  try {
    const notification = new Notification({
      user: userId,
      title,
      message,
      type,
      data
    });
    
    await notification.save();
    console.log('Notification created:', notification._id);
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
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
    


renderNotificationItem(notification) {
  // Fix date handling - check for valid date and provide fallbacks
  let displayDate = 'Unknown date';
  
  if (notification.created) {
    const date = new Date(notification.created);
    
    // Check if date is valid
    if (!isNaN(date.getTime())) {
      displayDate = date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
  
  return `
    <div class="notification-item ${notification.read ? 'read' : 'unread'}" data-id="${notification.id}">
      <div class="notification-icon">
        <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
      </div>
      <div class="notification-content">
        <h4>${this.escapeHtml(notification.title)}</h4>
        <p>${this.escapeHtml(notification.message)}</p>
        <span class="notification-time">${displayDate}</span>
      </div>
    </div>
  `;
}

async handleNotificationClick(notificationId) {
  try {
    console.log('Handling notification click for ID:', notificationId);
    
    const notification = this.state.notifications.find(n => {
      const nId = (n.id || n._id).toString();
      return nId === notificationId.toString();
    });

    if (!notification) {
      console.warn(`Notification with id ${notificationId} not found in state`);
      console.log('Available notifications:', this.state.notifications.map(n => ({ id: n.id || n._id, title: n.title })));
      return;
    }

    console.log('Found notification:', notification);

    // Mark as read if unread
    if (!notification.read) {
      try {
        await API.markSingleNotificationRead(notificationId);

        // Update local state immediately
        const updatedNotifications = this.state.notifications.map(n => {
          const nId = (n.id || n._id).toString();
          if (nId === notificationId.toString()) {
            return { ...n, read: true, readAt: new Date() };
          }
          return n;
        });

        const newUnreadCount = updatedNotifications.filter(n => !n.read).length;

        this.setState({
          notifications: updatedNotifications,
          notificationCount: newUnreadCount
        });

      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Handle navigation - check multiple possible booking ID locations
    const bookingId = notification.data?.bookingId || 
                     notification.data?.booking || 
                     notification.bookingId;
                     
    console.log('Extracted booking ID:', bookingId);

    if (bookingId) {
      // Close notifications first
      this.closeNotificationsPage?.();
      this.hideModal?.();
      
      // Navigate to booking details after a short delay
      setTimeout(() => {
        this.openBookingDetails(bookingId);
      }, 300);
    } else {
      console.warn('No booking ID found in notification data:', notification.data);
    }

  } catch (error) {
    console.error('Error handling notification click:', error);
    this.showToast('Error opening notification', 'error');
  }
}

// Profile Page Functions
openProfilePage() {
  // Navigate to separate profile page
  sessionStorage.setItem('returnTo', window.location.href);
  window.location.href = 'profile.html';
}
/** async openProfilePage() {
  const profilePage = this.$('#profile-page');
  profilePage.classList.remove('hidden');
  setTimeout(() => {
    profilePage.classList.add('active');
  }, 10);
  
  await this.loadProfilePage();
} **/

closeProfilePage() {
  const profilePage = this.$('#profile-page');
  profilePage.classList.remove('active');
  setTimeout(() => {
    profilePage.classList.add('hidden');
  }, 300);
}
    
    
 

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

// Search input event binding
bindSearchEvents() {
  const searchInput = this.$('#main-search-input');
  if (searchInput) {
    // Remove any existing listeners
    searchInput.removeEventListener('input', this.searchInputHandler);
    
    // Create bound handler
    this.searchInputHandler = this.debounce((e) => {
      const query = e.target.value.trim();
      this.handleMainSearch(query);
      
      // Show/hide clear button
      const clearBtn = this.$('#clear-search');
      if (clearBtn) {
        clearBtn.classList.toggle('hidden', query.length === 0);
      }
    }, 300);
    
    // listener
    searchInput.addEventListener('input', this.searchInputHandler);
  }

  // direct addEventListener
  const clearSearchBtn = this.$('#clear-search');
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => this.clearMainSearch());
  }

  const closeSearchBtn = this.$('#close-search');
  if (closeSearchBtn) {
    closeSearchBtn.addEventListener('click', () => this.closeSearchPage());
  }
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
      featuredArtisans: artisans.filter(a => a.premium).slice(0, 8),
      cities
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

 /** async handleRoleSwitch(e) {
  const isChecked = e.target.checked;
  const newRole = isChecked ? 'artisan' : 'client';
  
  if (!this.state.user) {
    // Reset checkbox and show login
    e.target.checked = !isChecked;
    this.openLoginModal();
    return;
  }

  // If already the desired role, do nothing
  if (this.state.user.role === newRole) {
    return;
  }

  // Show loading state
  e.target.disabled = true;
  const originalChecked = e.target.checked;

  try {
    const updatedUser = await API.switchUserRole(this.state.user._id, newRole);
    
    // Update state
    this.setState({ user: updatedUser });
    
    // Update UI elements
    this.updateRoleUI(newRole);
    
    this.showToast(`Switched to ${newRole} mode`, 'success');
    
    // Close any open dropdowns/modals if needed
    this.closeProfileDropdown();
    
  } catch (error) {
    console.error('Role switch failed:', error);
    // Revert checkbox state
    e.target.checked = !originalChecked;
    this.showToast('Failed to switch role. Please try again.', 'error');
  } finally {
    e.target.disabled = false;
  }
} **/
    async handleRoleSwitch(e) {
  const isChecked = e.target.checked;
  const newRole = isChecked ? 'artisan' : 'client';
  
  if (!this.state.user) {
    e.target.checked = !isChecked;
    this.closeProfilePage();
    setTimeout(() => this.openLoginModal(), 100);
    return;
  }

  if (this.state.user.role === newRole) {
    return; // Already the desired role
  }

  // Show loading state
  e.target.disabled = true;
  const originalChecked = e.target.checked;

  try {
    const updatedUser = await API.switchUserRole(this.state.user.id || this.state.user._id, newRole);
    
    // Update state immediately
    this.setState({ user: { ...this.state.user, role: newRole } });
    
    // Update all UI elements
    this.updateRoleUI(newRole);
    
    this.showToast(`Switched to ${newRole} mode`, 'success');
    
    // Close profile page and refresh
    this.closeProfilePage();
    
    // Re-render main components after role switch
    setTimeout(() => {
      this.render();
    }, 300);
    
  } catch (error) {
    console.error('Role switch failed:', error);
    e.target.checked = !originalChecked;
    this.showToast('Failed to switch role. Please try again.', 'error');
  } finally {
    e.target.disabled = false;
  }
}

    // Helper method to update role UI consistently
updateRoleUI(role) {
  // Update all role-related UI elements
  const roleLabels = document.querySelectorAll('#roleLabel, .profile-role, #role-switch-label');
  const roleSwitches = document.querySelectorAll('#roleSwitch, #profile-role-switch');
  
  roleLabels.forEach(label => {
    if (label.id === 'role-switch-label') {
      label.textContent = `Switch to ${role === 'artisan' ? 'Client' : 'Artisan'}`;
    } else {
      label.textContent = role === 'artisan' ? 'Artisan' : 'Client';
    }
  });
  
  roleSwitches.forEach(toggle => {
    toggle.checked = (role === 'artisan');
  });

  // Update FAB button
  const fab = this.$('#fab-book');
  if (fab) {
    if (role === 'artisan') {
      fab.innerHTML = '<i class="fas fa-users"></i>';
      fab.title = 'My Clients';
    } else {
      fab.innerHTML = '<i class="fas fa-calendar-plus"></i>';
      fab.title = 'Quick Book';
    }
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
    <style>
      .auth-modal {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px);
        border-radius: 24px;
        box-shadow: 
          0 25px 50px -12px rgba(0, 0, 0, 0.25),
          0 0 0 1px rgba(255, 255, 255, 0.1);
        padding: 40px;
        width: 100%;
        max-width: 420px;
        position: relative;
        animation: slideUp 0.4s ease;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      /* Dark mode support */
      [data-theme="dark"] .auth-modal {
        background: rgba(30, 30, 35, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
      }

      @keyframes slideUp {
        from { 
          opacity: 0;
          transform: translateY(30px);
        }
        to { 
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Header */
      .auth-header {
        text-align: center;
        margin-bottom: 32px;
      }

      #auth-title {
        font-size: 28px;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 8px;
        letter-spacing: -0.025em;
      }

      [data-theme="dark"] #auth-title {
        color: #f1f5f9;
      }

      #auth-subtitle {
        color: #64748b;
        font-size: 16px;
        font-weight: 400;
      }

      [data-theme="dark"] #auth-subtitle {
        color: #94a3b8;
      }

      /* Form Groups */
      .form-group {
        margin-bottom: 24px;
        position: relative;
      }

      .form-group label {
        display: block;
        font-size: 14px;
        font-weight: 500;
        color: #374151;
        margin-bottom: 8px;
        letter-spacing: 0.025em;
      }

      [data-theme="dark"] .form-group label {
        color: #d1d5db;
      }

      .form-input {
        color: black;
        width: 100%;
        padding: 14px 16px;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        font-size: 16px;
        background: rgba(255, 255, 255, 0.8);
        transition: all 0.2s ease;
        outline: none;
      }

      .form-input:focus {
        border-color: #3b82f6;
        background: rgba(255, 255, 255, 1);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      [data-theme="dark"] .form-input {
        background: rgba(55, 65, 81, 0.8);
        border-color: #374151;
        color: #f3f4f6;
      }

      [data-theme="dark"] .form-input:focus {
        background: rgba(55, 65, 81, 1);
        border-color: #60a5fa;
        box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
      }

      [data-theme="dark"] .form-input::placeholder {
        color: #9ca3af;
      }

      /* Select dropdown */
      .form-select {
        width: 100%;
        padding: 14px 16px;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        font-size: 16px;
        background: rgba(255, 255, 255, 0.8);
        transition: all 0.2s ease;
        outline: none;
        cursor: pointer;
      }

      .form-select:focus {
        border-color: #3b82f6;
        background: rgba(255, 255, 255, 1);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      [data-theme="dark"] .form-select {
        background: rgba(55, 65, 81, 0.8);
        border-color: #374151;
        color: #f3f4f6;
      }

      [data-theme="dark"] .form-select:focus {
        background: rgba(55, 65, 81, 1);
        border-color: #60a5fa;
        box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
      }

      /* Buttons */
      .btn-google {
        width: 100%;
        padding: 14px 20px;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        background: white;
        color: #374151;
        font-size: 16px;
        font-weight: 500;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-bottom: 20px;
      }

      .btn-google:hover {
        background: #f9fafb;
        border-color: #d1d5db;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      [data-theme="dark"] .btn-google {
        background: rgba(55, 65, 81, 0.8);
        border-color: #374151;
        color: #f3f4f6;
      }

      [data-theme="dark"] .btn-google:hover {
        background: rgba(75, 85, 99, 0.9);
        border-color: #4b5563;
      }

      .btn-primary {
        width: 100%;
        padding: 14px 20px;
        background: green;
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-bottom: 16px;
      }

      .btn-primary:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
      }

      .btn-primary:active {
        transform: translateY(0);
      }

      .btn-primary:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      /* Divider */
      .divider {
        display: flex;
        align-items: center;
        margin: 24px 0;
        color: #9ca3af;
        font-size: 14px;
      }

      .divider::before,
      .divider::after {
        content: '';
        flex: 1;
        height: 1px;
        background: #e5e7eb;
      }

      [data-theme="dark"] .divider::before,
      [data-theme="dark"] .divider::after {
        background: #374151;
      }

      .divider span {
        padding: 0 16px;
        background: inherit;
        font-weight: 500;
      }

      /* Switch links */
      .switch-link {
        text-align: center;
        margin-top: 20px;
        font-size: 14px;
        color: #6b7280;
      }

      [data-theme="dark"] .switch-link {
        color: #9ca3af;
      }

      .switch-link a {
        color: #3b82f6;
        text-decoration: none;
        font-weight: 500;
        transition: color 0.2s ease;
      }

      .switch-link a:hover {
        color: #1d4ed8;
        text-decoration: underline;
      }

      [data-theme="dark"] .switch-link a {
        color: #60a5fa;
      }

      [data-theme="dark"] .switch-link a:hover {
        color: #93c5fd;
      }

      /* Form transitions */
      .auth-form {
        transition: all 0.3s ease;
      }

      .auth-form.hidden {
        display: none;
      }

      /* Google icon */
      .google-icon {
        width: 20px;
        height: 20px;
      }
    </style>

    <div class="auth-modal">
      <div class="auth-header">
        <h2 id="auth-title">Welcome to Naco</h2>
        <p id="auth-subtitle">Login or create an account to get started</p>
      </div>
      
      <!-- Login Form -->
      <form id="login-form" class="auth-form">
        <!-- Google Sign In -->
        <button type="button" id="google-signin" class="btn-google">
          <svg class="google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div class="divider">
          <span>or</span>
        </div>

        <div class="form-group">
          <label for="auth-email">Email</label>
          <input id="auth-email" type="email" class="form-input" required autocomplete="email" placeholder="Enter your email">
        </div>
        
        <div class="form-group">
          <label for="auth-pass">Password</label>
          <input id="auth-pass" type="password" class="form-input" required autocomplete="current-password" placeholder="Enter your password">
        </div>
        
        <button type="submit" class="btn-primary">
          <i class="fas fa-sign-in-alt"></i> Login
        </button>

        <div class="switch-link">
          Don't have an account? 
          <a href="#" id="switch-to-signup">Sign up</a>
        </div>
      </form>

      <!-- Signup Form (hidden initially) -->
      <form id="signup-form" class="auth-form hidden">
        <!-- Google Sign Up -->
        <button type="button" id="google-signup" class="btn-google">
          <svg class="google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign up with Google
        </button>

        <div class="divider">
          <span>or</span>
        </div>

        <div class="form-group">
          <label for="signup-name">Full Name</label>
          <input id="signup-name" type="text" class="form-input" required placeholder="Enter your full name">
        </div>
        
        <div class="form-group">
          <label for="signup-email">Email</label>
          <input id="signup-email" type="email" class="form-input" required placeholder="Enter your email">
        </div>
        
        <div class="form-group">
          <label for="signup-pass">Password</label>
          <input id="signup-pass" type="password" class="form-input" required placeholder="Create a password">
        </div>
        
        <div class="form-group">
          <label for="signup-location">Location</label>
          <input id="signup-location" type="text" class="form-input" required placeholder="Enter your location">
        </div>
        
        <div class="form-group">
          <label for="signup-role">I am a</label>
          <select id="signup-role" class="form-select">
            <option value="artisan">Artisan (Providing services)</option>
            <option value="client">Client (Looking for services)</option>
          </select>
        </div>
        
        <button type="submit" class="btn-primary">
          <i class="fas fa-user-plus"></i> Create Account
        </button>

        <div class="switch-link">
          Already have an account? 
          <a href="#" id="switch-to-login">Login</a>
        </div>
      </form>
    </div>
  `;

  this.showModal(html, () => {
    // Handle login form submission
    const loginForm = document.querySelector('#login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleLogin();
        return false;
      });
    }

    // Handle signup form submission  
    const signupForm = document.querySelector('#signup-form');
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleSignup();
        return false;
      });
    }

    // Google Sign In/Up handlers
    document.querySelector('#google-signin')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleGoogleAuth('signin');
    });

    document.querySelector('#google-signup')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleGoogleAuth('signup');
    });

    // Switch to Signup
    const switchToSignup = document.querySelector('#switch-to-signup');
    if (switchToSignup) {
      switchToSignup.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const loginForm = document.querySelector('#login-form');
        const signupForm = document.querySelector('#signup-form');
        const title = document.querySelector('#auth-title');
        const subtitle = document.querySelector('#auth-subtitle');
        
        if (loginForm) loginForm.classList.add('hidden');
        if (signupForm) signupForm.classList.remove('hidden');
        if (title) title.innerText = "Create Account";
        if (subtitle) subtitle.innerText = "Join Naco to get started";
        
        return false;
      });
    }

    // Switch to Login
    const switchToLogin = document.querySelector('#switch-to-login');
    if (switchToLogin) {
      switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const loginForm = document.querySelector('#login-form');
        const signupForm = document.querySelector('#signup-form');
        const title = document.querySelector('#auth-title');
        const subtitle = document.querySelector('#auth-subtitle');
        
        if (signupForm) signupForm.classList.add('hidden');
        if (loginForm) loginForm.classList.remove('hidden');
        if (title) title.innerText = "Welcome to Naco";
        if (subtitle) subtitle.innerText = "Login or create an account to get started";
        
        return false;
      });
    }
  });
}

// Add Google Auth handler method
async handleGoogleAuth(type = 'signin') {
  try {
    // Show loading state
    const button = document.querySelector(type === 'signin' ? '#google-signin' : '#google-signup');
    if (button) {
      button.disabled = true;
      button.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        ${type === 'signin' ? 'Signing in...' : 'Signing up...'}
      `;
    }

    // Initialize Google Sign-In if not already done
    if (!window.google || !window.google.accounts) {
      // Load Google Sign-In script
      await this.loadGoogleSignInScript();
    }

    // Handle Google authentication
    // This is a placeholder - you'll need to implement actual Google OAuth
    // using your Google Client ID
    const googleUser = await this.authenticateWithGoogle();
    
    if (googleUser) {
      const user = await API.googleAuth(googleUser, type);
      this.setState({ user });
      this.closeModal();
      this.showToast(`${type === 'signin' ? 'Login' : 'Account creation'} successful!`, 'success');
      
      if (this.currentPage === 'profile') {
        this.loadProfilePage();
      }
    }
    
  } catch (error) {
    console.error('Google auth failed:', error);
    this.showToast('Google authentication failed. Please try again.', 'error');
  } finally {
    // Reset button state
    const button = document.querySelector(type === 'signin' ? '#google-signin' : '#google-signup');
    if (button) {
      button.disabled = false;
      button.innerHTML = `
        <svg class="google-icon" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        ${type === 'signin' ? 'Continue with Google' : 'Sign up with Google'}
      `;
    }
  }
}

// Helper methods for Google Auth (implement these based on your setup)
async loadGoogleSignInScript() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async authenticateWithGoogle() {
  // Implement actual Google OAuth flow
  // This is a placeholder - replace with real Google Sign-In implementation
  return new Promise((resolve, reject) => {
    // Your Google OAuth implementation here
    // Return user data from Google
    resolve({
      email: 'user@example.com',
      name: 'John Doe',
      picture: 'https://example.com/avatar.jpg',
      id: 'google-user-id'
    });
  });
}

// handleLogin method
/** async handleLogin() {
  const email = document.querySelector('#auth-email')?.value;
  const password = document.querySelector('#auth-pass')?.value;

  if (!email || !password) {
    this.showToast('Please fill in all fields', 'error');
    return;
  }

  try {
    // Disable the submit button to prevent double submission
    const submitBtn = document.querySelector('#login-form button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    }

    const user = await API.loginUser(email, password);
    
    this.setState({ user });
    this.hideModal(); // Make sure this method exists
    this.showToast('Login successful!', 'success');
    
    // Reload profile page if we're currently on it
    if (this.currentPage === 'profile') {
      this.loadProfilePage();
    }
    
  } catch (error) {
    console.error('Login failed:', error);
    this.showToast('Login failed. Please check your credentials.', 'error');
    
    // Re-enable the submit button
    const submitBtn = document.querySelector('#login-form button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    }
  }
} **/
async handleLogin() {
  const email = document.querySelector('#auth-email')?.value;
  const password = document.querySelector('#auth-pass')?.value;

  if (!email || !password) {
    this.showToast('Please fill in all fields', 'error');
    return;
  }

  try {
    const submitBtn = document.querySelector('#login-form button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    }

    const user = await API.loginUser(email, password);
    
    // CRITICAL: Save to state AND localStorage
    this.setState({ user });
    
    // Save user data and token to localStorage (ADD THIS)
    localStorage.setItem('userData', JSON.stringify(user));
    
    // Make sure your API also saves the auth token
    // This should happen in API.loginUser, but double-check:
    if (user.token) {
      localStorage.setItem('authToken', user.token);
    }
    
    this.hideModal();
    this.showToast('Login successful!', 'success');
    
    // Check if user was trying to access a specific page
    const returnTo = sessionStorage.getItem('returnTo');
    if (returnTo) {
      sessionStorage.removeItem('returnTo');
      window.location.href = returnTo;
    }
    
  } catch (error) {
    console.error('Login failed:', error);
    this.showToast('Login failed. Please check your credentials.', 'error');
    
    const submitBtn = document.querySelector('#login-form button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    }
  }
}

/** async handleSignup() {
  const name = document.querySelector('#signup-name')?.value;
  const email = document.querySelector('#signup-email')?.value;
  const password = document.querySelector('#signup-pass')?.value;
  const location = document.querySelector('#signup-location')?.value;
  const role = document.querySelector('#signup-role')?.value;

  if (!name || !email || !password || !location) {
    this.showToast('Please fill in all fields', 'error');
    return;
  }

  try {
    // Disable the submit button
    const submitBtn = document.querySelector('#signup-form button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing up...';
    }

    const user = await API.registerUser({ name, email, password, location, role });
    
    this.setState({ user });
    this.hideModal();
    this.showToast('Account created successfully!', 'success');
    
    // Reload profile page if we're currently on it
    if (this.currentPage === 'profile') {
      this.loadProfilePage();
    }
    
  } catch (error) {
    console.error('Signup failed:', error);
    this.showToast('Signup failed. Please try again.', 'error');
    
    // Re-enable the submit button
    const submitBtn = document.querySelector('#signup-form button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Sign Up';
    }
  }
} **/
async handleSignup() {
  const name = document.querySelector('#signup-name')?.value;
  const email = document.querySelector('#signup-email')?.value;
  const password = document.querySelector('#signup-pass')?.value;
  const location = document.querySelector('#signup-location')?.value;
  const role = document.querySelector('#signup-role')?.value;

  if (!name || !email || !password || !location) {
    this.showToast('Please fill in all fields', 'error');
    return;
  }

  try {
    const submitBtn = document.querySelector('#signup-form button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing up...';
    }

    const user = await API.registerUser({ name, email, password, location, role });
    
    // CRITICAL: Save to state AND localStorage
    this.setState({ user });
    
    // Save user data and token (ADD THIS)
    localStorage.setItem('userData', JSON.stringify(user));
    if (user.token) {
      localStorage.setItem('authToken', user.token);
    }
    
    this.hideModal();
    this.showToast('Account created successfully!', 'success');
    
    // Check for return URL
    const returnTo = sessionStorage.getItem('returnTo');
    if (returnTo) {
      sessionStorage.removeItem('returnTo');
      window.location.href = returnTo;
    }
    
  } catch (error) {
    console.error('Signup failed:', error);
    this.showToast('Signup failed. Please try again.', 'error');
    
    const submitBtn = document.querySelector('#signup-form button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Sign Up';
    }
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
  const avatarUrl = user?.avatar || '../assets/avatar-placeholder.png';
  const html = `
    <div class="profile-update-modal">
      <h2>Update Profile</h2>
      
      <form id="profile-form" class="booking-form">
        <div class="profile-image-upload">
          <label for="profile-image" class="upload-label">
            <img id="profile-preview" src="${avatarUrl || '../assets/avatar-placeholder.png'}" 
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
  // Collect text updates
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

  // Ensure we have a valid user ID
  const userId = this.state.user?.id || this.state.user?._id;
  if (!userId) {
    console.error("No valid user ID found in state:", this.state.user);
    this.showToast("Unable to update profile: invalid session", "error");
    return;
  }

  try {
    // Step 1: update text fields
    const updatedUser = await API.updateUserProfile(userId, updates);

    // Step 2: upload avatar if selected
    const imageInput = this.$('#profile-image');
    const imageFile = imageInput?.files[0];
    if (imageFile) {
      await API.uploadProfileImage(userId, imageFile);
    }

    // Refresh state after both updates
    this.setState({ user: updatedUser });
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
      await API.uploadProfileImage(this.state.user.id, imageFile);
    }
    
    const updatedUser = await API.updateUserProfile(this.state.user.id, updates);
    this.setState({ user: updatedUser });
    this.hideModal();
    this.showToast('Profile updated successfully', 'success');
  } catch (error) {
    console.error('Profile update failed:', error);
    this.showToast('Failed to update profile', 'error');
  }
}**/
 
 
 async logout() {
  try {
    // Stop background processes immediately
    this.stopNotificationPolling();
    
    // Clear UI state
    this.setState({ 
      user: null, 
      notifications: [], 
      notificationCount: 0 
    });

    // Just do API cleanup (no server call)
    API.logout();

    // Comprehensive cleanup
    await this.performLogoutCleanup();
    
    this.showToast('Logged out successfully', 'success');
    
  } catch (error) {
    console.error('Logout error:', error);
    this.showToast('Logout completed', 'success');
  }
}

// Perform logout cleanup
async performLogoutCleanup() {
  try {
    // Clear storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    sessionStorage.clear();

    // Clear auth cookies
    document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'sessionId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    // Clear sensitive caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name.includes('api') || name.includes('user'))
          .map(name => caches.delete(name))
      );
    }

    // Clear Service Worker user data
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_USER_DATA'
      });
    }
  } catch (error) {
    console.warn('Cleanup error:', error);
  }
}

 /** logout() {
  this.setState({ 
    user: null, 
    notifications: [], 
    notificationCount: 0 
  });
  
  API.logout();
  this.stopNotificationPolling();
  this.showToast('Logged out successfully', 'success');
}
  **/
  

  // Artisan Profile and Booking
  
  async openArtisanProfile(artisanId) {
  try {
    const artisan = await API.getFullArtisanData(artisanId);
    const reviews = await API.getReviewsForArtisan(artisanId);
    
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : '0.0';
    
    const distance = this.calculateDistance(artisan.location);
    
    const html = `
      <div class="artisan-profile-modal">
        <div class="profile-header">
          <img 
            style="max-width: 320px; max-height: 320px; border-radius: 10px;" 
            src="${artisan.photo || '../assets/avatar-placeholder.png'}" 
            alt="${this.escapeHtml(artisan.name)}" 
            class="profile-avatar">
          <div class="profile-info">
            <h2>
              ${this.escapeHtml(artisan.name)} 
              ${this.renderVerificationBadge(artisan)}
            </h2>
            <p class="profile-skill">${this.escapeHtml(artisan.skill)}</p>
            <p class="profile-location">
              <i class="fas fa-map-marker-alt"></i> 
              ${this.escapeHtml(artisan.location)} • ${distance} km away
            </p>
            <div class="profile-stats">
              <span><i class="fas fa-star"></i> ${averageRating} (${reviews.length} reviews)</span>
              <span><i class="fas fa-clock"></i> ${artisan.years_experience || 0}+ years</span>
            </div>
            <div class="profile-rate">${this.formatCurrency(artisan.rate || 0)}</div>
          </div>
        </div>
        
        <div class="profile-actions">
          <button id="book-now-btn" class="btn-primary" data-artisan-id="${artisan.id}">
            <i class="fas fa-calendar-plus"></i> Book Now
          </button>
          <button id="whatsapp-btn" class="link-btn" data-phone="${artisan.phone || ''}">
            <i class="fab fa-whatsapp"></i> WhatsApp
          </button>
          <button id="favorite-btn" class="link-btn ${this.state.favorites.has(artisan.id) ? 'active' : ''}" data-artisan-id="${artisan.id}">
            <i class="fas fa-heart"></i> ${this.state.favorites.has(artisan.id) ? 'Saved' : 'Save'}
          </button>
        </div>
        
        <div class="profile-section">
          <h4>About</h4>
          <p>${this.escapeHtml(artisan.about || 'No description available')}</p>
        </div>
        
        <div class="profile-section">
          <h4>Specialties</h4>
          <div class="chips">
            ${(artisan.specialties || []).map(specialty => 
              `<span class="chip">${this.escapeHtml(specialty)}</span>`
            ).join('')}
          </div>
        </div>
        
        <div class="profile-section">
          <h4>Reviews (${reviews.length})</h4>
          <div class="reviews-list">
            ${reviews.slice(0, 3).map(review => `
              <div class="review-item">
                <div class="review-header">
                  <strong>${this.escapeHtml(review.client_name || 'Anonymous')}</strong>
                  <div class="review-rating">
                    ${'⭐'.repeat(review.rating)} (${review.rating}/5)
                  </div>
                </div>
                <p class="review-text">${this.escapeHtml(review.comment || '')}</p>
              </div>
            `).join('') || '<p class="muted">No reviews yet</p>'}
          </div>
        </div>
      </div>
    `;

    this.showModal(html, {
      type: 'artisan-profile',
      callback: (modal) => {
        // CRITICAL FIX: Use event delegation on the modal itself
        modal.addEventListener('click', (e) => {
          // Stop event bubbling immediately
          e.stopPropagation();
          
          // Handle Book Now button
          if (e.target.id === 'book-now-btn' || e.target.closest('#book-now-btn')) {
            e.preventDefault();
            console.log('Book Now button clicked for artisan:', artisan.id);
            
            if (!this.state.user) {
              this.hideModal();
              setTimeout(() => this.openLoginModal(), 100);
              return;
            }
            
            // Close current modal and open booking form
            this.hideModal();
            setTimeout(() => {
              this.openBookingForm(artisan.id);
            }, 200);
            return;
          }
          
          // Handle WhatsApp button
          if (e.target.id === 'whatsapp-btn' || e.target.closest('#whatsapp-btn')) {
            e.preventDefault();
            const phone = artisan.phone;
            if (phone) {
              const cleanPhone = phone.replace(/\D/g, '');
              const message = `Hi ${artisan.name}, I found you on Naco and I'm interested in your ${artisan.skill} services.`;
              window.open(`https://wa.me/234${cleanPhone.replace(/^0/, '')}?text=${encodeURIComponent(message)}`, '_blank');
            } else {
              this.showToast('Phone number not available', 'error');
            }
            return;
          }
          
          // Handle Favorite button
          if (e.target.id === 'favorite-btn' || e.target.closest('#favorite-btn')) {
            e.preventDefault();
            
            if (!this.state.user) {
              this.hideModal();
              setTimeout(() => this.openLoginModal(), 100);
              return;
            }
            
            this.toggleFavorite(artisan.id);
            const btn = e.target.closest('#favorite-btn') || e.target;
            const isNowFavorite = this.state.favorites.has(artisan.id);
            
            btn.classList.toggle('active', isNowFavorite);
            btn.innerHTML = `<i class="fas fa-heart"></i> ${isNowFavorite ? 'Saved' : 'Save'}`;
            return;
          }
        });
      }
    });

  } catch (error) {
    console.error('Failed to load artisan profile:', error);
    this.showToast('Failed to load artisan profile', 'error');
  }
}



  async openBookingForm(artisanId) {
  console.log('Opening booking form for artisan:', artisanId);
  
  // Check authentication first
  if (!this.state.user) {
    console.log('User not authenticated, showing login modal');
    this.openLoginModal();
    return;
  }

  try {
    const artisan = await API.getFullArtisanData(artisanId);
    console.log('Artisan data loaded:', artisan);
    
    // Prevent self-booking
    if (artisan.id === this.state.user.id) {
      this.showToast("You cannot book yourself", 'error');
      return;
    }
    
    const html = `
      <div class="booking-modal">
        <h2>Book ${this.escapeHtml(artisan.name)}</h2>
        <div class="booking-summary">
          <img style="width: 80px; height: 80px; border-radius: 10px; object-fit: cover;" 
               src="${artisan.photo || '../assets/avatar-placeholder.png'}" 
               alt="${this.escapeHtml(artisan.name)}">
          <div>
            <strong>${this.escapeHtml(artisan.name)}</strong>
            <p class="muted">${this.escapeHtml(artisan.skill)} • ${this.formatCurrency(artisan.rate || 5000)}</p>
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
              <span>${this.formatCurrency(artisan.rate || 5000)}</span>
            </div>
            <div class="total-line">
              <span>Platform Fee</span>
              <span>₦500</span>
            </div>
            <div class="total-line total">
              <strong>Total: ${this.formatCurrency((artisan.rate || 5000) + 500)}</strong>
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

    this.showModal(html, {
      type: 'booking-form',
      callback: (modal) => {
        // Use event delegation
        modal.addEventListener('click', (e) => {
          if (e.target.id === 'confirm-booking') {
            e.preventDefault();
            e.stopPropagation();
            this.handleBookingConfirmation(artisan);
          } else if (e.target.id === 'cancel-booking') {
            e.preventDefault();
            e.stopPropagation();
            this.hideModal();
          }
        });
      }
    });

  } catch (error) {
    console.error('Failed to open booking form:', error);
    this.showToast('Failed to open booking form', 'error');
  }
}
  
 /** async handleBookingConfirmation(artisan) {
  const date = this.$('#book-date')?.value;
  const time = this.$('#book-time')?.value;
  const location = this.$('#book-location')?.value;
  const notes = this.$('#book-notes')?.value;
  const payment = this.$('#book-payment')?.value;

  if (!date || !time || !location || !notes || !payment) {
    this.showToast('Please fill in all fields', 'error');
    return;
  }

  // Create booking data with explicit relationship mapping
  const bookingData = {
    // Booking relationship fields - these are the key additions
    bookerUserId: this.state.user.id,           // Who placed the booking (acts as client)
    bookedArtisanId: artisan.id,                // Who is being booked (acts as service provider)
    
    // Traditional fields for backward compatibility
    clientId: this.state.user.id,               // Always the person booking
    clientName: this.state.user.name,
    artisanId: artisan.id,                      // Always the person being booked
    artisanName: artisan.name,
    
    // Booking details
    service: artisan.skill,
    date,
    time,
    location,
    notes,
    payment,
    amount: artisan.rate + 500,
    status: 'pending',
    
    // Metadata
    createdAt: new Date().toISOString(),
    reference: 'NACO-' + Math.random().toString(36).substr(2, 9).toUpperCase()
  };

  try {
    await API.createBooking(bookingData);
    
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
            <strong>${bookingData.reference}</strong>
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
}**/

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

  // Prevent self-booking at frontend
  if (artisan.id === this.state.user.id) {
    this.showToast('You cannot book yourself', 'error');
    return;
  }

  // Create booking data with explicit relationship mapping
  const bookingData = {
    bookedArtisanId: artisan.id,
    service: artisan.skill,
    description: notes,
    service_date: date,
    service_time: time,
    amount: (artisan.rate || 5000) + 500,
    payment_method: payment,
    location: location
  };

  // DEBUG: Log the data being sent
  console.log('=== BOOKING DEBUG ===');
  console.log('Current User:', {
    id: this.state.user.id,
    name: this.state.user.name,
    role: this.state.user.role
  });
  console.log('Artisan being booked:', {
    id: artisan.id,
    name: artisan.name,
    skill: artisan.skill,
    rate: artisan.rate
  });
  console.log('Booking data to send:', bookingData);
  console.log('Auth token exists:', !!localStorage.getItem('token'));
  console.log('===================');

  try {
    // Show loading state
    const confirmBtn = this.$('#confirm-booking');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Booking...';
    }

    const result = await API.createBooking(bookingData);
    console.log('Booking created successfully:', result);
    
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
            <strong>${result.reference || 'PENDING'}</strong>
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
      this.$('#view-booking')?.addEventListener('click', () => {
        this.hideModal();
        this.openMyBookings();
      });
      this.$('#close-confirmation')?.addEventListener('click', () => this.hideModal());
    });

    this.showToast('Booking confirmed successfully!', 'success');
    
  } catch (error) {
    console.error('Booking failed:', error);
    console.error('Full error details:', {
      message: error.message,
      stack: error.stack,
      bookingData: bookingData,
      userState: this.state.user
    });
    
    this.showToast(`Booking failed: ${error.message}`, 'error');
    
    // Re-enable button
    const confirmBtn = this.$('#confirm-booking');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<i class="fas fa-check"></i> Confirm Booking';
    }
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
/**    async openMyClients(options = {}) {
  if (!this.state.user) {
    this.openLoginModal();
    return;
  }

  try {
    const allBookings = await API.getUserBookings();
    const myClientBookings = allBookings.filter(booking => {
      const userId = this.state.user.id || this.state.user._id;
      const artisanId = booking.bookedArtisanId || booking.artisan;
      const userIdStr = userId.toString();
      const artisanIdStr = artisanId ? (artisanId._id || artisanId).toString() : '';
      return userIdStr === artisanIdStr;
    });
    
    const html = `
      <div class="my-clients-modal">
        <div class="modal-header">
          <h2>My Clients</h2>
          <button class="modal-close-btn" aria-label="Close">&times;</button>
        </div>
        <p class="muted">Manage bookings where you are providing the service (${myClientBookings.length} total)</p>
        
        <div class="client-stats">
          <div class="stat-item">
            <strong>${myClientBookings.filter(b => b.status === 'pending').length}</strong>
            <span>Pending</span>
          </div>
          <div class="stat-item">
            <strong>${myClientBookings.filter(b => b.status === 'confirmed' || b.status === 'in_progress').length}</strong>
            <span>Active</span>
          </div>
          <div class="stat-item">
            <strong>${myClientBookings.filter(b => b.status === 'pending_confirmation').length}</strong>
            <span>Awaiting Confirmation</span>
          </div>
          <div class="stat-item">
            <strong>${myClientBookings.filter(b => b.status === 'completed').length}</strong>
            <span>Completed</span>
          </div>
        </div>

        <div class="bookings-list">
          ${myClientBookings.length ? myClientBookings.map(booking => {
            let statusText = (booking.status || 'pending').toUpperCase();
            let statusClass = booking.status || 'pending';
            
            if (booking.status === 'pending_confirmation') {
              statusText = 'AWAITING CLIENT CONFIRMATION';
              statusClass = 'pending-confirmation';
            }
            
            const clientName = booking.client?.name || booking.clientName || 'Unknown Client';
            const serviceDate = booking.service_date || booking.date;
            const serviceTime = booking.service_time || booking.time;
            
            return `
              <div class="booking-item ${booking.status}">
                <div class="booking-info">
                  <strong>${this.escapeHtml(clientName)}</strong>
                  <p class="muted">${this.escapeHtml(booking.service)} • ${new Date(serviceDate).toLocaleDateString()} ${serviceTime}</p>
                  <p class="muted">Amount: ${this.formatCurrency(booking.amount || 0)}</p>
                  <p class="muted">Reference: ${booking.reference || 'N/A'}</p>
                  <span class="status-badge status-${statusClass}">${statusText}</span>
                  
                  ${booking.status === 'pending_confirmation' ? `
                    <div class="info-notice">
                      <i class="fas fa-clock"></i> You've marked this job as completed. Waiting for client confirmation.
                    </div>
                  ` : ''}
                </div>
                <div class="booking-actions">
                  ${booking.status === 'pending' ? `
                    <button class="btn-cta accept-booking" data-id="${booking._id || booking.id}">Accept</button>
                    <button class="link-btn decline-booking" data-id="${booking._id || booking.id}">Decline</button>
                  ` : booking.status === 'confirmed' ? `
                    <button class="btn-cta start-booking" data-id="${booking._id || booking.id}">Start Job</button>
                    <button class="btn-cta complete-booking" data-id="${booking._id || booking.id}">Mark Complete</button>
                    <button class="link-btn view-booking-details" data-id="${booking._id || booking.id}">View</button>
                  ` : booking.status === 'in_progress' ? `
                    <button class="btn-cta complete-booking" data-id="${booking._id || booking.id}">Mark Complete</button>
                    <button class="link-btn view-booking-details" data-id="${booking._id || booking.id}">View</button>
                  ` : `
                    <button class="link-btn view-booking-details" data-id="${booking._id || booking.id}">View</button>
                  `}
                </div>
              </div>
            `;
          }).join('') : '<p class="muted">No client bookings yet.</p>'}
        </div>
      </div>
    `;
    
    // Pass parent option to showModal
    this.showModal(html, {
      type: 'my-clients',
      className: 'clients-overlay',
      parent: options.parent, // This is the key change!
      callback: () => {
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

        this.$$('.start-booking').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleBookingAction(e.target.dataset.id, 'in_progress');
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
            const currentModalId = this.getTopModalId();
            this.openBookingDetails(e.target.dataset.id, { parent: currentModalId });
          });
        });
      }
    });

  } catch (error) {
    console.error('Failed to load client bookings:', error);
    this.showToast('Failed to load bookings', 'error');
  }
}
**/
    async openBookingDetails(bookingId) {
  try {
    console.log('Opening booking details for ID:', bookingId);
    
    const bookings = await API.getUserBookings();
    const booking = bookings.find(b => {
      const bId = (b.id || b._id).toString();
      return bId === bookingId.toString();
    });

    if (!booking) {
      this.showToast('Booking not found', 'error');
      return;
    }

    const currentUser = this.state.user;
    const currentUserId = (currentUser.id || currentUser._id).toString();
    
    const bookerUserId = (booking.bookerUserId || booking.clientId || booking.client?._id || booking.client).toString();
    const bookedArtisanId = (booking.bookedArtisanId || booking.artisanId || booking.artisan?._id || booking.artisan).toString();
    
    const isBooker = bookerUserId === currentUserId;
    const isBookedArtisan = bookedArtisanId === currentUserId;

    if (!isBooker && !isBookedArtisan) {
      this.showToast('You are not authorized to view this booking', 'error');
      return;
    }

    const serviceDate = booking.service_date || booking.date;
    const serviceTime = booking.service_time || booking.time;
    const clientName = booking.clientName || booking.client?.name || 'Unknown Client';
    const artisanName = booking.artisanName || booking.artisan?.name || 'Unknown Artisan';

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
            <p class="muted">${this.escapeHtml(booking.description || '')}</p>
          </div>
          <div class="booking-details-grid">
            <div class="detail-item">
              <i class="fas fa-user"></i>
              <span>${isBooker ? 'Artisan' : 'Client'}: 
                <strong>${this.escapeHtml(isBooker ? artisanName : clientName)}</strong>
              </span>
            </div>
            <div class="detail-item">
              <i class="fas fa-calendar"></i>
              <span>Date: <strong>${new Date(serviceDate).toLocaleDateString()}</strong></span>
            </div>
            <div class="detail-item">
              <i class="fas fa-clock"></i>
              <span>Time: <strong>${serviceTime}</strong></span>
            </div>
            <div class="detail-item">
              <i class="fas fa-map-marker-alt"></i>
              <span>Location: <strong>${this.escapeHtml(booking.location || 'TBD')}</strong></span>
            </div>
            <div class="detail-item">
              <i class="fas fa-money-bill"></i>
              <span>Amount: <strong>${this.formatCurrency(booking.amount || 0)}</strong></span>
            </div>
          </div>
        </div>

        <div class="booking-actions-modal">
          ${this.renderBookingActionButtons(booking, isBooker, isBookedArtisan)}
        </div>
      </div>
    `;

    // Use the new modal system with proper type
    this.showModal(html, {
      type: 'booking-detail',
      className: 'booking-details-overlay',
      preventBackdropClose: false,
      callback: (modal) => {
        // Use event delegation to prevent conflicts
        modal.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent event bubbling
          
          const target = e.target;
          const bookingId = booking.id || booking._id;
          
          if (target.id === 'accept-booking-btn') {
            this.handleBookingAction(bookingId, 'confirmed');
          } else if (target.id === 'decline-booking-btn') {
            this.handleBookingAction(bookingId, 'declined');
          } else if (target.id === 'complete-booking-btn') {
            if (confirm('Are you sure you have completed this job?')) {
              this.handleBookingAction(bookingId, 'completed');
            }
          } else if (target.id === 'confirm-completion-btn') {
            if (confirm('Are you satisfied with the completed work?')) {
              this.handleBookingAction(bookingId, 'confirm_completion');
            }
          } else if (target.id === 'reject-completion-btn') {
            if (confirm('Are you sure the work is not completed to your satisfaction?')) {
              this.handleBookingAction(bookingId, 'reject_completion');
            }
          }
        });
      }
    });

  } catch (error) {
    console.error('Failed to load booking details:', error);
    this.showToast('Failed to load booking details', 'error');
  }
}
    

// Helper method to render action buttons
renderBookingActionButtons(booking, isBooker, isBookedArtisan) {
  const status = booking.status || 'pending';
  let buttons = '';

  if (isBookedArtisan) {
    // Artisan actions
    if (status === 'pending') {
      buttons += `
        <button id="accept-booking-btn" class="btn-primary" data-id="${booking.id || booking._id}">
          <i class="fas fa-check"></i> Accept Booking
        </button>
        <button id="decline-booking-btn" class="link-btn" data-id="${booking.id || booking._id}">
          Decline
        </button>
      `;
    } else if (status === 'confirmed' || status === 'in_progress') {
      buttons += `
        <button id="complete-booking-btn" class="btn-primary" data-id="${booking.id || booking._id}">
          <i class="fas fa-check-circle"></i> Mark as Completed
        </button>
      `;
    } else if (status === 'pending_confirmation') {
      buttons += `
        <div class="waiting-section">
          <p class="muted">
            <i class="fas fa-clock"></i> Waiting for client to confirm job completion...
          </p>
        </div>
      `;
    } else if (status === 'completed') {
      buttons += `
        <div class="completed-section">
          <p style="color: var(--green);">
            <i class="fas fa-check-circle"></i> Job completed and confirmed by client
          </p>
        </div>
      `;
    }
  }

  if (isBooker) {
    // Client actions
    if (status === 'pending_confirmation') {
      buttons += `
        <div class="confirmation-section">
          <h4>Artisan has marked this job as completed. Please confirm:</h4>
          <div style="display: flex; gap: 12px; margin-top: 16px;">
            <button id="confirm-completion-btn" class="btn-primary" data-id="${booking.id || booking._id}">
              <i class="fas fa-check"></i> Confirm Completion
            </button>
            <button id="reject-completion-btn" class="link-btn" data-id="${booking.id || booking._id}">
              <i class="fas fa-times"></i> Reject - Work Not Complete
            </button>
          </div>
        </div>
      `;
    } else if (status === 'completed') {
      buttons += `
        <button id="review-booking-btn" class="btn-primary" data-id="${booking.id || booking._id}" data-artisan="${booking.artisanId || booking.bookedArtisanId}">
          <i class="fas fa-star"></i> Leave Review
        </button>
      `;
    }
  }

  return buttons;
}

// Helper method to bind action handlers
bindBookingActionHandlers(booking) {
  const bookingId = booking.id || booking._id;
  
  this.$('#accept-booking-btn')?.addEventListener('click', () => {
    this.handleBookingAction(bookingId, 'confirmed');
  });
  
  this.$('#decline-booking-btn')?.addEventListener('click', () => {
    this.handleBookingAction(bookingId, 'declined');
  });
  
  this.$('#complete-booking-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure you have completed this job? The client will be asked to confirm.')) {
      this.handleBookingAction(bookingId, 'completed');
    }
  });
  
  this.$('#confirm-completion-btn')?.addEventListener('click', () => {
    if (confirm('Are you satisfied with the completed work?')) {
      this.handleBookingAction(bookingId, 'confirm_completion');
    }
  });
  
  this.$('#reject-completion-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure the work is not completed to your satisfaction?')) {
      this.handleBookingAction(bookingId, 'reject_completion');
    }
  });
  
  this.$('#review-booking-btn')?.addEventListener('click', (e) => {
    const artisanId = e.target.dataset.artisan;
    this.openReviewModal(bookingId, artisanId);
  });
}
  
 /**   async handleBookingAction(bookingId, action) {
  if (!this.state.user) {
    this.openLoginModal();
    return;
  }

  try {
    const bookings = await API.getUserBookings();
    const booking = bookings.find(b => b._id === bookingId || b.id === bookingId);
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    const currentUserId = this.state.user.id || this.state.user._id;
    
    // Use string comparison to handle ObjectId vs String issues
    const isServiceRequester = booking.bookerUserId.toString() === currentUserId.toString();
    const isServiceProvider = booking.bookedArtisanId.toString() === currentUserId.toString();
    
    
    const isBooker = booking.bookerUserId === currentUserId;           // Person who placed booking
    const isBookedArtisan = booking.bookedArtisanId === currentUserId; // Person being booked
    
    // Fallback for legacy bookings without new fields
    const isClient = booking.clientId === currentUserId;
    const isArtisan = booking.artisanId === currentUserId;
    
    // Combined relationship check
    /**const isServiceRequester = isBooker || isClient;
    const isServiceProvider = isBookedArtisan || isArtisan; **

    if (!isServiceRequester && !isServiceProvider) {
      throw new Error('You are not part of this booking');
    }

    let status;
    const actionLower = String(action || '').trim().toLowerCase();

    // Validate actions based on booking relationship (not user role)
    switch (actionLower) {
      case 'accept':
      case 'confirmed':
        if (!isServiceProvider) {
          throw new Error('Only the booked artisan can accept this booking');
        }
        status = 'confirmed';
        break;
        
      case 'decline':
      case 'declined':
        if (!isServiceProvider) {
          throw new Error('Only the booked artisan can decline this booking');
        }
        status = 'declined';
        break;
        
      case 'start':
      case 'in_progress':
        if (!isServiceProvider) {
          throw new Error('Only the booked artisan can start this job');
        }
        status = 'in_progress';
        break;
        
      case 'completed':
      case 'mark_completed':
      case 'artisan_completed':
        if (!isServiceProvider) {
          throw new Error('Only the booked artisan can mark the job as completed');
        }
        status = 'pending_confirmation';
        break;
        
      case 'confirm_completion':
        if (!isServiceRequester) {
          throw new Error('Only the person who placed the booking can confirm completion');
        }
        status = 'completed';
        break;
        
      case 'reject_completion':
        if (!isServiceRequester) {
          throw new Error('Only the person who placed the booking can reject completion');
        }
        status = 'confirmed'; // Return to confirmed state
        break;
        
      case 'cancel':
      case 'cancelled':
        // Either party can cancel
        if (!isServiceRequester && !isServiceProvider) {
          throw new Error('You cannot cancel this booking');
        }
        status = 'cancelled';
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Update booking status
    const updatedBooking = await API.updateBookingStatus(bookingId, status);

    // Success messages
    const messages = {
      confirmed: 'Booking accepted successfully',
      declined: 'Booking declined',
      in_progress: 'Job started',
      pending_confirmation: 'Job marked as completed. Waiting for client confirmation.',
      completed: 'Job completion confirmed successfully',
      cancelled: 'Booking cancelled'
    };

    this.showToast(messages[status] || 'Booking updated', 'success');

    // Refresh appropriate view based on user's relationship to booking
    if (isServiceProvider) {
      this.openMyClients();
    } else if (isServiceRequester) {
      this.openMyBookings();
    }

    return updatedBooking;
    
  } catch (error) {
    console.error('Failed to update booking:', error);
    this.showToast(error.message || 'Failed to update booking', 'error');
    throw error;
  }
} **/


  // User Bookings
/** async openMyBookings(options = {}) {
  if (!this.state.user) {
    this.openLoginModal();
    return;
  }

  try {
    const allBookings = await API.getUserBookings();
    const myBookings = allBookings.filter(booking => {
      const userId = this.state.user.id || this.state.user._id;
      const bookerId = booking.bookerUserId || booking.client;
      const bookerIdStr = bookerId ? (bookerId._id || bookerId).toString() : '';
      return bookerIdStr === userId.toString();
    });
    
    const html = `
      <div class="my-bookings-modal">
        <div class="modal-header">
          <h2>My Bookings</h2>
          <button class="modal-close-btn" aria-label="Close">&times;</button>
        </div>
        <p class="muted">Track service requests you've placed (${myBookings.length} total)</p>
        
        <div class="bookings-list">
          ${myBookings.length ? myBookings.map(booking => {
            let statusText = (booking.status || 'pending').toUpperCase();
            let statusClass = booking.status || 'pending';
            
            if (booking.status === 'pending_confirmation') {
              statusText = 'AWAITING YOUR CONFIRMATION';
              statusClass = 'pending-confirmation';
            }
            
            const artisanName = booking.artisan?.name || booking.artisanName || 'Unknown Artisan';
            const serviceDate = booking.service_date || booking.date;
            const serviceTime = booking.service_time || booking.time;
            
            return `
              <div class="booking-item">
                <div class="booking-header">
                  <strong>${this.escapeHtml(booking.service)}</strong>
                  <span class="status-badge status-${statusClass}">${statusText}</span>
                </div>
                <p class="muted">with ${this.escapeHtml(artisanName)}</p>
                <p><i class="fas fa-calendar"></i> ${new Date(serviceDate).toLocaleDateString()} at ${serviceTime}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(booking.location || 'Location TBD')}</p>
                <p><i class="fas fa-money-bill"></i> Amount: ${this.formatCurrency(booking.amount || 0)}</p>
                <p><i class="fas fa-receipt"></i> Reference: ${booking.reference || 'N/A'}</p>
                
                ${booking.status === 'pending_confirmation' ? `
                  <div class="urgent-notice">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Action Required:</strong> Artisan has marked this job as completed. Please review and confirm.
                  </div>
                ` : ''}
                
                <div class="booking-actions">
                  ${booking.status === 'pending' ? `
                    <button class="link-btn cancel-booking" data-id="${booking._id || booking.id}">Cancel</button>
                  ` : ''}
                  ${booking.status === 'pending_confirmation' ? `
                    <button class="btn-cta confirm-completion-btn" data-id="${booking._id || booking.id}">Confirm Completion</button>
                    <button class="link-btn reject-completion-btn" data-id="${booking._id || booking.id}">Reject</button>
                  ` : ''}
                  ${booking.status === 'completed' ? `
                    <button class="btn-cta review-booking" data-id="${booking._id || booking.id}" data-artisan="${booking.artisan?._id || booking.artisan}">Leave Review</button>
                  ` : ''}
                  <button class="link-btn view-booking-details" data-id="${booking._id || booking.id}">Details</button>
                </div>
              </div>
            `;
          }).join('') : '<p class="muted">No bookings yet. Start by booking an artisan!</p>'}
        </div>
      </div>
    `;
    
    // Pass parent option to showModal
    this.showModal(html, {
      type: 'my-bookings',
      className: 'bookings-overlay',
      parent: options.parent, // This is the key change!
      callback: () => {
        // Event binding code here
        this.$$('.cancel-booking').forEach(btn => {
          btn.addEventListener('click', (e) => this.handleBookingAction(e.target.dataset.id, 'cancelled'));
        });
        
        this.$$('.view-booking-details').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const currentModalId = this.getTopModalId();
            this.openBookingDetails(e.target.dataset.id, { parent: currentModalId });
          });
        });

        this.$$('.review-booking').forEach(btn => {
          btn.addEventListener('click', (e) => this.openReviewModal(e.target.dataset.id, e.target.dataset.artisan));
        });

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
      }
    });

  } catch (error) {
    console.error('Failed to load bookings:', error);
    this.showToast('Failed to load bookings', 'error');
  }
}
   **/



    async handleBookingAction(bookingId, action) {
  if (!this.state.user) {
    this.openLoginModal();
    return;
  }

  try {
    console.log('Handling booking action:', { bookingId, action });

    const bookings = await API.getUserBookings();
    const booking = bookings.find(b => (b._id || b.id).toString() === bookingId.toString());
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    const currentUserId = (this.state.user.id || this.state.user._id).toString();
    const bookerUserId = (booking.bookerUserId || booking.clientId || booking.client?._id || booking.client).toString();
    const bookedArtisanId = (booking.bookedArtisanId || booking.artisanId || booking.artisan?._id || booking.artisan).toString();
    
    const isServiceRequester = bookerUserId === currentUserId;
    const isServiceProvider = bookedArtisanId === currentUserId;

    if (!isServiceRequester && !isServiceProvider) {
      throw new Error('You are not part of this booking');
    }

    // Validate actions based on user relationship and booking status
    const currentStatus = booking.status;
    let allowedActions = [];

    if (isServiceProvider) {
      // Actions allowed for service provider (artisan)
      switch (currentStatus) {
        case 'pending':
          allowedActions = ['confirmed', 'declined'];
          break;
        case 'confirmed':
          allowedActions = ['in_progress', 'completed'];
          break;
        case 'in_progress':
          allowedActions = ['completed'];
          break;
        default:
          allowedActions = ['cancelled'];
      }
    }

    if (isServiceRequester) {
      // Actions allowed for service requester (client)
      switch (currentStatus) {
        case 'pending':
          allowedActions = ['cancelled'];
          break;
        case 'pending_confirmation':
          allowedActions = ['confirm_completion', 'reject_completion'];
          break;
        default:
          allowedActions = ['cancelled'];
      }
    }

    if (!allowedActions.includes(action)) {
      throw new Error(`Action "${action}" not allowed for ${isServiceProvider ? 'service provider' : 'service requester'} in status "${currentStatus}"`);
    }

    // Show loading state
    this.showToast('Updating booking...', 'info');

    // Call API with the correct action
    const updatedBooking = await API.updateBookingStatus(bookingId, action);
    
    console.log('Booking updated successfully:', updatedBooking);

    // Success messages
    const messages = {
      confirmed: 'Booking accepted successfully',
      declined: 'Booking declined',
      in_progress: 'Job started',
      completed: 'Job marked as completed. Waiting for client confirmation.',
      confirm_completion: 'Job completion confirmed successfully',
      reject_completion: 'Completion rejected. Artisan has been notified.',
      cancelled: 'Booking cancelled'
    };

    this.showToast(messages[action] || 'Booking updated', 'success');

    // Close current modal and refresh appropriate view
    this.hideModal();

    // Refresh the appropriate view after a short delay
    setTimeout(() => {
      if (isServiceProvider) {
        this.openMyClients();
      } else if (isServiceRequester) {
        this.openMyBookings();
      }
    }, 500);

    return updatedBooking;
    
  } catch (error) {
    console.error('Failed to update booking:', error);
    this.showToast(error.message || 'Failed to update booking', 'error');
    throw error;
  }
}
   

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

  // Clear existing poller
  if (this.state.notificationsPoller) {
    clearInterval(this.state.notificationsPoller);
  }

  let lastNotificationCheck = Date.now();
  let knownNotificationIds = new Set(
    this.state.notifications.map(n => (n.id || n._id).toString())
  );

  const poll = async () => {
    try {
      const notifications = await API.getNotifications();
      const unreadCount = notifications.filter(n => !n.read).length;
      
      // Check for new notifications
      const newNotifications = notifications.filter(n => {
        const nId = (n.id || n._id).toString();
        const notificationTime = new Date(n.createdAt || n.created).getTime();
        const isNew = notificationTime > lastNotificationCheck && !knownNotificationIds.has(nId) && !n.read;
        
        knownNotificationIds.add(nId);
        return isNew;
      });
      
      // Show browser notifications for new items
      for (const notification of newNotifications) {
        await this.showPushNotification(
          notification.title || 'Naco Update',
          notification.message || 'You have a new notification',
          notification.data || {}
        );
        await new Promise(resolve => setTimeout(resolve, 500)); // Stagger notifications
      }
      
      lastNotificationCheck = Date.now();
      
      // Only update state if there are actual changes
      const currentIds = new Set(this.state.notifications.map(n => (n.id || n._id).toString()));
      const newIds = new Set(notifications.map(n => (n.id || n._id).toString()));
      const hasChanges = currentIds.size !== newIds.size || 
                        this.state.notificationCount !== unreadCount ||
                        ![...currentIds].every(id => newIds.has(id));
      
      if (hasChanges) {
        this.updateState('notifications', notifications);
        this.updateState('notificationCount', unreadCount);
      }
      
    } catch (error) {
      console.warn('Notification polling failed:', error);
    }
  };

  // Initial poll
  await poll();
  
  // Set up polling with increased interval to reduce server load
  this.setState({ 
    notificationsPoller: setInterval(poll, 15000) // 15 seconds instead of 5
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
    // Call API to mark all notifications as read for current user
    await API.markNotificationsRead(this.state.user.id);
    
    // Update all notifications in state to read: true
    const updatedNotifications = this.state.notifications.map(notification => ({
      ...notification,
      read: true
    }));
    
    this.setState({ 
      notifications: updatedNotifications,
      notificationCount: 0 
    });
    
    this.showToast('All notifications marked as read', 'success');
  } catch (error) {
    console.error('Failed to mark notifications as read:', error);
    this.showToast('Failed to update notifications', 'error');
  }
}

    async openNotifications(options = {}) {
  if (!this.state.user) {
    this.openLoginModal();
    return;
  }

  try {
    const notifications = await API.getNotifications();
    const unreadCount = notifications.filter(n => !n.read).length;
    const unreadNotifications = notifications.filter(n => !n.read);
    
    const html = `
     <div class="notifications-panel facebook-style">
  <!-- Header with reduced height -->
  <div class="notifications-header" style="position: fixed; top: 0; left: 0; right: 0; height: 80px; z-index: 1000; background: var(--bg); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(0,0,0,0.1);">
    <div class="header-content" style="padding: 40px 16px 12px 16px; display: flex; align-items: center;">
      <button class="back-button" aria-label="Close notifications" style="background: none; border: none; padding: 8px; border-radius: 50%; margin-right: 16px; color: var(--text);">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="header-title" style="display: flex; align-items: center; gap: 12px;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: var(--text);">Notifications</h1>
        ${unreadCount > 0 ? `
          <span class="notification-count" style="background: #1877F2; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 500;">${unreadCount} new</span>
        ` : ''}
      </div>
    </div>
  </div>

  <!-- Filter tabs -->
  <div class="notification-filters" style="position: fixed; top: 80px; left: 0; right: 0; z-index: 999; background: var(--bg); border-bottom: 1px solid #e4e6ea; padding: 8px 16px; display: flex; justify-content: space-between; align-items: center;">
    <div class="filter-tabs" style="display: flex; gap: 16px;">
      <button class="filter-tab active" data-filter="all" style="background: none; border: none; padding: 8px 0; font-weight: 600; color: #1877F2; border-bottom: 2px solid #1877F2; transition: all 0.2s ease;">All</button>
      <button class="filter-tab" data-filter="unread" style="background: none; border: none; padding: 8px 0; font-weight: 500; color: ${unreadCount > 0 ? 'var(--text)' : '#65676B'}; border-bottom: 2px solid transparent; transition: all 0.2s ease; ${unreadCount === 0 ? 'opacity: 0.7;' : ''}">Unread</button>
      <button class="filter-tab" data-filter="bookings" style="background: none; border: none; padding: 8px 0; font-weight: 500; color: var(--text); border-bottom: 2px solid transparent; transition: all 0.2s ease;">Bookings</button>
    </div>
    ${unreadCount > 0 ? `
      <button class="mark-all-read" id="mark-all-read" style="background: #E4E6EA; border: none; padding: 6px 12px; border-radius: 6px; font-size: 14px; font-weight: 500; color: var(--text);">
        Mark all as read
      </button>
    ` : ''}
  </div>

  <!-- Notifications list with proper scrolling -->
  <div class="notifications-content" style="margin-top: 130px; height: calc(100vh - 130px); overflow-y: auto; -webkit-overflow-scrolling: touch; background: var(--bg);">
    <div class="notifications-list" style="padding: 0 16px;">
      ${notifications.length ? notifications.map(notification => `
        <div class="notification-item ${notification.read ? 'read' : 'unread'}" 
             data-id="${notification.id || notification._id}"
             data-notification-type="${notification.type}"
             data-read-status="${notification.read ? 'read' : 'unread'}"
             style="display: flex; padding: 12px 0; border-bottom: 1px solid #f0f2f5; position: relative; background: var(--bg);">
          
          <!-- Avatar/Icon -->
          <div class="notification-avatar" style="margin-right: 12px;">
            <div class="avatar-container" style="position: relative;">
              ${notification.type === 'booking' ? `
                <div class="service-icon" style="width: 40px; height: 40px; background: #1877F2; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="white" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </div>
              ` : `
                <div class="system-icon" style="width: 40px; height: 40px; background: #42B883; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="white" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </div>
              `}
              ${!notification.read ? '<div class="unread-dot" style="position: absolute; top: -2px; right: -2px; width: 12px; height: 12px; background: #1877F2; border-radius: 50%; border: 2px solid var(--bg);"></div>' : ''}
            </div>
          </div>

          <!-- Content -->
          <div class="notification-content" style="flex: 1; min-width: 0;">
            <div class="notification-text">
              <span class="notification-title" style="font-weight: 600; color: var(--text); display: block; margin-bottom: 4px;">${this.escapeHtml(notification.title)}</span>
              <p class="notification-message" style="margin: 0; color: var(--text); opacity: 0.8; font-size: 14px; line-height: 1.4; word-wrap: break-word;">${this.escapeHtml(notification.message)}</p>
            </div>
            
            <div class="notification-meta" style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
              <span class="notification-time" style="color: var(--text); opacity: 0.6; font-size: 12px;">${this.formatNotificationTime(notification)}</span>
              ${notification.data?.bookingId ? `
                <button class="view-details-btn" data-booking-id="${notification.data.bookingId}" style="background: #E4E6EA; border: none; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; color: var(--text);">
                  View
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Action menu -->
          <div class="notification-actions" style="margin-left: 8px;">
            <button class="action-menu" aria-label="More actions" style="background: none; border: none; padding: 8px; border-radius: 50%; color: var(--text);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="1" stroke="currentColor" stroke-width="2"/>
                <circle cx="19" cy="12" r="1" stroke="currentColor" stroke-width="2"/>
                <circle cx="5" cy="12" r="1" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </div>
        </div>
      `).join('') : `
        <div class="empty-notifications" style="text-align: center; padding: 60px 20px; background: var(--bg);">
          <div class="empty-illustration" style="margin-bottom: 20px;">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="var(--text)" stroke-opacity="0.3" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
          <h3 style="margin: 0 0 8px 0; color: var(--text); font-size: 18px;">You're all caught up!</h3>
          <p style="margin: 0; color: var(--text); opacity: 0.7; font-size: 14px;">Check back later for new notifications</p>
        </div>
      `}
    </div>
  </div>
</div>
    `;

    // Fixed modal configuration
    this.showModal(html, {
      type: 'notifications-facebook',
      className: 'notifications-modal-overlay facebook-notifications',
      hideClose: true,
      preventBackdropClose: false,
      parent: options.parent,
      callback: (modal) => {
        // Clean modal styling for full-screen notifications
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
          modalContent.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: 100% !important;
            max-height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: var(--bg) !important;
            transform: none !important;
            overflow: hidden !important;
          `;
        }

        const modalBackdrop = modal.querySelector('.modal-backdrop');
        if (modalBackdrop) {
          modalBackdrop.style.display = 'none';
        }

        this.bindNotificationEvents(modal);
        
        // ADD FILTER FUNCTIONALITY
        this.setupNotificationFilters(modal, notifications);
      }
    });

  } catch (error) {
    console.error('Failed to load notifications:', error);
    this.showToast('Failed to load notifications', 'error');
  }
}

// UPDATED FILTER FUNCTIONALITY WITH PROPER EMPTY STATE
setupNotificationFilters(modal, notifications) {
  const filterTabs = modal.querySelectorAll('.filter-tab');
  const notificationItems = modal.querySelectorAll('.notification-item');
  const notificationsList = modal.querySelector('.notifications-list');
  const unreadCount = notifications.filter(n => !n.read).length;

  filterTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const filter = tab.dataset.filter;
      
      // Allow clicking unread tab even when no unread notifications exist
      // but show appropriate empty state

      // Update active tab styling
      filterTabs.forEach(t => {
        t.style.fontWeight = '500';
        t.style.color = 'var(--text)';
        t.style.borderBottom = '2px solid transparent';
        t.classList.remove('active');
      });
      
      tab.style.fontWeight = '600';
      tab.style.color = '#1877F2';
      tab.style.borderBottom = '2px solid #1877F2';
      tab.classList.add('active');

      // Filter notifications
      let visibleItems = 0;
      notificationItems.forEach(item => {
        const matchesFilter = this.matchesFilter(item, filter);
        item.style.display = matchesFilter ? 'flex' : 'none';
        if (matchesFilter) visibleItems++;
      });

      // Handle empty state
      this.showFilterEmptyState(modal, filter, visibleItems, unreadCount);
    });
  });
}

// UPDATED HELPER METHOD
matchesFilter(item, filter) {
  switch (filter) {
    case 'all':
      return true;
    case 'unread':
      return item.dataset.readStatus === 'unread';
    case 'bookings':
      return item.dataset.notificationType === 'booking';
    default:
      return true;
  }
}

// UPDATED EMPTY STATE METHOD WITH "NO NEW NOTIFICATIONS YET"
showFilterEmptyState(modal, filter, visibleItems, unreadCount) {
  const emptyState = modal.querySelector('.empty-notifications');
  const notificationsList = modal.querySelector('.notifications-list');
  
  // Remove existing empty state if any
  const existingEmptyState = notificationsList.querySelector('.filter-empty-state');
  if (existingEmptyState) {
    existingEmptyState.remove();
  }

  if (visibleItems === 0) {
    let emptyMessage = '';
    let emptyDescription = '';
    
    switch (filter) {
      case 'unread':
        emptyMessage = 'No new notifications yet';
        emptyDescription = 'You\'re all caught up! New notifications will appear here';
        break;
      case 'bookings':
        emptyMessage = 'No booking notifications';
        emptyDescription = 'You have no notifications related to bookings';
        break;
      default:
        emptyMessage = 'No notifications';
        emptyDescription = 'You have no notifications at this time';
    }

    const emptyStateHTML = `
      <div class="filter-empty-state" style="text-align: center; padding: 60px 20px; background: var(--bg);">
        <div class="empty-illustration" style="margin-bottom: 20px;">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="var(--text)" stroke-opacity="0.3" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <h3 style="margin: 0 0 8px 0; color: var(--text); font-size: 18px;">${emptyMessage}</h3>
        <p style="margin: 0; color: var(--text); opacity: 0.7; font-size: 14px;">${emptyDescription}</p>
      </div>
    `;
    
    notificationsList.insertAdjacentHTML('beforeend', emptyStateHTML);
  }
}


    
    formatNotificationTime(notification) {
  const date = new Date(notification.createdAt || notification.created);
  if (isNaN(date.getTime())) return '';
  
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}

// Helper method to get notification type labels
getNotificationTypeLabel(type) {
  const labels = {
    booking: 'Booking Update',
    payment: 'Payment',
    message: 'Message',
    system: 'System',
    review: 'Review',
    default: 'Notification'
  };
  return labels[type] || labels.default;
}

    
    bindNotificationEvents(modal) {
  // Close button handler
  const closeButton = modal.querySelector('.back-button');
  if (closeButton) {
    closeButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.closeModalById) {
        // Find the modal ID from the stack
        const modalElement = e.target.closest('.modal-overlay');
        if (modalElement && modalElement.id) {
          this.closeModalById(modalElement.id);
        }
      } else {
        this.hideModal();
      }
    });
  }

  // Filter tab handlers
  const filterTabs = modal.querySelectorAll('.filter-tab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Remove active from all tabs
      filterTabs.forEach(t => t.classList.remove('active'));
      // Add active to clicked tab
      e.target.classList.add('active');
      
      const filter = e.target.dataset.filter;
      const notifications = modal.querySelectorAll('.notification-item');
      let visibleCount = 0;
      
      notifications.forEach(notif => {
        let shouldShow = false;
        
        if (filter === 'all') {
          shouldShow = true;
        } else if (filter === 'unread') {
          shouldShow = notif.classList.contains('unread');
        } else if (filter === 'bookings') {
          shouldShow = notif.dataset.notificationType === 'booking';
        } else {
          shouldShow = notif.dataset.filter === filter;
        }
        
        if (shouldShow) {
          notif.style.display = 'flex';
          visibleCount++;
        } else {
          notif.style.display = 'none';
        }
      });

      // Update empty state visibility
      const emptyState = modal.querySelector('.empty-notifications');
      const notificationsList = modal.querySelector('.notifications-list');
      
      if (visibleCount === 0 && emptyState) {
        emptyState.style.display = 'flex';
      } else if (emptyState) {
        emptyState.style.display = 'none';
      }
    });
  });

  // Mark all as read button
  const markAllButton = modal.querySelector('#mark-all-read');
  if (markAllButton) {
    markAllButton.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      try {
        // Show loading state
        const originalText = markAllButton.textContent;
        markAllButton.textContent = 'Marking...';
        markAllButton.disabled = true;

        await this.markAllNotificationsRead();
        
        // Update UI immediately
        const unreadItems = modal.querySelectorAll('.notification-item.unread');
        unreadItems.forEach(item => {
          item.classList.remove('unread');
          item.classList.add('read');
          
          // Remove unread indicator dot
          const indicator = item.querySelector('.unread-dot');
          if (indicator) {
            indicator.remove();
          }
          
          // Update background
          item.style.background = 'transparent';
        });
        
        // Hide the mark all read button
        markAllButton.style.display = 'none';
        
        // Update notification count in header
        const notificationCount = modal.querySelector('.notification-count');
        if (notificationCount) {
          notificationCount.textContent = '0 new';
        }
        
        this.showToast('All notifications marked as read', 'success');
        
      } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
        this.showToast('Failed to mark notifications as read', 'error');
        
        // Restore button state
        markAllButton.textContent = originalText;
        markAllButton.disabled = false;
      }
    });
  }

  // Individual notification click handlers
  modal.addEventListener('click', async (e) => {
    // Handle view details button clicks
    const viewDetailsButton = e.target.closest('.view-details-btn');
    if (viewDetailsButton) {
      e.preventDefault();
      e.stopPropagation();
      
      const bookingId = viewDetailsButton.dataset.bookingId;
      if (bookingId) {
        console.log('Opening booking details for:', bookingId);
        
        // Add loading state to button
        const originalText = viewDetailsButton.textContent;
        viewDetailsButton.textContent = 'Loading...';
        viewDetailsButton.disabled = true;
        
        try {
          // Open booking details as overlay
          await this.openBookingDetailsOverlay(bookingId);
        } catch (error) {
          console.error('Failed to open booking details:', error);
          this.showToast('Failed to load booking details', 'error');
        } finally {
          // Restore button state
          viewDetailsButton.textContent = originalText;
          viewDetailsButton.disabled = false;
        }
      }
      return;
    }

    // Handle action menu clicks
    const actionMenu = e.target.closest('.action-menu');
    if (actionMenu) {
      e.preventDefault();
      e.stopPropagation();
      
      const notificationItem = actionMenu.closest('.notification-item');
      const notificationId = notificationItem?.dataset.id;
      
      if (notificationId) {
        this.showNotificationActionMenu(notificationId, actionMenu);
      }
      return;
    }

    // Handle full notification item clicks
    const notificationItem = e.target.closest('.notification-item');
    if (notificationItem && !e.target.closest('.view-details-btn') && !e.target.closest('.action-menu')) {
      e.preventDefault();
      e.stopPropagation();
      
      const notificationId = notificationItem.dataset.id;
      if (notificationId) {
        console.log('Clicked notification:', notificationId);
        
        // Add visual feedback
        notificationItem.style.transform = 'scale(0.98)';
        setTimeout(() => {
          notificationItem.style.transform = '';
        }, 150);
        
        try {
          await this.handleNotificationClick(notificationId);
          
          // Update visual state immediately if it was unread
          if (notificationItem.classList.contains('unread')) {
            notificationItem.classList.remove('unread');
            notificationItem.classList.add('read');
            
            // Remove unread indicator
            const unreadDot = notificationItem.querySelector('.unread-dot');
            if (unreadDot) {
              unreadDot.remove();
            }
            
            // Update background
            notificationItem.style.background = 'transparent';
            
            // Update notification count
            const notificationCount = modal.querySelector('.notification-count');
            if (notificationCount) {
              const currentCount = parseInt(notificationCount.textContent.match(/\d+/)?.[0] || '0');
              const newCount = Math.max(0, currentCount - 1);
              notificationCount.textContent = `${newCount} new`;
              
              // Hide mark all read button if no unread notifications
              if (newCount === 0) {
                const markAllBtn = modal.querySelector('#mark-all-read');
                if (markAllBtn) {
                  markAllBtn.style.display = 'none';
                }
              }
            }
          }
          
        } catch (error) {
          console.error('Failed to handle notification click:', error);
          this.showToast('Failed to process notification', 'error');
        }
      }
    }
  });

  // Handle settings button click
  const settingsButton = modal.querySelector('.settings-button');
  if (settingsButton) {
    settingsButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openNotificationSettings();
    });
  }

  // Handle keyboard navigation
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      const closeButton = modal.querySelector('.back-button');
      if (closeButton) {
        closeButton.click();
      }
    }
    
    // Arrow key navigation for notifications
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      
      const visibleNotifications = Array.from(modal.querySelectorAll('.notification-item'))
        .filter(item => item.style.display !== 'none');
      
      if (visibleNotifications.length === 0) return;
      
      const currentFocus = modal.querySelector('.notification-item:focus');
      let currentIndex = currentFocus ? visibleNotifications.indexOf(currentFocus) : -1;
      
      if (e.key === 'ArrowDown') {
        currentIndex = (currentIndex + 1) % visibleNotifications.length;
      } else {
        currentIndex = currentIndex <= 0 ? visibleNotifications.length - 1 : currentIndex - 1;
      }
      
      visibleNotifications[currentIndex]?.focus();
    }
    
    // Enter key to click focused notification
    if (e.key === 'Enter' && e.target.classList.contains('notification-item')) {
      e.preventDefault();
      e.target.click();
    }
  });

  // Add focus management for accessibility
  const notificationItems = modal.querySelectorAll('.notification-item');
  notificationItems.forEach(item => {
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `Notification: ${item.querySelector('.notification-title')?.textContent || 'Notification'}`);
  });

  // Handle pull-to-refresh (if implemented)
  let startY = 0;
  let currentY = 0;
  let pullDistance = 0;
  const pullThreshold = 60;
  
  const notificationsList = modal.querySelector('.notifications-list');
  if (notificationsList) {
    notificationsList.addEventListener('touchstart', (e) => {
      if (notificationsList.scrollTop === 0) {
        startY = e.touches[0].clientY;
      }
    });

    notificationsList.addEventListener('touchmove', (e) => {
      if (startY === 0) return;
      
      currentY = e.touches[0].clientY;
      pullDistance = currentY - startY;
      
      if (pullDistance > 0 && notificationsList.scrollTop === 0) {
        e.preventDefault();
        // Add visual feedback for pull-to-refresh
        const refreshIndicator = modal.querySelector('.pull-refresh-indicator');
        if (refreshIndicator) {
          refreshIndicator.style.transform = `translateY(${Math.min(pullDistance, pullThreshold)}px)`;
          refreshIndicator.style.opacity = Math.min(pullDistance / pullThreshold, 1);
        }
      }
    });

    notificationsList.addEventListener('touchend', async () => {
      if (pullDistance > pullThreshold) {
        // Trigger refresh
        try {
          await this.refreshNotifications();
        } catch (error) {
          console.error('Failed to refresh notifications:', error);
        }
      }
      
      // Reset pull state
      startY = 0;
      pullDistance = 0;
      const refreshIndicator = modal.querySelector('.pull-refresh-indicator');
      if (refreshIndicator) {
        refreshIndicator.style.transform = '';
        refreshIndicator.style.opacity = '';
      }
    });
  }
}

// Helper method for showing action menu
showNotificationActionMenu(notificationId, anchorElement) {
  const menuHTML = `
    <div class="notification-action-menu">
      <button class="action-item mark-read" data-id="${notificationId}">
        <i class="fas fa-check"></i> Mark as read
      </button>
      <button class="action-item delete-notification" data-id="${notificationId}">
        <i class="fas fa-trash"></i> Delete
      </button>
      <button class="action-item turn-off" data-id="${notificationId}">
        <i class="fas fa-bell-slash"></i> Turn off notifications like this
      </button>
    </div>
  `;
  
  // Implementation would depend on your dropdown/popover system
  console.log('Show action menu for notification:', notificationId);
}

// Helper method for notification settings
openNotificationSettings() {
  const settingsHTML = `
    <div class="notification-settings">
      <h3>Notification Settings</h3>
      <div class="settings-options">
        <label class="setting-item">
          <input type="checkbox" checked> Booking updates
        </label>
        <label class="setting-item">
          <input type="checkbox" checked> System notifications
        </label>
        <label class="setting-item">
          <input type="checkbox"> Email notifications
        </label>
      </div>
    </div>
  `;
  
  this.showModal(settingsHTML, {
    type: 'notification-settings',
    className: 'settings-modal'
  });
}

// Helper method for refreshing notifications
async refreshNotifications() {
  try {
    const notifications = await API.getNotifications();
    // Update the notifications in the current modal
    // This would require rebuilding the notification list
    console.log('Refreshed notifications:', notifications.length);
  } catch (error) {
    throw error;
  }
}

formatNotificationDate(notification) {
  const date = new Date(notification.createdAt || notification.created);
  if (isNaN(date.getTime())) return 'Unknown date';
  
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}

openBookingDetailsOverlay(bookingId) {
  // This will overlay on top of the notification panel
  this.openBookingDetails(bookingId);
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
  async loadSession() {
  try {
    const user = await API.getCurrentUser();
    if (user) {
      this.setState({ user });
    }
  } catch (error) {
    console.error('Failed to load session:', error);
    API.logout(); // Clear invalid session
  }
}

  saveSession() {
  // Session is automatically managed by the API client
  // No additional action needed
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
  navigator.serviceWorker.register('./service-worker.js').then(registration => {
    // Check for updates every 30 seconds
    setInterval(() => {
      registration.update();
    }, 30000);

    // Listen for waiting service worker
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New SW is available, prompt user or auto-update
          if (confirm('New version available. Update now?')) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        }
      });
    });
  });
}
  }

  // Modal System
    // =============================================================================
// FIX 2: ENHANCED MODAL SYSTEM WITH PROPER PARENT-CHILD STACKING
// =============================================================================

// Enhanced showModal method with proper parent-child relationships
showModal(content, options = {}) {
  if (!this.modalContainer) {
    this.createModalContainer();
  }

  const modalId = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Calculate z-index based on parent relationship
  let zIndex = this.baseZIndex;
  let parentModal = null;
  
  if (options.parent) {
    parentModal = this.modalStack.find(m => m.id === options.parent);
    if (parentModal) {
      const parentIndex = this.modalStack.indexOf(parentModal);
      zIndex = this.baseZIndex + (parentIndex + 1) * 10;
    }
  } else {
    zIndex = this.baseZIndex + this.modalStack.length * 10;
  }
  
  const modal = document.createElement('div');
  modal.className = `modal-overlay ${options.className || ''}`;
  modal.id = modalId;
  modal.dataset.modalType = options.type || 'default';
  modal.style.zIndex = zIndex;
  
  // Special handling for full-screen modals like notifications
  if (options.type === 'notifications-facebook') {
    modal.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      z-index: ${zIndex} !important;
      background: transparent !important;
      pointer-events: auto !important;
    `;
    modal.innerHTML = content;
  } else {
    // Standard modal styling with backdrop opacity based on stack depth
    const overlayOpacity = parentModal ? 0.2 : Math.max(0.1, 0.5 - (this.modalStack.length * 0.1));
    
    modal.innerHTML = `
      <div class="modal-backdrop" style="
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,${overlayOpacity});
        z-index: ${zIndex};
      "></div>
      <div class="modal-content" style="
        position: relative;
        margin: 20px auto;
        background: var(--card, white);
        border-radius: 12px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        max-height: calc(100vh - 40px);
        max-width: 600px;
        overflow-y: auto;
        transform: translateY(20px);
        transition: transform 0.2s ease;
        z-index: ${zIndex + 1};
      ">
        ${!options.hideClose ? '<button class="modal-close" style="position: absolute; top: 15px; right: 20px; background: none; border: none; font-size: 24px; cursor: pointer; color: #666; z-index: 10;">&times;</button>' : ''}
        <div class="modal-body" style="padding: 20px;">
          ${content}
        </div>
      </div>
    `;
  }

  this.modalContainer.appendChild(modal);
  
  // Add to modal stack with parent relationship
  const modalInfo = { 
    id: modalId, 
    element: modal, 
    options, 
    parent: options.parent,
    children: []
  };
  
  // Link parent-child relationships
  if (parentModal) {
    parentModal.children.push(modalId);
    modalInfo.parentIndex = this.modalStack.indexOf(parentModal);
  }
  
  this.modalStack.push(modalInfo);

  // Prevent body scroll only for root modals
  if (!options.parent && this.modalStack.filter(m => !m.parent).length === 1) {
    document.body.style.overflow = 'hidden';
  }

  this.bindModalEvents(modal, modalId, options);

  // Animate in
  requestAnimationFrame(() => {
    if (options.type === 'notifications-facebook') {
      const notificationPanel = modal.querySelector('.notifications-panel');
      if (notificationPanel) {
        notificationPanel.style.transform = 'translateX(0)';
      }
    } else {
      modal.style.opacity = '1';
      const content = modal.querySelector('.modal-content');
      if (content) {
        content.style.transform = 'translateY(0)';
      }
    }
  });

  return modalId;
}

// Enhanced closeModalById with proper parent-child cleanup
closeModalById(modalId) {
  const modalIndex = this.modalStack.findIndex(m => m.id === modalId);
  if (modalIndex === -1) return;

  const modal = this.modalStack[modalIndex];
  
  // Close all child modals first (recursive)
  if (modal.children && modal.children.length > 0) {
    [...modal.children].forEach(childId => {
      this.closeModalById(childId);
    });
  }
  
  // Remove from parent's children array
  if (modal.parent) {
    const parentModal = this.modalStack.find(m => m.id === modal.parent);
    if (parentModal && parentModal.children) {
      const childIndex = parentModal.children.indexOf(modalId);
      if (childIndex > -1) {
        parentModal.children.splice(childIndex, 1);
      }
    }
  }
  
  // Remove event listeners
  if (modal.element._keydownHandler) {
    document.removeEventListener('keydown', modal.element._keydownHandler);
  }

  // Animation out
  modal.element.classList.remove('modal-active');
  modal.element.classList.add('modal-closing');

  setTimeout(() => {
    if (modal.element.parentNode) {
      modal.element.remove();
    }
    
    this.modalStack.splice(modalIndex, 1);

    // Restore body scroll only when no root modals remain
    const rootModals = this.modalStack.filter(m => !m.parent);
    if (rootModals.length === 0) {
      document.body.style.overflow = '';
    }
  }, 200);
}

// Helper method to remove individual modal
removeModalFromStack(modalId) {
  const modalIndex = this.modalStack.findIndex(m => m.id === modalId);
  if (modalIndex === -1) return;

  const modal = this.modalStack[modalIndex];
  
  if (modal.element._keydownHandler) {
    document.removeEventListener('keydown', modal.element._keydownHandler);
  }

  modal.element.classList.remove('modal-active');
  modal.element.classList.add('modal-closing');

  setTimeout(() => {
    if (modal.element.parentNode) {
      modal.element.remove();
    }
    
    this.modalStack.splice(modalIndex, 1);

    if (this.modalStack.length === 0) {
      document.body.style.overflow = '';
    }
  }, 200);
}

// Enhanced bindModalEvents to handle close button properly
bindModalEvents(modal, modalId, options) {
  const closeModal = (e) => {
    if (options.preventClose) return;
    
    if (e.target.classList.contains('modal-close') || 
        (e.target.classList.contains('modal-backdrop') && !options.preventBackdropClose)) {
      e.preventDefault();
      e.stopPropagation();
      this.closeModalById(modalId);
    }
  };

  modal.addEventListener('click', closeModal);

  const handleKeydown = (e) => {
    if (e.key === 'Escape' && this.getTopModalId() === modalId) {
      this.closeModalById(modalId);
    }
  };

  document.addEventListener('keydown', handleKeydown);
  modal._keydownHandler = handleKeydown;

  if (options.callback) {
    setTimeout(() => options.callback(modal), 50);
  }
} 

getOverlayClass(type) {
  const overlayTypes = {
    'notification-detail': 'overlay-light',
    'profile-section': 'overlay-light', 
    'booking-detail': 'overlay-medium',
    'form': 'overlay-dark',
    'default': 'overlay-medium'
  };
  return overlayTypes[type] || overlayTypes.default;
}

bindModalEvents(modal, modalId, options) {
  const closeModal = (e) => {
    if (options.preventClose) return;
    
    if (e.target.classList.contains('modal-close') || 
        (e.target.classList.contains('modal-backdrop') && !options.preventBackdropClose)) {
      this.closeModalById(modalId);
    }
  };

  modal.addEventListener('click', closeModal);

  // Keyboard handling
  const handleKeydown = (e) => {
    if (e.key === 'Escape' && this.getTopModalId() === modalId) {
      this.closeModalById(modalId);
    }
  };

  document.addEventListener('keydown', handleKeydown);
  modal._keydownHandler = handleKeydown;

  // Execute callback after modal is ready
  if (options.callback) {
    setTimeout(() => options.callback(modal), 50);
  }
}

// HideModal method
hideModal() {
  if (this.modalStack.length > 0) {
    const topModal = this.modalStack[this.modalStack.length - 1];
    this.closeModalById(topModal.id);
  }
}

closeModalById(modalId) {
  const modalIndex = this.modalStack.findIndex(m => m.id === modalId);
  if (modalIndex === -1) return;

  const modal = this.modalStack[modalIndex];
  
  // Remove event listeners
  if (modal.element._keydownHandler) {
    document.removeEventListener('keydown', modal.element._keydownHandler);
  }

  // Animation out
  modal.element.classList.remove('modal-active');
  modal.element.classList.add('modal-closing');

  setTimeout(() => {
    if (modal.element.parentNode) {
      modal.element.remove();
    }
    
    // Remove from stack
    this.modalStack.splice(modalIndex, 1);

    // Restore body scroll only when no modals remain
    if (this.modalStack.length === 0) {
      document.body.style.overflow = '';
    }
  }, 200);
}

closeAllModals() {
  while (this.modalStack.length > 0) {
    const topModal = this.modalStack[this.modalStack.length - 1];
    this.closeModalById(topModal.id);
  }
}

getTopModalId() {
  return this.modalStack.length > 0 ? this.modalStack[this.modalStack.length - 1].id : null;
}

getCurrentModalParent() {
  const topModal = this.modalStack[this.modalStack.length - 1];
  return topModal ? topModal.parent : null;
}

isModalOpen(type) {
  return this.modalStack.some(modal => modal.options.type === type);
}

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

  // Remove existing event listeners by cloning and replacing
  const newResultsList = resultsList.cloneNode(true);
  resultsList.parentNode.replaceChild(newResultsList, resultsList);

  // Use event delegation on the parent container
  newResultsList.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const card = e.target.closest('.artisan-card');
    if (!card) return;

    const artisanId = card.dataset.id;
    const actionElement = e.target.closest('[data-action]');
    
    if (actionElement) {
      const action = actionElement.dataset.action;
      console.log('Action clicked:', action, 'for artisan:', artisanId);
      
      switch (action) {
        case 'book':
          if (!this.state.user) {
            this.openLoginModal();
            return;
          }
          this.openBookingForm(artisanId);
          break;
        case 'favorite':
          if (!this.state.user) {
            this.openLoginModal();
            return;
          }
          this.toggleFavorite(artisanId);
          // Update UI immediately
          actionElement.classList.toggle('active');
          break;
        case 'whatsapp':
          this.openWhatsApp(artisanId);
          break;
      }
    } else {
      // Click on card itself - open profile
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

// closeNotificationsPage
closeNotificationsPage() {
  const notifPage = this.$('#notifications-page');
  if (!notifPage) return;
  
  notifPage.classList.remove('active');
  setTimeout(() => {
    notifPage.classList.add('hidden');
  }, 300);
}

 
// Update openLoginModal():
/**async openLoginModal() {
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
**/

// LoadNotificationsPage
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

    // Update state
    this.setState({ 
      notifications,
      notificationCount: notifications.filter(n => !n.read).length
    });

    // Update UI
    if (markAllBtn) {
      markAllBtn.style.display = hasUnread ? 'block' : 'none';
      markAllBtn.onclick = () => this.markAllNotificationsRead();
    }

    if (notifications.length === 0) {
      container.innerHTML = '<p class="muted">No notifications yet</p>';
    } else {
      container.innerHTML = notifications.map(notification => {
        // Safe date handling
        let displayDate = 'Unknown date';
        if (notification.created) {
          const date = new Date(notification.created);
          if (!isNaN(date.getTime())) {
            displayDate = date.toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit', 
              minute: '2-digit'
            });
          }
        }
        
        return `
          <div class="notification-item ${notification.read ? 'read' : 'unread'}" data-id="${notification.id}">
            <div class="notification-icon">
              <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
              <h4>${this.escapeHtml(notification.title)}</h4>
              <p>${this.escapeHtml(notification.message)}</p>
              <span class="notification-time">${displayDate}</span>
            </div>
          </div>
        `;
      }).join('');
      
      // Bind click events for individual notifications
      container.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', async () => {
          const notificationId = item.dataset.id;
          await this.handleNotificationClick(notificationId);
          
          // Update visual state of clicked item
          if (item.classList.contains('unread')) {
            item.classList.remove('unread');
            item.classList.add('read');
          }
        });
      });
    }
  } catch (error) {
    console.error('Failed to load notifications:', error);
    container.innerHTML = '<p class="muted">Failed to load notifications</p>';
  }
}

// LoadProfilePage 
    /**
 * Loads and renders the user profile page with comprehensive error handling,
 * authentication validation, and optimized UI state management.
 * 
 * @async
 * @returns {Promise<void>}
 * @throws {Error} When critical profile loading operations fail
 */
async loadProfilePage() {
  const profileContainer = this.$('.profile-container');
  
  // Critical DOM validation
  if (!profileContainer) {
    console.error('Profile container element not found in DOM');
    this.showToast('Profile interface unavailable', 'error');
    return;
  }

  // Authentication gate with redirect handling
  if (!API.isAuthenticated() || !this.state.user) {
    const returnUrl = encodeURIComponent(window.location.href);
    const redirectUrl = `auth.html?return=${returnUrl}`;
    
    console.warn('Unauthenticated profile access attempt, redirecting to auth');
    window.location.href = redirectUrl;
    return;
  }

  try {
    // Show loading state immediately
    profileContainer.innerHTML = this.renderLoadingState();
    
    const currentUser = this.state.user;
    const userId = currentUser.id || currentUser._id;
    
    if (!userId) {
      throw new Error('Invalid user session: missing user identifier');
    }

    // Parallel data fetching with comprehensive error handling
    const profileDataPromises = [
      this.fetchUserBookings().catch(error => {
        console.warn('Booking data fetch failed:', error);
        return { bookings: [], error: 'bookings' };
      }),
      this.fetchUserFavorites().catch(error => {
        console.warn('Favorites data fetch failed:', error);
        return { favorites: [], error: 'favorites' };
      }),
      this.validateUserSession().catch(error => {
        console.warn('Session validation failed:', error);
        return { valid: false };
      })
    ];

    const [bookingResult, favoritesResult, sessionResult] = await Promise.allSettled(profileDataPromises);

    // Process results with fallbacks
    const bookings = this.extractPromiseResult(bookingResult, []);
    const favorites = this.extractPromiseResult(favoritesResult, []);
    const isSessionValid = this.extractPromiseResult(sessionResult, { valid: true }).valid;

    if (!isSessionValid) {
      throw new Error('Session validation failed');
    }

    // Calculate statistics
    const statistics = this.calculateUserStatistics(bookings, favorites, currentUser.role);
    
    // Generate avatar URL with fallback chain
    const avatarUrl = this.resolveAvatarUrl(currentUser);

    // Render profile interface
    profileContainer.innerHTML = this.generateProfileMarkup(currentUser, statistics, avatarUrl);

    // Bind event handlers with error boundaries
    this.bindProfileEventHandlers(profileContainer, currentUser);

    console.info('Profile page loaded successfully for user:', userId);

  } catch (error) {
    console.error('Profile loading failed:', error);
    this.handleProfileLoadError(error, profileContainer);
  }
}

/**
 * Renders loading state UI
 * @private
 * @returns {string} Loading HTML markup
 */
renderLoadingState() {
  return `
    <div class="profile-loading-container">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
      </div>
      <p class="loading-text">Loading profile...</p>
    </div>
  `;
}

/**
 * Fetches user bookings with error handling
 * @private
 * @returns {Promise<Array>}
 */
async fetchUserBookings() {
  try {
    const bookings = await API.getUserBookings();
    return Array.isArray(bookings) ? bookings : [];
  } catch (error) {
    console.error('Booking fetch error:', error);
    throw new Error(`Booking data unavailable: ${error.message}`);
  }
}

/**
 * Fetches user favorites with error handling
 * @private
 * @returns {Promise<Array>}
 */
async fetchUserFavorites() {
  try {
    const favorites = await API.getUserFavorites();
    return Array.isArray(favorites) ? favorites : [];
  } catch (error) {
    console.error('Favorites fetch error:', error);
    throw new Error(`Favorites data unavailable: ${error.message}`);
  }
}

/**
 * Validates current user session
 * @private
 * @returns {Promise<Object>}
 */
async validateUserSession() {
  try {
    const user = await API.getCurrentUser();
    return { valid: !!user, user };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Extracts result from Promise.allSettled with fallback
 * @private
 * @param {Object} settledResult - Promise settlement result
 * @param {any} fallback - Fallback value
 * @returns {any}
 */
extractPromiseResult(settledResult, fallback) {
  if (settledResult.status === 'fulfilled') {
    return settledResult.value;
  }
  console.warn('Promise rejected:', settledResult.reason);
  return fallback;
}

/**
 * Calculates user statistics from available data
 * @private
 * @param {Array} bookings - User bookings
 * @param {Array} favorites - User favorites
 * @param {string} userRole - User role ('client' or 'artisan')
 * @returns {Object}
 */
calculateUserStatistics(bookings, favorites, userRole) {
  const totalBookings = bookings.length;
  const completedJobs = bookings.filter(booking => 
    booking.status === 'completed'
  ).length;
  const favoritesCount = favorites.length;
  
  // Role-specific metrics
  const pendingActions = bookings.filter(booking => {
    if (userRole === 'artisan') {
      return booking.status === 'pending';
    }
    return booking.status === 'pending_confirmation';
  }).length;

  return {
    totalBookings,
    completedJobs,
    favoritesCount,
    pendingActions,
    completionRate: totalBookings > 0 ? Math.round((completedJobs / totalBookings) * 100) : 0
  };
}

/**
 * Resolves avatar URL with comprehensive fallback chain
 * @private
 * @param {Object} user - User object
 * @returns {string}
 */
resolveAvatarUrl(user) {
  // Priority chain: avatar -> photo -> placeholder
  if (user.avatar) {
    return user.avatar.startsWith('http') ? user.avatar : `${API_URL}/uploads/${user.avatar}`;
  }
  
  if (user.photo) {
    return user.photo.startsWith('http') ? user.photo : `${API_URL}/uploads/${user.photo}`;
  }

  return '../assets/avatar-placeholder.png';
}

/**
 * Generates complete profile page markup
 * @private
 * @param {Object} user - User data
 * @param {Object} stats - Calculated statistics
 * @param {string} avatarUrl - Avatar URL
 * @returns {string}
 */
generateProfileMarkup(user, stats, avatarUrl) {
  const roleDisplayName = user.role === 'artisan' ? 'Artisan' : 'Client';
  const alternateRole = user.role === 'artisan' ? 'Client' : 'Artisan';
  
  return `
    <div class="profile-header" role="banner">
      <div class="profile-avatar-container">
        <img 
          src="${avatarUrl}" 
          alt="Profile avatar for ${this.escapeHtml(user.name || 'User')}" 
          class="profile-avatar-large"
          onerror="this.src='../assets/avatar-placeholder.png'"
          loading="lazy"
        >
        ${user.premium ? '<div class="premium-indicator"><i class="fas fa-crown"></i></div>' : ''}
      </div>
      
      <div class="profile-identity">
        <h3 class="profile-name">
          ${this.escapeHtml(user.name || 'User')}
          ${this.renderVerificationBadge?.(user) ?? ''}
        </h3>
        <p class="profile-role" role="status">${roleDisplayName}</p>
        ${user.location ? `<p class="profile-location"><i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(user.location)}</p>` : ''}
      </div>
      
      <div class="profile-stats" role="region" aria-label="Profile Statistics">
        <div class="stat-item">
          <span class="stat-number" aria-label="Total bookings">${stats.totalBookings}</span>
          <span class="stat-label">${user.role === 'artisan' ? 'Jobs' : 'Bookings'}</span>
        </div>
        <div class="stat-item">
          <span class="stat-number" aria-label="Completed jobs">${stats.completedJobs}</span>
          <span class="stat-label">Completed</span>
        </div>
        <div class="stat-item">
          <span class="stat-number" aria-label="Favorites count">${stats.favoritesCount}</span>
          <span class="stat-label">Favorites</span>
        </div>
        ${stats.pendingActions > 0 ? `
          <div class="stat-item urgent">
            <span class="stat-number" aria-label="Pending actions">${stats.pendingActions}</span>
            <span class="stat-label">Pending</span>
          </div>
        ` : ''}
      </div>
    </div>

    <nav class="profile-menu" role="navigation" aria-label="Profile Menu">
      ${this.generateRoleSwitchItem(user.role, alternateRole)}
      ${this.generateMenuItems(user.role)}
    </nav>
  `;
}

/**
 * Generates role switch menu item
 * @private
 * @param {string} currentRole - Current user role
 * @param {string} alternateRole - Alternate role name
 * @returns {string}
 */
generateRoleSwitchItem(currentRole, alternateRole) {
  return `
    <div class="menu-item interactive" id="role-switch-item" role="button" tabindex="0" aria-label="Switch user role">
      <div class="menu-icon">
        <i class="fas fa-sync-alt" aria-hidden="true"></i>
      </div>
      <div class="menu-text">
        <span id="role-switch-label">Switch to ${alternateRole}</span>
      </div>
      <div class="menu-action">
        <label class="toggle-switch" aria-label="Role toggle switch">
          <input 
            type="checkbox" 
            id="profile-role-switch" 
            ${currentRole === 'artisan' ? 'checked' : ''}
            aria-describedby="role-switch-label"
          >
          <span class="slider" aria-hidden="true"></span>
        </label>
      </div>
    </div>
  `;
}

/**
 * Generates menu items based on user role
 * @private
 * @param {string} userRole - User role
 * @returns {string}
 */
generateMenuItems(userRole) {
  const commonItems = [
    { id: 'profile-bookings', icon: 'fa-calendar', text: 'My Bookings', action: 'bookings' },
    { id: 'profile-favorites', icon: 'fa-heart', text: 'Favorites', action: 'favorites' },
    { id: 'profile-settings', icon: 'fa-cog', text: 'Settings', action: 'settings' },
    { id: 'profile-upgrade', icon: 'fa-star', text: 'Upgrade to Premium', action: 'upgrade' },
    { id: 'profile-theme', icon: 'fa-palette', text: 'Toggle Theme', action: 'theme' }
  ];

  const artisanItems = [
    { id: 'profile-clients', icon: 'fa-users', text: 'My Clients', action: 'clients' }
  ];

  const logoutItem = { id: 'profile-logout', icon: 'fa-sign-out-alt', text: 'Logout', action: 'logout', danger: true };

  let menuItems = [...commonItems];
  if (userRole === 'artisan') {
    menuItems.splice(1, 0, ...artisanItems); // Insert after "My Bookings"
  }
  menuItems.push(logoutItem);

  return menuItems.map(item => `
    <div class="menu-item ${item.danger ? 'danger' : 'interactive'}" id="${item.id}" role="button" tabindex="0">
      <div class="menu-icon">
        <i class="fas ${item.icon}" aria-hidden="true"></i>
      </div>
      <div class="menu-text">${item.text}</div>
    </div>
  `).join('');
}

/**
 * Binds event handlers to profile elements with error boundaries
 * @private
 * @param {HTMLElement} container - Profile container element
 * @param {Object} user - Current user object
 */
bindProfileEventHandlers(container, user) {
  try {
    // Role switch handlers
    this.bindRoleSwitchHandlers(container, user);
    
    // Menu action handlers
    this.bindMenuActionHandlers(container);
    
    // Keyboard accessibility
    this.bindKeyboardHandlers(container);

  } catch (error) {
    console.error('Event binding failed:', error);
    this.showToast('Some profile features may not work correctly', 'warning');
  }
}

/**
 * Binds role switch event handlers
 * @private
 * @param {HTMLElement} container - Profile container
 * @param {Object} user - Current user
 */
bindRoleSwitchHandlers(container, user) {
  const roleSwitch = container.querySelector('#profile-role-switch');
  const roleSwitchItem = container.querySelector('#role-switch-item');

  if (roleSwitch) {
    roleSwitch.addEventListener('change', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      try {
        await this.handleRoleSwitch(event);
      } catch (error) {
        console.error('Role switch failed:', error);
        this.showToast('Role switch failed', 'error');
      }
    });
  }

  // Make entire row clickable for better UX
  if (roleSwitchItem) {
    roleSwitchItem.addEventListener('click', (event) => {
      if (event.target.type === 'checkbox') return;
      
      event.preventDefault();
      const checkbox = roleSwitchItem.querySelector('input[type="checkbox"]');
      if (checkbox && !checkbox.disabled) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }
}

/**
 * Binds menu action event handlers
 * @private
 * @param {HTMLElement} container - Profile container
 */
bindMenuActionHandlers(container) {
  const menuActions = {
    'profile-bookings': () => this.navigateToSection('bookings'),
    'profile-clients': () => this.navigateToSection('clients'),
    'profile-favorites': () => this.navigateToSection('favorites'),
    'profile-settings': () => this.navigateToSection('settings'),
    'profile-upgrade': () => this.navigateToSection('upgrade'),
    'profile-theme': () => this.handleThemeToggle(),
    'profile-logout': () => this.handleLogoutConfirmation()
  };

  Object.entries(menuActions).forEach(([elementId, handler]) => {
    const element = container.querySelector(`#${elementId}`);
    if (element) {
      element.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        try {
          handler();
        } catch (error) {
          console.error(`Menu action failed for ${elementId}:`, error);
          this.showToast('Action failed', 'error');
        }
      });
    }
  });
}

/**
 * Binds keyboard accessibility handlers
 * @private
 * @param {HTMLElement} container - Profile container
 */
bindKeyboardHandlers(container) {
  container.addEventListener('keydown', (event) => {
    const target = event.target;
    
    if (target.getAttribute('role') === 'button' && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      target.click();
    }
  });
}

/**
 * Handles navigation to different profile sections
 * @private
 * @param {string} section - Section identifier
 */
/**navigateToSection(section) {
  this.closeProfilePage();
  
  const sectionHandlers = {
    'bookings': () => setTimeout(() => this.openMyBookings(), 150),
    'clients': () => setTimeout(() => this.openMyClients(), 150),
    'favorites': () => setTimeout(() => this.openFavorites(), 150),
    'settings': () => setTimeout(() => this.openSettings(), 150),
    'upgrade': () => setTimeout(() => this.openPremiumUpgrade(), 150)
  };

  const handler = sectionHandlers[section];
  if (handler) {
    handler();
  } else {
    console.warn(`Unknown section: ${section}`);
  }
} **/


//  NAVIGATION WITH MODAL STACKING
navigateToSection(section) {
  const currentModalId = this.getTopModalId();
  
  const sectionHandlers = {
    'bookings': () => this.openMyBookings({ parent: currentModalId }),
    'clients': () => this.openMyClients({ parent: currentModalId }),
    'favorites': () => this.openFavorites({ parent: currentModalId }),
    'settings': () => this.openSettings({ parent: currentModalId }),
    'upgrade': () => this.openPremiumUpgrade({ parent: currentModalId })
  };

  const handler = sectionHandlers[section];
  if (handler) {
    handler();
  } else {
    console.warn(`Unknown section: ${section}`);
  }
}

/**
 * Handles theme toggle action
 * @private
 */
handleThemeToggle() {
  try {
    this.toggleTheme?.();
    this.showToast('Theme updated', 'success');
  } catch (error) {
    console.error('Theme toggle failed:', error);
    this.showToast('Theme change failed', 'error');
  }
}

/**
 * Handles logout with confirmation
 * @private
 */
handleLogoutConfirmation() {
  const confirmLogout = confirm('Are you sure you want to logout?');
  if (confirmLogout) {
    try {
      this.logout?.();
      this.closeProfilePage();
    } catch (error) {
      console.error('Logout failed:', error);
      this.showToast('Logout failed', 'error');
    }
  }
}

/**
 * Handles profile loading errors
 * @private
 * @param {Error} error - The error that occurred
 * @param {HTMLElement} container - Profile container element
 */
handleProfileLoadError(error, container) {
  const errorMessage = error.message || 'Unknown error occurred';
  
  container.innerHTML = `
    <div class="profile-error-container">
      <div class="error-icon">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <h3>Profile Loading Failed</h3>
      <p class="error-message">${this.escapeHtml(errorMessage)}</p>
      <div class="error-actions">
        <button id="retry-profile-load" class="btn-primary">
          <i class="fas fa-redo"></i> Retry
        </button>
        <button id="return-home" class="btn-secondary">
          <i class="fas fa-home"></i> Return Home
        </button>
      </div>
    </div>
  `;

  // Bind error action handlers
  container.querySelector('#retry-profile-load')?.addEventListener('click', () => {
    this.loadProfilePage();
  });

  container.querySelector('#return-home')?.addEventListener('click', () => {
    this.closeProfilePage();
  });

  this.showToast('Profile loading failed', 'error');
}

/** async loadProfilePage() {
  const container = this.$('.profile-container');
  if (!container) {
    console.error('Profile container not found');
    return;
  }

 if (!API.isAuthenticated() || !this.state.user) {
    // Redirect to login page with return URL
    const currentUrl = window.location.href;
    window.location.href = `auth.html?return=${encodeURIComponent(currentUrl)}`;
    return;
  }

   // Use current user from state
  const user = this.state.user;

  // Preload stats (safe fallbacks)
  let totalBookings = 0, completedJobs = 0, favoritesCount = 0;
  try {
    const [bookings, favorites] = await Promise.allSettled([
      API.getUserBookings(),
      API.getUserFavorites(),
    ]).then(results => results.map(r => (r.status === 'fulfilled' ? r.value : [])));

    totalBookings = bookings.length;
    completedJobs = bookings.filter(b => b.status === 'completed').length;
    favoritesCount = favorites.length;
  } catch (e) {
    console.warn('Profile stats load warning:', e);
  }

  // Get avatar URL using API helper
  const avatarUrl = user?.avatar || '../assets/avatar-placeholder.png';
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
        <div class="stat-item">
          <span class="stat-number">${totalBookings}</span>
          <span class="stat-label">${user.role === 'artisan' ? 'Jobs' : 'Bookings'}</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${completedJobs}</span>
          <span class="stat-label">Completed</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${favoritesCount}</span>
          <span class="stat-label">Favorites</span>
        </div>
      </div>
    </div>

    <div class="profile-menu">
  <div class="menu-item" id="role-switch-item">
    <div class="menu-icon"><i class="fas fa-sync-alt"></i></div>
    <div class="menu-text">
      <span id="role-switch-label">Switch to 
        ${user.role === 'artisan' ? 'Client' : 'Artisan'}
      </span>
    </div>
    <div class="menu-action">
      <label class="toggle-switch">
        <input type="checkbox" id="profile-role-switch" ${user.role === 'artisan' ? 'checked' : ''}>
        <span class="slider"></span>
      </label>
    </div>
  </div>

  <div class="menu-item" id="profile-bookings">
    <div class="menu-icon"><i class="fas fa-calendar"></i></div>
    <div class="menu-text">My Bookings</div>
  </div>

  <div class="menu-item" id="profile-favorites">
    <div class="menu-icon"><i class="fas fa-heart"></i></div>
    <div class="menu-text">Favorites</div>
  </div>

  ${user.role === 'artisan' ? `
    <div class="menu-item" id="profile-clients">
      <div class="menu-icon"><i class="fas fa-users"></i></div>
      <div class="menu-text">My Clients</div>
    </div>
  ` : ''}

  <div class="menu-item" id="profile-settings">
    <div class="menu-icon"><i class="fas fa-cog"></i></div>
    <div class="menu-text">Settings</div>
  </div>

  <div class="menu-item" id="profile-upgrade">
    <div class="menu-icon"><i class="fas fa-star"></i></div>
    <div class="menu-text">Upgrade to Premium</div>
  </div>

  <div class="menu-item" id="profile-theme">
    <div class="menu-icon"><i class="fas fa-palette"></i></div>
    <div class="menu-text">Toggle Theme</div>
  </div>

  <div class="menu-item danger" id="profile-logout">
    <div class="menu-icon"><i class="fas fa-sign-out-alt"></i></div>
    <div class="menu-text">Logout</div>
  </div>
</div>
  `;

  // Attach listeners AFTER markup is in the DOM
  const roleSwitch = container.querySelector('#profile-role-switch');
  const roleItem = container.querySelector('#role-switch-item');
  const roleLabel = container.querySelector('#role-switch-label');
  const roleTextEl = container.querySelector('.profile-role');

  const setRoleUI = (role) => {
    if (roleTextEl) roleTextEl.textContent = role === 'artisan' ? 'Artisan' : 'Client';
    if (roleLabel) roleLabel.textContent = `Switch to ${role === 'artisan' ? 'Client' : 'Artisan'}`;
    if (roleSwitch) roleSwitch.checked = (role === 'artisan');
  };

  if (roleSwitch) {
  roleSwitch.addEventListener('change', (e) => {
    e.preventDefault();
    this.handleRoleSwitch(e);
  });
}

// Make whole role switch row clickable
if (roleItem) {
  roleItem.addEventListener('click', (e) => {
    // Don't trigger if clicking directly on checkbox
    if (e.target.type === 'checkbox') return;
    
    e.preventDefault();
    const checkbox = roleItem.querySelector('input[type="checkbox"]');
    if (checkbox && !checkbox.disabled) {
      checkbox.checked = !checkbox.checked;
      // Trigger the change event
      const changeEvent = new Event('change', { bubbles: true });
      checkbox.dispatchEvent(changeEvent);
    }
  });
} 

  // Other menu button event listeners
  container.querySelector('#profile-bookings')?.addEventListener('click', () => this.openMyBookings?.());
  container.querySelector('#profile-favorites')?.addEventListener('click', () => this.openFavorites?.());
  container.querySelector('#profile-clients')?.addEventListener('click', () => this.openMyClients?.());
  container.querySelector('#profile-settings')?.addEventListener('click', () => this.openSettings?.());
  container.querySelector('#profile-upgrade')?.addEventListener('click', () => this.openPremiumUpgrade?.());
  container.querySelector('#profile-theme')?.addEventListener('click', () => this.toggleTheme?.());
  container.querySelector('#profile-logout')?.addEventListener('click', () => this.logout?.());
} **/
    
// Add these methods to handle the profile authentication
async handleProfileLogin() {
  const email = document.querySelector('#profile-email')?.value;
  const password = document.querySelector('#profile-password')?.value;

  // Clear previous errors
  this.clearProfileAuthErrors();

  if (!email || !password) {
    this.showProfileAuthError('Please fill in all fields');
    return;
  }

  const loginBtn = document.querySelector('#profile-login-btn');
  try {
    // Show loading state
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    }

    const user = await API.loginUser(email, password);
    
    // Update app state
    this.setState({ user });
    this.showToast('Login successful!', 'success');
    
    // Reload profile page with user data
    this.loadProfilePage();
    
  } catch (error) {
    console.error('Profile login failed:', error);
    this.showProfileAuthError('Invalid email or password. Please try again.');
  } finally {
    // Reset button
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    }
  }
}

async handleProfileSignup() {
  const name = document.querySelector('#profile-signup-name')?.value;
  const email = document.querySelector('#profile-signup-email')?.value;
  const password = document.querySelector('#profile-signup-password')?.value;
  const location = document.querySelector('#profile-signup-location')?.value;
  const role = document.querySelector('#profile-signup-role')?.value;

  // Clear previous errors
  this.clearProfileAuthErrors();

  if (!name || !email || !password || !location) {
    this.showProfileAuthError('Please fill in all fields');
    return;
  }

  const signupBtn = document.querySelector('#profile-signup-btn');
  try {
    // Show loading state
    if (signupBtn) {
      signupBtn.disabled = true;
      signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    }

    const user = await API.registerUser({ name, email, password, location, role });
    
    // Update app state
    this.setState({ user });
    this.showToast('Account created successfully!', 'success');
    
    // Reload profile page with user data
    this.loadProfilePage();
    
  } catch (error) {
    console.error('Profile signup failed:', error);
    this.showProfileAuthError('Failed to create account. Please try again.');
  } finally {
    // Reset button
    if (signupBtn) {
      signupBtn.disabled = false;
      signupBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    }
  }
}

// Helper methods for profile auth form switching
showProfileSignupForm() {
  const loginForm = document.querySelector('#profile-login-form');
  const signupForm = document.querySelector('#profile-signup-form');
  const title = document.querySelector('#profile-auth-title');
  const subtitle = document.querySelector('#profile-auth-subtitle');
  
  if (loginForm) loginForm.classList.add('hidden');
  if (signupForm) signupForm.classList.remove('hidden');
  if (title) title.textContent = 'Create Account';
  if (subtitle) subtitle.textContent = 'Join Naco to get started';
  
  this.clearProfileAuthErrors();
}

showProfileLoginForm() {
  const loginForm = document.querySelector('#profile-login-form');
  const signupForm = document.querySelector('#profile-signup-form');
  const title = document.querySelector('#profile-auth-title');
  const subtitle = document.querySelector('#profile-auth-subtitle');
  
  if (signupForm) signupForm.classList.add('hidden');
  if (loginForm) loginForm.classList.remove('hidden');
  if (title) title.textContent = 'Welcome to Naco';
  if (subtitle) subtitle.textContent = 'Please log in to view your profile';
  
  this.clearProfileAuthErrors();
}

// Helper methods for error handling
showProfileAuthError(message) {
  // You can customize this to show errors in specific fields or a general error area
  this.showToast(message, 'error');
}

clearProfileAuthErrors() {
  // Clear any existing error messages
  document.querySelectorAll('.error-message').forEach(el => {
    el.classList.remove('show');
    el.textContent = '';
  });
}




  /**  async openFavorites() {
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
  }  **/

 /** openSettings() {
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
  } **/




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
  
    debugBookingDisplay() {
  console.log('=== BOOKING DISPLAY DEBUG ===');
  console.log('Current user:', this.state.user);
  
  API.getUserBookings().then(bookings => {
    console.log('All bookings:', bookings);
    
    const userId = this.state.user.id || this.state.user._id;
    console.log('Filtering for user ID:', userId);
    
    // Check My Bookings (where user is the booker)
    const myBookings = bookings.filter(booking => {
      const bookerId = booking.bookerUserId || booking.client;
      const bookerIdStr = bookerId ? (bookerId._id || bookerId).toString() : '';
      console.log('Booking:', booking._id, 'Booker:', bookerIdStr, 'Match:', bookerIdStr === userId.toString());
      return bookerIdStr === userId.toString();
    });
    console.log('My Bookings (as requester):', myBookings);
    
    // Check My Clients (where user is the booked artisan)  
    const myClients = bookings.filter(booking => {
      const artisanId = booking.bookedArtisanId || booking.artisan;
      const artisanIdStr = artisanId ? (artisanId._id || artisanId).toString() : '';
      console.log('Booking:', booking._id, 'Artisan:', artisanIdStr, 'Match:', artisanIdStr === userId.toString());
      return artisanIdStr === userId.toString();
    });
    console.log('My Clients (as provider):', myClients);
  });
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