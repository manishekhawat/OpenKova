# Kova: cards, bills and garage (personal build)

A private Android app (React Native / Expo) for keeping track of credit card dues, bills, vehicles and bank balances. Built for personal use: no account, no server, and everything stays encrypted on your phone.

## Install

Every push to `main` builds an APK with GitHub Actions. Download it from the repo's **Releases** page on your Android phone and install it (allow "Install unknown apps"). It's signed with the debug key, which is fine for sideloading but not for the Play Store.

## What it does

| Area | What it does |
|---|---|
| Home | Card dues, bills due in 30 days, monthly spend, bank balance, and a "Coming up" list of card bills, bills, insurance, PUC, service and challans |
| Cards | Add/edit cards (last 4 digits only), update the statement (total, minimum, due date), utilisation, transactions |
| Pay | Opens your bank's app or website to pay, then **you record the payment in Kova** to update dues and balances. Kova never moves money and doesn't use UPI |
| Bills | Overdue / this week / later; add, edit and delete billers; paying schedules next month's bill |
| Garage | Vehicles with insurance, PUC and service dates, challans (add by hand), FASTag balance |
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

**Settings → Read bank SMS** scans your inbox for card spends, card statements and account balances, and matches them to your cards and accounts by their last 4 digits. You see a preview before anything changes. It's built on a small native module in `modules/kova-sms`, and messages never leave the phone.

The parser (`src/sms/parse.ts`) handles common HDFC, ICICI, Axis and SBI formats. Banks word their SMS differently, so if one of yours isn't picked up, add an example to `src/sms/parse.test.ts` and adjust the patterns.

## Develop

```bash
npm install
npm test            # SMS parser and importer tests
npx tsc --noEmit    # typecheck
npx expo start      # most screens work in Expo Go; SMS reading needs the APK
```

```
App.tsx                     providers + navigator
src/data/                   types, store (reducer), encrypted vault, bank links, sample data
src/services/               reminders, backup, open bank app
src/sms/                    SMS parser + importer (+ tests)
src/screens/                one file per screen
modules/kova-sms/           native Android module that reads the SMS inbox
plugins/                    config plugin declaring bank apps for Android 11+
.github/workflows/          APK build
```
