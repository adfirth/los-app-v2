# 🚀 LOS App Multi-Club Migration Guide

## Overview
This guide will help you migrate your existing LOS App from the current single-club structure to the new multi-club structure that supports multiple football clubs running Last One Standing fundraisers simultaneously.

## 🎯 What We're Building

### New Structure
- **Single App, Multiple Clubs**: One codebase supporting multiple clubs
- **Club-Based Data Isolation**: Complete separation between clubs
- **Multiple Editions per Club**: Each club can run multiple editions per season
- **Club-Specific Styling**: Custom colors, logos, and branding per club

### Example Clubs
1. **Altrincham FC Juniors** - 4 editions for 25/26 National League season
2. **Timperley FC** - 3 editions for 25/26 Premier League season
3. **Future Club C** - FA Cup version (when ready)

## 📋 Pre-Migration Checklist

- [ ] Backup your current Firebase database
- [ ] Ensure you have admin access to your Firebase project
- [ ] Test the migration on a development environment first
- [ ] Have your club information ready (names, colors, contact details)

## 🚀 Step-by-Step Migration

### Step 1: Set Up the New Structure

1. **Load the migration scripts** (already added to your HTML):
   ```html
   <script src="js/migration/migrate-to-multiclub.js"></script>
   <script src="js/setup/sample-clubs.js"></script>
   ```

2. **Open your app in the browser** and ensure Firebase is initialized

3. **Run the sample club setup** in the browser console:
   ```javascript
   const setup = new SampleClubSetup();
   await setup.setupSampleClubs();
   await setup.verifyClubSetup();
   ```

4. **Verify the structure** was created correctly

### Step 2: Migrate Existing Data

1. **Run the migration script** in the browser console:
   ```javascript
   const migration = new MultiClubMigration();
   await migration.migrateDatabase();
   await migration.verifyMigration();
   ```

2. **Check the migration results** in the console

### Step 3: Test the New Structure

1. **Refresh your app** - you should see the new club selector in the header
2. **Try switching between clubs** using the header selectors
3. **Verify data isolation** - each club should have separate data
4. **Test user registration** with the new club-based structure

## 🔧 Configuration

### Club Information
Each club needs the following information:
- **Club ID**: Unique identifier (e.g., `altrincham-fc-juniors`)
- **Name**: Display name (e.g., "Altrincham FC Juniors")
- **Colors**: Primary and secondary colors for styling
- **Contact**: Email and website
- **Logo**: URL to club logo (optional)

### Edition Configuration
Each edition needs:
- **Edition ID**: Unique identifier (e.g., `2025-26-national-league-1`)
- **Name**: Display name
- **Competition**: League/competition type
- **Season**: Season identifier
- **Dates**: Start and end dates
- **Gameweeks**: Total number of gameweeks
- **Lives**: Maximum lives per player

## 🎨 Customization

### Club-Specific Styling
The app automatically applies:
- **Header background color** from `primaryColor`
- **Button colors** from `secondaryColor`
- **Club logo** in header and auth screens
- **Page title** with club name

### Adding New Clubs
1. **Create club info** using `ClubService.createClub()`
2. **Create editions** using `ClubService.createEdition()`
3. **Update global settings** to include the new club

## 🔍 Troubleshooting

### Common Issues

1. **"ClubService not available"**
   - Ensure `ClubService.js` is loaded before `app.js`
   - Check the browser console for errors

2. **"Firebase not ready"**
   - Wait for Firebase to fully initialize
   - Check Firebase configuration

3. **"User not found"**
   - Verify user data was migrated correctly
   - Check club and edition paths

4. **Styling not applied**
   - Ensure club data includes `primaryColor` and `secondaryColor`
   - Check browser console for errors

### Debug Commands

```javascript
// Check current club and edition
console.log('Current Club:', window.clubService.getCurrentClub());
console.log('Current Edition:', window.clubService.getCurrentEdition());

// List all available clubs
console.log('Available Clubs:', window.clubService.availableClubs);

// Check club data
console.log('Club Data:', window.clubService.clubData);
```

## 📊 Database Structure

### New Paths
```
/clubs/{clubId}/club-info
/clubs/{clubId}/editions/{editionId}/
├── /users/{userId}
├── /fixtures/{gameweekId}
├── /picks/{pickId}
└── /settings
/global-settings/system
```

### Old vs New
| Old Path | New Path |
|----------|----------|
| `/users/{userId}` | `/clubs/{clubId}/editions/{editionId}/users/{userId}` |
| `/fixtures/{gameweekId}` | `/clubs/{clubId}/editions/{editionId}/fixtures/{gameweekId}` |
| `/picks/{pickId}` | `/clubs/{clubId}/editions/{editionId}/picks/{pickId}` |
| `/settings/current` | `/clubs/{clubId}/editions/{editionId}/settings/current` |

## 🚀 Next Steps

### Phase 1: Basic Migration ✅
- [x] Set up new database structure
- [x] Migrate existing data
- [x] Test basic functionality

### Phase 2: Enhanced Features
- [ ] Add club admin panel
- [ ] Implement club-specific rules
- [ ] Add cross-club analytics
- [ ] Enhance club branding

### Phase 3: Advanced Features
- [ ] Club invitation system
- [ ] Multi-club tournaments
- [ ] Advanced reporting
- [ ] API integrations

## 📞 Support

If you encounter issues during migration:

1. **Check the browser console** for error messages
2. **Verify Firebase rules** allow the new paths
3. **Ensure all scripts are loaded** in the correct order
4. **Check the migration verification** output

## 🎉 Success Indicators

You'll know the migration is successful when:

- ✅ Club selector appears in the header
- ✅ You can switch between clubs
- ✅ Each club shows separate data
- ✅ Club-specific styling is applied
- ✅ User registration works with club selection
- ✅ All existing functionality continues to work

---

**Happy migrating! 🏟️⚽**
