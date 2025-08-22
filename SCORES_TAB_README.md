# Scores Tab with Vidiprinter - Implementation Guide

## Overview

The Scores Tab has been enhanced with real-time score updates and a live vidiprinter that shows match events as they happen. This feature integrates with the Football Web Pages API to provide live updates for National League matches.

## Features

### 🏟️ Live Scores Display
- Shows current gameweek fixtures with real-time scores
- Displays match status (scheduled, live, half-time, completed)
- Updates automatically when scores change

### 📺 Vidiprinter
- Real-time match updates every 30 seconds
- Shows different event types:
  - **Kick-off**: Match starting
  - **Goals**: Live score updates
  - **Half-time**: Half-time whistle
  - **Full-time**: Match completion
  - **Attendance**: Final attendance figures
  - **League-table**: Table updates
  - **Correction**: Score corrections

### 🔄 Auto-Sync
- Automatically syncs scores from vidiprinter data
- Updates fixture status based on match events
- Maintains data consistency between API and local database

## API Configuration

The vidiprinter uses the Football Web Pages API with the following configuration:

```javascript
// API endpoint
https://football-web-pages1.p.rapidapi.com/vidiprinter.json

// Parameters
comp=5          // National League competition ID
team=0          // All teams (0 = no specific team filter)
date=YYYY-MM-DD // Match date
```

## Development Mode

When running locally (localhost, 127.0.0.1, or port 5500), the system automatically:

1. Detects development environment
2. Shows development controls
3. Provides sample data loading for testing
4. Falls back to sample data if API calls fail

### Sample Data
The system includes sample vidiprinter data from the August 9th, 2025 National League matches for testing purposes.

## Usage

### For Players
1. Navigate to the **Scores** tab
2. View current gameweek fixtures and scores
3. Watch live updates in the vidiprinter section
4. Scores update automatically every 30 seconds

### For Developers
1. **Manual Refresh**: Click the refresh button to force an update
2. **Sample Data**: In development mode, use "Load Sample Data" button
3. **API Testing**: Monitor console for API call status and errors

## Technical Implementation

### Core Components
- `ScoresManager`: Main manager for scores and vidiprinter
- `FootballWebPagesAPI`: API integration layer
- Real-time Firebase listeners for fixture updates

### Update Frequency
- **Vidiprinter**: Every 30 seconds
- **Score Sync**: Every vidiprinter update
- **Display Refresh**: Real-time via Firebase listeners

### Error Handling
- API key validation
- Network error recovery
- CORS fallback handling
- Development mode fallbacks

## CSS Classes

### Main Layout
- `.scores-container`: Grid layout for scores and vidiprinter
- `.scores-section`: Left panel for fixture scores
- `.vidiprinter-section`: Right panel for live updates

### Vidiprinter Elements
- `.vidiprinter-container`: Main vidiprinter wrapper
- `.vidiprinter-header`: Header with title and controls
- `.vidiprinter-content`: Scrollable content area
- `.vidiprinter-footer`: Footer with timestamp info

### Event Types
- `.event-goal`: Goal events (green)
- `.event-kickoff`: Kick-off events (blue)
- `.event-halftime`: Half-time events (yellow)
- `.event-fulltime`: Full-time events (gray)
- `.event-attendance`: Attendance events (cyan)
- `.event-table`: Table updates (purple)
- `.event-correction`: Corrections (red)

## Troubleshooting

### Common Issues

1. **No API Key**: Check `football-webpages-config.js` for valid RapidAPI key
2. **CORS Errors**: API calls may fail in development - use sample data
3. **No Fixtures**: Ensure fixtures are loaded for the current gameweek
4. **Update Failures**: Check browser console for error messages

### Debug Mode
Enable console logging to see:
- API call status
- Data processing steps
- Error details
- Update timestamps

## Future Enhancements

- [ ] Support for multiple competitions
- [ ] Historical vidiprinter data
- [ ] Push notifications for goals
- [ ] Match commentary integration
- [ ] Social media integration
- [ ] Custom update intervals

## API Rate Limits

The Football Web Pages API has rate limits. The current implementation:
- Updates every 30 seconds (2 requests per minute)
- Includes retry logic with exponential backoff
- Gracefully handles rate limit errors

## Security Notes

- API key is stored in client-side configuration
- Consider moving to server-side API calls for production
- Implement proper authentication for admin functions
- Validate all incoming data before processing
