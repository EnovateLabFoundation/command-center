/**
 * Nigeria Geopolitical Data
 * 36 states + FCT, 6 geopolitical zones, 109 senatorial districts
 */

export const NIGERIA_GEOPOLITICAL_ZONES = [
  'North West',
  'North East',
  'North Central',
  'South West',
  'South East',
  'South South',
] as const;

export type GeopoliticalZone = typeof NIGERIA_GEOPOLITICAL_ZONES[number];

export const NIGERIA_STATES: { state: string; zone: GeopoliticalZone }[] = [
  // North West (7)
  { state: 'Kano',     zone: 'North West' },
  { state: 'Kaduna',   zone: 'North West' },
  { state: 'Katsina',  zone: 'North West' },
  { state: 'Zamfara',  zone: 'North West' },
  { state: 'Kebbi',    zone: 'North West' },
  { state: 'Sokoto',   zone: 'North West' },
  { state: 'Jigawa',   zone: 'North West' },
  // North East (6)
  { state: 'Borno',    zone: 'North East' },
  { state: 'Yobe',     zone: 'North East' },
  { state: 'Adamawa',  zone: 'North East' },
  { state: 'Taraba',   zone: 'North East' },
  { state: 'Gombe',    zone: 'North East' },
  { state: 'Bauchi',   zone: 'North East' },
  // North Central (6 + FCT)
  { state: 'Niger',    zone: 'North Central' },
  { state: 'Kwara',    zone: 'North Central' },
  { state: 'Kogi',     zone: 'North Central' },
  { state: 'Benue',    zone: 'North Central' },
  { state: 'Plateau',  zone: 'North Central' },
  { state: 'Nasarawa', zone: 'North Central' },
  { state: 'FCT',      zone: 'North Central' },
  // South West (6)
  { state: 'Lagos',    zone: 'South West' },
  { state: 'Oyo',      zone: 'South West' },
  { state: 'Ogun',     zone: 'South West' },
  { state: 'Osun',     zone: 'South West' },
  { state: 'Ondo',     zone: 'South West' },
  { state: 'Ekiti',    zone: 'South West' },
  // South East (5)
  { state: 'Anambra',  zone: 'South East' },
  { state: 'Enugu',    zone: 'South East' },
  { state: 'Imo',      zone: 'South East' },
  { state: 'Abia',     zone: 'South East' },
  { state: 'Ebonyi',   zone: 'South East' },
  // South South (6)
  { state: 'Rivers',   zone: 'South South' },
  { state: 'Delta',    zone: 'South South' },
  { state: 'Edo',      zone: 'South South' },
  { state: 'Cross River', zone: 'South South' },
  { state: 'Akwa Ibom',   zone: 'South South' },
  { state: 'Bayelsa',     zone: 'South South' },
];

export const NIGERIA_STATE_NAMES = NIGERIA_STATES.map((s) => s.state).sort();

/** Map state → geopolitical zone */
export const STATE_TO_ZONE: Record<string, GeopoliticalZone> = Object.fromEntries(
  NIGERIA_STATES.map((s) => [s.state, s.zone]),
) as Record<string, GeopoliticalZone>;

/** Map zone → states */
export const ZONE_TO_STATES: Record<GeopoliticalZone, string[]> = {} as Record<
  GeopoliticalZone,
  string[]
>;
for (const { state, zone } of NIGERIA_STATES) {
  if (!ZONE_TO_STATES[zone]) ZONE_TO_STATES[zone] = [];
  ZONE_TO_STATES[zone].push(state);
}

/**
 * Senatorial districts per state (3 per state, 1 for FCT = 109 total)
 * Pattern: [State] Central / North or East or West / South or East or West
 */
export const NIGERIA_SENATORIAL_DISTRICTS: Record<string, string[]> = {
  Abia:         ['Abia Central', 'Abia North', 'Abia South'],
  Adamawa:      ['Adamawa Central', 'Adamawa North', 'Adamawa South'],
  'Akwa Ibom':  ['Akwa Ibom North East', 'Akwa Ibom North West', 'Akwa Ibom South'],
  Anambra:      ['Anambra Central', 'Anambra North', 'Anambra South'],
  Bauchi:       ['Bauchi Central', 'Bauchi North', 'Bauchi South'],
  Bayelsa:      ['Bayelsa Central', 'Bayelsa East', 'Bayelsa West'],
  Benue:        ['Benue North East', 'Benue North West', 'Benue South'],
  Borno:        ['Borno Central', 'Borno North', 'Borno South'],
  'Cross River':['Cross River Central', 'Cross River North', 'Cross River South'],
  Delta:        ['Delta Central', 'Delta North', 'Delta South'],
  Ebonyi:       ['Ebonyi Central', 'Ebonyi North', 'Ebonyi South'],
  Edo:          ['Edo Central', 'Edo North', 'Edo South'],
  Ekiti:        ['Ekiti Central', 'Ekiti North', 'Ekiti South'],
  Enugu:        ['Enugu East', 'Enugu North', 'Enugu West'],
  FCT:          ['FCT (Abuja)'],
  Gombe:        ['Gombe Central', 'Gombe North', 'Gombe South'],
  Imo:          ['Imo East', 'Imo North', 'Imo West'],
  Jigawa:       ['Jigawa Central', 'Jigawa North East', 'Jigawa North West'],
  Kaduna:       ['Kaduna Central', 'Kaduna North', 'Kaduna South'],
  Kano:         ['Kano Central', 'Kano North', 'Kano South'],
  Katsina:      ['Katsina Central', 'Katsina North', 'Katsina South'],
  Kebbi:        ['Kebbi Central', 'Kebbi North', 'Kebbi South'],
  Kogi:         ['Kogi Central', 'Kogi East', 'Kogi West'],
  Kwara:        ['Kwara Central', 'Kwara North', 'Kwara South'],
  Lagos:        ['Lagos Central', 'Lagos East', 'Lagos West'],
  Nasarawa:     ['Nasarawa', 'Nasarawa North', 'Nasarawa South'],
  Niger:        ['Niger East', 'Niger North', 'Niger South'],
  Ogun:         ['Ogun Central', 'Ogun East', 'Ogun West'],
  Ondo:         ['Ondo Central', 'Ondo North', 'Ondo South'],
  Osun:         ['Osun Central', 'Osun East', 'Osun West'],
  Oyo:          ['Oyo Central', 'Oyo North', 'Oyo South'],
  Plateau:      ['Plateau Central', 'Plateau North', 'Plateau South'],
  Rivers:       ['Rivers East', 'Rivers South East', 'Rivers West'],
  Sokoto:       ['Sokoto East', 'Sokoto North', 'Sokoto South'],
  Taraba:       ['Taraba Central', 'Taraba North', 'Taraba South'],
  Yobe:         ['Yobe East', 'Yobe North', 'Yobe South'],
  Zamfara:      ['Zamfara Central', 'Zamfara North', 'Zamfara West'],
};

/** Get senatorial districts for a given state */
export function getSenatorialDistricts(state: string): string[] {
  return NIGERIA_SENATORIAL_DISTRICTS[state] ?? [];
}

/** Get geopolitical zone for a given state */
export function getZoneForState(state: string): GeopoliticalZone | undefined {
  return STATE_TO_ZONE[state];
}
