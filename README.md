# Aware Mode

A personal, local-first planner built on the "Analog Attack Mode" notes: Attack Today/Tomorrow sheet with predicted vs actual difficulty, the 7/10 progressive overload system, a 30/10 focus timer with Grade 0/1 starters, WOOP planning, a company manual with compliance tracking and regression alerts, factor tracking and a feedback journal. Everything is customizable in Settings.

- No build step: plain HTML, CSS and JavaScript.
- Data stays in the browser (localStorage). Use Settings → Data & backup to export/import.
- Installable as a PWA when served over HTTPS (GitHub Pages). Bump `VERSION` in `sw.js` when you change files.

Run locally: `python3 -m http.server` in this folder, then open http://localhost:8000.

## Android app (APK)

The same app is wrapped with Capacitor in `android/`. Every push to `main` runs `.github/workflows/android.yml`, which builds a signed `AwareMode.apk` and publishes it as a GitHub release.

- Needs two repository secrets: `ANDROID_KEYSTORE_BASE64` (the release keystore, base64) and `ANDROID_KEYSTORE_PASSWORD`. Keep the keystore safe: Android only installs updates signed with the same key.
- Latest APK: https://github.com/rocker256/AwareMode/releases/latest/download/AwareMode.apk
- Local build (needs the Android SDK): `npm ci && npm run sync && cd android && ./gradlew assembleRelease`
