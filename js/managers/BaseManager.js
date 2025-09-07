/**
 * BaseManager - Base class for all managers to reduce code duplication
 * Provides common functionality for initialization, error handling, and Firebase connection
 */
class BaseManager {
    constructor(managerName) {
        this.managerName = managerName;
        this.db = null;
        this.isInitialized = false;
        this.dataLoaded = false;
        this.listeners = new Map();
        this.retryCount = 0;
        this.maxRetries = 5;
        this.retryDelay = 2000;
    }

    /**
     * Basic initialization - sets up structure without loading data
     */
    initBasic() {
        if (this.isInitialized) {
            return;
        }
        
        console.log(`🔧 ${this.managerName}: Basic initialization...`);
        this.isInitialized = true;
    }

    /**
     * Full initialization with data loading
     */
    async init() {
        if (this.isInitialized && this.dataLoaded) {
            return;
        }
        
        try {
            console.log(`🔧 ${this.managerName}: Starting full initialization...`);
            
            // Wait for Firebase to be ready
            await this.waitForFirebase();
            
            // Set up real-time listeners
            this.setupRealtimeListeners();
            
            this.dataLoaded = true;
            console.log(`✅ ${this.managerName}: Initialization complete`);
            
        } catch (error) {
            console.error(`❌ ${this.managerName}: Initialization failed:`, error);
            this.handleError(error, 'initialization');
        }
    }

    /**
     * Wait for Firebase to be ready
     */
    async waitForFirebase() {
        return new Promise((resolve, reject) => {
            const checkFirebase = () => {
                if (window.firebaseReady && window.firebaseDB && typeof window.firebaseDB.collection === 'function') {
                    this.db = window.firebaseDB;
                    resolve();
                } else {
                    // Try to update database reference if Firebase is ready but we don't have it
                    if (window.firebaseReady && window.firebaseDB && !this.db) {
                        console.log(`🔧 ${this.managerName}: Updating database reference from global Firebase...`);
                        this.db = window.firebaseDB;
                        resolve();
                    } else {
                        setTimeout(checkFirebase, 100);
                    }
                }
            };
            
            // Set a timeout to prevent infinite waiting
            setTimeout(() => {
                reject(new Error('Firebase initialization timeout'));
            }, 30000); // 30 second timeout
            
            checkFirebase();
        });
    }

    /**
     * Restore Firebase connection after reconnection
     */
    restoreFirebaseConnection() {
        console.log(`🔧 ${this.managerName}: Restoring Firebase connection...`);
        this.db = window.firebaseDB;
        this.retryCount = 0; // Reset retry count on successful reconnection
    }

    /**
     * Clear all listeners and clean up resources
     */
    clearListeners() {
        console.log(`🧹 ${this.managerName}: Clearing listeners...`);
        
        // Clear all registered listeners
        this.listeners.forEach((unsubscribe, listenerId) => {
            try {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            } catch (error) {
                console.warn(`⚠️ ${this.managerName}: Error clearing listener ${listenerId}:`, error);
            }
        });
        
        this.listeners.clear();
        
        // Unregister from main app's listener tracking
        if (window.losApp) {
            window.losApp.unregisterListener(this.managerName);
        }
    }

    /**
     * Register a listener with automatic cleanup
     */
    registerListener(listenerId, unsubscribeFunction) {
        if (this.listeners.has(listenerId)) {
            console.warn(`⚠️ ${this.managerName}: Listener ${listenerId} already exists, replacing...`);
            // Clean up existing listener
            const existingUnsubscribe = this.listeners.get(listenerId);
            if (typeof existingUnsubscribe === 'function') {
                existingUnsubscribe();
            }
        }
        
        this.listeners.set(listenerId, unsubscribeFunction);
        console.log(`📡 ${this.managerName}: Registered listener ${listenerId}`);
    }

    /**
     * Unregister a specific listener
     */
    unregisterListener(listenerId) {
        if (this.listeners.has(listenerId)) {
            const unsubscribe = this.listeners.get(listenerId);
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
            this.listeners.delete(listenerId);
            console.log(`📡 ${this.managerName}: Unregistered listener ${listenerId}`);
            return true;
        }
        return false;
    }

    /**
     * Setup real-time listeners - to be overridden by subclasses
     */
    setupRealtimeListeners() {
        // Override in subclasses
        console.log(`📡 ${this.managerName}: Setting up real-time listeners...`);
    }

    /**
     * Handle errors with retry logic and user feedback
     */
    handleError(error, operation = 'operation') {
        console.error(`❌ ${this.managerName}: Error during ${operation}:`, error);
        
        // Show user-friendly error message
        this.showErrorToast(`${this.managerName}: ${this.getErrorMessage(error)}`);
        
        // Implement retry logic for certain operations
        if (this.shouldRetry(error, operation)) {
            this.scheduleRetry(operation);
        }
    }

    /**
     * Determine if an operation should be retried
     */
    shouldRetry(error, operation) {
        // Don't retry if we've exceeded max retries
        if (this.retryCount >= this.maxRetries) {
            return false;
        }
        
        // Retry on network errors or Firebase connection issues
        const retryableErrors = [
            'client is offline',
            'network error',
            'timeout',
            'connection failed',
            'firebase/firestore/unavailable'
        ];
        
        const errorMessage = error.message?.toLowerCase() || '';
        return retryableErrors.some(retryableError => errorMessage.includes(retryableError));
    }

    /**
     * Schedule a retry for a failed operation
     */
    scheduleRetry(operation) {
        this.retryCount++;
        const delay = this.retryDelay * Math.pow(2, this.retryCount - 1); // Exponential backoff
        
        console.log(`🔄 ${this.managerName}: Scheduling retry ${this.retryCount}/${this.maxRetries} for ${operation} in ${delay}ms`);
        
        setTimeout(() => {
            this.retryOperation(operation);
        }, delay);
    }

    /**
     * Retry a failed operation - to be overridden by subclasses
     */
    retryOperation(operation) {
        console.log(`🔄 ${this.managerName}: Retrying ${operation}...`);
        
        switch (operation) {
            case 'initialization':
                this.init();
                break;
            default:
                console.warn(`⚠️ ${this.managerName}: Unknown operation to retry: ${operation}`);
        }
    }

    /**
     * Get user-friendly error message
     */
    getErrorMessage(error) {
        const errorMessage = error.message?.toLowerCase() || '';
        
        if (errorMessage.includes('client is offline')) {
            return 'You are currently offline. Please check your internet connection.';
        } else if (errorMessage.includes('permission denied')) {
            return 'You do not have permission to perform this action.';
        } else if (errorMessage.includes('not found')) {
            return 'The requested data was not found.';
        } else if (errorMessage.includes('timeout')) {
            return 'The operation timed out. Please try again.';
        } else if (errorMessage.includes('network error')) {
            return 'Network error occurred. Please check your connection.';
        } else {
            return 'An unexpected error occurred. Please try again.';
        }
    }

    /**
     * Show error toast notification
     */
    showErrorToast(message) {
        if (window.losApp?.uiService) {
            window.losApp.uiService.showToast('error', message);
        } else {
            // Fallback to console if UIService not available
            console.error('Error Toast:', message);
        }
    }

    /**
     * Show success toast notification
     */
    showSuccessToast(message) {
        if (window.losApp?.uiService) {
            window.losApp.uiService.showToast('success', message);
        } else {
            console.log('Success Toast:', message);
        }
    }

    /**
     * Show info toast notification
     */
    showInfoToast(message) {
        if (window.losApp?.uiService) {
            window.losApp.uiService.showToast('info', message);
        } else {
            console.log('Info Toast:', message);
        }
    }

    /**
     * Check if Firebase is ready
     */
    isFirebaseReady() {
        return window.firebaseReady && this.db && typeof this.db.collection === 'function';
    }

    /**
     * Get current user from auth manager
     */
    getCurrentUser() {
        return window.authManager?.getCurrentUser?.() || null;
    }

    /**
     * Get current user ID
     */
    getCurrentUserId() {
        const user = this.getCurrentUser();
        return user?.uid || null;
    }

    /**
     * Check if current user is admin
     */
    isCurrentUserAdmin() {
        return window.authManager?.isAdmin || false;
    }

    /**
     * Destroy the manager and clean up resources
     */
    destroy() {
        console.log(`🧹 ${this.managerName}: Destroying manager...`);
        
        this.clearListeners();
        this.isInitialized = false;
        this.dataLoaded = false;
        this.retryCount = 0;
    }
}

// Export for use in other modules
window.BaseManager = BaseManager;
