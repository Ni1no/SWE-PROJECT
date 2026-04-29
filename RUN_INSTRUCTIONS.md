# EZ Car Maintenance — How to run (frontend + Python advisor)

1st Terminal: cd "A:\Documents\SWE PROJECT"
npm install
npm start

2nd Terminal:cd "A:\Documents\SWE PROJECT\SWE-PROJECT-ui-frontend"
npm install
npm run advisor-server

3rd Terminal: cd "A:\Documents\SWE PROJECT\SWE-PROJECT-ui-frontend"
npx expo start



**Out of scope for this delivery (explicitly not required)**

- **REQ-08** — Push / FCM notifications (not implemented).
- **REQ-12 / REQ-13** — Custom reminder lead times; favorite shops with ratings (not implemented).

**Still missing or only partial**

- **REQ-09** — **Done (partial):** Express `POST /reminders/compute` mirrors mileage urgency; the **Dashboard** tab merges summaries on focus when the user has a JWT. Local `syncVehicleFromServices` still drives state offline or without login.
- **REQ-10** — **Done:** Maintenance log has chip filters **plus** a free-text search (vehicle, service, date, mileage, notes).
- **REQ-17–REQ-23** — **Partial:** Express `/ai/chat` supports `sessionId`, short `history`, returns `suggestions`, and the **AI** tab shows suggestion chips, keeps session across sends, and **Copy** puts the last reply + disclaimer on the clipboard. A hosted LLM (e.g. Claude) is **not** integrated. The **Python** advisor remains the separate bridge for next-maintenance math.
- **Persistence** — Vehicles and maintenance are stored per user in **AsyncStorage** (survives app restarts). MongoDB Atlas holds **accounts** and password-reset tokens.


**Implemented in this repo (high level)**

- **REQ-01, REQ-03, REQ-04, REQ-11** — Add vehicle, log services, list records, multiple vehicles (local state).
- **REQ-02** — Optional VIN decode via NHTSA on Add Vehicle (`Decode VIN (NHTSA)`).
- **REQ-05, REQ-06** — Edit and delete maintenance records from the log (delete asks for confirmation).
- **REQ-07** — Mileage-based next service when the Python advisor bridge is running; otherwise `reminder-utils` fallbacks.
- **REQ-14, REQ-15, REQ-27** — Register/login API with hashed passwords and JWT (Expo app does not require login for local data).
- **REQ-16** — Forgot/reset password API + in-app screens (needs Mongo + API server).

---

## What, where

| Path | Role |
|------|------|
| `SWE-PROJECT-ui-frontend/` | Expo (React Native) UI |
| `server.js` + `routes/` | Express API (auth, JWT, **AI advisory** `/ai/chat`, **mileage reminders** `/reminders/compute`, password reset) |
| `models/User.js` | MongoDB user + password reset fields |
| `advisor_server.mjs` | Node HTTP server (no extra npm deps) |
| `advisor_cli.py` | Reads JSON stdin → calls advisor → JSON stdout |
| `obd_maintenance_advisor.py` | **Python** next-maintenance engine + `brand_reliability_lookup.csv` (separate from Express AI) |
| `VINData.csv` | Optional NHTSA-style decode sample (used by Python helpers) |

## Prerequisites

- **Node.js** 18+ (for `advisor_server.mjs`, Expo, and Express)
- **Python 3** on your PATH as `python` (or set `PYTHON` when starting the advisor server)
- **npm**
- **MongoDB Atlas** (or local Mongo) only if you use **register / login / password reset**

### Two-system architecture (for demos)

1. **Express** (`POST /ai/chat`, JWT required): user describes a symptom → server returns **guidance**, one of **Immediate / Within a Week / Monitor**, and a **disclaimer on every response**.
2. **Python** (`advisor_server.mjs` → `advisor_cli.py` → `obd_maintenance_advisor.py`): odometer, age, make, **service history**, and **brand CSV** → which maintenance item is most due (shorter intervals for lower-reliability brands). The Expo **AI** tab calls Express first, then appends this next-service line when the bridge is up.
3. **NHTSA VIN decode** (Expo → `vpic.nhtsa.dot.gov`) fills year/make/model → same profile fields the Python advisor uses via `vehicle.name` parsing.

## 0) Optional — Express API (auth + reset + AI advisory)

From the **repo root** (folder that contains `server.js`):

```bash
npm install
```

Create a `.env` in that same folder (example):

```bash
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-long-random-secret
```

Start the API:

```bash
npm start
```

(`npm start` runs `node server.js`.) You should see the Express server listening on `PORT` and a MongoDB Atlas connected message. If `MONGO_URI` is wrong, Mongo logs an error but the process may still listen.

After login or register, the app stores the **JWT** locally and calls **`GET /auth/me`** on next launch so you stay signed in until the token expires or you sign out. Protected routes (Bearer token): **`POST /ai/chat`**, **`POST /reminders/compute`** (mileage summaries for dashboard sync).

**Expo → API URL** (physical device or custom host): in `SWE-PROJECT-ui-frontend/.env`:

```bash
EXPO_PUBLIC_API_URL=http://YOUR_PC_LAN_IP:5000
```

Restart Expo after changing env. Forgot/reset password screens use this base URL (`app/api-config.ts` defaults to `127.0.0.1:5000` on iOS simulator and `10.0.2.2:5000` on Android emulator).

**Try password reset (REQ-16 local):** register a user via `POST /auth/register` (Postman/curl) or add a small UI later → Profile → **Reset Password** → enter email → continue with token → **New password** screen.

## 1) Install the mobile app

```bash
cd SWE-PROJECT-ui-frontend
npm install
```

## 2) Run the Python advisor bridge (Terminal A) — optional

From the **same** `SWE-PROJECT-ui-frontend` folder (script runs the parent `advisor_server.mjs`):

```bash
npm run advisor-server
```

You should see: `advisor_server http://0.0.0.0:3847` (or similar).

Requirements:

- The server resolves `advisor_cli.py` next to `advisor_server.mjs` (parent of `SWE-PROJECT-ui-frontend`).
- `obd_maintenance_advisor.py` and `brand_reliability_lookup.csv` must stay in that parent folder (default layout).

Optional environment variables:

- `ADVISOR_PORT` — default `3847`
- `PYTHON` — default `python` (use `py` on Windows if needed)

## 3) Run the Expo app (Terminal B)

```bash
cd SWE-PROJECT-ui-frontend
npx expo start
```

Then open **iOS Simulator**, **Android emulator**, **Expo Go**, or **web**.

### URLs the app uses to reach the advisor bridge

- **iOS Simulator:** `http://127.0.0.1:3847` (default in `advisor-client.ts`)
- **Android Emulator:** `http://10.0.2.2:3847` (host loopback)
- **Physical phone:** the bridge must be reachable on your LAN. Set in `SWE-PROJECT-ui-frontend/.env`:

  ```bash
  EXPO_PUBLIC_ADVISOR_URL=http://YOUR_PC_LAN_IP:3847
  ```

  Restart Expo after changing env. Your PC firewall may need to allow inbound TCP on `ADVISOR_PORT`.

If the bridge is **not** running, the app keeps working using the existing in-app `reminder-utils` fallbacks.

### VIN decode (REQ-02)

Add Vehicle → enter a **17-character VIN** → **Decode VIN (NHTSA)**. Requires internet (calls `vpic.nhtsa.dot.gov`). Year/make/model fill in; you still enter mileage manually.

### Maintenance log (REQ-05 / REQ-06)

Open **Maintenance Log** → tap a row → **Edit** (modal) or **Delete** (confirmation alert).

## 4) Run Python advisor alone (no app)

From the repo root (folder that contains `obd_maintenance_advisor.py`):

```bash
python obd_maintenance_advisor.py
```

Uses bundled demo output. Requires `brand_reliability_lookup.csv` in the same folder.

## Quick checklist

1. `npm install` inside `SWE-PROJECT-ui-frontend`
2. *(Optional)* `npm install` at repo root + `.env` + `node server.js` for auth / password reset / AI stub
3. *(Optional)* `npm run advisor-server` in terminal A from `SWE-PROJECT-ui-frontend` (leave it running)
4. `npx expo start` in terminal B
5. Open the app; use **Add Vehicle** (and VIN decode), **Log** / **Edit** / **Delete**, and **Profile → Reset Password** when the API is running

For Expo + TypeScript editor issues (e.g. `expo/tsconfig.base`), run `npm install` so `node_modules/expo` exists; the UI `README.md` covers generic Expo setup.
