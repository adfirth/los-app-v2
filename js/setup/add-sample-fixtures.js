// Add Sample Fixtures Script
// Creates sample GW1 fixtures in the default club for testing team badges

class SampleFixturesSetup {
    constructor() {
        this.db = window.firebaseDB;
    }

    async addSampleFixtures() {
        try {
            console.log('🏆 Adding sample GW1 fixtures to default club...');
            
            const clubId = 'default-club';
            const editionId = 'default-edition';
            const gameweekId = 'gw1';
            
            // Sample GW1 fixtures with popular teams for badge testing
            const fixtures = [
                {
                    fixtureId: 'fixture1',
                    homeTeam: 'Arsenal',
                    awayTeam: 'Chelsea',
                    date: '2024-08-15',
                    kickOffTime: '15:00:00',
                    homeScore: null,
                    awayScore: null,
                    status: 'scheduled',
                    result: null,
                    winner: null
                },
                {
                    fixtureId: 'fixture2',
                    homeTeam: 'Liverpool',
                    awayTeam: 'Manchester United',
                    date: '2024-08-15',
                    kickOffTime: '17:30:00',
                    homeScore: null,
                    awayScore: null,
                    status: 'scheduled',
                    result: null,
                    winner: null
                },
                {
                    fixtureId: 'fixture3',
                    homeTeam: 'Manchester City',
                    awayTeam: 'Tottenham',
                    date: '2024-08-16',
                    kickOffTime: '20:00:00',
                    homeScore: null,
                    awayScore: null,
                    status: 'scheduled',
                    result: null,
                    winner: null
                },
                {
                    fixtureId: 'fixture4',
                    homeTeam: 'Newcastle',
                    awayTeam: 'Aston Villa',
                    date: '2024-08-16',
                    kickOffTime: '15:00:00',
                    homeScore: null,
                    awayScore: null,
                    status: 'scheduled',
                    result: null,
                    winner: null
                },
                {
                    fixtureId: 'fixture5',
                    homeTeam: 'West Ham',
                    awayTeam: 'Brighton',
                    date: '2024-08-17',
                    kickOffTime: '15:00:00',
                    homeScore: null,
                    awayScore: null,
                    status: 'scheduled',
                    result: null,
                    winner: null
                }
            ];

            // Create the fixtures document
            const fixturesRef = this.db.collection('clubs').doc(clubId)
                .collection('editions').doc(editionId)
                .collection('fixtures').doc(gameweekId);

            const fixturesData = {
                gameweekId: gameweekId,
                gameweek: 1,
                fixtures: fixtures,
                deadline: '2024-08-15T14:30:00Z',
                isLocked: false,
                created_at: new Date(),
                updated_at: new Date()
            };

            await fixturesRef.set(fixturesData);
            console.log('✅ Sample GW1 fixtures added successfully!');
            console.log(`📋 Added ${fixtures.length} fixtures to ${clubId}/${editionId}/gw1`);
            
            // Also add the fixtures to the legacy structure for compatibility
            await this.addLegacyFixtures(fixtures);
            
            return true;
        } catch (error) {
            console.error('❌ Error adding sample fixtures:', error);
            return false;
        }
    }

    async addLegacyFixtures(fixtures) {
        try {
            console.log('🔄 Adding fixtures to legacy structure for compatibility...');
            
            // Add to the old fixtures collection for backward compatibility
            const legacyFixturesRef = this.db.collection('fixtures').doc('edition1_gw1');
            
            const legacyData = {
                edition: "1",
                gameweek: "1",
                fixtures: fixtures.map(f => ({
                    homeTeam: f.homeTeam,
                    awayTeam: f.awayTeam,
                    date: f.date,
                    kickOffTime: f.kickOffTime,
                    homeScore: f.homeScore,
                    awayScore: f.awayScore,
                    status: f.status
                })),
                created_at: new Date(),
                updated_at: new Date()
            };

            await legacyFixturesRef.set(legacyData);
            console.log('✅ Legacy fixtures added successfully!');
            
        } catch (error) {
            console.warn('⚠️ Warning: Could not add legacy fixtures:', error);
        }
    }

    async verifyFixtures() {
        try {
            console.log('🔍 Verifying fixtures were added...');
            
            const clubId = 'default-club';
            const editionId = 'default-edition';
            const gameweekId = 'gw1';
            
            const fixturesDoc = await this.db.collection('clubs').doc(clubId)
                .collection('editions').doc(editionId)
                .collection('fixtures').doc(gameweekId).get();
            
            if (fixturesDoc.exists) {
                const data = fixturesDoc.data();
                console.log('✅ Fixtures found:', data.fixtures.length, 'fixtures');
                data.fixtures.forEach((fixture, index) => {
                    console.log(`   ${index + 1}. ${fixture.homeTeam} vs ${fixture.awayTeam} (${fixture.date} ${fixture.kickOffTime})`);
                });
                return true;
            } else {
                console.log('❌ No fixtures found');
                return false;
            }
        } catch (error) {
            console.error('❌ Error verifying fixtures:', error);
            return false;
        }
    }
}

// Export for use in console
window.SampleFixturesSetup = SampleFixturesSetup;

// Usage instructions - available in console: window.SampleFixturesSetup
