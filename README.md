# Job Market Intelligence Dashboard

Dashboard interactivo que agrega vacantes Tech de múltiples fuentes públicas y las convierte en visualizaciones accionables.

![Stack](https://img.shields.io/badge/React-19-61dafb?style=flat&logo=react)
![Recharts](https://img.shields.io/badge/Recharts-gray?style=flat)
![Leaflet](https://img.shields.io/badge/OpenStreetMap-leaflet-green?style=flat&logo=leaflet)
![Vite](https://img.shields.io/badge/Vite-8-646cff?style=flat&logo=vite)
![Deploy](https://img.shields.io/badge/Deploy-Vercel-black?style=flat&logo=vercel)

## ¿Qué hace?

Agrega vacantes de **3 fuentes en paralelo**, elimina duplicados y genera un dashboard analítico con filtros en tiempo real.

| Fuente | Vacantes | Key requerida |
|---|---|---|
| [Remotive](https://remotive.com) | ~22 empleos remotos Tech | No |
| [The Muse](https://www.themuse.com/api) | ~300 vacantes Data Science | No |
| [Adzuna](https://developer.adzuna.com) | 10M+ vacantes con salarios reales | Sí (gratis) |

## Vistas del Dashboard

| Tab | Contenido |
|---|---|
| **Overview** | 6 KPIs, Top Skills, Fuentes, Categorías, Modalidad, Top Empresas, Timeline |
| **Salarios** | Rangos min/avg/max por rol, Distribución salarial, Radar chart |
| **Mapa** | OpenStreetMap con vacantes geo-localizadas de Adzuna |
| **Vacantes** | Tabla interactiva con links directos a las ofertas |

## Setup local

```bash
git clone https://github.com/Alejndromaldonado/Job-market-intelligence.git
cd Job-market-intelligence
npm install
```

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_ADZUNA_APP_ID=tu_app_id
VITE_ADZUNA_APP_KEY=tu_app_key
```

> Obtén tus credenciales gratis en [developer.adzuna.com](https://developer.adzuna.com). Sin ellas, el dashboard sigue funcionando con Remotive + The Muse.

```bash
npm run dev
# Abre http://localhost:5173
```

## Deploy en Vercel

1. Importa el repositorio en [vercel.com/new](https://vercel.com/new)
2. Vercel detecta Vite automáticamente — no hay nada que configurar en Build Settings
3. Ve a **Settings → Environment Variables** y agrega:
   - `VITE_ADZUNA_APP_ID` → tu app_id de Adzuna
   - `VITE_ADZUNA_APP_KEY` → tu app_key de Adzuna
4. Haz **Redeploy** para que las variables surtan efecto

> ⚠️ **Nunca subas el archivo `.env` al repositorio.** Ya está en `.gitignore`.

## Stack

- **React 19** + **Vite 8**
- **Recharts** — BarChart, AreaChart, PieChart, RadarChart
- **React Leaflet** + **OpenStreetMap** — mapa interactivo
- **CSS Glassmorphism** — sin frameworks CSS externos

## Estructura

```
src/
├── services/
│   └── jobs.js        # Agregador multi-fuente (Remotive + TheMuse + Adzuna)
├── utils/
│   └── analyze.js     # Funciones de análisis y transformación de datos
├── App.jsx            # Dashboard principal con 4 tabs
└── index.css          # Sistema de diseño (variables CSS + glassmorphism)
```
