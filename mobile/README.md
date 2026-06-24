# MarinaHub Mobile Application

This directory contains the mobile application for **MarinaHub**, built using **React Native** and **Expo** (SDK 56). 

The mobile application utilizes Expo prebuild to generate native Android and iOS projects, allowing you to build and run the application natively on both platforms.

---

## Prerequisites

Before building the app, make sure your development machine meets the following requirements:

### General
*   **Node.js**: `v18` or `v20` (recommended)
*   **Package Manager**: `npm` (with `package-lock.json` present)

### For Android Build
*   **Android Studio**: Installed and configured.
*   **Android SDK**: SDK 34 or higher, Android SDK Platform-Tools, and Build-Tools installed.
*   **Java Development Kit (JDK)**: JDK 17 (required for newer Gradle versions used in React Native).
*   **Environment Variables**: Ensure `ANDROID_HOME` is set in your shell profile (e.g., `~/.zshrc` or `~/.bash_profile`):
    ```bash
    export ANDROID_HOME=$HOME/Library/Android/sdk
    export PATH=$PATH:$ANDROID_HOME/emulator
    export PATH=$PATH:$ANDROID_HOME/platform-tools
    ```

### For iOS Build (macOS only)
*   **Xcode**: Version 15 or higher.
*   **Xcode Command Line Tools**: Installed via `xcode-select --install`.
*   **CocoaPods**: Installed on your system (e.g., via `brew install cocoapods` or `sudo gem install cocoapods`).

---

## 🛠️ Generating Native Directories (Expo Prebuild)

If the native `ios` or `android` folders are ever deleted or need to be regenerated from scratch, run the following commands in the `mobile/` directory:

### Generate both Android & iOS folders
```bash
npx expo prebuild
```

### Generate only iOS folders
```bash
npx expo prebuild --platform ios
```

### Generate only Android folders
```bash
npx expo prebuild --platform android
```

> [!NOTE]
> The configuration for the generated projects is controlled by the [app.config.js](file:///Users/adityachauhan/Desktop/AdityaChauhan/BraveBrowser/Website/MarinaHub/mobile/app.config.js) file. Changing credentials, names, or adding Expo plugins in `app.config.js` requires running the prebuild command again (with the `--clean` flag if you want to wipe and regenerate existing directories).

---

## 🤖 Android Manual & CLI Build Process

### Running on Simulator or Connected Device (CLI)
1. Ensure your emulator is running or an Android device is connected via USB with USB debugging enabled.
2. Run the start command:
   ```bash
   npm run android
   ```
   *(This executes `npx expo run:android` which compiles the app and installs it on the active device.)*

### Manual Build via Android Studio
1. Launch **Android Studio**.
2. Select **Open an Existing Project** and open the `/mobile/android` folder.
3. Wait for Gradle sync to complete.
4. **Keystore Configuration (for release)**:
   *   Generate a keystore file if you don't have one:
       ```bash
       keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
       ```
   *   Place it in `mobile/android/app/` and configure your `signingConfigs` in `mobile/android/app/build.gradle`.
5. **Build APK / App Bundle**:
   *   In the Android Studio menu, go to **Build** > **Generate Signed Bundle / APK**.
   *   Choose **APK** (for testing/sharing) or **Android App Bundle (AAB)** (for Google Play Store upload).
   *   Follow the prompts to select your keystore, enter credentials, and compile the build.
   *   The compiled output will be located in: `mobile/android/app/build/outputs/apk/release/` or `mobile/android/app/build/outputs/bundle/release/`.

---

## 🍎 iOS Manual & CLI Build Process

### Running on Simulator or Connected Device (CLI)
1. Ensure CocoaPods dependencies are installed:
   ```bash
   cd ios && pod install && cd ..
   ```
2. Run the start command:
   ```bash
   npm run ios
   ```
   *(This executes `npx expo run:ios` which compiles the app and launches it in the iOS Simulator.)*

### Manual Build via Xcode
1. Navigate to the `mobile/ios/` directory.
2. Open the Xcode Workspace file (do **NOT** open the `.xcodeproj` file directly):
   ```bash
   open mobile/ios/MarinaBooking.xcworkspace
   ```
3. **Configure Signing & Capabilities**:
   *   Select the root project node `MarinaBooking` in the left sidebar.
   *   Select the target `MarinaBooking` under **Targets**.
   *   Go to the **Signing & Capabilities** tab.
   *   Select your developer **Team** and update the **Bundle Identifier** (default is `com.marinahub.app` as defined in `app.config.js`).
4. **Run on Simulator / Device**:
   *   Select your target simulator or connected iOS device in the top scheme bar.
   *   Click the **Play (Run)** button or press `Cmd + R` to compile and launch.
5. **Generate a Release IPA (Archive)**:
   *   Select **Any iOS Device (arm64)** as the target build destination in the scheme bar.
   *   Go to the menu **Product** > **Archive**.
   *   Once archiving is complete, the **Organizer** window will open.
   *   Click **Distribute App** to upload to App Store Connect / TestFlight or export as an Ad-Hoc/Development `.ipa` file.

---

## 🔍 Troubleshooting

### Gradle Build Fails (Android)
*   Ensure your `JDK` is version 17. Run `java -version` to verify.
*   Clear the Gradle cache and build outputs:
    ```bash
    cd android && ./gradlew clean && cd ..
    ```

### CocoaPods / Pod Install Fails (iOS)
*   Ensure CocoaPods is installed and up-to-date.
*   Try re-installing pods cleanly:
    ```bash
    cd ios
    rm -rf Pods Podfile.lock
    pod deintegrate
    pod install
    cd ..
    ```

### Env Variables / Maps API Keys Missing
*   Make sure you have configured your environment variables in `.env` in the `mobile` directory.
*   The Google Maps API key is populated from `process.env.GOOGLE_MAPS_API_KEY` during the prebuild step. Ensure this key is set before running `npx expo prebuild`.
