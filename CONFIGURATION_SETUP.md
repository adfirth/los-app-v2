# Configuration Setup Guide

## 🔒 **IMPORTANT: Security Notice**

**NEVER commit the real configuration files to GitHub!** They contain sensitive API keys and Firebase credentials.

## 📁 **Configuration Files**

### **1. Firebase Configuration**
- **Template**: `js/config/firebase-config.template.js`
- **Real Config**: `js/config/firebase-config.js` (not in git)
- **Purpose**: Firebase authentication and database connection

### **2. Football Web Pages API Configuration**
- **Template**: `js/config/football-webpages-config.template.js`
- **Real Config**: `js/config/football-webpages-config.js` (not in git)
- **Purpose**: RapidAPI integration for football data

### **3. API Configuration**
- **Template**: `js/config/api-config.template.js` (if exists)
- **Real Config**: `js/config/api-config.js` (not in git)
- **Purpose**: General API configuration and keys

## 🚀 **Local Development Setup**

### **Step 1: Copy Template Files**
```bash
# Copy Firebase config template
cp js/config/firebase-config.template.js js/config/firebase-config.js

# Copy Football Web Pages config template
cp js/config/football-webpages-config.template.js js/config/football-webpages-config.js
```

### **Step 2: Update with Real Values**
Edit the copied files and replace placeholder values:

#### **Firebase Config (`js/config/firebase-config.js`)**
```javascript
const firebaseConfig = {
    apiKey: "your_actual_firebase_api_key",
    authDomain: "your_project.firebaseapp.com",
    projectId: "your_project_id",
    storageBucket: "your_project.firebasestorage.app",
    messagingSenderId: "your_messaging_sender_id",
    appId: "your_app_id",
    measurementId: "your_measurement_id"
};
```

#### **Football Web Pages Config (`js/config/football-webpages-config.js`)**
```javascript
const FOOTBALL_WEBPAGES_CONFIG = {
    // ... other config ...
    RAPIDAPI_KEY: 'your_actual_rapidapi_key',
    // ... rest of config ...
};
```

## 🌐 **Production Setup (Netlify)**

### **Environment Variables**
Set these in your Netlify dashboard:

#### **Firebase Variables**
```bash
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id
```

#### **API Keys**
```bash
RAPIDAPI_KEY=your_rapidapi_key
FOOTBALL_DATA_API_KEY=your_football_data_api_key
```

### **Netlify Functions**
The Netlify functions will automatically use these environment variables:

- `netlify/functions/fetch-vidiprinter.js` - Uses `RAPIDAPI_KEY`
- `netlify/functions/fetch-football-data.js` - Uses `FOOTBALL_DATA_API_KEY`

## 🔧 **Development vs Production**

### **Local Development**
- Uses local config files with real API keys
- Direct API calls (may have CORS issues)
- Sample data fallbacks for testing

### **Production (Netlify)**
- Uses environment variables
- Netlify functions proxy API calls (no CORS issues)
- Real API data when keys are configured

## ✅ **Verification**

### **Check API Key Configuration**
```javascript
// In browser console
console.log('Firebase API Key:', window.FOOTBALL_WEBPAGES_CONFIG?.RAPIDAPI_KEY);
console.log('API Key Configured:', window.isAPIKeyConfigured('rapidAPI'));
```

### **Test API Calls**
1. Open Admin Panel
2. Go to Scores tab
3. Try "Import Scores from API"
4. Check console for success/error messages

## 🚨 **Troubleshooting**

### **"API key not configured" Error**
- Check if config files exist
- Verify API keys are not placeholder values
- Ensure environment variables are set in Netlify

### **CORS Errors**
- Local development: Expected, use sample data
- Production: Should not occur with Netlify functions

### **Firebase Connection Issues**
- Verify Firebase config values
- Check Firebase project settings
- Ensure Firebase services are enabled

## 📝 **Notes**

- **Local config files** are for development only
- **Environment variables** are for production
- **Templates** are safe to commit to GitHub
- **Real configs** are excluded via `.gitignore`
- **Netlify functions** handle CORS and API proxying

## 🔗 **Useful Links**

- [Firebase Console](https://console.firebase.google.com/)
- [RapidAPI Dashboard](https://rapidapi.com/dashboard)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/get-started/)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
