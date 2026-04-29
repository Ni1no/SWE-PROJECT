import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDueText,
  getReminderStatus,
  getServiceIntervalMiles,
  getSoonThresholdForVehicle,
  ReminderStatus,
} from './reminder-utils';
import {
  fetchAdvisorPatchForVehicle,
  type AdvisorVehiclePatch,
  uiServiceTypeToAdvisorId,
} from './advisor-client';
import { lookupBrandReliability, parseVehicleProfileFromName } from './brand-reliability';
import { useAuth } from './auth-context';

export type Vehicle = {
  id: string;
  name: string;
  mileage: string;
  vin: string;
  nextService: string;
  dueText: string;
  urgency: ReminderStatus;
  currentMileageNumber: number;
  dueMileageNumber: number;
  hasMaintenance: boolean;
  advisorImportanceScore: number;
  advisorImportanceLabel: string;
  reliabilityTier: string;
  /** When set, sent to Python advisor as last_service_miles (REQ-07). */
  lastServiceMiles?: Record<string, number>;
  /** Model year from Add Vehicle — drives age in interval / urgency math with brand reliability. */
  modelYear?: number;
};

export type ServiceRecord = {
  id: string;
  service: string;
  vehicle: string;
  date: string;
  mileage: string;
  urgency: ReminderStatus;
  notes?: string;
};

function parseMileageDisplay(m: string): number {
  return Number(String(m).replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
}

function parseServiceDateToMs(dateText: string): number {
  const t = Date.parse(String(dateText).trim());
  return Number.isFinite(t) ? t : 0;
}

function parseServiceIdToNumber(id: string): number {
  const n = Number(id);
  return Number.isFinite(n) ? n : 0;
}

function buildLastServiceMilesFromServices(
  vehicleName: string,
  servicesList: ServiceRecord[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of servicesList) {
    if (s.vehicle !== vehicleName) continue;
    const sid = uiServiceTypeToAdvisorId(s.service);
    const miles = parseMileageDisplay(s.mileage);
    if (!out[sid] || miles > out[sid]) {
      out[sid] = miles;
    }
  }
  return out;
}

type AppDataContextType = {
  vehicles: Vehicle[];
  services: ServiceRecord[];
  addVehicle: (vehicle: {
    year: string;
    make: string;
    model: string;
    mileage: string;
    vin: string;
  }) => void;
  addService: (service: {
    vehicle: string;
    serviceType: string;
    date: string;
    mileage: string;
    notes?: string;
  }) => void;
  updateService: (
    id: string,
    service: {
      vehicle: string;
      serviceType: string;
      date: string;
      mileage: string;
      notes?: string;
    }
  ) => void;
  deleteService: (id: string) => void;
  updateVehicle: (
    id: string,
    vehicle: {
      year: string;
      make: string;
      model: string;
      mileage: string;
      vin: string;
    }
  ) => void;
  deleteVehicle: (id: string) => void;
  /** REQ-09: merge mileage urgency from Express `POST /reminders/compute` (by vehicle name). */
  mergeMileageReminderSummaries: (
    summaries: {
      vehicleName: string;
      hasMaintenance: boolean;
      nextService: string;
      dueText: string;
      urgency: ReminderStatus;
      currentMileageNumber: number;
      dueMileageNumber: number;
      mileage: string;
    }[]
  ) => void;
  /**
   * Re-fetch Python advisor patches (importance, due text, urgency) for all vehicles that have
   * `last_service_miles`. Call after navigation focus so scores reflect updated advisor logic.
   */
  refreshAdvisorPatches: () => Promise<void>;
};

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);
type PersistedAppData = {
  vehicles: Vehicle[];
  services: ServiceRecord[];
};

const initialVehicles: Vehicle[] = [
  {
    id: '1',
    name: '2022 Honda Accord',
    mileage: '42,100 mi',
    vin: '1HGCV1F14NA000001',
    nextService: 'Oil Change',
    dueText: '500 miles',
    urgency: 'soon',
    currentMileageNumber: 42100,
    dueMileageNumber: 42600,
    hasMaintenance: true,
    advisorImportanceScore: 78,
    advisorImportanceLabel: 'High',
    reliabilityTier: 'A',
    modelYear: 2022,
    lastServiceMiles: {
      engine_oil_and_filter: 42100,
      battery_check: 36900,
    },
  },
  {
    id: '2',
    name: '2020 Toyota Camry',
    mileage: '39,500 mi',
    vin: '4T1G11AK5LU000002',
    nextService: 'Tire Rotation',
    dueText: '200 miles overdue',
    urgency: 'overdue',
    currentMileageNumber: 39500,
    dueMileageNumber: 39300,
    hasMaintenance: true,
    advisorImportanceScore: 90,
    advisorImportanceLabel: 'Critical',
    reliabilityTier: 'A',
    modelYear: 2020,
    lastServiceMiles: {
      tire_rotation: 39500,
    },
  },
  {
    id: '3',
    name: '2021 Tesla Model 3',
    mileage: '18,220 mi',
    vin: '5YJ3E1EA0MF000003',
    nextService: 'Brake Inspection',
    dueText: '1800 miles',
    urgency: 'good',
    currentMileageNumber: 18220,
    dueMileageNumber: 20020,
    hasMaintenance: true,
    advisorImportanceScore: 60,
    advisorImportanceLabel: 'Medium',
    reliabilityTier: 'C',
    modelYear: 2021,
    lastServiceMiles: {
      brake_inspection: 18220,
    },
  },
];

const initialServices: ServiceRecord[] = [
  {
    id: '1',
    service: 'Oil Change',
    vehicle: '2022 Honda Accord',
    date: 'Apr 2, 2026',
    mileage: '42,100 mi',
    urgency: 'soon',
    notes: 'Used full synthetic at Quick Lube.',
  },
  {
    id: '2',
    service: 'Tire Rotation',
    vehicle: '2020 Toyota Camry',
    date: 'Mar 15, 2026',
    mileage: '39,500 mi',
    urgency: 'overdue',
    notes: 'Front and rear rotation completed.',
  },
  {
    id: '3',
    service: 'Brake Inspection',
    vehicle: '2021 Tesla Model 3',
    date: 'Feb 28, 2026',
    mileage: '18,220 mi',
    urgency: 'good',
    notes: 'Pads measured good, no replacement needed.',
  },
  {
    id: '4',
    service: 'Battery Check',
    vehicle: '2022 Honda Accord',
    date: 'Jan 19, 2026',
    mileage: '36,900 mi',
    urgency: 'good',
    notes: 'Battery tested at 12.6V resting.',
  },
];

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [hydratedStorageKey, setHydratedStorageKey] = useState<string | null>(null);
  const vehiclesRef = useRef<Vehicle[]>([]);
  const servicesRef = useRef<ServiceRecord[]>([]);
  vehiclesRef.current = vehicles;
  servicesRef.current = services;

  const storageKeyForUser = (email: string) =>
    `ezcar:user-data:${email.trim().toLowerCase()}`;

  useEffect(() => {
    const email = user?.email?.trim();
    if (!email) {
      setVehicles([]);
      setServices([]);
      setHydratedStorageKey(null);
      return;
    }
    const key = storageKeyForUser(email);
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (cancelled) return;
        if (!raw) {
          setVehicles([]);
          setServices([]);
          setHydratedStorageKey(key);
          return;
        }
        const parsed = JSON.parse(raw) as Partial<PersistedAppData>;
        const rawVehicles = Array.isArray(parsed.vehicles) ? parsed.vehicles : [];
        const nextVehicles: Vehicle[] = rawVehicles.map((v) => {
          const parsedYear = parseVehicleProfileFromName(v.name || '').modelYear;
          const stored = v.modelYear;
          const modelYear =
            typeof stored === 'number' &&
            Number.isFinite(stored) &&
            stored >= 1900 &&
            stored <= 2100
              ? stored
              : parsedYear != null
                ? parsedYear
                : undefined;
          return { ...v, ...(modelYear != null ? { modelYear } : {}) };
        });
        const nextServices = Array.isArray(parsed.services) ? parsed.services : [];
        setVehicles(nextVehicles);
        setServices(nextServices);
        setHydratedStorageKey(key);
      } catch {
        if (cancelled) return;
        setVehicles([]);
        setServices([]);
        setHydratedStorageKey(key);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  useEffect(() => {
    if (!hydratedStorageKey) return;
    const payload: PersistedAppData = { vehicles, services };
    AsyncStorage.setItem(hydratedStorageKey, JSON.stringify(payload)).catch(() => {
      // Keep app usable if storage write fails in runtime.
    });
  }, [vehicles, services, hydratedStorageKey]);

  const syncVehicleFromServices = (
    vehicleName: string,
    servicesList: ServiceRecord[]
  ) => {
    const forV = servicesList.filter((s) => s.vehicle === vehicleName);

    setVehicles((prev) => {
      const vIdx = prev.findIndex((v) => v.name === vehicleName);
      if (vIdx === -1) return prev;
      const vehicle = prev[vIdx];

      if (forV.length === 0) {
        const cleared: Vehicle = {
          ...vehicle,
          hasMaintenance: false,
          nextService: '',
          dueText: '',
          advisorImportanceScore: 0,
          advisorImportanceLabel: 'Low',
          lastServiceMiles: {},
          modelYear: vehicle.modelYear,
        };
        return prev.map((v, i) => (i === vIdx ? cleared : v));
      }

      const best = [...forV].sort((a, b) => {
        const dateDiff = parseServiceDateToMs(b.date) - parseServiceDateToMs(a.date);
        if (dateDiff !== 0) return dateDiff;
        const idDiff = parseServiceIdToNumber(b.id) - parseServiceIdToNumber(a.id);
        if (idDiff !== 0) return idDiff;
        return parseMileageDisplay(b.mileage) - parseMileageDisplay(a.mileage);
      })[0];
      const lastServiceMileageNumber = parseMileageDisplay(best.mileage);
      const storedCurrentMileage =
        typeof vehicle.currentMileageNumber === 'number' && Number.isFinite(vehicle.currentMileageNumber)
          ? vehicle.currentMileageNumber
          : 0;
      const parsedVehicleMileage = parseMileageDisplay(vehicle.mileage || '');
      const currentMileageNumber =
        storedCurrentMileage > 0
          ? storedCurrentMileage
          : parsedVehicleMileage > 0
            ? parsedVehicleMileage
            : lastServiceMileageNumber;
      const intervalMiles = getServiceIntervalMiles(
        best.service,
        vehicleName,
        vehicle.modelYear
      );
      const dueMileageNumber = lastServiceMileageNumber + intervalMiles;
      const soonWithin = getSoonThresholdForVehicle(vehicleName, vehicle.modelYear);
      const urgency = getReminderStatus(
        currentMileageNumber,
        dueMileageNumber,
        soonWithin
      );
      const dueText = getDueText(currentMileageNumber, dueMileageNumber);

      const lastServiceMiles: Record<string, number> = {};
      for (const s of forV) {
        const sid = uiServiceTypeToAdvisorId(s.service);
        const miles = parseMileageDisplay(s.mileage);
        if (!lastServiceMiles[sid] || miles > lastServiceMiles[sid]) {
          lastServiceMiles[sid] = miles;
        }
      }

      const mileageDisplay = String(vehicle.mileage || '').trim()
        ? String(vehicle.mileage).includes('mi')
          ? vehicle.mileage
          : `${String(vehicle.mileage).replace(/,/g, '').replace(/[^\d.]/g, '')} mi`
        : best.mileage.includes('mi')
          ? best.mileage
          : `${String(best.mileage).replace(/,/g, '')} mi`;

      const { make: parsedMake } = parseVehicleProfileFromName(vehicleName);
      const { reliabilityTier: brandTier } = lookupBrandReliability(parsedMake);

      const updated: Vehicle = {
        ...vehicle,
        mileage: mileageDisplay,
        currentMileageNumber,
        hasMaintenance: true,
        lastServiceMiles,
        nextService: best.service,
        dueMileageNumber,
        dueText,
        urgency,
        advisorImportanceScore: vehicle.advisorImportanceScore,
        advisorImportanceLabel: vehicle.advisorImportanceLabel,
        reliabilityTier: brandTier,
        modelYear: vehicle.modelYear,
      };

      queueMicrotask(() => {
        fetchAdvisorPatchForVehicle(updated).then((patch) => {
          if (!patch) return;
          setVehicles((p) =>
            p.map((x) => (x.id === updated.id ? { ...x, ...patch } : x))
          );
        });
      });

      return prev.map((v, i) => (i === vIdx ? updated : v));
    });
  };

  const addVehicle = (vehicle: {
    year: string;
    make: string;
    model: string;
    mileage: string;
    vin: string;
  }) => {
    const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    const currentMileageNumber = Number(vehicle.mileage.replace(/,/g, ''));
    const dueMileageNumber = currentMileageNumber;
    const yParsed = parseInt(String(vehicle.year).replace(/,/g, '').trim(), 10);
    const modelYear =
      Number.isFinite(yParsed) && yParsed >= 1900 && yParsed <= 2100 ? yParsed : undefined;

    const newVehicle: Vehicle = {
      id: Date.now().toString(),
      name: vehicleName,
      mileage: `${vehicle.mileage} mi`,
      vin: vehicle.vin.trim() || 'VIN not added',
      nextService: '',
      dueText: '',
      urgency: 'good',
      currentMileageNumber,
      dueMileageNumber,
      hasMaintenance: false,
      advisorImportanceScore: 0,
      advisorImportanceLabel: 'Low',
      reliabilityTier: 'B',
      lastServiceMiles: {},
      ...(modelYear != null ? { modelYear } : {}),
    };

    setVehicles((prev) => [newVehicle, ...prev]);
  };

  const addService = (service: {
    vehicle: string;
    serviceType: string;
    date: string;
    mileage: string;
    notes?: string;
  }) => {
    const currentMileageNumber = Number(service.mileage.replace(/,/g, ''));
    const vMatch = vehicles.find((x) => x.name === service.vehicle);
    const intervalMiles = getServiceIntervalMiles(
      service.serviceType,
      service.vehicle,
      vMatch?.modelYear
    );
    const dueMileageNumber = currentMileageNumber + intervalMiles;
    const soonWithin = getSoonThresholdForVehicle(service.vehicle, vMatch?.modelYear);
    const urgency = getReminderStatus(currentMileageNumber, dueMileageNumber, soonWithin);

    const newService: ServiceRecord = {
      id: Date.now().toString(),
      service: service.serviceType,
      vehicle: service.vehicle,
      date: service.date,
      mileage: `${service.mileage} mi`,
      urgency,
      notes: service.notes?.trim() || undefined,
    };

    setServices((prev) => {
      const next = [newService, ...prev];
      queueMicrotask(() => syncVehicleFromServices(service.vehicle, next));
      return next;
    });
  };

  const updateService = (
    id: string,
    service: {
      vehicle: string;
      serviceType: string;
      date: string;
      mileage: string;
      notes?: string;
    }
  ) => {
    const currentMileageNumber = Number(service.mileage.replace(/,/g, ''));
    const vMatch = vehicles.find((x) => x.name === service.vehicle);
    const intervalMiles = getServiceIntervalMiles(
      service.serviceType,
      service.vehicle,
      vMatch?.modelYear
    );
    const dueMileageNumber = currentMileageNumber + intervalMiles;
    const soonWithin = getSoonThresholdForVehicle(service.vehicle, vMatch?.modelYear);
    const urgency = getReminderStatus(currentMileageNumber, dueMileageNumber, soonWithin);

    setServices((prev) => {
      const old = prev.find((s) => s.id === id);
      const oldVehicle = old?.vehicle;
      const next = prev.map((s) =>
        s.id === id
          ? {
              ...s,
              service: service.serviceType,
              vehicle: service.vehicle,
              date: service.date,
              mileage: `${service.mileage} mi`,
              urgency,
              notes: service.notes?.trim() || undefined,
            }
          : s
      );
      queueMicrotask(() => {
        syncVehicleFromServices(service.vehicle, next);
        if (oldVehicle && oldVehicle !== service.vehicle) {
          syncVehicleFromServices(oldVehicle, next);
        }
      });
      return next;
    });
  };

  const deleteService = (id: string) => {
    setServices((prev) => {
      const victim = prev.find((s) => s.id === id);
      const next = prev.filter((s) => s.id !== id);
      if (victim) {
        queueMicrotask(() => syncVehicleFromServices(victim.vehicle, next));
      }
      return next;
    });
  };

  const updateVehicle = (
    id: string,
    vehicle: {
      year: string;
      make: string;
      model: string;
      mileage: string;
      vin: string;
    }
  ) => {
    const newName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`.trim();
    const currentMileageNumber = Number(vehicle.mileage.replace(/,/g, ''));
    const yParsed = parseInt(String(vehicle.year).replace(/,/g, '').trim(), 10);
    const modelYear =
      Number.isFinite(yParsed) && yParsed >= 1900 && yParsed <= 2100 ? yParsed : undefined;

    let oldName = '';
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        oldName = v.name;
        return {
          ...v,
          name: newName,
          mileage: `${vehicle.mileage} mi`,
          vin: vehicle.vin.trim() || 'VIN not added',
          currentMileageNumber,
          modelYear: modelYear ?? v.modelYear,
          ...(v.hasMaintenance ? {} : { dueMileageNumber: currentMileageNumber }),
        };
      })
    );

    if (!oldName) return;

    setServices((prev) => {
      const next = prev.map((s) =>
        s.vehicle === oldName ? { ...s, vehicle: newName } : s
      );
      queueMicrotask(() => {
        syncVehicleFromServices(newName, next);
        if (oldName !== newName) {
          syncVehicleFromServices(oldName, next);
        }
      });
      return next;
    });
  };

  const deleteVehicle = (id: string) => {
    let victimName = '';
    setVehicles((prev) => {
      const victim = prev.find((v) => v.id === id);
      victimName = victim?.name || '';
      return prev.filter((v) => v.id !== id);
    });
    if (!victimName) return;
    setServices((prev) => prev.filter((s) => s.vehicle !== victimName));
  };

  const mergeMileageReminderSummaries = useCallback(
    (
      summaries: {
        vehicleName: string;
        hasMaintenance: boolean;
        nextService: string;
        dueText: string;
        urgency: ReminderStatus;
        currentMileageNumber: number;
        dueMileageNumber: number;
        mileage: string;
      }[]
    ) => {
      setVehicles((prev) =>
        prev.map((v) => {
          const s = summaries.find(
            (x) =>
              x.vehicleName.trim().toLowerCase() === v.name.trim().toLowerCase()
          );
          if (!s) return v;
          return {
            ...v,
            hasMaintenance: s.hasMaintenance,
            nextService: s.nextService,
            dueText: s.dueText,
            urgency: s.urgency,
            currentMileageNumber: s.currentMileageNumber,
            dueMileageNumber: s.dueMileageNumber,
            mileage: s.mileage?.trim() ? s.mileage : v.mileage,
          };
        })
      );
    },
    []
  );

  const refreshAdvisorPatches = useCallback(async () => {
    const list = vehiclesRef.current;
    const svc = servicesRef.current;
    if (!list.length) return;
    const entries = await Promise.all(
      list.map(async (v) => {
        const stored = v.lastServiceMiles ?? {};
        const derived = buildLastServiceMilesFromServices(v.name, svc);
        const lastServiceMiles =
          Object.keys(stored).length > 0 ? stored : derived;
        if (Object.keys(lastServiceMiles).length === 0) return null;
        const patch = await fetchAdvisorPatchForVehicle({
          id: v.id,
          name: v.name,
          currentMileageNumber: v.currentMileageNumber,
          lastServiceMiles,
          modelYear: v.modelYear,
        });
        return patch ? ([v.id, patch] as const) : null;
      })
    );
    const updates = new Map<string, AdvisorVehiclePatch>();
    for (const e of entries) {
      if (e) updates.set(e[0], e[1]);
    }
    if (!updates.size) return;
    setVehicles((prev) =>
      prev.map((x) => {
        const p = updates.get(x.id);
        return p ? { ...x, ...p } : x;
      })
    );
  }, []);

  return (
    <AppDataContext.Provider
      value={{
        vehicles,
        services,
        addVehicle,
        addService,
        updateService,
        deleteService,
        updateVehicle,
        deleteVehicle,
        mergeMileageReminderSummaries,
        refreshAdvisorPatches,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error('useAppData must be used inside AppDataProvider');
  }

  return context;
}
