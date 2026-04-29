/**
 * Python maintenance advisor — **separate** from Express `POST /ai/chat` symptom triage.
 * Calls `obd_maintenance_advisor.py` via `advisor_server.mjs` (HTTP bridge in repo root).
 * Inputs: odometer, vehicle age, make, last-service miles; brand reliability from CSV scales
 * effective intervals. VIN decode → Add Vehicle fills year/make/model → parsed from `vehicle.name`.
 *
 * REQ-07/REQ-08/REQ-09: mileage-based next service + dashboard urgency.
 * Set EXPO_PUBLIC_ADVISOR_URL (e.g. physical device -> http://<LAN-IP>:3847).
 */
import { Platform } from 'react-native';
import type { ReminderStatus } from './reminder-utils';
import { parseVehicleProfileFromName } from './brand-reliability';

export { parseVehicleProfileFromName };

/** Subset of Vehicle — avoids circular import with data-context. */
export type VehicleAdvisorSnapshot = {
  id: string;
  name: string;
  currentMileageNumber: number;
  lastServiceMiles?: Record<string, number>;
  /** From Add Vehicle — preferred over parsing year from `name` for age. */
  modelYear?: number;
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
  reliability_tier: string;
  matched_brand_key: string;
  importance_score: number;
  importance_label: string;
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
    case 'tire_rotation':
      return 'Tire Rotation';
    case 'brake_inspection':
      return 'Brake Inspection';
    case 'battery_check':
      return 'Battery Check';
    case 'air_filter_replacement':
      return 'Air Filter Replacement';
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
    case 'Tire Rotation':
      return 'tire_rotation';
    case 'Brake Inspection':
      return 'brake_inspection';
    case 'Battery Check':
      return 'battery_check';
    case 'Air Filter Replacement':
      return 'air_filter_replacement';
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

export async function isAdvisorReachable(): Promise<boolean> {
  const probe = await postNextMaintenance({
    context: {
      odometer_miles: 10000,
      vehicle_age_years: 5,
      vehicle_make: 'Toyota',
      vehicle_model: 'Camry',
      model_year: 2020,
      last_service_miles: { engine_oil_and_filter: 5000 },
    },
  });
  return !!probe;
}

/** Build REQ-01-style context for Python advisor. */
export type AdvisorVehiclePatch = Partial<{
  nextService: string;
  dueText: string;
  urgency: ReminderStatus;
  dueMileageNumber: number;
  lastServiceMiles: Record<string, number>;
  advisorImportanceScore: number;
  advisorImportanceLabel: string;
  reliabilityTier: string;
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

  const storedY = vehicle.modelYear;
  const parsedY = fromForm.modelYear;
  const yNum =
    storedY != null &&
    Number.isFinite(storedY) &&
    storedY >= 1900 &&
    storedY <= 2100
      ? storedY
      : parsedY != null && Number.isFinite(parsedY) && parsedY >= 1900 && parsedY <= 2100
        ? parsedY
        : null;
  const age = yNum != null ? Math.max(0, refYear - yNum) : 5;

  const lastServiceMiles =
    vehicle.lastServiceMiles && Object.keys(vehicle.lastServiceMiles).length > 0
      ? vehicle.lastServiceMiles
      : {};

  const adv = await postNextMaintenance({
    context: {
      odometer_miles: vehicle.currentMileageNumber,
      vehicle_age_years: age,
      vehicle_make: fromForm.make || null,
      vehicle_model: fromForm.model || null,
      model_year: yNum,
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
    advisorImportanceScore: Math.round(adv.importance_score),
    advisorImportanceLabel: adv.importance_label,
    reliabilityTier: adv.reliability_tier,
  };
}
