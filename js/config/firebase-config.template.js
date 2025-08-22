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

// Enhanced Firebase initialization with better error handling
const initializeFirebase = () => {
    if (initializationAttempted) {
        console.log('Firebase initialization already attempted, skipping...');
        return;
    }
    
    initializationAttempted = true;
    console.log('Starting Firebase initialization...');
    
    // Detect environment (Live Server vs localhost)
    const isLiveServer = window.location.host.includes('127.0.0.1');
    console.log(`Environment detected: ${isLiveServer ? 'Live Server' : 'localhost/other'}`);
    
    // Clear any existing Firebase connections first
    try {
        if (window.firebaseDB) {
            console.log('Clearing existing Firebase connection...');
            
            if (isLiveServer) {
                // More aggressive cleanup for Live Server
                console.log('Applying Live Server specific cleanup...');
                
                // Try to clear existing persistence data
                try {
                    window.firebaseDB.clearPersistence().then(() => {
                        console.log('Firebase persistence cleared');
                        proceedWithConnection();
                    }).catch(() => {
                        console.log('Could not clear persistence, proceeding anyway...');
                        proceedWithConnection();
                    });
                } catch (err) {
                    console.log('Persistence clear not available, proceeding...');
                    proceedWithConnection();
                }
            } else {
                // Standard cleanup for localhost
                window.firebaseDB.disableNetwork().then(() => {
                    console.log('Previous Firebase network disabled');
                    enablePersistenceAndConnect();
                }).catch(() => {
                    // If disabling fails, just proceed
                    enablePersistenceAndConnect();
                });
            }
        } else {
            enablePersistenceAndConnect();
        }
    } catch (error) {
        console.log('Error during Firebase cleanup, proceeding with fresh connection...');
        enablePersistenceAndConnect();
    }
    
    function proceedWithConnection() {
        window.firebaseDB.disableNetwork().then(() => {
            console.log('Network disabled, re-enabling...');
            setTimeout(() => {
                enablePersistenceAndConnect();
            }, 1000);
        }).catch(() => {
            enablePersistenceAndConnect();
        });
    }
    
    function enablePersistenceAndConnect() {
        console.log('Enabling persistence and connecting...');
        
        // Enable offline persistence
        window.firebaseDB.enablePersistence({
            synchronizeTabs: true
        }).then(() => {
            console.log('Firebase persistence enabled successfully');
            window.firebaseDB.enableNetwork().then(() => {
                console.log('Firebase network enabled');
                markFirebaseReady();
            }).catch((error) => {
                console.error('Error enabling Firebase network:', error);
                markFirebaseReady();
            });
        }).catch((error) => {
            console.warn('Firebase persistence not available:', error);
            // Continue without persistence
            window.firebaseDB.enableNetwork().then(() => {
                console.log('Firebase network enabled (without persistence)');
                markFirebaseReady();
            }).catch((error) => {
                console.error('Error enabling Firebase network:', error);
                markFirebaseReady();
            });
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
