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
        if (this.isInitialized) return;
        
        console.log('Initializing LOS App...');
        
        // Set window.losApp reference immediately so managers can access it
        window.losApp = this;
        
        // Initialize UI and Performance services
        this.initializeServices();
        
        // Initialize managers
        this.initializeManagers();
        
        // Set up global event listeners
        this.setupGlobalListeners();
        
        // Set up service worker for PWA functionality
        this.setupServiceWorker();
        
        this.isInitialized = true;
        console.log('LOS App initialized successfully');
    }

    initializeServices() {
        // Initialize UI Service for enhanced user experience
        if (window.UIService) {
            this.uiService = new window.UIService();
            window.uiService = this.uiService;
            console.log('✅ UIService initialized');
        } else {
            console.warn('⚠️ UIService not available');
        }

        // Initialize Performance Service for optimizations
        if (window.PerformanceService) {
            this.performanceService = new window.PerformanceService();
            window.performanceService = this.performanceService;
            console.log('✅ PerformanceService initialized');
        } else {
            console.warn('⚠️ PerformanceService not available');
        }
    }

    initializeManagers() {
        // Wait for all managers to be available
        const checkManagers = () => {
            const requiredManagers = [
                'authManager',
                'editionService',
                'fixturesManager',
                'scoresManager',
                'gameLogicManager',
                'pickStatusService',
                'deadlineService',
                'adminManager',
                'ClubService',
                'SuperAdminManager',
                'FixtureManagementManager'
            ];

            const allManagersReady = requiredManagers.every(manager => window[manager]);

            if (allManagersReady) {
                this.managers = {
                    auth: window.authManager,
                    edition: window.editionService,
                    fixtures: window.fixturesManager,
                    scores: window.scoresManager,
                    gameLogic: window.gameLogicManager,
                    pickStatus: window.pickStatusService,
                    deadline: window.deadlineService,
                    admin: window.adminManager,
                    club: new window.ClubService(),
                    superAdmin: new window.SuperAdminManager(),
                    fixtureManagement: new window.FixtureManagementManager()
                };

                console.log('All managers initialized');
                this.onManagersReady();
            } else {
                // Check again in 100ms
                setTimeout(checkManagers, 100);
            }
        };

        checkManagers();
    }

    onManagersReady() {
        console.log('🎯 onManagersReady() called');
        
        // Initialize managers first (this sets up basic structure but doesn't load data yet)
        console.log('🔧 About to call initializeManagerConnections()...');
        this.initializeManagerConnections();
        
        // Wait for Firebase to be fully ready before setting up connections
        console.log('⏳ About to call waitForFirebaseReady()...');
        this.waitForFirebaseReady();
        
        // Don't set up periodic tasks here - they will be set up after Firebase is ready
        // to prevent timing issues with manager database references
        console.log('✅ onManagersReady() completed');
    }

        async waitForFirebaseReady() {
        console.log('⏳ waitForFirebaseReady() called');
        let firebaseReadyHandled = false;
        
        const checkFirebase = () => {
            console.log('🔍 checkFirebase() called - checking Firebase readiness...');
            if (window.firebaseReady && window.firebaseDB && typeof window.firebaseDB.collection === 'function') {
                if (!firebaseReadyHandled) {
                    console.log('✅ Firebase is ready (detected by polling), proceeding with data loading...');
                    firebaseReadyHandled = true;
                    // Set up real-time listeners and connections first
                    this.setupRealtimeConnections();
                    // Force retry for managers that might be waiting
                    this.forceManagerRetry();
                    // Set up periodic tasks now that Firebase is ready
                    this.setupPeriodicTasks();
                }
            } else {
                console.log('⏳ Waiting for Firebase to be ready...');
                setTimeout(checkFirebase, 500);
            }
        };
        
        // Listen for the firebaseReady event
        window.addEventListener('firebaseReady', () => {
            console.log('🎉 Firebase ready event received - triggering manager retry');
            if (!firebaseReadyHandled) {
                firebaseReadyHandled = true;
                // Add a small delay to ensure Firebase is fully ready
                setTimeout(() => {
                    this.setupRealtimeConnections();
                    // Force retry for managers that might be waiting
                    this.forceManagerRetry();
                    // Set up periodic tasks now that Firebase is ready
                    this.setupPeriodicTasks();
                }, 500);
            }
        }, { once: true });
        
        // Start checking immediately and continue checking
        console.log('🚀 Starting Firebase readiness check...');
        checkFirebase();
    }

    initializeManagerConnections() {
        console.log('🔧 Initializing manager connections...');
        console.log('🔍 Available managers:', Object.keys(this.managers));
        
        // Initialize managers in the correct order - but don't load data yet
        if (this.managers.edition) {
            console.log('🚀 Calling EditionService.initBasic()...');
            this.managers.edition.initBasic();
        } else {
            console.log('❌ EditionService not available in this.managers');
        }
        
        if (this.managers.auth) {
            console.log('🚀 Calling AuthManager.initBasic()...');
            this.managers.auth.initBasic();
        } else {
            console.log('❌ AuthManager not available in this.managers');
        }
        
        if (this.managers.fixtures) {
            console.log('🚀 Calling FixturesManager.initBasic()...');
            this.managers.fixtures.initBasic();
        } else {
            console.log('❌ FixturesManager not available in this.managers');
        }
        
        if (this.managers.scores) {
            console.log('🚀 Calling ScoresManager.initBasic()...');
            this.managers.scores.initBasic();
        } else {
            console.log('❌ ScoresManager not available in this.managers');
        }
        
        if (this.managers.gameLogic) {
            console.log('🚀 Calling GameLogicManager.initBasic()...');
            this.managers.gameLogic.initBasic();
        } else {
            console.log('❌ GameLogicManager not available in this.managers');
        }
        
        if (this.managers.pickStatus) {
            console.log('🚀 Calling PickStatusService.initBasic()...');
            this.managers.pickStatus.initBasic();
        } else {
            console.log('❌ PickStatusService not available in this.managers');
        }
        
        if (this.managers.deadline) {
            console.log('🚀 Calling DeadlineService.initBasic()...');
            this.managers.deadline.initBasic();
        } else {
            console.log('❌ DeadlineService not available in this.managers');
        }
        
        if (this.managers.admin) {
            console.log('🚀 Calling AdminManager.initBasic()...');
            this.managers.admin.initBasic();
        } else {
            console.log('❌ AdminManager not available in this.managers');
        }
        
        if (this.managers.club) {
            console.log('🚀 Calling ClubService.initBasic()...');
            this.managers.club.initBasic();
        } else {
            console.log('❌ ClubService not available in this.managers');
        }
        
        if (this.managers.superAdmin) {
            console.log('🚀 Calling SuperAdminManager.initBasic()...');
            this.managers.superAdmin.initBasic();
        } else {
            console.log('❌ SuperAdminManager not available in this.managers');
        }

        if (this.managers.fixtureManagement) {
            console.log('🚀 Calling FixtureManagementManager.initBasic()...');
            this.managers.fixtureManagement.initBasic();
        } else {
            console.log('❌ FixtureManagementManager not available in this.managers');
        }
        
        console.log('✅ All manager connections initialized');
        
        // Now restore Firebase functionality to managers
        this.restoreManagerFirebaseConnections();
    }

    restoreManagerFirebaseConnections() {
        console.log('Restoring Firebase connections to managers...');
        
        // Just ensure managers have access to Firebase DB, but don't set up listeners yet
        // Real-time listeners will be set up by setupRealtimeConnections() after Firebase is ready
        if (this.managers.edition) {
            this.managers.edition.restoreFirebaseConnection();
        }
        if (this.managers.auth) {
            this.managers.auth.restoreFirebaseConnection();
        }
        if (this.managers.fixtures) {
            this.managers.fixtures.restoreFirebaseConnection();
        }
        if (this.managers.scores) {
            this.managers.scores.restoreFirebaseConnection();
        }
        if (this.managers.gameLogic) {
            this.managers.gameLogic.restoreFirebaseConnection();
        }
        if (this.managers.pickStatus) {
            this.managers.pickStatus.restoreFirebaseConnection();
        }
        if (this.managers.deadline) {
            this.managers.deadline.restoreFirebaseConnection();
        }
        if (this.managers.admin) {
            this.managers.admin.restoreFirebaseConnection();
        }
        if (this.managers.club) {
            this.managers.club.restoreFirebaseConnection();
        }
        
        if (this.managers.superAdmin) {
            this.managers.superAdmin.restoreFirebaseConnection();
        }

        if (this.managers.fixtureManagement) {
            this.managers.fixtureManagement.restoreFirebaseConnection();
        }

        if (this.managers.fixtureManagement) {
            this.managers.fixtureManagement.restoreFirebaseConnection();
        }
        
        console.log('Firebase connections restored to all managers');
    }

    // Coordinate manager operations to prevent conflicts
    async coordinateManagerOperation(operationName, operation) {
        if (this.connectionState.isConnecting) {
            console.log(`Operation ${operationName} delayed due to ongoing connection`);
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
    canAttemptConnection() {
        const now = Date.now();
        const timeSinceLastAttempt = now - this.connectionState.lastConnectionAttempt;
        
        // Prevent multiple simultaneous connection attempts
        if (this.connectionState.isConnecting) {
            console.log('Connection attempt already in progress, skipping...');
            return false;
        }
        
        // Rate limit connection attempts (minimum 2 seconds between attempts)
        if (timeSinceLastAttempt < 2000) {
            console.log('Connection attempt too soon, waiting...');
            return false;
        }
        
        return true;
    }

    // Development environment features
    setupDevelopmentFeatures() {
        console.log('🚀 Development mode detected - enabling enhanced features');
        
        // Add hot reload detection
        this.setupHotReload();
        
        // Add cache-busting for JavaScript files
        this.setupCacheBusting();
        
        // Add development console commands
        this.setupDevConsole();
    }

    setupHotReload() {
        // Check for file changes every 30 seconds in development
        setInterval(() => {
            // This is a simple approach - in a real app you might use WebSocket or Server-Sent Events
            if (this.isDevelopment) {
                // Force refresh of manager connections
                this.refreshManagerConnections();
            }
        }, 30000); // Increased from 2 seconds to 30 seconds to prevent Firestore state corruption
    }

    setupCacheBusting() {
        // Add cache-busting query parameters to script tags in development
        if (this.isDevelopment) {
            const scripts = document.querySelectorAll('script[src]');
            scripts.forEach(script => {
                if (script.src && !script.src.includes('?v=')) {
                    script.src += `?v=${Date.now()}`;
                }
            });
        }
    }

    setupDevConsole() {
        // Add development console commands
        if (this.isDevelopment) {
            window.dev = {
                refresh: () => {
                    console.log('🔄 Manual refresh triggered');
                    this.refreshManagerConnections();
                },
                clearCache: () => {
                    console.log('🗑️ Clearing all caches...');
                    if ('caches' in window) {
                        caches.keys().then(names => {
                            names.forEach(name => caches.delete(name));
                        });
                    }
                    // Clear localStorage
                    localStorage.clear();
                    console.log('✅ Caches cleared');
                },
                forceReload: () => {
                    console.log('🔄 Force reloading page...');
                    window.location.reload(true);
                }
            };
            
            console.log('🛠️ Development commands available:');
            console.log('  dev.refresh() - Refresh manager connections');
            console.log('  dev.clearCache() - Clear all caches');
            console.log('  dev.forceReload() - Force page reload');
        }
    }

    refreshManagerConnections() {
        if (this.managers) {
            console.log('🔄 Refreshing manager connections...');
            Object.keys(this.managers).forEach(key => {
                if (this.managers[key] && this.managers[key].clearListeners) {
                    this.managers[key].clearListeners();
                }
            });
            // Re-initialize connections
            this.setupRealtimeConnections();
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

    setConnectionState(connecting, connected = false) {
        this.connectionState.isConnecting = connecting;
        this.connectionState.isConnected = connected;
        this.connectionState.lastConnectionAttempt = Date.now();
        
        if (connecting) {
            this.connectionState.connectionRetryCount++;
        }
        
        console.log(`Connection state: connecting=${connecting}, connected=${connected}, retryCount=${this.connectionState.connectionRetryCount}`);
    }

    resetConnectionState() {
        this.connectionState.isConnecting = false;
        this.connectionState.isConnected = false;
        this.connectionState.connectionRetryCount = 0;
        console.log('Connection state reset');
    }

    // Handle connection conflicts gracefully
    handleConnectionConflict() {
        console.log('Connection conflict detected, implementing graceful handling...');
        
        // Clear all listeners to prevent further conflicts
        this.clearAllListeners();
        
        // More aggressive cleanup for Live Server environments
        if (window.firebaseDB) {
            try {
                console.log('Performing aggressive Firebase cleanup for Live Server...');
                // Clear manager database references
                Object.keys(this.managers).forEach(key => {
                    if (this.managers[key] && this.managers[key].clearListeners) {
                        this.managers[key].clearListeners();
                    }
                });
                
                // Reset connection state completely
                this.resetConnectionState();
                
                // Wait longer before attempting to reconnect to allow cleanup
                setTimeout(() => {
                    if (this.connectionState.connectionRetryCount < 5) { // Increased retry limit
                        console.log(`Attempting to recover from connection conflict (attempt ${this.connectionState.connectionRetryCount + 1})`);
                        // Force a fresh Firebase ready check
                        if (window.firebaseReady) {
                            this.setupRealtimeConnections();
                            this.forceManagerRetry();
                        } else {
                            console.log('Waiting for Firebase to become ready again...');
                            setTimeout(() => this.handleConnectionConflict(), 2000);
                        }
                    } else {
                        console.log('Max connection conflict recovery attempts reached, using fallback');
                        this.continueWithFallback();
                    }
                }, 3000); // Increased delay
                
            } catch (error) {
                console.log('Error during aggressive cleanup:', error);
                // Fallback to original behavior
                setTimeout(() => {
                    if (this.connectionState.connectionRetryCount < 3) {
                        console.log(`Attempting to recover from connection conflict (attempt ${this.connectionState.connectionRetryCount + 1})`);
                        this.setupRealtimeConnections();
                    } else {
                        console.log('Max connection conflict recovery attempts reached, using fallback');
                        this.continueWithFallback();
                    }
                }, 2000);
            }
        } else {
            // Original behavior if no firebaseDB
            setTimeout(() => {
                if (this.connectionState.connectionRetryCount < 3) {
                    console.log(`Attempting to recover from connection conflict (attempt ${this.connectionState.connectionRetryCount + 1})`);
                    this.setupRealtimeConnections();
                } else {
                    console.log('Max connection conflict recovery attempts reached, using fallback');
                    this.continueWithFallback();
                }
            }, 2000);
        }
    }

    // Enhanced listener management to prevent conflicts
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

    setupRealtimeConnections() {
        if (this.listenerSetupInProgress) {
            console.log('Listener setup already in progress, skipping...');
            return;
        }
        
        this.listenerSetupInProgress = true;
        console.log('Setting up real-time connections...');
        
        // Set up connection status monitoring
        this.monitorConnectionStatus();
        
        // Initialize all managers with full data loading now that Firebase is ready
        this.initializeManagersWithData();
        
        // Add a small delay to prevent listener conflicts
        setTimeout(() => {
            this.initializeRealtimeListeners();
            this.listenerSetupInProgress = false;
        }, 1000);
        
        // Delay setupLiveUpdates until after managers are fully initialized
        setTimeout(() => {
            this.setupLiveUpdates();
        }, 2000);
    }
    
    initializeManagersWithData() {
        console.log('Initializing managers with data loading...');
        
        // Ensure Firebase is fully ready before initializing managers
        if (!window.firebaseReady || !window.firebaseDB || typeof window.firebaseDB.collection !== 'function') {
            console.log('Firebase not fully ready, retrying manager initialization in 1 second...');
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
        
        console.log('All managers initialized with data loading');
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
            console.log('Realtime listeners setup delayed due to connection issues');
        }
    }
    
    forceManagerRetry() {
        console.log('Forcing manager retry after Firebase ready...');
        console.log(`Firebase state - Ready: ${window.firebaseReady}, DB: ${!!window.firebaseDB}, Collection: ${window.firebaseDB ? typeof window.firebaseDB.collection : 'undefined'}`);
        
        // Update all managers' database references
        Object.keys(this.managers).forEach(key => {
            if (this.managers[key]) {
                this.managers[key].db = window.firebaseDB;
                console.log(`${key} manager DB reference updated: ${!!this.managers[key].db}`);
            }
        });
        
        // Force retry for managers that might be waiting for Firebase
        if (this.managers.edition) {
            console.log('Forcing EditionService retry...');
            // Reset retry counters and try again
            this.managers.edition.loadSettingsRetryCount = 0;
            this.managers.edition.setupListenersRetryCount = 0;
            this.managers.edition.loadSettings();
            this.managers.edition.setupRealtimeListeners();
        }
        
        if (this.managers.fixtures) {
            console.log('Forcing FixturesManager retry...');
            // Reset retry counters and try again
            this.managers.fixtures.loadFixturesRetryCount = 0;
            this.managers.fixtures.loadFixtures();
        }
        
        if (this.managers.gameLogic) {
            console.log('Forcing GameLogicManager retry...');
            this.managers.gameLogic.loadUsersRetryCount = 0;
            if (typeof this.managers.gameLogic.loadUsers === 'function') {
                this.managers.gameLogic.loadUsers();
            } else {
                console.log('GameLogicManager.loadUsers method not available, skipping...');
            }
        }
        
        if (this.managers.auth) {
            console.log('Forcing AuthManager retry...');
            this.managers.auth.loadUserData();
        }
    }
    
    resetFirebaseConnection() {
        try {
            // Check if we can attempt a connection reset
            if (!this.canAttemptConnection()) {
                console.log('Connection reset already in progress, skipping...');
                return;
            }
            
            this.setConnectionState(true);
            console.log('Resetting Firebase connection...');
            
            // Clear any existing listeners and caches
            this.clearAllListeners();
            
            // Disable and re-enable network to reset connection
            window.firebaseDB.disableNetwork().then(() => {
                console.log('Firebase network disabled, re-enabling...');
                return window.firebaseDB.enableNetwork();
            }).then(() => {
                console.log('Firebase connection reset successful');
                this.resetConnectionState();
                
                // Wait longer before retrying to ensure connection is stable
                setTimeout(() => {
                    console.log('Retrying data loading after connection reset...');
                    // Use real-time connections to prevent conflicts
                    this.setupRealtimeConnections();
                }, 3000); // Reduced to 3 seconds
            }).catch((error) => {
                console.error('Failed to reset Firebase connection:', error);
                this.setConnectionState(false, false);
                // Even if reset fails, try to continue with fallback
                this.continueWithFallback();
            });
        } catch (error) {
            console.error('Error in resetFirebaseConnection:', error);
            this.setConnectionState(false, false);
            this.continueWithFallback();
        }
    }
    
    continueWithFallback() {
        console.log('Continuing with fallback approach...');
        // Try to load data with minimal Firebase operations
        if (this.managers.auth) {
            this.managers.auth.loadUserDataFallback();
        }
        if (this.managers.edition) {
            this.managers.edition.loadSettingsFallback();
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
            if (statusIndicator) {
                statusIndicator.className = `connection-status ${isOnline ? 'connected' : 'disconnected'}`;
                statusIndicator.textContent = isOnline ? 'Connected' : 'Disconnected';
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
        
        console.log('Setting up periodic tasks after Firebase is ready...');
        
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
new LOSApp();

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
            window.authManager.loadUserData();
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
    if (document.hidden) {
        window.losApp.pause();
    } else {
        window.losApp.resume();
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    console.log('App is online');
    window.losApp.updateConnectionStatus(true);
});

window.addEventListener('offline', () => {
    console.log('App is offline');
    window.losApp.updateConnectionStatus(false);
});

// Handle beforeunload
window.addEventListener('beforeunload', () => {
    window.losApp.destroy();
});

// Export for global access
window.LOSApp = LOSApp;

// Debug function for testing buttons
window.debugButtons = function() {
    console.log('🔍 === BUTTON DEBUG REPORT ===');
    const buttons = document.querySelectorAll('.pick-btn');
    console.log('Total pick buttons found:', buttons.length);
    
    buttons.forEach((button, index) => {
        const isDisabled = button.disabled;
        const hasUnavailableClass = button.classList.contains('unavailable');
        const teamName = button.dataset.team;
        const hasClickListener = button._hasClickListener || false;
        
        console.log(`Button ${index + 1}:`, {
            team: teamName,
            disabled: isDisabled,
            unavailable: hasUnavailableClass,
            visible: button.offsetWidth > 0 && button.offsetHeight > 0,
            hasClickListener: hasClickListener
        });
        
        // Test programmatic click
        if (!isDisabled && !hasUnavailableClass) {
            console.log(`🖱️ Testing programmatic click on ${teamName} button...`);
            button.click();
        }
    });
    
    console.log('🔍 === END BUTTON DEBUG ===');
};