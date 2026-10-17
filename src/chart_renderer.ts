/**
 * Moonwater Professional Astrological Chart & Classic Aspect Grid SVG Renderer
 *
 * Features:
 * - Uni-Wheel (1 Ring), Bi-Wheel (2 Rings), and Tri-Wheel (3 Concentric Rings: e.g. Natal + Progressed + Transits)
 * - True-degree tick marks + leader lines connecting exact ecliptic longitude to dispersed glyph positions
 * - Multi-pass angular & radial dispersion so conjunct planets / stelliums never overlap
 * - Aspectarium with orb-weighted stroke width & opacity (exact aspects < 1° stand out)
 * - Classic Solar Fire Triangular Staircase Aspect Grid (renderAspectGridSVG) with longitude aspects,
 *   orb degrees/minutes, Applying (A) / Separating (S) tags, and Declination Parallels (‖ / ⧺)
 * - Rich interactive attributes (data-planet, data-p1, data-p2, data-info) for hover tooltips & click-to-highlight
 * - Full Dark & Light theme palettes
 */

import { HouseCusps } from './engine.js';
import { DetectedAspect, DeclinationAspect, AspectType, AstrologicalPoint } from './aspects.js';

export interface ChartRenderOptions {
  width?: number;
  height?: number;
  theme?: 'dark' | 'light';
  isBiWheel?: boolean;
  isTriWheel?: boolean;
}

export interface RenderableChartData {
  title?: string;
  subtitle?: string;
  dateStr?: string;
  locationStr?: string;
  ascendant: number;
  houses: HouseCusps;
  planets: AstrologicalPoint[];
  aspects: DetectedAspect[];
  outerPlanets?: AstrologicalPoint[];
  outerTitle?: string;
  thirdPlanets?: AstrologicalPoint[];
  thirdTitle?: string;
}

interface ZodiacSignDef {
  name: string;
  symbol: string;
  colorDark: string;
  colorLight: string;
  element: 'fire' | 'earth' | 'air' | 'water';
}

const ZODIAC_SIGNS: ZodiacSignDef[] = [
  { name: 'Aries', symbol: '♈', colorDark: '#ff5c5c', colorLight: '#d93829', element: 'fire' },
  { name: 'Taurus', symbol: '♉', colorDark: '#4ade80', colorLight: '#2a8f45', element: 'earth' },
  { name: 'Gemini', symbol: '♊', colorDark: '#facc15', colorLight: '#c98a00', element: 'air' },
  { name: 'Cancer', symbol: '♋', colorDark: '#38bdf8', colorLight: '#1877c9', element: 'water' },
  { name: 'Leo', symbol: '♌', colorDark: '#fb923c', colorLight: '#d95f18', element: 'fire' },
  { name: 'Virgo', symbol: '♍', colorDark: '#34d399', colorLight: '#1f7a4c', element: 'earth' },
  { name: 'Libra', symbol: '♎', colorDark: '#fbbf24', colorLight: '#b87d00', element: 'air' },
  { name: 'Scorpio', symbol: '♏', colorDark: '#60a5fa', colorLight: '#1d4ed8', element: 'water' },
  { name: 'Sagittarius', symbol: '♐', colorDark: '#f87171', colorLight: '#c83232', element: 'fire' },
  { name: 'Capricorn', symbol: '♑', colorDark: '#2dd4bf', colorLight: '#157568', element: 'earth' },
  { name: 'Aquarius', symbol: '♒', colorDark: '#fcd34d', colorLight: '#a87000', element: 'air' },
  { name: 'Pisces', symbol: '♓', colorDark: '#818cf8', colorLight: '#3b4bc8', element: 'water' },
];

export const PLANET_SYMBOLS: Record<string, string> = {
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
  'Mean Node': '☊',
  'South Node': '☋',
  Chiron: '⚷',
  Pholus: '⯛',
  Lilith: '⚸',
  'Osc. Lilith': 'Dark',
  Ceres: '⚳',
  Pallas: '⚴',
  Juno: '⚵',
  Vesta: '⚶',
  Hygiea: '⚕',
  Astraea: '⚖',
  Eris: '⯰',
  Sedna: '⯲',
  Cupido: '⯠',
  Hades: '⯡',
  Zeus: '⯢',
  Kronos: '⯣',
  Apollon: '⯤',
  Admetos: '⯥',
  Vulcanus: '⯦',
  Poseidon: '⯧',
  'Part of Fortune': '⊗',
  'Part of Spirit': '⊕',
  'Part of Eros': '❦',
  'Part of Victory': '♛',
  'Part of Necessity': '⚿',
  'Part of Courage': '⚔',
  'Part of Marriage': '⚭',
  'Part of Nemesis': '⚖',
  Vertex: 'Vx',
  AntiVertex: 'AVx',
  'East Point': 'EP',
  'Co-Ascendant': 'CAs',
};

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function norm360(deg: number): number {
  const d = deg % 360.0;
  return d < 0 ? d + 360.0 : d;
}

function eclipticToCanvasAngle(lon: number, asc: number): number {
  return norm360(180.0 - (lon - asc));
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function formatSignDegree(lon: number): { deg: string; min: string; signSymbol: string; signName: string; full: string } {
  const d = norm360(lon);
  const signIdx = Math.floor(d / 30.0);
  const signDeg = d - signIdx * 30.0;
  const degInt = Math.floor(signDeg);
  const minInt = Math.floor((signDeg - degInt) * 60.0);
  const sign = ZODIAC_SIGNS[signIdx];
  return {
    deg: `${degInt}°`,
    min: `${minInt.toString().padStart(2, '0')}'`,
    signSymbol: sign.symbol,
    signName: sign.name,
    full: `${degInt}° ${sign.name} ${minInt.toString().padStart(2, '0')}'`,
  };
}

interface DispersedPoint {
  point: AstrologicalPoint;
  trueAngle: number;
  displayAngle: number;
  radialTier: number;
}

function dispersePoints(points: AstrologicalPoint[], asc: number, minSepDeg: number = 7.2): DispersedPoint[] {
  if (points.length === 0) return [];

  const items = points
    .map((p, idx) => ({
      idx,
      point: p,
      trueAngle: eclipticToCanvasAngle(p.longitude, asc),
      displayAngle: eclipticToCanvasAngle(p.longitude, asc),
    }))
    .sort((a, b) => a.trueAngle - b.trueAngle);

  const n = items.length;

  for (let iter = 0; iter < 45; iter++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      let diff = items[next].displayAngle - items[i].displayAngle;
      if (next === 0) diff += 360.0;
      if (diff < 0) diff += 360.0;

      if (diff < minSepDeg && n > 1) {
        const push = (minSepDeg - diff) * 0.52;
        items[i].displayAngle = norm360(items[i].displayAngle - push);
        items[next].displayAngle = norm360(items[next].displayAngle + push);
        moved = true;
      }
    }
    if (!moved) break;
  }

  const out: DispersedPoint[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const prev = (i - 1 + n) % n;
    let gapPrev = items[i].trueAngle - items[prev].trueAngle;
    if (gapPrev < 0) gapPrev += 360.0;
    const isClustered = n > 1 && gapPrev < minSepDeg * 0.9;
    const tier = isClustered ? i % 2 : 0;

    out[items[i].idx] = {
      point: items[i].point,
      trueAngle: items[i].trueAngle,
      displayAngle: items[i].displayAngle,
      radialTier: tier,
    };
  }

  return out;
}

function getHouseOfLon(lon: number, cusps: number[]): number {
  const normLon = norm360(lon);
  for (let h = 1; h <= 12; h++) {
    const c1 = norm360(cusps[h]);
    const c2 = norm360(cusps[h === 12 ? 1 : h + 1]);
    if (c1 < c2) {
      if (normLon >= c1 && normLon < c2) return h;
    } else {
      if (normLon >= c1 || normLon < c2) return h;
    }
  }
  return 1;
}

export function renderChartSVG(data: RenderableChartData, options: ChartRenderOptions = {}): string {
  const size = options.width ?? 940;
  const cx = size / 2;
  const cy = size / 2 + 18;
  const isTriWheel = Boolean(options.isTriWheel && data.thirdPlanets && data.thirdPlanets.length > 0);
  const isBiWheel = Boolean(isTriWheel || options.isBiWheel || (data.outerPlanets && data.outerPlanets.length > 0));
  const theme = options.theme ?? 'dark';

  const palette = theme === 'dark'
    ? {
        bg: '#0b101b',
        wheelBg: '#0f172a',
        ringZodiac: '#131d31',
        ringHouse: '#0d1526',
        ringCenter: '#090e1a',
        border: '#334766',
        borderStrong: '#4f6a92',
        degreeTick: '#64748b',
        axis: '#38bdf8',
        textMain: '#f1f5f9',
        textMuted: '#94a3b8',
        textDegree: '#cbd5e1',
        nodeBg: '#162238',
        nodeStroke: '#475569',
        outerNodeBg: '#0f2942',
        outerNodeStroke: '#0284c7',
        outerGlyph: '#38bdf8',
        thirdNodeBg: '#27173a',
        thirdNodeStroke: '#a855f7',
        thirdGlyph: '#c084fc',
        leaderLine: '#94a3b8',
        aspHard: '#f87171',
        aspSoft: '#38bdf8',
        aspConj: '#fbbf24',
        aspMinor: '#c084fc',
      }
    : {
        bg: '#f8fafc',
        wheelBg: '#ffffff',
        ringZodiac: '#f1f5f9',
        ringHouse: '#ffffff',
        ringCenter: '#f8fafc',
        border: '#94a3b8',
        borderStrong: '#475569',
        degreeTick: '#64748b',
        axis: '#0284c7',
        textMain: '#0f172a',
        textMuted: '#475569',
        textDegree: '#334155',
        nodeBg: '#ffffff',
        nodeStroke: '#64748b',
        outerNodeBg: '#e0f2fe',
        outerNodeStroke: '#0284c7',
        outerGlyph: '#0369a1',
        thirdNodeBg: '#f3e8ff',
        thirdNodeStroke: '#9333ea',
        thirdGlyph: '#7e22ce',
        leaderLine: '#475569',
        aspHard: '#dc2626',
        aspSoft: '#0284c7',
        aspConj: '#d97706',
        aspMinor: '#7c3aed',
      };

  // Radii geometry (adapts cleanly for Uni-Wheel, Bi-Wheel, and Tri-Wheel)
  const rOuter = size * 0.425;
  const rZodiacInner = size * 0.365;
  const rThirdTrack = isTriWheel ? size * 0.312 : rZodiacInner;
  const rOuterTrack = isTriWheel ? size * 0.258 : isBiWheel ? size * 0.302 : rZodiacInner;
  const rHousesOuter = isBiWheel ? rOuterTrack : rZodiacInner;
  const rHousesNumOuter = isTriWheel ? size * 0.175 : size * 0.212;
  const rAspects = isTriWheel ? size * 0.152 : size * 0.188;

  const asc = data.ascendant;
  const rawTitle = (data.title || 'Carta Natal').trim();
  const cleanTitle = escapeXml(rawTitle);
  const subLine = escapeXml(
    data.subtitle || [data.dateStr, data.locationStr].filter(Boolean).join('  •  ')
  );

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size + 24}" width="100%" height="100%" id="natal-chart-svg" data-theme="${theme}">
  <defs>
    <filter id="glyph-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000000" flood-opacity="${theme === 'dark' ? '0.55' : '0.15'}" />
    </filter>
    <style>
      .chart-bg { fill: ${palette.bg}; }
      .ring-stroke { fill: none; stroke: ${palette.border}; stroke-width: 2.2; }
      .ring-stroke-strong { fill: none; stroke: ${palette.borderStrong}; stroke-width: 2.8; }
      .zodiac-wedge { stroke: ${palette.borderStrong}; stroke-width: 1.8; }
      .zodiac-glyph { font-family: 'Segoe UI Symbol', 'Noto Sans Symbols 2', 'Apple Symbols', sans-serif; font-size: 22px; text-anchor: middle; dominant-baseline: central; pointer-events: none; }
      .house-line { stroke: ${palette.borderStrong}; stroke-width: 1.9; stroke-dasharray: 4,3; }
      .axis-line { stroke: ${palette.axis}; stroke-width: 3.6; }
      .house-num { font-family: 'Plus Jakarta Sans', 'Segoe UI', sans-serif; font-size: 11.5px; fill: ${palette.textMuted}; text-anchor: middle; dominant-baseline: central; font-weight: 800; pointer-events: none; }
      .planet-group { cursor: pointer; transition: opacity 0.2s ease, transform 0.2s ease; }
      .planet-group:hover .planet-node { stroke: ${palette.axis}; stroke-width: 2.8; }
      .planet-glyph { font-family: 'Segoe UI Symbol', 'Noto Sans Symbols 2', 'Apple Symbols', sans-serif; font-size: 18px; text-anchor: middle; dominant-baseline: central; font-weight: 700; user-select: none; }
      .planet-deg { font-family: 'Plus Jakarta Sans', 'Segoe UI', sans-serif; font-size: 10.5px; font-weight: 700; fill: ${palette.textDegree}; text-anchor: middle; dominant-baseline: central; pointer-events: none; }
      .leader-line { stroke: ${palette.leaderLine}; stroke-width: 1.6; stroke-dasharray: 2.5,2; fill: none; pointer-events: none; }
      .exact-tick { stroke: ${palette.borderStrong}; stroke-width: 2.4; pointer-events: none; }
      .aspect-chord { fill: none; stroke-linecap: round; cursor: pointer; transition: opacity 0.2s ease, stroke-width 0.2s ease; }
      .aspect-chord:hover { stroke-opacity: 1 !important; stroke-width: 4.6px !important; }
      .title-text { font-family: 'Cinzel', Georgia, serif; fill: ${palette.textMain}; font-size: 17px; font-weight: 700; text-anchor: middle; letter-spacing: 0.7px; }
      .sub-text { font-family: 'Plus Jakarta Sans', 'Segoe UI', sans-serif; fill: ${palette.textMuted}; font-size: 11.5px; text-anchor: middle; }
      .angle-label { font-family: 'Plus Jakarta Sans', 'Segoe UI', sans-serif; font-size: 12.5px; font-weight: 800; fill: ${palette.axis}; text-anchor: middle; dominant-baseline: central; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size + 24}" class="chart-bg" rx="12" />

  <!-- Header -->
  <text x="${cx}" y="27" class="title-text">${cleanTitle}</text>
  <text x="${cx}" y="46" class="sub-text">${subLine}</text>

  <!-- Base Concentric Rings -->
  <circle cx="${cx}" cy="${cy}" r="${rOuter}" fill="${palette.ringZodiac}" class="ring-stroke-strong" />
  <circle cx="${cx}" cy="${cy}" r="${rZodiacInner}" fill="${palette.ringHouse}" class="ring-stroke-strong" />
  ${isTriWheel ? `<circle cx="${cx}" cy="${cy}" r="${rThirdTrack}" fill="${palette.ringHouse}" class="ring-stroke" />` : ''}
  ${isBiWheel ? `<circle cx="${cx}" cy="${cy}" r="${rOuterTrack}" fill="${palette.ringHouse}" class="ring-stroke" />` : ''}
  <circle cx="${cx}" cy="${cy}" r="${rHousesNumOuter}" fill="none" class="ring-stroke" />
  <circle cx="${cx}" cy="${cy}" r="${rAspects}" fill="${palette.ringCenter}" class="ring-stroke-strong" />
`;

  // 1. Zodiac 12 Signs + 1° / 5° / 10° Degree Ticks
  svg += `\n  <!-- Zodiac Sectors & Degree Ticks -->\n  <g class="zodiac-ring">\n`;
  for (let i = 0; i < 12; i++) {
    const sign = ZODIAC_SIGNS[i];
    const signColor = theme === 'dark' ? sign.colorDark : sign.colorLight;
    const startLon = i * 30.0;
    const endLon = (i + 1) * 30.0;

    const aStart = eclipticToCanvasAngle(startLon, asc);
    const aEnd = eclipticToCanvasAngle(endLon, asc);
    const aMid = eclipticToCanvasAngle(startLon + 15.0, asc);

    const p1 = polarToCartesian(cx, cy, rOuter, aEnd);
    const p2 = polarToCartesian(cx, cy, rOuter, aStart);
    const p3 = polarToCartesian(cx, cy, rZodiacInner, aStart);
    const p4 = polarToCartesian(cx, cy, rZodiacInner, aEnd);

    svg += `    <path d="M ${p3.x.toFixed(2)} ${p3.y.toFixed(2)} L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} A ${rOuter} ${rOuter} 0 0 0 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} L ${p4.x.toFixed(2)} ${p4.y.toFixed(2)} A ${rZodiacInner} ${rZodiacInner} 0 0 1 ${p3.x.toFixed(2)} ${p3.y.toFixed(2)} Z" fill="${signColor}" fill-opacity="${theme === 'dark' ? '0.15' : '0.14'}" class="zodiac-wedge" />\n`;

    for (let deg = 1; deg < 30; deg++) {
      const tickAngle = eclipticToCanvasAngle(startLon + deg, asc);
      const tickLen = deg % 10 === 0 ? 8 : deg % 5 === 0 ? 5.2 : 2.6;
      const tIn = polarToCartesian(cx, cy, rZodiacInner, tickAngle);
      const tOut = polarToCartesian(cx, cy, rZodiacInner + tickLen, tickAngle);
      svg += `    <line x1="${tIn.x.toFixed(1)}" y1="${tIn.y.toFixed(1)}" x2="${tOut.x.toFixed(1)}" y2="${tOut.y.toFixed(1)}" stroke="${palette.degreeTick}" stroke-width="${deg % 5 === 0 ? '1.6' : '1.0'}" />\n`;
    }

    const rGlyph = (rOuter + rZodiacInner) / 2;
    const gPos = polarToCartesian(cx, cy, rGlyph, aMid);
    svg += `    <text x="${gPos.x.toFixed(1)}" y="${gPos.y.toFixed(1)}" fill="${signColor}" class="zodiac-glyph">${sign.symbol}</text>\n`;
  }
  svg += `  </g>\n`;

  // 2. House Cusps & Cardinal Axes
  svg += `\n  <!-- House Cusps & Cardinal Axes -->\n  <g class="house-cusps">\n`;
  for (let h = 1; h <= 12; h++) {
    const cuspLon = data.houses.cusps[h];
    const angle = eclipticToCanvasAngle(cuspLon, asc);
    const isAxis = h === 1 || h === 4 || h === 7 || h === 10;

    const rStart = rAspects;
    const rEnd = isAxis ? rOuter + 7 : rHousesOuter;

    const pStart = polarToCartesian(cx, cy, rStart, angle);
    const pEnd = polarToCartesian(cx, cy, rEnd, angle);

    svg += `    <line x1="${pStart.x.toFixed(1)}" y1="${pStart.y.toFixed(1)}" x2="${pEnd.x.toFixed(1)}" y2="${pEnd.y.toFixed(1)}" class="${isAxis ? 'axis-line' : 'house-line'}" />\n`;

    const nextH = h === 12 ? 1 : h + 1;
    const nextAngle = eclipticToCanvasAngle(data.houses.cusps[nextH], asc);
    const span = norm360(nextAngle - angle);
    const midAngle = norm360(angle - (360 - span) / 2);
    const rNum = (rAspects + rHousesNumOuter) / 2;
    const numPos = polarToCartesian(cx, cy, rNum, midAngle);
    svg += `    <text x="${numPos.x.toFixed(1)}" y="${numPos.y.toFixed(1)}" class="house-num">${h}</text>\n`;
  }

  const ascFmt = formatSignDegree(data.houses.ascmc.ascendant);
  const mcFmt = formatSignDegree(data.houses.ascmc.mc);
  const dscFmt = formatSignDegree(data.houses.ascmc.ascendant + 180);
  const icFmt = formatSignDegree(data.houses.ascmc.mc + 180);

  const ascPos = polarToCartesian(cx, cy, rOuter + 20, 180);
  const dscPos = polarToCartesian(cx, cy, rOuter + 20, 0);
  const mcAngle = eclipticToCanvasAngle(data.houses.ascmc.mc, asc);
  const mcPos = polarToCartesian(cx, cy, rOuter + 18, mcAngle);
  const icPos = polarToCartesian(cx, cy, rOuter + 18, norm360(mcAngle + 180));

  svg += `    <text x="${ascPos.x.toFixed(1)}" y="${ascPos.y.toFixed(1)}" class="angle-label">ASC ${ascFmt.deg}${ascFmt.signSymbol}</text>
    <text x="${dscPos.x.toFixed(1)}" y="${dscPos.y.toFixed(1)}" class="angle-label">DSC ${dscFmt.deg}${dscFmt.signSymbol}</text>
    <text x="${mcPos.x.toFixed(1)}" y="${mcPos.y.toFixed(1)}" class="angle-label">MC ${mcFmt.deg}${mcFmt.signSymbol}</text>
    <text x="${icPos.x.toFixed(1)}" y="${icPos.y.toFixed(1)}" class="angle-label">IC ${icFmt.deg}${icFmt.signSymbol}</text>
  </g>\n`;

  // 3. Aspectarium Chords
  svg += `\n  <!-- Aspectarium Chords -->\n  <g class="aspect-chords">\n`;
  for (const asp of data.aspects) {
    const a1 = eclipticToCanvasAngle(asp.point1.longitude, asc);
    const a2 = eclipticToCanvasAngle(asp.point2.longitude, asc);

    const p1 = polarToCartesian(cx, cy, rAspects - 2, a1);
    const p2 = polarToCartesian(cx, cy, rAspects - 2, a2);

    let stroke = palette.aspSoft;
    let dash = '';
    if (asp.aspect.type === AspectType.Square || asp.aspect.type === AspectType.Opposition) {
      stroke = palette.aspHard;
    } else if (asp.aspect.type === AspectType.Conjunction) {
      stroke = palette.aspConj;
    } else if (!asp.aspect.major) {
      stroke = palette.aspMinor;
      dash = 'stroke-dasharray="5,3"';
    }

    const maxO = Math.max(asp.maxOrb, 1);
    const tightness = Math.max(0, Math.min(1, 1 - asp.orb / maxO));
    const strokeWidth = (asp.aspect.major ? 1.8 + tightness * 2.4 : 1.4 + tightness * 1.5).toFixed(2);
    const strokeOpacity = (asp.aspect.major ? 0.48 + tightness * 0.48 : 0.40 + tightness * 0.45).toFixed(2);

    const p1Name = escapeXml(asp.point1.name);
    const p2Name = escapeXml(asp.point2.name);
    const tip = escapeXml(
      `${asp.point1.name} ${asp.aspect.glyph} ${asp.aspect.name} ${asp.point2.name} • Orbe: ${asp.orb.toFixed(2)}° (${asp.isApplying ? 'Aplicativo' : 'Separativo'})`
    );

    svg += `    <line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}" ${dash} class="aspect-chord" data-p1="${p1Name}" data-p2="${p2Name}" data-tooltip="${tip}" />\n`;
  }
  svg += `  </g>\n`;

  // 4. Inner Ring Planets (Radix)
  const minSepInner = isTriWheel ? 8.2 : isBiWheel ? 7.6 : 6.6;
  const dispersedInner = dispersePoints(data.planets, asc, minSepInner);
  const rInnerGlyphBase = isTriWheel
    ? (rHousesOuter + rHousesNumOuter) * 0.56
    : isBiWheel
    ? (rHousesOuter + rHousesNumOuter) * 0.54
    : rZodiacInner - 34;
  const rInnerGlyphAlt = isTriWheel
    ? (rHousesOuter + rHousesNumOuter) * 0.45
    : isBiWheel
    ? (rHousesOuter + rHousesNumOuter) * 0.45
    : rZodiacInner - 58;

  svg += `\n  <!-- Inner Wheel Planets -->\n  <g class="inner-planets">\n`;
  for (const item of dispersedInner) {
    const p = item.point;
    const glyph = p.glyph || PLANET_SYMBOLS[p.name] || p.name.substring(0, 2);
    const fmt = formatSignDegree(p.longitude);
    const houseNum = getHouseOfLon(p.longitude, data.houses.cusps);
    const isRetro = (p.longitudeSpeed ?? 0) < 0;

    const tickOuter = polarToCartesian(cx, cy, rHousesOuter, item.trueAngle);
    const tickInner = polarToCartesian(cx, cy, rHousesOuter - 6, item.trueAngle);

    const rGlyph = item.radialTier === 0 ? rInnerGlyphBase : rInnerGlyphAlt;
    const glyphPos = polarToCartesian(cx, cy, rGlyph, item.displayAngle);
    const leaderEnd = polarToCartesian(cx, cy, rGlyph + 13, item.displayAngle);

    const rDegLabel = rGlyph - (isBiWheel ? 18 : 23);
    const degPos = polarToCartesian(cx, cy, rDegLabel, item.displayAngle);

    let glyphColor = palette.textMain;
    if (p.name === 'Sun') glyphColor = theme === 'dark' ? '#facc15' : '#ca8a04';
    else if (p.name === 'Moon') glyphColor = theme === 'dark' ? '#e2e8f0' : '#334155';
    else if (p.name === 'Mercury') glyphColor = theme === 'dark' ? '#a78bfa' : '#6d28d9';
    else if (p.name === 'Venus') glyphColor = theme === 'dark' ? '#4ade80' : '#15803d';
    else if (p.name === 'Mars') glyphColor = theme === 'dark' ? '#f87171' : '#b91c1c';
    else if (p.name === 'Jupiter') glyphColor = theme === 'dark' ? '#fb923c' : '#c2410c';
    else if (p.name === 'Saturn') glyphColor = theme === 'dark' ? '#eab308' : '#854d0e';
    else if (p.name === 'Uranus') glyphColor = theme === 'dark' ? '#22d3ee' : '#0e7490';
    else if (p.name === 'Neptune') glyphColor = theme === 'dark' ? '#60a5fa' : '#1d4ed8';
    else if (p.name === 'Pluto') glyphColor = theme === 'dark' ? '#f472b6' : '#9d174d';
    else if (p.name === 'Chiron') glyphColor = theme === 'dark' ? '#2dd4bf' : '#0f766e';
    else if (p.name.startsWith('Part of')) glyphColor = theme === 'dark' ? '#fbbf24' : '#b45309';

    const relatedAspects = data.aspects
      .filter(a => a.point1.name === p.name || a.point2.name === p.name)
      .slice(0, 5)
      .map(a => {
        const other = a.point1.name === p.name ? a.point2.name : a.point1.name;
        return `${a.aspect.glyph} ${other} (${a.orb.toFixed(1)}°)`;
      })
      .join(', ');

    const speedTxt = p.longitudeSpeed !== undefined ? `${p.longitudeSpeed >= 0 ? '+' : ''}${p.longitudeSpeed.toFixed(3)}°/d` : '';
    const tooltipData = escapeXml(
      JSON.stringify({
        name: p.name,
        glyph,
        position: fmt.full,
        house: houseNum,
        speed: speedTxt,
        retrograde: isRetro,
        aspects: relatedAspects || 'Sin aspectos mayores',
      })
    );

    const pNameAttr = escapeXml(p.name);
    const nodeR = isTriWheel ? 11.5 : 13.5;

    svg += `    <g class="planet-group" data-planet="${pNameAttr}" data-info="${tooltipData}">
      <line x1="${tickOuter.x.toFixed(1)}" y1="${tickOuter.y.toFixed(1)}" x2="${tickInner.x.toFixed(1)}" y2="${tickInner.y.toFixed(1)}" class="exact-tick" />
      <line x1="${tickInner.x.toFixed(1)}" y1="${tickInner.y.toFixed(1)}" x2="${leaderEnd.x.toFixed(1)}" y2="${leaderEnd.y.toFixed(1)}" class="leader-line" />
      <circle cx="${glyphPos.x.toFixed(1)}" cy="${glyphPos.y.toFixed(1)}" r="${nodeR}" fill="${palette.nodeBg}" stroke="${palette.nodeStroke}" stroke-width="2.0" class="planet-node" filter="url(#glyph-shadow)" />
      <text x="${glyphPos.x.toFixed(1)}" y="${glyphPos.y.toFixed(1)}" fill="${glyphColor}" class="planet-glyph" style="font-size:${isTriWheel ? '14px' : '18px'};">${glyph}</text>
      ${!isTriWheel ? `<text x="${degPos.x.toFixed(1)}" y="${degPos.y.toFixed(1)}" class="planet-deg">${fmt.deg}${fmt.min}${isRetro ? '℞' : ''}</text>` : ''}
    </g>\n`;
  }
  svg += `  </g>\n`;

  // 5. Ring 2 Planets (Bi-Wheel Outer or Tri-Wheel Middle Ring)
  if (isBiWheel && data.outerPlanets && data.outerPlanets.length > 0) {
    const dispersedOuter = dispersePoints(data.outerPlanets, asc, 6.2);
    const outerBandOuterR = isTriWheel ? rThirdTrack : rZodiacInner;
    const outerBandInnerR = rOuterTrack;
    const rOuterGlyphBase = (outerBandOuterR + outerBandInnerR) * 0.54;
    const rOuterGlyphAlt = (outerBandOuterR + outerBandInnerR) * 0.46;

    svg += `\n  <!-- Ring 2 Planets -->\n  <g class="outer-planets">\n`;
    for (const item of dispersedOuter) {
      const p = item.point;
      const glyph = p.glyph || PLANET_SYMBOLS[p.name] || p.name.substring(0, 2);
      const fmt = formatSignDegree(p.longitude);
      const houseNum = getHouseOfLon(p.longitude, data.houses.cusps);
      const isRetro = (p.longitudeSpeed ?? 0) < 0;

      const tickIn = polarToCartesian(cx, cy, outerBandInnerR, item.trueAngle);
      const tickOut = polarToCartesian(cx, cy, outerBandInnerR + 5.5, item.trueAngle);

      const rGlyph = item.radialTier === 0 ? rOuterGlyphBase : rOuterGlyphAlt;
      const glyphPos = polarToCartesian(cx, cy, rGlyph, item.displayAngle);

      const tooltipData = escapeXml(
        JSON.stringify({
          name: `${data.outerTitle || 'Anillo 2'}: ${p.name}`,
          glyph,
          position: fmt.full,
          house: houseNum,
          speed: p.longitudeSpeed !== undefined ? `${p.longitudeSpeed.toFixed(3)}°/d` : '',
          retrograde: isRetro,
          aspects: data.outerTitle || 'Rueda 2',
        })
      );

      const pNameAttr = escapeXml(p.name);

      svg += `    <g class="planet-group outer-planet-group" data-planet="${pNameAttr}" data-info="${tooltipData}">
      <line x1="${tickIn.x.toFixed(1)}" y1="${tickIn.y.toFixed(1)}" x2="${tickOut.x.toFixed(1)}" y2="${tickOut.y.toFixed(1)}" class="exact-tick" />
      <line x1="${tickOut.x.toFixed(1)}" y1="${tickOut.y.toFixed(1)}" x2="${glyphPos.x.toFixed(1)}" y2="${glyphPos.y.toFixed(1)}" class="leader-line" />
      <circle cx="${glyphPos.x.toFixed(1)}" cy="${glyphPos.y.toFixed(1)}" r="11.5" fill="${palette.outerNodeBg}" stroke="${palette.outerNodeStroke}" stroke-width="1.8" class="planet-node" />
      <text x="${glyphPos.x.toFixed(1)}" y="${glyphPos.y.toFixed(1)}" fill="${palette.outerGlyph}" class="planet-glyph" style="font-size:14px;">${glyph}</text>
    </g>\n`;
    }
    svg += `  </g>\n`;
  }

  // 6. Ring 3 Planets (Tri-Wheel Outermost Ring: e.g. Live Transits)
  if (isTriWheel && data.thirdPlanets && data.thirdPlanets.length > 0) {
    const dispersedThird = dispersePoints(data.thirdPlanets, asc, 5.8);
    const rThirdGlyphBase = (rZodiacInner + rThirdTrack) * 0.53;
    const rThirdGlyphAlt = (rZodiacInner + rThirdTrack) * 0.46;

    svg += `\n  <!-- Ring 3 (Tri-Wheel Outermost) Planets -->\n  <g class="third-planets">\n`;
    for (const item of dispersedThird) {
      const p = item.point;
      const glyph = p.glyph || PLANET_SYMBOLS[p.name] || p.name.substring(0, 2);
      const fmt = formatSignDegree(p.longitude);
      const houseNum = getHouseOfLon(p.longitude, data.houses.cusps);
      const isRetro = (p.longitudeSpeed ?? 0) < 0;

      const tickIn = polarToCartesian(cx, cy, rThirdTrack, item.trueAngle);
      const tickOut = polarToCartesian(cx, cy, rThirdTrack + 5.5, item.trueAngle);

      const rGlyph = item.radialTier === 0 ? rThirdGlyphBase : rThirdGlyphAlt;
      const glyphPos = polarToCartesian(cx, cy, rGlyph, item.displayAngle);

      const tooltipData = escapeXml(
        JSON.stringify({
          name: `${data.thirdTitle || 'Anillo 3 (Tránsitos)'}: ${p.name}`,
          glyph,
          position: fmt.full,
          house: houseNum,
          speed: p.longitudeSpeed !== undefined ? `${p.longitudeSpeed.toFixed(3)}°/d` : '',
          retrograde: isRetro,
          aspects: data.thirdTitle || 'Rueda 3',
        })
      );

      const pNameAttr = escapeXml(p.name);

      svg += `    <g class="planet-group third-planet-group" data-planet="${pNameAttr}" data-info="${tooltipData}">
      <line x1="${tickIn.x.toFixed(1)}" y1="${tickIn.y.toFixed(1)}" x2="${tickOut.x.toFixed(1)}" y2="${tickOut.y.toFixed(1)}" class="exact-tick" />
      <line x1="${tickOut.x.toFixed(1)}" y1="${tickOut.y.toFixed(1)}" x2="${glyphPos.x.toFixed(1)}" y2="${glyphPos.y.toFixed(1)}" class="leader-line" />
      <circle cx="${glyphPos.x.toFixed(1)}" cy="${glyphPos.y.toFixed(1)}" r="11" fill="${palette.thirdNodeBg}" stroke="${palette.thirdNodeStroke}" stroke-width="1.8" class="planet-node" />
      <text x="${glyphPos.x.toFixed(1)}" y="${glyphPos.y.toFixed(1)}" fill="${palette.thirdGlyph}" class="planet-glyph" style="font-size:13.5px;">${glyph}</text>
    </g>\n`;
    }
    svg += `  </g>\n`;
  }

  // Center Hub
  svg += `  <circle cx="${cx}" cy="${cy}" r="5.5" fill="${palette.axis}" />\n</svg>`;

  return svg;
}

/**
 * Generates the Classic Solar Fire Triangular Staircase Aspect Grid in SVG format.
 * Crosses all displayed points, showing the colored aspect glyph, orb in deg/min,
 * Applying (A) / Separating (S) tag, and Declination Parallel (‖) / Contra-Parallel (⧺) markers.
 */
export function renderAspectGridSVG(
  points: AstrologicalPoint[],
  aspects: DetectedAspect[],
  declAspects: DeclinationAspect[] = [],
  theme: 'dark' | 'light' = 'dark'
): string {
  // Limit grid to the first 18 points so cells stay crisp and readable
  const gridPoints = points.slice(0, 18);
  const n = gridPoints.length;
  if (n === 0) return '';

  const cellSize = 44;
  const padLeft = 28;
  const padTop = 36;
  const width = padLeft + (n + 1) * cellSize + 20;
  const height = padTop + (n + 1) * cellSize + 20;

  const colors = theme === 'dark'
    ? {
        bg: '#0b101b',
        cellBg: '#111a2e',
        headerBg: '#17233d',
        border: '#3b4f6e',
        text: '#f1f5f9',
        muted: '#94a3b8',
        hard: '#f87171',
        soft: '#38bdf8',
        conj: '#fbbf24',
        minor: '#c084fc',
        decl: '#34d399',
      }
    : {
        bg: '#f8fafc',
        cellBg: '#ffffff',
        headerBg: '#e2e8f0',
        border: '#94a3b8',
        text: '#0f172a',
        muted: '#475569',
        hard: '#dc2626',
        soft: '#0284c7',
        conj: '#d97706',
        minor: '#7c3aed',
        decl: '#059669',
      };

  const aspMap = new Map<string, DetectedAspect>();
  for (const a of aspects) {
    aspMap.set(`${a.point1.name}|${a.point2.name}`, a);
    aspMap.set(`${a.point2.name}|${a.point1.name}`, a);
  }

  const declMap = new Map<string, DeclinationAspect>();
  for (const d of declAspects) {
    declMap.set(`${d.point1}|${d.point2}`, d);
    declMap.set(`${d.point2}|${d.point1}`, d);
  }

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" class="aspect-grid-svg">
  <rect width="${width}" height="${height}" fill="${colors.bg}" rx="10" />
  <text x="${width / 2}" y="22" fill="${colors.text}" font-family="'Cinzel', serif" font-size="14" font-weight="700" text-anchor="middle">MATRIZ ESCALONADA DE ASPECTOS Y PARALELOS (SOLAR FIRE GRID)</text>
`;

  for (let row = 0; row < n; row++) {
    const pRow = gridPoints[row];
    const rowGlyph = pRow.glyph || PLANET_SYMBOLS[pRow.name] || pRow.name.slice(0, 2);

    // Draw cells for columns 0 .. row - 1
    for (let col = 0; col < row; col++) {
      const pCol = gridPoints[col];
      const x = padLeft + col * cellSize;
      const y = padTop + row * cellSize;

      const asp = aspMap.get(`${pRow.name}|${pCol.name}`);
      const dec = declMap.get(`${pRow.name}|${pCol.name}`);

      svg += `  <rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${colors.cellBg}" stroke="${colors.border}" stroke-width="1.6" />\n`;

      if (asp) {
        let c = colors.soft;
        if (asp.aspect.nature === 'hard') c = colors.hard;
        else if (asp.aspect.nature === 'neutral') c = colors.conj;
        else if (asp.aspect.nature === 'minor') c = colors.minor;

        const deg = Math.floor(asp.orb);
        const min = Math.floor((asp.orb - deg) * 60);
        const orbStr = `${deg}°${String(min).padStart(2, '0')}'${asp.isApplying ? 'A' : 'S'}`;

        svg += `  <text x="${x + cellSize / 2}" y="${y + 18}" fill="${c}" font-family="'Segoe UI Symbol', sans-serif" font-size="16" font-weight="700" text-anchor="middle">${asp.aspect.glyph}</text>\n`;
        svg += `  <text x="${x + cellSize / 2}" y="${y + 33}" fill="${colors.muted}" font-family="'Plus Jakarta Sans', sans-serif" font-size="8.5" font-weight="700" text-anchor="middle">${orbStr}</text>\n`;
      }

      if (dec) {
        svg += `  <text x="${x + cellSize - 8}" y="${y + 11}" fill="${colors.decl}" font-family="'Segoe UI Symbol', sans-serif" font-size="10.5" font-weight="700" text-anchor="middle">${dec.glyph}</text>\n`;
      }
    }

    // Diagonal Header Cap at (col = row, row = row)
    const hx = padLeft + row * cellSize;
    const hy = padTop + row * cellSize;
    svg += `  <rect x="${hx}" y="${hy}" width="${cellSize}" height="${cellSize}" fill="${colors.headerBg}" stroke="${colors.border}" stroke-width="2.0" />\n`;
    svg += `  <text x="${hx + cellSize / 2}" y="${hy + 21}" fill="${colors.text}" font-family="'Segoe UI Symbol', sans-serif" font-size="16" font-weight="700" text-anchor="middle">${rowGlyph}</text>\n`;
    svg += `  <text x="${hx + cellSize / 2}" y="${hy + 36}" fill="${colors.muted}" font-family="'Plus Jakarta Sans', sans-serif" font-size="8" font-weight="700" text-anchor="middle">${escapeXml(pRow.name.slice(0, 6))}</text>\n`;
  }

  svg += `</svg>`;
  return svg;
}
