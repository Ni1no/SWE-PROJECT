# EZ Car Maintenance Frontend

The app is built with **React Native** and **Expo**: one TypeScript codebase runs on **iOS** and **Android**. Expo speeds up development and testing — run `npm start`, then **scan the QR code** with the **Expo Go** app on a physical device (no full native build required for day-to-day work).

## Frontend Features (presentation map)

- **Dashboard** — horizontal cards per vehicle; **color-coded urgency** (red / amber / green) for how close the next service is.
- **Vehicles** — read-only list of vehicles on the account.
- **Maintenance log — full CRUD**
  - **Create** — FAB opens *Log Maintenance Record*.
  - **Read** — list with filters (All / Oil / Tires / Brakes); **newest service date at the top**.
  - **Update** — **tap a row** to open *Edit Maintenance Record*.
  - **Delete** — **long-press** a row → confirmation dialog (avoids accidental deletes).
- **Add Vehicle** — manual entry or **VIN decode** via the public **NHTSA vPIC** API (`vpic.nhtsa.dot.gov`) to auto-fill **year, make, and model**.
- **AI Assistant** — **Express** `POST /ai/chat` (JWT): symptom text → guidance + urgency (**Immediate** / **Within a Week** / **Monitor**) + disclaimer on every reply. **Python** bridge (optional) appends next-maintenance context from mileage, history, and brand CSV. **NHTSA VIN** decode feeds year/make/model into that advisor path.
- **Profile / auth** — login, register, JWT session restore (`/auth/me`), sign-out.

Local persistence: vehicles and maintenance for each signed-in user are stored on-device (**AsyncStorage**) so data survives closing the app.

## Reminder and advisor behavior

- Base mileage intervals and UI labels use local helpers; the **OBD maintenance advisor** (optional Node + Python bridge) can override **next service**, **due text**, and **urgency** when the bridge is running.
- Dashboard urgency dot and service strip colors follow `overdue` / `soon` / `good`.

## Tools Used

- **React Native** — UI and navigation primitives.
- **Expo** — toolchain, dev server, QR-to-device workflow, Expo Router (file-based routes + tabs).
- **TypeScript** — typed app code.

## How to Run

To install dependencies:

```bash
npm install
```
To start the app:

```bash
npm start
```

To open the app:
- Press **W** for web (if enabled in your Expo setup).
- **Scan the QR code** with **Expo Go** on your phone (same Wi‑Fi as your dev machine, or use tunnel mode if needed).


Also included below is the default README contents for apps created via Expo (most commonly used React Native Framework)

# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
