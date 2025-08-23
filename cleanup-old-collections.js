/**
 * Firebase Database Cleanup Script
 * Removes old collections that are no longer needed after migrating to multi-club structure
 */

class FirebaseCleanup {
    constructor() {
        this.db = window.firebaseDB;
        this.collectionsToDelete = [
            'users',           // Old users collection
            'picks',           // Old picks collection  
            'editions',        // Old editions collection
            'fixtures',        // Old fixtures collection
            'scores'           // Old scores collection
        ];
    }

    async cleanupOldCollections() {
        if (!this.db) {
            console.error('❌ Firebase database not available');
            return;
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
document.addEventListener('DOMContentLoaded', () => {
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
    
    console.log('🧹 Firebase Cleanup Script Loaded!');
    console.log('Available functions:');
    console.log('- cleanupFirebase() - Delete old collections');
    console.log('- verifyFirebaseCleanup() - Check cleanup status');
    console.log('- showFirebaseStructure() - Show current structure');
    console.log('');
    console.log('⚠️  WARNING: This will permanently delete data!');
    console.log('💡 Run cleanupFirebase() to start the cleanup process');
});
