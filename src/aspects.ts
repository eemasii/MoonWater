/**
 * Moonwater Aspect, Declination Parallel, Pattern & Midpoint Engine
 *
 * Implements the full aspect and pattern recognition engine of SolarFire.exe:
 * - Longitude Aspects:
 *   * Major: Conjunction (0°), Sextile (60°), Square (90°), Trine (120°), Opposition (180°)
 *   * Minor: Semisextile (30°), Semisquare (45°), Sesquisquare (135°), Quincunx (150°)
 *   * Harmonic (Solar Fire Series): Quintile (72°), Biquintile (144°), Septile (51°25'43"), Novile (40°)
 * - Declination Aspects:
 *   * Parallel (‖) and Contra-Parallel (⧺) with 1°00' orb
 * - 8 Geometric Aspect Patterns (AspPat.ini):
 *   * Grand Trine, Kite, T-Square, Grand Cross, Mystic Rectangle, Yod, Thor's Hammer (Martillo de Thor), Stellium
 * - Midpoint Trees (A/B = C) in 360°, 90°, and 45° Dials
 */

import { shortArcMidpoint, norm360 } from './engine.js';

export enum AspectType {
  Conjunction = 'Conjunction',
  Opposition = 'Opposition',
  Trine = 'Trine',
  Square = 'Square',
  Sextile = 'Sextile',
  Semisextile = 'Semisextile',
  Semisquare = 'Semisquare',
  Sesquisquare = 'Sesquisquare',
  Quincunx = 'Quincunx',
  Quintile = 'Quintile',
  Biquintile = 'Biquintile',
  Septile = 'Septile',
  Novile = 'Novile',
}

export interface AspectDefinition {
  type: AspectType;
  name: string;
  angle: number;
  defaultOrb: number;
  luminaryOrb: number;
  abbreviation: string;
  glyph: string;
  major: boolean;
  harmonic?: boolean;
  nature: 'soft' | 'hard' | 'neutral' | 'minor';
}

export type OrbSettings = Partial<Record<AspectType, { orb: number; luminary: number }>>;

export const STANDARD_ASPECTS: AspectDefinition[] = [
  {
    type: AspectType.Conjunction,
    name: 'Conjunción',
    angle: 0,
    defaultOrb: 8.0,
    luminaryOrb: 10.0,
    abbreviation: 'Cnj',
    glyph: '☌',
    major: true,
    nature: 'neutral',
  },
  {
    type: AspectType.Opposition,
    name: 'Oposición',
    angle: 180,
    defaultOrb: 8.0,
    luminaryOrb: 10.0,
    abbreviation: 'Opp',
    glyph: '☍',
    major: true,
    nature: 'hard',
  },
  {
    type: AspectType.Trine,
    name: 'Trígono',
    angle: 120,
    defaultOrb: 8.0,
    luminaryOrb: 10.0,
    abbreviation: 'Tri',
    glyph: '△',
    major: true,
    nature: 'soft',
  },
  {
    type: AspectType.Square,
    name: 'Cuadratura',
    angle: 90,
    defaultOrb: 7.0,
    luminaryOrb: 8.0,
    abbreviation: 'Sqr',
    glyph: '□',
    major: true,
    nature: 'hard',
  },
  {
    type: AspectType.Sextile,
    name: 'Sextil',
    angle: 60,
    defaultOrb: 5.0,
    luminaryOrb: 6.0,
    abbreviation: 'Sxt',
    glyph: '⚹',
    major: true,
    nature: 'soft',
  },
  {
    type: AspectType.Quincunx,
    name: 'Quincuncio',
    angle: 150,
    defaultOrb: 3.0,
    luminaryOrb: 4.0,
    abbreviation: 'Qnx',
    glyph: '⚻',
    major: false,
    nature: 'minor',
  },
  {
    type: AspectType.Semisquare,
    name: 'Semicuadratura',
    angle: 45,
    defaultOrb: 2.0,
    luminaryOrb: 3.0,
    abbreviation: 'SSq',
    glyph: '∠',
    major: false,
    nature: 'hard',
  },
  {
    type: AspectType.Sesquisquare,
    name: 'Sesquicuadratura',
    angle: 135,
    defaultOrb: 2.0,
    luminaryOrb: 3.0,
    abbreviation: 'Ses',
    glyph: '⚼',
    major: false,
    nature: 'hard',
  },
  {
    type: AspectType.Semisextile,
    name: 'Semisextil',
    angle: 30,
    defaultOrb: 2.0,
    luminaryOrb: 3.0,
    abbreviation: 'SSx',
    glyph: '⚺',
    major: false,
    nature: 'minor',
  },
  {
    type: AspectType.Quintile,
    name: 'Quintil',
    angle: 72,
    defaultOrb: 2.0,
    luminaryOrb: 2.5,
    abbreviation: 'Qnt',
    glyph: 'Q',
    major: false,
    harmonic: true,
    nature: 'minor',
  },
  {
    type: AspectType.Biquintile,
    name: 'Biquintil',
    angle: 144,
    defaultOrb: 2.0,
    luminaryOrb: 2.5,
    abbreviation: 'Bq',
    glyph: 'bQ',
    major: false,
    harmonic: true,
    nature: 'minor',
  },
  {
    type: AspectType.Septile,
    name: 'Septil',
    angle: 360 / 7, // 51.428571°
    defaultOrb: 1.5,
    luminaryOrb: 2.0,
    abbreviation: 'Sep',
    glyph: 'S',
    major: false,
    harmonic: true,
    nature: 'minor',
  },
  {
    type: AspectType.Novile,
    name: 'Novil',
    angle: 40,
    defaultOrb: 1.5,
    luminaryOrb: 2.0,
    abbreviation: 'Nov',
    glyph: 'N',
    major: false,
    harmonic: true,
    nature: 'minor',
  },
];

export interface AstrologicalPoint {
  id: number | string;
  name: string;
  glyph?: string;
  longitude: number;
  longitudeSpeed?: number;
  declination?: number;
  isLuminary?: boolean;
}

export interface DetectedAspect {
  point1: AstrologicalPoint;
  point2: AstrologicalPoint;
  aspect: AspectDefinition;
  actualAngle: number;
  orb: number;
  maxOrb: number;
  isApplying: boolean;
}

export interface DeclinationAspect {
  point1: string;
  glyph1: string;
  dec1: number;
  point2: string;
  glyph2: string;
  dec2: number;
  type: 'Paralelo' | 'Contraparalelo';
  glyph: '‖' | '⧺';
  orb: number;
}

export interface AspectPattern {
  name: string;
  points: string[];
  description: string;
}

export interface MidpointStructure {
  pair: string; // e.g., "☉ Sun / ☽ Moon"
  p1: string;
  p2: string;
  midpointLon: number;
  midpointFormatted: string;
  contactPlanet: string;
  contactGlyph: string;
  dial: 'Directo (360°)' | 'Dial 90° (4H)' | 'Dial 45° (8H)';
  orb: number;
}

export function shortestAngularDistance(lon1: number, lon2: number): number {
  const diff = Math.abs(lon1 - lon2) % 360.0;
  return diff > 180.0 ? 360.0 - diff : diff;
}

export function isAspectApplying(
  lon1: number,
  speed1: number,
  lon2: number,
  speed2: number,
  targetAngle: number
): boolean {
  const dt = 0.01;
  const currentOrb = Math.abs(shortestAngularDistance(lon1, lon2) - targetAngle);
  const nextOrb = Math.abs(shortestAngularDistance(lon1 + speed1 * dt, lon2 + speed2 * dt) - targetAngle);
  return nextOrb < currentOrb;
}

function getEffectiveOrb(
  aspectDef: AspectDefinition,
  p1: AstrologicalPoint,
  p2: AstrologicalPoint,
  customOrbs?: OrbSettings
): number {
  const isLum =
    Boolean(p1.isLuminary) ||
    Boolean(p2.isLuminary) ||
    p1.name === 'Sun' ||
    p1.name === 'Moon' ||
    p2.name === 'Sun' ||
    p2.name === 'Moon';

  const override = customOrbs?.[aspectDef.type];
  if (override) {
    return isLum ? override.luminary : override.orb;
  }
  return isLum ? aspectDef.luminaryOrb : aspectDef.defaultOrb;
}

const OPPOSITE_PAIRS = new Set([
  'True Node|South Node',
  'South Node|True Node',
  'Mean Node|South Node',
  'South Node|Mean Node',
  'Vertex|AntiVertex',
  'AntiVertex|Vertex',
]);

export function detectMajorAspects(
  points: AstrologicalPoint[],
  includeMinor: boolean = true,
  customOrbs?: OrbSettings,
  includeHarmonic: boolean = true
): DetectedAspect[] {
  const detected: DetectedAspect[] = [];
  const activeDefs = STANDARD_ASPECTS.filter(a => {
    if (a.major) return true;
    if (a.harmonic) return includeMinor && includeHarmonic;
    return includeMinor;
  });

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const p1 = points[i];
      const p2 = points[j];

      if (OPPOSITE_PAIRS.has(`${p1.name}|${p2.name}`)) continue;

      const actualAngle = shortestAngularDistance(p1.longitude, p2.longitude);
      let bestMatch: DetectedAspect | null = null;

      for (const aspectDef of activeDefs) {
        const maxOrb = getEffectiveOrb(aspectDef, p1, p2, customOrbs);
        const orb = Math.abs(actualAngle - aspectDef.angle);

        if (orb <= maxOrb) {
          const applying =
            p1.longitudeSpeed !== undefined && p2.longitudeSpeed !== undefined
              ? isAspectApplying(p1.longitude, p1.longitudeSpeed, p2.longitude, p2.longitudeSpeed, aspectDef.angle)
              : false;

          if (!bestMatch || orb < bestMatch.orb) {
            bestMatch = {
              point1: p1,
              point2: p2,
              aspect: aspectDef,
              actualAngle,
              orb,
              maxOrb,
              isApplying: applying,
            };
          }
        }
      }

      if (bestMatch) {
        detected.push(bestMatch);
      }
    }
  }

  return detected.sort((a, b) => a.orb - b.orb);
}

export function detectBiWheelAspects(
  innerPoints: AstrologicalPoint[],
  outerPoints: AstrologicalPoint[],
  includeMinor: boolean = true,
  customOrbs?: OrbSettings,
  includeHarmonic: boolean = true
): DetectedAspect[] {
  const detected: DetectedAspect[] = [];
  const activeDefs = STANDARD_ASPECTS.filter(a => {
    if (a.major) return true;
    if (a.harmonic) return includeMinor && includeHarmonic;
    return includeMinor;
  });

  for (const p1 of innerPoints) {
    for (const p2 of outerPoints) {
      const actualAngle = shortestAngularDistance(p1.longitude, p2.longitude);
      let bestMatch: DetectedAspect | null = null;

      for (const aspectDef of activeDefs) {
        const maxOrb = getEffectiveOrb(aspectDef, p1, p2, customOrbs);
        const orb = Math.abs(actualAngle - aspectDef.angle);

        if (orb <= maxOrb) {
          const applying =
            p1.longitudeSpeed !== undefined && p2.longitudeSpeed !== undefined
              ? isAspectApplying(p1.longitude, p1.longitudeSpeed, p2.longitude, p2.longitudeSpeed, aspectDef.angle)
              : false;

          if (!bestMatch || orb < bestMatch.orb) {
            bestMatch = {
              point1: p1,
              point2: p2,
              aspect: aspectDef,
              actualAngle,
              orb,
              maxOrb,
              isApplying: applying,
            };
          }
        }
      }

      if (bestMatch) {
        detected.push(bestMatch);
      }
    }
  }

  return detected.sort((a, b) => a.orb - b.orb);
}

/**
 * Detects Parallels (‖) and Contra-Parallels (⧺) of Declination within maxOrb (default 1.0°).
 */
export function detectDeclinationAspects(
  points: AstrologicalPoint[],
  maxOrb: number = 1.0
): DeclinationAspect[] {
  const results: DeclinationAspect[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const p1 = points[i];
      const p2 = points[j];
      if (p1.declination === undefined || p2.declination === undefined) continue;
      if (OPPOSITE_PAIRS.has(`${p1.name}|${p2.name}`)) continue;

      const d1 = p1.declination;
      const d2 = p2.declination;
      const parallelOrb = Math.abs(d1 - d2);
      const contraOrb = Math.abs(d1 + d2);

      if (parallelOrb <= maxOrb) {
        results.push({
          point1: p1.name,
          glyph1: p1.glyph || '•',
          dec1: d1,
          point2: p2.name,
          glyph2: p2.glyph || '•',
          dec2: d2,
          type: 'Paralelo',
          glyph: '‖',
          orb: parallelOrb,
        });
      } else if (contraOrb <= maxOrb) {
        results.push({
          point1: p1.name,
          glyph1: p1.glyph || '•',
          dec1: d1,
          point2: p2.name,
          glyph2: p2.glyph || '•',
          dec2: d2,
          type: 'Contraparalelo',
          glyph: '⧺',
          orb: contraOrb,
        });
      }
    }
  }
  return results.sort((a, b) => a.orb - b.orb);
}

/**
 * Recognizes 8 geometric aspect patterns (AspPat.ini):
 * Grand Trine, Kite, T-Square, Grand Cross, Mystic Rectangle, Yod, Thor's Hammer, and Stellium.
 */
export function detectAspectPatterns(
  points: AstrologicalPoint[],
  aspects: DetectedAspect[]
): AspectPattern[] {
  const patterns: AspectPattern[] = [];

  const hasAspect = (pA: string, pB: string, type: AspectType): boolean =>
    aspects.some(
      a =>
        a.aspect.type === type &&
        ((a.point1.name === pA && a.point2.name === pB) || (a.point1.name === pB && a.point2.name === pA))
    );

  const names = points.map(p => p.name);
  const n = names.length;

  // 1. Grand Trine & 2. Kite
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const [a, b, c] = [names[i], names[j], names[k]];
        if (hasAspect(a, b, AspectType.Trine) && hasAspect(b, c, AspectType.Trine) && hasAspect(a, c, AspectType.Trine)) {
          patterns.push({
            name: 'Gran Trígono (Grand Trine)',
            points: [a, b, c],
            description: `Triángulo armónico cerrado de 120° entre ${a}, ${b} y ${c}.`,
          });

          for (let m = 0; m < n; m++) {
            if (m === i || m === j || m === k) continue;
            const d = names[m];
            const oppA = hasAspect(d, a, AspectType.Opposition) && hasAspect(d, b, AspectType.Sextile) && hasAspect(d, c, AspectType.Sextile);
            const oppB = hasAspect(d, b, AspectType.Opposition) && hasAspect(d, a, AspectType.Sextile) && hasAspect(d, c, AspectType.Sextile);
            const oppC = hasAspect(d, c, AspectType.Opposition) && hasAspect(d, a, AspectType.Sextile) && hasAspect(d, b, AspectType.Sextile);
            if (oppA || oppB || oppC) {
              patterns.push({
                name: 'Cometa (Kite)',
                points: [a, b, c, d],
                description: `Gran Trígono (${a}, ${b}, ${c}) focalizado por oposición y sextiles hacia ${d}.`,
              });
            }
          }
        }
      }
    }
  }

  // 3. T-Square (Cuadratura en T)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const [a, b] = [names[i], names[j]];
      if (!hasAspect(a, b, AspectType.Opposition)) continue;
      for (let k = 0; k < n; k++) {
        if (k === i || k === j) continue;
        const apex = names[k];
        if (hasAspect(a, apex, AspectType.Square) && hasAspect(b, apex, AspectType.Square)) {
          patterns.push({
            name: 'Cuadratura en T (T-Square)',
            points: [a, b, apex],
            description: `Oposición entre ${a} y ${b} descargando en cuadratura sobre el planeta focal ${apex}.`,
          });
        }
      }
    }
  }

  // 4. Grand Cross & 5. Mystic Rectangle
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const [a, b] = [names[i], names[j]];
      if (!hasAspect(a, b, AspectType.Opposition)) continue;
      for (let k = j + 1; k < n; k++) {
        for (let l = k + 1; l < n; l++) {
          const [c, d] = [names[k], names[l]];
          if (!hasAspect(c, d, AspectType.Opposition)) continue;

          if (
            hasAspect(a, c, AspectType.Square) &&
            hasAspect(c, b, AspectType.Square) &&
            hasAspect(b, d, AspectType.Square) &&
            hasAspect(d, a, AspectType.Square)
          ) {
            patterns.push({
              name: 'Gran Cruz Cósmica (Grand Cross)',
              points: [a, b, c, d],
              description: `Doble oposición ortogonal y cuatro cuadraturas entre ${a}, ${b}, ${c} y ${d}.`,
            });
          }

          const mr1 =
            hasAspect(a, c, AspectType.Sextile) &&
            hasAspect(b, d, AspectType.Sextile) &&
            hasAspect(a, d, AspectType.Trine) &&
            hasAspect(b, c, AspectType.Trine);
          const mr2 =
            hasAspect(a, d, AspectType.Sextile) &&
            hasAspect(b, c, AspectType.Sextile) &&
            hasAspect(a, c, AspectType.Trine) &&
            hasAspect(b, d, AspectType.Trine);
          if (mr1 || mr2) {
            patterns.push({
              name: 'Rectángulo Místico (Mystic Rectangle)',
              points: [a, b, c, d],
              description: `Dos oposiciones entrelazadas por dos trígonos y dos sextiles (${a}, ${b}, ${c}, ${d}).`,
            });
          }
        }
      }
    }
  }

  // 6. Yod (Dedo de Dios)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const [a, b] = [names[i], names[j]];
      if (!hasAspect(a, b, AspectType.Sextile)) continue;
      for (let k = 0; k < n; k++) {
        if (k === i || k === j) continue;
        const apex = names[k];
        if (hasAspect(a, apex, AspectType.Quincunx) && hasAspect(b, apex, AspectType.Quincunx)) {
          patterns.push({
            name: 'Yod (Dedo del Destino)',
            points: [a, b, apex],
            description: `Base en sextil (${a} - ${b}) proyectando dos quincuncios (150°) hacia el ápice ${apex}.`,
          });
        }
      }
    }
  }

  // 7. Thor's Hammer (Martillo de Thor: 1 Square + 2 Sesquisquares)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const [a, b] = [names[i], names[j]];
      if (!hasAspect(a, b, AspectType.Square)) continue;
      for (let k = 0; k < n; k++) {
        if (k === i || k === j) continue;
        const apex = names[k];
        if (hasAspect(a, apex, AspectType.Sesquisquare) && hasAspect(b, apex, AspectType.Sesquisquare)) {
          patterns.push({
            name: 'Martillo de Thor (Thor’s Hammer)',
            points: [a, b, apex],
            description: `Base en cuadratura (${a} - ${b}) convergiendo mediante dos sesquicuadraturas (135°) en ${apex}.`,
          });
        }
      }
    }
  }

  // 8. Stellium (3+ planets in same zodiac sign)
  const signNames = ['Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo', 'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis'];
  const bySign = new Map<number, string[]>();
  for (const p of points) {
    if (p.name === 'South Node' || p.name === 'Part of Fortune') continue;
    const sIdx = Math.floor(norm360(p.longitude) / 30);
    const list = bySign.get(sIdx) ?? [];
    list.push(p.name);
    bySign.set(sIdx, list);
  }
  for (const [sIdx, list] of bySign.entries()) {
    if (list.length >= 3) {
      patterns.push({
        name: `Stellium en ${signNames[sIdx]}`,
        points: list,
        description: `Concentración de ${list.length} cuerpos en ${signNames[sIdx]} (${list.join(', ')}).`,
      });
    }
  }

  return patterns;
}

/**
 * Computes Midpoint Trees (A/B = C) across 360° (Direct/Opposition), 90° (4th harmonic), and 45° (8th harmonic) dials.
 */
export function calculateMidpointStructures(
  points: AstrologicalPoint[],
  formatPosFn: (deg: number) => { formatted: string },
  maxOrb: number = 1.5
): MidpointStructure[] {
  const structures: MidpointStructure[] = [];
  const corePoints = points.filter(p => !['South Node', 'AntiVertex'].includes(p.name));

  for (let i = 0; i < corePoints.length; i++) {
    for (let j = i + 1; j < corePoints.length; j++) {
      const p1 = corePoints[i];
      const p2 = corePoints[j];
      const mid = shortArcMidpoint(p1.longitude, p2.longitude);
      const midFmt = formatPosFn(mid).formatted;
      const pairLabel = `${p1.glyph || ''} ${p1.name} / ${p2.glyph || ''} ${p2.name}`.trim();

      for (let k = 0; k < corePoints.length; k++) {
        if (k === i || k === j) continue;
        const p3 = corePoints[k];
        const dist = shortestAngularDistance(mid, p3.longitude);

        // 1. Direct or Opposition (0° or 180° in 360° dial)
        const orb360 = Math.min(dist, Math.abs(dist - 180));
        if (orb360 <= maxOrb) {
          structures.push({
            pair: pairLabel,
            p1: p1.name,
            p2: p2.name,
            midpointLon: mid,
            midpointFormatted: midFmt,
            contactPlanet: p3.name,
            contactGlyph: p3.glyph || '•',
            dial: 'Directo (360°)',
            orb: orb360,
          });
          continue;
        }

        // 2. 90° Dial (Square to midpoint)
        const orb90 = Math.abs(dist - 90);
        if (orb90 <= maxOrb) {
          structures.push({
            pair: pairLabel,
            p1: p1.name,
            p2: p2.name,
            midpointLon: mid,
            midpointFormatted: midFmt,
            contactPlanet: p3.name,
            contactGlyph: p3.glyph || '•',
            dial: 'Dial 90° (4H)',
            orb: orb90,
          });
          continue;
        }

        // 3. 45° Dial (Semisquare / Sesquisquare to midpoint)
        const orb45 = Math.min(Math.abs(dist - 45), Math.abs(dist - 135));
        if (orb45 <= maxOrb * 0.8) {
          structures.push({
            pair: pairLabel,
            p1: p1.name,
            p2: p2.name,
            midpointLon: mid,
            midpointFormatted: midFmt,
            contactPlanet: p3.name,
            contactGlyph: p3.glyph || '•',
            dial: 'Dial 45° (8H)',
            orb: orb45,
          });
        }
      }
    }
  }

  return structures.sort((a, b) => a.orb - b.orb).slice(0, 120);
}
