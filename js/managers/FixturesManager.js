export default class FixturesManager {
    constructor() {
        this.currentFixtures = [];
        this.userPicks = {};
        this.deadlinePassed = false;
        this.isInitialized = false;
        this.dataLoaded = false;

        // Don't auto-initialize - wait for main app to control initialization
        // this.init();
    }

    initBasic() {
        // initBasic() called

        if (this.isInitialized) {
            console.log('⚠️ FixturesManager already initialized, skipping initBasic()');
            return;
        }

        // Setting up basic structure...
        this.setupPickModal();

        this.isInitialized = true;

        // Listen for deadline events to update UI state immediately
        window.addEventListener('deadlineExpired', (event) => {
            console.log(`FixturesManager: Received deadlineExpired event for gameweek ${event.detail.gameweek}`);
            if (window.editionService && window.editionService.getCurrentGameweek() == event.detail.gameweek) {
                this.checkDeadline();
                this.displayFixtures();
            }
        });

        // Basic initialization complete
    }

    init() {
        if (this.isInitialized && this.dataLoaded) return;

        // Set up Firebase database reference
        this.db = window.firebaseDB;
        // Database reference set

        // Load initial data
        this.loadFixtures();
        this.dataLoaded = true;

    }

    restoreFirebaseConnection() {
        // This method will be called by the main app after initialization
        // to restore Firebase functionality
        this.loadFixturesRetryCount = 0;

    }

    async loadFixtures() {
        try {
            this.showLoadingState();

            // Ensure Firebase is ready
            if (!window.firebaseReady || !this.db || typeof this.db.collection !== 'function') {
                console.log(`FixturesManager: Firebase not ready, retrying in 2 seconds...`);

                // Try to update our database reference if Firebase is ready but we don't have it
                if (window.firebaseReady && window.firebaseDB && !this.db) {
                    this.db = window.firebaseDB;
                }

                setTimeout(() => this.loadFixtures(), 2000);
                return;
            }

            // Ensure EditionService is available to get current context
            if (!window.editionService) {
                console.log('FixturesManager: EditionService not ready, retrying in 2 seconds...');
                setTimeout(() => this.loadFixtures(), 2000);
                return;
            }

            // Get data from EditionService and ClubService
            const currentGameweek = window.editionService.getCurrentGameweek();
            const currentEdition = window.editionService.getCurrentEdition();
            const currentClub = window.losApp?.managers?.club?.getCurrentClub();

            if (!currentClub || !currentEdition) {
                console.warn('FixturesManager: Club or Edition not available, skipping load');
                this.showEmptyState();
                return;
            }

            // Log which edition/gameweek we're loading
            console.log(`FixturesManager: Loading fixtures for Club: ${currentClub}, Edition: ${currentEdition}, GW: ${currentGameweek}`);

            // Fetch fixtures from the new nested collection structure
            // Path: clubs/{clubId}/editions/{editionId}/fixtures
            const fixturesSnapshot = await this.db.collection('clubs').doc(currentClub)
                .collection('editions').doc(currentEdition)
                .collection('fixtures')
                .where('gameWeek', '==', parseInt(currentGameweek)) // Ensure gameweek is a number or matches DB format
                .get();

            this.currentFixtures = [];
            if (!fixturesSnapshot.empty) {
                fixturesSnapshot.forEach(doc => {
                    const data = doc.data();
                    this.currentFixtures.push({
                        id: doc.id,
                        ...data
                    });
                });
                console.log(`FixturesManager: Loaded ${this.currentFixtures.length} fixtures`);

                // If we found fixtures, verify deadline from settings
                await this.checkDeadline();
                this.displayFixtures();
            } else {
                console.log(`FixturesManager: No fixtures found for GW${currentGameweek}`);

                // Fallback: Check if we are in "admin mode" or if we should show sample data
                // For now, just show empty state
                this.currentFixtures = [];
                this.displayFixtures();
            }

            // Also load user picks to show status
            await this.loadUserPicks();

        } catch (error) {
            console.error('Error loading fixtures:', error);
            if (window.authManager) {
                window.authManager.showError('Failed to load fixtures');
            }
            this.showEmptyState();
        }
    }

    async checkDeadline() {
        try {
            // Use DeadlineService as source of truth if available
            if (window.losApp?.managers?.deadline) {
                // If the deadline service has already calculated the status, use it
                if (window.losApp.managers.deadline.deadlinePassed !== undefined) {
                    this.deadlinePassed = window.losApp.managers.deadline.deadlinePassed;
                    console.log(`FixturesManager: Synced deadline status from DeadlineService: ${this.deadlinePassed}`);
                    return;
                }

                // Triger a check if needed
                await window.losApp.managers.deadline.checkDeadlines();
                this.deadlinePassed = window.losApp.managers.deadline.deadlinePassed;
                console.log(`FixturesManager: Checked deadline via DeadlineService: ${this.deadlinePassed}`);
                return;
            }

            // Fallback to settings if DeadlineService not available (shouldn't happen in normal flow)
            if (window.editionService) {
                const settings = window.editionService.getSettings();
                if (settings && settings.gameweekDeadline) {
                    const deadline = new Date(settings.gameweekDeadline);
                    const now = new Date();
                    this.deadlinePassed = now > deadline;
                    console.log(`Deadline check (fallback): ${deadline.toISOString()}, Passed: ${this.deadlinePassed}`);
                }
            }
        } catch (error) {
            console.error('Error checking deadline:', error);
        }
    }

    async loadUserPicks() {
        try {
            // Only proceed if user is logged in
            if (!window.authManager || !window.authManager.getCurrentUser()) {
                console.log('User not logged in, skipping loadUserPicks');
                return;
            }

            const userId = window.authManager.getCurrentUserId();
            const currentEdition = window.editionService.getCurrentEdition();

            // Try to get picks from the new structure: clubs/{clubId}/editions/{editionId}/picks
            // We need to know the user's club for this edition

            // First check if ClubService has the info
            let clubId = null;
            if (window.losApp?.managers?.club) {
                clubId = window.losApp.managers.club.getCurrentClub();
            }

            // If we have clubId and editionId, query correctly
            if (clubId && currentEdition) {
                console.log(`Loading picks for user ${userId} in club ${clubId}, edition ${currentEdition}`);

                const picksSnapshot = await this.db.collection('clubs').doc(clubId)
                    .collection('editions').doc(currentEdition)
                    .collection('picks')
                    .where('userId', '==', userId)
                    .get();

                this.userPicks = {};
                if (!picksSnapshot.empty) {
                    picksSnapshot.forEach(doc => {
                        const pick = doc.data();
                        // Support both old string format and new object format
                        const gameweekKey = `gw${pick.gameweek}`;
                        this.userPicks[gameweekKey] = pick;
                    });
                    console.log('Loaded user picks:', Object.keys(this.userPicks).length);
                }
            } else {
                console.log('Missing club or edition info, cannot load picks reliably');
            }

            // Refresh display to show picked status
            this.displayFixtures();

        } catch (error) {
            console.error('Error loading user picks:', error);
        }
    }

    displayFixtures() {
        const fixturesList = document.getElementById('fixturesList');
        if (!fixturesList) return;

        if (!this.currentFixtures || this.currentFixtures.length === 0) {
            this.showEmptyState();
            return;
        }

        // Use TeamBadgeService if available to preload badges
        if (window.losApp?.teamBadgeService) {
            const teams = new Set();
            this.currentFixtures.forEach(fixture => {
                teams.add(fixture.homeTeam);
                teams.add(fixture.awayTeam);
            });
            // Preload badges for smoother rendering
            Array.from(teams).forEach(team => window.losApp.teamBadgeService.getTeamBadge(team));
        }

        let html = '';
        const currentGameweek = window.editionService.getCurrentGameweek();
        const userPickedTeam = this.isTeamPickedInCurrentGameweek(); // Check if ANY team is picked

        // Group fixtures by date
        const groupedFixtures = this.groupFixturesByDate(this.currentFixtures);

        // Generate HTML for each date group
        Object.keys(groupedFixtures).sort().forEach(date => {
            const fixtures = groupedFixtures[date];
            const formattedDate = this.formatFixtureDate(date);

            html += `
                <div class="fixture-date-group">
                    <h4 class="date-header">${formattedDate}</h4>
                    <div class="fixtures-grid">
            `;

            fixtures.forEach((fixture, index) => {
                const homeTeamPicked = this.isTeamPicked(fixture.homeTeam);
                const awayTeamPicked = this.isTeamPicked(fixture.awayTeam);

                // Check if teams were picked in previous gameweeks (unavailable)
                const homeTeamUsed = this.isTeamPickedInOtherGameweek(fixture.homeTeam);
                const awayTeamUsed = this.isTeamPickedInOtherGameweek(fixture.awayTeam);

                // Determine button states
                const homeButtonState = this.getButtonState(fixture.homeTeam, homeTeamPicked, homeTeamUsed, userPickedTeam);
                const awayButtonState = this.getButtonState(fixture.awayTeam, awayTeamPicked, awayTeamUsed, userPickedTeam);

                // Get time or result
                const timeOrResult = fixture.status === 'FINISHED'
                    ? `<span class="score">${fixture.homeScore} - ${fixture.awayScore}</span>`
                    : `<span class="time">${fixture.time}</span>`;

                // Get badge URLs (using service or fallback)
                let homeBadge = 'assets/badges/default.png';
                let awayBadge = 'assets/badges/default.png';

                if (window.losApp?.teamBadgeService) {
                    // Try to get cached badge, revert to default if not ready (preload should handle it)
                    const homeCached = window.losApp.teamBadgeService.getCachedBadge(fixture.homeTeam);
                    const awayCached = window.losApp.teamBadgeService.getCachedBadge(fixture.awayTeam);

                    if (homeCached) homeBadge = homeCached;
                    if (awayCached) awayBadge = awayCached;
                }

                html += `
                    <div class="fixture-card ${fixture.status === 'FINISHED' ? 'finished' : ''}">
                        <div class="team home">
                            <img src="${homeBadge}" alt="${fixture.homeTeam}" class="team-badge" onerror="this.src='assets/badges/default.png'">
                            <span class="team-name">${fixture.homeTeam}</span>
                            ${this.renderPickButton(fixture.homeTeam, homeButtonState, index, 'home')}
                        </div>
                        
                        <div class="fixture-info">
                            ${timeOrResult}
                            <span class="status ${fixture.status.toLowerCase()}">${fixture.status}</span>
                        </div>
                        
                        <div class="team away">
                            <span class="team-name">${fixture.awayTeam}</span>
                            <img src="${awayBadge}" alt="${fixture.awayTeam}" class="team-badge" onerror="this.src='assets/badges/default.png'">
                            ${this.renderPickButton(fixture.awayTeam, awayButtonState, index, 'away')}
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        fixturesList.innerHTML = html;

        // Add event listeners to pick buttons
        this.addPickListeners();
    }

    groupFixturesByDate(fixtures) {
        const groups = {};
        fixtures.forEach(fixture => {
            // Assuming date is in format YYYY-MM-DD
            if (!groups[fixture.date]) {
                groups[fixture.date] = [];
            }
            groups[fixture.date].push(fixture);
        });
        return groups;
    }

    formatFixtureDate(dateString) {
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        return new Date(dateString).toLocaleDateString('en-GB', options);
    }

    getButtonState(teamName, isPickedCurrently, isUsed, isAnyPicked) {
        if (isPickedCurrently) return 'picked'; // Always show if picked, even if deadline passed
        if (this.deadlinePassed) return 'locked';
        if (isUsed) return 'unavailable'; // Picked in previous week
        if (isAnyPicked) return 'disabled'; // Another team is picked this week
        return 'available';
    }

    renderPickButton(teamName, state, index, type) {
        let btnClass = '';
        let btnText = '';
        let disabled = '';

        switch (state) {
            case 'picked':
                btnClass = 'btn-picked';
                btnText = '<i class="fas fa-check"></i> Picked';
                if (this.deadlinePassed) disabled = 'disabled';
                break;
            case 'unavailable':
                btnClass = 'btn-unavailable';
                btnText = '<i class="fas fa-ban"></i> Used';
                disabled = 'disabled';
                break;
            case 'locked':
                btnClass = 'btn-locked';
                btnText = '<i class="fas fa-lock"></i> Locked';
                disabled = 'disabled';
                break;
            case 'disabled':
                btnClass = 'btn-disabled';
                btnText = 'Pick';
                // Not actually disabled attribute, but styled as disabled
                // We allow clicking to switch pick? Or maybe restrict?
                // Let's allow switching for now
                break;
            case 'available':
            default:
                btnClass = 'btn-pick';
                btnText = 'Pick';
                break;
        }

        // Add data attributes for click handler
        return `
            <button class="pick-btn ${btnClass}" 
                data-team="${teamName}" 
                data-index="${index}" 
                data-type="${type}"
                ${disabled}>
                ${btnText}
            </button>
        `;
    }

    addPickListeners() {
        const buttons = document.querySelectorAll('.pick-btn');
        buttons.forEach(btn => {
            if (!btn.disabled && !btn.classList.contains('btn-picked') && !btn.classList.contains('btn-unavailable')) {
                btn.addEventListener('click', (e) => {
                    const teamName = btn.getAttribute('data-team');
                    const fixtureIndex = btn.getAttribute('data-index');
                    this.handlePickSelection(teamName, fixtureIndex);
                });
            }
        });
    }

    isTeamPicked(teamName) {
        // Check all gameweeks to see if this team was picked
        for (const [gameweekKey, pick] of Object.entries(this.userPicks)) {
            if (typeof pick === 'string') {
                // Old format: direct string
                if (pick === teamName) {
                    return true;
                }
            } else if (pick && pick.teamPicked) {
                // New format: object with teamPicked property
                if (pick.teamPicked === teamName) {
                    return true;
                }
            }
        }

        return false;
    }

    isTeamPickedInCurrentGameweek(teamName) {
        // Ensure userPicks is initialized
        if (!this.userPicks) {
            this.userPicks = {};
        }

        const currentGameweek = window.editionService.getCurrentGameweek();
        const currentPick = this.userPicks[`gw${currentGameweek}`];

        // If teamName is provided, check if THAT team is picked
        if (teamName) {
            if (typeof currentPick === 'string') {
                return currentPick === teamName;
            } else if (currentPick && currentPick.teamPicked) {
                return currentPick.teamPicked === teamName;
            }
            return false;
        }

        // If no teamName provided, check if ANY team is picked
        return !!currentPick;
    }

    isTeamPickedInOtherGameweek(teamName) {
        // Ensure userPicks is initialized
        if (!this.userPicks) {
            this.userPicks = {};
        }

        const currentGameweek = window.editionService.getCurrentGameweek();

        // Check all gameweeks except current to see if this team was picked
        for (const [gameweekKey, pick] of Object.entries(this.userPicks)) {
            // Skip current gameweek
            if (gameweekKey === `gw${currentGameweek}`) {
                continue;
            }

            if (typeof pick === 'string') {
                // Old format: direct string
                if (pick === teamName) {
                    return true;
                }
            } else if (pick && pick.teamPicked) {
                // New format: object with teamPicked property
                if (pick.teamPicked === teamName) {
                    return true;
                }
            }
        }

        return false;
    }

    handlePickSelection(teamName, fixtureIndex) {
        if (this.deadlinePassed) {
            window.authManager.showWarning('Deadline has passed. Picks are locked.');
            return;
        }

        // Ensure userPicks is initialized
        if (!this.userPicks) {
            this.userPicks = {};
        }

        const currentGameweek = window.editionService.getCurrentGameweek();
        const currentPick = this.userPicks[`gw${currentGameweek}`];

        // Check if team is already picked (should be handled by button state, but double check)
        if (this.isTeamPickedInCurrentGameweek(teamName)) {
            window.authManager.showInfo('You have already picked this team.');
            return;
        }

        // Show confirmation modal
        this.showPickConfirmation(teamName);
    }

    showPickConfirmation(teamName) {
        const modal = document.getElementById('pickModal');
        const teamNameElement = document.getElementById('pickTeamName');

        if (modal && teamNameElement) {
            teamNameElement.textContent = teamName;
            modal.classList.remove('hidden');
        }
    }

    setupPickModal() {
        const modal = document.getElementById('pickModal');
        const confirmBtn = document.getElementById('confirmPick');
        const cancelBtn = document.getElementById('cancelPick');
        const closeBtn = document.querySelector('.modal-close');

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.confirmPick();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hidePickModal();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hidePickModal();
            });
        }

        // Close modal when clicking outside
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hidePickModal();
                }
            });
        }
    }

    async confirmPick() {
        const teamName = document.getElementById('pickTeamName').textContent;
        const currentGameweek = window.editionService.getCurrentGameweek();
        const userId = window.authManager.getCurrentUserId();

        // Get current club and edition from ClubService
        const currentClubId = window.losApp?.managers?.club?.getCurrentClub();
        const currentEdition = window.losApp?.managers?.club?.getCurrentEdition();

        if (!currentClubId || !currentEdition) {
            window.authManager.showError('Unable to save pick - club/edition not available');
            return;
        }

        try {
            // Create pick record in the new multi-club structure
            await this.db.collection('clubs').doc(currentClubId)
                .collection('editions').doc(currentEdition)
                .collection('picks').add({
                    userId: userId,
                    teamPicked: teamName,
                    gameweek: currentGameweek,
                    fixtureId: null, // Will be updated when fixtures are processed
                    isAutopick: false,
                    result: null,
                    livesAfterPick: null, // Will be updated when processed
                    savedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    processedAt: null,
                    created_at: firebase.firestore.FieldValue.serverTimestamp(),
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });

            // Update local state to match picks collection format
            this.userPicks[`gw${currentGameweek}`] = {
                teamPicked: teamName,
                savedAt: new Date(),
                isAutopick: false
            };



            // Hide modal first
            this.hidePickModal();

            // Refresh display with updated local state
            this.displayFixtures();

            // Refresh pick history display if PickStatusService is available
            if (window.losApp?.managers?.pickStatus) {
                window.losApp.managers.pickStatus.loadUserPicks();
                window.losApp.managers.pickStatus.displayUserPicks();
            }

            window.authManager.showSuccess(`Successfully picked ${teamName}!`);

        } catch (error) {
            console.error('Error saving pick:', error);
            window.authManager.showError('Failed to save pick. Please try again.');
        }
    }

    hidePickModal() {
        const modal = document.getElementById('pickModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    showLoadingState() {
        const fixturesList = document.getElementById('fixturesList');
        if (fixturesList) {
            fixturesList.innerHTML = `
                <div class="empty-state">
                    <div class="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <h3>Loading fixtures...</h3>
                </div>
            `;
        }
    }

    showEmptyState() {
        const fixturesList = document.getElementById('fixturesList');
        if (fixturesList) {
            fixturesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>No fixtures available for this gameweek.</p>
                </div>
            `;
        }
    }

    showError(message) {
        if (window.authManager && window.authManager.showError) {
            window.authManager.showError(message);
        } else {
            console.error(message);
        }
    }

    // Getter methods
    getCurrentFixtures() {
        return this.currentFixtures;
    }

    getUserPicks() {
        return this.userPicks;
    }

    isDeadlinePassed() {
        return this.deadlinePassed;
    }

    // Admin methods for managing fixtures
    async addFixture(fixtureData) {
        try {
            const currentGameweek = window.editionService.getCurrentGameweek();
            const currentEdition = window.editionService.getCurrentEdition();

            const fixturesRef = this.db.collection('fixtures').doc(`${currentEdition}_gw${currentGameweek}`);

            await fixturesRef.update({
                fixtures: firebase.firestore.FieldValue.arrayUnion(fixtureData)
            });

            // Refresh fixtures
            await this.loadFixtures();

            return true;
        } catch (error) {
            console.error('Error adding fixture:', error);
            throw error;
        }
    }

    async updateFixture(fixtureIndex, updatedFixture) {
        try {
            const currentGameweek = window.editionService.getCurrentGameweek();
            const currentEdition = window.editionService.getCurrentEdition();

            const fixturesRef = this.db.collection('fixtures').doc(`${currentEdition}_gw${currentGameweek}`);
            const fixturesDoc = await fixturesRef.get();

            if (fixturesDoc.exists) {
                const fixturesData = fixturesDoc.data();
                const fixtures = fixturesData.fixtures || [];

                fixtures[fixtureIndex] = updatedFixture;

                await fixturesRef.update({
                    fixtures: fixtures
                });

                // Refresh fixtures
                await this.loadFixtures();
            }

            return true;
        } catch (error) {
            console.error('Error updating fixture:', error);
            throw error;
        }
    }

    async deleteFixture(fixtureIndex) {
        try {
            const currentGameweek = window.editionService.getCurrentGameweek();
            const currentEdition = window.editionService.getCurrentEdition();

            const fixturesRef = this.db.collection('fixtures').doc(`${currentEdition}_gw${currentGameweek}`);
            const fixturesDoc = await fixturesRef.get();

            if (fixturesDoc.exists) {
                const fixturesData = fixturesDoc.data();
                const fixtures = fixturesData.fixtures || [];

                fixtures.splice(fixtureIndex, 1);

                await fixturesRef.update({
                    fixtures: fixtures
                });

                // Refresh fixtures
                await this.loadFixtures();
            }

            return true;
        } catch (error) {
            console.error('Error deleting fixture:', error);
            throw error;
        }

    }

    async cleanupSampleFixtures(edition, gameweek) {
        try {
            const fixturesRef = this.db.collection('fixtures').doc(`${edition}_gw${gameweek}`);
            const fixturesDoc = await fixturesRef.get();

            if (fixturesDoc.exists) {
                await fixturesRef.delete();
            }
        } catch (error) {
            console.error('Error cleaning up sample fixtures:', error);
        }
    }

    /**
     * Get the gameweek number where a team was picked
     * @param {string} teamName - The name of the team
     * @returns {number|null} - The gameweek number where the team was picked, or null if not found
     */
    getTeamPickGameweek(teamName) {
        // Ensure userPicks is initialized
        if (!this.userPicks) {
            return null;
        }

        // Check all gameweeks to see where this team was picked
        for (const [gameweekKey, pick] of Object.entries(this.userPicks)) {
            if (typeof pick === 'string') {
                // Old format: direct string
                if (pick === teamName) {
                    // Extract gameweek number from key (e.g., "gw1" -> 1)
                    return parseInt(gameweekKey.replace('gw', ''));
                }
            } else if (pick && pick.teamPicked) {
                // New format: object with teamPicked property
                if (pick.teamPicked === teamName) {
                    // Extract gameweek number from key (e.g., "gw1" -> 1)
                    return parseInt(gameweekKey.replace('gw', ''));
                }
            }
        }

        return null;
    }
}
