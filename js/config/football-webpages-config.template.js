// Football Web Pages API Configuration Template
// Copy this file to football-webpages-config.js and replace with your actual API key
// IMPORTANT: Never commit the real football-webpages-config.js file to version control!

const FOOTBALL_WEBPAGES_CONFIG = {
    BASE_URL: 'https://football-web-pages1.p.rapidapi.com',
    RAPIDAPI_HOST: 'football-web-pages1.p.rapidapi.com',
    
    // API Key will be loaded from multiple sources with fallback
    RAPIDAPI_KEY: 'YOUR_RAPIDAPI_KEY_HERE', // Set via environment variable in production
    
    // League IDs and season mappings
    LEAGUES: {
        'national-league': {
            id: '5',
            name: 'National League',
            description: 'English National League (5th tier)',
            seasons: ['2024-25', '2023-24', '2022-23']
        },
        'premier-league': {
            id: '1',
            name: 'Premier League',
            description: 'English Premier League (1st tier)',
            seasons: ['2024-25', '2023-24', '2022-23']
        },
        'championship': {
            id: '2',
            name: 'EFL Championship',
            description: 'English Championship (2nd tier)',
            seasons: ['2024-25', '2023-24', '2022-23']
        },
        'league-one': {
            id: '3',
            name: 'EFL League One',
            description: 'English League One (3rd tier)',
            seasons: ['2024-25', '2023-24', '2022-23']
        },
        'league-two': {
            id: '4',
            name: 'EFL League Two',
            description: 'English League Two (4th tier)',
            seasons: ['2024-25', '2023-24', '2022-23']
        },
        'fa-cup': {
            id: '6',
            name: 'FA Cup',
            description: 'FA Cup competition',
            seasons: ['2024-25', '2023-24', '2022-23']
        },
        'carabao-cup': {
            id: '7',
            name: 'Carabao Cup',
            description: 'Carabao Cup (EFL Cup)',
            seasons: ['2024-25', '2023-24', '2022-23']
        }
    },
    
    // Default seasons
    DEFAULT_SEASONS: ['2024-25', '2023-24', '2022-23'],
    
    // API endpoints
    ENDPOINTS: {
        FIXTURES_RESULTS: 'fixtures-results.json',
        FIXTURES: 'fixtures.json',
        MATCHES: 'matches.json',
        VIDIPRINTER: 'vidiprinter.json'
    },
    
    // Retry configuration
    RETRY_CONFIG: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000
    }
};

// Configuration loading with multiple fallback strategies
function loadFootballWebPagesConfig() {
    // Priority order for configuration loading:
    // 1. window.FOOTBALL_WEBPAGES_CONFIG.RAPIDAPI_KEY
    // 2. window.ENV_CONFIG.RAPIDAPI_KEY  
    // 3. window.RAPIDAPI_KEY
    // 4. window.footballWebPagesAPI.config.RAPIDAPI_KEY
    // 5. window.apiManager.footballWebPagesAPI.config.RAPIDAPI_KEY
    // 6. Global FOOTBALL_WEBPAGES_CONFIG variable
    
    let apiKey = null;
    
    // Try multiple sources for API key
    if (window.FOOTBALL_WEBPAGES_CONFIG && window.FOOTBALL_WEBPAGES_CONFIG.RAPIDAPI_KEY) {
        apiKey = window.FOOTBALL_WEBPAGES_CONFIG.RAPIDAPI_KEY;
    } else if (window.ENV_CONFIG && window.ENV_CONFIG.RAPIDAPI_KEY) {
        apiKey = window.ENV_CONFIG.RAPIDAPI_KEY;
    } else if (window.RAPIDAPI_KEY) {
        apiKey = window.RAPIDAPI_KEY;
    } else if (window.footballWebPagesAPI && window.footballWebPagesAPI.config && window.footballWebPagesAPI.config.RAPIDAPI_KEY) {
        apiKey = window.footballWebPagesAPI.config.RAPIDAPI_KEY;
    } else if (window.apiManager && window.apiManager.footballWebPagesAPI && window.apiManager.footballWebPagesAPI.config && window.apiManager.footballWebPagesAPI.config.RAPIDAPI_KEY) {
        apiKey = window.apiManager.footballWebPagesAPI.config.RAPIDAPI_KEY;
    } else if (window.APIConfig && window.APIConfig.rapidAPI && window.APIConfig.rapidAPI.key) {
        apiKey = window.APIConfig.rapidAPI.key;
    }
    
    // Update the config with the found API key
    if (apiKey) {
        FOOTBALL_WEBPAGES_CONFIG.RAPIDAPI_KEY = apiKey;
    }
    
    console.log('🔑 API Key configured:', apiKey ? 'Yes' : 'No');
    
    return FOOTBALL_WEBPAGES_CONFIG;
}

// Load configuration immediately
const config = loadFootballWebPagesConfig();

// Export for use in other modules
window.FOOTBALL_WEBPAGES_CONFIG = config;
