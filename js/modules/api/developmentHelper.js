// Development Helper for Local Testing
// Provides mock data and fallback functionality for development

class DevelopmentHelper {
    constructor() {
        this.isDevelopment = window.location.hostname === '127.0.0.1' || 
                           window.location.hostname === 'localhost' ||
                           window.location.hostname.includes('live-server');
    }

    // Check if we're in development mode
    isDevMode() {
        // Check if we should use real API from development config
        if (window.devConfig && window.devConfig.shouldUseRealApi()) {
            return false; // Don't use mock data if real API is enabled
        }
        return this.isDevelopment;
    }

    // Get mock fixtures for development testing
    getMockFixtures(competition, season, startDate, endDate) {
        console.log('🔧 DevelopmentHelper: Using mock fixtures for development');
        
        const mockFixtures = [
            {
                homeTeam: "Altrincham",
                awayTeam: "Chesterfield",
                date: startDate,
                kickOffTime: "15:00",
                venue: "Moss Lane",
                status: "NS",
                homeScore: null,
                awayScore: null,
                apiData: {
                    'home-team': { name: "Altrincham" },
                    'away-team': { name: "Chesterfield" },
                    date: startDate,
                    time: "15:00",
                    venue: "Moss Lane"
                }
            },
            {
                homeTeam: "Boreham Wood",
                awayTeam: "Dagenham & Redbridge",
                date: startDate,
                kickOffTime: "15:00",
                venue: "Meadow Park",
                status: "NS",
                homeScore: null,
                awayScore: null,
                apiData: {
                    'home-team': { name: "Boreham Wood" },
                    'away-team': { name: "Dagenham & Redbridge" },
                    date: startDate,
                    time: "15:00",
                    venue: "Meadow Park"
                }
            },
            {
                homeTeam: "Eastleigh",
                awayTeam: "Gateshead",
                date: startDate,
                kickOffTime: "15:00",
                venue: "Silverlake Stadium",
                status: "NS",
                homeScore: null,
                awayScore: null,
                apiData: {
                    'home-team': { name: "Eastleigh" },
                    'away-team': { name: "Gateshead" },
                    date: startDate,
                    time: "15:00",
                    venue: "Silverlake Stadium"
                }
            },
            {
                homeTeam: "Halifax",
                awayTeam: "Hartlepool",
                date: startDate,
                kickOffTime: "15:00",
                venue: "The Shay",
                status: "NS",
                homeScore: null,
                awayScore: null,
                apiData: {
                    'home-team': { name: "Halifax" },
                    'away-team': { name: "Hartlepool" },
                    date: startDate,
                    time: "15:00",
                    venue: "The Shay"
                }
            },
            {
                homeTeam: "Kidderminster",
                awayTeam: "Maidenhead",
                date: startDate,
                kickOffTime: "15:00",
                venue: "Aggborough",
                status: "NS",
                homeScore: null,
                awayScore: null,
                apiData: {
                    'home-team': { name: "Kidderminster" },
                    'away-team': { name: "Maidenhead" },
                    date: startDate,
                    time: "15:00",
                    venue: "Aggborough"
                }
            }
        ];

        return {
            fixtures: mockFixtures,
            total: mockFixtures.length,
            dateFormat: startDate,
            rawResponse: {
                'fixtures-results': {
                    matches: mockFixtures.map(f => f.apiData)
                }
            },
            isMockData: true
        };
    }

    // Get mock competitions
    getMockCompetitions() {
        return [
            {
                id: '5',
                name: 'National League',
                description: 'English National League (5th tier)',
                key: 'national-league',
                seasons: ['2024-25', '2023-24', '2022-23']
            },
            {
                id: '1',
                name: 'Premier League',
                description: 'English Premier League (1st tier)',
                key: 'premier-league',
                seasons: ['2024-25', '2023-24', '2022-23']
            },
            {
                id: '2',
                name: 'EFL Championship',
                description: 'English Championship (2nd tier)',
                key: 'championship',
                seasons: ['2024-25', '2023-24', '2022-23']
            }
        ];
    }

    // Test API connection with fallback
    async testConnection() {
        if (this.isDevMode()) {
            console.log('🔧 DevelopmentHelper: Development mode detected, using mock connection test');
            return {
                success: true,
                message: 'Development mode - using mock data',
                competitionsCount: 3,
                isMockData: true
            };
        }
        return null; // Let the real API handle it
    }

    // Show development mode indicator
    showDevModeIndicator() {
        if (this.isDevMode()) {
            // Create a development mode banner
            const banner = document.createElement('div');
            banner.id = 'devModeBanner';
            banner.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(90deg, #ff6b6b, #4ecdc4);
                color: white;
                text-align: center;
                padding: 8px;
                font-size: 12px;
                font-weight: bold;
                z-index: 10000;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            `;
            banner.innerHTML = '🔧 DEVELOPMENT MODE - Using mock data and local testing';
            document.body.appendChild(banner);

            // Adjust body padding to account for banner
            document.body.style.paddingTop = '40px';
        }
    }

    // Remove development mode indicator
    removeDevModeIndicator() {
        const banner = document.getElementById('devModeBanner');
        if (banner) {
            banner.remove();
            document.body.style.paddingTop = '';
        }
    }
}

// Export for global access
window.DevelopmentHelper = DevelopmentHelper;
