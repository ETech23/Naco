// Native App Router
class NativeAppRouter {
  constructor() {
    this.navigationStack = new NavigationStack();
    this.transitionManager = new TransitionManager();
    this.routes = new Map();
    this.currentRoute = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener('navigate', (event) => {
      const { route, data } = event.detail;
      this.navigateTo(route, data);
    });

    this.setupSwipeGestures();
  }

  setupSwipeGestures() {
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

      if (startX < 50 && deltaX > 100 && Math.abs(deltaY) < 100) {
        e.preventDefault();
        this.navigationStack.goBack();
      }
    });

    document.addEventListener('touchend', () => {
      startX = null;
      startY = null;
    });
  }

  registerRoute(path, component) {
    this.routes.set(path, component);
  }

  navigateTo(route, data = {}, addToStack = true) {
    if (this.transitionManager.isTransitioning) return;

    const routeComponent = this.routes.get(route);
    if (!routeComponent) {
      console.error(`Route ${route} not found`);
      return;
    }

    if (addToStack) {
      this.navigationStack.pushState(route, data);
    }

    const currentElement = this.getCurrentPageElement();
    const targetElement = this.createPageElement(route);
    
    routeComponent(targetElement, data);

    const direction = this.getTransitionDirection(this.currentRoute, route);
    
    if (currentElement && currentElement !== targetElement) {
      this.transitionManager.slideTransition(currentElement, targetElement, direction);
    } else {
      targetElement.style.display = 'block';
    }

    this.currentRoute = route;
    this.updateTabBar(route);
  }

  getCurrentPageElement() {
    return document.querySelector('.page.active') || document.querySelector('.page');
  }

  createPageElement(route) {
    document.querySelectorAll('.page').forEach(page => page.remove());
    
    const pageElement = document.createElement('div');
    pageElement.className = 'page active';
    pageElement.dataset.route = route;
    
    const container = document.querySelector('.app-container');
    container.appendChild(pageElement);
    
    return pageElement;
  }

  getTransitionDirection(fromRoute, toRoute) {
    const routeHierarchy = {
      'home': 0,
      'search': 1,
      'artisan-profile': 2,
      'booking-form': 2,
      'bookings': 1,
      'profile': 1
    };

    const fromLevel = routeHierarchy[fromRoute] || 0;
    const toLevel = routeHierarchy[toRoute] || 0;

    return toLevel > fromLevel ? 'left' : 'right';
  }

  updateTabBar(activeRoute) {
    document.querySelectorAll('.tab-item').forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.route === activeRoute) {
        tab.classList.add('active');
      }
    });
  }

  goBack() {
    return this.navigationStack.goBack();
  }
}

