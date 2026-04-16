# productspan

A mobile app for tracking consumable household and personal care items — inspired by the "hitting pan" concept of using products all the way to the end. productspan helps you stay on top of what you have, what you're using, and what's running out.

Built with React Native and Expo, with all data stored locally on-device using SQLite.

## Features

- Browse your products in a visual grid
- Organise products by category
- Filter the grid by one or more categories
- Long-press to enter multi-select mode, then delete items in bulk
- Attach photos to products using your camera or photo library
- All data is stored offline — no account or internet connection required

## Requirements

- [Node.js](https://nodejs.org/) 18 or later
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)
- For iOS: Xcode and an Apple Developer account (or Expo Go)
- For Android: Android Studio or a physical device with Expo Go

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm start
```

Then scan the QR code with [Expo Go](https://expo.dev/go) on your device, or press `a` for Android / `i` for iOS to open in a simulator.

## Running on a specific platform

```bash
npm run android   # Android emulator or connected device
npm run ios       # iOS simulator (macOS only)
npm run web       # Web browser
```

## Building a standalone app (no Expo Go required)

Two options for installing the app directly on your phone as a normal app.

### Option A — EAS Build (cloud, no Android Studio needed)

Builds in Expo's cloud and gives you a download link. Requires a free [Expo account](https://expo.dev).

```bash
npm install -g eas-cli
eas login
eas build:configure   # first time only — creates eas.json
```

Make sure `eas.json` has a `preview` profile that outputs an APK:

```json
{
  "build": {
    "preview": {
      "android": { "buildType": "apk" }
    }
  }
}
```

```bash
eas build --platform android --profile preview
```

When the build finishes (~10–15 min), download the `.apk` from the link provided.

### Option B — Local build with Android Studio

Requires [Android Studio](https://developer.android.com/studio) installed (includes the Android SDK and Java 17).

```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

The APK is output to `android/app/build/outputs/apk/release/app-release.apk`.

### Installing the APK on your phone

Transfer the APK to your phone via USB cable, Google Drive, OneDrive, or email, then tap the file to install. On first install Android will prompt you to allow installation from unknown sources — tap **Settings → Allow from this source**.

---

## Running Tests

```bash
npx jest
```

## License

MIT — see [LICENSE](LICENSE).
