export type CollectibleDefinition = {
  id: string;
  x: number;
  y: number;
  label: string;
  reward: number;
};

export const COLLECTIBLES: CollectibleDefinition[] = [
  { id: 'westend-workshop-alley', x: 790, y: 250, label: 'Werkstatt-Plakette', reward: 25 },
  { id: 'westend-cafe-corner', x: 1980, y: 540, label: 'Alte Café-Münze', reward: 25 },
  { id: 'westend-kiosk-sign', x: 3040, y: 550, label: 'Kiosk-Chip', reward: 25 },
  { id: 'westend-police-back', x: 770, y: 1320, label: 'Historisches Abzeichen', reward: 25 },
  { id: 'westend-station-east', x: 1990, y: 1390, label: 'Bahnhofsmarke', reward: 25 },
  { id: 'westend-park-tree', x: 1850, y: 2040, label: 'Park-Medaille', reward: 25 },
  { id: 'ostkai-dealer', x: 4050, y: 540, label: 'Velocity-Schlüsselanhänger', reward: 30 },
  { id: 'ostkai-market', x: 4890, y: 560, label: 'Markt-Jeton', reward: 30 },
  { id: 'ostkai-depot', x: 4050, y: 1390, label: 'MetroExpress-Siegel', reward: 30 },
  { id: 'ostkai-cafe', x: 4890, y: 1390, label: 'Kai-Café-Marke', reward: 30 },
  { id: 'ostkai-promenade-west', x: 3650, y: 2040, label: 'Uferstein West', reward: 35 },
  { id: 'ostkai-promenade-east', x: 4680, y: 2040, label: 'Uferstein Ost', reward: 35 }
];

export const COLLECTIBLE_IDS = new Set(COLLECTIBLES.map((collectible) => collectible.id));

export function sanitizeCollectedIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && COLLECTIBLE_IDS.has(id)))];
}
