import EmailService from '../services/EmailService.js';

export default class SuperAdminManager {

    constructor() {
        this.isInitialized = false;
        this.isSuperAdmin = false;
        this.currentUser = null;
        this.auditLogs = [];
        this.clubs = [];
        this.users = [];
        this.db = null;
        this.auditListener = null;
        this.clubsListener = null;
        this.usersListener = null;
    }

    initBasic() {
        if (this.isInitialized) return;

        // Basic initialization...
        this.setupBasicStructure();
        this.isInitialized = true;
        console.log('✅ SuperAdminManager: Basic initialization complete');
    }

    setupBasicStructure() {
        // Setting up basic structure...

        // Set up super admin dashboard toggle
        this.setupSuperAdminToggle();

        // Basic structure setup complete
    }

    setupSuperAdminToggle() {
        // Setting up super admin toggle...

        // Add super admin toggle to header if not already present
        const header = document.querySelector('.app-header');
        // Header element found

        if (header && !document.getElementById('superAdminToggle')) {
            // Creating super admin toggle button...

            const toggle = document.createElement('button');
            toggle.id = 'superAdminToggle';
            toggle.className = 'btn btn-secondary super-admin-toggle';
            toggle.innerHTML = '👑 Super Admin';
            toggle.style.display = 'none'; // Hidden by default
            toggle.addEventListener('click', () => this.toggleSuperAdminDashboard());

            // Try to insert into the admin buttons container with retry mechanism
            this.insertSuperAdminToggle(toggle);

            // Also set up a retry mechanism when app container becomes visible
            this.setupAppContainerVisibilityListener(toggle);
        } else {
            console.log('ℹ️ SuperAdminManager: Toggle button already exists or header not found');
        }
    }

    setupAppContainerVisibilityListener(toggle) {
        // If app container is hidden, wait for it to become visible
        const appContainer = document.getElementById('appContainer');
        if (appContainer && appContainer.classList.contains('hidden')) {
            console.log('🔍 SuperAdminManager: App container is hidden, setting up visibility listener');

            // Use MutationObserver to watch for class changes
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const target = mutation.target;
                        if (target.id === 'appContainer' && !target.classList.contains('hidden')) {
                            console.log('🔍 SuperAdminManager: App container became visible, retrying toggle insertion');
                            observer.disconnect(); // Stop observing
                            setTimeout(() => this.insertSuperAdminToggle(toggle), 100); // Small delay to ensure DOM is ready
                        }
                    }
                });
            });

            observer.observe(appContainer, { attributes: true, attributeFilter: ['class'] });

            // Also set a timeout as fallback
            setTimeout(() => {
                observer.disconnect();
                if (!document.getElementById('superAdminToggle')) {
                    console.log('🔍 SuperAdminManager: Fallback timeout reached, retrying toggle insertion');
                    this.insertSuperAdminToggle(toggle);
                }
            }, 2000);
        }
    }

    insertSuperAdminToggle(toggle, retryCount = 0) {
        // Wait for DOM to be ready and app container to be visible
        const appContainer = document.getElementById('appContainer');
        const authContainer = document.getElementById('authContainer');

        // If auth container is visible, we don't need to inject the toggle yet
        if (authContainer && !authContainer.classList.contains('hidden')) {
            console.log('ℹ️ SuperAdminManager: Auth container visible, pausing toggle insertion');
            return;
        }

        if (document.readyState !== 'complete' || !appContainer || appContainer.classList.contains('hidden')) {
            if (retryCount < 20) { // Reduced max retries
                setTimeout(() => this.insertSuperAdminToggle(toggle, retryCount + 1), 500); // Increased delay
                return;
            } else {
                console.log('ℹ️ SuperAdminManager: App container not ready, stopping retries until visibility change');
                return;
            }
        }

        // Try to find adminButtonsContainer first
        let adminButtonsContainer = document.getElementById('adminButtonsContainer');

        // If adminButtonsContainer doesn't exist, try to find an alternative container
        if (!adminButtonsContainer) {
            console.log('🔍 SuperAdminManager: adminButtonsContainer not found, looking for alternative container...');

            // Try to find header-content as an alternative
            const headerContent = document.querySelector('.header-content');
            if (headerContent) {
                console.log('🔍 SuperAdminManager: Found header-content, using as container');
                adminButtonsContainer = headerContent;
            } else {
                // Try to find app-header as last resort
                const appHeader = document.querySelector('.app-header');
                if (appHeader) {
                    console.log('🔍 SuperAdminManager: Found app-header, using as container');
                    adminButtonsContainer = appHeader;
                }
            }
        }

        console.log('🔍 SuperAdminManager: Admin buttons container found:', !!adminButtonsContainer, 'Retry:', retryCount);

        if (adminButtonsContainer) {
            // Insert the super admin toggle button
            adminButtonsContainer.appendChild(toggle);
            console.log('✅ SuperAdminManager: Toggle button inserted into admin buttons container');
            console.log('🔍 SuperAdminManager: Toggle element:', toggle);
            console.log('🔍 SuperAdminManager: Toggle display style:', toggle.style.display);
            console.log('🔍 SuperAdminManager: Container children count:', adminButtonsContainer.children.length);

            // If user is already confirmed as super admin, show the button immediately
            if (this.isSuperAdmin) {
                console.log('👑 SuperAdminManager: User is super admin, showing toggle button immediately');
                toggle.style.display = 'inline-block';
            }
        } else if (retryCount < 50) { // Max 50 retries (5 seconds)
            // Debug DOM state only on first few attempts
            if (retryCount < 3) {
                console.log('🔍 SuperAdminManager: Debugging DOM state...');
                console.log('🔍 SuperAdminManager: document.readyState:', document.readyState);
                console.log('🔍 SuperAdminManager: appContainer visible:', !document.getElementById('appContainer')?.classList.contains('hidden'));
                console.log('🔍 SuperAdminManager: .app-header exists:', !!document.querySelector('.app-header'));
                console.log('🔍 SuperAdminManager: .header-controls exists:', !!document.querySelector('.header-controls'));
                console.log('🔍 SuperAdminManager: All elements with "admin" in ID:', Array.from(document.querySelectorAll('[id*="admin"]')).map(el => el.id));

                // Additional debugging
                const headerControls = document.querySelector('.header-controls');
                if (headerControls) {
                    console.log('🔍 SuperAdminManager: .header-controls found, checking children...');
                    console.log('🔍 SuperAdminManager: .header-controls children:', Array.from(headerControls.children).map(el => el.id || el.className));
                    const adminContainer = headerControls.querySelector('#adminButtonsContainer');
                    console.log('🔍 SuperAdminManager: adminButtonsContainer inside header-controls:', !!adminContainer);
                } else {
                    console.log('🔍 SuperAdminManager: .header-controls not found, checking all header elements...');
                    const allHeaders = document.querySelectorAll('[class*="header"]');
                    console.log('🔍 SuperAdminManager: All header elements:', Array.from(allHeaders).map(el => el.className));

                    // Check the app-header structure
                    const appHeader = document.querySelector('.app-header');
                    if (appHeader) {
                        console.log('🔍 SuperAdminManager: app-header found, checking its children...');
                        console.log('🔍 SuperAdminManager: app-header children:', Array.from(appHeader.children).map(el => el.className));

                        // Look for header-row elements
                        const headerRows = appHeader.querySelectorAll('.header-row');
                        console.log('🔍 SuperAdminManager: header-row elements found:', headerRows.length);
                        headerRows.forEach((row, index) => {
                            console.log(`🔍 SuperAdminManager: header-row ${index}:`, row.className);
                            console.log(`🔍 SuperAdminManager: header-row ${index} children:`, Array.from(row.children).map(el => el.className));
                        });
                    }
                }
            }

            // Retry after a short delay if container not found
            console.log('⏳ SuperAdminManager: Admin buttons container not found, retrying in 100ms... (Attempt ' + (retryCount + 1) + '/50)');
            setTimeout(() => this.insertSuperAdminToggle(toggle, retryCount + 1), 100);
        } else {
            console.error('❌ SuperAdminManager: Failed to find admin buttons container after 50 attempts');
        }
    }

    setupRealtimeListeners() {
        if (!this.db || typeof this.db.collection !== 'function') {
            console.log('SuperAdminManager: Firebase not ready, retrying in 2 seconds...');
            setTimeout(() => this.setupRealtimeListeners(), 2000);
            return;
        }

        console.log('SuperAdminManager: Setting up real-time listeners...');

        // Listen for audit logs
        this.setupAuditLogListener();

        // Listen for clubs
        this.setupClubsListener();

        // Listen for users across all clubs
        this.setupUsersListener();
    }

    setupAuditLogListener() {
        if (this.auditListener) {
            this.auditListener();
        }

        this.auditListener = this.db.collection('audit-logs')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .onSnapshot((snapshot) => {
                this.auditLogs = [];
                snapshot.forEach(doc => {
                    this.auditLogs.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                this.updateAuditLogDisplay();
            }, (error) => {
                console.error('SuperAdminManager: Audit log listener error:', error);
            });
    }

    setupClubsListener() {
        if (this.clubsListener) {
            this.clubsListener();
        }

        this.clubsListener = this.db.collection('clubs')
            .onSnapshot((snapshot) => {
                this.clubs = [];
                snapshot.forEach(doc => {
                    this.clubs.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                this.updateClubsDisplay();
            }, (error) => {
                console.error('SuperAdminManager: Clubs listener error:', error);
            });
    }

    setupUsersListener() {
        if (this.usersListener) {
            this.usersListener();
        }

        // For now, we'll load users from the default club
        // In the future, we can expand this to load users from all clubs
        this.usersListener = this.db.collection('clubs').doc('default-club')
            .collection('editions').doc('default-edition')
            .collection('users')
            .onSnapshot((snapshot) => {
                this.users = [];
                snapshot.forEach(doc => {
                    this.users.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                this.updateUsersDisplay();
            }, (error) => {
                console.error('SuperAdminManager: Users listener error:', error);
            });
    }

    // Check if current user is super admin
    async checkSuperAdminStatus(userId) {
        try {
            console.log('🔍 SuperAdminManager: checkSuperAdminStatus called for user:', userId);
            console.log('🔍 SuperAdminManager: this.db exists:', !!this.db);
            console.log('🔍 SuperAdminManager: this.db.collection exists:', !!(this.db && this.db.collection));

            if (!this.db || typeof this.db.collection !== 'function') {
                console.log('❌ SuperAdminManager: Database not ready, cannot check super admin status');
                return;
            }

            // For now, hardcode super admin - in production this would come from a roles collection
            const superAdminEmails = ['adfirth@gmail.com']; // Replace with your actual email
            console.log('🔍 SuperAdminManager: Checking against super admin emails:', superAdminEmails);

            let userFound = false;
            let userData = null;

            // First, try to find user in the old users collection (for backward compatibility)
            // Commented out to prevent permission errors as we migrate to nested structure
            /* try {
                console.log('🔍 SuperAdminManager: Checking old users collection...');
                const oldUserDoc = await this.db.collection('users').doc(userId).get();
                if (oldUserDoc.exists) {
                    userData = oldUserDoc.data();
                    userFound = true;
                    console.log('🔍 SuperAdminManager: User found in old users collection');
                }
            } catch (error) {
                console.log('🔍 SuperAdminManager: Error checking old users collection:', error);
            } */

            // If not found in old collection, search in new nested structure
            if (!userFound) {
                console.log('🔍 SuperAdminManager: Searching for user across all clubs...');

                // Get global settings to find active clubs
                const globalSettings = await this.db.collection('global-settings').doc('system').get();
                const activeClubs = globalSettings.exists ? globalSettings.data().activeClubs : [];

                console.log('🔍 SuperAdminManager: Active clubs found:', activeClubs);

                // If no active clubs, try to find any clubs
                if (activeClubs.length === 0) {
                    console.log('🔍 SuperAdminManager: No active clubs found, searching all clubs...');
                    try {
                        const allClubsSnapshot = await this.db.collection('clubs').get();
                        for (const clubDoc of allClubsSnapshot.docs) {
                            if (userFound) break;

                            try {
                                const editionsSnapshot = await this.db.collection('clubs').doc(clubDoc.id)
                                    .collection('editions').get();

                                for (const editionDoc of editionsSnapshot.docs) {
                                    if (userFound) break;

                                    const userDoc = await this.db.collection('clubs').doc(clubDoc.id)
                                        .collection('editions').doc(editionDoc.id)
                                        .collection('users').doc(userId).get();

                                    if (userDoc.exists) {
                                        userData = userDoc.data();
                                        userFound = true;
                                        console.log(`🔍 SuperAdminManager: User found in club: ${clubDoc.id}, edition: ${editionDoc.id}`);
                                        break;
                                    }
                                }
                            } catch (error) {
                                console.log(`🔍 SuperAdminManager: Error searching club ${clubDoc.id}:`, error);
                            }
                        }
                    } catch (error) {
                        console.log('🔍 SuperAdminManager: Error searching all clubs:', error);
                    }
                } else {
                    // Search through all active clubs and their editions
                    for (const clubId of activeClubs) {
                        if (userFound) break;

                        try {
                            const editionsSnapshot = await this.db.collection('clubs').doc(clubId)
                                .collection('editions').get();

                            for (const editionDoc of editionsSnapshot.docs) {
                                if (userFound) break;

                                const userDoc = await this.db.collection('clubs').doc(clubId)
                                    .collection('editions').doc(editionDoc.id)
                                    .collection('users').doc(userId).get();

                                if (userDoc.exists) {
                                    userData = userDoc.data();
                                    userFound = true;
                                    console.log(`🔍 SuperAdminManager: User found in club: ${clubId}, edition: ${editionDoc.id}`);
                                    break;
                                }
                            }
                        } catch (error) {
                            console.log(`🔍 SuperAdminManager: Error searching club ${clubId}:`, error);
                        }
                    }
                }
            }

            console.log('🔍 SuperAdminManager: User document exists:', userFound);

            if (userFound && userData) {
                console.log('🔍 SuperAdminManager: User email:', userData.email);
                this.isSuperAdmin = superAdminEmails.includes(userData.email);
                console.log('🔍 SuperAdminManager: isSuperAdmin set to:', this.isSuperAdmin);

                if (this.isSuperAdmin) {
                    console.log('👑 User is Super Admin');
                    this.showSuperAdminToggle();
                    this.loadSuperAdminData();
                } else {
                    console.log('👤 User is not Super Admin');
                    this.hideSuperAdminToggle();
                }

                // Notify AdminManager to refresh admin status
                if (window.losApp?.managers?.admin) {
                    window.losApp.managers.admin.refreshAdminStatus();
                }
            } else {
                console.log('❌ SuperAdminManager: User document not found in any location');

                // Fallback: Check if user is super admin by email (for development)
                // This allows super admin access even if user document isn't migrated yet
                try {
                    const auth = window.firebaseAuth;
                    if (auth && auth.currentUser) {
                        const userEmail = auth.currentUser.email;
                        console.log('🔍 SuperAdminManager: Checking email for super admin:', userEmail);

                        if (superAdminEmails.includes(userEmail)) {
                            console.log('👑 SuperAdminManager: User is super admin by email (fallback)');
                            this.isSuperAdmin = true;
                            this.showSuperAdminToggle();
                            this.loadSuperAdminData();

                            // Notify AdminManager to refresh admin status
                            if (window.losApp?.managers?.admin) {
                                window.losApp.managers.admin.refreshAdminStatus();
                            }
                        }
                    }
                } catch (error) {
                    console.log('🔍 SuperAdminManager: Error in email fallback check:', error);
                }
            }
        } catch (error) {
            console.error('SuperAdminManager: Error checking super admin status:', error);
        }
    }

    showSuperAdminToggle() {
        const toggle = document.getElementById('superAdminToggle');
        if (toggle) {
            toggle.style.display = 'inline-block';
        }
    }

    hideSuperAdminToggle() {
        const toggle = document.getElementById('superAdminToggle');
        if (toggle) {
            toggle.style.display = 'none';
        }
    }

    toggleSuperAdminDashboard() {
        const dashboard = document.getElementById('superAdminDashboard');
        if (dashboard) {
            dashboard.style.display = dashboard.style.display === 'none' ? 'block' : 'none';
        } else {
            this.createSuperAdminDashboard();
        }
    }

    createSuperAdminDashboard() {
        // Remove existing dashboard if present
        const existingDashboard = document.getElementById('superAdminDashboard');
        if (existingDashboard) {
            existingDashboard.remove();
        }

        // Create dashboard container
        const dashboard = document.createElement('div');
        dashboard.id = 'superAdminDashboard';
        dashboard.className = 'super-admin-dashboard';
        dashboard.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            width: 400px;
            max-height: 80vh;
            background: white;
            border: 2px solid #1f2937;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            z-index: 1000;
            overflow: hidden;
            display: block;
        `;

        dashboard.innerHTML = `
            <div class="dashboard-header" style="background: #1f2937; color: white; padding: 15px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                <span>👑 Super Admin Dashboard</span>
                <button onclick="this.parentElement.parentElement.style.display='none'" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">×</button>
            </div>
            <div class="dashboard-content" style="padding: 15px; max-height: calc(80vh - 60px); overflow-y: auto;">
                <div class="dashboard-section">
                    <h4 style="margin: 0 0 10px 0; color: #1f2937;">System Overview</h4>
                    <div class="stats-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                        <div class="stat-card" style="background: #f3f4f6; padding: 10px; border-radius: 4px; text-align: center;">
                            <div class="stat-number" id="totalClubs">-</div>
                            <div class="stat-label" style="font-size: 12px; color: #6b7280;">Clubs</div>
                        </div>
                        <div class="stat-card" style="background: #f3f4f6; padding: 10px; border-radius: 4px; text-align: center;">
                            <div class="stat-number" id="totalUsers">-</div>
                            <div class="stat-label" style="font-size: 12px; color: #6b7280;">Users</div>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-section">
                    <h4 style="margin: 0 0 10px 0; color: #1f2937;">Quick Actions</h4>
                    <div class="action-buttons" style="display: flex; flex-direction: column; gap: 8px;">
                        <button onclick="window.losApp.managers.superAdmin.createNewClub()" class="btn btn-primary" style="width: 100%;">➕ Create New Club</button>
                        <button onclick="window.losApp.managers.superAdmin.viewAuditLogs()" class="btn btn-secondary" style="width: 100%;">📊 View Audit Logs</button>
                        <button onclick="window.losApp.managers.superAdmin.manageClubs()" class="btn btn-secondary" style="width: 100%;">🏟️ Manage Clubs</button>
                        <button onclick="window.losApp.managers.superAdmin.manageFixtures()" class="btn btn-secondary" style="width: 100%;">⚽ Manage Fixtures</button>
                    </div>
                </div>
                
                <div class="dashboard-section">
                    <h4 style="margin: 0 0 10px 0; color: #1f2937;">System Controls</h4>
                    <div class="system-controls" style="display: flex; flex-direction: column; gap: 10px;">
                        <div class="control-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f9fafb; border-radius: 4px;">
                            <span style="font-size: 14px;">🔌 API Pull Requests</span>
                            <label class="switch" style="position: relative; display: inline-block; width: 50px; height: 24px;">
                                <input type="checkbox" id="apiToggle" onchange="window.losApp.managers.superAdmin.toggleAPIRequests(this.checked)">
                                <span class="slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px;"></span>
                            </label>
                        </div>
                        <div class="control-status" id="apiStatus" style="font-size: 12px; color: #6b7280; text-align: center;">
                            Loading status...
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-section">
                    <h4 style="margin: 0 0 10px 0; color: #1f2937;">Recent Activity</h4>
                    <div id="recentActivity" style="font-size: 12px; color: #6b7280;">
                        Loading recent activity...
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(dashboard);
        this.updateDashboardStats();
        this.updateRecentActivity();
        this.loadAPIStatus(); // Load API status when dashboard is created
    }

    updateDashboardStats() {
        const totalClubsEl = document.getElementById('totalClubs');
        const totalUsersEl = document.getElementById('totalUsers');

        if (totalClubsEl) totalClubsEl.textContent = this.clubs.length;
        if (totalUsersEl) totalUsersEl.textContent = this.users.length;
    }

    updateRecentActivity() {
        const recentActivityEl = document.getElementById('recentActivity');
        if (!recentActivityEl) return;

        const recentLogs = this.auditLogs.slice(0, 5);
        if (recentLogs.length === 0) {
            recentActivityEl.innerHTML = '<em>No recent activity</em>';
            return;
        }

        const activityHtml = recentLogs.map(log => {
            const time = new Date(log.timestamp?.toDate() || log.timestamp).toLocaleTimeString();
            return `<div style="margin-bottom: 5px;">${time} - ${log.action}</div>`;
        }).join('');

        recentActivityEl.innerHTML = activityHtml;
    }

    updateAuditLogDisplay() {
        // Update dashboard if open
        this.updateRecentActivity();
    }

    updateClubsDisplay() {
        // Update dashboard if open
        this.updateDashboardStats();
    }

    updateUsersDisplay() {
        // Update dashboard if open
        this.updateDashboardStats();
    }

    // API Control Methods
    async loadAPIStatus() {
        try {
            if (!this.db) {
                console.log('❌ SuperAdminManager: Database not ready for API status check');
                return;
            }

            const globalSettings = await this.db.collection('global-settings').doc('system').get();
            if (globalSettings.exists) {
                const data = globalSettings.data();
                const apiEnabled = data.apiRequestsEnabled !== false; // Default to true if not set

                // Update the toggle state
                const apiToggle = document.getElementById('apiToggle');
                if (apiToggle) {
                    apiToggle.checked = apiEnabled;
                }

                // Update the status text
                const apiStatus = document.getElementById('apiStatus');
                if (apiStatus) {
                    apiStatus.textContent = apiEnabled ? '✅ API requests are enabled' : '❌ API requests are disabled';
                    apiStatus.style.color = apiEnabled ? '#059669' : '#dc3545';
                }

                console.log('✅ SuperAdminManager: API status loaded:', apiEnabled);
            } else {
                console.log('⚠️ SuperAdminManager: No global settings found, creating default...');
                await this.createDefaultGlobalSettings();
            }
        } catch (error) {
            console.error('❌ SuperAdminManager: Error loading API status:', error);
        }
    }

    async toggleAPIRequests(enabled) {
        try {
            if (!this.db) {
                console.log('❌ SuperAdminManager: Database not ready for API toggle');
                return;
            }

            console.log(`🔌 SuperAdminManager: Toggling API requests to: ${enabled}`);

            // Update global settings
            await this.db.collection('global-settings').doc('system').update({
                apiRequestsEnabled: enabled,
                updated_at: new Date()
            });

            // Update the status display
            const apiStatus = document.getElementById('apiStatus');
            if (apiStatus) {
                apiStatus.textContent = enabled ? '✅ API requests are enabled' : '❌ API requests are disabled';
                apiStatus.style.color = enabled ? '#059669' : '#dc3545';
            }

            // Log the action
            await this.logAuditEvent('SUPER_ADMIN', 'API_TOGGLE', {
                enabled: enabled,
                timestamp: new Date()
            });

            // Show confirmation toast
            this.showToast(enabled ? 'API requests enabled' : 'API requests disabled', 'success');

            console.log(`✅ SuperAdminManager: API requests ${enabled ? 'enabled' : 'disabled'} successfully`);

            // Notify other managers about the change
            this.notifyAPIToggleChange(enabled);

        } catch (error) {
            console.error('❌ SuperAdminManager: Error toggling API requests:', error);
            this.showToast('Failed to update API settings', 'error');

            // Revert the toggle state
            const apiToggle = document.getElementById('apiToggle');
            if (apiToggle) {
                apiToggle.checked = !enabled;
            }
        }
    }

    async createDefaultGlobalSettings() {
        try {
            console.log('🔧 SuperAdminManager: Creating default global settings...');

            const defaultSettings = {
                activeClubs: [],
                systemVersion: '2.0',
                apiRequestsEnabled: true, // Default to enabled
                created_at: new Date(),
                updated_at: new Date()
            };

            await this.db.collection('global-settings').doc('system').set(defaultSettings);
            console.log('✅ SuperAdminManager: Default global settings created');

            // Reload API status after creating settings
            await this.loadAPIStatus();

        } catch (error) {
            console.error('❌ SuperAdminManager: Error creating default global settings:', error);
        }
    }

    notifyAPIToggleChange(enabled) {
        // Notify other managers about the API toggle change
        if (window.losApp?.managers) {
            const managers = window.losApp.managers;

            // Notify API managers
            if (managers.footballWebPagesAPI) {
                console.log('🔌 SuperAdminManager: Notifying FootballWebPagesAPI of API toggle change');
                // You can add a method to handle this notification if needed
            }

            // Notify other relevant managers
            if (managers.fixtures) {
                console.log('🔌 SuperAdminManager: Notifying FixturesManager of API toggle change');
            }

            // Dispatch a custom event for other components to listen to
            const event = new CustomEvent('apiToggleChanged', {
                detail: { enabled: enabled }
            });
            window.dispatchEvent(event);
        }
    }

    showToast(message, type = 'info') {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 8px;
            padding: 12px 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 2000;
            border-left: 4px solid ${type === 'success' ? '#059669' : type === 'error' ? '#dc3545' : '#667eea'};
        `;

        document.body.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }

    // Create a new club
    async createNewClub() {
        // Create a modal for club creation with more detailed information
        const clubData = await this.showClubCreationModal();
        if (!clubData) return;

        try {
            console.log('🏟️ SuperAdminManager: Creating new club:', clubData);

            // Debug Firebase FieldValue availability
            console.log('🔍 SuperAdminManager Debug: window.firebase exists?', !!window.firebase);
            console.log('🔍 SuperAdminManager Debug: window.firebase.firestore exists?', !!(window.firebase && window.firebase.firestore));
            console.log('🔍 SuperAdminManager Debug: window.firebase.firestore.FieldValue exists?', !!(window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue));


            const clubId = clubData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

            const clubDataForDB = {
                clubId: clubId,
                name: clubData.name,
                description: clubData.description || `New club: ${clubData.name}`,
                isActive: true,
                primaryColor: clubData.primaryColor || '#059669',
                secondaryColor: clubData.secondaryColor || '#047857',
                headerStyle: 'default',
                contactEmail: clubData.contactEmail,
                adminName: clubData.adminName,
                website: clubData.website || null,
                logo: null,
                created_at: new Date(),
                updated_at: new Date()
            };

            // Create the club in the database
            await this.db.collection('clubs').doc(clubId).set(clubDataForDB);

            // Create default edition
            const editionData = {
                editionId: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}-default`,
                name: `${new Date().getFullYear()}-${new Date().getFullYear() + 1} Default Edition`,
                isActive: true,
                created_at: new Date(),
                updated_at: new Date()
            };

            await this.db.collection('clubs').doc(clubId)
                .collection('editions').doc(editionData.editionId).set(editionData);

            // Update global settings
            await this.db.collection('global-settings').doc('system').update({
                activeClubs: window.firebase.firestore.FieldValue.arrayUnion(clubId),
                updated_at: new Date()
            });

            // Send welcome email to the club administrator
            let emailResult = null;
            try {
                const emailService = new EmailService();
                emailResult = await emailService.sendClubWelcomeEmail({
                    name: clubData.name,
                    clubId: clubId,
                    contactEmail: clubData.contactEmail,
                    adminName: clubData.adminName,
                    website: clubData.website
                });
            } catch (emailError) {
                console.warn('⚠️ SuperAdminManager: Email sending failed:', emailError);
                // Don't fail club creation if email fails
            }

            // Log the action
            await this.logAuditEvent('SUPER_ADMIN', 'CLUB_CREATED', {
                clubId: clubId,
                clubName: clubData.name,
                adminEmail: clubData.contactEmail,
                adminName: clubData.adminName,
                emailSent: emailResult?.success || false,
                userId: this.currentUser?.uid || 'unknown'
            });

            // Show success message with email status
            this.showClubCreationSuccess(clubData.name, clubData.contactEmail, emailResult);

        } catch (error) {
            console.error('❌ SuperAdminManager: Error creating club:', error);
            this.showToast('Error creating club: ' + error.message, 'error');
        }
    }

    // Show club creation modal
    showClubCreationModal() {
        return new Promise((resolve) => {
            // Remove existing modal if present
            const existingModal = document.getElementById('clubCreationModal');
            if (existingModal) {
                existingModal.remove();
            }

            const modal = document.createElement('div');
            modal.id = 'clubCreationModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 2000;
                display: flex;
                justify-content: center;
                align-items: center;
            `;

            modal.innerHTML = `
                <div style="background: white; width: 90%; max-width: 600px; max-height: 90vh; border-radius: 8px; overflow: hidden;">
                    <div style="background: #1f2937; color: white; padding: 15px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                        <span>🏟️ Create New Club</span>
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">×</button>
                    </div>
                    <div style="padding: 20px; max-height: calc(90vh - 60px); overflow-y: auto;">
                        <form id="clubCreationForm">
                            <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Club Name *</label>
                                <input type="text" id="clubName" required style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                            </div>
                            
                            <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Description</label>
                                <textarea id="clubDescription" rows="3" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; resize: vertical;"></textarea>
                            </div>
                            
                            <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Administrator Name *</label>
                                <input type="text" id="adminName" required style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                            </div>
                            
                            <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Administrator Email *</label>
                                <input type="email" id="adminEmail" required style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                                <small style="color: #666;">A welcome email will be sent to this address with registration instructions.</small>
                            </div>
                            
                            <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Website (Optional)</label>
                                <input type="url" id="clubWebsite" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                            </div>
                            
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Primary Color</label>
                                <input type="color" id="primaryColor" value="#059669" style="width: 60px; height: 40px; border: none; border-radius: 4px;">
                            </div>
                            
                            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                                <button type="button" onclick="this.closest('#clubCreationModal').remove()" style="padding: 10px 20px; border: 1px solid #d1d5db; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
                                <button type="submit" style="padding: 10px 20px; background: #059669; color: white; border: none; border-radius: 4px; cursor: pointer;">Create Club</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Handle form submission
            const formElement = modal.querySelector('#clubCreationForm');

            formElement.addEventListener('submit', (e) => {
                e.preventDefault();

                const clubData = {
                    name: document.getElementById('clubName').value.trim(),
                    description: document.getElementById('clubDescription').value.trim(),
                    adminName: document.getElementById('adminName').value.trim(),
                    contactEmail: document.getElementById('adminEmail').value.trim(),
                    website: document.getElementById('clubWebsite').value.trim() || null,
                    primaryColor: document.getElementById('primaryColor').value
                };

                modal.remove();
                resolve(clubData);
            });
        });
    }

    // Show club creation success message
    showClubCreationSuccess(clubName, adminEmail, emailResult) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 2000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        const emailStatus = emailResult?.success ?
            `✅ Welcome email sent to ${adminEmail}` :
            `⚠️ Welcome email could not be sent to ${adminEmail}`;

        modal.innerHTML = `
            <div style="background: white; width: 90%; max-width: 500px; border-radius: 8px; overflow: hidden;">
                <div style="background: #059669; color: white; padding: 15px; font-weight: bold; text-align: center;">
                    🎉 Club Created Successfully!
                </div>
                <div style="padding: 20px;">
                    <h3 style="margin-top: 0;">🏟️ ${clubName}</h3>
                    <p>Your new club has been created successfully!</p>
                    
                    <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
                        <h4 style="margin-top: 0;">📧 Administrator Setup</h4>
                        <p><strong>Email:</strong> ${adminEmail}</p>
                        <p><strong>Status:</strong> ${emailStatus}</p>
                    </div>
                    
                    <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                        <h4 style="margin-top: 0;">🎯 Next Steps</h4>
                        <p>The administrator should:</p>
                        <ol>
                            <li>Check their email for registration instructions</li>
                            <li>Register on the LOS App platform</li>
                            <li>Select "${clubName}" as their club</li>
                            <li>Complete the setup process</li>
                        </ol>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <button onclick="this.closest('div[style*=\'position: fixed\']').remove()" style="padding: 10px 20px; background: #059669; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // View comprehensive audit logs
    async viewAuditLogs() {
        this.createAuditLogsModal();
    }

    createAuditLogsModal() {
        // Remove existing modal if present
        const existingModal = document.getElementById('auditLogsModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'auditLogsModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 2000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        modal.innerHTML = `
            <div style="background: white; width: 90%; max-width: 800px; max-height: 80vh; border-radius: 8px; overflow: hidden;">
                <div style="background: #1f2937; color: white; padding: 15px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                    <span>📊 Comprehensive Audit Logs</span>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">×</button>
                </div>
                <div style="padding: 15px; max-height: calc(80vh - 60px); overflow-y: auto;">
                    <div style="margin-bottom: 15px;">
                        <input type="text" id="auditSearch" placeholder="Search audit logs..." style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                    </div>
                    <div id="auditLogsContent" style="font-size: 12px;">
                        Loading audit logs...
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.populateAuditLogs();

        // Add search functionality
        const searchInput = document.getElementById('auditSearch');
        searchInput.addEventListener('input', (e) => this.filterAuditLogs(e.target.value));
    }

    async populateAuditLogs() {
        const contentEl = document.getElementById('auditLogsContent');
        if (!contentEl) return;

        if (this.auditLogs.length === 0) {
            contentEl.innerHTML = '<em>No audit logs found</em>';
            return;
        }

        const logsHtml = this.auditLogs.map(log => {
            const timestamp = new Date(log.timestamp?.toDate() || log.timestamp).toLocaleString();
            const userType = log.userType || 'UNKNOWN';
            const action = log.action || 'Unknown action';
            const details = log.details ? JSON.stringify(log.details, null, 2) : '';

            return `
                <div style="border: 1px solid #e5e7eb; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <strong>${timestamp}</strong>
                        <span style="background: #1f2937; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">${userType}</span>
                    </div>
                    <div style="margin-bottom: 5px;"><strong>Action:</strong> ${action}</div>
                    ${details ? `<div style="background: #f9fafb; padding: 8px; border-radius: 3px; font-family: monospace; white-space: pre-wrap;">${details}</div>` : ''}
                </div>
            `;
        }).join('');

        contentEl.innerHTML = logsHtml;
    }

    filterAuditLogs(searchTerm) {
        const contentEl = document.getElementById('auditLogsContent');
        if (!contentEl) return;

        const filteredLogs = this.auditLogs.filter(log => {
            const searchText = `${log.action} ${log.userType} ${JSON.stringify(log.details)}`.toLowerCase();
            return searchText.includes(searchTerm.toLowerCase());
        });

        if (filteredLogs.length === 0) {
            contentEl.innerHTML = '<em>No audit logs match your search</em>';
            return;
        }

        const logsHtml = filteredLogs.map(log => {
            const timestamp = new Date(log.timestamp?.toDate() || log.timestamp).toLocaleString();
            const userType = log.userType || 'UNKNOWN';
            const action = log.action || 'Unknown action';
            const details = log.details ? JSON.stringify(log.details, null, 2) : '';

            return `
                <div style="border: 1px solid #e5e7eb; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <strong>${timestamp}</strong>
                        <span style="background: #1f2937; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">${userType}</span>
                    </div>
                    <div style="margin-bottom: 5px;"><strong>Action:</strong> ${action}</div>
                    ${details ? `<div style="background: #f9fafb; padding: 8px; border-radius: 3px; font-family: monospace; white-space: pre-wrap;">${details}</div>` : ''}
                </div>
            `;
        }).join('');

        contentEl.innerHTML = logsHtml;
    }

    // Manage existing clubs
    async manageClubs() {
        this.createClubsManagementModal();
    }

    // Manage fixtures and scores
    async manageFixtures() {
        this.createFixturesManagementModal();
    }

    createClubsManagementModal() {
        // Remove existing modal if present
        const existingModal = document.getElementById('clubsManagementModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'clubsManagementModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 2000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        modal.innerHTML = `
            <div style="background: white; width: 90%; max-width: 600px; max-height: 80vh; border-radius: 8px; overflow: hidden;">
                <div style="background: #1f2937; color: white; padding: 15px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                    <span>🏟️ Manage Clubs</span>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">×</button>
                </div>
                <div style="padding: 15px; max-height: calc(80vh - 60px); overflow-y: auto;">
                    <div id="clubsList">
                        Loading clubs...
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.populateClubsList();
    }

    createFixturesManagementModal() {
        // Remove existing modal if present
        const existingModal = document.getElementById('fixturesManagementModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'fixturesManagementModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 2000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        modal.innerHTML = `
            <div style="background: white; width: 95%; max-width: 1200px; max-height: 90vh; border-radius: 8px; overflow: hidden;">
                <div style="background: #1f2937; color: white; padding: 15px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                    <span>⚽ Fixture & Scores Management</span>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">×</button>
                </div>
                <div style="padding: 20px; max-height: calc(90vh - 60px); overflow-y: auto;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <!-- Left Column: Fixture Import -->
                        <div class="fixture-import-section">
                            <h4 style="margin: 0 0 15px 0; color: #1f2937;">📥 Import Fixtures</h4>
                            <div style="background: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Select Club:</label>
                                    <select id="fixtureClubSelect" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                                        <option value="">Choose a club...</option>
                                    </select>
                                </div>
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Select Edition:</label>
                                    <select id="fixtureEditionSelect" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                                        <option value="">Choose an edition...</option>
                                    </select>
                                </div>
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Competition:</label>
                                    <select id="competition-select" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                                        <option value="">Choose a competition...</option>
                                    </select>
                                </div>
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Season (optional):</label>
                                    <input type="text" id="seasonInput" placeholder="e.g., 2024-25" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                                </div>
                                <button onclick="window.losApp.managers.superAdmin.importFixturesFromAPI()" class="btn btn-primary" style="width: 100%;">📥 Import Fixtures</button>
                            </div>
                        </div>

                        <!-- Right Column: Score Updates -->
                        <div class="score-updates-section">
                            <h4 style="margin: 0 0 15px 0; color: #1f2937;">📊 Update Scores</h4>
                            <div style="background: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Select Club:</label>
                                    <select id="scoreClubSelect" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                                        <option value="">Choose a club...</option>
                                    </select>
                                </div>
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Select Edition:</label>
                                    <select id="scoreEditionSelect" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                                        <option value="">Choose an edition...</option>
                                    </select>
                                </div>
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Game Week:</label>
                                    <select id="score-gameweek-select" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                                        <option value="">Choose a game week...</option>
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
                                <button onclick="window.losApp.managers.superAdmin.bulkUpdateScoresFromAPI()" class="btn btn-secondary" style="width: 100%;">🔄 Bulk Update Scores</button>
                            </div>
                        </div>
                    </div>

                    <!-- Fixtures List -->
                    <div style="margin-top: 30px;">
                        <h4 style="margin: 0 0 15px 0; color: #1f2937;">📋 Current Fixtures</h4>
                        
                        <!-- Club and Edition Selection -->
                        <div style="background: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; margin-bottom: 15px;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; align-items: end;">
                                <div>
                                    <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #374151;">Select Club:</label>
                                    <select id="currentFixturesClubSelect" onchange="window.losApp.managers.superAdmin.onCurrentFixturesClubChange()" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; background: white;">
                                        <option value="">Choose a club...</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #374151;">Select Edition:</label>
                                    <select id="currentFixturesEditionSelect" onchange="window.losApp.managers.superAdmin.onCurrentFixturesEditionChange()" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; background: white;">
                                        <option value="">Choose an edition...</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #374151;">Game Week:</label>
                                    <select id="currentFixturesGameweekSelect" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; background: white;">
                                        <option value="">All Game Weeks</option>
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
                                <div>
                                    <button onclick="window.losApp.managers.superAdmin.loadCurrentFixtures()" class="btn btn-primary" style="width: 100%; padding: 8px;">
                                        <i class="fas fa-search"></i> Load Fixtures
                                    </button>
                                </div>
                                <div>
                                    <button onclick="window.losApp.managers.superAdmin.toggleEditionStatus(document.getElementById('currentFixturesClubSelect').value, document.getElementById('currentFixturesEditionSelect').value)" class="btn btn-warning" style="width: 100%; padding: 8px;" id="toggleEditionStatusBtn">
                                        <i class="fas fa-toggle-on"></i> Toggle Edition Status
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Delete All Fixtures Option -->
                            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div style="color: #6b7280; font-size: 14px;">
                                        <i class="fas fa-exclamation-triangle" style="color: #f59e0b; margin-right: 8px;"></i>
                                        <strong>Danger Zone:</strong> This action cannot be undone
                                    </div>
                                    <button onclick="window.losApp.managers.superAdmin.deleteAllFixtures()" class="btn btn-danger" style="padding: 8px 16px; background: #dc2626; border: 1px solid #dc2626; color: white; border-radius: 4px; font-weight: bold;">
                                        <i class="fas fa-trash-alt"></i> Delete All Fixtures
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Fixtures Display -->
                        <div id="currentFixturesList" style="background: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
                            <em>Select a club and edition to view fixtures...</em>
                        </div>
                    </div>

                    <!-- Manual Score Entry -->
                    <div style="margin-top: 30px;">
                        <h4 style="margin: 0 0 15px 0; color: #1f2937;">✏️ Manual Score Entry</h4>
                        <div style="background: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr; gap: 10px; align-items: end;">
                                <div>
                                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Fixture ID:</label>
                                    <input type="text" id="manualFixtureId" placeholder="Fixture ID" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Home Score:</label>
                                    <input type="number" id="homeScore" placeholder="0" min="0" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Away Score:</label>
                                    <input type="number" id="awayScore" placeholder="0" min="0" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Status:</label>
                                    <select id="fixtureStatus" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                                        <option value="finished">Finished</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="scheduled">Scheduled</option>
                                        <option value="postponed">Postponed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div>
                                    <button onclick="window.losApp.managers.superAdmin.updateFixtureScoreManually()" class="btn btn-primary" style="width: 100%;">💾 Update Score</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.populateFixtureModalData();

        // Ensure selectors are populated immediately
        this.ensureSelectorsPopulated();
    }

    async ensureSelectorsPopulated() {
        console.log('🔧 SuperAdmin: Ensuring selectors are populated...');

        // Use ClubService to populate club dropdowns
        if (window.losApp?.managers?.club) {
            await window.losApp.managers.club.ensureSuperAdminSelectorsPopulated();
        } else {
            console.warn('⚠️ SuperAdmin: ClubService not available, using fallback method');
            await this.populateFixtureClubDropdowns();
        }
    }

    async populateFixtureModalData() {
        try {
            console.log('🔧 Populating fixture modal data...');

            // Wait for ClubService to be ready before populating dropdowns
            await this.waitForClubServiceReady();

            // Use ClubService to populate club dropdowns
            if (window.losApp?.managers?.club) {
                await window.losApp.managers.club.ensureSuperAdminSelectorsPopulated();
            } else {
                // Fallback to original method if ClubService not available
                await this.populateFixtureClubDropdowns();
            }

            // Populate competition dropdowns
            await this.populateCompetitionDropdown();

            // Populate current fixtures club and edition dropdowns
            await this.populateCurrentFixturesDropdowns();

            // Set up listeners
            this.setupFixtureModalListeners();

            console.log('✅ Fixture modal data populated successfully');
        } catch (error) {
            console.error('❌ Error populating fixture modal data:', error);
        }
    }

    async waitForClubServiceReady() {
        console.log('⏳ Waiting for ClubService to be ready...');
        let attempts = 0;
        const maxAttempts = 30; // Wait up to 60 seconds

        while (attempts < maxAttempts) {
            if (window.losApp?.managers?.club?.isReady) {
                console.log('✅ ClubService is ready');
                return;
            }

            console.log(`⏳ ClubService not ready yet, attempt ${attempts + 1}/${maxAttempts}...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
        }

        console.warn('⚠️ ClubService did not become ready within timeout');
    }

    async populateCompetitionDropdown() {
        try {
            const competitionSelect = document.getElementById('competition-select');
            if (!competitionSelect) {
                console.warn('⚠️ Competition select element not found');
                return;
            }

            // Clear existing options
            competitionSelect.innerHTML = '<option value="">Select Competition</option>';

            // Get competitions from config with fallback
            let competitions = {};
            if (window.APIConfig && window.APIConfig.competitions) {
                competitions = window.APIConfig.competitions;
            } else if (window.FOOTBALL_WEBPAGES_CONFIG && window.FOOTBALL_WEBPAGES_CONFIG.LEAGUES) {
                // Fallback to FOOTBALL_WEBPAGES_CONFIG
                competitions = window.FOOTBALL_WEBPAGES_CONFIG.LEAGUES;
            } else {
                // Hardcoded fallback
                competitions = {
                    'national-league': { id: '5', name: 'National League', description: 'English National League (5th tier)' },
                    'premier-league': { id: '1', name: 'Premier League', description: 'English Premier League (1st tier)' },
                    'championship': { id: '2', name: 'EFL Championship', description: 'English Championship (2nd tier)' },
                    'league-one': { id: '3', name: 'EFL League One', description: 'English League One (3rd tier)' },
                    'league-two': { id: '4', name: 'EFL League Two', description: 'English League Two (4th tier)' }
                };
            }

            // Add competition options
            Object.entries(competitions).forEach(([key, comp]) => {
                const option = document.createElement('option');
                option.value = comp.id;
                option.textContent = `${comp.name} (${comp.description || ''})`;
                competitionSelect.appendChild(option);
            });

            console.log(`✅ Populated competition dropdown with ${Object.keys(competitions).length} competitions`);
        } catch (error) {
            console.error('❌ Error populating competition dropdown:', error);
            // Add fallback options even if there's an error
            const competitionSelect = document.getElementById('competition-select');
            if (competitionSelect) {
                competitionSelect.innerHTML = `
                    <option value="">Select Competition</option>
                    <option value="5">National League (English National League)</option>
                    <option value="1">Premier League (English Premier League)</option>
                    <option value="2">EFL Championship (English Championship)</option>
                    <option value="3">EFL League One (English League One)</option>
                    <option value="4">EFL League Two (English League Two)</option>
                `;
            }
        }
    }


    async populateCurrentFixturesDropdowns() {
        try {
            console.log('🔧 Populating current fixtures dropdowns...');

            const clubSelect = document.getElementById('currentFixturesClubSelect');
            const editionSelect = document.getElementById('currentFixturesEditionSelect');

            if (!clubSelect || !editionSelect) {
                console.warn('⚠️ Current fixtures dropdown elements not found');
                return;
            }

            // Clear existing options
            clubSelect.innerHTML = '<option value="">Choose a club...</option>';
            editionSelect.innerHTML = '<option value="">Choose an edition...</option>';

            // Get clubs from ClubService
            if (window.losApp?.managers?.club) {
                const clubService = window.losApp.managers.club;

                // Get clubs from ClubService's clubData
                const clubs = Object.keys(clubService.clubData).map(clubId => ({
                    id: clubId,
                    ...clubService.clubData[clubId]
                }));

                console.log('🔧 Found clubs for current fixtures:', clubs.length);

                clubs.forEach(club => {
                    if (club.isActive !== false) { // Include clubs that are active or don't have isActive set
                        const option = document.createElement('option');
                        option.value = club.id;
                        option.textContent = club.name;
                        clubSelect.appendChild(option);
                    }
                });

                console.log('✅ Populated current fixtures club dropdown');
            } else {
                console.warn('⚠️ ClubService not available for populating current fixtures dropdowns');
                clubSelect.innerHTML = '<option value="">ClubService not available</option>';
            }
        } catch (error) {
            console.error('❌ Error populating current fixtures dropdowns:', error);
        }
    }

    async populateFixtureClubDropdowns() {
        const fixtureClubSelect = document.getElementById('fixtureClubSelect');
        const scoreClubSelect = document.getElementById('scoreClubSelect');

        if (fixtureClubSelect && scoreClubSelect) {
            // Clear existing options
            fixtureClubSelect.innerHTML = '<option value="">Choose a club...</option>';
            scoreClubSelect.innerHTML = '<option value="">Choose a club...</option>';

            try {
                // Use ClubService to get clubs instead of this.clubs
                if (window.losApp?.managers?.club) {
                    const clubService = window.losApp.managers.club;

                    // Get clubs from ClubService
                    const clubs = Object.keys(clubService.clubData).map(clubId => ({
                        id: clubId,
                        ...clubService.clubData[clubId]
                    }));

                    console.log('🔧 SuperAdmin: Populating fixture club dropdowns with', clubs.length, 'clubs');

                    // Add club options
                    clubs.forEach(club => {
                        if (club.isActive !== false) { // Include clubs that are active or don't have isActive set
                            const fixtureOption = document.createElement('option');
                            fixtureOption.value = club.id;
                            fixtureOption.textContent = club.name;
                            fixtureClubSelect.appendChild(fixtureOption);

                            const scoreOption = document.createElement('option');
                            scoreOption.value = club.id;
                            scoreOption.textContent = club.name;
                            scoreClubSelect.appendChild(scoreOption);
                        }
                    });
                } else {
                    console.warn('⚠️ SuperAdmin: ClubService not available for populating club dropdowns');
                    fixtureClubSelect.innerHTML = '<option value="">ClubService not available</option>';
                    scoreClubSelect.innerHTML = '<option value="">ClubService not available</option>';
                }
            } catch (error) {
                console.error('❌ SuperAdmin: Error populating fixture club dropdowns:', error);
                fixtureClubSelect.innerHTML = '<option value="">Error loading clubs</option>';
                scoreClubSelect.innerHTML = '<option value="">Error loading clubs</option>';
            }
        }
    }

    setupFixtureModalListeners() {
        // Set up club change listeners to load editions
        const fixtureClubSelect = document.getElementById('fixtureClubSelect');
        const scoreClubSelect = document.getElementById('scoreClubSelect');

        if (fixtureClubSelect) {
            fixtureClubSelect.addEventListener('change', () => this.loadEditionsForClub('fixture'));
        }

        if (scoreClubSelect) {
            scoreClubSelect.addEventListener('change', () => this.loadEditionsForClub('score'));
        }
    }

    async loadEditionsForClub(type) {
        const clubId = document.getElementById(`${type}ClubSelect`).value;
        const editionSelect = document.getElementById(`${type}EditionSelect`);

        if (!clubId) {
            editionSelect.innerHTML = '<option value="">Choose an edition...</option>';
            return;
        }

        try {
            const editionsSnapshot = await this.db.collection('clubs').doc(clubId)
                .collection('editions').get();

            editionSelect.innerHTML = '<option value="">Choose an edition...</option>';

            editionsSnapshot.forEach(doc => {
                const edition = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = edition.name;
                editionSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading editions:', error);
            editionSelect.innerHTML = '<option value="">Error loading editions</option>';
        }
    }

    // Current Fixtures Methods
    onCurrentFixturesClubChange() {
        const clubId = document.getElementById('currentFixturesClubSelect').value;
        const editionSelect = document.getElementById('currentFixturesEditionSelect');

        if (!clubId) {
            editionSelect.innerHTML = '<option value="">Choose an edition...</option>';
            return;
        }

        this.loadEditionsForCurrentFixtures(clubId);
    }

    async loadEditionsForCurrentFixtures(clubId) {
        try {
            const editionSelect = document.getElementById('currentFixturesEditionSelect');

            // Clear editions dropdown
            editionSelect.innerHTML = '<option value="">Loading editions...</option>';

            // Get editions for the selected club using ClubService
            if (window.losApp?.managers?.club) {
                // Super Admin should see ALL editions (including inactive ones)
                const editions = await window.losApp.managers.club.getAllEditions(clubId);

                editionSelect.innerHTML = '<option value="">Choose an edition...</option>';
                editions.forEach(edition => {
                    const option = document.createElement('option');
                    option.value = edition.id;

                    // Add status indicator to edition name
                    let statusText = '';
                    if (edition.isActive === false) {
                        statusText = ' (Inactive)';
                    } else if (edition.isActive === true) {
                        statusText = ' (Active)';
                    } else {
                        statusText = ' (Unknown Status)';
                    }

                    option.textContent = `${edition.name}${statusText}`;

                    // Keep inactive editions selectable for Super Admin
                    if (edition.isActive === false) {
                        option.style.color = '#6b7280'; // Gray out but keep selectable
                    }

                    editionSelect.appendChild(option);
                });

                console.log(`✅ SuperAdmin: Loaded ${editions.length} editions for club ${clubId} (including inactive ones)`);
            } else {
                editionSelect.innerHTML = '<option value="">Error: ClubService not available</option>';
            }
        } catch (error) {
            console.error('❌ Error loading editions for current fixtures:', error);
            const editionSelect = document.getElementById('currentFixturesEditionSelect');
            editionSelect.innerHTML = '<option value="">Error loading editions</option>';
        }
    }

    onCurrentFixturesEditionChange() {
        // This method can be used for additional logic when edition changes
        console.log('🔧 Current fixtures edition changed');
    }

    // Toggle edition active status
    async toggleEditionStatus(clubId, editionId) {
        try {
            console.log(`🔧 SuperAdmin: Toggling edition status for ${clubId}/${editionId}`);

            // Get current edition data
            const editionRef = this.db.collection('clubs').doc(clubId)
                .collection('editions').doc(editionId);

            const editionDoc = await editionRef.get();
            if (!editionDoc.exists) {
                throw new Error('Edition not found');
            }

            const currentStatus = editionDoc.data().isActive;
            const newStatus = !currentStatus;

            // Update the edition status
            await editionRef.update({
                isActive: newStatus,
                updated_at: new Date()
            });

            console.log(`✅ SuperAdmin: Edition ${editionId} ${newStatus ? 'activated' : 'deactivated'}`);

            // Refresh the editions dropdown to show updated status
            if (clubId === document.getElementById('currentFixturesClubSelect')?.value) {
                this.loadEditionsForCurrentFixtures(clubId);
            }

            // Show success message
            alert(`Edition ${editionId} has been ${newStatus ? 'activated' : 'deactivated'} successfully!`);

        } catch (error) {
            console.error('❌ Error toggling edition status:', error);
            alert(`Error toggling edition status: ${error.message}`);
        }
    }

    async loadCurrentFixtures() {
        const clubId = document.getElementById('currentFixturesClubSelect').value;
        const editionId = document.getElementById('currentFixturesEditionSelect').value;
        const gameweekFilter = document.getElementById('currentFixturesGameweekSelect').value;

        if (!clubId || !editionId) {
            alert('Please select both a club and edition');
            return;
        }

        try {
            console.log('🔧 Loading current fixtures for club:', clubId, 'edition:', editionId, 'gameweek filter:', gameweekFilter);

            // Show loading state
            const fixturesList = document.getElementById('currentFixturesList');
            fixturesList.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div class="loading-spinner-small"></div>
                    <p>Loading fixtures...</p>
                </div>
            `;

            // Get fixtures from Firebase
            let fixturesQuery = this.db.collection('clubs').doc(clubId)
                .collection('editions').doc(editionId)
                .collection('fixtures');

            // Apply gameweek filter if selected
            if (gameweekFilter) {
                fixturesQuery = fixturesQuery.where('gameWeek', '==', parseInt(gameweekFilter));
            }

            const fixturesSnapshot = await fixturesQuery.orderBy('date', 'asc').get();

            if (fixturesSnapshot.empty) {
                const filterText = gameweekFilter ? ` for Game Week ${gameweekFilter}` : '';
                fixturesList.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #6b7280;">
                        <i class="fas fa-calendar-alt" style="font-size: 24px; margin-bottom: 10px;"></i>
                        <h4>No Fixtures Found</h4>
                        <p>No fixtures have been imported for this club and edition${filterText} yet.</p>
                    </div>
                `;
                return;
            }

            const fixtures = [];
            fixturesSnapshot.forEach(doc => {
                fixtures.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Display fixtures
            this.displayCurrentFixturesList(fixtures);

        } catch (error) {
            console.error('❌ Error loading current fixtures:', error);
            const fixturesList = document.getElementById('currentFixturesList');
            fixturesList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #dc2626;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i>
                    <h4>Error Loading Fixtures</h4>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    displayCurrentFixturesList(fixtures) {
        const fixturesList = document.getElementById('currentFixturesList');

        if (!fixturesList) return;

        if (fixtures.length === 0) {
            fixturesList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #6b7280;">
                    <i class="fas fa-calendar-alt" style="font-size: 24px; margin-bottom: 10px;"></i>
                    <h4>No Fixtures Found</h4>
                    <p>No fixtures have been imported for this club and edition yet.</p>
                </div>
            `;
            return;
        }

        const fixturesHtml = `
            <div style="margin-bottom: 15px;">
                <h5 style="margin: 0 0 10px 0; color: #374151;">Found ${fixtures.length} Fixtures</h5>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
                ${fixtures.map(fixture => {
            // Fix date display - handle both string and Date objects
            let dateDisplay;
            try {
                if (fixture.date) {
                    const dateObj = new Date(fixture.date);
                    if (!isNaN(dateObj.getTime())) {
                        dateDisplay = dateObj.toLocaleDateString('en-GB'); // UK format
                    } else {
                        dateDisplay = fixture.date;
                    }
                } else {
                    dateDisplay = 'TBD';
                }
            } catch (error) {
                dateDisplay = fixture.date || 'TBD';
            }

            // Fix status display - handle both string and object status
            let statusDisplay;
            if (typeof fixture.status === 'object' && fixture.status !== null) {
                // If status is an object, try to extract a meaningful value
                statusDisplay = fixture.status.name || fixture.status.status || fixture.status.value || 'scheduled';
            } else if (typeof fixture.status === 'string') {
                statusDisplay = fixture.status;
            } else {
                statusDisplay = 'scheduled';
            }

            const score = fixture.homeScore !== null && fixture.awayScore !== null
                ? `${fixture.homeScore} - ${fixture.awayScore}`
                : 'TBD';
            const gameweek = fixture.gameWeek || 'Unknown';

            // Fix kick-off time display
            const kickOffTime = fixture.time || fixture.kickOffTime || '';

            return `
                        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <span style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">GW ${gameweek}</span>
                                <span style="background: ${statusDisplay === 'finished' ? '#10b981' : statusDisplay === 'in_progress' ? '#f59e0b' : '#6b7280'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${statusDisplay}</span>
                            </div>
                            <div style="font-weight: bold; margin-bottom: 10px; color: #1f2937;">
                                ${fixture.homeTeam} vs ${fixture.awayTeam}
                            </div>
                            <div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
                                <div><i class="fas fa-calendar"></i> ${dateDisplay}</div>
                                ${kickOffTime ? `<div><i class="fas fa-clock"></i> ${kickOffTime}</div>` : ''}
                                <div><i class="fas fa-futbol"></i> ${score}</div>
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <button onclick="window.losApp.managers.superAdmin.editCurrentFixture('${fixture.id}')" class="btn btn-sm btn-secondary" style="flex: 1;">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button onclick="window.losApp.managers.superAdmin.deleteCurrentFixture('${fixture.id}')" class="btn btn-sm btn-danger" style="flex: 1;">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;

        fixturesList.innerHTML = fixturesHtml;
    }

    async editCurrentFixture(fixtureId) {
        try {
            console.log('🔧 Edit current fixture:', fixtureId);

            // Get the current club and edition from the selectors
            const clubId = document.getElementById('currentFixturesClubSelect').value;
            const editionId = document.getElementById('currentFixturesEditionSelect').value;

            if (!clubId || !editionId) {
                alert('Please select a club and edition first');
                return;
            }

            // Fetch the fixture data from Firebase
            const fixtureDoc = await this.db.collection('clubs').doc(clubId)
                .collection('editions').doc(editionId)
                .collection('fixtures').doc(fixtureId).get();

            if (!fixtureDoc.exists) {
                alert('Fixture not found');
                return;
            }

            const fixture = fixtureDoc.data();

            // Create edit modal
            this.createFixtureEditModal(fixture, fixtureId, clubId, editionId);

        } catch (error) {
            console.error('❌ Error editing fixture:', error);
            alert(`Error editing fixture: ${error.message}`);
        }
    }

    createFixtureEditModal(fixture, fixtureId, clubId, editionId) {
        // Remove existing modal if present
        const existingModal = document.getElementById('fixtureEditModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'fixtureEditModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 2000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        // Format date for input field (YYYY-MM-DD)
        let dateForInput = '';
        if (fixture.date) {
            try {
                const dateObj = new Date(fixture.date);
                if (!isNaN(dateObj.getTime())) {
                    dateForInput = dateObj.toISOString().split('T')[0];
                } else if (typeof fixture.date === 'string' && fixture.date.includes('/')) {
                    // Convert MM/DD/YYYY to YYYY-MM-DD
                    const parts = fixture.date.split('/');
                    if (parts.length === 3) {
                        dateForInput = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                    }
                }
            } catch (error) {
                dateForInput = '';
            }
        }

        // Fix status for edit modal - handle both string and object status
        let statusForEdit;
        if (typeof fixture.status === 'object' && fixture.status !== null) {
            // If status is an object, try to extract a meaningful value
            statusForEdit = fixture.status.name || fixture.status.status || fixture.status.value || 'scheduled';
        } else if (typeof fixture.status === 'string') {
            statusForEdit = fixture.status;
        } else {
            statusForEdit = 'scheduled';
        }

        modal.innerHTML = `
            <div style="background: white; width: 90%; max-width: 600px; max-height: 80vh; border-radius: 8px; overflow: hidden;">
                <div style="background: #1f2937; color: white; padding: 15px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                    <span>✏️ Edit Fixture</span>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">×</button>
                </div>
                <div style="padding: 20px; max-height: calc(80vh - 60px); overflow-y: auto;">
                    <form id="fixtureEditForm">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Home Team:</label>
                                <input type="text" id="editHomeTeam" value="${fixture.homeTeam || ''}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;" required>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Away Team:</label>
                                <input type="text" id="editAwayTeam" value="${fixture.awayTeam || ''}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;" required>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Date:</label>
                                <input type="date" id="editDate" value="${dateForInput}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;" required>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Kick-off Time:</label>
                                <input type="text" id="editTime" value="${fixture.time || ''}" placeholder="e.g., 15:00" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Home Score:</label>
                                <input type="number" id="editHomeScore" value="${fixture.homeScore || ''}" min="0" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Away Score:</label>
                                <input type="number" id="editAwayScore" value="${fixture.awayScore || ''}" min="0" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                            </div>
                        </div>
                        
                        <div style="margin-top: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Status:</label>
                            <select id="editStatus" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                                <option value="scheduled" ${statusForEdit === 'scheduled' ? 'selected' : ''}>Scheduled</option>
                                <option value="in_progress" ${statusForEdit === 'in_progress' ? 'selected' : ''}>In Progress</option>
                                <option value="finished" ${statusForEdit === 'finished' ? 'selected' : ''}>Finished</option>
                                <option value="postponed" ${statusForEdit === 'postponed' ? 'selected' : ''}>Postponed</option>
                                <option value="cancelled" ${statusForEdit === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </div>
                        
                        <div style="margin-top: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Game Week:</label>
                            <select id="editGameWeek" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                                ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(week =>
            `<option value="${week}" ${fixture.gameWeek === week ? 'selected' : ''}>Game Week ${week}</option>`
        ).join('')}
                            </select>
                        </div>
                        
                        <div style="margin-top: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Venue:</label>
                            <input type="text" id="editVenue" value="${fixture.venue || ''}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                        </div>
                        
                        <div style="display: flex; gap: 10px; margin-top: 20px;">
                            <button type="button" onclick="this.closest('#fixtureEditModal').remove()" class="btn btn-secondary" style="flex: 1;">Cancel</button>
                            <button type="submit" class="btn btn-primary" style="flex: 1;">💾 Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add form submit handler
        const form = document.getElementById('fixtureEditForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveFixtureChanges(fixtureId, clubId, editionId);
        });
    }

    async saveFixtureChanges(fixtureId, clubId, editionId) {
        try {
            const formData = {
                homeTeam: document.getElementById('editHomeTeam').value,
                awayTeam: document.getElementById('editAwayTeam').value,
                date: document.getElementById('editDate').value,
                time: document.getElementById('editTime').value,
                homeScore: document.getElementById('editHomeScore').value ? parseInt(document.getElementById('editHomeScore').value) : null,
                awayScore: document.getElementById('editAwayScore').value ? parseInt(document.getElementById('editAwayScore').value) : null,
                status: document.getElementById('editStatus').value,
                gameWeek: parseInt(document.getElementById('editGameWeek').value),
                venue: document.getElementById('editVenue').value,
                lastUpdated: new Date().toISOString()
            };

            // Update the fixture in Firebase
            await this.db.collection('clubs').doc(clubId)
                .collection('editions').doc(editionId)
                .collection('fixtures').doc(fixtureId)
                .update(formData);

            console.log('✅ Fixture updated successfully');

            // Close modal
            document.getElementById('fixtureEditModal').remove();

            // Refresh the fixtures list
            this.loadCurrentFixtures();

            // Show success message
            alert('✅ Fixture updated successfully!');

        } catch (error) {
            console.error('❌ Error saving fixture changes:', error);
            alert(`Error saving changes: ${error.message}`);
        }
    }

    async deleteCurrentFixture(fixtureId) {
        try {
            if (!confirm('Are you sure you want to delete this fixture?')) {
                return;
            }

            console.log('🔧 Delete current fixture:', fixtureId);

            // Get the current club and edition from the selectors
            const clubId = document.getElementById('currentFixturesClubSelect').value;
            const editionId = document.getElementById('currentFixturesEditionSelect').value;

            if (!clubId || !editionId) {
                alert('Please select a club and edition first');
                return;
            }

            // Delete the fixture from Firebase
            await this.db.collection('clubs').doc(clubId)
                .collection('editions').doc(editionId)
                .collection('fixtures').doc(fixtureId)
                .delete();

            console.log('✅ Fixture deleted successfully');

            // Refresh the fixtures list
            this.loadCurrentFixtures();

            // Show success message
            alert('✅ Fixture deleted successfully!');

        } catch (error) {
            console.error('❌ Error deleting fixture:', error);
            alert(`Error deleting fixture: ${error.message}`);
        }
    }

    async deleteAllFixtures() {
        const clubId = document.getElementById('currentFixturesClubSelect').value;
        const editionId = document.getElementById('currentFixturesEditionSelect').value;
        const gameweekFilter = document.getElementById('currentFixturesGameweekSelect').value;

        if (!clubId || !editionId) {
            alert('Please select both a club and edition first');
            return;
        }

        // Show confirmation dialog with details
        const filterText = gameweekFilter ? ` for Game Week ${gameweekFilter}` : ' for all game weeks';
        const confirmMessage = `Are you absolutely sure you want to delete ALL fixtures for ${clubId} - ${editionId}${filterText}?\n\nThis action cannot be undone and will permanently remove all matching fixtures from the database.`;

        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            console.log('🗑️ Deleting all fixtures for club:', clubId, 'edition:', editionId, 'gameweek filter:', gameweekFilter);

            // Show loading state
            const fixturesList = document.getElementById('currentFixturesList');
            fixturesList.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div class="loading-spinner-small"></div>
                    <p>Deleting fixtures...</p>
                </div>
            `;

            // Build the query
            let fixturesQuery = this.db.collection('clubs').doc(clubId)
                .collection('editions').doc(editionId)
                .collection('fixtures');

            // Apply gameweek filter if selected
            if (gameweekFilter) {
                fixturesQuery = fixturesQuery.where('gameWeek', '==', parseInt(gameweekFilter));
            }

            // Get all matching fixtures
            const fixturesSnapshot = await fixturesQuery.get();

            if (fixturesSnapshot.empty) {
                fixturesList.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #6b7280;">
                        <i class="fas fa-info-circle" style="font-size: 24px; margin-bottom: 10px;"></i>
                        <h4>No Fixtures to Delete</h4>
                        <p>No fixtures found matching the selected criteria.</p>
                    </div>
                `;
                return;
            }

            const fixtureCount = fixturesSnapshot.size;
            console.log(`🗑️ Found ${fixtureCount} fixtures to delete`);

            // Delete fixtures in batches (Firestore batch limit is 500)
            const batchSize = 500;
            let deletedCount = 0;

            for (let i = 0; i < fixtureCount; i += batchSize) {
                const batch = this.db.batch();
                const batchSnapshot = fixturesSnapshot.docs.slice(i, i + batchSize);

                batchSnapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });

                await batch.commit();
                deletedCount += batchSnapshot.length;
                console.log(`🗑️ Deleted batch ${Math.floor(i / batchSize) + 1}, total deleted: ${deletedCount}`);
            }

            console.log(`✅ Successfully deleted ${deletedCount} fixtures`);

            // Show success message
            fixturesList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #10b981;">
                    <i class="fas fa-check-circle" style="font-size: 24px; margin-bottom: 10px;"></i>
                    <h4>Fixtures Deleted Successfully</h4>
                    <p>${deletedCount} fixtures have been permanently deleted.</p>
                    <button onclick="window.losApp.managers.superAdmin.loadCurrentFixtures()" class="btn btn-primary" style="margin-top: 15px;">
                        <i class="fas fa-refresh"></i> Refresh Fixtures
                    </button>
                </div>
            `;

        } catch (error) {
            console.error('❌ Error deleting fixtures:', error);
            const fixturesList = document.getElementById('currentFixturesList');
            fixturesList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #dc2626;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i>
                    <h4>Error Deleting Fixtures</h4>
                    <p>${error.message}</p>
                    <button onclick="window.losApp.managers.superAdmin.loadCurrentFixtures()" class="btn btn-primary" style="margin-top: 15px;">
                        <i class="fas fa-refresh"></i> Try Again
                    </button>
                </div>
            `;
        }
    }

    // Import fixtures from API
    async importFixturesFromAPI() {
        try {
            const competitionSelect = document.getElementById('competition-select');
            const importClubSelect = document.getElementById('fixtureClubSelect'); // Changed from 'import-club-select'
            const importEditionSelect = document.getElementById('fixtureEditionSelect'); // Changed from 'import-edition-select'

            if (!competitionSelect || !importClubSelect || !importEditionSelect) {
                alert('❌ Required form elements not found');
                return;
            }

            const competitionId = competitionSelect.value;
            const clubId = importClubSelect.value;
            const editionId = importEditionSelect.value;

            if (!competitionId || !clubId || !editionId) {
                alert('❌ Please select a competition, club, and edition');
                return;
            }

            // Get competition name for display
            const competition = window.APIConfig.competitions[competitionId]; // Changed from window.getCompetition
            const competitionName = competition ? `${competition.name} (${competition.description})` : `Competition ${competitionId}`;

            console.log(`🚀 Starting fixture import for ${competitionName} (ID: ${competitionId})`);

            // Show loading state with progress
            const importButton = document.querySelector('.fixture-import-section button[onclick="window.losApp.managers.superAdmin.importFixturesFromAPI()"]'); // Changed selector
            const originalText = importButton.textContent;
            importButton.textContent = '⏳ Importing...';
            importButton.disabled = true;

            // Add progress indicator
            const progressDiv = document.createElement('div');
            progressDiv.id = 'importProgress';
            progressDiv.className = 'alert alert-info mt-2';
            progressDiv.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="spinner-border spinner-border-sm me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <span>Importing fixtures from API... This may take several minutes due to rate limiting.</span>
                </div>
                <div class="progress mt-2" style="height: 20px;">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" 
                         role="progressbar" style="width: 0%" 
                         id="importProgressBar">0%</div>
                </div>
            `;

            // Insert progress after the button
            importButton.parentNode.insertBefore(progressDiv, importButton.nextSibling);

            // Update progress to 25%
            this.updateImportProgress(25, 'Connecting to API...');

            try {
                // Get fixtures from API first
                const fixtureManager = window.losApp.managers.fixtureManagement;
                const apiFixtures = await fixtureManager.getFixtures(competitionId, '2024-25');

                console.log('🔍 API Response structure:', apiFixtures);
                console.log('🔍 API Response keys:', Object.keys(apiFixtures || {}));

                // Handle different possible API response structures
                let fixturesArray = [];
                console.log('🔍 Full API response:', apiFixtures);

                if (apiFixtures && apiFixtures.matches) {
                    fixturesArray = apiFixtures.matches;
                    console.log('✅ Using apiFixtures.matches');
                } else if (apiFixtures && apiFixtures['fixtures-results']) {
                    // The fixtures-results might contain nested data
                    const fixturesResults = apiFixtures['fixtures-results'];
                    console.log('🔍 fixtures-results structure:', fixturesResults);
                    console.log('🔍 fixtures-results keys:', Object.keys(fixturesResults || {}));

                    // Check if fixtures-results has a matches property
                    if (fixturesResults && fixturesResults.matches) {
                        fixturesArray = fixturesResults.matches;
                        console.log('✅ Using fixtures-results.matches');
                        console.log('🔍 Matches array length:', fixturesArray.length);
                    } else if (Array.isArray(fixturesResults)) {
                        fixturesArray = fixturesResults;
                        console.log('✅ Using fixtures-results as array');
                    } else if (fixturesResults && fixturesResults.fixtures) {
                        fixturesArray = fixturesResults.fixtures;
                        console.log('✅ Using fixtures-results.fixtures');
                    } else {
                        // Try to find any array property
                        console.log('🔍 Searching for array properties in fixtures-results...');
                        for (const [key, value] of Object.entries(fixturesResults || {})) {
                            console.log(`🔍 Checking key '${key}':`, Array.isArray(value), value?.length);
                            if (Array.isArray(value) && value.length > 0) {
                                fixturesArray = value;
                                console.log(`✅ Using fixtures-results.${key}`);
                                break;
                            }
                        }
                    }
                } else if (Array.isArray(apiFixtures)) {
                    fixturesArray = apiFixtures;
                    console.log('✅ Using apiFixtures as array');
                } else {
                    console.error('❌ Unexpected API response structure:', apiFixtures);
                    console.error('❌ Available keys:', Object.keys(apiFixtures || {}));
                    alert('❌ Unexpected API response structure. Please check the console for details.');
                    return;
                }

                if (!fixturesArray || fixturesArray.length === 0) {
                    console.error('❌ No fixtures array found in API response');
                    console.error('❌ Available keys in apiFixtures:', Object.keys(apiFixtures || {}));
                    if (apiFixtures && apiFixtures['fixtures-results']) {
                        console.error('❌ Available keys in fixtures-results:', Object.keys(apiFixtures['fixtures-results'] || {}));
                    }
                    alert('❌ No fixtures found for the selected competition. Please check the console for details.');
                    return;
                }

                console.log(`📊 Found ${fixturesArray.length} fixtures from API`);
                console.log('🔍 First fixture example:', fixturesArray[0]);

                // Update progress to 75%
                this.updateImportProgress(75, 'Processing fixtures...');

                // Update progress to 100%
                this.updateImportProgress(100, `Found ${fixturesArray.length} fixtures!`);

                // Show fixture selection modal instead of importing all
                this.showFixtureSelectionModal(fixturesArray, competitionId, clubId, editionId, competitionName);

                // Remove progress indicator after a delay
                setTimeout(() => {
                    const progressDiv = document.getElementById('importProgress');
                    if (progressDiv && progressDiv.parentNode) {
                        progressDiv.parentNode.removeChild(progressDiv);
                    }
                }, 2000);

            } catch (error) {
                console.error('❌ Error importing fixtures:', error);

                // Update progress to show error
                this.updateImportProgress(0, `Error: ${error.message}`);

                // Show error message
                setTimeout(() => {
                    alert(`❌ Error importing fixtures: ${error.message}`);
                    // Remove progress indicator
                    const progressDiv = document.getElementById('importProgress');
                    if (progressDiv && progressDiv.parentNode) {
                        progressDiv.parentNode.removeChild(progressDiv);
                    }
                }, 1000);
            } finally {
                // Restore button state
                importButton.textContent = originalText;
                importButton.disabled = false;
            }

        } catch (error) {
            console.error('❌ Error in importFixturesFromAPI:', error);
            alert(`❌ Unexpected error: ${error.message}`);
        }
    }

    // Update import progress
    updateImportProgress(percentage, message) {
        const progressBar = document.getElementById('importProgressBar');
        const progressDiv = document.getElementById('importProgress');

        if (progressBar && progressDiv) {
            progressBar.style.width = `${percentage}%`;
            progressBar.textContent = `${percentage}%`;

            // Update message
            const messageSpan = progressDiv.querySelector('span');
            if (messageSpan) {
                messageSpan.textContent = message;
            }

            // Change color based on percentage
            if (percentage === 100) {
                progressBar.className = 'progress-bar progress-bar-striped bg-success';
                progressDiv.className = 'alert alert-success mt-2';
            } else if (percentage === 0) {
                progressBar.className = 'progress-bar progress-bar-striped bg-danger';
                progressDiv.className = 'alert alert-danger mt-2';
            }
        }
    }

    // Show fixture selection modal
    showFixtureSelectionModal(fixturesArray, competitionId, clubId, editionId, competitionName) {
        console.log('🔍 Showing fixture selection modal...');

        // Create modal HTML
        const modalHTML = `
            <div id="fixtureSelectionModal" class="modal-overlay">
                <div class="modal-content fixture-selection-modal">
                    <div class="modal-header">
                        <h3>📥 Select Fixtures to Import</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="fixture-selection-info">
                            <p><strong>${competitionName}</strong> - ${fixturesArray.length} fixtures available</p>
                        </div>
                        
                        <div class="fixture-filters">
                            <div class="filter-group">
                                <label>Date Range:</label>
                                <input type="date" id="startDate" placeholder="Start Date">
                                <input type="date" id="endDate" placeholder="End Date">
                                <button onclick="window.losApp.managers.superAdmin.filterFixturesByDate()">🔍 Filter</button>
                                <button onclick="window.losApp.managers.superAdmin.clearDateFilter()">🔄 Clear</button>
                            </div>
                            
                            <div class="filter-group">
                                <label>Quick Filters:</label>
                                <button onclick="window.losApp.managers.superAdmin.selectFixturesForGameWeek(1)">GW1</button>
                                <button onclick="window.losApp.managers.superAdmin.selectFixturesForGameWeek(2)">GW2</button>
                                <button onclick="window.losApp.managers.superAdmin.selectFixturesForGameWeek(3)">GW3</button>
                                <button onclick="window.losApp.managers.superAdmin.selectFixturesForGameWeek(4)">GW4</button>
                                <button onclick="window.losApp.managers.superAdmin.selectFixturesForGameWeek(5)">GW5</button>
                            </div>
                        </div>
                        
                        <div class="fixture-selection-controls">
                            <button onclick="window.losApp.managers.superAdmin.selectAllFixtures()">✅ Select All</button>
                            <button onclick="window.losApp.managers.superAdmin.deselectAllFixtures()">❌ Deselect All</button>
                            <span id="selectedCount">0 selected</span>
                        </div>
                        
                        <div class="fixtures-list" id="fixturesList">
                            <!-- Fixtures will be populated here -->
                        </div>
                        
                        <div class="fixture-import-options">
                            <h4>Import Options:</h4>
                            <div class="import-option">
                                <label>Target Edition:</label>
                                <select id="targetEditionSelect">
                                    <!-- Editions will be populated -->
                                </select>
                            </div>
                            <div class="import-option">
                                <label>Game Week:</label>
                                <select id="targetGameWeekSelect">
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
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                        <button class="btn-primary" onclick="window.losApp.managers.superAdmin.importSelectedFixtures()" id="importSelectedBtn" disabled>
                            📥 Import Selected Fixtures
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Store fixtures data for the modal
        this.fixtureSelectionData = {
            fixtures: fixturesArray,
            competitionId: competitionId,
            clubId: clubId,
            editionId: editionId,
            competitionName: competitionName,
            selectedFixtures: new Set()
        };

        // Populate fixtures list
        this.populateFixturesList();

        // Populate editions dropdown
        this.populateEditionsDropdown();

        console.log('✅ Fixture selection modal created');
    }

    // Populate fixtures list in the modal
    populateFixturesList() {
        const fixturesList = document.getElementById('fixturesList');
        if (!fixturesList || !this.fixtureSelectionData) return;

        const { fixtures } = this.fixtureSelectionData;

        fixturesList.innerHTML = fixtures.map((fixture, index) => {
            // Extract team names
            let homeTeam = 'Unknown';
            let awayTeam = 'Unknown';
            let matchDate = 'TBD';

            if (fixture['home-team'] && fixture['away-team']) {
                homeTeam = typeof fixture['home-team'] === 'object' ?
                    (fixture['home-team'].name || fixture['home-team'].title || JSON.stringify(fixture['home-team'])) :
                    fixture['home-team'];
                awayTeam = typeof fixture['away-team'] === 'object' ?
                    (fixture['away-team'].name || fixture['away-team'].title || JSON.stringify(fixture['away-team'])) :
                    fixture['away-team'];
            }

            matchDate = fixture.date || fixture.matchDate || 'TBD';

            return `
                <div class="fixture-item" data-index="${index}">
                    <input type="checkbox" id="fixture_${index}" onchange="window.losApp.managers.superAdmin.toggleFixtureSelection(${index})">
                    <label for="fixture_${index}">
                        <span class="fixture-teams">${homeTeam} vs ${awayTeam}</span>
                        <span class="fixture-date">${matchDate}</span>
                    </label>
                </div>
            `;
        }).join('');
    }

    // Populate editions dropdown
    async populateEditionsDropdown() {
        const editionSelect = document.getElementById('targetEditionSelect');
        if (!editionSelect) return;

        try {
            const { clubId } = this.fixtureSelectionData;

            // Use ClubService to get editions for the club
            if (window.losApp && window.losApp.managers && window.losApp.managers.club) {
                // Super Admin should see ALL editions (including inactive ones)
                const editions = await window.losApp.managers.club.getAllEditions(clubId);

                editionSelect.innerHTML = editions.map(edition => {
                    // Add status indicator to edition name
                    let statusText = '';
                    if (edition.isActive === false) {
                        statusText = ' (Inactive)';
                    } else if (edition.isActive === true) {
                        statusText = ' (Active)';
                    } else {
                        statusText = ' (Unknown Status)';
                    }

                    return `<option value="${edition.id}">${edition.name}${statusText}</option>`;
                }).join('');

                // Set default to current edition if available
                if (this.fixtureSelectionData.editionId) {
                    editionSelect.value = this.fixtureSelectionData.editionId;
                }
            } else {
                console.error('ClubService not available');
                editionSelect.innerHTML = '<option value="">No editions available</option>';
            }
        } catch (error) {
            console.error('Error populating editions dropdown:', error);
            editionSelect.innerHTML = '<option value="">Error loading editions</option>';
        }
    }

    // Toggle fixture selection
    toggleFixtureSelection(index) {
        if (!this.fixtureSelectionData) return;

        const { selectedFixtures } = this.fixtureSelectionData;
        const importBtn = document.getElementById('importSelectedBtn');
        const selectedCountSpan = document.getElementById('selectedCount');

        if (selectedFixtures.has(index)) {
            selectedFixtures.delete(index);
        } else {
            selectedFixtures.add(index);
        }

        // Update UI
        importBtn.disabled = selectedFixtures.size === 0;
        selectedCountSpan.textContent = `${selectedFixtures.size} selected`;
    }

    // Select all fixtures
    selectAllFixtures() {
        if (!this.fixtureSelectionData) return;

        const { fixtures, selectedFixtures } = this.fixtureSelectionData;
        selectedFixtures.clear();

        fixtures.forEach((_, index) => {
            selectedFixtures.add(index);
            const checkbox = document.getElementById(`fixture_${index}`);
            if (checkbox) checkbox.checked = true;
        });

        this.updateSelectionUI();
    }

    // Deselect all fixtures
    deselectAllFixtures() {
        if (!this.fixtureSelectionData) return;

        const { selectedFixtures } = this.fixtureSelectionData;
        selectedFixtures.clear();

        // Uncheck all checkboxes
        document.querySelectorAll('#fixturesList input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });

        this.updateSelectionUI();
    }

    // Update selection UI
    updateSelectionUI() {
        if (!this.fixtureSelectionData) return;

        const { selectedFixtures } = this.fixtureSelectionData;
        const importBtn = document.getElementById('importSelectedBtn');
        const selectedCountSpan = document.getElementById('selectedCount');

        importBtn.disabled = selectedFixtures.size === 0;
        selectedCountSpan.textContent = `${selectedFixtures.size} selected`;
    }

    // Filter fixtures by date
    filterFixturesByDate() {
        if (!this.fixtureSelectionData) return;

        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        if (!startDate || !endDate) {
            alert('Please select both start and end dates');
            return;
        }

        const { fixtures, selectedFixtures } = this.fixtureSelectionData;
        selectedFixtures.clear();

        fixtures.forEach((fixture, index) => {
            const fixtureDate = fixture.date || fixture.matchDate;
            if (fixtureDate) {
                const date = new Date(fixtureDate);
                const start = new Date(startDate);
                const end = new Date(endDate);

                if (date >= start && date <= end) {
                    selectedFixtures.add(index);
                    const checkbox = document.getElementById(`fixture_${index}`);
                    if (checkbox) checkbox.checked = true;
                } else {
                    const checkbox = document.getElementById(`fixture_${index}`);
                    if (checkbox) checkbox.checked = false;
                }
            }
        });

        this.updateSelectionUI();
    }

    // Clear date filter
    clearDateFilter() {
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        this.deselectAllFixtures();
    }

    // Select fixtures for specific game week
    selectFixturesForGameWeek(gameWeek) {
        if (!this.fixtureSelectionData) return;

        // Define game week date ranges (you can customize these)
        const gameWeekDates = {
            1: { startDate: '2025-08-19', endDate: '2025-08-20' },
            2: { startDate: '2025-08-26', endDate: '2025-08-27' },
            3: { startDate: '2025-09-02', endDate: '2025-09-03' },
            4: { startDate: '2025-09-09', endDate: '2025-09-10' },
            5: { startDate: '2025-09-16', endDate: '2025-09-17' }
        };

        const dates = gameWeekDates[gameWeek];
        if (!dates) {
            alert(`No date range defined for Game Week ${gameWeek}`);
            return;
        }

        // Set the date inputs
        document.getElementById('startDate').value = dates.startDate;
        document.getElementById('endDate').value = dates.endDate;

        // Apply the filter
        this.filterFixturesByDate();
    }

    // Import selected fixtures
    async importSelectedFixtures() {
        if (!this.fixtureSelectionData) return;

        const { fixtures, selectedFixtures, competitionId, clubId, competitionName } = this.fixtureSelectionData;
        const targetEditionId = document.getElementById('targetEditionSelect').value;
        const targetGameWeek = document.getElementById('targetGameWeekSelect').value;

        if (selectedFixtures.size === 0) {
            alert('Please select at least one fixture to import');
            return;
        }

        if (!targetEditionId) {
            alert('Please select a target edition');
            return;
        }

        try {
            // Get selected fixtures
            const selectedFixturesArray = Array.from(selectedFixtures).map(index => fixtures[index]);

            console.log(`📥 Importing ${selectedFixturesArray.length} selected fixtures to edition ${targetEditionId}, game week ${targetGameWeek}`);

            // Import to Firebase
            const fixtureManager = window.losApp.managers.fixtureManagement;
            const importedFixtures = await fixtureManager.importFixturesToFirebase(
                competitionId,
                clubId,
                targetEditionId,
                selectedFixturesArray,
                parseInt(targetGameWeek)
            );

            // Show success message
            alert(`✅ Successfully imported ${importedFixtures.length} fixtures to ${competitionName} (Game Week ${targetGameWeek})`);
            console.log(`✅ Fixture import completed: ${importedFixtures.length} fixtures imported`);

            // Close modal
            document.getElementById('fixtureSelectionModal').remove();

            // Refresh the fixtures list if viewing
            this.loadFixturesForClub(clubId, targetEditionId);

        } catch (error) {
            console.error('❌ Error importing selected fixtures:', error);
            alert(`❌ Error importing fixtures: ${error.message}`);
        }
    }

    // Bulk update scores from API by gameweek
    async bulkUpdateScoresFromAPI() {
        try {
            const clubId = document.getElementById('scoreClubSelect').value;
            const editionId = document.getElementById('scoreEditionSelect').value;
            const gameweek = document.getElementById('score-gameweek-select').value;

            if (!clubId || !editionId || !gameweek) {
                alert('❌ Please select a club, edition, and game week');
                return;
            }

            console.log(`🔄 Starting bulk score update for Game Week ${gameweek}`);

            // Show loading state
            const updateButton = document.querySelector('.score-updates-section button[onclick="window.losApp.managers.superAdmin.bulkUpdateScoresFromAPI()"]');
            const originalText = updateButton.textContent;
            updateButton.textContent = '⏳ Updating...';
            updateButton.disabled = true;

            try {
                // Check if FixtureManagementManager is available
                if (!window.losApp || !window.losApp.managers.fixtureManagement) {
                    alert('❌ Fixture Management system not available. Please ensure FixtureManagementManager is loaded.');
                    return;
                }

                const fixtureManager = window.losApp.managers.fixtureManagement;

                // Bulk update scores by gameweek
                const result = await fixtureManager.bulkUpdateScoresByGameweek(parseInt(gameweek), clubId, editionId);

                if (result.updated > 0) {
                    alert(`✅ Successfully updated ${result.updated} out of ${result.total} fixture scores for Game Week ${gameweek}`);
                } else {
                    alert(`ℹ️ No fixtures needed updating for Game Week ${gameweek}`);
                }

                console.log(`✅ Bulk score update completed: ${result.updated}/${result.total} fixtures updated for Game Week ${gameweek}`);

                // Refresh the fixtures list if viewing
                this.loadFixturesForClub(clubId, editionId);

            } catch (error) {
                console.error('❌ Error bulk updating scores:', error);
                alert(`❌ Error updating scores: ${error.message}`);
            } finally {
                // Restore button state
                updateButton.textContent = originalText;
                updateButton.disabled = false;
            }

        } catch (error) {
            console.error('❌ Error in bulkUpdateScoresFromAPI:', error);
            alert(`❌ Unexpected error: ${error.message}`);
        }
    }

    // Load fixtures for a specific club and edition
    async loadFixturesForClub(clubId, editionId) {
        const fixturesList = document.getElementById('fixturesList');

        if (!fixturesList) return;

        try {
            const fixturesSnapshot = await this.db.collection('clubs').doc(clubId)
                .collection('editions').doc(editionId)
                .collection('fixtures')
                .orderBy('date', 'asc')
                .get();

            if (fixturesSnapshot.empty) {
                fixturesList.innerHTML = '<em>No fixtures found for this club and edition</em>';
                return;
            }

            const fixtures = [];
            fixturesSnapshot.forEach(doc => {
                fixtures.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Display fixtures
            this.displayFixturesList(fixtures);

        } catch (error) {
            console.error('Error loading fixtures:', error);
            fixturesList.innerHTML = '<em>Error loading fixtures</em>';
        }
    }

    // Display fixtures in the list
    displayFixturesList(fixtures) {
        const fixturesList = document.getElementById('fixturesList');

        if (!fixturesList) return;

        const fixturesHtml = fixtures.map(fixture => {
            const date = new Date(fixture.date).toLocaleDateString();
            const status = fixture.status || 'scheduled';
            const score = fixture.homeScore !== null && fixture.awayScore !== null
                ? `${fixture.homeScore} - ${fixture.awayScore}`
                : 'TBD';

            return `
                <div style="border: 1px solid #e5e7eb; padding: 10px; margin-bottom: 10px; border-radius: 4px; background: white;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <strong>${fixture.homeTeam} vs ${fixture.awayTeam}</strong>
                        <span style="background: #1f2937; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">${status}</span>
                    </div>
                    <div style="font-size: 12px; color: #6b7280;">
                        <strong>Date:</strong> ${date} | 
                        <strong>Score:</strong> ${score} | 
                        <strong>ID:</strong> ${fixture.id}
                    </div>
                </div>
            `;
        }).join('');

        fixturesList.innerHTML = fixturesHtml;
    }

    // Update fixture score manually
    async updateFixtureScoreManually() {
        const fixtureId = document.getElementById('manualFixtureId').value;
        const homeScore = parseInt(document.getElementById('homeScore').value);
        const awayScore = parseInt(document.getElementById('awayScore').value);
        const status = document.getElementById('fixtureStatus').value;

        if (!fixtureId || isNaN(homeScore) || isNaN(awayScore)) {
            alert('Please enter valid fixture ID and scores');
            return;
        }

        try {
            // Find the fixture to get club and edition info
            const fixture = await this.findFixtureById(fixtureId);

            if (!fixture) {
                alert('Fixture not found. Please check the fixture ID.');
                return;
            }

            // Check if FixtureManagementManager is available
            if (!window.losApp || !window.losApp.managers.fixtureManagement) {
                alert('Fixture Management system not available. Please ensure FixtureManagementManager is loaded.');
                return;
            }

            const fixtureManager = window.losApp.managers.fixtureManagement;

            // Update the score
            await fixtureManager.updateFixtureScore(
                fixtureId,
                fixture.clubId,
                fixture.editionId,
                homeScore,
                awayScore,
                status
            );

            alert('✅ Fixture score updated successfully!');

            // Clear form
            document.getElementById('manualFixtureId').value = '';
            document.getElementById('homeScore').value = '';
            document.getElementById('awayScore').value = '';
            document.getElementById('fixtureStatus').value = 'finished';

        } catch (error) {
            console.error('Error updating fixture score:', error);
            alert(`❌ Error updating fixture score: ${error.message}`);
        }
    }

    // Find fixture by ID across all clubs and editions
    async findFixtureById(fixtureId) {
        try {
            for (const club of this.clubs) {
                if (!club.isActive) continue;

                const editionsSnapshot = await this.db.collection('clubs').doc(club.id)
                    .collection('editions').get();

                for (const editionDoc of editionsSnapshot.docs) {
                    const fixtureDoc = await this.db.collection('clubs').doc(club.id)
                        .collection('editions').doc(editionDoc.id)
                        .collection('fixtures').doc(fixtureId).get();

                    if (fixtureDoc.exists) {
                        return {
                            ...fixtureDoc.data(),
                            clubId: club.id,
                            editionId: editionDoc.id
                        };
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('Error finding fixture:', error);
            return null;
        }
    }

    populateClubsList() {
        const contentEl = document.getElementById('clubsList');
        if (!contentEl) return;

        if (this.clubs.length === 0) {
            contentEl.innerHTML = '<em>No clubs found</em>';
            return;
        }

        const clubsHtml = this.clubs.map(club => {
            const status = club.isActive ? '🟢 Active' : '🔴 Inactive';
            const editions = club.editions || [];

            return `
                <div style="border: 1px solid #e5e7eb; padding: 15px; margin-bottom: 15px; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h4 style="margin: 0; color: #1f2937;">${club.name}</h4>
                        <span style="background: #1f2937; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px;">${status}</span>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>Club ID:</strong> ${club.clubId}<br>
                        <strong>Description:</strong> ${club.description || 'No description'}<br>
                        <strong>Contact:</strong> ${club.contactEmail || 'No contact email'}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="window.losApp.managers.superAdmin.editClub('${club.id}')" class="btn btn-secondary" style="font-size: 12px;">✏️ Edit</button>
                        <button onclick="window.losApp.managers.superAdmin.toggleClubStatus('${club.id}')" class="btn btn-secondary" style="font-size: 12px;">
                            ${club.isActive ? '🔴 Deactivate' : '🟢 Activate'}
                        </button>
                        <button onclick="window.losApp.managers.superAdmin.deleteClub('${club.id}')" class="btn btn-danger" style="font-size: 12px;">🗑️ Delete</button>
                    </div>
                </div>
            `;
        }).join('');

        contentEl.innerHTML = clubsHtml;
    }

    // Edit club
    async editClub(clubId) {
        const club = this.clubs.find(c => c.id === clubId);
        if (!club) return;

        const newName = prompt('Enter new club name:', club.name);
        if (!newName || newName === club.name) return;

        try {
            await this.db.collection('clubs').doc(clubId).update({
                name: newName,
                updated_at: new Date()
            });

            // Log the action
            await this.logAuditEvent('SUPER_ADMIN', 'CLUB_EDITED', {
                clubId: clubId,
                oldName: club.name,
                newName: newName,
                userId: this.currentUser?.uid || 'unknown'
            });

            alert(`✅ Club "${club.name}" updated to "${newName}"!`);

        } catch (error) {
            console.error('SuperAdminManager: Error updating club:', error);
            alert('❌ Error updating club: ' + error.message);
        }
    }

    // Toggle club status
    async toggleClubStatus(clubId) {
        const club = this.clubs.find(c => c.id === clubId);
        if (!club) return;

        const newStatus = !club.isActive;
        const statusText = newStatus ? 'activated' : 'deactivated';

        try {
            await this.db.collection('clubs').doc(clubId).update({
                isActive: newStatus,
                updated_at: new Date()
            });

            // Log the action
            await this.logAuditEvent('SUPER_ADMIN', 'CLUB_STATUS_CHANGED', {
                clubId: clubId,
                clubName: club.name,
                oldStatus: club.isActive,
                newStatus: newStatus,
                userId: this.currentUser?.uid || 'unknown'
            });

            alert(`✅ Club "${club.name}" ${statusText}!`);

        } catch (error) {
            console.error('SuperAdminManager: Error updating club status:', error);
            alert('❌ Error updating club status: ' + error.message);
        }
    }

    // Delete club
    async deleteClub(clubId) {
        const club = this.clubs.find(c => c.id === clubId);
        if (!club) return;

        const confirmDelete = confirm(`Are you sure you want to delete "${club.name}"? This action cannot be undone.`);
        if (!confirmDelete) return;

        try {
            await this.db.collection('clubs').doc(clubId).delete();

            // Update global settings
            await this.db.collection('global-settings').doc('system').update({
                activeClubs: window.firebase.firestore.FieldValue.arrayRemove(clubId),
                updated_at: new Date()
            });

            // Log the action
            await this.logAuditEvent('SUPER_ADMIN', 'CLUB_DELETED', {
                clubId: clubId,
                clubName: club.name,
                userId: this.currentUser?.uid || 'unknown'
            });

            alert(`✅ Club "${club.name}" deleted successfully!`);

        } catch (error) {
            console.error('SuperAdminManager: Error deleting club:', error);
            alert('❌ Error deleting club: ' + error.message);
        }
    }

    // Log audit events
    async logAuditEvent(userType, action, details = {}) {
        try {
            const auditLog = {
                userType: userType,
                action: action,
                details: details,
                timestamp: new Date(),
                userId: this.currentUser?.uid || 'unknown',
                userEmail: this.currentUser?.email || 'unknown'
            };

            await this.db.collection('audit-logs').add(auditLog);
            console.log(`SuperAdminManager: Audit log created - ${action}`);

        } catch (error) {
            console.error('SuperAdminManager: Error creating audit log:', error);
        }
    }

    // Load super admin data
    async loadSuperAdminData() {
        if (!this.isSuperAdmin) return;

        console.log('SuperAdminManager: Loading super admin data...');

        // Set up real-time listeners
        this.setupRealtimeListeners();

        // Load API status
        await this.loadAPIStatus();
    }

    // Set current user
    setCurrentUser(user) {
        console.log('👑 SuperAdminManager: setCurrentUser called with:', user ? user.uid : 'null');
        this.currentUser = user;
        if (user) {
            console.log('👑 SuperAdminManager: Checking super admin status for user:', user.uid);
            this.checkSuperAdminStatus(user.uid);
        } else {
            console.log('👑 SuperAdminManager: No user, hiding super admin toggle');
            this.isSuperAdmin = false;
            this.hideSuperAdminToggle();

            // Notify AdminManager to refresh admin status
            if (window.losApp?.managers?.admin) {
                window.losApp.managers.admin.refreshAdminStatus();
            }
        }
    }

    // Restore Firebase connection (called by app.js)
    restoreFirebaseConnection() {
        console.log('🔧 SuperAdminManager: restoreFirebaseConnection called');

        if (this.db && typeof this.db.collection === 'function') {
            console.log('✅ SuperAdminManager: Firebase connection already available');
            return;
        }

        if (window.firebaseDB && typeof window.firebaseDB.collection === 'function') {
            console.log('✅ SuperAdminManager: Restoring Firebase connection from global');
            this.db = window.firebaseDB;

            // Load super admin data if user is super admin
            if (this.isSuperAdmin) {
                console.log('👑 SuperAdminManager: User is super admin, loading data...');
                this.loadSuperAdminData();
            } else {
                console.log('👤 SuperAdminManager: User is not super admin yet');
            }
        } else {
            console.log('⚠️ SuperAdminManager: Firebase not ready for connection restoration');
        }
    }

    // Cleanup
    clearListeners() {
        if (this.auditListener) {
            this.auditListener();
            this.auditListener = null;
        }
        if (this.clubsListener) {
            this.clubsListener();
            this.clubsListener = null;
        }
        if (this.usersListener) {
            this.usersListener();
            this.usersListener = null;
        }
    }
}

// Export for global use
window.SuperAdminManager = SuperAdminManager;
