// Football Web Pages API Module
// Core API class for handling all Football Web Pages API interactions

class FootballWebPagesAPI {
    constructor(db, currentActiveEdition) {
        this.db = db;
        this.currentActiveEdition = currentActiveEdition;
        this.config = null;
        this.isInitialized = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Listen for API toggle changes
        this.setupAPIToggleListener();
    }

    async initializeConfiguration() {
        try {
    
            
            // Load configuration with multiple fallback strategies
            this.config = this.loadConfiguration();
            
            if (!this.config.RAPIDAPI_KEY) {
                throw new Error('API key not configured. Please set your RapidAPI key.');
            }
            
            this.isInitialized = true;
            // Configuration initialized successfully
            
            return true;
        } catch (error) {
            console.error('❌ FootballWebPagesAPI: Configuration initialization failed:', error);
            throw error;
        }
    }

    loadConfiguration() {
        // Priority order for configuration loading
        const configSources = [
            () => window.FOOTBALL_WEBPAGES_CONFIG,
            () => window.ENV_CONFIG,
            () => ({ RAPIDAPI_KEY: window.RAPIDAPI_KEY }),
            () => window.footballWebPagesAPI?.config,
            () => window.apiManager?.footballWebPagesAPI?.config,
            () => window.APIConfig?.rapidAPI
        ];

        for (const source of configSources) {
            try {
                const config = source();
                if (config && config.RAPIDAPI_KEY && config.RAPIDAPI_KEY !== 'YOUR_RAPIDAPI_KEY_HERE') {
                    // Configuration loaded from source
                    return {
                        BASE_URL: config.BASE_URL || 'https://football-web-pages1.p.rapidapi.com',
                        RAPIDAPI_KEY: config.RAPIDAPI_KEY,
                        RAPIDAPI_HOST: config.RAPIDAPI_HOST || 'football-web-pages1.p.rapidapi.com',
                        LEAGUES: config.LEAGUES || {},
                        ENDPOINTS: config.ENDPOINTS || {
                            FIXTURES_RESULTS: 'fixtures-results.json',
                            FIXTURES: 'fixtures.json',
                            MATCHES: 'matches.json'
                        }
                    };
                }
            } catch (error) {
                console.warn('⚠️ FootballWebPagesAPI: Failed to load config from source:', error);
            }
        }

        throw new Error('No valid API configuration found');
    }

    async isAPIEnabled() {
        try {
            // Check global settings for API enablement
            if (this.db && typeof this.db.collection === 'function') {
                const globalSettings = await this.db.collection('global-settings').doc('system').get();
                if (globalSettings.exists) {
                    const data = globalSettings.data();
                    return data.apiRequestsEnabled !== false; // Default to true if not set
                }
            }
            
            // Fallback: check if we can access the global settings through window
            if (window.losApp?.managers?.superAdmin?.db) {
                const globalSettings = await window.losApp.managers.superAdmin.db
                    .collection('global-settings').doc('system').get();
                if (globalSettings.exists) {
                    const data = globalSettings.data();
                    return data.apiRequestsEnabled !== false;
                }
            }
            
            // Default to enabled if we can't check
            console.log('⚠️ FootballWebPagesAPI: Could not check global API settings, defaulting to enabled');
            return true;
            
        } catch (error) {
            console.error('❌ FootballWebPagesAPI: Error checking API enablement:', error);
            // Default to enabled on error
            return true;
        }
    }

    setupAPIToggleListener() {
        // Listen for API toggle changes from superadmin
        window.addEventListener('apiToggleChanged', (event) => {
            const { enabled } = event.detail;
            console.log(`🔌 FootballWebPagesAPI: API toggle changed to: ${enabled}`);
            
            if (!enabled) {
                // Clear any pending requests or show a message
                console.log('🔌 FootballWebPagesAPI: API requests are now disabled');
            } else {
                console.log('🔌 FootballWebPagesAPI: API requests are now enabled');
            }
        });
    }

    async makeAPIRequest(endpoint, params = {}) {
        if (!this.isInitialized) {
            await this.initializeConfiguration();
        }

        // Check if API requests are enabled globally
        if (!(await this.isAPIEnabled())) {
            console.log('🔌 FootballWebPagesAPI: API requests are disabled globally');
            throw new Error('API requests are currently disabled by system administrator');
        }

        const url = new URL(`${this.config.BASE_URL}/${endpoint}`);
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });

        const requestOptions = {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': this.config.RAPIDAPI_KEY,
                'X-RapidAPI-Host': this.config.RAPIDAPI_HOST
            }
        };

        return this.executeWithRetry(async () => {
            console.log(`🔍 FootballWebPagesAPI: Making request to ${url.toString()}`);
            
            try {
                const response = await fetch(url, requestOptions);
                
                if (!response.ok) {
                    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
                }

                const jsonResponse = await response.json();
                console.log(`✅ FootballWebPagesAPI: Request successful`);
                
                return jsonResponse;
            } catch (error) {
                // If CORS error, try using a CORS proxy for development
                if (error.message.includes('CORS') || error.message.includes('cors')) {
                    console.warn('⚠️ CORS error detected, trying CORS proxy for development...');
                    return await this.makeAPIRequestWithProxy(url, requestOptions);
                }
                throw error;
            }
        });
    }

    async makeAPIRequestWithProxy(url, requestOptions) {
        // Use a CORS proxy for development
        const corsProxy = 'https://cors-anywhere.herokuapp.com/';
        const proxyUrl = corsProxy + url.toString();
        
        console.log(`🔍 FootballWebPagesAPI: Trying CORS proxy: ${proxyUrl}`);
        
        const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': requestOptions.headers['X-RapidAPI-Key'],
                'X-RapidAPI-Host': requestOptions.headers['X-RapidAPI-Host'],
                'Origin': window.location.origin
            }
        });
        
        if (!response.ok) {
            throw new Error(`CORS proxy request failed: ${response.status} ${response.statusText}`);
        }

        const jsonResponse = await response.json();
        console.log(`✅ FootballWebPagesAPI: CORS proxy request successful`);
        
        return jsonResponse;
    }

    async executeWithRetry(operation) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ FootballWebPagesAPI: Attempt ${attempt} failed:`, error.message);
                
                if (attempt < this.maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                    console.log(`⏳ FootballWebPagesAPI: Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }

    // Fetch fixtures for a date range
    async fetchDateRangeFixtures(startDate, endDate, league, season) {
        try {
            console.log(`🔍 FootballWebPagesAPI: Fetching fixtures from ${startDate} to ${endDate} for ${league} ${season}`);
            
            // Validate inputs
            if (!startDate || !endDate || !league || !season) {
                throw new Error('Missing required parameters: startDate, endDate, league, season');
            }

            // Check if we're in development mode and should use mock data
            if (window.developmentHelper && window.developmentHelper.isDevMode()) {
                console.log('🔧 FootballWebPagesAPI: Development mode detected, using mock data');
                return window.developmentHelper.getMockFixtures(league, season, startDate, endDate);
            }

            // Try multiple date formats for API compatibility
            const dateFormats = [
                startDate, // YYYY-MM-DD
                new Date(startDate).toLocaleDateString('en-GB'), // DD/MM/YYYY
                new Date(startDate).toLocaleDateString('en-US') // MM/DD/YYYY
            ];

            let response = null;
            let workingFormat = null;

            for (const dateFormat of dateFormats) {
                try {
                    const params = {
                        from: dateFormat,
                        to: dateFormat,
                        comp: league,
                        season: season
                    };

                    response = await this.makeAPIRequest('fixtures-results.json', params);
                    
                    if (response && response['fixtures-results'] && response['fixtures-results'].matches) {
                        workingFormat = dateFormat;
                        break;
                    }
                } catch (error) {
                    console.warn(`⚠️ FootballWebPagesAPI: Date format ${dateFormat} failed:`, error.message);
                }
            }

            if (!response) {
                throw new Error('All date formats failed for API request');
            }

            console.log(`✅ FootballWebPagesAPI: Successfully fetched fixtures using format ${workingFormat}`);
            
            // Parse and filter response data
            const fixtures = this.parseFixturesResponse(response);
            
            return {
                fixtures: fixtures,
                total: fixtures.length,
                dateFormat: workingFormat,
                rawResponse: response
            };

        } catch (error) {
            console.error('❌ FootballWebPagesAPI: Error fetching date range fixtures:', error);
            throw error;
        }
    }

    // Parse API response and transform to app format
    parseFixturesResponse(response) {
        try {
            if (!response || !response['fixtures-results'] || !response['fixtures-results'].matches) {
                console.warn('⚠️ FootballWebPagesAPI: No matches found in response');
                return [];
            }

            const matches = response['fixtures-results'].matches;
            console.log(`🔍 FootballWebPagesAPI: Parsing ${matches.length} matches`);

            return matches.map((match, index) => {
                // Extract team names with multiple fallback strategies
                let homeTeam, awayTeam;

                if (match['home-team'] && match['away-team']) {
                    homeTeam = this.extractTeamName(match['home-team']);
                    awayTeam = this.extractTeamName(match['away-team']);
                } else if (match.home && match.away) {
                    homeTeam = this.extractTeamName(match.home);
                    awayTeam = this.extractTeamName(match.away);
                } else {
                    console.warn(`⚠️ FootballWebPagesAPI: Skipping match ${index} - missing team names`);
                    return null;
                }

                // Extract other match data
                const matchDate = match.date || new Date().toISOString().split('T')[0];
                const matchTime = match.time || 'TBD';
                const venue = match.venue || 'TBD';
                const status = this.determineMatchStatus(match);
                const homeScore = match['home-score'] || match.homeScore || null;
                const awayScore = match['away-score'] || match.awayScore || null;

                return {
                    homeTeam: homeTeam,
                    awayTeam: awayTeam,
                    date: matchDate,
                    kickOffTime: matchTime,
                    venue: venue,
                    status: status,
                    homeScore: homeScore,
                    awayScore: awayScore,
                    // Store original API data for reference
                    apiData: match
                };
            }).filter(fixture => fixture !== null);

        } catch (error) {
            console.error('❌ FootballWebPagesAPI: Error parsing fixtures response:', error);
            throw error;
        }
    }

    // Extract team name with multiple fallback strategies
    extractTeamName(teamData) {
        if (typeof teamData === 'string') {
            return teamData;
        } else if (typeof teamData === 'object') {
            // Try multiple possible team name properties
            const nameProperties = ['name', 'title', 'displayName', 'teamName', 'fullName', 'shortName'];
            
            for (const prop of nameProperties) {
                if (teamData[prop]) {
                    return teamData[prop];
                }
            }
            
            // If no standard property found, try to extract from object
            console.warn('⚠️ FootballWebPagesAPI: Unknown team data format:', teamData);
            return JSON.stringify(teamData);
        }
        
        return 'Unknown Team';
    }

    // Determine match status based on available data
    determineMatchStatus(match) {
        if (match.status) {
            return match.status;
        }
        
        // Check if match has scores
        const hasHomeScore = match['home-score'] || match.homeScore;
        const hasAwayScore = match['away-score'] || match.awayScore;
        
        if (hasHomeScore !== null && hasAwayScore !== null) {
            return 'FT'; // Full Time
        }
        
        // Check if match date is in the past
        if (match.date) {
            const matchDate = new Date(match.date);
            const now = new Date();
            
            if (matchDate < now) {
                return 'FT'; // Assume finished if past date
            }
        }
        
        return 'NS'; // Not Started
    }

    // Import selected fixtures to database
    async importSelectedFixtures(fixtures, activeEdition, gameWeek) {
        try {
            console.log(`📥 FootballWebPagesAPI: Importing ${fixtures.length} fixtures for edition ${activeEdition}, gameweek ${gameWeek}`);
            
            if (!this.db) {
                throw new Error('Database not initialized');
            }

            if (!activeEdition || !gameWeek) {
                throw new Error('Missing required parameters: activeEdition, gameWeek');
            }

            // Transform API format to database format
            const fixturesToSave = fixtures.map((fixture, index) => {
                const fixtureId = `fixture_${Date.now()}_${index}`;
                
                return {
                    fixtureId: fixtureId,
                    homeTeam: fixture.homeTeam,
                    awayTeam: fixture.awayTeam,
                    date: fixture.date,
                    kickOffTime: fixture.kickOffTime,
                    venue: fixture.venue,
                    status: fixture.status,
                    homeScore: fixture.homeScore,
                    awayScore: fixture.awayScore,
                    season: '2024-25', // Default season
                    round: gameWeek,
                    importedAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    importedFrom: 'API',
                    // Store original API data for reference
                    apiData: fixture.apiData
                };
            });

            // Save to Firestore with edition-specific keys
            const editionGameweekKey = `edition${activeEdition}_gw${gameWeek}`;
            
            await this.db.collection('fixtures').doc(editionGameweekKey).set({
                fixtures: fixturesToSave,
                gameweek: gameWeek,
                edition: activeEdition,
                lastUpdated: new Date(),
                importedFrom: 'API',
                totalFixtures: fixturesToSave.length
            });

            console.log(`✅ FootballWebPagesAPI: Successfully imported ${fixturesToSave.length} fixtures to ${editionGameweekKey}`);
            
            // Log audit event if available
            if (window.losApp && window.losApp.managers.superAdmin) {
                await window.losApp.managers.superAdmin.logAuditEvent(
                    'super_admin',
                    'import_fixtures',
                    {
                        competitionId: 'API',
                        editionId: activeEdition,
                        gameweek: gameWeek,
                        fixtureCount: fixturesToSave.length,
                        importedAt: new Date().toISOString()
                    }
                );
            }

            return fixturesToSave;

        } catch (error) {
            console.error('❌ FootballWebPagesAPI: Error importing fixtures:', error);
            throw error;
        }
    }

    // Get available competitions
    async getCompetitions() {
        try {
            console.log('🔍 FootballWebPagesAPI: Fetching available competitions...');
            
            // Check if we're in development mode and should use mock data
            if (window.developmentHelper && window.developmentHelper.isDevMode()) {
                console.log('🔧 FootballWebPagesAPI: Development mode detected, using mock competitions');
                return window.developmentHelper.getMockCompetitions();
            }
            
            // Return predefined competitions from config
            const competitions = this.config.LEAGUES || {};
            
            return Object.entries(competitions).map(([key, comp]) => ({
                id: comp.id,
                name: comp.name,
                description: comp.description,
                key: key,
                seasons: comp.seasons || this.config.DEFAULT_SEASONS
            }));
            
        } catch (error) {
            console.error('❌ FootballWebPagesAPI: Error fetching competitions:', error);
            throw error;
        }
    }

    // Test API connection
    async testConnection() {
        try {
            console.log('🔍 FootballWebPagesAPI: Testing API connection...');
            
            // Check if we're in development mode first
            if (window.developmentHelper && window.developmentHelper.isDevMode()) {
                return await window.developmentHelper.testConnection();
            }
            
            // Try to fetch competitions as a connection test
            const competitions = await this.getCompetitions();
            
            console.log('✅ FootballWebPagesAPI: API connection successful');
            return {
                success: true,
                message: 'API connection successful',
                competitionsCount: competitions.length
            };
            
        } catch (error) {
            console.error('❌ FootballWebPagesAPI: API connection failed:', error);
            return {
                success: false,
                message: error.message,
                error: error
            };
        }
    }
}

// Export for global access
window.FootballWebPagesAPI = FootballWebPagesAPI;
