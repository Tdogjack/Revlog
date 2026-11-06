# Revlog for iPhone, iPad, and Android

An Expo Router app that talks to the website's `/api/v1` routes. It holds no Supabase key, so every
rule stays on the server. See [docs/mobile-api.md](../docs/mobile-api.md).

## Run it on a phone

1. Install Expo Go on the phone and sign in with a free Expo account.
2. From this folder, install dependencies:

   ```bash
   npm install
   ```

3. To use revlog.me, skip this step. To use a dev server on this computer, copy `.env.example` to
   `.env` and set your computer's LAN address. The phone must be on the same Wi-Fi.
4. Start Expo and scan the QR code (Camera on iPhone, Expo Go on Android):

   ```bash
   npx expo start
   ```

## Checks

```bash
npx tsc --noEmit
```

```bash
npx expo lint
```

```bash
npx expo-doctor
```

`npm run web` opens the app in a browser for layout work. Sign-in doesn't persist there, and the API
blocks browsers from other origins, so it needs a local stand-in for the API.

Mods, parts, scans, and community aren't in the app yet. Community must ship with report, block, and
moderator actions (Apple guideline 1.2). Store submission needs an EAS project first, and nothing
has been submitted.
