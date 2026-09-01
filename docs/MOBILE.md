# Mobile app (iOS & Android)

The store apps are the same React build wrapped with [Capacitor](https://capacitorjs.com).
There is one codebase: everything in `src/` runs on the web, in the PWA and inside the
native shells. Native-only behaviour is isolated in two files:

| File | Purpose |
|------|---------|
| `src/lib/nativeStorage.ts` | Mirrors the persisted store into an app-private file and restores it from there when localStorage is empty. WebView storage can be wiped by the OS; the file cannot. |
| `src/lib/native.ts` | Android back button: closes open dialogs, walks the router history, exits only from the dashboard. |

Both are no-ops in the browser (`Capacitor.isNativePlatform()` is false there).

## Prerequisites

| Target | Needs |
|--------|-------|
| Android | JDK 21, Android Studio (or the SDK + `ANDROID_HOME`) |
| iOS | macOS with Xcode 16+, CocoaPods (`sudo gem install cocoapods`) |
| Both | Node 22+, `npm ci` |

## Everyday workflow

```bash
npm run build:native      # tsc + vite build + cap sync (copies dist/ into android/ and ios/)
npm run cap:android       # build + open in Android Studio
npm run cap:ios           # build + open in Xcode (macOS only)
npm run cap:run:android   # build + install on a connected device / emulator
```

Live reload against the dev server: start `npm run dev -- --host`, then set
`server.url` in `capacitor.config.ts` to `http://<your-lan-ip>:5173` temporarily
and run `npx cap sync`. Never commit that URL.

## What is committed, what is generated

`android/` and `ios/` are committed (native config, icons, splash screens).
The copied web bundle (`android/app/src/main/assets/public`, `ios/App/App/public`)
and the generated `capacitor.config.json` are git-ignored and recreated by `cap sync`.

Icons and splash screens are generated from `assets/logo.svg`:

```bash
npx @capacitor/assets generate --android --ios \
  --iconBackgroundColor '#15803d' --iconBackgroundColorDark '#15803d' \
  --splashBackgroundColor '#f0fdf0' --splashBackgroundColorDark '#14532d'
rm -rf icons public/manifest.webmanifest   # the tool also emits PWA files we do not use
```

## Identifiers

| | Value |
|-|-------|
| App ID / bundle ID | `io.github.mniedermaier.gardener` |
| App name | Gardener |
| Android `minSdk` | 24 (Android 7) |

Change the version in `android/app/build.gradle` (`versionCode`, `versionName`)
and in Xcode (General → Identity) before each store upload. `versionCode` must
strictly increase.

## Backend sync from the app

The native app runs from `https://localhost`, so a self-hosted backend must
allow that origin in CORS. Plain `http://` backends work on Android only when
`android.allowMixedContent` is enabled — prefer HTTPS.

## Store release checklist

### Google Play (25 USD once)

1. Create the app in the Play Console, package name `io.github.mniedermaier.gardener`.
2. Generate an upload keystore once and keep it out of git:
   `keytool -genkey -v -keystore gardener-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000`
3. Add `android/keystore.properties` (git-ignored) and the signing config in
   `android/app/build.gradle`, then `cd android && ./gradlew bundleRelease`.
4. Upload `app/build/outputs/bundle/release/app-release.aab`.
5. Listing: title, short + full description in DE/EN/ES/FR, 2–8 phone screenshots
   per language, 512×512 icon, 1024×500 feature graphic.
6. Data safety form: "No data collected, no data shared" — everything stays on
   the device (optional weather requests go to OpenWeatherMap with the user's own key).
7. Privacy policy URL: `https://mniedermaier.github.io/gardener/privacy.html`.

### Apple App Store (99 USD / year)

1. Enroll in the Apple Developer Program, create the bundle ID and an App Store
   Connect record.
2. `npm run cap:ios`, set the Team in Signing & Capabilities, bump version/build.
3. Product → Archive → Distribute to App Store Connect.
4. Screenshots for 6.7" and 6.5" iPhones (iPad only if the iPad checkbox is on).
5. App Privacy: "Data Not Collected". Privacy policy URL as above.
6. Review notes: the app has no login; mention that all data is local and that
   the weather feature needs a user-supplied OpenWeatherMap key.

### Both

- Age rating: everyone.
- Export compliance: uses only standard HTTPS → "no" to custom encryption.
- Keep the PWA at `mniedermaier.github.io/gardener` as the web entry; the stores
  are additional channels, not replacements.

## Known limits

- Service workers do not run inside the iOS WebView; the bundle is local anyway,
  so nothing is lost.
- Journal photos stay in IndexedDB. If that ever proves flaky on a device, move
  them to `Filesystem` the same way `nativeStorage.ts` handles the store.
- `cap add ios` was run on Linux; the first `pod install` happens on the Mac when
  the project is opened.
