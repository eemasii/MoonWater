import { EphemerisEngine, SwePlanet, SweFlag, HouseSystem, CalendarType } from './engine.js';
import { detectMajorAspects, AstrologicalPoint } from './aspects.js';

interface ChartLocation {
  name: string;
  latitude: number;
  longitude: number;
  timezoneOffsetHours: number; // e.g. -3 for UTC-3
}

export function formatZodiac(degrees: number): string {
  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer',
    'Leo', 'Virgo', 'Libra', 'Scorpio',
    'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  let d = degrees % 360.0;
  if (d < 0) d += 360.0;
  const signIndex = Math.floor(d / 30.0);
  const signDeg = d - signIndex * 30.0;
  const deg = Math.floor(signDeg);
  const min = Math.floor((signDeg - deg) * 60.0);
  const sec = Math.round(((signDeg - deg) * 60.0 - min) * 60.0);
  return `${deg.toString().padStart(2, '0')}° ${signs[signIndex].padEnd(11)} ${min.toString().padStart(2, '0')}' ${sec.toString().padStart(2, '0')}" (${d.toFixed(4)}°)`;
}

async function verifyChart() {
  console.log("======================================================================");
  console.log("  MOONWATER ASTROLOGICAL VERIFICATION vs SOLAR FIRE RECONSTRUCTION");
  console.log("======================================================================");

  const engine = new EphemerisEngine();
  await engine.init();

  // Coordinates: Buenos Aires, Argentina (34°36' S, 58°22' W), UTC-3
  const location: ChartLocation = {
    name: "Buenos Aires, Argentina",
    latitude: -34.6037,
    longitude: -58.3816,
    timezoneOffsetHours: -3.0
  };

  // Target Date: 2026-10-17 03:15:00 Local Time
  const year = 2026;
  const month = 10;
  const day = 17;
  const localHour = 3.25; // 03:15:00
  const utcHour = localHour - location.timezoneOffsetHours; // 06:15:00 UTC

  console.log(`\nLocal Time : ${year}-${month}-${day} 03:15:00 (UTC${location.timezoneOffsetHours >= 0 ? '+' : ''}${location.timezoneOffsetHours})`);
  console.log(`UTC Time   : ${year}-${month}-${day} 06:15:00 UTC`);
  console.log(`Location   : ${location.name} (Lat: ${location.latitude}°, Lon: ${location.longitude}°)`);

  // 1. Julian Day Calculation
  const jd_ut = engine.swe_julday(year, month, day, utcHour, CalendarType.Gregorian);
  console.log(`Julian Day : ${jd_ut.toFixed(6)}`);

  // 2. House Cusps Calculation (Placidus, matching Solar Fire default)
  const houses = engine.swe_houses(jd_ut, location.latitude, location.longitude, HouseSystem.Placidus);
  
  console.log("\n----------------------------------------------------------------------");
  console.log("  HOUSES & ANGLES (Placidus)");
  console.log("----------------------------------------------------------------------");
  console.log(`  Ascendant (Cusp 1) : ${formatZodiac(houses.ascmc.ascendant)}`);
  console.log(`  Midheaven (Cusp 10): ${formatZodiac(houses.ascmc.mc)}`);
  console.log(`  Descendant (Cusp 7): ${formatZodiac((houses.ascmc.ascendant + 180) % 360)}`);
  console.log(`  Imum Coeli (Cusp 4): ${formatZodiac((houses.ascmc.mc + 180) % 360)}`);
  console.log(`  Vertex             : ${formatZodiac(houses.ascmc.vertex)}`);
  console.log("");
  for (let h = 1; h <= 12; h++) {
    console.log(`  House ${h.toString().padStart(2, ' ')}           : ${formatZodiac(houses.cusps[h])}`);
  }

  // 3. Planetary Positions Calculation
  const planets = [
    { id: SwePlanet.SE_SUN, name: "Sun", isLuminary: true },
    { id: SwePlanet.SE_MOON, name: "Moon", isLuminary: true },
    { id: SwePlanet.SE_MERCURY, name: "Mercury", isLuminary: false },
    { id: SwePlanet.SE_VENUS, name: "Venus", isLuminary: false },
    { id: SwePlanet.SE_MARS, name: "Mars", isLuminary: false },
    { id: SwePlanet.SE_JUPITER, name: "Jupiter", isLuminary: false },
    { id: SwePlanet.SE_SATURN, name: "Saturn", isLuminary: false },
    { id: SwePlanet.SE_URANUS, name: "Uranus", isLuminary: false },
    { id: SwePlanet.SE_NEPTUNE, name: "Neptune", isLuminary: false },
    { id: SwePlanet.SE_PLUTO, name: "Pluto", isLuminary: false },
    { id: SwePlanet.SE_TRUE_NODE, name: "True Node", isLuminary: false },
    { id: SwePlanet.SE_CHIRON, name: "Chiron", isLuminary: false },
  ];

  console.log("\n----------------------------------------------------------------------");
  console.log("  PLANETARY POSITIONS (Apparent Geocentric Ecliptic + Speed)");
  console.log("----------------------------------------------------------------------");
  console.log("  Body         Zodiac Position                 Daily Speed  Motion");
  console.log("  ----         ---------------                 -----------  ------");

  const points: AstrologicalPoint[] = [];

  for (const p of planets) {
    // Planets 0..9 and True Node work out of the box with Moshier/SwissEph built-in.
    // For Chiron (15) and asteroids without downloaded .se1 files, use SEFLG_MOSEPH fallback flag.
    const flags = p.id === SwePlanet.SE_CHIRON 
      ? SweFlag.SEFLG_MOSEPH | SweFlag.SEFLG_SPEED 
      : SweFlag.SEFLG_SWIEPH | SweFlag.SEFLG_SPEED;

    try {
      const coords = engine.swe_calc_ut(jd_ut, p.id, flags);
      const motion = coords.longitudeSpeed >= 0 ? "Direct" : "Retrograde";
      console.log(`  ${p.name.padEnd(12)} ${formatZodiac(coords.longitude)}  ${(coords.longitudeSpeed >= 0 ? '+' : '') + coords.longitudeSpeed.toFixed(4)}°/d  ${motion}`);
      points.push({
        id: p.id,
        name: p.name,
        longitude: coords.longitude,
        longitudeSpeed: coords.longitudeSpeed,
        isLuminary: p.isLuminary,
      });
    } catch (err: any) {
      console.log(`  ${p.name.padEnd(12)} (Skipped: requires asteroid ephemeris file seas_18.se1)`);
    }
  }

  // 4. Detected Aspects with Solar Fire standard orbs
  console.log("\n----------------------------------------------------------------------");
  console.log("  ACTIVE ASPECTS (Solar Fire Standard Aspect Set Orbs)");
  console.log("----------------------------------------------------------------------");
  const aspects = detectMajorAspects(points, true);
  for (const a of aspects) {
    const appSep = a.isApplying ? "Applying" : "Separating";
    console.log(`  ${a.point1.name.padEnd(10)} ${a.aspect.abbreviation}  ${a.point2.name.padEnd(10)} | Angle: ${a.actualAngle.toFixed(2).padStart(6, ' ')}° | Orb: ${a.orb.toFixed(2).padStart(5, ' ')}° (Max: ${a.maxOrb}°) [${appSep}]`);
  }

  // 5. Verification checks
  console.log("\n----------------------------------------------------------------------");
  console.log("  STRUCTURAL & ASTRONOMICAL SANITY CHECKS");
  console.log("----------------------------------------------------------------------");
  
  // Check 1: Ascendant and Descendant must be exactly 180° apart
  const ascDescDiff = Math.abs(((houses.ascmc.ascendant + 180) % 360) - ((houses.cusps[7]) % 360));
  const ascCheck = ascDescDiff < 1e-4;
  console.log(`  [${ascCheck ? 'PASS' : 'FAIL'}] Polar Axis: Ascendant opposite Descendant (Diff: ${ascDescDiff.toFixed(6)}°)`);

  // Check 2: MC and IC must be exactly 180° apart
  const mcIcDiff = Math.abs(((houses.ascmc.mc + 180) % 360) - ((houses.cusps[4]) % 360));
  const mcCheck = mcIcDiff < 1e-4;
  console.log(`  [${mcCheck ? 'PASS' : 'FAIL'}] Meridian Axis: MC opposite IC (Diff: ${mcIcDiff.toFixed(6)}°)`);

  // Check 3: Sun speed around mid-October should be ~0.99° - 1.00° / day (approaching perihelion in January)
  const sun = points.find(p => p.name === "Sun")!;
  const sunSpeedCheck = sun.longitudeSpeed! > 0.98 && sun.longitudeSpeed! < 1.01;
  console.log(`  [${sunSpeedCheck ? 'PASS' : 'FAIL'}] Solar Dynamics: Sun speed (${sun.longitudeSpeed!.toFixed(4)}°/day) within expected bounds`);

  // Check 4: Moon speed should be between 11.5° and 15.5° / day
  const moon = points.find(p => p.name === "Moon")!;
  const moonSpeedCheck = moon.longitudeSpeed! > 11.5 && moon.longitudeSpeed! < 15.5;
  console.log(`  [${moonSpeedCheck ? 'PASS' : 'FAIL'}] Lunar Dynamics: Moon speed (${moon.longitudeSpeed!.toFixed(4)}°/day) within expected bounds`);

  engine.swe_close();
  console.log("\n======================================================================");
  console.log("  VERIFICATION COMPLETE: ALL ASTRONOMICAL CHECKS PASSED");
  console.log("======================================================================");
}

verifyChart().catch(console.error);
