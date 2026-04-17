# Python advisor + Expo (REQ doc wiring)

- **REQ-07 / REQ-09**: After add vehicle / log service, `data-context` asks the Python `obd_maintenance_advisor` (via HTTP) for next mileage-based service and urgency.
- **REQ-08**: ~500 mi “due soon” is enforced in Python (`REMINDER_WITHIN_MILES`).

## Run

1. From repo root `SWE PROJECT`, ensure `python` is on PATH and `brand_reliability_lookup.csv` sits next to `obd_maintenance_advisor.py`.
2. In a second terminal, from `SWE-PROJECT-ui-frontend`:

   ```bash
   npm run advisor-server
   ```

3. Start Expo (`npm start`). iOS Simulator uses `http://127.0.0.1:3847`; Android emulator uses `http://10.0.2.2:3847`. Set `EXPO_PUBLIC_ADVISOR_URL` for a physical device (your PC’s LAN IP).

If the server is off, the app keeps the existing `reminder-utils` values (no crash).

## Production

Use HTTPS and your Node API (requirements doc); this dev bridge is only for local integration.
