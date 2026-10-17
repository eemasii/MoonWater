import { EphemerisEngine, SwePlanet, SweFlag, HouseSystem, CalendarType } from './engine.js';

async function main() {
  console.log("=== Testing Moonwater Ephemeris Engine ===");
  const engine = new EphemerisEngine();
  await engine.init();

  // Test Date: 2000-01-01 12:00:00 UTC
  const jd = engine.swe_julday(2000, 1, 1, 12.0, CalendarType.Gregorian);
  console.log(`Julian Day (2000-01-01 12:00 UTC): ${jd}`);

  // Calculate Sun position with SEFLG_SPEED and SEFLG_SWIEPH (or Moshier fallback)
  const sun = engine.swe_calc_ut(jd, SwePlanet.SE_SUN, SweFlag.SEFLG_SWIEPH | SweFlag.SEFLG_SPEED);
  console.log("\nSun Coordinates:");
  console.log(`  Longitude: ${sun.longitude.toFixed(6)}°`);
  console.log(`  Latitude:  ${sun.latitude.toFixed(6)}°`);
  console.log(`  Distance:  ${sun.distance.toFixed(6)} AU`);
  console.log(`  Speed:     ${sun.longitudeSpeed.toFixed(6)} deg/day`);

  // Calculate Moon position
  const moon = engine.swe_calc_ut(jd, SwePlanet.SE_MOON, SweFlag.SEFLG_SWIEPH | SweFlag.SEFLG_SPEED);
  console.log("\nMoon Coordinates:");
  console.log(`  Longitude: ${moon.longitude.toFixed(6)}°`);
  console.log(`  Latitude:  ${moon.latitude.toFixed(6)}°`);
  console.log(`  Distance:  ${moon.distance.toFixed(6)} AU`);
  console.log(`  Speed:     ${moon.longitudeSpeed.toFixed(6)} deg/day`);

  // Calculate Houses for London (51.5074° N, 0.1278° W) in Placidus
  const houses = engine.swe_houses(jd, 51.5074, -0.1278, HouseSystem.Placidus);
  console.log("\nHouses (Placidus - London):");
  console.log(`  Ascendant: ${houses.ascmc.ascendant.toFixed(4)}°`);
  console.log(`  MC:        ${houses.ascmc.mc.toFixed(4)}°`);
  console.log(`  House 1:   ${houses.cusps[1].toFixed(4)}°`);
  console.log(`  House 4:   ${houses.cusps[4].toFixed(4)}°`);
  console.log(`  House 7:   ${houses.cusps[7].toFixed(4)}°`);
  console.log(`  House 10:  ${houses.cusps[10].toFixed(4)}°`);

  engine.swe_close();
  console.log("\nEngine test completed successfully!");
}

main().catch(err => {
  console.error("Error executing engine test:", err);
  process.exit(1);
});
