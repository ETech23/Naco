class BookingsPage {
  constructor() {
    this.user = AppUtils.requireAuth();
    if (!this.user) return;

    this.init();
  }

  async init() {
    new NavigationHeader('bookings').render();
    await this.loadBookings();
    this.bindEvents();
  }

  async loadBookings() {
    const container = document.querySelector('.bookings-container');
    
    try {
      const allBookings = await API.getUserBookings();
      const myBookings = allBookings.filter(booking => {
        const userId = this.user.id || this.user._id;
        const bookerId = booking.bookerUserId || booking.client;
        const bookerIdStr = bookerId ? (bookerId._id || bookerId).toString() : '';
        return bookerIdStr === userId.toString();
      });

      if (myBookings.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-calendar-times"></i>
            <h3>No bookings yet</h3>
            <p>Start by booking an artisan!</p>
            <a href="index.html" class="btn-primary">Find Artisans</a>
          </div>
        `;
        return;
      }

      container.innerHTML = myBookings.map(booking => `
        <div class="booking-card" data-id="${booking._id || booking.id}">
          <div class="booking-header">
            <h3>${AppUtils.escapeHtml(booking.service)}</h3>
            <span class="status-badge status-${booking.status}">${(booking.status || 'pending').toUpperCase()}</span>
          </div>
          
          <div class="booking-info">
            <p><i class="fas fa-user"></i> ${AppUtils.escapeHtml(booking.artisan?.name || 'Unknown')}</p>
            <p><i class="fas fa-calendar"></i> ${new Date(booking.service_date || booking.date).toLocaleDateString()}</p>
            <p><i class="fas fa-clock"></i> ${booking.service_time || booking.time}</p>
            <p><i class="fas fa-map-marker-alt"></i> ${AppUtils.escapeHtml(booking.location || 'TBD')}</p>
            <p><i class="fas fa-money-bill"></i> ${AppUtils.formatCurrency(booking.amount || 0)}</p>
          </div>
          
          <div class="booking-actions">
            <button class="btn-primary view-details" data-id="${booking._id || booking.id}">
              View Details
            </button>
          </div>
        </div>
      `).join('');

    } catch (error) {
      console.error('Failed to load bookings:', error);
      AppUtils.showToast('Failed to load bookings', 'error');
    }
  }

  bindEvents() {
    document.querySelector('.bookings-container')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('view-details')) {
        const bookingId = e.target.dataset.id;
        sessionStorage.setItem('returnTo', window.location.href);
        window.location.href = `booking-detail.html?id=${bookingId}`;
      }
    });
  }
}

// Initialize bookings page
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new BookingsPage());
} else {
  new BookingsPage();
}