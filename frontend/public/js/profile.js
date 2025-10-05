console.log('Profile.js loading...');

const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8091'
  : 'https://your-production-domain.com';

// Utility Functions
const AppUtils = {
  getCurrentUser() {
    const userData = localStorage.getItem('userData');
    const token = localStorage.getItem('authToken');
    
    console.log('Checking auth - Token exists:', !!token, 'User data exists:', !!userData);
    
    if (!token || !userData) {
      console.log('No authentication found');
      return null;
    }
    
    try {
      const user = JSON.parse(userData);
      console.log('User loaded from localStorage:', user);
      return user;
    } catch (error) {
      console.error('Failed to parse user data:', error);
      return null;
    }
  },

  requireAuth() {
    const user = this.getCurrentUser();
    if (!user) {
      console.log('User not authenticated, redirecting to auth.html');
      sessionStorage.setItem('returnTo', window.location.href);
      window.location.href = 'auth.html';
      return null;
    }
    return user;
  },

  saveUser(user) {
    localStorage.setItem('userData', JSON.stringify(user));
    console.log('User saved to localStorage');
  },

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = 'index.html';
  },

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-weight: 500;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount || 0);
  }
};

// API Client
const API = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: { ...headers, ...options.headers }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  async getUserBookings() {
    try {
      return await this.request('/bookings');
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      return [];
    }
  },

  async getUserFavorites() {
    try {
      return await this.request('/favorites');
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
      return [];
    }
  },

  async switchUserRole(userId, newRole) {
    return await this.request(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ newRole })
    });
  },

  async updateUserProfile(userId, updates) {
    return await this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async uploadAvatar(userId, file) {
    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('photo', file);

    const response = await fetch(`${API_URL}/users/${userId}/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload avatar');
    }

    return await response.json();
  }
};

// Profile Page Class
class ProfilePage {
  constructor() {
    console.log('ProfilePage initializing...');
    
    this.user = AppUtils.requireAuth();
    if (!this.user) {
      console.log('Auth check failed, stopping initialization');
      return;
    }

    console.log('User authenticated:', this.user.name);
    this.init();
  }

  async init() {
    this.setupBackButton();
    await this.loadProfile();
    this.bindEvents();
  }

  setupBackButton() {
    const backBtn = document.querySelector('#back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
      });
    }
  }

  async loadProfile() {
    const container = document.querySelector('.profile-container');
    
    if (!container) {
      console.error('Profile container not found!');
      return;
    }

    console.log('Loading profile data...');

    // Show loading
    container.innerHTML = '<div style="text-align: center; padding: 40px;"><p>Loading profile...</p></div>';

    try {
      // Load stats
      console.log('Fetching bookings and favorites...');
      const [bookings, favorites] = await Promise.all([
        API.getUserBookings(),
        API.getUserFavorites()
      ]);

      console.log('Bookings:', bookings.length, 'Favorites:', favorites.length);

      const totalBookings = bookings.length;
      const completedJobs = bookings.filter(b => b.status === 'completed').length;
      const favoritesCount = favorites.length;

      const avatarUrl = this.user?.avatar 
        ? `${API_URL}/uploads/${this.user.avatar}`
        : '../assets/avatar-placeholder.png';

      container.innerHTML = `
        <div class="profile-header" style="text-align: center; padding: 30px; background: white; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="position: relative; width: 100px; height: 100px; margin: 0 auto 15px;">
            <img id="profile-avatar" src="${avatarUrl}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 3px solid #3b82f6;">
            <button id="edit-avatar-btn" style="position: absolute; bottom: 0; right: 0; background: #3b82f6; color: white; border: 2px solid white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
              <i class="fas fa-camera" style="font-size: 12px;"></i>
            </button>
            <input type="file" id="avatar-upload" accept="image/*" style="display: none;">
          </div>
          
          <h2 style="margin: 0 0 5px 0; font-size: 24px;">${AppUtils.escapeHtml(this.user.name)}</h2>
          <p style="color: #666; margin: 0 0 10px 0; font-size: 16px;">${this.user.role === 'artisan' ? '🔧 Artisan' : '👤 Client'}</p>
          
          <button id="edit-profile-btn" style="margin-top: 10px; padding: 8px 20px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer; font-size: 14px;">
            <i class="fas fa-edit"></i> Edit Profile
          </button>
          
          <div style="display: flex; justify-content: space-around; margin-top: 25px; padding: 20px; background: #f9fafb; border-radius: 8px;">
            <div style="text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: #1f2937;">${totalBookings}</div>
              <div style="font-size: 13px; color: #666; margin-top: 5px; text-transform: uppercase;">${this.user.role === 'artisan' ? 'Jobs' : 'Bookings'}</div>
            </div>
            <div style="border-left: 1px solid #e5e7eb;"></div>
            <div style="text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: #10b981;">${completedJobs}</div>
              <div style="font-size: 13px; color: #666; margin-top: 5px; text-transform: uppercase;">Completed</div>
            </div>
            <div style="border-left: 1px solid #e5e7eb;"></div>
            <div style="text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: #ef4444;">${favoritesCount}</div>
              <div style="font-size: 13px; color: #666; margin-top: 5px; text-transform: uppercase;">Favorites</div>
            </div>
          </div>
        </div>

        <div class="profile-menu" style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div class="menu-item" id="role-switch-item" style="display: flex; align-items: center; padding: 16px; border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: background 0.2s;">
            <i class="fas fa-sync-alt" style="width: 40px; font-size: 18px; color: #6b7280;"></i>
            <span style="flex: 1; font-size: 15px;">Switch to ${this.user.role === 'artisan' ? 'Client' : 'Artisan'} Mode</span>
            <label style="position: relative; display: inline-block; width: 52px; height: 28px;">
              <input type="checkbox" id="role-toggle" ${this.user.role === 'artisan' ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
              <span class="toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: ${this.user.role === 'artisan' ? '#3b82f6' : '#ccc'}; transition: .3s; border-radius: 28px;">
                <span class="toggle-knob" style="position: absolute; content: ''; height: 20px; width: 20px; left: ${this.user.role === 'artisan' ? '28px' : '4px'}; bottom: 4px; background: white; transition: .3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
              </span>
            </label>
          </div>

          <a href="bookings.html" class="menu-item" style="display: flex; align-items: center; padding: 16px; border-bottom: 1px solid #f3f4f6; text-decoration: none; color: inherit; transition: background 0.2s;">
            <i class="fas fa-calendar" style="width: 40px; font-size: 18px; color: #6b7280;"></i>
            <span style="flex: 1; font-size: 15px;">My Bookings</span>
            <i class="fas fa-chevron-right" style="color: #d1d5db;"></i>
          </a>

          <a href="favorites.html" class="menu-item" style="display: flex; align-items: center; padding: 16px; border-bottom: 1px solid #f3f4f6; text-decoration: none; color: inherit; transition: background 0.2s;">
            <i class="fas fa-heart" style="width: 40px; font-size: 18px; color: #6b7280;"></i>
            <span style="flex: 1; font-size: 15px;">Favorites</span>
            <i class="fas fa-chevron-right" style="color: #d1d5db;"></i>
          </a>

          ${this.user.role === 'artisan' ? `
            <a href="clients.html" class="menu-item" style="display: flex; align-items: center; padding: 16px; border-bottom: 1px solid #f3f4f6; text-decoration: none; color: inherit; transition: background 0.2s;">
              <i class="fas fa-users" style="width: 40px; font-size: 18px; color: #6b7280;"></i>
              <span style="flex: 1; font-size: 15px;">My Clients</span>
              <i class="fas fa-chevron-right" style="color: #d1d5db;"></i>
            </a>
          ` : ''}

          <a href="settings.html" class="menu-item" style="display: flex; align-items: center; padding: 16px; border-bottom: 1px solid #f3f4f6; text-decoration: none; color: inherit; transition: background 0.2s;">
            <i class="fas fa-cog" style="width: 40px; font-size: 18px; color: #6b7280;"></i>
            <span style="flex: 1; font-size: 15px;">Settings</span>
            <i class="fas fa-chevron-right" style="color: #d1d5db;"></i>
          </a>

          <div class="menu-item" id="toggle-theme" style="display: flex; align-items: center; padding: 16px; border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: background 0.2s;">
            <i class="fas fa-moon" style="width: 40px; font-size: 18px; color: #6b7280;"></i>
            <span style="flex: 1; font-size: 15px;">Dark Mode</span>
            <i class="fas fa-chevron-right" style="color: #d1d5db;"></i>
          </div>

          <div class="menu-item" id="logout-btn" style="display: flex; align-items: center; padding: 16px; cursor: pointer; color: #ef4444; transition: background 0.2s;">
            <i class="fas fa-sign-out-alt" style="width: 40px; font-size: 18px;"></i>
            <span style="flex: 1; font-size: 15px;">Logout</span>
          </div>
        </div>
      `;

      console.log('Profile rendered successfully');

    } catch (error) {
      console.error('Failed to load profile:', error);
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; background: white; border-radius: 12px;">
          <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ef4444; margin-bottom: 15px;"></i>
          <h3 style="color: #ef4444; margin: 0 0 10px 0;">Failed to Load Profile</h3>
          <p style="color: #666;">${error.message}</p>
          <button onclick="window.location.reload()" style="margin-top: 15px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
            Try Again
          </button>
        </div>
      `;
    }
  }

  bindEvents() {
    console.log('Binding events...');

    // Hover effects for menu items
    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('mouseenter', (e) => {
        if (e.target.id !== 'logout-btn') {
          e.target.style.background = '#f9fafb';
        } else {
          e.target.style.background = '#fee2e2';
        }
      });
      item.addEventListener('mouseleave', (e) => {
        e.target.style.background = '';
      });
    });

    // Avatar upload
    const editAvatarBtn = document.querySelector('#edit-avatar-btn');
    const avatarUpload = document.querySelector('#avatar-upload');
    const profileAvatar = document.querySelector('#profile-avatar');

    if (editAvatarBtn && avatarUpload) {
      editAvatarBtn.addEventListener('click', () => {
        avatarUpload.click();
      });

      avatarUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            // Show preview immediately
            const reader = new FileReader();
            reader.onload = (event) => {
              profileAvatar.src = event.target.result;
            };
            reader.readAsDataURL(file);

            // Upload to server
            AppUtils.showToast('Uploading avatar...', 'info');
            const updatedUser = await API.uploadAvatar(this.user.id, file);
            AppUtils.saveUser(updatedUser);
            AppUtils.showToast('Avatar updated successfully', 'success');
          } catch (error) {
            console.error('Avatar upload failed:', error);
            AppUtils.showToast('Failed to upload avatar', 'error');
            profileAvatar.src = this.user?.avatar 
              ? `${API_URL}/uploads/${this.user.avatar}`
              : '../assets/avatar-placeholder.png';
          }
        }
      });
    }

    // Role switch
    const roleToggle = document.querySelector('#role-toggle');
    const roleSwitchItem = document.querySelector('#role-switch-item');
    
    if (roleToggle && roleSwitchItem) {
      const handleRoleSwitch = async () => {
        const newRole = roleToggle.checked ? 'artisan' : 'client';
        console.log('Switching role to:', newRole);
        
        try {
          const toggleSlider = document.querySelector('.toggle-slider');
          const toggleKnob = document.querySelector('.toggle-knob');
          
          roleToggle.disabled = true;
          roleSwitchItem.style.opacity = '0.6';
          
          const updatedUser = await API.switchUserRole(this.user.id, newRole);
          
          // Update localStorage
          AppUtils.saveUser(updatedUser);
          
          AppUtils.showToast(`Switched to ${newRole} mode`, 'success');
          
          // Reload page after 1 second
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          
        } catch (error) {
          console.error('Role switch failed:', error);
          AppUtils.showToast(`Failed to switch role: ${error.message}`, 'error');
          
          // Revert toggle
          roleToggle.checked = !roleToggle.checked;
          roleToggle.disabled = false;
          roleSwitchItem.style.opacity = '1';
          
          // Update slider visually
          const toggleSlider = document.querySelector('.toggle-slider');
          const toggleKnob = document.querySelector('.toggle-knob');
          if (toggleSlider && toggleKnob) {
            toggleSlider.style.background = roleToggle.checked ? '#3b82f6' : '#ccc';
            toggleKnob.style.left = roleToggle.checked ? '28px' : '4px';
          }
        }
      };

      roleToggle.addEventListener('change', handleRoleSwitch);
      
      roleSwitchItem.addEventListener('click', (e) => {
        // Don't trigger if clicking directly on toggle or slider
        if (e.target !== roleToggle && !e.target.closest('.toggle-slider')) {
          roleToggle.checked = !roleToggle.checked;
          handleRoleSwitch();
        }
      });
    }

    // Edit profile
    document.querySelector('#edit-profile-btn')?.addEventListener('click', () => {
      this.openEditProfileModal();
    });

    // Theme toggle
    document.querySelector('#toggle-theme')?.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      const theme = document.body.classList.contains('dark') ? 'dark' : 'light';
      localStorage.setItem('theme', theme);
      AppUtils.showToast('Theme updated', 'success');
    });

    // Logout
    document.querySelector('#logout-btn')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to logout?')) {
        console.log('Logging out...');
        AppUtils.logout();
      }
    });
  }

  openEditProfileModal() {
    const overlay = document.createElement('div');
    overlay.id = 'edit-profile-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.2s ease;
    `;

    const isVerified = this.user.verified || false;

    overlay.innerHTML = `
      <div style="background: white; border-radius: 12px; padding: 30px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
          <h2 style="margin: 0; font-size: 22px;">Edit Profile</h2>
          <button id="close-modal-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.2s;">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px;">Name ${isVerified ? '<span style="color: #666; font-weight: normal;">(Verified - Cannot Edit)</span>' : ''}</label>
          <input id="edit-name" type="text" value="${AppUtils.escapeHtml(this.user.name)}" ${isVerified ? 'disabled' : ''} style="width: 100%; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 15px; ${isVerified ? 'background: #f9fafb; color: #9ca3af;' : ''}">
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px;">Email ${isVerified ? '<span style="color: #666; font-weight: normal;">(Verified - Cannot Edit)</span>' : ''}</label>
          <input id="edit-email" type="email" value="${AppUtils.escapeHtml(this.user.email || '')}" ${isVerified ? 'disabled' : ''} style="width: 100%; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 15px; ${isVerified ? 'background: #f9fafb; color: #9ca3af;' : ''}">
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px;">Phone</label>
          <input id="edit-phone" type="tel" value="${AppUtils.escapeHtml(this.user.phone || '')}" placeholder="08012345678" style="width: 100%; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 15px;">
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px;">Location</label>
          <input id="edit-location" type="text" value="${AppUtils.escapeHtml(this.user.location || '')}" placeholder="Lagos, Nigeria" style="width: 100%; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 15px;">
        </div>

        ${this.user.role === 'artisan' ? `
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px;">Skill/Service</label>
            <input id="edit-skill" type="text" value="${AppUtils.escapeHtml(this.user.skill || '')}" placeholder="e.g. Electrician, Plumber" style="width: 100%; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 15px;">
          </div>

          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px;">About</label>
            <textarea id="edit-about" rows="3" placeholder="Tell clients about yourself..." style="width: 100%; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 15px; resize: vertical;">${AppUtils.escapeHtml(this.user.about || '')}</textarea>
          </div>
        ` : ''}

        <div style="display: flex; gap: 12px; margin-top: 30px;">
          <button id="save-profile-btn" style="flex: 1; padding: 14px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 500; transition: background 0.2s;">
            <i class="fas fa-save"></i> Save Changes
          </button>
          <button id="cancel-edit-btn" style="padding: 14px 24px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; font-size: 15px; transition: background 0.2s;">
            Cancel
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Bind modal events
    const closeModal = () => overlay.remove();

    overlay.querySelector('#close-modal-btn').addEventListener('click', closeModal);
    overlay.querySelector('#cancel-edit-btn').addEventListener('click', closeModal);

    // Hover effects for buttons
    overlay.querySelector('#close-modal-btn').addEventListener('mouseenter', (e) => {
      e.target.style.background = '#f3f4f6';
    });
    overlay.querySelector('#close-modal-btn').addEventListener('mouseleave', (e) => {
      e.target.style.background = '';
    });

    overlay.querySelector('#save-profile-btn').addEventListener('mouseenter', (e) => {
      e.target.style.background = '#2563eb';
    });
    overlay.querySelector('#save-profile-btn').addEventListener('mouseleave', (e) => {
      e.target.style.background = '#3b82f6';
    });

    overlay.querySelector('#cancel-edit-btn').addEventListener('mouseenter', (e) => {
      e.target.style.background = '#e5e7eb';
    });
    overlay.querySelector('#cancel-edit-btn').addEventListener('mouseleave', (e) => {
      e.target.style.background = '#f3f4f6';
    });

    overlay.querySelector('#save-profile-btn').addEventListener('click', async () => {
      const updates = {
        phone: overlay.querySelector('#edit-phone').value,
        location: overlay.querySelector('#edit-location').value
      };

      // Only add name and email if not verified
      if (!isVerified) {
        updates.name = overlay.querySelector('#edit-name').value;
        updates.email = overlay.querySelector('#edit-email').value;
      }

      // Add artisan-specific fields
      if (this.user.role === 'artisan') {
        updates.skill = overlay.querySelector('#edit-skill').value;
        updates.about = overlay.querySelector('#edit-about').value;
      }

      try {
        overlay.querySelector('#save-profile-btn').disabled = true;
        overlay.querySelector('#save-profile-btn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const updatedUser = await API.updateUserProfile(this.user.id, updates);
        AppUtils.saveUser(updatedUser);
        AppUtils.showToast('Profile updated successfully', 'success');
        closeModal();
        
        // Reload to show updated info
        setTimeout(() => window.location.reload(), 500);
      } catch (error) {
        console.error('Profile update failed:', error);
        AppUtils.showToast(`Failed to update profile: ${error.message}`, 'error');
        overlay.querySelector('#save-profile-btn').disabled = false;
        overlay.querySelector('#save-profile-btn').innerHTML = '<i class="fas fa-save"></i> Save Changes';
      }
    });

    // Close on overlay click (not modal content)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });
  }
}

// Initialize
console.log('Document ready state:', document.readyState);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing ProfilePage');
    new ProfilePage();
  });
} else {
  console.log('DOM already loaded, initializing ProfilePage immediately');
  new ProfilePage();
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideIn {
    from { 
      opacity: 0;
      transform: translateY(-20px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideOut {
    from { 
      opacity: 1;
      transform: translateY(0);
    }
    to { 
      opacity: 0;
      transform: translateY(-20px);
    }
  }
`;
document.head.appendChild(style);