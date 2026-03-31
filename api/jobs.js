// api/jobs.js — Vercel Serverless Function
// Las keys de Adzuna viven solo aquí (servidor). Nunca llegan al navegador.

export default async function handler(req, res) {
  // Solo GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const APP_ID  = process.env.ADZUNA_APP_ID
  const APP_KEY = process.env.ADZUNA_APP_KEY

  if (!APP_ID || !APP_KEY) {
    return res.status(503).json({ error: 'Adzuna credentials not configured on server' })
  }

  const { query = 'data analyst', country = 'us', page = 1, per_page = 50 } = req.query

  try {
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`)
    url.searchParams.set('app_id', APP_ID)
    url.searchParams.set('app_key', APP_KEY)
    url.searchParams.set('results_per_page', per_page)
    url.searchParams.set('what', query)
    url.searchParams.set('content-type', 'application/json')

    const upstream = await fetch(url)
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Adzuna upstream error: ${upstream.status}` })
    }

    const data = await upstream.json()

    // Devolvemos solo los campos que el frontend necesita (ninguna credential llega aquí)
    const jobs = (data.results || []).map(job => ({
      id: `adzuna-${job.id}`,
      title: job.title,
      company: job.company?.display_name || 'Unknown',
      location: job.location?.display_name || 'Unknown',
      category: job.category?.label || 'IT Jobs',
      tags: [],
      salary: job.salary_min && job.salary_max
        ? `$${Math.round(job.salary_min / 1000)}k – $${Math.round(job.salary_max / 1000)}k`
        : null,
      salary_min: job.salary_min || null,
      salary_max: job.salary_max || null,
      remote: (job.title + ' ' + (job.description || '')).toLowerCase().includes('remote'),
      lat: job.latitude || null,
      lng: job.longitude || null,
      url: job.redirect_url,
      published: job.created,
      source: 'Adzuna',
    }))

    // Cache en Vercel Edge por 10 minutos para no gastar cuota innecesariamente
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=60')
    return res.status(200).json({ jobs })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
