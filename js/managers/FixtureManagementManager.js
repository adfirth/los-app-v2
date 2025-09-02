class FixtureManagementManager {
    constructor() {
        this.isInitialized = false;
        this.isSuperAdmin = false;
        this.currentUser = null;
        this.db = null;
        this.apiKey = null;
        this.apiBaseUrl = 'https://football-web-pages1.p.rapidapi.com';
        this.fixtures = [];
        this.scores = [];
        this.competitions = [];
        this.currentCompetition = null;
        this.fixturesListener = null;
        this.scoresListener = null;
    }

    initBasic() {
        if (this.isInitialized) return;
        
        console.log('⚽ FixtureManagementManager: Basic initialization...');
        this.setupBasicStructure();
        console.log('✅ FixtureManagementManager: Basic initialization complete');
    }

    setupBasicStructure() {
        console.log('🔧 Setting up FixtureManagementManager basic structure...');
        
        // Set up API key from environment or config
        this.setupAPIKey();
        
        console.log('✅ FixtureManagementManager basic structure setup complete');
    }

    setupAPIKey() {
        // Get API key from global configuration
        if (window.getAPIKey && window.getAPIKey('rapidapi')) {
            this.apiKey = window.getAPIKey('rapidapi');
            console.log('✅ FixtureManagementManager: RapidAPI key loaded from configuration');
        } else {
            this.apiKey = 'YOUR_RAPIDAPI_KEY_HERE';
            console.warn('⚠️ FixtureManagementManager: Please set your RapidAPI key in js/config/api-config.js');
        }
    }

    // API Methods for Football Web Pages
    async makeAPIRequest(url) {
        if (!this.apiKey || this.apiKey === 'YOUR_RAPIDAPI_KEY_HERE') {
            throw new Error('API key not configured');
        }

        try {
            console.log(`🔍 Making API request to: ${url.toString()}`);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': this.apiKey,
                    'X-RapidAPI-Host': 'football-web-pages1.p.rapidapi.com'
                }
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const jsonResponse = await response.json();
            console.log(`🔍 Raw API response:`, jsonResponse);
            return jsonResponse;
        } catch (error) {
            console.error('FixtureManagementManager: API request error:', error);
            
            // If CORS error, try using a CORS proxy for development
            if (error.message.includes('CORS') || error.message.includes('cors') || error.message.includes('Failed to fetch')) {
                console.warn('⚠️ CORS error detected, trying CORS proxy for development...');
                return await this.makeAPIRequestWithProxy(url);
            }
            
            throw error;
        }
    }

        async makeAPIRequestWithProxy(url) {
        // Try multiple CORS proxies
        const proxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://api.codetabs.com/v1/proxy?quest=',
            'https://cors-anywhere.herokuapp.com/'
        ];
        
        for (let i = 0; i < proxies.length; i++) {
            const proxy = proxies[i];
            const proxyUrl = proxy + url.toString();
            
            console.log(`🔍 FixtureManagementManager: Trying CORS proxy ${i + 1}/${proxies.length}: ${proxyUrl}`);
            
            try {
                const response = await fetch(proxyUrl, {
                    method: 'GET',
                    headers: {
                        'X-RapidAPI-Key': this.apiKey,
                        'X-RapidAPI-Host': 'football-web-pages1.p.rapidapi.com',
                        'Origin': window.location.origin
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ FixtureManagementManager: CORS proxy ${i + 1} successful`);
                    return data;
                } else {
                    console.warn(`⚠️ FixtureManagementManager: CORS proxy ${i + 1} failed: ${response.status} ${response.statusText}`);
                }
            } catch (error) {
                console.warn(`⚠️ FixtureManagementManager: CORS proxy ${i + 1} error:`, error.message);
            }
        }
        
        throw new Error('All CORS proxies failed');
    }

    // Get available competitions
    async getCompetitions() {
        try {
            console.log('🔍 Fetching available competitions...');
            
            // Use the predefined competitions from config
            const competitions = window.APIConfig.competitions;
            console.log('✅ Available competitions loaded from config:', competitions);
            
            return Object.entries(competitions).map(([key, comp]) => ({
                id: comp.id,
                name: comp.name,
                description: comp.description,
                key: key
            }));
        } catch (error) {
            console.error('❌ Error fetching competitions:', error);
            throw error;
        }
    }

    async getFixtures(competitionId, season = '2024-25') {
        console.log(`🔍 Fetching fixtures for competition ${competitionId}, season ${season}...`);
        
        // Try different endpoint patterns and season formats
        const endpoints = [
            // Standard endpoints with season
            { path: 'fixtures-results.json', params: { comp: competitionId, season: season } },
            { path: 'fixtures.json', params: { comp: competitionId, season: season } },
            { path: 'matches.json', params: { comp: competitionId, season: season } },
            // Try without season parameter
            { path: 'fixtures-results.json', params: { comp: competitionId } },
            { path: 'fixtures.json', params: { comp: competitionId } },
            { path: 'matches.json', params: { comp: competitionId } },
            // Try different season format (2024 instead of 2024-25)
            { path: 'fixtures-results.json', params: { comp: competitionId, season: '2024' } },
            { path: 'fixtures.json', params: { comp: competitionId, season: '2024' } },
            { path: 'matches.json', params: { comp: competitionId, season: '2024' } },
            // Try different endpoint patterns
            { path: 'competition.json', params: { comp: competitionId, season: season } },
            { path: 'competition.json', params: { comp: competitionId } },
            { path: 'results.json', params: { comp: competitionId, season: season } },
            { path: 'results.json', params: { comp: competitionId } }
        ];
        
        for (let i = 0; i < endpoints.length; i++) {
            const endpoint = endpoints[i];
            console.log(`🔍 Trying endpoint ${i + 1}/${endpoints.length}: ${endpoint.path} with params:`, endpoint.params);
            
            try {
                const url = new URL(`https://football-web-pages1.p.rapidapi.com/${endpoint.path}`);
                
                // Add parameters
                Object.entries(endpoint.params).forEach(([key, value]) => {
                    url.searchParams.set(key, value);
                });
                
                const data = await this.makeAPIRequest(url);
                console.log(`✅ Endpoint ${endpoint.path} successful:`, data);
                console.log(`🔍 Full API response structure:`, JSON.stringify(data, null, 2));
                return this.transformFixturesData(data, competitionId, season);
            } catch (error) {
                console.log(`❌ Endpoint ${endpoint.path} failed:`, error.message);
            }
        }
        
        // If all API endpoints failed, try using mock data as fallback
        console.log('⚠️ All API endpoints failed, trying mock data fallback...');
        
        if (window.devConfig && window.devConfig.getConfig().MOCK_DATA_ENABLED) {
            try {
                const DevelopmentHelper = window.DevelopmentHelper;
                if (DevelopmentHelper) {
                    // Get current date for mock fixtures
                    const today = new Date();
                    const startDate = today.toISOString().split('T')[0];
                    const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                    
                    const mockData = DevelopmentHelper.getMockFixtures(competitionId, season, startDate, endDate);
                    console.log('✅ Using mock data as fallback:', mockData);
                    return this.transformFixturesData(mockData, competitionId, season);
                }
            } catch (error) {
                console.error('❌ Mock data fallback also failed:', error);
            }
        }
        
        throw new Error('All endpoints failed and no mock data available');
    }

    // Transform API response data to our fixture format
    transformFixturesData(data, competitionId, season) {
        console.log('🔍 Transforming fixtures data:', data);
        
        // Handle different response formats
        let fixtures = [];
        
        if (data.fixtures) {
            fixtures = data.fixtures;
        } else if (data.matches) {
            fixtures = data.matches;
        } else if (data['fixtures-results']) {
            // Handle nested fixtures-results structure
            const fixturesResults = data['fixtures-results'];
            console.log('🔍 Found fixtures-results structure:', fixturesResults);
            console.log('🔍 fixtures-results type:', typeof fixturesResults);
            console.log('🔍 fixtures-results is array:', Array.isArray(fixturesResults));
            console.log('🔍 fixtures-results keys:', Object.keys(fixturesResults || {}));
            
            // Check if fixtures-results contains fixtures or matches
            if (fixturesResults.fixtures) {
                fixtures = fixturesResults.fixtures;
            } else if (fixturesResults.matches) {
                fixtures = fixturesResults.matches;
            } else if (Array.isArray(fixturesResults)) {
                fixtures = fixturesResults;
            } else {
                // If fixtures-results is an object with other properties, try to find fixtures
                console.log('🔍 fixtures-results keys:', Object.keys(fixturesResults));
                
                // Look for any array that might contain fixtures
                for (const key of Object.keys(fixturesResults)) {
                    const value = fixturesResults[key];
                    if (Array.isArray(value) && value.length > 0) {
                        // Check if this array contains fixture-like objects
                        const firstItem = value[0];
                        if (firstItem && (firstItem['home-team'] || firstItem.home || firstItem.homeTeam)) {
                            fixtures = value;
                            console.log(`✅ Found fixtures in ${key}:`, fixtures.length);
                            break;
                        }
                    }
                }
            }
        } else if (Array.isArray(data)) {
            fixtures = data;
        } else {
            console.warn('⚠️ Unknown data format:', data);
            console.log('🔍 Available keys:', Object.keys(data));
            return { fixtures: [], total: 0 };
        }
        
        console.log(`✅ Transformed ${fixtures.length} fixtures`);
        
        // Return the structure that SuperAdminManager expects
        if (fixtures.length > 0) {
            return { 
                'fixtures-results': fixtures,
                total: fixtures.length 
            };
        } else {
            return { 
                'fixtures-results': [],
                total: 0 
            };
        }
    }

    // Get fixtures for a specific date
    async getFixturesForDate(competitionId, date, season = null) {
        try {
            console.log(`🔍 Fetching fixtures for competition ${competitionId} on ${date}...`);
            
            // First get all fixtures for the competition
            const allFixtures = await this.getFixtures(competitionId, season);
            
            if (!allFixtures || !allFixtures.matches) {
                console.log('⚠️ No fixtures found in API response');
                return { fixtures: [], total: 0 };
            }
            
            // Filter fixtures by specific date
            const filteredFixtures = allFixtures.matches.filter(fixture => {
                if (!fixture.date) return false;
                
                const fixtureDate = new Date(fixture.date);
                const targetDate = new Date(date);
                
                // Set time to start/end of day for accurate comparison
                targetDate.setHours(0, 0, 0, 0);
                const nextDay = new Date(targetDate);
                nextDay.setDate(nextDay.getDate() + 1);
                
                return fixtureDate >= targetDate && fixtureDate < nextDay;
            });
            
            console.log(`✅ Found ${filteredFixtures.length} fixtures on ${date}`);
            return { fixtures: filteredFixtures, total: filteredFixtures.length };
            
        } catch (error) {
            console.error('❌ Error fetching fixtures for date:', error);
            throw error;
        }
    }

    // Get fixtures for specific dates (game week)
    async getFixturesForDates(competitionId, startDate, endDate, season = null) {
        try {
            console.log(`🔍 Fetching fixtures for competition ${competitionId} from ${startDate} to ${endDate}...`);
            
            // First get all fixtures for the competition
            const allFixtures = await this.getFixtures(competitionId, season);
            
            if (!allFixtures || !allFixtures.matches) {
                console.log('⚠️ No fixtures found in API response');
                return { fixtures: [], total: 0 };
            }
            
            // Filter fixtures by date range
            const filteredFixtures = allFixtures.matches.filter(fixture => {
                if (!fixture.date) return false;
                
                const fixtureDate = new Date(fixture.date);
                const start = new Date(startDate);
                const end = new Date(endDate);
                
                // Set time to start/end of day for accurate comparison
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                
                return fixtureDate >= start && fixtureDate <= end;
            });
            
            console.log(`✅ Found ${filteredFixtures.length} fixtures between ${startDate} and ${endDate}`);
            return { fixtures: filteredFixtures, total: filteredFixtures.length };
            
        } catch (error) {
            console.error('❌ Error fetching fixtures for dates:', error);
            throw error;
        }
    }

    // Get fixtures for a specific game week
    async getFixturesForGameWeek(competitionId, gameWeek, season = null) {
        try {
            console.log(`🔍 Fetching fixtures for competition ${competitionId}, Game Week ${gameWeek}...`);
            
            // Define game week date ranges (you can customize these)
            const gameWeekDates = this.getGameWeekDates(gameWeek, season);
            
            if (!gameWeekDates) {
                throw new Error(`Invalid game week: ${gameWeek}`);
            }
            
            return await this.getFixturesForDates(
                competitionId, 
                gameWeekDates.startDate, 
                gameWeekDates.endDate, 
                season
            );
            
        } catch (error) {
            console.error('❌ Error fetching fixtures for game week:', error);
            throw error;
        }
    }

    // Helper method to get date ranges for game weeks
    getGameWeekDates(gameWeek, season = null) {
        // Default to 2025-26 season if none specified
        const targetSeason = season || '2025-26';
        
        // Define game week date ranges (customize based on your league structure)
        const gameWeekRanges = {
            '2025-26': {
                1: { startDate: '2025-08-19', endDate: '2025-08-20' }, // National League GW1
                2: { startDate: '2025-08-26', endDate: '2025-08-27' },
                3: { startDate: '2025-09-02', endDate: '2025-09-03' },
                4: { startDate: '2025-09-09', endDate: '2025-09-10' },
                5: { startDate: '2025-09-16', endDate: '2025-09-17' },
                // Add more game weeks as needed
            }
        };
        
        const seasonRanges = gameWeekRanges[targetSeason];
        if (!seasonRanges || !seasonRanges[gameWeek]) {
            console.warn(`⚠️ No date range defined for ${targetSeason} Game Week ${gameWeek}`);
            return null;
        }
        
        return seasonRanges[gameWeek];
    }

    // Get all available game weeks for a season
    getAvailableGameWeeks(season = null) {
        const targetSeason = season || '2025-26';
        
        const gameWeekRanges = {
            '2025-26': {
                1: { startDate: '2025-08-19', endDate: '2025-08-20', description: 'National League GW1' },
                2: { startDate: '2025-08-26', endDate: '2025-08-27', description: 'National League GW2' },
                3: { startDate: '2025-09-02', endDate: '2025-09-03', description: 'National League GW3' },
                4: { startDate: '2025-09-09', endDate: '2025-09-10', description: 'National League GW4' },
                5: { startDate: '2025-09-16', endDate: '2025-09-17', description: 'National League GW5' },
                // Add more game weeks as needed
            }
        };
        
        const seasonRanges = gameWeekRanges[targetSeason];
        if (!seasonRanges) {
            return [];
        }
        
        return Object.entries(seasonRanges).map(([week, dates]) => ({
            week: parseInt(week),
            startDate: dates.startDate,
            endDate: dates.endDate,
            description: dates.description
        }));
    }

    // Import fixtures for specific dates (game week)
    async importFixturesForGameWeek(competitionId, clubId, editionId, gameWeek, season = null) {
        try {
            console.log(`📥 Importing fixtures for Game Week ${gameWeek} to Firebase...`);
            
            // Get fixtures for the specific game week
            const gameWeekFixtures = await this.getFixturesForGameWeek(competitionId, gameWeek, season);
            
            if (!gameWeekFixtures.fixtures || gameWeekFixtures.fixtures.length === 0) {
                console.log(`⚠️ No fixtures found for Game Week ${gameWeek}`);
                return [];
            }
            
            // Import the filtered fixtures
            return await this.importFixturesToFirebase(
                competitionId,
                clubId,
                editionId,
                gameWeekFixtures.fixtures
            );
            
        } catch (error) {
            console.error('❌ Error importing fixtures for game week:', error);
            throw error;
        }
    }

    // Import fixtures for a specific date
    async importFixturesForDate(competitionId, clubId, editionId, date, season = null) {
        try {
            console.log(`📥 Importing fixtures for ${date} to Firebase...`);
            
            // Get fixtures for the specific date
            const dateFixtures = await this.getFixturesForDate(competitionId, date, season);
            
            if (!dateFixtures.fixtures || dateFixtures.fixtures.length === 0) {
                console.log(`⚠️ No fixtures found for ${date}`);
                return [];
            }
            
            // Import the filtered fixtures
            return await this.importFixturesToFirebase(
                competitionId,
                clubId,
                editionId,
                dateFixtures.fixtures
            );
            
        } catch (error) {
            console.error('❌ Error importing fixtures for date:', error);
            throw error;
        }
    }

    // Import fixtures for specific date range
    async importFixturesForDateRange(competitionId, clubId, editionId, startDate, endDate, season = null) {
        try {
            console.log(`📥 Importing fixtures from ${startDate} to ${endDate} to Firebase...`);
            
            // Get fixtures for the specific date range
            const dateRangeFixtures = await this.getFixturesForDates(competitionId, startDate, endDate, season);
            
            if (!dateRangeFixtures.fixtures || dateRangeFixtures.fixtures.length === 0) {
                console.log(`⚠️ No fixtures found between ${startDate} and ${endDate}`);
                return [];
            }
            
            // Import the filtered fixtures
            return await this.importFixturesToFirebase(
                competitionId,
                clubId,
                editionId,
                dateRangeFixtures.fixtures
            );
            
        } catch (error) {
            console.error('❌ Error importing fixtures for date range:', error);
            throw error;
        }
    }

    async getScores(competitionId, season) {
        try {
            console.log(`🔍 Fetching scores for competition ${competitionId}, season ${season}...`);
            
            // The fixtures-results endpoint returns both fixtures and results
            // We'll filter for finished matches in the importFixturesToFirebase method
            const response = await this.getFixtures(competitionId, season);
            console.log(`✅ Scores fetched successfully:`, response);
            
            return response;
        } catch (error) {
            console.error('❌ Error fetching scores:', error);
            throw error;
        }
    }

    // Import fixtures to Firebase
    async importFixturesToFirebase(competitionId, clubId, editionId, fixtures, gameWeek = 1) {
        try {
            console.log(`📥 Importing ${fixtures.length} fixtures to Firebase for club ${clubId}, edition ${editionId}`);
            
            if (!this.db) {
                throw new Error('Firebase database not initialized');
            }
            
            // Validate required parameters
            if (!clubId || !editionId) {
                throw new Error('Missing required parameters: clubId and editionId are required');
            }
            
            // Check batch size limit (Firestore limit is 500 operations per batch)
            if (fixtures.length > 500) {
                throw new Error(`Too many fixtures (${fixtures.length}). Firestore batch limit is 500 operations.`);
            }
            
            const batch = this.db.batch();
            const importedFixtures = [];
            
            // Transform API fixtures to our Firebase format
            fixtures.forEach((fixture, index) => {
                console.log(`🔍 Processing fixture ${index}:`, fixture);
                console.log(`🔍 Fixture keys:`, Object.keys(fixture));
                
                // Deep inspect key properties for debugging
                if (fixture.competition) {
                    console.log(`🔍 Competition object:`, fixture.competition);
                    console.log(`🔍 Competition keys:`, Object.keys(fixture.competition));
                }
                if (fixture.match) {
                    console.log(`🔍 Match object:`, fixture.match);
                    console.log(`🔍 Match keys:`, Object.keys(fixture.match));
                }
                if (fixture.fixture) {
                    console.log(`🔍 Fixture object:`, fixture.fixture);
                    console.log(`🔍 Fixture keys:`, Object.keys(fixture.fixture));
                }
                
                // Create a unique fixture ID (ensure it's valid for Firestore)
                const timestamp = Date.now();
                const fixtureId = `fixture_${timestamp}_${index}`.replace(/[^a-zA-Z0-9_-]/g, '_');
                
                // Handle different possible API response formats
                let homeTeam, awayTeam, matchDate, matchTime, venue, status, homeScore, awayScore;
                
                // Try multiple possible team name formats
                if (fixture['home-team'] && fixture['away-team']) {
                    // Format: { "home-team": { name: "Team A" }, "away-team": { name: "Team B" }, ... } (HYPHENATED - MOST COMMON)
                    // Check if they're objects with name properties
                    if (typeof fixture['home-team'] === 'object') {
                        // Try multiple possible team name properties
                        homeTeam = fixture['home-team'].name || 
                                  fixture['home-team'].title || 
                                  fixture['home-team'].displayName || 
                                  fixture['home-team'].teamName ||
                                  fixture['home-team'].fullName ||
                                  fixture['home-team'].shortName ||
                                  JSON.stringify(fixture['home-team']);
                    } else if (typeof fixture['home-team'] === 'string') {
                        homeTeam = fixture['home-team'];
                    } else {
                        homeTeam = JSON.stringify(fixture['home-team']);
                    }
                    
                    if (typeof fixture['away-team'] === 'object') {
                        // Try multiple possible team name properties
                        awayTeam = fixture['away-team'].name || 
                                  fixture['away-team'].title || 
                                  fixture['away-team'].displayName || 
                                  fixture['away-team'].teamName ||
                                  fixture['away-team'].fullName ||
                                  fixture['away-team'].shortName ||
                                  JSON.stringify(fixture['away-team']);
                    } else if (typeof fixture['away-team'] === 'string') {
                        awayTeam = fixture['away-team'];
                    } else {
                        awayTeam = JSON.stringify(fixture['away-team']);
                    }
                    
                    console.log(`✅ Found home-team/away-team format: ${homeTeam} vs ${awayTeam}`);
                    console.log(`🔍 Home team object:`, fixture['home-team']);
                    console.log(`🔍 Away team object:`, fixture['away-team']);
                    
                    // Debug: Check what properties are available in team objects
                    if (typeof fixture['home-team'] === 'object') {
                        console.log(`🔍 Home team properties:`, Object.keys(fixture['home-team']));
                        console.log(`🔍 Home team values:`, fixture['home-team']);
                    }
                    if (typeof fixture['away-team'] === 'object') {
                        console.log(`🔍 Away team properties:`, Object.keys(fixture['away-team']));
                        console.log(`🔍 Away team values:`, fixture['away-team']);
                    }
                } else if (fixture.home && fixture.away) {
                    // Format: { home: "Team A", away: "Team B", ... }
                    homeTeam = fixture.home;
                    awayTeam = fixture.away;
                    console.log(`✅ Found home/away format: ${homeTeam} vs ${awayTeam}`);
                } else if (fixture.homeTeam && fixture.awayTeam) {
                    // Format: { homeTeam: "Team A", awayTeam: "Team B", ... }
                    homeTeam = fixture.homeTeam;
                    awayTeam = fixture.awayTeam;
                    console.log(`✅ Found homeTeam/awayTeam format: ${homeTeam} vs ${awayTeam}`);
                } else if (fixture.team1 && fixture.team2) {
                    // Format: { team1: "Team A", team2: "Team B", ... }
                    homeTeam = fixture.team1;
                    awayTeam = fixture.team2;
                    console.log(`✅ Found team1/team2 format: ${homeTeam} vs ${awayTeam}`);
                } else if (fixture.teams && Array.isArray(fixture.teams) && fixture.teams.length >= 2) {
                    // Format: { teams: ["Team A", "Team B"], ... }
                    homeTeam = fixture.teams[0];
                    awayTeam = fixture.teams[1];
                    console.log(`✅ Found teams array format: ${homeTeam} vs ${awayTeam}`);
                } else if (fixture.competition && fixture.competition.teams && Array.isArray(fixture.competition.teams) && fixture.competition.teams.length >= 2) {
                    // Format: { competition: { teams: ["Team A", "Team B"] }, ... }
                    homeTeam = fixture.competition.teams[0];
                    awayTeam = fixture.competition.teams[1];
                    console.log(`✅ Found competition.teams format: ${homeTeam} vs ${awayTeam}`);
                } else if (fixture.match && fixture.match.home && fixture.match.away) {
                    // Format: { match: { home: "Team A", away: "Team B" }, ... }
                    homeTeam = fixture.match.home;
                    awayTeam = fixture.match.away;
                    console.log(`✅ Found match.home/away format: ${homeTeam} vs ${awayTeam}`);
                } else if (fixture.fixture && fixture.fixture.home && fixture.fixture.away) {
                    // Format: { fixture: { home: "Team A", away: "Team B" }, ... }
                    homeTeam = fixture.fixture.home;
                    awayTeam = fixture.fixture.away;
                    console.log(`✅ Found fixture.home/away format: ${homeTeam} vs ${awayTeam}`);
                } else if (fixture.competition && fixture.competition.home && fixture.competition.away) {
                    // Format: { competition: { home: "Team A", away: "Team B" }, ... }
                    homeTeam = fixture.competition.home;
                    awayTeam = fixture.competition.away;
                    console.log(`✅ Found competition.home/away format: ${homeTeam} vs ${awayTeam}`);
                } else if (fixture.competition && fixture.competition.team1 && fixture.competition.team2) {
                    // Format: { competition: { team1: "Team A", team2: "Team B" }, ... }
                    homeTeam = fixture.competition.team1;
                    awayTeam = fixture.competition.team2;
                    console.log(`✅ Found competition.team1/team2 format: ${homeTeam} vs ${awayTeam}`);
                } else {
                    // Log all possible team-related properties for debugging
                    console.warn(`⚠️ Skipping fixture ${index}: missing team names`, fixture);
                    console.log(`🔍 Available properties:`, Object.keys(fixture));
                    if (fixture.competition) {
                        console.log(`🔍 Competition properties:`, Object.keys(fixture.competition));
                        console.log(`🔍 Competition values:`, fixture.competition);
                    }
                    if (fixture.match) {
                        console.log(`🔍 Match properties:`, Object.keys(fixture.match));
                        console.log(`🔍 Match values:`, fixture.match);
                    }
                    if (fixture.fixture) {
                        console.log(`🔍 Fixture properties:`, Object.keys(fixture.fixture));
                        console.log(`🔍 Fixture values:`, fixture.fixture);
                    }
                    return;
                }
                
                // Extract other fields with fallbacks
                // Handle date parsing - convert US format (MM/DD/YYYY) to ISO format
                let rawDate = fixture.date || fixture.matchDate || fixture.kickOff;
                if (rawDate) {
                    // Check if date is in US format (MM/DD/YYYY)
                    if (typeof rawDate === 'string' && rawDate.includes('/')) {
                        const parts = rawDate.split('/');
                        if (parts.length === 3) {
                            // Assume MM/DD/YYYY format and convert to YYYY-MM-DD
                            const month = parts[0].padStart(2, '0');
                            const day = parts[1].padStart(2, '0');
                            const year = parts[2];
                            matchDate = `${year}-${month}-${day}`;
                        } else {
                            matchDate = rawDate;
                        }
                    } else {
                        matchDate = rawDate;
                    }
                } else {
                    matchDate = new Date().toISOString().split('T')[0];
                }
                
                // Handle kick-off time
                matchTime = fixture.time || fixture.matchTime || fixture.kickOffTime || 'TBD';
                venue = fixture.venue || 'TBD';
                
                // Handle status - ensure it's a string, not an object
                let rawStatus = fixture.status;
                if (typeof rawStatus === 'object' && rawStatus !== null) {
                    // If status is an object, try to extract a meaningful value
                    status = rawStatus.name || rawStatus.status || rawStatus.value || 'scheduled';
                } else if (typeof rawStatus === 'string') {
                    status = rawStatus;
                } else {
                    status = 'scheduled';
                }
                
                homeScore = fixture['home-score'] || fixture.homeScore || fixture.homeGoals || null;
                awayScore = fixture['away-score'] || fixture.awayScore || fixture.awayGoals || null;
                
                // Transform the fixture data to match our structure
                const transformedFixture = {
                    fixtureId: fixtureId,
                    competitionId: competitionId,
                    homeTeam: homeTeam,
                    awayTeam: awayTeam,
                    date: matchDate,
                    time: matchTime,
                    venue: venue,
                    status: status,
                    homeScore: homeScore,
                    awayScore: awayScore,
                    season: '2024-25', // Default season
                    round: fixture.round || fixture.matchDay || 1,
                    gameWeek: gameWeek, // Add gameweek information
                    importedAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    // Store original API data for reference
                    apiData: fixture
                };
                
                // Add to batch
                const fixtureRef = this.db.collection('clubs').doc(clubId)
                    .collection('editions').doc(editionId)
                    .collection('fixtures').doc(fixtureId);
                
                batch.set(fixtureRef, transformedFixture);
                importedFixtures.push(transformedFixture);
                
                console.log(`📝 Prepared fixture: ${homeTeam} vs ${awayTeam} (${status})`);
            });
            
            // Commit the batch
            try {
                await batch.commit();
                console.log(`✅ Successfully imported ${importedFixtures.length} fixtures to Firebase`);
            } catch (batchError) {
                console.error('❌ Batch commit failed:', batchError);
                throw new Error(`Failed to commit batch to Firestore: ${batchError.message}`);
            }
            
            // Log audit event
            if (window.losApp && window.losApp.managers.superAdmin) {
                await window.losApp.managers.superAdmin.logAuditEvent(
                    'super_admin',
                    'import_fixtures',
                    {
                        competitionId: competitionId,
                        clubId: clubId,
                        editionId: editionId,
                        fixtureCount: importedFixtures.length,
                        importedAt: new Date().toISOString()
                    }
                );
            }
            
            return importedFixtures;
        } catch (error) {
            console.error('❌ Error importing fixtures to Firebase:', error);
            throw error;
        }
    }

    // Update fixture scores
    async updateFixtureScore(fixtureId, clubId, editionId, homeScore, awayScore, status = 'finished') {
        if (!this.db) {
            throw new Error('Firebase not connected');
        }

        try {
            const fixtureRef = this.db.collection('clubs').doc(clubId)
                .collection('editions').doc(editionId)
                .collection('fixtures').doc(fixtureId);

            await fixtureRef.update({
                homeScore: homeScore,
                awayScore: awayScore,
                status: status,
                updated_at: new Date()
            });

            console.log(`FixtureManagementManager: Updated fixture ${fixtureId} score to ${homeScore}-${awayScore}`);

            // Log the score update
            if (window.losApp && window.losApp.managers.superAdmin) {
                await window.losApp.managers.superAdmin.logAuditEvent('SUPER_ADMIN', 'FIXTURE_SCORE_UPDATED', {
                    fixtureId: fixtureId,
                    clubId: clubId,
                    editionId: editionId,
                    homeScore: homeScore,
                    awayScore: awayScore,
                    status: status,
                    userId: this.currentUser?.uid || 'unknown'
                });
            }

            // Process fixture results to update pick results if fixture is finished
            if (status === 'finished' && homeScore !== null && awayScore !== null) {
                console.log('FixtureManagementManager: Processing fixture results after score update...');
                if (window.gameLogicManager && window.gameLogicManager.processFixtureResults) {
                    try {
                        await window.gameLogicManager.processFixtureResults(clubId, editionId, fixtureId);
                        console.log('FixtureManagementManager: Successfully processed fixture results');
                    } catch (error) {
                        console.error('FixtureManagementManager: Error processing fixture results:', error);
                    }
                } else {
                    console.log('FixtureManagementManager: GameLogicManager not available for result processing');
                }
            }

            return true;
        } catch (error) {
            console.error('FixtureManagementManager: Error updating fixture score:', error);
            throw error;
        }
    }

    // Bulk update scores from API
    async bulkUpdateScores(competitionId, clubId, editionId) {
        try {
            console.log(`🔄 Bulk updating scores for competition ${competitionId}, club ${clubId}, edition ${editionId}`);
            
            // Get the latest scores from the API
            const apiResponse = await this.getScores(competitionId);
            
            if (!apiResponse || !apiResponse.matches) {
                console.log('⚠️ No matches found in API response');
                return { updated: 0, total: 0 };
            }
            
            console.log(`📊 API response contains ${apiResponse.matches.length} matches`);
            
            // Get existing fixtures from Firebase
            const existingFixtures = await this.getFixturesFromFirebase(clubId, editionId);
            console.log(`📊 Found ${existingFixtures.length} existing fixtures in Firebase`);
            
            let updatedCount = 0;
            const batch = this.db.batch();
            
            // Process each match from the API
            for (const match of apiResponse.matches) {
                // Extract team names from the match data
                let homeTeam, awayTeam, homeScore, awayScore, matchStatus;
                
                if (match.home && match.away) {
                    homeTeam = match.home;
                    awayTeam = match.away;
                } else if (match.homeTeam && match.awayTeam) {
                    homeTeam = match.homeTeam;
                    awayTeam = match.awayTeam;
                } else {
                    console.warn(`⚠️ Skipping match with missing team names:`, match);
                    continue;
                }
                
                // Extract score and status information
                homeScore = match.homeScore || match.homeGoals || null;
                awayScore = match.awayScore || match.awayGoals || null;
                matchStatus = match.status || 'unknown';
                
                // Try to find a matching fixture in our database
                const matchingFixture = existingFixtures.find(fixture => {
                    // Try exact match first
                    if (fixture.homeTeam === homeTeam && fixture.awayTeam === awayTeam) {
                        return true;
                    }
                    
                    // Try case-insensitive match
                    if (fixture.homeTeam.toLowerCase() === homeTeam.toLowerCase() && 
                        fixture.awayTeam.toLowerCase() === awayTeam.toLowerCase()) {
                        return true;
                    }
                    
                    // Try partial match (in case of slight naming differences)
                    if (fixture.homeTeam.includes(homeTeam) || homeTeam.includes(fixture.homeTeam)) {
                        if (fixture.awayTeam.includes(awayTeam) || awayTeam.includes(fixture.awayTeam)) {
                            return true;
                        }
                    }
                    
                    return false;
                });
                
                if (matchingFixture && matchStatus === 'finished' && homeScore !== null && awayScore !== null) {
                    // Update the fixture with new scores
                    const fixtureRef = this.db.collection('clubs').doc(clubId)
                        .collection('editions').doc(editionId)
                        .collection('fixtures').doc(matchingFixture.fixtureId);
                    
                    const updateData = {
                        homeScore: homeScore,
                        awayScore: awayScore,
                        status: 'finished',
                        lastUpdated: new Date().toISOString()
                    };
                    
                    batch.update(fixtureRef, updateData);
                    updatedCount++;
                    
                    console.log(`✅ Updated fixture: ${homeTeam} ${homeScore}-${awayScore} ${awayTeam}`);
                } else if (matchingFixture) {
                    console.log(`ℹ️ Skipping ${homeTeam} vs ${awayTeam}: status=${matchStatus}, scores=${homeScore}-${awayScore}`);
                } else {
                    console.log(`⚠️ No matching fixture found for: ${homeTeam} vs ${awayTeam}`);
                }
            }
            
            // Commit all updates
            if (updatedCount > 0) {
                await batch.commit();
                console.log(`✅ Successfully updated ${updatedCount} fixture scores`);
                
                // Log audit event
                if (window.losApp && window.losApp.managers.superAdmin) {
                    await window.losApp.managers.superAdmin.logAuditEvent(
                        'super_admin',
                        'bulk_update_scores',
                        {
                            competitionId: competitionId,
                            clubId: clubId,
                            editionId: editionId,
                            updatedCount: updatedCount,
                            totalFixtures: existingFixtures.length,
                            updatedAt: new Date().toISOString()
                        }
                    );
                }
            } else {
                console.log('ℹ️ No fixtures needed updating');
            }
            
            return { updated: updatedCount, total: existingFixtures.length };
        } catch (error) {
            console.error('❌ Error bulk updating scores:', error);
            throw error;
        }
    }

    // Get fixtures from Firebase
    async getFixturesFromFirebase(clubId, editionId) {
        if (!this.db) {
            throw new Error('Firebase not connected');
        }

        try {
            const snapshot = await this.db.collection('clubs').doc(clubId)
                .collection('editions').doc(editionId)
                .collection('fixtures')
                .orderBy('date', 'asc')
                .get();

            this.fixtures = [];
            snapshot.forEach(doc => {
                this.fixtures.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`FixtureManagementManager: Loaded ${this.fixtures.length} fixtures from Firebase`);
            return this.fixtures;
        } catch (error) {
            console.error('FixtureManagementManager: Error loading fixtures from Firebase:', error);
            return [];
        }
    }

    // Setup real-time listeners
    setupRealtimeListeners(clubId, editionId) {
        if (!this.db) {
            console.log('FixtureManagementManager: Firebase not ready, retrying in 2 seconds...');
            setTimeout(() => this.setupRealtimeListeners(clubId, editionId), 2000);
            return;
        }

        console.log('FixtureManagementManager: Setting up real-time listeners...');

        // Listen for fixtures
        this.setupFixturesListener(clubId, editionId);
        
        // Listen for scores
        this.setupScoresListener(clubId, editionId);
    }

    setupFixturesListener(clubId, editionId) {
        if (this.fixturesListener) {
            this.fixturesListener();
        }

        this.fixturesListener = this.db.collection('clubs').doc(clubId)
            .collection('editions').doc(editionId)
            .collection('fixtures')
            .orderBy('date', 'asc')
            .onSnapshot((snapshot) => {
                this.fixtures = [];
                snapshot.forEach(doc => {
                    this.fixtures.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                console.log(`FixtureManagementManager: Fixtures updated - ${this.fixtures.length} fixtures`);
                this.updateFixturesDisplay();
            }, (error) => {
                console.error('FixtureManagementManager: Fixtures listener error:', error);
            });
    }

    setupScoresListener(clubId, editionId) {
        if (this.scoresListener) {
            this.scoresListener();
        }

        this.scoresListener = this.db.collection('clubs').doc(clubId)
            .collection('editions').doc(editionId)
            .collection('fixtures')
            .where('status', '==', 'finished')
            .orderBy('date', 'desc')
            .onSnapshot((snapshot) => {
                this.scores = [];
                snapshot.forEach(doc => {
                    this.scores.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                console.log(`FixtureManagementManager: Scores updated - ${this.scores.length} finished fixtures`);
                this.updateScoresDisplay();
            }, (error) => {
                console.error('FixtureManagementManager: Scores listener error:', error);
            });
    }

    // Display methods (to be implemented based on UI requirements)
    updateFixturesDisplay() {
        // Update fixtures display in UI
        console.log('FixtureManagementManager: Fixtures display updated');
    }

    updateScoresDisplay() {
        // Update scores display in UI
        console.log('FixtureManagementManager: Scores display updated');
    }

    // Set current user and check permissions
    setCurrentUser(user) {
        this.currentUser = user;
        if (user) {
            // Check if user is super admin (this will be handled by SuperAdminManager)
            this.checkSuperAdminStatus(user.uid);
        } else {
            this.isSuperAdmin = false;
        }
    }

    async checkSuperAdminStatus(userId) {
        // This will be called by SuperAdminManager
        // For now, we'll assume the user has access if this method is called
        this.isSuperAdmin = true;
        console.log('FixtureManagementManager: User has fixture management access');
    }

    // Restore Firebase connection
    restoreFirebaseConnection() {
        if (this.db && typeof this.db.collection === 'function') {
            console.log('✅ FixtureManagementManager: Firebase connection already available');
            return;
        }
        
        if (window.firebaseDB && typeof window.firebaseDB.collection === 'function') {
            console.log('✅ FixtureManagementManager: Restoring Firebase connection from global');
            this.db = window.firebaseDB;
        } else {
            console.log('⚠️ FixtureManagementManager: Firebase not ready for connection restoration');
        }
    }

    // Cleanup
    clearListeners() {
        if (this.fixturesListener) {
            this.fixturesListener();
            this.fixturesListener = null;
        }
        if (this.scoresListener) {
            this.scoresListener();
            this.scoresListener = null;
        }
    }
}

// Export for global use
window.FixtureManagementManager = FixtureManagementManager;
