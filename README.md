# LOS App - Last One Standing Football Game

A web-based football prediction game where players pick one team per gameweek for 10 Game Weeks. If their team wins, they survive; if they lose or draw, they lose a life. The last player standing wins.

## 🚀 Features

- **User Authentication**: Secure login/registration with Firebase Auth
- **Multiple Editions**: Support for different competitions
- **Real-time Updates**: Live standings and score updates
- **Auto-pick System**: Automatic team assignment for missed deadlines
- **Mobile Responsive**: Works perfectly on desktop and mobile devices
- **Admin Panel**: Comprehensive admin tools for managing the competition
- **Deadline Management**: Automatic deadline checking and enforcement
- **Pick History**: Track all player picks and results
- **Live Scores**: Real-time score updates and results processing

## 🏗️ Architecture

### Frontend Stack
- **HTML5/CSS3/JavaScript** (Vanilla JS, no frameworks)
- **Responsive Design** with mobile-first approach
- **Modular Architecture** with separate managers for different functionalities
- **Firebase Integration** for real-time data

### Backend/Database
- **Firebase Firestore** for data storage
- **Firebase Authentication** for user management
- **Real-time listeners** for live updates

### Key Modules/Managers
1. **AuthManager** - User authentication and session management
2. **EditionService** - Manages multiple competition editions
3. **FixturesManager** - Handles fixture loading and display
4. **ScoresManager** - Manages live scores and results
5. **GameLogicManager** - Core game mechanics and pick management
6. **PickStatusService** - Player status and lives tracking
7. **DeadlineService** - Deadline checking and auto-pick assignment
8. **AdminManager** - Administrative functions and user management

## 📁 Project Structure

```
LOS App v2/
├── index.html                 # Main HTML file
├── css/
│   ├── styles.css            # Main stylesheet
│   └── components.css        # Component-specific styles
├── js/
│   ├── config/
│   │   └── firebase-config.js # Firebase configuration
│   ├── managers/
│   │   ├── AuthManager.js     # Authentication management
│   │   ├── EditionService.js  # Edition management
│   │   ├── FixturesManager.js # Fixture handling
│   │   ├── ScoresManager.js   # Score management
│   │   ├── GameLogicManager.js # Core game logic
│   │   ├── PickStatusService.js # Pick tracking
│   │   ├── DeadlineService.js # Deadline management
│   │   └── AdminManager.js    # Admin functions
│   └── app.js                # Main application file
├── images/                   # App images and assets
└── README.md                # This file
```

## 🛠️ Setup Instructions

### Prerequisites
- A Firebase project with Firestore and Authentication enabled
- A web server (local or hosted)

### 1. Firebase Setup

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Firestore Database
   - Enable Authentication (Email/Password)

2. **Configure Firestore Rules**:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Users can read/write their own data
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       
       // Users can read fixtures and settings
       match /fixtures/{document} {
         allow read: if request.auth != null;
       }
       
       match /settings/{document} {
         allow read: if request.auth != null;
       }
       
       // Users can read/write their own picks
       match /picks/{pickId} {
         allow read, write: if request.auth != null && 
           resource.data.userId == request.auth.uid;
       }
       
       // Admin access (you'll need to set up admin users)
       match /{document=**} {
         allow read, write: if request.auth != null && 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
       }
     }
   }
   ```

3. **Update Firebase Configuration**:
   - Open `js/config/firebase-config.js`
   - Replace the placeholder values with your actual Firebase project credentials:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_ACTUAL_API_KEY",
       authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
       projectId: "YOUR_ACTUAL_PROJECT_ID",
       storageBucket: "YOUR_PROJECT_ID.appspot.com",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_ACTUAL_APP_ID"
   };
   ```

### 2. Local Development

1. **Clone or download the project files**

2. **Set up a local web server**:
   - **Using Python**:
     ```bash
     # Python 3
     python -m http.server 8000
     
     # Python 2
     python -m SimpleHTTPServer 8000
     ```
   
   - **Using Node.js**:
     ```bash
     npx http-server
     ```
   
   - **Using PHP**:
     ```bash
     php -S localhost:8000
     ```

3. **Open the application**:
   - Navigate to `http://localhost:8000` in your browser
   - The app should load and show the authentication screen

### 3. Initial Setup

1. **First Login**: Register as the first user
2. **Set Admin Status**: In Firebase Console, manually set `isAdmin: true` for your user document
3. **Configure Settings**: Use the admin panel to set up competition settings

## 🎮 How to Play

### For Players
1. **Register/Login**: Create an account or sign in
2. **Make Picks**: Select one team per gameweek from available fixtures
3. **Track Progress**: Monitor your lives and standings
4. **Stay Alive**: Don't pick the same team twice and avoid losses/draws

### For Admins
1. **Manage Users**: View all players, reset lives, delete users
2. **Manage Fixtures**: Add, edit, or remove fixtures for each gameweek
3. **Update Scores**: Enter match results and process gameweek outcomes
4. **Configure Settings**: Set current gameweek, registration status, etc.

## 🔧 Configuration

### Game Settings
- **Lives per Player**: Default is 2 (configurable per edition)
- **Total Gameweeks**: Default is 10 (configurable per edition)
- **Auto-pick Rules**: 
  - GW1: Random allocation
  - GW2+: Next team alphabetically after previous pick

### Database Collections
- `users`: Player profiles and picks
- `fixtures`: Game fixtures by edition and gameweek
- `picks`: Individual pick records for analytics
- `settings`: App configuration and competition settings

## 🚀 Deployment

### Option 1: Firebase Hosting (Recommended)
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
4. Deploy: `firebase deploy`

### Option 2: Netlify
1. Connect your repository to Netlify
2. Set build command to none (static site)
3. Deploy automatically

### Option 3: Vercel
1. Connect your repository to Vercel
2. Deploy as a static site
3. Configure environment variables if needed

## 🔒 Security Considerations

- All Firebase rules are configured for security
- User data is isolated by user ID
- Admin functions require proper authentication
- Input validation is implemented throughout the app

## 🐛 Troubleshooting

### Common Issues

1. **Firebase Connection Errors**:
   - Check your Firebase configuration in `firebase-config.js`
   - Ensure your Firebase project has the correct services enabled

2. **Authentication Issues**:
   - Verify Email/Password authentication is enabled in Firebase
   - Check Firestore rules for authentication requirements

3. **Real-time Updates Not Working**:
   - Ensure Firestore is properly configured
   - Check browser console for connection errors

4. **Admin Panel Not Showing**:
   - Verify your user has `isAdmin: true` in the database
   - Check browser console for errors

### Debug Mode
Open browser console (F12) to see detailed logs and error messages.

## 📱 Mobile Support

The app is fully responsive and works on:
- iOS Safari
- Android Chrome
- All modern mobile browsers

## 🔄 Updates and Maintenance

### Regular Tasks
- Monitor Firebase usage and costs
- Update fixtures and scores regularly
- Process gameweek results after matches
- Backup important data

### Adding New Features
The modular architecture makes it easy to add new features:
1. Create new manager classes in `js/managers/`
2. Add corresponding UI elements in `index.html`
3. Update styles in `css/` files
4. Integrate with existing managers

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Firebase documentation
3. Check browser console for error messages
4. Verify all configuration steps are completed

## 📄 License

This project is open source and available under the MIT License.

---

**Happy Gaming! 🏆**
