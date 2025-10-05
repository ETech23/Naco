// SPA History Management
class HistoryManager {
    constructor() {
        this.currentState = {};
        this.stateHistory = [];
        this.currentIndex = -1;
        this.isPopState = false;
        
        // Initialize
        this.init();
    }
    
    init() {
        // Listen for back/forward button clicks
        window.addEventListener('popstate', (event) => {
            this.isPopState = true;
            if (event.state && event.state.index !== undefined) {
                this.restoreState(event.state.index);
            }
        });
        
        // Save initial state
        this.saveState({page: 'home'});
    }
    
    // Save current application state
    saveState(stateData) {
        // If we're navigating back/forward, don't add to history
        if (this.isPopState) {
            this.isPopState = false;
            return;
        }
        
        // If we're not at the end of history, remove future states
        if (this.currentIndex < this.stateHistory.length - 1) {
            this.stateHistory = this.stateHistory.slice(0, this.currentIndex + 1);
        }
        
        // Add new state to history
        this.stateHistory.push(JSON.parse(JSON.stringify(stateData)));
        this.currentIndex = this.stateHistory.length - 1;
        
        // Update browser history
        window.history.pushState(
            { index: this.currentIndex }, 
            '', 
            this.generateUrl(stateData)
        );
        
        this.currentState = stateData;
        this.updateUI();
    }
    
    // Restore a previous state
    restoreState(index) {
        if (index >= 0 && index < this.stateHistory.length) {
            this.currentIndex = index;
            this.currentState = this.stateHistory[index];
            this.updateUI();
        }
    }
    
    // Generate URL based on state
    generateUrl(state) {
        if (!state.page) return window.location.pathname;
        
        let url = `${window.location.pathname}?page=${state.page}`;
        
        if (state.id) {
            url += `&id=${state.id}`;
        }
        
        if (state.section) {
            url += `&section=${state.section}`;
        }
        
        return url;
    }
    
    // Parse URL to get state
    parseUrl() {
        const params = new URLSearchParams(window.location.search);
        const state = {};
        
        if (params.has('page')) state.page = params.get('page');
        if (params.has('id')) state.id = params.get('id');
        if (params.has('section')) state.section = params.get('section');
        
        return state;
    }
    
    // Update UI based on current state
    updateUI() {
        const state = this.currentState;
        
        // Hide all pages first
        document.querySelectorAll('.full-page').forEach(page => {
            page.classList.add('hidden');
        });
        
        // Show the active page based on state
        switch(state.page) {
            case 'search':
                document.getElementById('search-page')?.classList.remove('hidden');
                if (state.query) {
                    const searchInput = document.getElementById('main-search-input');
                    if (searchInput) searchInput.value = state.query;
                }
                break;
                
            case 'notifications':
                document.getElementById('notifications-page')?.classList.remove('hidden');
                break;
                
            case 'profile':
                document.getElementById('profile-page')?.classList.remove('hidden');
                break;
                
            case 'artisan':
                if (state.id) {
                    // You would implement this function to show artisan details
                    this.showArtisanPage(state.id);
                }
                break;
                
            case 'booking':
                if (state.id) {
                    // You would implement this function to show booking details
                    this.showBookingPage(state.id);
                }
                break;
                
            default:
                // Show home page (main content)
                document.querySelector('main')?.classList.remove('hidden');
                break;
        }
        
        // Update navigation highlights
        this.updateNavigation(state.page);
        
        // Scroll to top when changing pages
        window.scrollTo(0, 0);
    }
    
    // Update navigation active states
    updateNavigation(activePage) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Add active class to current page nav item
        const activeTab = document.querySelector(`[data-page="${activePage}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
    }
    
    // Navigate to a new page
    navigateTo(page, data = {}) {
        const newState = { page, ...data };
        this.saveState(newState);
    }
    
    // Go back in history
    goBack() {
        window.history.back();
    }
    
    // Go forward in history
    goForward() {
        window.history.forward();
    }
    
    // These would be implemented based on your app's specific functionality
    showArtisanPage(id) {
        // Implementation for showing artisan details
        console.log(`Showing artisan with ID: ${id}`);
    }
    
    showBookingPage(id) {
        // Implementation for showing booking details
        console.log(`Showing booking with ID: ${id}`);
    }
}

// Initialize the history manager when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Create history manager instance
    const historyManager = new HistoryManager();
    
    // Set up navigation event listeners
    function setupNavigation() {
        // Search page
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('click', () => {
                historyManager.navigateTo('search');
            });
        }
        
        // Close search button
        const closeSearch = document.getElementById('close-search');
        if (closeSearch) {
            closeSearch.addEventListener('click', () => {
                historyManager.goBack();
            });
        }
        
        // Notifications button
        const notifBtn = document.getElementById('notif-btn');
        if (notifBtn) {
            notifBtn.addEventListener('click', () => {
                historyManager.navigateTo('notifications');
            });
        }
        
        // Close notifications button
        const closeNotifications = document.getElementById('close-notifications');
        if (closeNotifications) {
            closeNotifications.addEventListener('click', () => {
                historyManager.goBack();
            });
        }
        
        // Profile button
        const profileBtn = document.getElementById('profile-btn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                historyManager.navigateTo('profile');
            });
        }
        
        // Close profile button
        const closeProfile = document.getElementById('close-profile');
        if (closeProfile) {
            closeProfile.addEventListener('click', () => {
                historyManager.goBack();
            });
        }
        
        // Add navigation to artisan items (example)
        document.addEventListener('click', function(e) {
            const artisanCard = e.target.closest('.artisan-card');
            if (artisanCard && artisanCard.dataset.id) {
                e.preventDefault();
                historyManager.navigateTo('artisan', { id: artisanCard.dataset.id });
            }
            
            const bookingItem = e.target.closest('.booking-item');
            if (bookingItem && bookingItem.dataset.id) {
                e.preventDefault();
                historyManager.navigateTo('booking', { id: bookingItem.dataset.id });
            }
        });
    }
    
    // Initialize navigation
    setupNavigation();
    
    // Parse initial URL state
    const initialState = historyManager.parseUrl();
    if (Object.keys(initialState).length > 0) {
        historyManager.saveState(initialState);
    }
    
    // Make history manager available globally for other parts of your app
    window.historyManager = historyManager;
});

// Add CSS for navigation highlights (if not already in your CSS)
const style = document.createElement('style');
style.textContent = `
    .nav-tab.active {
        background: #2980b9;
        box-shadow: inset 0 -3px 0 #fff;
    }
    
    .hidden {
        display: none !important;
    }
    
    /* Animation for page transitions */
    .full-page {
        animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);