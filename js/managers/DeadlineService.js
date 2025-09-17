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

    async checkAllDeadlines() {
        try {
            // Ensure database connection is available
            if (!this.db) {
                console.log('🔧 DeadlineService: Database connection not available in checkAllDeadlines, attempting to restore...');
                this.restoreFirebaseConnection();
                
                // If still not available, try to get it from global
                if (!this.db && window.firebaseDB) {
                    this.db = window.firebaseDB;
                }
                
                if (!this.db) {
                    throw new Error('Database connection not available after restore attempts');
                }
            }
            
            const currentEdition = window.editionService.getCurrentEdition();
            const currentClubId = window.losApp?.managers?.club?.getCurrentClub();
            
            if (!currentClubId || !currentEdition) {
                console.log('⚠️ DeadlineService: No club or edition available for deadline check');
                return;
            }
            
            // Get all fixtures for the current edition to check all gameweeks
            const allFixturesSnapshot = await this.db.collection('clubs').doc(currentClubId)
                .collection('editions').doc(currentEdition)
                .collection('fixtures')
                .get();
            
            if (allFixturesSnapshot.empty) {
                console.log('ℹ️ DeadlineService: No fixtures found for deadline check');
                return;
            }
            
            // Group fixtures by gameweek
            const fixturesByGameweek = {};
            allFixturesSnapshot.docs.forEach(doc => {
                const fixture = doc.data();
                const gameweek = fixture.gameWeek;
                if (!fixturesByGameweek[gameweek]) {
                    fixturesByGameweek[gameweek] = [];
                }
                fixturesByGameweek[gameweek].push(fixture);
                
                // Debug: Log the first fixture of each gameweek to see the data structure
                if (fixturesByGameweek[gameweek].length === 1) {
                    console.log(`🔍 DeadlineService: Sample fixture data for GW${gameweek}:`, {
                        id: doc.id,
                        homeTeam: fixture.homeTeam,
                        awayTeam: fixture.awayTeam,
                        date: fixture.date,
                        kickOffTime: fixture.kickOffTime,
                        dateType: typeof fixture.date,
                        timeType: typeof fixture.kickOffTime,
                        hasDate: !!fixture.date,
                        hasTime: !!fixture.kickOffTime
                    });
                }
            });
            
            // Checking deadlines for gameweeks
            
            // Check each gameweek for deadlines
            for (const [gameweek, fixtures] of Object.entries(fixturesByGameweek)) {
                if (fixtures.length === 0) continue;
                
                // Find the earliest kick-off time for this gameweek
                const earliestFixture = fixtures.reduce((earliest, fixture) => {
                    try {
                        const fixtureTime = new Date(`${fixture.date}T${fixture.kickOffTime}`);
                        const earliestTime = new Date(`${earliest.date}T${earliest.kickOffTime}`);
                        
                        // Validate dates
                        if (isNaN(fixtureTime.getTime())) {
                            console.warn(`⚠️ DeadlineService: Invalid fixture date/time for ${fixture.homeTeam} vs ${fixture.awayTeam}:`, {
                                date: fixture.date,
                                kickOffTime: fixture.kickOffTime,
                                combined: `${fixture.date}T${fixture.kickOffTime}`
                            });
                            return earliest;
                        }
                        
                        if (isNaN(earliestTime.getTime())) {
                            console.warn(`⚠️ DeadlineService: Invalid earliest fixture date/time:`, {
                                date: earliest.date,
                                kickOffTime: earliest.kickOffTime,
                                combined: `${earliest.date}T${earliest.kickOffTime}`
                            });
                            return fixture;
                        }
                        
                        return fixtureTime < earliestTime ? fixture : earliest;
                    } catch (dateError) {
                        console.warn(`⚠️ DeadlineService: Error parsing fixture date/time:`, dateError);
                        return earliest;
                    }
                });
                
                // Validate the earliest fixture date/time
                const deadlineTime = new Date(`${earliestFixture.date}T${earliestFixture.kickOffTime}`);
                if (isNaN(deadlineTime.getTime())) {
                    console.warn(`⚠️ DeadlineService: Skipping Gameweek ${gameweek} - invalid date/time for earliest fixture:`, {
                        fixture: `${earliestFixture.homeTeam} vs ${earliestFixture.awayTeam}`,
                        date: earliestFixture.date,
                        kickOffTime: earliestFixture.kickOffTime,
                        combined: `${earliestFixture.date}T${earliestFixture.kickOffTime}`
                    });
                    continue;
                }
                
                const now = new Date();
                
                        // Processing deadline for gameweek
                
                // Check if deadline has passed
                if (now >= deadlineTime) {
                    console.log(`⏰ DeadlineService: Deadline has passed for Gameweek ${gameweek}`);
                    
                    // Check if we've already processed this deadline
                    const deadlineKey = `deadline_${gameweek}`;
                    if (!this.processedDeadlines) {
                        this.processedDeadlines = {};
                    }
                    
                    if (!this.processedDeadlines[deadlineKey]) {
                        console.log(`🔧 DeadlineService: Processing deadline for Gameweek ${gameweek} for the first time`);
                        this.processedDeadlines[deadlineKey] = true;
                        await this.handleDeadlinePassed(parseInt(gameweek));
                    } else {
                        console.log(`ℹ️ DeadlineService: Deadline for Gameweek ${gameweek} already processed`);
                    }
                } else {
                    console.log(`⏰ DeadlineService: Deadline not yet passed for Gameweek ${gameweek}`);
                }
            }
            
        } catch (error) {
            console.error('Error checking all deadlines:', error);
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
            // Ensure database connection is available
            if (!this.db) {
                console.log('🔧 DeadlineService: Database connection not available in assignAutoPicksForDeadline, attempting to restore...');
                this.restoreFirebaseConnection();
                
                // If still not available, try to get it from global
                if (!this.db && window.firebaseDB) {
                    this.db = window.firebaseDB;
                }
                
                if (!this.db) {
                    throw new Error('Database connection not available after restore attempts');
                }
            }
            
            // Get current club and edition from ClubService
            const currentClubId = window.losApp?.managers?.club?.getCurrentClub();
            const currentEdition = window.losApp?.managers?.club?.getCurrentEdition();
            
            if (!currentClubId || !currentEdition) {
                console.log('⚠️ DeadlineService: No club or edition available for auto-pick');
                throw new Error('No club or edition available for auto-pick');
            }
            
            console.log(`🔧 DeadlineService: Assigning autopicks for club: ${currentClubId}, edition: ${currentEdition}, gameweek: ${gameweek}`);
            
            // Get all users for current edition from new multi-club structure
            const usersSnapshot = await this.db.collection('clubs').doc(currentClubId)
                .collection('editions').doc(currentEdition)
                .collection('users')
                .get();
            
            console.log(`🔧 DeadlineService: Found ${usersSnapshot.size} users for autopick assignment`);
            
            // Get available teams for this gameweek from new multi-club structure
            // Query for individual fixtures where gameWeek matches
            const fixturesSnapshot = await this.db.collection('clubs').doc(currentClubId)
                .collection('editions').doc(currentEdition)
                .collection('fixtures')
                .where('gameWeek', '==', gameweek)
                .get();
            
            if (fixturesSnapshot.empty) {
                throw new Error(`No fixtures found for gameweek ${gameweek}`);
            }
            
            console.log(`🔧 DeadlineService: Found ${fixturesSnapshot.size} fixtures for gameweek ${gameweek}`);
            
            // Get all available teams from individual fixture documents
            const availableTeams = [];
            fixturesSnapshot.forEach(doc => {
                const fixtureData = doc.data();
                if (fixtureData.homeTeam && fixtureData.awayTeam) {
                    availableTeams.push(fixtureData.homeTeam, fixtureData.awayTeam);
                    console.log(`🔧 DeadlineService: Fixture ${doc.id}: ${fixtureData.homeTeam} vs ${fixtureData.awayTeam}`);
                }
            });
            
            console.log(`🔧 DeadlineService: Available teams for autopick:`, availableTeams);
            
            const batch = this.db.batch();
            let autoPicksAssigned = 0;
            
            for (const doc of usersSnapshot.docs) {
                const userData = doc.data();
                console.log(`🔧 DeadlineService: Processing user ${doc.id} (${userData.displayName || 'Unknown'}) for autopick`);
                
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
                    console.log(`🔧 DeadlineService: User ${doc.id} needs autopick - lives: ${userData.lives}, hasPick: ${hasPick}`);
                    
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
                        
                        console.log(`🔧 DeadlineService: User ${doc.id} existing picks:`, existingPicks);
                    } catch (error) {
                        console.error('Error loading existing picks for auto-pick:', error);
                    }
                    
                    // Assign auto-pick
                    const autoPick = this.getAutoPick(existingPicks, availableTeams, gameweek);
                    console.log(`🔧 DeadlineService: Auto-pick algorithm result for user ${doc.id}: ${autoPick}`);
                    
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
                    } else {
                        console.log(`⚠️ DeadlineService: No auto-pick available for user ${doc.id} in gameweek ${gameweek}`);
                    }
                } else {
                    console.log(`🔧 DeadlineService: User ${doc.id} skipped - hasPick: ${hasPick}, lives: ${userData.lives}`);
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

    // Manual method to trigger autopick assignment for testing
    async manualAssignAutoPicks(gameweek = null) {
        try {
            if (!gameweek) {
                gameweek = window.editionService.getCurrentGameweek();
            }
            
            console.log(`🔧 DeadlineService: Manual autopick assignment triggered for gameweek ${gameweek}`);
            
            // Ensure database connection is available
            if (!this.db) {
                console.log('🔧 DeadlineService: Database connection not available, attempting to restore...');
                this.restoreFirebaseConnection();
                
                // If still not available, try to get it from global
                if (!this.db && window.firebaseDB) {
                    this.db = window.firebaseDB;
                }
                
                if (!this.db) {
                    throw new Error('Database connection not available after restore attempts');
                }
            }
            
            await this.assignAutoPicksForDeadline(gameweek);
        } catch (error) {
            console.error('❌ Manual autopick assignment failed:', error);
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

// DeadlineService will be initialized by the main app
// Global helper functions for debugging
    
    // Add global helper functions for debugging
    window.assignAutoPicks = (gameweek) => {
        console.log('🔧 DeadlineService: Manual autopick assignment triggered from console...');
        if (window.deadlineService) {
            window.deadlineService.manualAssignAutoPicks(gameweek);
        } else {
            console.error('❌ DeadlineService not available');
        }
    };
    
    // Add global helper function to check all deadlines
    window.checkAllDeadlines = () => {
        console.log('🔧 DeadlineService: Manual deadline check triggered from console...');
        if (window.deadlineService) {
            // Check if database connection is available
            if (!window.deadlineService.db && window.firebaseDB) {
                console.log('🔧 DeadlineService: Restoring database connection from global...');
                window.deadlineService.db = window.firebaseDB;
            }
            
            if (window.deadlineService.db) {
                window.deadlineService.checkAllDeadlines();
            } else {
                console.error('❌ DeadlineService: No database connection available');
                console.log('💡 Try refreshing the page or waiting for Firebase to initialize');
            }
        } else {
            console.error('❌ DeadlineService not available');
        }
    };
    
    // Add global helper function to rename time field to kickOffTime
    window.renameTimeToKickOffTime = async () => {
        console.log('🔧 DeadlineService: Renaming time field to kickOffTime for all fixtures...');
        
        const currentClub = window.losApp?.managers?.club?.getCurrentClub();
        const currentEdition = window.editionService?.getCurrentEdition();
        
        if (!currentClub || !currentEdition) {
            console.error('❌ No club or edition available');
            return;
        }
        
        try {
            // Get all fixtures
            const fixturesSnapshot = await window.firebaseDB.collection('clubs')
                .doc(currentClub)
                .collection('editions')
                .doc(currentEdition)
                .collection('fixtures')
                .get();
            
            console.log(`🔍 Found ${fixturesSnapshot.size} fixtures to update`);
            
            // Update each fixture to rename 'time' to 'kickOffTime'
            const batch = window.firebaseDB.batch();
            let updatedCount = 0;
            
            fixturesSnapshot.docs.forEach(doc => {
                const fixture = doc.data();
                if (fixture.time && !fixture.kickOffTime) {
                    // Create new fixture data with kickOffTime instead of time
                    const updatedFixture = {
                        ...fixture,
                        kickOffTime: fixture.time,
                        updated_at: new Date()
                    };
                    
                    // Remove the old 'time' field
                    delete updatedFixture.time;
                    
                    batch.update(doc.ref, updatedFixture);
                    updatedCount++;
                    console.log(`🔧 Will update: ${fixture.homeTeam} vs ${fixture.awayTeam} (GW${fixture.gameWeek}) - time: ${fixture.time} → kickOffTime: ${fixture.time}`);
                }
            });
            
            if (updatedCount > 0) {
                await batch.commit();
                console.log(`✅ Successfully updated ${updatedCount} fixtures`);
                console.log('🔄 You may need to refresh the page for changes to take effect');
            } else {
                console.log('ℹ️ No fixtures need updating (all already have kickOffTime)');
            }
            
        } catch (error) {
            console.error('❌ Error updating fixtures:', error);
        }
    };
    
// Global helper functions available: window.assignAutoPicks(gameweek), window.checkAllDeadlines(), window.renameTimeToKickOffTime()
