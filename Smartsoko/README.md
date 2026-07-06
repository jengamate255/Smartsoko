# Smartsoko - React Native Expo App

A complete React Native mobile app built with Expo, TypeScript, and Supabase.

## Features

- Authentication flow (Login, Register, persistent session)
- Main App Tabs:
  - Home (product feed)
  - Search
  - Post Product
  - Chat
  - Profile
- Product system:
  - Create, edit, delete listings
  - Upload multiple images
  - Store in Supabase
- Real-time chat between users
- Notifications system (in-app)

## Project Structure

`
smartsoko/
+-- assets/                 # Static assets (images, icons, etc.)
+-- components/             # Reusable components
+-- features/               # Feature-based modules
¦   +-- auth/               # Authentication screens
¦   +-- home/               # Home feed screens
¦   +-- search/             # Search functionality
¦   +-- postProduct/        # Product creation screens
¦   +-- chat/               # Chat functionality
¦   +-- profile/            # User profile screens
+-- hooks/                  # Custom React hooks
+-- navigation/             # Navigation configuration
+-- services/               # API services (Supabase)
+-- store/                  # State management (Zustand)
+-- App.tsx                 # Main app entry point
+-- package.json            # Dependencies and scripts
+-- tsconfig.json           # TypeScript configuration
`

## Setup Instructions

1. Navigate to the project directory
2. Install dependencies with npm install
3. Configure Supabase in services/supabase.ts
4. Run with npm start

## Technology Stack

- React Native with Expo
- TypeScript
- Zustand for state management
- React Navigation
- Supabase backend

