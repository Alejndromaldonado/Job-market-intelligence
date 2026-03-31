// ============================================================
// MULTI-SOURCE JOB AGGREGATOR — Security Edition
//
// Adzuna:    llama a /api/jobs (Vercel serverless) → key queda en servidor
// Remotive:  API pública sin key
// The Muse:  API pública sin key
// ============================================================

async function fetchRemotive() {
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs')
    const data = await res.json()
    return (data.jobs || []).map(job => ({
      id: `remotive-${job.id}`,
      title: job.title,
      company: job.company_name,
      location: job.candidate_required_location || 'Worldwide',
      category: job.category,
      tags: job.tags || [],
      salary: job.salary || null,
      salary_min: null, salary_max: null,
      remote: true, lat: null, lng: null,
      url: job.url,
      published: job.publication_date,
      source: 'Remotive',
    }))
  } catch (e) { console.warn('Remotive:', e); return [] }
}

async function fetchMusePage(page = 0, category = 'Data Science') {
  try {
    const url = new URL('https://www.themuse.com/api/public/jobs')
    url.searchParams.set('page', page)
    url.searchParams.set('category', category)
    const res = await fetch(url)
    const data = await res.json()
    return (data.results || []).map(job => ({
      id: `muse-${job.id}`,
      title: job.name,
      company: job.company?.name || 'Unknown',
      location: job.locations?.map(l => l.name).join(', ') || 'Remote',
      category: job.categories?.[0]?.name || 'Tech',
      tags: job.tags?.map(t => t.name.toLowerCase()) || [],
      salary: null, salary_min: null, salary_max: null,
      remote: job.locations?.some(l => l.name?.toLowerCase().includes('remote')) || false,
      lat: null, lng: null,
      url: job.refs?.landing_page || '',
      published: job.publication_date,
      source: 'The Muse',
    }))
  } catch (e) { console.warn('TheMuse:', e); return [] }
}

// ── ADZUNA: llama al proxy seguro /api/jobs (keys quedan en servidor) ──
async function fetchAdzunaSecure(query, country = 'us', page = 1, perPage = 50) {
  try {
    // En local: usa /api/jobs (Vite proxy) o el dev server de Vercel CLI
    // En producción: /api/jobs es la serverless function de Vercel
    const url = `/api/jobs?query=${encodeURIComponent(query)}&country=${country}&page=${page}&per_page=${perPage}`
    const res = await fetch(url)

    if (!res.ok) {
      // Si no hay serverless (local sin Vercel CLI), simplemente devuelve vacío
      console.warn(`Adzuna proxy responded ${res.status} — skipping`)
      return []
    }

    const data = await res.json()
    return data.jobs || []
  } catch (e) {
    console.warn('Adzuna proxy:', e)
    return []
  }
}

function dedup(jobs) {
  const seen = new Set()
  return jobs.filter(job => {
    const key = `${job.title?.toLowerCase()}|${job.company?.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key); return true
  })
}

export const jobsApi = {
  getAll: async () => {
    const results = await Promise.allSettled([
      fetchRemotive(),
      fetchMusePage(0, 'Data Science'),
      fetchMusePage(1, 'Data Science'),
      fetchMusePage(2, 'Data Science'),
      fetchMusePage(0, 'Software Engineer'),
      fetchMusePage(1, 'Software Engineer'),
      fetchAdzunaSecure('data analyst', 'us', 1, 50),
      fetchAdzunaSecure('data engineer', 'us', 1, 50),
      fetchAdzunaSecure('data scientist', 'us', 1, 50),
      fetchAdzunaSecure('big data', 'us', 1, 50),
      fetchAdzunaSecure('machine learning', 'us', 1, 50),
    ])
    return dedup(results.flatMap(r => r.value ?? []))
  },
}
