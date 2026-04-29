/**
 * Brand reliability drives **interval length** and **due-soon window** (aligned with
 * `obd_maintenance_advisor.py`: higher service_factor ⇒ shorter intervals, wider soon band).
 * Data mirrors `brand_reliability_lookup.csv` at repo root.
 */

export type BrandRow = {
  brand_key: string;
  aliases: string;
  reliability_index: number;
  reliability_tier: string;
};

const BRAND_ROWS: BrandRow[] = [
  { brand_key: 'acura', aliases: 'acura', reliability_index: 0.88, reliability_tier: 'A' },
  { brand_key: 'alfa_romeo', aliases: 'alfa romeo;alfaromeo', reliability_index: 0.62, reliability_tier: 'C' },
  { brand_key: 'audi', aliases: 'audi', reliability_index: 0.7, reliability_tier: 'C' },
  { brand_key: 'bmw', aliases: 'bmw;bayerische motoren werke', reliability_index: 0.67, reliability_tier: 'C' },
  { brand_key: 'buick', aliases: 'buick', reliability_index: 0.81, reliability_tier: 'B' },
  { brand_key: 'byd', aliases: 'byd', reliability_index: 0.77, reliability_tier: 'B' },
  { brand_key: 'cadillac', aliases: 'cadillac', reliability_index: 0.73, reliability_tier: 'C' },
  { brand_key: 'chevrolet', aliases: 'chevrolet;chevy', reliability_index: 0.77, reliability_tier: 'B' },
  { brand_key: 'chrysler', aliases: 'chrysler', reliability_index: 0.65, reliability_tier: 'C' },
  { brand_key: 'citroen', aliases: 'citroen;citroën', reliability_index: 0.68, reliability_tier: 'C' },
  { brand_key: 'dacia', aliases: 'dacia', reliability_index: 0.79, reliability_tier: 'B' },
  { brand_key: 'dodge', aliases: 'dodge', reliability_index: 0.66, reliability_tier: 'C' },
  { brand_key: 'fiat', aliases: 'fiat', reliability_index: 0.63, reliability_tier: 'C' },
  { brand_key: 'ford', aliases: 'ford', reliability_index: 0.77, reliability_tier: 'B' },
  { brand_key: 'genesis', aliases: 'genesis', reliability_index: 0.84, reliability_tier: 'A' },
  { brand_key: 'gmc', aliases: 'gmc', reliability_index: 0.76, reliability_tier: 'B' },
  { brand_key: 'honda', aliases: 'honda', reliability_index: 0.9, reliability_tier: 'A' },
  { brand_key: 'hyundai', aliases: 'hyundai', reliability_index: 0.85, reliability_tier: 'A' },
  { brand_key: 'infiniti', aliases: 'infiniti', reliability_index: 0.78, reliability_tier: 'B' },
  { brand_key: 'jaguar', aliases: 'jaguar', reliability_index: 0.61, reliability_tier: 'C' },
  { brand_key: 'jeep', aliases: 'jeep', reliability_index: 0.64, reliability_tier: 'C' },
  { brand_key: 'kia', aliases: 'kia', reliability_index: 0.84, reliability_tier: 'A' },
  {
    brand_key: 'land_rover',
    aliases: 'land rover;landrover;range rover',
    reliability_index: 0.6,
    reliability_tier: 'C',
  },
  { brand_key: 'lexus', aliases: 'lexus', reliability_index: 0.93, reliability_tier: 'A' },
  { brand_key: 'lincoln', aliases: 'lincoln', reliability_index: 0.74, reliability_tier: 'B' },
  { brand_key: 'mazda', aliases: 'mazda', reliability_index: 0.87, reliability_tier: 'A' },
  {
    brand_key: 'mercedes_benz',
    aliases: 'mercedes;mercedes-benz;mercedes benz;mercedesbenz;mb',
    reliability_index: 0.71,
    reliability_tier: 'C',
  },
  { brand_key: 'mercury', aliases: 'mercury', reliability_index: 0.73, reliability_tier: 'C' },
  { brand_key: 'mini', aliases: 'mini', reliability_index: 0.66, reliability_tier: 'C' },
  { brand_key: 'mitsubishi', aliases: 'mitsubishi', reliability_index: 0.8, reliability_tier: 'B' },
  { brand_key: 'nissan', aliases: 'nissan', reliability_index: 0.77, reliability_tier: 'B' },
  { brand_key: 'oldsmobile', aliases: 'oldsmobile', reliability_index: 0.71, reliability_tier: 'C' },
  { brand_key: 'opel', aliases: 'opel;vauxhall', reliability_index: 0.74, reliability_tier: 'B' },
  { brand_key: 'peugeot', aliases: 'peugeot', reliability_index: 0.73, reliability_tier: 'C' },
  { brand_key: 'pontiac', aliases: 'pontiac', reliability_index: 0.7, reliability_tier: 'C' },
  { brand_key: 'porsche', aliases: 'porsche', reliability_index: 0.68, reliability_tier: 'C' },
  { brand_key: 'ram', aliases: 'ram;ram trucks', reliability_index: 0.67, reliability_tier: 'C' },
  { brand_key: 'renault', aliases: 'renault', reliability_index: 0.67, reliability_tier: 'C' },
  { brand_key: 'saturn', aliases: 'saturn', reliability_index: 0.72, reliability_tier: 'C' },
  { brand_key: 'seat', aliases: 'seat', reliability_index: 0.75, reliability_tier: 'B' },
  { brand_key: 'skoda', aliases: 'skoda;škoda', reliability_index: 0.79, reliability_tier: 'B' },
  { brand_key: 'subaru', aliases: 'subaru', reliability_index: 0.86, reliability_tier: 'A' },
  { brand_key: 'suzuki', aliases: 'suzuki', reliability_index: 0.84, reliability_tier: 'A' },
  { brand_key: 'tesla', aliases: 'tesla', reliability_index: 0.65, reliability_tier: 'C' },
  { brand_key: 'toyota', aliases: 'toyota;scion', reliability_index: 0.92, reliability_tier: 'A' },
  { brand_key: 'volkswagen', aliases: 'volkswagen;vw;v w', reliability_index: 0.75, reliability_tier: 'B' },
  { brand_key: 'volvo', aliases: 'volvo', reliability_index: 0.78, reliability_tier: 'B' },
  { brand_key: 'generic_unknown', aliases: 'unknown;other;generic', reliability_index: 0.75, reliability_tier: 'B' },
];

/**
 * Age sensitivity: older vehicles get a higher service_factor (shorter intervals, wider due-soon).
 * Kept in sync with `obd_maintenance_advisor.py` `compute_service_factor` default `k_age`.
 */
const K_AGE = 0.068;
const SF_CAP_LOW = 0.5;
const SF_CAP_HIGH = 2.0;
const MIN_INTERVAL_MILES = 1000;
const BASE_SOON_MILES = 500;

/** Longest-alias-first needles for matching make after model year. */
const BRAND_PREFIX_NEEDLES: { needle: string; displayMake: string }[] = (() => {
  const seen = new Set<string>();
  const out: { needle: string; displayMake: string }[] = [];
  for (const r of BRAND_ROWS) {
    if (r.brand_key === 'generic_unknown') continue;
    const keyHuman = r.brand_key.replace(/_/g, ' ');
    const displayMake = keyHuman.replace(/\b\w/g, (c) => c.toUpperCase());
    const parts = [keyHuman, ...r.aliases.split(';').map((a) => a.trim())].filter(Boolean);
    for (const p of parts) {
      const needle = p.toLowerCase();
      if (!needle || seen.has(needle)) continue;
      seen.add(needle);
      out.push({ needle, displayMake });
    }
  }
  out.sort((a, b) => b.needle.length - a.needle.length);
  return out;
})();

export function lookupBrandReliability(make: string | null | undefined): {
  reliabilityIndex: number;
  reliabilityTier: string;
  matchedBrandKey: string;
} {
  const generic = { reliabilityIndex: 0.75, reliabilityTier: 'B', matchedBrandKey: 'generic_unknown' };
  const n = String(make || '')
    .trim()
    .toLowerCase();
  if (!n) return generic;
  for (const r of BRAND_ROWS) {
    if (r.brand_key.toLowerCase() === n) {
      return {
        reliabilityIndex: r.reliability_index,
        reliabilityTier: r.reliability_tier,
        matchedBrandKey: r.brand_key,
      };
    }
    for (const part of r.aliases.split(';')) {
      if (part.trim().toLowerCase() === n) {
        return {
          reliabilityIndex: r.reliability_index,
          reliabilityTier: r.reliability_tier,
          matchedBrandKey: r.brand_key,
        };
      }
    }
  }
  return generic;
}

export function computeServiceFactor(vehicleAgeYears: number, reliabilityIndex: number): number {
  const ri = Math.max(reliabilityIndex, 0.35);
  const sf =
    (1.0 + Math.max(vehicleAgeYears, 0) * K_AGE) / ri;
  return Math.min(SF_CAP_HIGH, Math.max(SF_CAP_LOW, sf));
}

export function effectiveIntervalMiles(baseMiles: number, serviceFactor: number): number {
  const sf = Math.max(serviceFactor, 0.5);
  return Math.max(MIN_INTERVAL_MILES, baseMiles / sf);
}

/** Matches Python `dynamic_due_soon_window` (500 mi baseline × service_factor clamp). */
export function getDueSoonWindowMiles(serviceFactor: number): number {
  return Math.round(BASE_SOON_MILES * Math.min(1.8, Math.max(1.0, serviceFactor)));
}

export function parseVehicleProfileFromName(name: string): {
  modelYear: number | null;
  make: string;
  model: string;
} {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) {
    return { modelYear: null, make: '', model: '' };
  }
  const y = parseInt(parts[0], 10);
  const modelYear =
    /^\d{4}$/.test(parts[0]) && Number.isFinite(y) && y >= 1900 && y <= 2100 ? y : null;
  if (!modelYear) {
    return { modelYear: null, make: '', model: '' };
  }
  const afterYear = parts.slice(1).join(' ').trim();
  const lower = afterYear.toLowerCase();
  for (const { needle, displayMake } of BRAND_PREFIX_NEEDLES) {
    if (lower === needle || lower.startsWith(`${needle} `)) {
      const rest = afterYear.slice(needle.length).trim();
      return {
        modelYear,
        make: displayMake,
        model: rest || displayMake,
      };
    }
  }
  const make = parts[1] ?? '';
  const model = parts.slice(2).join(' ') || make;
  return { modelYear, make, model };
}

/** When no vehicle name: same middle-ground as `generic_unknown` + 5 yr age. */
export const FALLBACK_SERVICE_FACTOR = computeServiceFactor(5, 0.75);

/** Prefer model year from Add Vehicle; fall back to leading year in `name`. */
export function resolveModelYearForVehicle(
  vehicleDisplayName: string,
  storedModelYear?: number | null
): number | null {
  if (
    storedModelYear != null &&
    Number.isFinite(storedModelYear) &&
    storedModelYear >= 1900 &&
    storedModelYear <= 2100
  ) {
    return storedModelYear;
  }
  return parseVehicleProfileFromName(vehicleDisplayName).modelYear;
}

export function getServiceFactorForVehicleDisplayName(
  vehicleDisplayName: string,
  referenceYear?: number,
  storedModelYear?: number | null
): number {
  const trimmed = vehicleDisplayName.trim();
  if (!trimmed) return FALLBACK_SERVICE_FACTOR;
  const ref = referenceYear ?? new Date().getFullYear();
  const { make } = parseVehicleProfileFromName(trimmed);
  const modelYear = resolveModelYearForVehicle(trimmed, storedModelYear);
  const { reliabilityIndex } = lookupBrandReliability(make);
  const age =
    modelYear != null && Number.isFinite(modelYear) ? Math.max(0, ref - modelYear) : 5;
  return computeServiceFactor(age, reliabilityIndex);
}
