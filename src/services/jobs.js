// ============================================================
// MULTI-SOURCE JOB AGGREGATOR
// Remotive + The Muse + Adzuna (data-focused + geo-coordinates)
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
      remote: true,
      lat: null, lng: null,
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

const ADZUNA_APP_ID  = import.meta.env.VITE_ADZUNA_APP_ID
const ADZUNA_APP_KEY = import.meta.env.VITE_ADZUNA_APP_KEY

async function fetchAdzuna(query, country = 'us', page = 1, perPage = 50) {
  if (!ADZUNA_APP_ID || ADZUNA_APP_ID === 'your_app_id_here') return []
  try {
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`)
    url.searchParams.set('app_id', ADZUNA_APP_ID)
    url.searchParams.set('app_key', ADZUNA_APP_KEY)
    url.searchParams.set('results_per_page', perPage)
    url.searchParams.set('what', query)
    url.searchParams.set('content-type', 'application/json')
    const res = await fetch(url)
    if (!res.ok) throw new Error(res.status)
    const data = await res.json()
    return (data.results || []).map(job => ({
      id: `adzuna-${job.id}`,
      title: job.title,
      company: job.company?.display_name || 'Unknown',
      location: job.location?.display_name || 'Unknown',
      category: job.category?.label || 'IT Jobs',
      tags: [],
      salary: job.salary_min && job.salary_max
        ? `$${Math.round(job.salary_min / 1000)}k – $${Math.round(job.salary_max / 1000)}k` : null,
      salary_min: job.salary_min || null,
      salary_max: job.salary_max || null,
      remote: (job.title + ' ' + (job.description || '')).toLowerCase().includes('remote'),
      lat: job.latitude || null,
      lng: job.longitude || null,
      url: job.redirect_url,
      published: job.created,
      source: 'Adzuna',
    }))
  } catch (e) { console.warn('Adzuna:', e); return [] }
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
      fetchAdzuna('data analyst', 'us', 1, 50),
      fetchAdzuna('data engineer', 'us', 1, 50),
      fetchAdzuna('data scientist', 'us', 1, 50),
      fetchAdzuna('big data', 'us', 1, 50),
      fetchAdzuna('machine learning', 'us', 1, 50),
    ])
    return dedup(results.flatMap(r => r.value ?? []))
  },
}
