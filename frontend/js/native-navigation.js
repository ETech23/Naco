// MINIMAL NATIVE NAVIGATION OVERLAY
// Add this to your existing app without changing current structure

// 1. Add this single script to your HTML (after your existing scripts)
class MinimalNativeNavigation {
  constructor() {
    this.navigationStack = [];
    this.currentPage = 'home';
    this.initializeNativeBehaviors();
  }

  initializeNativeBehaviors() {
    // Override browser back button
    window.addEventListener('popstate', (e) => {
      e.preventDefault();
      this.handleBackButton();
    });

    // Add swipe gestures for back navigation
    this.addSwipeGestures();

    // Prevent native browser behaviors that break app feel
    this.preventNativeBrowserBehaviors();

    // Track page navigation
    this.trackPageNavigation();

    // Initialize with current state
    this.pushToStack('home');
  }

  handleBackButton() {
    // Check if modal is open first
    if (document.querySelector('.modal-overlay')) {
      this.closeTopModal();
      return;
    }

    // Check if full-page is open
    const openPage = document.querySelector('.full-page:not(.hidden)');
    if (openPage && openPage.id !== 'app') {
      this.goBackFromPage();
      return;
    }

    // If on home page, show exit confirmation
    if (this.navigationStack.length <= 1) {
      if (confirm('Exit app?')) {
        window.close();
      }
      return;
    }

    // Go back in navigation stack
    this.goBack();
  }

  pushToStack(page) {
    // Remove any pages after current position (for when user goes back then navigates forward)
    const currentIndex = this.navigationStack.indexOf(this.currentPage);
    if (currentIndex >= 0) {
      this.navigationStack = this.navigationStack.slice(0, currentIndex + 1);
    }
    
    if (this.navigationStack[this.navigationStack.length - 1] !== page) {
      this.navigationStack.push(page);
    }
    this.currentPage = page;

    // Update browser history
    history.pushState({ page }, '', `#${page}`);
  }

  goBack() {
    if (this.navigationStack.length > 1) {
      this.navigationStack.pop();
      const previousPage = this.navigationStack[this.navigationStack.length - 1];
      this.navigateToPage(previousPage, false); // false = don't add to stack
    }
  }

  goBackFromPage() {
    // Find currently open page and close it
    const openPage = document.querySelector('.full-page:not(.hidden)');
    if (openPage) {
      this.closePageWithTransition(openPage);
    }
  }

  navigateToPage(pageId, addToStack = true) {
    const page = document.getElementById(pageId);
    if (!page) return;

    if (addToStack) {
      this.pushToStack(pageId);
    }

    // Close any other open pages first
    document.querySelectorAll('.full-page:not(.hidden)').forEach(p => {
      if (p.id !== pageId) {
        p.classList.add('hidden');
      }
    });

    // Show the target page with transition
    this.showPageWithTransition(page);
    this.currentPage = pageId;
  }

  showPageWithTransition(page) {
    // Add native-style slide transition
    page.style.transform = 'translateX(100%)';
    page.classList.remove('hidden');
    
    // Force reflow
    page.offsetHeight;
    
    page.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
    page.style.transform = 'translateX(0)';
    
    // Cleanup after transition
    setTimeout(() => {
      page.style.transition = '';
      page.style.transform = '';
    }, 300);
  }

  closePageWithTransition(page) {
    page.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
    page.style.transform = 'translateX(100%)';
    
    setTimeout(() => {
      page.classList.add('hidden');
      page.style.transition = '';
      page.style.transform = '';
    }, 300);

    // Update navigation state
    this.goBack();
  }

  closeTopModal() {
    const modals = document.querySelectorAll('.modal-overlay');
    if (modals.length > 0) {
      const topModal = modals[modals.length - 1];
      // Add slide down animation for modal
      topModal.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
      topModal.style.transform = 'translateY(100%)';
      topModal.style.opacity = '0';
      
      setTimeout(() => {
        topModal.remove();
        if (document.querySelectorAll('.modal-overlay').length === 0) {
          document.body.style.overflow = '';
        }
      }, 300);
    }
  }

  addSwipeGestures() {
    let startX = null;
    let startY = null;
    
    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    });

    document.addEventListener('touchmove', (e) => {
      if (!startX || !startY) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      // iOS-style edge swipe from left edge
      if (startX < 50 && deltaX > 100 && Math.abs(deltaY) < 100) {
        e.preventDefault();
        this.handleBackButton();
      }
    });

    document.addEventListener('touchend', () => {
      startX = null;
      startY = null;
    });
  }

  preventNativeBrowserBehaviors() {
    // Prevent pull-to-refresh
    let preventDefault = false;
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        preventDefault = true;
      }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      if (preventDefault) {
        e.preventDefault();
      }
    }, { passive: false });

    document.addEventListener('touchend', () => {
      preventDefault = false;
    });

    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  }

  trackPageNavigation() {
    // Override your existing page opening functions
    const originalFunctions = {};

    // Store original functions
    if (window.openSearchPage) {
      originalFunctions.openSearchPage = window.openSearchPage;
      window.openSearchPage = () => {
        this.navigateToPage('search-page');
      };
    }

    if (window.openNotificationsPage) {
      originalFunctions.openNotificationsPage = window.openNotificationsPage;
      window.openNotificationsPage = () => {
        this.navigateToPage('notifications-page');
      };
    }

    if (window.openProfilePage) {
      originalFunctions.openProfilePage = window.openProfilePage;
      window.openProfilePage = () => {
        this.navigateToPage('profile-page');
      };
    }

    // Override click handlers for existing buttons
    this.overrideExistingHandlers();
  }

  overrideExistingHandlers() {
    // Override search input click
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateToPage('search-page');
      });
    }

    // Override notification button
    const notifBtn = document.getElementById('notif-btn');
    if (notifBtn) {
      notifBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateToPage('notifications-page');
      });
    }

    // Override profile button
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
      profileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateToPage('profile-page');
      });
    }

    // Override existing close buttons to use native back
    document.addEventListener('click', (e) => {
      if (e.target.matches('#close-search, #close-notifications, #close-profile, .close-btn')) {
        e.preventDefault();
        this.handleBackButton();
      }
    });
  }
}

// 2. Enhanced Modal System (drop-in replacement for your existing showModal)
class EnhancedModalSystem {
  showModal(content, callback) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close">&times;</button>
        ${content}
      </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Add native-style slide up animation
    modal.style.opacity = '0';
    modal.querySelector('.modal-content').style.transform = 'translateY(100%)';
    
    // Force reflow
    modal.offsetHeight;
    
    modal.style.transition = 'opacity 0.3s ease';
    modal.querySelector('.modal-content').style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
    
    requestAnimationFrame(() => {
      modal.style.opacity = '1';
      modal.querySelector('.modal-content').style.transform = 'translateY(0)';
    });

    // Handle close button
    modal.querySelector('.modal-close').addEventListener('click', () => {
      window.nativeNav.closeTopModal();
    });
    
    // Cleanup after animation
    setTimeout(() => {
      modal.style.transition = '';
      modal.querySelector('.modal-content').style.transition = '';
      modal.querySelector('.modal-content').style.transform = '';
    }, 300);
    
    if (typeof callback === 'function') {
      callback();
    }
  }

  hideModal() {
    window.nativeNav.closeTopModal();
  }
}

// 3. Simple CSS additions (add this to your existing CSS)
const additionalStyles = `
/* Native App Enhancements */
.full-page {
  transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.modal-overlay {
  backdrop-filter: blur(5px);
}

.modal-content {
  border-radius: 12px 12px 0 0;
}

/* Disable text selection and highlight */
* {
  -webkit-tap-highlight-color: transparent;
}

/* Smooth scrolling */
.full-page, .page-content {
  -webkit-overflow-scrolling: touch;
}

/* Prevent body scroll when modal is open */
body.modal-open {
  overflow: hidden;
  position: fixed;
  width: 100%;
  height: 100%;
}
`;

// 4. Initialize everything
document.addEventListener('DOMContentLoaded', () => {
  // Add styles
  const style = document.createElement('style');
  style.textContent = additionalStyles;
  document.head.appendChild(style);

  // Initialize native navigation
  window.nativeNav = new MinimalNativeNavigation();

  // Replace modal system if it exists
  if (window.showModal || (window.app && window.app.showModal)) {
    const enhancedModals = new EnhancedModalSystem();
    
    // Override global showModal if it exists
    if (window.showModal) {
      window.showModal = enhancedModals.showModal.bind(enhancedModals);
      window.hideModal = enhancedModals.hideModal.bind(enhancedModals);
    }
    
    // Override app showModal if it exists
    if (window.app && window.app.showModal) {
      window.app.showModal = enhancedModals.showModal.bind(enhancedModals);
      window.app.hideModal = enhancedModals.hideModal.bind(enhancedModals);
    }
  }

  console.log('Native navigation behaviors enabled');
});

// 5. Optional: Add visual feedback for touch interactions
document.addEventListener('touchstart', (e) => {
  if (e.target.matches('button, .btn, .card, .artisan-card')) {
    e.target.style.transform = 'scale(0.98)';
    e.target.style.transition = 'transform 0.1s ease';
  }
});

document.addEventListener('touchend', (e) => {
  if (e.target.matches('button, .btn, .card, .artisan-card')) {
    setTimeout(() => {
      e.target.style.transform = '';
      e.target.style.transition = '';
    }, 100);
  }
});

