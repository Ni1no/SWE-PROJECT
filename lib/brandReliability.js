/**
 * Brand-scaled mileage logic aligned with `obd_maintenance_advisor.py` and the Expo
 * `brand-reliability.ts` module. Reads `brand_reliability_lookup.csv` at repo root.
 */
const fs = require("fs");
const path = require("path");

const K_AGE = 0.068;
const SF_CAP_LOW = 0.5;
const SF_CAP_HIGH = 2.0;
const MIN_INTERVAL_MILES = 1000;
const BASE_SOON_MILES = 500;

let cachedRows = null;
let cachedNeedles = null;

function loadBrandRows() {
  if (cachedRows) return cachedRows;
  const p = path.join(__dirname, "..", "brand_reliability_lookup.csv");
  if (!fs.existsSync(p)) {
    cachedRows = [];
    return cachedRows;
  }
  const text = fs.readFileSync(p, "utf8");
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    cachedRows = [];
    return cachedRows;
  }
  const header = lines[0].split(",").map((h) => h.trim());
  cachedRows = [];
  for (let li = 1; li < lines.length; li++) {
    const parts = lines[li].split(",");
    const row = {};
    header.forEach((h, i) => {
      row[h] = (parts[i] || "").trim();
    });
    row.reliability_index = parseFloat(row.reliability_index) || 0.75;
    cachedRows.push(row);
  }
  return cachedRows;
}

function lookupBrandReliability(make) {
  const generic = { reliabilityIndex: 0.75, reliabilityTier: "B", matchedBrandKey: "generic_unknown" };
  const n = String(make || "")
    .trim()
    .toLowerCase();
  if (!n) return generic;
  const rows = loadBrandRows();
  for (const r of rows) {
    const key = String(r.brand_key || "").toLowerCase();
    if (key === n) {
      return {
        reliabilityIndex: r.reliability_index,
        reliabilityTier: r.reliability_tier || "B",
        matchedBrandKey: r.brand_key,
      };
    }
    for (const part of String(r.aliases || "").split(";")) {
      if (part.trim().toLowerCase() === n) {
        return {
          reliabilityIndex: r.reliability_index,
          reliabilityTier: r.reliability_tier || "B",
          matchedBrandKey: r.brand_key,
        };
      }
    }
  }
  return generic;
}

function computeServiceFactor(vehicleAgeYears, reliabilityIndex) {
  const ri = Math.max(reliabilityIndex, 0.35);
  const sf = (1.0 + Math.max(vehicleAgeYears, 0) * K_AGE) / ri;
  return Math.min(SF_CAP_HIGH, Math.max(SF_CAP_LOW, sf));
}

function effectiveIntervalMiles(baseMiles, serviceFactor) {
  const sf = Math.max(serviceFactor, 0.5);
  return Math.max(MIN_INTERVAL_MILES, baseMiles / sf);
}

function getDueSoonWindowMiles(serviceFactor) {
  return Math.round(BASE_SOON_MILES * Math.min(1.8, Math.max(1.0, serviceFactor)));
}

function buildBrandPrefixNeedles() {
  if (cachedNeedles) return cachedNeedles;
  const seen = new Set();
  const out = [];
  for (const r of loadBrandRows()) {
    if (r.brand_key === "generic_unknown") continue;
    const keyHuman = String(r.brand_key || "").replace(/_/g, " ");
    const parts = [keyHuman, ...String(r.aliases || "").split(";").map((a) => a.trim())].filter(Boolean);
    const displayMake = keyHuman.replace(/\b\w/g, (c) => c.toUpperCase());
    for (const p of parts) {
      const needle = p.toLowerCase();
      if (!needle || seen.has(needle)) continue;
      seen.add(needle);
      out.push({ needle, displayMake });
    }
  }
  out.sort((a, b) => b.needle.length - a.needle.length);
  cachedNeedles = out;
  return out;
}

function parseVehicleProfileFromName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/);
  if (parts.length < 2) {
    return { modelYear: null, make: "", model: "" };
  }
  const y = parseInt(parts[0], 10);
  const modelYear =
    /^\d{4}$/.test(parts[0]) && Number.isFinite(y) && y >= 1900 && y <= 2100 ? y : null;
  if (!modelYear) {
    return { modelYear: null, make: "", model: "" };
  }
  const afterYear = parts.slice(1).join(" ").trim();
  const lower = afterYear.toLowerCase();
  for (const { needle, displayMake } of buildBrandPrefixNeedles()) {
    if (lower === needle || lower.startsWith(`${needle} `)) {
      const rest = afterYear.slice(needle.length).trim();
      return { modelYear, make: displayMake, model: rest || displayMake };
    }
  }
  const make = parts[1] || "";
  const model = parts.slice(2).join(" ") || make;
  return { modelYear, make, model };
}

function resolveModelYearForVehicle(displayName, storedModelYear) {
  if (
    storedModelYear != null &&
    Number.isFinite(storedModelYear) &&
    storedModelYear >= 1900 &&
    storedModelYear <= 2100
  ) {
    return storedModelYear;
  }
  return parseVehicleProfileFromName(displayName).modelYear;
}

function getServiceFactorForVehicleDisplayName(vehicleDisplayName, referenceYear, storedModelYear) {
  const ref = referenceYear != null ? referenceYear : new Date().getFullYear();
  const trimmed = String(vehicleDisplayName || "").trim();
  if (!trimmed) return computeServiceFactor(5, 0.75);
  const { make } = parseVehicleProfileFromName(trimmed);
  const modelYear = resolveModelYearForVehicle(trimmed, storedModelYear);
  const { reliabilityIndex } = lookupBrandReliability(make);
  const age =
    modelYear != null && Number.isFinite(modelYear) ? Math.max(0, ref - modelYear) : 5;
  return computeServiceFactor(age, reliabilityIndex);
}

module.exports = {
  lookupBrandReliability,
  computeServiceFactor,
  effectiveIntervalMiles,
  getDueSoonWindowMiles,
  parseVehicleProfileFromName,
  resolveModelYearForVehicle,
  getServiceFactorForVehicleDisplayName,
};
