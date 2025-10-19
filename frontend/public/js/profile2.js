import * as API from './api.js';

class ProfilePage {
  constructor() {
    this.user = null;
    this.init();
  }

  async init() {
    try {
      // Load current user
      this.user = await API.getCurrentUser();
      
      if (!this.user) {
        // Redirect to login if not authenticated
        window.location.href = 'auth.html?return=' + encodeURIComponent(window.location.href);
        return;
      }

      this.renderProfile();
      this.bindEvents();
    } catch (error) {
      console.error('Profile initialization failed:', error);
      this.showError('Failed to load profile');
    }
  }

  async renderProfile() {
    // Set avatar with Node.js backend URL
    const avatarUrl = this.getAvatarUrl(this.user);
    document.getElementById('profile-avatar').src = avatarUrl;
    
    // Set basic info
    document.getElementById('profile-name').textContent = this.user.name || 'User';
    document.getElementById('profile-role').textContent = 
      this.user.role === 'artisan' ? 'Artisan' : 'Client';
    document.getElementById('profile-location').textContent = 
      this.user.location ? `📍 ${this.user.location}` : '';

    // Render stats
    await this.renderStats();

    // Render detailed info
    this.renderDetailedInfo();

    // Render action buttons
    this.renderActions();
  }

  getAvatarUrl(user) {
    if (!user) return '../assets/avatar-placeholder.png';
    
    // For Node.js backend with uploaded files
    if (user.avatar) {
      // If it's a full URL
      if (user.avatar.startsWith('http')) {
        return user.avatar;
      }
      // If it's a relative path from your uploads folder
      return `${API.getBaseUrl()}/uploads/avatars/${user.avatar}`;
    }
    
    return '../assets/avatar-placeholder.png';
  }

  async renderStats() {
    try {
      const bookings = await API.getUserBookings();
      const favorites = await API.getUserFavorites();

      const stats = {
        bookings: bookings.length,
        completed: bookings.filter(b => b.status === 'completed').length,
        favorites: favorites.length
      };

      document.getElementById('profile-stats').innerHTML = `
        <div class="stat-item">
          <span class="stat-number">${stats.bookings}</span>
          <span class="stat-label">${this.user.role === 'artisan' ? 'Jobs' : 'Bookings'}</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${stats.completed}</span>
          <span class="stat-label">Completed</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${stats.favorites}</span>
          <span class="stat-label">Favorites</span>
        </div>
      `;
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  renderDetailedInfo() {
    const infoHtml = `
      <div class="info-section">
        <h3>Contact Information</h3>
        <div class="info-item">
          <i class="fas fa-envelope"></i>
          <span>${this.user.email || 'Not provided'}</span>
        </div>
        <div class="info-item">
          <i class="fas fa-phone"></i>
          <span>${this.user.phone || 'Not provided'}</span>
        </div>
      </div>

      ${this.user.role === 'artisan' ? `
        <div class="info-section">
          <h3>Professional Details</h3>
          <div class="info-item">
            <i class="fas fa-wrench"></i>
            <span>${this.user.skill || 'Not specified'}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-clock"></i>
            <span>${this.user.years_experience || 0} years experience</span>
          </div>
          <div class="info-item">
            <i class="fas fa-money-bill"></i>
            <span>₦${this.user.rate || 0} per service</span>
          </div>
        </div>

        ${this.user.about ? `
          <div class="info-section">
            <h3>About</h3>
            <p>${this.escapeHtml(this.user.about)}</p>
          </div>
        ` : ''}

        ${this.user.specialties && this.user.specialties.length > 0 ? `
          <div class="info-section">
            <h3>Specialties</h3>
            <div class="specialties-list">
              ${this.user.specialties.map(s => `<span class="specialty-tag">${this.escapeHtml(s)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      ` : ''}
    `;

    document.getElementById('profile-info').innerHTML = infoHtml;
  }

  renderActions() {
    const actionsHtml = `
      <button id="logout-btn" class="btn-danger">
        <i class="fas fa-sign-out-alt"></i> Logout
      </button>
    `;

    document.getElementById('profile-actions').innerHTML = actionsHtml;
  }

  bindEvents() {
    // Back button
    document.getElementById('back-btn')?.addEventListener('click', () => {
      window.history.back();
    });

    // Edit button
    document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
      this.openEditModal();
    });

    // Logout button
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      this.handleLogout();
    });
  }

  openEditModal() {
    const modal = document.getElementById('edit-modal');
    const form = document.getElementById('edit-profile-form');

    form.innerHTML = `
      <!-- Profile Picture -->
      <div class="form-group profile-pic-group">
        <label>Profile Picture</label>
        <div class="pic-upload-container">
          <img id="preview-avatar" src="${this.getAvatarUrl(this.user)}" alt="Preview" class="pic-preview">
          <label for="avatar-upload" class="upload-label">
            <i class="fas fa-camera"></i>
            <span>Change Photo</span>
          </label>
          <input type="file" id="avatar-upload" accept="image/*" style="display: none;">
        </div>
      </div>

      <!-- Basic Info -->
      <div class="form-group">
        <label for="edit-name">Full Name *</label>
        <input type="text" id="edit-name" value="${this.escapeHtml(this.user.name || '')}" required>
      </div>

      <div class="form-group">
        <label for="edit-email">Email *</label>
        <input type="email" id="edit-email" value="${this.escapeHtml(this.user.email || '')}" required>
      </div>

      <div class="form-group">
        <label for="edit-phone">Phone (WhatsApp)</label>
        <input type="tel" id="edit-phone" value="${this.escapeHtml(this.user.phone || '')}" placeholder="08012345678">
      </div>

      <div class="form-group">
        <label for="edit-location">Location *</label>
        <input type="text" id="edit-location" value="${this.escapeHtml(this.user.location || '')}" required>
      </div>

      ${this.user.role === 'artisan' ? `
        <!-- Artisan Fields -->
        <div class="form-group">
          <label for="edit-skill">Skill/Service *</label>
          <input type="text" id="edit-skill" value="${this.escapeHtml(this.user.skill || '')}" required>
        </div>

        <div class="form-group">
          <label for="edit-experience">Years of Experience *</label>
          <input type="number" id="edit-experience" value="${this.user.years_experience || 0}" min="0" required>
        </div>

        <div class="form-group">
          <label for="edit-rate">Service Rate (₦)</label>
          <input type="number" id="edit-rate" value="${this.user.rate || 0}" min="0" step="500">
        </div>

        <div class="form-group">
          <label for="edit-about">About *</label>
          <textarea id="edit-about" rows="4" required>${this.escapeHtml(this.user.about || '')}</textarea>
        </div>

        <div class="form-group">
          <label for="edit-specialties">Specialties (comma-separated)</label>
          <input type="text" id="edit-specialties" value="${(this.user.specialties || []).join(', ')}">
        </div>
      ` : ''}

      <div class="form-actions">
        <button type="submit" class="btn-primary">
          <i class="fas fa-save"></i> Save Changes
        </button>
        <button type="button" class="btn-secondary cancel-btn">Cancel</button>
      </div>
    `;

    // Show modal
    modal.classList.remove('hidden');

    // Bind modal events
    this.bindModalEvents(modal, form);
  }

  bindModalEvents(modal, form) {
    // Avatar preview
    const avatarInput = document.getElementById('avatar-upload');
    const previewImg = document.getElementById('preview-avatar');

    avatarInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          previewImg.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleProfileUpdate(form);
    });

    // Close modal
    modal.querySelector('.modal-close')?.addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    modal.querySelector('.cancel-btn')?.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  async handleProfileUpdate(form) {
    try {
      const formData = new FormData();

      // Add text fields
      formData.append('name', document.getElementById('edit-name').value);
      formData.append('email', document.getElementById('edit-email').value);
      formData.append('phone', document.getElementById('edit-phone').value);
      formData.append('location', document.getElementById('edit-location').value);

      if (this.user.role === 'artisan') {
        formData.append('skill', document.getElementById('edit-skill').value);
        formData.append('years_experience', document.getElementById('edit-experience').value);
        formData.append('rate', document.getElementById('edit-rate').value);
        formData.append('about', document.getElementById('edit-about').value);
        
        const specialties = document.getElementById('edit-specialties').value
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        formData.append('specialties', JSON.stringify(specialties));
      }

      // Add avatar file if selected
      const avatarFile = document.getElementById('avatar-upload').files[0];
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      // Update via API
      const updatedUser = await API.updateUserProfile(this.user.id, formData);
      
      this.user = updatedUser;
      localStorage.setItem('userData', JSON.stringify(updatedUser));

      // Close modal and refresh
      document.getElementById('edit-modal').classList.add('hidden');
      await this.renderProfile();
      
      this.showToast('Profile updated successfully!', 'success');

    } catch (error) {
      console.error('Profile update failed:', error);
      this.showToast('Failed to update profile', 'error');
    }
  }

  handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
      API.logout();
      window.location.href = 'index.html';
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showToast(message, type) {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
  }

  showError(message) {
    document.querySelector('.profile-content').innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-circle"></i>
        <p>${message}</p>
        <button onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}

// Initialize
new ProfilePage();