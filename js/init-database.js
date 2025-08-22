// Database Initialization Script
// Run this once to set up your Firestore database with initial data

class DatabaseInitializer {
    constructor() {
        this.db = window.firebaseDB;
    }

    async initializeDatabase() {
        try {
            console.log('Initializing database...');
            
            // Create settings collection
            await this.createSettings();
            
            // Create sample fixtures
            await this.createSampleFixtures();
            
            // Create sample users (for testing)
            await this.createSampleUsers();
            
            console.log('Database initialization complete!');
            
        } catch (error) {
            console.error('Error initializing database:', error);
        }
    }

    async createSettings() {
        const settingsRef = this.db.collection('settings').doc('currentCompetition');
        
        const settings = {
            active_gameweek: "1",
            tiebreak_enabled: true,
            registration_open: true,
            current_edition: "1",
            available_editions: [
                {
                    id: "1",
                    name: "Championship 2024/25",
                    description: "English Championship Season",
                    start_date: "2024-08-01",
                    end_date: "2025-05-01",
                    max_lives: 2,
                    is_active: true
                },
                {
                    id: "2", 
                    name: "Premier League 2024/25",
                    description: "English Premier League Season",
                    start_date: "2024-08-01",
                    end_date: "2025-05-01",
                    max_lives: 2,
                    is_active: false
                }
            ],
            created_at: new Date(),
            updated_at: new Date()
        };
        
        await settingsRef.set(settings);
        console.log('Settings created');
    }

    async createSampleFixtures() {
        const fixturesRef = this.db.collection('fixtures').doc('edition1_gw1');
        
        const fixtures = {
            edition: "1",
            gameweek: "1",
            fixtures: [
                {
                    homeTeam: "Arsenal",
                    awayTeam: "Chelsea",
                    date: "2024-01-15",
                    kickOffTime: "15:00:00",
                    homeScore: null,
                    awayScore: null,
                    status: "scheduled"
                },
                {
                    homeTeam: "Liverpool",
                    awayTeam: "Manchester United",
                    date: "2024-01-15",
                    kickOffTime: "17:30:00",
                    homeScore: null,
                    awayScore: null,
                    status: "scheduled"
                },
                {
                    homeTeam: "Manchester City",
                    awayTeam: "Tottenham",
                    date: "2024-01-16",
                    kickOffTime: "20:00:00",
                    homeScore: null,
                    awayScore: null,
                    status: "scheduled"
                }
            ],
            created_at: new Date(),
            updated_at: new Date()
        };
        
        await fixturesRef.set(fixtures);
        console.log('Sample fixtures created');
    }

    async createSampleUsers() {
        // Create a test admin user
        const adminUser = {
            uid: "admin123",
            displayName: "Admin User",
            email: "admin@losapp.com",
            lives: 2,
            picks: {},
            registeredEditions: ["1"],
            edition: "1",
            isAdmin: true,
            created_at: new Date(),
            updated_at: new Date()
        };
        
        await this.db.collection('users').doc('admin123').set(adminUser);
        console.log('Sample admin user created');
    }
}

// Export for use in console
window.DatabaseInitializer = DatabaseInitializer;
