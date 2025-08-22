/**
 * UIService - Handles UI state management, loading states, and user feedback
 */
class UIService {
    constructor() {
        this.connectionStatus = document.getElementById('connectionStatus');
        this.connectionText = document.getElementById('connectionText');
        this.toasts = {
            error: document.getElementById('errorToast'),
            success: document.getElementById('successToast'),
            info: document.getElementById('infoToast')
        };
        this.toastMessages = {
            error: document.getElementById('errorMessage'),
            success: document.getElementById('successMessage'),
            info: document.getElementById('infoMessage')
        };
        this.loadingStates = {
            fixtures: document.getElementById('fixturesLoading'),
            picks: document.getElementById('picksLoading'),
            standings: document.getElementById('standingsLoading'),
            scores: document.getElementById('scoresLoading')
        };
        
        this.setupToastCloseHandlers();
    }

    /**
     * Update connection status indicator
     */
    updateConnectionStatus(status, message = '') {
        if (!this.connectionStatus) return;

        // Remove all status classes
        this.connectionStatus.classList.remove('connected', 'disconnected', 'connecting');
        
        // Add appropriate class and update text
        switch (status) {
            case 'connected':
                this.connectionStatus.classList.add('connected');
                this.connectionText.textContent = message || 'Connected';
                break;
            case 'disconnected':
                this.connectionStatus.classList.add('disconnected');
                this.connectionText.textContent = message || 'Disconnected';
                break;
            case 'connecting':
                this.connectionStatus.classList.add('connecting');
                this.connectionText.textContent = message || 'Connecting...';
                break;
            default:
                this.connectionStatus.classList.add('connecting');
                this.connectionText.textContent = message || 'Unknown';
        }
    }

    /**
     * Show loading state for a specific content area
     */
    showLoading(contentType) {
        if (this.loadingStates[contentType]) {
            this.loadingStates[contentType].classList.remove('hidden');
        }
        
        // Add loading class to tab content
        const tabContent = document.getElementById(`${contentType}Tab`);
        if (tabContent) {
            tabContent.classList.add('loading');
        }
    }

    /**
     * Hide loading state for a specific content area
     */
    hideLoading(contentType) {
        if (this.loadingStates[contentType]) {
            this.loadingStates[contentType].classList.add('hidden');
        }
        
        // Remove loading class from tab content
        const tabContent = document.getElementById(`${contentType}Tab`);
        if (tabContent) {
            tabContent.classList.remove('loading');
        }
    }

    /**
     * Show toast notification
     */
    showToast(type, message, duration = 5000) {
        if (!this.toasts[type] || !this.toastMessages[type]) {
            console.warn(`Toast type '${type}' not found`);
            return;
        }

        // Set message
        this.toastMessages[type].textContent = message;
        
        // Show toast
        this.toasts[type].classList.remove('hidden');
        
        // Trigger animation
        setTimeout(() => {
            this.toasts[type].classList.add('show');
        }, 10);

        // Auto-hide after duration
        if (duration > 0) {
            setTimeout(() => {
                this.hideToast(type);
            }, duration);
        }
    }

    /**
     * Hide toast notification
     */
    hideToast(type) {
        if (!this.toasts[type]) return;

        this.toasts[type].classList.remove('show');
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            this.toasts[type].classList.add('hidden');
        }, 300);
    }

    /**
     * Show error toast
     */
    showError(message, duration = 7000) {
        this.showToast('error', message, duration);
    }

    /**
     * Show success toast
     */
    showSuccess(message, duration = 4000) {
        this.showToast('success', message, duration);
    }

    /**
     * Show info toast
     */
    showInfo(message, duration = 5000) {
        this.showToast('info', message, duration);
    }

    /**
     * Setup toast close button handlers
     */
    setupToastCloseHandlers() {
        Object.values(this.toasts).forEach(toast => {
            if (toast) {
                const closeBtn = toast.querySelector('.toast-close');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        const type = this.getToastType(toast);
                        if (type) {
                            this.hideToast(type);
                        }
                    });
                }
            }
        });
    }

    /**
     * Get toast type from DOM element
     */
    getToastType(toastElement) {
        for (const [type, toast] of Object.entries(this.toasts)) {
            if (toast === toastElement) {
                return type;
            }
        }
        return null;
    }

    /**
     * Add loading state to a button
     */
    setButtonLoading(button, isLoading, loadingText = 'Loading...') {
        if (!button) return;

        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = loadingText;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        }
    }

    /**
     * Show skeleton loading for content areas
     */
    showSkeleton(contentType, skeletonHTML) {
        const contentArea = document.getElementById(`${contentType}List`);
        if (contentArea) {
            contentArea.innerHTML = skeletonHTML;
        }
    }

    /**
     * Hide skeleton loading
     */
    hideSkeleton(contentType) {
        const contentArea = document.getElementById(`${contentType}List`);
        if (contentArea) {
            const skeleton = contentArea.querySelector('.skeleton');
            if (skeleton) {
                skeleton.remove();
            }
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIService;
} else {
    window.UIService = UIService;
}
