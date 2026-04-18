import React, { createContext, useContext, useState } from 'react';
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
};

function parseMileageDisplay(m: string): number {
  return Number(String(m).replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
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
  }) => void;
  updateService: (
    id: string,
    service: {
      vehicle: string;
      serviceType: string;
      date: string;
      mileage: string;
    }
  ) => void;
  deleteService: (id: string) => void;
};

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

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
  },
  {
    id: '2',
    service: 'Tire Rotation',
    vehicle: '2020 Toyota Camry',
    date: 'Mar 15, 2026',
    mileage: '39,500 mi',
    urgency: 'overdue',
  },
  {
    id: '3',
    service: 'Brake Inspection',
    vehicle: '2021 Tesla Model 3',
    date: 'Feb 28, 2026',
    mileage: '18,220 mi',
    urgency: 'good',
  },
  {
    id: '4',
    service: 'Battery Check',
    vehicle: '2022 Honda Accord',
    date: 'Jan 19, 2026',
    mileage: '36,900 mi',
    urgency: 'good',
  },
];

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [services, setServices] = useState<ServiceRecord[]>(initialServices);

  const syncVehicleFromServices = (
    vehicleName: string,
    servicesList: ServiceRecord[]
  ) => {
    const forV = servicesList.filter((s) => s.vehicle === vehicleName);
    if (forV.length === 0) return;

    setVehicles((prev) => {
      const vIdx = prev.findIndex((v) => v.name === vehicleName);
      if (vIdx === -1) return prev;

      const best = forV.reduce((a, b) =>
        parseMileageDisplay(b.mileage) > parseMileageDisplay(a.mileage) ? b : a
      );
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

      const vehicle = prev[vIdx];
      const mileageDisplay = best.mileage.includes('mi')
        ? best.mileage
        : `${String(best.mileage).replace(/,/g, '')} mi`;

      const updated: Vehicle = {
        ...vehicle,
        mileage: mileageDisplay,
        currentMileageNumber,
        lastServiceMiles,
        nextService: best.service,
        dueMileageNumber,
        dueText,
        urgency,
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
    const nextService = 'Oil Change';
    const intervalMiles = getServiceIntervalMiles(nextService);
    const dueMileageNumber = currentMileageNumber + intervalMiles;

    const lastServiceMiles: Record<string, number> = {
      engine_oil_and_filter: currentMileageNumber,
    };

    const newVehicle: Vehicle = {
      id: Date.now().toString(),
      name: vehicleName,
      mileage: `${vehicle.mileage} mi`,
      vin: vehicle.vin.trim() || 'VIN not added',
      nextService,
      dueText: getDueText(currentMileageNumber, dueMileageNumber),
      urgency: getReminderStatus(currentMileageNumber, dueMileageNumber),
      currentMileageNumber,
      dueMileageNumber,
      lastServiceMiles,
    };

    setVehicles((prev) => [newVehicle, ...prev]);

    const profile = {
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
    };
    queueMicrotask(() => {
      fetchAdvisorPatchForVehicle(newVehicle, profile).then((patch) => {
        if (!patch) return;
        setVehicles((prev) =>
          prev.map((v) => (v.id === newVehicle.id ? { ...v, ...patch } : v))
        );
      });
    });
  };

  const addService = (service: {
    vehicle: string;
    serviceType: string;
    date: string;
    mileage: string;
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
