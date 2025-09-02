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

    initializeApp() {
        try {
            // Initialize core services
            this.uiService = new UIService();
            this.performanceService = new PerformanceService();
            
            // Initialize managers
            this.initializeManagers();
            
            // Set up performance monitoring
            this.performanceService.startMonitoring();
            
        } catch (error) {
            console.error('Error initializing app:', error);
        }
    }

    async initializeManagers() {
        try {
            // Initialize all managers
            this.managers = {
                auth: new AuthManager(),
                edition: new EditionService(),
                fixtures: new FixturesManager(),
                scores: new ScoresManager(),
                gameLogic: new GameLogicManager(),
                pickStatus: new PickStatusService(),
                deadline: new DeadlineService(),
                admin: new AdminManager(),
                club: new ClubService(),
                superAdmin: new SuperAdminManager(),
                fixtureManagement: new FixtureManagementManager()
            };

            // Make key services globally available
            window.clubService = this.managers.club;
            window.authManager = this.managers.auth;
            window.editionService = this.managers.edition;
            window.gameLogicManager = this.managers.gameLogic;

            // Wait for all managers to be ready
            await this.waitForManagersReady();
            
        } catch (error) {
            console.error('Error initializing managers:', error);
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
            // Initialize data loading for all managers
            for (const [key, manager] of Object.entries(this.managers)) {
                if (manager && typeof manager.init === 'function') {
                    try {
                        await manager.init();
                    } catch (error) {
                        console.error(`Error initializing data for ${key}:`, error);
                    }
                }
            }

            // Set up periodic tasks
            this.setupPeriodicTasks();
            
        } catch (error) {
            console.error('Error initializing managers with data:', error);
        }
    }

    setupPeriodicTasks() {
        try {
            // Set up periodic admin status checks
            if (this.managers.admin && typeof this.managers.admin.startPeriodicChecks === 'function') {
                this.managers.admin.startPeriodicChecks();
            }

            // Set up other periodic tasks as needed
            
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
        if (this.connectionState.connectionRetryCount >= this.maxConnectionRetryAttempts) {
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
                const user = JSON.parse(userData);
                // Use fallback user data
            }

            const settings = localStorage.getItem('appSettings');
            if (settings) {
                const appSettings = JSON.parse(settings);
                // Use fallback settings
            }
        } catch (error) {
            console.error('Error loading fallback data:', error);
        }
    }

    // Listener management
    registerListener(listenerId, callback) {
        if (this.activeListeners.has(listenerId)) {
            return; // Listener already exists
        }
        this.activeListeners.set(listenerId, callback);
    }

    unregisterListener(listenerId) {
        this.activeListeners.delete(listenerId);
    }

    clearAllListeners() {
        this.activeListeners.clear();
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

    // Periodic data refresh
    setupPeriodicDataRefresh() {
        if (this.periodicTasks.dataRefresh) {
            return; // Already set up
        }

        this.periodicTasks.dataRefresh = setInterval(() => {
            if (window.firebaseReady && this.managers) {
                this.refreshData();
            }
        }, 30000); // Refresh every 30 seconds
    }

    // Refresh data
    refreshData() {
        try {
            Object.values(this.managers).forEach(manager => {
                if (manager && typeof manager.refresh === 'function') {
                    manager.refresh();
                }
            });
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }

    // Periodic deadline checks
    setupPeriodicDeadlineChecks() {
        if (this.periodicTasks.deadlineCheck) {
            return; // Already set up
        }

        this.periodicTasks.deadlineCheck = setInterval(() => {
            if (window.firebaseReady && this.managers.deadline) {
                this.checkDeadlines();
            }
        }, 60000); // Check every minute
    }

    // Check deadlines
    checkDeadlines() {
        try {
            if (this.managers.deadline && typeof this.managers.deadline.checkAllDeadlines === 'function') {
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

    // Service Worker setup
    async setupServiceWorker() {
        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.register('/sw.js');
                // Service Worker registered successfully
            }
        } catch (error) {
            console.error('Service Worker registration failed:', error);
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
            
            Object.values(this.periodicTasks).forEach(interval => {
                if (interval) clearInterval(interval);
            });
            
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

    // Global Firebase event handlers
    setupGlobalFirebaseHandlers() {
        window.addEventListener('firebaseReady', () => {
            this.updateAllManagers();
        });

        window.addEventListener('firebaseError', (e) => {
            this.handleFirebaseError(e.detail);
        });
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

    // Network status monitoring
    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            // App is online
        });

        window.addEventListener('offline', () => {
            // App is offline
        });
    }

    // Debug utilities (only in development)
    setupDebugUtilities() {
        if (this.isDevelopment) {
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
    }

    // London timezone utility methods
    formatDateInLondon(date, options = {}) {
        const defaultOptions = {
            timeZone: 'Europe/London',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            ...options
        };
        
        if (typeof date === 'string' || date instanceof Date) {
            const dateObj = new Date(date);
            return dateObj.toLocaleDateString('en-GB', defaultOptions);
        }
        return 'Invalid Date';
    }

    formatTimeInLondon(date, options = {}) {
        const defaultOptions = {
            timeZone: 'Europe/London',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            ...options
        };
        
        if (typeof date === 'string' || date instanceof Date) {
            const dateObj = new Date(date);
            return dateObj.toLocaleTimeString('en-GB', defaultOptions);
        }
        return 'Invalid Time';
    }

    formatDateTimeInLondon(date, options = {}) {
        const defaultOptions = {
            timeZone: 'Europe/London',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            ...options
        };
        
        if (typeof date === 'string' || date instanceof Date) {
            const dateObj = new Date(date);
            return dateObj.toLocaleString('en-GB', defaultOptions);
        }
        return 'Invalid DateTime';
    }

    resetConnectionState() {
        this.connectionState.isConnecting = false;
        this.connectionState.isConnected = false;
        this.connectionState.connectionRetryCount = 0;
        this.connectionState.lastConnectionAttempt = 0;
    }

    // Handle connection conflicts gracefully
    handleConnectionConflict() {
        if (this.connectionState.connectionRetryCount >= this.maxConnectionRetryAttempts) {
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
                const user = JSON.parse(userData);
                // Use fallback user data
            }

            const settings = localStorage.getItem('appSettings');
            if (settings) {
                const appSettings = JSON.parse(settings);
                // Use fallback settings
            }
        } catch (error) {
            console.error('Error loading fallback data:', error);
        }
    }

    // Listener management
    registerListener(listenerId, listenerFunction) {
        if (this.activeListeners.has(listenerId)) {
            console.log(`Listener ${listenerId} already exists, skipping...`);
            return false;
        }
        
        this.activeListeners.add(listenerId);
        console.log(`Registered listener: ${listenerId}`);
        return true;
    }

    unregisterListener(listenerId) {
        if (this.activeListeners.has(listenerId)) {
            this.activeListeners.delete(listenerId);
            console.log(`Unregistered listener: ${listenerId}`);
            return true;
        }
        return false;
    }

    clearAllListeners() {
        console.log('Clearing all active listeners...');
        this.activeListeners.clear();
        
        // Clear listeners from all managers
        Object.values(this.managers).forEach(manager => {
            if (manager && typeof manager.clearListeners === 'function') {
                manager.clearListeners();
            }
        });
        
        console.log('All listeners cleared');
    }


    
    initializeManagersWithData() {
        // Ensure Firebase is fully ready before initializing managers
        if (!window.firebaseReady || !window.firebaseDB || typeof window.firebaseDB.collection !== 'function') {
            setTimeout(() => this.initializeManagersWithData(), 1000);
            return;
        }
        
        // Now call the full init() method on each manager to load data
        if (this.managers.edition) {
            this.managers.edition.init();
        }
        if (this.managers.auth) {
            this.managers.auth.init();
        }
        if (this.managers.fixtures) {
            this.managers.fixtures.init();
        }
        if (this.managers.scores) {
            this.managers.scores.init();
        }
        if (this.managers.gameLogic) {
            this.managers.gameLogic.init();
        }
        if (this.managers.pickStatus) {
            this.managers.pickStatus.init();
        }
        if (this.managers.deadline) {
            this.managers.deadline.init();
        }
        if (this.managers.admin) {
            this.managers.admin.init();
        }
        if (this.managers.club) {
            this.managers.club.init();
        }
        if (this.managers.superAdmin) {
            this.managers.superAdmin.initBasic();
        }
        if (this.managers.fixtureManagement) {
            this.managers.fixtureManagement.initBasic();
        }
    }
    
    initializeRealtimeListeners() {
        try {
            // Initialize listeners with error handling
            if (this.managers.edition) {
                this.managers.edition.setupRealtimeListeners();
            }
            if (this.managers.gameLogic) {
                this.managers.gameLogic.setupRealtimeListeners();
            }
            if (this.managers.club) {
                this.managers.club.setupRealtimeListeners();
            }
            if (this.managers.superAdmin) {
                this.managers.superAdmin.setupRealtimeListeners();
            }
            if (this.managers.fixtureManagement) {
                this.managers.fixtureManagement.setupRealtimeListeners();
            }
        } catch (error) {
            console.error('Error setting up real-time listeners:', error);
        }
    }
    
    forceManagerRetry() {
        try {
            if (this.managers) {
                Object.entries(this.managers).forEach(([key, manager]) => {
                    if (manager && typeof manager.retry === 'function') {
                        manager.retry();
                    }
                });
            }
        } catch (error) {
            console.error('Error forcing manager retry:', error);
        }
    }
    
    continueWithFallback() {
        try {
            this.loadFallbackData();
        } catch (error) {
            console.error('Error in fallback approach:', error);
        }
    }

    // Fallback methods for when Firebase connection fails
    loadUserDataFallback() {
        try {
            console.log('Loading user data from localStorage fallback...');
            const userData = localStorage.getItem('userData');
            if (userData) {
                const parsedData = JSON.parse(userData);
                this.updateUserUI(parsedData);
                console.log('User data loaded from fallback');
            }
        } catch (error) {
            console.error('Error loading fallback user data:', error);
        }
    }

    loadSettingsFallback() {
        try {
            console.log('Loading settings from localStorage fallback...');
            const settings = localStorage.getItem('editionSettings');
            if (settings) {
                const parsedSettings = JSON.parse(settings);
                // Update UI with fallback settings
                this.updateSettingsUI(parsedSettings);
                console.log('Settings loaded from fallback');
            }
        } catch (error) {
            console.error('Error loading fallback settings:', error);
        }
    }

    updateSettingsUI(settings) {
        // Update UI elements with fallback settings
        const currentGameweek = document.getElementById('currentGameweek');
        const deadlineInfo = document.getElementById('deadlineInfo');
        
        if (currentGameweek && settings.currentGameweek) {
            currentGameweek.textContent = `Gameweek ${settings.currentGameweek}`;
        }
        
        if (deadlineInfo && settings.deadline) {
            deadlineInfo.textContent = `Deadline: ${settings.deadline}`;
        }
    }

    setupLiveUpdates() {
        // Listen for real-time updates from Firebase
        if (!window.firebaseDB || !window.firebaseReady) {
            console.log('Firebase not ready for live updates, skipping...');
            return;
        }
        
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
    }

    monitorConnectionStatus() {
        // Monitor Firebase connection status
        if (!window.firebaseDB || !window.firebaseReady) {
            console.log('Firebase not ready for connection monitoring, skipping...');
            // Show connecting status
            if (this.uiService) {
                this.uiService.updateConnectionStatus('connecting', 'Connecting to Firebase...');
            }
            return;
        }
        
        window.firebaseDB.enableNetwork();
        
        // Note: onSnapshot is not available on the database instance
        // We'll monitor connection status differently
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
                    // Hide connection status and reset button when connected
                    statusIndicator.classList.add('hidden');
                    if (resetBtn) resetBtn.classList.add('hidden');
                } else {
                    // Show connection status and reset button when disconnected
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
        const livesCount = document.getElementById('livesCount');
        const userLives = document.getElementById('userLives');

        if (userName) userName.textContent = userData.displayName || 'Player';
        if (livesCount) livesCount.textContent = userData.lives || 0;
        
        if (userLives) {
            if (userData.lives <= 0) {
                userLives.classList.add('eliminated');
            } else {
                userLives.classList.remove('eliminated');
            }
        }
    }

    async loadInitialData() {
        try {
            // Load initial data for the app
            await this.managers.edition.loadSettings();
            
            // Load fixtures for current gameweek
            if (this.managers.fixtures) {
                await this.managers.fixtures.loadFixtures();
            }
            
            // Load standings
            if (this.managers.gameLogic) {
                await this.managers.gameLogic.loadStandings();
            }
            
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    setupPeriodicTasks() {
        // Prevent setting up periodic tasks multiple times
        if (this.periodicTasksSetup) {
            console.log('Periodic tasks already set up, skipping...');
            return;
        }
        
        // Setting up periodic tasks after Firebase is ready...
        
        // Set up periodic tasks that need to run
        this.setupAutoRefresh();
        this.setupDeadlineChecks();
        
        this.periodicTasksSetup = true;
        console.log('Periodic tasks setup complete');
    }

    setupAutoRefresh() {
        // Auto-refresh data every 5 minutes
        setInterval(() => {
            this.refreshData();
        }, 5 * 60 * 1000); // 5 minutes
    }

    setupDeadlineChecks() {
        // Check deadlines every minute (already handled by DeadlineService)
        // This is just for additional monitoring
        setInterval(() => {
            this.checkDeadlines();
        }, 60 * 1000); // 1 minute
    }

    async refreshData() {
        try {
            // Ensure Firebase is ready before refreshing data
            if (!window.firebaseReady || !window.firebaseDB || typeof window.firebaseDB.collection !== 'function') {
                console.log('App: Firebase not ready for data refresh, skipping...');
                return;
            }
            
            // Refresh all data
            if (this.managers.fixtures && this.managers.fixtures.db) {
                await this.managers.fixtures.loadFixtures();
            }
            
            if (this.managers.gameLogic && this.managers.gameLogic.db) {
                await this.managers.gameLogic.loadStandings();
            }
            
            if (this.managers.scores && this.managers.scores.db) {
                await this.managers.scores.loadScores();
            }
            
        } catch (error) {
            // Suppress offline errors as they're not real problems
            if (!error.message.includes('client is offline')) {
                console.error('Error refreshing data:', error);
            }
        }
    }

    async checkDeadlines() {
        try {
            // Ensure Firebase and managers are ready before checking deadlines
            if (!window.firebaseReady || !this.managers.deadline || !this.managers.deadline.db || typeof this.managers.deadline.db.collection !== 'function') {
                console.log('App: Firebase or DeadlineService not ready for deadline check, skipping...');
                return;
            }
            
            // Additional deadline checking logic
            const currentGameweek = this.managers.edition.getCurrentGameweek();
            const deadlineInfo = await this.managers.deadline.getDeadlineInfo(currentGameweek);
            
            if (deadlineInfo && deadlineInfo.isPassed) {
                // Deadline has passed, trigger auto-picks if not already done
                if (!this.managers.deadline.isDeadlinePassed()) {
                    await this.managers.deadline.handleDeadlinePassed(currentGameweek);
                }
            }
            
        } catch (error) {
            console.error('Error checking deadlines:', error);
        }
    }

    setupGlobalListeners() {
        // Set up global event listeners
        this.setupKeyboardShortcuts();
        this.setupErrorHandling();
        this.setupPerformanceMonitoring();
        this.setupConnectionResetButton();
    }
    
    setupConnectionResetButton() {
        const resetBtn = document.getElementById('resetConnectionBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                console.log('Manual connection reset requested');
                this.resetFirebaseConnection();
            });
        }
    }

    setupKeyboardShortcuts() {
        // Set up keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + R to refresh
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                this.refreshData();
            }
            
            // Escape to close modals
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    setupErrorHandling() {
        // Global error handling
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            this.handleError(e.error);
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            this.handleError(e.reason);
        });

        // Specific Firebase error handling
        if (window.firebaseDB) {
            // Listen for Firebase connection errors
            window.firebaseDB.enableNetwork().catch((error) => {
                if (error.message && error.message.includes('Target ID already exists')) {
                    console.log('Firebase connection conflict detected at DB level');
                    this.handleConnectionConflict();
                }
            });
        }
        
        // Add specific listener for Firebase errors
        window.addEventListener('firebaseError', (e) => {
            console.log('Firebase error event received:', e.detail);
            if (e.detail && e.detail.message && e.detail.message.includes('Target ID already exists')) {
                this.handleConnectionConflict();
            }
        });
    }

    handleError(error) {
        // Handle errors gracefully
        console.error('App error:', error);
        
        // Check for specific Firebase connection conflicts
        if (error.message && error.message.includes('Target ID already exists')) {
            console.log('Firebase connection conflict detected, handling gracefully...');
            this.handleConnectionConflict();
            return;
        }
        
        // Show user-friendly error message
        if (this.managers.auth) {
            this.managers.auth.showError('An error occurred. Please try refreshing the page.');
        }
    }

    setupPerformanceMonitoring() {
        // Monitor app performance
        if ('performance' in window && performance.timing) {
            window.addEventListener('load', () => {
                try {
                    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
                    if (loadTime > 0) {
                        console.log(`App loaded in ${loadTime}ms`);
                    }
                } catch (error) {
                    console.log('Performance monitoring unavailable');
                }
            });
        }
    }

    closeAllModals() {
        // Close all open modals
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.add('hidden');
        });
        
        // Close admin panel
        if (this.managers.admin) {
            this.managers.admin.hideAdminPanel();
        }
    }

    setupServiceWorker() {
        // Register service worker for PWA functionality
        if ('serviceWorker' in navigator) {
            // Add cache-busting query parameter for development
            const swUrl = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
                ? `/sw.js?v=${Date.now()}` 
                : '/sw.js';
            
            navigator.serviceWorker.register(swUrl)
                .then((registration) => {
                    console.log('Service Worker registered:', registration);
                    
                    // For development, check for updates more frequently
                    if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
                        setInterval(() => {
                            registration.update();
                        }, 5000); // Check every 5 seconds in development
                    }
                })
                .catch((error) => {
                    console.log('Service Worker registration failed:', error);
                });
        }
    }

    // Utility methods
    getManager(name) {
        return this.managers[name];
    }

    isOnline() {
        return navigator.onLine;
    }

    // App lifecycle methods
    pause() {
        // Pause app when not in focus
        console.log('App paused');
    }

    resume() {
        // Resume app when back in focus
        console.log('App resumed');
        this.refreshData();
    }

    updateConnectionStatus(isOnline) {
        // Update connection status
        if (this.uiService && typeof this.uiService.updateConnectionStatus === 'function') {
            if (isOnline) {
                this.uiService.updateConnectionStatus('connected', 'Connected');
            } else {
                this.uiService.updateConnectionStatus('disconnected', 'Disconnected');
            }
        }
    }

    destroy() {
        // Clean up resources
        console.log('Destroying app...');
        
        // Stop all intervals and listeners
        if (this.managers.deadline) {
            this.managers.deadline.destroy();
        }
        
        if (this.managers.scores) {
            this.managers.scores.destroy();
        }
        
        this.isInitialized = false;
    }
}

// Initialize the app
window.losApp = new LOSApp();

// Global Firebase ready check - runs independently of app initialization
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
        
        // Force AuthManager directly (critical for loading screen)
        if (window.authManager && window.authManager.loadUserData) {
            console.log('Global Firebase: Forcing AuthManager retry...');
            // Check if the app is fully initialized before calling AuthManager
            if (window.losApp && window.losApp.managers && window.losApp.managers.club) {
                console.log('Global Firebase: App is ready, calling AuthManager...');
                window.authManager.loadUserData();
            } else {
                console.log('Global Firebase: App not ready yet, waiting for initialization...');
                // Wait for app to be ready
                setTimeout(() => {
                    if (window.losApp && window.losApp.managers && window.losApp.managers.club) {
                        console.log('Global Firebase: App now ready, calling AuthManager...');
                        window.authManager.loadUserData();
                    } else {
                        console.log('Global Firebase: App still not ready after delay');
                    }
                }, 2000);
            }
        }
    } else if (!globalFirebaseHandled) {
        setTimeout(globalFirebaseCheck, 500); // Check more frequently
    }
};

// Start global Firebase checking immediately and more aggressively
globalFirebaseCheck();
setTimeout(globalFirebaseCheck, 1000);
setTimeout(globalFirebaseCheck, 3000);

// Global Firebase ready listener
window.addEventListener('firebaseReady', () => {
    console.log('Global Firebase ready event received, updating all managers...');
    // Update all manager database references
    if (window.losApp && window.losApp.managers) {
        Object.keys(window.losApp.managers).forEach(key => {
            if (window.losApp.managers[key]) {
                window.losApp.managers[key].db = window.firebaseDB;
                console.log(`Global update: ${key} manager DB reference set to: ${!!window.losApp.managers[key].db}`);
            }
        });
    }
});

// Handle app visibility changes
document.addEventListener('visibilitychange', () => {
    if (window.losApp && typeof window.losApp.pause === 'function' && typeof window.losApp.resume === 'function') {
        if (document.hidden) {
            window.losApp.pause();
        } else {
            window.losApp.resume();
        }
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    if (window.losApp && typeof window.losApp.updateConnectionStatus === 'function') {
        window.losApp.updateConnectionStatus(true);
    }
});

window.addEventListener('offline', () => {
    if (window.losApp && typeof window.losApp.updateConnectionStatus === 'function') {
        window.losApp.updateConnectionStatus(false);
    }
});

// Handle beforeunload
window.addEventListener('beforeunload', () => {
    if (window.losApp && typeof window.losApp.destroy === 'function') {
        window.losApp.destroy();
    }
});

// Export for global access
window.LOSApp = LOSApp;



// Firebase cleanup functions (added directly to app.js to ensure they load)

// Simple cleanup function
window.cleanupFirebase = async function() {
    console.log('🧹 Starting Firebase cleanup...');
    
    if (!window.firebaseDB) {
        console.error('❌ Firebase database not available');
        return;
    }
    
    const collectionsToDelete = ['users', 'picks', 'editions', 'fixtures', 'scores'];
    console.log('🗑️ Collections to delete:', collectionsToDelete);
    
    for (const collectionName of collectionsToDelete) {
        try {
            console.log(`🧹 Cleaning up collection: ${collectionName}`);
            
            const snapshot = await window.firebaseDB.collection(collectionName).get();
            
            if (snapshot.empty) {
                console.log(`✅ Collection ${collectionName} is already empty`);
                continue;
            }
            
            console.log(`📄 Found ${snapshot.size} documents in ${collectionName}`);
            
            const batch = window.firebaseDB.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            console.log(`✅ Deleted ${snapshot.size} documents from ${collectionName}`);
            
        } catch (error) {
            console.error(`❌ Error cleaning up ${collectionName}:`, error);
        }
    }
    
    console.log('🎉 Firebase cleanup completed!');
};

// Simple structure function
window.showFirebaseStructure = async function() {
    console.log('🏗️ Current database structure:');
    
    if (!window.firebaseDB) {
        console.error('❌ Firebase database not available');
        return;
    }
    
    try {
        const clubsSnapshot = await window.firebaseDB.collection('clubs').get();
        console.log(`📁 clubs: ${clubsSnapshot.size} clubs`);
        
        for (const clubDoc of clubsSnapshot.docs) {
            const clubData = clubDoc.data();
            console.log(`  🏟️ ${clubData.name || clubDoc.id}:`);
            
            const editionsSnapshot = await clubDoc.ref.collection('editions').get();
            console.log(`    📚 editions: ${editionsSnapshot.size} editions`);
            
            for (const editionDoc of editionsSnapshot.docs) {
                const editionData = editionDoc.data();
                console.log(`      📖 ${editionData.name || editionDoc.id}:`);
                
                const usersSnapshot = await editionDoc.ref.collection('users').get();
                const fixturesSnapshot = await editionDoc.ref.collection('fixtures').get();
                const picksSnapshot = await editionDoc.ref.collection('picks').get();
                
                console.log(`        👥 users: ${usersSnapshot.size}`);
                console.log(`        ⚽ fixtures: ${fixturesSnapshot.size}`);
                console.log(`        🎯 picks: ${picksSnapshot.size}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error checking current structure:', error);
    }
};

// Simple verify function
window.verifyFirebaseCleanup = async function() {
    console.log('🔍 Verifying cleanup...');
    
    if (!window.firebaseDB) {
        console.error('❌ Firebase database not available');
        return;
    }
    
    const collectionsToDelete = ['users', 'picks', 'editions', 'fixtures', 'scores'];
    
    for (const collectionName of collectionsToDelete) {
        try {
            const snapshot = await window.firebaseDB.collection(collectionName).limit(1).get();
            if (snapshot.empty) {
                console.log(`✅ ${collectionName}: Empty`);
            } else {
                console.log(`⚠️ ${collectionName}: Still has ${snapshot.size} documents`);
            }
        } catch (error) {
            console.log(`❌ ${collectionName}: Error checking - ${error.message}`);
        }
    }
};

// Firebase cleanup functions available: cleanupFirebase(), showFirebaseStructure(), verifyFirebaseCleanup()