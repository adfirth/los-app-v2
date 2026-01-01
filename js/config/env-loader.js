// Environment Variables Loader
// Loads API keys and configuration using Vite's import.meta.env

class EnvironmentLoader {
    constructor() {
        this.envVars = {};
        this.loaded = false;
    }

    // Load environment variables
    loadEnvironment() {
        try {
            console.log('loading environment variables via Vite...');

            // In Vite, env vars are automatically loaded into import.meta.env
            // We need to map them to our internal structure

            this.envVars = {
                FWP_API_KEY: import.meta.env.VITE_FWP_API_KEY,
                FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
                FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
                FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
                FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
                FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
                FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
                FIREBASE_MEASUREMENT_ID: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
            };

            // Set up Firebase configuration
            this.setupFirebaseConfig();

            this.loaded = true;
            this.setupGlobalConfig();
            console.log('✅ EnvironmentLoader: Configuration loaded successfully');

        } catch (error) {
            console.error('⚠️ EnvironmentLoader: Error loading environment:', error);
        }
    }

    // Set up Firebase configuration
    setupFirebaseConfig() {
        // Create Firebase config object
        window.firebaseConfig = {
            apiKey: this.envVars.FIREBASE_API_KEY,
            authDomain: this.envVars.FIREBASE_AUTH_DOMAIN,
            projectId: this.envVars.FIREBASE_PROJECT_ID,
            storageBucket: this.envVars.FIREBASE_STORAGE_BUCKET,
            messagingSenderId: this.envVars.FIREBASE_MESSAGING_SENDER_ID,
            appId: this.envVars.FIREBASE_APP_ID,
            measurementId: this.envVars.FIREBASE_MEASUREMENT_ID
        };


        // Initialize Firebase
        try {
            if (window.firebase && !window.firebase.apps.length) {
                window.firebase.initializeApp(window.firebaseConfig);
            }

            // Initialize services
            if (window.firebase) {
                window.firebaseDB = window.firebase.firestore();
                window.firebaseAuth = window.firebase.auth();
                window.firebaseReady = true;
                console.log('🔥 Firebase initialized and ready');
            }
        } catch (error) {
            console.error('❌ EnvironmentLoader: Error initializing Firebase:', error);
        }
    }

    // Setup global configuration
    setupGlobalConfig() {
        // Make environment variables globally available
        window.ENV_CONFIG = this.envVars;

        // Set up global API key getters
        window.getEnvVar = (key) => this.envVars[key];
        window.getAPIKey = (service) => {
            switch (service) {
                case 'football-web-pages':
                    return this.envVars.FWP_API_KEY;
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
    }

    // Set up API configuration for compatibility
    setupAPIConfig() {
        // Create APIConfig object that the app expects
        window.APIConfig = {
            rapidAPI: null,
            footballWebPages: {
                key: this.envVars.FWP_API_KEY,
                baseUrl: 'https://api.footballwebpages.co.uk/v2'
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
            BASE_URL: 'https://api.footballwebpages.co.uk/v2',
            API_KEY: this.envVars.FWP_API_KEY,
            LEAGUES: window.APIConfig.competitions
        };
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

// Export as default
export default new EnvironmentLoader();
