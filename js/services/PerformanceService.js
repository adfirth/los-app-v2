/**
 * PerformanceService - Handles performance optimizations, lazy loading, and caching
 */
class PerformanceService {
    constructor() {
        this.debounceTimers = new Map();
        this.intersectionObserver = null;
        this.performanceMetrics = {
            pageLoadTime: 0,
            firstContentfulPaint: 0,
            domContentLoaded: 0
        };
        
        this.setupPerformanceMonitoring();
        this.setupIntersectionObserver();
    }

    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        // Monitor page load performance
        if ('performance' in window) {
            window.addEventListener('load', () => {
                const navigation = performance.getEntriesByType('navigation')[0];
                if (navigation) {
                    this.performanceMetrics.pageLoadTime = navigation.loadEventEnd - navigation.loadEventStart;
                    this.performanceMetrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
                }

                // Log performance metrics
                console.log('📊 Performance Metrics:', this.performanceMetrics);
            });
        }

        // Monitor first contentful paint
        if ('PerformanceObserver' in window) {
            try {
                const paintObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.name === 'first-contentful-paint') {
                            this.performanceMetrics.firstContentfulPaint = entry.startTime;
                            console.log('🎨 First Contentful Paint:', entry.startTime, 'ms');
                        }
                    }
                });
                paintObserver.observe({ entryTypes: ['paint'] });
            } catch (e) {
                console.warn('PerformanceObserver not supported:', e);
            }
        }
    }

    /**
     * Setup intersection observer for lazy loading
     */
    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const element = entry.target;
                            const lazyAction = element.dataset.lazyAction;
                            
                            if (lazyAction) {
                                this.executeLazyAction(lazyAction, element);
                                this.intersectionObserver.unobserve(element);
                            }
                        }
                    });
                },
                {
                    rootMargin: '50px',
                    threshold: 0.1
                }
            );
        }
    }

    /**
     * Execute lazy loading action
     */
    executeLazyAction(action, element) {
        switch (action) {
            case 'loadImage':
                this.lazyLoadImage(element);
                break;
            case 'loadContent':
                this.lazyLoadContent(element);
                break;
            case 'loadData':
                this.lazyLoadData(element);
                break;
            default:
                console.warn('Unknown lazy action:', action);
        }
    }

    /**
     * Lazy load image
     */
    lazyLoadImage(imgElement) {
        if (imgElement.dataset.src) {
            imgElement.src = imgElement.dataset.src;
            imgElement.classList.remove('lazy');
            imgElement.classList.add('loaded');
        }
    }

    /**
     * Lazy load content
     */
    lazyLoadContent(element) {
        if (element.dataset.content) {
            element.innerHTML = element.dataset.content;
            element.classList.remove('lazy');
        }
    }

    /**
     * Lazy load data
     */
    lazyLoadData(element) {
        const dataType = element.dataset.dataType;
        const callback = element.dataset.callback;
        
        if (dataType && callback && window[callback]) {
            window[callback](dataType, element);
        }
    }

    /**
     * Add element to lazy loading queue
     */
    addToLazyQueue(element, action) {
        if (this.intersectionObserver) {
            element.dataset.lazyAction = action;
            this.intersectionObserver.observe(element);
        } else {
            // Fallback for browsers without IntersectionObserver
            this.executeLazyAction(action, element);
        }
    }

    /**
     * Debounce function calls
     */
    debounce(key, func, delay = 300) {
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }
        
        const timer = setTimeout(() => {
            func();
            this.debounceTimers.delete(key);
        }, delay);
        
        this.debounceTimers.set(key, timer);
    }

    /**
     * Throttle function calls
     */
    throttle(key, func, limit = 100) {
        if (!this.debounceTimers.has(key)) {
            func();
            this.debounceTimers.set(key, setTimeout(() => {
                this.debounceTimers.delete(key);
            }, limit));
        }
    }

    /**
     * Preload critical resources
     */
    preloadResources(resources) {
        resources.forEach(resource => {
            if (resource.type === 'image') {
                const img = new Image();
                img.src = resource.url;
            } else if (resource.type === 'script') {
                const script = document.createElement('script');
                script.src = resource.url;
                script.async = true;
                document.head.appendChild(script);
            }
        });
    }

    /**
     * Optimize images for performance
     */
    optimizeImages() {
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => {
            // Add loading="lazy" for native lazy loading
            img.loading = 'lazy';
            
            // Add intersection observer for custom lazy loading
            this.addToLazyQueue(img, 'loadImage');
        });
    }

    /**
     * Cache DOM queries for better performance
     */
    createDOMCache(selectors) {
        const cache = {};
        selectors.forEach(selector => {
            cache[selector] = document.querySelector(selector);
        });
        return cache;
    }

    /**
     * Batch DOM updates for better performance
     */
    batchDOMUpdates(updates) {
        // Use requestAnimationFrame for smooth updates
        requestAnimationFrame(() => {
            updates.forEach(update => {
                if (update.element && update.action) {
                    switch (update.action) {
                        case 'innerHTML':
                            update.element.innerHTML = update.value;
                            break;
                        case 'classList':
                            if (update.value.add) {
                                update.element.classList.add(...update.value.add);
                            }
                            if (update.value.remove) {
                                update.element.classList.remove(...update.value.remove);
                            }
                            break;
                        case 'style':
                            Object.assign(update.element.style, update.value);
                            break;
                    }
                }
            });
        });
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        // Clear all debounce timers
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
        
        // Disconnect intersection observer
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceService;
} else {
    window.PerformanceService = PerformanceService;
}
