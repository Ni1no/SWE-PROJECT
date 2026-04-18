# EZ Car Maintenance — How to run (frontend + Python advisor)


## What, where

| Path | Role |
|------|------|
| `SWE-PROJECT-ui-frontend/` | Expo (React Native) UI |
| `advisor_server.mjs` | Node HTTP server (no extra npm deps) |
| `advisor_cli.py` | Reads JSON stdin → calls advisor → JSON stdout |
| `obd_maintenance_advisor.py` | Maintenance logic + `brand_reliability_lookup.csv` |
| `VINData.csv` | Optional NHTSA-style decode sample (used by Python helpers) |

## Prerequisites

- **Node.js** 18+ (for `advisor_server.mjs` and Expo)
- **Python 3** on your PATH as `python` (or set `PYTHON` when starting the server)
- **npm** (install Expo app dependencies once)

## 1) Install the mobile app

```bash
cd SWE-PROJECT-ui-frontend
npm install
```

## 2) Run the Python advisor bridge (Terminal A)

From the **same** `SWE-PROJECT-ui-frontend` folder (script runs the parent `advisor_server.mjs`):

```bash
npm run advisor-server
```

You should see: `advisor_server listening on http://0.0.0.0:3847`

Requirements:

- Current working directory does not need to be the repo root; the server resolves `advisor_cli.py` next to `advisor_server.mjs` (parent of `SWE-PROJECT-ui-frontend`).
- `obd_maintenance_advisor.py` and `brand_reliability_lookup.csv` must stay in that parent folder (default layout).

Optional environment variables:

- `ADVISOR_PORT` — default `3847`
- `PYTHON` — default `python` (use `py` on Windows if needed)

## 3) Run the Expo app (Terminal B)

```bash
cd SWE-PROJECT-ui-frontend
npx expo start
```

Then open **iOS Simulator**, **Android emulator**, or **Expo Go**.

### URLs the app uses to reach the bridge

- **iOS Simulator:** `http://127.0.0.1:3847` (default in `advisor-client.ts`)
- **Android Emulator:** `http://10.0.2.2:3847` (host loopback)
- **Physical phone:** the bridge must be reachable on your LAN. Set in a `.env` in `SWE-PROJECT-ui-frontend`:

  ```bash
  EXPO_PUBLIC_ADVISOR_URL=http://YOUR_PC_LAN_IP:3847
  ```

  Restart Expo after changing env. Your PC firewall may need to allow inbound TCP on `ADVISOR_PORT`.

If the bridge is **not** running, the app keeps working using the existing in-app `reminder-utils` fallbacks.

## 4) Run Python advisor alone (no app)

From the repo root (`SWE PROJECT` folder that contains `obd_maintenance_advisor.py`):

```bash
python obd_maintenance_advisor.py
```

Uses bundled demo output. Requires `brand_reliability_lookup.csv` in the same folder.

## Quick checklist

1. `npm install` inside `SWE-PROJECT-ui-frontend`
2. `npm run advisor-server` in terminal A (leave it running)
3. `npx expo start` in terminal B
4. Open app in simulator or device; add a vehicle or log service to trigger advisor calls when the server is up

For Expo + TypeScript editor issues (e.g. `expo/tsconfig.base`), run `npm install` so `node_modules/expo` exists; the UI `README.md` covers generic Expo setup.
