import type { FactionId } from '../systems/FactionSystem';

export type MissionDifficulty = 'green' | 'yellow' | 'red';
export type MissionStageType =
  | 'GO_TO'
  | 'DRIVE_TO'
  | 'INTERACT'
  | 'ENTER_VEHICLE'
  | 'LOSE_HEAT';

export type MissionStage = {
  type: MissionStageType;
  label: string;
  x?: number;
  y?: number;
  radius?: number;
};

export type MissionDefinition = {
  id: string;
  title: string;
  faction: FactionId;
  difficulty: MissionDifficulty;
  description: string;
  prerequisite?: string;
  rewardCredits: number;
  rewardReputation: number;
  stages: MissionStage[];
};

export const MISSIONS: MissionDefinition[] = [
  {
    id: 'M01',
    title: 'Die erste Runde',
    faction: 'metroexpress',
    difficulty: 'green',
    description: 'Hol das erste Paket und bring es zum Kiosk.',
    rewardCredits: 100,
    rewardReputation: 5,
    stages: [
      { type: 'GO_TO', label: 'Zum MetroExpress-Abholpunkt gehen', x: 760, y: 1020, radius: 85 },
      { type: 'INTERACT', label: 'Paket aufnehmen', x: 760, y: 1020, radius: 90 },
      { type: 'ENTER_VEHICLE', label: 'In dein Fahrzeug steigen' },
      { type: 'DRIVE_TO', label: 'Zum Kiosk fahren', x: 2830, y: 520, radius: 125 },
      { type: 'INTERACT', label: 'Paket am Kiosk abgeben', x: 2830, y: 520, radius: 125 }
    ]
  },
  {
    id: 'M02',
    title: 'Drei Stopps',
    faction: 'metroexpress',
    difficulty: 'green',
    prerequisite: 'M01',
    description: 'Drei Lieferstopps quer durch Westend.',
    rewardCredits: 180,
    rewardReputation: 6,
    stages: [
      { type: 'DRIVE_TO', label: 'Lieferung zum Bahnhof', x: 1650, y: 1420, radius: 135 },
      { type: 'INTERACT', label: 'Sendung übergeben', x: 1650, y: 1420, radius: 135 },
      { type: 'DRIVE_TO', label: 'Lieferung zum Café', x: 1650, y: 535, radius: 135 },
      { type: 'INTERACT', label: 'Sendung übergeben', x: 1650, y: 535, radius: 135 },
      { type: 'DRIVE_TO', label: 'Lieferung zur Garage', x: 2830, y: 1395, radius: 135 },
      { type: 'INTERACT', label: 'Letzte Sendung abgeben', x: 2830, y: 1395, radius: 135 }
    ]
  },
  {
    id: 'M03',
    title: 'Der falsche Lieferwagen',
    faction: 'metroexpress',
    difficulty: 'green',
    prerequisite: 'M02',
    description: 'Finde den gesuchten Lieferpunkt anhand der Beschreibung.',
    rewardCredits: 220,
    rewardReputation: 7,
    stages: [
      { type: 'GO_TO', label: 'Hinweis am Bahnhof holen', x: 1650, y: 1420, radius: 120 },
      { type: 'INTERACT', label: 'Hinweis lesen', x: 1650, y: 1420, radius: 120 },
      { type: 'GO_TO', label: 'Servicepunkt im Süden finden', x: 2630, y: 1790, radius: 105 },
      { type: 'INTERACT', label: 'Lieferwagen prüfen', x: 2630, y: 1790, radius: 105 }
    ]
  },
  {
    id: 'M04',
    title: 'Markt unter Zeitdruck',
    faction: 'kulturverein',
    difficulty: 'yellow',
    prerequisite: 'M03',
    description: 'Versorge die Marktstände nacheinander.',
    rewardCredits: 280,
    rewardReputation: 8,
    stages: [
      { type: 'DRIVE_TO', label: 'Material zum Westend-Park bringen', x: 1580, y: 1870, radius: 150 },
      { type: 'INTERACT', label: 'Material ausladen', x: 1580, y: 1870, radius: 150 },
      { type: 'DRIVE_TO', label: 'Nachschub am Kiosk holen', x: 2830, y: 520, radius: 130 },
      { type: 'INTERACT', label: 'Nachschub übernehmen', x: 2830, y: 520, radius: 130 },
      { type: 'DRIVE_TO', label: 'Zurück zum Markt', x: 760, y: 1790, radius: 125 }
    ]
  },
  {
    id: 'M05',
    title: 'Der Falschparker',
    faction: 'velocity',
    difficulty: 'green',
    prerequisite: 'M04',
    description: 'Hilf der Werkstatt bei einem blockierenden Fahrzeug.',
    rewardCredits: 320,
    rewardReputation: 8,
    stages: [
      { type: 'GO_TO', label: 'Zur Werkstatt gehen', x: 480, y: 535, radius: 120 },
      { type: 'INTERACT', label: 'Auftrag annehmen', x: 480, y: 535, radius: 120 },
      { type: 'DRIVE_TO', label: 'Zum Falschparker fahren', x: 2050, y: 1040, radius: 120 },
      { type: 'INTERACT', label: 'Fahrzeug sichern', x: 2050, y: 1040, radius: 120 },
      { type: 'DRIVE_TO', label: 'Zur Werkstatt zurückfahren', x: 480, y: 535, radius: 130 }
    ]
  },
  {
    id: 'M06',
    title: 'Taxischicht',
    faction: 'kulturverein',
    difficulty: 'green',
    prerequisite: 'M05',
    description: 'Fahre drei Fahrgäste sicher durch Westend.',
    rewardCredits: 350,
    rewardReputation: 8,
    stages: [
      { type: 'DRIVE_TO', label: 'Fahrgast am Bahnhof abholen', x: 1650, y: 1420, radius: 130 },
      { type: 'INTERACT', label: 'Fahrgast aufnehmen', x: 1650, y: 1420, radius: 130 },
      { type: 'DRIVE_TO', label: 'Zum Café fahren', x: 1650, y: 535, radius: 130 },
      { type: 'DRIVE_TO', label: 'Zum Park fahren', x: 1580, y: 1870, radius: 150 },
      { type: 'DRIVE_TO', label: 'Zur Garage fahren', x: 2830, y: 1395, radius: 130 }
    ]
  },
  {
    id: 'M07',
    title: 'Das Straßenfest',
    faction: 'kulturverein',
    difficulty: 'yellow',
    prerequisite: 'M06',
    description: 'Organisiere die wichtigsten Teile des Straßenfests.',
    rewardCredits: 500,
    rewardReputation: 12,
    stages: [
      { type: 'GO_TO', label: 'Plakate am Kiosk holen', x: 2830, y: 520, radius: 130 },
      { type: 'INTERACT', label: 'Plakate übernehmen', x: 2830, y: 520, radius: 130 },
      { type: 'DRIVE_TO', label: 'Material in den Park bringen', x: 1580, y: 1870, radius: 150 },
      { type: 'INTERACT', label: 'Bühnenmaterial ausladen', x: 1580, y: 1870, radius: 150 },
      { type: 'DRIVE_TO', label: 'Musiker am Bahnhof abholen', x: 1650, y: 1420, radius: 130 },
      { type: 'DRIVE_TO', label: 'Musiker zum Fest bringen', x: 760, y: 1790, radius: 130 }
    ]
  },
  {
    id: 'M08',
    title: 'Werkstattprüfung',
    faction: 'velocity',
    difficulty: 'yellow',
    prerequisite: 'M07',
    description: 'Absolviere eine ruhige Fahrzeugprüfung.',
    rewardCredits: 450,
    rewardReputation: 10,
    stages: [
      { type: 'GO_TO', label: 'Zur Werkstattprüfung', x: 480, y: 535, radius: 120 },
      { type: 'ENTER_VEHICLE', label: 'Prüffahrzeug übernehmen' },
      { type: 'DRIVE_TO', label: 'Checkpoint Nord', x: 1095, y: 250, radius: 120 },
      { type: 'DRIVE_TO', label: 'Checkpoint Ost', x: 2345, y: 815, radius: 120 },
      { type: 'DRIVE_TO', label: 'Checkpoint Süd', x: 1095, y: 1615, radius: 120 },
      { type: 'DRIVE_TO', label: 'Zur Werkstatt zurück', x: 480, y: 535, radius: 130 }
    ]
  },
  {
    id: 'M09',
    title: 'Westend Sprint',
    faction: 'velocity',
    difficulty: 'yellow',
    prerequisite: 'M08',
    description: 'Fahre eine Checkpoint-Runde ohne jemanden zu gefährden.',
    rewardCredits: 550,
    rewardReputation: 11,
    stages: [
      { type: 'ENTER_VEHICLE', label: 'Fahrzeug bereitmachen' },
      { type: 'DRIVE_TO', label: 'Checkpoint 1', x: 2345, y: 815, radius: 110 },
      { type: 'DRIVE_TO', label: 'Checkpoint 2', x: 2345, y: 1615, radius: 110 },
      { type: 'DRIVE_TO', label: 'Checkpoint 3', x: 1095, y: 1615, radius: 110 },
      { type: 'DRIVE_TO', label: 'Ziel', x: 1095, y: 815, radius: 110 }
    ]
  },
  {
    id: 'M10',
    title: 'Unerlaubte Probefahrt',
    faction: 'velocity',
    difficulty: 'yellow',
    prerequisite: 'M09',
    description: 'Bring das Testfahrzeug zurück, ohne die Lage eskalieren zu lassen.',
    rewardCredits: 600,
    rewardReputation: 10,
    stages: [
      { type: 'ENTER_VEHICLE', label: 'Testfahrzeug übernehmen' },
      { type: 'DRIVE_TO', label: 'Zur südlichen Route fahren', x: 2630, y: 1790, radius: 120 },
      { type: 'DRIVE_TO', label: 'Werkstatt erreichen', x: 480, y: 535, radius: 130 },
      { type: 'LOSE_HEAT', label: 'Aufmerksamkeit vollständig verlieren' }
    ]
  },
  {
    id: 'M11',
    title: 'Ganz Westend sucht dich',
    faction: 'metroexpress',
    difficulty: 'red',
    prerequisite: 'M10',
    description: 'Navigiere kontrolliert durch mehrere Kontrollzonen.',
    rewardCredits: 750,
    rewardReputation: 12,
    stages: [
      { type: 'DRIVE_TO', label: 'Erste Kontrollzone passieren', x: 2345, y: 815, radius: 125 },
      { type: 'DRIVE_TO', label: 'Über die Südachse ausweichen', x: 1095, y: 1615, radius: 125 },
      { type: 'DRIVE_TO', label: 'Sichere Garage erreichen', x: 2830, y: 1395, radius: 140 },
      { type: 'LOSE_HEAT', label: 'Fahndungsstufe auf null bringen' }
    ]
  },
  {
    id: 'M12',
    title: 'Westend-Nacht',
    faction: 'kulturverein',
    difficulty: 'red',
    prerequisite: 'M11',
    description: 'Das Finale verbindet Lieferung, Panne, Umleitung und Straßenfest.',
    rewardCredits: 1000,
    rewardReputation: 16,
    stages: [
      { type: 'GO_TO', label: 'Soundanlage am Bahnhof übernehmen', x: 1650, y: 1420, radius: 130 },
      { type: 'INTERACT', label: 'Soundanlage verladen', x: 1650, y: 1420, radius: 130 },
      { type: 'DRIVE_TO', label: 'Werkstatt wegen Fahrzeugproblem erreichen', x: 480, y: 535, radius: 130 },
      { type: 'INTERACT', label: 'Ersatzlösung organisieren', x: 480, y: 535, radius: 130 },
      { type: 'DRIVE_TO', label: 'Umleitung über die Ostachse', x: 2345, y: 1615, radius: 125 },
      { type: 'DRIVE_TO', label: 'Musiker am Bahnhof abholen', x: 1650, y: 1420, radius: 130 },
      { type: 'DRIVE_TO', label: 'Straßenfest erreichen', x: 760, y: 1790, radius: 140 },
      { type: 'INTERACT', label: 'Fest eröffnen', x: 760, y: 1790, radius: 140 }
    ]
  }
];

export const MISSION_BY_ID = new Map(MISSIONS.map((mission) => [mission.id, mission]));
