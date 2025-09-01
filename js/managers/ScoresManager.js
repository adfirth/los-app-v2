class ScoresManager {
    constructor() {
        this.isInitialized = false;
        this.dataLoaded = false; // Track if data has been loaded
        this.currentFixtures = [];
        this.currentScores = [];
        this.db = null;
        
        // Vidiprinter properties
        this.vidiprinterData = [];
        this.vidiprinterInterval = null;
        this.lastVidiprinterUpdate = null;
        this.vidiprinterUpdateFrequency = 30000; // 30 seconds
        
        // API configuration
        this.apiConfig = null;
        this.footballWebPagesAPI = null;
        
        // Team badge service
        this.teamBadgeService = null;
        
        // Don't auto-initialize - wait for main app to control initialization
        // this.init();
        
        // Listen for API toggle changes
        this.setupAPIToggleListener();
    }

    async isAPIEnabled() {
        try {
            // Check global settings for API enablement
            if (this.db && typeof this.db.collection === 'function') {
                const globalSettings = await this.db.collection('global-settings').doc('system').get();
                if (globalSettings.exists) {
                    const data = globalSettings.data();
                    return data.apiRequestsEnabled !== false; // Default to true if not set
                }
            }
            
            // Fallback: check if we can access the global settings through window
            if (window.losApp?.managers?.superAdmin?.db) {
                const globalSettings = await window.losApp.managers.superAdmin.db
                    .collection('global-settings').doc('system').get();
                if (globalSettings.exists) {
                    const data = globalSettings.data();
                    return data.apiRequestsEnabled !== false;
                }
            }
            
            // Default to enabled if we can't check
            console.log('⚠️ ScoresManager: Could not check global API settings, defaulting to enabled');
            return true;
            
        } catch (error) {
            console.error('❌ ScoresManager: Error checking API enablement:', error);
            // Default to enabled on error
            return true;
        }
    }

    setupAPIToggleListener() {
        // Listen for API toggle changes from superadmin
        window.addEventListener('apiToggleChanged', (event) => {
            const { enabled } = event.detail;
            console.log(`🔌 ScoresManager: API toggle changed to: ${enabled}`);
            
            if (!enabled) {
                // Clear any pending requests or show a message
                console.log('🔌 ScoresManager: API requests are now disabled');
            } else {
                console.log('🔌 ScoresManager: API requests are now enabled');
            }
        });
    }

    initBasic() {
        if (this.isInitialized) return;
        
        // Only set up basic structure, don't load data yet
        this.isInitialized = true;
        console.log('ScoresManager basic initialization complete');
    }

    init() {
        if (this.isInitialized && this.dataLoaded) return;
        
        // Set up Firebase database reference
        this.db = window.firebaseDB;
        
        // Initialize API configuration
        this.initializeAPI();
        
        // Initialize team badge service
        this.initializeTeamBadgeService();
        
        // Load data and set up real-time listeners
        this.loadScores();
        this.setupRealtimeListeners();
        this.startVidiprinterUpdates();
        this.dataLoaded = true;
        console.log('ScoresManager full initialization complete');
    }

    initializeAPI() {
        try {
            // Load API configuration with multiple fallback sources
            this.apiConfig = this.loadAPIConfiguration();
            
            if (this.apiConfig && this.apiConfig.RAPIDAPI_KEY) {
                console.log('✅ ScoresManager: API configuration loaded');
            } else {
                console.warn('⚠️ ScoresManager: No API configuration found');
            }

            // Initialize Football Web Pages API if available
            if (window.FootballWebPagesAPI) {
                this.footballWebPagesAPI = new window.FootballWebPagesAPI(this.db, window.editionService?.getCurrentEdition());
                console.log('✅ ScoresManager: Football Web Pages API initialized');
            } else {
                console.warn('⚠️ ScoresManager: Football Web Pages API not available');
            }
        } catch (error) {
            console.error('❌ ScoresManager: Error initializing API:', error);
        }
    }

    loadAPIConfiguration() {
        // Wait for environment loader to finish if it's still loading
        if (window.environmentLoader && !window.environmentLoader.isLoaded()) {
            console.log('⏳ ScoresManager: Waiting for environment loader to finish...');
            return null;
        }

        // Try multiple sources for API configuration
        const configSources = [
            () => window.FOOTBALL_WEBPAGES_CONFIG,
            () => window.APIConfig?.rapidAPI ? {
                RAPIDAPI_KEY: window.APIConfig.rapidAPI.key,
                RAPIDAPI_HOST: window.APIConfig.rapidAPI.host,
                BASE_URL: window.APIConfig.rapidAPI.baseUrl
            } : null,
            () => window.ENV_CONFIG,
            () => ({ RAPIDAPI_KEY: window.RAPIDAPI_KEY }),
            () => window.footballWebPagesAPI?.config,
            () => window.apiManager?.footballWebPagesAPI?.config
        ];

        for (const source of configSources) {
            try {
                const config = source();
                if (config && config.RAPIDAPI_KEY && config.RAPIDAPI_KEY !== 'YOUR_RAPIDAPI_KEY_HERE') {
                    console.log('✅ ScoresManager: API configuration loaded from source');
                    return config;
                }
            } catch (error) {
                console.warn('⚠️ ScoresManager: Failed to load config from source:', error);
            }
        }

        console.warn('⚠️ ScoresManager: No valid API configuration found from any source');
        return null;
    }

    initializeTeamBadgeService() {
        try {
            if (window.TeamBadgeService) {
                this.teamBadgeService = new window.TeamBadgeService();
                this.teamBadgeService.initialize().then(() => {
                    console.log('✅ ScoresManager: Team badge service initialized');
                    // Preload badges for current fixtures if available
                    if (this.currentFixtures.length > 0) {
                        this.preloadTeamBadges();
                    }
                }).catch(error => {
                    console.warn('⚠️ ScoresManager: Team badge service initialization failed:', error);
                });
            } else {
                console.warn('⚠️ ScoresManager: TeamBadgeService not available');
            }
        } catch (error) {
            console.error('❌ ScoresManager: Error initializing team badge service:', error);
        }
    }

    restoreFirebaseConnection() {
        // This method will be called by the main app after initialization
        // to restore Firebase functionality
        console.log('ScoresManager Firebase connection restored');
        
        // Don't set up real-time listeners here - they will be set up by the main app
        // after Firebase is fully ready to prevent connection conflicts
    }

    clearListeners() {
        console.log('ScoresManager: Clearing listeners...');
        
        if (this.fixturesListener) {
            this.fixturesListener();
            this.fixturesListener = null;
            console.log('ScoresManager: Fixtures listener cleared');
        }

        // Stop vidiprinter updates
        this.stopVidiprinterUpdates();
        
        // Unregister from the main app's listener tracking
        if (window.losApp) {
            window.losApp.unregisterListener('scores-fixtures');
        }
    }

    destroy() {
        // Clean up resources
        this.clearListeners();
        console.log('ScoresManager destroyed');
    }

    setupRealtimeListeners() {
        // Ensure Firebase is ready
        if (!window.firebaseReady || !this.db || typeof this.db.collection !== 'function') {
            console.log('ScoresManager: Firebase not ready for real-time listeners, retrying in 2 seconds...');
            setTimeout(() => this.setupRealtimeListeners(), 2000);
            return;
        }

        // Check if listener is already registered to prevent conflicts
        const listenerId = 'scores-fixtures';
        if (window.losApp && !window.losApp.registerListener(listenerId, 'fixtures')) {
            console.log('ScoresManager: Fixtures listener already registered, skipping...');
            return;
        }

        try {
            // Listen for fixture updates to refresh scores
            const currentEdition = window.editionService.getCurrentEdition();
            const currentGameweek = window.editionService.getCurrentGameweek();
            
            // Get current club from ClubService
            const currentClub = window.losApp?.managers?.club?.currentClub || 'altrincham-fc-juniors';
            
            this.fixturesListener = this.db.collection('clubs')
                .doc(currentClub)
                .collection('editions')
                .doc(currentEdition)
                .collection('fixtures')
                .where('gameWeek', '==', currentGameweek)
                .onSnapshot((snapshot) => {
                    const fixtures = [];
                    snapshot.forEach(doc => {
                        const fixtureData = doc.data();
                        fixtures.push({
                            ...fixtureData,
                            id: doc.id,
                            gameweek: fixtureData.gameWeek || currentGameweek
                        });
                    });
                    this.currentFixtures = fixtures;
                    this.displayScores();
                }, (error) => {
                    console.error('ScoresManager: Fixtures listener error:', error);
                    // Handle specific Firebase errors
                    if (window.handleFirebaseError) {
                        window.handleFirebaseError(error, 'ScoresManager-fixtures');
                    }
                    
                    // If it's a "Target ID already exists" error, clear and retry
                    if (error.message && error.message.includes('Target ID already exists')) {
                        console.log('ScoresManager: Target ID conflict detected, clearing and retry...');
                        this.clearListeners();
                        setTimeout(() => this.setupRealtimeListeners(), 1000);
                    }
                });
                
            console.log('ScoresManager: Fixtures real-time listener established');
        } catch (error) {
            console.error('ScoresManager: Error setting up real-time listeners:', error);
            if (window.handleFirebaseError) {
                window.handleFirebaseError(error, 'ScoresManager-setup');
            }
        }
    }

    async loadScores() {
        try {
            console.log('🏆 ScoresManager: loadScores() called');
            
            // Ensure Firebase is ready
            if (!window.firebaseReady || !this.db || typeof this.db.collection !== 'function') {
                console.log('ScoresManager: Firebase not ready, retrying in 2 seconds...');
                
                // Try to update our database reference if Firebase is ready but we don't have it
                if (window.firebaseReady && window.firebaseDB && !this.db) {
                    console.log('ScoresManager: Updating database reference from global Firebase...');
                    this.db = window.firebaseDB;
                }
                
                setTimeout(() => this.loadScores(), 2000);
                return;
            }
            
            // Show loading state
            this.showLoadingState();
            
            // Get current club from ClubService
            const currentClub = window.losApp?.managers?.club?.currentClub || 'altrincham-fc-juniors';
            
            // Get current gameweek and edition from EditionService
            const currentGameweek = window.losApp?.managers?.edition?.getCurrentGameweek() || 1;
            const currentEdition = window.losApp?.managers?.edition?.getCurrentEdition() || '2025-26-national-league-1';
            
            console.log('🏆 ScoresManager: Loading scores for:', {
                club: currentClub,
                edition: currentEdition,
                gameweek: currentGameweek
            });
            
            // Load scores for current gameweek from new club-based structure
            const fixturesSnapshot = await this.db.collection('clubs')
                .doc(currentClub)
                .collection('editions')
                .doc(currentEdition)
                .collection('fixtures')
                .where('gameWeek', '==', currentGameweek)
                .get();
            
            console.log('🏆 ScoresManager: Database query result:', {
                size: fixturesSnapshot.size,
                empty: fixturesSnapshot.empty,
                path: `clubs/${currentClub}/editions/${currentEdition}/fixtures`
            });
            
            const fixtures = [];
            fixturesSnapshot.forEach(doc => {
                const fixtureData = doc.data();
                fixtures.push({
                    ...fixtureData,
                    id: doc.id,
                    gameweek: fixtureData.gameWeek || currentGameweek
                });
            });
            this.currentScores = fixtures;
            this.currentFixtures = fixtures; // Also set currentFixtures for display methods
            
            // Display scores
            console.log('🏆 ScoresManager: About to display scores with', fixtures.length, 'fixtures');
            this.displayScores();
            console.log('🏆 ScoresManager: Scores display completed');
            
        } catch (error) {
            console.error('Error loading scores:', error);
            window.authManager.showError('Failed to load scores');
            this.showEmptyState();
        }
    }

    displayScores() {
        const scoresList = document.getElementById('scoresList');
        if (!scoresList) return;

        if (this.currentFixtures.length === 0) {
            scoresList.innerHTML = `
                <div class="scores-container">
                    <div class="scores-section">
                        <h3 class="section-title">Live Scores</h3>
                        <div class="empty-state">
                            <i class="fas fa-futbol"></i>
                            <p>No fixtures available for this gameweek.</p>
                            <p class="empty-state-subtitle">Fixtures will appear here once they are loaded.</p>
                        </div>
                    </div>
                    
                    <div class="vidiprinter-section">
                        <h3 class="section-title">Live Updates</h3>
                        <div class="vidiprinter-container">
                            <div class="vidiprinter-header">
                                <span class="vidiprinter-title">Vidiprinter</span>
                                <div class="vidiprinter-controls">
                                    <span class="vidiprinter-status">No Fixtures</span>
                                    <button id="refreshVidiprinter" class="btn btn-sm btn-secondary" title="Refresh Updates">
                                        <i class="fas fa-sync-alt"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="vidiprinter-content">
                                <div class="vidiprinter-empty">
                                    <i class="fas fa-info-circle"></i>
                                    <p>No fixtures available to track</p>
                                    <p class="empty-state-subtitle">Load fixtures first to see live updates</p>
                                </div>
                            </div>
                            <div class="vidiprinter-footer">
                                <span class="last-updated">Last updated: Never</span>
                                <span class="update-frequency">Updates every 30s</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Set up refresh button even when no fixtures
            this.setupVidiprinterControls();
            return;
        }

        // Create the scores display with vidiprinter
        const scoresHTML = `
            <div class="scores-container">
                <div class="scores-section">
                    <h3 class="section-title">Live Scores</h3>
                    <div class="fixtures-scores">
                        ${this.currentFixtures.map(fixture => this.createFixtureScore(fixture)).join('')}
                    </div>
                </div>
                
                <div class="vidiprinter-section">
                    <h3 class="section-title">Live Updates</h3>
                    <div class="vidiprinter-container">
                        <div class="vidiprinter-header">
                            <span class="vidiprinter-title">Vidiprinter</span>
                            <div class="vidiprinter-controls">
                                <span class="vidiprinter-status" id="vidiprinterStatus">Live</span>
                                <button id="refreshVidiprinter" class="btn btn-sm btn-secondary" title="Refresh Updates">
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>
                        </div>
                        <div class="vidiprinter-content" id="vidiprinterContent">
                            <div class="vidiprinter-loading">
                                <div class="loading-dots">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                                <p>Loading live updates...</p>
                            </div>
                        </div>
                        <div class="vidiprinter-footer">
                            <span class="last-updated" id="lastUpdated">Last updated: Never</span>
                            <span class="update-frequency">Updates every 30s</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        scoresList.innerHTML = scoresHTML;
        
        // Initialize vidiprinter display
        this.initializeVidiprinterDisplay();
    }

    createFixtureScore(fixture) {
        const status = fixture.status || 'scheduled';
        const homeScore = fixture.homeScore !== null ? fixture.homeScore : '-';
        const awayScore = fixture.awayScore !== null ? fixture.awayScore : '-';
        
        // Create team displays with badges
        const homeTeamDisplay = this.createTeamWithBadgeHTML(fixture.homeTeam, 'small', 'home');
        const awayTeamDisplay = this.createTeamWithBadgeHTML(fixture.awayTeam, 'small', 'away');
        
        return `
            <div class="score-fixture">
                <div class="score-teams">
                    <div class="score-team">
                        ${homeTeamDisplay}
                    </div>
                    
                    <div class="score-display">
                        <span>${homeScore}</span>
                        <span>-</span>
                        <span>${awayScore}</span>
                    </div>
                    
                    <div class="score-team away">
                        ${awayTeamDisplay}
                    </div>
                </div>
                
                <div class="score-info">
                    <div class="score-time">
                        ${window.losApp?.managers?.edition?.formatDate?.(fixture.date) || 'Date TBC'} at ${fixture.kickOffTime ? (window.losApp?.managers?.edition?.formatTime?.(fixture.kickOffTime) || fixture.kickOffTime) : 'Time TBC'}
                    </div>
                    <div class="score-status-badge ${status}">
                        ${status.toUpperCase()}
                    </div>
                </div>
            </div>
        `;
    }

    // Vidiprinter functionality
    startVidiprinterUpdates() {
        if (this.vidiprinterInterval) {
            this.stopVidiprinterUpdates();
        }

        console.log('🎯 ScoresManager: Starting vidiprinter updates...');
        
        // Initial load
        this.updateVidiprinter();
        
        // Set up periodic updates
        this.vidiprinterInterval = setInterval(() => {
            this.updateVidiprinter();
        }, this.vidiprinterUpdateFrequency);
        
        console.log('✅ ScoresManager: Vidiprinter updates started');
    }

    stopVidiprinterUpdates() {
        if (this.vidiprinterInterval) {
            clearInterval(this.vidiprinterInterval);
            this.vidiprinterInterval = null;
            console.log('🛑 ScoresManager: Vidiprinter updates stopped');
        }
    }

    async updateVidiprinter() {
        try {
            // Try to reload API configuration if not available
            if (!this.apiConfig || !this.apiConfig.RAPIDAPI_KEY) {
                console.log('🔄 ScoresManager: Retrying API configuration load...');
                this.apiConfig = this.loadAPIConfiguration();
            }

            if (!this.apiConfig || !this.apiConfig.RAPIDAPI_KEY) {
                console.warn('⚠️ ScoresManager: No API key available for vidiprinter updates');
                this.updateVidiprinterStatus('No API Key', 'error');
                return;
            }

            // Get current date for API request
            const today = new Date().toISOString().split('T')[0];
            
            // Fetch vidiprinter data from Football Web Pages API
            const vidiprinterData = await this.fetchVidiprinterData(today);
            
            if (vidiprinterData && vidiprinterData.events) {
                this.vidiprinterData = vidiprinterData.events;
                this.updateVidiprinterDisplay();
                this.lastVidiprinterUpdate = new Date();
                
                console.log(`✅ ScoresManager: Vidiprinter updated with ${this.vidiprinterData.length} events`);
                
                // Sync scores from vidiprinter data
                await this.syncScoresFromVidiprinter();
                
                // Update timestamp display
                this.updateLastUpdatedTimestamp();
            } else {
                console.log('ℹ️ ScoresManager: No events found in vidiprinter data');
                this.updateVidiprinterStatus('No Updates', 'idle');
            }
            
        } catch (error) {
            console.error('❌ ScoresManager: Error updating vidiprinter:', error);
            this.updateVidiprinterStatus('Error', 'error');
            
            // Show more specific error messages
            if (error.message.includes('API key')) {
                this.updateVidiprinterStatus('Invalid API Key', 'error');
            } else if (error.message.includes('CORS')) {
                this.updateVidiprinterStatus('CORS Error', 'error');
            } else if (error.message.includes('rate limit')) {
                this.updateVidiprinterStatus('Rate Limited', 'error');
            }
        }
    }

    async fetchVidiprinterData(date) {
        try {
            // Use the Football Web Pages API if available
            if (this.footballWebPagesAPI && this.footballWebPagesAPI.isInitialized) {
                // For now, we'll use a direct API call since the vidiprinter endpoint might not be in the existing API class
                return await this.makeDirectVidiprinterRequest(date);
            } else {
                // Fallback to direct API call
                return await this.makeDirectVidiprinterRequest(date);
            }
        } catch (error) {
            console.error('❌ ScoresManager: Error fetching vidiprinter data:', error);
            
            // In development mode, try to load sample data
            if (this.isDevelopmentMode()) {
                console.log('🔧 ScoresManager: Development mode detected, trying to load sample data...');
                return this.loadSampleVidiprinterData();
            }
            
            throw error;
        }
    }

    isDevelopmentMode() {
        return window.location.hostname === '127.0.0.1' || 
               window.location.hostname === 'localhost' || 
               window.location.hostname.includes('5500');
    }

    loadSampleVidiprinterData() {
        // Sample data based on the attached vidiprinter output
        const sampleData = {
            vidiprinter: {
                competition: {
                    name: "Enterprise National League",
                    id: 5
                },
                events: [
                    {
                        "date/time": "2025-08-09 22:33:44",
                        "type": "Attendance",
                        "text": "Braintree Town v FC Halifax Town - Attendance: 1,011",
                        "match": {
                            "home-team": { "score": 3, "name": "Braintree Town" },
                            "away-team": { "score": 0, "name": "FC Halifax Town" }
                        }
                    },
                    {
                        "date/time": "2025-08-09 17:00:53",
                        "type": "Full-time",
                        "text": "Braintree Town 3-0 FC Halifax Town",
                        "match": {
                            "home-team": { "score": 3, "name": "Braintree Town" },
                            "away-team": { "score": 0, "name": "FC Halifax Town" }
                        }
                    },
                    {
                        "date/time": "2025-08-09 16:39:50",
                        "type": "Goals",
                        "text": "ALTRINCHAM 3-2 Aldershot Town",
                        "match": {
                            "home-team": { "score": 3, "name": "Altrincham" },
                            "away-team": { "score": 2, "name": "Aldershot Town" }
                        }
                    },
                    {
                        "date/time": "2025-08-09 15:49:44",
                        "type": "Half-time",
                        "text": "Altrincham 2-0 Aldershot Town - Half-time",
                        "match": {
                            "home-team": { "score": 2, "name": "Altrincham" },
                            "away-team": { "score": 0, "name": "Aldershot Town" }
                        }
                    },
                    {
                        "date/time": "2025-08-09 15:01:10",
                        "type": "Kick-off",
                        "text": "Altrincham v Aldershot Town",
                        "match": {
                            "home-team": { "score": null, "name": "Altrincham" },
                            "away-team": { "score": null, "name": "Aldershot Town" }
                        }
                    }
                ]
            }
        };
        
        console.log('✅ ScoresManager: Sample vidiprinter data loaded for development');
        return sampleData.vidiprinter;
    }

    async makeDirectVidiprinterRequest(date) {
        try {
            // Check if API requests are enabled globally
            if (!(await this.isAPIEnabled())) {
                console.log('🔌 ScoresManager: API requests are disabled globally');
                throw new Error('API requests are currently disabled by system administrator');
            }
            
            let url;
            let headers;
            
            // Check if we're in development (Netlify functions not available)
            if (this.isDevelopmentMode()) {
                console.log('🔧 ScoresManager: Development mode detected, using direct API call (may have CORS issues)');
                url = `https://football-web-pages1.p.rapidapi.com/vidiprinter.json?comp=5&team=0&date=${date}`;
                headers = {
                    'X-RapidAPI-Key': this.apiConfig.RAPIDAPI_KEY,
                    'X-RapidAPI-Host': 'football-web-pages1.p.rapidapi.com'
                };
            } else {
                // Use Netlify function to avoid CORS issues in production
                console.log('🚀 ScoresManager: Production mode, using Netlify function');
                url = `/.netlify/functions/fetch-vidiprinter?comp=5&team=0&date=${date}`;
                headers = {
                    'Content-Type': 'application/json'
                };
            }
            
            console.log(`🔍 ScoresManager: Fetching vidiprinter data from: ${url}`);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                // If Netlify function fails, try direct API call as fallback
                if (!this.isDevelopmentMode() && response.status === 404) {
                    console.log('⚠️ ScoresManager: Netlify function not found, trying direct API call...');
                    return await this.makeDirectAPICall(date);
                }
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.vidiprinter || { events: [] };
            
        } catch (error) {
            console.error('❌ ScoresManager: Direct vidiprinter request failed:', error);
            
            // If Netlify function fails, try direct API call as fallback
            if (!this.isDevelopmentMode() && error.message.includes('404')) {
                console.log('⚠️ ScoresManager: Netlify function failed, trying direct API call as fallback...');
                try {
                    return await this.makeDirectAPICall(date);
                } catch (fallbackError) {
                    console.error('❌ ScoresManager: Direct API fallback also failed:', fallbackError);
                }
            }
            
            throw error;
        }
    }

    async makeDirectAPICall(date) {
        console.log('🔧 ScoresManager: Making direct API call...');
        
        const url = `https://football-web-pages1.p.rapidapi.com/vidiprinter.json?comp=5&team=0&date=${date}`;
        const headers = {
            'X-RapidAPI-Key': this.apiConfig.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'football-web-pages1.p.rapidapi.com'
        };
        
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`Direct API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.vidiprinter || { events: [] };
    }

    initializeVidiprinterDisplay() {
        const vidiprinterContent = document.getElementById('vidiprinterContent');
        if (!vidiprinterContent) return;

        // Show initial loading state
        this.updateVidiprinterStatus('Loading...', 'loading');
        
        // Set up refresh button event listener
        this.setupVidiprinterControls();
        
        // If we have data, display it immediately
        if (this.vidiprinterData.length > 0) {
            this.updateVidiprinterDisplay();
        }
    }

    setupVidiprinterControls() {
        const refreshButton = document.getElementById('refreshVidiprinter');
        if (refreshButton) {
            refreshButton.addEventListener('click', async () => {
                console.log('🔄 ScoresManager: Manual vidiprinter refresh requested');
                
                // Disable button temporarily
                refreshButton.disabled = true;
                refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                
                try {
                    await this.updateVidiprinter();
                    this.updateLastUpdatedTimestamp();
                } catch (error) {
                    console.error('❌ ScoresManager: Manual refresh failed:', error);
                    this.updateVidiprinterStatus('Error', 'error');
                } finally {
                    // Re-enable button
                    refreshButton.disabled = false;
                    refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i>';
                }
            });
        }

        // Add development controls if in development mode
        if (this.isDevelopmentMode()) {
            this.addDevelopmentControls();
        }
    }

    addDevelopmentControls() {
        const vidiprinterContent = document.getElementById('vidiprinterContent');
        if (!vidiprinterContent) return;

        // Add development controls above the content
        const devControls = document.createElement('div');
        devControls.className = 'development-controls';
        devControls.innerHTML = `
            <div class="dev-controls-header">
                <span class="dev-label">Development Mode</span>
                <button id="loadSampleData" class="btn btn-sm btn-info">
                    <i class="fas fa-database"></i> Load Sample Data
                </button>
            </div>
        `;

        vidiprinterContent.insertBefore(devControls, vidiprinterContent.firstChild);

        // Add event listener for sample data button
        const sampleDataButton = document.getElementById('loadSampleData');
        if (sampleDataButton) {
            sampleDataButton.addEventListener('click', () => {
                console.log('🔧 ScoresManager: Loading sample data manually...');
                
                // Load sample data
                const sampleData = this.loadSampleVidiprinterData();
                this.vidiprinterData = sampleData.events;
                this.updateVidiprinterDisplay();
                this.lastVidiprinterUpdate = new Date();
                this.updateLastUpdatedTimestamp();
                this.updateVidiprinterStatus('Sample Data', 'idle');
                
                console.log('✅ ScoresManager: Sample data loaded manually');
            });
        }
        
        // Add additional development controls
        const additionalControls = document.createElement('div');
        additionalControls.className = 'additional-dev-controls';
        additionalControls.innerHTML = `
            <div class="dev-controls-buttons">
                <button id="syncScoresBtn" class="btn btn-sm btn-primary">
                    <i class="fas fa-sync"></i> Sync Scores
                </button>
                <button id="saveScoresBtn" class="btn btn-sm btn-success">
                    <i class="fas fa-save"></i> Save to DB
                </button>
                <button id="manualSyncBtn" class="btn btn-sm btn-info">
                    <i class="fas fa-cogs"></i> Manual Sync
                </button>
            </div>
        `;
        
        vidiprinterContent.insertBefore(additionalControls, vidiprinterContent.firstChild);
        
        // Add event listeners for additional controls
        const syncScoresBtn = document.getElementById('syncScoresBtn');
        if (syncScoresBtn) {
            syncScoresBtn.addEventListener('click', async () => {
                console.log('🔧 ScoresManager: Manual score sync...');
                await this.syncScoresFromVidiprinterManual();
            });
        }
        
        const saveScoresBtn = document.getElementById('saveScoresBtn');
        if (saveScoresBtn) {
            saveScoresBtn.addEventListener('click', async () => {
                console.log('🔧 ScoresManager: Manual database save...');
                await this.saveCurrentScoresToDatabase();
            });
        }
        
        const manualSyncBtn = document.getElementById('manualSyncBtn');
        if (manualSyncBtn) {
            manualSyncBtn.addEventListener('click', async () => {
                console.log('🔧 ScoresManager: Full manual sync...');
                // Load sample data, sync scores, and save to database
                this.loadSampleVidiprinterData();
                await this.syncScoresFromVidiprinter();
            });
        }
        
        // Add team badge development controls
        const badgeControls = document.createElement('div');
        badgeControls.className = 'badge-dev-controls';
        badgeControls.innerHTML = `
            <div class="dev-controls-buttons">
                <button id="preloadBadgesBtn" class="btn btn-sm btn-warning">
                    <i class="fas fa-download"></i> Preload Badges
                </button>
                <button id="clearBadgeCacheBtn" class="btn btn-sm btn-danger">
                    <i class="fas fa-trash"></i> Clear Cache
                </button>
                <button id="testBadgeBtn" class="btn btn-sm btn-info">
                    <i class="fas fa-test-tube"></i> Test Badge
                </button>
            </div>
        `;
        
        vidiprinterContent.insertBefore(badgeControls, vidiprinterContent.firstChild);
        
        // Add event listeners for badge controls
        const preloadBadgesBtn = document.getElementById('preloadBadgesBtn');
        if (preloadBadgesBtn) {
            preloadBadgesBtn.addEventListener('click', async () => {
                console.log('🔧 ScoresManager: Preloading team badges...');
                await this.preloadTeamBadges();
            });
        }
        
        const clearBadgeCacheBtn = document.getElementById('clearBadgeCacheBtn');
        if (clearBadgeCacheBtn) {
            clearBadgeCacheBtn.addEventListener('click', () => {
                console.log('🔧 ScoresManager: Clearing badge cache...');
                if (this.teamBadgeService) {
                    this.teamBadgeService.clearCache();
                }
            });
        }
        
        const testBadgeBtn = document.getElementById('testBadgeBtn');
        if (testBadgeBtn) {
            testBadgeBtn.addEventListener('click', async () => {
                console.log('🔧 ScoresManager: Testing team badge...');
                if (this.teamBadgeService) {
                    const badge = await this.teamBadgeService.getTeamBadge('Arsenal', 'small');
                    console.log('Arsenal badge:', badge);
                }
            });
        }
    }

    updateLastUpdatedTimestamp() {
        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (!lastUpdatedElement) return;

        if (this.lastVidiprinterUpdate) {
            const now = new Date();
            const timeDiff = now - this.lastVidiprinterUpdate;
            const secondsAgo = Math.floor(timeDiff / 1000);
            
            if (secondsAgo < 60) {
                lastUpdatedElement.textContent = `Last updated: ${secondsAgo}s ago`;
            } else if (secondsAgo < 3600) {
                const minutesAgo = Math.floor(secondsAgo / 60);
                lastUpdatedElement.textContent = `Last updated: ${minutesAgo}m ago`;
            } else {
                const hoursAgo = Math.floor(secondsAgo / 3600);
                lastUpdatedElement.textContent = `Last updated: ${hoursAgo}h ago`;
            }
        } else {
            lastUpdatedElement.textContent = 'Last updated: Never';
        }
    }

    updateVidiprinterDisplay() {
        const vidiprinterContent = document.getElementById('vidiprinterContent');
        if (!vidiprinterContent) return;

        if (this.vidiprinterData.length === 0) {
            vidiprinterContent.innerHTML = `
                <div class="vidiprinter-empty">
                    <i class="fas fa-info-circle"></i>
                    <p>No live updates available</p>
                </div>
            `;
            this.updateVidiprinterStatus('No Updates', 'idle');
            return;
        }

        // Sort events by date/time (newest first)
        const sortedEvents = [...this.vidiprinterData].sort((a, b) => {
            const dateA = new Date(a['date/time']);
            const dateB = new Date(b['date/time']);
            return dateB - dateA;
        });

        // Take the most recent 20 events
        const recentEvents = sortedEvents.slice(0, 20);

        const eventsHTML = recentEvents.map(event => this.createVidiprinterEvent(event)).join('');
        
        vidiprinterContent.innerHTML = `
            <div class="vidiprinter-events">
                ${eventsHTML}
            </div>
        `;

        this.updateVidiprinterStatus('Live', 'live');
    }

    createVidiprinterEvent(event) {
        const eventType = event.type || 'Unknown';
        const eventTime = this.formatEventTime(event['date/time']);
        const eventText = event.text || 'No description';
        
        // Determine event type styling
        let eventClass = 'event-default';
        let eventIcon = 'fas fa-info-circle';
        
        switch (eventType.toLowerCase()) {
            case 'goals':
                eventClass = 'event-goal';
                eventIcon = 'fas fa-futbol';
                break;
            case 'kick-off':
                eventClass = 'event-kickoff';
                eventIcon = 'fas fa-play';
                break;
            case 'half-time':
                eventClass = 'event-halftime';
                eventIcon = 'fas fa-clock';
                break;
            case 'full-time':
                eventClass = 'event-fulltime';
                eventIcon = 'fas fa-flag-checkered';
                break;
            case 'attendance':
                eventClass = 'event-attendance';
                eventIcon = 'fas fa-users';
                break;
            case 'league-table':
                eventClass = 'event-table';
                eventIcon = 'fas fa-table';
                break;
            case 'correction':
                eventClass = 'event-correction';
                eventIcon = 'fas fa-exclamation-triangle';
                break;
        }

        // Enhance event text with team badges if teams are mentioned
        let enhancedEventText = eventText;
        if (this.teamBadgeService) {
            // Look for team names in the event text and add badges
            this.currentFixtures.forEach(fixture => {
                if (fixture.homeTeam && eventText.includes(fixture.homeTeam)) {
                    const badgeHTML = this.createTeamBadgeHTML(fixture.homeTeam, 'tiny');
                    if (badgeHTML) {
                        enhancedEventText = enhancedEventText.replace(
                            fixture.homeTeam, 
                            `${badgeHTML} ${fixture.homeTeam}`
                        );
                    }
                }
                if (fixture.awayTeam && eventText.includes(fixture.awayTeam)) {
                    const badgeHTML = this.createTeamBadgeHTML(fixture.awayTeam, 'tiny');
                    if (badgeHTML) {
                        enhancedEventText = enhancedEventText.replace(
                            fixture.awayTeam, 
                            `${badgeHTML} ${fixture.awayTeam}`
                        );
                    }
                }
            });
        }

        return `
            <div class="vidiprinter-event ${eventClass}">
                <div class="event-header">
                    <i class="${eventIcon}"></i>
                    <span class="event-type">${eventType}</span>
                    <span class="event-time">${eventTime}</span>
                </div>
                <div class="event-text">${enhancedEventText}</div>
            </div>
        `;
    }

    formatEventTime(dateTimeString) {
        try {
            const date = new Date(dateTimeString);
            return date.toLocaleTimeString('en-GB', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            });
        } catch (error) {
            return dateTimeString;
        }
    }

    updateVidiprinterStatus(status, type) {
        const statusElement = document.getElementById('vidiprinterStatus');
        if (!statusElement) return;

        statusElement.textContent = status;
        statusElement.className = `vidiprinter-status ${type}`;
    }

    // Sync scores from vidiprinter data
    async syncScoresFromVidiprinter() {
        try {
            if (!this.vidiprinterData || this.vidiprinterData.length === 0) {
                return;
            }

            console.log('🔄 ScoresManager: Syncing scores from vidiprinter data...');
            
            // Get current fixtures
            const currentGameweek = window.editionService.getCurrentGameweek();
            const currentEdition = window.editionService.getCurrentEdition();
            
            if (!this.db) {
                console.warn('⚠️ ScoresManager: Database not available for score sync');
                return;
            }

            // Get current club from ClubService
            const currentClub = window.losApp?.managers?.club?.currentClub || 'altrincham-fc-juniors';
            
            // Get fixtures from new club-based structure
            const fixturesSnapshot = await this.db.collection('clubs')
                .doc(currentClub)
                .collection('editions')
                .doc(currentEdition)
                .collection('fixtures')
                .where('gameWeek', '==', currentGameweek)
                .get();
            
            if (fixturesSnapshot.empty) {
                console.log('ℹ️ ScoresManager: No fixtures found for current gameweek');
                return;
            }

            const fixtures = [];
            const fixtureDocs = [];
            fixturesSnapshot.forEach(doc => {
                const fixtureData = doc.data();
                fixtures.push({
                    ...fixtureData,
                    id: doc.id,
                    gameweek: fixtureData.gameWeek || currentGameweek
                });
                fixtureDocs.push(doc);
            });
            
            let hasUpdates = false;

            // Process vidiprinter events to update scores
            for (const event of this.vidiprinterData) {
                if (event.match && event.type === 'Full-time') {
                    // Update final scores
                    const updatedFixture = this.updateFixtureFromVidiprinterEvent(fixtures, event);
                    if (updatedFixture) {
                        hasUpdates = true;
                    }
                } else if (event.match && event.type === 'Goals') {
                    // Update live scores
                    const updatedFixture = this.updateFixtureFromVidiprinterEvent(fixtures, event);
                    if (updatedFixture) {
                        hasUpdates = true;
                    }
                }
            }

            // Save updates if any were made
            if (hasUpdates) {
                // Update individual fixture documents
                const batch = this.db.batch();
                fixtures.forEach((fixture, index) => {
                    const docRef = fixtureDocs[index].ref;
                    batch.update(docRef, {
                        homeScore: fixture.homeScore,
                        awayScore: fixture.awayScore,
                        status: fixture.status,
                        last_vidiprinter_sync: new Date().toISOString(),
                        updated_at: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
                
                await batch.commit();
                
                console.log('✅ ScoresManager: Scores synced from vidiprinter data');
                
                // Update local data and refresh display
                this.currentFixtures = fixtures;
                this.displayScores();
                
                // Save scores to database for persistence
                console.log('💾 Saving synced scores to database...');
                await this.saveScoresToDatabase();
            }

        } catch (error) {
            console.error('❌ ScoresManager: Error syncing scores from vidiprinter:', error);
        }
    }

    updateFixtureFromVidiprinterEvent(fixtures, event) {
        if (!event.match || !event.match['home-team'] || !event.match['away-team']) {
            return false;
        }

        const homeTeamName = event.match['home-team'].name;
        const awayTeamName = event.match['away-team'].name;
        const homeScore = event.match['home-team'].score;
        const awayScore = event.match['away-team'].score;

        // Find matching fixture
        const fixtureIndex = fixtures.findIndex(fixture => 
            fixture.homeTeam === homeTeamName && fixture.awayTeam === awayTeamName
        );

        if (fixtureIndex === -1) {
            return false;
        }

        const fixture = fixtures[fixtureIndex];
        let hasChanges = false;

        // Update scores if they've changed
        if (fixture.homeScore !== homeScore) {
            fixture.homeScore = homeScore;
            hasChanges = true;
        }

        if (fixture.awayScore !== awayScore) {
            fixture.awayScore = awayScore;
            hasChanges = true;
        }

        // Update status based on event type
        if (event.type === 'Full-time') {
            if (fixture.status !== 'completed') {
                fixture.status = 'completed';
                hasChanges = true;
            }
        } else if (event.type === 'Goals') {
            if (fixture.status !== 'live' && fixture.status !== 'completed') {
                fixture.status = 'live';
                hasChanges = true;
            }
        } else if (event.type === 'Half-time') {
            if (fixture.status !== 'half-time') {
                fixture.status = 'half-time';
                hasChanges = true;
            }
        } else if (event.type === 'Kick-off') {
            if (fixture.status !== 'live') {
                fixture.status = 'live';
                hasChanges = true;
            }
        }

        // Update timestamp
        if (hasChanges) {
            fixture.lastUpdated = new Date().toISOString();
            fixture.vidiprinterEventId = event.id || `event_${Date.now()}`;
        }

        return hasChanges;
    }

    showError(message) {
        if (window.authManager && window.authManager.showError) {
            window.authManager.showError(message);
        } else {
            console.error(message);
        }
    }

    createScoreCard(gameweek, fixtures) {
        const card = document.createElement('div');
        card.className = 'score-card';

        card.innerHTML = `
            <div class="score-header">
                <div class="score-gameweek">Gameweek ${gameweek}</div>
                <div class="score-status ${this.getGameweekStatus(fixtures)}">
                    ${this.getGameweekStatus(fixtures).toUpperCase()}
                </div>
            </div>
            
            <div class="score-fixtures">
                ${fixtures.map(fixture => this.createFixtureScore(fixture)).join('')}
            </div>
        `;

        return card;
    }

    getGameweekStatus(fixtures) {
        if (fixtures.length === 0) return 'no-fixtures';
        
        const completedFixtures = fixtures.filter(f => f.status === 'completed').length;
        const liveFixtures = fixtures.filter(f => f.status === 'live').length;
        
        if (completedFixtures === fixtures.length) {
            return 'completed';
        } else if (liveFixtures > 0) {
            return 'live';
        } else {
            return 'scheduled';
        }
    }

    showLoadingState() {
        const scoresList = document.getElementById('scoresList');
        if (scoresList) {
            scoresList.innerHTML = `
                <div class="empty-state">
                    <div class="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <h3>Loading scores...</h3>
                </div>
            `;
        }
    }

    showEmptyState() {
        const scoresList = document.getElementById('scoresList');
        if (scoresList) {
            scoresList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-futbol"></i>
                    <h3>No Scores Available</h3>
                    <p>Scores for this gameweek will appear here once matches begin.</p>
                </div>
            `;
        }
    }

    // Admin methods for managing scores
    
    // Public method to save current scores to database
    async saveCurrentScoresToDatabase() {
        return await this.saveScoresToDatabase();
    }
    
    // Public method to manually sync scores from vidiprinter data
    async syncScoresFromVidiprinterManual() {
        // Load sample data if in development mode
        if (this.isDevelopmentMode()) {
            this.loadSampleVidiprinterData();
        }
        
        // Ensure we have fixtures loaded
        if (!this.currentFixtures || this.currentFixtures.length === 0) {
            this.currentFixtures = [...window.losApp.managers.fixtures.currentFixtures];
        }
        
        return await this.syncScoresFromVidiprinter();
    }

    // Team badge methods
    async preloadTeamBadges() {
        if (!this.currentFixtures || !this.currentFixtures.length) return;
        
        try {
            const teamNames = [];
            this.currentFixtures.forEach(fixture => {
                if (fixture.homeTeam) teamNames.push(fixture.homeTeam);
                if (fixture.awayTeam) teamNames.push(fixture.awayTeam);
            });
            
            // Remove duplicates
            const uniqueTeamNames = [...new Set(teamNames)];
            
            console.log(`🏆 ScoresManager: Preloading badges for ${uniqueTeamNames.length} teams`);
            
            // Check if local badge service is available
            if (window.getLocalTeamBadge) {
                console.log(`✅ ScoresManager: Local badge service available for ${uniqueTeamNames.length} teams`);
                return; // Local service is instant, no need to preload
            }
            
            // Fallback to TeamBadgeService if available
            if (this.teamBadgeService && typeof this.teamBadgeService.preloadBadges === 'function') {
                await this.teamBadgeService.preloadBadges(uniqueTeamNames, 'small');
            }
            
        } catch (error) {
            console.warn('⚠️ ScoresManager: Error preloading team badges:', error);
        }
    }

    createTeamWithBadgeHTML(teamName, size = 'small', additionalClasses = '') {
        // First try local badge service (fastest)
        if (window.getLocalTeamBadge) {
            const badgeUrl = window.getLocalTeamBadge(teamName, size);
            if (badgeUrl) {
                return `
                    <div class="team-with-badge ${additionalClasses}">
                        <img src="${badgeUrl}" alt="${teamName}" class="team-badge team-badge-${size}" loading="lazy">
                        <span class="team-name">${teamName}</span>
                    </div>
                `;
            }
        }
        
        // Fallback to TeamBadgeService if available
        if (this.teamBadgeService && typeof this.teamBadgeService.createTeamWithBadgeHTML === 'function') {
            return this.teamBadgeService.createTeamWithBadgeHTML(teamName, size, additionalClasses);
        }
        
        // Fallback to just team name if no service available
        return `<span class="team-name">${teamName}</span>`;
    }

    createTeamBadgeHTML(teamName, size = 'small', additionalClasses = '') {
        // First try local badge service (fastest)
        if (window.getLocalTeamBadge) {
            const badgeUrl = window.getLocalTeamBadge(teamName, size);
            if (badgeUrl) {
                return `<img src="${badgeUrl}" alt="${teamName}" class="team-badge team-badge-${size} ${additionalClasses}" loading="lazy">`;
            }
        }
        
        // Fallback to TeamBadgeService if available
        if (this.teamBadgeService && typeof this.teamBadgeService.createTeamBadgeHTML === 'function') {
            return this.teamBadgeService.createTeamBadgeHTML(teamName, size, additionalClasses);
        }
        
        // Fallback to empty if no service available
        return '';
    }
    
    async updateFixtureScore(fixtureIndex, homeScore, awayScore, status = 'completed') {
        try {
            const currentGameweek = window.editionService.getCurrentGameweek();
            const currentEdition = window.editionService.getCurrentEdition();
            const currentClub = window.losApp?.managers?.club?.currentClub || 'altrincham-fc-juniors';
            
            // Get fixtures from new club-based structure
            const fixturesSnapshot = await this.db.collection('clubs')
                .doc(currentClub)
                .collection('editions')
                .doc(currentEdition)
                .collection('fixtures')
                .where('gameWeek', '==', currentGameweek)
                .get();
            
            if (!fixturesSnapshot.empty) {
                const fixtures = [];
                fixturesSnapshot.forEach(doc => {
                    const fixtureData = doc.data();
                    fixtures.push({
                        ...fixtureData,
                        id: doc.id,
                        docRef: doc.ref
                    });
                });
                
                if (fixtures[fixtureIndex]) {
                    const fixture = fixtures[fixtureIndex];
                    fixture.homeScore = homeScore;
                    fixture.awayScore = awayScore;
                    fixture.status = status;
                    fixture.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
                    
                    // Update the individual fixture document
                    await fixture.docRef.update({
                        homeScore: homeScore,
                        awayScore: awayScore,
                        status: status,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updated_at: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    // Process results if status is completed
                    if (status === 'completed') {
                        await this.processFixtureResult(fixture, currentGameweek);
                    }
                    
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('Error updating fixture score:', error);
            throw error;
        }
    }

    async processFixtureResult(fixture, gameweek) {
        try {
            // This would integrate with GameLogicManager to process results
            if (window.gameLogicManager) {
                await window.gameLogicManager.processFixtureResult(fixture, gameweek);
            }
        } catch (error) {
            console.error('Error processing fixture result:', error);
        }
    }

    async importScoresFromAPI(gameweek) {
        try {
            console.log(`🏆 ScoresManager: Importing scores for Gameweek ${gameweek} from Football Web Pages API`);
            
            // Check if API requests are enabled globally
            if (!(await this.isAPIEnabled())) {
                console.log('🔌 ScoresManager: API requests are disabled globally');
                throw new Error('API requests are currently disabled by system administrator');
            }
            
            // Get current date range for the gameweek
            const dateRange = this.getDateRangeForGameweek(gameweek);
            console.log(`📅 ScoresManager: Date range for gameweek ${gameweek}: ${dateRange.from} to ${dateRange.to}`);
            
            let url;
            let headers;
            
            // Check if we're in development (Netlify functions not available)
            if (this.isDevelopmentMode()) {
                console.log('🔧 ScoresManager: Development mode detected, using direct API call (may have CORS issues)');
                url = `https://football-web-pages1.p.rapidapi.com/fixtures-results.json?from=${dateRange.from}&to=${dateRange.to}&comp=5&season=2024-25`;
                headers = {
                    'X-RapidAPI-Key': this.apiConfig.RAPIDAPI_KEY,
                    'X-RapidAPI-Host': 'football-web-pages1.p.rapidapi.com'
                };
            } else {
                // Use Netlify function to avoid CORS issues in production
                console.log('🚀 ScoresManager: Production mode, using Netlify function');
                url = `/.netlify/functions/fetch-scores?from=${dateRange.from}&to=${dateRange.to}&comp=5&season=2024-25`;
                headers = {
                    'Content-Type': 'application/json'
                };
            }
            
            console.log(`🔍 ScoresManager: Fetching fixtures-results from: ${url}`);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });
            
            console.log(`🔍 ScoresManager: Response status:`, response.status, response.statusText);
            
            if (!response.ok) {
                // If Netlify function fails, try direct API call as fallback
                if (!this.isDevelopmentMode() && response.status === 404) {
                    console.log('⚠️ ScoresManager: Netlify function not found, trying direct API call...');
                    return await this.importScoresDirectAPI(dateRange);
                }
                
                const errorText = await response.text();
                console.error(`❌ ScoresManager: API response error:`, errorText);
                throw new Error(`API request failed: ${response.status} ${response.statusText}: ${errorText}`);
            }
            
            const data = await response.json();
            console.log(`✅ ScoresManager: Fixtures-results fetched successfully:`, data);
            
            // Process the API data and update fixtures
            if (data.fixtures && data.fixtures.length > 0) {
                await this.processFixturesResults(data.fixtures, gameweek);
                return true;
            } else {
                console.log('ℹ️ ScoresManager: No fixtures found in API response');
                return false;
            }
            
        } catch (error) {
            console.error('❌ ScoresManager: Error importing scores from API:', error);
            
            // If Netlify function fails, try direct API call as fallback
            if (!this.isDevelopmentMode() && error.message.includes('404')) {
                console.log('⚠️ ScoresManager: Netlify function failed, trying direct API call as fallback...');
                try {
                    const dateRange = this.getDateRangeForGameweek(gameweek);
                    return await this.importScoresDirectAPI(dateRange);
                } catch (fallbackError) {
                    console.error('❌ ScoresManager: Direct API fallback also failed:', fallbackError);
                }
            }
            
            throw error;
        }
    }

    async importScoresDirectAPI(dateRange) {
        console.log('🔧 ScoresManager: Making direct API call to fixtures-results...');
        
        const url = `https://football-web-pages1.p.rapidapi.com/fixtures-results.json?from=${dateRange.from}&to=${dateRange.to}&comp=5&season=2024-25`;
        const headers = {
            'X-RapidAPI-Key': this.apiConfig.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'football-web-pages1.p.rapidapi.com'
        };
        
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`Direct API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ ScoresManager: Direct API call successful:`, data);
        
        if (data.fixtures && data.fixtures.length > 0) {
            await this.processFixturesResults(data.fixtures, 1); // Default to gameweek 1 for now
            return true;
        } else {
            console.log('ℹ️ ScoresManager: No fixtures found in direct API response');
            return false;
        }
    }

    getDateRangeForGameweek(gameweek) {
        // For now, return a reasonable date range for testing
        // In a real implementation, you'd calculate this based on the gameweek
        const today = new Date();
        const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7).toISOString().split('T')[0];
        const to = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7).toISOString().split('T')[0];
        
        return { from, to };
    }

    async processFixturesResults(fixtures, gameweek) {
        try {
            console.log(`🔧 ScoresManager: Processing ${fixtures.length} fixtures from fixtures-results for gameweek ${gameweek}`);
            
            // Ensure database reference is available
            if (!this.db) {
                console.log('🔧 ScoresManager: Database reference not available, attempting to restore...');
                this.db = window.firebaseDB;
                
                if (!this.db) {
                    console.log('🔧 ScoresManager: Trying to get database reference from other managers...');
                    this.db = window.losApp?.managers?.superAdmin?.db || 
                             window.losApp?.managers?.admin?.db ||
                             window.firebase?.firestore?.() ||
                             null;
                }
                
                if (!this.db) {
                    throw new Error('Database reference not available - cannot update scores');
                }
                
                console.log('✅ ScoresManager: Database reference restored successfully');
            }
            
            // Get current club and edition
            const currentClub = window.losApp?.managers?.club?.currentClub || 'altrincham-fc-juniors';
            const currentEdition = window.editionService?.getCurrentEdition() || '2025-26-national-league-1';
            
            console.log(`🔧 ScoresManager: Updating scores for club: ${currentClub}, edition: ${currentEdition}, gameweek: ${gameweek}`);
            
            // Get existing fixtures from database
            const fixturesSnapshot = await this.db.collection('clubs')
                .doc(currentClub)
                .collection('editions')
                .doc(currentEdition)
                .collection('fixtures')
                .where('gameWeek', '==', gameweek)
                .get();
            
            if (fixturesSnapshot.empty) {
                console.log('ℹ️ ScoresManager: No fixtures found in database for this gameweek');
                return;
            }
            
            const existingFixtures = [];
            const fixtureDocs = [];
            fixturesSnapshot.forEach(doc => {
                const fixtureData = doc.data();
                existingFixtures.push({
                    ...fixtureData,
                    id: doc.id,
                    docRef: doc.ref
                });
                fixtureDocs.push(doc);
            });
            
            console.log(`🔧 ScoresManager: Found ${existingFixtures.length} fixtures in database for gameweek ${gameweek}`);
            
            // Create a batch for database updates
            const batch = this.db.batch();
            let updateCount = 0;
            
            // Process each fixture from the API
            fixtures.forEach((apiFixture, index) => {
                // Find matching fixture in database by team names
                const matchingFixture = existingFixtures.find(dbFixture => {
                    const dbHomeTeam = dbFixture.homeTeam?.toLowerCase() || '';
                    const dbAwayTeam = dbFixture.awayTeam?.toLowerCase() || '';
                    const apiHomeTeam = apiFixture.homeTeam?.toLowerCase() || '';
                    const apiAwayTeam = apiFixture.awayTeam?.toLowerCase() || '';
                    
                    return (dbHomeTeam.includes(apiHomeTeam) || apiHomeTeam.includes(dbHomeTeam)) &&
                           (dbAwayTeam.includes(apiAwayTeam) || apiAwayTeam.includes(dbAwayTeam));
                });
                
                if (matchingFixture) {
                    // Extract scores from the correct location in API response
                    const homeScore = apiFixture['home-team']?.score || apiFixture.homeScore;
                    const awayScore = apiFixture['away-team']?.score || apiFixture.awayScore;
                    const fixtureStatus = apiFixture.status?.short || apiFixture.status || 'FT';

                    // Update the fixture with the score data
                    const updateData = {
                        homeScore: homeScore,
                        awayScore: awayScore,
                        status: fixtureStatus,
                        lastScoreUpdate: new Date()
                    };

                    console.log(`🔧 ScoresManager: Updating fixture ${matchingFixture.id}: ${apiFixture.homeTeam} ${apiFixture.homeScore} - ${apiFixture.awayScore} ${apiFixture.awayTeam} (${apiFixture.status})`);
                    console.log(`🔧 ScoresManager: API fixture structure:`, apiFixture);
                    console.log(`🔧 ScoresManager: Extracted homeScore:`, homeScore, `(type: ${typeof homeScore})`);
                    console.log(`🔧 ScoresManager: Extracted awayScore:`, awayScore, `(type: ${typeof awayScore})`);
                    console.log(`🔧 ScoresManager: New score data:`, updateData);

                    batch.update(matchingFixture.docRef, updateData);
                    
                    updateCount++;
                } else {
                    console.log(`⚠️ ScoresManager: No matching fixture found for: ${apiFixture.homeTeam} vs ${apiFixture.awayTeam}`);
                }
            });
            
            // Commit the batch if there are updates
            if (updateCount > 0) {
                console.log(`🔧 ScoresManager: Committing ${updateCount} score updates to database...`);
                await batch.commit();
                console.log(`✅ ScoresManager: Successfully updated ${updateCount} fixture scores in database`);
            } else {
                console.log('ℹ️ ScoresManager: No score updates needed - all fixtures are up to date');
            }
            
            console.log('✅ ScoresManager: Fixtures-results processing completed successfully');
            
        } catch (error) {
            console.error('❌ ScoresManager: Error processing fixtures-results:', error);
            throw error;
        }
    }

    async bulkUpdateScores(gameweek, scoreUpdates) {
        try {
            const currentEdition = window.editionService.getCurrentEdition();
            const currentClub = window.losApp?.managers?.club?.currentClub || 'altrincham-fc-juniors';
            
            // Get fixtures from new club-based structure
            const fixturesSnapshot = await this.db.collection('clubs')
                .doc(currentClub)
                .collection('editions')
                .doc(currentEdition)
                .collection('fixtures')
                .where('gameWeek', '==', gameweek)
                .get();
            
            if (fixturesSnapshot.empty) {
                throw new Error('No fixtures found for this gameweek');
            }
            
            const fixtures = [];
            const fixtureDocs = [];
            fixturesSnapshot.forEach(doc => {
                const fixtureData = doc.data();
                fixtures.push({
                    ...fixtureData,
                    id: doc.id,
                    docRef: doc.ref
                });
                fixtureDocs.push(doc);
            });
            
            // Apply score updates
            scoreUpdates.forEach(update => {
                if (fixtures[update.fixtureIndex]) {
                    fixtures[update.fixtureIndex] = {
                        ...fixtures[update.fixtureIndex],
                        homeScore: update.homeScore,
                        awayScore: update.awayScore,
                        status: update.status || 'completed',
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                }
            });
            
            // Update fixtures in database using batch
            const batch = this.db.batch();
            fixtures.forEach((fixture, index) => {
                const docRef = fixtureDocs[index].ref;
                batch.update(docRef, {
                    homeScore: fixture.homeScore,
                    awayScore: fixture.awayScore,
                    status: fixture.status,
                    updatedAt: fixture.updatedAt,
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            
            await batch.commit();
            
            // Process all completed fixtures
            const completedFixtures = fixtures.filter(f => f.status === 'completed');
            for (const fixture of completedFixtures) {
                await this.processFixtureResult(fixture, gameweek);
            }
            
            return true;
        } catch (error) {
            console.error('Error bulk updating scores:', error);
            throw error;
        }
    }

    // Getter methods
    getCurrentScores() {
        return this.currentScores;
    }

    getFixtureScore(fixtureIndex) {
        if (this.currentScores[fixtureIndex]) {
            return {
                homeScore: this.currentScores[fixtureIndex].homeScore,
                awayScore: this.currentScores[fixtureIndex].awayScore,
                status: this.currentScores[fixtureIndex].status
            };
        }
        return null;
    }

    getCompletedFixtures() {
        return this.currentScores.filter(fixture => fixture.status === 'completed');
    }

    getLiveFixtures() {
        return this.currentScores.filter(fixture => fixture.status === 'live');
    }

    getScheduledFixtures() {
        return this.currentScores.filter(fixture => fixture.status === 'scheduled');
    }

    // Utility methods
    formatScore(homeScore, awayScore) {
        if (homeScore === null || awayScore === null) {
            return '- -';
        }
        return `${homeScore} - ${awayScore}`;
    }

    getMatchResult(homeScore, awayScore) {
        if (homeScore === null || awayScore === null) {
            return 'pending';
        }
        
        if (homeScore > awayScore) {
            return 'home-win';
        } else if (awayScore > homeScore) {
            return 'away-win';
        } else {
            return 'draw';
        }
    }

    // Real-time score updates (for live matches)
    startLiveScoreUpdates() {
        // This would set up real-time updates for live matches
        // For now, this is a placeholder
        console.log('Starting live score updates');
    }

    stopLiveScoreUpdates() {
        // This would stop real-time updates
        console.log('Stopping live score updates');
    }

    // Database save method for persisting scores
    async saveScoresToDatabase() {
        try {
            console.log('💾 ScoresManager: Saving scores to database...');
            
            if (!this.currentFixtures || this.currentFixtures.length === 0) {
                console.log('ℹ️ No fixtures to save');
                return false;
            }
            
            // Get fixtures with scores
            const fixturesWithScores = this.currentFixtures.filter(f => 
                f.homeScore !== null || f.awayScore !== null
            );
            
            if (fixturesWithScores.length === 0) {
                console.log('ℹ️ No scores to save');
                return false;
            }
            
            console.log(`💾 Saving ${fixturesWithScores.length} fixtures with scores to database`);
            
            // Get current club and edition
            const currentClub = window.losApp?.managers?.club?.currentClub || 'altrincham-fc-juniors';
            const currentEdition = window.losApp?.managers?.club?.currentEdition || '2025-26-national-league-1';
            
            // Create a batch update
            const batch = this.db.batch();
            
            for (const fixture of fixturesWithScores) {
                // Find the document reference for this fixture
                const fixtureRef = this.db.collection('clubs')
                    .doc(currentClub)
                    .collection('editions')
                    .doc(currentEdition)
                    .collection('fixtures')
                    .doc(fixture.id || fixture.fixtureId);
                
                // Update the fixture with scores and status
                batch.update(fixtureRef, {
                    homeScore: fixture.homeScore,
                    awayScore: fixture.awayScore,
                    status: fixture.status,
                    lastUpdated: fixture.lastUpdated,
                    vidiprinterSync: new Date().toISOString(),
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                console.log(`💾 Queued update for ${fixture.homeTeam} ${fixture.homeScore}-${fixture.awayScore} ${fixture.awayTeam}`);
            }
            
            // Commit the batch
            await batch.commit();
            
            console.log('✅ ScoresManager: All scores saved to database successfully!');
            return true;
            
        } catch (error) {
            console.error('❌ ScoresManager: Error saving scores to database:', error);
            return false;
        }
    }

    // Method to manually reload API configuration (for debugging)
    reloadAPIConfiguration() {
        console.log('🔄 ScoresManager: Manually reloading API configuration...');
        this.apiConfig = this.loadAPIConfiguration();
        
        if (this.apiConfig && this.apiConfig.RAPIDAPI_KEY) {
            console.log('✅ ScoresManager: API configuration reloaded successfully');
            return true;
        } else {
            console.warn('⚠️ ScoresManager: Failed to reload API configuration');
            return false;
        }
    }

    // Debug method to test API configuration
    debugAPIConfiguration() {
        console.log('🔍 ScoresManager: Debugging API configuration...');
        console.log('Current apiConfig:', this.apiConfig);
        console.log('window.FOOTBALL_WEBPAGES_CONFIG:', window.FOOTBALL_WEBPAGES_CONFIG);
        console.log('window.APIConfig:', window.APIConfig);
        console.log('window.ENV_CONFIG:', window.ENV_CONFIG);
        console.log('window.RAPIDAPI_KEY:', window.RAPIDAPI_KEY);
        console.log('window.environmentLoader:', window.environmentLoader);
        
        if (window.environmentLoader) {
            console.log('Environment loader loaded:', window.environmentLoader.isLoaded());
        }
        
        return {
            apiConfig: this.apiConfig,
            footballWebPagesConfig: window.FOOTBALL_WEBPAGES_CONFIG,
            apiConfig: window.APIConfig,
            envConfig: window.ENV_CONFIG,
            rapidAPIKey: window.RAPIDAPI_KEY,
            environmentLoader: window.environmentLoader
        };
    }

    // Cleanup method
    destroy() {
        this.stopLiveScoreUpdates();
    }
}

// Initialize ScoresManager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.scoresManager = new ScoresManager();
    
    // Add global helper functions for debugging
    window.testScoreImport = async (gameweek = 1) => {
        console.log('🧪 Testing score import for gameweek:', gameweek);
        if (window.scoresManager) {
            try {
                const result = await window.scoresManager.importScoresFromAPI(gameweek);
                console.log('✅ Score import test result:', result);
                return result;
            } catch (error) {
                console.error('❌ Score import test failed:', error);
                return false;
            }
        } else {
            console.error('❌ ScoresManager not available');
            return false;
        }
    };
    
    window.reloadAPIConfig = () => {
        if (window.scoresManager) {
            return window.scoresManager.reloadAPIConfiguration();
        } else {
            console.error('❌ ScoresManager not available');
            return false;
        }
    };
    
    window.debugAPIConfig = () => {
        if (window.scoresManager) {
            return window.scoresManager.debugAPIConfiguration();
        } else {
            console.error('❌ ScoresManager not available');
            return false;
        }
    };
    
    console.log('🔧 ScoresManager: Global helper functions added: testScoreImport(gameweek), reloadAPIConfig(), debugAPIConfig()');
});
