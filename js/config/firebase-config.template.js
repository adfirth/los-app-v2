// Firebase Configuration Template
// Copy this file to firebase-config.js and replace with your actual Firebase project credentials
// IMPORTANT: Never commit the real firebase-config.js file to version control!

const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY_HERE",
    authDomain: "YOUR_FIREBASE_AUTH_DOMAIN_HERE",
    projectId: "YOUR_FIREBASE_PROJECT_ID_HERE",
    storageBucket: "YOUR_FIREBASE_STORAGE_BUCKET_HERE",
    messagingSenderId: "YOUR_FIREBASE_MESSAGING_SENDER_ID_HERE",
    appId: "YOUR_FIREBASE_APP_ID_HERE",
    measurementId: "YOUR_FIREBASE_MEASUREMENT_ID_HERE"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Configure Firestore settings to prevent conflicts
db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
    merge: true
});

// Export for use in other modules immediately
window.firebaseAuth = auth;
window.firebaseDB = db;

// Mark Firebase as ready
window.firebaseReady = false;
window.firebaseInitializationComplete = false;

// Track initialization attempts to prevent multiple attempts
let initializationAttempted = false;
let persistenceAttempted = false;

// Simplified and robust Firebase initialization
const initializeFirebase = () => {
    if (initializationAttempted) {
        console.log('Firebase initialization already attempted, skipping...');
        return;
    }
    
    initializationAttempted = true;
    console.log('Starting Firebase initialization...');
    
    try {
        // Simple, direct initialization without complex cleanup
        initializeFirestore();
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        // Still mark as ready to prevent app from hanging
        markFirebaseReady();
    }
    
    function initializeFirestore() {
        console.log('Initializing Firestore...');
        
        // Enable persistence with error handling
        window.firebaseDB.enablePersistence({
            synchronizeTabs: true
        }).then(() => {
            console.log('✅ Firebase persistence enabled');
            markFirebaseReady();
        }).catch((error) => {
            console.warn('⚠️ Firebase persistence not available:', error.message);
            // Continue without persistence - this is not critical
            markFirebaseReady();
        });
    }
    
    function markFirebaseReady() {
        window.firebaseReady = true;
        window.firebaseInitializationComplete = true;
        console.log('✅ Firebase initialization complete');
        
        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('firebase-ready'));
    }
};

// Auto-initialize Firebase when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
    initializeFirebase();
}

// Export the initialization function for manual control
window.initializeFirebase = initializeFirebase;
