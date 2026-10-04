export type VehicleId =
  | 'city_compact'
  | 'city_sedan'
  | 'city_sport'
  | 'delivery_van'
  | 'taxi'
  | 'tow_truck'
  | 'city_bus'
  | 'utility_truck';

export type VehicleProfile = {
  id: VehicleId;
  name: string;
  price: number;
  color: number;
  width: number;
  height: number;
  maxForward: number;
  maxReverse: number;
  acceleration: number;
  braking: number;
  rollingResistance: number;
  steeringLow: number;
  steeringHigh: number;
};

export const VEHICLES: VehicleProfile[] = [
  {
    id: 'city_compact',
    name: 'City Compact',
    price: 0,
    color: 0xf0a23a,
    width: 82,
    height: 44,
    maxForward: 560,
    maxReverse: 210,
    acceleration: 520,
    braking: 760,
    rollingResistance: 285,
    steeringLow: 2.9,
    steeringHigh: 1.45
  },
  {
    id: 'city_sedan',
    name: 'Westend Sedan',
    price: 2600,
    color: 0x4e86b7,
    width: 92,
    height: 46,
    maxForward: 625,
    maxReverse: 220,
    acceleration: 560,
    braking: 780,
    rollingResistance: 275,
    steeringLow: 2.72,
    steeringHigh: 1.38
  },
  {
    id: 'city_sport',
    name: 'Velocity S',
    price: 7200,
    color: 0xd24f46,
    width: 90,
    height: 42,
    maxForward: 790,
    maxReverse: 250,
    acceleration: 720,
    braking: 900,
    rollingResistance: 245,
    steeringLow: 3.02,
    steeringHigh: 1.52
  },
  {
    id: 'delivery_van',
    name: 'Metro Van',
    price: 3900,
    color: 0xe9e3ca,
    width: 98,
    height: 50,
    maxForward: 540,
    maxReverse: 190,
    acceleration: 440,
    braking: 720,
    rollingResistance: 300,
    steeringLow: 2.5,
    steeringHigh: 1.24
  },
  {
    id: 'taxi',
    name: 'GTR Taxi',
    price: 3300,
    color: 0xe6c84e,
    width: 92,
    height: 46,
    maxForward: 610,
    maxReverse: 215,
    acceleration: 550,
    braking: 790,
    rollingResistance: 275,
    steeringLow: 2.75,
    steeringHigh: 1.4
  },
  {
    id: 'tow_truck',
    name: 'Westend Abschlepper',
    price: 5600,
    color: 0x5f9270,
    width: 108,
    height: 52,
    maxForward: 500,
    maxReverse: 175,
    acceleration: 390,
    braking: 710,
    rollingResistance: 320,
    steeringLow: 2.35,
    steeringHigh: 1.15
  },
  {
    id: 'city_bus',
    name: 'GTR Bus',
    price: 9000,
    color: 0x6d5fa3,
    width: 126,
    height: 54,
    maxForward: 455,
    maxReverse: 155,
    acceleration: 320,
    braking: 650,
    rollingResistance: 340,
    steeringLow: 2.05,
    steeringHigh: 1.02
  },
  {
    id: 'utility_truck',
    name: 'Stadtwerke Utility',
    price: 4800,
    color: 0x6b808d,
    width: 106,
    height: 52,
    maxForward: 520,
    maxReverse: 180,
    acceleration: 410,
    braking: 700,
    rollingResistance: 315,
    steeringLow: 2.4,
    steeringHigh: 1.18
  }
];

export const VEHICLE_BY_ID = new Map(VEHICLES.map((vehicle) => [vehicle.id, vehicle]));

export function isVehicleId(value: unknown): value is VehicleId {
  return typeof value === 'string' && VEHICLE_BY_ID.has(value as VehicleId);
}

export function getVehicleProfile(value: unknown): VehicleProfile {
  return isVehicleId(value)
    ? VEHICLE_BY_ID.get(value)!
    : VEHICLE_BY_ID.get('city_compact')!;
}

export function sanitizeOwnedVehicles(value: unknown): VehicleId[] {
  const owned = Array.isArray(value)
    ? value.filter(isVehicleId)
    : [];

  if (!owned.includes('city_compact')) owned.unshift('city_compact');
  return [...new Set(owned)];
}
