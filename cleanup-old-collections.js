/**
 * Firebase Database Cleanup Script
 * Removes old collections that are no longer needed after migrating to multi-club structure
 */

class FirebaseCleanup {
    constructor() {
        this.db = null;
        this.collectionsToDelete = [
            'users',           // Old users collection
            'picks',           // Old picks collection  
            'editions',        // Old editions collection
            'fixtures',        // Old fixtures collection
            'scores'           // Old scores collection
        ];
        
        // Wait for Firebase to be ready
        this.waitForFirebase();
    }
    
    async waitForFirebase() {
        let attempts = 0;
        const maxAttempts = 30; // Wait up to 30 seconds
        
        while (!window.firebaseDB && attempts < maxAttempts) {
            console.log(`⏳ Waiting for Firebase to be ready... (attempt ${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        
        if (!window.firebaseDB) {
            console.error('❌ Firebase database not available after 30 seconds');
            return false;
        }
        
        this.db = window.firebaseDB;
        console.log('✅ Firebase cleanup script ready, database reference set');
        return true;
    }
    
    isReady() {
        return this.db !== null;
    }

    async cleanupOldCollections() {
        if (!this.db) {
            console.log('⏳ Waiting for Firebase to be ready...');
            await this.waitForFirebase();
        }

        console.log('🧹 Starting Firebase cleanup...');
        console.log('🗑️ Collections to delete:', this.collectionsToDelete);

        for (const collectionName of this.collectionsToDelete) {
            try {
                console.log(`🧹 Cleaning up collection: ${collectionName}`);
                
                // Get all documents in the collection
                const snapshot = await this.db.collection(collectionName).get();
                
                if (snapshot.empty) {
                    console.log(`✅ Collection ${collectionName} is already empty`);
                    continue;
                }

                console.log(`📄 Found ${snapshot.size} documents in ${collectionName}`);

                // Delete all documents in the collection
                const batch = this.db.batch();
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });

                await batch.commit();
                console.log(`✅ Deleted ${snapshot.size} documents from ${collectionName}`);

            } catch (error) {
                console.error(`❌ Error cleaning up ${collectionName}:`, error);
            }
        }

        console.log('🎉 Firebase cleanup completed!');
    }

    async verifyCleanup() {
        if (!this.db) {
            console.log('⏳ Waiting for Firebase to be ready...');
            await this.waitForFirebase();
        }
        
        console.log('🔍 Verifying cleanup...');
        
        for (const collectionName of this.collectionsToDelete) {
            try {
                const snapshot = await this.db.collection(collectionName).limit(1).get();
                if (snapshot.empty) {
                    console.log(`✅ ${collectionName}: Empty`);
                } else {
                    console.log(`⚠️ ${collectionName}: Still has ${snapshot.size} documents`);
                }
            } catch (error) {
                console.log(`❌ ${collectionName}: Error checking - ${error.message}`);
            }
        }
    }

    async showCurrentStructure() {
        if (!this.db) {
            console.log('⏳ Waiting for Firebase to be ready...');
            await this.waitForFirebase();
        }
        
        console.log('🏗️ Current database structure:');
        
        try {
            // Check clubs collection
            const clubsSnapshot = await this.db.collection('clubs').get();
            console.log(`📁 clubs: ${clubsSnapshot.size} clubs`);
            
            // Check each club's structure
            for (const clubDoc of clubsSnapshot.docs) {
                const clubData = clubDoc.data();
                console.log(`  🏟️ ${clubData.name || clubDoc.id}:`);
                
                // Check editions
                const editionsSnapshot = await clubDoc.ref.collection('editions').get();
                console.log(`    📚 editions: ${editionsSnapshot.size} editions`);
                
                // Check each edition's structure
                for (const editionDoc of editionsSnapshot.docs) {
                    const editionData = editionDoc.data();
                    console.log(`      📖 ${editionData.name || editionDoc.id}:`);
                    
                    // Check subcollections
                    const usersSnapshot = await editionDoc.ref.collection('users').get();
                    const fixturesSnapshot = await editionDoc.ref.collection('fixtures').get();
                    const picksSnapshot = await editionDoc.ref.collection('picks').get();
                    
                    console.log(`        👥 users: ${usersSnapshot.size}`);
                    console.log(`        ⚽ fixtures: ${fixturesSnapshot.size}`);
                    console.log(`        🎯 picks: ${picksSnapshot.size}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error checking current structure:', error);
        }
    }
}

// Initialize cleanup when script loads
console.log('🧹 Firebase Cleanup Script starting...');

// Try to initialize immediately
function initializeCleanup() {
    console.log('🚀 Initializing Firebase cleanup...');
    window.firebaseCleanup = new FirebaseCleanup();
    
    // Add global helper functions
    window.cleanupFirebase = async () => {
        console.log('🧹 Starting Firebase cleanup...');
        await window.firebaseCleanup.cleanupOldCollections();
    };
    
    window.verifyFirebaseCleanup = async () => {
        console.log('🔍 Verifying Firebase cleanup...');
        await window.firebaseCleanup.verifyCleanup();
    };
    
    window.showFirebaseStructure = async () => {
        console.log('🏗️ Showing Firebase structure...');
        await window.firebaseCleanup.showCurrentStructure();
    };
    
    window.isCleanupReady = () => {
        return window.firebaseCleanup && window.firebaseCleanup.isReady();
    };
    
    // Manual initialization function
    window.manualInitCleanup = () => {
        console.log('🔧 Manually initializing cleanup...');
        if (!window.firebaseCleanup) {
            initializeCleanup();
        } else {
            console.log('✅ Cleanup already initialized');
        }
    };
    
    console.log('🧹 Firebase Cleanup Script Loaded!');
    console.log('Available functions:');
    console.log('- cleanupFirebase() - Delete old collections');
    console.log('- verifyFirebaseCleanup() - Check cleanup status');
    console.log('- showFirebaseStructure() - Show current structure');
    console.log('- isCleanupReady() - Check if cleanup is ready');
    console.log('- manualInitCleanup() - Manually initialize cleanup');
    console.log('');
    console.log('⚠️  WARNING: This will permanently delete data!');
    console.log('💡 Run cleanupFirebase() to start the cleanup process');
}

// Try to initialize immediately if possible
if (window.losApp && window.losApp.managers && window.losApp.managers.club && window.losApp.managers.club.isReady) {
    console.log('✅ App already ready, initializing cleanup immediately...');
    initializeCleanup();
} else {
    console.log('⏳ App not ready yet, will initialize when ready...');
    
    // Wait for the app to be ready
    const waitForApp = () => {
        if (window.losApp && window.losApp.managers && window.losApp.managers.club && window.losApp.managers.club.isReady) {
            console.log('✅ App is ready, initializing cleanup...');
            initializeCleanup();
        } else {
            console.log('⏳ App not ready yet, waiting...');
            setTimeout(waitForApp, 1000);
        }
    };
    
    // Start waiting
    setTimeout(waitForApp, 1000);
    
    // Fallback: Initialize after a delay if app still not ready
    setTimeout(() => {
        if (!window.firebaseCleanup) {
            console.log('⚠️ App not ready after timeout, initializing cleanup anyway...');
            initializeCleanup();
        }
    }, 10000); // 10 second fallback
}

// Also try DOM ready as backup
document.addEventListener('DOMContentLoaded', () => {
    console.log('🧹 Firebase Cleanup Script DOM loaded...');
    if (!window.firebaseCleanup) {
        console.log('🔧 DOM ready but cleanup not initialized, trying to initialize...');
        initializeCleanup();
    }
});
