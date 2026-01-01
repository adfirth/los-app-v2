// Import Services
import UIService from './services/UIService.js';
import PerformanceService from './services/PerformanceService.js';
import TeamBadgeService from './services/TeamBadgeService.js';

// Import Managers
import AuthManager from './managers/AuthManager.js';
import EditionService from './managers/EditionService.js';
import FixturesManager from './managers/FixturesManager.js';
import ScoresManager from './managers/ScoresManager.js';
import GameLogicManager from './managers/GameLogicManager.js';
import PickStatusService from './managers/PickStatusService.js';
import DeadlineService from './managers/DeadlineService.js';
import AdminManager from './managers/AdminManager.js';
import ClubService from './managers/ClubService.js';
import SuperAdminManager from './managers/SuperAdminManager.js';
import FixtureManagementManager from './managers/FixtureManagementManager.js';

// Import Config
import EnvironmentLoader from './config/env-loader.js';

/**
 * LOS App - Main Application Class
 * Manages the entire application lifecycle, Firebase connections, and manager coordination
 * 
 * TIMEZONE: All dates and times are displayed in London timezone (Europe/London)
 * - GMT in winter (October-March)
 * - BST in summer (March-October)
 * - This ensures consistent UK football time display regardless of user's location
 */
class LOSApp {
    constructor() {
        this.isInitialized = false;
        this.managers = {};
        this.connectionState = {
            isConnecting: false,
            isConnected: false,
            lastConnectionAttempt: 0,
            connectionRetryCount: 0
        };

        // Add listener tracking to prevent conflicts
        this.activeListeners = new Set();
        this.listenerSetupInProgress = false;

        // Detect development environment
        this.isDevelopment = window.location.hostname === '127.0.0.1' ||
            window.location.hostname === 'localhost' ||
            window.location.hostname.includes('5500');

        // Add development-specific features
        if (this.isDevelopment) {
            this.setupDevelopmentFeatures();
        }

        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeApp();
            });
        } else {
            this.initializeApp();
        }
    }

    async initializeApp() {
        try {
            // Initialize Environment
            EnvironmentLoader.loadEnvironment();

            // Initialize core services
            this.uiService = new UIService();
            this.performanceService = new PerformanceService();
            this.teamBadgeService = new TeamBadgeService();

            // Initialize managers
            this.initializeManagers();

            // Initialize TeamBadgeService
            if (this.teamBadgeService) {
                this.teamBadgeService.initialize();
            }

            // Set up performance monitoring
            this.performanceService.startMonitoring();

        } catch (error) {
            console.error('Error initializing app:', error);
        }
    }

    async initializeManagers() {
        try {
            // Initialize all managers with error handling
            this.managers = {};

            const managerConfigs = [
                { key: 'auth', class: AuthManager },
                { key: 'edition', class: EditionService },
                { key: 'fixtures', class: FixturesManager },
                { key: 'scores', class: ScoresManager },
                { key: 'gameLogic', class: GameLogicManager },
                { key: 'pickStatus', class: PickStatusService },
                { key: 'deadline', class: DeadlineService },
                { key: 'admin', class: AdminManager },
                { key: 'club', class: ClubService },
                { key: 'superAdmin', class: SuperAdminManager },
                { key: 'fixtureManagement', class: FixtureManagementManager }
            ];

            // Initialize each manager with error handling
            for (const config of managerConfigs) {
                try {
                    console.log(`🔧 Initializing ${config.key} manager...`);
                    this.managers[config.key] = new config.class();
                    console.log(`✅ ${config.key} manager initialized`);
                } catch (error) {
                    console.error(`❌ Failed to initialize ${config.key} manager:`, error);
                }
            }

            // Make key services globally available
            window.clubService = this.managers.club;
            window.authManager = this.managers.auth;
            window.editionService = this.managers.edition;
            window.gameLogicManager = this.managers.gameLogic;
            window.adminManager = this.managers.admin; // For HTML attributes
            window.superAdminManager = this.managers.superAdmin; // For HTML attributes
            window.fixtureManagementManager = this.managers.fixtureManagement; // For HTML attributes

            // Wait for all managers to be ready
            await this.waitForManagersReady();

            // Add fallback mechanism to ensure managers are initialized
            setTimeout(() => {
                if (Object.keys(this.managers).length === 0) {
                    console.log('🔄 Fallback: Retrying manager initialization...');
                    this.initializeManagers();
                }
            }, 3000);

        } catch (error) {
            console.error('Error initializing managers:', error);
            this.handleError(error, 'manager initialization');

            // Add fallback retry on error
            setTimeout(() => {
                console.log('🔄 Fallback: Retrying manager initialization after error...');
                this.initializeManagers();
            }, 2000);
        }
    }

    async waitForManagersReady() {
        return new Promise((resolve) => {
            const checkManagers = () => {
                const allReady = Object.values(this.managers).every(manager =>
                    manager && typeof manager.initBasic === 'function'
                );

                if (allReady) {
                    this.onManagersReady();
                    resolve();
                } else {
                    setTimeout(checkManagers, 100);
                }
            };

            checkManagers();
        });
    }

    onManagersReady() {
        try {
            // Initialize manager connections
            this.initializeManagerConnections();

            // Wait for Firebase to be ready
            this.waitForFirebaseReady();

        } catch (error) {
            console.error('Error in onManagersReady:', error);
        }
    }

    async initializeManagerConnections() {
        try {
            // Initialize basic structure for all managers
            for (const [key, manager] of Object.entries(this.managers)) {
                if (manager && typeof manager.initBasic === 'function') {
                    try {
                        await manager.initBasic();
                    } catch (error) {
                        console.error(`Error initializing ${key}:`, error);
                    }
                }
            }

            // Restore Firebase connections
            this.restoreFirebaseConnections();

        } catch (error) {
            console.error('Error initializing manager connections:', error);
        }
    }

    restoreFirebaseConnections() {
        try {
            for (const [key, manager] of Object.entries(this.managers)) {
                if (manager && typeof manager.restoreFirebaseConnection === 'function') {
                    try {
                        manager.restoreFirebaseConnection();
                    } catch (error) {
                        console.error(`Error restoring Firebase connection for ${key}:`, error);
                    }
                }
            }
        } catch (error) {
            console.error('Error restoring Firebase connections:', error);
        }
    }

    async waitForFirebaseReady() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.firebaseReady && window.firebaseDB && typeof window.firebaseDB.collection === 'function') {
                    this.setupRealtimeConnections();
                    resolve();
                } else {
                    setTimeout(checkFirebase, 1000);
                }
            };

            checkFirebase();
        });
    }

    setupRealtimeConnections() {
        if (this.listenerSetupInProgress) {
            console.log('Listener setup already in progress, skipping...');
            return;
        }

        this.listenerSetupInProgress = true;
        // Setting up real-time connections...

        try {
            // Set up connection status monitoring
            this.monitorConnectionStatus();

            // Initialize managers with data loading first
            this.initializeManagersWithData();

            // Then set up real-time listeners after managers are initialized
            setTimeout(() => {
                for (const [key, manager] of Object.entries(this.managers)) {
                    if (manager && typeof manager.setupRealtimeListeners === 'function') {
                        try {
                            manager.setupRealtimeListeners();
                        } catch (error) {
                            console.error(`Error setting up real-time listeners for ${key}:`, error);
                        }
                    }
                }
            }, 500);

            // Add a small delay to prevent listener conflicts
            setTimeout(() => {
                this.initializeRealtimeListeners();
                this.listenerSetupInProgress = false;
            }, 1000);

            // Delay setupLiveUpdates until after managers are fully initialized
            setTimeout(() => {
                this.setupLiveUpdates();
            }, 2000);

        } catch (error) {
            console.error('Error setting up real-time connections:', error);
            this.listenerSetupInProgress = false;
        }
    }

    async initializeManagersWithData() {
        try {
            // Ensure Firebase is fully ready before initializing managers
            if (!window.firebaseReady || !window.firebaseDB || typeof window.firebaseDB.collection !== 'function') {
                setTimeout(() => this.initializeManagersWithData(), 1000);
                return;
            }

            // Initialize data loading for all managers
            // Order matters somewhat for dependencies, though we try to avoid direct dependency during init
            const loadOrder = ['edition', 'auth', 'club', 'fixtures', 'scores', 'gameLogic', 'pickStatus', 'deadline', 'admin'];

            for (const key of loadOrder) {
                const manager = this.managers[key];
                if (manager && typeof manager.init === 'function') {
                    try {
                        await manager.init();
                    } catch (error) {
                        console.error(`Error initializing data for ${key}:`, error);
                    }
                }
            }

            // Initialize others
            for (const [key, manager] of Object.entries(this.managers)) {
                if (!loadOrder.includes(key) && manager && typeof manager.init === 'function') {
                    try {
                        await manager.init();
                    } catch (error) {
                        console.error(`Error initializing data for ${key}:`, error);
                    }
                }
                if (key === 'superAdmin' && typeof manager.initBasic === 'function') manager.initBasic();
                if (key === 'fixtureManagement' && typeof manager.initBasic === 'function') manager.initBasic();
            }

            // Set up periodic tasks
            this.setupPeriodicTasks();

        } catch (error) {
            console.error('Error initializing managers with data:', error);
        }
    }

    setupPeriodicTasks() {
        if (this.periodicTasksSetup) return;

        try {
            // Set up periodic admin status checks
            if (this.managers.admin && typeof this.managers.admin.startPeriodicChecks === 'function') {
                this.managers.admin.startPeriodicChecks();
            }

            // Auto-refresh data every 5 minutes
            setInterval(() => {
                this.refreshData();
            }, 5 * 60 * 1000); // 5 minutes

            // Check deadlines every minute
            setInterval(() => {
                this.checkDeadlines();
            }, 60 * 1000); // 1 minute

            this.periodicTasksSetup = true;

        } catch (error) {
            console.error('Error setting up periodic tasks:', error);
        }
    }

    // Coordinate manager operations to prevent conflicts
    async coordinateManagerOperation(operationName, operation) {
        if (this.connectionState.isConnecting) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    this.coordinateManagerOperation(operationName, operation).then(resolve);
                }, 1000);
            });
        }

        try {
            this.setConnectionState(true);
            const result = await operation();
            this.setConnectionState(false, true);
            return result;
        } catch (error) {
            this.setConnectionState(false, false);
            throw error;
        }
    }

    // Connection state management
    setConnectionState(connecting, connected = false) {
        this.connectionState.isConnecting = connecting;
        this.connectionState.isConnected = connected;

        if (connecting) {
            this.connectionState.lastConnectionAttempt = Date.now();
            this.connectionState.connectionRetryCount++;
        }
    }

    // Handle connection conflicts gracefully
    handleConnectionConflict() {
        if (this.connectionState.connectionRetryCount >= 5) { // max retries hardcoded for simplicity
            this.useFallbackApproach();
            return;
        }

        this.attemptConnectionRecovery();
    }

    // Attempt to recover from connection conflict
    async attemptConnectionRecovery() {
        try {
            await this.performAggressiveCleanup();
            await this.waitForFirebaseReady();
        } catch (error) {
            console.error('Error during connection recovery:', error);
            this.useFallbackApproach();
        }
    }

    // Perform aggressive Firebase cleanup
    async performAggressiveCleanup() {
        try {
            this.clearAllListeners();
            this.resetConnectionState();
        } catch (error) {
            console.error('Error during aggressive cleanup:', error);
        }
    }

    // Use fallback approach when recovery fails
    useFallbackApproach() {
        this.loadFallbackData();
    }

    // Load fallback data from localStorage
    loadFallbackData() {
        try {
            const userData = localStorage.getItem('userData');
            if (userData) {
                this.updateUserUI(JSON.parse(userData));
            }

            const settings = localStorage.getItem('editionSettings');
            if (settings) {
                this.updateSettingsUI(JSON.parse(settings));
            }
        } catch (error) {
            console.error('Error loading fallback data:', error);
        }
    }

    updateSettingsUI(settings) {
        const currentGameweek = document.getElementById('currentGameweek');
        const deadlineInfo = document.getElementById('deadlineInfo');

        if (currentGameweek && settings.currentGameweek) {
            currentGameweek.textContent = `Gameweek ${settings.currentGameweek}`;
        }

        if (deadlineInfo && settings.deadline) {
            deadlineInfo.textContent = `Deadline: ${settings.deadline}`;
        }
    }

    // Listener management
    registerListener(listenerId, callback) {
        if (this.activeListeners.has(listenerId)) {
            return false; // Listener already exists
        }
        this.activeListeners.add(listenerId);
        return true;
    }

    unregisterListener(listenerId) {
        this.activeListeners.delete(listenerId);
    }

    clearAllListeners() {
        this.activeListeners.clear();
        // Clear listeners from all managers
        Object.values(this.managers).forEach(manager => {
            if (manager && typeof manager.clearListeners === 'function') {
                manager.clearListeners();
            }
        });
    }

    // Firebase connection monitoring
    setupFirebaseConnectionMonitoring() {
        if (!window.firebaseDB) {
            return; // Firebase not ready
        }
        window.firebaseDB.enableNetwork();
    }

    // Reset Firebase connection
    async resetFirebaseConnection() {
        if (this.connectionState.isResetting) {
            return; // Reset already in progress
        }

        try {
            this.connectionState.isResetting = true;

            if (window.firebaseDB) {
                await window.firebaseDB.disableNetwork();
                await window.firebaseDB.enableNetwork();
            }

            this.retryDataLoading();

        } catch (error) {
            console.error('Error resetting Firebase connection:', error);
        } finally {
            this.connectionState.isResetting = false;
        }
    }

    // Retry data loading after connection reset
    retryDataLoading() {
        try {
            this.initializeManagersWithData();
        } catch (error) {
            console.error('Error retrying data loading:', error);
        }
    }

    // Refresh data
    async refreshData() {
        try {
            // Ensure Firebase is ready before refreshing data
            if (!window.firebaseReady || !window.firebaseDB || typeof window.firebaseDB.collection !== 'function') {
                return;
            }

            Object.values(this.managers).forEach(manager => {
                if (manager && typeof manager.refresh === 'function') {
                    manager.refresh();
                }
            });
            // Explicit loads
            if (this.managers.fixtures) await this.managers.fixtures.loadFixtures();
            if (this.managers.gameLogic) await this.managers.gameLogic.loadStandings();
            if (this.managers.scores) await this.managers.scores.loadScores();

        } catch (error) {
            if (!error.message || !error.message.includes('client is offline')) {
                console.error('Error refreshing data:', error);
            }
        }
    }

    // Check deadlines
    async checkDeadlines() {
        try {
            if (!window.firebaseReady || !this.managers.deadline) return;

            if (typeof this.managers.deadline.checkAllDeadlines === 'function') {
                this.managers.deadline.checkAllDeadlines();
            }
        } catch (error) {
            console.error('Error checking deadlines:', error);
        }
    }

    // Manual connection reset
    manualConnectionReset() {
        this.resetFirebaseConnection();
    }

    // Handle Firebase errors
    handleFirebaseError(error) {
        if (error.code === 'failed-precondition') {
            this.handleConnectionConflict();
        } else {
            console.error('Firebase error:', error);
        }
    }

    // Performance monitoring
    setupPerformanceMonitoring() {
        try {
            if (this.performanceService) {
                this.performanceService.startMonitoring();
            }
        } catch (error) {
            console.error('Performance monitoring unavailable:', error);
        }
    }

    // App lifecycle management
    pauseApp() {
        // Pause app activity
    }

    resumeApp() {
        // Resume app activity
    }

    destroyApp() {
        try {
            this.clearAllListeners();

            if (this.managers) {
                Object.values(this.managers).forEach(manager => {
                    if (manager && typeof manager.destroy === 'function') {
                        manager.destroy();
                    }
                });
            }
        } catch (error) {
            console.error('Error destroying app:', error);
        }
    }

    // Update all managers with Firebase reference
    updateAllManagers() {
        if (this.managers) {
            Object.entries(this.managers).forEach(([key, manager]) => {
                if (manager && typeof manager.setFirebaseDB === 'function') {
                    manager.setFirebaseDB(window.firebaseDB);
                }
            });
        }
    }

    setupDevelopmentFeatures() {
        window.debugPickButtons = () => {
            const buttons = document.querySelectorAll('.pick-button');
            console.log('Total pick buttons found:', buttons.length);

            buttons.forEach((button, index) => {
                const teamName = button.textContent.trim();
                console.log(`Button ${index + 1}:`, {
                    teamName,
                    disabled: button.disabled,
                    className: button.className
                });
            });
        };
    }

    resetConnectionState() {
        this.connectionState.isConnecting = false;
        this.connectionState.isConnected = false;
        this.connectionState.connectionRetryCount = 0;
        this.connectionState.lastConnectionAttempt = 0;
    }

    initializeRealtimeListeners() {
        try {
            // Initialize listeners with error handling
            if (this.managers.edition) this.managers.edition.setupRealtimeListeners();
            if (this.managers.gameLogic) this.managers.gameLogic.setupRealtimeListeners();
            if (this.managers.club) this.managers.club.setupRealtimeListeners();
            if (this.managers.superAdmin) this.managers.superAdmin.setupRealtimeListeners();
            if (this.managers.fixtureManagement) this.managers.fixtureManagement.setupRealtimeListeners();
        } catch (error) {
            console.error('Error setting up real-time listeners:', error);
        }
    }

    setupLiveUpdates() {
        // Listen for real-time updates from Firebase
        if (!window.firebaseDB || !window.firebaseReady) {
            console.log('Firebase not ready for live updates, skipping...');
            return;
        }

        try {
            const currentEdition = this.managers.edition.getCurrentEdition();

            // Listen for user updates
            window.firebaseDB.collection('users')
                .where('edition', '==', currentEdition)
                .onSnapshot((snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'modified') {
                            // Update UI if current user data changed
                            const currentUserId = this.managers.auth.getCurrentUserId();
                            if (change.doc.id === currentUserId) {
                                this.updateUserUI(change.doc.data());
                            }
                        }
                    });
                });
        } catch (e) { console.warn("Error setting up live updates", e); }
    }

    monitorConnectionStatus() {
        // Monitor Firebase connection status
        if (!window.firebaseDB || !window.firebaseReady) {
            if (this.uiService) {
                this.uiService.updateConnectionStatus('connecting', 'Connecting to Firebase...');
            }
            return;
        }

        window.firebaseDB.enableNetwork();
        this.updateConnectionStatus(true); // Assume online for now
    }

    updateConnectionStatus(isOnline) {
        // Update UI to show connection status using UIService if available
        if (this.uiService) {
            if (isOnline) {
                this.uiService.updateConnectionStatus('connected', 'Connected');
            } else {
                this.uiService.updateConnectionStatus('disconnected', 'Disconnected');
            }
        } else {
            // Fallback to direct DOM manipulation
            const statusIndicator = document.getElementById('connectionStatus');
            const resetBtn = document.getElementById('resetConnectionBtn');

            if (statusIndicator) {
                if (isOnline) {
                    statusIndicator.classList.add('hidden');
                    if (resetBtn) resetBtn.classList.add('hidden');
                } else {
                    statusIndicator.classList.remove('hidden');
                    statusIndicator.className = 'connection-status disconnected';
                    if (resetBtn) resetBtn.classList.remove('hidden');
                }
            }
        }
    }

    updateUserUI(userData) {
        // Update user information in the UI
        const userName = document.getElementById('userName');
        const userLives = document.getElementById('userLives');

        if (userName) userName.textContent = userData.displayName || 'Player';

        if (userLives) {
            const lives = userData.lives || 0;
            userLives.innerHTML = window.clubService ? window.clubService.formatLivesDisplay(lives) : lives;

            if (lives <= 0) {
                userLives.classList.add('eliminated');
            } else {
                userLives.classList.remove('eliminated');
            }
        }
    }

    handleError(error, operation = 'operation') {
        // Handle errors gracefully
        console.error(`App error during ${operation}:`, error);

        if (error.message && error.message.includes('Target ID already exists')) {
            this.handleConnectionConflict();
            return;
        }

        const userMessage = this.getErrorMessage(error, operation);

        if (this.uiService) {
            this.uiService.showToast('error', userMessage);
        } else if (this.managers.auth) {
            this.managers.auth.showError(userMessage);
        }
    }

    getErrorMessage(error, operation) {
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
        } else if (errorMessage.includes('firebase')) {
            return 'Database connection issue. Please refresh the page.';
        } else {
            return `An error occurred during ${operation}. Please try again.`;
        }
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.add('hidden');
        });
        if (this.managers.admin) {
            this.managers.admin.hideAdminPanel();
        }
    }

    // Utility methods
    getManager(name) {
        return this.managers[name];
    }

    isOnline() {
        return navigator.onLine;
    }

    pause() {
        console.log('App paused');
    }

    resume() {
        console.log('App resumed');
        this.refreshData();
    }

    forceManagerRetry() {
        if (this.managers) {
            Object.values(this.managers).forEach(manager => {
                if (manager && typeof manager.retry === 'function') {
                    manager.retry();
                }
            });
        }
    }

    destroy() {
        console.log('Destroying app...');
        if (this.managers.deadline) this.managers.deadline.destroy();
        if (this.managers.scores) this.managers.scores.destroy();
        this.isInitialized = false;
    }
}

// Initialize the app
const losApp = new LOSApp();
window.losApp = losApp;
window.LOSApp = LOSApp; // For any backward compatibility checks

// Global Firebase ready check
let globalFirebaseHandled = false;
const globalFirebaseCheck = () => {
    if (window.firebaseReady && window.firebaseDB && typeof window.firebaseDB.collection === 'function' && !globalFirebaseHandled) {
        console.log('Global Firebase check: Firebase is ready, triggering app recovery...');
        globalFirebaseHandled = true;

        // Update all manager references first
        if (window.authManager) window.authManager.db = window.firebaseDB;
        if (window.editionService) window.editionService.db = window.firebaseDB;
        if (window.fixturesManager) window.fixturesManager.db = window.firebaseDB;
        if (window.gameLogicManager) window.gameLogicManager.db = window.firebaseDB;

        // Force app retry if available
        if (window.losApp && typeof window.losApp.forceManagerRetry === 'function') {
            window.losApp.forceManagerRetry();
        }

        // Set up periodic tasks if not already done
        if (window.losApp && typeof window.losApp.setupPeriodicTasks === 'function') {
            window.losApp.setupPeriodicTasks();
        }
    } else if (!globalFirebaseHandled) {
        setTimeout(globalFirebaseCheck, 500);
    }
};

globalFirebaseCheck();
window.addEventListener('firebaseReady', () => {
    if (window.losApp && window.losApp.updateAllManagers) {
        window.losApp.updateAllManagers();
    }
});

// Export default
export default losApp;

// Keep global debug helpers attached to window if needed
window.cleanupFirebase = async function () {
    if (!window.firebaseDB) return;
    // ... cleanup logic logic if really needed, but generally safer to remove from production code ...
};