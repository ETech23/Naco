// Minimal NativeAppRouter (self-contained)
class NativeAppRouter {
  constructor() {
    this.routes = {};
    this.history = [];
  }

  registerRoute(name, callback) {
    this.routes[name] = callback;
  }

  navigateTo(name, data = {}, pushHistory = true) {
    if (this.routes[name]) {
      const container = document.querySelector('#app .main');
      if (!container) {
        console.error("App container not found!");
        return;
      }
      if (pushHistory) this.history.push({ name, data });
      this.routes[name](container, data);
    }
  }

  goBack() {
    this.history.pop();
    const prev = this.history[this.history.length - 1];
    if (prev) this.navigateTo(prev.name, prev.data, false);
  }
}

// Main NativeApp
class NativeApp {
  constructor() {
    this.router = new NativeAppRouter();
    this.state = {
      user: null,
      artisans: [],
      bookings: [],
      favorites: new Set()
    };
    this.setupRoutes();
    this.initialize();
  }

  setupRoutes() {
    this.router.registerRoute('home', this.renderHomePage.bind(this));
    this.router.registerRoute('search', this.renderSearchPage.bind(this));
    this.router.registerRoute('artisan-profile', this.renderArtisanProfile.bind(this));
    this.router.registerRoute('bookings', this.renderBookingsPage.bind(this));
    this.router.registerRoute('profile', this.renderProfilePage.bind(this));
    this.router.registerRoute('notifications', this.renderNotificationsPage.bind(this));
  }

  initialize() {
    window.appRouter = this.router;
    window.app = this;
    
    const initialRoute = window.location.hash.slice(1) || 'home';
    this.router.navigateTo(initialRoute, {}, false);
  }

  renderHomePage(container, data) {
    container.innerHTML = `
      <div class="native-header">
        <div class="header-left">
          <img src="../assets/naco.png" alt="Naco" class="brand-icon" style="height: 32px;">
        </div>
        <div class="header-center">
          <h1 class="header-title">Naco</h1>
        </div>
        <div class="header-right">
          <button class="header-action-btn" onclick="window.appRouter.navigateTo('notifications')">
            <i class="fas fa-bell"></i>
          </button>
        </div>
      </div>
      <div class="page-content">
        <section class="hero card">
          <div class="hero-info">
            <h1>Find trusted artisans & professionals near you</h1>
            <p class="muted">Quickly connect with verified craftsmen in your city.</p>
            <div id="quick-cats" class="chips"></div>
          </div>
        </section>

        <section class="section">
          <div class="section-head">
            <h2>Featured Artisans</h2>
            <button class="link-btn" onclick="window.appRouter.navigateTo('search')">View all</button>
          </div>
          <div id="featured-list" class="list horizontal"></div>
        </section>

        <section class="section">
          <div class="section-head">
            <h2>Search Results</h2>
          </div>
          <div id="results-list" class="list grid"></div>
        </section>
      </div>
    `;
    
    this.bindHomeEvents?.();
  }

  renderSearchPage(container, data) {
    container.innerHTML = `
      <div class="native-header">
        <div class="header-left">
          <button class="back-button" onclick="window.appRouter.goBack()">
            <i class="fas fa-chevron-left"></i>
            <span>Back</span>
          </button>
        </div>
        <div class="header-center">
          <h1 class="header-title">Search</h1>
        </div>
        <div class="header-right"></div>
      </div>
      <div class="page-content">
        <div class="search-form">
          <div class="search-input-container">
            <i class="fas fa-search"></i>
            <input id="main-search-input" placeholder="Search for artisans, services..." autofocus>
            <button id="clear-search" class="clear-btn hidden">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <select id="search-city-select" class="city-select">
            <option value="">All Cities</option>
          </select>
        </div>
        
        <div class="search-suggestions">
          <h3>Popular Searches</h3>
          <div id="search-quick-cats" class="search-chips"></div>
        </div>
        
        <div id="search-results-container" class="search-results">
          <div id="search-results-list" class="results-grid"></div>
        </div>
      </div>
    `;
    
    this.bindSearchEvents?.();
  }

  renderArtisanProfile(container, data) {
    const artisanId = data.artisanId;
    container.innerHTML = `
      <div class="native-header">
        <div class="header-left">
          <button class="back-button" onclick="window.appRouter.goBack()">
            <i class="fas fa-chevron-left"></i>
            <span>Back</span>
          </button>
        </div>
        <div class="header-center">
          <h1 class="header-title">Artisan Profile</h1>
        </div>
        <div class="header-right"></div>
      </div>
      <div class="page-content">
        <div id="artisan-profile-content">
          Loading artisan details...
        </div>
      </div>
    `;
    
    this.loadAndDisplayArtisanProfile?.(artisanId);
  }

  renderProfilePage(container, data) {
    container.innerHTML = `
      <div class="native-header">
        <div class="header-left"></div>
        <div class="header-center">
          <h1 class="header-title">Profile</h1>
        </div>
        <div class="header-right">
          <button class="header-action-btn" onclick="window.app.editProfile?.()">
            <i class="fas fa-edit"></i>
          </button>
        </div>
      </div>
      <div class="page-content">
        <div id="profile-content"></div>
      </div>
    `;
    
    this.loadUserProfile?.();
  }

  renderBookingsPage(container, data) {
    container.innerHTML = `
      <div class="native-header">
        <div class="header-left"></div>
        <div class="header-center">
          <h1 class="header-title">My Bookings</h1>
        </div>
        <div class="header-right"></div>
      </div>
      <div class="page-content">
        <div id="bookings-content">Loading bookings...</div>
      </div>
    `;
    
    this.loadUserBookings?.();
  }

  renderNotificationsPage(container, data) {
    container.innerHTML = `
      <div class="native-header">
        <div class="header-left">
          <button class="back-button" onclick="window.appRouter.goBack()">
            <i class="fas fa-chevron-left"></i>
            <span>Back</span>
          </button>
        </div>
        <div class="header-center">
          <h1 class="header-title">Notifications</h1>
        </div>
        <div class="header-right">
          <button class="header-action-btn" onclick="window.app.markAllNotificationsRead?.()">
            <i class="fas fa-check-double"></i>
          </button>
        </div>
      </div>
      <div class="page-content">
        <div id="notifications-content">Loading notifications...</div>
      </div>
    `;
    
    this.loadNotifications?.();
  }

  openArtisanProfile(artisanId) {
    window.appRouter.navigateTo('artisan-profile', { artisanId });
  }

  openSearchPage() {
    window.appRouter.navigateTo('search');
  }
}

// Tab navigation helper
function navigateToTab(route) {
  window.appRouter.navigateTo(route);
}

// Global loading helpers
function showLoading(text = 'Loading...') {
  const loading = document.getElementById('native-loading');
  if (loading) {
    loading.querySelector('.loading-text').textContent = text;
    loading.style.display = 'flex';
  }
}

function hideLoading() {
  const loading = document.getElementById('native-loading');
  if (loading) loading.style.display = 'none';
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new NativeApp();
});