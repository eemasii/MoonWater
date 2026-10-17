/**
 * Moonwater Traditional Dignities, Almutens, Elemental Balance, Firdaria & Profections
 *
 * Replicates the classical & medieval dignity tables of SolarFire.exe:
 * - Essential Dignities: Domicile, Exaltation (with exact degree), Triplicity (Ptolemy,
 *   Dorotheus, William Lilly; Diurnal/Nocturnal/Participating), Terms (Egyptian & Ptolemaic),
 *   Faces/Decans (Chaldean order), Detriment, Fall, and Peregrine status.
 * - Accidental House Scores & Total Planet Dignity Scores.
 * - Almuten Figuris (Ibn Ezra / Solar Fire Essential Dignities Report) & Cusp Almutens.
 * - Elemental (Fire, Earth, Air, Water), Modality (Cardinal, Fixed, Mutable),
 *   Polarity (Yang/Yin) & Four Humors Temperament Balance.
 * - Firdaria Planetary Periods (Diurnal & Nocturnal, Major & Sub-periods with dates).
 * - Annual Profections (Activated House, Sign & Time Lord / Señor del Año).
 */

import { norm360, jdToCalendar } from './engine.js';

export type TriplicitySystem = 'dorotheus' | 'ptolemy' | 'lilly';
export type TermSystem = 'egyptian' | 'ptolemaic';
export type TraditionalPlanet = 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn';

export const TRADITIONAL_PLANETS: TraditionalPlanet[] = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
];

export const PLANET_GLYPHS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
  'True Node': '☊',
  'South Node': '☋',
};

export interface SignMetadata {
  index: number;
  name: string;
  nameEs: string;
  glyph: string;
  element: 'Fuego' | 'Tierra' | 'Aire' | 'Agua';
  modality: 'Cardinal' | 'Fijo' | 'Mutable';
  polarity: 'Masculino (Yang)' | 'Femenino (Yin)';
  domicileTraditional: TraditionalPlanet;
  domicileModern: string;
  detrimentTraditional: TraditionalPlanet;
  detrimentModern: string;
  exaltation: { planet: TraditionalPlanet; exactDegree: number } | null;
  fall: { planet: TraditionalPlanet; exactDegree: number } | null;
}

export const ZODIAC_SIGNS: SignMetadata[] = [
  {
    index: 0,
    name: 'Aries',
    nameEs: 'Aries',
    glyph: '♈',
    element: 'Fuego',
    modality: 'Cardinal',
    polarity: 'Masculino (Yang)',
    domicileTraditional: 'Mars',
    domicileModern: 'Mars',
    detrimentTraditional: 'Venus',
    detrimentModern: 'Venus',
    exaltation: { planet: 'Sun', exactDegree: 19 },
    fall: { planet: 'Saturn', exactDegree: 21 },
  },
  {
    index: 1,
    name: 'Taurus',
    nameEs: 'Tauro',
    glyph: '♉',
    element: 'Tierra',
    modality: 'Fijo',
    polarity: 'Femenino (Yin)',
    domicileTraditional: 'Venus',
    domicileModern: 'Venus',
    detrimentTraditional: 'Mars',
    detrimentModern: 'Pluto',
    exaltation: { planet: 'Moon', exactDegree: 3 },
    fall: null,
  },
  {
    index: 2,
    name: 'Gemini',
    nameEs: 'Géminis',
    glyph: '♊',
    element: 'Aire',
    modality: 'Mutable',
    polarity: 'Masculino (Yang)',
    domicileTraditional: 'Mercury',
    domicileModern: 'Mercury',
    detrimentTraditional: 'Jupiter',
    detrimentModern: 'Jupiter',
    exaltation: null,
    fall: null,
  },
  {
    index: 3,
    name: 'Cancer',
    nameEs: 'Cáncer',
    glyph: '♋',
    element: 'Agua',
    modality: 'Cardinal',
    polarity: 'Femenino (Yin)',
    domicileTraditional: 'Moon',
    domicileModern: 'Moon',
    detrimentTraditional: 'Saturn',
    detrimentModern: 'Saturn',
    exaltation: { planet: 'Jupiter', exactDegree: 15 },
    fall: { planet: 'Mars', exactDegree: 28 },
  },
  {
    index: 4,
    name: 'Leo',
    nameEs: 'Leo',
    glyph: '♌',
    element: 'Fuego',
    modality: 'Fijo',
    polarity: 'Masculino (Yang)',
    domicileTraditional: 'Sun',
    domicileModern: 'Sun',
    detrimentTraditional: 'Saturn',
    detrimentModern: 'Uranus',
    exaltation: null,
    fall: null,
  },
  {
    index: 5,
    name: 'Virgo',
    nameEs: 'Virgo',
    glyph: '♍',
    element: 'Tierra',
    modality: 'Mutable',
    polarity: 'Femenino (Yin)',
    domicileTraditional: 'Mercury',
    domicileModern: 'Mercury',
    detrimentTraditional: 'Jupiter',
    detrimentModern: 'Neptune',
    exaltation: { planet: 'Mercury', exactDegree: 15 },
    fall: { planet: 'Venus', exactDegree: 27 },
  },
  {
    index: 6,
    name: 'Libra',
    nameEs: 'Libra',
    glyph: '♎',
    element: 'Aire',
    modality: 'Cardinal',
    polarity: 'Masculino (Yang)',
    domicileTraditional: 'Venus',
    domicileModern: 'Venus',
    detrimentTraditional: 'Mars',
    detrimentModern: 'Mars',
    exaltation: { planet: 'Saturn', exactDegree: 21 },
    fall: { planet: 'Sun', exactDegree: 19 },
  },
  {
    index: 7,
    name: 'Scorpio',
    nameEs: 'Escorpio',
    glyph: '♏',
    element: 'Agua',
    modality: 'Fijo',
    polarity: 'Femenino (Yin)',
    domicileTraditional: 'Mars',
    domicileModern: 'Pluto',
    detrimentTraditional: 'Venus',
    detrimentModern: 'Venus',
    exaltation: null,
    fall: { planet: 'Moon', exactDegree: 3 },
  },
  {
    index: 8,
    name: 'Sagittarius',
    nameEs: 'Sagitario',
    glyph: '♐',
    element: 'Fuego',
    modality: 'Mutable',
    polarity: 'Masculino (Yang)',
    domicileTraditional: 'Jupiter',
    domicileModern: 'Jupiter',
    detrimentTraditional: 'Mercury',
    detrimentModern: 'Mercury',
    exaltation: null,
    fall: null,
  },
  {
    index: 9,
    name: 'Capricorn',
    nameEs: 'Capricornio',
    glyph: '♑',
    element: 'Tierra',
    modality: 'Cardinal',
    polarity: 'Femenino (Yin)',
    domicileTraditional: 'Saturn',
    domicileModern: 'Saturn',
    detrimentTraditional: 'Moon',
    detrimentModern: 'Moon',
    exaltation: { planet: 'Mars', exactDegree: 28 },
    fall: { planet: 'Jupiter', exactDegree: 15 },
  },
  {
    index: 10,
    name: 'Aquarius',
    nameEs: 'Acuario',
    glyph: '♒',
    element: 'Aire',
    modality: 'Fijo',
    polarity: 'Masculino (Yang)',
    domicileTraditional: 'Saturn',
    domicileModern: 'Uranus',
    detrimentTraditional: 'Sun',
    detrimentModern: 'Sun',
    exaltation: null,
    fall: null,
  },
  {
    index: 11,
    name: 'Pisces',
    nameEs: 'Piscis',
    glyph: '♓',
    element: 'Agua',
    modality: 'Mutable',
    polarity: 'Femenino (Yin)',
    domicileTraditional: 'Jupiter',
    domicileModern: 'Neptune',
    detrimentTraditional: 'Mercury',
    detrimentModern: 'Mercury',
    exaltation: { planet: 'Venus', exactDegree: 27 },
    fall: { planet: 'Mercury', exactDegree: 15 },
  },
];

/** Triplicity Rulers per Element: [Diurnal, Nocturnal, Participating] */
const TRIPLICITIES: Record<
  TriplicitySystem,
  Record<'Fuego' | 'Tierra' | 'Aire' | 'Agua', { day: TraditionalPlanet; night: TraditionalPlanet; part?: TraditionalPlanet }>
> = {
  dorotheus: {
    Fuego: { day: 'Sun', night: 'Jupiter', part: 'Saturn' },
    Tierra: { day: 'Venus', night: 'Moon', part: 'Mars' },
    Aire: { day: 'Saturn', night: 'Mercury', part: 'Jupiter' },
    Agua: { day: 'Venus', night: 'Mars', part: 'Moon' },
  },
  ptolemy: {
    Fuego: { day: 'Sun', night: 'Jupiter' },
    Tierra: { day: 'Venus', night: 'Moon' },
    Aire: { day: 'Saturn', night: 'Mercury' },
    Agua: { day: 'Mars', night: 'Mars' },
  },
  lilly: {
    Fuego: { day: 'Sun', night: 'Jupiter' },
    Tierra: { day: 'Venus', night: 'Moon' },
    Aire: { day: 'Saturn', night: 'Mercury' },
    Agua: { day: 'Mars', night: 'Mars' },
  },
};

/** Egyptian Terms (Bounds): Array of 12 signs, each containing 5 [endDegree, ruler] tuples. */
const EGYPTIAN_TERMS: Array<Array<[number, TraditionalPlanet]>> = [
  // 0 Aries
  [[6, 'Jupiter'], [12, 'Venus'], [20, 'Mercury'], [25, 'Mars'], [30, 'Saturn']],
  // 1 Taurus
  [[8, 'Venus'], [14, 'Mercury'], [22, 'Jupiter'], [27, 'Saturn'], [30, 'Mars']],
  // 2 Gemini
  [[6, 'Mercury'], [12, 'Jupiter'], [17, 'Venus'], [24, 'Mars'], [30, 'Saturn']],
  // 3 Cancer
  [[7, 'Mars'], [13, 'Venus'], [19, 'Mercury'], [26, 'Jupiter'], [30, 'Saturn']],
  // 4 Leo
  [[6, 'Jupiter'], [11, 'Venus'], [18, 'Saturn'], [24, 'Mercury'], [30, 'Mars']],
  // 5 Virgo
  [[7, 'Mercury'], [17, 'Venus'], [21, 'Jupiter'], [28, 'Mars'], [30, 'Saturn']],
  // 6 Libra
  [[6, 'Saturn'], [14, 'Mercury'], [21, 'Jupiter'], [28, 'Venus'], [30, 'Mars']],
  // 7 Scorpio
  [[7, 'Mars'], [11, 'Venus'], [19, 'Mercury'], [24, 'Jupiter'], [30, 'Saturn']],
  // 8 Sagittarius
  [[12, 'Jupiter'], [17, 'Venus'], [21, 'Mercury'], [26, 'Saturn'], [30, 'Mars']],
  // 9 Capricorn
  [[7, 'Mercury'], [14, 'Jupiter'], [22, 'Venus'], [26, 'Saturn'], [30, 'Mars']],
  // 10 Aquarius
  [[7, 'Mercury'], [13, 'Venus'], [20, 'Jupiter'], [25, 'Mars'], [30, 'Saturn']],
  // 11 Pisces
  [[12, 'Venus'], [16, 'Jupiter'], [19, 'Mercury'], [28, 'Mars'], [30, 'Saturn']],
];

/** Ptolemaic Terms (Bounds): Array of 12 signs. */
const PTOLEMAIC_TERMS: Array<Array<[number, TraditionalPlanet]>> = [
  [[6, 'Jupiter'], [14, 'Venus'], [21, 'Mercury'], [26, 'Mars'], [30, 'Saturn']],
  [[8, 'Venus'], [15, 'Mercury'], [22, 'Jupiter'], [26, 'Saturn'], [30, 'Mars']],
  [[7, 'Mercury'], [14, 'Jupiter'], [21, 'Venus'], [25, 'Saturn'], [30, 'Mars']],
  [[6, 'Mars'], [13, 'Jupiter'], [20, 'Mercury'], [27, 'Venus'], [30, 'Saturn']],
  [[6, 'Saturn'], [13, 'Mercury'], [19, 'Venus'], [25, 'Jupiter'], [30, 'Mars']],
  [[7, 'Mercury'], [13, 'Venus'], [18, 'Jupiter'], [24, 'Saturn'], [30, 'Mars']],
  [[6, 'Saturn'], [11, 'Venus'], [19, 'Jupiter'], [24, 'Mercury'], [30, 'Mars']],
  [[6, 'Mars'], [14, 'Jupiter'], [21, 'Venus'], [27, 'Mercury'], [30, 'Saturn']],
  [[8, 'Jupiter'], [14, 'Venus'], [19, 'Mercury'], [25, 'Saturn'], [30, 'Mars']],
  [[6, 'Venus'], [12, 'Mercury'], [19, 'Jupiter'], [25, 'Mars'], [30, 'Saturn']],
  [[6, 'Saturn'], [12, 'Mercury'], [20, 'Venus'], [25, 'Jupiter'], [30, 'Mars']],
  [[8, 'Venus'], [14, 'Jupiter'], [20, 'Mercury'], [26, 'Mars'], [30, 'Saturn']],
];

/** Chaldean order of planets for Decans / Faces (36 faces of 10° starting at 0° Aries with Mars). */
const CHALDEAN_ORDER: TraditionalPlanet[] = [
  'Mars',
  'Sun',
  'Venus',
  'Mercury',
  'Moon',
  'Saturn',
  'Jupiter',
];

/** Accidental House Dignity scores (Lilly / Solar Fire standard). */
const HOUSE_ACCIDENTAL_SCORES: Record<number, number> = {
  1: 5,
  10: 5,
  7: 4,
  4: 4,
  11: 4,
  5: 3,
  2: 3,
  9: 2,
  3: 1,
  8: -2,
  6: -2,
  12: -5,
};

export interface DegreeDignityBreakdown {
  sign: SignMetadata;
  degreeInSign: number;
  domicileRuler: TraditionalPlanet;
  modernRuler: string;
  exaltationRuler: TraditionalPlanet | null;
  triplicityRuler: TraditionalPlanet;
  triplicityDay: TraditionalPlanet;
  triplicityNight: TraditionalPlanet;
  triplicityPart?: TraditionalPlanet;
  termRuler: TraditionalPlanet;
  faceRuler: TraditionalPlanet;
  detrimentPlanet: TraditionalPlanet;
  fallPlanet: TraditionalPlanet | null;
  almutenOfDegree: TraditionalPlanet;
  scoresByPlanet: Record<TraditionalPlanet, number>;
}

export interface PlanetDignityRow {
  name: string;
  glyph: string;
  formattedPosition: string;
  signName: string;
  signGlyph: string;
  house: number;
  domicileRuler: string;
  exaltationRuler: string;
  triplicityRuler: string;
  termRuler: string;
  faceRuler: string;
  activeDignities: string[]; // e.g., ["Domicilio (+5)", "Término (+2)"]
  isPeregrine: boolean;
  essentialScore: number;
  accidentalScore: number;
  totalScore: number;
}

export interface AlmutenSummary {
  almutenFiguris: TraditionalPlanet;
  almutenGlyph: string;
  totalScores: Record<TraditionalPlanet, { essential: number; house: number; total: number }>;
  hylegicalPoints: Array<{
    pointName: string;
    formatted: string;
    domicile: TraditionalPlanet;
    exaltation: TraditionalPlanet | '-';
    triplicity: TraditionalPlanet;
    term: TraditionalPlanet;
    face: TraditionalPlanet;
    almuten: TraditionalPlanet;
  }>;
}

export interface ElementalBalanceSummary {
  elements: Record<'Fuego' | 'Tierra' | 'Aire' | 'Agua', { count: number; weight: number; percentage: number; bodies: string[] }>;
  modalities: Record<'Cardinal' | 'Fijo' | 'Mutable', { count: number; weight: number; percentage: number; bodies: string[] }>;
  polarities: Record<'Masculino (Yang)' | 'Femenino (Yin)', { count: number; weight: number; percentage: number }>;
  dominantElement: string;
  dominantModality: string;
  temperament: string;
}

export interface FirdariaSubPeriod {
  ruler: string;
  glyph: string;
  startDate: string;
  endDate: string;
  startAge: number;
  endAge: number;
  isCurrent: boolean;
}

export interface FirdariaMajorPeriod {
  ruler: string;
  glyph: string;
  durationYears: number;
  startAge: number;
  endAge: number;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  subPeriods: FirdariaSubPeriod[];
}

export interface AnnualProfectionResult {
  age: number;
  targetYear: number;
  activatedHouse: number; // 1..12
  profectedAscendant: number;
  signName: string;
  signGlyph: string;
  timeLordTraditional: TraditionalPlanet;
  timeLordGlyph: string;
  timeLordModern: string;
}

export function getTermRuler(signIdx: number, degInSign: number, system: TermSystem = 'egyptian'): TraditionalPlanet {
  const table = system === 'ptolemaic' ? PTOLEMAIC_TERMS[signIdx] : EGYPTIAN_TERMS[signIdx];
  for (const [endDeg, ruler] of table) {
    if (degInSign < endDeg) return ruler;
  }
  return table[table.length - 1][1];
}

export function getFaceRuler(longitude: number): TraditionalPlanet {
  const decanIdx = Math.floor(norm360(longitude) / 10) % 36;
  return CHALDEAN_ORDER[decanIdx % 7];
}

export function evaluateDegreeDignities(
  longitude: number,
  isDiurnal: boolean,
  triplicitySystem: TriplicitySystem = 'dorotheus',
  termSystem: TermSystem = 'egyptian'
): DegreeDignityBreakdown {
  const lon = norm360(longitude);
  const signIdx = Math.floor(lon / 30);
  const degInSign = lon - signIdx * 30;
  const sign = ZODIAC_SIGNS[signIdx];

  const tripSpec = TRIPLICITIES[triplicitySystem][sign.element];
  const triplicityRuler = isDiurnal ? tripSpec.day : tripSpec.night;
  const termRuler = getTermRuler(signIdx, degInSign, termSystem);
  const faceRuler = getFaceRuler(lon);

  const scoresByPlanet: Record<TraditionalPlanet, number> = {
    Sun: 0,
    Moon: 0,
    Mercury: 0,
    Venus: 0,
    Mars: 0,
    Jupiter: 0,
    Saturn: 0,
  };

  scoresByPlanet[sign.domicileTraditional] += 5;
  if (sign.exaltation) {
    scoresByPlanet[sign.exaltation.planet] += 4;
  }

  if (triplicitySystem === 'dorotheus') {
    scoresByPlanet[tripSpec.day] += 3;
    if (tripSpec.night !== tripSpec.day) scoresByPlanet[tripSpec.night] += 3;
    if (tripSpec.part && tripSpec.part !== tripSpec.day && tripSpec.part !== tripSpec.night) {
      scoresByPlanet[tripSpec.part] += 3;
    }
  } else {
    scoresByPlanet[triplicityRuler] += 3;
  }

  scoresByPlanet[termRuler] += 2;
  scoresByPlanet[faceRuler] += 1;

  let bestPlanet: TraditionalPlanet = sign.domicileTraditional;
  let bestScore = -999;
  for (const p of TRADITIONAL_PLANETS) {
    if (scoresByPlanet[p] > bestScore) {
      bestScore = scoresByPlanet[p];
      bestPlanet = p;
    }
  }

  return {
    sign,
    degreeInSign: degInSign,
    domicileRuler: sign.domicileTraditional,
    modernRuler: sign.domicileModern,
    exaltationRuler: sign.exaltation ? sign.exaltation.planet : null,
    triplicityRuler,
    triplicityDay: tripSpec.day,
    triplicityNight: tripSpec.night,
    triplicityPart: tripSpec.part,
    termRuler,
    faceRuler,
    detrimentPlanet: sign.detrimentTraditional,
    fallPlanet: sign.fall ? sign.fall.planet : null,
    almutenOfDegree: bestPlanet,
    scoresByPlanet,
  };
}

/**
 * Computes the complete Essential & Accidental Dignities table for all chart points,
 * plus the Almuten Figuris summary (Ibn Ezra / Solar Fire Essential Dignities Report).
 */
export function computeChartDignitiesAndAlmuten(params: {
  planets: Array<{
    name: string;
    glyph: string;
    longitude: number;
    formatted: string;
    house: number;
    isRetrograde?: boolean;
  }>;
  ascendant: number;
  mc: number;
  partOfFortune: number;
  syzygyLon: number;
  isDiurnal: boolean;
  triplicitySystem?: TriplicitySystem;
  termSystem?: TermSystem;
}): {
  rows: PlanetDignityRow[];
  almuten: AlmutenSummary;
} {
  const {
    planets,
    ascendant,
    partOfFortune,
    syzygyLon,
    isDiurnal,
    triplicitySystem = 'dorotheus',
    termSystem = 'egyptian',
  } = params;

  const rows: PlanetDignityRow[] = [];

  for (const p of planets) {
    const bd = evaluateDegreeDignities(p.longitude, isDiurnal, triplicitySystem, termSystem);
    const activeDignities: string[] = [];
    let essentialScore = 0;

    const isTrad = TRADITIONAL_PLANETS.includes(p.name as TraditionalPlanet);
    if (isTrad) {
      if (bd.domicileRuler === p.name) {
        essentialScore += 5;
        activeDignities.push('Domicilio (+5)');
      }
      if (bd.exaltationRuler === p.name) {
        essentialScore += 4;
        activeDignities.push('Exaltación (+4)');
      }
      if (
        bd.triplicityRuler === p.name ||
        (triplicitySystem === 'dorotheus' &&
          (bd.triplicityDay === p.name || bd.triplicityNight === p.name || bd.triplicityPart === p.name))
      ) {
        essentialScore += 3;
        activeDignities.push('Triplicidad (+3)');
      }
      if (bd.termRuler === p.name) {
        essentialScore += 2;
        activeDignities.push('Término (+2)');
      }
      if (bd.faceRuler === p.name) {
        essentialScore += 1;
        activeDignities.push('Decanato/Faz (+1)');
      }
    } else if (bd.modernRuler === p.name) {
      essentialScore += 5;
      activeDignities.push('Regente Moderno (+5)');
    }

    const isPeregrine = essentialScore === 0;
    if (isPeregrine && isTrad) {
      essentialScore -= 5;
      activeDignities.push('Peregrino (-5)');
    }

    if (isTrad && bd.detrimentPlanet === p.name) {
      essentialScore -= 5;
      activeDignities.push('Exilio (-5)');
    }
    if (isTrad && bd.fallPlanet === p.name) {
      essentialScore -= 4;
      activeDignities.push('Caída (-4)');
    }

    let accidentalScore = HOUSE_ACCIDENTAL_SCORES[p.house] ?? 0;
    if (p.isRetrograde) accidentalScore -= 5;

    rows.push({
      name: p.name,
      glyph: p.glyph,
      formattedPosition: p.formatted,
      signName: bd.sign.nameEs,
      signGlyph: bd.sign.glyph,
      house: p.house,
      domicileRuler: `${PLANET_GLYPHS[bd.domicileRuler]} ${bd.domicileRuler}`,
      exaltationRuler: bd.exaltationRuler ? `${PLANET_GLYPHS[bd.exaltationRuler]} ${bd.exaltationRuler}` : '-',
      triplicityRuler: `${PLANET_GLYPHS[bd.triplicityRuler]} ${bd.triplicityRuler}`,
      termRuler: `${PLANET_GLYPHS[bd.termRuler]} ${bd.termRuler}`,
      faceRuler: `${PLANET_GLYPHS[bd.faceRuler]} ${bd.faceRuler}`,
      activeDignities,
      isPeregrine,
      essentialScore,
      accidentalScore,
      totalScore: essentialScore + accidentalScore,
    });
  }

  // Almuten Figuris across the 5 Hylegical Points (Sun, Moon, Ascendant, Part of Fortune, Prenatal Syzygy)
  const sunLon = planets.find(x => x.name === 'Sun')?.longitude ?? 0;
  const moonLon = planets.find(x => x.name === 'Moon')?.longitude ?? 0;

  const hylegRaw = [
    { name: 'Sol (☉)', lon: sunLon },
    { name: 'Luna (☽)', lon: moonLon },
    { name: 'Ascendente (ASC)', lon: ascendant },
    { name: 'Parte de la Fortuna (⊗)', lon: partOfFortune },
    { name: 'Sicigia Prenatal (☌/☍)', lon: syzygyLon },
  ];

  const totalScores: Record<TraditionalPlanet, { essential: number; house: number; total: number }> = {
    Sun: { essential: 0, house: 0, total: 0 },
    Moon: { essential: 0, house: 0, total: 0 },
    Mercury: { essential: 0, house: 0, total: 0 },
    Venus: { essential: 0, house: 0, total: 0 },
    Mars: { essential: 0, house: 0, total: 0 },
    Jupiter: { essential: 0, house: 0, total: 0 },
    Saturn: { essential: 0, house: 0, total: 0 },
  };

  // Add House accidental scores for the 7 traditional planets (Ibn Ezra house weights)
  const ibnEzraHouseScores: Record<number, number> = {
    1: 12, 10: 11, 7: 10, 4: 9, 11: 8, 5: 7, 2: 6, 9: 5, 8: 4, 3: 3, 6: 2, 12: 1,
  };
  for (const pName of TRADITIONAL_PLANETS) {
    const pObj = planets.find(x => x.name === pName);
    if (pObj) {
      totalScores[pName].house = ibnEzraHouseScores[pObj.house] ?? 0;
    }
  }

  const hylegicalPoints = hylegRaw.map(pt => {
    const bd = evaluateDegreeDignities(pt.lon, isDiurnal, triplicitySystem, termSystem);
    for (const pName of TRADITIONAL_PLANETS) {
      totalScores[pName].essential += bd.scoresByPlanet[pName];
    }
    const deg = Math.floor(bd.degreeInSign);
    const min = Math.floor((bd.degreeInSign - deg) * 60);
    return {
      pointName: pt.name,
      formatted: `${String(deg).padStart(2, '0')}° ${bd.sign.glyph} ${String(min).padStart(2, '0')}'`,
      domicile: bd.domicileRuler,
      exaltation: (bd.exaltationRuler || '-') as TraditionalPlanet | '-',
      triplicity: bd.triplicityRuler,
      term: bd.termRuler,
      face: bd.faceRuler,
      almuten: bd.almutenOfDegree,
    };
  });

  let almutenFiguris: TraditionalPlanet = 'Sun';
  let maxScore = -1;
  for (const pName of TRADITIONAL_PLANETS) {
    totalScores[pName].total = totalScores[pName].essential + totalScores[pName].house;
    if (totalScores[pName].total > maxScore) {
      maxScore = totalScores[pName].total;
      almutenFiguris = pName;
    }
  }

  return {
    rows,
    almuten: {
      almutenFiguris,
      almutenGlyph: PLANET_GLYPHS[almutenFiguris] || '☉',
      totalScores,
      hylegicalPoints,
    },
  };
}

/**
 * Computes Elemental, Modality, Polarity & Four Humors Temperament Balance.
 * Weights: Sun/Moon/Ascendant/MC = 2 pts; Mercury..Mars = 1.5 pts; Jupiter..Pluto = 1 pt.
 */
export function computeElementalBalance(params: {
  planets: Array<{ name: string; glyph: string; longitude: number }>;
  ascendant: number;
  mc: number;
}): ElementalBalanceSummary {
  const elements: ElementalBalanceSummary['elements'] = {
    Fuego: { count: 0, weight: 0, percentage: 0, bodies: [] },
    Tierra: { count: 0, weight: 0, percentage: 0, bodies: [] },
    Aire: { count: 0, weight: 0, percentage: 0, bodies: [] },
    Agua: { count: 0, weight: 0, percentage: 0, bodies: [] },
  };
  const modalities: ElementalBalanceSummary['modalities'] = {
    Cardinal: { count: 0, weight: 0, percentage: 0, bodies: [] },
    Fijo: { count: 0, weight: 0, percentage: 0, bodies: [] },
    Mutable: { count: 0, weight: 0, percentage: 0, bodies: [] },
  };
  const polarities: ElementalBalanceSummary['polarities'] = {
    'Masculino (Yang)': { count: 0, weight: 0, percentage: 0 },
    'Femenino (Yin)': { count: 0, weight: 0, percentage: 0 },
  };

  const coreNames = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron']);
  const itemsToScore = [
    ...params.planets.filter(p => coreNames.has(p.name)),
    { name: 'Ascendant', glyph: 'ASC', longitude: params.ascendant },
    { name: 'Midheaven', glyph: 'MC', longitude: params.mc },
  ];

  let totalWeight = 0;

  for (const item of itemsToScore) {
    const signIdx = Math.floor(norm360(item.longitude) / 30);
    const sign = ZODIAC_SIGNS[signIdx];
    const w = ['Sun', 'Moon', 'Ascendant'].includes(item.name)
      ? 2.0
      : ['Mercury', 'Venus', 'Mars', 'Midheaven'].includes(item.name)
      ? 1.5
      : 1.0;

    totalWeight += w;
    const label = `${item.glyph} ${item.name}`;

    elements[sign.element].count += 1;
    elements[sign.element].weight += w;
    elements[sign.element].bodies.push(label);

    modalities[sign.modality].count += 1;
    modalities[sign.modality].weight += w;
    modalities[sign.modality].bodies.push(label);

    polarities[sign.polarity].count += 1;
    polarities[sign.polarity].weight += w;
  }

  const denom = totalWeight || 1;
  for (const el of ['Fuego', 'Tierra', 'Aire', 'Agua'] as const) {
    elements[el].percentage = Math.round((elements[el].weight / denom) * 100);
  }
  for (const mod of ['Cardinal', 'Fijo', 'Mutable'] as const) {
    modalities[mod].percentage = Math.round((modalities[mod].weight / denom) * 100);
  }
  for (const pol of ['Masculino (Yang)', 'Femenino (Yin)'] as const) {
    polarities[pol].percentage = Math.round((polarities[pol].weight / denom) * 100);
  }

  const dominantElement = (['Fuego', 'Tierra', 'Aire', 'Agua'] as const).reduce((a, b) =>
    elements[a].weight >= elements[b].weight ? a : b
  );
  const dominantModality = (['Cardinal', 'Fijo', 'Mutable'] as const).reduce((a, b) =>
    modalities[a].weight >= modalities[b].weight ? a : b
  );

  const temperamentMap: Record<'Fuego' | 'Tierra' | 'Aire' | 'Agua', string> = {
    Fuego: 'Colérico (Caliente y Seco)',
    Tierra: 'Melancólico (Frío y Seco)',
    Aire: 'Sanguíneo (Caliente y Húmedo)',
    Agua: 'Flemático (Frío y Húmedo)',
  };

  return {
    elements,
    modalities,
    polarities,
    dominantElement,
    dominantModality,
    temperament: temperamentMap[dominantElement],
  };
}

/**
 * Computes the complete 75-year Firdaria Planetary Periods & Sub-periods
 * (Al-Biruni / Schoener sequence as implemented in SolarFire.exe).
 */
export function computeFirdariaPeriods(natalJd: number, isDiurnal: boolean, targetJd?: number): FirdariaMajorPeriod[] {
  const diurnalOrder = [
    { ruler: 'Sun', glyph: '☉', years: 10, isNode: false },
    { ruler: 'Venus', glyph: '♀', years: 8, isNode: false },
    { ruler: 'Mercury', glyph: '☿', years: 13, isNode: false },
    { ruler: 'Moon', glyph: '☽', years: 9, isNode: false },
    { ruler: 'Saturn', glyph: '♄', years: 11, isNode: false },
    { ruler: 'Jupiter', glyph: '♃', years: 12, isNode: false },
    { ruler: 'Mars', glyph: '♂', years: 7, isNode: false },
    { ruler: 'North Node', glyph: '☊', years: 3, isNode: true },
    { ruler: 'South Node', glyph: '☋', years: 2, isNode: true },
  ];

  const nocturnalOrder = [
    { ruler: 'Moon', glyph: '☽', years: 9, isNode: false },
    { ruler: 'Saturn', glyph: '♄', years: 11, isNode: false },
    { ruler: 'Jupiter', glyph: '♃', years: 12, isNode: false },
    { ruler: 'Mars', glyph: '♂', years: 7, isNode: false },
    { ruler: 'Sun', glyph: '☉', years: 10, isNode: false },
    { ruler: 'Venus', glyph: '♀', years: 8, isNode: false },
    { ruler: 'Mercury', glyph: '☿', years: 13, isNode: false },
    { ruler: 'North Node', glyph: '☊', years: 3, isNode: true },
    { ruler: 'South Node', glyph: '☋', years: 2, isNode: true },
  ];

  const chaldeanSubSequence = [
    { ruler: 'Sun', glyph: '☉' },
    { ruler: 'Venus', glyph: '♀' },
    { ruler: 'Mercury', glyph: '☿' },
    { ruler: 'Moon', glyph: '☽' },
    { ruler: 'Saturn', glyph: '♄' },
    { ruler: 'Jupiter', glyph: '♃' },
    { ruler: 'Mars', glyph: '♂' },
  ];

  const sequence = isDiurnal ? diurnalOrder : nocturnalOrder;
  const nowJd = targetJd ?? natalJd + 30 * 365.242199;
  const currentAge = Math.max(0, (nowJd - natalJd) / 365.242199) % 75;

  const fmtJd = (jd: number) => {
    const c = jdToCalendar(jd);
    return `${c.year}-${String(c.month).padStart(2, '0')}-${String(c.day).padStart(2, '0')}`;
  };

  const result: FirdariaMajorPeriod[] = [];
  let cumAge = 0;

  for (const item of sequence) {
    const startAge = cumAge;
    const endAge = cumAge + item.years;
    const startJd = natalJd + startAge * 365.242199;
    const endJd = natalJd + endAge * 365.242199;
    const isCurrent = currentAge >= startAge && currentAge < endAge;

    const subPeriods: FirdariaSubPeriod[] = [];
    if (!item.isNode) {
      const startSubIdx = chaldeanSubSequence.findIndex(s => s.ruler === item.ruler);
      const subSpanYears = item.years / 7.0;
      for (let i = 0; i < 7; i++) {
        const subSpec = chaldeanSubSequence[(startSubIdx + i) % 7];
        const sAge = startAge + i * subSpanYears;
        const eAge = sAge + subSpanYears;
        const sJd = natalJd + sAge * 365.242199;
        const eJd = natalJd + eAge * 365.242199;
        subPeriods.push({
          ruler: subSpec.ruler,
          glyph: subSpec.glyph,
          startDate: fmtJd(sJd),
          endDate: fmtJd(eJd),
          startAge: Number(sAge.toFixed(2)),
          endAge: Number(eAge.toFixed(2)),
          isCurrent: currentAge >= sAge && currentAge < eAge,
        });
      }
    }

    result.push({
      ruler: item.ruler,
      glyph: item.glyph,
      durationYears: item.years,
      startAge,
      endAge,
      startDate: fmtJd(startJd),
      endDate: fmtJd(endJd),
      isCurrent,
      subPeriods,
    });

    cumAge = endAge;
  }

  return result;
}

/**
 * Computes Annual Profections (30° per year / 1 house per year) for a given age.
 */
export function computeAnnualProfection(
  ascendant: number,
  houseCusps: number[],
  ageYears: number,
  targetYear: number
): AnnualProfectionResult {
  const intAge = Math.max(0, Math.floor(ageYears));
  const activatedHouse = (intAge % 12) + 1; // 1..12
  const profectedAscendant = norm360(ascendant + intAge * 30);
  const cuspLon = houseCusps[activatedHouse] !== undefined ? houseCusps[activatedHouse] : profectedAscendant;
  const signIdx = Math.floor(norm360(cuspLon) / 30);
  const sign = ZODIAC_SIGNS[signIdx];

  return {
    age: intAge,
    targetYear,
    activatedHouse,
    profectedAscendant,
    signName: sign.nameEs,
    signGlyph: sign.glyph,
    timeLordTraditional: sign.domicileTraditional,
    timeLordGlyph: PLANET_GLYPHS[sign.domicileTraditional] || '☉',
    timeLordModern: sign.domicileModern,
  };
}
