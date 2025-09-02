class ClubService {
    constructor() {
        this.isInitialized = false;
        this.currentClub = null;
        this.currentEdition = null;
        this.availableClubs = [];
        this.clubData = {};
        this.globalSettingsListener = null;
    }

    // Getter for clubs data
    get clubs() {
        const clubs = Object.entries(this.clubData).map(([id, club]) => ({
            id: id,
            ...club
        })).filter(club => club.isActive);

        return clubs;
    }

    // Check if service is ready with clubs data
    get isReady() {
        // Be more lenient - just check if we're initialized and have attempted to load clubs
        // Don't require clubs to actually exist, as this might be a new setup
        const ready = this.isInitialized && this.globalSettingsListener !== null;
        return ready;
    }

    initBasic() {
        if (this.isInitialized) return;
        
        this.setupBasicStructure();
    }

    init() {
        if (this.isInitialized) return;
        
        // Full initialization...
        
        // Ensure Firebase connection is available before setting up listeners
        if (!this.db && window.firebaseDB && typeof window.firebaseDB.collection === 'function') {
            // Setting database reference during init
            this.db = window.firebaseDB;
        }
        
        // Set up basic structure first (this includes event listeners)
        this.setupBasicStructure();
        
        this.setupRealtimeListeners();
        this.isInitialized = true;
        console.log('✅ ClubService: Full initialization complete');
        
        // Add global helper function for debugging
        window.fixClubService = () => {
            console.log('🔧 ClubService: Manual fix triggered...');
            this.forceFixClubLoading();
        };
        
        // Add test function for club changes
        window.testClubChange = (clubId) => {
            console.log(`🧪 ClubService: Testing club change to: ${clubId}`);
            if (this.onClubChange) {
                this.onClubChange(clubId);
            } else {
                console.log('🧪 ClubService: onClubChange method not available');
            }
        };
        
        // Add debugging function to check club selector state
        window.checkClubSelectors = () => {
            console.log('🔍 ClubService: Checking club selector state...');
            const clubSelect = document.getElementById('clubSelect');
            const headerClubSelect = document.getElementById('headerClubSelect');
            
            console.log('🔍 Club selectors found:', {
                clubSelect: !!clubSelect,
                headerClubSelect: !!headerClubSelect
            });
            
            if (clubSelect) {
                console.log('🔍 Registration club selector options:', Array.from(clubSelect.options).map(opt => ({ value: opt.value, text: opt.textContent })));
            }
            
            if (headerClubSelect) {
                console.log('🔍 Header club selector options:', Array.from(headerClubSelect.options).map(opt => ({ value: opt.value, text: opt.textContent })));
            }
            
            console.log('🔍 ClubService state:', {
                availableClubs: this.availableClubs,
                clubData: this.clubData,
                currentClub: this.currentClub
            });
        };
        
        // Add function to check current state
        window.checkClubServiceState = () => {
            // Current state logged
        };
        
        // Global helper functions available: window.fixClubService(), window.testClubChange(clubId), window.checkClubServiceState()
    }

    setupBasicStructure() {
        // Set up basic DOM structure and event listeners
        // This runs before Firebase is ready
        // Setting up basic structure...
        
        // Check if DOM elements exist before setting up listeners
        const clubSelect = document.getElementById('clubSelect');
        const headerClubSelect = document.getElementById('headerClubSelect');
        const editionSelect = document.getElementById('editionSelect');
        const headerEditionSelect = document.getElementById('headerEditionSelect');
        
        // Set up club selector event listeners
        this.setupClubSelectorListeners();
    }

    setupClubSelectorListeners() {
        // Set up event listeners for club selectors
        const clubSelect = document.getElementById('clubSelect');
        const headerClubSelect = document.getElementById('headerClubSelect');
        const editionSelect = document.getElementById('editionSelect');
        const headerEditionSelect = document.getElementById('headerEditionSelect');
        
        if (clubSelect) {
            clubSelect.addEventListener('change', (e) => {
                this.onClubChange(e.target.value);
            });
        }
        
        if (headerClubSelect) {
            headerClubSelect.addEventListener('change', (e) => {
                this.onClubChange(e.target.value);
            });
        }

        // Add event listener for registration form edition selector
        if (editionSelect) {
            editionSelect.addEventListener('change', (e) => {
                this.onEditionChange(e.target.value);
            });
        }

        // Add event listener for header edition selector
        if (headerEditionSelect) {
            headerEditionSelect.addEventListener('change', (e) => {
                this.onEditionChange(e.target.value);
            });
        }
    }

    setupRealtimeListeners() {
        // Try to get database reference if not available
        if (!this.db && window.firebaseDB && typeof window.firebaseDB.collection === 'function') {
            this.db = window.firebaseDB;
        }
        
        if (!this.db || typeof this.db.collection !== 'function') {
            setTimeout(() => this.setupRealtimeListeners(), 2000);
            return;
        }

        // Setting up global settings listener...
        
        // Listen for global settings changes
        this.globalSettingsListener = this.db.collection('global-settings').doc('system')
            .onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    this.availableClubs = data.activeClubs || [];
                    this.loadClubData();
                } else {
                    this.createDefaultGlobalSettings();
                }
            }, (error) => {
                console.error('ClubService: Global settings listener error:', error);
                // If there's an error, try to create the default structure
                this.createDefaultGlobalSettings();
            });
    }

    async loadClubData() {
        if (!this.availableClubs.length) {
            this.updateClubSelectors(); // This will show empty dropdowns
            return;
        }

        // Load clubs from activeClubs array first
        for (const clubId of this.availableClubs) {
            try {
                const clubDoc = await this.db.collection('clubs').doc(clubId).get();
                if (clubDoc.exists) {
                    this.clubData[clubId] = clubDoc.data();
                }
            } catch (error) {
                console.error(`ClubService: Error loading club ${clubId}:`, error);
            }
        }

        // Club loading completed
        
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
            this.updateClubSelectors();
            
            // Also try again after a short delay to handle any late DOM rendering
            setTimeout(() => {
                this.updateClubSelectors();
            }, 100);
        });
    }

    updateClubSelectors() {
        // Updating club selectors...
        
        // Update registration form club selector
        const clubSelect = document.getElementById('clubSelect');

        if (clubSelect) {
            clubSelect.innerHTML = '<option value="">Choose a club...</option>';
            this.availableClubs.forEach(clubId => {
                const club = this.clubData[clubId];
                if (club) {
                    const option = document.createElement('option');
                    option.value = clubId;
                    option.textContent = club.name;
                    if (clubId === this.currentClub) {
                        option.selected = true;
                    }
                    clubSelect.appendChild(option);
    
                }
            });

        }

        // Update header club selector
        const headerClubSelect = document.getElementById('headerClubSelect');

        if (headerClubSelect) {
            headerClubSelect.innerHTML = '<option value="">Select Club...</option>';
            this.availableClubs.forEach(clubId => {
                const club = this.clubData[clubId];
                if (club) {
                    const option = document.createElement('option');
                    option.value = clubId;
                    option.textContent = club.name;
                    if (clubId === this.currentClub) {
                        option.selected = true;
                    }
                    headerClubSelect.appendChild(option);
    
                }
            });
        }
    }

    async onClubChange(clubId) {
        console.log(`🔧 ClubService: onClubChange called with clubId: ${clubId}`);
        console.log(`🔧 ClubService: Current state - currentClub: ${this.currentClub}, currentEdition: ${this.currentEdition}`);
        
        if (!clubId) {
            console.log('🔧 ClubService: No club selected, clearing edition selector');
            this.currentClub = null;
            this.currentEdition = null;
            this.clearEditionSelector();
            return;
        }

        console.log(`🔧 ClubService: Setting current club to: ${clubId}`);
        this.currentClub = clubId;
        
        // Clear current edition when club changes
        this.currentEdition = null;
        console.log(`🔧 ClubService: Cleared current edition`);
        
        // Load and update edition selector for the selected club
        console.log(`🔧 ClubService: About to load editions for club: ${clubId}`);
        await this.loadClubEditions(clubId);
        
        // Update the club selectors to show the selected club
        console.log(`🔧 ClubService: About to update club selectors`);
        this.updateClubSelectors();
        
        console.log(`🔧 ClubService: Club changed to: ${clubId}, editions loaded`);
    }

    async onEditionChange(editionId) {
        if (!editionId) {
            return;
        }

        this.currentEdition = editionId;
        
        // Store the selection
        localStorage.setItem('losCurrentClub', this.currentClub);
        localStorage.setItem('losCurrentEdition', editionId);
        
        // Apply club styling
        this.applyClubStyling(this.currentClub);
        
        // Notify other managers about the change
        if (window.losApp && window.losApp.onClubOrEditionChange) {
            window.losApp.onClubOrEditionChange(this.currentClub, editionId);
        }
        

        
        // Automatically navigate to current gameweek fixtures tab when edition changes
        this.navigateToCurrentGameweek();
    }

    async loadClubEditions(clubId) {
        try {
            const editionsSnapshot = await this.db.collection('clubs').doc(clubId)
                .collection('editions').get();
            
            const editions = [];
            editionsSnapshot.forEach(doc => {
                const edition = doc.data();
                // Include all editions for now - we can filter by isActive later if needed
                editions.push({
                    id: doc.id,
                    ...edition
                });
            });

            this.updateEditionSelector(editions);
        } catch (error) {
            console.error('ClubService: Error loading editions:', error);
            console.error('ClubService: Error details:', error.message, error.stack);
        }
    }

    updateEditionSelector(editions) {
        // Check if user is Super Admin
        const isSuperAdmin = window.losApp?.managers?.superAdmin?.isSuperAdmin;
        
        const editionSelect = document.getElementById('editionSelect');
        if (editionSelect) {
            editionSelect.innerHTML = '<option value="">Choose an edition...</option>';
            editions.forEach(edition => {
                const option = document.createElement('option');
                option.value = edition.id; // Use edition.id, not edition.editionId
                
                // Add status indicator for Super Admin users
                if (isSuperAdmin) {
                    let statusText = '';
                    if (edition.isActive === false) {
                        statusText = ' (Inactive)';
                        option.style.color = '#6b7280'; // Gray out inactive editions but keep them selectable
                    } else if (edition.isActive === true) {
                        statusText = ' (Active)';
                    } else {
                        statusText = ' (Unknown Status)';
                    }
                    option.textContent = `${edition.name}${statusText}`;
                    // Don't disable inactive editions for Super Admin - they need to be selectable
                } else {
                    option.textContent = edition.name;
                }
                
                editionSelect.appendChild(option);
            });
        }

        // Update header edition selector
        const headerEditionSelect = document.getElementById('headerEditionSelect');
        if (headerEditionSelect) {
            headerEditionSelect.innerHTML = '<option value="">Select Edition...</option>';
            editions.forEach(edition => {
                const option = document.createElement('option');
                option.value = edition.id; // Use edition.id, not edition.editionId
                
                // Add status indicator for Super Admin users
                if (isSuperAdmin) {
                    let statusText = '';
                    if (edition.isActive === false) {
                        statusText = ' (Inactive)';
                        option.style.color = '#6b7280'; // Gray out inactive editions but keep them selectable
                    } else if (edition.isActive === true) {
                        statusText = ' (Active)';
                    } else {
                        statusText = ' (Unknown Status)';
                    }
                    option.textContent = `${edition.name}${statusText}`;
                    // Don't disable inactive editions for Super Admin - they need to be selectable
                } else {
                    option.textContent = edition.name;
                }
                
                if (edition.id === this.currentEdition) {
                    option.selected = true;
                }
                headerEditionSelect.appendChild(option);
            });

        }
    }

    clearEditionSelector() {
        const editionSelect = document.getElementById('editionSelect');
        if (editionSelect) {
            editionSelect.innerHTML = '<option value="">Choose an edition...</option>';
        }

        const headerEditionSelect = document.getElementById('headerEditionSelect');
        if (headerEditionSelect) {
            headerEditionSelect.innerHTML = '<option value="">Select Edition...</option>';
        }
    }

    getCurrentClub() {
        return this.currentClub;
    }

    getCurrentEdition() {
        return this.currentEdition;
    }

    getClubData(clubId) {
        return this.clubData[clubId] || null;
    }

    getClubPath(clubId, editionId = null) {
        if (editionId) {
            return `clubs/${clubId}/editions/${editionId}`;
        }
        return `clubs/${clubId}`;
    }

    getUserPath(clubId, editionId, userId) {
        return `clubs/${clubId}/editions/${editionId}/users/${userId}`;
    }

    getFixturesPath(clubId, editionId, gameweekId) {
        return `clubs/${clubId}/editions/${editionId}/fixtures/${gameweekId}`;
    }

    getPicksPath(clubId, editionId) {
        return `clubs/${clubId}/editions/${editionId}/picks`;
    }

    getSettingsPath(clubId, editionId) {
        return `clubs/${clubId}/editions/${editionId}/settings/current`;
    }

    // Apply club-specific styling
    applyClubStyling(clubId) {
        const club = this.getClubData(clubId);
        if (!club) return;

        console.log(`🎨 Applying styling for club: ${club.name}`);

        // Apply club-specific header styling
        this.applyHeaderStyling(club.headerStyle || 'default');
        
        // Apply color scheme to CSS variables
        if (club.primaryColor) {
            document.documentElement.style.setProperty('--club-primary', club.primaryColor);
        }
        if (club.secondaryColor) {
            document.documentElement.style.setProperty('--club-secondary', club.secondaryColor);
        }
        
        // Update page title
        if (club.name) {
            document.title = `${club.name} - Last One Standing`;
        }
        
        // Apply club-specific button styling
        this.applyButtonStyling(club.headerStyle || 'default');
    }

    applyHeaderStyling(style) {
        const header = document.querySelector('.app-header');
        if (!header) return;
        
        // Remove existing style classes
        header.classList.remove('style-altrincham', 'style-timperley', 'style-default');
        
        // Add new style class
        header.classList.add(`style-${style}`);
        
        // Apply specific styling based on club
        switch(style) {
            case 'altrincham':
                header.style.background = 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)';
                header.style.borderBottom = '3px solid #991b1b';
                break;
            case 'timperley':
                header.style.background = 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)';
                header.style.borderBottom = '3px solid #1e3a8a';
                break;
            case 'default':
                header.style.background = 'linear-gradient(135deg, #059669 0%, #10b981 100%)';
                header.style.borderBottom = '3px solid #047857';
                break;
        }
    }

    applyButtonStyling(style) {
        const primaryButtons = document.querySelectorAll('.btn-primary');
        const secondaryButtons = document.querySelectorAll('.btn-secondary');
        
        primaryButtons.forEach(btn => {
            btn.classList.remove('style-altrincham', 'style-timperley', 'style-default');
            btn.classList.add(`style-${style}`);
        });
        
        secondaryButtons.forEach(btn => {
            btn.classList.remove('style-altrincham', 'style-timperley', 'style-default');
            btn.classList.add(`style-${style}`);
        });
    }

    // Clear club styling
    clearClubStyling() {
        const header = document.querySelector('.app-header');
        if (header) {
            header.style.backgroundColor = '';
        }

        const primaryButtons = document.querySelectorAll('.btn-primary');
        primaryButtons.forEach(btn => {
            btn.style.backgroundColor = '';
            btn.style.borderColor = '';
        });

        // Reset title
        document.title = 'LOS App - Last One Standing';
    }

    // Set current club and edition
    setCurrentClubAndEdition(clubId, editionId) {
        console.log(`🔧 ClubService: setCurrentClubAndEdition called with: ${clubId}, ${editionId}`);
        this.currentClub = clubId;
        this.currentEdition = editionId;
        
        // Apply club styling
        this.applyClubStyling(clubId);
        
        // Store in localStorage for persistence
        localStorage.setItem('losCurrentClub', clubId);
        localStorage.setItem('losCurrentEdition', editionId);
        
        // Update UI dropdowns to reflect the current selection
        this.updateClubSelectors();
        
        // Load and update edition selector for the current club
        if (clubId && editionId) {
            this.loadClubEditions(clubId);
            
                // Automatically navigate to current gameweek fixtures tab
    console.log('🎯 ClubService: About to navigate to current gameweek after club/edition change...');
    this.navigateToCurrentGameweek();
        }
    }

    // Load current club and edition from localStorage
    loadStoredClubAndEdition() {
        const storedClub = localStorage.getItem('losCurrentClub');
        const storedEdition = localStorage.getItem('losCurrentEdition');
        
        if (storedClub && storedEdition) {
            this.currentClub = storedClub;
            this.currentEdition = storedEdition;
            this.applyClubStyling(storedClub);
            
            // Update UI dropdowns to reflect the stored selection
            this.updateClubSelectors();
            
            // Load and update edition selector for the stored club
            this.loadClubEditions(storedClub);
            
            // Automatically navigate to current gameweek fixtures tab
            setTimeout(() => {
                this.navigateToCurrentGameweek();
            }, 1000); // Small delay to ensure everything is loaded
            
            return true;
        }
        
        return false;
    }

    // Check if user is admin for a specific club
    async isClubAdmin(clubId, userId) {
        try {
            const userDoc = await this.db.collection('clubs').doc(clubId)
                .collection('editions').doc(this.currentEdition)
                .collection('users').doc(userId).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                return userData.isAdmin === true;
            }
            
            return false;
        } catch (error) {
            console.error('ClubService: Error checking admin status:', error);
            return false;
        }
    }

    // Get all active editions for a club
    async getActiveEditions(clubId) {
        try {
            const editionsSnapshot = await this.db.collection('clubs').doc(clubId)
                .collection('editions').where('isActive', '==', true).get();
            
            const editions = [];
            editionsSnapshot.forEach(doc => {
                editions.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return editions;
        } catch (error) {
            console.error('ClubService: Error getting active editions:', error);
            return [];
        }
    }

    // Get ALL editions for a club (including inactive ones) - for Super Admin use
    async getAllEditions(clubId) {
        try {
            const editionsSnapshot = await this.db.collection('clubs').doc(clubId)
                .collection('editions').get();
            
            const editions = [];
            editionsSnapshot.forEach(doc => {
                editions.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Sort editions by creation date (newest first) and then by edition number
            editions.sort((a, b) => {
                // First sort by edition number if available
                if (a.editionNumber && b.editionNumber) {
                    return a.editionNumber - b.editionNumber;
                }
                // Fallback to creation date
                if (a.created_at && b.created_at) {
                    return b.created_at.toDate() - a.created_at.toDate();
                }
                return 0;
            });
            
            return editions;
        } catch (error) {
            console.error('ClubService: Error getting all editions:', error);
            return [];
        }
    }

    // Create a new club (admin only)
    async createClub(clubData) {
        try {
            const clubId = clubData.clubId;
            await this.db.collection('clubs').doc(clubId).set({
                ...clubData,
                created_at: new Date(),
                updated_at: new Date()
            });
            
            // Update global settings
            await this.db.collection('global-settings').doc('system').update({
                activeClubs: firebase.firestore.FieldValue.arrayUnion(clubId),
                updated_at: new Date()
            });
            
            console.log(`✅ Club ${clubData.name} created successfully`);
            return true;
        } catch (error) {
            console.error('ClubService: Error creating club:', error);
            return false;
        }
    }

    // Create a new edition for a club (admin only)
    async createEdition(clubId, editionData) {
        try {
            const editionId = editionData.editionId;
            await this.db.collection('clubs').doc(clubId)
                .collection('editions').doc(editionId).set({
                    ...editionData,
                    created_at: new Date(),
                    updated_at: new Date()
                });
            
            // Create default settings for the edition
            await this.createDefaultEditionSettings(clubId, editionId);
            
            console.log(`✅ Edition ${editionData.name} created successfully`);
            return true;
        } catch (error) {
            console.error('ClubService: Error creating edition:', error);
            return false;
        }
    }

    async createDefaultEditionSettings(clubId, editionId) {
        const settings = {
            currentGameweek: 1,
            gameweekDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
            tiebreakEnabled: true,
            autoPickEnabled: true,
            autoPickAlgorithm: 'alphabetical',
            registrationOpen: true,
            maxLives: 2,
            totalGameweeks: 10,
            created_at: new Date(),
            updated_at: new Date()
        };
        
        await this.db.collection('clubs').doc(clubId)
            .collection('editions').doc(editionId)
            .collection('settings').doc('current').set(settings);
    }

    async createDefaultGlobalSettings() {
        try {
            console.log('ClubService: Creating default global settings...');
            
            // First check if there are existing clubs before creating empty settings
            const existingClubsSnapshot = await this.db.collection('clubs').limit(1).get();
            const hasExistingClubs = !existingClubsSnapshot.empty;
            
            if (hasExistingClubs) {
                console.log('ClubService: Found existing clubs, checking global settings...');
                // Try to get existing global settings first
                const existingSettings = await this.db.collection('global-settings').doc('system').get();
                if (existingSettings.exists) {
                    const data = existingSettings.data();
                    if (data.activeClubs && data.activeClubs.length > 0) {
                        console.log('ClubService: Found existing global settings with clubs, using those');
                        this.availableClubs = data.activeClubs;
                        this.loadClubData();
                        return;
                    }
                }
                
                // If we have clubs but no proper global settings, create them with the existing clubs
                const clubsSnapshot = await this.db.collection('clubs').get();
                const existingClubIds = clubsSnapshot.docs.map(doc => doc.id);
                
                await this.db.collection('global-settings').doc('system').set({
                    activeClubs: existingClubIds,
                    systemVersion: '2.0',
                    created_at: new Date(),
                    updated_at: new Date()
                });
                
                console.log('ClubService: Created global settings with existing clubs:', existingClubIds);
                this.availableClubs = existingClubIds;
                this.loadClubData();
            } else {
                // No existing clubs, create empty structure
                await this.db.collection('global-settings').doc('system').set({
                    activeClubs: [],
                    systemVersion: '2.0',
                    created_at: new Date(),
                    updated_at: new Date()
                });
                
                console.log('ClubService: Default global settings created (no existing clubs)');
                await this.loadExistingClubs();
            }
            
        } catch (error) {
            console.error('ClubService: Error creating default global settings:', error);
        }
    }

    async loadExistingClubs() {
        try {
            console.log('ClubService: Checking for existing clubs...');
            
            // Check if there are any clubs in the old structure
            const oldUsersSnapshot = await this.db.collection('users').limit(1).get();
            if (!oldUsersSnapshot.empty) {
                console.log('ClubService: Found existing data, suggesting migration...');
                // If there's existing data, suggest running the migration
                this.showMigrationNotice();
            }
            
        } catch (error) {
            console.error('ClubService: Error checking for existing clubs:', error);
        }
    }

    showMigrationNotice() {
        // Create a notice in the console
        console.log(`
🚨 MIGRATION REQUIRED 🚨
Your app has existing data that needs to be migrated to the new multi-club structure.

To migrate your data, run in the browser console:
1. const migration = new MultiClubMigration();
2. await migration.migrateDatabase();
3. await migration.verifyMigration();

To set up sample clubs, run:
1. const setup = new SampleClubSetup();
2. await setup.setupSampleClubs();
3. await setup.verifyClubSetup();
        `);
    }

    // Restore Firebase connection (called by app.js)
    restoreFirebaseConnection() {
        if (this.db && typeof this.db.collection === 'function') {
            return;
        }
        
        if (window.firebaseDB && typeof window.firebaseDB.collection === 'function') {
            this.db = window.firebaseDB;
            
            // Set up listeners now that Firebase is available
            this.setupRealtimeListeners();
            
            // Load stored club and edition, then apply styling
            setTimeout(() => {
                this.loadStoredClubAndEdition();
                this.checkAndReloadClubs();
            }, 1000);
        }
    }

    // Cleanup
    clearListeners() {
        if (this.globalSettingsListener) {
            this.globalSettingsListener();
            this.globalSettingsListener = null;
        }
    }
    
    // Manual trigger for club loading (useful for debugging)
    forceReload() {
        if (this.db && typeof this.db.collection === 'function') {
            this.setupRealtimeListeners();
        }
    }
    
    // Manual trigger for club styling (useful for debugging)
    forceApplyStyling() {
        if (this.currentClub) {
            this.applyClubStyling(this.currentClub);
        }
    }
    
    // Force fix club loading (useful for debugging)
    async forceFixClubLoading() {
        console.log('🔧 ClubService: Force fixing club loading...');
        console.log('🔧 ClubService: Current state:', {
            isInitialized: this.isInitialized,
            hasDb: !!this.db,
            availableClubs: this.availableClubs,
            clubData: this.clubData,
            globalSettingsListener: !!this.globalSettingsListener
        });
        
        // Try to restore Firebase connection
        if (!this.db && window.firebaseDB) {
            console.log('🔧 ClubService: Restoring database connection...');
            this.db = window.firebaseDB;
        }
        
        // Force reload global settings
        if (this.db) {
            try {
                console.log('🔧 ClubService: Force loading global settings...');
                const globalSettingsDoc = await this.db.collection('global-settings').doc('system').get();
                if (globalSettingsDoc.exists) {
                    const data = globalSettingsDoc.data();
                    console.log('🔧 ClubService: Global settings data:', data);
                    this.availableClubs = data.activeClubs || [];
                    await this.loadClubData();
                } else {
                    console.log('🔧 ClubService: No global settings found, creating default...');
                    await this.createDefaultGlobalSettings();
                }
            } catch (error) {
                console.error('🔧 ClubService: Error force loading settings:', error);
            }
        } else {
            console.log('🔧 ClubService: No database connection available');
        }
        
        // Force update selectors
        this.updateClubSelectors();
    }
    
    // Check if clubs are loaded and reload if needed
    checkAndReloadClubs() {
        if (!this.availableClubs.length || !this.globalSettingsListener) {
            this.setupRealtimeListeners();
        }
        
        // If we have a current club, apply its styling
        if (this.currentClub) {
            this.applyClubStyling(this.currentClub);
        }
    }

    // Navigate to current gameweek fixtures tab
    async navigateToCurrentGameweek() {
        try {
            // Switch to fixtures tab first
            this.switchToFixturesTab();
            
            // Calculate and set the current gameweek
            const currentGameweek = await this.calculateCurrentGameweek();
            if (currentGameweek) {
                this.setCurrentGameweek(currentGameweek);
            }
            
            // Force reload fixtures for the new club/edition (with small delay to ensure change is processed)
            setTimeout(() => {
                this.reloadFixturesForCurrentClub();
            }, 500);
            
        } catch (error) {
            console.error('ClubService: Error navigating to current gameweek:', error);
        }
    }

    // Switch to fixtures tab
    switchToFixturesTab() {
        // Use EditionService's tab switching system if available
        if (window.losApp?.managers?.edition && typeof window.losApp.managers.edition.switchTab === 'function') {
            window.losApp.managers.edition.switchTab('fixtures');
        } else if (window.editionService && typeof window.editionService.switchTab === 'function') {
            window.editionService.switchTab('fixtures');
        } else {
            
            // Fallback to manual tab switching
            // Remove active class from all tabs
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Remove active class from all tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Activate fixtures tab
            const fixturesTab = document.querySelector('[data-tab="fixtures"]');
            if (fixturesTab) {
                fixturesTab.classList.add('active');
            }
            
            // Activate fixtures content
            const fixturesContent = document.getElementById('fixturesTab');
            if (fixturesContent) {
                fixturesContent.classList.add('active');
            }
        }
    }

    // Set current gameweek
    setCurrentGameweek(gameweek) {
        
        // Update EditionService if available
        if (window.editionService && typeof window.editionService.setCurrentGameweek === 'function') {
            window.editionService.setCurrentGameweek(gameweek);
        }
        
        // Update gameweek display elements
        const currentGameweekSpan = document.getElementById('currentGameweek');
        if (currentGameweekSpan) {
            currentGameweekSpan.textContent = gameweek;
        }
        
        const gameweekSelect = document.getElementById('gameweekSelect');
        if (gameweekSelect) {
            gameweekSelect.value = gameweek;
        }
        
        // Update navigation buttons
        this.updateGameweekNavigation(gameweek);
    }

    // Update gameweek navigation
    updateGameweekNavigation(currentGameweek) {
        const prevButton = document.getElementById('prevGameweek');
        const nextButton = document.getElementById('nextGameweek');
        
        if (prevButton) {
            prevButton.disabled = currentGameweek <= 1;
            prevButton.style.opacity = currentGameweek <= 1 ? '0.5' : '1';
        }
        
        if (nextButton) {
            // We'll need to get total gameweeks from somewhere
            // For now, assume 10 gameweeks
            const totalGameweeks = 10;
            nextButton.disabled = currentGameweek >= totalGameweeks;
            nextButton.style.opacity = currentGameweek >= totalGameweeks ? '0.5' : '1';
        }
    }

    // Calculate current gameweek based on deadlines
    async calculateCurrentGameweek() {
        try {
            if (!this.currentClub || !this.currentEdition) {
                return 1;
            }
            
            // Get all fixtures for the current edition
            const fixturesSnapshot = await this.db.collection('clubs').doc(this.currentClub)
                .collection('editions').doc(this.currentEdition)
                .collection('fixtures')
                .get();
            
            if (fixturesSnapshot.empty) {
                return 1;
            }
            
            const now = new Date();
            let currentGameweek = 1;
            
            // Group fixtures by gameweek and check deadlines
            const fixturesByGameweek = {};
            fixturesSnapshot.docs.forEach(doc => {
                const fixture = doc.data();
                const gameweek = fixture.gameWeek || fixture.gameweek;
                if (!fixturesByGameweek[gameweek]) {
                    fixturesByGameweek[gameweek] = [];
                }
                fixturesByGameweek[gameweek].push(fixture);
            });
            
            // Sort gameweeks and find the first one where deadline hasn't passed
            const sortedGameweeks = Object.keys(fixturesByGameweek).sort((a, b) => parseInt(a) - parseInt(b));
            
            for (const gameweek of sortedGameweeks) {
                const fixtures = fixturesByGameweek[gameweek];
                if (fixtures.length === 0) continue;
                
                // Find the earliest kick-off time for this gameweek
                const earliestFixture = fixtures.reduce((earliest, fixture) => {
                    try {
                        const fixtureTime = new Date(`${fixture.date}T${fixture.kickOffTime || fixture.time}`);
                        const earliestTime = new Date(`${earliest.date}T${earliest.kickOffTime || earliest.time}`);
                        
                        if (isNaN(fixtureTime.getTime())) return earliest;
                        if (isNaN(earliestTime.getTime())) return fixture;
                        
                        return fixtureTime < earliestTime ? fixture : earliest;
                    } catch (error) {
                        return earliest;
                    }
                });
                
                const deadlineTime = new Date(`${earliestFixture.date}T${earliestFixture.kickOffTime || earliestFixture.time}`);
                if (isNaN(deadlineTime.getTime())) continue;
                
                // Check if deadline has passed (with 1 day buffer for same-day deadlines)
                const deadlineBuffer = new Date(deadlineTime);
                deadlineBuffer.setDate(deadlineBuffer.getDate() - 1);
                
                if (now < deadlineBuffer) {
                    currentGameweek = parseInt(gameweek);
                    break;
                } else if (now < deadlineTime) {
                    // Same day deadline - still allow picks
                    currentGameweek = parseInt(gameweek);
                    break;
                }
            }
            
            return currentGameweek;
            
        } catch (error) {
            console.error('ClubService: Error calculating current gameweek:', error);
            return 1;
        }
    }

    // Force reload fixtures for the current club/edition
    reloadFixturesForCurrentClub() {
        try {
            if (!this.currentClub || !this.currentEdition) {
                return;
            }
            
            // Try to reload fixtures through FixturesManager
            if (window.losApp?.managers?.fixtures) {
                window.losApp.managers.fixtures.loadFixtures();
            } else if (window.fixturesManager) {
                window.fixturesManager.loadFixtures();
            }
            
            // Also try to reload scores
            if (window.losApp?.managers?.scores) {
                window.losApp.managers.scores.loadScores();
            } else if (window.scoresManager) {
                window.scoresManager.loadScores();
            }
            
        } catch (error) {
            console.error('ClubService: Error reloading fixtures:', error);
        }
    }
}

// Export for global use
window.ClubService = ClubService;
