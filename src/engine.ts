/**
 * Moonwater Ephemeris Engine — Solar Fire v9 Full Parity Edition
 *
 * Complete wrapper over the Swiss Ephemeris C API (compiled to WASM by @kuntay/swisseph),
 * replicating the full astronomical surface of SolarFire.exe:
 * - Complete Body Catalog: Sun..Pluto, Chiron, Pholus, Mean/Osculating Lilith,
 *   Mean/True Lunar Nodes (North & South), Asteroids (Ceres, Pallas, Juno, Vesta,
 *   Hygiea, Astraea), TNOs/KBOs (Eris, Sedna), 8 Uranian/Hamburg School points
 *   (Cupido, Hades, Zeus, Kronos, Apollon, Admetos, Vulcanus, Poseidon), and
 *   Chart Angles/Vertices (Asc, MC, DSC, IC, Vertex, AntiVertex, East Point, Co-Ascendant).
 * - Reference Planes & Coordinate Modes: Geocentric, Topocentric (swe_set_topo),
 *   Heliocentric (SEFLG_HELCTR), Ecliptic & Equatorial (Right Ascension, Declination,
 *   Out-of-Bounds |δ| > 23°26'21").
 * - 30 Major Fixed Stars via swe_fixstar2_ut + sefstars.txt.
 * - 8 Hermetic/Traditional Arabic Parts (Fortune, Spirit, Necessity, Eros, Victory,
 *   Courage, Marriage, Nemesis).
 * - 11 Native Swiss Ephemeris House Systems + 4 Derived/Rotated & Vedic Sripati (Hindu Bhava) systems.
 * - 7 Ayanamshas (Lahiri, Fagan/Bradley, Raman, Krishnamurti, De Luce, Yukteshwar, True Citra),
 *   27 Lunar Nakshatras with Padas & Rulers, and 7 Vedic Divisional Vargas (D2, D3, D7, D9, D10, D12, D60).
 */

import * as fs from 'fs';
import * as path from 'path';
import { createSwissEph } from '@kuntay/swisseph';

export enum SwePlanet {
  SE_ECL_NUT = -1,
  SE_SUN = 0,
  SE_MOON = 1,
  SE_MERCURY = 2,
  SE_VENUS = 3,
  SE_MARS = 4,
  SE_JUPITER = 5,
  SE_SATURN = 6,
  SE_URANUS = 7,
  SE_NEPTUNE = 8,
  SE_PLUTO = 9,
  SE_MEAN_NODE = 10,
  SE_TRUE_NODE = 11,
  SE_MEAN_APOG = 12,
  SE_OSCU_APOG = 13,
  SE_EARTH = 14,
  SE_CHIRON = 15,
  SE_PHOLUS = 16,
  SE_CERES = 17,
  SE_PALLAS = 18,
  SE_JUNO = 19,
  SE_VESTA = 20,
  // Uranian / Hamburg School Planets (SE_FICT_OFFSET_1 = 39 + 1..8)
  SE_CUPIDO = 40,
  SE_HADES = 41,
  SE_ZEUS = 42,
  SE_KRONOS = 43,
  SE_APOLLON = 44,
  SE_ADMETOS = 45,
  SE_VULCANUS = 46,
  SE_POSEIDON = 47,
  SE_ISIS_TRANSPLUTO = 48,
  // Custom Keplerian Orbital Elements appended to seorbel.txt (slots 31..34 => IDs 70..73)
  SE_HYGIEA = 70,
  SE_ASTRAEA = 71,
  SE_ERIS = 72,
  SE_SEDNA = 73,
}

export enum SweFlag {
  SEFLG_JPLEPH = 1,
  SEFLG_SWIEPH = 2,
  SEFLG_MOSEPH = 4,
  SEFLG_HELCTR = 8,
  SEFLG_TRUEPOS = 16,
  SEFLG_J2000 = 32,
  SEFLG_NONUT = 64,
  SEFLG_SPEED3 = 128,
  SEFLG_SPEED = 256,
  SEFLG_NOGDEFL = 512,
  SEFLG_NOABERR = 1024,
  SEFLG_EQUATORIAL = 2048,
  SEFLG_XYZ = 4096,
  SEFLG_RADIANS = 8192,
  SEFLG_BARYCTR = 16384,
  SEFLG_TOPOCTR = 32768,
  SEFLG_SIDEREAL = 65536,
}

export enum HouseSystem {
  Placidus = 'P',
  Koch = 'K',
  Regiomontanus = 'R',
  Campanus = 'C',
  Topocentric = 'T',
  Equal = 'A',
  WholeSigns = 'W',
  Porphyry = 'O',
  Alcabitius = 'B',
  Morinus = 'M',
  Meridian = 'X',
  // Derived / Rotated & Vedic Systems (Solar Fire IDs 640-657)
  SolarSign = 'S',     // Sun on 1st Cusp (Equal 30° from Sun)
  AriesZero = 'Z',     // 0° Aries on 1st Cusp
  MoonOnFirst = 'L',   // Moon on 1st Cusp (Equal 30° from Moon)
  Sripati = 'I',       // Hindu Bhava / Sripati (Midpoint of Porphyry trisections)
}

export enum ZodiacMode {
  Tropical = 'tropical',
  Sidereal = 'sidereal',
}

export enum ObserverMode {
  Geocentric = 'geocentric',
  Topocentric = 'topocentric',
  Heliocentric = 'heliocentric',
}

export enum AyanamshaSystem {
  FaganBradley = 0,
  Lahiri = 1,
  DeLuce = 2,
  Raman = 3,
  Krishnamurti = 5,
  Yukteshwar = 7,
  TrueCitra = 27,
}

export enum CalendarType {
  Julian = 0,
  Gregorian = 1,
}

export interface PlanetaryCoordinates {
  longitude: number;
  latitude: number;
  distance: number;
  longitudeSpeed: number;
  latitudeSpeed: number;
  distanceSpeed: number;
  rightAscension?: number;
  declination?: number;
  isOutOfBounds?: boolean;
  rflag: number;
}

export interface HouseCusps {
  cusps: number[]; // 1-indexed (1..12), index 0 unused
  ascmc: {
    ascendant: number;
    mc: number;
    armc: number;
    vertex: number;
    equatorialAsc: number;
    coAscendant1: number;
    coAscendant2: number;
    polarAscendant: number;
    raw: number[];
  };
  isPolarFallback?: boolean;
}

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
  hour: number; // fractional
}

export interface FixedStarSpec {
  queryName: string;
  displayName: string;
  bayer: string;
  constellation: string;
  magnitude: number;
  nature: string; // Ptolemaic planetary nature
}

export interface FixedStarContact {
  star: string;
  bayer: string;
  constellation: string;
  nature: string;
  longitude: number;
  latitude: number;
  declination: number;
  formatted: string;
  planetName: string;
  planetGlyph: string;
  contactType: 'Conjunción Eclíptica' | 'Paralelo de Declinación';
  orb: number;
}

export interface ArabicPartResult {
  id: string;
  name: string;
  glyph: string;
  formulaDiurnal: string;
  formulaNocturnal: string;
  longitude: number;
  declination: number;
}

export interface NakshatraInfo {
  index: number; // 1..27
  name: string;
  ruler: string;
  deity: string;
  nature: string;
  pada: number; // 1..4
  degreeInNakshatra: number;
}

export type VargaCode = 'D1' | 'D2' | 'D3' | 'D7' | 'D9' | 'D10' | 'D12' | 'D60';

/** Mean / Reference Obliquity threshold for Out of Bounds (23°26'21" = 23.439167°). */
export const OOB_DECLINATION_LIMIT = 23.439167;

/** 30 Major Fixed Stars catalog matching SolarFire's default Fixed Stars set. */
export const MAJOR_FIXED_STARS: FixedStarSpec[] = [
  { queryName: 'Regulus', displayName: 'Regulus (Cor Leonis)', bayer: 'α Leo', constellation: 'Leo', magnitude: 1.36, nature: '♂ ♃' },
  { queryName: 'Spica', displayName: 'Spica (Arista)', bayer: 'α Vir', constellation: 'Virgo', magnitude: 0.98, nature: '♀ ♂' },
  { queryName: 'Algol', displayName: 'Algol (Caput Medusae)', bayer: 'β Per', constellation: 'Perseus', magnitude: 2.09, nature: '♄ ♃' },
  { queryName: 'Antares', displayName: 'Antares (Cor Scorpii)', bayer: 'α Sco', constellation: 'Scorpio', magnitude: 1.06, nature: '♂ ♃' },
  { queryName: 'Aldebaran', displayName: 'Aldebaran (Oculus Tauri)', bayer: 'α Tau', constellation: 'Taurus', magnitude: 0.87, nature: '♂' },
  { queryName: 'Fomalhaut', displayName: 'Fomalhaut (Os Piscis)', bayer: 'α PsA', constellation: 'Piscis Austrinus', magnitude: 1.17, nature: '♀ ☿' },
  { queryName: 'Sirius', displayName: 'Sirius (Canícula)', bayer: 'α CMa', constellation: 'Canis Major', magnitude: -1.44, nature: '♃ ♂' },
  { queryName: 'Vega', displayName: 'Vega (Wega)', bayer: 'α Lyr', constellation: 'Lyra', magnitude: 0.03, nature: '♀ ☿' },
  { queryName: 'Betelgeuse', displayName: 'Betelgeuse', bayer: 'α Ori', constellation: 'Orion', magnitude: 0.45, nature: '♂ ☿' },
  { queryName: 'Arcturus', displayName: 'Arcturus', bayer: 'α Boo', constellation: 'Boötes', magnitude: -0.05, nature: '♃ ♂' },
  { queryName: 'Rigel', displayName: 'Rigel', bayer: 'β Ori', constellation: 'Orion', magnitude: 0.18, nature: '♃ ♄' },
  { queryName: 'Pollux', displayName: 'Pollux', bayer: 'β Gem', constellation: 'Gemini', magnitude: 1.16, nature: '♂' },
  { queryName: 'Castor', displayName: 'Castor', bayer: 'α Gem', constellation: 'Gemini', magnitude: 1.58, nature: '☿' },
  { queryName: 'Capella', displayName: 'Capella', bayer: 'α Aur', constellation: 'Auriga', magnitude: 0.08, nature: '♂ ☿' },
  { queryName: 'Procyon', displayName: 'Procyon', bayer: 'α CMi', constellation: 'Canis Minor', magnitude: 0.40, nature: '☿ ♂' },
  { queryName: 'Achernar', displayName: 'Achernar', bayer: 'α Eri', constellation: 'Eridanus', magnitude: 0.45, nature: '♃' },
  { queryName: 'Altair', displayName: 'Altair', bayer: 'α Aql', constellation: 'Aquila', magnitude: 0.76, nature: '♂ ♃' },
  { queryName: 'Deneb', displayName: 'Deneb Adige', bayer: 'α Cyg', constellation: 'Cygnus', magnitude: 1.25, nature: '♀ ☿' },
  { queryName: 'Denebola', displayName: 'Denebola', bayer: 'β Leo', constellation: 'Leo', magnitude: 2.14, nature: '♄ ♀' },
  { queryName: 'Alpheratz', displayName: 'Alpheratz (Sirrah)', bayer: 'α And', constellation: 'Andromeda', magnitude: 2.07, nature: '♃ ♀' },
  { queryName: 'Mirach', displayName: 'Mirach', bayer: 'β And', constellation: 'Andromeda', magnitude: 2.07, nature: '♀' },
  { queryName: 'Almach', displayName: 'Almach', bayer: 'γ And', constellation: 'Andromeda', magnitude: 2.10, nature: '♀' },
  { queryName: 'Hamal', displayName: 'Hamal', bayer: 'α Ari', constellation: 'Aries', magnitude: 2.01, nature: '♂ ♄' },
  { queryName: 'Alcyone', displayName: 'Alcyone (Pléyades)', bayer: 'η Tau', constellation: 'Taurus', magnitude: 2.85, nature: '☽ ♂' },
  { queryName: 'Bellatrix', displayName: 'Bellatrix', bayer: 'γ Ori', constellation: 'Orion', magnitude: 1.64, nature: '♂ ☿' },
  { queryName: 'Alnilam', displayName: 'Alnilam (Cinturón de Orión)', bayer: 'ε Ori', constellation: 'Orion', magnitude: 1.69, nature: '♃ ♄' },
  { queryName: 'Canopus', displayName: 'Canopus', bayer: 'α Car', constellation: 'Carina', magnitude: -0.62, nature: '♄ ♃' },
  { queryName: 'Vindemiatrix', displayName: 'Vindemiatrix', bayer: 'ε Vir', constellation: 'Virgo', magnitude: 2.85, nature: '♄ ☿' },
  { queryName: 'Zubenelgenubi', displayName: 'Zubenelgenubi (Balanza Sur)', bayer: 'α Lib', constellation: 'Libra', magnitude: 2.75, nature: '♄ ♂' },
  { queryName: 'Zubeneschamali', displayName: 'Zubeneschamali (Balanza Norte)', bayer: 'β Lib', constellation: 'Libra', magnitude: 2.61, nature: '♃ ☿' },
];

/** 27 Vedic Nakshatras extracted from SolarFire RT_STRING IDs 701..727. */
export const NAKSHATRA_CATALOG: Array<{ name: string; ruler: string; nature: string; quality: string }> = [
  { name: 'Ashwini', ruler: 'Ketu (☋)', nature: 'Laghu', quality: 'Ligera y veloz (inicios, curación, viajes)' },
  { name: 'Bharani', ruler: 'Venus (♀)', nature: 'Krura', quality: 'Severa o firme (transformación, disciplina)' },
  { name: 'Krittika', ruler: 'Sun (☉)', nature: 'Misra', quality: 'Mixta (purificación, corte, acción directa)' },
  { name: 'Rohini', ruler: 'Moon (☽)', nature: 'Sthira', quality: 'Fija y permanente (fundación, fertilidad, crecimiento)' },
  { name: 'Mrigashira', ruler: 'Mars (♂)', nature: 'Mridu', quality: 'Suave y tierna (búsqueda, arte, alianzas)' },
  { name: 'Ardra', ruler: 'Rahu (☊)', nature: 'Tikshna', quality: 'Aguda e intensa (tormenta, renovación radical)' },
  { name: 'Punarvasu', ruler: 'Jupiter (♃)', nature: 'Chara', quality: 'Móvil y renovadora (retorno de la luz, mudanzas)' },
  { name: 'Pushya', ruler: 'Saturn (♄)', nature: 'Laghu', quality: 'Ligera y nutritiva (prosperidad espiritual, cuidado)' },
  { name: 'Ashlesha', ruler: 'Mercury (☿)', nature: 'Tikshna', quality: 'Penetrante e hipnótica (kundalini, estrategia)' },
  { name: 'Magha', ruler: 'Ketu (☋)', nature: 'Krura', quality: 'Regia y severa (linaje, autoridad ancestral)' },
  { name: 'Purva Phalguni', ruler: 'Venus (♀)', nature: 'Krura', quality: 'Creativa y vital (deleite, procreación, escena)' },
  { name: 'Uttara Phalguni', ruler: 'Sun (☉)', nature: 'Sthira', quality: 'Fija y noble (contratos, matrimonio, mecenazgo)' },
  { name: 'Hasta', ruler: 'Moon (☽)', nature: 'Laghu', quality: 'Destreza manual y rapidez (artesanía, comercio)' },
  { name: 'Chitra', ruler: 'Mars (♂)', nature: 'Mridu', quality: 'Brillante y arquitectónica (diseño, estética)' },
  { name: 'Swati', ruler: 'Rahu (☊)', nature: 'Chara', quality: 'Independiente y flexible (comercio, diplomacia)' },
  { name: 'Vishakha', ruler: 'Jupiter (♃)', nature: 'Misra', quality: 'Bifurcada y ambiciosa (propósito focalizado)' },
  { name: 'Anuradha', ruler: 'Saturn (♄)', nature: 'Mridu', quality: 'Amistosa y devocional (cooperación, organización)' },
  { name: 'Jyeshtha', ruler: 'Mercury (☿)', nature: 'Tikshna', quality: 'Antigua y protectora (primogenitura, ocultismo)' },
  { name: 'Mula', ruler: 'Ketu (☋)', nature: 'Tikshna', quality: 'Raíz profunda (investigación, desarraigo de lo falso)' },
  { name: 'Purva Ashadha', ruler: 'Venus (♀)', nature: 'Krura', quality: 'Invencible y purificadora (convicción, aguas)' },
  { name: 'Uttara Ashadha', ruler: 'Sun (☉)', nature: 'Sthira', quality: 'Victoria duradera (integridad, liderazgo ético)' },
  { name: 'Shravana', ruler: 'Moon (☽)', nature: 'Chara', quality: 'Escucha sabia (aprendizaje oral, transmisión)' },
  { name: 'Dhanishtha', ruler: 'Mars (♂)', nature: 'Chara', quality: 'Sinfonía y abundancia (ritmo, música, recursos)' },
  { name: 'Shatabhisha', ruler: 'Rahu (☊)', nature: 'Chara', quality: 'Los cien médicos (sanación, astronomía, misterio)' },
  { name: 'Purva Bhadrapada', ruler: 'Jupiter (♃)', nature: 'Krura', quality: 'Fuego ascético (pasión espiritual, purificación)' },
  { name: 'Uttara Bhadrapada', ruler: 'Saturn (♄)', nature: 'Sthira', quality: 'Profundidad oceánica (estabilidad, sabiduría)' },
  { name: 'Revati', ruler: 'Mercury (☿)', nature: 'Mridu', quality: 'Nutritiva y trascendente (culminación del viaje)' },
];

/** Systems that divide semi-arcs / prime vertical and can fail beyond the polar circles. */
const POLAR_SENSITIVE: HouseSystem[] = [
  HouseSystem.Placidus,
  HouseSystem.Koch,
  HouseSystem.Regiomontanus,
  HouseSystem.Campanus,
  HouseSystem.Topocentric,
  HouseSystem.Alcabitius,
];

/** Custom Keplerian Orbital Elements appended to seorbel.txt (slots 31..34 => SwePlanet 70..73) */
const EXTRA_ORBITAL_ELEMENTS = `
2451545.0, J2000, 198.4520, 3.13910, 0.11460, 312.3200, 283.2000, 3.8310, Hygiea
2451545.0, J2000, 290.7510, 2.57400, 0.19120, 358.6500, 141.5800, 5.3670, Astraea
2451545.0, J2000, 197.6340, 67.8640, 0.43607, 151.6390, 35.9510, 44.0400, Eris
2451545.0, J2000, 357.4560, 506.080, 0.84960, 311.2900, 144.4000, 11.9290, Sedna
`;

export function norm360(deg: number): number {
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
}

/** Signed shortest difference b - a in (-180, 180]. */
export function signedDiff(a: number, b: number): number {
  let d = norm360(b - a);
  if (d > 180) d -= 360;
  return d;
}

/** Midpoint on the shorter arc between two ecliptic longitudes. */
export function shortArcMidpoint(a: number, b: number): number {
  return norm360(a + signedDiff(a, b) / 2);
}

/**
 * Converts a Julian Day (UT) to a Gregorian calendar date (Meeus, Astronomical Algorithms ch. 7).
 */
export function jdToCalendar(jd: number): CalendarDate {
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  let a = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const dayFrac = b - d - Math.floor(30.6001 * e) + f;
  const day = Math.floor(dayFrac);
  const hour = (dayFrac - day) * 24;
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  return { year, month, day, hour };
}

/**
 * Computes Nakshatra (1..27) and Pada (1..4) for a given (typically Sidereal) longitude.
 */
export function calculateNakshatra(longitude: number): NakshatraInfo {
  const lon = norm360(longitude);
  const span = 360.0 / 27.0; // 13.3333333° (13°20')
  const padaSpan = span / 4.0; // 3.3333333° (3°20')
  const idx = Math.min(26, Math.floor(lon / span));
  const degInNak = lon - idx * span;
  const pada = Math.min(4, Math.floor(degInNak / padaSpan) + 1);
  const spec = NAKSHATRA_CATALOG[idx];
  return {
    index: idx + 1,
    name: spec.name,
    ruler: spec.ruler,
    deity: spec.nature,
    nature: spec.quality,
    pada,
    degreeInNakshatra: degInNak,
  };
}

/**
 * Computes Vedic Divisional Chart (Varga) longitude from a Natal longitude.
 * Follows standard Parashara rules (as implemented in Solar Fire's Vedic module IDs 540-558).
 */
export function computeVargaLongitude(longitude: number, varga: VargaCode): number {
  const lon = norm360(longitude);
  if (varga === 'D1') return lon;

  const signIdx = Math.floor(lon / 30); // 0..11
  const degInSign = lon - signIdx * 30; // 0..30
  const isOddSign = signIdx % 2 === 0; // Aries=0 (1st sign, odd), Taurus=1 (2nd sign, even)

  if (varga === 'D2') {
    // Hora: 1st half (0..15°), 2nd half (15..30°)
    // Odd signs: 0-15° Leo (4), 15-30° Cancer (3); Even signs: 0-15° Cancer (3), 15-30° Leo (4)
    const firstHalf = degInSign < 15;
    const targetSign = isOddSign ? (firstHalf ? 4 : 3) : (firstHalf ? 3 : 4);
    const remDeg = (degInSign % 15) * 2;
    return targetSign * 30 + remDeg;
  }

  if (varga === 'D3') {
    // Drekkana: 3 parts of 10° => 1st (same sign), 2nd (5th from sign), 3rd (9th from sign)
    const part = Math.min(2, Math.floor(degInSign / 10));
    const targetSign = (signIdx + part * 4) % 12;
    const remDeg = (degInSign - part * 10) * 3;
    return targetSign * 30 + remDeg;
  }

  if (varga === 'D7') {
    // Saptamsha: 7 parts of 4°17'8.57". Odd sign starts from same sign; Even sign starts from 7th sign.
    const span = 30 / 7;
    const part = Math.min(6, Math.floor(degInSign / span));
    const startSign = isOddSign ? signIdx : (signIdx + 6) % 12;
    const targetSign = (startSign + part) % 12;
    const remDeg = (degInSign - part * span) * 7;
    return targetSign * 30 + remDeg;
  }

  if (varga === 'D9') {
    // Navamsha: harmonic 9 (exact continuous 9x longitude)
    return norm360(lon * 9);
  }

  if (varga === 'D10') {
    // Dashamsha: 10 parts of 3°. Odd sign starts from same sign; Even sign starts from 9th sign.
    const part = Math.min(9, Math.floor(degInSign / 3));
    const startSign = isOddSign ? signIdx : (signIdx + 8) % 12;
    const targetSign = (startSign + part) % 12;
    const remDeg = (degInSign - part * 3) * 10;
    return targetSign * 30 + remDeg;
  }

  if (varga === 'D12') {
    // Dwadashamsha: 12 parts of 2.5° starting from same sign
    const span = 2.5;
    const part = Math.min(11, Math.floor(degInSign / span));
    const targetSign = (signIdx + part) % 12;
    const remDeg = (degInSign - part * span) * 12;
    return targetSign * 30 + remDeg;
  }

  if (varga === 'D60') {
    // Shashtiamsha: 60 parts of 0.5° starting from same sign
    const span = 0.5;
    const part = Math.min(59, Math.floor(degInSign / span));
    const targetSign = (signIdx + part) % 12;
    const remDeg = (degInSign - part * span) * 60;
    return targetSign * 30 + remDeg;
  }

  return lon;
}

export class EphemerisEngine {
  private sweInstance: any = null;
  private ephemerisFilesLoaded = false;

  public async init(epheDir?: string): Promise<void> {
    if (this.sweInstance) return;
    this.sweInstance = await createSwissEph();

    const dir = epheDir ?? path.join(__dirname, '..', 'node_modules', '@kuntay', 'swisseph-data', 'ephe');
    try {
      const files: Record<string, Uint8Array> = {};
      for (const name of fs.readdirSync(dir)) {
        if (name.endsWith('.se1') || name.endsWith('.txt')) {
          if (name === 'seorbel.txt') {
            const origText = fs.readFileSync(path.join(dir, name), 'utf8');
            files[name] = new TextEncoder().encode(origText + EXTRA_ORBITAL_ELEMENTS);
          } else {
            files[name] = new Uint8Array(fs.readFileSync(path.join(dir, name)));
          }
        }
      }
      if (Object.keys(files).length > 0) {
        this.sweInstance.mountEphemeris(files);
        this.ephemerisFilesLoaded = true;
      }
    } catch {
      this.ephemerisFilesLoaded = false;
    }
  }

  public get hasEphemerisFiles(): boolean {
    return this.ephemerisFilesLoaded;
  }

  public get raw(): any {
    if (!this.sweInstance) {
      throw new Error('EphemerisEngine not initialized. Call await engine.init() first.');
    }
    return this.sweInstance.raw;
  }

  private readDoubles(ptr: number, count: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < count; i++) {
      result.push(this.raw.getValue(ptr + i * 8, 'double'));
    }
    return result;
  }

  public swe_julday(
    year: number,
    month: number,
    day: number,
    hour: number,
    gregflag: CalendarType = CalendarType.Gregorian
  ): number {
    return this.raw._swe_julday(year, month, day, hour, gregflag);
  }

  public swe_set_sid_mode(sidMode: AyanamshaSystem, t0 = 0, ayanT0 = 0): void {
    this.raw._swe_set_sid_mode(sidMode, t0, ayanT0);
  }

  public swe_set_topo(geolon: number, geolat: number, geoalt = 0): void {
    this.raw._swe_set_topo(geolon, geolat, geoalt);
  }

  /**
   * Computes both Ecliptic and Equatorial coordinates (Right Ascension & Declination)
   * and evaluates Out of Bounds status (|declination| > 23°26'21").
   */
  public swe_calc_ut(
    tjd_ut: number,
    ipl: SwePlanet | number,
    iflag: number = SweFlag.SEFLG_SWIEPH | SweFlag.SEFLG_SPEED
  ): PlanetaryCoordinates {
    const raw = this.raw;
    const xPtr = raw._malloc(48);
    const errPtr = raw._malloc(256);
    raw.setValue(errPtr, 0, 'i8');

    try {
      let rflag = raw._swe_calc_ut(tjd_ut, ipl, iflag, xPtr, errPtr);
      if (rflag < 0) {
        const fallback = (iflag & ~SweFlag.SEFLG_SWIEPH & ~SweFlag.SEFLG_JPLEPH) | SweFlag.SEFLG_MOSEPH;
        raw.setValue(errPtr, 0, 'i8');
        rflag = raw._swe_calc_ut(tjd_ut, ipl, fallback, xPtr, errPtr);
        if (rflag < 0) {
          throw new Error(`swe_calc_ut failed for body ${ipl}: ${raw.UTF8ToString(errPtr)}`);
        }
      }
      const d = this.readDoubles(xPtr, 6);

      let rightAscension = 0;
      let declination = 0;
      if (ipl !== SwePlanet.SE_ECL_NUT) {
        const eqFlags = (iflag & ~SweFlag.SEFLG_SIDEREAL) | SweFlag.SEFLG_EQUATORIAL;
        raw.setValue(errPtr, 0, 'i8');
        let eqRf = raw._swe_calc_ut(tjd_ut, ipl, eqFlags, xPtr, errPtr);
        if (eqRf < 0) {
          const eqFallback = (eqFlags & ~SweFlag.SEFLG_SWIEPH & ~SweFlag.SEFLG_JPLEPH) | SweFlag.SEFLG_MOSEPH;
          eqRf = raw._swe_calc_ut(tjd_ut, ipl, eqFallback, xPtr, errPtr);
        }
        if (eqRf >= 0) {
          const eqD = this.readDoubles(xPtr, 6);
          rightAscension = norm360(eqD[0]);
          declination = eqD[1];
        }
      }

      return {
        longitude: ipl === SwePlanet.SE_ECL_NUT ? d[0] : norm360(d[0]),
        latitude: d[1],
        distance: d[2],
        longitudeSpeed: d[3],
        latitudeSpeed: d[4],
        distanceSpeed: d[5],
        rightAscension,
        declination,
        isOutOfBounds: Math.abs(declination) > OOB_DECLINATION_LIMIT,
        rflag,
      };
    } finally {
      raw._free(xPtr);
      raw._free(errPtr);
    }
  }

  /** Converts an ecliptic longitude (with lat=0) to Equatorial RA & Declination given true obliquity eps. */
  public eclipticToEquatorial(lonDeg: number, latDeg: number, epsDeg: number): { rightAscension: number; declination: number } {
    const rad = Math.PI / 180;
    const deg = 180 / Math.PI;
    const l = lonDeg * rad;
    const b = latDeg * rad;
    const e = epsDeg * rad;

    const sinDec = Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l);
    const dec = Math.asin(Math.max(-1, Math.min(1, sinDec))) * deg;

    const y = Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e);
    const x = Math.cos(l);
    const ra = norm360(Math.atan2(y, x) * deg);

    return { rightAscension: ra, declination: dec };
  }

  /** Converts Equatorial Right Ascension (with lat=0 on ecliptic) back to Ecliptic Longitude. */
  public rightAscensionToEclipticLon(raDeg: number, epsDeg: number): number {
    const rad = Math.PI / 180;
    const deg = 180 / Math.PI;
    const alpha = raDeg * rad;
    const e = epsDeg * rad;
    const lon = Math.atan2(Math.sin(alpha), Math.cos(alpha) * Math.cos(e)) * deg;
    return norm360(lon);
  }

  /** True obliquity of the ecliptic (degrees) for a given UT Julian Day. */
  public trueObliquity(tjd_ut: number): number {
    return this.swe_calc_ut(tjd_ut, SwePlanet.SE_ECL_NUT, 0).longitude;
  }

  /**
   * Computes position (longitude, latitude, declination) of a Fixed Star by name using _swe_fixstar2_ut.
   */
  public calcFixedStar(
    starName: string,
    tjd_ut: number,
    iflag: number = SweFlag.SEFLG_SWIEPH
  ): { longitude: number; latitude: number; declination: number; resolvedName: string } | null {
    const raw = this.raw;
    const starBuf = raw._malloc(128);
    const xPtr = raw._malloc(48);
    const errPtr = raw._malloc(256);

    try {
      raw.stringToUTF8(starName, starBuf, 128);
      raw.setValue(errPtr, 0, 'i8');
      const rf = raw._swe_fixstar2_ut(starBuf, tjd_ut, iflag, xPtr, errPtr);
      if (rf < 0) return null;

      const resolvedName = raw.UTF8ToString(starBuf);
      const ecl = this.readDoubles(xPtr, 6);

      // Equatorial declination of the star
      raw.stringToUTF8(starName, starBuf, 128);
      const eqFlags = (iflag & ~SweFlag.SEFLG_SIDEREAL) | SweFlag.SEFLG_EQUATORIAL;
      const rfEq = raw._swe_fixstar2_ut(starBuf, tjd_ut, eqFlags, xPtr, errPtr);
      const dec = rfEq >= 0 ? this.readDoubles(xPtr, 3)[1] : 0;

      return {
        longitude: norm360(ecl[0]),
        latitude: ecl[1],
        declination: dec,
        resolvedName,
      };
    } finally {
      raw._free(starBuf);
      raw._free(xPtr);
      raw._free(errPtr);
    }
  }

  private runHouses(
    call: (cuspsPtr: number, ascmcPtr: number, hsysCode: number) => number,
    hsys: HouseSystem,
    referenceLon?: number
  ): HouseCusps {
    const raw = this.raw;
    const cuspsPtr = raw._malloc(13 * 8);
    const ascmcPtr = raw._malloc(10 * 8);
    for (let i = 0; i < 13; i++) raw.setValue(cuspsPtr + i * 8, 0, 'double');
    for (let i = 0; i < 10; i++) raw.setValue(ascmcPtr + i * 8, 0, 'double');

    // For custom derived systems ('S', 'Z', 'L', 'I'), first compute Porphyry ('O') or Placidus ('P') base angles
    const isCustomSystem = [HouseSystem.SolarSign, HouseSystem.AriesZero, HouseSystem.MoonOnFirst, HouseSystem.Sripati].includes(hsys);
    const nativeHsys = hsys === HouseSystem.Sripati ? HouseSystem.Porphyry : isCustomSystem ? HouseSystem.Placidus : hsys;

    try {
      let status = call(cuspsPtr, ascmcPtr, nativeHsys.charCodeAt(0));
      let isPolarFallback = false;
      if (status < 0 && POLAR_SENSITIVE.includes(nativeHsys)) {
        status = call(cuspsPtr, ascmcPtr, HouseSystem.Porphyry.charCodeAt(0));
        isPolarFallback = true;
      }
      let cusps = this.readDoubles(cuspsPtr, 13).map(norm360);
      const a = this.readDoubles(ascmcPtr, 10).map(norm360);

      if (hsys === HouseSystem.AriesZero) {
        for (let h = 1; h <= 12; h++) cusps[h] = (h - 1) * 30;
      } else if ((hsys === HouseSystem.SolarSign || hsys === HouseSystem.MoonOnFirst) && referenceLon !== undefined) {
        const base = norm360(referenceLon);
        for (let h = 1; h <= 12; h++) cusps[h] = norm360(base + (h - 1) * 30);
      } else if (hsys === HouseSystem.Sripati) {
        // Hindu Bhava (Sripati): Porphyry cusps are the Bhava Madhyas (centers);
        // the house boundaries (Sandhis / cusps) are the midpoints between adjacent Porphyry centers.
        const centers = [...cusps];
        for (let h = 1; h <= 12; h++) {
          const prevH = h === 1 ? 12 : h - 1;
          cusps[h] = shortArcMidpoint(centers[prevH], centers[h]);
        }
      }

      return {
        cusps,
        ascmc: {
          ascendant: a[0],
          mc: a[1],
          armc: a[2],
          vertex: a[3],
          equatorialAsc: a[4],
          coAscendant1: a[5],
          coAscendant2: a[6],
          polarAscendant: a[7],
          raw: a,
        },
        isPolarFallback,
      };
    } finally {
      raw._free(cuspsPtr);
      raw._free(ascmcPtr);
    }
  }

  public swe_houses(
    tjd_ut: number,
    geolat: number,
    geolon: number,
    hsys: HouseSystem = HouseSystem.Placidus,
    referenceLon?: number
  ): HouseCusps {
    return this.runHouses((c, a, h) => this.raw._swe_houses(tjd_ut, geolat, geolon, h, c, a), hsys, referenceLon);
  }

  public swe_houses_armc(
    armc: number,
    geolat: number,
    eps: number,
    hsys: HouseSystem = HouseSystem.Placidus,
    referenceLon?: number
  ): HouseCusps {
    return this.runHouses((c, a, h) => this.raw._swe_houses_armc(armc, geolat, eps, h, c, a), hsys, referenceLon);
  }

  public getAyanamsha(tjd_ut: number): number {
    return this.raw._swe_get_ayanamsa_ut(tjd_ut);
  }

  public calculatePartOfFortune(ascendant: number, sunLon: number, moonLon: number, isDiurnal: boolean): number {
    return norm360(isDiurnal ? ascendant + moonLon - sunLon : ascendant + sunLon - moonLon);
  }

  /**
   * Computes all 8 Classical/Hermetic Arabic Parts (Lots) supported by Solar Fire:
   * Fortune, Spirit, Necessity, Eros, Victory, Courage, Marriage, Nemesis.
   */
  public computeArabicParts(params: {
    ascendant: number;
    descendant: number;
    sun: number;
    moon: number;
    mercury: number;
    venus: number;
    mars: number;
    jupiter: number;
    saturn: number;
    isDiurnal: boolean;
    obliquity: number;
  }): ArabicPartResult[] {
    const { ascendant: asc, descendant: dsc, sun, moon, mercury, venus, mars, jupiter, saturn, isDiurnal: day, obliquity } = params;

    const fortune = norm360(day ? asc + moon - sun : asc + sun - moon);
    const spirit = norm360(day ? asc + sun - moon : asc + moon - sun);
    const necessity = norm360(day ? asc + fortune - mercury : asc + mercury - fortune);
    const eros = norm360(day ? asc + venus - spirit : asc + spirit - venus);
    const victory = norm360(day ? asc + jupiter - spirit : asc + spirit - jupiter);
    const courage = norm360(day ? asc + fortune - mars : asc + mars - fortune);
    const marriage = norm360(asc + dsc - venus);
    const nemesis = norm360(day ? asc + fortune - saturn : asc + saturn - fortune);

    const rawParts = [
      { id: 'Part of Fortune', name: 'Parte de la Fortuna', glyph: '⊗', lon: fortune, fD: 'Asc + Luna - Sol', fN: 'Asc + Sol - Luna' },
      { id: 'Part of Spirit', name: 'Parte del Espíritu', glyph: '⊕', lon: spirit, fD: 'Asc + Sol - Luna', fN: 'Asc + Luna - Sol' },
      { id: 'Part of Eros', name: 'Parte de Eros', glyph: '❦', lon: eros, fD: 'Asc + Venus - Espíritu', fN: 'Asc + Espíritu - Venus' },
      { id: 'Part of Victory', name: 'Parte de la Victoria', glyph: '♛', lon: victory, fD: 'Asc + Júpiter - Espíritu', fN: 'Asc + Espíritu - Júpiter' },
      { id: 'Part of Necessity', name: 'Parte de la Necesidad', glyph: '⚿', lon: necessity, fD: 'Asc + Fortuna - Mercurio', fN: 'Asc + Mercurio - Fortuna' },
      { id: 'Part of Courage', name: 'Parte del Coraje', glyph: '⚔', lon: courage, fD: 'Asc + Fortuna - Marte', fN: 'Asc + Marte - Fortuna' },
      { id: 'Part of Marriage', name: 'Parte del Matrimonio', glyph: '⚭', lon: marriage, fD: 'Asc + Dsc - Venus', fN: 'Asc + Dsc - Venus' },
      { id: 'Part of Nemesis', name: 'Parte de Némesis', glyph: '⚖', lon: nemesis, fD: 'Asc + Fortuna - Saturno', fN: 'Asc + Saturno - Fortuna' },
    ];

    return rawParts.map(p => ({
      id: p.id,
      name: p.name,
      glyph: p.glyph,
      formulaDiurnal: p.fD,
      formulaNocturnal: p.fN,
      longitude: p.lon,
      declination: this.eclipticToEquatorial(p.lon, 0, obliquity).declination,
    }));
  }

  /** Diurnal chart = Sun above the horizon (houses 7-12, i.e. 180°..360° after the Ascendant). */
  public isDiurnalChart(sunLon: number, ascendant: number): boolean {
    return norm360(sunLon - ascendant) >= 180;
  }

  /**
   * Finds the exact moment (UT JD) near `approxJd` when `body` reaches `targetLon`.
   */
  public findLongitudeCrossing(body: SwePlanet, targetLon: number, approxJd: number, flags: number): number {
    let jd = approxJd;
    for (let i = 0; i < 40; i++) {
      const p = this.swe_calc_ut(jd, body, flags | SweFlag.SEFLG_SPEED);
      const diff = signedDiff(p.longitude, targetLon);
      if (Math.abs(diff) < 1e-7) break;
      const speed = Math.abs(p.longitudeSpeed) > 1e-6 ? p.longitudeSpeed : body === SwePlanet.SE_MOON ? 13.18 : 0.9856;
      jd += diff / speed;
    }
    return jd;
  }

  public findSolarReturn(natalSunLon: number, natalJd: number, targetYear: number, flags: number): number {
    const natal = jdToCalendar(natalJd);
    const approx = this.swe_julday(targetYear, natal.month, Math.min(natal.day, 28), natal.hour);
    return this.findLongitudeCrossing(SwePlanet.SE_SUN, natalSunLon, approx, flags);
  }

  public findLunarReturn(natalMoonLon: number, fromJd: number, flags: number): number {
    const moon = this.swe_calc_ut(fromJd, SwePlanet.SE_MOON, flags | SweFlag.SEFLG_SPEED);
    const ahead = norm360(natalMoonLon - moon.longitude);
    const approx = fromJd + ahead / 13.18;
    let jd = this.findLongitudeCrossing(SwePlanet.SE_MOON, natalMoonLon, approx, flags);
    if (jd < fromJd - 1e-6) {
      jd = this.findLongitudeCrossing(SwePlanet.SE_MOON, natalMoonLon, jd + 27.32, flags);
    }
    return jd;
  }

  /**
   * Finds the prenatal Syzygy (New Moon or Full Moon immediately preceding natalJd).
   * Used for the traditional Almuten Figuris calculation in Solar Fire.
   */
  public findPrenatalSyzygy(natalJd: number, flags: number): { jd: number; longitude: number; isFullMoon: boolean } {
    let jd = natalJd - 7;
    // Step backwards by 1-day intervals from natalJd to find the last 0° or 180° Sun-Moon elongation crossing
    let prevSun = this.swe_calc_ut(natalJd, SwePlanet.SE_SUN, flags).longitude;
    let prevMoon = this.swe_calc_ut(natalJd, SwePlanet.SE_MOON, flags).longitude;
    let prevElong = norm360(prevMoon - prevSun);

    for (let step = 1; step <= 18; step++) {
      const testJd = natalJd - step;
      const s = this.swe_calc_ut(testJd, SwePlanet.SE_SUN, flags).longitude;
      const m = this.swe_calc_ut(testJd, SwePlanet.SE_MOON, flags).longitude;
      const elong = norm360(m - s);

      // Check if 0° (New Moon) or 180° (Full Moon) was crossed between testJd and testJd+1
      if ((elong > 270 && prevElong < 90) || (elong < 180 && prevElong >= 180)) {
        const isFull = elong < 180 && prevElong >= 180;
        const targetAngle = isFull ? 180 : 0;
        jd = testJd + 0.5;
        for (let iter = 0; iter < 15; iter++) {
          const sunP = this.swe_calc_ut(jd, SwePlanet.SE_SUN, flags | SweFlag.SEFLG_SPEED);
          const moonP = this.swe_calc_ut(jd, SwePlanet.SE_MOON, flags | SweFlag.SEFLG_SPEED);
          const curElong = norm360(moonP.longitude - sunP.longitude);
          const err = signedDiff(curElong, targetAngle);
          if (Math.abs(err) < 1e-5) break;
          const relSpeed = (moonP.longitudeSpeed - sunP.longitudeSpeed) || 12.19;
          jd += err / relSpeed;
        }
        const finalMoon = this.swe_calc_ut(jd, SwePlanet.SE_MOON, flags).longitude;
        return { jd, longitude: finalMoon, isFullMoon: isFull };
      }
      prevElong = elong;
    }

    const fallbackLon = this.swe_calc_ut(natalJd - 7, SwePlanet.SE_MOON, flags).longitude;
    return { jd: natalJd - 7, longitude: fallbackLon, isFullMoon: false };
  }

  public swe_close(): void {
    if (this.sweInstance?.raw) {
      this.sweInstance.raw._swe_close();
    }
  }
}
