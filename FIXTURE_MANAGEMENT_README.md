# ⚽ Fixture & Scores Management System

## Overview
The Fixture & Scores Management System integrates with the [Football Web Pages API](https://rapidapi.com/football-web-pages1-football-web-pages-default/api/football-web-pages1) to automatically import fixtures and update scores for your Last One Standing fundraisers.

## 🚀 Quick Start

### 1. Get Your API Key
1. Visit [RapidAPI Football Web Pages](https://rapidapi.com/football-web-pages1-football-web-pages-default/api/football-web-pages1)
2. Sign up for a free account
3. Subscribe to the Football Web Pages API (free tier available)
4. Copy your API key

### 2. Configure Your API Key
1. Open `js/config/api-config.js`
2. Replace `'YOUR_RAPIDAPI_KEY_HERE'` with your actual API key:
   ```javascript
   rapidAPI: {
       key: 'your_actual_api_key_here',
       host: 'football-web-pages1.p.rapidapi.com',
       baseUrl: 'https://football-web-pages1.p.rapidapi.com'
   }
   ```

### 3. Access the System
1. Log in as a Super Admin
2. Click the "👑 Super Admin" button
3. Click "⚽ Manage Fixtures" in the dashboard

## 🎯 Features

### 📥 Import Fixtures
- **Select Club & Edition**: Choose which club and edition to import fixtures for
- **Competition ID**: Enter the competition identifier (e.g., `premier-league`, `national-league`)
- **Season**: Optionally specify a season (e.g., `2024-25`)
- **Bulk Import**: Automatically imports all fixtures for the specified competition

### 📊 Update Scores
- **Bulk Updates**: Automatically fetch and update scores from the API
- **Real-time Sync**: Keep your fixture database current with live results
- **Competition-based**: Update scores for specific competitions

### ✏️ Manual Score Entry
- **Individual Updates**: Manually update specific fixture scores
- **Status Management**: Set fixture status (scheduled, in_progress, finished, postponed, cancelled)
- **Fixture ID Lookup**: Find fixtures by ID across all clubs and editions

### 📋 Fixture Management
- **View All Fixtures**: See all imported fixtures for a club/edition
- **Status Tracking**: Monitor fixture progress and completion
- **Real-time Updates**: Live updates as fixtures change

## 🔧 API Integration

### Supported Competitions
The system includes pre-configured competition IDs:
- `premier-league` - Premier League
- `national-league` - National League
- `championship` - EFL Championship
- `league-one` - EFL League One
- `league-two` - EFL League Two
- `fa-cup` - FA Cup
- `carabao-cup` - Carabao Cup

### API Endpoints Used
- `/competitions` - Get available competitions
- `/fixtures` - Get fixtures for a competition
- `/results` - Get scores/results for a competition

## 📁 File Structure

```
js/
├── managers/
│   ├── FixtureManagementManager.js    # Core fixture management logic
│   └── SuperAdminManager.js           # Super Admin dashboard integration
├── config/
│   └── api-config.js                  # API configuration and keys
└── app.js                             # Main app integration
```

## 🎮 Usage Examples

### Import Premier League Fixtures
1. Select "Timperley FC" as club
2. Select "2024-25 Premier League" as edition
3. Enter `premier-league` as competition ID
4. Enter `2024-25` as season
5. Click "📥 Import Fixtures"

### Update National League Scores
1. Select "Altrincham FC Juniors" as club
2. Select "2025-26 National League 1" as edition
3. Enter `national-league` as competition ID
4. Click "🔄 Bulk Update Scores"

### Manual Score Update
1. Find the fixture ID from the fixtures list
2. Enter the fixture ID in the manual entry form
3. Enter home and away scores
4. Select status (usually "finished")
5. Click "💾 Update Score"

## 🔒 Security & Permissions

### Super Admin Access
- **Full Control**: Import, update, and manage all fixtures
- **Audit Logging**: All actions are logged for accountability
- **Multi-club Management**: Access to fixtures across all clubs

### Future Admin Level Access
The system is designed to be easily replicated at the club admin level:
- Club admins can manage fixtures for their specific club
- Limited permissions based on club membership
- Same interface, reduced scope

## 🚨 Important Notes

### API Limitations
- **End Date**: The Football Web Pages API ends in September 2024
- **Rate Limits**: Free tier has usage limits
- **Data Accuracy**: Verify imported data for accuracy

### Backup Strategy
- **Local Storage**: All fixtures are stored in Firebase
- **Export Capability**: Can export fixture data for backup
- **Alternative APIs**: System designed to easily switch to other APIs

## 🔄 Migration & Future Planning

### When API Ends
1. **Data Preservation**: All imported fixtures remain in Firebase
2. **Manual Management**: Continue using manual score entry
3. **Alternative APIs**: Integrate with other football data providers

### Alternative Data Sources
- **Official Club APIs**: Direct integration with club data
- **Sports Data Providers**: Professional sports data services
- **Manual Entry**: Continued manual fixture and score management

## 🛠️ Troubleshooting

### Common Issues

#### "API key not configured"
- Check `js/config/api-config.js`
- Ensure your RapidAPI key is correctly set
- Verify the API key is active in your RapidAPI dashboard

#### "No fixtures found"
- Verify the competition ID is correct
- Check if the season format matches API requirements
- Ensure the competition has fixtures for the specified season

#### "Fixture not found" (Manual Updates)
- Use the fixture ID from the fixtures list
- Check if the fixture exists in the selected club/edition
- Verify the fixture ID format

### Debug Information
- Check browser console for detailed error messages
- Verify Firebase connection is active
- Ensure Super Admin permissions are granted

## 📞 Support

For technical support or questions about the fixture management system:
1. Check the browser console for error messages
2. Verify your API key configuration
3. Ensure you have Super Admin access
4. Check the audit logs for action history

---

**Note**: This system is designed to work with the existing multi-club Last One Standing infrastructure. All fixtures are stored in the nested Firebase structure: `clubs/{clubId}/editions/{editionId}/fixtures/{fixtureId}`
