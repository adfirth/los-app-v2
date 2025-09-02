// Environment Variables Loader
// Loads API keys and configuration from .env file

class EnvironmentLoader {
    constructor() {
        this.envVars = {};
        this.loaded = false;
    }

    // Load environment variables from .env file or Netlify
    async loadEnvironment() {
        try {
            // Loading environment variables...
            
            // Check if we're in Netlify (production)
            if (window.location.hostname.includes('netlify.app')) {
                // Netlify environment detected
                this.loadNetlifyEnvironment();
            } else {
                console.log('🏠 EnvironmentLoader: Local environment detected');
                // Try to fetch the .env file
                const response = await fetch('/.env');
                if (response.ok) {
                    const envContent = await response.text();
                    this.parseEnvFile(envContent);
                    console.log('✅ EnvironmentLoader: .env file loaded successfully');
                } else {
                    console.log('⚠️ EnvironmentLoader: .env file not found, using fallbacks');
                    this.loadFallbacks();
                }
            }
        } catch (error) {
            console.log('⚠️ EnvironmentLoader: Error loading environment, using fallbacks');
            this.loadFallbacks();
        }
        
        this.loaded = true;
        this.setupGlobalConfig();
    }

    // Load environment variables from Netlify
    loadNetlifyEnvironment() {
                        // Loading from Netlify environment...
        
        // In Netlify, environment variables are available to serverless functions
        // We'll use the Netlify functions to access them
        this.envVars = {
            RAPIDAPI_KEY: 'NETLIFY_ENV_AVAILABLE',
            FIREBASE_API_KEY: 'NETLIFY_ENV_AVAILABLE',
            FIREBASE_AUTH_DOMAIN: 'NETLIFY_ENV_AVAILABLE',
            FIREBASE_PROJECT_ID: 'NETLIFY_ENV_AVAILABLE',
            FIREBASE_STORAGE_BUCKET: 'NETLIFY_ENV_AVAILABLE',
            FIREBASE_MESSAGING_SENDER_ID: 'NETLIFY_ENV_AVAILABLE',
            FIREBASE_APP_ID: 'NETLIFY_ENV_AVAILABLE'
        };
        
        // Set up Firebase configuration for Netlify
        this.setupFirebaseConfig();
        
        // Netlify environment loaded
    }

    // Set up Firebase configuration
    setupFirebaseConfig() {
                        // Setting up Firebase configuration...
        
        // Create Firebase config object
        window.firebaseConfig = {
            apiKey: "AIzaSyDY8IEnfnM-WQFK4NSKFeWN_9k8F_lNuVA",
            authDomain: "los-v2-1af09.firebaseapp.com",
            projectId: "los-v2-1af09",
            storageBucket: "los-v2-1af09.firebasestorage.app",
            messagingSenderId: "483748995629",
            appId: "1:483748995629:web:df5ca2ff9715658f678ea4",
            measurementId: "G-FFR18MKG3K"
        };
        
        // Initialize Firebase
        try {
            if (window.firebase && !window.firebase.apps.length) {
                window.firebase.initializeApp(window.firebaseConfig);
                // Firebase initialized successfully
            } else if (window.firebase && window.firebase.apps.length) {
                // Firebase already initialized
            } else {
                // Firebase SDK not loaded yet
            }
        } catch (error) {
            console.error('❌ EnvironmentLoader: Error initializing Firebase:', error);
        }
    }

    // Parse .env file content
    parseEnvFile(content) {
        const lines = content.split('\n');
        
        lines.forEach(line => {
            line = line.trim();
            
            // Skip comments and empty lines
            if (line.startsWith('#') || line === '') return;
            
            // Parse KEY=value format
            const equalIndex = line.indexOf('=');
            if (equalIndex > 0) {
                const key = line.substring(0, equalIndex).trim();
                const value = line.substring(equalIndex + 1).trim();
                
                // Remove quotes if present
                const cleanValue = value.replace(/^["']|["']$/g, '');
                
                this.envVars[key] = cleanValue;
                console.log(`🔑 EnvironmentLoader: Loaded ${key}`);
            }
        });
    }

    // Load fallback values from existing config
    loadFallbacks() {
        console.log('🔄 EnvironmentLoader: Loading fallback configuration...');
        
        // Try to get values from existing config files
        if (window.APIConfig && window.APIConfig.rapidAPI) {
            this.envVars.RAPIDAPI_KEY = window.APIConfig.rapidAPI.key;
        }
        
        if (window.FOOTBALL_WEBPAGES_CONFIG && window.FOOTBALL_WEBPAGES_CONFIG.RAPIDAPI_KEY) {
            this.envVars.RAPIDAPI_KEY = window.FOOTBALL_WEBPAGES_CONFIG.RAPIDAPI_KEY;
        }
        
        // Set up Firebase configuration for local development
        this.setupFirebaseConfig();
    }

    // Setup global configuration
    setupGlobalConfig() {
        // Make environment variables globally available
        window.ENV_CONFIG = this.envVars;
        
        // Set up global API key getters
        window.getEnvVar = (key) => this.envVars[key];
        window.getAPIKey = (service) => {
            switch(service) {
                case 'rapidapi':
                    return this.envVars.RAPIDAPI_KEY;
                case 'firebase':
                    return this.envVars.FIREBASE_API_KEY;
                case 'football-data':
                    return this.envVars.FOOTBALL_DATA_API_KEY;
                default:
                    return null;
            }
        };
        
        // Set up API configuration for compatibility
        this.setupAPIConfig();
        
        // Wait for Firebase SDK and initialize
        this.waitForFirebaseAndInit();
        
        // Global configuration setup complete
    }

    // Wait for Firebase SDK to load and then initialize
    waitForFirebaseAndInit() {
        // Waiting for Firebase SDK...
        
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait time
        
        const checkFirebaseSDK = () => {
            attempts++;
            
            if (window.firebase) {
                // Firebase SDK loaded, initializing...
                this.initializeFirebase();
            } else if (attempts >= maxAttempts) {
                console.warn('⚠️ EnvironmentLoader: Firebase SDK not loaded after 5 seconds, proceeding without Firebase');
                // Set up API configuration even without Firebase
                this.setupAPIConfig();
                window.FIREBASE_READY = false;
            } else {
                // Firebase SDK not ready, retrying...
                setTimeout(checkFirebaseSDK, 100);
            }
        };
        
        checkFirebaseSDK();
    }

    // Initialize Firebase when SDK is ready
    initializeFirebase() {
        try {
            if (!window.firebase.apps.length) {
                window.firebase.initializeApp(window.firebaseConfig);
                // Firebase initialized successfully
                
                // Set up Firebase database reference
                this.setupFirebaseDatabase();
                
                // Set a flag that the app can check
                window.FIREBASE_READY = true;
                
                // Dispatch custom event for other parts of the app
                window.dispatchEvent(new CustomEvent('firebase-ready'));
            } else {
                // Firebase already initialized
                
                // Set up Firebase database reference
                this.setupFirebaseDatabase();
                
                window.FIREBASE_READY = true;
                window.dispatchEvent(new CustomEvent('firebase-ready'));
            }
        } catch (error) {
            console.error('❌ EnvironmentLoader: Error initializing Firebase:', error);
        }
    }

    // Set up Firebase database reference
    setupFirebaseDatabase() {
        try {
            // Set up Firestore database reference
            window.firebaseDB = window.firebase.firestore();
            // Firebase database reference set up
            
            // Set up Firebase Auth reference
            window.firebaseAuth = window.firebase.auth();
            // Firebase auth reference set up
            
            // Also set the legacy flag for compatibility
            window.firebaseReady = true;
            
        } catch (error) {
            console.error('❌ EnvironmentLoader: Error setting up Firebase database:', error);
        }
    }

    // Set up API configuration for compatibility
    setupAPIConfig() {
        // Setting up API configuration...
        
        // Create APIConfig object that the app expects
        window.APIConfig = {
            rapidAPI: {
                key: '2e08ed83camsh44dc27a6c439f8dp1c388ajsn65cd74585fef',
                host: 'football-web-pages1.p.rapidapi.com',
                baseUrl: 'https://football-web-pages1.p.rapidapi.com'
            },
            competitions: {
                'national-league': { 
                    id: '5', 
                    name: 'National League', 
                    description: 'English National League (5th tier)' 
                },
                'premier-league': { 
                    id: '1', 
                    name: 'Premier League', 
                    description: 'English Premier League (1st tier)' 
                },
                'championship': { 
                    id: '2', 
                    name: 'EFL Championship', 
                    description: 'English Championship (2nd tier)' 
                },
                'league-one': { 
                    id: '3', 
                    name: 'EFL League One', 
                    description: 'English League One (3rd tier)' 
                },
                'league-two': { 
                    id: '4', 
                    name: 'EFL League Two', 
                    description: 'English League Two (4th tier)' 
                }
            }
        };
        
        // Create FOOTBALL_WEBPAGES_CONFIG object
        window.FOOTBALL_WEBPAGES_CONFIG = {
            BASE_URL: 'https://football-web-pages1.p.rapidapi.com',
            RAPIDAPI_HOST: 'football-web-pages1.p.rapidapi.com',
            RAPIDAPI_KEY: '2e08ed83camsh44dc27a6c439f8dp1c388ajsn65cd74585fef',
            LEAGUES: {
                'national-league': { id: '5', name: 'National League' },
                'premier-league': { id: '1', name: 'Premier League' },
                'championship': { id: '2', name: 'EFL Championship' },
                'league-one': { id: '3', name: 'EFL League One' },
                'league-two': { id: '4', name: 'EFL League Two' }
            }
        };
        
        // API configuration set up
    }

    // Get environment variable
    get(key) {
        return this.envVars[key];
    }

    // Check if environment is loaded
    isLoaded() {
        return this.loaded;
    }
}

// Create and export the environment loader
window.environmentLoader = new EnvironmentLoader();

// Auto-load environment when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.environmentLoader.loadEnvironment();
    });
} else {
    window.environmentLoader.loadEnvironment();
}

// Export for use in other modules
window.EnvironmentLoader = EnvironmentLoader;
