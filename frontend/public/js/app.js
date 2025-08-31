// Naco - Modern Artisan Finder App
// Complete JavaScript implementation with React-like patterns
// FIXED VERSION - All critical issues resolved

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
      isLoading: false,
      error: null
    };

    this.debounceTimers = new Map();
    this.eventHandlers = new Map();
    this.cleanupTasks = [];
    this.isInitialized = false;
    
    this.init();
  }

  // Utility Methods
  $ = (selector) => document.querySelector(selector);
  $$ = (selector) => Array.from(document.querySelectorAll(selector));

  debounce(fn, delay = 300) {
    const key = fn.toString();
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }
    const timer = setTimeout(fn, delay);
    this.debounceTimers.set(key, timer);
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatCurrency(amount) {
    if (!amount || isNaN(amount)) return '₦0';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  }

  showToast(message, type = 'info') {
    // Remove existing toasts
    this.$$('.toast').forEach(toast => toast.remove());
    
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
      font-size: 14px;
    `;
    
    if (type === 'success') toast.style.borderLeftColor = 'var(--green)';
    if (type === 'error') toast.style.borderLeftColor = '#ef4444';
    if (type === 'info') toast.style.borderLeftColor = '#3b82f6';
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Enhanced State Management
  setState(updates) {
    const prevState = { ...this.state };
    Object.assign(this.state, updates);
    
    // Only re-render if we're initialized and state actually changed
    if (this.isInitialized && this.hasStateChanged(prevState, this.state)) {
      this.render();
    }
  }

  hasStateChanged(prevState, currentState) {
    const keysToWatch = ['user', 'filteredArtisans', 'featuredArtisans', 'notificationCount', 'isSearchActive'];
    return keysToWatch.some(key => prevState[key] !== currentState[key]);
  }

  // Safe DOM manipulation with error handling
  safeSetText(selector, text) {
    const element = this.$(selector);
    if (element) element.textContent = text || '';
  }

  safeSetValue(selector, value) {
    const element = this.$(selector);
    if (element) element.value = value || '';
  }

  safeSetAttribute(selector, attr, value) {
    const element = this.$(selector);
    if (element) element.setAttribute(attr, value);
  }

  // Initialization with comprehensive error handling
  async init() {
    try {
      this.setState({ isLoading: true, error: null });
      
      this.bindAllEventListeners();
      this.loadSession();
      this.loadTheme();
      this.loadFavorites();
      
      await this.loadArtisans();
      this.tryGetLocation();
      this.setupInstallPrompt();
      await this.registerServiceWorker();
      
      if (this.state.user) {
        await this.requestNotificationPermission();
        this.startNotificationPolling();
      }
      
      this.isInitialized = true;
      this.render();
      this.handleNotificationFromURL();
      
      this.setState({ isLoading: false });
      console.log('Naco app initialized successfully');
      
    } catch (error) {
      console.error('App initialization failed:', error);
      this.setState({ 
        isLoading: false, 
        error: 'Failed to initialize app. Please refresh the page.' 
      });
      this.showToast('Failed to initialize app', 'error');
    }
  }

  // Consolidated Event Binding System
  bindAllEventListeners() {
    this.removeExistingListeners();
    
    try {
      this.bindHeaderEvents();
      this.bindSearchEvents();
      this.bindNavigationEvents();
      this.bindModalEvents();
      this.bindGlobalEvents();
      this.bindDynamicEvents();
      
      console.log('All event listeners bound successfully');
    } catch (error) {
      console.error('Failed to bind event listeners:', error);
    }
  }

  removeExistingListeners() {
    // Clear stored handlers
    this.eventHandlers.forEach((handler, element) => {
      try {
        element.removeEventListener('click', handler);
      } catch (error) {
        console.warn('Failed to remove listener:', error);
      }
    });
    this.eventHandlers.clear();
  }

  bindHeaderEvents() {
    // Header navigation
    this.bindEvent('#search-input', 'click', () => this.openSearchPage());
    this.bindEvent('#notif-btn', 'click', () => this.openNotificationsPage());
    this.bindEvent('#profile-btn', 'click', () => this.openProfilePage());
    this.bindEvent('#menu-btn', 'click', () => this.toggleSideMenu());
  }

  bindSearchEvents() {
    // Search functionality
    this.bindEvent('#main-search-input', 'input', (e) => {
      this.debounce(() => this.handleMainSearch(e.target.value), 250);
    });
    this.bindEvent('#clear-search', 'click', () => this.clearMainSearch());
    this.bindEvent('#close-search', 'click', () => this.closeSearchPage());
    this.bindEvent('#city-select', 'change', (e) => this.handleCityFilter(e.target.value));
    this.bindEvent('#search-city-select', 'change', (e) => this.handleCityFilter(e.target.value));
  }

  bindNavigationEvents() {
    // Page navigation
    this.bindEvent('#close-notifications', 'click', () => this.closeNotificationsPage());
    this.bindEvent('#close-profile', 'click', () => this.closeProfilePage());
    this.bindEvent('#mark-all-read', 'click', () => this.markAllNotificationsRead());
    this.bindEvent('#fab-book', 'click', () => this.handleFabClick());
    this.bindEvent('#install-btn', 'click', () => this.installApp());
    this.bindEvent('#view-all-featured', 'click', () => this.viewAllFeatured());
  }

  bindModalEvents() {
    // Modal events
    const modal = this.$('#modal');
    if (modal) {
      const handler = (e) => {
        if (e.target === modal) this.hideModal();
      };
      modal.addEventListener('click', handler);
      this.eventHandlers.set(modal, handler);
    }
  }

  bindGlobalEvents() {
    // Global events
    const globalClickHandler = (e) => this.handleGlobalClick(e);
    const keydownHandler = (e) => this.handleKeyDown(e);
    const installPromptHandler = (e) => this.handleInstallPrompt(e);
    
    document.addEventListener('click', globalClickHandler);
    document.addEventListener('keydown', keydownHandler);
    window.addEventListener('beforeinstallprompt', installPromptHandler);
    
    // Store for cleanup
    this.cleanupTasks.push(() => {
      document.removeEventListener('click', globalClickHandler);
      document.removeEventListener('keydown', keydownHandler);
      window.removeEventListener('beforeinstallprompt', installPromptHandler);
    });
  }

  bindDynamicEvents() {
    // Event delegation for dynamic content
    const main = document.querySelector('main');
    if (!main) return;

    const mainClickHandler = (e) => {
      // Featured artisans
      const featCard = e.target.closest('#featured-list .feat-card');
      if (featCard) {
        e.preventDefault();
        e.stopPropagation();
        const artisanId = featCard.dataset.id;
        if (artisanId) this.openArtisanProfile(artisanId);
        return;
      }
      
      

      // Search results
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
          this.safeSetValue('#main-search-input', category);
          this.handleMainSearch(category);
        }
        return;
      }
    };

    main.addEventListener('click', mainClickHandler);
    this.eventHandlers.set(main, mainClickHandler);
  }

  bindEvent(selector, event, handler) {
    const element = this.$(selector);
    if (element) {
      element.addEventListener(event, handler);
      this.eventHandlers.set(element, handler);
    }
    
     // Modal delegation
  const modal = this.$('#modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      const target = e.target;
      
      if (target.id === 'book-artisan') {
        const artisanId = target.dataset.artisanId;
        console.log('Book from modal:', artisanId);
        if (!this.state.user) {
          this.hideModal();
          this.openLoginModal();
          return;
        }
        this.openBookingForm(artisanId);
      }

      if (target.id === 'save-artisan') {
        const artisanId = target.dataset.artisanId;
        console.log('Save from modal:', artisanId);
        if (!this.state.user) {
          this.hideModal();
          this.openLoginModal();
          return;
        }
        this.toggleFavorite(artisanId);
      }

      if (target.id === 'chat-artisan') {
        const artisanId = target.dataset.artisanId;
        console.log('Chat from modal:', artisanId);
        this.openWhatsApp(artisanId);
      }

      if (target.id === 'confirm-booking') {
        const artisanId = target.dataset.artisanId;
        console.log('Confirm booking:', artisanId);
        this.handleBookingConfirmationById(artisanId);
      }
    });
  }
  }

  // Enhanced Data Loading with Error Handling
  async loadArtisans() {
    try {
      const artisans = await this.withRetry(() => API.getArtisans());
      const cities = [...new Set(artisans.map(a => a.location).filter(Boolean))];
      
      this.setState({
        artisans,
        filteredArtisans: artisans,
        cities,
        featuredArtisans: artisans.filter(a => a.premium).slice(0, 8)
      });

      this.buildCitySelect();
      console.log(`Loaded ${artisans.length} artisans from ${cities.length} cities`);
      
    } catch (error) {
      console.error('Failed to load artisans:', error);
      this.setState({ error: 'Failed to load artisans' });
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

  // Enhanced Search Functions
  async handleMainSearch(query) {
    if (!query) {
      this.clearMainSearch();
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
        resultsList.innerHTML = results.map(artisan => this.renderSearchResultCard(artisan)).join('');
        this.bindSearchResultsEvents(resultsList);
      } else {
        resultsList.innerHTML = '<p class="muted">No artisans found for your search.</p>';
      }
    } catch (error) {
      console.error('Search failed:', error);
      resultsList.innerHTML = '<p class="muted">Error searching artisans. Please try again.</p>';
    }
  }

  bindSearchResultsEvents(container) {
    const handler = (e) => {
      const card = e.target.closest('.search-result-card');
      if (card) {
        e.preventDefault();
        e.stopPropagation();
        const artisanId = card.dataset.id;
        this.closeSearchPage();
        setTimeout(() => this.openArtisanProfile(artisanId), 350);
      }
    };
    
    container.addEventListener('click', handler);
    this.eventHandlers.set(container, handler);
  }

  async handleSearch(query) {
    this.setState({ searchQuery: query, isSearchActive: query.length > 0 });
    
    if (!query.trim()) {
      this.applyFilters();
      this.updateSearchUI();
      return;
    }

    try {
      const results = await this.withRetry(() => API.searchArtisans(query, this.state.selectedCity));
      this.setState({ filteredArtisans: results });
    } catch (error) {
      console.error('Search failed:', error);
      this.setState({ filteredArtisans: [] });
    }

    this.updateSearchUI();
  }

  clearMainSearch() {
    this.safeSetValue('#main-search-input', '');
    this.$('#clear-search')?.classList.add('hidden');
    this.$('#search-results-container')?.classList.add('hidden');
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

    // Sort: premium first, then by rating
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

  // Page Management
  openSearchPage() {
    const searchPage = this.$('#search-page');
    if (!searchPage) return;
    
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

  async openNotificationsPage() {
    const notifPage = this.$('#notifications-page');
    if (!notifPage) {
      this.openNotifications();
      return;
    }
    
    notifPage.classList.remove('hidden');
    setTimeout(() => notifPage.classList.add('active'), 10);
    
    await this.loadNotificationsPage();
  }

  closeNotificationsPage() {
    const notifPage = this.$('#notifications-page');
    if (!notifPage) return;
    
    notifPage.classList.remove('active');
    setTimeout(() => notifPage.classList.add('hidden'), 300);
  }

  async openProfilePage() {
    const profilePage = this.$('#profile-page');
    if (!profilePage) return;
    
    profilePage.classList.remove('hidden');
    setTimeout(() => profilePage.classList.add('active'), 10);
    
    await this.loadProfilePage();
  }

  closeProfilePage() {
    const profilePage = this.$('#profile-page');
    if (!profilePage) return;
    
    profilePage.classList.remove('active');
    setTimeout(() => profilePage.classList.add('hidden'), 300);
  }

  // Enhanced Authentication System
  async openLoginModal() {
    const html = `
      <div class="auth-modal">
        <h2>Welcome to Naco</h2>
        <p class="muted">Login or create an account to get started</p>
        
        <form id="auth-form" class="booking-form">
          <label>
            Email
            <input id="auth-email" type="email" required autocomplete="email" placeholder="your@email.com">
          </label>
          <label>
            Password
            <input id="auth-pass" type="password" required autocomplete="current-password" placeholder="Enter password">
          </label>
          <label>
            I am a
            <select id="auth-role" required>
              <option value="client">Client (Looking for services)</option>
              <option value="artisan">Artisan (Providing services)</option>
            </select>
          </label>
          
          <div style="display: flex; gap: 12px; margin-top: 20px;">
            <button type="submit" id="login-btn" class="btn-primary" style="flex: 1;">
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
      const form = this.$('#auth-form');
      const loginBtn = this.$('#login-btn');
      const signupBtn = this.$('#signup-btn');

      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleLogin();
        });
      }

      if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleLogin();
        });
      }

      if (signupBtn) {
        signupBtn.addEventListener('click', () => this.handleSignup());
      }

      // Focus first input
      this.$('#auth-email')?.focus();
    });
  }

  async handleLogin() {
    const email = this.$('#auth-email')?.value?.trim();
    const password = this.$('#auth-pass')?.value;

    if (!email || !password) {
      this.showToast('Please fill in all fields', 'error');
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showToast('Please enter a valid email address', 'error');
      return;
    }

    const loginBtn = this.$('#login-btn');
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    }

    try {
      const user = await this.withRetry(() => API.loginUser(email, password));
      this.setState({ user });
      this.saveSession();
      this.hideModal();
      this.showToast(`Welcome back, ${user.name}!`, 'success');
      
      setTimeout(async () => {
        await this.requestNotificationPermission();
        this.startNotificationPolling();
      }, 1000);
      
    } catch (error) {
      console.error('Login failed:', error);
      this.showToast('Login failed. Please check your credentials.', 'error');
    } finally {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
      }
    }
  }

  async handleSignup() {
    const email = this.$('#auth-email')?.value?.trim();
    const password = this.$('#auth-pass')?.value;
    const role = this.$('#auth-role')?.value;

    if (!email || !password || !role) {
      this.showToast('Please fill in all fields', 'error');
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showToast('Please enter a valid email address', 'error');
      return;
    }

    if (password.length < 6) {
      this.showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    const signupBtn = this.$('#signup-btn');
    if (signupBtn) {
      signupBtn.disabled = true;
      signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    }

    try {
      const userData = {
        name: email.split('@')[0],
        email,
        password,
        role,
        location: this.state.selectedCity || 'Lagos'
      };

      const user = await this.withRetry(() => API.registerUser(userData));
      this.setState({ user });
      this.saveSession();
      this.hideModal();
      this.showToast(`Welcome to Naco, ${user.name}!`, 'success');
      
      setTimeout(async () => {
        await this.requestNotificationPermission();
        this.startNotificationPolling();
      }, 1000);
      
    } catch (error) {
      console.error('Signup failed:', error);
      this.showToast('Signup failed. Please try again.', 'error');
    } finally {
      if (signupBtn) {
        signupBtn.disabled = false;
        signupBtn.innerHTML = '<i class="fas fa-user-plus"></i> Sign Up';
      }
    }
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  logout() {
    this.stopNotificationPolling();
    this.setState({ 
      user: null, 
      notifications: [], 
      notificationCount: 0 
    });
    this.clearSession();
    this.showToast('Logged out successfully', 'success');
  }

  // Fixed Artisan Profile with Proper Data Attributes
  async openArtisanProfile(artisanId) {
    if (!artisanId) {
      this.showToast('Artisan not found', 'error');
      return;
    }

    try {
      const artisan = await this.withRetry(() => API.getArtisanById(artisanId));
      const reviews = await this.withRetry(() => API.getReviewsForArtisan(artisanId));
      
      const distance = this.calculateDistance(artisan.location);
      const isFavorite = this.state.favorites.has(artisanId);

      const html = `
        <div class="artisan-profile-modal">
          <div class="profile-header">
            <img src="${artisan.photo || '../assets/avatar-placeholder.png'}" 
                 alt="${this.escapeHtml(artisan.name)}" 
                 class="profile-avatar"
                 onerror="this.src='../assets/avatar-placeholder.png'">
            <div class="profile-info">
              <h2>
                ${this.escapeHtml(artisan.name)} 
                ${this.renderVerificationBadge(artisan)}
                ${artisan.premium ? '<span class="premium-badge">PREMIUM</span>' : ''}
              </h2>
              <p class="profile-skill">${this.escapeHtml(artisan.skill)}</p>
              <p class="profile-location">
                <i class="fas fa-map-marker-alt"></i> 
                ${this.escapeHtml(artisan.location)} • ${distance} km away
              </p>
              <div class="profile-stats">
                <span><i class="fas fa-star"></i> ${(artisan.rating || 0).toFixed(1)}</span>
                <span><i class="fas fa-check-circle"></i> ${artisan.completedJobs || 0} jobs</span>
                <span><i class="fas fa-clock"></i> ${artisan.yearsExperience || 0} years</span>
              </div>
              <div class="profile-rate">${this.formatCurrency(artisan.rate)}</div>
            </div>
          </div>

          <div class="profile-section">
            <h4>About</h4>
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
                    <span class="review-rating">${'⭐'.repeat(Math.max(0, Math.min(5, review.rating)))}</span>
                  </div>
                  <p class="review-text">${this.escapeHtml(review.text)}</p>
                  <small class="muted">${new Date(review.date).toLocaleDateString()}</small>
                </div>
              `).join('') : '<p class="muted">No reviews yet</p>'}
            </div>
          </div>

          <div class="profile-actions">
            <button id="book-artisan" class="btn-primary" data-artisan-id="${artisan.id}">
              <i class="fas fa-calendar-plus"></i> Book Now
            </button>
            <button id="save-artisan" class="link-btn ${isFavorite ? 'active' : ''}" data-artisan-id="${artisan.id}">
              <i class="fas fa-heart"></i> ${isFavorite ? 'Saved' : 'Save'}
            </button>
            <button id="chat-artisan" class="link-btn" data-artisan-id="${artisan.id}">
              <i class="fab fa-whatsapp"></i> Chat
            </button>
          </div>
        </div>
      `;

      this.showModal(html, () => {
        this.bindModalActionEvents(artisan.id);
      });

    } catch (error) {
      console.error('Failed to load artisan profile:', error);
      this.showToast('Failed to load artisan profile', 'error');
    }
  }

  bindModalActionEvents(artisanId) {
    const bookBtn = this.$('#book-artisan');
    const saveBtn = this.$('#save-artisan');
    const chatBtn = this.$('#chat-artisan');

    if (bookBtn) {
      bookBtn.addEventListener('click', () => {
        if (!this.state.user) {
          this.hideModal();
          this.openLoginModal();
          return;
        }
        this.openBookingForm(artisanId);
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (!this.state.user) {
          this.hideModal();
          this.openLoginModal();
          return;
        }
        this.toggleFavorite(artisanId);
        // Update button state immediately
        const isFavorite = this.state.favorites.has(artisanId);
        saveBtn.classList.toggle('active', isFavorite);
        saveBtn.innerHTML = `<i class="fas fa-heart"></i> ${isFavorite ? 'Saved' : 'Save'}`;
      });
    }

    if (chatBtn) {
      chatBtn.addEventListener('click', () => this.openWhatsApp(artisanId));
    }
  }

  // Fixed Booking System with Proper Form Fields
  async openBookingForm(artisanId) {
    if (!this.state.user) {
      this.openLoginModal();
      return;
    }

    if (!artisanId) {
      this.showToast('Artisan not found', 'error');
      return;
    }

    try {
      const artisan = await this.withRetry(() => API.getArtisanById(artisanId));
      
      const html = `
        <div class="booking-modal">
          <h2>Book ${this.escapeHtml(artisan.name)}</h2>
          <div class="booking-summary">
            <img src="${artisan.photo || '../assets/avatar-placeholder.png'}" 
                 alt="${this.escapeHtml(artisan.name)}"
                 style="max-width: 80px; max-height: 80px; border-radius: 10px;"
                 onerror="this.src='../assets/avatar-placeholder.png'">
            <div>
              <strong>${this.escapeHtml(artisan.name)}</strong>
              <p class="muted">${this.escapeHtml(artisan.skill)} • ${this.formatCurrency(artisan.rate)}</p>
            </div>
          </div>

          <form id="booking-form" class="booking-form">
            <label>
              Service Date *
              <input id="book-date" type="date" required min="${new Date().toISOString().split('T')[0]}">
            </label>
            <label>
              Service Time *
              <input id="book-time" type="time" required>
            </label>
            <label>
              Service Location/Address *
              <textarea id="book-location" placeholder="Enter the address where the service will be performed..." 
                        rows="2" required></textarea>
            </label>
            <label>
              Service Description *
              <textarea id="book-notes" placeholder="Describe what you need done..." 
                        rows="4" required></textarea>
            </label>
            <label>
              Payment Method *
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
                <strong>Total: ${this.formatCurrency((artisan.rate || 0) + 500)}</strong>
              </div>
            </div>

            <div style="display: flex; gap: 12px; margin-top: 20px;">
              <button type="button" id="confirm-booking" class="btn-primary" 
                      style="flex: 1;" data-artisan-id="${artisan.id}">
                <i class="fas fa-check"></i> Confirm Booking
              </button>
              <button type="button" id="cancel-booking" class="link-btn">Cancel</button>
            </div>
          </form>
        </div>
      `;

      this.showModal(html, () => {
        this.bindBookingFormEvents(artisan);
      });

    } catch (error) {
      console.error('Failed to open booking form:', error);
      this.showToast('Failed to open booking form', 'error');
    }
  }

  bindBookingFormEvents(artisan) {
    const confirmBtn = this.$('#confirm-booking');
    const cancelBtn = this.$('#cancel-booking');
    const form = this.$('#booking-form');

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.handleBookingConfirmation(artisan));
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideModal());
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleBookingConfirmation(artisan);
      });
    }

    // Set minimum date to today
    const dateInput = this.$('#book-date');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.min = today;
    }
  }

  async handleBookingConfirmation(artisan) {
    const date = this.$('#book-date')?.value;
    const time = this.$('#book-time')?.value;
    const location = this.$('#book-location')?.value?.trim();
    const notes = this.$('#book-notes')?.value?.trim();
    const payment = this.$('#book-payment')?.value;

    // Validation
    if (!date || !time || !location || !notes || !payment) {
      this.showToast('Please fill in all required fields', 'error');
      return;
    }

    // Validate date is not in the past
    const selectedDate = new Date(date + 'T' + time);
    if (selectedDate <= new Date()) {
      this.showToast('Please select a future date and time', 'error');
      return;
    }

    const confirmBtn = this.$('#confirm-booking');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }

    const bookingData = {
      artisanId: artisan.id,
      artisanName: artisan.name,
      clientId: this.state.user.id,
      clientName: this.state.user.name,
      service: artisan.skill,
      date,
      time,
      location,
      notes,
      payment,
      amount: (artisan.rate || 0) + 500,
      status: 'pending'
    };

    try {
      const booking = await this.withRetry(() => API.createBooking(bookingData));
      const reference = booking.reference || 'NACO-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      
      this.hideModal();
      this.showBookingConfirmation(booking, artisan, reference);
      this.showToast('Booking confirmed successfully!', 'success');
      
    } catch (error) {
      console.error('Booking failed:', error);
      this.showToast('Booking failed. Please try again.', 'error');
    } finally {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-check"></i> Confirm Booking';
      }
    }
  }

  showBookingConfirmation(booking, artisan, reference) {
    const html = `
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
            <strong>${new Date(booking.date).toLocaleDateString()}</strong>
          </div>
          <div class="detail-row">
            <span>Time:</span>
            <strong>${booking.time}</strong>
          </div>
          <div class="detail-row">
            <span>Location:</span>
            <strong>${this.escapeHtml(booking.location)}</strong>
          </div>
          <div class="detail-row">
            <span>Total:</span>
            <strong>${this.formatCurrency(booking.amount)}</strong>
          </div>
        </div>

        <div style="display: flex; gap: 12px; margin-top: 20px;">
          <button id="view-booking" class="btn-primary">View Booking</button>
          <button id="close-confirmation" class="link-btn">Close</button>
        </div>
      </div>
    `;

    this.showModal(html, () => {
      this.$('#view-booking')?.addEventListener('click', () => {
        this.hideModal();
        setTimeout(() => this.openMyBookings(), 300);
      });
      this.$('#close-confirmation')?.addEventListener('click', () => this.hideModal());
    });
  }

  // Enhanced Notification System
  async startNotificationPolling() {
    if (!this.state.user) return;

    this.stopNotificationPolling();

    let lastNotificationCheck = Date.now();
    let knownNotificationIds = new Set();

    const poll = async () => {
      try {
        const notifications = await API.getNotifications(this.state.user.id);
        const unreadCount = notifications.filter(n => !n.read).length;
        
        // Find new notifications
        const newNotifications = notifications.filter(n => {
          const notificationTime = new Date(n.created).getTime();
          const isNew = notificationTime > lastNotificationCheck && !knownNotificationIds.has(n.id);
          knownNotificationIds.add(n.id);
          return isNew && !n.read;
        });
        
        // Show push notifications for new notifications
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

  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      this.showToast('Please enable notifications in your browser settings', 'info');
      return false;
    }

    try {
      this.showToast('Please allow notifications to stay updated on your bookings', 'info');
      
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        this.showToast('Notifications enabled!', 'success');
        
        setTimeout(() => {
          this.showPushNotification(
            'Notifications Active!',
            'You will now receive important updates about your bookings.',
            {}
          );
        }, 1000);
        
        return true;
      } else {
        this.showToast('Notifications disabled. You can enable them later in settings.', 'info');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async showPushNotification(title, message, data = {}) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      this.showToast(`${title}: ${message}`, 'info');
      return;
    }

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        if (registration?.showNotification) {
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
          return;
        }
      }

      // Fallback to regular notification
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

    } catch (error) {
      console.error('Failed to show notification:', error);
      this.showToast(`${title}: ${message}`, 'info');
    }
  }

  async markAllNotificationsRead() {
    if (!this.state.user) return;

    try {
      await this.withRetry(() => API.markNotificationsRead(this.state.user.id));
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

  // Enhanced User Bookings with Better Error Handling
  async openMyBookings() {
    if (!this.state.user) {
      this.openLoginModal();
      return;
    }

    try {
      const bookings = await this.withRetry(() => API.getUserBookings(this.state.user.id));
      
      const html = `
        <div class="my-bookings-modal">
          <h2>My Bookings</h2>
          <p class="muted">Track your service requests and appointments</p>
          
          <div class="bookings-list">
            ${bookings.length ? bookings.map(booking => `
              <div class="booking-item">
                <div class="booking-header">
                  <strong>${this.escapeHtml(booking.service || 'Service')}</strong>
                  <span class="status-badge status-${booking.status}">${(booking.status || 'pending').toUpperCase()}</span>
                </div>
                <p class="muted">with ${this.escapeHtml(booking.artisanName || 'Artisan')}</p>
                <p><i class="fas fa-calendar"></i> ${new Date(booking.date).toLocaleDateString()} at ${booking.time}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(booking.location || 'Location TBD')}</p>
                <p><i class="fas fa-money-bill"></i> Amount: ${this.formatCurrency(booking.amount)}</p>
                
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
        this.bindBookingsModalEvents(bookings);
      });

    } catch (error) {
      console.error('Failed to load bookings:', error);
      this.showToast('Failed to load bookings', 'error');
    }
  }

  bindBookingsModalEvents(bookings) {
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
  }

  // Enhanced Rendering System
  render() {
    if (!this.isInitialized) return;

    try {
      this.renderHeader();
      this.renderFeaturedArtisans();
      this.renderSearchResults();
      this.renderQuickCategories();
      this.updateNotificationBadge();
      
      // Update loading state
      const loadingEl = this.$('#loading-indicator');
      if (loadingEl) {
        loadingEl.style.display = this.state.isLoading ? 'block' : 'none';
      }

      // Show error state if needed
      if (this.state.error) {
        this.showToast(this.state.error, 'error');
        this.setState({ error: null });
      }

    } catch (error) {
      console.error('Render failed:', error);
    }
  }

  renderHeader() {
    this.updateProfileUI();
    this.updateFAB();
  }

  updateProfileUI() {
    const profilePic = this.$('#profile-pic');
    const menuName = this.$('#menu-name');
    const menuEmail = this.$('#menu-email');
    const menuAvatar = this.$('.menu-avatar');

    if (this.state.user) {
      this.safeSetAvatar(profilePic, this.state.user);
      this.safeSetAvatar(menuAvatar, this.state.user);
      this.safeSetText('#menu-name', this.state.user.name || 'User');
      this.safeSetText('#menu-email', this.state.user.email || '');
      
      const roleLabel = this.$('#roleLabel');
      const roleSwitch = this.$('#roleSwitch');
      if (roleLabel) roleLabel.textContent = this.state.user.role === 'artisan' ? 'Artisan' : 'Client';
      if (roleSwitch) roleSwitch.checked = this.state.user.role === 'artisan';
    } else {
      if (profilePic) profilePic.src = '../assets/avatar-placeholder.png';
      if (menuAvatar) menuAvatar.src = '../assets/avatar-placeholder.png';
      this.safeSetText('#menu-name', 'Guest');
      this.safeSetText('#menu-email', 'Not signed in');
    }
  }

  safeSetAvatar(element, user) {
    if (!element) return;
    
    try {
      if (user?.avatar && pb?.files?.getUrl) {
        element.src = pb.files.getUrl(user, user.avatar, { thumb: '100x100' });
        element.onerror = () => element.src = '../assets/avatar-placeholder.png';
      } else {
        element.src = '../assets/avatar-placeholder.png';
      }
    } catch (error) {
      console.error('Avatar loading failed:', error);
      element.src = '../assets/avatar-placeholder.png';
    }
  }

  updateFAB() {
    const fab = this.$('#fab-book');
    if (!fab) return;

    if (this.state.user?.role === 'artisan') {
      fab.innerHTML = '<i class="fas fa-users"></i>';
      fab.title = 'My Clients';
    } else {
      fab.innerHTML = '<i class="fas fa-calendar-plus"></i>';
      fab.title = 'Quick Book';
    }
  }

  renderFeaturedArtisans() {
    const container = this.$('#featured-list');
    if (!container) return;

    const featured = this.state.featuredArtisans
      .filter(artisan => !this.state.selectedCity || artisan.location === this.state.selectedCity)
      .slice(0, 8);

    if (featured.length === 0) {
      container.innerHTML = '<p class="muted">No featured artisans available</p>';
      return;
    }

    container.innerHTML = featured.map(artisan => `
      <div class="feat-card" data-id="${artisan.id}" title="${this.escapeHtml(artisan.name)}">
        <img src="${artisan.photo || '../assets/avatar-placeholder.png'}" 
             alt="${this.escapeHtml(artisan.name)}"
             loading="lazy"
             onerror="this.src='../assets/avatar-placeholder.png'">
        <div class="feat-name">
          ${this.escapeHtml(artisan.name)}
          ${this.renderVerificationBadge(artisan)}
        </div>
        <div class="premium-badge">★ PREMIUM</div>
      </div>
    `).join('');

    container.classList.add('fade-in');
  }

  renderSearchResults() {
    const container = this.$('#results-list');
    if (!container) return;

    const sortedResults = [...this.state.filteredArtisans].sort((a, b) => {
      if (a.premium && !b.premium) return -1;
      if (!a.premium && b.premium) return 1;
      return (b.rating || 0) - (a.rating || 0);
    });

    if (sortedResults.length === 0) {
      container.innerHTML = this.state.isSearchActive ? 
        '<p class="muted">No artisans found for your search.</p>' :
        '<p class="muted">No artisans available.</p>';
      return;
    }

    container.innerHTML = sortedResults.map(artisan => {
      const distance = this.calculateDistance(artisan.location);
      const isFavorite = this.state.favorites.has(artisan.id);
      
      return `
        <div class="artisan-card fade-in" data-id="${artisan.id}">
          <img src="${artisan.photo || '../assets/avatar-placeholder.png'}" 
               alt="${this.escapeHtml(artisan.name)}"
               loading="lazy"
               onerror="this.src='../assets/avatar-placeholder.png'">
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
            <div class="muted">
              <i class="fas fa-star"></i> ${(artisan.rating || 0).toFixed(1)} • 
              <i class="fas fa-map-marker-alt"></i> ${distance} km away
              ${artisan.availability ? ` • <span class="status-available">${artisan.availability}</span>` : ''}
            </div>
          </div>
          <div class="actions">
            <button class="btn-book btn-cta" aria-label="Book ${this.escapeHtml(artisan.name)}">
              <i class="fas fa-calendar-plus"></i>
            </button>
            <button class="btn-fav ${isFavorite ? 'active' : ''}" aria-label="${isFavorite ? 'Remove from' : 'Add to'} favorites">
              <i class="fas fa-heart"></i>
            </button>
            <button class="btn-wa" aria-label="WhatsApp ${this.escapeHtml(artisan.name)}">
              <i class="fab fa-whatsapp"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
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
      { name: 'Carpenter', icon: 'fas fa-hammer' }
    ];

    container.innerHTML = categories.map(category => `
      <button class="chip" data-cat="${category.name}">
        <i class="${category.icon}"></i> ${category.name}
      </button>
    `).join('');
  }

  updateNotificationBadge() {
    const badge = this.$('#notif-count');
    if (!badge) return;

    if (this.state.notificationCount > 0) {
      badge.textContent = Math.min(99, this.state.notificationCount);
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  // Utility Methods
  renderVerificationBadge(user) {
    if (!user?.premium) return '';
    return '<i class="fas fa-check-circle verification-badge" title="Verified Premium User"></i>';
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

  // Enhanced Error Handling and Retry Logic
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
      this.closeSearchPage();
      this.closeNotificationsPage();
      this.closeProfilePage();
      this.closeSideMenu();
    }
  }

  handleInstallPrompt(e) {
    e.preventDefault();
    this.setState({ deferredPrompt: e });
    
    const installBtn = this.$('#install-btn');
    if (installBtn) {
      installBtn.classList.remove('hidden');
    }
  }

  handleFabClick() {
    if (this.state.user?.role === 'artisan') {
      this.openMyClients();
    } else {
      this.openQuickBooking();
    }
  }

  // Additional Helper Methods
  toggleFavorite(artisanId) {
    if (!artisanId) return;

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

  openWhatsApp(artisanId) {
    const artisan = this.state.artisans.find(a => a.id === artisanId);
    if (!artisan) return;

    const phone = artisan.phone || '0000000000';
    const message = `Hi ${artisan.name}, I found you on Naco and I'm interested in your ${artisan.skill} services. Can we discuss?`;
    const whatsappUrl = `https://wa.me/234${phone.replace(/^0/, '')}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
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
    const newTheme = this.state.isDarkMode ? 'light' : 'dark';
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
        
        // Simple city detection based on latitude
        if (latitude > 9) city = 'Abuja';
        else if (latitude < 5) city = 'Port Harcourt';
        
        this.setState({ 
          currentLocation: { latitude, longitude: position.coords.longitude },
          selectedCity: city 
        });
        
        const citySelect = this.$('#city-select');
        if (citySelect) citySelect.value = city;
        
        this.applyFilters();
      },
      (error) => {
        console.warn('Location access denied:', error);
      }
    );
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

  // Service Worker Registration
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('./service-worker.js');
        console.log('SW registered');
        
        this.setupServiceWorkerMessageListener();
        
        return registration;
      } catch (err) {
        console.warn('SW registration failed:', err);
      }
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

  // Modal System with Enhanced Error Handling
  showModal(html, onShow) {
    const modal = this.$('#modal');
    const content = this.$('#modal-content');
    
    if (!modal || !content) {
      console.error('Modal elements not found');
      return;
    }

    content.innerHTML = html;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    
    // Add fade-in animation
    requestAnimationFrame(() => {
      content.classList.add('fade-in');
    });

    if (typeof onShow === 'function') {
      try {
        onShow();
      } catch (error) {
        console.error('Modal onShow callback failed:', error);
      }
    }

    // Trap focus
    const focusableElements = content.querySelectorAll(
      'button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  hideModal() {
    const modal = this.$('#modal');
    const content = this.$('#modal-content');
    
    if (!modal || !content) return;

    content.classList.add('fade-out');
    
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
      content.innerHTML = '';
      content.classList.remove('fade-in', 'fade-out');
    }, 200);
  }

  // Additional Page Functions
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

  renderSearchResultCard(artisan) {
    return `
      <div class="search-result-card" data-id="${artisan.id}">
        <img src="${artisan.photo || '../assets/avatar-placeholder.png'}" 
             alt="${this.escapeHtml(artisan.name)}"
             onerror="this.src='../assets/avatar-placeholder.png'">
        <div class="search-result-info">
          <h4>${this.escapeHtml(artisan.name)} ${this.renderVerificationBadge(artisan)}</h4>
          <p class="search-result-skill">${this.escapeHtml(artisan.skill)}</p>
          <p class="search-result-location">${this.escapeHtml(artisan.location)}</p>
          <div class="search-result-rating">
            <i class="fas fa-star"></i> ${(artisan.rating || 0).toFixed(1)}
            ${artisan.premium ? '<span class="premium-badge">PREMIUM</span>' : ''}
          </div>
        </div>
        <div class="search-result-price">
          ${this.formatCurrency(artisan.rate)}
        </div>
      </div>
    `;
  }

  // Navigation Management
  toggleSideMenu() {
    this.setState({ isNavOpen: !this.state.isNavOpen });
    document.body.classList.toggle('nav-open', this.state.isNavOpen);
  }

  closeSideMenu() {
    this.setState({ isNavOpen: false });
    document.body.classList.remove('nav-open');
  }

  closeProfileDropdown() {
    this.setState({ isProfileDropdownOpen: false });
  }

  // Enhanced Notifications Page Loading
  async loadNotificationsPage() {
    if (!this.state.user) return;
    
    const container = this.$('#notifications-content');
    const markAllBtn = this.$('#mark-all-read');
    
    if (!container) return;
    
    try {
      const notifications = await this.withRetry(() => API.getNotifications());
      const hasUnread = notifications.some(n => !n.read);
      
      if (hasUnread && markAllBtn) {
        markAllBtn.classList.remove('hidden');
      } else if (markAllBtn) {
        markAllBtn.classList.add('hidden');
      }
      
      if (notifications.length > 0) {
        container.innerHTML = notifications.map(notification => this.renderNotificationItem(notification)).join('');
        this.bindNotificationEvents(container);
      } else {
        container.innerHTML = '<p class="muted">No notifications yet</p>';
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      container.innerHTML = '<p class="muted">Failed to load notifications</p>';
    }
  }

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

  bindNotificationEvents(container) {
    const handler = (e) => {
      const notifItem = e.target.closest('.notification-item');
      if (notifItem) {
        e.preventDefault();
        e.stopPropagation();
        const notificationId = notifItem.dataset.id;
        this.handleNotificationClick(notificationId);
      }
    };
    
    container.addEventListener('click', handler);
    this.eventHandlers.set(container, handler);
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

  // Enhanced Profile Page Loading
  async loadProfilePage() {
    const container = this.$('.profile-container');
    if (!container) return;
    
    if (!this.state.user) {
      container.innerHTML = `
        <div class="profile-header">
          <h3>Welcome to Naco</h3>
          <p>Please log in to view your profile</p>
          <button id="login-from-profile" class="btn-primary">Login</button>
        </div>
      `;
      
      const loginBtn = this.$('#login-from-profile');
      if (loginBtn) {
        loginBtn.addEventListener('click', () => {
          this.closeProfilePage();
          this.openLoginModal();
        });
      }
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
        <img src="../assets/avatar-placeholder.png" 
             alt="Profile" class="profile-avatar-large" id="profile-avatar-large">
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
          <i class="fas fa-chevron-right" style="margin-left: auto;"></i>
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

    // Set avatar
    this.safeSetAvatar(this.$('#profile-avatar-large'), this.state.user);
    
    // Bind profile menu events
    this.bindProfileMenuEvents();
  }

  bindProfileMenuEvents() {
    const menuActions = {
      'profile-bookings': () => {
        this.closeProfilePage();
        this.openMyBookings();
      },
      'profile-favorites': () => {
        this.closeProfilePage();
        this.openFavorites();
      },
      'profile-clients': () => {
        this.closeProfilePage();
        this.openMyClients();
      },
      'profile-settings': () => {
        this.closeProfilePage();
        this.openSettings();
      },
      'profile-upgrade': () => {
        this.closeProfilePage();
        this.openPremiumUpgrade();
      },
      'profile-theme': () => {
        this.toggleTheme();
        this.showToast('Theme updated', 'success');
      },
      'profile-logout': () => {
        this.logout();
        this.closeProfilePage();
      }
    };

    Object.entries(menuActions).forEach(([id, action]) => {
      const btn = this.$(`#${id}`);
      if (btn) {
        btn.addEventListener('click', action);
      }
    });

    // Handle role switch
    const roleSwitch = this.$('#profile-role-switch');
    if (roleSwitch) {
      roleSwitch.addEventListener('change', (e) => this.handleRoleSwitch(e));
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

  // Handle URL notifications
  handleNotificationFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const notificationType = urlParams.get('notification');
    const notificationId = urlParams.get('id');
    
    if (notificationType === 'booking' && notificationId) {
      setTimeout(() => {
        this.openBookingDetails(notificationId);
      }, 1000);
    }
    
    // Clean up URL
    if (notificationType) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  // Additional utility methods and features can be added here
  // such as openFavorites, openSettings, openPremiumUpgrade, etc.

  // Cleanup function
  destroy() {
    this.stopNotificationPolling();
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.cleanupTasks.forEach(cleanup => cleanup());
    this.removeExistingListeners();
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