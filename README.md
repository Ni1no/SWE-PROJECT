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