/**
 * Sidebar Manager - Handles sidebar toggle functionality
 * Reusable across all pages
 */

class SidebarManager {
    constructor() {
        this.sidebar = null;
        this.sidebarToggle = null;
        this.sidebarClose = null;
        this.sidebarOverlay = null;
        this.navItems = [];
        this.eventManager = new EventManager();
        this.isOpen = false;
    }

    /**
     * Initialize sidebar
     */
    init() {
        this.sidebar = DOMHelper.getElement('sidebar');
        this.sidebarToggle = DOMHelper.getElement('sidebarToggle');
        this.sidebarClose = DOMHelper.getElement('sidebarClose');
        this.sidebarOverlay = DOMHelper.getElement('sidebarOverlay');
        this.navItems = DOMHelper.queryAll('.nav-item');

        if (!this.sidebar) return;

        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Toggle button
        if (this.sidebarToggle) {
            this.eventManager.on(this.sidebarToggle, 'click', () => this.open(), { debounce: 100 });
        }

        // Close button
        if (this.sidebarClose) {
            this.eventManager.on(this.sidebarClose, 'click', () => this.close(), { debounce: 100 });
        }

        // Overlay click
        if (this.sidebarOverlay) {
            this.eventManager.on(this.sidebarOverlay, 'click', () => this.close(), { debounce: 100 });
        }

        // Close on nav item click (mobile)
        this.navItems.forEach(item => {
            this.eventManager.on(item, 'click', () => {
                if (window.innerWidth <= 768) {
                    this.close();
                }
            });
        });
    }

    /**
     * Open sidebar
     */
    open() {
        if (!this.sidebar || !this.sidebarOverlay) return;
        
        this.sidebar.classList.add('show');
        this.sidebarOverlay.classList.add('show');
        document.body.style.overflow = 'hidden';
        this.isOpen = true;
    }

    /**
     * Close sidebar
     */
    close() {
        if (!this.sidebar || !this.sidebarOverlay) return;
        
        this.sidebar.classList.remove('show');
        this.sidebarOverlay.classList.remove('show');
        document.body.style.overflow = '';
        this.isOpen = false;
    }

    /**
     * Toggle sidebar
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Destroy and cleanup
     */
    destroy() {
        this.eventManager.destroy();
        this.sidebar = null;
        this.sidebarToggle = null;
        this.sidebarClose = null;
        this.sidebarOverlay = null;
        this.navItems = [];
    }
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.sidebarManager = new SidebarManager();
        window.sidebarManager.init();
    });
} else {
    window.sidebarManager = new SidebarManager();
    window.sidebarManager.init();
}

