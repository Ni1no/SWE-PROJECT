/**
 * REQ-09: Express server-side mileage reminder engine (`POST /reminders/compute`).
 * DTO types are local to avoid importing `data-context` from a client that `data-context` might import.
 */
import { getBackendBaseUrl } from './api-config';
import type { ReminderStatus } from './reminder-utils';

/** Subset of vehicle fields sent to the server (full `Vehicle` objects are fine). */
export type ReminderVehiclePayload = {
  name: string;
  mileage?: string;
  currentMileageNumber?: number;
  dueMileageNumber?: number;
  id?: string;
  modelYear?: number;
};

export type ReminderServicePayload = {
  id: string;
  vehicle: string;
  service: string;
  date: string;
  mileage: string;
  notes?: string;
};

export type MileageReminderSummary = {
  vehicleName: string;
  hasMaintenance: boolean;
  nextService: string;
  dueText: string;
  urgency: ReminderStatus;
  currentMileageNumber: number;
  dueMileageNumber: number;
  mileage: string;
};

export async function fetchMileageReminderSummaries(
  vehicles: ReminderVehiclePayload[],
  services: ReminderServicePayload[],
  getAccessToken: () => Promise<string | null>
): Promise<{ summaries: MileageReminderSummary[]; computedAt?: string } | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(`${getBackendBaseUrl()}/reminders/compute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ vehicles, services }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      summaries?: MileageReminderSummary[];
      computedAt?: string;
    };
    if (!Array.isArray(data.summaries)) return null;
    return { summaries: data.summaries, computedAt: data.computedAt };
  } catch {
    return null;
  }
}
