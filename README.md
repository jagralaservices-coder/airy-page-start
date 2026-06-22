# PayStore POS

## Restaurant & Retail Point of Sale System

A comprehensive POS system for restaurants and retail businesses with features like:

- 📱 Multi-platform support (Android, iOS, Windows, Web)
- 💳 Multiple payment methods
- 📊 Real-time analytics and reports
- 👥 Staff management with attendance tracking
- 📦 Inventory management
- 🔒 Role-based access control
- 📶 Offline-first architecture

## Getting Started

### Prerequisites
- Node.js 18+ with npm
- Android Studio (for Android builds)
- Xcode (for iOS builds, macOS only)

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production

```sh
# Build web app
npm run build

# Sync with native platforms
npx cap sync

# Build Android APK
cd android && ./gradlew assembleDebug
```

## Technologies Used

- React + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Capacitor (for native apps)
- PWA support for offline functionality

## License

Proprietary - All rights reserved
