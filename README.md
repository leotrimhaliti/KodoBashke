# ProjectMatch - Find Your Next Co-Founder

A Tinder-style matching app for developers to find project partners and co-founders. Built with React Native, Expo, and Supabase.

## Features

- 🔐 User authentication with Supabase
- 👤 Rich user profiles with skills, interests, and links
- 💳 Tinder-style swipe interface
- 💬 Real-time chat between matches
- ⚡ Instant match notifications
- 📱 Cross-platform (iOS, Android, Web)

## Tech Stack

- **Frontend**: React Native with Expo Go
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **Navigation**: React Navigation (Stack & Bottom Tabs)
- **State Management**: React Context API

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor
3. Get your project URL and anon key from Settings > API

### 3. Configure Supabase

Edit `lib/supabase.js` and replace the placeholders:

```javascript
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
```

### 4. Run the App

```bash
# Start Expo development server
npm start

# Or run on specific platform
npm run android  # For Android
npm run ios      # For iOS (Mac only)
npm run web      # For Web
```

### 5. Test with Expo Go

1. Install Expo Go on your phone from the App Store or Play Store
2. Scan the QR code shown in your terminal
3. The app will load on your device

## Database Schema

### Tables

- **profiles**: User profiles with bio, skills, interests, and links
- **swipes**: Records of who swiped on whom (like/pass)
- **matches**: Created automatically when both users like each other
- **messages**: Chat messages between matched users

### Key Features

- Row Level Security (RLS) policies for data protection
- Automatic match creation via database trigger
- Real-time subscriptions for messages and matches
- Indexed queries for optimal performance

## App Structure

```
├── screens/
│   ├── AuthScreen.js          # Login/Signup
│   ├── ProfileSetupScreen.js  # Create/Edit profile
│   ├── SwipeScreen.js         # Main swipe interface
│   ├── MatchesScreen.js       # List of matches
│   ├── ChatScreen.js          # Chat with a match
│   └── ProfileScreen.js       # View own profile
├── contexts/
│   └── AuthContext.js         # Authentication state
├── navigation/
│   └── Navigation.js          # App navigation structure
├── lib/
│   └── supabase.js           # Supabase client config
└── App.js                    # Root component
```

## How to Use

1. **Sign Up**: Create an account with email and password
2. **Create Profile**: Fill in your name, bio, skills, and project interests
3. **Swipe**: Browse other developers and swipe right to like, left to pass
4. **Match**: When both users like each other, you get a match!
5. **Chat**: Message your matches to discuss potential projects

## Customization Ideas

- Add photo upload functionality
- Implement project proposal features
- Add filters by skills or location
- Create group matching for teams
- Add video call integration
- Implement profile verification

## Environment

- React Native: 0.81.5
- Expo SDK: ~54.0
- React Navigation: 7.x
- Supabase JS: 2.x

## Development Notes

- The app uses Supabase's built-in auth system
- Real-time features use Supabase Realtime subscriptions
- All database operations use Supabase's JavaScript client
- Row Level Security ensures users can only access their own data

## License

MIT

## Contributing

Feel free to submit issues and pull requests!
