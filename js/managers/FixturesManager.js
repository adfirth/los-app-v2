class FixturesManager {
    constructor() {
        this.isInitialized = false;
        this.dataLoaded = false; // Track if data has been loaded
        this.currentFixtures = [];
        this.userPicks = {}; // Initialize userPicks to prevent undefined errors
        this.db = null;
        
        // Add global debug functions immediately
        window.enableFixtureDebug = () => {
            window.DEBUG_MODE = true;
            console.log('🔧 Fixture debug mode enabled');
        };
        
        window.debugFixtures = () => {
            console.log('🔍 Debugging fixtures data...');
            console.log('Current fixtures:', this.currentFixtures);
            if (this.currentFixtures && this.currentFixtures.length > 0) {
                this.currentFixtures.forEach((fixture, index) => {
                    console.log(`Fixture ${index}: ${fixture.homeTeam} ${fixture.homeScore} - ${fixture.awayScore} ${fixture.awayTeam} (${fixture.status})`);
                });
            } else {
                console.log('No fixtures loaded yet');
            }
        };
        
        console.log('🔧 FixturesManager: Global debug functions added: debugFixtures(), enableFixtureDebug()');
        
        // Don't auto-initialize - wait for main app to control initialization
        // this.init();
    }

    initBasic() {
        console.log('🚀 FixturesManager: initBasic() called');
        
        if (this.isInitialized) {
            console.log('⚠️ FixturesManager already initialized, skipping initBasic()');
            return;
        }
        
        console.log('🔧 Setting up basic FixturesManager structure...');
        
        // Only set up basic structure, don't load data yet
        // Set up modal event listeners
        this.setupPickModal();
        
        this.isInitialized = true;
        console.log('✅ FixturesManager basic initialization complete');
    }

    init() {
        if (this.isInitialized && this.dataLoaded) return;
        
        // Set up Firebase database reference
        this.db = window.firebaseDB;
        
        // Load user picks first, then fixtures
        this.loadUserPicks().then(() => {
            this.loadFixtures();
        });
        this.dataLoaded = true;
        console.log('FixturesManager full initialization complete');
    }

    restoreFirebaseConnection() {
        // This method will be called by the main app after initialization
        // to restore Firebase functionality
        console.log('FixturesManager Firebase connection restored');
        
        // Reset retry counters when Firebase connection is restored
        this.loadFixturesRetryCount = 0;
    }

    clearListeners() {
        // Clear any existing Firebase listeners
        console.log('FixturesManager: Clearing listeners...');
        
        // Unregister from the main app's listener tracking if needed
        if (window.losApp) {
            window.losApp.unregisterListener('fixtures-data');
        }
    }

    async loadFixtures() {
        try {
            // Ensure Firebase is ready
            if (!window.firebaseReady || !this.db || typeof this.db.collection !== 'function') {
                console.log('FixturesManager: Firebase not ready, retrying in 2 seconds...');
                
                // Try to update our database reference if Firebase is ready but we don't have it
                if (window.firebaseReady && window.firebaseDB && !this.db) {
                    console.log('FixturesManager: Updating database reference from global Firebase...');
                    this.db = window.firebaseDB;
                    // Re-attempt loading fixtures now that we have a database reference
                    setTimeout(() => this.loadFixtures(), 500);
                    return;
                }
                
                // Only retry if we haven't exceeded max retries
                if (!this.loadFixturesRetryCount) {
                    this.loadFixturesRetryCount = 0;
                }
                if (this.loadFixturesRetryCount < 10) { // Increased retry limit
                    this.loadFixturesRetryCount++;
                    setTimeout(() => this.loadFixtures(), 2000);
                } else {
                    console.log('FixturesManager: Max retries reached, waiting for Firebase to be ready...');
                    // Continue checking periodically even after max retries
                    setTimeout(() => {
                        this.loadFixturesRetryCount = 0; // Reset counter
                        this.loadFixtures();
                    }, 10000); // Check every 10 seconds
                }
                return;
            }

            const currentGameweek = window.editionService.getCurrentGameweek();
            let currentEdition = window.losApp?.managers?.club?.getCurrentEdition();
            
            // If ClubService doesn't have an edition, fall back to EditionService
            if (!currentEdition) {
                console.log('⚠️ FixturesManager: No edition from ClubService, falling back to EditionService');
                currentEdition = window.editionService.getCurrentEdition();
                console.log(`⚠️ FixturesManager: Using fallback edition: ${currentEdition}`);
            }
            
            // Show loading state
            this.showLoadingState();
            
            // Try to load fixtures from the new multi-club structure first
            const currentClubId = window.losApp?.managers?.club?.getCurrentClub() || 'default-club';
            
            // Debug logging to see what club/edition we're using
            console.log(`🔍 FixturesManager: Loading fixtures for club: ${currentClubId}, edition: ${currentEdition}, gameweek: ${currentGameweek}`);
            console.log(`🔍 FixturesManager: ClubService currentClub: ${window.losApp?.managers?.club?.getCurrentClub()}`);
            console.log(`🔍 FixturesManager: ClubService currentEdition: ${window.losApp?.managers?.club?.getCurrentEdition()}`);
            console.log(`🔍 FixturesManager: EditionService currentEdition: ${window.editionService.getCurrentEdition()}`);
            
            // Check if we're using default values - allow loading from default club but log a warning
            if (currentClubId === 'default-club' || window.losApp?.managers?.club?.getCurrentClub() === 'default-club' || !window.losApp?.managers?.club?.getCurrentClub()) {
                console.log('⚠️ FixturesManager: Using default club - this may not have fixtures loaded');
                // Continue with loading instead of retrying indefinitely
            }
            
            console.log(`🔍 Loading fixtures for club: ${currentClubId}, edition: ${currentEdition}, gameweek: ${currentGameweek}`);
            
            try {
                // Try new structure first - filter by gameweek
                const fixturesSnapshot = await this.db.collection('clubs').doc(currentClubId)
                    .collection('editions').doc(currentEdition)
                    .collection('fixtures')
                    .where('gameWeek', '==', currentGameweek)
                    .orderBy('date', 'asc')
                    .get();
                
                if (!fixturesSnapshot.empty) {
                    this.currentFixtures = [];
                    fixturesSnapshot.forEach(doc => {
                        const fixtureData = doc.data();
                        
                        if (window.DEBUG_MODE) {
                            console.log(`🔍 Raw fixture data for ${fixtureData.homeTeam} vs ${fixtureData.awayTeam}:`, fixtureData);
                            console.log(`🔍 Home score raw:`, fixtureData.homeScore, `(type: ${typeof fixtureData.homeScore})`);
                            console.log(`🔍 Away score raw:`, fixtureData.awayScore, `(type: ${typeof fixtureData.awayScore})`);
                            console.log(`🔍 Home score processed:`, this.getScoreValue(fixtureData.homeScore));
                            console.log(`🔍 Away score processed:`, this.getScoreValue(fixtureData.awayScore));
                        }
                        
                        // Create fixture object with processed scores
                        const fixture = {
                            ...fixtureData,
                            homeScore: this.getScoreValue(fixtureData.homeScore) || this.getScoreValue(fixtureData.apiData?.['home-team']?.score),
                            awayScore: this.getScoreValue(fixtureData.awayScore) || this.getScoreValue(fixtureData.apiData?.['away-team']?.score),
                            time: fixtureData.time || fixtureData.kickOffTime
                        };
                        
                        this.currentFixtures.push(fixture);
                    });
                    
                    console.log(`✅ Loaded ${this.currentFixtures.length} fixtures from new structure`);
                    
                    // Note: Removed automatic date update logic to preserve imported fixtures
                    // The updateFixtureDates method was overwriting real imported data with sample data
                } else {
                    // No fixtures found - show empty state
                    console.log(`ℹ️ No fixtures found for ${currentEdition} Gameweek ${currentGameweek} - showing empty state`);
                    this.currentFixtures = [];
                    
                    // Clean up any existing sample fixtures in old structure
                    await this.cleanupSampleFixtures(currentEdition, currentGameweek);
                }
            } catch (error) {
                console.log('⚠️ Error loading from new structure:', error);
                
                // Show empty state on error
                console.log(`ℹ️ No fixtures found for ${currentEdition} Gameweek ${currentGameweek} - showing empty state`);
                this.currentFixtures = [];
                
                // Clean up any existing sample fixtures in old structure
                await this.cleanupSampleFixtures(currentEdition, currentGameweek);
            }
            
            // Check deadline
            await this.checkDeadline();
            
            // Load user picks before displaying fixtures
            await this.loadUserPicks();
            
            // Display fixtures
            this.displayFixtures();
            
        } catch (error) {
            // Handle specific Firebase errors
            if (window.handleFirebaseError) {
                window.handleFirebaseError(error, 'FixturesManager-loadFixtures');
            }
            
            // Suppress "Target ID already exists" messages as they're not real errors
            if (!error.message.includes('Target ID already exists')) {
                console.error('Error loading fixtures:', error);
                this.showError('Failed to load fixtures');
                this.showEmptyState();
            }
        }
    }

    // DISABLED: This method was overwriting imported fixtures with sample data
    // async updateFixtureDates(edition, gameweek) {
    //     // This method has been disabled to prevent overwriting real imported fixtures
    //     // with hardcoded sample data (Arsenal, Chelsea, etc.)
    //     console.log('⚠️ updateFixtureDates method has been disabled to preserve imported fixtures');
    // }

    async createSampleFixtures(edition, gameweek) {
        // Ensure Firebase is ready
        if (!window.firebaseReady || !this.db || typeof this.db.collection !== 'function') {
            console.log('FixturesManager: Firebase not ready for creating fixtures, retrying in 2 seconds...');
            setTimeout(() => this.createSampleFixtures(edition, gameweek), 2000);
            return;
        }

        const sampleFixtures = [
            {
                homeTeam: "Arsenal",
                awayTeam: "Chelsea",
                date: "2025-09-20",
                kickOffTime: "15:00:00",
                homeScore: null,
                awayScore: null,
                status: "scheduled",
                venue: "Emirates Stadium"
            },
            {
                homeTeam: "Liverpool",
                awayTeam: "Manchester City",
                date: "2025-09-20",
                kickOffTime: "17:30:00",
                homeScore: null,
                awayScore: null,
                status: "scheduled",
                venue: "Anfield"
            },
            {
                homeTeam: "Manchester United",
                awayTeam: "Tottenham",
                date: "2025-09-21",
                kickOffTime: "14:00:00",
                homeScore: null,
                awayScore: null,
                status: "scheduled",
                venue: "Old Trafford"
            },
            {
                homeTeam: "Newcastle",
                awayTeam: "Aston Villa",
                date: "2025-09-21",
                kickOffTime: "16:30:00",
                homeScore: null,
                awayScore: null,
                status: "scheduled",
                venue: "St James' Park"
            },
            {
                homeTeam: "Brighton",
                awayTeam: "West Ham",
                date: "2025-09-22",
                kickOffTime: "20:00:00",
                homeScore: null,
                awayScore: null,
                status: "scheduled",
                venue: "Amex Stadium"
            }
        ];

        try {
            await this.db.collection('fixtures').doc(`${edition}_gw${gameweek}`).set({
                fixtures: sampleFixtures,
                gameweek: gameweek,
                edition: edition,
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error creating sample fixtures:', error);
        }
    }

    async getSampleFixtures() {
        // Ensure Firebase is ready
        if (!window.firebaseReady || !this.db || typeof this.db.collection !== 'function') {
            console.log('FixturesManager: Firebase not ready for getting fixtures, retrying in 2 seconds...');
            setTimeout(() => this.getSampleFixtures(), 2000);
            return [];
        }

        const currentGameweek = window.editionService.getCurrentGameweek();
        const currentEdition = window.editionService.getCurrentEdition();
        
        const fixturesDoc = await this.db.collection('fixtures')
            .doc(`${currentEdition}_gw${currentGameweek}`)
            .get();
        
        if (fixturesDoc.exists) {
            return fixturesDoc.data().fixtures || [];
        }
        return [];
    }

    async checkDeadline() {
        console.log('⏰ checkDeadline() called, fixtures count:', this.currentFixtures.length);
        
        if (this.currentFixtures.length === 0) {
            console.log('⏰ No fixtures, setting deadlinePassed = false');
            this.deadlinePassed = false;
            return;
        }

        try {
            // Find the earliest kick-off time with proper validation
            const validFixtures = this.currentFixtures.filter(fixture => {
                if (!fixture.date || !fixture.time) {
                    console.log(`⚠️ Fixture missing date or time: ${fixture.homeTeam} vs ${fixture.awayTeam}`, {
                        date: fixture.date,
                        time: fixture.time
                    });
                    return false;
                }
                
                // Try to create a valid date object
                const testDate = new Date(`${fixture.date}T${fixture.time}`);
                if (isNaN(testDate.getTime())) {
                    console.log(`⚠️ Invalid date/time for fixture: ${fixture.homeTeam} vs ${fixture.awayTeam}`, {
                        date: fixture.date,
                        time: fixture.time,
                        combined: `${fixture.date}T${fixture.time}`
                    });
                    return false;
                }
                
                return true;
            });

            if (validFixtures.length === 0) {
                console.log('⚠️ No valid fixtures with proper date/time found');
                this.deadlinePassed = false;
                return;
            }

            const earliestFixture = validFixtures.reduce((earliest, fixture) => {
                const fixtureTime = new Date(`${fixture.date}T${fixture.time}`);
                const earliestTime = new Date(`${earliest.date}T${earliest.time}`);
                return fixtureTime < earliestTime ? fixture : earliest;
            });

            const deadlineTime = new Date(`${earliestFixture.date}T${earliestFixture.time}`);
            const now = new Date();
            
            console.log('⏰ Earliest fixture:', `${earliestFixture.homeTeam} vs ${earliestFixture.awayTeam}`);
            console.log('⏰ Fixture date/time:', `${earliestFixture.date} ${earliestFixture.time}`);
            console.log('⏰ Deadline time:', deadlineTime.toISOString());
            console.log('⏰ Current time:', now.toISOString());
            console.log('⏰ Time until deadline (ms):', deadlineTime - now);
            
            this.deadlinePassed = now >= deadlineTime;
            
            console.log('⏰ Deadline passed:', this.deadlinePassed);
            
            // Update deadline display
            this.updateDeadlineDisplay(deadlineTime);
        } catch (error) {
            console.error('❌ Error in checkDeadline:', error);
            console.log('⚠️ Setting deadlinePassed = false due to error');
            this.deadlinePassed = false;
        }
    }

    updateDeadlineDisplay(deadlineTime) {
        const deadlineText = document.getElementById('deadlineText');
        if (!deadlineText) return;

        try {
            // Validate the deadline time
            if (!deadlineTime || isNaN(deadlineTime.getTime())) {
                console.log('⚠️ Invalid deadline time, setting default display');
                deadlineText.textContent = 'Deadline: TBD';
                deadlineText.style.color = '#6c757d';
                return;
            }

            const now = new Date();
            const timeUntilDeadline = deadlineTime - now;

            if (timeUntilDeadline <= 0) {
                deadlineText.textContent = 'Deadline: PASSED';
                deadlineText.style.color = '#dc3545';
            } else {
                const hours = Math.floor(timeUntilDeadline / (1000 * 60 * 60));
                const minutes = Math.floor((timeUntilDeadline % (1000 * 60 * 60)) / (1000 * 60));
                
                if (hours > 24) {
                    const days = Math.floor(hours / 24);
                    deadlineText.textContent = `Deadline: ${days} days remaining`;
                } else if (hours > 0) {
                    deadlineText.textContent = `Deadline: ${hours}h ${minutes}m remaining`;
                } else {
                    deadlineText.textContent = `Deadline: ${minutes}m remaining`;
                }
                
                deadlineText.style.color = hours < 1 ? '#ffc107' : '#28a745';
            }
        } catch (error) {
            console.error('❌ Error in updateDeadlineDisplay:', error);
            deadlineText.textContent = 'Deadline: Error';
            deadlineText.style.color = '#dc3545';
        }
    }

    async loadUserPicks(retryCount = 0) {
        try {
            // Ensure Firebase is ready
            if (!window.firebaseReady || !this.db || typeof this.db.collection !== 'function') {
                console.log('FixturesManager: Firebase not ready for loading picks, retrying in 2 seconds...');
                
                // Try to update our database reference if Firebase is ready but we don't have it
                if (window.firebaseReady && window.firebaseDB && !this.db) {
                    console.log('FixturesManager: Updating database reference from global Firebase for picks...');
                    this.db = window.firebaseDB;
                    // Re-attempt loading picks now that we have a database reference
                    setTimeout(() => this.loadUserPicks(retryCount), 500);
                    return;
                }
                
                setTimeout(() => this.loadUserPicks(retryCount), 2000);
                return;
            }

            const userId = window.authManager.getCurrentUserId();
            if (!userId) {
                console.log('⚠️ FixturesManager: No user ID available for loading picks');
                this.userPicks = {};
                return;
            }

        try {
            // Get current club and edition from ClubService
            const currentClubId = window.losApp?.managers?.club?.getCurrentClub();
            const currentEdition = window.losApp?.managers?.club?.getCurrentEdition();
            
            if (!currentClubId || !currentEdition) {
                console.log('⚠️ No club or edition available for loading picks');
                this.userPicks = {};
                return;
            }
            
            // Load picks from the new multi-club structure
            const picksSnapshot = await this.db.collection('clubs').doc(currentClubId)
                .collection('editions').doc(currentEdition)
                .collection('picks')
                .where('userId', '==', userId)
                .get();
            
            this.userPicks = {};
            picksSnapshot.forEach(doc => {
                const pickData = doc.data();
                this.userPicks[`gw${pickData.gameweek}`] = {
                    teamPicked: pickData.teamPicked,
                    savedAt: pickData.savedAt,
                    isAutopick: pickData.isAutopick || false
                };
            });
            
            console.log(`✅ Loaded ${picksSnapshot.size} picks from /clubs/${currentClubId}/editions/${currentEdition}/picks`);
            console.log(`📊 userPicks:`, this.userPicks);
            console.log(`🔍 FixturesManager: userPicks keys:`, Object.keys(this.userPicks));
        } catch (error) {
            console.error('Error loading user picks from multi-club structure:', error);
            this.userPicks = {};
        }
        } catch (error) {
            console.error('Error loading user picks:', error);
            
            // Handle Firebase connection errors with retry logic
            if (error.message.includes('Target ID already exists') && retryCount < 2) {
                const delay = Math.min(2000 * Math.pow(2, retryCount), 8000);
                console.log(`Fixtures picks loading conflict detected, retrying in ${delay/1000} seconds... (attempt ${retryCount + 1}/2)`);
                setTimeout(() => {
                    this.loadUserPicks(retryCount + 1);
                }, delay);
                return;
            }
            
            // If we've exhausted retries, try to reset connection
            if (retryCount >= 2 && window.losApp) {
                console.log('Fixtures picks loading failed, attempting connection reset...');
                window.losApp.resetFirebaseConnection();
                return;
            }
        }
    }

    async displayFixtures() {
        if (window.DEBUG_MODE) {
            console.log('🔍 FixturesManager: displayFixtures() called');
            console.log('🔍 Current fixtures count:', this.currentFixtures.length);
            console.log('🔍 Database reference:', !!this.db);
            console.log('🔍 Deadline passed:', this.deadlinePassed);
        }
        
        const fixturesList = document.getElementById('fixturesList');
        if (!fixturesList) {
            console.log('❌ fixturesList element not found');
            return;
        }

        if (this.currentFixtures.length === 0) {
            console.log('📝 No fixtures to display, showing empty state');
            this.showEmptyState();
            return;
        }

        // Preload team badges for better performance
        try {
            await this.preloadTeamBadges();
        } catch (error) {
            console.warn('⚠️ FixturesManager: Failed to preload team badges:', error);
        }

        if (window.DEBUG_MODE) {
            console.log('🗑️ Clearing fixturesList innerHTML');
        }
        fixturesList.innerHTML = '';

        this.currentFixtures.forEach((fixture, index) => {
            // Only log in debug mode
            if (window.DEBUG_MODE) {
                console.log(`📋 Creating fixture card ${index + 1}/${this.currentFixtures.length}:`, fixture.homeTeam, 'vs', fixture.awayTeam);
            }
            const fixtureCard = this.createFixtureCard(fixture, index);
            fixturesList.appendChild(fixtureCard);
        });
        
        if (window.DEBUG_MODE) {
            console.log('✅ All fixture cards created and appended');
        }
        
        // Debug: Check button states after creation (only in development)
        if (window.DEBUG_MODE) {
            setTimeout(() => {
                const allButtons = document.querySelectorAll('.team-btn');
                console.log(`🔍 Debug: Found ${allButtons.length} team buttons after display refresh`);
                allButtons.forEach((button, index) => {
                    const teamName = button.dataset.team;
                    const hasPickedClass = button.classList.contains('picked');
                    const hasOtherPickedClass = button.classList.contains('other-picked');
                    console.log(`   Button ${index + 1} (${teamName}): picked=${hasPickedClass}, other-picked=${hasOtherPickedClass}`);
                });
            }, 100);
        }
    }

    createFixtureCard(fixture, index) {
        // Debug logging for score display
        if (window.DEBUG_MODE) {
            console.log(`🔍 Fixture ${index}: ${fixture.homeTeam} vs ${fixture.awayTeam}`);
            console.log(`🔍 Home score: ${fixture.homeScore} (type: ${typeof fixture.homeScore})`);
            console.log(`🔍 Away score: ${fixture.awayScore} (type: ${typeof fixture.awayScore})`);
            console.log(`🔍 Status: ${fixture.status} (type: ${typeof fixture.status})`);
        }

        const card = document.createElement('div');
        card.className = 'fixture-card';
        
        // Ensure userPicks is initialized
        if (!this.userPicks) {
            this.userPicks = {};
        }
        
        const currentGameweek = window.editionService.getCurrentGameweek();
        const currentPick = this.userPicks[`gw${currentGameweek}`];
        
        // Check if this specific team is picked in the current gameweek
        const isHomePickedInCurrent = this.isTeamPickedInCurrentGameweek(fixture.homeTeam);
        const isAwayPickedInCurrent = this.isTeamPickedInCurrentGameweek(fixture.awayTeam);
        const hasPickInCurrentGameweek = isHomePickedInCurrent || isAwayPickedInCurrent;
        
        // Check if teams are picked in other gameweeks (for availability)
        const isHomePickedInOther = this.isTeamPickedInOtherGameweek(fixture.homeTeam);
        const isAwayPickedInOther = this.isTeamPickedInOtherGameweek(fixture.awayTeam);
        
        // Check if teams are unavailable (picked in previous gameweeks)
        const isHomeUnavailable = this.isTeamUnavailable(fixture.homeTeam);
        const isAwayUnavailable = this.isTeamUnavailable(fixture.awayTeam);

        // Debug button states (only in development)
        if (window.DEBUG_MODE) {
            console.log(`🔍 Button states for ${fixture.homeTeam} vs ${fixture.awayTeam}:`, {
                currentPick,
                homePickedInCurrent: isHomePickedInCurrent,
                awayPickedInCurrent: isAwayPickedInCurrent,
                homePickedInOther: isHomePickedInOther,
                awayPickedInOther: isAwayPickedInOther,
                hasPickInCurrentGameweek
            });
        }

        // Add has-pick class if any team is picked in current gameweek
        if (hasPickInCurrentGameweek) {
            card.classList.add('has-pick');
        }

        // Add has-scores class if fixture has scores
        if (fixture.homeScore !== null || fixture.awayScore !== null) {
            card.classList.add('has-scores');
        }

        // Format date and time in UK format
        const formatUKDate = (dateString) => {
            try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) return 'TBD';
                return date.toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });
            } catch (error) {
                return 'TBD';
            }
        };

        const formatUKTime = (timeString) => {
            if (!timeString || timeString === 'TBD') return 'TBD';
            try {
                // Handle different time formats
                let time = timeString;
                if (timeString.includes('T')) {
                    time = timeString.split('T')[1];
                }
                if (timeString.includes(':')) {
                    const [hours, minutes] = timeString.split(':');
                    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
                }
                return timeString;
            } catch (error) {
                return 'TBD';
            }
        };

        const formattedDate = formatUKDate(fixture.date);
        const formattedTime = formatUKTime(fixture.time || fixture.kickOffTime);

        card.innerHTML = `
            <div class="fixture-header">
                <div class="fixture-date-time">
                    <div class="fixture-date">${formattedDate}</div>
                    <div class="fixture-time">${formattedTime}</div>
                </div>
                <div class="fixture-status ${typeof fixture.status === 'string' ? fixture.status : fixture.status?.short || fixture.status?.status || 'TBD'}">
                    ${typeof fixture.status === 'string' ? fixture.status.toUpperCase() : (fixture.status?.short || fixture.status?.status || 'TBD').toUpperCase()}
                </div>
            </div>
            
            ${hasPickInCurrentGameweek ? `
            <div class="pick-indicator">
                <i class="fas fa-check-circle"></i>
                <span>Pick made for Gameweek ${window.editionService.getCurrentGameweek()}</span>
            </div>
            ` : ''}
            
            <div class="fixture-teams">
                <button class="team-btn ${this.isTeamPickedInCurrentGameweek(fixture.homeTeam) ? 'picked' : ''} ${this.isTeamPickedInOtherGameweek(fixture.homeTeam) ? 'other-picked' : ''} ${isHomeUnavailable || this.deadlinePassed ? 'unavailable' : ''}" 
                        data-team="${fixture.homeTeam}" 
                        data-fixture="${index}"
                        ${isHomeUnavailable || this.deadlinePassed ? 'disabled' : ''}
                        aria-label="${this.isTeamPickedInCurrentGameweek(fixture.homeTeam) ? 'Selected: ' : 'Pick '}${fixture.homeTeam}${isHomeUnavailable ? ' (unavailable)' : ''}"
                        aria-pressed="${this.isTeamPickedInCurrentGameweek(fixture.homeTeam) ? 'true' : 'false'}">
                    ${this.createTeamWithBadgeHTML(fixture.homeTeam, 'small')}
                    ${fixture.homeScore !== null && fixture.homeScore !== undefined ? `<span class="team-score">${this.getScoreValue(fixture.homeScore)}</span>` : ''}
                    ${this.isTeamPickedInCurrentGameweek(fixture.homeTeam) ? '<span class="pick-checkmark">✓</span>' : ''}
                </button>
                
                <div class="vs-container">
                    <span class="vs-separator">vs</span>
                </div>
                
                <button class="team-btn ${this.isTeamPickedInCurrentGameweek(fixture.awayTeam) ? 'picked' : ''} ${this.isTeamPickedInOtherGameweek(fixture.awayTeam) ? 'other-picked' : ''} ${isAwayUnavailable || this.deadlinePassed ? 'unavailable' : ''}" 
                        data-team="${fixture.awayTeam}" 
                        data-fixture="${index}"
                        ${isAwayUnavailable || this.deadlinePassed ? 'disabled' : ''}
                        aria-label="${this.isTeamPickedInCurrentGameweek(fixture.awayTeam) ? 'Selected: ' : 'Pick '}${fixture.awayTeam}${isAwayUnavailable ? ' (unavailable)' : ''}"
                        aria-pressed="${this.isTeamPickedInCurrentGameweek(fixture.awayTeam) ? 'true' : 'false'}">
                    ${this.createTeamWithBadgeHTML(fixture.awayTeam, 'small')}
                    ${fixture.awayScore !== null && fixture.awayScore !== undefined ? `<span class="team-score">${this.getScoreValue(fixture.awayScore)}</span>` : ''}
                    ${this.isTeamPickedInCurrentGameweek(fixture.awayTeam) ? '<span class="pick-checkmark">✓</span>' : ''}
                </button>
            </div>
        `;

        // Debug button classes (only in development)
        if (window.DEBUG_MODE) {
            console.log(`🔍 Button classes for ${fixture.homeTeam}:`, this.isTeamPickedInCurrentGameweek(fixture.homeTeam) ? 'picked' : 'not-picked');
            console.log(`🔍 Button classes for ${fixture.awayTeam}:`, this.isTeamPickedInCurrentGameweek(fixture.awayTeam) ? 'picked' : 'not-picked');
        }

        // Add event listeners to pick buttons
        const pickButtons = card.querySelectorAll('.team-btn:not(.unavailable)');
        const allButtons = card.querySelectorAll('.team-btn');
        
        // Debug actual button classes after creation (only in development)
        if (window.DEBUG_MODE) {
            setTimeout(() => {
                const homeButton = card.querySelector(`[data-team="${fixture.homeTeam}"]`);
                const awayButton = card.querySelector(`[data-team="${fixture.awayTeam}"]`);
                if (homeButton) {
                    console.log(`🔍 Home button (${fixture.homeTeam}) actual classes:`, homeButton.className);
                    console.log(`🔍 Home button has 'picked' class:`, homeButton.classList.contains('picked'));
                }
                if (awayButton) {
                    console.log(`🔍 Away button (${fixture.awayTeam}) actual classes:`, awayButton.className);
                    console.log(`🔍 Away button has 'picked' class:`, awayButton.classList.contains('picked'));
                }
            }, 10);
        }
        
        pickButtons.forEach((button, btnIndex) => {
            // Only log in debug mode
            if (window.DEBUG_MODE) {
                console.log(`🎯 Adding click listener to button ${btnIndex + 1} (${button.dataset.team})`);
            }
            button.addEventListener('click', () => {
                if (window.DEBUG_MODE) {
                    console.log(`🖱️ Button clicked: ${button.dataset.team}`);
                }
                this.handlePickSelection(button.dataset.team, button.dataset.fixture);
            });
            // Mark that this button has a click listener for debugging
            button._hasClickListener = true;
        });

        if (window.DEBUG_MODE) {
            console.log(`✅ Event listeners added to ${pickButtons.length} buttons`);
        }
        return card;
    }

    getScoreValue(score) {
        // Handle different score formats
        if (score === null || score === undefined) {
            if (window.DEBUG_MODE) {
                console.log(`🔍 getScoreValue: null/undefined score`);
            }
            return null;
        }
        
        // If it's a simple number or string, return it
        if (typeof score === 'number' || typeof score === 'string') {
            if (window.DEBUG_MODE) {
                console.log(`🔍 getScoreValue: simple value ${score} (type: ${typeof score})`);
            }
            return score;
        }
        
        // If it's an object (like Firestore Timestamp), try to extract the value
        if (typeof score === 'object') {
            if (window.DEBUG_MODE) {
                console.log(`🔍 getScoreValue: object score:`, score);
            }
            // Check if it has a 'seconds' property (Firestore Timestamp)
            if (score.seconds !== undefined) {
                if (window.DEBUG_MODE) {
                    console.log(`🔍 getScoreValue: found seconds property: ${score.seconds}`);
                }
                return score.seconds;
            }
            // Check if it has a 'value' property
            if (score.value !== undefined) {
                if (window.DEBUG_MODE) {
                    console.log(`🔍 getScoreValue: found value property: ${score.value}`);
                }
                return score.value;
            }
            // Check if it has a 'score' property
            if (score.score !== undefined) {
                if (window.DEBUG_MODE) {
                    console.log(`🔍 getScoreValue: found score property: ${score.score}`);
                }
                return score.score;
            }
            // If it's an object with numeric properties, try to find the score
            for (const key in score) {
                if (typeof score[key] === 'number' && !isNaN(score[key])) {
                    if (window.DEBUG_MODE) {
                        console.log(`🔍 getScoreValue: found numeric property ${key}: ${score[key]}`);
                    }
                    return score[key];
                }
            }
        }
        
        if (window.DEBUG_MODE) {
            console.log(`🔍 getScoreValue: no valid score found, returning null`);
        }
        return null;
    }

    isTeamUnavailable(teamName) {
        // Ensure userPicks is initialized
        if (!this.userPicks) {
            this.userPicks = {};
        }
        
        const currentGameweek = window.editionService.getCurrentGameweek();
        const previousGameweek = parseInt(currentGameweek) - 1;
        
        if (previousGameweek < 1) return false;
        
        // Check if team was picked in previous gameweek (handle both old and new formats)
        const previousPick = this.userPicks[`gw${previousGameweek}`];
        if (typeof previousPick === 'string') {
            // Old format: direct string
            return previousPick === teamName;
        } else if (previousPick && previousPick.teamPicked) {
            // New format: object with teamPicked property
            return previousPick.teamPicked === teamName;
        }
        
        return false;
    }

    hasPickForCurrentGameweek() {
        // Ensure userPicks is initialized
        if (!this.userPicks) {
            this.userPicks = {};
        }
        
        const currentGameweek = window.editionService.getCurrentGameweek();
        const currentPick = this.userPicks[`gw${currentGameweek}`];
        
        if (typeof currentPick === 'string') {
            // Old format: direct string
            return currentPick !== undefined;
        } else if (currentPick && currentPick.teamPicked) {
            // New format: object with teamPicked property
            return true;
        }
        
        return false;
    }

    /**
     * Create HTML for a team with badge using the TeamBadgeService
     * @param {string} teamName - The name of the team
     * @param {string} size - Badge size (default: 'small')
     * @param {string} additionalClasses - Additional CSS classes
     * @returns {string} - HTML string for team with badge
     */
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
        
        // Fallback to TeamBadgeService if available
        if (window.teamBadgeService && typeof window.teamBadgeService.createTeamBadgeHTML === 'function') {
            return window.teamBadgeService.createTeamWithBadgeHTML(teamName, size, additionalClasses);
        }
        
        // Fallback to just team name if no service available
        return `<span class="team-name">${teamName}</span>`;
    }

    /**
     * Preload badges for all teams in current fixtures
     */
    async preloadTeamBadges() {
        if (!this.currentFixtures) return;
        
        const allTeams = [];
        this.currentFixtures.forEach(fixture => {
            if (fixture.homeTeam) allTeams.push(fixture.homeTeam);
            if (fixture.awayTeam) allTeams.push(fixture.awayTeam);
        });
        
        // Remove duplicates
        const uniqueTeams = [...new Set(allTeams)];
        
        if (uniqueTeams.length > 0) {
            if (window.DEBUG_MODE) {
                console.log(`🏆 FixturesManager: Preloading badges for ${uniqueTeams.length} teams...`);
            }
            
            // Check if local badge service is available
            if (window.getLocalTeamBadge) {
                if (window.DEBUG_MODE) {
                    console.log(`✅ FixturesManager: Local badge service available for ${uniqueTeams.length} teams`);
                }
                return; // Local service is instant, no need to preload
            }
            
            // Fallback to TeamBadgeService if available
            if (window.teamBadgeService && typeof window.teamBadgeService.preloadBadges === 'function') {
                await window.teamBadgeService.preloadBadges(uniqueTeams, 'small');
            }
        }
    }

    isTeamPickedInAnyGameweek(teamName) {
        // Ensure userPicks is initialized
        if (!this.userPicks) {
            this.userPicks = {};
        }
        
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
        
        if (typeof currentPick === 'string') {
            // Old format: direct string
            return currentPick === teamName;
        } else if (currentPick && currentPick.teamPicked) {
            // New format: object with teamPicked property
            return currentPick.teamPicked === teamName;
        }
        
        return false;
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
        console.log(`🎯 handlePickSelection called: ${teamName}, fixture ${fixtureIndex}`);
        console.log('🔍 Deadline passed check:', this.deadlinePassed);
        
        if (this.deadlinePassed) {
            console.log('❌ Deadline has passed, showing warning');
            window.authManager.showWarning('Deadline has passed. Picks are locked.');
            return;
        }

        // Ensure userPicks is initialized
        if (!this.userPicks) {
            console.log('🔧 Initializing userPicks object');
            this.userPicks = {};
        }

        const currentGameweek = window.editionService.getCurrentGameweek();
        const currentPick = this.userPicks[`gw${currentGameweek}`];
        
        console.log('🎮 Current gameweek:', currentGameweek);
        console.log('🎯 Current pick for this gameweek:', currentPick);
        console.log('🎯 Selected team:', teamName);

        // Check if team is already picked (handle both old and new formats)
        let isAlreadyPicked = false;
        if (typeof currentPick === 'string') {
            // Old format: direct string
            isAlreadyPicked = currentPick === teamName;
        } else if (currentPick && currentPick.teamPicked) {
            // New format: object with teamPicked property
            isAlreadyPicked = currentPick.teamPicked === teamName;
        }
        
        if (isAlreadyPicked) {
            console.log('ℹ️ Team already picked, showing info message');
            window.authManager.showInfo('You have already picked this team.');
            return;
        }

        // Show confirmation modal
        console.log('📋 Showing pick confirmation modal');
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
        console.log('🎭 Setting up pick modal event listeners');
        
        const modal = document.getElementById('pickModal');
        const confirmBtn = document.getElementById('confirmPick');
        const cancelBtn = document.getElementById('cancelPick');
        const closeBtn = document.querySelector('.modal-close');

        console.log('🔍 Modal elements found:');
        console.log('   Modal:', !!modal);
        console.log('   Confirm button:', !!confirmBtn);
        console.log('   Cancel button:', !!cancelBtn);
        console.log('   Close button:', !!closeBtn);

        if (confirmBtn) {
            console.log('✅ Adding click listener to confirm button');
            confirmBtn.addEventListener('click', () => {
                console.log('🖱️ Confirm button clicked');
                this.confirmPick();
            });
        }

        if (cancelBtn) {
            console.log('✅ Adding click listener to cancel button');
            cancelBtn.addEventListener('click', () => {
                console.log('🖱️ Cancel button clicked');
                this.hidePickModal();
            });
        }

        if (closeBtn) {
            console.log('✅ Adding click listener to close button');
            closeBtn.addEventListener('click', () => {
                console.log('🖱️ Close button clicked');
                this.hidePickModal();
            });
        }

        // Close modal when clicking outside
        if (modal) {
            console.log('✅ Adding click-outside listener to modal');
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    console.log('🖱️ Modal background clicked, closing modal');
                    this.hidePickModal();
                }
            });
        }
        
        console.log('🎭 Pick modal setup complete');
    }

    async confirmPick() {
        const teamName = document.getElementById('pickTeamName').textContent;
        const currentGameweek = window.editionService.getCurrentGameweek();
        const userId = window.authManager.getCurrentUserId();
        
        // Get current club and edition from ClubService
        const currentClubId = window.losApp?.managers?.club?.getCurrentClub();
        const currentEdition = window.losApp?.managers?.club?.getCurrentEdition();
        
        if (!currentClubId || !currentEdition) {
            console.error('❌ No club or edition available for saving pick');
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

            console.log(`✅ Pick confirmed for ${teamName} in gameweek ${currentGameweek}`);
            console.log(`📊 Updated userPicks:`, this.userPicks);
            console.log(`🔍 Pick saved to: /clubs/${currentClubId}/editions/${currentEdition}/picks`);

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
                console.log(`✅ Sample fixtures for ${edition} Gameweek ${gameweek} cleaned up.`);
            } else {
                console.log(`ℹ️ No sample fixtures found for ${edition} Gameweek ${gameweek} to clean up.`);
            }
        } catch (error) {
            console.error('Error cleaning up sample fixtures:', error);
        }
    }
}

// Initialize FixturesManager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.fixturesManager = new FixturesManager();
});
