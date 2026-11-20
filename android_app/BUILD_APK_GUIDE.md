# Sobdosuddhi 1.0 — Android APK Build & Deployment Guide

This folder (`android_app/`) contains the complete, native **Flutter + Material Design 3 Android application** for **Sobdosuddhi 1.0** (`applicationId: com.sobdosuddhi.app`, `versionName: 1.0.0`).

> **Why is the APK built outside AI Studio?**
> The AI Studio cloud sandbox runs a Linux Node.js runtime without the Flutter SDK, Android SDK, or Java JDK 17 installed. You can build an installable `.apk` in **under 5 minutes** either on your computer or automatically in the cloud via GitHub Actions / Codemagic.

---

## Option 1: Build APK Locally (Android Studio / Flutter CLI)

### Prerequisites
1. **Flutter SDK** (3.24 or newer) — https://docs.flutter.dev/get-started/install
2. **Android Studio** with **Android SDK Platform 34** and **Android SDK Build-Tools**
3. **Java JDK 17** (bundled with Android Studio)

### Step-by-Step Build Commands
```bash
cd android_app
flutter doctor
flutter pub get

# 1. Build Debug APK (for immediate testing on any Android device)
flutter build apk --debug
# Output: android_app/build/app/outputs/flutter-apk/app-debug.apk

# 2. Build Release APK (optimized, minified, production-ready)
flutter build apk --release
# Output: android_app/build/app/outputs/flutter-apk/app-release.apk
```

### Custom Backend URL (Optional)
No Gemini API keys are stored inside the APK. By default, the app connects securely to your deployed Sobdosuddhi backend. To point the APK at a different backend URL:
```bash
flutter build apk --release --dart-define=API_BASE_URL=https://your-backend-domain.run.app
```

---

## Option 2: Zero-Setup Cloud APK Build (GitHub Actions)
A ready-to-use workflow is already included at `/.github/workflows/build-android-apk.yml`.
1. Push this project to a GitHub repository.
2. Open the **Actions** tab → select **Build Sobdosuddhi 1.0 Android APK** → click **Run workflow**.
3. Download both `app-debug.apk` and `app-release.apk` directly from the workflow **Artifacts** section and install on your Android phone.

---

## Option 3: Production Keystore Signing (For Google Play Store)
1. Generate a signing key:
   ```bash
   keytool -genkey -v -keystore android_app/android/upload-keystore.jks \
     -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
2. Create `android_app/android/key.properties` (do NOT commit this file to git):
   ```properties
   storePassword=YOUR_STORE_PASSWORD
   keyPassword=YOUR_KEY_PASSWORD
   keyAlias=upload
   storeFile=../upload-keystore.jks
   ```
3. Run:
   ```bash
   flutter build apk --release
   # Or for Google Play Store App Bundle:
   flutter build appbundle --release
   ```
