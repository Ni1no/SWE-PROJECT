import {
  effectiveIntervalMiles,
  FALLBACK_SERVICE_FACTOR,
  getDueSoonWindowMiles,
  getServiceFactorForVehicleDisplayName,
} from './brand-reliability';

export type ReminderStatus = 'overdue' | 'soon' | 'good';

function baseServiceIntervalMiles(serviceType: string): number {
  switch (serviceType) {
    case 'Oil Change':
      return 5000;
    case 'Tire Rotation':
      return 6000;
    case 'Brake Inspection':
      return 12000;
    case 'Battery Check':
      return 12000;
    case 'Air Filter Replacement':
      return 15000;
    default:
      return 5000;
  }
}

/**
 * Mileage interval for a service type, scaled by **brand reliability** and vehicle age
 * (same service_factor idea as `obd_maintenance_advisor.py`). More reliable brands → longer gaps.
 */
export function getServiceIntervalMiles(
  serviceType: string,
  vehicleDisplayName?: string | null,
  /** From Add Vehicle year field — stronger, exact age vs parsing name only. */
  storedModelYear?: number | null
): number {
  const base = baseServiceIntervalMiles(serviceType);
  const sf = vehicleDisplayName?.trim()
    ? getServiceFactorForVehicleDisplayName(
        vehicleDisplayName.trim(),
        undefined,
        storedModelYear
      )
    : FALLBACK_SERVICE_FACTOR;
  return Math.round(effectiveIntervalMiles(base, sf));
}

export function getReminderStatus(
  currentMileage: number,
  dueMileage: number,
  soonWithinMiles: number = 500
): ReminderStatus {
  if (currentMileage >= dueMileage) {
    return 'overdue';
  }

  if (dueMileage - currentMileage <= soonWithinMiles) {
    return 'soon';
  }

  return 'good';
}

/** Due-soon band width from service factor (less reliable → earlier warning). */
export function getSoonThresholdForVehicle(
  vehicleDisplayName: string | null | undefined,
  storedModelYear?: number | null
): number {
  const sf = vehicleDisplayName?.trim()
    ? getServiceFactorForVehicleDisplayName(
        vehicleDisplayName.trim(),
        undefined,
        storedModelYear
      )
    : FALLBACK_SERVICE_FACTOR;
  return getDueSoonWindowMiles(sf);
}

export function getDueText(currentMileage: number, dueMileage: number) {
  const difference = dueMileage - currentMileage;

  if (difference < 0) {
    return `${Math.abs(difference)} miles overdue`;
  }

  return `${difference} miles`;
}

/**
 * Dashboard dot / "Due In" color: derive from **dueText** + same soon window as
 * {@link getReminderStatus}, so colors match the miles string. Stored `urgency` can stay
 * `good` (e.g. Python `current`) while importance is still High from age/reliability alone.
 */
export function resolveDashboardMileageUrgency(
  dueText: string,
  vehicleDisplayName: string,
  storedUrgency: ReminderStatus | string | undefined,
  modelYear?: number | null
): ReminderStatus {
  const normalized: ReminderStatus =
    storedUrgency === 'overdue' || storedUrgency === 'soon' || storedUrgency === 'good'
      ? storedUrgency
      : typeof storedUrgency === 'string' &&
          (storedUrgency.toLowerCase() === 'overdue' ||
            storedUrgency.toLowerCase() === 'soon' ||
            storedUrgency.toLowerCase() === 'good')
        ? (storedUrgency.toLowerCase() as ReminderStatus)
        : 'good';

  const t = dueText.trim().toLowerCase();
  if (!t) return normalized;
  if (t.includes('overdue')) return 'overdue';

  const m = dueText.match(/(-?[\d,]+)\s*miles?\b/i);
  if (!m) return normalized;
  const miles = parseInt(m[1].replace(/,/g, ''), 10);
  if (!Number.isFinite(miles)) return normalized;

  const window = getSoonThresholdForVehicle(vehicleDisplayName, modelYear ?? undefined);
  if (miles <= 0) return 'overdue';
  if (miles <= window) return 'soon';
  return 'good';
}