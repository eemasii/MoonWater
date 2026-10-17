import express, { Request, Response } from 'express';
import * as path from 'path';
import * as http from 'http';
import {
  EphemerisEngine,
  SwePlanet,
  SweFlag,
  HouseSystem,
  ZodiacMode,
  AyanamshaSystem,
  CalendarType,
  MAJOR_FIXED_STARS,
  calculateNakshatra,
  computeVargaLongitude,
  VargaCode,
  jdToCalendar,
  norm360,
  shortArcMidpoint,
} from './engine.js';
import {
  detectMajorAspects,
  detectBiWheelAspects,
  detectAspectPatterns,
  detectDeclinationAspects,
  calculateMidpointStructures,
  AstrologicalPoint,
  OrbSettings,
  STANDARD_ASPECTS,
} from './aspects.js';
import {
  computeChartDignitiesAndAlmuten,
  computeElementalBalance,
  computeFirdariaPeriods,
  computeAnnualProfection,
  evaluateDegreeDignities,
  TriplicitySystem,
  TermSystem,
  TRADITIONAL_PLANETS,
  PLANET_GLYPHS,
} from './dignities.js';
import {
  renderChartSVG,
  renderAspectGridSVG,
  RenderableChartData,
} from './chart_renderer.js';
import { ChartStorage } from './storage.js';

export type BodyGroup =
  | 'luminaries'
  | 'traditional'
  | 'modern'
  | 'asteroids'
  | 'chiron'
  | 'lilith'
  | 'nodes'
  | 'arabic'
  | 'tno'
  | 'uranian'
  | 'vertices';

interface BodySpec {
  id: SwePlanet;
  name: string;
  glyph: string;
  isLuminary: boolean;
  group: BodyGroup;
}

const ALL_BODIES: BodySpec[] = [
  { id: SwePlanet.SE_SUN, name: 'Sun', glyph: '☉', isLuminary: true, group: 'luminaries' },
  { id: SwePlanet.SE_MOON, name: 'Moon', glyph: '☽', isLuminary: true, group: 'luminaries' },
  { id: SwePlanet.SE_MERCURY, name: 'Mercury', glyph: '☿', isLuminary: false, group: 'traditional' },
  { id: SwePlanet.SE_VENUS, name: 'Venus', glyph: '♀', isLuminary: false, group: 'traditional' },
  { id: SwePlanet.SE_MARS, name: 'Mars', glyph: '♂', isLuminary: false, group: 'traditional' },
  { id: SwePlanet.SE_JUPITER, name: 'Jupiter', glyph: '♃', isLuminary: false, group: 'traditional' },
  { id: SwePlanet.SE_SATURN, name: 'Saturn', glyph: '♄', isLuminary: false, group: 'traditional' },
  { id: SwePlanet.SE_URANUS, name: 'Uranus', glyph: '♅', isLuminary: false, group: 'modern' },
  { id: SwePlanet.SE_NEPTUNE, name: 'Neptune', glyph: '♆', isLuminary: false, group: 'modern' },
  { id: SwePlanet.SE_PLUTO, name: 'Pluto', glyph: '♇', isLuminary: false, group: 'modern' },
  { id: SwePlanet.SE_CHIRON, name: 'Chiron', glyph: '⚷', isLuminary: false, group: 'chiron' },
  { id: SwePlanet.SE_MEAN_APOG, name: 'Lilith', glyph: '⚸', isLuminary: false, group: 'lilith' },
  { id: SwePlanet.SE_OSCU_APOG, name: 'True Lilith', glyph: '⚸', isLuminary: false, group: 'lilith' },
  { id: SwePlanet.SE_CERES, name: 'Ceres', glyph: '⚳', isLuminary: false, group: 'asteroids' },
  { id: SwePlanet.SE_PALLAS, name: 'Pallas', glyph: '⚴', isLuminary: false, group: 'asteroids' },
  { id: SwePlanet.SE_JUNO, name: 'Juno', glyph: '⚵', isLuminary: false, group: 'asteroids' },
  { id: SwePlanet.SE_VESTA, name: 'Vesta', glyph: '⚶', isLuminary: false, group: 'asteroids' },
  { id: SwePlanet.SE_HYGIEA, name: 'Hygiea', glyph: '⚚', isLuminary: false, group: 'asteroids' },
  { id: SwePlanet.SE_ASTRAEA, name: 'Astraea', glyph: '⚖', isLuminary: false, group: 'asteroids' },
  { id: SwePlanet.SE_ERIS, name: 'Eris', glyph: '⯰', isLuminary: false, group: 'tno' },
  { id: SwePlanet.SE_SEDNA, name: 'Sedna', glyph: '⯲', isLuminary: false, group: 'tno' },
  { id: SwePlanet.SE_CUPIDO, name: 'Cupido', glyph: '⯠', isLuminary: false, group: 'uranian' },
  { id: SwePlanet.SE_HADES, name: 'Hades', glyph: '⯡', isLuminary: false, group: 'uranian' },
  { id: SwePlanet.SE_ZEUS, name: 'Zeus', glyph: '⯢', isLuminary: false, group: 'uranian' },
  { id: SwePlanet.SE_KRONOS, name: 'Kronos', glyph: '⯣', isLuminary: false, group: 'uranian' },
  { id: SwePlanet.SE_APOLLON, name: 'Apollon', glyph: '⯤', isLuminary: false, group: 'uranian' },
  { id: SwePlanet.SE_ADMETOS, name: 'Admetos', glyph: '⯥', isLuminary: false, group: 'uranian' },
  { id: SwePlanet.SE_VULCANUS, name: 'Vulcanus', glyph: '⯦', isLuminary: false, group: 'uranian' },
  { id: SwePlanet.SE_POSEIDON, name: 'Poseidon', glyph: '⯧', isLuminary: false, group: 'uranian' },
  { id: SwePlanet.SE_TRUE_NODE, name: 'True Node', glyph: '☊', isLuminary: false, group: 'nodes' },
];

function formatPosition(degrees: number) {
  const signs = [
    { name: 'Aries', glyph: '♈' },
    { name: 'Taurus', glyph: '♉' },
    { name: 'Gemini', glyph: '♊' },
    { name: 'Cancer', glyph: '♋' },
    { name: 'Leo', glyph: '♌' },
    { name: 'Virgo', glyph: '♍' },
    { name: 'Libra', glyph: '♎' },
    { name: 'Scorpio', glyph: '♏' },
    { name: 'Sagittarius', glyph: '♐' },
    { name: 'Capricorn', glyph: '♑' },
    { name: 'Aquarius', glyph: '♒' },
    { name: 'Pisces', glyph: '♓' },
  ];
  const d = norm360(degrees);
  const signIndex = Math.floor(d / 30.0);
  const signDeg = d - signIndex * 30.0;
  const deg = Math.floor(signDeg);
  const min = Math.floor((signDeg - deg) * 60.0);
  const sec = Math.round(((signDeg - deg) * 60.0 - min) * 60.0);
  return {
    sign: signs[signIndex].name,
    signGlyph: signs[signIndex].glyph,
    deg,
    min,
    sec,
    formatted: `${deg.toString().padStart(2, '0')}° ${signs[signIndex].glyph} ${min.toString().padStart(2, '0')}'`,
    totalDegrees: d,
  };
}

function formatDeclination(dec: number): string {
  const sign = dec >= 0 ? 'N' : 'S';
  const absDec = Math.abs(dec);
  const deg = Math.floor(absDec);
  const min = Math.round((absDec - deg) * 60);
  return `${deg.toString().padStart(2, '0')}°${min.toString().padStart(2, '0')}' ${sign}`;
}

function formatRA(ra: number): string {
  const d = norm360(ra);
  const deg = Math.floor(d);
  const min = Math.round((d - deg) * 60);
  return `${deg.toString().padStart(3, '0')}°${min.toString().padStart(2, '0')}'`;
}

function getPlanetHouse(planetLon: number, cusps: number[]): number {
  const normLon = norm360(planetLon);
  for (let h = 1; h <= 12; h++) {
    const cCurrent = norm360(cusps[h]);
    const nextH = h === 12 ? 1 : h + 1;
    const cNext = norm360(cusps[nextH]);
    if (cCurrent < cNext) {
      if (normLon >= cCurrent && normLon < cNext) return h;
    } else {
      if (normLon >= cCurrent || normLon < cNext) return h;
    }
  }
  return 1;
}

function formatJdDateTime(jd_ut: number, tzOffsetHours: number): string {
  const localJd = jd_ut + tzOffsetHours / 24.0;
  const cal = jdToCalendar(localJd);
  const hh = Math.floor(cal.hour);
  const mm = Math.floor((cal.hour - hh) * 60);
  const ss = Math.round(((cal.hour - hh) * 60 - mm) * 60);
  const yStr = cal.year.toString().padStart(4, '0');
  const mStr = cal.month.toString().padStart(2, '0');
  const dStr = cal.day.toString().padStart(2, '0');
  const hStr = hh.toString().padStart(2, '0');
  const minStr = mm.toString().padStart(2, '0');
  const sStr = ss.toString().padStart(2, '0');
  return `${yStr}-${mStr}-${dStr} ${hStr}:${minStr}:${sStr} (UTC${tzOffsetHours >= 0 ? '+' : ''}${tzOffsetHours})`;
}

export async function createAstrologyServer(userDataDir?: string) {
  const app = express();
  const engine = new EphemerisEngine();
  await engine.init();

  const dbPath = userDataDir
    ? path.join(userDataDir, 'charts_database.json')
    : path.resolve('charts_database.json');
  const storage = new ChartStorage(dbPath);

  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.json({ limit: '4mb' }));
  app.use(express.static(publicDir));

  function computeHousesWithReference(
    jd_ut: number,
    lat: number,
    lon: number,
    hSys: HouseSystem,
    sunLon: number,
    moonLon: number
  ) {
    const refLon =
      hSys === HouseSystem.SolarSign
        ? sunLon
        : hSys === HouseSystem.MoonOnFirst
        ? moonLon
        : undefined;
    return engine.swe_houses(jd_ut, lat, lon, hSys, refLon);
  }

  function computePlanetarySet(
    jd_ut: number,
    flags: number,
    houses: any,
    enabledGroups: Set<BodyGroup>,
    useTrueNode: boolean = true
  ): {
    points: AstrologicalPoint[];
    details: any[];
    sunLon: number;
    moonLon: number;
    arabicParts: any[];
    isDiurnal: boolean;
  } {
    const points: AstrologicalPoint[] = [];
    const details: any[] = [];
    const ascendant = houses.ascmc.ascendant;
    const isHelio = (flags & SweFlag.SEFLG_HELCTR) !== 0;

    // Geocentric Sun & Moon for houses/lots/syzygy even when Helio flag is set
    const geoFlags = flags & ~SweFlag.SEFLG_HELCTR;
    const sunCoords = engine.swe_calc_ut(jd_ut, SwePlanet.SE_SUN, geoFlags);
    const moonCoords = engine.swe_calc_ut(jd_ut, SwePlanet.SE_MOON, geoFlags);
    const isDiurnal = engine.isDiurnalChart(sunCoords.longitude, ascendant);
    const eps = engine.trueObliquity(jd_ut);

    const coreLongitudes: Record<string, number> = {
      Sun: sunCoords.longitude,
      Moon: moonCoords.longitude,
    };

    for (const b of ALL_BODIES) {
      if (!enabledGroups.has(b.group)) continue;

      let bodyId = b.name === 'True Node' && !useTrueNode ? SwePlanet.SE_MEAN_NODE : b.id;
      let bodyName = b.name === 'True Node' && !useTrueNode ? 'Mean Node' : b.name;
      let glyph = b.glyph;

      if (isHelio) {
        if (b.id === SwePlanet.SE_SUN) {
          bodyId = SwePlanet.SE_EARTH;
          bodyName = 'Earth';
          glyph = '⊕';
        } else if (
          b.id === SwePlanet.SE_MOON ||
          b.group === 'nodes' ||
          b.group === 'lilith'
        ) {
          continue;
        }
      }

      try {
        const coords = engine.swe_calc_ut(jd_ut, bodyId, flags);
        const isRetrograde = coords.longitudeSpeed < 0;
        const pos = formatPosition(coords.longitude);
        const ra = coords.rightAscension ?? coords.longitude;
        const dec = coords.declination ?? 0;
        const oob = coords.isOutOfBounds ?? Math.abs(dec) > 23.439167;
        coreLongitudes[b.name] = coords.longitude;

        points.push({
          id: bodyId,
          name: bodyName,
          glyph,
          longitude: coords.longitude,
          longitudeSpeed: coords.longitudeSpeed,
          declination: dec,
          isLuminary: b.isLuminary,
        });

        details.push({
          name: bodyName,
          glyph,
          group: b.group,
          longitude: coords.longitude,
          latitude: coords.latitude,
          distance: coords.distance,
          speed: coords.longitudeSpeed,
          rightAscension: ra,
          raFormatted: formatRA(ra),
          declination: dec,
          decFormatted: formatDeclination(dec),
          isOutOfBounds: oob,
          isRetrograde,
          ...pos,
        });
      } catch {
        // Skip if ephemeris data unavailable
      }
    }

    // Add South Node if nodes group is enabled and not Heliocentric
    if (enabledGroups.has('nodes') && !isHelio) {
      const north = points.find(p => p.name === 'True Node' || p.name === 'Mean Node');
      const northDetail = details.find(d => d.name === 'True Node' || d.name === 'Mean Node');
      if (north) {
        const southLon = norm360(north.longitude + 180.0);
        const southDec = -(north.declination ?? 0);
        const southRa = norm360((northDetail?.rightAscension ?? north.longitude) + 180.0);
        points.push({
          id: 'south_node',
          name: 'South Node',
          glyph: '☋',
          longitude: southLon,
          longitudeSpeed: north.longitudeSpeed,
          declination: southDec,
          isLuminary: false,
        });
        details.push({
          name: 'South Node',
          glyph: '☋',
          group: 'nodes',
          longitude: southLon,
          latitude: -(northDetail?.latitude ?? 0),
          distance: northDetail?.distance ?? 0,
          speed: north.longitudeSpeed ?? 0,
          rightAscension: southRa,
          raFormatted: formatRA(southRa),
          declination: southDec,
          decFormatted: formatDeclination(southDec),
          isOutOfBounds: Math.abs(southDec) > 23.439167,
          isRetrograde: true,
          ...formatPosition(southLon),
        });
      }
    }

    // Add Vertices / Special Angles if enabled
    if (enabledGroups.has('vertices')) {
      const antiVertexLon = norm360(houses.ascmc.vertex + 180.0);
      const anglePoints = [
        { id: 'vertex', name: 'Vertex', glyph: 'Vx', lon: houses.ascmc.vertex },
        { id: 'antivertex', name: 'AntiVertex', glyph: 'AVx', lon: antiVertexLon },
        { id: 'east_point', name: 'East Point', glyph: 'EP', lon: houses.ascmc.equatorialAsc },
        { id: 'co_ascendant', name: 'Co-Ascendant', glyph: 'CoAsc', lon: houses.ascmc.coAscendant1 },
      ];
      for (const ap of anglePoints) {
        const eq = engine.eclipticToEquatorial(ap.lon, 0, eps);
        points.push({
          id: ap.id,
          name: ap.name,
          glyph: ap.glyph,
          longitude: ap.lon,
          longitudeSpeed: 0,
          declination: eq.declination,
          isLuminary: false,
        });
        details.push({
          name: ap.name,
          glyph: ap.glyph,
          group: 'vertices',
          longitude: ap.lon,
          latitude: 0,
          distance: 0,
          speed: 0,
          rightAscension: eq.rightAscension,
          raFormatted: formatRA(eq.rightAscension),
          declination: eq.declination,
          decFormatted: formatDeclination(eq.declination),
          isOutOfBounds: Math.abs(eq.declination) > 23.439167,
          isRetrograde: false,
          ...formatPosition(ap.lon),
        });
      }
    }

    const getTradLon = (pName: string, pId: SwePlanet) => {
      if (coreLongitudes[pName] !== undefined) return coreLongitudes[pName];
      return engine.swe_calc_ut(jd_ut, pId, geoFlags).longitude;
    };

    const rawArabicParts = engine.computeArabicParts({
      ascendant,
      descendant: houses.cusps[7] || norm360(ascendant + 180),
      sun: sunCoords.longitude,
      moon: moonCoords.longitude,
      mercury: getTradLon('Mercury', SwePlanet.SE_MERCURY),
      venus: getTradLon('Venus', SwePlanet.SE_VENUS),
      mars: getTradLon('Mars', SwePlanet.SE_MARS),
      jupiter: getTradLon('Jupiter', SwePlanet.SE_JUPITER),
      saturn: getTradLon('Saturn', SwePlanet.SE_SATURN),
      isDiurnal,
      obliquity: eps,
    });

    const arabicParts = rawArabicParts.map(lot => {
      const pos = formatPosition(lot.longitude);
      const degDig = evaluateDegreeDignities(lot.longitude, isDiurnal);
      return {
        ...lot,
        spanishName: lot.name,
        formula: isDiurnal ? lot.formulaDiurnal : lot.formulaNocturnal,
        ...pos,
        house: getPlanetHouse(lot.longitude, houses.cusps),
        ruler: degDig.domicileRuler,
        almuten: degDig.almutenOfDegree,
      };
    });

    if (enabledGroups.has('arabic')) {
      const pof = arabicParts[0];
      if (pof) {
        points.push({
          id: 'part_of_fortune',
          name: 'Part of Fortune',
          glyph: '⊗',
          longitude: pof.longitude,
          longitudeSpeed: 0,
          declination: pof.declination,
          isLuminary: false,
        });
        details.push({
          name: 'Part of Fortune',
          glyph: '⊗',
          group: 'arabic',
          longitude: pof.longitude,
          latitude: 0,
          distance: 0,
          speed: 0,
          rightAscension: pof.longitude,
          raFormatted: formatRA(pof.longitude),
          declination: pof.declination,
          decFormatted: formatDeclination(pof.declination),
          isOutOfBounds: Math.abs(pof.declination) > 23.439167,
          isRetrograde: false,
          ...formatPosition(pof.longitude),
        });
      }
    }

    return {
      points,
      details,
      sunLon: sunCoords.longitude,
      moonLon: moonCoords.longitude,
      arabicParts,
      isDiurnal,
    };
  }

  app.get('/api/defaults', (_req: Request, res: Response) => {
    res.json({
      success: true,
      aspects: STANDARD_ASPECTS,
      hasEphemerisFiles: engine.hasEphemerisFiles,
      fixedStarsCatalog: MAJOR_FIXED_STARS,
    });
  });

  app.post('/api/calculate', (req: Request, res: Response) => {
    try {
      const {
        name,
        date,
        time,
        latitude,
        longitude,
        timezoneOffset,
        houseSystem,
        zodiacMode,
        ayanamsha,
        coordMode = 'geocentric',
        isTopocentric,
        altitudeMeters,
        useTrueNode = true,
        chartType = 'natal',
        transitDate,
        transitTime,
        returnYear,
        harmonicNumber = 9,
        vargaDivision = 9,
        symbolicArcFactor = 1.0,
        solarArcInRA = false,
        triplicityScheme = 'dorotheus',
        termScheme = 'egyptian',
        useRelocated,
        relocLat,
        relocLon,
        relocTz,
        partnerName,
        partnerDate,
        partnerTime,
        partnerLat,
        partnerLon,
        partnerTz,
        enabledGroups,
        includeMinor = true,
        includeHarmonicAspects = false,
        customOrbs,
        theme = 'dark',
      } = req.body;

      const activeGroups: Set<BodyGroup> = new Set(
        Array.isArray(enabledGroups) && enabledGroups.length > 0
          ? enabledGroups
          : ['luminaries', 'traditional', 'modern', 'chiron', 'lilith', 'asteroids', 'nodes', 'arabic']
      );

      const [yearStr, monthStr, dayStr] = (date || '2000-01-01').split('-');
      const [hourStr, minStr] = (time || '12:00').split(':');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);
      const localHour = parseFloat(hourStr) + parseFloat(minStr || '0') / 60.0;
      const tz = timezoneOffset !== undefined ? parseFloat(timezoneOffset) : -3.0;
      const utcHour = localHour - tz;

      const lat = !isNaN(parseFloat(latitude)) ? parseFloat(latitude) : -34.6037;
      const lon = !isNaN(parseFloat(longitude)) ? parseFloat(longitude) : -58.3816;
      const alt = !isNaN(parseFloat(altitudeMeters)) ? parseFloat(altitudeMeters) : 0;

      const hSysRaw = String(houseSystem || 'P');
      const hSys = (hSysRaw === 'H' ? HouseSystem.Sripati : hSysRaw) as HouseSystem;
      const isSidereal = zodiacMode === ZodiacMode.Sidereal || chartType === 'varga';

      if (isSidereal) {
        const ayanId = ayanamsha !== undefined ? parseInt(ayanamsha, 10) : AyanamshaSystem.Lahiri;
        engine.swe_set_sid_mode(ayanId);
      }

      const effectiveTopo = coordMode === 'topocentric' || Boolean(isTopocentric);
      const effectiveHelio = coordMode === 'heliocentric';

      if (effectiveTopo) {
        engine.swe_set_topo(lon, lat, alt);
      }

      let calcFlags = SweFlag.SEFLG_SWIEPH | SweFlag.SEFLG_SPEED;
      if (isSidereal) calcFlags |= SweFlag.SEFLG_SIDEREAL;
      if (effectiveTopo) calcFlags |= SweFlag.SEFLG_TOPOCTR;
      if (effectiveHelio) calcFlags |= SweFlag.SEFLG_HELCTR;

      const orbs: OrbSettings | undefined = customOrbs;

      const natalJd = engine.swe_julday(year, month, day, utcHour, CalendarType.Gregorian);
      const prelimGeoFlags = calcFlags & ~SweFlag.SEFLG_HELCTR;
      const prelimSun = engine.swe_calc_ut(natalJd, SwePlanet.SE_SUN, prelimGeoFlags);
      const prelimMoon = engine.swe_calc_ut(natalJd, SwePlanet.SE_MOON, prelimGeoFlags);

      let houses = computeHousesWithReference(
        natalJd,
        lat,
        lon,
        hSys,
        prelimSun.longitude,
        prelimMoon.longitude
      );
      const natalSet = computePlanetarySet(natalJd, calcFlags, houses, activeGroups, useTrueNode);

      let primaryPoints: AstrologicalPoint[] = natalSet.points;
      let primaryDetails: any[] = natalSet.details;
      let outerPoints: AstrologicalPoint[] | undefined = undefined;
      let outerDetails: any[] | undefined = undefined;
      let thirdPoints: AstrologicalPoint[] | undefined = undefined;
      let thirdDetails: any[] | undefined = undefined;
      let secondaryHouses = houses;
      let crossAspects: any[] = [];
      let isBiWheel = false;
      let isTriWheel = false;
      let outerTitle = '';
      let thirdTitle = '';
      let activeJd = natalJd;
      let chartTitle = (name || 'Carta Natal').trim();
      const coordLabel = effectiveHelio ? 'Helio' : effectiveTopo ? 'Topo' : 'Geo';
      const zodLabel = isSidereal ? 'Sideral' : 'Tropical';
      let subtitle = `${date} ${time} (UTC${tz >= 0 ? '+' : ''}${tz})  •  Lat: ${lat.toFixed(2)}°, Lon: ${lon.toFixed(2)}° [${hSys} • ${zodLabel} • ${coordLabel}]`;
      let computedMeta: any = { mode: chartType, coordMode, zodiacMode: isSidereal ? 'sidereal' : 'tropical' };

      const [tY, tM, tD] = (transitDate || new Date().toISOString().slice(0, 10)).split('-');
      const [tH, tMin] = (transitTime || '12:00').split(':');
      const tUtHour = parseFloat(tH) + parseFloat(tMin || '0') / 60.0 - tz;
      const targetJd = engine.swe_julday(parseInt(tY, 10), parseInt(tM, 10), parseInt(tD, 10), tUtHour);
      const ageSolarYears = (targetJd - natalJd) / 365.242199;

      // =========================================================================
      // MODE 1: SOLAR RETURN
      // =========================================================================
      if (chartType === 'solar_return') {
        const targetYear = returnYear ? parseInt(returnYear, 10) : new Date().getFullYear();
        const rLat = useRelocated && !isNaN(parseFloat(relocLat)) ? parseFloat(relocLat) : lat;
        const rLon = useRelocated && !isNaN(parseFloat(relocLon)) ? parseFloat(relocLon) : lon;
        const rTz = useRelocated && !isNaN(parseFloat(relocTz)) ? parseFloat(relocTz) : tz;

        const srJd = engine.findSolarReturn(natalSet.sunLon, natalJd, targetYear, prelimGeoFlags);
        activeJd = srJd;
        const srSun = engine.swe_calc_ut(srJd, SwePlanet.SE_SUN, prelimGeoFlags);
        const srMoon = engine.swe_calc_ut(srJd, SwePlanet.SE_MOON, prelimGeoFlags);
        houses = computeHousesWithReference(srJd, rLat, rLon, hSys, srSun.longitude, srMoon.longitude);
        const srSet = computePlanetarySet(srJd, calcFlags, houses, activeGroups, useTrueNode);

        primaryPoints = srSet.points;
        primaryDetails = srSet.details;
        const exactDateStr = formatJdDateTime(srJd, rTz);
        chartTitle = `Revolución Solar ${targetYear} — ${name || 'Nativo'}`;
        subtitle = `Retorno Exacto: ${exactDateStr}  •  Lat: ${rLat.toFixed(2)}°, Lon: ${rLon.toFixed(2)}° [${hSys}]`;
        computedMeta = {
          mode: 'solar_return',
          exactReturnDate: exactDateStr,
          julianDay: srJd,
          relocated: Boolean(useRelocated),
        };
      }

      // =========================================================================
      // MODE 2: LUNAR RETURN
      // =========================================================================
      else if (chartType === 'lunar_return') {
        const startJd = engine.swe_julday(parseInt(tY, 10), parseInt(tM, 10), parseInt(tD, 10), 0);
        const rLat = useRelocated && !isNaN(parseFloat(relocLat)) ? parseFloat(relocLat) : lat;
        const rLon = useRelocated && !isNaN(parseFloat(relocLon)) ? parseFloat(relocLon) : lon;
        const rTz = useRelocated && !isNaN(parseFloat(relocTz)) ? parseFloat(relocTz) : tz;

        const lrJd = engine.findLunarReturn(natalSet.moonLon, startJd, prelimGeoFlags);
        activeJd = lrJd;
        const lrSun = engine.swe_calc_ut(lrJd, SwePlanet.SE_SUN, prelimGeoFlags);
        const lrMoon = engine.swe_calc_ut(lrJd, SwePlanet.SE_MOON, prelimGeoFlags);
        houses = computeHousesWithReference(lrJd, rLat, rLon, hSys, lrSun.longitude, lrMoon.longitude);
        const lrSet = computePlanetarySet(lrJd, calcFlags, houses, activeGroups, useTrueNode);

        primaryPoints = lrSet.points;
        primaryDetails = lrSet.details;
        const exactDateStr = formatJdDateTime(lrJd, rTz);
        chartTitle = `Revolución Lunar — ${name || 'Nativo'}`;
        subtitle = `Retorno Lunar Exacto: ${exactDateStr}  •  Lat: ${rLat.toFixed(2)}°, Lon: ${rLon.toFixed(2)}° [${hSys}]`;
        computedMeta = {
          mode: 'lunar_return',
          exactReturnDate: exactDateStr,
          julianDay: lrJd,
        };
      }

      // =========================================================================
      // MODE 3: COMPOSITE CHART
      // =========================================================================
      else if (chartType === 'composite') {
        const [pY, pM, pD] = (partnerDate || '2000-06-15').split('-');
        const [pH, pMin] = (partnerTime || '12:00').split(':');
        const pTz = partnerTz !== undefined ? parseFloat(partnerTz) : tz;
        const pLat = !isNaN(parseFloat(partnerLat)) ? parseFloat(partnerLat) : lat;
        const pLon = !isNaN(parseFloat(partnerLon)) ? parseFloat(partnerLon) : lon;
        const pUtHour = parseFloat(pH) + parseFloat(pMin || '0') / 60.0 - pTz;

        const partnerJd = engine.swe_julday(parseInt(pY, 10), parseInt(pM, 10), parseInt(pD, 10), pUtHour);
        const pSun = engine.swe_calc_ut(partnerJd, SwePlanet.SE_SUN, prelimGeoFlags);
        const pMoon = engine.swe_calc_ut(partnerJd, SwePlanet.SE_MOON, prelimGeoFlags);
        const partnerHouses = computeHousesWithReference(partnerJd, pLat, pLon, hSys, pSun.longitude, pMoon.longitude);
        const partnerSet = computePlanetarySet(partnerJd, calcFlags, partnerHouses, activeGroups, useTrueNode);
        secondaryHouses = partnerHouses;

        const midArmc = shortArcMidpoint(houses.ascmc.armc, partnerHouses.ascmc.armc);
        const midLat = (lat + pLat) / 2.0;
        const eps = engine.trueObliquity((natalJd + partnerJd) / 2.0);
        houses = engine.swe_houses_armc(midArmc, midLat, eps, hSys);

        const compPoints: AstrologicalPoint[] = [];
        const compDetails: any[] = [];

        for (const p1 of natalSet.points) {
          const p2 = partnerSet.points.find(x => x.name === p1.name);
          if (!p2) continue;
          const midLon = shortArcMidpoint(p1.longitude, p2.longitude);
          const midSpeed = ((p1.longitudeSpeed ?? 0) + (p2.longitudeSpeed ?? 0)) / 2.0;
          const midDec = ((p1.declination ?? 0) + (p2.declination ?? 0)) / 2.0;
          const d1 = natalSet.details.find(d => d.name === p1.name);
          const d2 = partnerSet.details.find(d => d.name === p2.name);
          const midRa = shortArcMidpoint(d1?.rightAscension ?? p1.longitude, d2?.rightAscension ?? p2.longitude);

          compPoints.push({
            id: p1.id,
            name: p1.name,
            glyph: p1.glyph,
            longitude: midLon,
            longitudeSpeed: midSpeed,
            declination: midDec,
            isLuminary: p1.isLuminary,
          });
          compDetails.push({
            name: p1.name,
            glyph: d1?.glyph || '•',
            group: d1?.group || 'traditional',
            longitude: midLon,
            latitude: 0,
            distance: d1?.distance ?? 1,
            speed: midSpeed,
            rightAscension: midRa,
            raFormatted: formatRA(midRa),
            declination: midDec,
            decFormatted: formatDeclination(midDec),
            isOutOfBounds: Math.abs(midDec) > 23.439167,
            isRetrograde: midSpeed < 0,
            ...formatPosition(midLon),
          });
        }

        primaryPoints = compPoints;
        primaryDetails = compDetails;
        outerPoints = partnerSet.points;
        outerDetails = partnerSet.details;
        outerTitle = partnerName || 'Persona 2';
        chartTitle = `Carta Compuesta (Midpoints): ${name || 'Persona 1'} & ${partnerName || 'Persona 2'}`;
        subtitle = `Puntos Medios Eclípticos • Lat ref: ${midLat.toFixed(2)}° [${hSys}]`;
      }

      // =========================================================================
      // MODE 4: DAVISON RELATIONSHIP CHART
      // =========================================================================
      else if (chartType === 'davison') {
        const [pY, pM, pD] = (partnerDate || '2000-06-15').split('-');
        const [pH, pMin] = (partnerTime || '12:00').split(':');
        const pTz = partnerTz !== undefined ? parseFloat(partnerTz) : tz;
        const pLat = !isNaN(parseFloat(partnerLat)) ? parseFloat(partnerLat) : lat;
        const pLon = !isNaN(parseFloat(partnerLon)) ? parseFloat(partnerLon) : lon;
        const pUtHour = parseFloat(pH) + parseFloat(pMin || '0') / 60.0 - pTz;

        const partnerJd = engine.swe_julday(parseInt(pY, 10), parseInt(pM, 10), parseInt(pD, 10), pUtHour);
        const davisonJd = (natalJd + partnerJd) / 2.0;
        activeJd = davisonJd;
        const davisonLat = (lat + pLat) / 2.0;
        const davisonLon = shortArcMidpoint(lon + 180, pLon + 180) - 180;

        const dSun = engine.swe_calc_ut(davisonJd, SwePlanet.SE_SUN, prelimGeoFlags);
        const dMoon = engine.swe_calc_ut(davisonJd, SwePlanet.SE_MOON, prelimGeoFlags);
        houses = computeHousesWithReference(davisonJd, davisonLat, davisonLon, hSys, dSun.longitude, dMoon.longitude);
        const davSet = computePlanetarySet(davisonJd, calcFlags, houses, activeGroups, useTrueNode);

        primaryPoints = davSet.points;
        primaryDetails = davSet.details;
        const exactDateStr = formatJdDateTime(davisonJd, 0);
        chartTitle = `Carta Davison (Espacio-Tiempo): ${name || 'Persona 1'} & ${partnerName || 'Persona 2'}`;
        subtitle = `Época Media: ${exactDateStr} • Lat: ${davisonLat.toFixed(2)}°, Lon: ${davisonLon.toFixed(2)}° [${hSys}]`;
        computedMeta = {
          mode: 'davison',
          exactReturnDate: exactDateStr,
          davisonLat,
          davisonLon,
        };
      }

      // =========================================================================
      // MODE 5: HARMONIC CHART (H1..H360)
      // =========================================================================
      else if (chartType === 'harmonic') {
        const hNum = Math.max(1, Math.min(360, parseInt(String(harmonicNumber), 10) || 9));
        isBiWheel = true;
        outerTitle = `Armónica H${hNum}`;
        outerPoints = primaryPoints.map(p => ({
          ...p,
          longitude: norm360(p.longitude * hNum),
        }));
        outerDetails = primaryDetails.map(d => {
          const hLon = norm360(d.longitude * hNum);
          return {
            ...d,
            longitude: hLon,
            ...formatPosition(hLon),
          };
        });
        crossAspects = detectBiWheelAspects(primaryPoints, outerPoints, includeMinor, orbs, includeHarmonicAspects);
        chartTitle = `${name || 'Carta Natal'} — Carta Armónica H${hNum}`;
        subtitle = `Multiplicador Armónico: ×${hNum} (Subdivisión de ${(360 / hNum).toFixed(2)}°)  •  ${date} ${time}`;
        computedMeta = { mode: 'harmonic', harmonicNumber: hNum };
      }

      // =========================================================================
      // MODE 6: ANTISCIA & CONTRA-ANTISCIA
      // =========================================================================
      else if (chartType === 'antiscia' || chartType === 'contra_antiscia') {
        const isContra = chartType === 'contra_antiscia';
        isBiWheel = true;
        outerTitle = isContra ? 'Contra-Antiscia' : 'Antiscia';
        const transformLon = (lonVal: number) =>
          isContra ? norm360(360.0 - lonVal) : norm360(180.0 - lonVal);

        outerPoints = primaryPoints.map(p => ({
          ...p,
          longitude: transformLon(p.longitude),
          declination: isContra ? -(p.declination ?? 0) : p.declination,
        }));
        outerDetails = primaryDetails.map(d => {
          const aLon = transformLon(d.longitude);
          return {
            ...d,
            longitude: aLon,
            ...formatPosition(aLon),
          };
        });
        crossAspects = detectBiWheelAspects(primaryPoints, outerPoints, includeMinor, orbs, includeHarmonicAspects);
        chartTitle = `${name || 'Carta Natal'} + ${outerTitle}`;
        subtitle = isContra
          ? `Reflejo sobre el Eje Equinoccial (0° Aries / 0° Libra)`
          : `Reflejo sobre el Eje Solsticial (0° Cáncer / 0° Capricornio)`;
        computedMeta = { mode: chartType };
      }

      // =========================================================================
      // MODE 7: VEDIC DIVISIONAL VARGA (D2, D3, D7, D9, D10, D12, D60)
      // =========================================================================
      else if (chartType === 'varga') {
        const vDiv = [2, 3, 7, 9, 10, 12, 60].includes(Number(vargaDivision))
          ? Number(vargaDivision)
          : 9;
        const vCode = `D${vDiv}` as VargaCode;
        const vargaNames: Record<number, string> = {
          2: 'D2 Hora (Riqueza)',
          3: 'D3 Drekkana (Hermanos/Valor)',
          7: 'D7 Saptamsha (Progenie/Creatividad)',
          9: 'D9 Navamsha (Dharma/Matrimonio)',
          10: 'D10 Dashamsha (Profesión/Karma)',
          12: 'D12 Dwadashamsha (Linaje/Padres)',
          60: 'D60 Shashtiamsha (Karma Pasado)',
        };
        isBiWheel = true;
        outerTitle = vCode;
        outerPoints = primaryPoints.map(p => ({
          ...p,
          longitude: computeVargaLongitude(p.longitude, vCode),
        }));
        outerDetails = primaryDetails.map(d => {
          const vLon = computeVargaLongitude(d.longitude, vCode);
          return {
            ...d,
            longitude: vLon,
            ...formatPosition(vLon),
          };
        });
        const vargaAsc = computeVargaLongitude(houses.ascmc.ascendant, vCode);
        secondaryHouses = engine.swe_houses(natalJd, lat, lon, HouseSystem.WholeSigns);
        secondaryHouses.ascmc.ascendant = vargaAsc;
        const firstSignStart = Math.floor(vargaAsc / 30.0) * 30.0;
        for (let i = 1; i <= 12; i++) {
          secondaryHouses.cusps[i] = norm360(firstSignStart + (i - 1) * 30.0);
        }

        crossAspects = detectBiWheelAspects(primaryPoints, outerPoints, includeMinor, orbs, includeHarmonicAspects);
        chartTitle = `${name || 'Carta Natal'} — Carta Divisional Védica ${vargaNames[vDiv] || vCode}`;
        subtitle = `Rashi D1 (Interior) vs. ${vargaNames[vDiv] || vCode} (Exterior) • Sideral`;
        computedMeta = { mode: 'varga', vargaDivision: vDiv, vargaLabel: vargaNames[vDiv] };
      }

      // =========================================================================
      // MODE 8: TRI-WHEEL (Natal + Progresiones Secundarias + Tránsitos)
      // =========================================================================
      else if (chartType === 'tri_wheel') {
        isBiWheel = true;
        isTriWheel = true;
        outerTitle = 'Progresión';
        thirdTitle = 'Tránsito';

        const progJd = natalJd + ageSolarYears;
        const progSet = computePlanetarySet(progJd, calcFlags, houses, activeGroups, useTrueNode);
        outerPoints = progSet.points;
        outerDetails = progSet.details;

        const trSet = computePlanetarySet(targetJd, calcFlags, houses, activeGroups, useTrueNode);
        thirdPoints = trSet.points;
        thirdDetails = trSet.details;

        crossAspects = detectBiWheelAspects(primaryPoints, thirdPoints, includeMinor, orbs, includeHarmonicAspects);
        chartTitle = `Tri-Rueda: ${name || 'Natal'} + Progresiones + Tránsitos (${transitDate})`;
        subtitle = `Anillo 1: Natal • Anillo 2: Progresión Secundaria (${ageSolarYears.toFixed(1)}a) • Anillo 3: Tránsitos (${transitDate} ${transitTime})`;
        computedMeta = { mode: 'tri_wheel', ageYears: ageSolarYears };
      }

      // =========================================================================
      // MODE 9: BI-WHEEL PREDICTIVE & RELATIONAL MODES
      // =========================================================================
      else if (chartType === 'transits') {
        isBiWheel = true;
        outerTitle = 'Tránsito';
        const trSun = engine.swe_calc_ut(targetJd, SwePlanet.SE_SUN, prelimGeoFlags);
        const trMoon = engine.swe_calc_ut(targetJd, SwePlanet.SE_MOON, prelimGeoFlags);
        secondaryHouses = computeHousesWithReference(targetJd, lat, lon, hSys, trSun.longitude, trMoon.longitude);
        const trSet = computePlanetarySet(targetJd, calcFlags, secondaryHouses, activeGroups, useTrueNode);
        outerPoints = trSet.points;
        outerDetails = trSet.details;
        crossAspects = detectBiWheelAspects(primaryPoints, outerPoints, includeMinor, orbs, includeHarmonicAspects);
        chartTitle = `${name || 'Carta Natal'} + Tránsitos (${transitDate} ${transitTime})`;
      } else if (
        chartType === 'secondary_progressions' ||
        chartType === 'tertiary_progressions' ||
        chartType === 'minor_progressions'
      ) {
        isBiWheel = true;
        let progJd = natalJd + ageSolarYears;
        let modeLabel = 'Progresiones Secundarias (1d = 1a)';

        if (chartType === 'tertiary_progressions') {
          progJd = natalJd + ageSolarYears * 13.368267;
          modeLabel = 'Progresiones Terciarias (1d = 1 mes lunar)';
          outerTitle = 'Prog. Terciaria';
        } else if (chartType === 'minor_progressions') {
          progJd = natalJd + ageSolarYears * 27.321582;
          modeLabel = 'Progresiones Menores (1 mes lunar = 1a)';
          outerTitle = 'Prog. Menor';
        } else {
          outerTitle = 'Prog. Secundaria';
        }

        const sunProg = engine.swe_calc_ut(progJd, SwePlanet.SE_SUN, prelimGeoFlags);
        const moonProg = engine.swe_calc_ut(progJd, SwePlanet.SE_MOON, prelimGeoFlags);
        const solarArcLon = norm360(sunProg.longitude - natalSet.sunLon);
        const progArmc = norm360(houses.ascmc.armc + solarArcLon);
        const eps = engine.trueObliquity(progJd);
        secondaryHouses = engine.swe_houses_armc(progArmc, lat, eps, hSys);
        if (hSys === HouseSystem.SolarSign || hSys === HouseSystem.MoonOnFirst || hSys === HouseSystem.AriesZero) {
          secondaryHouses = computeHousesWithReference(progJd, lat, lon, hSys, sunProg.longitude, moonProg.longitude);
        }

        const progSet = computePlanetarySet(progJd, calcFlags, secondaryHouses, activeGroups, useTrueNode);
        outerPoints = progSet.points;
        outerDetails = progSet.details;
        crossAspects = detectBiWheelAspects(primaryPoints, outerPoints, includeMinor, orbs, includeHarmonicAspects);
        chartTitle = `${name || 'Carta Natal'} + ${modeLabel} (${transitDate})`;
        computedMeta = {
          mode: chartType,
          ageYears: ageSolarYears,
          progressedJd: progJd,
          progressedDateUTC: formatJdDateTime(progJd, 0),
        };
      } else if (
        chartType === 'solar_arc' ||
        chartType === 'naibod_arc' ||
        chartType === 'symbolic_directions' ||
        chartType === 'profections'
      ) {
        isBiWheel = true;
        let arcDegrees = 0;

        if (chartType === 'solar_arc') {
          const progJd = natalJd + ageSolarYears;
          if (solarArcInRA) {
            const sunNatalEq = engine.swe_calc_ut(natalJd, SwePlanet.SE_SUN, prelimGeoFlags);
            const sunProgEq = engine.swe_calc_ut(progJd, SwePlanet.SE_SUN, prelimGeoFlags);
            arcDegrees = norm360((sunProgEq.rightAscension ?? sunProgEq.longitude) - (sunNatalEq.rightAscension ?? sunNatalEq.longitude));
            outerTitle = 'Arco Solar (AR)';
          } else {
            const sunProg = engine.swe_calc_ut(progJd, SwePlanet.SE_SUN, prelimGeoFlags);
            arcDegrees = norm360(sunProg.longitude - natalSet.sunLon);
            outerTitle = 'Arco Solar';
          }
        } else if (chartType === 'naibod_arc') {
          arcDegrees = norm360(ageSolarYears * 0.98564733);
          outerTitle = 'Arco Naibod';
        } else if (chartType === 'symbolic_directions') {
          const factor = !isNaN(parseFloat(String(symbolicArcFactor))) ? parseFloat(String(symbolicArcFactor)) : 1.0;
          arcDegrees = norm360(ageSolarYears * factor);
          outerTitle = `Dir. Simbólica (${factor}°/a)`;
        } else if (chartType === 'profections') {
          arcDegrees = norm360(Math.floor(Math.max(0, ageSolarYears)) * 30.0);
          outerTitle = `Profección (${Math.floor(Math.max(0, ageSolarYears))}a)`;
        }

        outerPoints = primaryPoints.map(p => ({
          ...p,
          longitude: norm360(p.longitude + arcDegrees),
        }));
        outerDetails = primaryDetails.map(d => {
          const newLon = norm360(d.longitude + arcDegrees);
          return {
            ...d,
            longitude: newLon,
            ...formatPosition(newLon),
          };
        });
        crossAspects = detectBiWheelAspects(primaryPoints, outerPoints, includeMinor, orbs, includeHarmonicAspects);
        chartTitle = `${name || 'Carta Natal'} + ${outerTitle} (+${arcDegrees.toFixed(2)}°)`;
        computedMeta = { mode: chartType, arcDegrees, ageYears: ageSolarYears };
      } else if (chartType === 'synastry') {
        isBiWheel = true;
        outerTitle = partnerName || 'Persona 2';
        const [pY, pM, pD] = (partnerDate || '2000-06-15').split('-');
        const [pH, pMin] = (partnerTime || '12:00').split(':');
        const pTz = partnerTz !== undefined ? parseFloat(partnerTz) : tz;
        const pLat = !isNaN(parseFloat(partnerLat)) ? parseFloat(partnerLat) : lat;
        const pLon = !isNaN(parseFloat(partnerLon)) ? parseFloat(partnerLon) : lon;
        const pUtHour = parseFloat(pH) + parseFloat(pMin || '0') / 60.0 - pTz;
        const partnerJd = engine.swe_julday(parseInt(pY, 10), parseInt(pM, 10), parseInt(pD, 10), pUtHour);

        const pSun = engine.swe_calc_ut(partnerJd, SwePlanet.SE_SUN, prelimGeoFlags);
        const pMoon = engine.swe_calc_ut(partnerJd, SwePlanet.SE_MOON, prelimGeoFlags);
        secondaryHouses = computeHousesWithReference(partnerJd, pLat, pLon, hSys, pSun.longitude, pMoon.longitude);
        const partnerSet = computePlanetarySet(partnerJd, calcFlags, secondaryHouses, activeGroups, useTrueNode);
        outerPoints = partnerSet.points;
        outerDetails = partnerSet.details;
        crossAspects = detectBiWheelAspects(primaryPoints, outerPoints, includeMinor, orbs, includeHarmonicAspects);
        chartTitle = `Sinastría: ${name || 'Persona 1'} & ${partnerName || 'Persona 2'}`;
      }

      // Assign houses to primary, outer & third details
      primaryDetails.forEach(p => {
        p.house = getPlanetHouse(p.longitude, houses.cusps);
      });
      if (outerDetails) {
        outerDetails.forEach(p => {
          p.house = getPlanetHouse(p.longitude, houses.cusps);
        });
      }
      if (thirdDetails) {
        thirdDetails.forEach(p => {
          p.house = getPlanetHouse(p.longitude, houses.cusps);
        });
      }

      // Aspects, Patterns & Declination Parallels
      const primaryAspects = detectMajorAspects(primaryPoints, includeMinor, orbs, includeHarmonicAspects);
      const patterns = detectAspectPatterns(primaryPoints, primaryAspects);
      const rawDeclAspects = detectDeclinationAspects(primaryPoints, 1.0);
      const declinationAspects = rawDeclAspects.map(da => ({
        point1: { name: da.point1, glyph: da.glyph1 },
        point2: { name: da.point2, glyph: da.glyph2 },
        type: da.type === 'Paralelo' ? 'Parallel' : 'ContraParallel',
        glyph: da.glyph,
        declination1: da.dec1,
        declination2: da.dec2,
        orb: da.orb,
      }));

      // Midpoint Trees (360°, 90°, 45° dials)
      const allMidpoints = calculateMidpointStructures(primaryPoints, formatPosition, 1.5);
      const mapMid = (m: any) => ({
        pair1: m.p1,
        pair2: m.p2,
        focalPoint: `${m.contactGlyph} ${m.contactPlanet}`,
        midpointLongitude: m.midpointLon,
        midpointFormatted: m.midpointFormatted,
        orb: m.orb,
      });
      const midpoints360 = allMidpoints.filter(m => m.dial === 'Directo (360°)').map(mapMid);
      const midpoints90 = allMidpoints.filter(m => m.dial === 'Dial 90° (4H)').map(mapMid);
      const midpoints45 = allMidpoints.filter(m => m.dial === 'Dial 45° (8H)').map(mapMid);

      // Fixed Stars Catalog & Active Conjunctions (orb <= 1.5°)
      const fixedStars: any[] = [];
      const starConjunctions: any[] = [];
      const chartTargets = [
        ...primaryDetails.map(d => ({ name: d.name, glyph: d.glyph, longitude: d.longitude })),
        { name: 'Ascendant', glyph: 'Asc', longitude: houses.ascmc.ascendant },
        { name: 'Midheaven', glyph: 'MC', longitude: houses.ascmc.mc },
      ];

      for (const starSpec of MAJOR_FIXED_STARS) {
        const st = engine.calcFixedStar(starSpec.queryName, activeJd, prelimGeoFlags);
        if (!st) continue;
        const pos = formatPosition(st.longitude);
        fixedStars.push({
          name: starSpec.displayName,
          constellation: starSpec.constellation,
          magnitude: starSpec.magnitude,
          nature: starSpec.nature,
          longitude: st.longitude,
          latitude: st.latitude,
          declination: st.declination,
          decFormatted: formatDeclination(st.declination),
          house: getPlanetHouse(st.longitude, houses.cusps),
          ...pos,
        });

        for (const target of chartTargets) {
          let diff = Math.abs(norm360(st.longitude) - norm360(target.longitude));
          if (diff > 180) diff = 360 - diff;
          if (diff <= 1.5) {
            starConjunctions.push({
              starName: starSpec.displayName,
              constellation: starSpec.constellation,
              magnitude: starSpec.magnitude,
              nature: starSpec.nature,
              starFormatted: pos.formatted,
              targetName: target.name,
              targetGlyph: target.glyph,
              orb: Number(diff.toFixed(2)),
            });
          }
        }
      }
      starConjunctions.sort((a, b) => a.orb - b.orb);

      // Prenatal Syzygy, Dignities & Almuten Figuris
      const syzygy = engine.findPrenatalSyzygy(activeJd, prelimGeoFlags);
      const syzygyPos = formatPosition(syzygy.longitude);
      const isDiurnal = engine.isDiurnalChart(natalSet.sunLon, houses.ascmc.ascendant);
      const tScheme = ((triplicityScheme as TriplicitySystem) || 'dorotheus');
      const bScheme = ((termScheme as TermSystem) || 'egyptian');

      const dignityResult = computeChartDignitiesAndAlmuten({
        planets: primaryDetails.map(d => ({
          name: d.name,
          glyph: d.glyph,
          longitude: d.longitude,
          formatted: d.formatted,
          house: d.house,
          isRetrograde: d.isRetrograde,
        })),
        ascendant: houses.ascmc.ascendant,
        mc: houses.ascmc.mc,
        partOfFortune: natalSet.arabicParts[0]?.longitude ?? houses.ascmc.ascendant,
        syzygyLon: syzygy.longitude,
        isDiurnal,
        triplicitySystem: tScheme,
        termSystem: bScheme,
      });

      const formattedDignities = dignityResult.rows.map(r => {
        const pDet = primaryDetails.find(d => d.name === r.name);
        const bd = evaluateDegreeDignities(pDet?.longitude ?? 0, isDiurnal, tScheme, bScheme);
        return {
          planet: r.name,
          glyph: r.glyph,
          house: r.house,
          essential: {
            domicileRuler: bd.domicileRuler,
            exaltationRuler: bd.exaltationRuler,
            triplicityRulers: {
              day: bd.triplicityDay,
              night: bd.triplicityNight,
              participating: bd.triplicityRuler,
            },
            termRuler: bd.termRuler,
            faceRuler: bd.faceRuler,
            isDomicile: bd.domicileRuler === r.name,
            isExaltation: bd.exaltationRuler === r.name,
            isDetriment: bd.detrimentPlanet === r.name,
            isFall: bd.fallPlanet === r.name,
            isPeregrine: r.isPeregrine,
          },
          essentialScore: r.essentialScore,
          accidentalScore: r.accidentalScore,
          totalScore: r.totalScore,
        };
      });

      const dayRulers = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
      const birthDateObj = new Date(`${date || '2000-01-01'}T${time || '12:00'}:00`);
      const dayIdx = isNaN(birthDateObj.getDay()) ? 0 : birthDateObj.getDay();
      const dayRuler = dayRulers[dayIdx];
      const chaldeanSeq = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];
      const startChaldean = chaldeanSeq.indexOf(dayRuler);
      const hourOffset = Math.floor(Math.max(0, localHour - 6));
      const hourRuler = chaldeanSeq[(startChaldean + hourOffset + 70) % 7];

      const almutenRows = TRADITIONAL_PLANETS.map(pName => {
        const sc = dignityResult.almuten.totalScores[pName];
        const dhScore = (pName === dayRuler ? 7 : 0) + (pName === hourRuler ? 6 : 0);
        return {
          planet: pName,
          glyph: PLANET_GLYPHS[pName],
          essentialShares: sc.essential,
          accidentalHouseScore: sc.house,
          dayHourScore: dhScore,
          totalAlmutenScore: sc.total + dhScore,
        };
      }).sort((a, b) => b.totalAlmutenScore - a.totalAlmutenScore);

      const cuspDignities = houses.cusps.slice(1).map((cLon, idx) => {
        const bd = evaluateDegreeDignities(cLon, isDiurnal, tScheme, bScheme);
        return {
          house: idx + 1,
          domicileRuler: bd.domicileRuler,
          almuten: bd.almutenOfDegree,
        };
      });

      // Elemental Balance, Firdaria & Annual Profections
      const rawBalance = computeElementalBalance({
        planets: primaryDetails.map(d => ({ name: d.name, glyph: d.glyph, longitude: d.longitude })),
        ascendant: houses.ascmc.ascendant,
        mc: houses.ascmc.mc,
      });

      const elementalBalance = {
        elements: {
          Fire: { pct: rawBalance.elements.Fuego.percentage, count: rawBalance.elements.Fuego.count },
          Earth: { pct: rawBalance.elements.Tierra.percentage, count: rawBalance.elements.Tierra.count },
          Air: { pct: rawBalance.elements.Aire.percentage, count: rawBalance.elements.Aire.count },
          Water: { pct: rawBalance.elements.Agua.percentage, count: rawBalance.elements.Agua.count },
        },
        modalities: {
          Cardinal: { pct: rawBalance.modalities.Cardinal.percentage },
          Fixed: { pct: rawBalance.modalities.Fijo.percentage },
          Mutable: { pct: rawBalance.modalities.Mutable.percentage },
        },
        polarities: {
          Yang: { pct: rawBalance.polarities['Masculino (Yang)'].percentage },
          Yin: { pct: rawBalance.polarities['Femenino (Yin)'].percentage },
        },
        temperament: {
          dominant: rawBalance.temperament,
        },
      };

      const rawFirdaria = computeFirdariaPeriods(natalJd, isDiurnal, targetJd);
      const firdaria = rawFirdaria.map(f => ({
        ruler: f.ruler,
        glyph: f.glyph,
        startAge: f.startAge,
        endAge: f.endAge,
        startYear: year + f.startAge,
        endYear: year + f.endAge,
        isCurrent: f.isCurrent,
        subPeriods: f.subPeriods.map(sp => ({
          subRuler: sp.ruler,
          startYear: year + sp.startAge,
          isCurrent: sp.isCurrent,
        })),
      }));

      const rawProfection = computeAnnualProfection(
        houses.ascmc.ascendant,
        houses.cusps,
        Math.max(0, ageSolarYears),
        year + Math.floor(Math.max(0, ageSolarYears))
      );
      const lordDetail = primaryDetails.find(d => d.name === rawProfection.timeLordTraditional);
      const profection = {
        age: rawProfection.age,
        profectedYear: rawProfection.targetYear,
        activatedHouse: rawProfection.activatedHouse,
        activatedSign: rawProfection.signName,
        signGlyph: rawProfection.signGlyph,
        timeLord: rawProfection.timeLordTraditional,
        timeLordGlyph: rawProfection.timeLordGlyph,
        lordInNatalHouse: lordDetail?.house ?? 1,
        continuousDegreeOffset: norm360(Math.max(0, ageSolarYears) * 30.0),
      };

      // Nakshatras & Vedic Divisional Vargas Summary Table
      const nakshatras = primaryDetails.map(d => {
        const nak = calculateNakshatra(d.longitude);
        return {
          planet: d.name,
          glyph: d.glyph,
          formatted: d.formatted,
          nakshatraName: nak.name,
          pada: nak.pada,
          ruler: nak.ruler,
          deity: nak.deity,
          d1: formatPosition(d.longitude).signGlyph,
          d2: formatPosition(computeVargaLongitude(d.longitude, 'D2')).signGlyph,
          d3: formatPosition(computeVargaLongitude(d.longitude, 'D3')).signGlyph,
          d7: formatPosition(computeVargaLongitude(d.longitude, 'D7')).signGlyph,
          d9: formatPosition(computeVargaLongitude(d.longitude, 'D9')).signGlyph,
          d9Formatted: formatPosition(computeVargaLongitude(d.longitude, 'D9')).formatted,
          d10: formatPosition(computeVargaLongitude(d.longitude, 'D10')).signGlyph,
          d12: formatPosition(computeVargaLongitude(d.longitude, 'D12')).signGlyph,
          d60: formatPosition(computeVargaLongitude(d.longitude, 'D60')).signGlyph,
        };
      });

      const themeOpt = theme === 'light' ? 'light' : 'dark';

      // Main Wheel SVG
      const chartRenderData: RenderableChartData = {
        title: chartTitle,
        subtitle,
        ascendant: houses.ascmc.ascendant,
        houses,
        planets: primaryPoints,
        aspects: isBiWheel && crossAspects.length > 0 ? crossAspects : primaryAspects,
        outerPlanets: outerPoints,
        outerTitle,
        thirdPlanets: thirdPoints,
        thirdTitle,
      };

      const svg = renderChartSVG(chartRenderData, {
        width: 940,
        height: 940,
        isBiWheel,
        isTriWheel,
        theme: themeOpt,
      });

      // Secondary Standalone Wheel SVG (for Dual Wheels side-by-side layout)
      let secondaryPointsForWheel = outerPoints;
      let secondaryTitleForWheel = outerTitle
        ? `${outerTitle} — ${name || 'Carta'}`
        : `D9 Navamsha — ${name || 'Carta'}`;
      let secondarySubForWheel = subtitle;

      if (!secondaryPointsForWheel || secondaryPointsForWheel.length === 0) {
        secondaryPointsForWheel = primaryPoints.map(p => ({
          ...p,
          longitude: computeVargaLongitude(p.longitude, 'D9'),
        }));
        secondaryTitleForWheel = `D9 Navamsha — ${name || 'Carta Natal'}`;
        secondarySubForWheel = `Carta Divisional Armónica 9 (Navamsha)`;
      }

      const secondaryAspects = detectMajorAspects(
        secondaryPointsForWheel,
        includeMinor,
        orbs,
        includeHarmonicAspects
      );

      const secondarySvg = renderChartSVG(
        {
          title: secondaryTitleForWheel,
          subtitle: secondarySubForWheel,
          ascendant: secondaryHouses.ascmc.ascendant,
          houses: secondaryHouses,
          planets: secondaryPointsForWheel,
          aspects: secondaryAspects,
        },
        {
          width: 940,
          height: 940,
          isBiWheel: false,
          theme: themeOpt,
        }
      );

      // Classic Solar Fire Triangular Staircase Aspect Grid SVG
      const aspectGridSvg = renderAspectGridSVG(
        primaryPoints,
        primaryAspects,
        rawDeclAspects,
        themeOpt
      );

      res.json({
        success: true,
        svg,
        secondarySvg,
        aspectGridSvg,
        meta: computedMeta,
        isDiurnal,
        syzygy: {
          type: syzygy.isFullMoon ? 'Full Moon' : 'New Moon',
          ...syzygy,
          ...syzygyPos,
          exactDateUTC: formatJdDateTime(syzygy.jd, tz),
          house: getPlanetHouse(syzygy.longitude, houses.cusps),
        },
        ascendant: formatPosition(houses.ascmc.ascendant),
        mc: formatPosition(houses.ascmc.mc),
        vertex: formatPosition(houses.ascmc.vertex),
        antiVertex: formatPosition(norm360(houses.ascmc.vertex + 180)),
        eastPoint: formatPosition(houses.ascmc.equatorialAsc),
        planets: primaryDetails,
        outerPlanets: outerDetails,
        thirdPlanets: thirdDetails,
        aspects: primaryAspects.map(a => ({
          point1: a.point1.name,
          point2: a.point2.name,
          aspect: a.aspect.name,
          abbreviation: a.aspect.abbreviation,
          glyph: a.aspect.glyph,
          nature: a.aspect.harmonic ? 'harmonic' : a.aspect.nature,
          major: a.aspect.major,
          angle: a.aspect.angle,
          actualAngle: a.actualAngle,
          orb: a.orb,
          isApplying: a.isApplying,
          maxOrb: a.maxOrb,
        })),
        crossAspects: crossAspects.map(a => ({
          point1: a.point1.name,
          point2: a.point2.name,
          label1: `P1 ${a.point1.name}`,
          label2: `${isTriWheel ? thirdTitle : outerTitle} ${a.point2.name}`,
          aspect: a.aspect.name,
          abbreviation: a.aspect.abbreviation,
          glyph: a.aspect.glyph,
          nature: a.aspect.harmonic ? 'harmonic' : a.aspect.nature,
          major: a.aspect.major,
          angle: a.aspect.angle,
          actualAngle: a.actualAngle,
          orb: a.orb,
          isApplying: a.isApplying,
          maxOrb: a.maxOrb,
        })),
        declinationAspects,
        patterns,
        dignities: formattedDignities,
        almuten: {
          winner: almutenRows[0]?.planet || dignityResult.almuten.almutenFiguris,
          winnerScore: almutenRows[0]?.totalAlmutenScore || 0,
          dayRuler,
          hourRuler,
          rows: almutenRows,
          hylegicalPoints: dignityResult.almuten.hylegicalPoints,
        },
        cuspDignities,
        elementalBalance,
        firdaria,
        profection,
        arabicParts: natalSet.arabicParts,
        fixedStars,
        starConjunctions,
        midpoints: {
          dial360: midpoints360,
          dial90: midpoints90,
          dial45: midpoints45,
        },
        nakshatras,
        houses: houses.cusps.slice(1).map((c, i) => ({
          number: i + 1,
          ...formatPosition(c),
          almuten: cuspDignities[i]?.almuten || '',
          domicileRuler: cuspDignities[i]?.domicileRuler || '',
        })),
        isPolarFallback: houses.isPolarFallback ?? false,
      });
    } catch (error: any) {
      console.error('Calculation error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ===========================================================================
  // DYNAMIC CHRONOLOGICAL TRANSIT HIT-LIST SCANNER (/api/transit-hits)
  // ===========================================================================
  app.post('/api/transit-hits', (req: Request, res: Response) => {
    try {
      const {
        date,
        time,
        latitude,
        longitude,
        timezoneOffset,
        houseSystem,
        zodiacMode,
        ayanamsha,
        startDate,
        daysSpan = 30,
        includeMinor = false,
      } = req.body;

      const [yearStr, monthStr, dayStr] = (date || '2000-01-01').split('-');
      const [hourStr, minStr] = (time || '12:00').split(':');
      const tz = timezoneOffset !== undefined ? parseFloat(timezoneOffset) : -3.0;
      const utcHour = parseFloat(hourStr) + parseFloat(minStr || '0') / 60.0 - tz;
      const lat = !isNaN(parseFloat(latitude)) ? parseFloat(latitude) : -34.6037;
      const lon = !isNaN(parseFloat(longitude)) ? parseFloat(longitude) : -58.3816;
      const hSysRaw = String(houseSystem || 'P');
      const hSys = (hSysRaw === 'H' ? HouseSystem.Sripati : hSysRaw) as HouseSystem;
      const isSidereal = zodiacMode === ZodiacMode.Sidereal;

      if (isSidereal) {
        const ayanId = ayanamsha !== undefined ? parseInt(ayanamsha, 10) : AyanamshaSystem.Lahiri;
        engine.swe_set_sid_mode(ayanId);
      }

      let flags = SweFlag.SEFLG_SWIEPH | SweFlag.SEFLG_SPEED;
      if (isSidereal) flags |= SweFlag.SEFLG_SIDEREAL;

      const natalJd = engine.swe_julday(
        parseInt(yearStr, 10),
        parseInt(monthStr, 10),
        parseInt(dayStr, 10),
        utcHour,
        CalendarType.Gregorian
      );
      const houses = engine.swe_houses(natalJd, lat, lon, hSys);

      const scanBodies: { id: SwePlanet; name: string; glyph: string }[] = [
        { id: SwePlanet.SE_SUN, name: 'Sun', glyph: '☉' },
        { id: SwePlanet.SE_MERCURY, name: 'Mercury', glyph: '☿' },
        { id: SwePlanet.SE_VENUS, name: 'Venus', glyph: '♀' },
        { id: SwePlanet.SE_MARS, name: 'Mars', glyph: '♂' },
        { id: SwePlanet.SE_JUPITER, name: 'Jupiter', glyph: '♃' },
        { id: SwePlanet.SE_SATURN, name: 'Saturn', glyph: '♄' },
        { id: SwePlanet.SE_URANUS, name: 'Uranus', glyph: '♅' },
        { id: SwePlanet.SE_NEPTUNE, name: 'Neptune', glyph: '♆' },
        { id: SwePlanet.SE_PLUTO, name: 'Pluto', glyph: '♇' },
        { id: SwePlanet.SE_CHIRON, name: 'Chiron', glyph: '⚷' },
        { id: SwePlanet.SE_TRUE_NODE, name: 'True Node', glyph: '☊' },
      ];

      const natalTargets: { name: string; glyph: string; longitude: number }[] = [];
      for (const b of [
        { id: SwePlanet.SE_SUN, name: 'Sun', glyph: '☉' },
        { id: SwePlanet.SE_MOON, name: 'Moon', glyph: '☽' },
        ...scanBodies.slice(1),
      ]) {
        const c = engine.swe_calc_ut(natalJd, b.id, flags);
        natalTargets.push({ name: b.name, glyph: b.glyph, longitude: c.longitude });
      }
      natalTargets.push({ name: 'Ascendant', glyph: 'Asc', longitude: houses.ascmc.ascendant });
      natalTargets.push({ name: 'Midheaven', glyph: 'MC', longitude: houses.ascmc.mc });

      const activeAspects = STANDARD_ASPECTS.filter(
        a => a.major || (includeMinor && !a.harmonic)
      );

      const [sY, sM, sD] = (startDate || new Date().toISOString().slice(0, 10)).split('-');
      const startJd = engine.swe_julday(parseInt(sY, 10), parseInt(sM, 10), parseInt(sD, 10), 0 - tz);
      const totalDays = Math.max(1, Math.min(366, parseInt(String(daysSpan), 10) || 30));

      const signedAngleDiff = (a: number, b: number) => {
        let d = (a - b) % 360.0;
        if (d < -180.0) d += 360.0;
        if (d > 180.0) d -= 360.0;
        return d;
      };

      const hits: any[] = [];

      const dailyPositions: Map<SwePlanet, { lon: number; speed: number }[]> = new Map();
      for (const tb of scanBodies) {
        const arr: { lon: number; speed: number }[] = [];
        for (let d = 0; d <= totalDays; d++) {
          const c = engine.swe_calc_ut(startJd + d, tb.id, flags);
          arr.push({ lon: c.longitude, speed: c.longitudeSpeed });
        }
        dailyPositions.set(tb.id, arr);
      }

      for (const tb of scanBodies) {
        const posArr = dailyPositions.get(tb.id)!;
        for (const nt of natalTargets) {
          for (const asp of activeAspects) {
            const targetAngles =
              asp.angle === 0 || asp.angle === 180
                ? [asp.angle]
                : [asp.angle, 360 - asp.angle];

            for (const targetAngle of targetAngles) {
              const targetLon = norm360(nt.longitude + targetAngle);
              for (let d = 0; d < totalDays; d++) {
                const err0 = signedAngleDiff(posArr[d].lon, targetLon);
                const err1 = signedAngleDiff(posArr[d + 1].lon, targetLon);

                if (
                  Math.abs(err0) < 20 &&
                  Math.abs(err1) < 20 &&
                  ((err0 <= 0 && err1 > 0) || (err0 >= 0 && err1 < 0))
                ) {
                  const frac = Math.abs(err0) / (Math.abs(err0) + Math.abs(err1) || 1);
                  let exactJd = startJd + d + frac;
                  for (let iter = 0; iter < 2; iter++) {
                    const c = engine.swe_calc_ut(exactJd, tb.id, flags);
                    const err = signedAngleDiff(c.longitude, targetLon);
                    if (Math.abs(c.longitudeSpeed) > 1e-5) {
                      exactJd -= err / c.longitudeSpeed;
                    }
                  }
                  const finalCalc = engine.swe_calc_ut(exactJd, tb.id, flags);
                  const posFmt = formatPosition(finalCalc.longitude);
                  hits.push({
                    jd: exactJd,
                    dateFormatted: formatJdDateTime(exactJd, tz),
                    transitingBody: tb.name,
                    transitingGlyph: tb.glyph,
                    isRetrograde: finalCalc.longitudeSpeed < 0,
                    aspectName: asp.name,
                    aspectGlyph: asp.glyph,
                    aspectNature: asp.nature,
                    natalTarget: nt.name,
                    natalGlyph: nt.glyph,
                    exactPosition: posFmt.formatted,
                    natalPosition: formatPosition(nt.longitude).formatted,
                  });
                }
              }
            }
          }
        }
      }

      hits.sort((a, b) => a.jd - b.jd);
      res.json({
        success: true,
        startDate,
        daysSpan: totalDays,
        totalHits: hits.length,
        hits: hits.slice(0, 250),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Local Charts Database CRUD
  app.get('/api/charts', (_req: Request, res: Response) => {
    res.json({ success: true, charts: storage.getAll() });
  });

  app.post('/api/charts', (req: Request, res: Response) => {
    try {
      const saved = storage.save(req.body);
      res.json({ success: true, chart: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/charts/:id', (req: Request, res: Response) => {
    const chartId = String(req.params.id);
    const ok = storage.delete(chartId);
    res.json({ success: ok });
  });

  return { app, engine };
}

export async function startServer(
  port: number = Number(process.env.PORT) || 3000,
  userDataDir?: string
): Promise<{ server: http.Server; port: number }> {
  const { app } = await createAstrologyServer(userDataDir);
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1', () => {
      const addr = server.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : port;
      console.log(`\n======================================================`);
      console.log(`  Moonwater Astrology Studio running on http://127.0.0.1:${actualPort}`);
      console.log(`======================================================\n`);
      resolve({ server, port: actualPort });
    });
    server.on('error', reject);
  });
}

if (require.main === module) {
  startServer().catch(err => {
    console.error('Failed to start Moonwater Server:', err);
    process.exit(1);
  });
}
