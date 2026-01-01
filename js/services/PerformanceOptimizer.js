class PerformanceOptimizer {
    constructor() {
        this.isInitialized = false;
        this.performanceObserver = null;
        this.longTaskThreshold = 50; // 50ms threshold for long tasks
        this.batchSize = 10; // Process items in batches of 10
        this.rafQueue = [];
        this.isProcessing = false;
    }

    initialize() {
        if (this.isInitialized) return;

        console.log('🚀 PerformanceOptimizer: Initializing...');

        // Set up performance monitoring
        this.setupPerformanceMonitoring();

        // Set up RAF-based batching
        this.setupRAFQueue();

        this.isInitialized = true;
        console.log('✅ PerformanceOptimizer: Initialized successfully');
    }

    setupPerformanceMonitoring() {
        // Monitor long tasks
        if ('PerformanceObserver' in window) {
            try {
                this.performanceObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > this.longTaskThreshold) {
                            console.warn(`⚠️ Long task detected: ${Math.round(entry.duration)}ms`);
                            this.optimizeLongTask(entry);
                        }
                    }
                });

                this.performanceObserver.observe({ entryTypes: ['longtask'] });
            } catch (error) {
                console.warn('PerformanceObserver not supported:', error);
            }
        }
    }

    setupRAFQueue() {
        // Process RAF queue efficiently
        const processQueue = () => {
            if (this.rafQueue.length > 0) {
                const batch = this.rafQueue.splice(0, this.batchSize);
                batch.forEach(task => {
                    try {
                        task();
                    } catch (error) {
                        console.error('Error in RAF task:', error);
                    }
                });
            }

            if (this.rafQueue.length > 0) {
                requestAnimationFrame(processQueue);
            } else {
                this.isProcessing = false;
            }
        };

        // Override requestAnimationFrame to use our batching system
        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = (callback) => {
            this.rafQueue.push(callback);
            if (!this.isProcessing) {
                this.isProcessing = true;
                originalRAF(processQueue);
            }
        };
    }

    optimizeLongTask(entry) {
        // Log performance issues for debugging
        console.warn(`Long task optimization needed: ${entry.name} took ${Math.round(entry.duration)}ms`);

        // Could implement specific optimizations here
        // For now, just log for monitoring
    }

    // Batch DOM operations to reduce reflows
    batchDOMOperations(operations) {
        return new Promise((resolve) => {
            // Use DocumentFragment for efficient DOM manipulation
            const fragment = document.createDocumentFragment();
            const tempContainer = document.createElement('div');

            // Process operations in batches
            const processBatch = (startIndex) => {
                const endIndex = Math.min(startIndex + this.batchSize, operations.length);

                for (let i = startIndex; i < endIndex; i++) {
                    const operation = operations[i];
                    if (operation.type === 'createElement') {
                        const element = this.createElement(operation.tag, operation.attributes, operation.content);
                        if (operation.parent) {
                            operation.parent.appendChild(element);
                        } else {
                            tempContainer.appendChild(element);
                        }
                    } else if (operation.type === 'innerHTML') {
                        operation.element.innerHTML = operation.content;
                    }
                }

                if (endIndex < operations.length) {
                    // Process next batch
                    requestAnimationFrame(() => processBatch(endIndex));
                } else {
                    // All operations complete
                    resolve();
                }
            };

            processBatch(0);
        });
    }

    createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);

        // Set attributes efficiently
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else {
                element.setAttribute(key, value);
            }
        });

        if (content && typeof content === 'string') {
            element.textContent = content;
        } else if (content && typeof content === 'object') {
            element.appendChild(content);
        }

        return element;
    }

    // Optimize fixture rendering with virtual scrolling
    createVirtualScroller(container, items, itemHeight, renderItem) {
        const scroller = {
            container,
            items,
            itemHeight,
            renderItem,
            visibleStart: 0,
            visibleEnd: 0,
            buffer: 5, // Extra items to render outside viewport

            init() {
                this.updateVisibleRange();
                this.render();
                this.setupScrollListener();
            },

            updateVisibleRange() {
                const containerHeight = this.container.clientHeight;
                const visibleCount = Math.ceil(containerHeight / this.itemHeight);

                this.visibleStart = Math.max(0, Math.floor(this.container.scrollTop / this.itemHeight) - this.buffer);
                this.visibleEnd = Math.min(this.items.length, this.visibleStart + visibleCount + this.buffer * 2);
            },

            render() {
                // Clear container
                this.container.innerHTML = '';

                // Create spacer for items before visible range
                if (this.visibleStart > 0) {
                    const spacer = document.createElement('div');
                    spacer.style.height = `${this.visibleStart * this.itemHeight}px`;
                    this.container.appendChild(spacer);
                }

                // Render visible items
                for (let i = this.visibleStart; i < this.visibleEnd; i++) {
                    const item = this.items[i];
                    const element = this.renderItem(item, i);
                    this.container.appendChild(element);
                }

                // Create spacer for items after visible range
                const remainingItems = this.items.length - this.visibleEnd;
                if (remainingItems > 0) {
                    const spacer = document.createElement('div');
                    spacer.style.height = `${remainingItems * this.itemHeight}px`;
                    this.container.appendChild(spacer);
                }
            },

            setupScrollListener() {
                let ticking = false;

                const handleScroll = () => {
                    if (!ticking) {
                        requestAnimationFrame(() => {
                            this.updateVisibleRange();
                            this.render();
                            ticking = false;
                        });
                        ticking = true;
                    }
                };

                this.container.addEventListener('scroll', handleScroll, { passive: true });
            }
        };

        return scroller;
    }

    // Debounce function for performance
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle function for performance
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Optimize string concatenation
    buildHTMLString(template, data) {
        // Use template literals more efficiently
        if (typeof template === 'function') {
            return template(data);
        }

        // For large datasets, use array join instead of string concatenation
        if (Array.isArray(data)) {
            return data.map(item => template(item)).join('');
        }

        return template;
    }

    // Memory management
    cleanup() {
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
            this.performanceObserver = null;
        }

        this.rafQueue = [];
        this.isProcessing = false;
    }

    // Performance metrics
    // ... (methods)
    getPerformanceMetrics() {
        const metrics = {
            longTasks: 0,
            averageTaskDuration: 0,
            memoryUsage: 0
        };

        if ('performance' in window && 'memory' in performance) {
            metrics.memoryUsage = performance.memory.usedJSHeapSize;
        }

        return metrics;
    }
}

export default PerformanceOptimizer;