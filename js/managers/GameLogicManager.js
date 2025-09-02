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
                console.log('⚠️ GameLogicManager: No club or edition available');
                console.log('🔍 GameLogicManager: Current club:', currentClub, 'Current edition:', currentEdition);
                return;
            }
            
            console.log('🔍 GameLogicManager: Using multi-club structure...');
            
            try {
                const usersSnapshot = await this.db.collection('clubs')
                    .doc(currentClub)
                    .collection('editions')
                    .doc(currentEdition)
                    .collection('users')
                    .get();
                
                console.log('🔍 GameLogicManager: Found users:', usersSnapshot.size);
                await this.processUsers(usersSnapshot, currentClub, currentEdition);
                
            } catch (error) {
                console.error('❌ GameLogicManager: Error loading users:', error);
                if (window.authManager && window.authManager.showError) {
                    window.authManager.showError('Failed to load standings');
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

    // Process users from multi-club structure
    async processUsers(usersSnapshot, currentClub, currentEdition) {
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

    // Process fixture results and update pick results
    async processFixtureResults(clubId, editionId, fixtureId) {
        console.log('🔍 GameLogicManager: Processing fixture results for:', { clubId, editionId, fixtureId });
        
        try {
            // Get the fixture data
            const fixtureDoc = await this.db.collection('clubs').doc(clubId)
                .collection('editions').doc(editionId)
                .collection('fixtures').doc(fixtureId).get();
            
            if (!fixtureDoc.exists) {
                console.log('⚠️ GameLogicManager: Fixture not found');
                return;
            }
            
            const fixtureData = fixtureDoc.data();
            console.log('🔍 GameLogicManager: Fixture data:', fixtureData);
            
            // Check if fixture is finished and has scores
            // Look for scores in multiple possible locations
            let homeScore = fixtureData.homeScore;
            let awayScore = fixtureData.awayScore;
            
            console.log('🔍 GameLogicManager: Initial score check:', { 
                homeScore: fixtureData.homeScore, 
                awayScore: fixtureData.awayScore,
                hasApiData: !!fixtureData.apiData
            });
            
            // If main score fields are null, check apiData
            if (homeScore === null || awayScore === null) {
                if (fixtureData.apiData) {
                    console.log('🔍 GameLogicManager: Checking apiData for scores:', fixtureData.apiData);
                    
                    // Check apiData for scores
                    if (fixtureData.apiData['home-team'] && fixtureData.apiData['away-team']) {
                        const apiHomeScore = fixtureData.apiData['home-team'].score;
                        const apiAwayScore = fixtureData.apiData['away-team'].score;
                        console.log('🔍 GameLogicManager: Found scores in apiData:', { apiHomeScore, apiAwayScore });
                        
                        homeScore = homeScore || apiHomeScore;
                        awayScore = awayScore || apiAwayScore;
                    }
                    // Also check for direct score fields in apiData
                    if (fixtureData.apiData.homeScore !== undefined) {
                        console.log('🔍 GameLogicManager: Found homeScore in apiData:', fixtureData.apiData.homeScore);
                        homeScore = homeScore || fixtureData.apiData.homeScore;
                    }
                    if (fixtureData.apiData.awayScore !== undefined) {
                        console.log('🔍 GameLogicManager: Found awayScore in apiData:', fixtureData.apiData.awayScore);
                        awayScore = awayScore || fixtureData.apiData.awayScore;
                    }
                }
            }
            
            console.log('🔍 GameLogicManager: Final score values:', { homeScore, awayScore });
            
            // Check if fixture is finished
            const isFinished = fixtureData.status === 'finished' || 
                              fixtureData.status === 'completed' ||
                              fixtureData.status?.full === 'Full Time' ||
                              fixtureData.status?.short === 'FT';
            
            // Check if we have scores
            const hasScores = homeScore !== null && awayScore !== null && 
                             homeScore !== undefined && awayScore !== undefined;
            
            console.log('🔍 GameLogicManager: Fixture status check:', { 
                isFinished, 
                hasScores, 
                homeScore, 
                awayScore,
                status: fixtureData.status,
                statusFull: fixtureData.status?.full,
                statusShort: fixtureData.status?.short
            });
            
            if (!isFinished || !hasScores) {
                console.log('⚠️ GameLogicManager: Fixture not finished or missing scores:', { isFinished, hasScores });
                return;
            }
            
            // Get team names from multiple possible locations
            let homeTeam = fixtureData.homeTeam;
            let awayTeam = fixtureData.awayTeam;
            
            if (!homeTeam && fixtureData.apiData && fixtureData.apiData['home-team']) {
                homeTeam = fixtureData.apiData['home-team'].name;
            }
            if (!awayTeam && fixtureData.apiData && fixtureData.apiData['away-team']) {
                awayTeam = fixtureData.apiData['away-team'].name;
            }
            
            console.log('🔍 GameLogicManager: Fixture results - Home:', homeTeam, homeScore, 'Away:', awayTeam, awayScore);
            
            // Determine the result
            let result;
            if (homeScore > awayScore) {
                result = 'win';
            } else if (homeScore < awayScore) {
                result = 'loss';
            } else {
                result = 'draw';
            }
            
            // Find all picks for this fixture
            const picksSnapshot = await this.db.collection('clubs').doc(clubId)
                .collection('editions').doc(editionId)
                .collection('picks')
                .where('teamPicked', 'in', [homeTeam, awayTeam])
                .get();
            
            console.log('🔍 GameLogicManager: Found picks for fixture:', picksSnapshot.size);
            
            let updatedPicks = 0;
            
            // Update each pick with the result
            for (const pickDoc of picksSnapshot.docs) {
                const pickData = pickDoc.data();
                const pickedTeam = pickData.teamPicked;
                
                // CRITICAL FIX: Only process picks that match this specific fixture
                // Check if the pick's gameweek matches the fixture's gameweek
                const pickGameweek = pickData.gameweek || pickData.gameWeek;
                const fixtureGameweek = fixtureData.gameWeek || fixtureData.gameweek;
                
                if (pickGameweek !== fixtureGameweek) {
                    console.log(`⚠️ Skipping pick - gameweek mismatch: pick=${pickGameweek}, fixture=${fixtureGameweek}`);
                    continue;
                }
                
                // CRITICAL FIX: Don't update picks that already have results (prevents duplicate processing)
                if (pickData.result && pickData.result !== null) {
                    console.log(`⚠️ Skipping pick - already has result: ${pickData.result}`);
                    continue;
                }
                
                // Determine if this pick is a win, loss, or draw
                let pickResult;
                if (pickedTeam === homeTeam) {
                    // User picked home team
                    pickResult = homeScore > awayScore ? 'win' : (homeScore < awayScore ? 'loss' : 'draw');
                } else if (pickedTeam === awayTeam) {
                    // User picked away team
                    pickResult = awayScore > homeScore ? 'win' : (awayScore < homeScore ? 'loss' : 'draw');
                } else {
                    // Team doesn't match, skip this pick
                    continue;
                }
                
                // Update the pick with the result
                await pickDoc.ref.update({
                    result: pickResult,
                    processedAt: new Date()
                });
                
                updatedPicks++;
                console.log(`✅ Updated pick for ${pickData.userId} - ${pickedTeam}: ${pickResult} (GW${pickGameweek})`);
            }
            
            if (updatedPicks === 0) {
                console.log('⚠️ GameLogicManager: No picks were updated');
            } else {
                console.log(`✅ GameLogicManager: Updated ${updatedPicks} picks with result: ${result}`);
            }
            
            // Refresh standings
            await this.loadStandings();
            
        } catch (error) {
            console.error('❌ GameLogicManager: Error processing fixture results:', error);
        }
    }

    // Process all finished fixtures for a gameweek
    async processGameweekResults(clubId, editionId, gameweek) {
        try {
            console.log('🔍 GameLogicManager: Processing results for gameweek:', gameweek);
            
            // Get all fixtures for this gameweek
            const fixturesSnapshot = await this.db.collection('clubs')
                .doc(clubId)
                .collection('editions')
                .doc(editionId)
                .collection('fixtures')
                .where('gameWeek', '==', gameweek)
                .get();
            
            console.log('🔍 GameLogicManager: Found fixtures for gameweek:', fixturesSnapshot.size);
            
            // Process each finished/completed fixture
            for (const fixtureDoc of fixturesSnapshot.docs) {
                const fixtureData = fixtureDoc.data();
                
                // Check if fixture is finished/completed with scores, OR if it already has results
                const hasScores = fixtureData.homeScore !== null && fixtureData.awayScore !== null;
                const isFinished = fixtureData.status === 'finished' || fixtureData.status === 'completed';
                const hasResults = fixtureData.result !== null && fixtureData.result !== undefined;
                
                if ((isFinished && hasScores) || hasResults) {
                    console.log('🔍 GameLogicManager: Processing fixture:', fixtureDoc.id, {
                        status: fixtureData.status,
                        hasScores: hasScores,
                        hasResults: hasResults,
                        homeScore: fixtureData.homeScore,
                        awayScore: fixtureData.awayScore,
                        result: fixtureData.result
                    });
                    
                    await this.processFixtureResults(clubId, editionId, fixtureDoc.id);
                } else {
                    console.log('🔍 GameLogicManager: Skipping fixture:', fixtureDoc.id, {
                        status: fixtureData.status,
                        hasScores: hasScores,
                        hasResults: hasResults
                    });
                }
            }
            
            console.log('✅ GameLogicManager: Finished processing gameweek results');
            
        } catch (error) {
            console.error('❌ GameLogicManager: Error processing gameweek results:', error);
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

    // Add helper functions for processing results
    window.processAllGameweekResults = async (gameweek) => {
        console.log('🔧 Processing all results for gameweek:', gameweek);
        if (window.gameLogicManager) {
            const currentClub = window.clubService?.getCurrentClub();
            const currentEdition = window.clubService?.getCurrentEdition();
            
            if (currentClub && currentEdition) {
                await window.gameLogicManager.processGameweekResults(currentClub, currentEdition, gameweek);
            } else {
                console.error('❌ No club or edition available');
            }
        } else {
            console.error('❌ GameLogicManager not available');
        }
    };

    window.processSpecificFixtureResults = async (fixtureId) => {
        console.log('🔧 Processing results for specific fixture:', fixtureId);
        if (window.gameLogicManager) {
            const currentClub = window.clubService?.getCurrentClub();
            const currentEdition = window.clubService?.getCurrentEdition();
            
            if (currentClub && currentEdition) {
                await window.gameLogicManager.processFixtureResults(currentClub, currentEdition, fixtureId);
            } else {
                console.error('❌ No club or edition available');
            }
        } else {
            console.error('❌ GameLogicManager not available');
        }
    };

    window.debugUserPicks = async (userId) => {
        console.log('🔍 Debugging picks for user:', userId);
        if (window.gameLogicManager && window.gameLogicManager.db) {
            try {
                const currentClub = window.clubService?.getCurrentClub();
                const currentEdition = window.clubService?.getCurrentEdition();
                
                if (currentClub && currentEdition) {
                    const picksSnapshot = await window.gameLogicManager.db.collection('clubs')
                        .doc(currentClub)
                        .collection('editions')
                        .doc(currentEdition)
                        .collection('picks')
                        .where('userId', '==', userId)
                        .get();
                    
                    console.log('🔍 User picks:', picksSnapshot.size);
                    picksSnapshot.forEach(pickDoc => {
                        const pickData = pickDoc.data();
                        console.log('🔍 Pick:', pickData);
                    });
                } else {
                    console.error('❌ No club or edition available');
                }
            } catch (error) {
                console.error('❌ Error debugging user picks:', error);
            }
        } else {
            console.error('❌ GameLogicManager or database not available');
        }
    };

    window.processSpecificFixtureResults = async (fixtureId) => {
        console.log('🔧 Processing results for specific fixture:', fixtureId);
        if (window.gameLogicManager) {
            const currentClub = window.clubService?.getCurrentClub();
            const currentEdition = window.clubService?.getCurrentEdition();
            
            if (currentClub && currentEdition) {
                await window.gameLogicManager.processFixtureResults(currentClub, currentEdition, fixtureId);
            } else {
                console.error('❌ No club or edition available');
            }
        } else {
            console.error('❌ GameLogicManager not available');
        }
    };

    window.debugUserPicks = async (userId) => {
        console.log('🔍 Debugging picks for user:', userId);
        if (window.gameLogicManager && window.gameLogicManager.db) {
            try {
                const currentClub = window.clubService?.getCurrentClub();
                const currentEdition = window.clubService?.getCurrentEdition();
                
                if (currentClub && currentEdition) {
                    const picksSnapshot = await window.gameLogicManager.db.collection('clubs')
                        .doc(currentClub)
                        .collection('editions')
                        .doc(currentEdition)
                        .collection('picks')
                        .where('userId', '==', userId)
                        .get();
                    
                    console.log('🔍 User picks:', picksSnapshot.size);
                    picksSnapshot.forEach(pickDoc => {
                        const pickData = pickDoc.data();
                        console.log('🔍 Pick:', pickData);
                    });
                } else {
                    console.error('❌ No club or edition available');
                }
            } catch (error) {
                console.error('❌ Error debugging user picks:', error);
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
    
    // Add specific debug function for Adam Firth's issue
    window.debugAdamFirth = async () => {
        console.log('🔍 Debugging Adam Firth issue...');
        
        if (!window.gameLogicManager.db) {
            console.log('❌ No database reference available');
            return;
        }
        
        try {
            // Get current club and edition
            const currentClub = window.clubService?.getCurrentClub() || 'default-club';
            const currentEdition = window.editionService?.getCurrentEdition() || '2024-25';
            
            console.log('🔍 Current club:', currentClub, 'edition:', currentEdition);
            
            // Find Adam Firth's user document
            const usersSnapshot = await window.gameLogicManager.db.collection('clubs').doc(currentClub)
                .collection('editions').doc(currentEdition)
                .collection('users').get();
            
            let adamFirth = null;
            usersSnapshot.forEach(doc => {
                const userData = doc.data();
                if (userData.displayName === 'Adam Firth') {
                    adamFirth = { id: doc.id, ...userData };
                }
            });
            
            if (!adamFirth) {
                console.log('❌ Adam Firth not found in users collection');
                return;
            }
            
            console.log('🔍 Found Adam Firth:', adamFirth);
            
            // Get his picks
            const picksSnapshot = await window.gameLogicManager.db.collection('clubs').doc(currentClub)
                .collection('editions').doc(currentEdition)
                .collection('picks')
                .where('userId', '==', adamFirth.id)
                .get();
            
            const picks = {};
            picksSnapshot.forEach(doc => {
                const pickData = doc.data();
                picks[pickData.gameweek] = pickData;
            });
            
            console.log('🔍 Adam Firth picks:', picks);
            
            // Check fixture results for GW1 and GW2
            const fixturesSnapshot = await window.gameLogicManager.db.collection('clubs').doc(currentClub)
                .collection('editions').doc(currentEdition)
                .collection('fixtures')
                .where('gameweek', 'in', ['1', '2'])
                .get();
            
            const fixtures = {};
            fixturesSnapshot.forEach(doc => {
                const fixtureData = doc.data();
                fixtures[fixtureData.gameweek] = { id: doc.id, ...fixtureData };
            });
            
            console.log('🔍 GW1 and GW2 fixtures:', fixtures);
            
            // Calculate expected lives
            const expectedLives = window.gameLogicManager.calculateLivesFromPicks(picks);
            console.log('🔍 Expected lives based on picks:', expectedLives);
            
            // Check if picks need result processing
            let needsProcessing = false;
            Object.entries(picks).forEach(([gameweek, pick]) => {
                if (!pick.result) {
                    console.log(`⚠️ GW${gameweek} pick has no result, needs processing`);
                    needsProcessing = true;
                }
            });
            
            if (needsProcessing) {
                console.log('🔧 Attempting to process fixture results...');
                for (const [gameweek, fixture] of Object.entries(fixtures)) {
                    if (fixture.status === 'finished') {
                        console.log(`🔧 Processing GW${gameweek} fixture results...`);
                        await window.gameLogicManager.processFixtureResults(currentClub, currentEdition, fixture.id);
                    }
                }
                
                // Refresh standings
                await window.gameLogicManager.loadStandings();
                console.log('✅ Standings refreshed after processing');
            }
            
        } catch (error) {
            console.error('❌ Error debugging Adam Firth:', error);
        }
    };
    
    console.log('🔧 Additional debug function added: window.debugAdamFirth()');
    
    // Add function to process existing fixtures and update pick results
    window.processExistingFixtures = async () => {
        console.log('🔄 Processing existing fixtures for all gameweeks...');
        if (window.gameLogicManager && window.gameLogicManager.db) {
            try {
                const currentClub = window.losApp?.managers?.club?.getCurrentClub();
                const currentEdition = window.editionService?.getCurrentEdition();
                
                if (!currentClub || !currentEdition) {
                    console.error('❌ No club or edition available');
                    return;
                }
                
                console.log('🔍 Processing fixtures for club:', currentClub, 'edition:', currentEdition);
                
                // Get all fixtures for the current edition
                const allFixturesSnapshot = await window.gameLogicManager.db.collection('clubs')
                    .doc(currentClub)
                    .collection('editions')
                    .doc(currentEdition)
                    .collection('fixtures')
                    .get();
                
                console.log('🔍 Found fixtures:', allFixturesSnapshot.size);
                
                // Group fixtures by gameweek
                const fixturesByGameweek = {};
                allFixturesSnapshot.docs.forEach(doc => {
                    const fixture = doc.data();
                    const gameweek = fixture.gameWeek;
                    if (!fixturesByGameweek[gameweek]) {
                        fixturesByGameweek[gameweek] = [];
                    }
                    fixturesByGameweek[gameweek].push({ id: doc.id, ...fixture });
                });
                
                // Process each gameweek
                for (const [gameweek, fixtures] of Object.entries(fixturesByGameweek)) {
                    console.log(`🔍 Processing Gameweek ${gameweek} with ${fixtures.length} fixtures`);
                    await window.gameLogicManager.processGameweekResults(currentClub, currentEdition, parseInt(gameweek));
                }
                
                console.log('✅ Finished processing all gameweek results');
                
                // Refresh standings
                await window.gameLogicManager.loadStandings();
                
            } catch (error) {
                console.error('❌ Error processing existing fixtures:', error);
            }
        } else {
            console.error('❌ GameLogicManager not available');
        }
    };
    
    console.log('🔧 Additional function added: window.processExistingFixtures()');
        
        // Add function to inspect fixtures collection
        window.inspectFixtures = async () => {
            console.log('🔍 Inspecting fixtures collection...');
            
            try {
                const currentClub = 'altrincham-fc-juniors';
                const currentEdition = '2025-26-national-league-1';
                
                // Get ALL fixtures (not just GW1 and GW2)
                const allFixturesSnapshot = await window.gameLogicManager.db.collection('clubs').doc(currentClub)
                    .collection('editions').doc(currentEdition)
                    .collection('fixtures')
                    .get();
                
                console.log('🔍 Total fixtures found:', allFixturesSnapshot.size);
                
                // Log each fixture
                allFixturesSnapshot.forEach(doc => {
                    const fixtureData = doc.data();
                    console.log(`🔍 Fixture ${doc.id}:`, {
                        gameWeek: fixtureData.gameWeek,
                        gameweek: fixtureData.gameweek, // Check both spellings
                        homeTeam: fixtureData.homeTeam || fixtureData['home-team']?.name,
                        awayTeam: fixtureData.awayTeam || fixtureData['away-team']?.name,
                        homeScore: fixtureData.homeScore || fixtureData['home-team']?.score,
                        awayScore: fixtureData.awayScore || fixtureData['away-team']?.score,
                        status: fixtureData.status,
                        statusFull: fixtureData.status?.full,
                        statusShort: fixtureData.status?.short,
                        date: fixtureData.date,
                        competition: fixtureData.competition?.name
                    });
                });
                
                // Also check if there are any fixtures with different field names
                if (allFixturesSnapshot.size > 0) {
                    const sampleFixture = allFixturesSnapshot.docs[0].data();
                    console.log('🔍 Sample fixture all fields:', Object.keys(sampleFixture));
                    console.log('🔍 Sample fixture full data:', sampleFixture);
                }
                
            } catch (error) {
                console.error('❌ Error inspecting fixtures:', error);
            }
        };
        
        console.log('🔧 Additional function added: window.inspectFixtures()');

        // Add function to manually fix Adam Firth's GW1 pick
        window.fixAdamFirthGW1 = async () => {
            console.log('🔧 Manually fixing Adam Firth GW1 pick...');
            
            try {
                const currentClub = 'altrincham-fc-juniors';
                const currentEdition = '2025-26-national-league-1';
                
                // Get Adam Firth's GW1 pick using the exact field names from inspection
                const picksSnapshot = await window.gameLogicManager.db.collection('clubs').doc(currentClub)
                    .collection('editions').doc(currentEdition)
                    .collection('picks')
                    .where('userId', '==', '0OPG5mi5H5fR5J188YKwtw8Wm1s2')
                    .where('gameweek', '==', 1)
                    .get();
                
                if (picksSnapshot.empty) {
                    console.log('❌ No GW1 pick found for Adam Firth');
                    console.log('🔍 Trying alternative query...');
                    
                    // Try getting all picks and filtering manually
                    const allPicksSnapshot = await window.gameLogicManager.db.collection('clubs').doc(currentClub)
                        .collection('editions').doc(currentEdition)
                        .collection('picks')
                        .get();
                    
                    console.log('🔍 Total picks found:', allPicksSnapshot.size);
                    
                    let targetPick = null;
                    let targetDoc = null;
                    
                    for (let i = 0; i < allPicksSnapshot.docs.length; i++) {
                        const doc = allPicksSnapshot.docs[i];
                        const pickData = doc.data();
                        
                        console.log(`🔍 Checking pick ${i + 1}:`, {
                            userId: pickData.userId,
                            gameweek: pickData.gameweek,
                            teamPicked: pickData.teamPicked,
                            result: pickData.result
                        });
                        
                        // Debug the exact types
                        console.log(`🔍 Type check - userId: "${pickData.userId}" (type: ${typeof pickData.userId}), gameweek: ${pickData.gameweek} (type: ${typeof pickData.gameweek})`);
                        console.log(`🔍 Comparison check - userId match: ${pickData.userId === '0OPG5mi5H5fR5J188YKwtw8Wm1s2'}, gameweek match: ${pickData.gameweek === 1}`);
                        
                        if (pickData.userId === '0OPG5mi5H5fR5J188YKwtw8Wm1s2' && pickData.gameweek === 1) {
                            console.log('✅ Found matching pick!');
                            targetPick = pickData;
                            targetDoc = doc;
                            break;
                        }
                    }
                    
                    if (!targetPick) {
                        console.log('❌ Still no GW1 pick found for Adam Firth');
                        console.log('🔍 All picks data:');
                        allPicksSnapshot.forEach((doc, index) => {
                            const pickData = doc.data();
                            console.log(`🔍 Pick ${index + 1}:`, pickData);
                        });
                        return;
                    }
                    
                    console.log('🔍 Found GW1 pick manually:', targetPick);
                    console.log('🔍 Current result:', targetPick.result);
                    
                    // Update the pick to show LOSS (Aldershot Town lost 2-3 to Altrincham)
                    await targetDoc.ref.update({
                        result: 'loss',
                        processedAt: new Date()
                    });
                    
                    console.log('✅ Updated Adam Firth GW1 pick from "win" to "loss"');
                    
                    // Refresh standings
                    await window.gameLogicManager.loadStandings();
                    
                    console.log('✅ Standings refreshed - Adam Firth should now show 0 lives!');
                    
                } else {
                    const pickDoc = picksSnapshot.docs[0];
                    const pickData = pickDoc.data();
                    
                    console.log('🔍 Current GW1 pick data:', pickData);
                    console.log('🔍 Current result:', pickData.result);
                    
                    // Update the pick to show LOSS (Aldershot Town lost 2-3 to Altrincham)
                    await pickDoc.ref.update({
                        result: 'loss',
                        processedAt: new Date()
                    });
                    
                    console.log('✅ Updated Adam Firth GW1 pick from "win" to "loss"');
                    
                    // Refresh standings
                    await window.gameLogicManager.loadStandings();
                    
                    console.log('✅ Standings refreshed - Adam Firth should now show 0 lives!');
                }
                
            } catch (error) {
                console.error('❌ Error fixing Adam Firth GW1 pick:', error);
            }
        };

        // Add function to inspect Adam Firth's pick data structure
        window.inspectAdamFirthPicks = async () => {
            console.log('🔍 Inspecting Adam Firth pick data structure...');
            
            try {
                const currentClub = 'altrincham-fc-juniors';
                const currentEdition = '2025-26-national-league-1';
                
                // Get all picks for Adam Firth
                const picksSnapshot = await window.gameLogicManager.db.collection('clubs').doc(currentClub)
                    .collection('editions').doc(currentEdition)
                    .collection('picks')
                    .where('userId', '==', '0OPG5mi5H5fR5J188YKwtw8m1s2')
                    .get();
                
                if (picksSnapshot.empty) {
                    console.log('❌ No picks found for Adam Firth');
                    return;
                }
                
                console.log('🔍 Found picks:', picksSnapshot.size);
                
                picksSnapshot.forEach((doc, index) => {
                    const pickData = doc.data();
                    console.log(`🔍 Pick ${index + 1}:`, pickData);
                    console.log(`🔍 Pick ${index + 1} fields:`, Object.keys(pickData));
                    console.log(`🔍 Pick ${index + 1} gameweek field:`, {
                        gameweek: pickData.gameweek,
                        gameWeek: pickData.gameWeek,
                        'game-week': pickData['game-week']
                    });
                });
                
            } catch (error) {
                console.error('❌ Error inspecting picks:', error);
            }
        };

        // Add function to inspect all picks in the collection
        window.inspectAllPicks = async () => {
            console.log('🔍 Inspecting all picks in collection...');
            
            try {
                const currentClub = 'altrincham-fc-juniors';
                const currentEdition = '2025-26-national-league-1';
                
                // Get ALL picks (no filters)
                const picksSnapshot = await window.gameLogicManager.db.collection('clubs').doc(currentClub)
                    .collection('editions').doc(currentEdition)
                    .collection('picks')
                    .get();
                
                if (picksSnapshot.empty) {
                    console.log('❌ No picks found in collection');
                    return;
                }
                
                console.log('🔍 Total picks in collection:', picksSnapshot.size);
                
                picksSnapshot.forEach((doc, index) => {
                    const pickData = doc.data();
                    console.log(`🔍 Pick ${index + 1} (ID: ${doc.id}):`, pickData);
                    console.log(`🔍 Pick ${index + 1} fields:`, Object.keys(pickData));
                    
                    // Check for user identification fields
                    const userFields = {
                        userId: pickData.userId,
                        uid: pickData.uid,
                        user: pickData.user,
                        'user-id': pickData['user-id']
                    };
                    console.log(`🔍 Pick ${index + 1} user fields:`, userFields);
                    
                    // Check for gameweek fields
                    const gameweekFields = {
                        gameweek: pickData.gameweek,
                        gameWeek: pickData.gameWeek,
                        'game-week': pickData['game-week'],
                        week: pickData.week
                    };
                    console.log(`🔍 Pick ${index + 1} gameweek fields:`, gameweekFields);
                });
                
            } catch (error) {
                console.error('❌ Error inspecting all picks:', error);
            }
        };
});

