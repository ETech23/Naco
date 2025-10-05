// 2. NAVIGATION COMPONENT (shared-header.js)
class NavigationHeader {
  constructor(currentPage) {
    this.currentPage = currentPage;
    this.user = AppUtils.getCurrentUser();
  }

  render() {
    const container = document.querySelector('#app-header');
    if (!container) return;

    const avatarUrl = this.user?.avatar || '../assets/avatar-placeholder.png';

    container.innerHTML = `
      <header class="app-header">
        <div class="header-left">
          ${this.currentPage !== 'index' ? `
            <button id="back-btn" class="icon-btn">
              <i class="fas fa-arrow-left"></i>
            </button>
          ` : ''}
          <h1 class="app-title">Naco</h1>
        </div>
        
        <div class="header-right">
          ${this.user ? `
            <button id="notif-btn" class="icon-btn">
              <i class="fas fa-bell"></i>
              <span id="notif-badge" class="badge hidden">0</span>
            </button>
            <button id="profile-btn" class="icon-btn">
              <img src="${avatarUrl}" alt="Profile" class="avatar-small">
            </button>
          ` : `
            <button id="login-btn" class="btn-primary">Login</button>
          `}
        </div>
      </header>
    `;

    this.bindEvents();
  }

  bindEvents() {
    document.querySelector('#back-btn')?.addEventListener('click', () => {
      const returnTo = sessionStorage.getItem('returnTo') || 'index.html';
      sessionStorage.removeItem('returnTo');
      window.location.href = returnTo;
    });

    document.querySelector('#profile-btn')?.addEventListener('click', () => {
      sessionStorage.setItem('returnTo', window.location.href);
      window.location.href = 'profile.html';
    });

    document.querySelector('#notif-btn')?.addEventListener('click', () => {
      sessionStorage.setItem('returnTo', window.location.href);
      window.location.href = 'notifications.html';
    });

    document.querySelector('#login-btn')?.addEventListener('click', () => {
      // Show login modal (keep modals for quick actions)
      app.openLoginModal();
    });
  }
}