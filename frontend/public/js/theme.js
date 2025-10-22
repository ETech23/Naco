// Global Theme Manager

class ThemeManager {
  constructor() {
    this.currentTheme = this.getStoredTheme();
    this.init();
  }

  init() {
    // Apply theme immediately on load (before page renders)
    this.applyTheme(this.currentTheme);
    
    // Listen for theme changes from other tabs/windows
    window.addEventListener('storage', (e) => {
      if (e.key === 'naco_theme') {
        this.currentTheme = e.newValue || 'light';
        this.applyTheme(this.currentTheme);
      }
    });
  }

  getStoredTheme() {
    const stored = localStorage.getItem('naco_theme');
    return stored || 'light'; // Default to light
  }

  applyTheme(theme) {
    // Remove both classes first
    document.body.classList.remove('light', 'dark');
    
    // Add the appropriate class
    if (theme === 'dark') {
      document.body.classList.add('dark');
    }
    // Light is default, no class needed, but we can add it for clarity
    else {
      document.body.classList.add('light');
    }
    
    // Update meta theme-color for mobile browsers
    this.updateMetaTheme(theme);
  }

  updateMetaTheme(theme) {
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    
    metaTheme.content = theme === 'dark' ? '#000000' : '#f8faf9';
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    return newTheme;
  }

  setTheme(theme) {
    this.currentTheme = theme;
    localStorage.setItem('naco_theme', theme);
    this.applyTheme(theme);
    
    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent('themechange', { 
      detail: { theme } 
    }));
  }

  getCurrentTheme() {
    return this.currentTheme;
  }

  isDarkMode() {
    return this.currentTheme === 'dark';
  }
}

// Create global instance
const themeManager = new ThemeManager();

// Export for use in other modules
export default themeManager;