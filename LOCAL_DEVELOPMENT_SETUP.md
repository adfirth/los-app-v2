# Local Development Setup - Fixture Import System

## 🚀 **Quick Start for Local Development**

You can now test the fixture import system locally without deploying to Netlify! The system automatically detects when you're running on localhost and uses mock data for testing.

## 📋 **Setup Steps**

### 1. **Start Live Server**
```bash
# If you have Live Server extension in VS Code:
# Right-click on index.html and select "Open with Live Server"

# Or if you have live-server installed globally:
live-server

# Or use any local development server
python -m http.server 8000
```

### 2. **Access the App**
- Open your browser to `http://localhost:3000` (or whatever port Live Server uses)
- You'll see a development mode banner at the top indicating mock data is being used

### 3. **Test the Fixture Import**
1. Log in as an admin user
2. Click the admin button (gear icon) in the header
3. Navigate to the "Fixtures" tab
4. Click "Import from API" button
5. The system will use mock data automatically

## 🔧 **How It Works**

### **Development Mode Detection**
The system automatically detects when you're running on:
- `localhost`
- `127.0.0.1`
- Any URL containing `live-server`

### **Mock Data**
When in development mode, the system provides:
- **Mock Fixtures**: 5 sample National League fixtures
- **Mock Competitions**: National League, Premier League, Championship
- **Real Import Functionality**: Fixtures can still be imported to Firebase

### **Visual Indicators**
- Development mode banner at the top of the page
- Console logs indicating mock data usage
- No API key required for testing

## 🎯 **Testing Scenarios**

### **Scenario 1: Basic Import Test**
1. Open fixture import modal
2. Select "National League" competition
3. Choose "2024-25" season
4. Set date range (e.g., today's date)
5. Click "Fetch Fixtures"
6. You'll see 5 mock fixtures
7. Select some fixtures and import them

### **Scenario 2: Real API Testing (Optional)**
If you want to test with real API data:
1. Set your RapidAPI key in `js/config/api-config.js`
2. The system will automatically try the real API first
3. Falls back to mock data if API fails

## 🔍 **Console Logging**

The system provides detailed console logging:
```
🔧 DevelopmentHelper: Development mode detected, using mock data
🔧 FootballWebPagesAPI: Development mode detected, using mock fixtures
✅ FootballWebPagesAPI: Successfully fetched fixtures using format 2025-01-27
📥 FootballWebPagesAPI: Importing 3 fixtures for edition 1, gameweek 1
```

## 🛠 **Configuration Options**

### **Enable/Disable Development Mode**
You can force development mode by setting:
```javascript
localStorage.setItem('forceDevMode', 'true');
```

### **Custom Mock Data**
Edit `js/modules/api/developmentHelper.js` to customize mock fixtures:
```javascript
getMockFixtures(competition, season, startDate, endDate) {
    // Add your custom mock fixtures here
    const mockFixtures = [
        {
            homeTeam: "Your Team",
            awayTeam: "Opponent Team",
            // ... other properties
        }
    ];
    // ...
}
```

## 🚨 **Troubleshooting**

### **Development Mode Not Detected**
- Check that you're running on `localhost` or `127.0.0.1`
- Look for the development banner at the top of the page
- Check console for development mode logs

### **Mock Data Not Loading**
- Ensure `developmentHelper.js` is loaded before `footballWebPages.js`
- Check browser console for errors
- Verify the script order in `index.html`

### **Import Not Working**
- Check Firebase connection
- Verify you're logged in as an admin user
- Check browser console for error messages

## 🔄 **Switching Between Development and Production**

### **Development (Local)**
- Automatically uses mock data
- No API key required
- Shows development banner
- Detailed console logging

### **Production (Netlify)**
- Uses real API calls
- Requires API key configuration
- No development banner
- Minimal console logging

## 📝 **Next Steps**

1. **Test the basic functionality** with mock data
2. **Customize mock fixtures** if needed
3. **Test the import workflow** end-to-end
4. **Configure real API key** when ready for production testing
5. **Deploy to Netlify** when ready for production

## 🎉 **Benefits of This Approach**

✅ **No deployment required** for testing  
✅ **No API key needed** for development  
✅ **Realistic test data** with National League teams  
✅ **Full functionality** - imports work with Firebase  
✅ **Easy switching** between dev and production modes  
✅ **Visual indicators** for development mode  

You can now develop and test the fixture import system entirely locally! 🚀









