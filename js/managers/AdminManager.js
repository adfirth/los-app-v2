export default class AdminManager {
    constructor() {
        this.isInitialized = false;
        this.dataLoaded = false; // Track if data has been loaded
        this.isAdmin = false;
        this.adminPanel = null;
        this.db = null;

        // Don't auto-initialize - wait for main app to control initialization
        // this.init();
    }

    initBasic() {
        if (this.isInitialized) return;

        // Only set up basic structure, don't load data yet
        this.isInitialized = true;
    }

    init() {
        if (this.isInitialized && this.dataLoaded) return;

        // Set up Firebase database reference
        this.db = window.firebaseDB;

        // Ensure database reference is available
        if (!this.db) {
            setTimeout(() => this.init(), 1000);
            return;
        }

        // Quick check for super admin email to show admin button immediately
        this.quickSuperAdminCheck();

        // Check admin status and set up admin panel
        this.checkAdminStatus();
        this.setupAdminPanel();
        this.dataLoaded = true;

        // Additional checks with longer delays to catch late super admin initialization
        setTimeout(async () => {
            await this.checkAdminStatus();
        }, 5000);

        setTimeout(async () => {
            await this.checkAdminStatus();
        }, 10000);

        // Set up periodic admin status checks
        this.adminStatusInterval = setInterval(async () => {
            await this.checkAdminStatus();
        }, 30000); // Check every 30 seconds
    }

    quickSuperAdminCheck() {
        try {
            // Quick check for super admin email
            if (window.authManager?.getCurrentUser) {
                const currentUser = window.authManager.getCurrentUser();
                if (currentUser && currentUser.email) {
                    const superAdminEmails = ['adfirth@gmail.com'];
                    if (superAdminEmails.includes(currentUser.email)) {
                        this.showAdminButton();
                        this.currentUserIsSuperAdmin = true;
                    }
                }
            }
        } catch (error) {
            // Quick check failed, continue with normal flow
        }
    }

    restoreFirebaseConnection() {
        // This method will be called by the main app after initialization
        // to restore Firebase functionality

        // Refresh database reference
        this.db = window.firebaseDB;
    }

    refreshDatabaseReference() {
        // Manual method to refresh database reference
        this.db = window.firebaseDB;
        return !!this.db;
    }

    clearListeners() {
        // Clear any existing Firebase listeners

        // Clear admin status interval
        if (this.adminStatusInterval) {
            clearInterval(this.adminStatusInterval);
            this.adminStatusInterval = null;
        }

        // Unregister from the main app's listener tracking if needed
        if (window.losApp) {
            window.losApp.unregisterListener('admin-panel');
        }
    }

    showError(message) {
        if (window.authManager && window.authManager.showError) {
            window.authManager.showError(message);
        } else {
            console.error(message);
        }
    }

    async checkAdminStatus() {
        try {
            const userId = window.authManager.getCurrentUserId();
            if (!userId) return;



            // Check if user is a regular admin
            const userDoc = await this.db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                this.isAdmin = userData.isAdmin || false;
            }

            // Check if user is a super admin - multiple fallback strategies
            let isSuperAdmin = false;

            // Strategy 1: Check SuperAdminManager if available
            if (window.losApp?.managers?.superAdmin) {
                isSuperAdmin = window.losApp.managers.superAdmin.isSuperAdmin;
            }

            // Strategy 2: Check if SuperAdminManager exists but isn't ready yet
            if (!isSuperAdmin && window.losApp?.managers?.superAdmin) {
                // Wait a bit for SuperAdminManager to initialize
                await new Promise(resolve => setTimeout(resolve, 500));
                isSuperAdmin = window.losApp.managers.superAdmin.isSuperAdmin;
            }

            // Strategy 3: Email-based super admin fallback
            if (!isSuperAdmin && window.authManager?.getCurrentUser) {
                const currentUser = window.authManager.getCurrentUser();
                if (currentUser && currentUser.email) {
                    const superAdminEmails = ['adfirth@gmail.com']; // Same list as in SuperAdminManager
                    if (superAdminEmails.includes(currentUser.email)) {
                        isSuperAdmin = true;
                    }
                }
            }

            // Strategy 4: Check localStorage for super admin status (if set by SuperAdminManager)
            if (!isSuperAdmin && typeof localStorage !== 'undefined') {
                const storedSuperAdmin = localStorage.getItem('isSuperAdmin');
                if (storedSuperAdmin === 'true') {
                    isSuperAdmin = true;
                }
            }

            // Strategy 5: Check if user has super admin role in user document
            if (!isSuperAdmin && userDoc.exists) {
                const userData = userDoc.data();
                isSuperAdmin = userData.isSuperAdmin || userData.role === 'super_admin' || false;
            }

            // Show admin button if user is either admin or super admin
            if (this.isAdmin || isSuperAdmin) {
                this.showAdminButton();

                // Store the admin status for future reference
                this.currentUserIsAdmin = this.isAdmin;
                this.currentUserIsSuperAdmin = isSuperAdmin;
            } else {
                this.currentUserIsAdmin = false;
                this.currentUserIsSuperAdmin = false;
            }
        } catch (error) {
            console.error('❌ AdminManager: Error checking admin status:', error);
        }
    }

    showAdminButton() {
        // Add admin button to header if not already present
        if (!document.getElementById('adminBtn')) {
            this.insertAdminButton();

            // Also set up a retry mechanism when app container becomes visible
            this.setupAppContainerVisibilityListener();
        }
    }

    setupAppContainerVisibilityListener() {
        // If app container is hidden, wait for it to become visible
        const appContainer = document.getElementById('appContainer');
        if (appContainer && appContainer.classList.contains('hidden')) {
            console.log('🔍 AdminManager: App container is hidden, setting up visibility listener');

            // Use MutationObserver to watch for class changes
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const target = mutation.target;
                        if (target.id === 'appContainer' && !target.classList.contains('hidden')) {
                            console.log('🔍 AdminManager: App container became visible, retrying button insertion');
                            observer.disconnect(); // Stop observing
                            setTimeout(() => this.insertAdminButton(), 100); // Small delay to ensure DOM is ready
                        }
                    }
                });
            });

            observer.observe(appContainer, { attributes: true, attributeFilter: ['class'] });

            // Also set a timeout as fallback
            setTimeout(() => {
                observer.disconnect();
                if (!document.getElementById('adminBtn')) {
                    console.log('🔍 AdminManager: Fallback timeout reached, retrying button insertion');
                    this.insertAdminButton();
                }
            }, 2000);
        }
    }

    insertAdminButton(retryCount = 0) {
        // Wait for DOM to be ready and app container to be visible
        const appContainer = document.getElementById('appContainer');
        if (document.readyState !== 'complete' || !appContainer || appContainer.classList.contains('hidden')) {
            if (retryCount < 100) { // Max 100 retries (10 seconds)
                setTimeout(() => this.insertAdminButton(retryCount + 1), 100);
                return;
            } else {
                console.error('❌ AdminManager: App container not ready after 10 seconds');
                return;
            }
        }

        // Try to find adminButtonsContainer first
        let adminButtonsContainer = document.getElementById('adminButtonsContainer');

        // If adminButtonsContainer doesn't exist, try to find an alternative container
        if (!adminButtonsContainer) {
            console.log('🔍 AdminManager: adminButtonsContainer not found, looking for alternative container...');

            // Try to find header-content as an alternative
            const headerContent = document.querySelector('.header-content');
            if (headerContent) {
                console.log('🔍 AdminManager: Found header-content, using as container');
                adminButtonsContainer = headerContent;
            } else {
                // Try to find app-header as last resort
                const appHeader = document.querySelector('.app-header');
                if (appHeader) {
                    console.log('🔍 AdminManager: Found app-header, using as container');
                    adminButtonsContainer = appHeader;
                }
            }
        }

        console.log('🔍 AdminManager: Admin buttons container found:', !!adminButtonsContainer, 'Retry:', retryCount);

        // Additional debugging for first few attempts
        if (retryCount < 3) {
            console.log('🔍 AdminManager: Debugging DOM state...');
            console.log('🔍 AdminManager: document.readyState:', document.readyState);
            console.log('🔍 AdminManager: appContainer visible:', !document.getElementById('appContainer')?.classList.contains('hidden'));
            console.log('🔍 AdminManager: .app-header exists:', !!document.querySelector('.app-header'));
            console.log('🔍 AdminManager: .header-controls exists:', !!document.querySelector('.header-controls'));
            console.log('🔍 AdminManager: All elements with "admin" in ID:', Array.from(document.querySelectorAll('[id*="admin"]')).map(el => el.id));

            // Additional debugging
            const headerControls = document.querySelector('.header-controls');
            if (headerControls) {
                console.log('🔍 AdminManager: .header-controls found, checking children...');
                console.log('🔍 AdminManager: .header-controls children:', Array.from(headerControls.children).map(el => el.id || el.className));
                const adminContainer = headerControls.querySelector('#adminButtonsContainer');
                console.log('🔍 AdminManager: adminButtonsContainer inside header-controls:', !!adminContainer);
            } else {
                console.log('🔍 AdminManager: .header-controls not found, checking all header elements...');
                const allHeaders = document.querySelectorAll('[class*="header"]');
                console.log('🔍 AdminManager: All header elements:', Array.from(allHeaders).map(el => el.className));

                // Check the app-header structure
                const appHeader = document.querySelector('.app-header');
                if (appHeader) {
                    console.log('🔍 AdminManager: app-header found, checking its children...');
                    console.log('🔍 AdminManager: app-header children:', Array.from(appHeader.children).map(el => el.className));

                    // Look for header-row elements
                    const headerRows = appHeader.querySelectorAll('.header-row');
                    console.log('🔍 AdminManager: header-row elements found:', headerRows.length);
                    headerRows.forEach((row, index) => {
                        console.log(`🔍 AdminManager: header-row ${index}:`, row.className);
                        console.log(`🔍 AdminManager: header-row ${index} children:`, Array.from(row.children).map(el => el.className));
                    });
                }
            }
        }

        if (adminButtonsContainer) {
            const adminBtn = document.createElement('button');
            adminBtn.id = 'adminBtn';
            adminBtn.className = 'btn btn-primary'; // Changed to primary for better visibility
            adminBtn.innerHTML = '<i class="fas fa-cog"></i> Admin'; // Added text for clarity
            adminBtn.title = 'Admin Panel';
            adminBtn.style.marginRight = '10px'; // Add some spacing
            adminBtn.style.cursor = 'pointer'; // Ensure cursor shows it's clickable
            adminBtn.style.pointerEvents = 'auto'; // Ensure clicks are captured
            adminBtn.style.display = 'inline-block'; // Ensure button is visible

            // Add click event listener with better error handling
            adminBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();

                try {
                    this.toggleAdminPanel();
                } catch (error) {
                    console.error('❌ AdminManager: Error in toggleAdminPanel:', error);
                }
            });

            // Also add mousedown and touchstart for better interaction
            adminBtn.addEventListener('mousedown', (event) => {
                // Mousedown event for better interaction
            });

            adminBtn.addEventListener('touchstart', (event) => {
                // Touchstart event for better interaction
            });

            adminButtonsContainer.appendChild(adminBtn);
            console.log('✅ AdminManager: Admin button inserted successfully');
            console.log('🔍 AdminManager: Button element:', adminBtn);
            console.log('🔍 AdminManager: Button display style:', adminBtn.style.display);
            console.log('🔍 AdminManager: Container children count:', adminButtonsContainer.children.length);
        } else if (retryCount < 50) { // Max 50 retries (5 seconds)
            // Retry after a short delay if container not found
            console.log('⏳ AdminManager: Admin buttons container not found, retrying in 100ms... (Attempt ' + (retryCount + 1) + '/50)');
            setTimeout(() => this.insertAdminButton(retryCount + 1), 100);
        } else {
            console.error('❌ AdminManager: Failed to find admin buttons container after 50 attempts');
        }
    }

    // Method to refresh admin status (can be called when super admin status changes)
    async refreshAdminStatus() {
        await this.checkAdminStatus();
    }

    // Force refresh admin status - useful for debugging
    async forceRefreshAdminStatus() {
        // Clear any existing admin button
        const existingBtn = document.getElementById('adminBtn');
        if (existingBtn) {
            existingBtn.remove();
        }

        // Force a fresh admin status check
        await this.checkAdminStatus();
    }

    // Method to manually trigger admin button display (for debugging)
    forceShowAdminButton() {
        this.showAdminButton();
    }

    // Test admin button functionality
    testAdminButton() {
        console.log('🔧 AdminManager: testAdminButton called');

        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) {
            console.log('🔧 AdminManager: Admin button found, testing functionality...');
            console.log('🔧 AdminManager: Button properties:', {
                id: adminBtn.id,
                className: adminBtn.className,
                disabled: adminBtn.disabled,
                innerHTML: adminBtn.innerHTML,
                style: adminBtn.style.cssText
            });

            // Test if the button is clickable
            const rect = adminBtn.getBoundingClientRect();
            console.log('🔧 AdminManager: Button position:', {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                visible: rect.width > 0 && rect.height > 0
            });

            // Test if event listeners are attached
            const clickListeners = adminBtn.onclick;
            console.log('🔧 AdminManager: Click listeners:', clickListeners);

            // Manually trigger a click to test
            console.log('🔧 AdminManager: Manually triggering click...');
            adminBtn.click();
        } else {
            console.log('❌ AdminManager: Admin button not found');
        }

        // Also test admin panel
        const adminPanel = document.getElementById('adminPanel');
        console.log('🔧 AdminManager: Admin panel found:', !!adminPanel);
        if (adminPanel) {
            console.log('🔧 AdminManager: Admin panel classes:', adminPanel.className);
            console.log('🔧 AdminManager: Admin panel display:', getComputedStyle(adminPanel).display);
            console.log('🔧 AdminManager: Admin panel visibility:', getComputedStyle(adminPanel).visibility);
        }
    }

    // Force initialize admin panel
    forceInitAdminPanel() {
        console.log('🔧 AdminManager: forceInitAdminPanel called');
        this.setupAdminPanel();

        // Also ensure admin button is visible
        setTimeout(() => {
            this.showAdminButton();
            this.testAdminButton();
        }, 500);
    }

    setupAdminPanel() {
        // setupAdminPanel called

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupAdminPanelInternal();
            });
        } else {
            this.setupAdminPanelInternal();
        }
    }

    setupAdminPanelInternal() {
        // setupAdminPanelInternal called

        this.adminPanel = document.getElementById('adminPanel');
        // adminPanel element found

        if (this.adminPanel) {
            // Setup admin panel listeners
            this.setupAdminListeners();
            // Admin panel setup complete
        } else {
            console.error('❌ AdminManager: adminPanel element not found - retrying in 1 second');
            // Retry after a delay
            setTimeout(() => {
                this.setupAdminPanelInternal();
            }, 1000);
        }
    }

    setupAdminListeners() {
        // setupAdminListeners called

        // Close admin panel button
        const closeAdminBtn = document.getElementById('closeAdmin');
        if (closeAdminBtn) {
            closeAdminBtn.addEventListener('click', () => {
                console.log('🔧 AdminManager: Close button clicked');
                this.hideAdminPanel();
            });
            // Close button listener added
        } else {
            console.warn('⚠️ AdminManager: Close button not found');
        }

        // Admin tab navigation
        const adminTabs = document.querySelectorAll('.admin-tab');
        // Found admin tabs
        adminTabs.forEach((tab, index) => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-admin-tab');
                console.log('🔧 AdminManager: Admin tab clicked:', targetTab);
                this.switchAdminTab(targetTab);
            });
            // Tab listener added
        });
    }

    toggleAdminPanel() {
        console.log('🔧 AdminManager: toggleAdminPanel called');
        console.log('🔧 AdminManager: adminPanel element:', this.adminPanel);

        if (this.adminPanel) {
            const wasHidden = this.adminPanel.classList.contains('hidden');
            const wasActive = this.adminPanel.classList.contains('active');

            // Toggle the hidden class to control visibility
            this.adminPanel.classList.toggle('hidden');
            const isNowHidden = this.adminPanel.classList.contains('hidden');

            // Toggle the active class for styling and animation
            this.adminPanel.classList.toggle('active');
            const isNowActive = this.adminPanel.classList.contains('active');

            console.log('🔧 AdminManager: Admin panel was hidden:', wasHidden, 'now hidden:', isNowHidden);
            console.log('🔧 AdminManager: Admin panel was active:', wasActive, 'now active:', isNowActive);

            if (!isNowHidden && isNowActive) {
                console.log('🔧 AdminManager: Loading admin content for users tab...');
                this.loadAdminContent('users'); // Default to users tab
            }
        } else {
            console.log('❌ AdminManager: adminPanel element not found');
        }
    }

    showAdminPanel() {
        if (this.adminPanel) {
            this.adminPanel.classList.remove('hidden');
            this.adminPanel.classList.add('active');
            this.loadAdminContent('users');
        }
    }

    hideAdminPanel() {
        if (this.adminPanel) {
            this.adminPanel.classList.add('hidden');
            this.adminPanel.classList.remove('active');
        }
    }

    switchAdminTab(targetTab) {
        // Remove active class from all tabs
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Add active class to clicked tab
        const activeTab = document.querySelector(`[data-admin-tab="${targetTab}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Load content for the selected tab
        this.loadAdminContent(targetTab);
    }

    async loadAdminContent(tabName) {
        console.log('🔧 AdminManager: loadAdminContent called for tab:', tabName);

        const adminContent = document.getElementById('adminContent');
        console.log('🔧 AdminManager: adminContent element:', adminContent);

        if (!adminContent) {
            console.log('❌ AdminManager: adminContent element not found');
            return;
        }

        // Show loading state
        adminContent.innerHTML = `
            <div class="empty-state">
                <div class="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <h3>Loading admin content...</h3>
            </div>
        `;

        console.log('🔧 AdminManager: Loading state set, proceeding to load content...');

        try {
            switch (tabName) {
                case 'users':
                    await this.loadUsersContent();
                    break;
                case 'fixtures':
                    await this.loadFixturesContent();
                    break;
                case 'scores':
                    await this.loadScoresContent();
                    break;
                case 'settings':
                    await this.loadSettingsContent();
                    break;
                default:
                    adminContent.innerHTML = '<p>Invalid admin tab</p>';
            }
        } catch (error) {
            console.error('Error loading admin content:', error);
            adminContent.innerHTML = '<p>Error loading content</p>';
        }
    }

    async loadUsersContent() {
        console.log('🔧 AdminManager: loadUsersContent called');

        const adminContent = document.getElementById('adminContent');
        if (!adminContent) {
            console.log('❌ AdminManager: adminContent not found in loadUsersContent');
            return;
        }

        try {
            // Get current club and edition from ClubService
            const currentClub = window.clubService?.getCurrentClub();
            const currentEdition = window.clubService?.getCurrentEdition();

            console.log('🔧 AdminManager: Loading users for club:', currentClub, 'edition:', currentEdition);

            let users = [];

            if (currentClub && currentEdition) {
                // Use new multi-club structure
                console.log('🔧 AdminManager: Using new multi-club structure for users');

                // Check database reference and try to restore if needed
                if (!this.db) {
                    console.log('🔧 AdminManager: Database reference not available in loadUsersContent, attempting to restore...');
                    this.restoreFirebaseConnection();

                    // If still not available, try manual refresh
                    if (!this.db) {
                        this.refreshDatabaseReference();
                    }

                    // Final check
                    if (!this.db) {
                        console.error('❌ AdminManager: Database reference still not available after restore attempts in loadUsersContent');
                        adminContent.innerHTML = '<p>Error: Database not available. Please refresh the page.</p>';
                        return;
                    }
                }

                try {
                    const usersSnapshot = await this.db.collection('clubs')
                        .doc(currentClub)
                        .collection('editions')
                        .doc(currentEdition)
                        .collection('users')
                        .get();

                    console.log('🔧 AdminManager: Found users in new structure:', usersSnapshot.size);

                    usersSnapshot.forEach(doc => {
                        users.push({
                            id: doc.id,
                            ...doc.data()
                        });
                    });
                } catch (error) {
                    console.error('🔧 AdminManager: Error loading users from new structure:', error);
                }
            }

            // Only use new multi-club structure
            if (users.length === 0) {
                console.log('🔧 AdminManager: No users found in new structure');
            }

            console.log('🔧 AdminManager: Total users loaded:', users.length);

            adminContent.innerHTML = `
                <div class="admin-section">
                    <div class="admin-section-header">
                        <h3>User Management</h3>
                        <button class="btn btn-primary" onclick="window.adminManager.exportUsers()">
                            <i class="fas fa-download"></i> Export Users
                        </button>
                    </div>
                    
                    <div class="admin-stats">
                        <div class="stat-card">
                            <div class="stat-number">${users.length}</div>
                            <div class="stat-label">Total Users</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${users.filter(u => u.lives > 0).length}</div>
                            <div class="stat-label">Active Players</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${users.filter(u => u.lives <= 0).length}</div>
                            <div class="stat-label">Eliminated</div>
                        </div>
                    </div>
                    
                    <div class="users-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Lives</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${users.map(user => `
                                    <tr>
                                        <td>${user.displayName}</td>
                                        <td>${user.email}</td>
                                        <td>${user.lives}</td>
                                        <td>
                                            <span class="badge ${user.lives > 0 ? 'success' : 'danger'}">
                                                ${user.lives > 0 ? 'Active' : 'Eliminated'}
                                            </span>
                                        </td>
                                        <td>
                                            <button class="btn btn-sm btn-secondary" onclick="window.adminManager.resetUserLives('${user.id}')">
                                                Reset Lives
                                            </button>
                                            <button class="btn btn-sm btn-danger" onclick="window.adminManager.deleteUser('${user.id}')">
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('Error loading users content:', error);
            adminContent.innerHTML = '<p>Error loading users</p>';
        }
    }

    async loadFixturesContent() {
        const adminContent = document.getElementById('adminContent');
        if (!adminContent) return;

        try {
            console.log('🔧 AdminManager: Loading fixtures content...');

            // Get current club and edition from ClubService
            const currentClub = window.losApp?.managers?.club?.currentClub;
            const currentEdition = window.losApp?.managers?.club?.currentEdition;

            console.log('🔧 AdminManager: Current club:', currentClub);
            console.log('🔧 AdminManager: Current edition:', currentEdition);

            adminContent.innerHTML = `
                <div class="admin-section">
                    <div class="admin-section-header">
                        <h3>Fixture Management</h3>
                        <div class="admin-actions">
                            <button class="btn btn-primary" onclick="window.adminManager.showFixtureImport()">
                                <i class="fas fa-download"></i> Import from API
                            </button>
                            <button class="btn btn-secondary" onclick="window.adminManager.showFixtureManagement()">
                                <i class="fas fa-cog"></i> Advanced Management
                            </button>
                        </div>
                    </div>
                    
                    <div class="fixture-controls" style="display: block !important; visibility: visible !important; opacity: 1 !important;">
                        <div class="control-group" style="display: inline-block !important;">
                            <label for="fixtureClubSelect">Select Club:</label>
                            <select id="fixtureClubSelect" onchange="window.adminManager.onFixtureClubChange()" style="display: block !important;">
                                <option value="">Choose a club...</option>
                            </select>
                        </div>
                        <div class="control-group" style="display: inline-block !important;">
                            <label for="fixtureEditionSelect">Select Edition:</label>
                            <select id="fixtureEditionSelect" onchange="window.adminManager.onFixtureEditionChange()" style="display: block !important;">
                                <option value="">Choose an edition...</option>
                            </select>
                        </div>
                        <div class="control-group" style="display: inline-block !important;">
                            <label for="fixtureGameweekSelect">Gameweek:</label>
                            <select id="fixtureGameweekSelect" onchange="window.adminManager.onFixtureGameweekChange()" style="display: block !important;">
                                <option value="">All Gameweeks</option>
                                <option value="1">Game Week 1</option>
                                <option value="2">Game Week 2</option>
                                <option value="3">Game Week 3</option>
                                <option value="4">Game Week 4</option>
                                <option value="5">Game Week 5</option>
                                <option value="6">Game Week 6</option>
                                <option value="7">Game Week 7</option>
                                <option value="8">Game Week 8</option>
                                <option value="9">Game Week 9</option>
                                <option value="10">Game Week 10</option>
                            </select>
                        </div>
                        <div class="control-group" style="display: inline-block !important;">
                            <button class="btn btn-primary" onclick="window.adminManager.loadFixturesForDisplay()" style="display: inline-block !important;">
                                <i class="fas fa-search"></i> Load Fixtures
                            </button>
                        </div>
                    </div>
                    
                    <div class="fixtures-display">
                        <div id="adminFixturesList" class="fixtures-list">
                            <div class="empty-state">
                                <i class="fas fa-calendar-alt"></i>
                                <h4>No Fixtures Loaded</h4>
                                <p>Select a club, edition, and gameweek to view fixtures</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            console.log('🔧 AdminManager: Fixtures content HTML set, populating club dropdown...');
            console.log('🔧 AdminManager: fixtureClubSelect element exists after setting HTML:', !!document.getElementById('fixtureClubSelect'));

            // Use requestAnimationFrame to ensure DOM is fully rendered
            requestAnimationFrame(async () => {
                console.log('🔧 AdminManager: requestAnimationFrame callback executing, checking element again...');
                console.log('🔧 AdminManager: fixtureClubSelect element exists in requestAnimationFrame:', !!document.getElementById('fixtureClubSelect'));
                await this.populateFixtureClubDropdown();
            });

            // Set current selections if available
            if (currentClub && currentEdition) {
                console.log('🔧 AdminManager: Setting current club and edition selections...');
                const clubSelect = document.getElementById('fixtureClubSelect');
                const editionSelect = document.getElementById('fixtureEditionSelect');
                if (clubSelect && editionSelect) {
                    clubSelect.value = currentClub;
                    await this.onFixtureClubChange();
                    editionSelect.value = currentEdition;
                    console.log('🔧 AdminManager: Current selections set successfully');
                }
            }

            console.log('🔧 AdminManager: Fixtures content loaded successfully');

        } catch (error) {
            console.error('❌ AdminManager: Error loading fixtures content:', error);
            adminContent.innerHTML = '<p>Error loading fixtures</p>';
        }
    }

    async loadScoresContent() {
        const adminContent = document.getElementById('adminContent');
        if (!adminContent) return;

        try {
            // Get current club and edition from ClubService
            const currentClub = window.losApp?.managers?.club?.currentClub;
            const currentEdition = window.losApp?.managers?.club?.currentEdition;
            const currentGameweek = window.editionService.getCurrentGameweek();

            // Check if there are already loaded scores to preserve
            const existingScoresList = document.getElementById('scoresList');
            let existingScoresContent = '';
            if (existingScoresList && existingScoresList.innerHTML && !existingScoresList.innerHTML.includes('No Scores Loaded')) {
                existingScoresContent = existingScoresList.innerHTML;
                console.log('🔧 AdminManager: Preserving existing scores content');
            }

            adminContent.innerHTML = `
                <div class="admin-section">
                    <div class="admin-section-header">
                        <h3>Score Management</h3>
                        <div class="admin-actions">
                            <button class="btn btn-primary" onclick="window.adminManager.importScoresFromAPI()">
                                <i class="fas fa-download"></i> Import from API
                            </button>
                            <button class="btn btn-secondary" onclick="window.adminManager.showScoreManagement()">
                                <i class="fas fa-cog"></i> Advanced Management
                            </button>
                        </div>
                    </div>
                    
                    <div class="score-controls" style="display: block !important; visibility: visible !important; opacity: 1 !important;">
                        <div class="control-group" style="display: inline-block !important;">
                            <label for="scoreClubSelect">Select Club:</label>
                            <select id="scoreClubSelect" onchange="window.adminManager.onScoreClubChange()" style="display: block !important;">
                                <option value="">Choose a club...</option>
                            </select>
                        </div>
                        <div class="control-group" style="display: inline-block !important;">
                            <label for="scoreEditionSelect">Select Edition:</label>
                            <select id="scoreEditionSelect" onchange="window.adminManager.onScoreEditionChange()" style="display: block !important;">
                                <option value="">Choose an edition...</option>
                            </select>
                        </div>
                        <div class="control-group" style="display: inline-block !important;">
                            <label for="scoreGameweekSelect">Gameweek:</label>
                            <select id="scoreGameweekSelect" onchange="window.adminManager.onScoreGameweekChange()" style="display: block !important;">
                                <option value="">All Gameweeks</option>
                                <option value="1">Game Week 1</option>
                                <option value="2">Game Week 2</option>
                                <option value="3">Game Week 3</option>
                                <option value="4">Game Week 4</option>
                                <option value="5">Game Week 5</option>
                                <option value="6">Game Week 6</option>
                                <option value="7">Game Week 7</option>
                                <option value="8">Game Week 8</option>
                                <option value="9">Game Week 9</option>
                                <option value="10">Game Week 10</option>
                            </select>
                        </div>
                        <div class="control-group" style="display: inline-block !important;">
                            <button class="btn btn-primary" onclick="window.adminManager.loadScoresForDisplay()" style="display: inline-block !important;">
                                <i class="fas fa-search"></i> Load Scores
                            </button>
                        </div>
                    </div>
                    
                    <div class="scores-display">
                        <div id="scoresList" class="scores-list">
                            ${existingScoresContent || `
                                <div class="empty-state">
                                    <i class="fas fa-futbol"></i>
                                    <h4>No Scores Loaded</h4>
                                    <p>Select a club, edition, and gameweek to view and update scores</p>
                                </div>
                            `}
                        </div>
                    </div>
                    
                    <!-- Debug section -->
                    <div style="margin-top: 20px; padding: 10px; background: #f0f0f0; border: 1px solid #ccc;">
                        <h4>Debug Info:</h4>
                        <p>scoreClubSelect exists: <span id="debugScoreClubSelect">Checking...</span></p>
                        <p>scoreEditionSelect exists: <span id="debugScoreEditionSelect">Checking...</span></p>
                        <p>scoreGameweekSelect exists: <span id="debugScoreGameweekSelect">Checking...</span></p>
                        <button onclick="window.adminManager.debugScoreElements()" class="btn btn-sm btn-secondary">Check Elements</button>
                    </div>
                </div>
            `;

            console.log('🔧 AdminManager: Scores content HTML set, populating club dropdown...');

            // Use requestAnimationFrame to ensure DOM is fully rendered
            requestAnimationFrame(async () => {
                console.log('🔧 AdminManager: requestAnimationFrame callback executing for scores...');
                await this.populateScoreClubDropdown();
            });

            // Set current selections if available
            if (currentClub && currentEdition) {
                console.log('🔧 AdminManager: Setting current club and edition selections for scores...');
                const clubSelect = document.getElementById('scoreClubSelect');
                const editionSelect = document.getElementById('scoreEditionSelect');
                if (clubSelect && editionSelect) {
                    clubSelect.value = currentClub;
                    await this.onScoreClubChange();
                    editionSelect.value = currentEdition;
                    // Set current gameweek as default
                    const gameweekSelect = document.getElementById('scoreGameweekSelect');
                    if (gameweekSelect) {
                        gameweekSelect.value = currentGameweek;
                    }
                    console.log('🔧 AdminManager: Current selections set successfully for scores');
                }
            }

            console.log('🔧 AdminManager: Scores content loaded successfully');

        } catch (error) {
            console.error('❌ AdminManager: Error loading scores content:', error);
            adminContent.innerHTML = '<p>Error loading scores content</p>';
        }
    }

    async loadSettingsContent() {
        const adminContent = document.getElementById('adminContent');
        if (!adminContent) return;

        try {
            const settings = window.editionService.getSettings();

            adminContent.innerHTML = `
                <div class="admin-section">
                    <div class="admin-section-header">
                        <h3>Competition Settings</h3>
                        <button class="btn btn-primary" onclick="window.adminManager.saveSettings()">
                            <i class="fas fa-save"></i> Save Settings
                        </button>
                    </div>
                    
                    <div class="settings-form">
                        <div class="form-group">
                            <label>Current Gameweek</label>
                            <input type="number" id="currentGameweek" value="${settings.active_gameweek || 1}" min="1" max="10">
                        </div>
                        
                        <div class="form-group">
                            <label>Registration Open</label>
                            <select id="registrationOpen">
                                <option value="true" ${settings.registration_open ? 'selected' : ''}>Yes</option>
                                <option value="false" ${!settings.registration_open ? 'selected' : ''}>No</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Tiebreak Enabled</label>
                            <select id="tiebreakEnabled">
                                <option value="true" ${settings.tiebreak_enabled ? 'selected' : ''}>Yes</option>
                                <option value="false" ${!settings.tiebreak_enabled ? 'selected' : ''}>No</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="admin-actions">
                        <button class="btn btn-warning" onclick="window.adminManager.processGameweek()">
                            Process Gameweek Results
                        </button>
                        <button class="btn btn-danger" onclick="window.adminManager.resetAllLives()">
                            Reset All Lives
                        </button>
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('Error loading settings content:', error);
            adminContent.innerHTML = '<p>Error loading settings</p>';
        }
    }

    // Admin action methods
    async resetUserLives(userId) {
        try {
            await window.gameLogicManager.resetUserLives(userId, 2);
            window.authManager.showSuccess('User lives reset successfully');
            this.loadUsersContent(); // Refresh the users list
        } catch (error) {
            console.error('Error resetting user lives:', error);
            window.authManager.showError('Failed to reset user lives');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
        }

        try {
            await this.db.collection('users').doc(userId).delete();
            window.authManager.showSuccess('User deleted successfully');
            this.loadUsersContent(); // Refresh the users list
        } catch (error) {
            console.error('Error deleting user:', error);
            window.authManager.showError('Failed to delete user');
        }
    }

    async updateScore(fixtureIndex) {
        try {
            const homeScore = parseInt(document.getElementById(`homeScore_${fixtureIndex}`).value);
            const awayScore = parseInt(document.getElementById(`awayScore_${fixtureIndex}`).value);

            if (isNaN(homeScore) || isNaN(awayScore)) {
                window.authManager.showError('Please enter valid scores');
                return;
            }

            await window.scoresManager.updateFixtureScore(fixtureIndex, homeScore, awayScore, 'completed');
            window.authManager.showSuccess('Score updated successfully');
        } catch (error) {
            console.error('Error updating score:', error);
            window.authManager.showError('Failed to update score');
        }
    }

    // Fixture Import Methods
    async showFixtureImport() {
        try {
            // Initialize development helper if not already done
            if (!window.developmentHelper) {
                window.developmentHelper = new DevelopmentHelper();
                window.developmentHelper.showDevModeIndicator();
            }

            // Initialize Football Web Pages API if not already done
            if (!window.footballWebPagesAPI) {
                window.footballWebPagesAPI = new window.FootballWebPagesAPI(this.db, window.editionService.getCurrentEdition());
                await window.footballWebPagesAPI.initializeConfiguration();
            }

            // Test API connection first
            const connectionTest = await window.footballWebPagesAPI.testConnection();

            if (!connectionTest.success) {
                window.authManager.showError(`API Connection Failed: ${connectionTest.message}`);
                return;
            }

            // Get available competitions
            const competitions = await window.footballWebPagesAPI.getCompetitions();

            // Show fixture import modal
            this.showFixtureImportModal(competitions);

        } catch (error) {
            console.error('Error showing fixture import:', error);
            window.authManager.showError('Failed to initialize fixture import');
        }
    }

    showFixtureImportModal(competitions) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'fixtureImportModal';

        const currentDate = new Date().toISOString().split('T')[0];
        const currentGameweek = window.editionService.getCurrentGameweek();
        const currentEdition = window.editionService.getCurrentEdition();

        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>Import Fixtures from API</h3>
                    <button class="modal-close" onclick="window.adminManager.closeFixtureImportModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="import-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="importCompetition">Competition</label>
                                <select id="importCompetition" required>
                                    <option value="">Select competition...</option>
                                    ${competitions.map(comp => `
                                        <option value="${comp.id}">${comp.name} (${comp.description})</option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="importSeason">Season</label>
                                <select id="importSeason" required>
                                    <option value="">Select season...</option>
                                    <option value="2024-25">2024-25</option>
                                    <option value="2023-24">2023-24</option>
                                    <option value="2022-23">2022-23</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="importStartDate">Start Date</label>
                                <input type="date" id="importStartDate" value="${currentDate}" required>
                            </div>
                            <div class="form-group">
                                <label for="importEndDate">End Date</label>
                                <input type="date" id="importEndDate" value="${currentDate}" required>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="importGameweek">Target Gameweek</label>
                                <input type="number" id="importGameweek" value="${currentGameweek}" min="1" max="50" required>
                            </div>
                            <div class="form-group">
                                <label for="importEdition">Target Edition</label>
                                <input type="text" id="importEdition" value="${currentEdition}" readonly>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button class="btn btn-primary" onclick="window.adminManager.fetchFixturesFromAPI()">
                                <i class="fas fa-search"></i> Fetch Fixtures
                            </button>
                            <button class="btn btn-secondary" onclick="window.adminManager.closeFixtureImportModal()">
                                Cancel
                            </button>
                        </div>
                    </div>
                    
                    <div id="fixturePreview" class="fixture-preview hidden">
                        <h4>Fixtures Found</h4>
                        <div id="fixtureList" class="fixture-list">
                            <!-- Fixtures will be loaded here -->
                        </div>
                        <div class="import-actions hidden" id="importActions">
                            <button class="btn btn-success" onclick="window.adminManager.importSelectedFixtures()">
                                <i class="fas fa-download"></i> Import Selected Fixtures
                            </button>
                            <button class="btn btn-secondary" onclick="window.adminManager.selectAllFixtures()">
                                Select All
                            </button>
                            <button class="btn btn-secondary" onclick="window.adminManager.deselectAllFixtures()">
                                Deselect All
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    closeFixtureImportModal() {
        const modal = document.getElementById('fixtureImportModal');
        if (modal) {
            modal.remove();
        }
    }

    async fetchFixturesFromAPI() {
        try {
            const competition = document.getElementById('importCompetition').value;
            const season = document.getElementById('importSeason').value;
            const startDate = document.getElementById('importStartDate').value;
            const endDate = document.getElementById('importEndDate').value;

            if (!competition || !season || !startDate || !endDate) {
                window.authManager.showError('Please fill in all required fields');
                return;
            }

            // Show loading state
            const fixtureList = document.getElementById('fixtureList');
            fixtureList.innerHTML = `
                <div class="loading-state">
                    <div class="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <p>Fetching fixtures from API...</p>
                </div>
            `;

            document.getElementById('fixturePreview').classList.remove('hidden');

            // Fetch fixtures from API
            const result = await window.footballWebPagesAPI.fetchDateRangeFixtures(
                startDate,
                endDate,
                competition,
                season
            );

            if (!result.fixtures || result.fixtures.length === 0) {
                fixtureList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <p>No fixtures found for the selected criteria</p>
                    </div>
                `;
                return;
            }

            // Display fixtures with checkboxes
            fixtureList.innerHTML = `
                <div class="fixtures-grid">
                    ${result.fixtures.map((fixture, index) => `
                        <div class="fixture-item">
                            <div class="fixture-checkbox">
                                <input type="checkbox" id="fixture_${index}" value="${index}" checked>
                                <label for="fixture_${index}"></label>
                            </div>
                            <div class="fixture-content">
                                <div class="fixture-teams">
                                    ${this.createTeamWithBadgeHTML(fixture.homeTeam, 'small', '')} vs ${this.createTeamWithBadgeHTML(fixture.awayTeam, 'small', '')}
                                </div>
                                <div class="fixture-details">
                                    <span class="fixture-date">${fixture.date}</span>
                                    <span class="fixture-time">${fixture.kickOffTime}</span>
                                    <span class="fixture-venue">${fixture.venue}</span>
                                </div>
                                <div class="fixture-status">
                                    <span class="badge ${fixture.status === 'NS' ? 'warning' : 'success'}">
                                        ${fixture.status === 'NS' ? 'Not Started' : 'Finished'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            // Show import actions
            document.getElementById('importActions').classList.remove('hidden');

            // Store fixtures for import
            window.adminManager.fetchedFixtures = result.fixtures;

            window.authManager.showSuccess(`Found ${result.fixtures.length} fixtures`);

        } catch (error) {
            console.error('Error fetching fixtures:', error);
            window.authManager.showError(`Failed to fetch fixtures: ${error.message}`);

            const fixtureList = document.getElementById('fixtureList');
            fixtureList.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error fetching fixtures: ${error.message}</p>
                </div>
            `;
        }
    }

    selectAllFixtures() {
        const checkboxes = document.querySelectorAll('#fixtureList input[type="checkbox"]');
        checkboxes.forEach(checkbox => checkbox.checked = true);
    }

    deselectAllFixtures() {
        const checkboxes = document.querySelectorAll('#fixtureList input[type="checkbox"]');
        checkboxes.forEach(checkbox => checkbox.checked = false);
    }

    async importSelectedFixtures() {
        try {
            if (!window.adminManager.fetchedFixtures) {
                window.authManager.showError('No fixtures available for import');
                return;
            }

            const selectedCheckboxes = document.querySelectorAll('#fixtureList input[type="checkbox"]:checked');
            const selectedFixtures = Array.from(selectedCheckboxes).map(checkbox =>
                window.adminManager.fetchedFixtures[parseInt(checkbox.value)]
            );

            if (selectedFixtures.length === 0) {
                window.authManager.showError('Please select at least one fixture to import');
                return;
            }

            const gameweek = document.getElementById('importGameweek').value;
            const edition = document.getElementById('importEdition').value;

            // Show loading state
            const importBtn = document.querySelector('#importActions .btn-success');
            const originalText = importBtn.innerHTML;
            importBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importing...';
            importBtn.disabled = true;

            // Import fixtures
            await window.footballWebPagesAPI.importSelectedFixtures(selectedFixtures, edition, gameweek);

            // Success
            window.authManager.showSuccess(`Successfully imported ${selectedFixtures.length} fixtures`);
            this.closeFixtureImportModal();

            // Refresh fixtures content
            this.loadFixturesContent();

        } catch (error) {
            console.error('Error importing fixtures:', error);
            window.authManager.showError(`Failed to import fixtures: ${error.message}`);

            // Reset button
            const importBtn = document.querySelector('#importActions .btn-success');
            importBtn.innerHTML = '<i class="fas fa-download"></i> Import Selected Fixtures';
            importBtn.disabled = false;
        }
    }

    async processGameweek() {
        if (!confirm('Are you sure you want to process the current gameweek results? This will update all player lives.')) {
            return;
        }

        try {
            const currentGameweek = window.editionService.getCurrentGameweek();
            await window.gameLogicManager.processGameweekResults(currentGameweek);
            window.authManager.showSuccess('Gameweek results processed successfully');
        } catch (error) {
            console.error('Error processing gameweek:', error);
            window.authManager.showError('Failed to process gameweek results');
        }
    }

    async resetAllLives() {
        if (!confirm('Are you sure you want to reset all player lives? This will give everyone 2 lives back.')) {
            return;
        }

        try {
            await window.gameLogicManager.resetAllLives(2);
            window.authManager.showSuccess('All player lives reset successfully');
        } catch (error) {
            console.error('Error resetting all lives:', error);
            window.authManager.showError('Failed to reset all lives');
        }
    }

    async saveSettings() {
        try {
            const currentGameweek = parseInt(document.getElementById('currentGameweek').value);
            const registrationOpen = document.getElementById('registrationOpen').value === 'true';
            const tiebreakEnabled = document.getElementById('tiebreakEnabled').value === 'true';

            await window.editionService.setActiveGameweek(currentGameweek.toString());

            // Update other settings
            await this.db.collection('settings').doc('currentCompetition').update({
                registration_open: registrationOpen,
                tiebreak_enabled: tiebreakEnabled,
                last_updated: firebase.firestore.FieldValue.serverTimestamp()
            });

            window.authManager.showSuccess('Settings saved successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            window.authManager.showError('Failed to save settings');
        }
    }

    async exportUsers() {
        try {
            const currentEdition = window.editionService.getCurrentEdition();

            const usersSnapshot = await this.db.collection('users')
                .where('edition', '==', currentEdition)
                .get();

            const users = [];
            usersSnapshot.forEach(doc => {
                users.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Create CSV content
            const csvContent = this.convertToCSV(users);

            // Download CSV file
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);

            window.authManager.showSuccess('Users exported successfully');
        } catch (error) {
            console.error('Error exporting users:', error);
            window.authManager.showError('Failed to export users');
        }
    }

    convertToCSV(users) {
        const headers = ['Name', 'Email', 'Lives', 'Status', 'Created At'];
        const rows = users.map(user => [
            user.displayName,
            user.email,
            user.lives,
            user.lives > 0 ? 'Active' : 'Eliminated',
            user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString() : 'N/A'
        ]);

        return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }

    // Fixture Management Methods
    async populateFixtureClubDropdown() {
        try {
            console.log('🔧 AdminManager: populateFixtureClubDropdown called');

            const clubSelect = document.getElementById('fixtureClubSelect');
            if (!clubSelect) {
                console.log('❌ AdminManager: fixtureClubSelect element not found in populateFixtureClubDropdown');
                return;
            }

            // Get available clubs from ClubService
            const availableClubs = window.losApp?.managers?.club?.clubs || [];
            console.log('🔧 AdminManager: Available clubs:', availableClubs);

            // Clear existing options
            clubSelect.innerHTML = '<option value="">Choose a club...</option>';

            // Add club options
            availableClubs.forEach(club => {
                const option = document.createElement('option');
                option.value = club.id;
                option.textContent = club.name;
                clubSelect.appendChild(option);
            });

            console.log('🔧 AdminManager: Club dropdown populated successfully');

        } catch (error) {
            console.error('❌ AdminManager: Error populating fixture club dropdown:', error);
        }
    }

    async onFixtureClubChange() {
        try {
            const clubSelect = document.getElementById('fixtureClubSelect');
            const editionSelect = document.getElementById('fixtureEditionSelect');

            if (!clubSelect || !editionSelect) {
                console.log('❌ AdminManager: Required elements not found in onFixtureClubChange');
                return;
            }

            const selectedClub = clubSelect.value;
            console.log('🔧 AdminManager: Fixture club changed to:', selectedClub);

            if (!selectedClub) {
                editionSelect.innerHTML = '<option value="">Choose an edition...</option>';
                return;
            }

            // Get editions for the selected club
            const editions = await window.losApp?.managers?.club?.getActiveEditions(selectedClub) || [];
            console.log('🔧 AdminManager: Editions for club:', editions);

            // Clear existing options
            editionSelect.innerHTML = '<option value="">Choose an edition...</option>';

            // Add edition options
            editions.forEach(edition => {
                const option = document.createElement('option');
                option.value = edition.id;
                option.textContent = edition.name;
                editionSelect.appendChild(option);
            });

            console.log('🔧 AdminManager: Fixture edition dropdown populated successfully');

        } catch (error) {
            console.error('❌ AdminManager: Error in onFixtureClubChange:', error);
        }
    }

    onFixtureEditionChange() {
        // This method can be used for additional logic when edition changes
        console.log('Fixture edition changed');
    }

    onFixtureGameweekChange() {
        // This method can be used for additional logic when gameweek changes
        console.log('Fixture gameweek changed');
    }

    async loadFixturesForDisplay() {
        try {
            const clubSelect = document.getElementById('fixtureClubSelect');
            const editionSelect = document.getElementById('fixtureEditionSelect');
            const gameweekSelect = document.getElementById('fixtureGameweekSelect');
            const fixturesList = document.getElementById('adminFixturesList');

            if (!clubSelect || !editionSelect || !gameweekSelect || !fixturesList) {
                console.log('❌ AdminManager: Required elements not found in loadFixturesForDisplay');
                return;
            }

            const selectedClub = clubSelect.value;
            const selectedEdition = editionSelect.value;
            const selectedGameweek = gameweekSelect.value;

            if (!selectedClub || !selectedEdition) {
                window.authManager.showError('Please select both a club and edition');
                return;
            }

            console.log('🔧 AdminManager: Loading fixtures for:', { selectedClub, selectedEdition, selectedGameweek });

            // Check database reference and try to restore if needed
            if (!this.db) {
                console.log('🔧 AdminManager: Database reference not available, attempting to restore...');
                this.restoreFirebaseConnection();

                // If still not available, try manual refresh
                if (!this.db) {
                    this.refreshDatabaseReference();
                }

                // Final check
                if (!this.db) {
                    console.error('❌ AdminManager: Database reference still not available after restore attempts');
                    const adminFixturesList = document.getElementById('adminFixturesList');
                    if (adminFixturesList) {
                        adminFixturesList.innerHTML = '<p>Error: Database not available. Please refresh the page.</p>';
                    }
                    return;
                }
            }

            console.log('🔧 AdminManager: Database reference available:', !!this.db);

            // Show loading state
            const adminFixturesList = document.getElementById('adminFixturesList');
            if (adminFixturesList) {
                adminFixturesList.innerHTML = `
                    <div class="empty-state">
                        <div class="loading-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        <h4>Loading fixtures...</h4>
                    </div>
                `;
            }

            // Load fixtures for the selected parameters
            let fixtures = [];

            if (selectedGameweek) {
                // Load specific gameweek - query individual fixtures where gameWeek matches
                const fixturesSnapshot = await this.db.collection('clubs')
                    .doc(selectedClub)
                    .collection('editions')
                    .doc(selectedEdition)
                    .collection('fixtures')
                    .where('gameWeek', '==', parseInt(selectedGameweek))
                    .get();

                fixturesSnapshot.forEach(doc => {
                    const fixtureData = doc.data();
                    fixtures.push({
                        ...fixtureData,
                        id: doc.id,
                        gameweek: fixtureData.gameWeek || selectedGameweek
                    });
                });
            } else {
                // Load all gameweeks for the edition
                const fixturesSnapshot = await this.db.collection('clubs')
                    .doc(selectedClub)
                    .collection('editions')
                    .doc(selectedEdition)
                    .collection('fixtures')
                    .get();

                fixturesSnapshot.forEach(doc => {
                    const fixtureData = doc.data();
                    fixtures.push({
                        ...fixtureData,
                        id: doc.id,
                        gameweek: fixtureData.gameWeek || 'Unknown'
                    });
                });
            }

            if (fixtures.length === 0) {
                const adminFixturesList = document.getElementById('adminFixturesList');
                if (adminFixturesList) {
                    adminFixturesList.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-calendar-alt"></i>
                            <h4>No Fixtures Found</h4>
                            <p>No fixtures found for the selected criteria</p>
                        </div>
                    `;
                }
                return;
            }

            // Store fixtures in memory for editing
            this.currentEditingFixtures = fixtures;
            this.currentEditingEdition = selectedEdition;
            this.currentEditingGameweek = selectedGameweek;
            this.currentEditingClub = selectedClub;

            // Display fixtures
            console.log('🔧 AdminManager: About to display fixtures:', fixtures);
            console.log('🔧 AdminManager: adminFixturesList element:', document.getElementById('adminFixturesList'));
            this.displayFixturesList(fixtures);

        } catch (error) {
            console.error('❌ AdminManager: Error loading fixtures for display:', error);
            window.authManager.showError('Failed to load fixtures');
        }
    }

    async displayFixturesList(fixtures) {
        const fixturesList = document.getElementById('adminFixturesList');

        console.log('🔧 AdminManager: displayFixturesList called with', fixtures.length, 'fixtures');

        if (!fixturesList) {
            console.error('❌ AdminManager: adminFixturesList element not found!');
            return;
        }

        if (fixtures.length === 0) {
            fixturesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-alt"></i>
                    <h4>No Fixtures Found</h4>
                    <p>No fixtures match the selected criteria.</p>
                </div>
            `;
            return;
        }

        // Use performance-optimized rendering
        await this.renderAdminFixturesOptimized(fixturesList, fixtures);
    }

    async renderAdminFixturesOptimized(container, fixtures) {
        const startTime = performance.now();

        // Clear container
        container.innerHTML = '';

        // Create header first
        const headerHTML = `
            <div class="fixtures-header">
                <h4>Found ${fixtures.length} Fixtures</h4>
                <div class="fixtures-actions">
                    <button class="btn btn-sm btn-secondary" onclick="window.adminManager.exportFixtures()">
                        <i class="fas fa-download"></i> Export CSV
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="window.adminManager.exportFixturesJSON()">
                        <i class="fas fa-code"></i> Export JSON
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = headerHTML;

        // Create fixtures grid container
        const fixturesGrid = document.createElement('div');
        fixturesGrid.className = 'fixtures-grid';
        container.appendChild(fixturesGrid);

        // Process fixtures in batches to avoid long tasks
        const batchSize = 3; // Smaller batches for admin fixtures (they're more complex)
        const totalFixtures = fixtures.length;

        for (let i = 0; i < totalFixtures; i += batchSize) {
            const batch = fixtures.slice(i, i + batchSize);

            // Process batch
            const batchHTML = batch.map(fixture => this.createAdminFixtureHTML(fixture)).join('');
            fixturesGrid.insertAdjacentHTML('beforeend', batchHTML);

            // Yield control to browser between batches
            if (i + batchSize < totalFixtures) {
                await new Promise(resolve => requestAnimationFrame(resolve));
            }
        }

        const endTime = performance.now();
        console.log(`🚀 AdminManager: Rendered ${totalFixtures} admin fixtures in ${Math.round(endTime - startTime)}ms`);
    }

    createAdminFixtureHTML(fixture) {
        // Handle different date field names with UK format (DD/MM/YY)
        let dateStr = 'No date';
        if (fixture.date) {
            try {
                const date = new Date(fixture.date);
                dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
            } catch (e) {
                dateStr = fixture.date.toString();
            }
        } else if (fixture.fixtureDate) {
            try {
                const date = new Date(fixture.fixtureDate);
                dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
            } catch (e) {
                dateStr = fixture.fixtureDate.toString();
            }
        } else if (fixture.scheduledDate) {
            try {
                const date = new Date(fixture.scheduledDate);
                dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
            } catch (e) {
                dateStr = fixture.scheduledDate.toString();
            }
        }

        const status = fixture.status || 'scheduled';
        const score = fixture.homeScore !== null && fixture.awayScore !== null
            ? `${fixture.homeScore} - ${fixture.awayScore}`
            : 'TBD';
        const gameweek = fixture.gameweek || 'Unknown';

        return `
            <div class="fixture-card">
                <div class="fixture-header">
                    <span class="fixture-date">${dateStr}</span>
                    <span class="fixture-status status-${status}">${status}</span>
                </div>
                <div class="fixture-teams">
                    <div class="team home-team">
                        <span class="team-name">${fixture.homeTeam || 'TBD'}</span>
                        <span class="team-score">${fixture.homeScore !== null ? fixture.homeScore : '-'}</span>
                    </div>
                    <div class="vs">vs</div>
                    <div class="team away-team">
                        <span class="team-name">${fixture.awayTeam || 'TBD'}</span>
                        <span class="team-score">${fixture.awayScore !== null ? fixture.awayScore : '-'}</span>
                    </div>
                </div>
                <div class="fixture-meta">
                    <span class="gameweek">GW ${gameweek}</span>
                    <span class="fixture-id">ID: ${fixture.fixtureId || 'N/A'}</span>
                </div>
            </div>
        `;
    }

    async populateScoreClubDropdown() {
        try {
            console.log('🔧 AdminManager: populateScoreClubDropdown called');

            const clubSelect = document.getElementById('scoreClubSelect');
            if (!clubSelect) {
                console.log('❌ AdminManager: scoreClubSelect element not found in populateScoreClubDropdown');
                return;
            }

            // Get available clubs from ClubService
            const availableClubs = window.losApp?.managers?.club?.clubs || [];
            console.log('🔧 AdminManager: Available clubs for scores:', availableClubs);

            // Clear existing options
            clubSelect.innerHTML = '<option value="">Choose a club...</option>';

            // Add club options
            availableClubs.forEach(club => {
                const option = document.createElement('option');
                option.value = club.id;
                option.textContent = club.name;
                clubSelect.appendChild(option);
            });

            console.log('🔧 AdminManager: Score club dropdown populated successfully');

        } catch (error) {
            console.error('❌ AdminManager: Error populating score club dropdown:', error);
        }
    }

    async onScoreClubChange() {
        try {
            const clubSelect = document.getElementById('scoreClubSelect');
            const editionSelect = document.getElementById('scoreEditionSelect');

            if (!clubSelect || !editionSelect) {
                console.log('❌ AdminManager: Required elements not found in onScoreClubChange');
                return;
            }

            const selectedClub = clubSelect.value;
            console.log('🔧 AdminManager: Score club changed to:', selectedClub);

            if (!selectedClub) {
                editionSelect.innerHTML = '<option value="">Choose an edition...</option>';
                return;
            }

            // Get editions for the selected club
            const editions = await window.losApp?.managers?.club?.getActiveEditions(selectedClub) || [];
            console.log('🔧 AdminManager: Editions for club:', editions);

            // Clear existing options
            editionSelect.innerHTML = '<option value="">Choose an edition...</option>';

            // Add edition options
            editions.forEach(edition => {
                const option = document.createElement('option');
                option.value = edition.id;
                option.textContent = edition.name;
                editionSelect.appendChild(option);
            });

            console.log('🔧 AdminManager: Score edition dropdown populated successfully');

        } catch (error) {
            console.error('❌ AdminManager: Error in onScoreClubChange:', error);
        }
    }

    async onScoreEditionChange() {
        try {
            const editionSelect = document.getElementById('scoreEditionSelect');
            const gameweekSelect = document.getElementById('scoreGameweekSelect');

            if (!editionSelect || !gameweekSelect) {
                console.log('❌ AdminManager: Required elements not found in onScoreEditionChange');
                return;
            }

            const selectedEdition = editionSelect.value;
            console.log('🔧 AdminManager: Score edition changed to:', selectedEdition);

            if (!selectedEdition) {
                gameweekSelect.innerHTML = '<option value="">All Gameweeks</option>';
                return;
            }

            // Get total gameweeks for the selected edition (default to 10 if not available)
            const totalGameweeks = 10; // Default value, can be enhanced later

            // Clear existing options
            gameweekSelect.innerHTML = '<option value="">All Gameweeks</option>';

            // Add gameweek options
            for (let i = 1; i <= totalGameweeks; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `Game Week ${i}`;
                gameweekSelect.appendChild(option);
            }

            console.log('🔧 AdminManager: Score gameweek dropdown populated successfully');

        } catch (error) {
            console.error('❌ AdminManager: Error in onScoreEditionChange:', error);
        }
    }

    async onScoreGameweekChange() {
        try {
            const gameweekSelect = document.getElementById('scoreGameweekSelect');
            const selectedGameweek = gameweekSelect.value;
            console.log('🔧 AdminManager: Score gameweek changed to:', selectedGameweek);

            // Optionally auto-load scores when gameweek changes
            if (selectedGameweek) {
                // await this.loadScoresForDisplay();
            }

        } catch (error) {
            console.error('❌ AdminManager: Error in onScoreGameweekChange:', error);
        }
    }

    async loadScoresForDisplay() {
        try {
            const clubSelect = document.getElementById('scoreClubSelect');
            const editionSelect = document.getElementById('scoreEditionSelect');
            const gameweekSelect = document.getElementById('scoreGameweekSelect');
            const scoresList = document.getElementById('scoresList');

            if (!clubSelect || !editionSelect || !gameweekSelect || !scoresList) {
                console.log('❌ AdminManager: Required elements not found in loadScoresForDisplay');
                return;
            }

            const selectedClub = clubSelect.value;
            const selectedEdition = editionSelect.value;
            const selectedGameweek = gameweekSelect.value;

            if (!selectedClub || !selectedEdition) {
                window.authManager.showError('Please select both a club and edition');
                return;
            }

            console.log('🔧 AdminManager: Loading scores for:', { selectedClub, selectedEdition, selectedGameweek });

            // Check database reference and try to restore if needed
            if (!this.db) {
                console.log('🔧 AdminManager: Database reference not available in loadScoresForDisplay, attempting to restore...');
                this.restoreFirebaseConnection();

                // If still not available, try manual refresh
                if (!this.db) {
                    this.refreshDatabaseReference();
                }

                // Final check
                if (!this.db) {
                    console.error('❌ AdminManager: Database reference still not available after restore attempts');
                    scoresList.innerHTML = '<p>Error: Database not available. Please refresh the page.</p>';
                    return;
                }
            }

            // Test database connection with a simple query
            try {
                console.log('🔍 AdminManager: Testing database connection...');
                const testQuery = await this.db.collection('clubs').limit(1).get();
                console.log('✅ AdminManager: Database connection test successful, found', testQuery.size, 'clubs');
            } catch (dbError) {
                console.error('❌ AdminManager: Database connection test failed:', dbError);
                scoresList.innerHTML = '<p>Error: Database connection failed. Please refresh the page.</p>';
                return;
            }

            // Show loading state
            scoresList.innerHTML = `
                <div class="empty-state">
                    <div class="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <h4>Loading scores...</h4>
                </div>
            `;

            // Load fixtures for the selected parameters
            let fixtures = [];

            console.log('🔍 AdminManager: Querying database path:', `clubs/${selectedClub}/editions/${selectedEdition}/fixtures`);

            if (selectedGameweek) {
                // Load specific gameweek - query individual fixtures where gameWeek matches
                console.log('🔍 AdminManager: Querying for specific gameweek:', selectedGameweek);

                // First try the new structure: query by gameWeek field
                let fixturesSnapshot = await this.db.collection('clubs')
                    .doc(selectedClub)
                    .collection('editions')
                    .doc(selectedEdition)
                    .collection('fixtures')
                    .where('gameWeek', '==', parseInt(selectedGameweek))
                    .get();

                console.log('🔍 AdminManager: Query by gameWeek field returned:', fixturesSnapshot.size, 'documents');

                // If no results, try the old structure: query by document ID containing gameweek
                if (fixturesSnapshot.empty) {
                    console.log('🔍 AdminManager: No results by gameWeek field, trying document ID pattern...');
                    fixturesSnapshot = await this.db.collection('clubs')
                        .doc(selectedClub)
                        .collection('editions')
                        .doc(selectedEdition)
                        .collection('fixtures')
                        .where('__name__', '>=', `gw${selectedGameweek}`)
                        .where('__name__', '<=', `gw${selectedGameweek}\uf8ff`)
                        .get();

                    console.log('🔍 AdminManager: Query by document ID pattern returned:', fixturesSnapshot.size, 'documents');
                }

                fixturesSnapshot.forEach(doc => {
                    const fixtureData = doc.data();
                    console.log('🔍 AdminManager: Processing fixture document:', doc.id, fixtureData);

                    if (fixtureData.fixtures && Array.isArray(fixtureData.fixtures)) {
                        // New structure: fixtures array within document
                        fixtureData.fixtures.forEach(fixture => {
                            fixtures.push({
                                ...fixture,
                                id: doc.id,
                                gameweek: fixture.gameWeek || selectedGameweek
                            });
                        });
                    } else {
                        // Old structure: single fixture data
                        fixtures.push({
                            ...fixtureData,
                            id: doc.id,
                            gameweek: fixtureData.gameWeek || selectedGameweek
                        });
                    }
                });
            } else {
                // Load all gameweeks for the edition
                console.log('🔍 AdminManager: Querying for all gameweeks');
                const fixturesSnapshot = await this.db.collection('clubs')
                    .doc(selectedClub)
                    .collection('editions')
                    .doc(selectedEdition)
                    .collection('fixtures')
                    .get();

                console.log('🔍 AdminManager: All fixtures query returned:', fixturesSnapshot.size, 'documents');

                fixturesSnapshot.forEach(doc => {
                    const fixtureData = doc.data();
                    console.log('🔍 AdminManager: Processing fixture document:', doc.id, fixtureData);

                    if (fixtureData.fixtures && Array.isArray(fixtureData.fixtures)) {
                        // New structure: fixtures array within document
                        fixtureData.fixtures.forEach(fixture => {
                            fixtures.push({
                                ...fixture,
                                id: doc.id,
                                gameweek: fixture.gameWeek || 'Unknown'
                            });
                        });
                    } else {
                        // Old structure: single fixture data
                        fixtures.push({
                            ...fixtureData,
                            id: doc.id,
                            gameweek: fixtureData.gameWeek || 'Unknown'
                        });
                    }
                });
            }

            console.log('🔍 AdminManager: Final fixtures array:', fixtures);
            console.log('🔍 AdminManager: Fixtures count:', fixtures.length);

            if (fixtures.length === 0) {
                console.log('🔍 AdminManager: No fixtures found, showing empty state');
                scoresList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-futbol"></i>
                        <h4>No Fixtures Found</h4>
                        <p>No fixtures found for the selected criteria</p>
                        <div class="debug-info">
                            <p><strong>Debug Info:</strong></p>
                            <p>Club: ${selectedClub}</p>
                            <p>Edition: ${selectedEdition}</p>
                            <p>Gameweek: ${selectedGameweek || 'All'}</p>
                            <p>Database Path: clubs/${selectedClub}/editions/${selectedEdition}/fixtures</p>
                        </div>
                    </div>
                `;
                return;
            }

            // Store fixtures in memory for editing
            this.currentEditingFixtures = fixtures;
            this.currentEditingEdition = selectedEdition;
            this.currentEditingGameweek = selectedGameweek;
            this.currentEditingClub = selectedClub;

            // Display fixtures with score editing capabilities
            const scoresHTML = `
                <div class="scores-admin-container">
                    <div class="scores-header">
                        <h4>${selectedGameweek ? `Gameweek ${selectedGameweek}` : 'All Gameweeks'} - ${fixtures.length} Fixtures</h4>
                        <div class="scores-actions">
                            <button class="btn btn-success" onclick="window.adminManager.bulkUpdateScores()">
                                <i class="fas fa-save"></i> Save All Changes
                            </button>
                            <button class="btn btn-warning" onclick="window.adminManager.resetScores()">
                                <i class="fas fa-undo"></i> Reset Changes
                            </button>
                        </div>
                    </div>
                    
                    <div class="scores-list">
                        ${fixtures.map((fixture, index) => `
                            <div class="score-admin-card" data-fixture-index="${index}">
                                <div class="score-info">
                                    <div class="score-teams">
                                        ${this.createTeamWithBadgeHTML(fixture.homeTeam, 'small', 'team-name')}
                                        <span class="vs">vs</span>
                                        ${this.createTeamWithBadgeHTML(fixture.awayTeam, 'small', 'team-name')}
                                    </div>
                                    <div class="score-details">
                                        <span class="gameweek-badge">GW${fixture.gameweek || selectedGameweek}</span>
                                        <span class="match-date">${fixture.date || 'TBD'}</span>
                                        <span class="match-time">${fixture.kickOffTime || 'TBD'}</span>
                                    </div>
                                </div>
                                <div class="score-input">
                                    <input type="number" 
                                           id="homeScore_${index}" 
                                           class="score-input-field" 
                                           value="${fixture.homeScore !== null ? fixture.homeScore : ''}" 
                                           placeholder="0"
                                           min="0">
                                    <span class="score-separator">-</span>
                                    <input type="number" 
                                           id="awayScore_${index}" 
                                           class="score-input-field" 
                                           value="${fixture.awayScore !== null ? fixture.awayScore : ''}" 
                                           placeholder="0"
                                           min="0">
                                </div>
                                <div class="score-status">
                                    <select id="status_${index}" class="status-select">
                                        <option value="scheduled" ${fixture.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
                                        <option value="live" ${fixture.status === 'live' ? 'selected' : ''}>Live</option>
                                        <option value="half-time" ${fixture.status === 'half-time' ? 'selected' : ''}>Half-time</option>
                                        <option value="completed" ${fixture.status === 'completed' ? 'selected' : ''}>Completed</option>
                                        <option value="postponed" ${fixture.status === 'postponed' ? 'selected' : ''}>Postponed</option>
                                        <option value="cancelled" ${fixture.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                    </select>
                                </div>
                                <div class="score-actions">
                                    <button class="btn btn-sm btn-primary" onclick="window.adminManager.updateSingleScore(${index})">
                                        <i class="fas fa-save"></i> Update
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            scoresList.innerHTML = scoresHTML;
            console.log('🔧 AdminManager: Scores displayed successfully');
            console.log('🔧 AdminManager: scoresList innerHTML length:', scoresList.innerHTML.length);
            console.log('🔧 AdminManager: scoresList children count:', scoresList.children.length);

            // Force a re-render by triggering a DOM update
            scoresList.style.display = 'none';
            scoresList.offsetHeight; // Force reflow
            scoresList.style.display = 'block';

            // Add a marker to verify the content was updated
            const marker = document.createElement('div');
            marker.id = 'scoresUpdatedMarker';
            marker.style.cssText = 'background: #4CAF50; color: white; padding: 5px; margin: 5px 0; border-radius: 3px; font-size: 12px;';
            marker.textContent = `✅ Scores updated at ${new Date().toLocaleTimeString()} - ${fixtures.length} fixtures loaded`;
            scoresList.appendChild(marker);

            console.log('🔧 AdminManager: Added update marker to scoresList');

        } catch (error) {
            console.error('❌ AdminManager: Error loading scores for display:', error);
            window.authManager.showError('Failed to load scores');
        }
    }

    // Team badge methods
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

        // Fallback to empty if no service available
        return '';
    }

    // Score management methods
    async updateSingleScore(fixtureIndex) {
        try {
            if (!this.currentEditingFixtures || !this.currentEditingEdition) {
                window.authManager.showError('No fixtures loaded for editing');
                return;
            }

            const fixture = this.currentEditingFixtures[fixtureIndex];
            if (!fixture) {
                window.authManager.showError('Fixture not found');
                return;
            }

            // Get updated values from form
            const homeScore = document.getElementById(`homeScore_${fixtureIndex}`).value;
            const awayScore = document.getElementById(`awayScore_${fixtureIndex}`).value;
            const status = document.getElementById(`status_${fixtureIndex}`).value;

            // Validate scores
            if (homeScore === '' || awayScore === '') {
                window.authManager.showError('Please enter both home and away scores');
                return;
            }

            const homeScoreNum = parseInt(homeScore);
            const awayScoreNum = parseInt(awayScore);

            if (homeScoreNum < 0 || awayScoreNum < 0) {
                window.authManager.showError('Scores cannot be negative');
                return;
            }

            // Update fixture data
            fixture.homeScore = homeScoreNum;
            fixture.awayScore = awayScoreNum;
            fixture.status = status;
            fixture.lastUpdated = new Date().toISOString();

            // Save to database
            const gameweek = fixture.gameweek || this.currentEditingGameweek;
            const fixturesRef = this.db.collection('clubs')
                .doc(this.currentEditingClub || 'altrincham-fc-juniors')
                .collection('editions')
                .doc(this.currentEditingEdition)
                .collection('fixtures')
                .doc(`gw${gameweek}`);

            // Get current fixtures document
            const fixturesDoc = await fixturesRef.get();
            if (fixturesDoc.exists) {
                const fixturesData = fixturesDoc.data();
                const fixtures = fixturesData.fixtures || [];

                // Find and update the specific fixture
                const fixtureToUpdate = fixtures.find(f =>
                    f.homeTeam === fixture.homeTeam &&
                    f.awayTeam === fixture.awayTeam &&
                    f.date === fixture.date
                );

                if (fixtureToUpdate) {
                    fixtureToUpdate.homeScore = fixture.homeScore;
                    fixtureToUpdate.awayScore = fixture.awayScore;
                    fixtureToUpdate.status = fixture.status;
                    fixtureToUpdate.lastUpdated = fixture.lastUpdated;

                    await fixturesRef.update({
                        fixtures: fixtures,
                        updated_at: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    window.authManager.showSuccess('Score updated successfully');
                    console.log('✅ AdminManager: Single score updated successfully');
                } else {
                    window.authManager.showError('Fixture not found in database');
                }
            } else {
                window.authManager.showError('Fixtures document not found');
            }

        } catch (error) {
            console.error('❌ AdminManager: Error updating single score:', error);
            window.authManager.showError('Failed to update score');
        }
    }

    async bulkUpdateScores() {
        try {
            if (!this.currentEditingFixtures || !this.currentEditingEdition) {
                window.authManager.showError('No fixtures loaded for editing');
                return;
            }

            const updatedFixtures = [];
            let hasChanges = false;

            // Collect all updated fixture data
            for (let i = 0; i < this.currentEditingFixtures.length; i++) {
                const fixture = this.currentEditingFixtures[i];
                const homeScore = document.getElementById(`homeScore_${i}`).value;
                const awayScore = document.getElementById(`awayScore_${i}`).value;
                const status = document.getElementById(`status_${i}`).value;

                // Check if there are changes
                if (homeScore !== (fixture.homeScore !== null ? fixture.homeScore.toString() : '') ||
                    awayScore !== (fixture.awayScore !== null ? fixture.awayScore.toString() : '') ||
                    status !== fixture.status) {

                    hasChanges = true;

                    // Validate scores
                    if (homeScore === '' || awayScore === '') {
                        window.authManager.showError(`Please enter both scores for ${fixture.homeTeam} vs ${fixture.awayTeam}`);
                        return;
                    }

                    const homeScoreNum = parseInt(homeScore);
                    const awayScoreNum = parseInt(awayScore);

                    if (homeScoreNum < 0 || awayScoreNum < 0) {
                        window.authManager.showError(`Scores cannot be negative for ${fixture.homeTeam} vs ${fixture.awayTeam}`);
                        return;
                    }

                    updatedFixtures.push({
                        ...fixture,
                        homeScore: homeScoreNum,
                        awayScore: awayScoreNum,
                        status: status,
                        lastUpdated: new Date().toISOString()
                    });
                } else {
                    updatedFixtures.push(fixture);
                }
            }

            if (!hasChanges) {
                window.authManager.showInfo('No changes to save');
                return;
            }

            // Save all changes to database
            const gameweek = this.currentEditingGameweek;
            if (gameweek) {
                // Update specific gameweek
                const fixturesRef = this.db.collection('clubs')
                    .doc(this.currentEditingClub || 'altrincham-fc-juniors')
                    .collection('editions')
                    .doc(this.currentEditingEdition)
                    .collection('fixtures')
                    .doc(`gw${gameweek}`);
                await fixturesRef.update({
                    fixtures: updatedFixtures,
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Update all gameweeks
                const fixturesSnapshot = await this.db.collection('clubs')
                    .doc(this.currentEditingClub || 'altrincham-fc-juniors')
                    .collection('editions')
                    .doc(this.currentEditingEdition)
                    .collection('fixtures')
                    .get();

                const batch = this.db.batch();
                fixturesSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.fixtures) {
                        // Find fixtures that match the updated ones
                        const updatedFixturesForGameweek = updatedFixtures.filter(fixture =>
                            data.fixtures.some(f =>
                                f.homeTeam === fixture.homeTeam &&
                                f.awayTeam === fixture.awayTeam &&
                                f.date === fixture.date
                            )
                        );

                        if (updatedFixturesForGameweek.length > 0) {
                            // Update the matching fixtures
                            const newFixtures = data.fixtures.map(fixture => {
                                const updatedFixture = updatedFixturesForGameweek.find(uf =>
                                    uf.homeTeam === fixture.homeTeam &&
                                    uf.awayTeam === fixture.awayTeam &&
                                    uf.date === fixture.date
                                );
                                return updatedFixture || fixture;
                            });

                            batch.update(doc.ref, {
                                fixtures: newFixtures,
                                updated_at: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        }
                    }
                });

                await batch.commit();
            }

            // Update local data
            this.currentEditingFixtures = updatedFixtures;

            window.authManager.showSuccess(`${updatedFixtures.length} fixtures updated successfully`);
            console.log('✅ AdminManager: Bulk scores updated successfully');

        } catch (error) {
            console.error('❌ AdminManager: Error updating bulk scores:', error);
            window.authManager.showError('Failed to update scores');
        }
    }

    async resetScores() {
        try {
            if (!this.currentEditingFixtures) {
                window.authManager.showError('No fixtures loaded for editing');
                return;
            }

            // Reload scores from database
            await this.loadScoresForDisplay();
            window.authManager.showSuccess('Scores reset to original values');

        } catch (error) {
            console.error('❌ AdminManager: Error resetting scores:', error);
            window.authManager.showError('Failed to reset scores');
        }
    }

    async importScoresFromAPI() {
        try {
            const clubSelect = document.getElementById('scoreClubSelect');
            const editionSelect = document.getElementById('scoreEditionSelect');
            const gameweekSelect = document.getElementById('scoreGameweekSelect');

            if (!clubSelect || !editionSelect || !gameweekSelect) {
                window.authManager.showError('Please select club, edition, and gameweek first');
                return;
            }

            const selectedClub = clubSelect.value;
            const selectedEdition = editionSelect.value;
            const selectedGameweek = gameweekSelect.value;

            if (!selectedClub || !selectedEdition || !selectedGameweek) {
                window.authManager.showError('Please select club, edition, and gameweek');
                return;
            }

            // Show confirmation dialog
            if (!confirm(`Import scores from Football Web Pages API for ${selectedClub} - Edition ${selectedEdition} - Gameweek ${selectedGameweek}?`)) {
                return;
            }

            window.authManager.showInfo('Importing scores from Football Web Pages API...');

            // Use the ScoresManager to import scores
            if (window.scoresManager) {
                try {
                    console.log('🔧 AdminManager: Starting score import process...');

                    // Use the new fixtures-results API method
                    console.log('🔧 AdminManager: Importing scores from fixtures-results API...');
                    const success = await window.scoresManager.importScoresFromAPI(parseInt(selectedGameweek));

                    if (success) {
                        // Reload the scores display
                        console.log('🔧 AdminManager: Reloading scores display...');
                        await this.loadScoresForDisplay();

                        window.authManager.showSuccess('Scores imported successfully from Football Web Pages API');
                        console.log('✅ AdminManager: Scores imported successfully');
                    } else {
                        window.authManager.showWarning('No scores found to import for the selected date range');
                        console.log('⚠️ AdminManager: No scores found to import');
                    }
                } catch (error) {
                    console.error('❌ AdminManager: Error during score import process:', error);
                    window.authManager.showError(`Score import failed: ${error.message}`);
                }
            } else {
                window.authManager.showError('ScoresManager not available');
            }

        } catch (error) {
            console.error('❌ AdminManager: Error importing scores from API:', error);
            window.authManager.showError('Failed to import scores from API');
        }
    }

    showScoreManagement() {
        window.authManager.showInfo('Advanced score management features coming soon!');
    }

    debugScoreElements() {
        const clubSelect = document.getElementById('scoreClubSelect');
        const editionSelect = document.getElementById('scoreEditionSelect');
        const gameweekSelect = document.getElementById('scoreGameweekSelect');

        const debugClubSelect = document.getElementById('debugScoreClubSelect');
        const debugEditionSelect = document.getElementById('debugScoreEditionSelect');
        const debugGameweekSelect = document.getElementById('debugScoreGameweekSelect');

        if (debugClubSelect) debugClubSelect.textContent = clubSelect ? 'Yes' : 'No';
        if (debugEditionSelect) debugEditionSelect.textContent = editionSelect ? 'Yes' : 'No';
        if (debugGameweekSelect) debugGameweekSelect.textContent = gameweekSelect ? 'Yes' : 'No';

        console.log('🔧 AdminManager: Score elements debug info:');
        console.log('Club Select:', clubSelect);
        console.log('Edition Select:', editionSelect);
        console.log('Gameweek Select:', gameweekSelect);
    }

    // Test method for score import - can be called from console
    async testScoreImport() {
        console.log('🧪 AdminManager: Testing score import process...');
        try {
            await this.importScoresFromAPI();
            console.log('✅ AdminManager: Test score import completed successfully');
        } catch (error) {
            console.error('❌ AdminManager: Test score import failed:', error);
        }
    }

    // Fixture management methods (restored)
    showFixtureManagement() {
        // Open the advanced fixture management modal from SuperAdminManager
        if (window.losApp?.managers?.superAdmin) {
            window.losApp.managers.superAdmin.createFixturesManagementModal();
        } else {
            alert('Advanced fixture management not available');
        }
    }

    async editFixture(fixtureId) {
        // This method can be implemented to edit individual fixtures
        console.log('Edit fixture:', fixtureId);
        alert('Edit fixture functionality coming soon');
    }

    async deleteFixture(fixtureId) {
        // This method can be implemented to delete individual fixtures
        if (confirm('Are you sure you want to delete this fixture?')) {
            console.log('Delete fixture:', fixtureId);
            alert('Delete fixture functionality coming soon');
        }
    }

    async exportFixtures() {
        // This method can be implemented to export fixtures data
        console.log('Export fixtures');
        alert('Export functionality coming soon');
    }

    debugElements() {
        console.log('🔧 AdminManager: Debug elements called');

        const clubSelect = document.getElementById('fixtureClubSelect');
        const editionSelect = document.getElementById('fixtureEditionSelect');
        const gameweekSelect = document.getElementById('fixtureGameweekSelect');

        console.log('🔧 AdminManager: fixtureClubSelect:', clubSelect);
        console.log('🔧 AdminManager: fixtureEditionSelect:', editionSelect);
        console.log('🔧 AdminManager: fixtureGameweekSelect:', gameweekSelect);

        // Update debug display
        const debugClubSelect = document.getElementById('debugClubSelect');
        const debugEditionSelect = document.getElementById('debugEditionSelect');
        const debugGameweekSelect = document.getElementById('debugGameweekSelect');

        if (debugClubSelect) debugClubSelect.textContent = clubSelect ? 'YES' : 'NO';
        if (debugEditionSelect) debugEditionSelect.textContent = editionSelect ? 'YES' : 'NO';
        if (debugGameweekSelect) debugGameweekSelect.textContent = gameweekSelect ? 'YES' : 'NO';

        // Check if elements are visible
        if (clubSelect) {
            console.log('🔧 AdminManager: clubSelect computed styles:', window.getComputedStyle(clubSelect));
            console.log('🔧 AdminManager: clubSelect offsetParent:', clubSelect.offsetParent);
            console.log('🔧 AdminManager: clubSelect getBoundingClientRect:', clubSelect.getBoundingClientRect());
        }

        // Try to manually populate dropdowns
        console.log('🔧 AdminManager: Attempting to manually populate dropdowns...');
        this.populateFixtureClubDropdown();
    }

    // Getter methods
    isUserAdmin() {
        return this.isAdmin;
    }

    getAdminPanel() {
        return this.adminPanel;
    }

    // Global debug function for admin access issues
    static debugAdminAccess() {
        console.log('🔧 AdminManager: Debug admin access called');

        if (window.adminManager) {
            console.log('🔧 AdminManager: AdminManager instance found');
            console.log('🔧 AdminManager: Current user admin status:', {
                isAdmin: window.adminManager.currentUserIsAdmin,
                isSuperAdmin: window.adminManager.currentUserIsSuperAdmin
            });

            // Force refresh admin status
            window.adminManager.forceRefreshAdminStatus();

            // Test admin button functionality
            setTimeout(() => {
                window.adminManager.testAdminButton();
            }, 1000);
        } else {
            console.log('❌ AdminManager: AdminManager instance not found');
        }

        // Check various admin status indicators
        console.log('🔧 AdminManager: Debug info:');
        console.log('- window.losApp exists:', !!window.losApp);
        console.log('- window.losApp.managers exists:', !!(window.losApp?.managers));
        console.log('- window.losApp.managers.superAdmin exists:', !!(window.losApp?.managers?.superAdmin));
        console.log('- window.losApp.managers.superAdmin.isSuperAdmin:', window.losApp?.managers?.superAdmin?.isSuperAdmin);
        console.log('- localStorage isSuperAdmin:', localStorage.getItem('isSuperAdmin'));

        // Check current user
        if (window.authManager?.getCurrentUser) {
            const user = window.authManager.getCurrentUser();
            console.log('- Current user email:', user.email);
            console.log('- Current user ID:', user.uid);
        }

        // Check admin button and panel
        const adminBtn = document.getElementById('adminBtn');
        const adminPanel = document.getElementById('adminPanel');
        console.log('- Admin button exists:', !!adminBtn);
        console.log('- Admin panel exists:', !!adminPanel);

        if (adminBtn) {
            console.log('- Admin button classes:', adminBtn.className);
            console.log('- Admin button disabled:', adminBtn.disabled);
            console.log('- Admin button pointer-events:', getComputedStyle(adminBtn).pointerEvents);
        }

        if (adminPanel) {
            console.log('- Admin panel classes:', adminPanel.className);
            console.log('- Admin panel display:', getComputedStyle(adminPanel).display);
        }
    }

    createTeamWithBadgeHTML(teamName, size = 'small', additionalClasses = '') {
        if (!teamName) {
            return '<span class="team-name">TBD</span>';
        }

        // Try to get team badge from various sources
        let badgeUrl = null;

        // Check if we have a local badge service
        if (window.getLocalTeamBadge && typeof window.getLocalTeamBadge === 'function') {
            try {
                badgeUrl = window.getLocalTeamBadge(teamName, size);
            } catch (e) {
                console.log('🔧 AdminManager: Local badge service error:', e);
            }
        }

        // Check if we have a global badge service
        if (!badgeUrl && window.teamBadgeService && typeof window.teamBadgeService.getTeamBadge === 'function') {
            try {
                badgeUrl = window.teamBadgeService.getTeamBadge(teamName, size);
            } catch (e) {
                console.log('🔧 AdminManager: Global badge service error:', e);
            }
        }

        // If no badge found, just return team name
        if (!badgeUrl) {
            return `<span class="team-name">${teamName}</span>`;
        }

        // Return team with badge
        return `
            <div class="team-with-badge ${additionalClasses}">
                <img src="${badgeUrl}" alt="${teamName}" class="team-badge team-badge-${size}" onerror="this.style.display='none'">
                <span class="team-name">${teamName}</span>
            </div>
        `;
    }

    exportFixtures() {
        if (!this.currentEditingFixtures || this.currentEditingFixtures.length === 0) {
            window.authManager.showError('No fixtures to export. Please load fixtures first.');
            return;
        }

        try {
            // Create CSV content
            const headers = ['Gameweek', 'Date', 'Time', 'Home Team', 'Away Team', 'Status', 'Home Score', 'Away Score', 'Venue'];
            const csvContent = [
                headers.join(','),
                ...this.currentEditingFixtures.map(fixture => [
                    fixture.gameweek || fixture.gameWeek || 'Unknown',
                    fixture.date || fixture.fixtureDate || 'No date',
                    fixture.time || fixture.kickOffTime || fixture.kickoffTime || fixture.startTime || 'No time',
                    fixture.homeTeam || 'TBD',
                    fixture.awayTeam || 'TBD',
                    fixture.status || 'scheduled',
                    fixture.homeScore || 'TBD',
                    fixture.awayScore || 'TBD',
                    fixture.venue || 'Unknown'
                ].map(field => `"${field}"`).join(','))
            ].join('\n');

            // Create and download CSV file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `fixtures_${this.currentEditingClub}_${this.currentEditingEdition}_GW${this.currentEditingGameweek || 'all'}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.authManager.showSuccess(`Exported ${this.currentEditingFixtures.length} fixtures to CSV`);
        } catch (error) {
            console.error('❌ AdminManager: Error exporting fixtures to CSV:', error);
            window.authManager.showError('Failed to export fixtures');
        }
    }

    exportFixturesJSON() {
        if (!this.currentEditingFixtures || this.currentEditingFixtures.length === 0) {
            window.authManager.showError('No fixtures to export. Please load fixtures first.');
            return;
        }

        try {
            // Create JSON content
            const exportData = {
                exportDate: new Date().toISOString(),
                club: this.currentEditingClub,
                edition: this.currentEditingEdition,
                gameweek: this.currentEditingGameweek,
                fixtureCount: this.currentEditingFixtures.length,
                fixtures: this.currentEditingFixtures.map(fixture => ({
                    id: fixture.id || fixture.fixtureId,
                    gameweek: fixture.gameweek || fixture.gameWeek,
                    date: fixture.date || fixture.fixtureDate,
                    time: fixture.time || fixture.kickOffTime || fixture.kickoffTime || fixture.startTime,
                    homeTeam: fixture.homeTeam,
                    awayTeam: fixture.awayTeam,
                    status: fixture.status,
                    homeScore: fixture.homeScore,
                    awayScore: fixture.awayScore,
                    venue: fixture.venue,
                    lastUpdated: fixture.lastUpdated,
                    importedAt: fixture.importedAt
                }))
            };

            // Create and download JSON file
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `fixtures_${this.currentEditingClub}_${this.currentEditingEdition}_GW${this.currentEditingGameweek || 'all'}_${new Date().toISOString().split('T')[0]}.json`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.authManager.showSuccess(`Exported ${this.currentEditingFixtures.length} fixtures to JSON`);
        } catch (error) {
            console.error('❌ AdminManager: Error exporting fixtures to JSON:', error);
            window.authManager.showError('Failed to export fixtures');
        }
    }
}

// AdminManager will be initialized by the main app
// Global debug functions for admin access issues

// Add global debug function for admin access issues
window.debugAdminAccess = () => {
    AdminManager.debugAdminAccess();
};

// Add global function to force initialize admin panel
window.forceInitAdmin = () => {
    if (window.adminManager) {
        window.adminManager.forceInitAdminPanel();
    } else {
        console.log('❌ AdminManager: AdminManager instance not found');
    }
};

// Add global function to test admin button
window.testAdminButton = () => {
    if (window.adminManager) {
        window.adminManager.testAdminButton();
    } else {
        console.log('❌ AdminManager: AdminManager instance not found');
    }
};

// Add global function to test score import
window.testScoreImport = () => {
    if (window.adminManager) {
        window.adminManager.testScoreImport();
    } else {
        console.log('❌ AdminManager: AdminManager instance not found');
    }
};

// Global debug functions available: debugAdminAccess(), forceInitAdmin(), testAdminButton(), testScoreImport(), refreshAdminDB(), fixAdminDB()

// Add global helper function to refresh admin database
window.refreshAdminDB = () => {
    console.log('🔧 Refreshing AdminManager database reference...');
    if (window.adminManager) {
        const success = window.adminManager.refreshDatabaseReference();
        console.log('🔧 AdminManager database refresh result:', success);
        return success;
    } else {
        console.error('❌ AdminManager not available');
        return false;
    }
};

// Add global helper function to fix admin database issues
window.fixAdminDB = () => {
    console.log('🔧 Fixing AdminManager database reference...');
    if (window.adminManager) {
        window.adminManager.restoreFirebaseConnection();
        if (!window.adminManager.db) {
            window.adminManager.refreshDatabaseReference();
        }
        console.log('🔧 AdminManager database reference fixed:', !!window.adminManager.db);
        return !!window.adminManager.db;
    } else {
        console.error('❌ AdminManager not available');
        return false;
    }
};
