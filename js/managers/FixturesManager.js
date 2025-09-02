class FixturesManager {
    constructor() {
        this.isInitialized = false;
        this.dataLoaded = false; // Track if data has been loaded
        this.currentFixtures = [];
        this.userPicks = {}; // Initialize userPicks to prevent undefined errors
        this.db = null;
        

        
        // Don't auto-initialize - wait for main app to control initialization
        // this.init();
    }

    initBasic() {
        if (this.isInitialized) {
            return;
        }
        
        // Only set up basic structure, don't load data yet
        // Set up modal event listeners
        this.setupPickModal();
        
        this.isInitialized = true;
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
    }

    restoreFirebaseConnection() {
        // This method will be called by the main app after initialization
        // to restore Firebase functionality
        
        // Reset retry counters when Firebase connection is restored
        this.loadFixturesRetryCount = 0;
    }

    clearListeners() {
        // Clear any existing Firebase listeners
        
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
                currentEdition = window.editionService.getCurrentEdition();
            }
            
            // Show loading state
            this.showLoadingState();
            
            // Clear deadline display while loading new fixtures (shows 'N/A')
            this.clearDeadlineDisplay();
            
            // Try to load fixtures from the new multi-club structure first
            const currentClubId = window.losApp?.managers?.club?.getCurrentClub() || 'default-club';
            
            // Check if we're using default values - allow loading from default club
            if (currentClubId === 'default-club' || window.losApp?.managers?.club?.getCurrentClub() === 'default-club' || !window.losApp?.managers?.club?.getCurrentClub()) {
                // Continue with loading instead of retrying indefinitely
            }
            
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
                        

                        
                        // Create fixture object with processed scores
                        const fixture = {
                            ...fixtureData,
                            homeScore: this.getScoreValue(fixtureData.homeScore) || this.getScoreValue(fixtureData.apiData?.['home-team']?.score),
                            awayScore: this.getScoreValue(fixtureData.awayScore) || this.getScoreValue(fixtureData.apiData?.['away-team']?.score),
                            time: fixtureData.time || fixtureData.kickOffTime
                        };
                        
                        this.currentFixtures.push(fixture);
                    });
                    

                    
                    // Note: Removed automatic date update logic to preserve imported fixtures
                    // The updateFixtureDates method was overwriting real imported data with sample data
                } else {
                    // No fixtures found - show empty state
                    this.currentFixtures = [];
                    
                    // Clean up any existing sample fixtures in old structure
                    await this.cleanupSampleFixtures(currentEdition, currentGameweek);
                }
            } catch (error) {
                // Show empty state on error
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
        if (this.currentFixtures.length === 0) {
            this.deadlinePassed = false;
            // Clear deadline display when there are no fixtures (shows 'N/A')
            this.clearDeadlineDisplay();
            return;
        }

        try {
            // Find the earliest kick-off time with proper validation
            const validFixtures = this.currentFixtures.filter(fixture => {
                if (!fixture.date || !fixture.time) {
                    return false;
                }
                
                // Try to create a valid date object
                const testDate = new Date(`${fixture.date}T${fixture.time}`);
                if (isNaN(testDate.getTime())) {
                    return false;
                }
                
                return true;
            });

                    if (validFixtures.length === 0) {
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
            
            this.deadlinePassed = now >= deadlineTime;
            
            // Update deadline display
            this.updateDeadlineDisplay(deadlineTime);
        } catch (error) {
            console.error('❌ Error in checkDeadline:', error);
            this.deadlinePassed = false;
        }
    }

    // Clear deadline display (used when switching to editions with no fixtures)
    clearDeadlineDisplay() {
        const deadlineText = document.getElementById('deadlineText');
        if (deadlineText) {
            deadlineText.textContent = 'Deadline: N/A';
            deadlineText.style.color = '#6c757d';
        }
    }

    updateDeadlineDisplay(deadlineTime) {
        const deadlineText = document.getElementById('deadlineText');
        if (!deadlineText) return;

        try {
            // Validate the deadline time
            if (!deadlineTime || isNaN(deadlineTime.getTime())) {
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
                // No user ID available for loading picks
                this.userPicks = {};
                return;
            }

        try {
            // Get current club and edition from ClubService
            const currentClubId = window.losApp?.managers?.club?.getCurrentClub();
            const currentEdition = window.losApp?.managers?.club?.getCurrentEdition();
            
            if (!currentClubId || !currentEdition) {
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
            

        } catch (error) {
            console.error('Error loading user picks from multi-club structure:', error);
            this.userPicks = {};
        }
        } catch (error) {
            console.error('Error loading user picks:', error);
            
            // Handle Firebase connection errors with retry logic
            if (error.message.includes('Target ID already exists') && retryCount < 2) {
                const delay = Math.min(2000 * Math.pow(2, retryCount), 8000);
                setTimeout(() => {
                    this.loadUserPicks(retryCount + 1);
                }, delay);
                return;
            }
            
            // If we've exhausted retries, try to reset connection
            if (retryCount >= 2 && window.losApp) {
                window.losApp.resetFirebaseConnection();
                return;
            }
        }
    }

    async displayFixtures() {
        
        const fixturesList = document.getElementById('fixturesList');
        if (!fixturesList) {
            return;
        }

        if (this.currentFixtures.length === 0) {
            this.showEmptyState();
            return;
        }

        // Preload team badges for better performance
        try {
            await this.preloadTeamBadges();
        } catch (error) {
            // Silently handle badge preload errors
        }


        fixturesList.innerHTML = '';

        this.currentFixtures.forEach((fixture, index) => {

            const fixtureCard = this.createFixtureCard(fixture, index);
            fixturesList.appendChild(fixtureCard);
        });
        

        

    }

    createFixtureCard(fixture, index) {


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
                    ${this.isTeamPickedInOtherGameweek(fixture.homeTeam) ? `<span class="previous-pick-indicator ${this.getTeamPickGameweek(fixture.homeTeam) < window.editionService.getCurrentGameweek() ? 'previous-pick' : 'future-pick'}" title="${this.getTeamPickGameweek(fixture.homeTeam) < window.editionService.getCurrentGameweek() ? 'Picked in Gameweek ' + this.getTeamPickGameweek(fixture.homeTeam) + ' (locked)' : 'Picked in Gameweek ' + this.getTeamPickGameweek(fixture.homeTeam) + ' (pending)'}">${this.getTeamPickGameweek(fixture.homeTeam) < window.editionService.getCurrentGameweek() ? '🔒' : '⏰'}</span>` : ''}
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
                    ${this.isTeamPickedInOtherGameweek(fixture.awayTeam) ? `<span class="previous-pick-indicator ${this.getTeamPickGameweek(fixture.awayTeam) < window.editionService.getCurrentGameweek() ? 'previous-pick' : 'future-pick'}" title="${this.getTeamPickGameweek(fixture.awayTeam) < window.editionService.getCurrentGameweek() ? 'Picked in Gameweek ' + this.getTeamPickGameweek(fixture.awayTeam) + ' (locked)' : 'Picked in Gameweek ' + this.getTeamPickGameweek(fixture.awayTeam) + ' (pending)'}">${this.getTeamPickGameweek(fixture.awayTeam) < window.editionService.getCurrentGameweek() ? '🔒' : '⏰'}</span>` : ''}
                </button>
            </div>
        `;



        // Add event listeners to pick buttons
        const pickButtons = card.querySelectorAll('.team-btn:not(.unavailable)');
        const allButtons = card.querySelectorAll('.team-btn');
        

        
        pickButtons.forEach((button, btnIndex) => {
            button.addEventListener('click', () => {
                this.handlePickSelection(button.dataset.team, button.dataset.fixture);
            });
        });
        return card;
    }

    getScoreValue(score) {
        // Handle different score formats
        if (score === null || score === undefined) {
            return null;
        }
        
        // If it's a simple number or string, return it
        if (typeof score === 'number' || typeof score === 'string') {
            return score;
        }
        
        // If it's an object (like Firestore Timestamp), try to extract the value
        if (typeof score === 'object') {
            // Check if it has a 'seconds' property (Firestore Timestamp)
            if (score.seconds !== undefined) {
                return score.seconds;
            }
            // Check if it has a 'value' property
            if (score.value !== undefined) {
                return score.value;
            }
            // Check if it has a 'score' property
            if (score.score !== undefined) {
                return score.score;
            }
            // If it's an object with numeric properties, try to find the score
            for (const key in score) {
                if (typeof score[key] === 'number' && !isNaN(score[key])) {
                    return score[key];
                }
            }
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
            // Check if local badge service is available
            if (window.getLocalTeamBadge) {
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

// Initialize FixturesManager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.fixturesManager = new FixturesManager();
});
