# EZ Car Maintenance Frontend

EZ Car Maintenance is an app for tracking vehicle maintenance and upcoming service needs, along with an AI agent users can interact with. The frontend was built using React Native with Expo.

## Frontend Features

The frontend currently includes:

- Dashboard screen
- Vehicles screen
- Maintenance Log screen
- Add Vehicle form
- Log Maintenance Record form
- AI Assistant screen
- Profile screen

The frontend currently uses shared mock state so the app can store updates by the user:
- adding a vehicle updates the Vehicles screen
- logging a maintenance record updates the Maintenance Log
- logging a maintenance record also updates the Dashboard

## Reminder Logic

A first pass version of reminder logic is implemented inside the frontend.

Reminder behavior:
- each service type has a certain mileage interval
- the app calculates when the next service is due
- services/vehicles are marked as:
  - `overdue`
  - `soon`
  - `good`
- dashboard colors and urgency indicators are based on this logic

This is currently local/frontend logic.

This implementation establishes how reminder behavior works in the app and how it's reflected in the UI.

## Tools Used

- React Native (Core framework)
- Expo (Plaform/tools on top of React Native framework.)
   - Expo Go mobile app used to test app on phones
   - Expo Router used for routing as well as managing tabs
- TypeScript (Typed JavaScript)

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
- Press W to run in web browser  
- Scan the QR code with your phone to run on mobile via Expo Go


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
