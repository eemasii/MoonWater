import * as fs from 'fs';
import * as path from 'path';
import { EphemerisEngine, SwePlanet, SweFlag, HouseSystem, CalendarType } from './engine.js';
import { detectMajorAspects, AstrologicalPoint } from './aspects.js';
import { renderChartSVG, RenderableChartData } from './chart_renderer.js';

async function generateDemoChart() {
  console.log("=== Generating Natal Chart SVG Demo ===");

  const engine = new EphemerisEngine();
  await engine.init();

  // Test Case: Buenos Aires, Argentina (34°36' S, 58°22' W), UTC-3
  // Current Date/Time: 2026-10-17 03:15:00 Local (06:15:00 UTC)
  const lat = -34.6037;
  const lon = -58.3816;
  const year = 2026;
  const month = 10;
  const day = 17;
  const utcHour = 6.25;

  const jd_ut = engine.swe_julday(year, month, day, utcHour, CalendarType.Gregorian);
  const houses = engine.swe_houses(jd_ut, lat, lon, HouseSystem.Placidus);

  const planetsToCalculate = [
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
  ];

  const points: AstrologicalPoint[] = [];

  for (const p of planetsToCalculate) {
    const coords = engine.swe_calc_ut(jd_ut, p.id, SweFlag.SEFLG_SWIEPH | SweFlag.SEFLG_SPEED);
    points.push({
      id: p.id,
      name: p.name,
      longitude: coords.longitude,
      longitudeSpeed: coords.longitudeSpeed,
      isLuminary: p.isLuminary,
    });
  }

  const aspects = detectMajorAspects(points, true);

  const chartData: RenderableChartData = {
    title: "Moonwater Astrological Chart Demo",
    dateStr: "17 Oct 2026, 03:15:00 (-03:00)",
    locationStr: "Buenos Aires, Argentina (34°36'S, 58°22'W)",
    ascendant: houses.ascmc.ascendant,
    houses: houses,
    planets: points,
    aspects: aspects,
  };

  const svgContent = renderChartSVG(chartData, { width: 900, height: 900 });

  const outputPath = path.resolve('chart.svg');
  fs.writeFileSync(outputPath, svgContent, 'utf-8');

  console.log(`SVG Chart successfully rendered and saved to: ${outputPath}`);
  console.log(`File size: ${(svgContent.length / 1024).toFixed(2)} KB`);

  engine.swe_close();
}

generateDemoChart().catch(console.error);
