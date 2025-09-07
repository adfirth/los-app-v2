/**
 * Google Search Service for extracting National League fixture and score data
 * 
 * This service provides methods to extract football data from Google Search results.
 * Note: Due to CORS restrictions, this would typically run server-side or use a proxy.
 */

class GoogleSearchService {
    constructor() {
        this.baseUrl = 'https://www.google.com/search';
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        this.rateLimitDelay = 2000; // 2 seconds between requests
        this.lastRequestTime = 0;
        
        // Common CSS selectors for Google Search results
        this.selectors = {
            // Main search result containers
            searchResults: '.g, .rc, [data-ved]',
            
            // Fixture-specific elements
            fixtureCards: '.imso_mh__first-tn, .imso_mh__second-tn',
            teamNames: '.LC20lb, .DKV0Md, .imso_mh__tm-nm',
            dates: '.MUxGbd, .MUxGbd.v0nnCb, .imso_mh__dt',
            times: '.MUxGbd, .imso_mh__tm',
            
            // Score elements
            scores: '.imso_mh__l-tm-sc, .imso_mh__r-tm-sc, .imso_mh__sc',
            matchStatus: '.imso_mh__st, .imso_mh__status',
            
            // League table elements
            tableRows: '.imso_mh__tbl-row, .imso_mh__pos',
            teamPositions: '.imso_mh__pos',
            teamStats: '.imso_mh__pts, .imso_mh__gd'
        };
        
        // Regular expressions for parsing
        this.regexPatterns = {
            // Team names: "Home Team vs Away Team"
            teamMatch: /([A-Za-z\s&]+)\s+vs\s+([A-Za-z\s&]+)/i,
            
            // Date patterns: "Saturday, 7 September 2025" or "7 Sep 2025"
            datePattern: /(\d{1,2})\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i,
            
            // Time patterns: "15:00" or "3:00 PM"
            timePattern: /(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i,
            
            // Score patterns: "2 - 1" or "2-1"
            scorePattern: /(\d+)\s*[-–]\s*(\d+)/,
            
            // Match status: "Live", "HT", "FT", "Postponed"
            statusPattern: /(Live|HT|FT|Postponed|Cancelled|Abandoned)/i,
            
            // League table: "1. Team Name - 15 pts"
            tablePattern: /(\d+)\.\s+([A-Za-z\s&]+)\s*[-–]\s*(\d+)\s*pts?/i
        };
    }

    /**
     * Search for National League fixtures and results
     * @param {string} query - Search query (e.g., "National League fixtures today")
     * @returns {Promise<Object>} Search results and extracted data
     */
    async searchFixtures(query = 'National League fixtures results') {
        try {
            await this.enforceRateLimit();
            
            const searchUrl = this.buildSearchUrl(query);
            console.log(`🔍 Searching: ${searchUrl}`);
            
            // In a real implementation, this would make an HTTP request
            // Due to CORS restrictions, this is simulated
            const mockResults = await this.simulateGoogleSearch(query);
            
            // Extract data from the results
            const extractedData = this.extractFixtureData(mockResults);
            
            this.lastRequestTime = Date.now();
            
            return {
                success: true,
                query: query,
                searchUrl: searchUrl,
                rawResults: mockResults,
                extractedData: extractedData,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Google Search error:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Build search URL with parameters
     * @param {string} query - Search query
     * @returns {string} Complete search URL
     */
    buildSearchUrl(query) {
        const params = new URLSearchParams({
            q: query,
            tbm: 'nws', // News tab for more structured results
            tbs: 'qdr:d', // Last day
            hl: 'en', // Language
            gl: 'uk' // Country
        });
        
        return `${this.baseUrl}?${params.toString()}`;
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
     * Simulate Google search results (for demonstration)
     * In production, this would be replaced with actual HTTP requests
     */
    async simulateGoogleSearch(query) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Based on the actual Google search results structure you provided
        // Let's create more realistic mock data that matches what we see in real results
        return `
            <div class="g" data-ved="...">
                <div class="rc">
                    <div class="LC20lb DKV0Md">What To Watch Out For In Wednesday Night's Matches</div>
                    <div class="VwiC3b yXK7lf MUxGbd yDYNvb lyLwlc lEBKkf" style="-webkit-line-clamp:2">
                        <span>The second installment of midweek Enterprise National League action is hours away with half a dozen matches to keep an eye on.</span>
                    </div>
                    <div class="fG8Fp uo4vr">
                        <span class="f">National League</span>
                        <span class="f">5 hours ago</span>
                    </div>
                </div>
            </div>
            
            <div class="g" data-ved="...">
                <div class="rc">
                    <div class="LC20lb DKV0Md">National League club share update on player rushed to hospital</div>
                    <div class="VwiC3b yXK7lf MUxGbd yDYNvb lyLwlc lEBKkf" style="-webkit-line-clamp:2">
                        <span>National League club Eastleigh have provided an update on one of their players after he was rushed to hospital in an abandoned match.</span>
                    </div>
                    <div class="fG8Fp uo4vr">
                        <span class="f">talkSPORT</span>
                        <span class="f">2 hours ago</span>
                    </div>
                </div>
            </div>
            
            <div class="g" data-ved="...">
                <div class="rc">
                    <div class="LC20lb DKV0Md">MATCH REPORT: Slough Town 3-2 Chippenham Town | National League South</div>
                    <div class="VwiC3b yXK7lf MUxGbd yDYNvb lyLwlc lEBKkf" style="-webkit-line-clamp:2">
                        <span>An entertaining, end to end first half begun with Slough smashing the crossbar four minutes into the game before Jordan Greenidge poked home to put the...</span>
                    </div>
                    <div class="fG8Fp uo4vr">
                        <span class="f">Chippenham Town FC</span>
                        <span class="f">7 hours ago</span>
                    </div>
                </div>
            </div>
            
            <div class="g" data-ved="...">
                <div class="rc">
                    <div class="LC20lb DKV0Md">MATCH PREVIEW: BRACKLEY TOWN (A)</div>
                    <div class="VwiC3b yXK7lf MUxGbd yDYNvb lyLwlc lEBKkf" style="-webkit-line-clamp:2">
                        <span>United travel to Brackley Town tonight, hoping to bounce back from their first defeat of the Enterprise National League season at the hands of Sutton United...</span>
                    </div>
                    <div class="fG8Fp uo4vr">
                        <span class="f">Carlisle United Football Club</span>
                        <span class="f">4 hours ago</span>
                    </div>
                </div>
            </div>
            
            <div class="g" data-ved="...">
                <div class="rc">
                    <div class="LC20lb DKV0Md">National League match abandoned in stoppage time after sickening collision</div>
                    <div class="VwiC3b yXK7lf MUxGbd yDYNvb lyLwlc lEBKkf" style="-webkit-line-clamp:2">
                        <span>Eastleigh's Archie Harris and Scunthorpe's Jean Belehouan collided in stoppage-time with the match at 1-1, with the referee abandoning the game after both...</span>
                    </div>
                    <div class="fG8Fp uo4vr">
                        <span class="f">The Mirror</span>
                        <span class="f">18 hours ago</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Extract fixture data from HTML results
     * @param {string} html - HTML content from Google search
     * @returns {Object} Extracted fixture, score, and table data
     */
    extractFixtureData(html) {
        // Create a DOM parser (in browser environment)
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const fixtures = [];
        const scores = [];
        const table = [];
        
        // Extract from Google search result cards (.g .rc)
        const searchResults = doc.querySelectorAll('.g .rc');
        
        searchResults.forEach((result, index) => {
            try {
                const fixtureData = this.parseSearchResult(result, doc);
                if (fixtureData) {
                    fixtures.push(fixtureData);
                    
                    // If there's a score, add it to scores array
                    if (fixtureData.homeScore !== null || fixtureData.awayScore !== null) {
                        scores.push({
                            ...fixtureData,
                            status: fixtureData.status,
                            minute: fixtureData.minute
                        });
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Error parsing search result ${index}:`, error);
            }
        });
        
        // Also try to extract from traditional fixture cards if they exist
        const fixtureCards = doc.querySelectorAll(this.selectors.fixtureCards);
        
        fixtureCards.forEach((card, index) => {
            try {
                const fixtureData = this.parseFixtureCard(card, doc);
                if (fixtureData) {
                    fixtures.push(fixtureData);
                    
                    // If there's a score, add it to scores array
                    if (fixtureData.homeScore !== null || fixtureData.awayScore !== null) {
                        scores.push({
                            ...fixtureData,
                            status: fixtureData.status,
                            minute: fixtureData.minute
                        });
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Error parsing fixture card ${index}:`, error);
            }
        });
        
        return {
            fixtures: fixtures,
            scores: scores,
            table: table,
            totalExtracted: fixtures.length
        };
    }

    /**
     * Parse Google search result for fixture data
     * @param {Element} result - DOM element containing search result
     * @param {Document} doc - Full document for context
     * @returns {Object|null} Parsed fixture data or null if parsing fails
     */
    parseSearchResult(result, doc) {
        try {
            // Get the title and description
            const titleElement = result.querySelector('.LC20lb, .DKV0Md');
            const descriptionElement = result.querySelector('.VwiC3b, .yXK7lf');
            const sourceElement = result.querySelector('.fG8Fp .f');
            
            const title = titleElement?.textContent?.trim() || '';
            const description = descriptionElement?.textContent?.trim() || '';
            const source = sourceElement?.textContent?.trim() || '';
            
            // Look for team names in title and description
            const teamMatch = this.extractTeamNames(title + ' ' + description);
            if (!teamMatch) return null;
            
            // Look for scores in title and description
            const scoreMatch = this.extractScores(title + ' ' + description);
            
            // Look for match status
            const status = this.extractMatchStatus(title + ' ' + description);
            
            // Extract date/time information
            const dateTime = this.extractDateTime(title + ' ' + description);
            
            return {
                homeTeam: teamMatch.homeTeam,
                awayTeam: teamMatch.awayTeam,
                homeScore: scoreMatch ? scoreMatch.homeScore : null,
                awayScore: scoreMatch ? scoreMatch.awayScore : null,
                status: status,
                minute: null,
                date: dateTime ? dateTime.date : null,
                time: dateTime ? dateTime.time : null,
                competition: 'National League',
                source: source,
                title: title,
                description: description,
                extractedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Error parsing search result:', error);
            return null;
        }
    }

    /**
     * Parse individual fixture card
     * @param {Element} card - DOM element containing fixture data
     * @param {Document} doc - Full document for context
     * @returns {Object|null} Parsed fixture data or null if parsing fails
     */
    parseFixtureCard(card, doc) {
        try {
            // Extract team names
            const teamNames = card.querySelectorAll(this.selectors.teamNames);
            if (teamNames.length < 2) return null;
            
            const homeTeam = teamNames[0]?.textContent?.trim();
            const awayTeam = teamNames[1]?.textContent?.trim();
            
            // Extract scores
            const scoreElements = card.querySelectorAll(this.selectors.scores);
            let homeScore = null;
            let awayScore = null;
            
            if (scoreElements.length >= 2) {
                homeScore = parseInt(scoreElements[0]?.textContent?.trim()) || null;
                awayScore = parseInt(scoreElements[1]?.textContent?.trim()) || null;
            }
            
            // Extract match status and minute
            const statusElement = card.querySelector(this.selectors.matchStatus);
            const statusText = statusElement?.textContent?.trim() || '';
            
            let status = 'Scheduled';
            let minute = null;
            
            if (statusText.includes('Live')) {
                status = 'Live';
                const minuteMatch = statusText.match(/(\d+)'/);
                minute = minuteMatch ? parseInt(minuteMatch[1]) : null;
            } else if (statusText.includes('HT')) {
                status = 'HT';
            } else if (statusText.includes('FT')) {
                status = 'FT';
            }
            
            // Extract date and time
            const dateElement = card.querySelector(this.selectors.dates);
            const timeElement = card.querySelector(this.selectors.times);
            
            const dateText = dateElement?.textContent?.trim() || '';
            const timeText = timeElement?.textContent?.trim() || '';
            
            // Parse date and time
            const parsedDate = this.parseDate(dateText);
            const parsedTime = this.parseTime(timeText);
            
            return {
                homeTeam: homeTeam,
                awayTeam: awayTeam,
                homeScore: homeScore,
                awayScore: awayScore,
                status: status,
                minute: minute,
                date: parsedDate,
                time: parsedTime,
                competition: 'National League',
                extractedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Error parsing fixture card:', error);
            return null;
        }
    }

    /**
     * Parse date string into ISO format
     * @param {string} dateText - Date text from search results
     * @returns {string|null} ISO date string or null if parsing fails
     */
    parseDate(dateText) {
        try {
            // Handle various date formats
            const dateMatch = dateText.match(this.regexPatterns.datePattern);
            if (dateMatch) {
                const day = parseInt(dateMatch[1]);
                const month = dateMatch[2];
                const year = parseInt(dateMatch[3]);
                
                // Convert month name to number
                const monthMap = {
                    'january': 0, 'jan': 0, 'february': 1, 'feb': 1,
                    'march': 2, 'mar': 2, 'april': 3, 'apr': 3,
                    'may': 4, 'june': 5, 'jun': 5, 'july': 6, 'jul': 6,
                    'august': 7, 'aug': 7, 'september': 8, 'sep': 8,
                    'october': 9, 'oct': 9, 'november': 10, 'nov': 10,
                    'december': 11, 'dec': 11
                };
                
                const monthNum = monthMap[month.toLowerCase()];
                if (monthNum !== undefined) {
                    const date = new Date(year, monthNum, day);
                    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
                }
            }
            
            return null;
        } catch (error) {
            console.warn('⚠️ Error parsing date:', dateText, error);
            return null;
        }
    }

    /**
     * Parse time string into 24-hour format
     * @param {string} timeText - Time text from search results
     * @returns {string|null} Time in HH:MM format or null if parsing fails
     */
    parseTime(timeText) {
        try {
            const timeMatch = timeText.match(this.regexPatterns.timePattern);
            if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = timeMatch[2];
                const period = timeMatch[3];
                
                // Convert 12-hour to 24-hour format
                if (period && period.toUpperCase() === 'PM' && hours !== 12) {
                    hours += 12;
                } else if (period && period.toUpperCase() === 'AM' && hours === 12) {
                    hours = 0;
                }
                
                return `${hours.toString().padStart(2, '0')}:${minutes}`;
            }
            
            return null;
        } catch (error) {
            console.warn('⚠️ Error parsing time:', timeText, error);
            return null;
        }
    }

    /**
     * Validate extracted fixture data
     * @param {Object} fixture - Fixture data to validate
     * @returns {boolean} True if valid, false otherwise
     */
    validateFixtureData(fixture) {
        if (!fixture.homeTeam || !fixture.awayTeam) {
            return false;
        }
        
        if (fixture.homeScore !== null && (fixture.homeScore < 0 || fixture.homeScore > 20)) {
            return false;
        }
        
        if (fixture.awayScore !== null && (fixture.awayScore < 0 || fixture.awayScore > 20)) {
            return false;
        }
        
        if (fixture.minute !== null && (fixture.minute < 0 || fixture.minute > 120)) {
            return false;
        }
        
        return true;
    }

    /**
     * Get search suggestions for better queries
     * @returns {Array<string>} Array of suggested search queries
     */
    getSearchSuggestions() {
        return [
            'National League fixtures today',
            'National League results live',
            'National League table standings',
            'National League scores today',
            'National League fixtures this weekend',
            'National League live scores',
            'National League latest results',
            'National League upcoming fixtures'
        ];
    }

    /**
     * Extract team names from text
     * @param {string} text - Text to search for team names
     * @returns {Object|null} Object with homeTeam and awayTeam or null if not found
     */
    extractTeamNames(text) {
        // Common National League team names
        const nationalLeagueTeams = [
            'Chesterfield', 'Solihull Moors', 'Barnet', 'Aldershot Town', 'Gateshead', 
            'Dagenham & Redbridge', 'Eastleigh', 'Scunthorpe', 'Slough Town', 
            'Chippenham Town', 'Brackley Town', 'Carlisle United', 'Sutton United',
            'FC Halifax Town', 'Woking', 'Truro City', 'York City', 'Oldham Athletic',
            'Rochdale', 'Hartlepool United', 'Boreham Wood', 'Maidenhead United',
            'Wealdstone', 'Dorking Wanderers', 'Ebbsfleet United', 'Oxford City',
            'Kidderminster Harriers', 'Altrincham', 'Bromley', 'Southend United'
        ];
        
        // Look for "vs" pattern
        const vsMatch = text.match(/([A-Za-z\s&]+)\s+vs\s+([A-Za-z\s&]+)/i);
        if (vsMatch) {
            const homeTeam = vsMatch[1].trim();
            const awayTeam = vsMatch[2].trim();
            
            // Check if these are likely National League teams
            if (nationalLeagueTeams.some(team => homeTeam.includes(team)) || 
                nationalLeagueTeams.some(team => awayTeam.includes(team))) {
                return { homeTeam, awayTeam };
            }
        }
        
        // Look for score patterns that might indicate teams
        const scoreMatch = text.match(/([A-Za-z\s&]+)\s+(\d+)\s*[-–]\s*(\d+)\s+([A-Za-z\s&]+)/i);
        if (scoreMatch) {
            const homeTeam = scoreMatch[1].trim();
            const awayTeam = scoreMatch[4].trim();
            
            if (nationalLeagueTeams.some(team => homeTeam.includes(team)) || 
                nationalLeagueTeams.some(team => awayTeam.includes(team))) {
                return { homeTeam, awayTeam };
            }
        }
        
        return null;
    }

    /**
     * Extract scores from text
     * @param {string} text - Text to search for scores
     * @returns {Object|null} Object with homeScore and awayScore or null if not found
     */
    extractScores(text) {
        const scoreMatch = text.match(/(\d+)\s*[-–]\s*(\d+)/);
        if (scoreMatch) {
            return {
                homeScore: parseInt(scoreMatch[1]),
                awayScore: parseInt(scoreMatch[2])
            };
        }
        return null;
    }

    /**
     * Extract match status from text
     * @param {string} text - Text to search for match status
     * @returns {string} Match status (Live, HT, FT, Scheduled, etc.)
     */
    extractMatchStatus(text) {
        const textLower = text.toLowerCase();
        
        if (textLower.includes('live') || textLower.includes('ongoing')) {
            return 'Live';
        } else if (textLower.includes('ht') || textLower.includes('half time')) {
            return 'HT';
        } else if (textLower.includes('ft') || textLower.includes('full time') || textLower.includes('final')) {
            return 'FT';
        } else if (textLower.includes('abandoned') || textLower.includes('cancelled')) {
            return 'Abandoned';
        } else if (textLower.includes('postponed')) {
            return 'Postponed';
        } else if (textLower.includes('preview') || textLower.includes('upcoming')) {
            return 'Scheduled';
        }
        
        return 'Scheduled';
    }

    /**
     * Extract date and time from text
     * @param {string} text - Text to search for date/time
     * @returns {Object|null} Object with date and time or null if not found
     */
    extractDateTime(text) {
        // Look for time patterns
        const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
        const time = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : null;
        
        // Look for date patterns
        const dateMatch = text.match(/(\d{1,2})\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
        let date = null;
        
        if (dateMatch) {
            const day = parseInt(dateMatch[1]);
            const month = dateMatch[2];
            const year = parseInt(dateMatch[3]);
            
            const monthMap = {
                'january': 0, 'jan': 0, 'february': 1, 'feb': 1,
                'march': 2, 'mar': 2, 'april': 3, 'apr': 3,
                'may': 4, 'june': 5, 'jun': 5, 'july': 6, 'jul': 6,
                'august': 7, 'aug': 7, 'september': 8, 'sep': 8,
                'october': 9, 'oct': 9, 'november': 10, 'nov': 10,
                'december': 11, 'dec': 11
            };
            
            const monthNum = monthMap[month.toLowerCase()];
            if (monthNum !== undefined) {
                const dateObj = new Date(year, monthNum, day);
                date = dateObj.toISOString().split('T')[0];
            }
        }
        
        return (date || time) ? { date, time } : null;
    }

    /**
     * Handle errors and provide fallback strategies
     * @param {Error} error - Error that occurred
     * @returns {Object} Fallback data or error information
     */
    handleError(error) {
        console.error('❌ Google Search Service Error:', error);
        
        // Return fallback data structure
        return {
            success: false,
            error: error.message,
            fallbackData: {
                fixtures: [],
                scores: [],
                table: [],
                message: 'Using fallback data due to search service error'
            },
            timestamp: new Date().toISOString()
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoogleSearchService;
} else if (typeof window !== 'undefined') {
    window.GoogleSearchService = GoogleSearchService;
}

// Example usage and testing
if (typeof window !== 'undefined') {
    // Initialize service
    const googleSearchService = new GoogleSearchService();
    
    // Test the service
    window.testGoogleSearchService = async function() {
        console.log('🧪 Testing Google Search Service...');
        
        try {
            const results = await googleSearchService.searchFixtures('National League fixtures today');
            console.log('✅ Search results:', results);
            
            if (results.success) {
                console.log(`📊 Extracted ${results.extractedData.totalExtracted} fixtures`);
                console.log('⚽ Fixtures:', results.extractedData.fixtures);
                console.log('📈 Scores:', results.extractedData.scores);
            }
            
            return results;
        } catch (error) {
            console.error('❌ Test failed:', error);
            return null;
        }
    };
    
    // Add service to global scope for testing
    window.googleSearchService = googleSearchService;
}
