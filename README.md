# Kova: cards, bills and garage (personal build)

A private Android app (React Native / Expo) for keeping track of credit card dues, bills, vehicles and bank balances. Built for personal use: no account, no server, and everything stays encrypted on your phone.

## Install

Every push to `main` builds an APK with GitHub Actions. Download it from the repo's **Releases** page on your Android phone and install it (allow "Install unknown apps"). It's signed with the debug key, which is fine for sideloading but not for the Play Store.

**Play Protect in India blocks the install** because Kova asks for SMS access (Google's "enhanced fraud protection" blocks sideloaded apps that request READ_SMS). To install your own build: Play Store → profile → Play Protect → ⚙️ → turn off "Scan apps with Play Protect", install Kova, then turn scanning back on. Installing from a computer with `adb install` also works.

## What it does

| Area | What it does |
|---|---|
| Home | Card dues, bills due in 30 days, monthly spend, bank balance, and a "Coming up" list of card bills, bills, insurance, PUC, service and challans |
| Cards | Add a card by **photo** (on-device text recognition) or by **tapping it** on the phone (NFC), or type it in. Update statements, see utilisation and transactions. Only the last 4 digits are stored |
| Pay | Opens your bank's app or website to pay, then **you record the payment in Kova** to update dues and balances. Kova never moves money and doesn't use UPI |
| Bills | Overdue / this week / later; add, edit and delete billers; paying schedules next month's bill |
| Garage | Enter a number plate to see its state and RTO, then **Find details in my SMS** for FASTag balance, challans and insurance. Insurance, PUC and service reminders |
| Money | Bank accounts and balances, 6-month spend chart, recent payments |
| Insights | Spend by month, category and merchant, per card |
| Settings | App lock, reminders, SMS reading, backup/restore, sample data, erase |

### Privacy and security

- **Encrypted storage:** app data is sealed with AES-256-GCM. The key is random and lives in Android's secure keystore (`expo-secure-store`).
- **App lock:** fingerprint, face or phone PIN when Kova opens and after 30 seconds in the background. The app is also hidden in the recent-apps screen.
- **No cloud backup:** Android auto-backup is turned off (the keystore key can't be restored anyway). Use **Settings → Export backup** instead. Backups are plain JSON, so keep them somewhere private.

### Reminders

Local notifications, scheduled on the phone for card bills, bills, insurance, PUC and service. You choose when (7/3/1 days before, on the day) and the time of day.

### Reading bank SMS (Android)

**Scan SMS** (on Home, or Settings → Read bank SMS) reads the last month of messages and fills Kova in one go: credit cards (from spends and statements), card payments, bank accounts and balances, utility, phone and insurance bills, and vehicles (FASTag balance, challans, insurance expiry). New things are created, existing ones matched by last 4 digits or number plate, and you see a preview before anything changes. It's built on a small native module in `modules/kova-sms`, and messages never leave the phone.

### Card scanning

`modules/kova-card` reads a card from a photo with Google ML Kit's on-device text recognition, or over NFC using the EMV contactless protocol. The full card number stays inside the native module: the app only receives the last 4 digits, the first 6 (to tell the network), the expiry and the name printed on the card. Some cards don't share their number over NFC; use a photo for those.

### Logo and icon

Sources are in `brand/` (SVG). `assets/` holds the generated launcher icon, Android adaptive icon layers (foreground, background, monochrome for themed icons), splash and favicon. Regenerate with `rsvg-convert` if you change the SVGs.

The parser (`src/sms/parse.ts`) handles common HDFC, ICICI, Axis and SBI formats. Banks word their SMS differently, so if one of yours isn't picked up, add an example to `src/sms/parse.test.ts` and adjust the patterns.

## Develop

```bash
npm install
npm test            # SMS parser, importer and card-details tests
npx tsc --noEmit    # typecheck
npx expo start      # most screens work in Expo Go; SMS reading needs the APK
```

```
App.tsx                     providers + navigator
src/data/                   types, store (reducer), encrypted vault, bank links, sample data
src/services/               reminders, backup, open bank app
src/sms/                    SMS parser, importer, vehicle lookup (+ tests)
src/cards/                  card details from OCR / NFC (+ tests)
src/screens/                one file per screen
modules/kova-sms/           native Android module that reads the SMS inbox
modules/kova-card/          native Android module: card OCR (ML Kit) and NFC (EMV)
brand/                      logo and icon sources (SVG)
plugins/                    config plugin declaring bank apps for Android 11+
.github/workflows/          APK build
```
