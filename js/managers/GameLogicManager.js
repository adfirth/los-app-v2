/**
 * GameLogicManager - Handles game logic, standings, and player management
 */
class GameLogicManager {
    constructor() {
        this.standings = [];
        this.db = null;
        this.isInitialized = false;
    }

    initBasic() {
        if (this.isInitialized) return;
        
        console.log('🎮 GameLogicManager: Basic initialization...');
        // Basic initialization - just mark as ready for the app initialization flow
        console.log('✅ GameLogicManager: Basic initialization complete');
    }

    async init() {
        try {
            // Wait for Firebase to be ready
            await this.waitForFirebase();
            
            // Set up real-time listeners
            this.setupRealtimeListeners();
            
            this.isInitialized = true;
            console.log('✅ GameLogicManager: Initialization complete');
            
        } catch (error) {
            console.error('❌ GameLogicManager: Initialization failed:', error);
        }
    }

    async waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.firebaseReady && window.firebaseDB) {
                    this.db = window.firebaseDB;
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    setupRealtimeListeners() {
        // Set up real-time listener for users
        if (this.db && typeof this.db.collection === 'function') {
            console.log('🔍 GameLogicManager: Setting up users real-time listener...');
            // This will be called when standings are loaded
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

            // Get current club and edition from ClubService
            const currentClub = window.clubService?.getCurrentClub();
            const currentEdition = window.clubService?.getCurrentEdition();
            
            console.log('🔍 GameLogicManager: Current club:', currentClub, 'Current edition:', currentEdition);
            
            if (!currentClub || !currentEdition) {
                console.log('⚠️ GameLogicManager: No club or edition available, falling back to old structure...');
                
                // Fallback to old structure for backward compatibility
                const fallbackEdition = window.editionService?.getCurrentEdition();
                console.log('🔍 GameLogicManager: Using fallback edition:', fallbackEdition);
                
                if (fallbackEdition) {
                    // Get the edition ID from the editions collection
                    let editionId = fallbackEdition;
                    try {
                        const editionsSnapshot = await this.db.collection('editions')
                            .where('name', '==', fallbackEdition)
                            .limit(1)
                            .get();
                        
                        if (!editionsSnapshot.empty) {
                            editionId = editionsSnapshot.docs[0].id;
                            console.log('🔍 GameLogicManager: Found edition ID:', editionId, 'for name:', fallbackEdition);
                        } else {
                            console.log('⚠️ GameLogicManager: No edition found with name:', fallbackEdition);
                        }
                    } catch (error) {
                        console.error('Error finding edition ID:', error);
                    }
                    
                    // Get all users for current edition (using edition ID) - OLD STRUCTURE
                    const usersSnapshot = await this.db.collection('users')
                        .where('edition', '==', editionId)
                        .get();
                    
                    console.log('🔍 GameLogicManager: Found users (old structure):', usersSnapshot.size);
                    await this.processUsersOldStructure(usersSnapshot);
                }
                
            } else {
                console.log('🔍 GameLogicManager: Using new multi-club structure...');
                
                // NEW MULTI-CLUB STRUCTURE
                try {
                    const usersSnapshot = await this.db.collection('clubs')
                        .doc(currentClub)
                        .collection('editions')
                        .doc(currentEdition)
                        .collection('users')
                        .get();
                    
                    console.log('🔍 GameLogicManager: Found users (new structure):', usersSnapshot.size);
                    await this.processUsersNewStructure(usersSnapshot, currentClub, currentEdition);
                    
                } catch (error) {
                    console.error('Error loading users from new structure:', error);
                    console.log('🔄 GameLogicManager: Falling back to old structure...');
                    
                    // Fallback to old structure if new structure fails
                    const fallbackEdition = window.editionService?.getCurrentEdition();
                    if (fallbackEdition) {
                        const editionsSnapshot = await this.db.collection('editions')
                            .where('name', '==', fallbackEdition)
                            .limit(1)
                            .get();
                        
                        if (!editionsSnapshot.empty) {
                            const editionId = editionsSnapshot.docs[0].id;
                            const usersSnapshot = await this.db.collection('users')
                                .where('edition', '==', editionId)
                                .get();
                            
                            console.log('🔍 GameLogicManager: Found users (fallback):', usersSnapshot.size);
                            await this.processUsersOldStructure(usersSnapshot);
                        }
                    }
                }
            }
            
            // Sort standings: current user first, then by card status (no cards, yellow card, red card), then by last pick time
            this.standings.sort((a, b) => {
                // Current user always comes first
                if (a.isCurrentUser && !b.isCurrentUser) return -1;
                if (!a.isCurrentUser && b.isCurrentUser) return 1;
                
                // Then sort by card status (lives descending)
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
                if (window.authManager && window.authManager.showError) {
                    window.authManager.showError('Failed to load standings');
                }
            }
        }
    }

    getLastPick(picks) {
        if (!picks || Object.keys(picks).length === 0) return null;
        
        const gameweeks = Object.keys(picks).map(Number).sort((a, b) => b - a);
        const lastPick = picks[gameweeks[0]];
        return lastPick ? lastPick.teamPicked : null;
    }

    getCurrentGameweekPick(picks) {
        if (!picks || Object.keys(picks).length === 0) return null;
        
        const currentGameweek = window.losApp?.managers?.edition?.getCurrentGameweek() || 1;
        const currentPick = picks[currentGameweek];
        return currentPick ? currentPick.teamPicked : null;
    }

    getCardStatus(lives) {
        if (lives === 0) return 'red-card';
        if (lives === 1) return 'yellow-card';
        return 'no-cards';
    }

    getCardStatusText(lives) {
        if (lives === 0) return 'Red Card (Eliminated)';
        if (lives === 1) return 'Yellow Card (1 Life)';
        return 'No Cards (2 Lives)';
    }

    getCardStatusIcon(lives) {
        if (lives === 0) return '🔴';
        if (lives === 1) return '🟡';
        return '🟢';
    }

    calculateLivesFromPicks(userPicks, startingLives = 2) {
        if (!userPicks || Object.keys(userPicks).length === 0) {
            console.log('🔍 GameLogicManager: No picks to calculate lives from, returning starting lives:', startingLives);
            return startingLives;
        }

        let lives = startingLives;
        console.log('🔍 GameLogicManager: Calculating lives from picks. Starting lives:', startingLives);
        console.log('🔍 GameLogicManager: User picks data:', userPicks);
        
        // Count losing picks (cards received)
        Object.entries(userPicks).forEach(([gameweek, pick]) => {
            console.log(`🔍 GameLogicManager: Checking GW${gameweek} pick:`, pick);
            
            if (pick && pick.result) {
                console.log(`🔍 GameLogicManager: GW${gameweek} result: "${pick.result}" (type: ${typeof pick.result})`);
                
                // Check for various possible loss values
                if (pick.result === 'loss' || pick.result === 'L' || pick.result === 'Loss' || pick.result === 'LOSS') {
                    lives--;
                    console.log(`🔍 GameLogicManager: GW${gameweek} is a LOSS, lives reduced to: ${lives}`);
                } else if (pick.result === 'win' || pick.result === 'W' || pick.result === 'Win' || pick.result === 'WIN') {
                    console.log(`🔍 GameLogicManager: GW${gameweek} is a WIN, lives remain: ${lives}`);
                } else if (pick.result === 'draw' || pick.result === 'D' || pick.result === 'Draw' || pick.result === 'DRAW') {
                    console.log(`🔍 GameLogicManager: GW${gameweek} is a DRAW, lives remain: ${lives}`);
                } else {
                    console.log(`🔍 GameLogicManager: GW${gameweek} has unknown result: "${pick.result}", treating as neutral`);
                }
            } else {
                console.log(`🔍 GameLogicManager: GW${gameweek} has no result field or result is falsy:`, pick);
            }
        });

        console.log('🔍 GameLogicManager: Final calculated lives:', lives);
        // Ensure lives don't go below 0
        return Math.max(0, lives);
    }

    displayStandings() {
        console.log('🔍 GameLogicManager: Displaying standings, count:', this.standings.length);
        
        const standingsList = document.getElementById('standingsList');
        if (!standingsList) {
            console.error('🔍 GameLogicManager: standingsList element not found');
            return;
        }

        if (this.standings.length === 0) {
            console.log('🔍 GameLogicManager: No standings to display, showing empty state');
            standingsList.innerHTML = `
                <div class="empty-state">
                    <p>No players found for the current edition.</p>
                    <p>Players will appear here once they join the game.</p>
                </div>
            `;
            return;
        }

        // Create enhanced standings table
        let standingsHTML = `
            <div class="standings-table">
                <div class="standings-header-row">
                    <div class="standings-header-cell position-header">Pos</div>
                    <div class="standings-header-cell player-header">Player</div>
                    <div class="standings-header-cell card-header">Card Status</div>
                    <div class="standings-header-cell pick-header">Current GW Pick</div>
                    <div class="standings-header-cell lives-header">Lives</div>
                    <div class="standings-header-cell last-pick-header">Last Pick</div>
                </div>
        `;

        this.standings.forEach((player, index) => {
            const position = index + 1;
            const eliminatedClass = player.eliminated ? 'eliminated' : '';
            const currentUserClass = player.isCurrentUser ? 'current-user' : '';
            const cardStatusIcon = this.getCardStatusIcon(player.lives);
            const cardStatusText = this.getCardStatusText(player.lives);
            const currentPick = player.currentGameweekPick || 'No pick made';
            const lastPick = player.lastPick ? `GW${Object.keys(player.picks).sort((a, b) => Number(b) - Number(a))[0]}` : 'No picks yet';
            
            // Add debug logging for current user
            if (player.isCurrentUser) {
                console.log('🔍 GameLogicManager: Current user pick details:', {
                    uid: player.uid,
                    displayName: player.displayName,
                    calculatedLives: player.lives,
                    picks: player.picks,
                    cardStatus: player.cardStatus
                });
            }
            
            standingsHTML += `
                <div class="standings-row ${eliminatedClass} ${currentUserClass}" data-uid="${player.uid}">
                    <div class="standings-cell position-cell">${position}</div>
                    <div class="standings-cell player-cell">
                        <span class="player-name">${player.displayName}</span>
                        ${player.isCurrentUser ? '<span class="current-user-badge">YOU</span>' : ''}
                    </div>
                    <div class="standings-cell card-cell ${player.cardStatus}">
                        <span class="card-icon">${cardStatusIcon}</span>
                        <span class="card-text">${cardStatusText}</span>
                    </div>
                    <div class="standings-cell pick-cell">${currentPick}</div>
                    <div class="standings-cell lives-cell">
                        <span class="lives-count">${player.lives}</span>
                        <span class="lives-icon">❤️</span>
                    </div>
                    <div class="standings-cell last-pick-cell">${lastPick}</div>
                </div>
            `;
        });

        standingsHTML += '</div>';
        standingsList.innerHTML = standingsHTML;
    }

    getStandings() {
        return [...this.standings];
    }

    // Helper methods for processing users from different database structures
    async processUsersOldStructure(usersSnapshot) {
        console.log('🔍 GameLogicManager: Processing users from old structure...');
        this.standings = [];
        
        for (const doc of usersSnapshot.docs) {
            const userData = doc.data();
            console.log('🔍 GameLogicManager: Processing user (old):', doc.id, userData);
            
            // Load picks from old structure
            let userPicks = {};
            try {
                const picksSnapshot = await this.db.collection('picks')
                    .where('userId', '==', doc.id)
                    .where('edition', '==', userData.edition)
                    .get();
                
                console.log('🔍 GameLogicManager: Found picks for user (old):', doc.id, picksSnapshot.size);
                
                picksSnapshot.forEach(pickDoc => {
                    const pickData = pickDoc.data();
                    console.log(`🔍 GameLogicManager: Raw pick data for GW${pickData.gameweek}:`, pickData);
                    
                    userPicks[pickData.gameweek] = {
                        teamPicked: pickData.teamPicked,
                        result: pickData.result,
                        fixtureId: pickData.fixtureId,
                        isAutopick: pickData.isAutopick || false
                    };
                    
                    console.log(`🔍 GameLogicManager: Processed pick for GW${pickData.gameweek}:`, userPicks[pickData.gameweek]);
                });
            } catch (error) {
                console.error('Error loading picks for user (old):', doc.id, error);
            }
            
            const calculatedLives = this.calculateLivesFromPicks(userPicks);
            const playerData = {
                uid: doc.id,
                displayName: userData.displayName,
                lives: calculatedLives,
                picks: userPicks,
                eliminated: calculatedLives <= 0,
                lastPick: this.getLastPick(userPicks),
                currentGameweekPick: this.getCurrentGameweekPick(userPicks),
                cardStatus: this.getCardStatus(calculatedLives),
                isCurrentUser: doc.id === window.losApp?.managers?.auth?.currentUser?.uid
            };
            
            console.log('🔍 GameLogicManager: Adding player to standings (old):', playerData);
            this.standings.push(playerData);
        }
    }
    
    async processUsersNewStructure(usersSnapshot, currentClub, currentEdition) {
        console.log('🔍 GameLogicManager: Processing users from new multi-club structure...');
        this.standings = [];
        
        for (const doc of usersSnapshot.docs) {
            const userData = doc.data();
            console.log('🔍 GameLogicManager: Processing user (new):', doc.id, userData);
            
            // Load picks from new multi-club structure
            let userPicks = {};
            try {
                const picksSnapshot = await this.db.collection('clubs')
                    .doc(currentClub)
                    .collection('editions')
                    .doc(currentEdition)
                    .collection('picks')
                    .where('userId', '==', doc.id)
                    .get();
                
                console.log('🔍 GameLogicManager: Found picks for user (new):', doc.id, picksSnapshot.size);
                
                picksSnapshot.forEach(pickDoc => {
                    const pickData = pickDoc.data();
                    console.log(`🔍 GameLogicManager: Raw pick data for GW${pickData.gameweek}:`, pickData);
                    
                    userPicks[pickData.gameweek] = {
                        teamPicked: pickData.teamPicked,
                        result: pickData.result,
                        fixtureId: pickData.fixtureId,
                        isAutopick: pickData.isAutopick || false
                    };
                    
                    console.log(`🔍 GameLogicManager: Processed pick for GW${pickData.gameweek}:`, userPicks[pickData.gameweek]);
                });
            } catch (error) {
                console.error('Error loading picks for user (new):', doc.id, error);
            }
            
            const calculatedLives = this.calculateLivesFromPicks(userPicks);
            const playerData = {
                uid: doc.id,
                displayName: userData.displayName,
                lives: calculatedLives,
                picks: userPicks,
                eliminated: calculatedLives <= 0,
                lastPick: this.getLastPick(userPicks),
                currentGameweekPick: this.getCurrentGameweekPick(userPicks),
                cardStatus: this.getCardStatus(calculatedLives),
                isCurrentUser: doc.id === window.losApp?.managers?.auth?.currentUser?.uid
            };
            
            console.log('🔍 GameLogicManager: Adding player to standings (new):', playerData);
            this.standings.push(playerData);
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
    
    window.fixLoginLoop = async () => {
        console.log('🔧 Attempting to fix login loop...');
        
        // Check if ClubService exists
        if (window.clubService) {
            console.log('🔧 ClubService found, checking status...');
            
            // Force ClubService to load clubs
            if (window.clubService.loadClubs) {
                console.log('🔧 Forcing ClubService to load clubs...');
                await window.clubService.loadClubs();
            }
            
            // Check if clubs are now loaded
            if (window.clubService.getAvailableClubs) {
                const clubs = window.clubService.getAvailableClubs();
                console.log('🔧 Available clubs after force load:', clubs);
            }
        } else {
            console.log('❌ ClubService not found');
        }
        
        // Check if AuthManager exists
        if (window.authManager) {
            console.log('🔧 AuthManager found, checking status...');
            
            // Force AuthManager to retry
            if (window.authManager.loadUserData) {
                console.log('🔧 Forcing AuthManager to retry user data load...');
                await window.authManager.loadUserData();
            }
        } else {
            console.log('❌ AuthManager not found');
        }
        
        // Check global managers
        console.log('🔧 Global managers status:');
        console.log('- ClubService:', !!window.clubService);
        console.log('- AuthManager:', !!window.authManager);
        console.log('- GameLogicManager:', !!window.gameLogicManager);
        console.log('- EditionService:', !!window.editionService);
    };
    
    window.checkClubServiceStatus = async () => {
        console.log('🔍 Checking ClubService status...');
        
        if (window.clubService) {
            console.log('✅ ClubService found');
            console.log('🔍 ClubService methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.clubService)));
            
            // Check if clubs are loaded
            if (window.clubService.getAvailableClubs) {
                try {
                    const clubs = window.clubService.getAvailableClubs();
                    console.log('🔍 Available clubs:', clubs);
                } catch (error) {
                    console.error('❌ Error getting available clubs:', error);
                }
            }
            
            // Check current club
            if (window.clubService.getCurrentClub) {
                try {
                    const currentClub = window.clubService.getCurrentClub();
                    console.log('🔍 Current club:', currentClub);
                } catch (error) {
                    console.error('❌ Error getting current club:', error);
                }
            }
            
            // Check current edition
            if (window.clubService.getCurrentEdition) {
                try {
                    const currentEdition = window.clubService.getCurrentEdition();
                    console.log('🔍 Current edition:', currentEdition);
                } catch (error) {
                    console.error('❌ Error getting current edition:', error);
                }
            }
            
        } else {
            console.log('❌ ClubService not found');
            
            // Check if it's available globally
            console.log('🔍 Checking global scope for ClubService...');
            console.log('- window.clubService:', !!window.clubService);
            console.log('- window.ClubService:', !!window.ClubService);
            
            // Check if it's in the managers
            if (window.gameLogicManager) {
                console.log('🔍 GameLogicManager has ClubService:', !!window.gameLogicManager.clubService);
            }
        }
    };
    
    console.log('🔧 GameLogicManager: Global helper functions added: testStandings(), debugStandings(), forceRefreshStandings(), checkUsersInDatabase(), checkDatabaseStructure(), fixLoginLoop(), checkClubServiceStatus()');
});

