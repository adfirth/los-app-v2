# 🔌 API Toggle Functionality

This document describes the new API toggle functionality that allows super administrators to enable/disable API pull requests across the entire LOS App system.

## Overview

The API toggle feature provides super administrators with a centralized control to enable or disable all external API requests. This is useful for:

- **Maintenance**: Temporarily disable API calls during system updates
- **Cost Control**: Prevent unnecessary API usage when not needed
- **Debugging**: Isolate issues by disabling external dependencies
- **Emergency**: Quickly shut down external API access if needed

## How It Works

### 1. Global Settings Storage

The API toggle state is stored in Firestore under:
```
global-settings/system/apiRequestsEnabled
```

- `true` = API requests are enabled (default)
- `false` = API requests are disabled

### 2. SuperAdmin Dashboard Integration

The toggle appears in the SuperAdmin dashboard under "System Controls":

```
🔌 API Pull Requests [ON/OFF]
```

- **Green (ON)**: API requests are enabled
- **Gray (OFF)**: API requests are disabled

### 3. Real-time Updates

When the toggle is changed:
- The setting is immediately saved to Firestore
- All connected managers are notified via custom events
- The change takes effect immediately across the system

## Affected Components

The following components check the API toggle before making external requests:

### Core API Modules
- **FootballWebPagesAPI** (`js/modules/api/footballWebPages.js`)
- **ScoresManager** (`js/managers/ScoresManager.js`)
- **TeamBadgeService** (`js/services/TeamBadgeService.js`)

### Netlify Functions
- `fetch-scores.js`
- `fetch-football-data.js`
- `fetch-vidiprinter.js`
- `fetch-team-badge.js`

*Note: Netlify functions themselves don't check the toggle, but the client-side code that calls them does.*

## Implementation Details

### 1. SuperAdminManager Changes

```javascript
// New methods added:
async loadAPIStatus()           // Loads current API status from Firestore
async toggleAPIRequests(enabled) // Updates API toggle state
async createDefaultGlobalSettings() // Creates default settings if none exist
notifyAPIToggleChange(enabled) // Notifies other managers of changes
showToast(message, type)       // Shows confirmation messages
```

### 2. API Enablement Check

Each API component implements an `isAPIEnabled()` method:

```javascript
async isAPIEnabled() {
    try {
        // Check global settings for API enablement
        if (this.db && typeof this.db.collection === 'function') {
            const globalSettings = await this.db.collection('global-settings').doc('system').get();
            if (globalSettings.exists) {
                const data = globalSettings.data();
                return data.apiRequestsEnabled !== false; // Default to true if not set
            }
        }
        
        // Fallback checks...
        
        // Default to enabled if we can't check
        return true;
    } catch (error) {
        console.error('Error checking API enablement:', error);
        return true; // Default to enabled on error
    }
}
```

### 3. Event System

Components listen for API toggle changes:

```javascript
setupAPIToggleListener() {
    window.addEventListener('apiToggleChanged', (event) => {
        const { enabled } = event.detail;
        console.log(`API toggle changed to: ${enabled}`);
        
        if (!enabled) {
            // Handle disabled state
        } else {
            // Handle enabled state
        }
    });
}
```

## Usage Instructions

### For Super Administrators

1. **Access the SuperAdmin Dashboard**:
   - Click the "👑 Super Admin" button in the header
   - Look for "System Controls" section

2. **Toggle API Requests**:
   - Use the toggle switch next to "🔌 API Pull Requests"
   - The status will update immediately
   - A confirmation toast will appear

3. **Monitor Status**:
   - Green status = API requests enabled
   - Red status = API requests disabled

### For Developers

1. **Check API Status Before Making Requests**:
   ```javascript
   if (!(await this.isAPIEnabled())) {
       throw new Error('API requests are currently disabled by system administrator');
   }
   ```

2. **Listen for Toggle Changes**:
   ```javascript
   window.addEventListener('apiToggleChanged', (event) => {
       const { enabled } = event.detail;
       // Handle the change
   });
   ```

3. **Implement Graceful Degradation**:
   ```javascript
   try {
       if (!(await this.isAPIEnabled())) {
           // Handle disabled state gracefully
           return null;
       }
       // Make API request
   } catch (error) {
       // Handle errors
   }
   ```

## Testing

### Test File
Use `api-toggle-test.html` to test the functionality:

1. Open the test file in a browser
2. Use the toggle to enable/disable API requests
3. Click "Test API Call" to see the effect
4. Monitor the event log for changes

### Console Testing
Test in the browser console:

```javascript
// Check current status
window.losApp?.managers?.superAdmin?.loadAPIStatus();

// Toggle API requests
window.losApp?.managers?.superAdmin?.toggleAPIRequests(false);

// Check if API is enabled
window.losApp?.managers?.scores?.isAPIEnabled();
```

## Security Considerations

- **Access Control**: Only super administrators can toggle the API setting
- **Audit Logging**: All toggle changes are logged to the audit system
- **Persistence**: Settings are stored in Firestore with proper security rules
- **Fallback**: Components default to enabled if they can't check the setting

## Troubleshooting

### Common Issues

1. **Toggle Not Working**:
   - Check if user has super admin privileges
   - Verify Firestore connection is working
   - Check browser console for errors

2. **API Still Working When Disabled**:
   - Ensure the component implements `isAPIEnabled()` check
   - Check if the component is listening for toggle events
   - Verify the global settings are being read correctly

3. **Settings Not Persisting**:
   - Check Firestore permissions
   - Verify the `global-settings` collection exists
   - Check for database connection issues

### Debug Commands

```javascript
// Check global settings
const settings = await firebaseDB.collection('global-settings').doc('system').get();
console.log('Global settings:', settings.data());

// Check API status
const apiEnabled = settings.data()?.apiRequestsEnabled;
console.log('API enabled:', apiEnabled);

// Test toggle
await window.losApp.managers.superAdmin.toggleAPIRequests(!apiEnabled);
```

## Future Enhancements

- **Scheduled Toggles**: Automatically enable/disable at specific times
- **Granular Control**: Toggle specific API endpoints individually
- **Usage Analytics**: Track API usage when enabled/disabled
- **Notification System**: Alert users when API is disabled
- **Backup APIs**: Fallback to alternative data sources when disabled

## Support

For issues or questions about the API toggle functionality:

1. Check the browser console for error messages
2. Verify super admin privileges
3. Test with the provided test file
4. Check Firestore security rules
5. Review the audit logs for toggle events
