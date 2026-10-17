import { EphemerisEngine, SwePlanet, SweFlag, CalendarType } from './engine.js';
import { detectMajorAspects, AstrologicalPoint } from './aspects.js';

async function testAspects() {
  console.log("=== Testing Aspect Detection with Swiss Ephemeris & Solar Fire Orbs ===");
  const engine = new EphemerisEngine();
  await engine.init();

  // Test Date: 2024-04-08 18:20 UTC (Total Solar Eclipse - Exact Sun-Moon Conjunction)
  const jd = engine.swe_julday(2024, 4, 8, 18.3333, CalendarType.Gregorian);
  console.log(`Julian Day (2024-04-08): ${jd.toFixed(4)}`);

  const planetsToTest = [
    { id: SwePlanet.SE_SUN, name: 'Sun', isLuminary: true },
    { id: SwePlanet.SE_MOON, name: 'Moon', isLuminary: true },
    { id: SwePlanet.SE_MERCURY, name: 'Mercury', isLuminary: false },
    { id: SwePlanet.SE_VENUS, name: 'Venus', isLuminary: false },
    { id: SwePlanet.SE_MARS, name: 'Mars', isLuminary: false },
    { id: SwePlanet.SE_JUPITER, name: 'Jupiter', isLuminary: false },
    { id: SwePlanet.SE_SATURN, name: 'Saturn', isLuminary: false },
    { id: SwePlanet.SE_URANUS, name: 'Uranus', isLuminary: false },
  ];

  const points: AstrologicalPoint[] = [];

  for (const p of planetsToTest) {
    const coords = engine.swe_calc_ut(jd, p.id, SweFlag.SEFLG_SWIEPH | SweFlag.SEFLG_SPEED);
    points.push({
      id: p.id,
      name: p.name,
      longitude: coords.longitude,
      longitudeSpeed: coords.longitudeSpeed,
      isLuminary: p.isLuminary,
    });
    console.log(`  ${p.name.padEnd(8)}: ${coords.longitude.toFixed(4)}° (Speed: ${coords.longitudeSpeed.toFixed(4)}°/d)`);
  }

  const aspects = detectMajorAspects(points, true);
  console.log(`\nDetected Aspects (${aspects.length} total):`);
  for (const a of aspects) {
    const appSep = a.isApplying ? 'Applying' : 'Separating';
    console.log(
      `  ${a.point1.name} ${a.aspect.abbreviation} ${a.point2.name} | Angle: ${a.actualAngle.toFixed(2)}° | Orb: ${a.orb.toFixed(2)}° (Max: ${a.maxOrb}°) [${appSep}]`
    );
  }

  engine.swe_close();
}

testAspects().catch(console.error);
