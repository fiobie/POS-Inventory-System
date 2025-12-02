/**
 * Core Utility Classes for POS-Inventory System
 * Optimized for performance and reusability
 */

// ============================================================================
// Storage Manager - Handles localStorage operations efficiently
// ============================================================================
class StorageManager {
    constructor(storageKey) {
        this.storageKey = storageKey;
        this.cache = null;
        this.cacheTimestamp = null;
        this.CACHE_DURATION = 1000; // 1 second cache
    }

    /**
     * Get data from storage with caching
     */
    get(defaultValue = null) {
        const now = Date.now();
        
        // Return cached data if still valid
        if (this.cache !== null && this.cacheTimestamp && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
            return this.cache;
        }

        try {
            const stored = localStorage.getItem(this.storageKey);
            const data = stored ? JSON.parse(stored) : defaultValue;
            this.cache = data;
            this.cacheTimestamp = now;
            return data;
        } catch (error) {
            console.error(`Error loading ${this.storageKey}:`, error);
            return defaultValue;
        }
    }

    /**
     * Save data to storage
     */
    set(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            this.cache = data;
            this.cacheTimestamp = Date.now();
            return true;
        } catch (error) {
            console.error(`Error saving ${this.storageKey}:`, error);
            return false;
        }
    }

    /**
     * Clear storage and cache
     */
    clear() {
        try {
            localStorage.removeItem(this.storageKey);
            this.cache = null;
            this.cacheTimestamp = null;
            return true;
        } catch (error) {
            console.error(`Error clearing ${this.storageKey}:`, error);
            return false;
        }
    }

    /**
     * Check if storage has data
     */
    has() {
        return localStorage.getItem(this.storageKey) !== null;
    }
}

// ============================================================================
// Event Manager - Efficient event handling with debouncing
// ============================================================================
class EventManager {
    constructor() {
        this.listeners = new Map();
        this.debounceTimers = new Map();
        this.elementIds = new WeakMap();
    }

    /**
     * Add event listener with optional debouncing
     */
    on(element, event, handler, options = {}) {
        const { debounce = 0, once = false } = options;
        if (!element || !event || !handler) return;
        const uid = this._getElementUid(element);
        const key = `${uid}-${event}`;

        // Remove existing listener if any
        this.off(element, event);

        const wrappedHandler = debounce > 0 
            ? this.debounce(handler, debounce)
            : handler;

        const finalHandler = once 
            ? (...args) => {
                wrappedHandler(...args);
                this.off(element, event);
            }
            : wrappedHandler;

        if (typeof element.addEventListener === 'function') {
            element.addEventListener(event, finalHandler);
        }
        this.listeners.set(key, { element, event, handler: finalHandler });
    }

    /**
     * Remove event listener
     */
    off(element, event) {
        if (!element || !event) return;
        const uid = this._getElementUid(element);
        const key = `${uid}-${event}`;
        const listener = this.listeners.get(key);
        
        if (listener) {
            if (typeof listener.element.removeEventListener === 'function') {
                listener.element.removeEventListener(listener.event, listener.handler);
            }
            this.listeners.delete(key);
        }

        // Clear debounce timer if exists
        const timerKey = `${key}-debounce`;
        if (this.debounceTimers.has(timerKey)) {
            clearTimeout(this.debounceTimers.get(timerKey));
            this.debounceTimers.delete(timerKey);
        }
    }

    _getElementUid(element) {
        try {
            if (element && element.id && element.id.trim()) return element.id;
            if (this.elementIds.has(element)) return this.elementIds.get(element);
            const uid = `em-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            this.elementIds.set(element, uid);
            return uid;
        } catch (_) {
            return `em-${Date.now()}`;
        }
    }

    /**
     * Debounce function
     */
    debounce(func, wait) {
        return (...args) => {
            const key = `${func.name || 'anonymous'}-${wait}`;
            
            if (this.debounceTimers.has(key)) {
                clearTimeout(this.debounceTimers.get(key));
            }

            const timer = setTimeout(() => {
                func(...args);
                this.debounceTimers.delete(key);
            }, wait);

            this.debounceTimers.set(key, timer);
        };
    }

    /**
     * Remove all listeners
     */
    destroy() {
        this.listeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.listeners.clear();
        
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
    }
}

// ============================================================================
// DOM Helper - Efficient DOM manipulation
// ============================================================================
class DOMHelper {
    /**
     * Get element by ID (cached)
     */
    static getElement(id) {
        if (!DOMHelper.elementCache) {
            DOMHelper.elementCache = new Map();
        }
        
        if (!DOMHelper.elementCache.has(id)) {
            const element = document.getElementById(id);
            if (element) {
                DOMHelper.elementCache.set(id, element);
            }
            return element;
        }
        
        return DOMHelper.elementCache.get(id);
    }

    /**
     * Query selector (cached for common queries)
     */
    static query(selector, parent = document) {
        return parent.querySelector(selector);
    }

    /**
     * Query all (returns array for better performance)
     */
    static queryAll(selector, parent = document) {
        return Array.from(parent.querySelectorAll(selector));
    }

    /**
     * Create element with attributes
     */
    static create(tag, attributes = {}, text = '') {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'class') {
                element.className = value;
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else {
                element.setAttribute(key, value);
            }
        });

        if (text) {
            element.textContent = text;
        }

        return element;
    }

    /**
     * Batch DOM updates for performance
     */
    static batchUpdate(updates) {
        const fragment = document.createDocumentFragment();
        
        updates.forEach(update => {
            if (typeof update === 'function') {
                update(fragment);
            } else if (update instanceof Node) {
                fragment.appendChild(update);
            }
        });

        return fragment;
    }

    /**
     * Clear element cache (call when DOM changes significantly)
     */
    static clearCache() {
        if (DOMHelper.elementCache) {
            DOMHelper.elementCache.clear();
        }
    }
}

// ============================================================================
// Performance Utilities
// ============================================================================
class PerformanceUtils {
    /**
     * Throttle function execution
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Request animation frame wrapper
     */
    static raf(callback) {
        return requestAnimationFrame(callback);
    }

    /**
     * Lazy load images
     */
    static lazyLoadImage(img, src) {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        img.src = src;
                        observer.unobserve(img);
                    }
                });
            });
            observer.observe(img);
        } else {
            // Fallback for older browsers
            img.src = src;
        }
    }

    /**
     * Virtual scrolling helper (for large lists)
     */
    static virtualScroll(container, items, itemHeight, renderItem) {
        const containerHeight = container.clientHeight;
        const visibleCount = Math.ceil(containerHeight / itemHeight);
        const buffer = 5;
        
        let startIndex = 0;
        let endIndex = Math.min(startIndex + visibleCount + buffer, items.length);

        const updateVisibleItems = () => {
            const scrollTop = container.scrollTop;
            startIndex = Math.floor(scrollTop / itemHeight);
            endIndex = Math.min(startIndex + visibleCount + buffer, items.length);

            const visibleItems = items.slice(startIndex, endIndex);
            const offsetY = startIndex * itemHeight;

            // Render only visible items
            container.innerHTML = '';
            visibleItems.forEach((item, index) => {
                const element = renderItem(item, startIndex + index);
                element.style.position = 'absolute';
                element.style.top = `${(startIndex + index) * itemHeight}px`;
                container.appendChild(element);
            });

            // Set container height for scrolling
            container.style.height = `${items.length * itemHeight}px`;
        };

        container.addEventListener('scroll', PerformanceUtils.throttle(updateVisibleItems, 16));
        updateVisibleItems();
    }
}

// ==========================================================================
// Format Utilities
// ============================================================================
class FormatUtils {
    /**
     * Format currency
     */
    static currency(amount, symbol = '₱') {
        const n = Number(amount) || 0;
        return `${symbol}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    /**
     * Format number with commas
     */
    static number(num) {
        return parseFloat(num).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    /**
     * Capitalize first letter
     */
    static capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Pad number with zeros
     */
    static pad(num, length = 4) {
        return String(num).padStart(length, '0');
    }
}

// ==========================================================================
// Persist Utilities
// ==========================================================================
class PersistUtils {
    static applyTabPersistence(groupKey) {
        try {
            const buttons = Array.from(document.querySelectorAll('.tab-btn'));
            const tabs = Array.from(document.querySelectorAll('.tab-content'));
            if (!buttons.length || !tabs.length) return;
            const storageKey = `bonbonTab:${groupKey || location.pathname}`;
            const setActive = (target) => {
                if (!target) return;
                buttons.forEach(btn => {
                    const on = btn.dataset.tab === target;
                    btn.classList.toggle('active', on);
                    btn.setAttribute('aria-selected', on);
                });
                tabs.forEach(tab => {
                    const on = tab.id === `${target}Tab`;
                    tab.classList.toggle('active', on);
                    tab.setAttribute('aria-hidden', !on);
                });
            };
            const stored = localStorage.getItem(storageKey);
            if (stored && buttons.some(b => b.dataset.tab === stored)) setActive(stored);
            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const t = btn.dataset.tab;
                    localStorage.setItem(storageKey, t);
                });
            });
        } catch (_) {}
    }
}

// ==========================================================================
// Net Utilities - Cached fetch + in-flight dedup + retries
// ==========================================================================
class NetUtils {
    static _cache = new Map();
    static _inflight = new Map();

    static async fetchJson(url, options = {}, cfg = {}) {
        const ttl = cfg.ttl ?? 3000;
        const key = cfg.key || url;
        const retries = Math.max(0, cfg.retries ?? 1);
        const now = Date.now();

        const cached = NetUtils._cache.get(key);
        if (cached && (now - cached.t) < ttl) return cached.v;

        if (NetUtils._inflight.has(key)) return NetUtils._inflight.get(key);

        const attempt = async () => {
            const res = await fetch(url, options);
            if (!res.ok) throw new Error('network');
            let json = null;
            try { json = await res.json(); } catch (_) { json = null; }
            if (json === null) throw new Error('parse');
            NetUtils._cache.set(key, { v: json, t: Date.now() });
            return json;
        };

        const p = (async () => {
            let lastErr = null;
            for (let i = 0; i <= retries; i++) {
                try { const v = await attempt(); return v; } catch (e) { lastErr = e; }
                await new Promise(r => setTimeout(r, 200 * (i + 1)));
            }
            throw lastErr || new Error('fetch_failed');
        })().finally(() => NetUtils._inflight.delete(key));

        NetUtils._inflight.set(key, p);
        return p;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StorageManager, EventManager, DOMHelper, PerformanceUtils, FormatUtils, PersistUtils, NetUtils };
}

