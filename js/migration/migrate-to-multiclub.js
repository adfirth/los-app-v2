// Migration Script: Convert Current Database to Multi-Club Structure
// Run this script in the browser console after Firebase is initialized

class MultiClubMigration {
    constructor() {
        this.db = window.firebaseDB;
        this.sourceClubId = 'default-club'; // ID for your existing data
        this.sourceEditionId = '2024-25'; // Your current edition ID
    }

    async migrateDatabase() {
        console.log('🚀 Starting migration to multi-club structure...');
        
        try {
            // Step 1: Create club info
            await this.createClubInfo();
            
            // Step 2: Create edition structure
            await this.createEditionStructure();
            
            // Step 3: Migrate users
            await this.migrateUsers();
            
            // Step 4: Migrate fixtures
            await this.migrateFixtures();
            
            // Step 5: Migrate picks
            await this.migratePicks();
            
            // Step 6: Migrate settings
            await this.migrateSettings();
            
            // Step 7: Create global settings
            await this.createGlobalSettings();
            
            // Migration completed successfully!
            console.log('📋 Next steps:');
            console.log('1. Update your application code to use new paths');
    
            console.log('3. Remove old collections when ready');
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
        }
    }

    async createClubInfo() {
        console.log('📝 Creating club info...');
        
        const clubInfo = {
            clubId: this.sourceClubId,
            name: 'Default Club',
            description: 'Migrated from existing database',
            logo: null,
            primaryColor: '#1e40af',
            secondaryColor: '#fbbf24',
            contactEmail: 'admin@defaultclub.com',
            website: null,
            isActive: true,
            created_at: new Date(),
            updated_at: new Date()
        };
        
        await this.db.collection('clubs').doc(this.sourceClubId).set(clubInfo);
        // Club info created
    }

    async createEditionStructure() {
        console.log('📝 Creating edition structure...');
        
        const editionData = {
            editionId: this.sourceEditionId,
            name: 'Default Edition - 2024/25',
            description: 'Migrated from existing database',
            competition: 'Default Competition',
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
        
        await this.db.collection('clubs').doc(this.sourceClubId)
            .collection('editions').doc(this.sourceEditionId).set(editionData);
        // Edition structure created
    }

    async migrateUsers() {
        console.log('👥 Migrating users...');
        
        const usersSnapshot = await this.db.collection('users').get();
        let migratedCount = 0;
        
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            
            // Create new user document in club/edition structure
            const newUserData = {
                uid: userData.uid,
                displayName: userData.displayName,
                email: userData.email,
                lives: userData.lives || 2,
                picks: userData.picks || {},
                registeredAt: userData.created_at || new Date(),
                lastPickAt: userData.updated_at || new Date(),
                isActive: true,
                isEliminated: false,
                eliminationGameweek: null,
                finalPosition: null,
                isAdmin: userData.isAdmin || false,
                created_at: userData.created_at || new Date(),
                updated_at: new Date()
            };
            
            await this.db.collection('clubs').doc(this.sourceClubId)
                .collection('editions').doc(this.sourceEditionId)
                .collection('users').doc(userData.uid).set(newUserData);
            
            migratedCount++;
        }
        
        console.log(`✅ Migrated ${migratedCount} users`);
    }

    async migrateFixtures() {
        console.log('⚽ Migrating fixtures...');
        
        const fixturesSnapshot = await this.db.collection('fixtures').get();
        let migratedCount = 0;
        
        for (const fixtureDoc of fixturesSnapshot.docs) {
            const fixtureData = fixtureDoc.data();
            
            // Extract gameweek from document ID (e.g., "edition1_gw1" -> "gw1")
            const gameweekMatch = fixtureDoc.id.match(/gw(\d+)/);
            if (!gameweekMatch) {
                console.log(`⚠️ Skipping fixture ${fixtureDoc.id} - invalid format`);
                continue;
            }
            
            const gameweekId = `gw${gameweekMatch[1]}`;
            
            // Create new fixture document
            const newFixtureData = {
                gameweekId: gameweekId,
                gameweek: parseInt(gameweekMatch[1]),
                fixtures: fixtureData.fixtures || [],
                deadline: fixtureData.deadline || null,
                isLocked: false,
                created_at: fixtureData.created_at || new Date(),
                updated_at: new Date()
            };
            
            await this.db.collection('clubs').doc(this.sourceClubId)
                .collection('editions').doc(this.sourceEditionId)
                .collection('fixtures').doc(gameweekId).set(newFixtureData);
            
            migratedCount++;
        }
        
        console.log(`✅ Migrated ${migratedCount} fixture gameweeks`);
    }

    async migratePicks() {
        console.log('🎯 Migrating picks...');
        
        const picksSnapshot = await this.db.collection('picks').get();
        let migratedCount = 0;
        
        for (const pickDoc of picksSnapshot.docs) {
            const pickData = pickDoc.data();
            
            // Create new pick document
            const newPickData = {
                pickId: pickDoc.id,
                userId: pickData.userId,
                teamPicked: pickData.teamPicked,
                gameweek: pickData.gameweek,
                fixtureId: pickData.fixtureId || null,
                isAutopick: pickData.isAutopick || false,
                result: pickData.result || null,
                livesAfterPick: pickData.livesAfterPick || null,
                savedAt: pickData.savedAt || new Date(),
                processedAt: pickData.processedAt || null,
                created_at: pickData.created_at || new Date(),
                updated_at: new Date()
            };
            
            await this.db.collection('clubs').doc(this.sourceClubId)
                .collection('editions').doc(this.sourceEditionId)
                .collection('picks').doc(pickDoc.id).set(newPickData);
            
            migratedCount++;
        }
        
        console.log(`✅ Migrated ${migratedCount} picks`);
    }

    async migrateSettings() {
        console.log('⚙️ Migrating settings...');
        
        try {
            const settingsDoc = await this.db.collection('settings').doc('current').get();
            
            if (settingsDoc.exists) {
                const settingsData = settingsDoc.data();
                
                const newSettingsData = {
                    currentGameweek: settingsData.currentGameweek || 1,
                    gameweekDeadline: settingsData.gameweekDeadline || '2024-08-10T11:00:00Z',
                    tiebreakEnabled: settingsData.tiebreakEnabled || true,
                    autoPickEnabled: true,
                    autoPickAlgorithm: 'alphabetical',
                    registrationOpen: settingsData.registrationOpen || true,
                    maxLives: 2,
                    totalGameweeks: 10,
                    created_at: new Date(),
                    updated_at: new Date()
                };
                
                await this.db.collection('clubs').doc(this.sourceClubId)
                    .collection('editions').doc(this.sourceEditionId)
                    .collection('settings').doc('current').set(newSettingsData);
                
                console.log('✅ Settings migrated');
            } else {
                console.log('⚠️ No settings found to migrate');
            }
        } catch (error) {
            console.log('⚠️ Error migrating settings:', error);
        }
    }

    async createGlobalSettings() {
        console.log('🌍 Creating global settings...');
        
        const globalSettings = {
            activeClubs: [this.sourceClubId],
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
        console.log('✅ Global settings created');
    }

    // Helper method to verify migration
    async verifyMigration() {
        console.log('🔍 Verifying migration...');
        
        try {
            // Check club info
            const clubDoc = await this.db.collection('clubs').doc(this.sourceClubId).get();
            console.log('✅ Club info exists:', clubDoc.exists);
            
            // Check edition
            const editionDoc = await this.db.collection('clubs').doc(this.sourceClubId)
                .collection('editions').doc(this.sourceEditionId).get();
            console.log('✅ Edition exists:', editionDoc.exists);
            
            // Check users
            const usersSnapshot = await this.db.collection('clubs').doc(this.sourceClubId)
                .collection('editions').doc(this.sourceEditionId)
                .collection('users').get();
            console.log(`✅ Users migrated: ${usersSnapshot.size}`);
            
            // Check fixtures
            const fixturesSnapshot = await this.db.collection('clubs').doc(this.sourceClubId)
                .collection('editions').doc(this.sourceEditionId)
                .collection('fixtures').get();
            console.log(`✅ Fixtures migrated: ${fixturesSnapshot.size}`);
            
            // Check picks
            const picksSnapshot = await this.db.collection('clubs').doc(this.sourceClubId)
                .collection('editions').doc(this.sourceEditionId)
                .collection('picks').get();
            console.log(`✅ Picks migrated: ${picksSnapshot.size}`);
            
            console.log('🎉 Migration verification complete!');
            
        } catch (error) {
            console.error('❌ Verification failed:', error);
        }
    }
}

// Export for use in console
window.MultiClubMigration = MultiClubMigration;

// Usage instructions - available in console: window.MultiClubMigration
