/**
 * REQ-09: Server-side mileage reminder engine (Express).
 * Mirrors SWE-PROJECT-ui-frontend/app/reminder-utils.ts + per-vehicle rollup from maintenance logs.
 */
const {
  effectiveIntervalMiles,
  getDueSoonWindowMiles,
  getServiceFactorForVehicleDisplayName,
} = require("./brandReliability");

function parseMileageDisplay(m) {
  return Number(String(m).replace(/,/g, "").replace(/[^\d.]/g, "")) || 0;
}

function parseServiceDateToMs(dateText) {
  const t = Date.parse(String(dateText).trim());
  return Number.isFinite(t) ? t : 0;
}

function parseServiceIdToNumber(id) {
  const n = Number(id);
  return Number.isFinite(n) ? n : 0;
}

function baseServiceIntervalMiles(serviceType) {
  switch (serviceType) {
    case "Oil Change":
      return 5000;
    case "Tire Rotation":
      return 6000;
    case "Brake Inspection":
      return 12000;
    case "Battery Check":
      return 12000;
    case "Air Filter Replacement":
      return 15000;
    default:
      return 5000;
  }
}

function getServiceIntervalMiles(serviceType, vehicleDisplayName, storedModelYear) {
  const base = baseServiceIntervalMiles(serviceType);
  const sf = vehicleDisplayName?.trim()
    ? getServiceFactorForVehicleDisplayName(
        vehicleDisplayName.trim(),
        undefined,
        storedModelYear
      )
    : getServiceFactorForVehicleDisplayName("", undefined, undefined);
  return Math.round(effectiveIntervalMiles(base, sf));
}

function getReminderStatus(currentMileage, dueMileage, soonWithinMiles = 500) {
  if (currentMileage >= dueMileage) return "overdue";
  if (dueMileage - currentMileage <= soonWithinMiles) return "soon";
  return "good";
}

function getDueText(currentMileage, dueMileage) {
  const difference = dueMileage - currentMileage;
  if (difference < 0) {
    return `${Math.abs(difference)} miles overdue`;
  }
  return `${difference} miles`;
}

function uiServiceTypeToAdvisorId(serviceType) {
  switch (serviceType) {
    case "Oil Change":
      return "engine_oil_and_filter";
    case "Tire Rotation":
      return "tire_rotation";
    case "Brake Inspection":
      return "brake_inspection";
    case "Battery Check":
      return "battery_check";
    case "Air Filter Replacement":
      return "air_filter_replacement";
    default:
      return "engine_oil_and_filter";
  }
}

/**
 * @param {Array<{ name: string }>} vehicles
 * @param {Array<{ vehicle: string; service: string; mileage: string; date: string; id?: string }>} services
 */
function computeReminderSummaries(vehicles, services) {
  const list = Array.isArray(vehicles) ? vehicles : [];
  const svc = Array.isArray(services) ? services : [];

  return list.map((vehicle) => {
    const vehicleName = String(vehicle?.name || "").trim();
    const forV = svc.filter((s) => String(s.vehicle || "").trim() === vehicleName);

    if (!vehicleName || forV.length === 0) {
      return {
        vehicleName,
        hasMaintenance: false,
        nextService: "",
        dueText: "",
        urgency: "good",
        currentMileageNumber: Number(vehicle?.currentMileageNumber) || 0,
        dueMileageNumber: Number(vehicle?.dueMileageNumber) || 0,
        mileage: vehicle?.mileage || "",
      };
    }

    const best = [...forV].sort((a, b) => {
      const dateDiff = parseServiceDateToMs(b.date) - parseServiceDateToMs(a.date);
      if (dateDiff !== 0) return dateDiff;
      const idDiff = parseServiceIdToNumber(String(b.id)) - parseServiceIdToNumber(String(a.id));
      if (idDiff !== 0) return idDiff;
      return parseMileageDisplay(b.mileage) - parseMileageDisplay(a.mileage);
    })[0];

    const lastServiceMileageNumber = parseMileageDisplay(best.mileage);
    const storedCurrentMileage = Number(vehicle?.currentMileageNumber) || 0;
    const parsedVehicleMileage = parseMileageDisplay(vehicle?.mileage || "");
    const currentMileageNumber =
      storedCurrentMileage > 0
        ? storedCurrentMileage
        : parsedVehicleMileage > 0
          ? parsedVehicleMileage
          : lastServiceMileageNumber;
    const my = vehicle?.modelYear;
    const intervalMiles = getServiceIntervalMiles(best.service, vehicleName, my);
    const dueMileageNumber = lastServiceMileageNumber + intervalMiles;
    const sf = getServiceFactorForVehicleDisplayName(vehicleName, undefined, my);
    const soonWithin = getDueSoonWindowMiles(sf);
    const urgency = getReminderStatus(currentMileageNumber, dueMileageNumber, soonWithin);
    const dueText = getDueText(currentMileageNumber, dueMileageNumber);

    const mileageDisplay = String(vehicle?.mileage || "").trim()
      ? String(vehicle.mileage).includes("mi")
        ? vehicle.mileage
        : `${String(vehicle.mileage).replace(/,/g, "").replace(/[^\d.]/g, "")} mi`
      : String(best.mileage).includes("mi")
        ? best.mileage
        : `${String(best.mileage).replace(/,/g, "")} mi`;

    return {
      vehicleName,
      hasMaintenance: true,
      nextService: best.service,
      dueText,
      urgency,
      currentMileageNumber,
      dueMileageNumber,
      mileage: mileageDisplay,
    };
  });
}

module.exports = { computeReminderSummaries };
