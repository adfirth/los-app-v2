class PickStatusService {
    constructor() {
        this.isInitialized = false;
        this.dataLoaded = false; // Track if data has been loaded
        this.userPicks = {};
        this.pickHistory = [];
        this.db = null;
        
        // Don't auto-initialize - wait for main app to control initialization
        // this.init();
    }

    initBasic() {
        if (this.isInitialized) return;
        
        // Only set up basic structure, don't load data yet
        this.isInitialized = true;
        console.log('PickStatusService basic initialization complete');
    }

    init() {
        if (this.isInitialized && this.dataLoaded) return;
        
        // Set up Firebase database reference
        this.db = window.firebaseDB;
        
        // Load data
        this.loadUserPicks();
        this.loadPickHistory();
        this.dataLoaded = true;
        console.log('PickStatusService full initialization complete');
    }

    restoreFirebaseConnection() {
        // This method will be called by the main app after initialization
        // to restore Firebase functionality
        console.log('PickStatusService Firebase connection restored');
    }

    clearListeners() {
        // Clear any existing Firebase listeners
        console.log('PickStatusService: Clearing listeners...');
        
        // Unregister from the main app's listener tracking if needed
        if (window.losApp) {
            window.losApp.unregisterListener('pickStatus-user');
        }
    }

    async loadUserPicks() {
        console.log('🔍 PickStatusService: loadUserPicks() called');
        try {
            // Ensure Firebase is ready
            if (!window.firebaseReady || !this.db || typeof this.db.collection !== 'function') {
                console.log('PickStatusService: Firebase not ready, retrying in 2 seconds...');
                setTimeout(() => this.loadUserPicks(), 2000);
                return;
            }

            const userId = window.authManager.getCurrentUserId();
            console.log('🔍 PickStatusService: User ID:', userId);
            if (!userId) {
                console.log('🔍 PickStatusService: No user ID, returning early');
                return;
            }

            // Get current club and edition from ClubService
            const currentClubId = window.losApp?.managers?.club?.getCurrentClub();
            const currentEdition = window.losApp?.managers?.club?.getCurrentEdition();
            
            if (!currentClubId || !currentEdition) {
                console.log('⚠️ PickStatusService: No club or edition available for loading picks');
                this.userPicks = {};
                return;
            }
            
            console.log(`🔍 PickStatusService: Fetching picks from /clubs/${currentClubId}/editions/${currentEdition}/picks...`);
            const picksSnapshot = await this.db.collection('clubs').doc(currentClubId)
                .collection('editions').doc(currentEdition)
                .collection('picks')
                .where('userId', '==', userId)
                .orderBy('gameweek')
                .get();
            
            console.log('🔍 PickStatusService: Picks snapshot size:', picksSnapshot.size);
            
            // Convert picks to the expected format and normalize gameweek keys
            this.userPicks = {};
            picksSnapshot.forEach(doc => {
                const pickData = doc.data();
                console.log('🔍 PickStatusService: Processing pick:', pickData);
                
                // Normalize gameweek format to always use 'gw1' format
                let normalizedGameweek = pickData.gameweek;
                if (typeof normalizedGameweek === 'number') {
                    normalizedGameweek = `gw${normalizedGameweek}`;
                } else if (typeof normalizedGameweek === 'string' && !normalizedGameweek.startsWith('gw')) {
                    normalizedGameweek = `gw${normalizedGameweek}`;
                }
                
                console.log('🔍 PickStatusService: Normalized gameweek:', pickData.gameweek, '→', normalizedGameweek);
                
                // If we already have a pick for this gameweek, keep the most recent one
                if (this.userPicks[normalizedGameweek]) {
                    const existingPick = this.userPicks[normalizedGameweek];
                    const existingTime = existingPick.savedAt?.toDate?.() || new Date(existingPick.savedAt);
                    const newTime = pickData.savedAt?.toDate?.() || new Date(pickData.savedAt);
                    
                    if (newTime > existingTime) {
                        console.log('🔍 PickStatusService: Replacing older pick with newer one for', normalizedGameweek);
                        this.userPicks[normalizedGameweek] = {
                            teamPicked: pickData.teamPicked,
                            savedAt: pickData.savedAt,
                            isAutopick: pickData.isAutopick || false,
                            pickId: doc.id
                        };
                    } else {
                        console.log('🔍 PickStatusService: Keeping existing pick for', normalizedGameweek);
                    }
                } else {
                    this.userPicks[normalizedGameweek] = {
                        teamPicked: pickData.teamPicked,
                        savedAt: pickData.savedAt,
                        isAutopick: pickData.isAutopick || false,
                        pickId: doc.id
                    };
                }
            });
            
            console.log('🔍 PickStatusService: Processed user picks:', this.userPicks);
            console.log('🔍 PickStatusService: Calling displayPicks()...');
            this.displayPicks();
            
            // Run migration to clean up old users.picks data
            this.migrateFromUsersPicks();
        } catch (error) {
            // Handle specific Firebase errors
            if (window.handleFirebaseError) {
                window.handleFirebaseError(error, 'PickStatusService-loadUserPicks');
            }
            
            if (error.message && error.message.includes('Target ID already exists')) {
                console.log('Picks loading conflict detected, retrying in 2 seconds...');
                setTimeout(() => this.loadUserPicks(), 2000);
            } else {
                console.error('Error loading user picks:', error);
                this.showError('Failed to load picks');
            }
        }
    }

    async loadPickHistory(retryCount = 0) {
        try {
            const userId = window.authManager.getCurrentUserId();
            
            // Get current club and edition from ClubService
            const currentClubId = window.losApp?.managers?.club?.getCurrentClub();
            const currentEdition = window.losApp?.managers?.club?.getCurrentEdition();
            
            if (!userId || !currentClubId || !currentEdition) return;

            const picksSnapshot = await this.db.collection('clubs').doc(currentClubId)
                .collection('editions').doc(currentEdition)
                .collection('picks')
                .where('userId', '==', userId)
                .orderBy('gameweek')
                .get();

            this.pickHistory = [];
            picksSnapshot.forEach(doc => {
                this.pickHistory.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
        } catch (error) {
            console.error('Error loading pick history:', error);
            
            // Handle Firebase connection errors with retry logic
            if (error.message.includes('Target ID already exists') && retryCount < 2) {
                const delay = Math.min(2000 * Math.pow(2, retryCount), 8000);
                console.log(`Pick history loading conflict detected, retrying in ${delay/1000} seconds... (attempt ${retryCount + 1}/2)`);
                setTimeout(() => {
                    this.loadPickHistory(retryCount + 1);
                }, delay);
                return;
            }
            
            // If we've exhausted retries, try to reset connection
            if (retryCount >= 2 && window.losApp) {
                console.log('Pick history loading failed, attempting connection reset...');
                window.losApp.resetFirebaseConnection();
                return;
            }
        }
    }

    displayUserPicks() {
        const picksList = document.getElementById('picksList');
        if (!picksList) return;

        console.log('🔍 PickStatusService: displayUserPicks() called');
        console.log('🔍 userPicks data:', this.userPicks);
        console.log('🔍 userPicks keys:', Object.keys(this.userPicks));

        // Use userPicks instead of pickHistory since that's where the data is loaded
        if (Object.keys(this.userPicks).length === 0) {
            console.log('🔍 No user picks found, showing empty state');
            this.showEmptyState();
            return;
        }

        picksList.innerHTML = '';

        // Group picks by gameweek
        const picksByGameweek = {};
        Object.entries(this.userPicks).forEach(([gameweek, pick]) => {
            console.log(`🔍 Processing pick for gameweek ${gameweek}:`, pick);
            if (!picksByGameweek[gameweek]) {
                picksByGameweek[gameweek] = [];
            }
            picksByGameweek[gameweek].push(pick);
        });

        console.log('🔍 Grouped picks by gameweek:', picksByGameweek);

        // Display picks for each gameweek
        Object.keys(picksByGameweek).sort().forEach(gameweek => {
            const picks = picksByGameweek[gameweek];
            const pickCard = this.createPickCard(gameweek, picks);
            picksList.appendChild(pickCard);
        });
    }

    createPickCard(gameweek, picks) {
        const card = document.createElement('div');
        card.className = 'pick-card';

        const pick = picks[0]; // Get the first pick for this gameweek
        const result = this.getPickResult(pick);
        const isCurrentGameweek = gameweek === window.editionService.getCurrentGameweek();

        // Clean up gameweek display - remove 'gw' prefix if present
        const cleanGameweek = gameweek.toString().replace(/^gw/i, '');

        card.innerHTML = `
            <div class="pick-header">
                <div class="pick-gameweek">Gameweek ${cleanGameweek}</div>
                <div class="pick-result ${result.status}">
                    ${result.status.toUpperCase()}
                </div>
            </div>
            
            <div class="pick-details">
                <div class="pick-team">${pick.teamPicked || 'No pick made'}</div>
                <div class="pick-score">
                    ${result.score || ''}
                    ${pick.isAutopick ? '<span class="badge warning ml-2">AUTO</span>' : ''}
                </div>
            </div>
            
            ${isCurrentGameweek ? '<div class="text-sm text-muted mt-2">Current gameweek - result pending</div>' : ''}
        `;

        return card;
    }

    getPickResult(pick) {
        if (!pick.teamPicked) {
            return {
                status: 'pending',
                score: 'No pick made'
            };
        }

        // Check if this is an auto-pick
        if (pick.isAutopick) {
            return {
                status: 'auto',
                score: 'Auto-pick assigned'
            };
        }

        // For now, return pending for all picks
        // In a real implementation, this would check against actual fixture results
        return {
            status: 'pending',
            score: 'Result pending'
        };
    }

    showLoadingState() {
        const picksList = document.getElementById('picksList');
        if (picksList) {
            picksList.innerHTML = `
                <div class="empty-state">
                    <div class="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <h3>Loading your picks...</h3>
                </div>
            `;
        }
    }

    showEmptyState() {
        const picksList = document.getElementById('picksList');
        if (picksList) {
            picksList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-list-check"></i>
                    <h3>No Picks Yet</h3>
                    <p>Make your first pick in the Fixtures tab to get started!</p>
                </div>
            `;
        }
    }

    // Migration method to clean up old users.picks data
    async migrateFromUsersPicks() {
        try {
            const userId = window.authManager.getCurrentUserId();
            if (!userId) return;

            console.log('🔧 PickStatusService: Starting migration from users.picks...');
            
            // Get user document to check for old picks data
            const userDoc = await this.db.collection('users').doc(userId).get();
            if (!userDoc.exists) return;
            
            const userData = userDoc.data();
            const oldPicks = userData.picks || {};
            
            if (Object.keys(oldPicks).length === 0) {
                console.log('🔧 PickStatusService: No old picks data to migrate');
                return;
            }
            
            console.log('🔧 PickStatusService: Found old picks data:', oldPicks);
            
            // Check if picks already exist in picks collection
            const existingPicksSnapshot = await this.db.collection('picks')
                .where('userId', '==', userId)
                .where('edition', '==', window.editionService.getCurrentEdition())
                .get();
            
            const existingPicks = {};
            existingPicksSnapshot.forEach(doc => {
                const pickData = doc.data();
                existingPicks[pickData.gameweek] = true;
            });
            
            // Migrate old picks that don't exist in picks collection
            const batch = this.db.batch();
            let migratedCount = 0;
            
            Object.entries(oldPicks).forEach(([gameweek, teamPicked]) => {
                if (!existingPicks[gameweek] && teamPicked) {
                    const pickRef = this.db.collection('picks').doc();
                    batch.set(pickRef, {
                        userId: userId,
                        teamPicked: teamPicked,
                        edition: window.editionService.getCurrentEdition(),
                        gameweek: gameweek,
                        isAutopick: false,
                        savedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    migratedCount++;
                }
            });
            
            if (migratedCount > 0) {
                await batch.commit();
                console.log(`🔧 PickStatusService: Migrated ${migratedCount} picks to picks collection`);
                
                // Remove old picks data from users collection
                await this.db.collection('users').doc(userId).update({
                    picks: firebase.firestore.FieldValue.delete()
                });
                console.log('🔧 PickStatusService: Removed old picks data from users collection');
            }
            
            console.log('🔧 PickStatusService: Migration completed');
            
        } catch (error) {
            console.error('PickStatusService: Migration error:', error);
        }
    }

    showError(message) {
        if (window.authManager && window.authManager.showError) {
            window.authManager.showError(message);
        } else {
            console.error(message);
        }
    }

    displayPicks() {
        console.log('🔍 PickStatusService: displayPicks() called');
        const picksList = document.getElementById('picksList');
        if (!picksList) {
            console.log('🔍 PickStatusService: picksList element not found');
            return;
        }

        console.log('🔍 PickStatusService: userPicks:', this.userPicks);
        console.log('🔍 PickStatusService: userPicks keys:', Object.keys(this.userPicks));

        if (Object.keys(this.userPicks).length === 0) {
            console.log('🔍 PickStatusService: No user picks, showing empty state');
            picksList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-list-check"></i>
                    <p>No picks made yet for this edition.</p>
                </div>
            `;
            return;
        }

        console.log('🔍 PickStatusService: Creating picks HTML...');
        const picksHTML = Object.entries(this.userPicks).map(([gameweek, pick]) => {
            console.log(`🔍 PickStatusService: Processing pick for gameweek ${gameweek}:`, pick);
            
            // New format: "gw1": { teamPicked: "Liverpool", isAutopick: false, savedAt: timestamp }
            const teamName = pick.teamPicked || 'No pick made';
            const isAutopick = pick.isAutopick || false;
            const savedAt = pick.savedAt;
            
            // Clean up gameweek display - remove 'gw' prefix if present
            const cleanGameweek = gameweek.toString().replace(/^gw/i, '');
            
            // Handle date formatting properly with debugging - London timezone
            let formattedDate = 'Unknown';
            if (savedAt) {
                console.log('🔍 PickStatusService: Processing savedAt:', savedAt, 'Type:', typeof savedAt);
                try {
                    // Handle Firestore timestamp objects
                    let dateToFormat = savedAt;
                    if (savedAt.toDate && typeof savedAt.toDate === 'function') {
                        // It's a Firestore timestamp
                        console.log('🔍 PickStatusService: Converting Firestore timestamp');
                        dateToFormat = savedAt.toDate();
                    } else if (savedAt.seconds) {
                        // It's a Firestore timestamp with seconds
                        console.log('🔍 PickStatusService: Converting Firestore timestamp with seconds');
                        dateToFormat = new Date(savedAt.seconds * 1000);
                    } else {
                        // It's a regular date string or timestamp
                        console.log('🔍 PickStatusService: Converting regular date');
                        dateToFormat = new Date(savedAt);
                    }
                    
                    console.log('🔍 PickStatusService: Date to format:', dateToFormat);
                    
                    // Check if the date is valid
                    if (!isNaN(dateToFormat.getTime())) {
                        // Format in London timezone (Europe/London)
                        formattedDate = dateToFormat.toLocaleDateString('en-GB', {
                            timeZone: 'Europe/London',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        });
                        
                        // Add time in London timezone
                        const timeString = dateToFormat.toLocaleTimeString('en-GB', {
                            timeZone: 'Europe/London',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        });
                        
                        formattedDate = `${formattedDate} ${timeString}`;
                        console.log('🔍 PickStatusService: Formatted date (London):', formattedDate);
                    } else {
                        console.log('🔍 PickStatusService: Invalid date result');
                    }
                } catch (error) {
                    console.error('🔍 PickStatusService: Error formatting date:', error, savedAt);
                }
            } else {
                console.log('🔍 PickStatusService: No savedAt value');
            }
            
            return `
            <div class="pick-item">
                <div class="pick-header">
                    <span class="gameweek">Gameweek ${cleanGameweek}</span>
                    <span class="pick-date">${formattedDate}</span>
                </div>
                <div class="pick-details">
                    ${this.createTeamWithBadgeHTML(teamName, 'small', 'team-picked')}
                    <span class="pick-status ${isAutopick ? 'autopick' : 'manual'}">
                        ${isAutopick ? 'Auto-pick' : 'Manual pick'}
                    </span>
                </div>
            </div>
        `;
        }).join('');

        console.log('🔍 PickStatusService: Setting picks HTML:', picksHTML);
        picksList.innerHTML = picksHTML;
        console.log('🔍 PickStatusService: displayPicks() completed');
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

    // Getter methods
    getUserPicks() {
        return this.userPicks;
    }

    getPickHistory() {
        return this.pickHistory;
    }

    getCurrentGameweekPick() {
        const currentGameweek = window.editionService.getCurrentGameweek();
        return this.userPicks[`gw${currentGameweek}`];
    }

    hasPickedForGameweek(gameweek) {
        const pick = this.userPicks[`gw${gameweek}`];
        if (typeof pick === 'string') {
            // Old format: direct string
            return pick !== undefined;
        } else if (pick && pick.teamPicked) {
            // New format: object with teamPicked property
            return true;
        }
        return false;
    }

    getTeamPickCount(teamName) {
        return Object.values(this.userPicks).filter(pick => {
            if (typeof pick === 'string') {
                // Old format: direct string
                return pick === teamName;
            } else if (pick && pick.teamPicked) {
                // New format: object with teamPicked property
                return pick.teamPicked === teamName;
            }
            return false;
        }).length;
    }

    getAvailableTeamsForGameweek(gameweek) {
        // This would need to be implemented based on fixtures
        // For now, return empty array
        return [];
    }

    // Utility methods
    isTeamAvailable(teamName, gameweek) {
        const previousGameweek = parseInt(gameweek) - 1;
        if (previousGameweek < 1) return true;
        
        // Check if team was picked in previous gameweek (handle both old and new formats)
        const previousPick = this.userPicks[`gw${previousGameweek}`];
        if (typeof previousPick === 'string') {
            // Old format: direct string
            return previousPick !== teamName;
        } else if (previousPick && previousPick.teamPicked) {
            // New format: object with teamPicked property
            return previousPick.teamPicked !== teamName;
        }
        
        return true;
    }

    getPickStatistics() {
        const stats = {
            totalPicks: Object.keys(this.userPicks).length,
            teamsPicked: {},
            gameweekProgress: {},
            autoPicks: 0
        };

        // Count teams picked
        Object.values(this.userPicks).forEach(team => {
            stats.teamsPicked[team] = (stats.teamsPicked[team] || 0) + 1;
        });

        // Count picks by gameweek
        Object.keys(this.userPicks).forEach(gameweek => {
            stats.gameweekProgress[gameweek] = 1;
        });

        // Count auto picks
        this.pickHistory.forEach(pick => {
            if (pick.isAutopick) {
                stats.autoPicks++;
            }
        });

        return stats;
    }

    // Admin methods for managing picks
    async updateUserPick(userId, gameweek, teamName) {
        try {
            // Get current club and edition from ClubService
            const currentClubId = window.losApp?.managers?.club?.getCurrentClub();
            const currentEdition = window.losApp?.managers?.club?.getCurrentEdition();
            
            if (!currentClubId || !currentEdition) {
                throw new Error('No club or edition available for updating pick');
            }

            // Create pick record in the new multi-club structure
            await this.db.collection('clubs').doc(currentClubId)
                .collection('editions').doc(currentEdition)
                .collection('picks').add({
                    userId: userId,
                    teamPicked: teamName,
                    gameweek: gameweek,
                    fixtureId: null,
                    isAutopick: false,
                    result: null,
                    livesAfterPick: null,
                    savedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    processedAt: null,
                    created_at: firebase.firestore.FieldValue.serverTimestamp(),
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });

            return true;
        } catch (error) {
            console.error('Error updating user pick:', error);
            throw error;
        }
    }

    async deleteUserPick(userId, gameweek) {
        try {
            // Remove pick from user document
            await this.db.collection('users').doc(userId).update({
                [`picks.gw${gameweek}`]: firebase.firestore.FieldValue.delete(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Delete pick records from analytics
            const picksSnapshot = await this.db.collection('picks')
                .where('userId', '==', userId)
                .where('gameweek', '==', gameweek)
                .where('edition', '==', window.editionService.getCurrentEdition())
                .get();

            const batch = this.db.batch();
            picksSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            return true;
        } catch (error) {
            console.error('Error deleting user pick:', error);
            throw error;
        }
    }

    async assignAutoPick(userId, gameweek) {
        try {
            const currentEdition = window.editionService.getCurrentEdition();
            
            // Get available teams for this gameweek
            const fixturesDoc = await this.db.collection('fixtures')
                .doc(`${currentEdition}_gw${gameweek}`)
                .get();
            
            if (!fixturesDoc.exists) {
                throw new Error('No fixtures found for this gameweek');
            }
            
            const fixturesData = fixturesDoc.data();
            const fixtures = fixturesData.fixtures || [];
            
            // Get all available teams
            const availableTeams = [];
            fixtures.forEach(fixture => {
                availableTeams.push(fixture.homeTeam, fixture.awayTeam);
            });
            
            // Get user's previous picks
            const userDoc = await this.db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            const userPicks = userData.picks || {};
            
            // Assign auto-pick
            const autoPick = this.getAutoPick(userPicks, availableTeams, gameweek);
            
            if (autoPick) {
                await this.updateUserPick(userId, gameweek, autoPick);
                
                // Mark as auto-pick in analytics
                const picksSnapshot = await this.db.collection('picks')
                    .where('userId', '==', userId)
                    .where('gameweek', '==', gameweek)
                    .where('edition', '==', currentEdition)
                    .limit(1)
                    .get();
                
                if (!picksSnapshot.empty) {
                    await picksSnapshot.docs[0].ref.update({
                        isAutopick: true
                    });
                }
            }
            
            return autoPick;
        } catch (error) {
            console.error('Error assigning auto-pick:', error);
            throw error;
        }
    }

    getAutoPick(userPicks, availableTeams, gameweek) {
        if (gameweek === '1') {
            // For first gameweek, pick randomly from available teams
            const randomIndex = Math.floor(Math.random() * availableTeams.length);
            return availableTeams[randomIndex];
        } else {
            // For subsequent gameweeks, pick next team alphabetically after previous pick
            const previousGameweek = parseInt(gameweek) - 1;
            const previousPick = userPicks[`gw${previousGameweek}`];
            
            if (!previousPick) {
                // If no previous pick, pick first team alphabetically
                return availableTeams.sort()[0];
            }
            
            // Find teams that come after the previous pick alphabetically
            const sortedTeams = availableTeams.sort();
            const previousPickIndex = sortedTeams.indexOf(previousPick);
            
            if (previousPickIndex === -1 || previousPickIndex === sortedTeams.length - 1) {
                // If previous pick not found or was last, pick first team
                return sortedTeams[0];
            } else {
                // Pick next team after previous pick
                return sortedTeams[previousPickIndex + 1];
            }
        }
    }
}

// Initialize PickStatusService when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pickStatusService = new PickStatusService();
});
