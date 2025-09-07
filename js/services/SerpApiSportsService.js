/**
 * SerpApi Sports Results Service for National League data
 * 
 * This service provides methods to extract football data from SerpApi's Sports Results API.
 * SerpApi provides structured JSON data instead of HTML scraping, solving CORS and reliability issues.
 */

class SerpApiSportsService {
    constructor(apiKey = null) {
        this.baseUrl = 'https://serpapi.com/search';
        this.apiKey = apiKey || 'YOUR_SERPAPI_KEY'; // Replace with actual API key
        this.rateLimitDelay = 1000; // 1 second between requests
        this.lastRequestTime = 0;
        
        // SerpApi parameters for sports results
        this.defaultParams = {
            engine: 'google',
            tbm: 'sports', // Sports tab
            hl: 'en', // Language
            gl: 'uk' // Country
        };
    }

    /**
     * Search for National League fixtures and results
     * @param {string} query - Search query (e.g., "National League fixtures today")
     * @param {Object} options - Additional search options
     * @returns {Promise<Object>} Search results and extracted data
     */
    async searchNationalLeague(query = 'National League fixtures today', options = {}) {
        try {
            await this.enforceRateLimit();
            
            const searchParams = {
                ...this.defaultParams,
                q: query,
                api_key: this.apiKey,
                ...options
            };
            
            console.log(`🔍 Searching SerpApi: ${query}`);
            
            // In a real implementation, this would make an HTTP request to SerpApi
            // For now, we'll simulate the response structure
            const mockResponse = await this.simulateSerpApiResponse(query);
            
            // Extract data from the SerpApi response
            const extractedData = this.extractSportsData(mockResponse);
            
            this.lastRequestTime = Date.now();
            
            return {
                success: true,
                query: query,
                searchParams: searchParams,
                rawResponse: mockResponse,
                extractedData: extractedData,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ SerpApi Sports Search error:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get live National League scores
     * @returns {Promise<Object>} Live scores and match data
     */
    async getLiveScores() {
        return await this.searchNationalLeague('National League live scores', {
            tbs: 'qdr:d' // Last day
        });
    }

    /**
     * Get National League fixtures for today
     * @returns {Promise<Object>} Today's fixtures
     */
    async getTodaysFixtures() {
        return await this.searchNationalLeague('National League fixtures today', {
            tbs: 'qdr:d' // Last day
        });
    }

    /**
     * Get National League table standings
     * @returns {Promise<Object>} League table data
     */
    async getLeagueTable() {
        return await this.searchNationalLeague('National League table standings');
    }

    /**
     * Get specific team fixtures
     * @param {string} teamName - Name of the team
     * @returns {Promise<Object>} Team-specific fixture data
     */
    async getTeamFixtures(teamName) {
        return await this.searchNationalLeague(`${teamName} National League fixtures`);
    }

    /**
     * Simulate SerpApi response (for demonstration)
     * In production, this would be replaced with actual HTTP requests to SerpApi
     */
    async simulateSerpApiResponse(query) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock SerpApi Sports Results response structure
        // Based on the actual SerpApi documentation
        return {
            "sports_results": {
                "title": "National League - Today's Matches",
                "games": [
                    {
                        "tournament": "National League",
                        "status": "Live",
                        "date": "Today",
                        "time": "15:00",
                        "stadium": "Proact Stadium",
                        "teams": [
                            {
                                "name": "Chesterfield",
                                "score": "2",
                                "kgmid": "/m/0ghxlh",
                                "thumbnail": "https://ssl.gstatic.com/onebox/media/sports/logos/chesterfield_96x96.png"
                            },
                            {
                                "name": "Solihull Moors",
                                "score": "1",
                                "kgmid": "/m/05p3s60",
                                "thumbnail": "https://ssl.gstatic.com/onebox/media/sports/logos/solihull_moors_96x96.png"
                            }
                        ]
                    },
                    {
                        "tournament": "National League",
                        "status": "HT",
                        "date": "Today",
                        "time": "15:00",
                        "stadium": "The Hive Stadium",
                        "teams": [
                            {
                                "name": "Barnet",
                                "score": "0",
                                "kgmid": "/m/0ghxlh",
                                "thumbnail": "https://ssl.gstatic.com/onebox/media/sports/logos/barnet_96x96.png"
                            },
                            {
                                "name": "Aldershot Town",
                                "score": "0",
                                "kgmid": "/m/05p3s60",
                                "thumbnail": "https://ssl.gstatic.com/onebox/media/sports/logos/aldershot_96x96.png"
                            }
                        ]
                    },
                    {
                        "tournament": "National League",
                        "status": "FT",
                        "date": "Today",
                        "time": "15:00",
                        "stadium": "Gateshead International Stadium",
                        "teams": [
                            {
                                "name": "Gateshead",
                                "score": "1",
                                "kgmid": "/m/0ghxlh",
                                "thumbnail": "https://ssl.gstatic.com/onebox/media/sports/logos/gateshead_96x96.png"
                            },
                            {
                                "name": "Dagenham & Redbridge",
                                "score": "2",
                                "kgmid": "/m/05p3s60",
                                "thumbnail": "https://ssl.gstatic.com/onebox/media/sports/logos/dagenham_96x96.png"
                            }
                        ]
                    }
                ],
                "league": {
                    "name": "National League",
                    "standings": [
                        {
                            "position": 1,
                            "team": "Chesterfield",
                            "played": 5,
                            "won": 5,
                            "drawn": 0,
                            "lost": 0,
                            "points": 15
                        },
                        {
                            "position": 2,
                            "team": "Solihull Moors",
                            "played": 5,
                            "won": 4,
                            "drawn": 0,
                            "lost": 1,
                            "points": 12
                        },
                        {
                            "position": 3,
                            "team": "Barnet",
                            "played": 5,
                            "won": 3,
                            "drawn": 1,
                            "lost": 1,
                            "points": 10
                        }
                    ]
                }
            }
        };
    }

    /**
     * Extract sports data from SerpApi response
     * @param {Object} response - SerpApi response object
     * @returns {Object} Extracted fixture, score, and table data
     */
    extractSportsData(response) {
        const fixtures = [];
        const scores = [];
        const table = [];
        
        if (response.sports_results) {
            const sportsData = response.sports_results;
            
            // Extract games/fixtures
            if (sportsData.games && Array.isArray(sportsData.games)) {
                sportsData.games.forEach(game => {
                    if (game.teams && game.teams.length >= 2) {
                        const homeTeam = game.teams[0];
                        const awayTeam = game.teams[1];
                        
                        const fixture = {
                            homeTeam: homeTeam.name,
                            awayTeam: awayTeam.name,
                            homeScore: homeTeam.score ? parseInt(homeTeam.score) : null,
                            awayScore: awayTeam.score ? parseInt(awayTeam.score) : null,
                            status: game.status || 'Scheduled',
                            date: game.date || null,
                            time: game.time || null,
                            stadium: game.stadium || null,
                            tournament: game.tournament || 'National League',
                            homeTeamThumbnail: homeTeam.thumbnail || null,
                            awayTeamThumbnail: awayTeam.thumbnail || null,
                            extractedAt: new Date().toISOString()
                        };
                        
                        fixtures.push(fixture);
                        
                        // If there's a score, add it to scores array
                        if (fixture.homeScore !== null || fixture.awayScore !== null) {
                            scores.push({
                                ...fixture,
                                status: fixture.status
                            });
                        }
                    }
                });
            }
            
            // Extract league table
            if (sportsData.league && sportsData.league.standings) {
                sportsData.league.standings.forEach(standing => {
                    table.push({
                        position: standing.position,
                        team: standing.team,
                        played: standing.played,
                        won: standing.won,
                        drawn: standing.drawn,
                        lost: standing.lost,
                        points: standing.points
                    });
                });
            }
        }
        
        return {
            fixtures: fixtures,
            scores: scores,
            table: table,
            totalExtracted: fixtures.length
        };
    }

    /**
     * Enforce rate limiting between requests
     */
    async enforceRateLimit() {
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;
        if (timeSinceLastRequest < this.rateLimitDelay) {
            const delay = this.rateLimitDelay - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    /**
     * Set API key
     * @param {string} apiKey - SerpApi API key
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Get search suggestions for better queries
     * @returns {Array<string>} Array of suggested search queries
     */
    getSearchSuggestions() {
        return [
            'National League fixtures today',
            'National League live scores',
            'National League table standings',
            'National League results today',
            'National League fixtures this weekend',
            'National League latest results',
            'National League upcoming fixtures',
            'Chesterfield National League fixtures',
            'Solihull Moors National League results'
        ];
    }

    /**
     * Handle errors and provide fallback strategies
     * @param {Error} error - Error that occurred
     * @returns {Object} Fallback data or error information
     */
    handleError(error) {
        console.error('❌ SerpApi Sports Service Error:', error);
        
        return {
            success: false,
            error: error.message,
            fallbackData: {
                fixtures: [],
                scores: [],
                table: [],
                message: 'Using fallback data due to SerpApi service error'
            },
            timestamp: new Date().toISOString()
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SerpApiSportsService;
} else if (typeof window !== 'undefined') {
    window.SerpApiSportsService = SerpApiSportsService;
}

// Example usage and testing
if (typeof window !== 'undefined') {
    // Initialize service
    const serpApiSportsService = new SerpApiSportsService();
    
    // Test the service
    window.testSerpApiSportsService = async function() {
        console.log('🧪 Testing SerpApi Sports Service...');
        
        try {
            const results = await serpApiSportsService.searchNationalLeague('National League fixtures today');
            console.log('✅ Search results:', results);
            
            if (results.success) {
                console.log(`📊 Extracted ${results.extractedData.totalExtracted} fixtures`);
                console.log('⚽ Fixtures:', results.extractedData.fixtures);
                console.log('📈 Scores:', results.extractedData.scores);
                console.log('🏆 Table:', results.extractedData.table);
            }
            
            return results;
        } catch (error) {
            console.error('❌ Test failed:', error);
            return null;
        }
    };
    
    // Add service to global scope for testing
    window.serpApiSportsService = serpApiSportsService;
}

