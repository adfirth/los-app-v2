/**
 * TeamBadgeService - Centralized service for managing team badges across the application
 * Integrates with TheSportsDB API to provide team crests for all team displays
 */

class TeamBadgeService {
    constructor() {
        this.badgeCache = new Map(); // Cache badges to avoid repeated API calls
        this.netlifyFunctionUrl = '/.netlify/functions/fetch-team-badge';
        this.directApiUrl = 'https://www.thesportsdb.com/api/v1/json/123';
        this.isInitialized = false;
        this.initializationPromise = null;
        this.isLocalDevelopment = window.location.hostname === '127.0.0.1' || 
                                 window.location.hostname === 'localhost' || 
                                 window.location.hostname === '192.168.1.1';
        
        // Listen for API toggle changes
        this.setupAPIToggleListener();
    }

    async isAPIEnabled() {
        try {
            // Check global settings for API enablement
            if (window.losApp?.managers?.superAdmin?.db) {
                const globalSettings = await window.losApp.managers.superAdmin.db
                    .collection('global-settings').doc('system').get();
                if (globalSettings.exists) {
                    const data = globalSettings.data();
                    return data.apiRequestsEnabled !== false; // Default to true if not set
                }
            }
            
            // Fallback: check if we can access the global settings through window
            if (window.firebaseDB && typeof window.firebaseDB.collection === 'function') {
                const globalSettings = await window.firebaseDB
                    .collection('global-settings').doc('system').get();
                if (globalSettings.exists) {
                    const data = globalSettings.data();
                    return data.apiRequestsEnabled !== false;
                }
            }
            
            // Default to enabled if we can't check
            console.log('⚠️ TeamBadgeService: Could not check global API settings, defaulting to enabled');
            return true;
            
        } catch (error) {
            console.error('❌ TeamBadgeService: Error checking API enablement:', error);
            // Default to enabled on error
            return true;
        }
    }

    setupAPIToggleListener() {
        // Listen for API toggle changes from superadmin
        window.addEventListener('apiToggleChanged', (event) => {
            const { enabled } = event.detail;
            console.log(`🔌 TeamBadgeService: API toggle changed to: ${enabled}`);
            
            if (!enabled) {
                // Clear any pending requests or show a message
                console.log('🔌 TeamBadgeService: API requests are now disabled');
            } else {
                console.log('🔌 TeamBadgeService: API requests are now enabled');
            }
        });
    }

    /**
     * Initialize the service
     */
    async initialize() {
        if (this.isInitialized) {
            return this;
        }

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._initialize();
        return this.initializationPromise;
    }

    async _initialize() {
        try {
            // Initializing...
            
            // Test API connection
            await this.testConnection();
            
            this.isInitialized = true;
            // Initialized successfully
            
            return this;
        } catch (error) {
            console.error('❌ TeamBadgeService: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Test the API connection
     */
    async testConnection() {
        try {
            // Check if API requests are enabled globally
            if (!(await this.isAPIEnabled())) {
                console.log('🔌 TeamBadgeService: API requests are disabled globally, skipping connection test');
                return false;
            }
            
            if (this.isLocalDevelopment) {
                // Use direct API for local development
                const response = await fetch(`${this.directApiUrl}/searchteams.php?t=Arsenal`);
                if (!response.ok) {
                    throw new Error(`Direct API test failed: ${response.status}`);
                }
                const data = await response.json();
                if (data.teams && data.teams.length > 0) {
                    console.log('🏆 TeamBadgeService: Direct API connection test successful');
                    return true;
                } else {
                    throw new Error('Direct API test failed: No teams found');
                }
            } else {
                // Use Netlify function for production
                const response = await fetch(`${this.netlifyFunctionUrl}?teamName=Arsenal&size=small`);
                if (!response.ok) {
                    throw new Error(`Netlify function test failed: ${response.status}`);
                }
                const data = await response.json();
                if (data.success) {
                    console.log('🏆 TeamBadgeService: Netlify function connection test successful');
                    return true;
                } else {
                    throw new Error('Netlify function test failed: No success response');
                }
            }
        } catch (error) {
            console.warn('⚠️ TeamBadgeService: API connection test failed:', error);
            return false;
        }
    }

    /**
     * Get a team badge by team name
     * @param {string} teamName - The name of the team
     * @param {string} size - Badge size: 'tiny', 'small', 'medium', 'large' (default: 'small')
     * @returns {Promise<string|null>} - URL of the team badge or null if not found
     */
    async getTeamBadge(teamName, size = 'small') {
        try {
            // Loading badge for team
            
            // First, try to get from local badge service
            if (window.getLocalTeamBadge) {
                const localBadge = window.getLocalTeamBadge(teamName, size);
                if (localBadge) {
                    console.log(`✅ TeamBadgeService: Found local badge for ${teamName}: ${localBadge}`);
                    return localBadge;
                }
            }
            
            // Check if API requests are enabled globally
            if (!(await this.isAPIEnabled())) {
                console.log('🔌 TeamBadgeService: API requests are disabled globally');
                return null;
            }
            
            // If not found locally, try API (fallback)
            console.log(`🔍 TeamBadgeService: No local badge found for ${teamName}, trying API...`);
            
            const url = this.isLocalDevelopment ? 
                `${this.directApiUrl}/searchteams.php?t=${encodeURIComponent(teamName)}` :
                `${this.netlifyFunctionUrl}?teamName=${encodeURIComponent(teamName)}&size=${size}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`🔍 TeamBadgeService: API response for ${teamName}:`, data);
            
            if (data.teams && data.teams.length > 0) {
                console.log(`🔍 TeamBadgeService: Found ${data.teams.length} teams, first team:`, data.teams[0]);
                
                const team = data.teams[0];
                console.log(`🔍 TeamBadgeService: Available fields:`, Object.keys(team));
                
                const possibleBadgeFields = [
                    'strTeamBadge', 'strBadge', 'strLogo', 'strCrest', 
                    'strTeamLogo', 'strTeamCrest', 'badge', 'logo', 'crest'
                ];
                
                let baseBadgeUrl = null;
                for (const field of possibleBadgeFields) {
                    if (team[field]) {
                        baseBadgeUrl = team[field];
                        console.log(`🔍 TeamBadgeService: Found badge in field '${field}': ${baseBadgeUrl}`);
                        break;
                    }
                }
                
                if (baseBadgeUrl) {
                    // Construct the final URL with size suffix
                    const finalBadgeUrl = this.isLocalDevelopment ? 
                        `${baseBadgeUrl}/${size}` : 
                        baseBadgeUrl;
                    
                    console.log(`🔍 TeamBadgeService: Badge URL constructed: ${finalBadgeUrl}`);
                    
                    // Cache the result
                    const cacheKey = `${teamName}-${size}`;
                    this.badgeCache.set(cacheKey, finalBadgeUrl);
                    
                    console.log(`✅ TeamBadgeService: Badge loaded for ${teamName}`);
                    return finalBadgeUrl;
                } else {
                    console.log(`🔍 TeamBadgeService: No badge found in team data`);
                }
            } else {
                console.log(`🔍 TeamBadgeService: No teams found for ${teamName}`);
            }
            
            console.log(`ℹ️ TeamBadgeService: No badge found for ${teamName}`);
            return null;
        } catch (error) {
            console.warn(`⚠️ Could not load badge for ${teamName}:`, error);
            return null;
        }
    }

    /**
     * Get badges for multiple teams at once
     * @param {string[]} teamNames - Array of team names
     * @param {string} size - Badge size
     * @returns {Promise<Object>} - Object mapping team names to badge URLs
     */
    async getTeamBadges(teamNames, size = 'small') {
        const badges = {};
        const promises = teamNames.map(async (teamName) => {
            badges[teamName] = await this.getTeamBadge(teamName, size);
        });
        
        await Promise.all(promises);
        return badges;
    }

    /**
     * Preload badges for a list of teams (useful for performance)
     * @param {string[]} teamNames - Array of team names
     * @param {string} size - Badge size
     */
    async preloadBadges(teamNames, size = 'small') {
        console.log(`🏆 TeamBadgeService: Preloading ${teamNames.length} team badges...`);
        await this.getTeamBadges(teamNames, size);
        console.log('✅ TeamBadgeService: Badge preloading complete');
    }

    /**
     * Get a cached badge (synchronous, for immediate use)
     * @param {string} teamName - The name of the team
     * @param {string} size - Badge size
     * @returns {string|null} - Cached badge URL or null
     */
    getCachedBadge(teamName, size = 'small') {
        const cacheKey = `${teamName}_${size}`;
        return this.badgeCache.get(cacheKey) || null;
    }

    /**
     * Check if a badge is cached
     * @param {string} teamName - The name of the team
     * @param {string} size - Badge size
     * @returns {boolean} - True if badge is cached
     */
    isBadgeCached(teamName, size = 'small') {
        const cacheKey = `${teamName}_${size}`;
        return this.badgeCache.has(cacheKey);
    }

    /**
     * Clear the badge cache
     */
    clearCache() {
        this.badgeCache.clear();
        console.log('🏆 TeamBadgeService: Cache cleared');
    }

    /**
     * Get cache statistics
     * @returns {Object} - Cache statistics
     */
    getCacheStats() {
        return {
            totalCached: this.badgeCache.size,
            cacheKeys: Array.from(this.badgeCache.keys())
        };
    }

    /**
     * Create HTML for a team with badge
     * @param {string} teamName - The name of the team
     * @param {string} size - Badge size
     * @param {string} additionalClasses - Additional CSS classes
     * @returns {string} - HTML string for team with badge
     */
    createTeamWithBadgeHTML(teamName, size = 'small', additionalClasses = '') {
        let badgeUrl = null;
        
        // First try local badge service (fastest)
        if (window.getLocalTeamBadge) {
            badgeUrl = window.getLocalTeamBadge(teamName, size);
        }
        
        // If no local badge, try cached badge
        if (!badgeUrl) {
            badgeUrl = this.getCachedBadge(teamName, size);
        }
        
        if (badgeUrl) {
            return `
                <div class="team-with-badge ${additionalClasses}">
                    <img src="${badgeUrl}" alt="${teamName}" class="team-badge team-badge-${size}" loading="lazy">
                    <span class="team-name">${teamName}</span>
                </div>
            `;
        } else {
            // Fallback to just team name if no badge
            return `<span class="team-name">${teamName}</span>`;
        }
    }

    /**
     * Create HTML for a team badge only
     * @param {string} teamName - The name of the team
     * @param {string} size - Badge size
     * @param {string} additionalClasses - Additional CSS classes
     * @returns {string} - HTML string for team badge
     */
    createTeamBadgeHTML(teamName, size = 'small', additionalClasses = '') {
        let badgeUrl = null;
        
        // First try local badge service (fastest)
        if (window.getLocalTeamBadge) {
            badgeUrl = window.getLocalTeamBadge(teamName, size);
        }
        
        // If no local badge, try cached badge
        if (!badgeUrl) {
            badgeUrl = this.getCachedBadge(teamName, size);
        }
        
        if (badgeUrl) {
            return `<img src="${badgeUrl}" alt="${teamName}" class="team-badge team-badge-${size} ${additionalClasses}" loading="lazy">`;
        } else {
            return '';
        }
    }
}

// Make it globally available
window.TeamBadgeService = TeamBadgeService;

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    if (window.teamBadgeService) {
        await window.teamBadgeService.initialize();
    }
});

// For module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeamBadgeService;
}
