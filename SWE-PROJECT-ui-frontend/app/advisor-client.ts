/**
 * Calls Python obd_maintenance_advisor via advisor_server.mjs (parent folder).
 * REQ-07/REQ-08/REQ-09: mileage-based next service + urgency for dashboard.
 * Set EXPO_PUBLIC_ADVISOR_URL to override (e.g. physical device -> http://<LAN-IP>:3847).
 */
import { Platform } from 'react-native';
import type { ReminderStatus } from './reminder-utils';

/** Subset of Vehicle — avoids circular import with data-context. */
export type VehicleAdvisorSnapshot = {
  id: string;
  name: string;
  currentMileageNumber: number;
  lastServiceMiles?: Record<string, number>;
};

type AdvisorUrgency = 'overdue' | 'due_soon' | 'current';

export type AdvisorNextRow = {
  service_id: string;
  label: string;
  last_service_miles: number;
  effective_interval_miles: number;
  next_due_at_miles: number;
  remaining_miles: number;
  urgency: AdvisorUrgency;
  service_factor: number;
  brand_reliability_index: number;
  matched_brand_key: string;
};

function defaultBaseUrl(): string {
  const env = process.env.EXPO_PUBLIC_ADVISOR_URL?.trim();
  if (env) return env.replace(/\/$/, '');
  return Platform.OS === 'android' ? 'http://10.0.2.2:3847' : 'http://127.0.0.1:3847';
}

export function mapAdvisorUrgencyToReminderStatus(u: AdvisorUrgency): ReminderStatus {
  if (u === 'overdue') return 'overdue';
  if (u === 'due_soon') return 'soon';
  return 'good';
}

export function serviceIdToDisplayName(serviceId: string): string {
  switch (serviceId) {
    case 'engine_oil_and_filter':
      return 'Oil Change';
    case 'engine_air_filter':
      return 'Air Filter Replacement';
    case 'cabin_air_filter':
      return 'Cabin Air Filter';
    case 'spark_plugs':
      return 'Spark Plugs';
    case 'transmission_fluid':
      return 'Transmission Fluid';
    case 'coolant_service':
      return 'Coolant Service';
    case 'brake_fluid':
      return 'Brake Fluid';
    default:
      return serviceId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function uiServiceTypeToAdvisorId(serviceType: string): string {
  switch (serviceType) {
    case 'Oil Change':
      return 'engine_oil_and_filter';
    case 'Air Filter Replacement':
      return 'engine_air_filter';
    case 'Cabin Air Filter':
      return 'cabin_air_filter';
    case 'Spark Plugs':
      return 'spark_plugs';
    case 'Transmission Fluid':
      return 'transmission_fluid';
    case 'Coolant Service':
      return 'coolant_service';
    case 'Brake Fluid':
      return 'brake_fluid';
    default:
      return 'engine_oil_and_filter';
  }
}

function formatDueTextFromAdvisor(row: AdvisorNextRow): string {
  const diff = row.remaining_miles;
  if (diff < 0) {
    return `${Math.round(Math.abs(diff))} miles overdue`;
  }
  return `${Math.round(diff)} miles`;
}

/** Parse "YYYY Make Model…" from dashboard vehicle name. */
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
    /^\d{4}$/.test(parts[0]) && Number.isFinite(y) && y >= 1900 && y <= 2100
      ? y
      : null;
  if (!modelYear) {
    return { modelYear: null, make: '', model: '' };
  }
  const make = parts[1] ?? '';
  const model = parts.slice(2).join(' ') || make;
  return { modelYear, make, model };
}

async function postNextMaintenance(
  body: Record<string, unknown>
): Promise<AdvisorNextRow | null> {
  const url = `${defaultBaseUrl()}/advisor/next-maintenance`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as AdvisorNextRow | null;
    if (!data || typeof data !== 'object' || !('service_id' in data)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/** Build REQ-01-style context for Python advisor. */
export type AdvisorVehiclePatch = Partial<{
  nextService: string;
  dueText: string;
  urgency: ReminderStatus;
  dueMileageNumber: number;
  lastServiceMiles: Record<string, number>;
}>;

export async function fetchAdvisorPatchForVehicle(
  vehicle: VehicleAdvisorSnapshot,
  options?: { year?: string; make?: string; model?: string }
): Promise<AdvisorVehiclePatch | null> {
  const refYear = new Date().getFullYear();
  const fromForm =
    options?.year && options?.make && options?.model
      ? {
          modelYear: parseInt(options.year, 10),
          make: options.make.trim(),
          model: options.model.trim(),
        }
      : parseVehicleProfileFromName(vehicle.name);

  const yNum = fromForm.modelYear;
  const age = Number.isFinite(yNum) ? Math.max(0, refYear - (yNum as number)) : 5;

  const lastServiceMiles =
    vehicle.lastServiceMiles && Object.keys(vehicle.lastServiceMiles).length > 0
      ? vehicle.lastServiceMiles
      : { engine_oil_and_filter: vehicle.currentMileageNumber };

  const adv = await postNextMaintenance({
    context: {
      odometer_miles: vehicle.currentMileageNumber,
      vehicle_age_years: age,
      vehicle_make: fromForm.make || null,
      vehicle_model: fromForm.model || null,
      model_year: Number.isFinite(yNum) ? yNum : null,
      last_service_miles: lastServiceMiles,
    },
  });
  if (!adv) return null;

  return {
    nextService: serviceIdToDisplayName(adv.service_id),
    dueText: formatDueTextFromAdvisor(adv),
    urgency: mapAdvisorUrgencyToReminderStatus(adv.urgency),
    dueMileageNumber: Math.round(adv.next_due_at_miles),
    lastServiceMiles,
  };
}
