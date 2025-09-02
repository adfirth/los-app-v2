// Team Badge Downloader Script
// Downloads all National League team badges and saves them locally

class TeamBadgeDownloader {
    constructor() {
        this.db = window.firebaseDB;
        this.badgeCache = new Map();
        this.downloadedBadges = new Map();
    }

    // National League teams (2025/26 season)
    getNationalLeagueTeams() {
        return [
            'Aldershot Town',
            'Altrincham',
            'Boreham Wood',
            'Boston United',
            'Brackley Town',
            'Braintree Town',
            'Carlisle United',
            'Eastleigh',
            'Forest Green Rovers',
            'Gateshead',
            'Halifax Town',
            'Hartlepool United',
            'Morecambe',
            'Rochdale',
            'Scunthorpe United',
            'Solihull Moors',
            'Southend United',
            'Sutton United',
            'Tamworth',
            'Truro City',
            'Wealdstone',
            'Woking',
            'Yeovil Town',
            'York City'
        ];
    }

    // Method to get current season teams (can be updated easily)
    getCurrentSeasonTeams() {
        // This can be updated each season
        return this.getNationalLeagueTeams();
    }

    // Method to add custom teams
    addCustomTeams(teams) {
        const currentTeams = this.getNationalLeagueTeams();
        return [...currentTeams, ...teams];
    }

    // Method to clean up old teams and download correct ones
    async cleanupAndRedownload() {
        try {
            console.log('🧹 Cleaning up old team badges and downloading correct ones...');
            
            // Step 1: Delete old incorrect teams
            const oldTeams = [
                'Barnet', 'Bromley', 'Chesterfield', 'Dagenham & Redbridge', 
                'Dorking Wanderers', 'Ebbsfleet United', 'FC Halifax Town',
                'Kidderminster Harriers', 'Maidenhead United', 'Oldham Athletic', 
                'Oxford City', 'Wrexham'
            ];
            
            console.log('🗑️ Removing old teams:', oldTeams);
            
            const batch = this.db.batch();
            oldTeams.forEach(teamName => {
                const docRef = this.db.collection('team-badges').doc(teamName.toLowerCase().replace(/\s+/g, '-'));
                batch.delete(docRef);
            });
            
            await batch.commit();
            console.log('✅ Old teams removed from Firebase');
            
            // Step 2: Download correct current season teams
            console.log('🏆 Downloading correct 2025/26 National League teams...');
            const result = await this.downloadAndSave('national');
            
            if (result) {
                console.log('🎉 Cleanup and redownload complete!');
                return true;
            } else {
                console.log('❌ Failed to download correct teams');
                return false;
            }
        } catch (error) {
            console.error('❌ Error in cleanup and redownload:', error);
            return false;
        }
    }

    // Premier League teams for testing
    getPremierLeagueTeams() {
        return [
            'Arsenal',
            'Aston Villa',
            'Bournemouth',
            'Brentford',
            'Brighton & Hove Albion',
            'Burnley',
            'Chelsea',
            'Crystal Palace',
            'Everton',
            'Fulham',
            'Liverpool',
            'Luton Town',
            'Manchester City',
            'Manchester United',
            'Newcastle United',
            'Nottingham Forest',
            'Sheffield United',
            'Tottenham Hotspur',
            'West Ham United',
            'Wolverhampton Wanderers'
        ];
    }

    async downloadTeamBadge(teamName) {
        try {
            console.log(`🏆 Downloading badge for: ${teamName}`);
            
            const response = await fetch(`https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=${encodeURIComponent(teamName)}`);
            const data = await response.json();
            
            if (data.teams && data.teams.length > 0) {
                const team = data.teams[0];
                const badgeUrl = team.strBadge;
                
                if (badgeUrl) {
                    console.log(`✅ Found badge for ${teamName}: ${badgeUrl}`);
                    
                    // Don't download the image (CORS issue) - just save the URL
                    return {
                        teamName: teamName,
                        badgeUrl: badgeUrl,
                        base64: null, // We'll handle image loading differently
                        originalName: team.strTeam,
                        league: team.strLeague,
                        country: team.strCountry
                    };
                } else {
                    console.log(`⚠️ No badge found for ${teamName}`);
                    return null;
                }
            } else {
                console.log(`❌ No team found for: ${teamName}`);
                return null;
            }
        } catch (error) {
            console.error(`❌ Error downloading badge for ${teamName}:`, error);
            return null;
        }
    }

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async downloadAllTeamBadges(teamList = 'national') {
        try {
            console.log('🏆 Starting team badge download...');
            
            const teams = teamList === 'national' ? this.getNationalLeagueTeams() : this.getPremierLeagueTeams();
            console.log(`📋 Downloading badges for ${teams.length} teams...`);
            
            const results = [];
            const failedTeams = [];
            
            // Download badges with delay to avoid rate limiting
            for (let i = 0; i < teams.length; i++) {
                const teamName = teams[i];
                console.log(`\n${i + 1}/${teams.length}: Processing ${teamName}...`);
                
                const result = await this.downloadTeamBadge(teamName);
                
                if (result) {
                    results.push(result);
                    this.downloadedBadges.set(teamName, result);
                } else {
                    failedTeams.push(teamName);
                }
                
                // Add delay to avoid overwhelming the API
                if (i < teams.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
                }
            }
            
            console.log(`\n✅ Download complete!`);
            console.log(`📊 Successfully downloaded: ${results.length} badges`);
            console.log(`❌ Failed downloads: ${failedTeams.length} teams`);
            
            if (failedTeams.length > 0) {
                console.log(`❌ Failed teams:`, failedTeams);
            }
            
            return {
                success: results,
                failed: failedTeams,
                total: teams.length
            };
        } catch (error) {
            console.error('❌ Error in bulk download:', error);
            return null;
        }
    }

    async saveBadgesToFirebase(badges, collectionName = 'team-badges') {
        try {
            console.log(`💾 Saving ${badges.length} badges to Firebase...`);
            
            const batch = this.db.batch();
            
            badges.forEach(badge => {
                const docRef = this.db.collection(collectionName).doc(badge.teamName.toLowerCase().replace(/\s+/g, '-'));
                
                const badgeData = {
                    teamName: badge.teamName,
                    originalName: badge.originalName,
                    badgeUrl: badge.badgeUrl,
                    base64: badge.base64,
                    league: badge.league,
                    country: badge.country,
                    downloadedAt: new Date(),
                    size: 'original'
                };
                
                batch.set(docRef, badgeData);
            });
            
            await batch.commit();
            console.log(`✅ Successfully saved ${badges.length} badges to Firebase collection: ${collectionName}`);
            
            return true;
        } catch (error) {
            console.error('❌ Error saving badges to Firebase:', error);
            return false;
        }
    }

    async createLocalBadgeService() {
        try {
            console.log('🔧 Creating local badge service...');
            
            // Get all badges from Firebase
            const badgesSnapshot = await this.db.collection('team-badges').get();
            const localBadges = {};
            
            badgesSnapshot.forEach(doc => {
                const data = doc.data();
                // Use the badge URL directly, with size suffix for different sizes
                const baseUrl = data.badgeUrl;
                localBadges[data.teamName] = {
                    original: baseUrl,
                    small: baseUrl + '/small',
                    medium: baseUrl + '/medium', 
                    large: baseUrl + '/large'
                };
            });
            
            console.log(`✅ Local badge service created with ${Object.keys(localBadges).length} teams`);
            
            // Create a local badge service function
            window.getLocalTeamBadge = (teamName, size = 'small') => {
                const teamBadges = localBadges[teamName];
                if (teamBadges) {
                    return teamBadges[size] || teamBadges.small;
                }
                return null;
            };
            
            console.log('✅ Local badge service ready! Use: window.getLocalTeamBadge("Team Name", "size")');
            
            return localBadges;
        } catch (error) {
            console.error('❌ Error creating local badge service:', error);
            return null;
        }
    }

    async downloadAndSave(teamList = 'national') {
        try {
            console.log('🚀 Starting complete badge download and save process...');
            
            // Step 1: Download all badges
            const downloadResult = await this.downloadAllTeamBadges(teamList);
            
            if (!downloadResult || downloadResult.success.length === 0) {
                console.log('❌ No badges downloaded, aborting save');
                return false;
            }
            
            // Step 2: Save to Firebase
            const saveResult = await this.saveBadgesToFirebase(downloadResult.success);
            
            if (saveResult) {
                // Step 3: Create local service
                await this.createLocalBadgeService();
                
                console.log('🎉 Complete process finished successfully!');
                console.log(`📊 Summary:`);
                console.log(`   - Downloaded: ${downloadResult.success.length} badges`);
                console.log(`   - Failed: ${downloadResult.failed.length} teams`);
                console.log(`   - Saved to Firebase: team-badges collection`);
                console.log(`   - Local service: window.getLocalTeamBadge()`);
                
                return true;
            } else {
                console.log('❌ Failed to save badges to Firebase');
                return false;
            }
        } catch (error) {
            console.error('❌ Error in complete process:', error);
            return false;
        }
    }
}

// Export for use in console
window.TeamBadgeDownloader = TeamBadgeDownloader;

// Ensure the class is available globally
if (typeof window !== 'undefined') {
    window.TeamBadgeDownloader = TeamBadgeDownloader;
}

// Usage instructions - available in console: window.TeamBadgeDownloader
if (!window.BADGE_DOWNLOADER_LOADED) {
    window.BADGE_DOWNLOADER_LOADED = true;
}

// Test if the class is available
setTimeout(() => {
    if (!window.TeamBadgeDownloader) {
        console.error('❌ TeamBadgeDownloader not found - please refresh the page');
    }
}, 1000);

// Auto-initialize local badge service when page loads
const autoInitializeBadgeService = async () => {
    try {
        // Wait for Firebase to be ready
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            if (window.DEBUG_MODE) {
                console.log('⏳ Waiting for Firebase to be ready...');
            }
            setTimeout(autoInitializeBadgeService, 500);
            return;
        }
        
        if (window.DEBUG_MODE) {
            console.log('🏆 Auto-initializing local badge service...');
        }
        const downloader = new TeamBadgeDownloader();
        await downloader.createLocalBadgeService();
        if (window.DEBUG_MODE) {
            console.log('✅ Local badge service auto-initialized successfully!');
        }
    } catch (error) {
        console.error('❌ Error auto-initializing badge service:', error);
    }
};

// Start auto-initialization after a short delay
setTimeout(autoInitializeBadgeService, 2000);

// Debug mode control
window.DEBUG_MODE = false;
window.toggleDebugMode = () => {
    window.DEBUG_MODE = !window.DEBUG_MODE;
    console.log(`🔧 Debug mode ${window.DEBUG_MODE ? 'enabled' : 'disabled'}`);
    return window.DEBUG_MODE;
};

// Debug mode control available: window.toggleDebugMode() or window.DEBUG_MODE
