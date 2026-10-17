# ✧ Moonwater Studio — Astrología Computacional (Solar Fire Parity Edition)

**Moonwater Studio** es una suite profesional de astrología computacional para escritorio (**Windows Portable & Setup**) y entorno web local, construida en **TypeScript**, **Node.js**, **Express**, **Electron** y **Swiss Ephemeris (`@kuntay/swisseph` DE441 WASM)**.

Diseñada mediante ingeniería inversa sobre `SolarFire.exe`, replica con precisión de sub-segundo de arco todos los cálculos astronómicos, técnicas predictivas, tablas de dignidades tradicionales, astrología uraniana, estrellas fijas y astrología védica (*Jyotish*).

---

## 📥 Descarga Directa de Instaladores (Windows x64)

Los ejecutables compilados están disponibles directamente en la sección de [**GitHub Releases (v1.0.0)**](https://github.com/eemasii/MoonWater/releases/tag/v1.0.0):

| Edición | Enlace de Descarga Directa | Tamaño | Descripción |
| :--- | :--- | :--- | :--- |
| **Portable (`.exe`)** | [**⬇ Descargar `Moonwater-Astrology-Portable-1.0.0.exe`**](https://github.com/eemasii/MoonWater/releases/download/v1.0.0/Moonwater-Astrology-Portable-1.0.0.exe) | ~98.1 MB | Ejecutable autónomo de un solo archivo (no requiere instalación). |
| **Instalador Setup (`.exe`)** | [**⬇ Descargar `Moonwater-Astrology-Setup-1.0.0.exe`**](https://github.com/eemasii/MoonWater/releases/download/v1.0.0/Moonwater-Astrology-Setup-1.0.0.exe) | ~98.3 MB | Instalador NSIS de Windows con asistente de ruta, accesos directos y desinstalador. |

---

## 🚀 Características Principales (Paridad 100% Solar Fire)

### 1. Motor Astronómico (`src/engine.ts`)
- **36 Cuerpos Celestes y Puntos**:
  - **Luminarias y Planetas**: Sol a Plutón + Tierra (en modo heliocéntrico).
  - **Centauros, Nodos y Lilith**: Quirón, Nodo Norte y Nodo Sur (Verdadero y Medio), Lilith Media y Lilith Osculadora/Verdadera.
  - **6 Asteroides**: Ceres, Pallas, Juno, Vesta, Hygiea y Astraea.
  - **Objetos Transneptunianos (TNOs/KBOs)**: Eris y Sedna.
  - **8 Planetas Uranianos (Escuela de Hamburgo)**: Cupido, Hades, Zeus, Kronos, Apollon, Admetos, Vulcanus y Poseidon.
  - **Ángulos y Vértices**: Ascendente, Medio Cielo (MC), Vértice (`Vx`), Antivértice (`AVx`), Punto Este / Ascendente Ecuatorial (`EP`) y Co-Ascendente (`CoAsc`).
- **Planos de Referencia y Centros de Coordenadas**:
  - Modos **Geocéntrico**, **Topocéntrico** (`swe_set_topo`) y **Heliocéntrico** (`SEFLG_HELCTR`).
  - Coordenadas **Eclípticas** (Longitud, Latitud, Distancia, Velocidad Diaria) y **Ecuatoriales** (`SEFLG_EQUATORIAL`: Ascensión Recta y Declinación).
  - Detección automática de planetas **Fuera de Límites (`OOB`, $|\delta| > 23^\circ 26'21''$)**.
- **15 Sistemas de Casas**:
  - **11 Sistemas Nativos**: Placidus (`P`), Koch (`K`), Regiomontanus (`R`), Campanus (`C`), Topocéntrico Polich-Page (`T`), Casas Iguales (`A`), Signos Enteros / Whole Signs (`W`), Porphyry (`O`), Alcabitius (`B`), Morinus (`M`) y Meridian (`X`).
  - **4 Sistemas Derivados y Védicos**: Carta Solar / Sol en 1ª (`S`), Luna en 1ª (`L`), 0° Aries (`Z`) y Hindu Bhava / Sripati (`H`).
- **Zodíaco Tropical y Sideral (7 Ayanamshas)**:
  - `Lahiri (Chitrapaksha)`, `Fagan/Bradley`, `B.V. Raman`, `Krishnamurti (KP)`, `De Luce`, `Sri Yukteshwar` y `True Citra (Spica 0° Libra)`.

### 2. 19 Modos de Carta, Técnicas Predictivas y Relacionales (`src/server.ts`)
1. **Carta Natal (Radix)**
2. **Tránsitos Dinámicos (Bi-Wheel)** con barra de pasos temporales en vivo (`±1H, ±1D, ±1M, ±1A, Ahora`).
3. **Tri-Rueda Concéntrica (Tri-Wheel)**: Carta Natal (anillo interior) + Progresiones Secundarias (anillo medio) + Tránsitos (anillo exterior).
4. **Revolución Solar** (búsqueda iterativa de cruce exacto al segundo con soporte de relocalización).
5. **Revolución Lunar** (retorno lunar exacto con soporte de relocalización).
6. **Progresiones Secundarias** ($1\text{ día solar} = 1\text{ año solar}$).
7. **Progresiones Terciarias** ($1\text{ día solar} = 1\text{ mes lunar tropical}$).
8. **Progresiones Menores** ($1\text{ mes lunar sideral} = 1\text{ año solar}$).
9. **Direcciones por Arco Solar** (en Longitud Eclíptica o en Ascensión Recta Ecuatorial).
10. **Direcciones por Arco Naibod** ($0^\circ 59'08.33''/\text{año}$).
11. **Direcciones Simbólicas de Ptolomeo** ($1^\circ/\text{año}$ o factor personalizable).
12. **Profecciones Anuales** ($30^\circ/\text{año}$ — activación de Casa y Señor del Año / Cronocrátor).
13. **Cartas Armónicas ($H_1 \dots H_{360}$)**.
14. **Antiscia** (reflejo solsticial sobre el eje $0^\circ\text{ Cáncer} / 0^\circ\text{ Capricornio}$).
15. **Contra-Antiscia** (reflejo equinoccial sobre el eje $0^\circ\text{ Aries} / 0^\circ\text{ Libra}$).
16. **Cartas Divisionales Védicas / Vargas ($D_2, D_3, D_7, D_9\text{ Navamsha}, D_{10}, D_{12}, D_{60}$)**.
17. **Sinastría de Pareja (Bi-Wheel)**.
18. **Carta Compuesta de Puntos Medios (Midpoints)**.
19. **Carta Relacional Davison (Punto Medio Espacio-Tiempo)**.

### 3. Dignidades Clásicas, Almuten Figuris, Firdaria y Astrología Védica (`src/dignities.ts`)
- **Tabla de Dignidades Esenciales y Accidentales**: Domicilio, Exaltación, Triplicidad configurable (`Doroteo de Sidón`, `Claudio Ptolomeo`, `William Lilly`), Términos (`Egipcios` y `Ptolemaicos`), Decanatos/Faces Caldeos, Exilio, Caída y estado Peregrino.
- **Cálculo de Almuten Figuris**: Evaluación ponderada sobre los 5 puntos hylegiales (`Sol`, `Luna`, `Ascendente`, `Parte de la Fortuna` y `Sizigia Prenatal` Luna Nueva/Llena) + dignidad accidental por casa + regentes del Día y de la Hora planetaria.
- **Balances y Temperamento**: Proporción ponderada de Elementos (`Fuego`, `Tierra`, `Aire`, `Agua`), Modalidades (`Cardinal`, `Fijo`, `Mutable`), Polaridades (`Yang`, `Yin`) y los 4 Humores Hipocráticos (`Colérico`, `Melancólico`, `Sanguíneo`, `Flemático`).
- **Periodos Planetarios de Firdaria**: Ciclo completo de 75 años (secuencia Diurna y Nocturna) con sus 7 sub-periodos caldeos y detección del periodo activo.
- **Los 8 Partes Arábigos / Lotes Herméticos**: Fortuna, Espíritu, Eros, Victoria, Necesidad, Coraje, Matrimonio y Némesis.
- **Catálogo de 30 Estrellas Fijas**: Posición eclíptica, declinación, magnitud, naturaleza ptolemaica y conjunciones activas ($\le 1.5^\circ$).
- **27 Nakshatras (Mansiones Lunares)**: Cálculo de Nakshatra, Pada (`1..4`), Regente Vimshottari y matriz completa de Vargas (`D1..D60`).

### 4. Aspectos, Paralelos, Patrones, Árboles de Puntos Medios y Escáner Hit-List (`src/aspects.ts`)
- **Aspectos Eclípticos**: Mayores (`0°, 60°, 90°, 120°, 180°`), Menores (`30°, 45°, 135°, 150°`) y Armónicos (`Quintil 72°`, `Biquintil 144°`, `Septil 51°25'`, `Novil 40°`) con indicador Aplicativo (`A`) y Separativo (`S`).
- **Paralelos (`‖`) y Contraparalelos (`⧺`) de Declinación**.
- **8 Patrones Geométricos Cerrados**: Gran Trígono, Cometa (*Kite*), Cuadratura en T (*T-Square*), Gran Cruz Cósmica, Rectángulo Místico, Dedo de Dios (*Yod*), Martillo de Thor (*Thor's Hammer*) y Stellium.
- **Árboles de Puntos Medios (`A/B = C`)** en diales de `360°`, `90° (Uraniano)` y `45°`.
- **Escáner Cronológico de Tránsitos (`Hit-List`)**: Buscador de aspectos exactos en ventanas de 7 a 365 días con refinamiento iterativo de cruce por cero.

### 5. Interfaz Interactiva, Atlas Mundial y Diseños de Página (`public/index.html`, `src/chart_renderer.ts`)
- **4 Diseños de Página Estilo Solar Fire**:
  1. `🎡 Rueda Central` (Uni-Rueda, Bi-Rueda o Tri-Rueda con algoritmo anticolisión de glifos).
  2. `📐 Rueda + Escalera` (Rueda + Matriz Escalonada Triangular de Aspectos y Paralelos).
  3. `⚖️ Ruedas Dobles` (Comparativa lado a lado).
  4. `📊 Escalera de Aspectos Completa`.
- **Buscador de Atlas / Geocodificador Mundial**: Autocompletado en tiempo real con cálculo automático de Latitud, Longitud y Zona Horaria histórica/IANA + base de datos local offline de respaldo.
- **Base de Datos Local de Cartas**: Almacenamiento JSON con clasificación **Rodden Rating (`AA, A, B, C, DD, X`)**, categoría y notas biográficas.
- **Exportación Profesional**: Descarga en **SVG vectorial**, **PNG de alta resolución (300 DPI)** e impresión de **Reporte PDF multipágina**.

---

## 🛠️ Instalación y Uso en Modo Desarrollo

### Requisitos Previos
- **Node.js** `>= 18.x`
- **npm** `>= 9.x`

### Comandos Disponibles

```bash
# 1. Instalar dependencias
npm install

# 2. Compilar TypeScript
npm run build

# 3. Iniciar servidor web local en http://127.0.0.1:3000
npm run dev

# 4. Ejecutar como aplicación nativa de escritorio con Electron
npm run electron:dev

# 5. Generar ejecutables de Windows (.exe Portable y Setup NSIS en dist-electron/)
npm run dist:win
```

---

## 📂 Estructura del Proyecto

```text
moonwater/
├── public/
│   └── index.html           # Interfaz gráfica interactiva, Atlas Geocoder y vistas Solar Fire
├── src/
│   ├── engine.ts            # Motor astronómico Swiss Ephemeris WASM (planetas, casas, estrellas, vargas)
│   ├── dignities.ts         # Dignidades esenciales/accidentales, Almuten Figuris, Firdaria y Profecciones
│   ├── aspects.ts           # Aspectos eclípticos, paralelos de declinación, patrones y puntos medios
│   ├── chart_renderer.ts    # Renderizador SVG (Uni/Bi/Tri-Wheel y Escalera Triangular de Aspectos)
│   ├── storage.ts           # Persistencia local de cartas con Rodden Rating y categorías
│   ├── server.ts            # API REST Express (/api/calculate, /api/transit-hits, /api/charts)
│   └── electron-main.ts     # Proceso principal de Electron para la aplicación nativa de escritorio
├── dist-electron/           # Instaladores compilados (.exe Portable y Setup NSIS)
├── electron-builder.json    # Configuración de empaquetado de Windows
├── package.json
└── tsconfig.json
```
