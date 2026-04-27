import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDueText,
  getReminderStatus,
  getServiceIntervalMiles,
  ReminderStatus,
} from './reminder-utils';
import {
  fetchAdvisorPatchForVehicle,
  uiServiceTypeToAdvisorId,
} from './advisor-client';
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
        const nextVehicles = Array.isArray(parsed.vehicles) ? parsed.vehicles : [];
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
      const currentMileageNumber = parseMileageDisplay(best.mileage);
      const intervalMiles = getServiceIntervalMiles(best.service);
      const dueMileageNumber = currentMileageNumber + intervalMiles;
      const urgency = getReminderStatus(
        currentMileageNumber,
        dueMileageNumber
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

      const mileageDisplay = best.mileage.includes('mi')
        ? best.mileage
        : `${String(best.mileage).replace(/,/g, '')} mi`;

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
        reliabilityTier: vehicle.reliabilityTier,
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
    const intervalMiles = getServiceIntervalMiles(service.serviceType);
    const dueMileageNumber = currentMileageNumber + intervalMiles;
    const urgency = getReminderStatus(currentMileageNumber, dueMileageNumber);

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
    const intervalMiles = getServiceIntervalMiles(service.serviceType);
    const dueMileageNumber = currentMileageNumber + intervalMiles;
    const urgency = getReminderStatus(currentMileageNumber, dueMileageNumber);

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

  return (
    <AppDataContext.Provider
      value={{
        vehicles,
        services,
        addVehicle,
        addService,
        updateService,
        deleteService,
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
