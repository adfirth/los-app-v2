class DeadlineService {
    constructor() {
        this.isInitialized = false;
        this.dataLoaded = false; // Track if data has been loaded
        this.deadlinePassed = false;
        this.deadlineCheckInterval = null;
        this.db = null;
        
        // Don't auto-initialize - wait for main app to control initialization
        // this.init();
    }

    initBasic() {
        if (this.isInitialized) return;
        
        // Only set up basic structure, don't load data yet
        this.isInitialized = true;
        console.log('DeadlineService basic initialization complete');
    }

    init() {
        if (this.isInitialized && this.dataLoaded) return;
        
        // Set up Firebase database reference
        this.db = window.firebaseDB;
        
        // Start deadline monitoring
        this.startDeadlineMonitoring();
        this.dataLoaded = true;
        console.log('DeadlineService full initialization complete');
    }

    restoreFirebaseConnection() {
        // This method will be called by the main app after initialization
        // to restore Firebase functionality
        console.log('DeadlineService Firebase connection restored');
    }

    clearListeners() {
        // Clear any existing Firebase listeners
        console.log('DeadlineService: Clearing listeners...');
        
        // Unregister from the main app's listener tracking if needed
        if (window.losApp) {
            window.losApp.unregisterListener('deadline-monitoring');
        }
    }

    showError(message) {
        if (window.authManager && window.authManager.showError) {
            window.authManager.showError(message);
        } else {
            console.error(message);
        }
    }

    destroy() {
        // Clean up resources
        this.stopDeadlineMonitoring();
        console.log('DeadlineService destroyed');
    }

    startDeadlineMonitoring() {
        // Check deadlines every minute
        this.deadlineCheckInterval = setInterval(() => {
            this.checkDeadlines();
        }, 60000); // 60 seconds

        // Also check immediately on init
        this.checkDeadlines();
    }

    stopDeadlineMonitoring() {
        if (this.deadlineCheckInterval) {
            clearInterval(this.deadlineCheckInterval);
            this.deadlineCheckInterval = null;
        }
    }

    async checkDeadlines() {
        try {
            const currentGameweek = window.editionService.getCurrentGameweek();
            const currentEdition = window.editionService.getCurrentEdition();
            
            // Get fixtures for current gameweek
            const fixturesDoc = await this.db.collection('fixtures')
                .doc(`${currentEdition}_gw${currentGameweek}`)
                .get();
            
            if (!fixturesDoc.exists) {
                return; // No fixtures to check
            }
            
            const fixturesData = fixturesDoc.data();
            const fixtures = fixturesData.fixtures || [];
            
            if (fixtures.length === 0) {
                return; // No fixtures to check
            }
            
            // Find the earliest kick-off time
            const earliestFixture = fixtures.reduce((earliest, fixture) => {
                const fixtureTime = new Date(`${fixture.date}T${fixture.kickOffTime}`);
                const earliestTime = new Date(`${earliest.date}T${earliest.kickOffTime}`);
                return fixtureTime < earliestTime ? fixture : earliest;
            });
            
            const deadlineTime = new Date(`${earliestFixture.date}T${earliestFixture.kickOffTime}`);
            const now = new Date();
            
            // Check if deadline has passed
            if (now >= deadlineTime && !this.deadlinePassed) {
                this.deadlinePassed = true;
                await this.handleDeadlinePassed(currentGameweek);
            }
            
        } catch (error) {
            // Suppress "Target ID already exists" messages as they're not real errors
            if (!error.message.includes('Target ID already exists')) {
                console.error('Error checking deadlines:', error);
            }
        }
    }

    async handleDeadlinePassed(gameweek) {
        try {
            console.log(`Deadline passed for Gameweek ${gameweek}`);
            
            // Assign auto-picks for users who haven't made picks
            await this.assignAutoPicksForDeadline(gameweek);
            
            // Update UI to show deadline has passed
            this.updateDeadlineDisplay();
            
            // Only show notification if user is logged in
            if (window.authManager && window.authManager.currentUser) {
                window.authManager.showInfo(`Deadline passed for Gameweek ${gameweek}. Auto-picks have been assigned.`);
            }
            
        } catch (error) {
            console.error('Error handling deadline passed:', error);
            // Only show error if user is logged in
            if (window.authManager && window.authManager.currentUser) {
                window.authManager.showError('Error processing deadline. Please contact admin.');
            }
        }
    }

    async assignAutoPicksForDeadline(gameweek) {
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
            let autoPicksAssigned = 0;
            
            for (const doc of usersSnapshot.docs) {
                const userData = doc.data();
                
                // Get current club and edition from ClubService
                const currentClubId = window.losApp?.managers?.club?.getCurrentClub();
                const currentEdition = window.losApp?.managers?.club?.getCurrentEdition();
                
                if (!currentClubId || !currentEdition) {
                    console.log('⚠️ DeadlineService: No club or edition available for auto-pick');
                    continue;
                }
                
                // Check if user has already made a pick for this gameweek from multi-club structure
                let hasPick = false;
                try {
                    const picksSnapshot = await this.db.collection('clubs').doc(currentClubId)
                        .collection('editions').doc(currentEdition)
                        .collection('picks')
                        .where('userId', '==', doc.id)
                        .where('gameweek', '==', gameweek)
                        .get();
                    
                    hasPick = !picksSnapshot.empty;
                } catch (error) {
                    console.error('Error checking user picks:', error);
                }
                
                if (!hasPick && userData.lives > 0) {
                    // Get existing picks for auto-pick logic from multi-club structure
                    let existingPicks = {};
                    try {
                        const allPicksSnapshot = await this.db.collection('clubs').doc(currentClubId)
                            .collection('editions').doc(currentEdition)
                            .collection('picks')
                            .where('userId', '==', doc.id)
                            .get();
                        
                        allPicksSnapshot.forEach(pickDoc => {
                            const pickData = pickDoc.data();
                            existingPicks[`gw${pickData.gameweek}`] = pickData.teamPicked;
                        });
                    } catch (error) {
                        console.error('Error loading existing picks for auto-pick:', error);
                    }
                    
                    // Assign auto-pick
                    const autoPick = this.getAutoPick(existingPicks, availableTeams, gameweek);
                    
                    if (autoPick) {
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
                        
                        autoPicksAssigned++;
                        console.log(`✅ Auto-pick assigned: ${autoPick} for user ${doc.id} in gameweek ${gameweek}`);
                    }
                }
            }
            
            // Commit the batch update
            if (autoPicksAssigned > 0) {
                await batch.commit();
                console.log(`${autoPicksAssigned} auto-picks assigned for Gameweek ${gameweek}`);
            }
            
        } catch (error) {
            console.error('Error assigning auto-picks for deadline:', error);
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

    updateDeadlineDisplay() {
        const deadlineText = document.getElementById('deadlineText');
        if (deadlineText) {
            deadlineText.textContent = 'Deadline: PASSED';
            deadlineText.style.color = '#dc3545';
        }
    }

    async getDeadlineInfo(gameweek) {
        try {
            // Ensure Firebase is ready
            if (!window.firebaseReady || !this.db || typeof this.db.collection !== 'function') {
                console.log('DeadlineService: Firebase not ready, retrying in 2 seconds...');
                
                // Try to update our database reference if Firebase is ready but we don't have it
                if (window.firebaseReady && window.firebaseDB && !this.db) {
                    console.log('DeadlineService: Updating database reference from global Firebase...');
                    this.db = window.firebaseDB;
                }
                
                setTimeout(() => this.getDeadlineInfo(gameweek), 2000);
                return null;
            }
            
            const currentEdition = window.editionService.getCurrentEdition();
            
            const fixturesDoc = await this.db.collection('fixtures')
                .doc(`${currentEdition}_gw${gameweek}`)
                .get();
            
            if (!fixturesDoc.exists) {
                return null;
            }
            
            const fixturesData = fixturesDoc.data();
            const fixtures = fixturesData.fixtures || [];
            
            if (fixtures.length === 0) {
                return null;
            }
            
            // Find the earliest kick-off time
            const earliestFixture = fixtures.reduce((earliest, fixture) => {
                const fixtureTime = new Date(`${fixture.date}T${fixture.kickOffTime}`);
                const earliestTime = new Date(`${earliest.date}T${earliest.kickOffTime}`);
                return fixtureTime < earliestTime ? fixture : earliest;
            });
            
            const deadlineTime = new Date(`${earliestFixture.date}T${earliestFixture.kickOffTime}`);
            const now = new Date();
            
            return {
                deadlineTime: deadlineTime,
                isPassed: now >= deadlineTime,
                timeUntilDeadline: deadlineTime - now,
                earliestFixture: earliestFixture
            };
            
        } catch (error) {
            console.error('Error getting deadline info:', error);
            return null;
        }
    }

    formatTimeUntilDeadline(milliseconds) {
        if (milliseconds <= 0) {
            return 'Deadline passed';
        }
        
        const hours = Math.floor(milliseconds / (1000 * 60 * 60));
        const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
        
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days} days remaining`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m remaining`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s remaining`;
        } else {
            return `${seconds}s remaining`;
        }
    }

    async checkUserDeadlineStatus(userId, gameweek) {
        try {
            // Ensure Firebase is ready
            if (!window.firebaseReady || !this.db || typeof this.db.collection !== 'function') {
                console.log('DeadlineService: Firebase not ready for user deadline check, retrying in 2 seconds...');
                
                // Try to update our database reference if Firebase is ready but we don't have it
                if (window.firebaseReady && window.firebaseDB && !this.db) {
                    console.log('DeadlineService: Updating database reference from global Firebase...');
                    this.db = window.firebaseDB;
                }
                
                setTimeout(() => this.checkUserDeadlineStatus(userId, gameweek), 2000);
                return { hasPick: false, isDeadlinePassed: false };
            }
            
            const userDoc = await this.db.collection('users').doc(userId).get();
            if (!userDoc.exists) {
                return { hasPick: false, isDeadlinePassed: false };
            }
            
            const userData = userDoc.data();
            
            // Get current club and edition from ClubService
            const currentClubId = window.losApp?.managers?.club?.getCurrentClub();
            const currentEdition = window.losApp?.managers?.club?.getCurrentEdition();
            
            if (!currentClubId || !currentEdition) {
                console.log('⚠️ DeadlineService: No club or edition available for checking deadline status');
                return { hasPick: false, isDeadlinePassed: false };
            }
            
            // Check if user has pick from multi-club structure
            let hasPick = false;
            let pickData = null;
            try {
                const picksSnapshot = await this.db.collection('clubs').doc(currentClubId)
                    .collection('editions').doc(currentEdition)
                    .collection('picks')
                    .where('userId', '==', userId)
                    .where('gameweek', '==', gameweek)
                    .get();
                
                hasPick = !picksSnapshot.empty;
                if (hasPick) {
                    pickData = picksSnapshot.docs[0].data();
                }
            } catch (error) {
                console.error('Error checking user picks from multi-club structure:', error);
            }
            
            const deadlineInfo = await this.getDeadlineInfo(gameweek);
            const isDeadlinePassed = deadlineInfo ? deadlineInfo.isPassed : false;
            
            return {
                hasPick: hasPick,
                isDeadlinePassed: isDeadlinePassed,
                pick: pickData
            };
            
        } catch (error) {
            console.error('Error checking user deadline status:', error);
            return { hasPick: false, isDeadlinePassed: false };
        }
    }

    // Admin methods
    async manuallyTriggerDeadline(gameweek) {
        try {
            console.log(`Manually triggering deadline for Gameweek ${gameweek}`);
            
            this.deadlinePassed = true;
            await this.handleDeadlinePassed(gameweek);
            
            return true;
        } catch (error) {
            console.error('Error manually triggering deadline:', error);
            throw error;
        }
    }

    // Manual auto-pick assignment for specific gameweek
    async manuallyAssignAutoPicks(gameweek) {
        try {
            console.log(`Manually assigning auto-picks for Gameweek ${gameweek}`);
            
            // Get current club and edition from ClubService
            const currentClubId = window.losApp?.managers?.club?.getCurrentClub();
            const currentEdition = window.losApp?.managers?.club?.getCurrentEdition();
            
            if (!currentClubId || !currentEdition) {
                console.error('❌ No club or edition available for auto-pick assignment');
                return false;
            }
            
            console.log(`🔍 Assigning auto-picks for club: ${currentClubId}, edition: ${currentEdition}`);
            
            // Get all users for this club/edition
            const usersSnapshot = await this.db.collection('clubs').doc(currentClubId)
                .collection('editions').doc(currentEdition)
                .collection('users')
                .get();
            
            if (usersSnapshot.empty) {
                console.log('⚠️ No users found for auto-pick assignment');
                return false;
            }
            
            // Get available teams for this gameweek
            const fixturesSnapshot = await this.db.collection('clubs').doc(currentClubId)
                .collection('editions').doc(currentEdition)
                .collection('fixtures')
                .where('gameWeek', '==', gameweek)
                .get();
            
            if (fixturesSnapshot.empty) {
                console.error('❌ No fixtures found for this gameweek');
                return false;
            }
            
            const fixtures = [];
            fixturesSnapshot.forEach(doc => {
                fixtures.push(doc.data());
            });
            
            // Get all available teams
            const availableTeams = [];
            fixtures.forEach(fixture => {
                availableTeams.push(fixture.homeTeam, fixture.awayTeam);
            });
            
            console.log(`🔍 Available teams for auto-pick:`, availableTeams);
            
            const batch = this.db.batch();
            let autoPicksAssigned = 0;
            
            // Process users sequentially to avoid async issues
            for (const doc of usersSnapshot.docs) {
                const userData = doc.data();
                
                // Check if user has already made a pick for this gameweek
                let hasPick = false;
                try {
                    const picksSnapshot = await this.db.collection('clubs').doc(currentClubId)
                        .collection('editions').doc(currentEdition)
                        .collection('picks')
                        .where('userId', '==', doc.id)
                        .where('gameweek', '==', gameweek)
                        .get();
                    
                    hasPick = !picksSnapshot.empty;
                } catch (error) {
                    console.error('Error checking user picks:', error);
                }
                
                if (!hasPick && userData.lives > 0) {
                    // Get existing picks for auto-pick logic
                    let existingPicks = {};
                    try {
                        const allPicksSnapshot = await this.db.collection('clubs').doc(currentClubId)
                            .collection('editions').doc(currentEdition)
                            .collection('picks')
                            .where('userId', '==', doc.id)
                            .get();
                        
                        allPicksSnapshot.forEach(pickDoc => {
                            const pickData = pickDoc.data();
                            existingPicks[`gw${pickData.gameweek}`] = pickData.teamPicked;
                        });
                    } catch (error) {
                        console.error('Error loading existing picks for auto-pick:', error);
                    }
                    
                    // Assign auto-pick
                    const autoPick = this.getAutoPick(existingPicks, availableTeams, gameweek);
                    
                    if (autoPick) {
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
                        
                        autoPicksAssigned++;
                        console.log(`✅ Auto-pick assigned: ${autoPick} for user ${doc.id} in gameweek ${gameweek}`);
                    }
                }
            }
            
            // Commit the batch update
            if (autoPicksAssigned > 0) {
                await batch.commit();
                console.log(`✅ ${autoPicksAssigned} auto-picks assigned for Gameweek ${gameweek}`);
                return true;
            } else {
                console.log('ℹ️ No auto-picks needed - all users already have picks');
                return true;
            }
            
        } catch (error) {
            console.error('Error manually assigning auto-picks:', error);
            throw error;
        }
    }

    async extendDeadline(gameweek, newDeadlineTime) {
        try {
            const currentEdition = window.editionService.getCurrentEdition();
            
            // Update the earliest fixture's kick-off time
            const fixturesDoc = await this.db.collection('fixtures')
                .doc(`${currentEdition}_gw${gameweek}`)
                .get();
            
            if (!fixturesDoc.exists) {
                throw new Error('No fixtures found for this gameweek');
            }
            
            const fixturesData = fixturesDoc.data();
            const fixtures = fixturesData.fixtures || [];
            
            if (fixtures.length === 0) {
                throw new Error('No fixtures found for this gameweek');
            }
            
            // Find the earliest fixture and update its time
            const earliestFixtureIndex = fixtures.reduce((earliestIndex, fixture, index) => {
                const fixtureTime = new Date(`${fixture.date}T${fixture.kickOffTime}`);
                const earliestTime = new Date(`${fixtures[earliestIndex].date}T${fixtures[earliestIndex].kickOffTime}`);
                return fixtureTime < earliestTime ? index : earliestIndex;
            }, 0);
            
            // Update the deadline time
            const newDate = new Date(newDeadlineTime);
            fixtures[earliestFixtureIndex].date = newDate.toISOString().split('T')[0];
            fixtures[earliestFixtureIndex].kickOffTime = newDate.toTimeString().split(' ')[0];
            
            // Update the fixture in the database
            await this.db.collection('fixtures')
                .doc(`${currentEdition}_gw${gameweek}`)
                .update({
                    fixtures: fixtures,
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            // Reset deadline passed flag
            this.deadlinePassed = false;
            
            console.log(`Deadline extended for Gameweek ${gameweek} to ${newDeadlineTime}`);
            
            return true;
        } catch (error) {
            console.error('Error extending deadline:', error);
            throw error;
        }
    }

    // Getter methods
    isDeadlinePassed() {
        return this.deadlinePassed;
    }

    getDeadlineCheckInterval() {
        return this.deadlineCheckInterval;
    }

    // Cleanup method
    destroy() {
        this.stopDeadlineMonitoring();
    }
}

// Initialize DeadlineService when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.deadlineService = new DeadlineService();
});
