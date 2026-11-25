# Kova — cards, bills & garage (React Native / Expo)

An original CRED-style app: track and pay credit card bills, manage upcoming bills, keep your vehicles in a garage, see linked bank accounts and get spend insights. Dark, premium look.

**Demo build:** sample data, simulated OTP (`123456`) and simulated payments. No UPI. Data is saved on the phone (AsyncStorage).

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** (Android / iOS), or press `a` for an Android emulator / `i` for the iOS simulator.

Requires Node 20+. Built on Expo SDK 58, React Native 0.88, TypeScript.

## Features

| Area | What it does |
|---|---|
| Login | Phone number → 6-digit OTP (auto-submit, resend timer) → name |
| Home | Total card dues, bills due in 30 days, monthly spend, bank balance, card carousel, a "Coming up" list merging card dues, bills, insurance/PUC/service and challans by urgency |
| Cards | Card visuals, utilisation meter, add/remove cards (last 4 digits only), card detail with total/min due, transactions |
| Pay | Pay total, minimum or custom amount from a chosen bank account; balance checks; success receipt with reference number |
| Bills | Overdue / this week / later groups, paid history, add billers (electricity, broadband, rent, gas…). Paying schedules the next cycle |
| Garage | Vehicles with Indian number plates, insurance / PUC / service reminders, challans (pay individually), FASTag balance and recharge |
| Money | Linked bank accounts, total balance, 6-month spend chart, recent payments, link account (IFSC validation) |
| Insights | Per-card or all-card filter, month picker, % change, spend by category, top merchants |
| Profile | Counts, payment history, reset sample data, log out |

## Project layout

```
App.tsx                     providers + navigator
src/theme.ts                colours, type, spacing
src/data/types.ts           data model
src/data/seed.ts            sample data (dates relative to today)
src/data/store.tsx          reducer + context + persistence + selectors
src/navigation/index.tsx    stack + bottom tabs, typed routes
src/components/             UI kit, credit card visual
src/screens/                one file per screen
```

## Making it real

Everything that's simulated is marked with a comment in the code. To go live you'd swap:

- **OTP login** (`LoginScreen.tsx`) → Firebase Phone Auth, MSG91 or Twilio Verify, plus your own backend session.
- **Payments** (`PayScreen.tsx`) → a payment gateway (Razorpay, Cashfree, PayU) using net banking / debit card. Credit card bill payments and utility bills go through **Bharat BillPay (BBPS)** via a licensed operating unit partner (e.g. Setu, Razorpay, Cashfree).
- **Bank balances** (`AddAccountScreen.tsx`) → RBI **Account Aggregator** framework (e.g. Setu AA, Finvu, OneMoney), with user consent.
- **Card statements / transactions** → Account Aggregator data or parsing statement emails with consent.
- **Garage** (`AddVehicleScreen.tsx`) → VAHAN vehicle lookup, e-challan, insurer and FASTag issuer APIs through an authorised provider.
- **Storage** → move from AsyncStorage to a backend (and keep only tokens on device, in `expo-secure-store`).

Compliance to plan for: RBI rules on payment aggregators and card data (never store full card numbers/CVV — this app stores last 4 only), DPDP Act 2023 for personal data, and PCI DSS if you ever touch card numbers.

## Test APK

Every push to `main` builds an Android APK with GitHub Actions (`.github/workflows/android-apk.yml`).
Download it from the repo's **Releases** page on your phone and install it (allow "Install unknown apps").
The test APK is signed with the debug key — fine for testing, not for the Play Store.
