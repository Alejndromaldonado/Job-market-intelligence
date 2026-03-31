// ============================================================
// analyze.js — Data transformations for chart components
// ============================================================

export function countSkills(jobs) {
  const counts = {}
  jobs.forEach(job => {
    (job.tags ?? []).forEach(raw => {
      const s = typeof raw === 'string' ? raw.toLowerCase().trim() : null
      if (s && s.length > 1) counts[s] = (counts[s] ?? 0) + 1
    })
  })
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a).slice(0, 12)
    .map(([skill, count]) => ({ skill, count }))
}

export function groupByCategory(jobs) {
  const g = {}
  jobs.forEach(j => { const c = j.category ?? 'Other'; g[c] = (g[c] ?? 0) + 1 })
  return Object.entries(g).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10)
}

export function groupBySource(jobs) {
  const g = {}
  jobs.forEach(j => { const s = j.source ?? 'Unknown'; g[s] = (g[s] ?? 0) + 1 })
  return Object.entries(g).map(([name, value]) => ({ name, value }))
}

export function countRemote(jobs) {
  let rem = 0, onsite = 0
  jobs.forEach(j => { if (j.remote) rem++; else onsite++ })
  return [{ name: 'Remote', value: rem }, { name: 'On-site / Hybrid', value: onsite }].filter(d => d.value > 0)
}

export function salaryByCategory(jobs) {
  const cats = {}
  jobs.forEach(j => {
    if (!j.salary_min && !j.salary_max) return
    const cat = j.category ?? 'Other'
    if (!cats[cat]) cats[cat] = []
    cats[cat].push({ min: j.salary_min ?? 0, max: j.salary_max ?? j.salary_min ?? 0 })
  })
  return Object.entries(cats)
    .filter(([, s]) => s.length >= 1)
    .map(([role, s]) => ({
      role,
      min: Math.round(Math.min(...s.map(x => x.min))),
      max: Math.round(Math.max(...s.map(x => x.max))),
      avg: Math.round(s.reduce((a, x) => a + (x.min + x.max) / 2, 0) / s.length),
    }))
    .sort((a, b) => b.avg - a.avg).slice(0, 8)
}

export function topCompanies(jobs) {
  const c = {}
  jobs.forEach(j => {
    const co = j.company?.trim()
    if (co && co !== 'Unknown') c[co] = (c[co] ?? 0) + 1
  })
  return Object.entries(c).sort(([, a], [, b]) => b - a).slice(0, 10)
    .map(([company, count]) => ({ company, count }))
}

export function jobsOverTime(jobs) {
  const days = {}
  jobs.forEach(j => {
    if (!j.published) return
    const day = j.published.slice(0, 10)
    days[day] = (days[day] ?? 0) + 1
  })
  return Object.entries(days).sort(([a], [b]) => a.localeCompare(b))
    .slice(-30).map(([date, count]) => ({ date: date.slice(5), count }))
}

export function salaryDistribution(jobs) {
  const buckets = [
    { label: '<$40k', min: 0, max: 40000 },
    { label: '$40–60k', min: 40000, max: 60000 },
    { label: '$60–80k', min: 60000, max: 80000 },
    { label: '$80–100k', min: 80000, max: 100000 },
    { label: '$100–130k', min: 100000, max: 130000 },
    { label: '$130–170k', min: 130000, max: 170000 },
    { label: '>$170k', min: 170000, max: Infinity },
  ]
  return buckets.map(b => {
    const count = jobs.filter(j => {
      const avg = j.salary_min && j.salary_max ? (j.salary_min + j.salary_max) / 2 : null
      return avg !== null && avg >= b.min && avg < b.max
    }).length
    return { range: b.label, count }
  })
}

export function geoJobs(jobs) {
  return jobs.filter(j => j.lat && j.lng && !isNaN(j.lat) && !isNaN(j.lng))
}
