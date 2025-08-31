// Navigation Stack Manager
class NavigationStack {
  constructor() {
    this.stack = [];
    this.currentIndex = -1;
    this.initializeNavigation();
  }

  initializeNavigation() {
    window.addEventListener('popstate', (event) => {
      event.preventDefault();
      this.handleBackButton();
    });
    this.pushState('home', { page: 'home' });
  }

  pushState(route, data = {}) {
    this.stack = this.stack.slice(0, this.currentIndex + 1);
    this.stack.push({ route, data, timestamp: Date.now() });
    this.currentIndex = this.stack.length - 1;
    history.pushState({ stackIndex: this.currentIndex }, '', `#${route}`);
  }

  canGoBack() {
    return this.currentIndex > 0;
  }

  goBack() {
    if (this.canGoBack()) {
      this.currentIndex--;
      const previousState = this.stack[this.currentIndex];
      this.navigateToState(previousState);
      return true;
    }
    return false;
  }

  handleBackButton() {
    if (this.isModalOpen()) {
      this.closeTopModal();
    } else if (this.canGoBack()) {
      this.goBack();
    } else {
      this.showExitConfirmation();
    }
  }

  isModalOpen() {
    return document.querySelector('.modal-overlay') !== null;
  }

  closeTopModal() {
    const modals = document.querySelectorAll('.modal-overlay');
    if (modals.length > 0) {
      const topModal = modals[modals.length - 1];
      topModal.remove();
      if (document.querySelectorAll('.modal-overlay').length === 0) {
        document.body.style.overflow = '';
      }
    }
  }

  showExitConfirmation() {
    if (confirm('Exit app?')) {
      window.close();
    }
  }

  navigateToState(state) {
    window.dispatchEvent(new CustomEvent('navigate', { 
      detail: { route: state.route, data: state.data }
    }));
  }
}

