# Fixture Import System - LOS App v2

## Overview

The fixture import system in LOS App v2 integrates with the Football Web Pages API via RapidAPI to automatically fetch and import football fixtures. This system replicates the functionality from LOS v1 with enhanced features and improved architecture.

## Architecture Components

### 1. **Configuration Layer**

**File: `js/config/football-webpages-config.js`**
- Manages API credentials and configuration
- Supports multiple environment variable sources (Vite, Netlify, global window objects)
- Defines league IDs and season mappings
- Exposes configuration globally for module access

**Key Configuration:**
```javascript
const FOOTBALL_WEBPAGES_CONFIG = {
    BASE_URL: 'https://football-web-pages1.p.rapidapi.com',
    RAPIDAPI_KEY: apiKey,
    RAPIDAPI_HOST: 'football-web-pages1.p.rapidapi.com'
};
```

### 2. **Core API Module**

**File: `js/modules/api/footballWebPages.js`**
- Main `FootballWebPagesAPI` class handling all API interactions
- Robust configuration loading with multiple fallback mechanisms
- Comprehensive error handling and retry logic
- Fixture data transformation and validation

**Key Features:**
- **Configuration Loading**: Multiple fallback strategies to find API keys
- **Date Range Fetching**: `fetchDateRangeFixtures()` method for targeted fixture retrieval
- **Fixture Import**: `importSelectedFixtures()` method for database storage
- **Data Transformation**: Converts API response format to app's internal format

### 3. **Netlify Serverless Functions**

**File: `netlify/functions/fetch-scores.js`**
- Server-side API proxy to avoid CORS issues
- Handles both GET and POST requests
- Transforms API responses to match app's expected format
- Secure API key handling through environment variables

### 4. **Admin Interface Integration**

**File: `js/managers/AdminManager.js`**
- Enhanced admin panel with fixture import functionality
- Date range selection controls
- Fixture preview and selection interface
- Import controls with gameweek targeting

## Setup Instructions

### 1. **API Key Configuration**

You have several options for configuring your RapidAPI key:

#### Option A: Environment Variables (Recommended for Production)
Set the `RAPIDAPI_KEY` environment variable in your Netlify dashboard:
1. Go to your Netlify site dashboard
2. Navigate to Site settings > Environment variables
3. Add `RAPIDAPI_KEY` with your RapidAPI key value

#### Option B: Configuration File (Development)
Update `js/config/api-config.js`:
```javascript
window.APIConfig = {
    rapidAPI: {
        key: 'your-rapidapi-key-here',
        host: 'football-web-pages1.p.rapidapi.com',
        baseUrl: 'https://football-web-pages1.p.rapidapi.com'
    }
};
```

#### Option C: Global Window Object
Set the API key globally:
```javascript
window.RAPIDAPI_KEY = 'your-rapidapi-key-here';
```

### 2. **Netlify Deployment**

The system includes a Netlify serverless function to handle CORS issues:

1. Ensure your `netlify.toml` file is in the root directory
2. Deploy to Netlify (the function will be automatically deployed)
3. Set the `RAPIDAPI_KEY` environment variable in Netlify dashboard

### 3. **File Structure**

```
LOS App v2/
├── js/
│   ├── config/
│   │   ├── api-config.js
│   │   └── football-webpages-config.js
│   ├── modules/
│   │   └── api/
│   │       └── footballWebPages.js
│   └── managers/
│       └── AdminManager.js
├── netlify/
│   └── functions/
│       └── fetch-scores.js
├── netlify.toml
└── index.html
```

## Usage Guide

### 1. **Accessing the Fixture Import Interface**

1. Log in as an admin user
2. Click the admin button (gear icon) in the header
3. Navigate to the "Fixtures" tab
4. Click "Import from API" button

### 2. **Importing Fixtures**

1. **Select Competition**: Choose from available leagues (National League, Premier League, etc.)
2. **Select Season**: Choose the season (2024-25, 2023-24, etc.)
3. **Set Date Range**: Specify start and end dates for fixture retrieval
4. **Set Target Gameweek**: Choose which gameweek to import fixtures into
5. **Fetch Fixtures**: Click "Fetch Fixtures" to retrieve fixtures from the API
6. **Select Fixtures**: Review and select which fixtures to import
7. **Import**: Click "Import Selected Fixtures" to save to database

### 3. **API Response Format**

The system handles the following API response format:
```json
{
    "fixtures-results": {
        "matches": [
            {
                "home-team": { "name": "Team A", "score": 2 },
                "away-team": { "name": "Team B", "score": 1 },
                "date": "2025-08-09",
                "time": "15:00",
                "venue": "Stadium Name"
            }
        ]
    }
}
```

### 4. **Database Storage Format**

Fixtures are stored in Firestore with the following structure:
```javascript
{
    fixtureId: "fixture_1234567890_0",
    homeTeam: "Team A",
    awayTeam: "Team B",
    date: "2025-08-09",
    kickOffTime: "15:00:00",
    venue: "Stadium Name",
    status: "NS",
    homeScore: null,
    awayScore: null,
    season: "2024-25",
    round: 1,
    importedAt: "2025-01-27T10:30:00.000Z",
    lastUpdated: "2025-01-27T10:30:00.000Z",
    importedFrom: "API",
    apiData: { /* original API data */ }
}
```

## Key Features

### 1. **Robust Error Handling**
- Multiple configuration fallback strategies
- API request retry logic with exponential backoff
- Comprehensive error logging and user feedback
- Graceful degradation when API is unavailable

### 2. **Flexible Date Handling**
- Supports multiple date formats (YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY)
- Automatic date format detection and conversion
- Timezone-aware date processing

### 3. **Team Name Matching**
- Multiple matching strategies for team names
- Case-insensitive matching
- Special character removal for fuzzy matching
- Fallback to exact string matching

### 4. **Edition and Gameweek Management**
- Support for multiple competition editions
- Gameweek-specific fixture storage
- Automatic edition detection from admin interface
- Tiebreak round support

### 5. **Admin Interface Integration**
- Real-time API connection testing
- Fixture preview with detailed information
- Bulk selection and import capabilities
- Import status tracking and feedback

## Security Considerations

### 1. **API Key Management**
- Environment variable-based configuration
- No hardcoded API keys in production
- Multiple fallback mechanisms for development
- Secure key rotation support

### 2. **CORS Handling**
- Serverless function proxy to avoid client-side CORS issues
- Proper headers and preflight request handling
- Secure API key transmission

### 3. **Input Validation**
- Date format validation
- League and season parameter validation
- Fixture data sanitization
- SQL injection prevention through parameterized queries

## Performance Optimizations

### 1. **Caching Strategy**
- Configuration caching to reduce API calls
- Fixture data caching in Firestore
- Client-side caching of API responses

### 2. **Batch Operations**
- Bulk fixture import capabilities
- Efficient database writes
- Optimized UI updates

### 3. **Lazy Loading**
- Fixtures loaded on-demand by date range
- Progressive loading of large datasets
- Efficient memory management

## Monitoring and Debugging

### 1. **Comprehensive Logging**
- Detailed console logging for all operations
- API request/response logging
- Error tracking and reporting
- Performance monitoring

### 2. **Status Indicators**
- Real-time API connection status
- Import progress tracking
- Error state management
- User feedback mechanisms

## Troubleshooting

### Common Issues

1. **API Key Not Configured**
   - Ensure your RapidAPI key is set in environment variables or configuration
   - Check that the key is valid and has proper permissions

2. **CORS Errors**
   - Verify the Netlify serverless function is deployed correctly
   - Check that the function URL is accessible

3. **No Fixtures Found**
   - Verify the date range is correct
   - Check that the competition and season are valid
   - Ensure the API is returning data for the specified parameters

4. **Import Failures**
   - Check Firebase connection and permissions
   - Verify the target gameweek and edition are valid
   - Review console logs for specific error messages

### Debug Mode

Enable debug logging by setting:
```javascript
localStorage.setItem('debug', 'true');
```

## Integration Points

### 1. **Fixtures Manager Integration**
- Seamless integration with existing fixture management
- Automatic fixture validation
- Gameweek status tracking
- Deadline management integration

### 2. **Scores System Integration**
- Automatic score updates from API
- Real-time score synchronization
- Historical data import capabilities

### 3. **Admin Panel Integration**
- Unified admin interface
- Centralized configuration management
- Cross-module functionality sharing

## Future Enhancements

1. **Bulk Import**: Import multiple gameweeks at once
2. **Scheduled Imports**: Automatic fixture imports on schedule
3. **Score Updates**: Automatic score updates from API
4. **Team Mapping**: Custom team name mapping for consistency
5. **Historical Data**: Import historical fixture data
6. **Multiple APIs**: Support for additional football data APIs

## Conclusion

The fixture import system provides a robust, production-ready solution for managing football fixtures in the LOS App. The modular architecture, comprehensive error handling, and user-friendly interface make it easy to import and manage fixtures efficiently.

For support or questions, please refer to the console logs for detailed debugging information or contact the development team.


