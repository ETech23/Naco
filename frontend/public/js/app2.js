// Naco - Modern Artisan Finder App
// Complete JavaScript implementation with React-like patterns

import * as API from '../../api/mock-api.js';

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

  updateState(key, value) {
    this.state[key] = value;
    this.render();
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
      this.tryGetLocation();
      this.setupInstallPrompt();
      this.registerServiceWorker();
      this.startNotificationPolling();
      
      this.render();
      this.setState({ isLoading: false });
    } catch (error) {
      console.error('App initialization failed:', error);
      this.setState({ isLoading: false });
      this.showToast('Failed to initialize app', 'error');
    }
  }

  // Event Listeners
  bindEventListeners() {
    // Header controls
    this.$('#menu-btn')?.addEventListener('click', () => this.toggleSideMenu());
    this.$('#profile-toggle')?.addEventListener('click', (e) => this.toggleProfileDropdown(e));
    this.$('#notif-btn')?.addEventListener('click', () => this.openNotifications());

    // Profile dropdown
    this.$('#update-profile')?.addEventListener('click', () => {
      this.openProfileUpdate();
      this.closeProfileDropdown();
    });
    this.$('#toggle-theme')?.addEventListener('click', () => {
      this.toggleTheme();
      this.closeProfileDropdown();
    });
    this.$('#upgrade-premium')?.addEventListener('click', () => {
      this.openPremiumUpgrade();
      this.closeProfileDropdown();
    });
    this.$('#logout')?.addEventListener('click', () => {
      this.logout();
      this.closeProfileDropdown();
    });

    // Role switch
    this.$('#roleSwitch')?.addEventListener('change', (e) => this.handleRoleSwitch(e));

    // Search and filters
    this.$('#search-input')?.addEventListener('input', (e) => {
      this.debounce(() => this.handleSearch(e.target.value), 250);
    });
    this.$('#search-clear')?.addEventListener('click', () => this.clearSearch());
    this.$('#city-select')?.addEventListener('change', (e) => this.handleCityFilter(e.target.value));

    // FAB
    this.$('#fab-book')?.addEventListener('click', () => this.handleFabClick());

    // Install button
    this.$('#install-btn')?.addEventListener('click', () => this.installApp());

    // Global event listeners
    document.addEventListener('click', (e) => this.handleGlobalClick(e));
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('beforeinstallprompt', (e) => this.handleInstallPrompt(e));

    // Featured and results click delegation
    this.$('#featured-list')?.addEventListener('click', (e) => this.handleFeaturedClick(e));
    this.$('#results-list')?.addEventListener('click', (e) => this.handleResultsClick(e));
    this.$('#quick-cats')?.addEventListener('click', (e) => this.handleQuickCatClick(e));

    // Modal
    this.$('#modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.hideModal();
    });

    // View all featured
    this.$('#view-all-featured')?.addEventListener('click', () => this.viewAllFeatured());
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
    const select = this.$('#city-select');
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

  handleQuickCatClick(e) {
    const chip = e.target.closest('.chip');
    if (!chip) return;

    const category = chip.dataset.cat;
    if (category) {
      this.$('#search-input').value = category;
      this.handleSearch(category);
    }
  }

  // Event Handlers
  handleGlobalClick(e) {
    // Close profile dropdown if clicking outside
    if (!e.target.closest('.profile-dropdown')) {
      this.closeProfileDropdown();
    }

    // Close side menu if clicking outside
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

  handleFeaturedClick(e) {
    const card = e.target.closest('.feat-card');
    if (!card) return;

    const artisanId = card.dataset.id;
    if (artisanId) {
      this.openArtisanProfile(artisanId);
    }
  }

  handleResultsClick(e) {
    const card = e.target.closest('.artisan-card');
    if (!card) return;

    const artisanId = card.dataset.id;
    
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
              <option value="client">Client (Looking for services)</option>
              <option value="artisan">Artisan (Providing services)</option>
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
      this.startNotificationPolling();
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
        name: email.split('@')[0], // Use email prefix as default name
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
      this.startNotificationPolling();
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
            Email
            <input id="upd-email" type="email" value="${this.escapeHtml(user.email || '')}" required>
          </label>
          <label>
            Phone
            <input id="upd-phone" type="tel" value="${this.escapeHtml(user.phone || '')}" placeholder="08123456789">
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

  async handleProfileUpdate() {
    const updates = {
      name: this.$('#upd-name')?.value,
      email: this.$('#upd-email')?.value,
      phone: this.$('#upd-phone')?.value,
      location: this.$('#upd-location')?.value
    };

    if (!updates.name || !updates.email) {
      this.showToast('Name and email are required', 'error');
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
  }

  logout() {
    this.setState({ user: null, notifications: [], notificationCount: 0 });
    this.clearSession();
    this.stopNotificationPolling();
    this.showToast('Logged out successfully', 'success');
  }

  // Artisan Profile and Booking
  async openArtisanProfile(artisanId) {
    try {
      const artisan = await API.getArtisanById(artisanId);
      const reviews = await API.getReviewsForArtisan(artisanId);
      
      const distance = this.calculateDistance(artisan.location);
      const isFavorite = this.state.favorites.has(artisanId);

      const html = `
        <div class="artisan-profile-modal">
          <div class="profile-header">
            <img src="${artisan.photo || '../assets/avatar-placeholder.png'}" alt="${this.escapeHtml(artisan.name)}" class="profile-avatar">
            <div class="profile-info">
              <h2>${this.escapeHtml(artisan.name)} ${artisan.premium ? '<span class="premium-badge">PREMIUM</span>' : ''}</h2>
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
            <h4>About</h4>
            <p>${this.escapeHtml(artisan.description || 'Professional artisan with years of experience.')}</p>
          </div>

          ${artisan.specialties ? `
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
                    <strong>${this.escapeHtml(review.reviewerName)}</strong>
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
        this.$('#book-artisan')?.addEventListener('click', () => this.openBookingForm(artisanId));
        this.$('#save-artisan')?.addEventListener('click', () => this.toggleFavorite(artisanId));
        this.$('#chat-artisan')?.addEventListener('click', () => this.openWhatsApp(artisanId));
      });

    } catch (error) {
      console.error('Failed to load artisan profile:', error);
      this.showToast('Failed to load artisan profile', 'error');
    }
  }

  async openBookingForm(artisanId) {
    if (!this.state.user) {
      this.openLoginModal();
      return;
    }

    try {
      const artisan = await API.getArtisanById(artisanId);
      
      const html = `
        <div class="booking-modal">
          <h2>Book ${this.escapeHtml(artisan.name)}</h2>
          <div class="booking-summary">
            <img src="${artisan.photo || '../assets/avatar-placeholder.png'}" alt="${this.escapeHtml(artisan.name)}">
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
    const notes = this.$('#book-notes')?.value;
    const payment = this.$('#book-payment')?.value;

    if (!date || !time || !notes || !payment) {
      this.showToast('Please fill in all fields', 'error');
      return;
    }

    const bookingData = {
      artisanId: artisan.id,
      clientName: this.state.user.name,
      service: artisan.skill,
      date,
      time,
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
              <img src="${artisan.photo || '../assets/avatar-placeholder.png'}" alt="${this.escapeHtml(artisan.name)}">
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
              <span>Confirmed</span>
            </div>
            <div class="stat-item">
              <strong>${bookings.filter(b => b.status === 'completed').length}</strong>
              <span>Completed</span>
            </div>
          </div>

          <div class="bookings-list">
            ${bookings.map(booking => `
              <div class="booking-item ${booking.status}">
                <div class="booking-info">
                  <strong>${this.escapeHtml(booking.clientName)}</strong>
                  <p class="muted">${this.escapeHtml(booking.service)} • ${booking.date} ${booking.time}</p>
                  <span class="status-badge status-${booking.status}">${booking.status.toUpperCase()}</span>
                </div>
                <div class="booking-actions">
                  ${booking.status === 'pending' ? `
                    <button class="btn-cta accept-booking" data-id="${booking.id}">Accept</button>
                    <button class="link-btn decline-booking" data-id="${booking.id}">Decline</button>
                  ` : `
                    <button class="link-btn view-booking" data-id="${booking.id}">View</button>
                  `}
                </div>
              </div>
            `).join('')}
          </div>

          <div style="text-align: center; margin-top: 20px;">
            <button id="close-clients" class="link-btn">Close</button>
          </div>
        </div>
      `;

      this.showModal(html, () => {
        this.$$('.accept-booking').forEach(btn => {
          btn.addEventListener('click', (e) => this.handleBookingAction(e.target.dataset.id, 'accept'));
        });
        this.$$('.decline-booking').forEach(btn => {
          btn.addEventListener('click', (e) => this.handleBookingAction(e.target.dataset.id, 'decline'));
        });
        this.$('#close-clients')?.addEventListener('click', () => this.hideModal());
      });

    } catch (error) {
      console.error('Failed to load client bookings:', error);
      this.showToast('Failed to load bookings', 'error');
    }
  }

  async handleBookingAction(bookingId, action) {
    try {
      await API.updateBookingStatus(bookingId, action === 'accept' ? 'confirmed' : 'declined');
      this.showToast(`Booking ${action}ed successfully`, 'success');
      this.openMyClients(); // Refresh the modal
    } catch (error) {
      console.error(`Failed to ${action} booking:`, error);
      this.showToast(`Failed to ${action} booking`, 'error');
    }
  }

  // User Bookings
  async openMyBookings() {
    if (!this.state.user) {
      this.openLoginModal();
      return;
    }

    try {
      const bookings = await API.getUserBookings(this.state.user.id);
      
      const html = `
        <div class="my-bookings-modal">
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
                <p><i class="fas fa-calendar"></i> ${booking.date} at ${booking.time}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(booking.location || 'Location TBD')}</p>
                
                <div class="booking-actions">
                  ${booking.status === 'pending' ? `
                    <button class="link-btn cancel-booking" data-id="${booking.id}">Cancel</button>
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
        this.$('#close-bookings')?.addEventListener('click', () => this.hideModal());
      });

    } catch (error) {
      console.error('Failed to load bookings:', error);
      this.showToast('Failed to load bookings', 'error');
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

    if (this.state.notificationsPoller) {
      clearInterval(this.state.notificationsPoller);
    }

    const poll = async () => {
      try {
        const notifications = await API.getNotifications(this.state.user.id);
        this.setState({ 
          notifications,
          notificationCount: notifications.filter(n => !n.read).length 
        });
      } catch (error) {
        console.warn('Notification polling failed:', error);
      }
    };

    await poll(); // Initial poll
    this.setState({ 
      notificationsPoller: setInterval(poll, 30000) // Poll every 30 seconds
    });
  }

  stopNotificationPolling() {
    if (this.state.notificationsPoller) {
      clearInterval(this.state.notificationsPoller);
      this.setState({ notificationsPoller: null });
    }
  }

  async openNotifications() {
    if (!this.state.user) {
      this.openLoginModal();
      return;
    }

    const html = `
      <div class="notifications-modal">
        <h2>Notifications</h2>
        
        <div class="notifications-list">
          ${this.state.notifications.length ? this.state.notifications.map(notification => `
            <div class="notification-item ${notification.read ? 'read' : 'unread'}">
              <div class="notification-icon">
                <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
              </div>
              <div class="notification-content">
                <p>${this.escapeHtml(notification.message)}</p>
                <small class="muted">${new Date(notification.createdAt).toLocaleString()}</small>
              </div>
              ${!notification.read ? '<div class="notification-badge"></div>' : ''}
            </div>
          `).join('') : '<p class="muted">No notifications yet</p>'}
        </div>

        <div style="display: flex; gap: 12px; margin-top: 20px;">
          ${this.state.notifications.some(n => !n.read) ? `
            <button id="mark-all-read" class="btn-primary">Mark All Read</button>
          ` : ''}
          <button id="close-notifications" class="link-btn">Close</button>
        </div>
      </div>
    `;

    this.showModal(html, () => {
      this.$('#mark-all-read')?.addEventListener('click', () => this.markAllNotificationsRead());
      this.$('#close-notifications')?.addEventListener('click', () => this.hideModal());
    });
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

  async markAllNotificationsRead() {
    try {
      await API.markNotificationsRead(this.state.user.id);
      this.setState({ 
        notifications: this.state.notifications.map(n => ({ ...n, read: true })),
        notificationCount: 0 
      });
      this.showToast('All notifications marked as read', 'success');
      this.openNotifications(); // Refresh modal
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      this.showToast('Failed to update notifications', 'error');
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

    // Mock premium subscription process
    try {
      // In a real app, this would integrate with payment gateway
      const success = await new Promise(resolve => {
        setTimeout(() => resolve(Math.random() > 0.3), 1000); // 70% success rate
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
  viewAllFeatured() {
    const html = `
      <div class="all-featured-modal">
        <h2>All Featured Artisans</h2>
        <p class="muted">Premium artisans in your area</p>
        
        <div class="featured-grid">
          ${this.state.artisans.filter(a => a.premium).map(artisan => `
            <div class="featured-card" data-id="${artisan.id}">
              <img src="${artisan.photo || '../assets/avatar-placeholder.png'}" alt="${this.escapeHtml(artisan.name)}">
              <div class="featured-info">
                <strong>${this.escapeHtml(artisan.name)}</strong>
                <p class="muted">${this.escapeHtml(artisan.skill)}</p>
                <p class="featured-location">${this.escapeHtml(artisan.location)}</p>
                <div class="featured-rating">
                  <i class="fas fa-star"></i> ${artisan.rating || 0}
                </div>
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

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service worker registered successfully');
      } catch (error) {
        console.warn('Service worker registration failed:', error);
      }
    }
  }

  // Modal System
  showModal(html, onShow) {
    const modal = this.$('#modal');
    const content = this.$('#modal-content');
    
    if (!modal || !content) return;

    content.innerHTML = html;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    
    // Add fade-in animation
    requestAnimationFrame(() => {
      content.classList.add('fade-in');
    });

    if (typeof onShow === 'function') {
      onShow();
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

  // Utility Methods
  calculateDistance(artisanLocation) {
    if (!this.state.currentLocation) {
      return Math.floor(Math.random() * 20) + 1; // Mock distance
    }

    // Simple distance calculation based on city
    if (this.state.selectedCity === artisanLocation) {
      return Math.floor(Math.random() * 5) + 1;
    } else {
      return Math.floor(Math.random() * 40) + 10;
    }
  }

  // Rendering Methods
  render() {
    this.renderHeader();
    this.renderFeaturedArtisans();
    this.renderSearchResults();
    this.renderQuickCategories();
    this.renderSideNavigation();
    this.updateNotificationBadge();
  }

  renderHeader() {
    // Update profile UI
    const profilePic = this.$('#profile-pic');
    const menuName = this.$('#menu-name');
    const menuEmail = this.$('#menu-email');
    const roleLabel = this.$('#roleLabel');
    const roleSwitch = this.$('#roleSwitch');
    const profileDropdown = this.$('#profile-dropdown');

    if (this.state.user) {
      if (profilePic) profilePic.src = this.state.user.photo || '../assets/avatar-placeholder.png';
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

    // Update dropdown state
    if (profileDropdown) {
      profileDropdown.classList.toggle('open', this.state.isProfileDropdownOpen);
    }

    // Update FAB based on role
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
      <div class="feat-card" data-id="${artisan.id}" title="${this.escapeHtml(artisan.name)}">
        <img src="${artisan.photo || '../assets/avatar-placeholder.png'}" 
             alt="${this.escapeHtml(artisan.name)}"
             loading="lazy">
        <div class="feat-name">${this.escapeHtml(artisan.name)}</div>
        <div class="premium-badge">★ PREMIUM</div>
      </div>
    `).join('');

    // Add loading animation
    container.classList.add('fade-in');
  }

  renderSearchResults() {
    const container = this.$('#results-list');
    if (!container) return;

    // Sort results: premium first, then by rating
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
          <img src="${artisan.photo || '../assets/avatar-placeholder.png'}" 
               alt="${this.escapeHtml(artisan.name)}"
               loading="lazy">
          <div class="artisan-info">
            <div class="artisan-title">
              <strong>${this.escapeHtml(artisan.name)}</strong>
              ${artisan.premium ? '<span class="premium-badge">PREMIUM</span>' : ''}
            </div>
            <div class="artisan-meta">
              ${this.escapeHtml(artisan.skill)} • ${this.escapeHtml(artisan.location)} • ${this.formatCurrency(artisan.rate)}
            </div>
            <div class="muted">
              <i class="fas fa-star"></i> ${artisan.rating || 0} • 
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

  renderSideNavigation() {
    let sideMenu = this.$('#side-menu');
    
    if (!sideMenu) {
      sideMenu = document.createElement('nav');
      sideMenu.id = 'side-menu';
      sideMenu.className = 'side-menu';
      document.body.appendChild(sideMenu);
    }

    const menuItems = [
      { id: 'nav-find', icon: 'fas fa-search', text: 'Find Artisans', action: () => {
        this.closeSideMenu();
        this.$('#search-input')?.focus();
      }},
      { id: 'nav-bookings', icon: 'fas fa-calendar', text: 'My Bookings', action: () => {
        this.closeSideMenu();
        this.openMyBookings();
      }},
      { id: 'nav-favorites', icon: 'fas fa-heart', text: 'Favorites', action: () => {
        this.closeSideMenu();
        this.openFavorites();
      }},
      { id: 'nav-settings', icon: 'fas fa-cog', text: 'Settings', action: () => {
        this.closeSideMenu();
        this.openSettings();
      }}
    ];

    sideMenu.innerHTML = `
      <div class="side-head">
        <strong>Naco</strong>
        <span class="muted">Find Trusted Artisans</span>
      </div>
      <ul class="side-list">
        ${menuItems.map(item => `
          <li>
            <button id="${item.id}" class="nav-item">
              <i class="${item.icon}"></i> ${item.text}
            </button>
          </li>
        `).join('')}
      </ul>
      <div class="side-footer">
        <div class="user-info">
          ${this.state.user ? `
            <img src="${this.state.user.photo || '../assets/avatar-placeholder.png'}" alt="User" class="user-avatar">
            <div>
              <div class="user-name">${this.escapeHtml(this.state.user.name)}</div>
              <div class="user-role muted">${this.state.user.role === 'artisan' ? 'Artisan' : 'Client'}</div>
            </div>
          ` : `
            <div class="guest-info">
              <i class="fas fa-user-circle"></i>
              <span>Guest User</span>
            </div>
          `}
        </div>
      </div>
      <button id="close-side" class="close-side-btn" aria-label="Close menu">
        <i class="fas fa-times"></i>
      </button>
    `;

    // Bind menu item events
    menuItems.forEach(item => {
      sideMenu.querySelector(`#${item.id}`)?.addEventListener('click', item.action);
    });

    sideMenu.querySelector('#close-side')?.addEventListener('click', () => this.closeSideMenu());
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

  // Additional Features
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
              <img src="${artisan.photo || '../assets/avatar-placeholder.png'}" alt="${this.escapeHtml(artisan.name)}">
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
          this.openFavorites(); // Refresh
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
              <strong>Dark Mode</strong>
              <p class="muted">Toggle between light and dark themes</p>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <h4>Notifications</h4>
          <div class="setting-item">
            <label class="switch">
              <input type="checkbox" id="push-notifications" checked>
              <span class="slider"></span>
            </label>
            <div class="setting-label">
              <strong>Push Notifications</strong>
              <p class="muted">Receive booking and message alerts</p>
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

  // Analytics (Mock)
  trackEvent(eventName, properties = {}) {
    console.log('Analytics:', eventName, properties);
    // In a real app, this would send to analytics service
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

