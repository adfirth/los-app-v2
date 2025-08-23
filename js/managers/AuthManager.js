class AuthManager {
    constructor() {
        this.auth = window.firebaseAuth;
        this.db = window.firebaseDB;
        this.currentUser = null;
        this.isAdmin = false;
        this.isInitialized = false;
        this.dataLoaded = false; // Track if data has been loaded
        
        // Don't auto-initialize - wait for main app to control initialization
        // this.init();
    }

    initBasic() {
        if (this.isInitialized) return;
        
        // Only set up basic structure, don't load data yet
        this.setupAuthListeners();
        this.isInitialized = true;
        console.log('AuthManager basic initialization complete');
    }

    init() {
        if (this.isInitialized && this.dataLoaded) return;
        
        console.log('🔐 AuthManager: init() called');
        
        // Set up Firebase database reference
        this.db = window.firebaseDB;
        console.log('🔐 AuthManager: Database reference set:', !!this.db);
        
        // Listen for auth state changes
        console.log('🔐 AuthManager: Setting up auth state listener...');
        this.auth.onAuthStateChanged((user) => {
            console.log('🔐 AuthManager: Auth state changed:', user ? `User: ${user.uid}` : 'No user');
            if (user) {
                this.currentUser = user;
                console.log('🔐 AuthManager: Loading user data for:', user.uid);
                this.loadUserData();
            } else {
                this.currentUser = null;
                this.isAdmin = false;
                console.log('🔐 AuthManager: No user, showing auth screen');
                this.showAuthScreen();
            }
        });

        this.dataLoaded = true;
        console.log('AuthManager full initialization complete');
    }

    restoreFirebaseConnection() {
        // This method will be called by the main app after initialization
        // to restore Firebase functionality
        console.log('AuthManager Firebase connection restored');
    }

    clearListeners() {
        // Clear any existing Firebase listeners
        console.log('AuthManager: Clearing listeners...');
        
        // Unregister from the main app's listener tracking if needed
        if (window.losApp) {
            window.losApp.unregisterListener('auth-user');
        }
    }

    setupAuthListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.register();
            });
        }

        // Auth switch buttons
        const switchToRegister = document.getElementById('switchToRegister');
        const switchToLogin = document.getElementById('switchToLogin');
        
        if (switchToRegister) {
            switchToRegister.addEventListener('click', () => {
                this.showRegisterForm();
            });
        }
        
        if (switchToLogin) {
            switchToLogin.addEventListener('click', () => {
                this.showLoginForm();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    }

    async login() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            this.showLoading();
            await this.auth.signInWithEmailAndPassword(email, password);
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError('Login failed: ' + error.message);
        }
    }

    async register() {
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const club = document.getElementById('clubSelect').value;
        const edition = document.getElementById('editionSelect').value;

        if (!name || !email || !password || !club || !edition) {
            this.showError('Please fill in all fields');
            return;
        }

        try {
            this.showLoading();
            
            // Create user account
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Create user profile in Firestore using new club-based structure
            await this.db.collection('clubs').doc(club)
                .collection('editions').doc(edition)
                .collection('users').doc(user.uid).set({
                    uid: user.uid,
                    displayName: name,
                    email: email,
                    lives: 2,
                    picks: {},
                    registeredAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastPickAt: firebase.firestore.FieldValue.serverTimestamp(),
                    isActive: true,
                    isEliminated: false,
                    eliminationGameweek: null,
                    finalPosition: null,
                    isAdmin: false,
                    created_at: firebase.firestore.FieldValue.serverTimestamp(),
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });

            // Create initial pick record for first gameweek (will be auto-assigned later)
            await this.db.collection('clubs').doc(club)
                .collection('editions').doc(edition)
                .collection('picks').add({
                    userId: user.uid,
                    teamPicked: null,
                    gameweek: 1,
                    fixtureId: null,
                    isAutopick: true,
                    result: null,
                    livesAfterPick: 2,
                    savedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    processedAt: null,
                    created_at: firebase.firestore.FieldValue.serverTimestamp(),
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });

            // Set current club and edition
            if (window.losApp && window.losApp.managers.club && 
                typeof window.losApp.managers.club.setCurrentClubAndEdition === 'function') {
                window.losApp.managers.club.setCurrentClubAndEdition(club, edition);
            }

            this.hideLoading();
            this.showSuccess('Registration successful!');
        } catch (error) {
            this.hideLoading();
            this.showError('Registration failed: ' + error.message);
        }
    }

    async loadUserData(retryCount = 0) {
        try {
            // Prevent infinite retry loops
            if (retryCount > 10) {
                console.error('AuthManager: Too many retries, showing auth screen');
                this.showAuthScreen();
                return;
            }
            
            // Ensure Firebase is ready
            if (!window.firebaseReady || !this.db || typeof this.db.collection !== 'function') {
                console.log(`AuthManager: Firebase not ready, retry ${retryCount + 1}/10, retrying in 2 seconds...`);
                
                // Try to update our database reference if Firebase is ready but we don't have it
                if (window.firebaseReady && window.firebaseDB && !this.db) {
                    console.log('AuthManager: Updating database reference from global Firebase...');
                    this.db = window.firebaseDB;
                }
                
                setTimeout(() => this.loadUserData(retryCount + 1), 2000);
                return;
            }

            // Check if ClubService is ready
            if (!window.losApp || !window.losApp.managers || !window.losApp.managers.club || 
                typeof window.losApp.managers.club.setCurrentClubAndEdition !== 'function' ||
                !window.losApp.managers.club.isReady) {
                console.log(`AuthManager: ClubService not ready, retry ${retryCount + 1}/10, retrying in 2 seconds...`);
                console.log(`🔍 AuthManager: ClubService status - exists: ${!!window.losApp?.managers?.club}, has method: ${!!window.losApp?.managers?.club?.setCurrentClubAndEdition}, isReady: ${window.losApp?.managers?.club?.isReady}`);
                console.log(`🔍 AuthManager: App status - losApp: ${!!window.losApp}, managers: ${!!window.losApp?.managers}`);
                setTimeout(() => this.loadUserData(retryCount + 1), 2000);
                return;
            }

            // Check if we can attempt a connection (only if losApp is fully initialized)
            if (window.losApp && typeof window.losApp.canAttemptConnection === 'function' && !window.losApp.canAttemptConnection()) {
                console.log(`AuthManager: Cannot attempt connection at this time, retry ${retryCount + 1}/10, retrying in 2 seconds...`);
                setTimeout(() => this.loadUserData(retryCount + 1), 2000);
                return;
            }

            // Check if there's a current user
            if (!this.currentUser || !this.currentUser.uid) {
                console.log('AuthManager: No current user, showing auth screen...');
                this.showAuthScreen();
                return;
            }

            // Try to load user data from stored club/edition first
            let userData = null;
            let userFound = false;
            
            // Check if ClubService is ready and has stored club/edition
            if (window.losApp && window.losApp.managers.club && 
                typeof window.losApp.managers.club.loadStoredClubAndEdition === 'function') {
                
                const hasStoredData = window.losApp.managers.club.loadStoredClubAndEdition();
                if (hasStoredData) {
                    const storedClub = window.losApp.managers.club.getCurrentClub();
                    const storedEdition = window.losApp.managers.club.getCurrentEdition();
                    console.log(`🔍 AuthManager: Loaded stored club/edition: ${storedClub}, ${storedEdition}`);
                    
                    if (storedClub && storedEdition) {
                        try {
                            const userDoc = await this.db.collection('clubs').doc(storedClub)
                                .collection('editions').doc(storedEdition)
                                .collection('users').doc(this.currentUser.uid).get();
                            
                                                            if (userDoc.exists) {
                                    userData = userDoc.data();
                                    userFound = true;
                                    
                                    // Set current club and edition
                                    if (window.losApp && window.losApp.managers.club && 
                                        typeof window.losApp.managers.club.setCurrentClubAndEdition === 'function') {
                                        console.log(`🔧 AuthManager: Setting club/edition to: ${storedClub}, ${storedEdition}`);
                                        window.losApp.managers.club.setCurrentClubAndEdition(storedClub, storedEdition);
                                        console.log(`✅ User found in stored club/edition: ${storedClub}, ${storedEdition}`);
                                    } else {
                                        console.error('❌ ClubService not available for setting club/edition');
                                    }
                                }
                        } catch (error) {
                            console.log('AuthManager: Error loading from stored club/edition:', error);
                        }
                    }
                }
            }
            
            // If not found in stored club/edition, search all clubs
            if (!userFound) {
                console.log('🔍 Searching for user across all clubs...');
                try {
                    const globalSettings = await this.db.collection('global-settings').doc('system').get();
                    const activeClubs = globalSettings.exists ? globalSettings.data().activeClubs : [];
                    
                    if (!activeClubs || activeClubs.length === 0) {
                        console.log('⚠️ No active clubs found in global settings');
                        // Don't retry here, just show auth screen
                        this.showAuthScreen();
                        return;
                    }
                    
                    for (const clubId of activeClubs) {
                        try {
                            const editionsSnapshot = await this.db.collection('clubs').doc(clubId)
                                .collection('editions').get();
                            
                            for (const editionDoc of editionsSnapshot.docs) {
                                const userDoc = await this.db.collection('clubs').doc(clubId)
                                    .collection('editions').doc(editionDoc.id)
                                    .collection('users').doc(this.currentUser.uid).get();
                                
                                if (userDoc.exists) {
                                    userData = userDoc.data();
                                    userFound = true;
                                    
                                    // Set current club and edition
                                    if (window.losApp && window.losApp.managers.club && 
                                        typeof window.losApp.managers.club.setCurrentClubAndEdition === 'function') {
                                        console.log(`🔧 AuthManager: Setting club/edition to: ${clubId}, ${editionDoc.id}`);
                                        window.losApp.managers.club.setCurrentClubAndEdition(clubId, editionDoc.id);
                                        console.log(`✅ User found in club: ${clubId}, edition: ${editionDoc.id}`);
                                    } else {
                                        console.error('❌ ClubService not available for setting club/edition');
                                    }
                                    break;
                                }
                            }
                            
                            if (userFound) break;
                        } catch (error) {
                            console.log(`AuthManager: Error searching club ${clubId}:`, error);
                        }
                    }
                } catch (error) {
                    console.error('AuthManager: Error accessing global settings:', error);
                    // Don't retry here, just show auth screen
                    this.showAuthScreen();
                    return;
                }
            }
            
            if (userFound && userData) {
                this.currentUser = {
                    ...this.currentUser,
                    ...userData
                };
                
                // Update UI
                this.updateUserDisplay();
                
                // Show main app (hide loading screen)
                this.showMainApp();
                
                // Check if user is admin - don't show panel automatically, let AdminManager handle it
                if (userData.isAdmin) {
                    console.log('🔍 AuthManager: User is admin, but not auto-showing admin panel');
                    // The AdminManager will handle showing the admin panel when the admin button is clicked
                }
                
                // Notify SuperAdminManager about the current user
                console.log('🔍 AuthManager: Attempting to notify SuperAdminManager...');
                console.log('🔍 AuthManager: window.losApp exists:', !!window.losApp);
                console.log('🔍 AuthManager: superAdmin manager exists:', !!(window.losApp && window.losApp.managers.superAdmin));
                
                if (window.losApp && window.losApp.managers.superAdmin) {
                    console.log('🔍 AuthManager: Calling SuperAdminManager.setCurrentUser()...');
                    window.losApp.managers.superAdmin.setCurrentUser(this.currentUser);
                } else {
                    console.log('❌ AuthManager: SuperAdminManager not available');
                }
            } else {
                // If user document doesn't exist, show auth screen to register
                this.showAuthScreen();
            }
            
        } catch (error) {
            // Handle specific Firebase errors
            if (window.handleFirebaseError) {
                window.handleFirebaseError(error, 'AuthManager-loadUserData');
            }
            
            if (error.message && error.message.includes('Target ID already exists')) {
                console.log('User data loading conflict detected, retrying in 2 seconds...');
                setTimeout(() => this.loadUserData(), 2000);
            } else {
                console.error('Error loading user data:', error);
                this.showError('Failed to load user data');
            }
        }
    }

updateUserDisplay() {
    const userNameElement = document.getElementById('userName');
    const livesCountElement = document.getElementById('livesCount');
    
    if (userNameElement && this.currentUser) {
        userNameElement.textContent = this.currentUser.displayName || 'Player';
    }
    
    if (livesCountElement && this.currentUser) {
        livesCountElement.textContent = this.currentUser.lives || 2;
    }
}


    
    async loadUserDataFallback() {
        try {
            console.log('Attempting fallback user data loading...');
            
            // Try to get user data with a one-time listener instead of get()
            return new Promise((resolve) => {
                const unsubscribe = this.db.collection('users').doc(this.currentUser.uid)
                    .onSnapshot((doc) => {
                        if (doc.exists) {
                            const userData = doc.data();
                            this.isAdmin = userData.isAdmin || false;
                            
                            // Update UI with user data
                            this.updateUserUI(userData);
                            
                            // Show main app
                            this.showMainApp();
                            
                            // Initialize other managers
                            this.initializeApp();
                            
                            unsubscribe(); // Clean up immediately
                            resolve();
                        } else {
                            this.showError('User profile not found');
                            this.logout();
                            unsubscribe();
                            resolve();
                        }
                    }, (error) => {
                        console.error('Fallback also failed:', error);
                        this.showError('Failed to load user data');
                        unsubscribe();
                        resolve();
                    });
            });
        } catch (error) {
            console.error('Fallback approach failed:', error);
            this.showError('Failed to load user data');
        }
    }

    updateUserUI(userData) {
        const userName = document.getElementById('userName');
        const livesCount = document.getElementById('livesCount');
        const userLives = document.getElementById('userLives');

        if (userName) userName.textContent = userData.displayName || 'Player';
        if (livesCount) livesCount.textContent = userData.lives || 0;
        
        // Update lives indicator styling
        if (userLives) {
            if (userData.lives <= 0) {
                userLives.classList.add('eliminated');
            } else {
                userLives.classList.remove('eliminated');
            }
        }
    }

    async logout() {
        try {
            await this.auth.signOut();
            this.showSuccess('Logged out successfully');
        } catch (error) {
            this.showError('Logout failed: ' + error.message);
        }
    }

    showAuthScreen() {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('authContainer').classList.remove('hidden');
        document.getElementById('appContainer').classList.add('hidden');
        
        // Load available editions for registration
        this.loadAvailableEditions();
    }

    showMainApp() {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('authContainer').classList.add('hidden');
        document.getElementById('appContainer').classList.remove('hidden');
        
        // Notify SuperAdminManager about the current user
        if (window.losApp && window.losApp.managers.superAdmin) {
            window.losApp.managers.superAdmin.setCurrentUser(this.currentUser);
        }
    }

    showLoginForm() {
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('registerForm').classList.add('hidden');
        document.getElementById('switchToRegister').classList.remove('hidden');
        document.getElementById('switchToLogin').classList.add('hidden');
    }

    showRegisterForm() {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('registerForm').classList.remove('hidden');
        document.getElementById('switchToRegister').classList.add('hidden');
        document.getElementById('switchToLogin').classList.remove('hidden');
        
        // Ensure editions are loaded when showing registration form
        this.loadAvailableEditions();
    }

    async loadAvailableEditions() {
        try {
            console.log('Loading available editions...');
            
            // Check if we have access to ClubService to get editions from the new structure
            if (window.losApp && window.losApp.managers.club) {
                console.log('Using ClubService to load editions...');
                // The ClubService will handle loading editions when a club is selected
                return;
            }
            
            // Fallback: Try to get editions from the old settings structure
            try {
                const editionsSnapshot = await this.db.collection('settings').doc('currentCompetition').get();
                console.log('Got settings snapshot:', editionsSnapshot);
                
                if (editionsSnapshot && editionsSnapshot.exists) {
                    const data = editionsSnapshot.data();
                    this.populateEditionsDropdown(data);
                } else {
                    console.log('Settings document does not exist');
                    this.loadEditionsFallback();
                }
            } catch (dbError) {
                console.log('Database error, trying alternative approach...');
                this.loadEditionsFallback();
            }
            
        } catch (error) {
            console.error('Full error in loadAvailableEditions:', error);
            this.loadEditionsFallback();
        }
    }
    
    populateEditionsDropdown(data) {
        const editionSelect = document.getElementById('editionSelect');
        console.log('Edition select element:', editionSelect);
        
        if (!editionSelect) {
            console.error('Edition select element not found');
            return;
        }
        
        if (data.available_editions && Array.isArray(data.available_editions)) {
            console.log('Available editions found:', data.available_editions);
            console.log('Number of editions:', data.available_editions.length);
            
            editionSelect.innerHTML = '<option value="">Choose an edition...</option>';
            console.log('Cleared and added default option');
            
            data.available_editions.forEach((edition, index) => {
                console.log(`Processing edition ${index}:`, edition);
                const option = document.createElement('option');
                option.value = edition.id;
                option.textContent = edition.name;
                editionSelect.appendChild(option);
                console.log('Added option:', edition.name);
            });
            
            console.log('Final options count:', editionSelect.options.length);
        } else {
            console.log('No available_editions found in settings');
            console.log('Data keys:', Object.keys(data));
            this.loadEditionsFallback();
        }
    }
    
    loadEditionsFallback() {
        console.log('Loading editions from fallback...');
        // Try to manually populate with the editions we know exist
        const editionSelect = document.getElementById('editionSelect');
        if (editionSelect) {
            editionSelect.innerHTML = '<option value="">Choose an edition...</option>';
            
            // Add the editions we know exist from our database initialization
            const fallbackEditions = [
                { id: "1", name: "Championship 2024/25" },
                { id: "2", name: "Premier League 2024/25" }
            ];
            
            fallbackEditions.forEach(edition => {
                const option = document.createElement('option');
                option.value = edition.id;
                option.textContent = edition.name;
                editionSelect.appendChild(option);
                console.log('Added fallback option:', edition.name);
            });
        }
    }

    initializeApp() {
        // Initialize other managers
        if (window.editionService) window.editionService.init();
        if (window.fixturesManager) window.fixturesManager.init();
        if (window.scoresManager) window.scoresManager.init();
        if (window.gameLogicManager) window.gameLogicManager.init();
        if (window.pickStatusService) window.pickStatusService.init();
        if (window.deadlineService) window.deadlineService.init();
        if (window.adminManager && this.isAdmin) window.adminManager.init();
    }

    showLoading() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
    }

    hideLoading() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showWarning(message) {
        this.showToast(message, 'warning');
    }

    showInfo(message) {
        this.showToast(message, 'info');
    }

    showToast(message, type = 'info') {
        console.log(`🔔 Toast notification: ${type} - ${message}`);
        
        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
            console.log('🔔 Created new toast container');
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="flex items-center gap-2">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add to container
        toastContainer.appendChild(toast);
        console.log(`🔔 Toast added to container: ${message}`);

        // Remove after 10 seconds (increased from 5)
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
                console.log(`🔔 Toast removed: ${message}`);
            }
        }, 10000);
    }

    getToastIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            case 'info': return 'info-circle';
            default: return 'info-circle';
        }
    }

    // Getter methods for other managers
    getCurrentUser() {
        return this.currentUser;
    }

    getCurrentUserId() {
        return this.currentUser ? this.currentUser.uid : null;
    }

    isUserAdmin() {
        return this.isAdmin;
    }
}

// Initialize AuthManager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});
