class GameLogicManager {
    constructor() {
        this.isInitialized = false;
        this.dataLoaded = false; // Track if data has been loaded
        this.standings = [];
        this.db = null;
        
        // Don't auto-initialize - wait for main app to control initialization
        // this.init();
    }

    initBasic() {
        if (this.isInitialized) return;
        
        // Only set up basic structure, don't load data yet
        this.isInitialized = true;
        console.log('GameLogicManager basic initialization complete');
    }

    init() {
        if (this.isInitialized && this.dataLoaded) return;
        
        // Set up Firebase database reference
        this.db = window.firebaseDB;
        
        // Load data and set up real-time listeners
        this.loadStandings();
        this.setupRealtimeListeners();
        this.dataLoaded = true;
        console.log('GameLogicManager full initialization complete');
    }

    restoreFirebaseConnection() {
        // This method will be called by the main app after initialization
        // to restore Firebase functionality
        console.log('GameLogicManager Firebase connection restored');
        
        // Don't set up real-time listeners here - they will be set up by the main app
        // after Firebase is fully ready to prevent connection conflicts
    }

    clearListeners() {
        console.log('GameLogicManager: Clearing listeners...');
        
        if (this.usersListener) {
            this.usersListener();
            this.usersListener = null;
            console.log('GameLogicManager: Users listener cleared');
        }
        
        // Unregister from the main app's listener tracking
        if (window.losApp) {
            window.losApp.unregisterListener('gameLogic-users');
        }
    }

    setupRealtimeListeners() {
        // Ensure Firebase is ready
        if (!window.firebaseReady || !this.db || typeof this.db.collection !== 'function') {
            console.log('GameLogicManager: Firebase not ready for real-time listeners, retrying in 2 seconds...');
            setTimeout(() => this.setupRealtimeListeners(), 2000);
            return;
        }

        // Check if listener is already registered to prevent conflicts
        const listenerId = 'gameLogic-users';
        if (window.losApp && !window.losApp.registerListener(listenerId, 'users')) {
            console.log('GameLogicManager: Users listener already registered, skipping...');
            return;
        }

        try {
            // Listen for user updates to refresh standings
            const currentEdition = window.editionService.getCurrentEdition();
            
            this.usersListener = this.db.collection('users')
                .where('edition', '==', currentEdition)
                .onSnapshot((snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'modified' || change.type === 'removed') {
                            // Refresh standings when user data changes
                            this.loadStandings();
                        }
                    });
                }, (error) => {
                    console.error('GameLogicManager: Users listener error:', error);
                    // Handle specific Firebase errors
                    if (window.handleFirebaseError) {
                        window.handleFirebaseError(error, 'GameLogicManager-users');
                    }
                    
                    // If it's a "Target ID already exists" error, clear and retry
                    if (error.message && error.message.includes('Target ID already exists')) {
                        console.log('GameLogicManager: Target ID conflict detected, clearing and retrying...');
                        this.clearListeners();
                        setTimeout(() => this.setupRealtimeListeners(), 1000);
                    }
                });
                
            console.log('GameLogicManager: Users real-time listener established');
        } catch (error) {
            console.error('GameLogicManager: Error setting up real-time listeners:', error);
            if (window.handleFirebaseError) {
                window.handleFirebaseError(error, 'GameLogicManager-setup');
            }
        }
    }

    async loadStandings() {
        try {
            console.log('🔍 GameLogicManager: Starting to load standings...');
            
            // Ensure Firebase is ready
            if (!window.firebaseReady || !this.db || typeof this.db.collection !== 'function') {
                console.log('GameLogicManager: Firebase not ready, retrying in 2 seconds...');
                
                // Try to update our database reference if Firebase is ready but we don't have it
                if (window.firebaseReady && window.firebaseDB && !this.db) {
                    console.log('GameLogicManager: Updating database reference from global Firebase...');
                    this.db = window.firebaseDB;
                }
                
                setTimeout(() => this.loadStandings(), 2000);
                return;
            }

            const currentEdition = window.editionService.getCurrentEdition();
            console.log('🔍 GameLogicManager: Current edition:', currentEdition);
            
            // Get all users for current edition
            const usersSnapshot = await this.db.collection('users')
                .where('edition', '==', currentEdition)
                .get();
            
            console.log('🔍 GameLogicManager: Found users:', usersSnapshot.size);
            
            this.standings = [];
            
            // Use for...of loop to properly handle async operations
            for (const doc of usersSnapshot.docs) {
                const userData = doc.data();
                console.log('🔍 GameLogicManager: Processing user:', doc.id, userData);
                
                // Load picks for this user from multi-club structure
                let userPicks = {};
                try {
                    // Get current club and edition from ClubService
                    const currentClubId = window.losApp?.managers?.club?.getCurrentClub();
                    const currentEdition = window.losApp?.managers?.club?.getCurrentEdition();
                    
                    console.log('🔍 GameLogicManager: Current club:', currentClubId, 'Current edition:', currentEdition);
                    
                    if (currentClubId && currentEdition) {
                        const picksSnapshot = await this.db.collection('clubs').doc(currentClubId)
                            .collection('editions').doc(currentEdition)
                            .collection('picks')
                            .where('userId', '==', doc.id)
                            .get();
                        
                        console.log('🔍 GameLogicManager: Found picks for user:', doc.id, picksSnapshot.size);
                        
                        picksSnapshot.forEach(pickDoc => {
                            const pickData = pickDoc.data();
                            userPicks[pickData.gameweek] = pickData.teamPicked;
                        });
                    }
                } catch (error) {
                    console.error('Error loading picks for user:', doc.id, error);
                }
                
                const playerData = {
                    uid: doc.id,
                    displayName: userData.displayName,
                    lives: userData.lives || 0,
                    picks: userPicks,
                    eliminated: userData.lives <= 0,
                    lastPick: this.getLastPick(userPicks)
                };
                
                console.log('🔍 GameLogicManager: Adding player to standings:', playerData);
                this.standings.push(playerData);
            }
            
            // Sort standings by lives (descending), then by last pick time
            this.standings.sort((a, b) => {
                if (a.lives !== b.lives) {
                    return b.lives - a.lives; // More lives first
                }
                // If lives are equal, sort by last pick time (earlier is better)
                if (a.lastPick && b.lastPick) {
                    return new Date(a.lastPick) - new Date(b.lastPick);
                }
                return 0;
            });
            
            this.displayStandings();
            
        } catch (error) {
            // Suppress "Target ID already exists" messages as they're not real errors
            if (!error.message.includes('Target ID already exists')) {
                console.error('Error loading standings:', error);
                window.authManager.showError('Failed to load standings');
            }
        }
    }

    getLastPick(picks) {
        if (!picks || Object.keys(picks).length === 0) return null;
        
        // Find the most recent pick
        let lastPick = null;
        let lastPickTime = null;
        
        Object.entries(picks).forEach(([gameweek, pick]) => {
            if (pick && pick.savedAt) {
                const pickTime = new Date(pick.savedAt);
                if (!lastPickTime || pickTime > lastPickTime) {
                    lastPickTime = pickTime;
                    lastPick = pick;
                }
            }
        });
        
        return lastPick ? lastPick.savedAt : null;
    }

    showError(message) {
        if (window.authManager && window.authManager.showError) {
            window.authManager.showError(message);
        } else {
            console.error(message);
        }
    }

    displayStandings() {
        console.log('🔍 GameLogicManager: Displaying standings, count:', this.standings.length);
        
        const standingsList = document.getElementById('standingsList');
        if (!standingsList) {
            console.error('❌ GameLogicManager: standingsList element not found!');
            return;
        }

        if (this.standings.length === 0) {
            console.log('🔍 GameLogicManager: No standings to display, showing empty state');
            this.showEmptyStandings();
            return;
        }

        standingsList.innerHTML = `
            <div class="standings-header">
                <div class="flex items-center gap-4">
                    <span class="font-semibold">Position</span>
                    <span class="font-semibold">Player</span>
                    <span class="font-semibold">Lives</span>
                </div>
            </div>
        `;

        this.standings.forEach((player, index) => {
            const isCurrentUser = player.uid === window.authManager.getCurrentUserId();
            const row = document.createElement('div');
            row.className = `standings-row ${isCurrentUser ? 'current-user' : ''}`;
            
            row.innerHTML = `
                <div class="standings-position">${index + 1}</div>
                <div class="standings-name">${player.displayName}</div>
                <div class="standings-lives ${player.eliminated ? 'eliminated' : ''}">
                    <i class="fas fa-heart"></i>
                    <span>${player.lives}</span>
                    ${player.eliminated ? '<span class="badge danger ml-2">ELIMINATED</span>' : ''}
                </div>
            `;
            
            standingsList.appendChild(row);
        });
    }

    showEmptyStandings() {
        const standingsList = document.getElementById('standingsList');
        if (standingsList) {
            standingsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-trophy"></i>
                    <h3>No Players Yet</h3>
                    <p>Be the first to join the competition!</p>
                </div>
            `;
        }
    }

    async processGameweekResults(gameweek) {
        try {
            const currentEdition = window.editionService.getCurrentEdition();
            
            // Get fixtures for the gameweek
            const fixturesDoc = await this.db.collection('fixtures')
                .doc(`${currentEdition}_gw${gameweek}`)
                .get();
            
            if (!fixturesDoc.exists) {
                throw new Error('No fixtures found for this gameweek');
            }
            
            const fixturesData = fixturesDoc.data();
            const fixtures = fixturesData.fixtures || [];
            
            // Process each fixture result
            for (const fixture of fixtures) {
                if (fixture.status === 'completed' && fixture.homeScore !== null && fixture.awayScore !== null) {
                    await this.processFixtureResult(fixture, gameweek);
                }
            }
            
            // Update standings
            await this.loadStandings();
            
            window.authManager.showSuccess(`Gameweek ${gameweek} results processed successfully`);
            
        } catch (error) {
            console.error('Error processing gameweek results:', error);
            window.authManager.showError('Failed to process gameweek results');
        }
    }

    async processFixtureResult(fixture, gameweek) {
        try {
            const currentEdition = window.editionService.getCurrentEdition();
            
            // Determine winner
            let winner = null;
            if (fixture.homeScore > fixture.awayScore) {
                winner = fixture.homeTeam;
            } else if (fixture.awayScore > fixture.homeScore) {
                winner = fixture.awayTeam;
            }
            // If scores are equal, it's a draw (no winner)
            
            // Get all users who picked teams in this fixture
            const usersSnapshot = await this.db.collection('users')
                .where('edition', '==', currentEdition)
                .get();
            
            const batch = this.db.batch();
            
            usersSnapshot.forEach(doc => {
                const userData = doc.data();
                const userPick = userData.picks[`gw${gameweek}`];
                
                if (userPick) {
                    let livesChange = 0;
                    
                    if (userPick === winner) {
                        // User picked the winning team - no life lost
                        livesChange = 0;
                    } else if (winner === null) {
                        // It was a draw - user loses a life
                        livesChange = -1;
                    } else {
                        // User picked the losing team - loses a life
                        livesChange = -1;
                    }
                    
                    // Update user's lives
                    const newLives = Math.max(0, (userData.lives || 0) + livesChange);
                    batch.update(doc.ref, {
                        lives: newLives,
                        updated_at: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            });
            
            // Commit the batch update
            await batch.commit();
            
        } catch (error) {
            console.error('Error processing fixture result:', error);
            throw error;
        }
    }

    async assignAutoPicks(gameweek) {
        try {
            const currentEdition = window.editionService.getCurrentEdition();
            
            // Get all users for current edition
            const usersSnapshot = await this.db.collection('users')
                .where('edition', '==', currentEdition)
                .get();
            
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
            
            const batch = this.db.batch();
            
            usersSnapshot.forEach(doc => {
                const userData = doc.data();
                const hasPick = userData.picks && userData.picks[`gw${gameweek}`];
                
                if (!hasPick && userData.lives > 0) {
                    // Assign auto-pick
                    const autoPick = this.getAutoPick(userData.picks || {}, availableTeams, gameweek);
                    
                    if (autoPick) {
                        batch.update(doc.ref, {
                            [`picks.gw${gameweek}`]: autoPick,
                            updated_at: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        
                        // Get current club and edition from ClubService
                        const currentClubId = window.losApp?.managers?.club?.getCurrentClub();
                        const currentEdition = window.losApp?.managers?.club?.getCurrentEdition();
                        
                        if (currentClubId && currentEdition) {
                            // Create pick record in multi-club structure
                            const pickRef = this.db.collection('clubs').doc(currentClubId)
                                .collection('editions').doc(currentEdition)
                                .collection('picks').doc();
                            batch.set(pickRef, {
                                userId: doc.id,
                                teamPicked: autoPick,
                                gameweek: gameweek,
                                fixtureId: null,
                                isAutopick: true,
                                result: null,
                                livesAfterPick: null,
                                savedAt: firebase.firestore.FieldValue.serverTimestamp(),
                                processedAt: null,
                                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                                updated_at: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        }
                    }
                }
            });
            
            // Commit the batch update
            await batch.commit();
            
            window.authManager.showInfo(`Auto-picks assigned for Gameweek ${gameweek}`);
            
        } catch (error) {
            console.error('Error assigning auto-picks:', error);
            window.authManager.showError('Failed to assign auto-picks');
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

    async checkForWinner() {
        const activePlayers = this.standings.filter(player => !player.eliminated);
        
        if (activePlayers.length === 1) {
            // We have a winner!
            const winner = activePlayers[0];
            
            // Update winner status in database
            await this.db.collection('users').doc(winner.uid).update({
                isWinner: true,
                wonAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            window.authManager.showSuccess(`🎉 ${winner.displayName} is the Last One Standing! 🎉`);
            return winner;
        } else if (activePlayers.length === 0) {
            // No active players - game over
            window.authManager.showWarning('Game Over! No players remaining.');
            return null;
        }
        
        return null;
    }

    async getGameStatistics() {
        try {
            const currentEdition = window.editionService.getCurrentEdition();
            
            const stats = {
                totalPlayers: this.standings.length,
                activePlayers: this.standings.filter(p => !p.eliminated).length,
                eliminatedPlayers: this.standings.filter(p => p.eliminated).length,
                averageLives: 0,
                mostPickedTeams: {},
                gameweekProgress: {}
            };
            
            // Calculate average lives
            if (stats.activePlayers > 0) {
                const totalLives = this.standings
                    .filter(p => !p.eliminated)
                    .reduce((sum, p) => sum + p.lives, 0);
                stats.averageLives = (totalLives / stats.activePlayers).toFixed(1);
            }
            
            // Get pick statistics
            const picksSnapshot = await this.db.collection('picks')
                .where('edition', '==', currentEdition)
                .get();
            
            picksSnapshot.forEach(doc => {
                const pickData = doc.data();
                if (pickData.teamPicked) {
                    stats.mostPickedTeams[pickData.teamPicked] = 
                        (stats.mostPickedTeams[pickData.teamPicked] || 0) + 1;
                }
                
                if (pickData.gameweek) {
                    stats.gameweekProgress[pickData.gameweek] = 
                        (stats.gameweekProgress[pickData.gameweek] || 0) + 1;
                }
            });
            
            return stats;
            
        } catch (error) {
            console.error('Error getting game statistics:', error);
            return null;
        }
    }

    // Getter methods
    getStandings() {
        return this.standings;
    }

    getCurrentUserPosition() {
        const userId = window.authManager.getCurrentUserId();
        const userIndex = this.standings.findIndex(player => player.uid === userId);
        return userIndex !== -1 ? userIndex + 1 : null;
    }

    isUserEliminated() {
        const userId = window.authManager.getCurrentUserId();
        const user = this.standings.find(player => player.uid === userId);
        return user ? user.eliminated : false;
    }

    // Admin methods
    async resetUserLives(userId, lives = 2) {
        try {
            await this.db.collection('users').doc(userId).update({
                lives: lives,
                isWinner: false,
                wonAt: null,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Refresh standings
            await this.loadStandings();
            
            return true;
        } catch (error) {
            console.error('Error resetting user lives:', error);
            throw error;
        }
    }

    async resetAllLives(lives = 2) {
        try {
            const currentEdition = window.editionService.getCurrentEdition();
            
            const usersSnapshot = await this.db.collection('users')
                .where('edition', '==', currentEdition)
                .get();
            
            const batch = this.db.batch();
            
            usersSnapshot.forEach(doc => {
                batch.update(doc.ref, {
                    lives: lives,
                    isWinner: false,
                    wonAt: null,
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            
            await batch.commit();
            
            // Refresh standings
            await this.loadStandings();
            
            return true;
        } catch (error) {
            console.error('Error resetting all lives:', error);
            throw error;
        }
    }
}

// Initialize GameLogicManager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.gameLogicManager = new GameLogicManager();
    
    // Add global helper functions for debugging
    window.testStandings = () => {
        console.log('🧪 Testing standings...');
        if (window.gameLogicManager) {
            console.log('🔍 Current standings:', window.gameLogicManager.getStandings());
            console.log('🔍 Standings count:', window.gameLogicManager.getStandings().length);
            window.gameLogicManager.loadStandings();
        } else {
            console.error('❌ GameLogicManager not available');
        }
    };
    
    window.debugStandings = () => {
        console.log('🔍 Debugging standings...');
        if (window.gameLogicManager) {
            console.log('🔍 GameLogicManager instance:', window.gameLogicManager);
            console.log('🔍 Database reference:', window.gameLogicManager.db);
            console.log('🔍 Firebase ready:', window.firebaseReady);
            console.log('🔍 Current edition:', window.editionService?.getCurrentEdition());
        } else {
            console.error('❌ GameLogicManager not available');
        }
    };
    
    window.forceRefreshStandings = () => {
        console.log('🔄 Force refreshing standings...');
        if (window.gameLogicManager) {
            window.gameLogicManager.loadStandings();
        } else {
            console.error('❌ GameLogicManager not available');
        }
    };
    
    window.checkUsersInDatabase = async () => {
        console.log('🔍 Checking users in database...');
        if (window.gameLogicManager && window.gameLogicManager.db) {
            try {
                // Check all users collection
                const allUsersSnapshot = await window.gameLogicManager.db.collection('users').get();
                console.log('🔍 Total users in database:', allUsersSnapshot.size);
                
                allUsersSnapshot.forEach(doc => {
                    const userData = doc.data();
                    console.log('🔍 User:', doc.id, userData);
                });
                
                // Check users with specific edition
                const currentEdition = window.editionService?.getCurrentEdition();
                console.log('🔍 Current edition:', currentEdition);
                
                if (currentEdition) {
                    const editionUsersSnapshot = await window.gameLogicManager.db.collection('users')
                        .where('edition', '==', currentEdition)
                        .get();
                    console.log('🔍 Users with current edition:', editionUsersSnapshot.size);
                    
                    editionUsersSnapshot.forEach(doc => {
                        const userData = doc.data();
                        console.log('🔍 Edition user:', doc.id, userData);
                    });
                }
                
            } catch (error) {
                console.error('❌ Error checking users:', error);
            }
        } else {
            console.error('❌ GameLogicManager or database not available');
        }
    };
    
    window.checkDatabaseStructure = async () => {
        console.log('🔍 Checking database structure...');
        if (window.gameLogicManager && window.gameLogicManager.db) {
            try {
                // Check collections
                const collections = ['users', 'clubs', 'editions', 'fixtures', 'picks'];
                
                for (const collectionName of collections) {
                    try {
                        const snapshot = await window.gameLogicManager.db.collection(collectionName).limit(1).get();
                        console.log(`🔍 Collection '${collectionName}': ${snapshot.size} documents (sampled)`);
                        
                        if (snapshot.size > 0) {
                            const sampleDoc = snapshot.docs[0];
                            const sampleData = sampleDoc.data();
                            console.log(`🔍 Sample document from '${collectionName}':`, sampleData);
                        }
                    } catch (error) {
                        console.log(`❌ Collection '${collectionName}' not accessible:`, error.message);
                    }
                }
                
            } catch (error) {
                console.error('❌ Error checking database structure:', error);
            }
        } else {
            console.error('❌ GameLogicManager or database not available');
        }
    };
    
    console.log('🔧 GameLogicManager: Global helper functions added: testStandings(), debugStandings(), forceRefreshStandings(), checkUsersInDatabase(), checkDatabaseStructure()');
});
