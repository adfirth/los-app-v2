export default class EditionService {
    constructor() {
        this.isInitialized = false;
        this.dataLoaded = false; // Track if data has been loaded
        this.settingsLoaded = false; // Track if settings have been loaded
        this.currentEdition = '2024-25';
        this.currentGameweek = 1;
        this.gameweekDeadline = '2024-08-10T11:00:00Z';
        this.settings = {};
        this.availableEditions = ['2024-25'];

        // Don't auto-initialize - wait for main app to control initialization
        // this.init();
    }

    initBasic() {
        // initBasic() called

        if (this.isInitialized) {
            console.log('⚠️ EditionService already initialized, skipping initBasic()');
            return;
        }

        // Setting up basic structure...

        // Only set up basic structure, don't load data yet
        this.setupTabNavigation();

        this.isInitialized = true;
        // Basic initialization complete
    }

    init() {
        if (this.isInitialized && this.settingsLoaded) return;

        // Set up Firebase database reference
        this.db = window.firebaseDB;

        // Load data and set up real-time listeners
        this.loadSettings();
        this.setupRealtimeListeners();
        this.settingsLoaded = true;

    }

    restoreFirebaseConnection() {
        // This method will be called by the main app after initialization
        // to restore Firebase functionality


        // Reset retry counters when Firebase connection is restored
        this.loadSettingsRetryCount = 0;
        this.setupListenersRetryCount = 0;

        // Don't set up real-time listeners here - they will be set up by the main app
        // after Firebase is fully ready to prevent connection conflicts
    }

    setupRealtimeListeners() {
        // Ensure Firebase is ready
        if (!window.firebaseReady || !this.db || typeof this.db.collection !== 'function') {
            console.log(`EditionService: Firebase not ready for listeners - firebaseReady: ${window.firebaseReady}, db: ${!!this.db}, collection: ${this.db ? typeof this.db.collection : 'undefined'}, retrying in 2 seconds...`);

            // Try to update our database reference if Firebase is ready but we don't have it
            if (window.firebaseReady && window.firebaseDB && !this.db) {
                console.log('EditionService: Updating database reference for listeners from global Firebase...');
                this.db = window.firebaseDB;
            }

            // Only retry if we haven't exceeded max retries
            if (!this.setupListenersRetryCount) {
                this.setupListenersRetryCount = 0;
            }
            if (this.setupListenersRetryCount < 10) { // Increased retry limit
                this.setupListenersRetryCount++;
                setTimeout(() => this.setupRealtimeListeners(), 2000);
            } else {
                console.log('EditionService: Max retries reached for real-time listeners, waiting for Firebase to be ready...');
                // Continue checking periodically even after max retries
                setTimeout(() => {
                    this.setupListenersRetryCount = 0; // Reset counter
                    this.setupRealtimeListeners();
                }, 10000); // Check every 10 seconds
            }
            return;
        }

        // Check if listener is already registered to prevent conflicts
        const listenerId = 'edition-settings';
        if (window.losApp && !window.losApp.registerListener(listenerId, 'settings')) {
            console.log('EditionService: Settings listener already registered, skipping...');
            return;
        }

        try {
            // Listen for settings updates
            this.settingsListener = this.db.collection('settings').doc('current')
                .onSnapshot((doc) => {
                    if (doc.exists) {
                        const settings = doc.data();
                        this.currentEdition = settings.currentEdition || '2024-25';
                        this.currentGameweek = settings.currentGameweek || 1;
                        this.gameweekDeadline = settings.gameweekDeadline || '2024-08-10T11:00:00Z';

                        // Update UI
                        this.updateEditionDisplay();
                    }
                }, (error) => {
                    console.error('EditionService: Settings listener error:', error);
                    // Handle specific Firebase errors
                    if (window.handleFirebaseError) {
                        window.handleFirebaseError(error, 'EditionService-settings');
                    }

                    // If it's a "Target ID already exists" error, clear and retry
                    if (error.message && error.message.includes('Target ID already exists')) {
                        console.log('EditionService: Target ID conflict detected, clearing and retrying...');
                        this.clearListeners();
                        setTimeout(() => this.setupRealtimeListeners(), 1000);
                    }
                });

            console.log('EditionService: Settings real-time listener established');
        } catch (error) {
            console.error('EditionService: Error setting up real-time listeners:', error);
            if (window.handleFirebaseError) {
                window.handleFirebaseError(error, 'EditionService-setup');
            }
        }
    }

    async loadSettings() {
        try {
            // Ensure Firebase is ready
            if (!window.firebaseReady || !this.db || typeof this.db.collection !== 'function') {
                console.log(`EditionService: Firebase not ready - firebaseReady: ${window.firebaseReady}, db: ${!!this.db}, collection: ${this.db ? typeof this.db.collection : 'undefined'}, retrying in 2 seconds...`);

                // Try to update our database reference if Firebase is ready but we don't have it
                if (window.firebaseReady && window.firebaseDB && !this.db) {
                    console.log('EditionService: Updating database reference from global Firebase...');
                    this.db = window.firebaseDB;
                }

                // Only retry if we haven't exceeded max retries
                if (!this.loadSettingsRetryCount) {
                    this.loadSettingsRetryCount = 0;
                }
                if (this.loadSettingsRetryCount < 10) { // Increased retry limit
                    this.loadSettingsRetryCount++;
                    setTimeout(() => this.loadSettings(), 2000);
                } else {
                    console.log('EditionService: Max retries reached for settings loading, waiting for Firebase to be ready...');
                    // Continue checking periodically even after max retries
                    setTimeout(() => {
                        this.loadSettingsRetryCount = 0; // Reset counter
                        this.loadSettings();
                    }, 10000); // Check every 10 seconds
                }
                return;
            }

            // Check if we can attempt a connection (only if losApp is fully initialized)
            if (window.losApp && typeof window.losApp.canAttemptConnection === 'function' && !window.losApp.canAttemptConnection()) {
                console.log('EditionService: Cannot attempt connection at this time, retrying in 2 seconds...');
                setTimeout(() => this.loadSettings(), 2000);
                return;
            }

            const settingsDoc = await this.db.collection('settings').doc('current').get();

            if (settingsDoc.exists) {
                const settings = settingsDoc.data();
                this.currentEdition = settings.currentEdition || '2024-25';
                this.currentGameweek = settings.currentGameweek || 1;
                this.gameweekDeadline = settings.gameweekDeadline || '2024-08-10T11:00:00Z';

                console.log(`Settings loaded: Edition ${this.currentEdition}, Gameweek ${this.currentGameweek}`);
            } else {
                // Create default settings if none exist
                await this.createDefaultSettings();
            }

            // Update UI
            this.updateEditionDisplay();

        } catch (error) {
            if (error.message.includes('Target ID already exists')) {
                console.log('Settings loading conflict detected, retrying in 2 seconds... (attempt 1/3)');
                setTimeout(() => this.loadSettings(), 2000);
            } else {
                console.error('Error loading settings:', error);
                // Use fallback data
                this.useFallbackSettings();
            }
        }
    }

    async loadSettingsFallback() {
        try {
            console.log('Attempting fallback settings loading...');

            // Try to get settings with a one-time listener instead of get()
            return new Promise((resolve) => {
                const unsubscribe = this.db.collection('settings').doc('currentCompetition')
                    .onSnapshot((doc) => {
                        if (doc.exists) {
                            const data = doc.data();
                            this.settings = data;
                            this.currentEdition = data.active_edition || '1';
                            this.availableEditions = data.available_editions || [];

                            // Update UI with current gameweek
                            this.updateGameweekDisplay();

                            // Load current edition data
                            this.loadCurrentEditionData();

                            unsubscribe(); // Clean up immediately
                            resolve();
                        } else {
                            // Create default settings if they don't exist
                            this.createDefaultSettings();
                            unsubscribe();
                            resolve();
                        }
                    }, (error) => {
                        console.error('Fallback also failed:', error);
                        // Try to create default settings as last resort
                        this.createDefaultSettings();
                        unsubscribe();
                        resolve();
                    });
            });
        } catch (error) {
            console.error('Fallback approach failed:', error);
            // Try to create default settings as last resort
            this.createDefaultSettings();
        }
    }

    async createDefaultSettings() {
        // Ensure Firebase is ready
        if (!window.firebaseReady || !this.db || typeof this.db.collection !== 'function') {
            console.log('EditionService: Firebase not ready for creating settings, retrying in 2 seconds...');
            setTimeout(() => this.createDefaultSettings(), 2000);
            return;
        }

        const defaultSettings = {
            currentEdition: '2024-25',
            currentGameweek: 1,
            gameweekDeadline: '2024-08-10T11:00:00Z',
            tiebreakEnabled: true,
            registrationOpen: true,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await this.db.collection('settings').doc('current').set(defaultSettings);
            this.currentEdition = '2024-25';
            this.currentGameweek = 1;
            this.gameweekDeadline = '2024-08-10T11:00:00Z';
        } catch (error) {
            console.error('Error creating default settings:', error);
        }
    }

    useFallbackSettings() {
        console.log('Using fallback settings...');
        // Set default values when Firebase is not available
        this.currentEdition = '2024-25';
        this.currentGameweek = 1;
        this.gameweekDeadline = '2024-08-10T11:00:00Z';

        // Update UI
        this.updateEditionDisplay();
    }

    updateEditionDisplay() {
        const currentGameweekElement = document.getElementById('currentGameweek');
        if (currentGameweekElement) {
            currentGameweekElement.textContent = this.currentGameweek || '1';
        }

        const deadlineTextElement = document.getElementById('deadlineText');
        if (deadlineTextElement && this.gameweekDeadline) {
            const deadline = new Date(this.gameweekDeadline);
            const now = new Date();
            const timeUntilDeadline = deadline - now;

            if (timeUntilDeadline <= 0) {
                deadlineTextElement.textContent = 'Deadline: PASSED';
                deadlineTextElement.style.color = '#dc3545';
            } else {
                const hours = Math.floor(timeUntilDeadline / (1000 * 60 * 60));
                const minutes = Math.floor((timeUntilDeadline % (1000 * 60 * 60)) / (1000 * 60));

                if (hours > 24) {
                    const days = Math.floor(hours / 24);
                    deadlineTextElement.textContent = `Deadline: ${days} days remaining`;
                } else if (hours > 0) {
                    deadlineTextElement.textContent = `Deadline: ${hours}h ${minutes}m remaining`;
                } else {
                    deadlineTextElement.textContent = `Deadline: ${minutes}m remaining`;
                }

                deadlineTextElement.style.color = hours < 1 ? '#ffc107' : '#28a745';
            }
        }
    }

    showError(message) {
        if (window.authManager && window.authManager.showError) {
            window.authManager.showError(message);
        } else {
            console.error(message);
        }
    }

    async loadCurrentEditionData() {
        try {
            const editionDoc = await this.db.collection('editions').doc(this.currentEdition).get();

            if (editionDoc.exists) {
                const editionData = editionDoc.data();
                this.currentEditionData = editionData;
            } else {
                // Create default edition data
                await this.createDefaultEditionData();
            }
        } catch (error) {
            console.error('Error loading edition data:', error);
        }
    }

    async createDefaultEditionData() {
        const defaultEditionData = {
            id: this.currentEdition,
            name: 'Championship 2024/25',
            description: 'English Championship Season 2024/25',
            lives_per_player: 2,
            total_gameweeks: 10,
            current_gameweek: 1,
            status: 'active',
            registration_deadline: '2024-08-10',
            start_date: '2024-08-10',
            end_date: '2024-10-20',
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await this.db.collection('editions').doc(this.currentEdition).set(defaultEditionData);
            this.currentEditionData = defaultEditionData;
        } catch (error) {
            console.error('Error creating default edition data:', error);
        }
    }

    updateGameweekDisplay() {
        const currentGameweekElement = document.getElementById('currentGameweek');
        if (currentGameweekElement) {
            currentGameweekElement.textContent = this.currentGameweek || '1';
        }

        // Also update the gameweek navigation
        this.updateGameweekNavigation();
    }

    setupTabNavigation() {
        const navTabs = document.querySelectorAll('.nav-tab');

        navTabs.forEach((tab, index) => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab');
                this.switchTab(targetTab);
            });
        });

        // Setup gameweek navigation
        this.setupGameweekNavigation();
    }

    setupGameweekNavigation() {
        const prevButton = document.getElementById('prevGameweek');
        const nextButton = document.getElementById('nextGameweek');
        const gameweekSelect = document.getElementById('gameweekSelect');

        if (prevButton) {
            prevButton.addEventListener('click', () => {
                this.navigateGameweek('prev');
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', () => {
                this.navigateGameweek('next');
            });
        }

        if (gameweekSelect) {
            gameweekSelect.addEventListener('change', (e) => {
                const selectedGameweek = parseInt(e.target.value);
                this.setCurrentGameweek(selectedGameweek);
            });
        }

        // Initialize gameweek display
        this.updateGameweekNavigation();
    }

    navigateGameweek(direction) {
        const currentGameweek = this.getCurrentGameweek();
        const totalGameweeks = this.getTotalGameweeks();

        let newGameweek;
        if (direction === 'prev') {
            newGameweek = Math.max(1, currentGameweek - 1);
        } else {
            newGameweek = Math.min(totalGameweeks, currentGameweek + 1);
        }

        if (newGameweek !== currentGameweek) {
            this.setCurrentGameweek(newGameweek);
        }
    }

    setCurrentGameweek(gameweek) {
        console.log('🎯 EditionService: setCurrentGameweek called with:', gameweek);
        console.log('🎯 EditionService: Previous gameweek was:', this.currentGameweek);

        this.currentGameweek = gameweek;
        console.log('🎯 EditionService: Updated currentGameweek to:', this.currentGameweek);

        this.updateGameweekDisplay();
        this.updateGameweekNavigation();

        // Reload fixtures for the new gameweek
        console.log('🎯 EditionService: Reloading fixtures for gameweek:', gameweek);
        if (window.losApp?.managers?.fixtures) {
            window.losApp.managers.fixtures.loadFixtures();
        } else if (window.fixturesManager) {
            window.fixturesManager.loadFixtures();
        } else {
            console.log('🎯 EditionService: No fixtures manager available for reload');
        }
    }

    updateGameweekNavigation() {
        const prevButton = document.getElementById('prevGameweek');
        const nextButton = document.getElementById('nextGameweek');
        const gameweekSelect = document.getElementById('gameweekSelect');

        const currentGameweek = this.getCurrentGameweek();
        const totalGameweeks = this.getTotalGameweeks();

        // Update navigation buttons
        if (prevButton) {
            prevButton.disabled = currentGameweek <= 1;
            prevButton.style.opacity = currentGameweek <= 1 ? '0.5' : '1';
        }

        if (nextButton) {
            nextButton.disabled = currentGameweek >= totalGameweeks;
            nextButton.style.opacity = currentGameweek >= totalGameweeks ? '0.5' : '1';
        }

        // Update select dropdown
        if (gameweekSelect) {
            gameweekSelect.value = currentGameweek;
        }
    }

    switchTab(targetTab) {
        // Remove active class from all tabs and content
        const allTabs = document.querySelectorAll('.nav-tab');
        const allContent = document.querySelectorAll('.tab-content');

        allTabs.forEach((tab, index) => {
            tab.classList.remove('active');
        });

        allContent.forEach((content, index) => {
            content.classList.remove('active');
        });

        // Add active class to clicked tab
        const activeTab = document.querySelector(`[data-tab="${targetTab}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Show corresponding content
        const targetContent = document.getElementById(`${targetTab}Tab`);
        if (targetContent) {
            targetContent.classList.add('active');
        }

        // Load content based on tab
        this.loadTabContent(targetTab);
    }

    loadTabContent(tabName) {
        switch (tabName) {
            case 'fixtures':
                if (window.losApp?.managers?.fixtures) {
                    window.losApp.managers.fixtures.loadFixtures();
                } else if (window.fixturesManager) {
                    window.fixturesManager.loadFixtures();
                }
                break;
            case 'picks':
                if (window.losApp?.managers?.pickStatus) {
                    window.losApp.managers.pickStatus.loadUserPicks();
                } else if (window.pickStatusService) {
                    window.pickStatusService.loadUserPicks();
                }
                break;
            case 'standings':
                if (window.losApp?.managers?.gameLogic) {
                    window.losApp.managers.gameLogic.loadStandings();
                } else if (window.gameLogicManager) {
                    window.gameLogicManager.loadStandings();
                }
                break;
            case 'scores':
                if (window.losApp?.managers?.scores) {
                    window.losApp.managers.scores.loadScores();
                } else if (window.scoresManager) {
                    window.scoresManager.loadScores();
                }
                break;
        }
    }

    // Getter methods
    getCurrentEdition() {
        // First try to get from ClubService (which has the actual current edition)
        if (window.losApp?.managers?.club?.currentEdition) {
            return window.losApp.managers.club.currentEdition;
        }
        // Fallback to local value
        return this.currentEdition;
    }

    getCurrentGameweek() {
        return this.currentGameweek || 1;
    }

    getAvailableEditions() {
        return this.availableEditions;
    }

    getSettings() {
        return this.settings;
    }

    getCurrentEditionData() {
        return this.currentEditionData;
    }

    isRegistrationOpen() {
        return this.settings.registration_open || false;
    }

    getLivesPerPlayer() {
        return this.currentEditionData?.lives_per_player || 2;
    }

    getTotalGameweeks() {
        return this.currentEditionData?.total_gameweeks || 10;
    }

    // Admin methods for managing editions
    async createEdition(editionData) {
        try {
            const editionRef = await this.db.collection('editions').add({
                ...editionData,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update available editions in settings
            const newEdition = {
                id: editionRef.id,
                name: editionData.name,
                description: editionData.description,
                lives_per_player: editionData.lives_per_player,
                total_gameweeks: editionData.total_gameweeks,
                registration_deadline: editionData.registration_deadline,
                start_date: editionData.start_date,
                end_date: editionData.end_date
            };

            this.availableEditions.push(newEdition);
            await this.updateSettings();

            return editionRef.id;
        } catch (error) {
            console.error('Error creating edition:', error);
            throw error;
        }
    }

    async updateEdition(editionId, updateData) {
        try {
            await this.db.collection('editions').doc(editionId).update({
                ...updateData,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update in available editions array
            const index = this.availableEditions.findIndex(edition => edition.id === editionId);
            if (index !== -1) {
                this.availableEditions[index] = { ...this.availableEditions[index], ...updateData };
                await this.updateSettings();
            }
        } catch (error) {
            console.error('Error updating edition:', error);
            throw error;
        }
    }

    async deleteEdition(editionId) {
        try {
            await this.db.collection('editions').doc(editionId).delete();

            // Remove from available editions array
            this.availableEditions = this.availableEditions.filter(edition => edition.id !== editionId);
            await this.updateSettings();
        } catch (error) {
            console.error('Error deleting edition:', error);
            throw error;
        }
    }

    async setActiveEdition(editionId) {
        try {
            this.currentEdition = editionId;
            this.settings.active_edition = editionId;
            await this.updateSettings();
            await this.loadCurrentEditionData();
            this.updateGameweekDisplay();
        } catch (error) {
            console.error('Error setting active edition:', error);
            throw error;
        }
    }

    async setActiveGameweek(gameweek) {
        try {
            this.settings.active_gameweek = gameweek;
            await this.updateSettings();
            this.updateGameweekDisplay();
        } catch (error) {
            console.error('Error setting active gameweek:', error);
            throw error;
        }
    }

    async updateSettings() {
        try {
            await this.db.collection('settings').doc('currentCompetition').update({
                ...this.settings,
                available_editions: this.availableEditions,
                last_updated: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating settings:', error);
            throw error;
        }
    }

    // Utility methods
    clearListeners() {
        console.log('EditionService: Clearing listeners...');

        if (this.settingsListener) {
            this.settingsListener();
            this.settingsListener = null;
            console.log('EditionService: Settings listener cleared');
        }

        // Unregister from the main app's listener tracking
        if (window.losApp) {
            window.losApp.unregisterListener('edition-settings');
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            timeZone: 'Europe/London',
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatTime(timeString) {
        // If timeString is a full datetime string, parse it and format in London time
        if (timeString.includes('T') || timeString.includes(' ')) {
            const date = new Date(timeString);
            return date.toLocaleTimeString('en-GB', {
                timeZone: 'Europe/London',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        }
        // If it's just a time string (HH:MM:SS), format it
        return timeString.substring(0, 5); // Remove seconds
    }

    // New method to format full datetime in London timezone
    formatDateTime(dateTimeString) {
        const date = new Date(dateTimeString);
        return date.toLocaleString('en-GB', {
            timeZone: 'Europe/London',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    isGameweekActive(gameweek) {
        return gameweek === this.getCurrentGameweek();
    }

    isGameweekCompleted(gameweek) {
        return parseInt(gameweek) < parseInt(this.getCurrentGameweek());
    }

    isGameweekUpcoming(gameweek) {
        return parseInt(gameweek) > parseInt(this.getCurrentGameweek());
    }
}
