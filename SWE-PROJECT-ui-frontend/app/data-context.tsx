import React, { createContext, useContext, useMemo, useState } from 'react';
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
    const advisorServiceId = uiServiceTypeToAdvisorId(service.serviceType);

    const newService: ServiceRecord = {
      id: Date.now().toString(),
      service: service.serviceType,
      vehicle: service.vehicle,
      date: service.date,
      mileage: `${service.mileage} mi`,
      urgency,
    };

    setServices((prev) => [newService, ...prev]);

    setVehicles((prev) =>
      prev.map((vehicle) => {
        if (vehicle.name !== service.vehicle) return vehicle;
        const lastServiceMiles = {
          ...(vehicle.lastServiceMiles ?? {}),
          [advisorServiceId]: currentMileageNumber,
        };
        const updated: Vehicle = {
          ...vehicle,
          mileage: `${service.mileage} mi`,
          lastServiceMiles,
          nextService: service.serviceType,
          dueText: getDueText(currentMileageNumber, dueMileageNumber),
          urgency,
          currentMileageNumber,
          dueMileageNumber,
        };
        queueMicrotask(() => {
          fetchAdvisorPatchForVehicle(updated).then((patch) => {
            if (!patch) return;
            setVehicles((p) =>
              p.map((x) => (x.id === updated.id ? { ...x, ...patch } : x))
            );
          });
        });
        return updated;
      })
    );
  };

  const value = useMemo(
    () => ({
      vehicles,
      services,
      addVehicle,
      addService,
    }),
    [vehicles, services]
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error('useAppData must be used inside AppDataProvider');
  }

  return context;
}
