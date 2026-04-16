export type ReminderStatus = 'overdue' | 'soon' | 'good';

export function getServiceIntervalMiles(serviceType: string) {
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

export function getReminderStatus(
  currentMileage: number,
  dueMileage: number
): ReminderStatus {
  if (currentMileage >= dueMileage) {
    return 'overdue';
  }

  if (dueMileage - currentMileage <= 500) {
    return 'soon';
  }

  return 'good';
}

export function getDueText(currentMileage: number, dueMileage: number) {
  const difference = dueMileage - currentMileage;

  if (difference < 0) {
    return `${Math.abs(difference)} miles overdue`;
  }

  return `${difference} miles`;
}