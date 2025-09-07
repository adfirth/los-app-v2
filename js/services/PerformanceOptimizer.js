/**
 * PerformanceOptimizer - Service for optimizing app performance
 * Handles lazy loading, image optimization, and performance monitoring
 */
class PerformanceOptimizer {
    constructor() {
        this.isInitialized = false;
        this.performanceMetrics = {
            pageLoadTime: 0,
            firstContentfulPaint: 0,
            largestContentfulPaint: 0,
            cumulativeLayoutShift: 0
        };
        this.observers = new Map();
    }

    /**
     * Initialize performance optimization
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            console.log('🚀 PerformanceOptimizer: Initializing...');
            
            // Set up performance monitoring
            this.setupPerformanceMonitoring();
            
            // Set up lazy loading
            this.setupLazyLoading();
            
            // Set up image optimization
            this.setupImageOptimization();
            
            // Set up intersection observer for content loading
            this.setupIntersectionObserver();
            
            this.isInitialized = true;
            console.log('✅ PerformanceOptimizer: Initialized successfully');
            
        } catch (error) {
            console.error('❌ PerformanceOptimizer: Initialization failed:', error);
        }
    }

    /**
     * Set up performance monitoring
     */
    setupPerformanceMonitoring() {
        // Monitor page load performance
        window.addEventListener('load', () => {
            this.measurePageLoadPerformance();
        });

        // Monitor Core Web Vitals
        if ('PerformanceObserver' in window) {
            this.observeCoreWebVitals();
        }

        // Monitor long tasks
        this.observeLongTasks();
    }

    /**
     * Measure page load performance
     */
    measurePageLoadPerformance() {
        try {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                this.performanceMetrics.pageLoadTime = navigation.loadEventEnd - navigation.navigationStart;
                console.log(`📊 Page load time: ${this.performanceMetrics.pageLoadTime}ms`);
            }

            // Measure First Contentful Paint
            const paintEntries = performance.getEntriesByType('paint');
            const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
            if (fcpEntry) {
                this.performanceMetrics.firstContentfulPaint = fcpEntry.startTime;
                console.log(`📊 First Contentful Paint: ${this.performanceMetrics.firstContentfulPaint}ms`);
            }

        } catch (error) {
            console.warn('⚠️ PerformanceOptimizer: Could not measure page load performance:', error);
        }
    }

    /**
     * Observe Core Web Vitals
     */
    observeCoreWebVitals() {
        // Largest Contentful Paint
        if ('PerformanceObserver' in window) {
            try {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    this.performanceMetrics.largestContentfulPaint = lastEntry.startTime;
                    console.log(`📊 Largest Contentful Paint: ${this.performanceMetrics.largestContentfulPaint}ms`);
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
                this.observers.set('lcp', lcpObserver);
            } catch (error) {
                console.warn('⚠️ PerformanceOptimizer: Could not observe LCP:', error);
            }

            // Cumulative Layout Shift
            try {
                const clsObserver = new PerformanceObserver((list) => {
                    let clsValue = 0;
                    for (const entry of list.getEntries()) {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                        }
                    }
                    this.performanceMetrics.cumulativeLayoutShift = clsValue;
                    console.log(`📊 Cumulative Layout Shift: ${this.performanceMetrics.cumulativeLayoutShift}`);
                });
                clsObserver.observe({ entryTypes: ['layout-shift'] });
                this.observers.set('cls', clsObserver);
            } catch (error) {
                console.warn('⚠️ PerformanceOptimizer: Could not observe CLS:', error);
            }
        }
    }

    /**
     * Observe long tasks
     */
    observeLongTasks() {
        if ('PerformanceObserver' in window) {
            try {
                const longTaskObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        console.warn(`⚠️ Long task detected: ${entry.duration}ms`);
                        // Could implement task splitting or optimization here
                    }
                });
                longTaskObserver.observe({ entryTypes: ['longtask'] });
                this.observers.set('longtask', longTaskObserver);
            } catch (error) {
                console.warn('⚠️ PerformanceOptimizer: Could not observe long tasks:', error);
            }
        }
    }

    /**
     * Set up lazy loading for images and content
     */
    setupLazyLoading() {
        // Lazy load images
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            imageObserver.unobserve(img);
                        }
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.01
            });

            // Observe all images with data-src attribute
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });

            this.observers.set('images', imageObserver);
        }
    }

    /**
     * Set up image optimization
     */
    setupImageOptimization() {
        // Add loading="lazy" to images that don't have it
        document.querySelectorAll('img:not([loading])').forEach(img => {
            img.setAttribute('loading', 'lazy');
        });

        // Add decoding="async" to images
        document.querySelectorAll('img:not([decoding])').forEach(img => {
            img.setAttribute('decoding', 'async');
        });
    }

    /**
     * Set up intersection observer for content loading
     */
    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            const contentObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const element = entry.target;
                        
                        // Load content when it becomes visible
                        if (element.dataset.loadContent) {
                            this.loadContent(element);
                        }
                        
                        // Add animation class when visible
                        if (element.dataset.animate) {
                            element.classList.add('animate-in');
                        }
                    }
                });
            }, {
                rootMargin: '100px 0px',
                threshold: 0.1
            });

            // Observe elements that need lazy loading
            document.querySelectorAll('[data-load-content], [data-animate]').forEach(el => {
                contentObserver.observe(el);
            });

            this.observers.set('content', contentObserver);
        }
    }

    /**
     * Load content for a specific element
     */
    async loadContent(element) {
        try {
            const contentType = element.dataset.loadContent;
            console.log(`🔄 Loading content: ${contentType}`);
            
            // Dispatch custom event for content loading
            const event = new CustomEvent('loadContent', {
                detail: { contentType, element }
            });
            window.dispatchEvent(event);
            
        } catch (error) {
            console.error('❌ PerformanceOptimizer: Error loading content:', error);
        }
    }

    /**
     * Optimize bundle size by deferring non-critical scripts
     */
    deferNonCriticalScripts() {
        // Defer scripts that are not critical for initial page load
        const nonCriticalScripts = [
            'js/services/EmailService.js',
            'js/services/TeamBadgeService.js',
            'js/modules/api/developmentHelper.js'
        ];

        nonCriticalScripts.forEach(scriptSrc => {
            const script = document.querySelector(`script[src*="${scriptSrc}"]`);
            if (script && !script.defer) {
                script.defer = true;
            }
        });
    }

    /**
     * Preload critical resources
     */
    preloadCriticalResources() {
        const criticalResources = [
            { href: 'css/styles.css', as: 'style' },
            { href: 'css/components.css', as: 'style' },
            { href: 'js/app.js', as: 'script' }
        ];

        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource.href;
            link.as = resource.as;
            document.head.appendChild(link);
        });
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }

    /**
     * Check if performance is good
     */
    isPerformanceGood() {
        const metrics = this.performanceMetrics;
        
        return {
            pageLoad: metrics.pageLoadTime < 3000, // < 3 seconds
            fcp: metrics.firstContentfulPaint < 1800, // < 1.8 seconds
            lcp: metrics.largestContentfulPaint < 2500, // < 2.5 seconds
            cls: metrics.cumulativeLayoutShift < 0.1 // < 0.1
        };
    }

    /**
     * Clean up observers
     */
    destroy() {
        console.log('🧹 PerformanceOptimizer: Cleaning up observers...');
        
        this.observers.forEach((observer, name) => {
            try {
                observer.disconnect();
                console.log(`🧹 Disconnected observer: ${name}`);
            } catch (error) {
                console.warn(`⚠️ Error disconnecting observer ${name}:`, error);
            }
        });
        
        this.observers.clear();
        this.isInitialized = false;
    }
}

// Export for use in other modules
window.PerformanceOptimizer = PerformanceOptimizer;
