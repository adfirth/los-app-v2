// Sample Club Setup Script
// Creates the club structure for Altrincham FC Juniors and Timperley FC

class SampleClubSetup {
    constructor() {
        this.db = window.firebaseDB;
    }

    async setupSampleClubs() {
        console.log('🏟️ Setting up sample clubs...');
        
        try {
            // Setup Altrincham FC Juniors
            await this.setupAltrinchamFCJuniors();
            
            // Setup Timperley FC
            await this.setupTimperleyFC();
            
            // Setup Default Club
            await this.setupDefaultClub();
            
            // Update global settings
            await this.updateGlobalSettings();
            
            console.log('✅ Sample clubs setup completed!');
            console.log('📋 Created clubs:');
            console.log('- Altrincham FC Juniors (4 editions for 25/26 National League)');
            console.log('- Timperley FC (3 editions for 25/26 Premier League)');
            
        } catch (error) {
            console.error('❌ Sample club setup failed:', error);
        }
    }

    async setupAltrinchamFCJuniors() {
        console.log('🔵 Setting up Altrincham FC Juniors...');
        
        const clubId = 'altrincham-fc-juniors';
        
        // Create club info
        const clubInfo = {
            clubId: clubId,
            name: 'Altrincham FC Juniors',
            description: 'Junior football club based in Altrincham, running Last One Standing fundraisers',
            logo: null, // Add logo URL when available
            primaryColor: '#dc2626', // Red (Altrincham red)
            secondaryColor: '#991b1b', // Dark red
            headerStyle: 'altrincham', // This controls the header styling
            contactEmail: 'admin@altrinchamfcjuniors.com',
            website: 'https://altrinchamfcjuniors.com',
            isActive: true,
            created_at: new Date(),
            updated_at: new Date()
        };
        
        await this.db.collection('clubs').doc(clubId).set(clubInfo);
        
        // Create 4 editions for the 25/26 National League season
        const editions = [
            {
                editionId: '2025-26-national-league-1',
                name: 'Altrincham FC Juniors LOS - National League Edition 1',
                description: 'First edition of the 2025/26 National League season',
                competition: 'National League',
                season: '2025-26',
                editionNumber: 1,
                totalEditions: 4,
                startDate: '2025-08-01',
                endDate: '2025-10-15',
                maxLives: 2,
                totalGameweeks: 10,
                currentGameweek: 1,
                registrationOpen: true,
                isActive: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                editionId: '2025-26-national-league-2',
                name: 'Altrincham FC Juniors LOS - National League Edition 2',
                description: 'Second edition of the 2025/26 National League season',
                competition: 'National League',
                season: '2025-26',
                editionNumber: 2,
                totalEditions: 4,
                startDate: '2025-10-16',
                endDate: '2025-12-31',
                maxLives: 2,
                totalGameweeks: 10,
                currentGameweek: 1,
                registrationOpen: false,
                isActive: false,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                editionId: '2025-26-national-league-3',
                name: 'Altrincham FC Juniors LOS - National League Edition 3',
                description: 'Third edition of the 2025/26 National League season',
                competition: 'National League',
                season: '2025-26',
                editionNumber: 3,
                totalEditions: 4,
                startDate: '2026-01-01',
                endDate: '2026-03-15',
                maxLives: 2,
                totalGameweeks: 10,
                currentGameweek: 1,
                registrationOpen: false,
                isActive: false,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                editionId: '2025-26-national-league-4',
                name: 'Altrincham FC Juniors LOS - National League Edition 4',
                description: 'Fourth edition of the 2025/26 National League season',
                competition: 'National League',
                season: '2025-26',
                editionNumber: 4,
                totalEditions: 4,
                startDate: '2026-03-16',
                endDate: '2026-05-31',
                maxLives: 2,
                totalGameweeks: 10,
                currentGameweek: 1,
                registrationOpen: false,
                isActive: false,
                created_at: new Date(),
                updated_at: new Date()
            }
        ];
        
        for (const edition of editions) {
            await this.db.collection('clubs').doc(clubId)
                .collection('editions').doc(edition.editionId).set(edition);
            
            // Create default settings for each edition
            await this.createDefaultEditionSettings(clubId, edition.editionId);
        }
        
        console.log('✅ Altrincham FC Juniors setup completed');
    }

    async setupTimperleyFC() {
        console.log('🔴 Setting up Timperley FC...');
        
        const clubId = 'timperley-fc';
        
        // Create club info
        const clubInfo = {
            clubId: clubId,
            name: 'Timperley FC',
            description: 'Football club based in Timperley, running Premier League focused LOS fundraisers',
            logo: null, // Add logo URL when available
            primaryColor: '#1e40af', // Blue (Timperley blue)
            secondaryColor: '#1e3a8a', // Dark blue
            headerStyle: 'timperley', // This controls the header styling
            contactEmail: 'admin@timperleyfc.com',
            website: 'https://timperleyfc.com',
            isActive: true,
            created_at: new Date(),
            updated_at: new Date()
        };
        
        await this.db.collection('clubs').doc(clubId).set(clubInfo);
        
        // Create 3 editions for the 25/26 Premier League season
        const editions = [
            {
                editionId: '2025-26-premier-league-1',
                name: 'Timperley FC LOS - Premier League Edition 1',
                description: 'First edition of the 2025/26 Premier League season',
                competition: 'Premier League',
                season: '2025-26',
                editionNumber: 1,
                totalEditions: 3,
                startDate: '2025-08-01',
                endDate: '2025-11-15',
                maxLives: 2,
                totalGameweeks: 10,
                currentGameweek: 1,
                registrationOpen: true,
                isActive: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                editionId: '2025-26-premier-league-2',
                name: 'Timperley FC LOS - Premier League Edition 2',
                description: 'Second edition of the 2025/26 Premier League season',
                competition: 'Premier League',
                season: '2025-26',
                editionNumber: 2,
                totalEditions: 3,
                startDate: '2025-11-16',
                endDate: '2026-02-28',
                maxLives: 2,
                totalGameweeks: 10,
                currentGameweek: 1,
                registrationOpen: false,
                isActive: false,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                editionId: '2025-26-premier-league-3',
                name: 'Timperley FC LOS - Premier League Edition 3',
                description: 'Third edition of the 2025/26 Premier League season',
                competition: 'Premier League',
                season: '2025-26',
                editionNumber: 3,
                totalEditions: 3,
                startDate: '2026-03-01',
                endDate: '2026-05-31',
                maxLives: 2,
                totalGameweeks: 10,
                currentGameweek: 1,
                registrationOpen: false,
                isActive: false,
                created_at: new Date(),
                updated_at: new Date()
            }
        ];
        
        for (const edition of editions) {
            await this.db.collection('clubs').doc(clubId)
                .collection('editions').doc(edition.editionId).set(edition);
            
            // Create default settings for each edition
            await this.createDefaultEditionSettings(clubId, edition.editionId);
        }
        
        console.log('✅ Timperley FC setup completed');
    }

    async setupDefaultClub() {
        console.log('🟢 Setting up Default Club...');
        
        const clubId = 'default-club';
        
        // Create club info
        const clubInfo = {
            clubId: clubId,
            name: 'Default Club',
            description: 'Migrated from existing database',
            logo: null,
            primaryColor: '#059669', // Green
            secondaryColor: '#047857', // Dark green
            headerStyle: 'default', // This controls the header styling
            contactEmail: 'admin@defaultclub.com',
            website: 'https://defaultclub.com',
            isActive: true,
            created_at: new Date(),
            updated_at: new Date()
        };
        
        await this.db.collection('clubs').doc(clubId).set(clubInfo);
        
        // Create a default edition
        const defaultEdition = {
            editionId: 'default-edition',
            name: 'Default Edition',
            description: 'Default edition for existing data',
            competition: 'Default',
            season: '2024-25',
            editionNumber: 1,
            totalEditions: 1,
            startDate: '2024-08-01',
            endDate: '2025-05-01',
            maxLives: 2,
            totalGameweeks: 10,
            currentGameweek: 1,
            registrationOpen: true,
            isActive: true,
            created_at: new Date(),
            updated_at: new Date()
        };
        
        await this.db.collection('clubs').doc(clubId)
            .collection('editions').doc(defaultEdition.editionId).set(defaultEdition);
        
        // Create default settings for the edition
        await this.createDefaultEditionSettings(clubId, defaultEdition.editionId);
        
        console.log('✅ Default Club setup completed');
    }

    async createDefaultEditionSettings(clubId, editionId) {
        const settings = {
            currentGameweek: 1,
            gameweekDeadline: '2025-08-15T14:30:00Z',
            tiebreakEnabled: true,
            autoPickEnabled: true,
            autoPickAlgorithm: 'alphabetical',
            registrationOpen: false, // Will be set based on edition
            maxLives: 2,
            totalGameweeks: 10,
            created_at: new Date(),
            updated_at: new Date()
        };
        
        await this.db.collection('clubs').doc(clubId)
            .collection('editions').doc(editionId)
            .collection('settings').doc('current').set(settings);
    }

    async updateGlobalSettings() {
        console.log('🌍 Updating global settings...');
        
        const globalSettings = {
            activeClubs: ['altrincham-fc-juniors', 'timperley-fc', 'default-club'],
            defaultSettings: {
                maxLives: 2,
                totalGameweeks: 10,
                autoPickEnabled: true
            },
            systemConfig: {
                maintenanceMode: false,
                version: '2.0.0'
            },
            created_at: new Date(),
            updated_at: new Date()
        };
        
        await this.db.collection('global-settings').doc('system').set(globalSettings);
        console.log('✅ Global settings updated');
    }

    // Helper method to verify club setup
    async verifyClubSetup() {
        console.log('🔍 Verifying club setup...');
        
        try {
            // Check Altrincham FC Juniors
            const altrinchamClub = await this.db.collection('clubs').doc('altrincham-fc-juniors').get();
            console.log('✅ Altrincham FC Juniors exists:', altrinchamClub.exists);
            
            if (altrinchamClub.exists) {
                const altrinchamEditions = await this.db.collection('clubs').doc('altrincham-fc-juniors')
                    .collection('editions').get();
                console.log(`✅ Altrincham editions: ${altrinchamEditions.size}`);
            }
            
            // Check Timperley FC
            const timperleyClub = await this.db.collection('clubs').doc('timperley-fc').get();
            console.log('✅ Timperley FC exists:', timperleyClub.exists);
            
            if (timperleyClub.exists) {
                const timperleyEditions = await this.db.collection('clubs').doc('timperley-fc')
                    .collection('editions').get();
                console.log(`✅ Timperley editions: ${timperleyEditions.size}`);
            }
            
            // Check Default Club
            const defaultClub = await this.db.collection('clubs').doc('default-club').get();
            console.log('✅ Default Club exists:', defaultClub.exists);
            
            if (defaultClub.exists) {
                const defaultEditions = await this.db.collection('clubs').doc('default-club')
                    .collection('editions').get();
                console.log(`✅ Default Club editions: ${defaultEditions.size}`);
            }
            
            // Check global settings
            const globalSettings = await this.db.collection('global-settings').doc('system').get();
            console.log('✅ Global settings exist:', globalSettings.exists);
            
            console.log('🎉 Club setup verification complete!');
            
        } catch (error) {
            console.error('❌ Verification failed:', error);
        }
    }
}

// Export for use in console
window.SampleClubSetup = SampleClubSetup;

// Usage instructions - available in console: window.SampleClubSetup
