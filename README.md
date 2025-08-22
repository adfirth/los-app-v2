# 🏆 LOS App v2 - Last One Standing Football Fundraiser

A modern, feature-rich web application for managing Last One Standing football fundraisers with real-time updates, multi-club support, and comprehensive admin tools.

## ✨ **Features**

### **🎯 Core Functionality**
- **Multi-Club Support**: Manage multiple football clubs independently
- **Real-Time Updates**: Live score updates and fixture management
- **User Management**: Player registration, authentication, and progress tracking
- **Admin Panel**: Comprehensive administrative tools and oversight
- **Responsive Design**: Mobile-first design for all devices

### **⚽ Football Integration**
- **Live Scores**: Real-time score updates via football APIs
- **Fixture Management**: Automated fixture creation and management
- **Team Badges**: Dynamic team badge loading and caching
- **Vidiprinter**: Live match updates and notifications

### **🔧 Technical Features**
- **CORS-Free API**: Netlify functions for seamless API integration
- **Offline Support**: Service worker for offline functionality
- **Real-Time Database**: Firebase Firestore with live listeners
- **Progressive Web App**: Installable and offline-capable

## 🚀 **Quick Start**

### **Prerequisites**
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Firebase project (for database and authentication)
- RapidAPI account (for football data)
- Netlify account (for deployment)

### **Local Development**
1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/los-app-v2.git
   cd los-app-v2
   ```

2. **Set up configuration files**
   ```bash
   # Copy template files
   cp js/config/firebase-config.template.js js/config/firebase-config.js
   cp js/config/football-webpages-config.template.js js/config/football-webpages-config.js
   
   # Edit with your actual API keys and Firebase config
   ```

3. **Open in browser**
   - Use Live Server extension in VS Code, or
   - Open `index.html` directly in browser

### **Production Deployment**
1. **Connect to Netlify**
   - Link your GitHub repository
   - Set build settings (no build command needed)
   - Deploy

2. **Configure environment variables**
   ```bash
   # Firebase Configuration
   FIREBASE_API_KEY=your_firebase_api_key
   FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   FIREBASE_APP_ID=your_app_id
   FIREBASE_MEASUREMENT_ID=your_measurement_id
   
   # API Keys
   RAPIDAPI_KEY=your_rapidapi_key
   FOOTBALL_DATA_API_KEY=your_football_data_api_key
   ```

## 🏗️ **Architecture**

### **Frontend Structure**
```
js/
├── managers/          # Core business logic managers
├── services/          # Utility services
├── modules/           # Feature modules
├── config/            # Configuration files
└── setup/             # Setup and initialization scripts
```

### **Backend Services**
- **Firebase Firestore**: Real-time database
- **Firebase Auth**: User authentication
- **Netlify Functions**: API proxy and CORS handling
- **Service Worker**: Offline functionality

### **Key Components**
- **AdminManager**: Administrative operations
- **ScoresManager**: Score updates and API integration
- **FixtureManagementManager**: Fixture creation and management
- **TeamBadgeService**: Team badge management
- **AuthManager**: User authentication and authorization

## 🔌 **API Integration**

### **Football Data Sources**
- **RapidAPI (Football Web Pages)**: Live scores and fixtures
- **Football-Data.org**: Match data and statistics
- **Netlify Functions**: CORS-free API access

### **Data Flow**
1. **Client Request** → Netlify Function
2. **Function** → External API (with API key)
3. **Response** → Client (CORS-free)
4. **Data Processing** → Firebase Database
5. **Real-Time Updates** → All connected clients

## 🎨 **UI/UX Features**

### **Design Principles**
- **Mobile-First**: Responsive design for all screen sizes
- **Accessibility**: WCAG compliant interface
- **Modern Aesthetics**: Clean, professional appearance
- **Intuitive Navigation**: User-friendly interface design

### **Key UI Components**
- **Admin Panel**: Comprehensive management interface
- **Score Display**: Real-time score updates
- **User Dashboard**: Player progress tracking
- **Responsive Tables**: Mobile-optimized data display

## 🔒 **Security Features**

### **Authentication & Authorization**
- **Firebase Auth**: Secure user authentication
- **Role-Based Access**: Admin, club admin, and user roles
- **Secure Rules**: Firestore security rules
- **API Key Protection**: Environment variable configuration

### **Data Protection**
- **Input Validation**: Client and server-side validation
- **XSS Prevention**: Secure data handling
- **CORS Protection**: Controlled cross-origin access

## 📱 **Progressive Web App**

### **PWA Features**
- **Offline Support**: Service worker caching
- **Installable**: Add to home screen
- **Push Notifications**: Real-time updates
- **Background Sync**: Data synchronization

## 🚀 **Deployment**

### **Netlify Configuration**
```toml
# netlify.toml
[build]
  publish = "."
  functions = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### **Environment Setup**
- **Development**: Local config files with API keys
- **Production**: Environment variables in Netlify
- **Staging**: Separate Netlify site for testing

## 🧪 **Testing**

### **Local Testing**
- **Console Testing**: Built-in test functions
- **Sample Data**: Development fallbacks
- **Error Handling**: Comprehensive error logging

### **Production Testing**
- **Real API Integration**: Live football data
- **User Acceptance**: Multi-user testing
- **Performance Monitoring**: Netlify analytics

## 📚 **Documentation**

### **Available Guides**
- [Configuration Setup](CONFIGURATION_SETUP.md)
- [Fixture Management](FIXTURE_MANAGEMENT_README.md)
- [Score Management](SCORE_MANAGEMENT_README.md)
- [Team Badges](TEAM_BADGES_README.md)
- [Local Development](LOCAL_DEVELOPMENT_SETUP.md)

### **API Documentation**
- **Netlify Functions**: API proxy endpoints
- **Firebase Integration**: Database and auth setup
- **Football APIs**: Data source configuration

## 🤝 **Contributing**

### **Development Workflow**
1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Submit** a pull request

### **Code Standards**
- **ES6+**: Modern JavaScript features
- **Modular Design**: Clean separation of concerns
- **Error Handling**: Comprehensive error management
- **Documentation**: Clear code comments

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **Firebase**: Backend services and real-time database
- **Netlify**: Hosting and serverless functions
- **RapidAPI**: Football data integration
- **Football-Data.org**: Match statistics and data

## 📞 **Support**

### **Getting Help**
- **Documentation**: Check the README files
- **Issues**: Report bugs on GitHub
- **Discussions**: Use GitHub Discussions for questions

### **Contact**
- **GitHub Issues**: [Report Issues](https://github.com/yourusername/los-app-v2/issues)
- **Documentation**: [Full Documentation](https://github.com/yourusername/los-app-v2/wiki)

---

**Built with ❤️ for football communities everywhere**

*Last One Standing - The ultimate football fundraiser experience*
