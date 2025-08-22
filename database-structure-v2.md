# LOS App Database Structure v2 - Multi-Club Support

## Overview
This document outlines the recommended Firebase Firestore database structure for supporting multiple Last One Standing fundraisers across different clubs within a single application.

## Database Structure

### Root Collections

```
/clubs/{clubId}/
├── /editions/{editionId}/
│   ├── /fixtures/{gameweekId}/
│   ├── /picks/{pickId}/
│   ├── /users/{userId}/
│   └── /settings/
├── /club-info/
└── /global-settings/
```

### Collection Details

#### 1. `/clubs/{clubId}/club-info`
```javascript
{
  clubId: "altrincham-fc-juniors",
  name: "Altrincham FC Juniors",
  description: "Junior football club based in Altrincham",
  logo: "https://...",
  primaryColor: "#1e40af",
  secondaryColor: "#fbbf24",
  contactEmail: "admin@altrinchamfcjuniors.com",
  website: "https://altrinchamfcjuniors.com",
  isActive: true,
  created_at: timestamp,
  updated_at: timestamp
}
```

#### 2. `/clubs/{clubId}/editions/{editionId}`
```javascript
{
  editionId: "2025-26-season-1",
  name: "Altrincham FC Juniors LOS - Season 1",
  description: "First edition of the 2025/26 National League season",
  competition: "National League",
  season: "2025-26",
  editionNumber: 1,
  totalEditions: 4,
  startDate: "2025-08-01",
  endDate: "2025-12-15",
  maxLives: 2,
  totalGameweeks: 10,
  currentGameweek: 1,
  registrationOpen: true,
  isActive: true,
  created_at: timestamp,
  updated_at: timestamp
}
```

#### 3. `/clubs/{clubId}/editions/{editionId}/users/{userId}`
```javascript
{
  uid: "user123",
  displayName: "John Doe",
  email: "john@example.com",
  lives: 2, // Lives for THIS specific edition
  picks: {
    gw1: "Arsenal",
    gw2: "Chelsea",
    gw3: "Liverpool"
  },
  registeredAt: timestamp,
  lastPickAt: timestamp,
  isActive: true,
  isEliminated: false,
  eliminationGameweek: null,
  finalPosition: null,
  created_at: timestamp,
  updated_at: timestamp
}
```

#### 4. `/clubs/{clubId}/editions/{editionId}/fixtures/{gameweekId}`
```javascript
{
  gameweekId: "gw1",
  gameweek: 1,
  fixtures: [
    {
      fixtureId: "fixture1",
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      date: "2025-08-15",
      kickOffTime: "15:00:00",
      homeScore: null,
      awayScore: null,
      status: "scheduled", // scheduled, live, completed, postponed
      result: null, // win, draw, loss
      winner: null
    }
  ],
  deadline: "2025-08-15T14:30:00Z",
  isLocked: false,
  created_at: timestamp,
  updated_at: timestamp
}
```

#### 5. `/clubs/{clubId}/editions/{editionId}/picks/{pickId}`
```javascript
{
  pickId: "pick123",
  userId: "user123",
  teamPicked: "Arsenal",
  gameweek: 1,
  fixtureId: "fixture1",
  isAutopick: false,
  result: "win", // win, draw, loss
  livesAfterPick: 2,
  savedAt: timestamp,
  processedAt: timestamp
}
```

#### 6. `/clubs/{clubId}/editions/{editionId}/settings`
```javascript
{
  currentGameweek: 1,
  gameweekDeadline: "2025-08-15T14:30:00Z",
  tiebreakEnabled: true,
  autoPickEnabled: true,
  autoPickAlgorithm: "alphabetical", // random, alphabetical, etc.
  registrationOpen: true,
  maxLives: 2,
  totalGameweeks: 10,
  created_at: timestamp,
  updated_at: timestamp
}
```

#### 7. `/global-settings`
```javascript
{
  activeClubs: ["altrincham-fc-juniors", "timperley-fc"],
  defaultSettings: {
    maxLives: 2,
    totalGameweeks: 10,
    autoPickEnabled: true
  },
  systemConfig: {
    maintenanceMode: false,
    version: "2.0.0"
  },
  created_at: timestamp,
  updated_at: timestamp
}
```

## Data Relationships

### Club Selection
- Users select a club when registering
- All subsequent operations are scoped to that club
- Users can participate in multiple clubs but data is isolated

### Edition Management
- Each club can have multiple editions per season
- Editions are completely independent
- Users register for specific editions within a club

### User Isolation
- User data is stored per edition, not globally
- Same email can exist across multiple clubs/editions
- Lives and picks are edition-specific

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data within their club/edition
    match /clubs/{clubId}/editions/{editionId}/users/{userId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == userId || 
         request.auth.token.admin == true ||
         request.auth.token.clubAdmin == clubId);
    }
    
    // Users can read fixtures and settings for their club/edition
    match /clubs/{clubId}/editions/{editionId}/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.token.admin == true ||
         request.auth.token.clubAdmin == clubId);
    }
    
    // Club admins can manage their club data
    match /clubs/{clubId}/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.token.admin == true ||
         request.auth.token.clubAdmin == clubId);
    }
  }
}
```

## Migration Strategy

### Phase 1: Structure Setup
1. Create new club-based collections
2. Migrate existing data to new structure
3. Update application code to use new paths

### Phase 2: Club Management
1. Add club selection interface
2. Implement club-specific styling
3. Add club admin functionality

### Phase 3: Multi-Edition Support
1. Support multiple editions per club
2. Edition switching interface
3. Cross-edition analytics

## Benefits

1. **Scalability**: Easy to add new clubs without code changes
2. **Isolation**: Complete data separation between clubs
3. **Flexibility**: Each club can have different rules, styling, and editions
4. **Maintenance**: Single codebase, easier updates and bug fixes
5. **Cost**: Single Firebase project, shared resources
6. **Consistency**: Same user experience across all clubs
