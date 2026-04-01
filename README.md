# Job Market Intelligence Dashboard

Dashboard en tiempo real que agrega, filtra y visualiza vacantes tecnológicas en EE.UU. desde **Remotive**, **The Muse** y **Adzuna**. Construido con React 19 y optimizado para análisis salarial y geo-localización.

## Características
- **Multifuente:** Agregación y deduplicación automática de +300 vacantes.
- **Análisis Salarial:** Visualización de rangos min/avg/max por rol y distribución.
- **Mapa Interactivo:** Geo-localización de ofertas con OpenStreetMap.
- **Seguridad:** Las credenciales de API corren en el servidor (Vercel Serverless) para prevenir fugas en el cliente.
- **Responsivo:** Diseño optimizado para móvil, tablet y desktop.

## Desarrollo Local
1. `npm install`
2. Configura un archivo `.env` con tus credenciales de [Adzuna](https://developer.adzuna.com):
   ```env
   ADZUNA_APP_ID=...
   ADZUNA_APP_KEY=...
   ```
3. `npm run dev`

## Despliegue en Vercel
1. Conecta tu repositorio en Vercel.
2. Agrega las variables de entorno `ADZUNA_APP_ID` y `ADZUNA_APP_KEY`.
3. ¡Listo! El proxy en `api/jobs.js` se encarga del resto de forma segura.

## Tech Stack
- **Frontend:** React 19, Vite, Recharts, React-Leaflet.
- **Backend:** Vercel Serverless Functions (Node.js).
- **Estilos:** Custom CSS (Glassmorphism & Responsive Design).
