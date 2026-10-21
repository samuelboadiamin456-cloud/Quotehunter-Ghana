/**
 * Comprehensive Geographic & Trade Reference for Ghana
 * Covers all 16 official administrative regions established by the Republic of Ghana.
 */

export interface GhanaRegionInfo {
  name: string;
  capital: string;
  keyIndustrialCenters: string[];
}

export const GHANA_REGIONS: GhanaRegionInfo[] = [
  {
    name: 'Greater Accra',
    capital: 'Accra',
    keyIndustrialCenters: ['Accra Central', 'Tema Industrial Area', 'Spintex', 'Kpone', 'Dawhenya', 'Achimota'],
  },
  {
    name: 'Ashanti',
    capital: 'Kumasi',
    keyIndustrialCenters: ['Kumasi Metropolitan', 'Suame Magazine', 'Obuasi', 'Asokwa', 'Ejisu'],
  },
  {
    name: 'Western',
    capital: 'Sekondi-Takoradi',
    keyIndustrialCenters: ['Takoradi Harbor', 'Tarkwa', 'Effia-Kwesimintsim', 'Prestea'],
  },
  {
    name: 'Western North',
    capital: 'Sefwi Wiawso',
    keyIndustrialCenters: ['Sefwi Wiawso', 'Bibiani', 'Juaboso'],
  },
  {
    name: 'Central',
    capital: 'Cape Coast',
    keyIndustrialCenters: ['Cape Coast', 'Kasoa', 'Winneba', 'Mfantseman'],
  },
  {
    name: 'Eastern',
    capital: 'Koforidua',
    keyIndustrialCenters: ['Koforidua', 'Akosombo', 'Nsawam', 'Nkawkaw'],
  },
  {
    name: 'Volta',
    capital: 'Ho',
    keyIndustrialCenters: ['Ho', 'Aflao', 'Keta', 'Hohoe'],
  },
  {
    name: 'Oti',
    capital: 'Dambai',
    keyIndustrialCenters: ['Dambai', 'Nkwanta', 'Jasikan', 'Kadjebi'],
  },
  {
    name: 'Northern',
    capital: 'Tamale',
    keyIndustrialCenters: ['Tamale Metropolitan', 'Yendi', 'Sagnarigu'],
  },
  {
    name: 'North East',
    capital: 'Nalerigu',
    keyIndustrialCenters: ['Nalerigu', 'Walewale', 'Gambaga'],
  },
  {
    name: 'Savannah',
    capital: 'Damongo',
    keyIndustrialCenters: ['Damongo', 'Salaga', 'Bole'],
  },
  {
    name: 'Upper East',
    capital: 'Bolgatanga',
    keyIndustrialCenters: ['Bolgatanga', 'Navrongo', 'Bawku', 'Paga'],
  },
  {
    name: 'Upper West',
    capital: 'Wa',
    keyIndustrialCenters: ['Wa', 'Lawra', 'Nandom', 'Tumu'],
  },
  {
    name: 'Bono',
    capital: 'Sunyani',
    keyIndustrialCenters: ['Sunyani', 'Berekum', 'Dormaa Ahenkro'],
  },
  {
    name: 'Bono East',
    capital: 'Techiman',
    keyIndustrialCenters: ['Techiman Commercial Hub', 'Kintampo', 'Atebubu'],
  },
  {
    name: 'Ahafo',
    capital: 'Goaso',
    keyIndustrialCenters: ['Goaso', 'Kenyasi', 'Duayaw Nkwanta'],
  },
];

export const GHANA_REGION_NAMES = GHANA_REGIONS.map(r => r.name);

export const STANDARD_CONSTRUCTION_UNITS = [
  'Bag (50kg)',
  'Length (12m)',
  'Trip (15m³)',
  'Trip (20m³)',
  'Trip (30m³)',
  'Piece',
  'Tonne',
  'Roll (25kg)',
  'Sheet (8x4 ft)',
  'Square Metre (m²)',
  'Linear Metre (m)',
  'Bundle',
  'Pack of 100',
  'Bucket (20L)',
];
