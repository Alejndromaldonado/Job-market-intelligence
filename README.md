# Job Market Intelligence Dashboard

Dashboard de inteligencia de mercado laboral construido en React que agrega vacantes tech en tiempo real desde tres fuentes gratuitas — Remotive, The Muse y Adzuna — filtra y deduplica los resultados, y los presenta en cuatro vistas: un overview con gráficos de skills demandadas, distribución de categorías, modalidad de trabajo y empresas que más contratan; un análisis salarial con rangos por rol; un mapa interactivo con OpenStreetMap mostrando las vacantes geo-localizadas; y una tabla con links directos a las ofertas. Las credenciales de Adzuna corren en una función serverless de Vercel para que nunca queden expuestas en el browser.

![Stack](https://img.shields.io/badge/React-19-61dafb?style=flat&logo=react)
![Recharts](https://img.shields.io/badge/Recharts-gray?style=flat)
![Leaflet](https://img.shields.io/badge/OpenStreetMap-leaflet-green?style=flat&logo=leaflet)
![Vite](https://img.shields.io/badge/Vite-8-646cff?style=flat&logo=vite)
![Deploy](https://img.shields.io/badge/Deploy-Vercel-black?style=flat&logo=vercel)

## Fuentes de Datos

| Fuente | Vacantes | Key requerida |
|---|---|---|
| [Remotive](https://remotive.com) | ~22 empleos remotos Tech | No |
| [The Muse](https://www.themuse.com/api) | ~300 vacantes Data Science | No |
| [Adzuna](https://developer.adzuna.com) | 10M+ vacantes con salarios reales | Sí (gratis) |

## Vistas

| Tab | Contenido |
|---|---|
| **Overview** | 6 KPIs, Top Skills, Fuentes, Categorías, Modalidad, Top Empresas, Timeline |
| **Salarios** | Rangos min/avg/max por rol, Distribución salarial, Radar chart |
| **Mapa** | OpenStreetMap con vacantes geo-localizadas |
| **Vacantes** | Tabla interactiva con links directos a las ofertas |

## Setup Local

```bash
git clone https://github.com/Alejndromaldonado/Job-market-intelligence.git
cd Job-market-intelligence
npm install
```

Crea un `.env` en la raíz:

```env
ADZUNA_APP_ID=tu_app_id
ADZUNA_APP_KEY=tu_app_key
```

> Credenciales gratis en [developer.adzuna.com](https://developer.adzuna.com). Sin ellas el dashboard igual funciona con Remotive + The Muse.

```bash
npm run dev
```

## Deploy en Vercel

1. Importa el repo en [vercel.com/new](https://vercel.com/new) — Vite se detecta automáticamente
2. En **Settings → Environment Variables** agrega (sin prefijo `VITE_`):
   - `ADZUNA_APP_ID`
   - `ADZUNA_APP_KEY`
3. **Redeploy** para que las variables surtan efecto

Las keys nunca llegan al browser — corren en una función serverless en `api/jobs.js`.

## Stack

- **React 19** + **Vite 8**
- **Recharts** — BarChart, AreaChart, PieChart, RadarChart
- **React Leaflet** + **OpenStreetMap**
- **Vercel Serverless Functions** — proxy seguro para Adzuna

## Estructura

```
src/
├── services/jobs.js    # Agregador multi-fuente
├── utils/analyze.js    # Transformaciones y métricas
├── App.jsx             # Dashboard con 4 tabs
└── index.css           # Sistema de diseño

api/
└── jobs.js             # Serverless proxy para Adzuna (keys server-side)
```
