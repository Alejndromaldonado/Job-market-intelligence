import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { jobsApi } from './services/jobs'
import {
  countSkills, groupByCategory, groupBySource, countRemote,
  salaryByCategory, topCompanies, jobsOverTime, salaryDistribution, geoJobs,
} from './utils/analyze'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area, RadarChart,
  Radar, PolarGrid, PolarAngleAxis,
} from 'recharts'

// ─── URL SANITIZATION ────────────────────────────────────────────────
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.href
  } catch {
    return null
  }
}

// ─── PALETTE ─────────────────────────────────────────────────────────
const C = ['#0ea5e9','#10b981','#8b5cf6','#f59e0b','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16','#ef4444']

// ─── CUSTOM TOOLTIP ──────────────────────────────────────────────────
const GlassTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background:'rgba(2,6,23,0.92)', border:'1px solid rgba(14,165,233,0.3)',
      borderRadius:12, padding:'10px 14px', backdropFilter:'blur(12px)',
      color:'#f1f5f9', fontSize:12, minWidth:120,
    }}>
      {label && <p style={{margin:'0 0 6px',fontWeight:700,color:'#94a3b8',fontSize:11,textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</p>}
      {payload.map((p,i) => (
        <p key={i} style={{margin:'2px 0',color:p.color??C[0]}}>
          <span style={{color:'#94a3b8'}}>{p.name ?? p.dataKey}: </span>
          <strong>{formatter ? formatter(p.value) : p.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ─── KPI CARD ────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, accent = '#0ea5e9' }) {
  return (
    <div className="glass-card" style={{padding:'20px 24px',position:'relative',overflow:'hidden'}}>
      <div style={{
        position:'absolute',top:-20,right:-20,width:90,height:90,
        background:`radial-gradient(circle, ${accent}22 0%, transparent 70%)`,
        borderRadius:'50%',
      }}/>
      <div style={{fontSize:24,marginBottom:8}}>{icon}</div>
      <div style={{color:'var(--text-muted)',fontSize:12,fontWeight:500,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>{label}</div>
      <div style={{fontSize:32,fontWeight:800,color:'var(--text-primary)',lineHeight:1}}>{value}</div>
      {sub && <div style={{color:'var(--text-muted)',fontSize:12,marginTop:6}}>{sub}</div>}
    </div>
  )
}

// ─── CHART CARD ──────────────────────────────────────────────────────
function ChartCard({ icon, title, children, span = 1, height = 280 }) {
  return (
    <div className="glass-card fade-in"
      style={{padding:'24px',gridColumn:`span ${span}`}}>
      <h3 style={{margin:'0 0 20px',fontSize:14,fontWeight:700,color:'var(--text-primary)',
        display:'flex',alignItems:'center',gap:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>
        <span>{icon}</span> {title}
      </h3>
      <div style={{height}}>
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── FILTER BAR ──────────────────────────────────────────────────────
function FilterBar({ filters, setFilters, categories, sources }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="glass-card" style={{padding:'16px 20px',position:'relative'}}>
      {/* Mobile Header for Filters */}
      <div className="mobile-filter-header" style={{
        display:'none',justifyContent:'space-between',alignItems:'center',cursor:'pointer'
      }} onClick={() => setIsOpen(!isOpen)}>
        <span style={{color:'var(--text-muted)',fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em'}}>🔧 Filtros ({filters._count ?? 0})</span>
        <span style={{fontSize:18,transform:isOpen ? 'rotate(180deg)' : 'none',transition:'transform 0.3s'}}>▼</span>
      </div>

      <div className={`filter-grid ${isOpen ? 'show' : ''}`} style={{
        display:'flex',flexWrap:'wrap',gap:12,alignItems:'center',
        marginTop: 0,
      }}>
        <style>{`
          @media (max-width: 768px) {
            .mobile-filter-header { display: flex !important; }
            .filter-grid {
              display: none !important;
              flex-direction: column;
              align-items: flex-start !important;
              gap: 16px !important;
              margin-top: 16px !important;
              padding-top: 16px;
              border-top: 1px solid var(--border);
            }
            .filter-grid.show { display: flex !important; }
            .filter-grid > div, .filter-grid > select { width: 100% !important; }
            .filter-grid .filter-pill { flex: 1; text-align: center; justify-content: center; }
            .count-badge { margin-left: 0 !important; width: 100%; text-align: center; }
          }
        `}</style>

        {/* Remote filter */}
        <div style={{display:'flex',gap:6}}>
          {['All','Remote','On-site'].map(opt => (
            <button key={opt} className={`filter-pill ${filters.remote === opt ? 'active' : ''}`}
              onClick={() => setFilters(f => ({...f, remote: opt}))}>
              {opt === 'Remote' ? '🌍 ' : opt === 'On-site' ? '🏢 ' : ''}{opt}
            </button>
          ))}
        </div>

        <div className="desktop-only" style={{width:1,height:24,background:'var(--border)'}}/>

        {/* Source filter */}
        <select value={filters.source}
          onChange={e => setFilters(f => ({...f, source: e.target.value}))}>
          <option value="">📡 All Sources</option>
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Category filter */}
        <select value={filters.category}
          onChange={e => setFilters(f => ({...f, category: e.target.value}))}>
          <option value="">🗂️ All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Salary filter */}
        <div style={{display:'flex',gap:6}}>
          {['All','With Salary'].map(opt => (
            <button key={opt} className={`filter-pill ${filters.salary === opt ? 'active' : ''}`}
              onClick={() => setFilters(f => ({...f, salary: opt}))}>
              {opt === 'With Salary' ? '💰 ' : ''}{opt}
            </button>
          ))}
        </div>

        {/* Count badge */}
        <div className="count-badge" style={{marginLeft:'auto',background:'rgba(14,165,233,0.12)',border:'1px solid rgba(14,165,233,0.25)',
          borderRadius:99,padding:'4px 12px',fontSize:12,color:'var(--accent)',fontWeight:600}}>
          Mostrando {filters._count ?? '—'} vacantes
        </div>
      </div>
    </div>
  )
}

// ─── JOB TABLE ───────────────────────────────────────────────────────
function JobTable({ jobs }) {
  const shown = jobs.slice(0, 10)
  return (
    <div className="responsive-table-container">
      <style>{`
        @media (max-width: 768px) {
          .desktop-table { display: none !important; }
          .mobile-job-list { display: flex !important; flex-direction: column; gap: 12px; }
          .job-card {
            background: rgba(15, 23, 42, 0.4);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .job-card-header { display: flex; justify-content: space-between; align-items: flex-start; }
          .job-card-title { font-size: 14px; font-weight: 600; color: #f1f5f9; text-decoration: none; }
          .job-card-company { font-size: 13px; color: var(--text-muted); }
          .job-card-meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: 11px; }
          .job-tag {
            background: rgba(139,92,246,0.1);
            color: #c4b5fd;
            padding: 2px 8px;
            border-radius: 4px;
            border: 1px solid rgba(139,92,246,0.2);
          }
          .source-tag {
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 10px;
          }
        }
      `}</style>

      {/* Desktop Table */}
      <div className="desktop-table" style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead>
            <tr style={{borderBottom:'1px solid var(--border)'}}>
              {['Título','Empresa','Ubicación','Categoría','Salario','Fuente'].map(h => (
                <th key={h} style={{padding:'10px 12px',textAlign:'left',color:'var(--text-muted)',
                  fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((job, i) => (
              <tr key={job.id} style={{borderBottom:'1px solid rgba(148,163,184,0.06)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(15,23,42,0.3)',
                transition:'background 0.1s'}}
                onMouseEnter={e => e.currentTarget.style.background='rgba(14,165,233,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background= i % 2 === 0 ? 'transparent' : 'rgba(15,23,42,0.3)'}
              >
                <td style={{padding:'10px 12px'}}>
                  {sanitizeUrl(job.url) ? (
                    <a href={sanitizeUrl(job.url)} target="_blank" rel="noopener noreferrer"
                      style={{color:'#e2e8f0',fontWeight:500,textDecoration:'none'}}
                      onMouseEnter={e=>e.target.style.color='var(--accent)'}
                      onMouseLeave={e=>e.target.style.color='#e2e8f0'}>
                      {job.title?.slice(0,50)}{job.title?.length > 50 ? '…' : ''}
                    </a>
                  ) : (
                    <span style={{color:'var(--text-muted)'}}>{job.title?.slice(0,50)}{job.title?.length > 50 ? '…' : ''}</span>
                  )}
                </td>
                <td style={{padding:'10px 12px',color:'var(--text-muted)'}}>{job.company?.slice(0,25)}</td>
                <td style={{padding:'10px 12px',color:'var(--text-muted)',fontSize:12}}>{job.location?.slice(0,22)}</td>
                <td style={{padding:'10px 12px'}}>
                  <span style={{
                    background:'rgba(139,92,246,0.15)',border:'1px solid rgba(139,92,246,0.3)',
                    borderRadius:6,padding:'2px 8px',fontSize:11,color:'#c4b5fd',whiteSpace:'nowrap',
                  }}>{job.category?.slice(0,20)}</span>
                </td>
                <td style={{padding:'10px 12px',color:'#10b981',fontWeight:600,fontSize:12}}>{job.salary ?? '—'}</td>
                <td style={{padding:'10px 12px'}}>
                  <span style={{
                    background: job.source==='Adzuna' ? 'rgba(14,165,233,0.15)' : job.source==='The Muse' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                    border: `1px solid ${job.source==='Adzuna' ? 'rgba(14,165,233,0.3)' : job.source==='The Muse' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                    borderRadius:6,padding:'2px 8px',fontSize:11,
                    color: job.source==='Adzuna' ? '#38bdf8' : job.source==='The Muse' ? '#34d399' : '#fbbf24',
                  }}>{job.source}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Job List (Cards) */}
      <div className="mobile-job-list" style={{display:'none'}}>
        {shown.map(job => (
          <div key={job.id} className="job-card">
            <div className="job-card-header">
               {sanitizeUrl(job.url) ? (
                <a href={sanitizeUrl(job.url)} target="_blank" rel="noopener noreferrer" className="job-card-title">
                  {job.title}
                </a>
               ) : (
                 <span className="job-card-title">{job.title}</span>
               )}
               <span className="source-tag" style={{
                  background: job.source==='Adzuna' ? 'rgba(14,165,233,0.15)' : job.source==='The Muse' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                  border: `1px solid ${job.source==='Adzuna' ? 'rgba(14,165,233,0.3)' : job.source==='The Muse' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                  color: job.source==='Adzuna' ? '#38bdf8' : job.source==='The Muse' ? '#34d399' : '#fbbf24',
                }}>{job.source}</span>
            </div>
            <div className="job-card-company">{job.company} · <span style={{fontSize:12}}>{job.location}</span></div>
            <div className="job-card-meta">
              <span className="job-tag">{job.category}</span>
              {job.salary && <span style={{color:'#10b981',fontWeight:600}}>💰 {job.salary}</span>}
              {job.remote && <span style={{color:'#0ea5e9'}}>🌍 Remote</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── LOADING SCREEN ──────────────────────────────────────────────────
function LoadingScreen() {
  const steps = [
    { icon: '🌐', text: 'Conectando con Remotive, The Muse y Adzuna…' },
    { icon: '🔍', text: 'Buscando vacantes en Data, ML & Engineering…' },
    { icon: '📡', text: 'Descargando +300 ofertas de empleo en EE.UU…' },
    { icon: '🧹', text: 'Eliminando duplicados entre fuentes…' },
    { icon: '📊', text: 'Calculando salarios, skills y tendencias…' },
    { icon: '🗺️', text: 'Geo-localizando vacantes en el mapa…' },
    { icon: '✨', text: 'Preparando tu dashboard de inteligencia…' },
  ]
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setStep(s => (s + 1) % steps.length); setVisible(true) }, 300)
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      minHeight:'100vh',
      background:'radial-gradient(ellipse at 30% 20%, #0c1a3a 0%, #020617 60%)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      fontFamily:'var(--font)', position:'relative', overflow:'hidden',
    }}>
      <style>{`
        @keyframes bar-grow { from{transform:scaleY(0.15)} to{transform:scaleY(1)} }
        @keyframes msg-in  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes msg-out { from{opacity:1;transform:none} to{opacity:0;transform:translateY(-8px)} }
      `}</style>

      {/* Background glow */}
      <div style={{
        position:'absolute', width:500, height:500, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(14,165,233,0.07) 0%, transparent 70%)',
        pointerEvents:'none',
      }}/>

      {/* Animated bar chart */}
      <div style={{ display:'flex', alignItems:'flex-end', gap:7, height:72, marginBottom:36 }}>
        {[0.35, 0.65, 1.0, 0.55, 0.8, 0.45, 0.9, 0.6, 0.72, 0.5].map((h, i) => (
          <div key={i} style={{
            width:10, height:`${h * 100}%`,
            background:`linear-gradient(to top, ${C[i % C.length]}, ${C[(i+2) % C.length]})`,
            borderRadius:'3px 3px 0 0', opacity:0.85,
            animation:`bar-grow 1.3s ease-in-out ${i * 0.08}s infinite alternate`,
            transformOrigin:'bottom',
          }}/>
        ))}
      </div>

      {/* Brand */}
      <h1 style={{
        fontSize:22, fontWeight:800, margin:'0 0 6px', letterSpacing:'-0.02em',
        background:'linear-gradient(90deg, #f1f5f9, #94a3b8)',
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
      }}>
        Job Market Intelligence
      </h1>
      <p style={{
        color:'var(--text-muted)', fontSize:13, fontWeight:500, margin:'0 0 40px', opacity:0.6
      }}>
        Inteligencia de Mercado: Cargando vacantes tecnológicas en EE.UU.
      </p>
      <p style={{ color:'#334155', fontSize:12, margin:'0 0 40px', fontWeight:500 }}>
        Remotive · The Muse · Adzuna
      </p>

      {/* Rotating message */}
      <div style={{
        background:'rgba(15,23,42,0.75)', border:'1px solid rgba(14,165,233,0.2)',
        borderRadius:14, padding:'14px 28px', backdropFilter:'blur(12px)',
        display:'flex', alignItems:'center', gap:12,
        minWidth:340, maxWidth:440, justifyContent:'center', minHeight:52,
        animation: visible ? 'msg-in 0.3s ease' : 'msg-out 0.3s ease',
      }}>
        <span style={{ fontSize:22 }}>{steps[step].icon}</span>
        <span style={{ color:'#94a3b8', fontSize:13, fontWeight:500, lineHeight:1.4 }}>
          {steps[step].text}
        </span>
      </div>

      {/* Progress dots */}
      <div style={{ display:'flex', gap:6, marginTop:22 }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            height:5, width: i === step ? 22 : 5,
            borderRadius:99,
            background: i === step ? '#0ea5e9' : '#1e293b',
            transition:'all 0.35s ease',
          }}/>
        ))}
      </div>

      <p style={{ color:'#1e293b', fontSize:11, marginTop:28 }}>
        Consultando APIs en tiempo real · Puede tomar unos segundos
      </p>
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────
export default function App() {
  const [allJobs, setAllJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [filters, setFilters] = useState({ remote: 'All', source: '', category: '', salary: 'All' })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    jobsApi.getAll()
      .then(jobs => { setAllJobs(jobs); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    return allJobs.filter(j => {
      if (filters.remote === 'Remote' && !j.remote) return false
      if (filters.remote === 'On-site' && j.remote) return false
      if (filters.source && j.source !== filters.source) return false
      if (filters.category && j.category !== filters.category) return false
      if (filters.salary === 'With Salary' && !j.salary_min && !j.salary_max && !j.salary) return false
      return true
    })
  }, [allJobs, filters])

  const insights = useMemo(() => {
    if (!filtered.length) return null
    return {
      total: filtered.length,
      remote: filtered.filter(j => j.remote).length,
      withSalary: filtered.filter(j => j.salary_min || j.salary_max).length,
      skills: countSkills(filtered),
      categories: groupByCategory(filtered),
      sources: groupBySource(filtered),
      remoteMode: countRemote(filtered),
      salaries: salaryByCategory(filtered),
      companies: topCompanies(filtered),
      timeline: jobsOverTime(filtered),
      distribution: salaryDistribution(filtered),
      geo: geoJobs(filtered),
    }
  }, [filtered])

  const allCategories = useMemo(() => [...new Set(allJobs.map(j => j.category).filter(Boolean))].sort(), [allJobs])
  const allSources = useMemo(() => [...new Set(allJobs.map(j => j.source).filter(Boolean))], [allJobs])

  useEffect(() => {
    setFilters(f => ({...f, _count: filtered.length}))
  }, [filtered.length])

  if (loading) return <LoadingScreen />

  if (error) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#020617'}}>
      <p style={{color:'#ef4444'}}>Error: {error}</p>
    </div>
  )

  const tabs = [
    { id:'overview', label:'Overview', icon:'📊' },
    { id:'salaries',  label:'Salarios',  icon:'💰' },
    { id:'geo',       label:'Mapa',      icon:'🗺️' },
    { id:'jobs',      label:'Vacantes',  icon:'💼' },
  ]

  return (
    <div style={{
      minHeight:'100vh',
      background:'radial-gradient(ellipse at 30% 0%, #0c1a3a 0%, #020617 55%)',
      fontFamily:'var(--font)', color:'var(--text-primary)',
    }}>
      {/* ── TOPBAR ── */}
      <header style={{
        position:'sticky',top:0,zIndex:50,
        background:'rgba(2,6,23,0.85)',
        backdropFilter:'blur(20px)',
        borderBottom:'1px solid var(--border)',
      }}>
        <div style={{
          maxWidth:1400,margin:'0 auto',padding:'0 16px',
          display:'flex',alignItems:'center',justifyContent:'space-between',height:64,
        }}>
          {/* Logo */}
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{
              width:34,height:34,borderRadius:10,
              background:'linear-gradient(135deg,#0ea5e9,#8b5cf6)',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:16,boxShadow:'0 0 20px rgba(14,165,233,0.4)',
            }}>📈</div>
            <div className="header-logo">
              <h1 style={{fontSize:16,fontWeight:800,margin:0,lineHeight:1,
                background:'linear-gradient(90deg,#f1f5f9,#94a3b8)',
                WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
                Job Market Intelligence
              </h1>
              <p style={{margin:0,fontSize:11,color:'var(--text-muted)'}}>
                {allJobs.length} vacantes · {allSources.join(' + ')}
              </p>
            </div>
          </div>

          {/* Desktop Tabs */}
          <nav className="desktop-nav" style={{display:'flex',gap:4}}>
            {tabs.map(t => (
              <button key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="tab-button"
                style={{
                  background: activeTab===t.id ? 'rgba(14,165,233,0.15)' : 'transparent',
                  border: `1px solid ${activeTab===t.id ? 'rgba(14,165,233,0.4)' : 'transparent'}`,
                  borderRadius:10,padding:'8px 14px',cursor:'pointer',
                  fontSize:13,fontWeight:activeTab===t.id?700:500,
                  color: activeTab===t.id ? 'var(--accent)' : 'var(--text-muted)',
                  transition:'all 0.15s',display:'flex',alignItems:'center',gap:6,
                }}>
                <span>{t.icon}</span><span className="tab-label">{t.label}</span>
              </button>
            ))}
          </nav>

          {/* Live indicator + Mobile menu toggle */}
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div className="live-indicator" style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'#10b981',
                boxShadow:'0 0 8px #10b981',animation:'pulse 2s infinite'}}/>
              <span style={{fontSize:12,color:'#10b981',fontWeight:600}}>LIVE</span>
            </div>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                display:'none',
                flexDirection:'column',
                justifyContent:'center',
                alignItems:'center',
                gap:4,
                width:44,height:44,
                background:'transparent',
                border:'1px solid var(--border)',
                borderRadius:10,
                cursor:'pointer',
                padding:10,
              }}
              className="mobile-menu-btn"
              aria-label="Toggle menu"
            >
              <span style={{
                width:20,height:2,background:mobileMenuOpen ? 'var(--accent)' : 'var(--text-muted)',
                transition:'all 0.3s',transform:mobileMenuOpen ? 'rotate(45deg) translate(2px, 2px)' : 'none',
                borderRadius:2,
              }}/>
              <span style={{
                width:20,height:2,background:mobileMenuOpen ? 'transparent' : 'var(--text-muted)',
                transition:'all 0.3s',borderRadius:2,opacity:mobileMenuOpen ? 0 : 1,
              }}/>
              <span style={{
                width:20,height:2,background:mobileMenuOpen ? 'var(--accent)' : 'var(--text-muted)',
                transition:'all 0.3s',transform:mobileMenuOpen ? 'rotate(-45deg) translate(2px, -2px)' : 'none',
                borderRadius:2,
              }}/>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <nav className="mobile-nav"
            style={{
              position:'absolute',top:64,left:0,right:0,
              background:'rgba(2,6,23,0.98)',
              backdropFilter:'blur(20px)',
              borderBottom:'1px solid var(--border)',
              padding:'12px 16px',
              display:'flex',flexDirection:'column',gap:8,
            }}>
            {tabs.map(t => (
              <button key={t.id}
                onClick={() => { setActiveTab(t.id); setMobileMenuOpen(false) }}
                style={{
                  background: activeTab===t.id ? 'rgba(14,165,233,0.15)' : 'transparent',
                  border: `1px solid ${activeTab===t.id ? 'rgba(14,165,233,0.4)' : 'transparent'}`,
                  borderRadius:10,padding:'14px 16px',cursor:'pointer',
                  fontSize:14,fontWeight:activeTab===t.id?700:500,
                  color: activeTab===t.id ? 'var(--accent)' : 'var(--text-muted)',
                  transition:'all 0.15s',display:'flex',alignItems:'center',gap:10,
                  width:'100%',textAlign:'left',
                }}>
                <span style={{fontSize:18}}>{t.icon}</span>{t.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* ── MAIN ── */}
      <main className="main-container">

        {/* FILTER BAR */}
        <div style={{marginBottom:20}}>
          <FilterBar filters={filters} setFilters={setFilters}
            categories={allCategories} sources={allSources} />
        </div>

        {/* ═══════════ OVERVIEW TAB ═══════════ */}
        {activeTab === 'overview' && insights && (
          <div style={{display:'flex',flexDirection:'column',gap:20}}>

            {/* KPI CARDS */}
            <div className="grid-kpi">
              <KpiCard icon="📊" label="Total Vacantes" value={insights.total.toLocaleString()} sub="Vacantes agregadas" accent="#0ea5e9"/>
              <KpiCard icon="🌍" label="Remotas" value={insights.remote.toLocaleString()}
                sub={`${Math.round(insights.remote/insights.total*100)}% del total`} accent="#10b981"/>
              <KpiCard icon="💰" label="Con Salario" value={insights.withSalary.toLocaleString()}
                sub="Reportan rango salarial" accent="#f59e0b"/>
              <KpiCard icon="🏢" label="Categorías" value={insights.categories.length}
                sub="Tipos de roles" accent="#8b5cf6"/>
              <KpiCard icon="📡" label="Fuentes" value={insights.sources.length}
                sub={insights.sources.map(s=>s.name).join(' · ')} accent="#ec4899"/>
              <KpiCard icon="🗺️" label="Geo-localizados" value={insights.geo.length}
                sub="Con coordenadas exactas" accent="#14b8a6"/>
            </div>

            {/* ROW 1 */}
            <div className="grid-charts-2">
              {/* SKILLS */}
              {insights.skills.length > 0 && (
                <ChartCard icon="🚀" title="Top Skills Demandadas" height={320}>
                  <BarChart data={insights.skills} layout="vertical" margin={{top:0,right:24,left:64,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false}/>
                    <XAxis type="number" stroke="#475569" tick={{fill:'#94a3b8',fontSize:11}}/>
                    <YAxis dataKey="skill" type="category" stroke="none" tick={{fill:'#cbd5e1',fontSize:11}} width={90}/>
                    <Tooltip content={<GlassTooltip/>}/>
                    <Bar dataKey="count" name="Vacantes" radius={[0,6,6,0]}>
                      {insights.skills.map((_,i) => <Cell key={i} fill={C[i%C.length]}/>)}
                    </Bar>
                  </BarChart>
                </ChartCard>
              )}

              {/* SOURCE PIE */}
              <ChartCard icon="📡" title="Fuentes de Datos" height={320}>
                <PieChart>
                  <Pie data={insights.sources} cx="50%" cy="45%" innerRadius={65} outerRadius={100}
                    paddingAngle={4} dataKey="value" stroke="none"
                    label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}
                    labelLine={{stroke:'#475569',strokeWidth:1}}>
                    {insights.sources.map((_,i) => <Cell key={i} fill={C[i%C.length]}/>)}
                  </Pie>
                  <Tooltip content={<GlassTooltip/>}/>
                </PieChart>
              </ChartCard>
            </div>

            {/* ROW 2 */}
            <div className="grid-charts-3">
              {/* CATEGORIES */}
              <ChartCard icon="🏢" title="Categorías de Empleo" height={260}>
                <BarChart data={insights.categories} margin={{top:0,right:8,left:0,bottom:60}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
                  <XAxis dataKey="name" stroke="none" tick={{fill:'#64748b',fontSize:10}} angle={-40} textAnchor="end" interval={0}/>
                  <YAxis stroke="#475569" tick={{fill:'#94a3b8',fontSize:11}}/>
                  <Tooltip content={<GlassTooltip/>}/>
                  <Bar dataKey="value" name="Vacantes" radius={[6,6,0,0]} fill="#8b5cf6"/>
                </BarChart>
              </ChartCard>

              {/* REMOTE MODE */}
              <ChartCard icon="💻" title="Modalidad" height={260}>
                <PieChart>
                  <Pie data={insights.remoteMode} cx="50%" cy="42%" innerRadius={60} outerRadius={90}
                    paddingAngle={5} dataKey="value" stroke="none">
                    {insights.remoteMode.map((_,i) => <Cell key={i} fill={C[i%C.length]}/>)}
                  </Pie>
                  <Legend verticalAlign="bottom" iconType="circle"
                    wrapperStyle={{color:'#94a3b8',fontSize:12}}/>
                  <Tooltip content={<GlassTooltip/>}/>
                </PieChart>
              </ChartCard>

              {/* COMPANIES */}
              <ChartCard icon="🏆" title="Top Empresas" height={260}>
                <BarChart data={insights.companies.slice(0,6)} layout="vertical" margin={{top:0,right:16,left:60,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false}/>
                  <XAxis type="number" stroke="#475569" tick={{fill:'#94a3b8',fontSize:11}}/>
                  <YAxis dataKey="company" type="category" stroke="none" tick={{fill:'#cbd5e1',fontSize:10}} width={80}/>
                  <Tooltip content={<GlassTooltip/>}/>
                  <Bar dataKey="count" name="Vacantes" radius={[0,6,6,0]} fill="#f59e0b"/>
                </BarChart>
              </ChartCard>
            </div>

            {/* TIMELINE */}
            {insights.timeline.length > 2 && (
              <ChartCard icon="📅" title="Publicaciones por Día (últimos 30 días)" span={3} height={220}>
                <AreaChart data={insights.timeline} margin={{top:0,right:24,left:0,bottom:0}}>
                  <defs>
                    <linearGradient id="timeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
                  <XAxis dataKey="date" stroke="none" tick={{fill:'#64748b',fontSize:10}} interval={4}/>
                  <YAxis stroke="#475569" tick={{fill:'#94a3b8',fontSize:11}}/>
                  <Tooltip content={<GlassTooltip/>}/>
                  <Area type="monotone" dataKey="count" name="Vacantes" stroke="#0ea5e9" strokeWidth={2}
                    fill="url(#timeGrad)" dot={false}/>
                </AreaChart>
              </ChartCard>
            )}
          </div>
        )}

        {/* ═══════════ SALARIES TAB ═══════════ */}
        {activeTab === 'salaries' && insights && (
          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            {insights.salaries.length > 0 ? (
              <>
                {/* SALARY BY CATEGORY */}
                <ChartCard icon="💵" title="Rango Salarial por Categoría (USD / año)" span={3} height={300}>
                  <BarChart data={insights.salaries} margin={{top:0,right:30,left:30,bottom:50}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
                    <XAxis dataKey="role" stroke="none" tick={{fill:'#64748b',fontSize:10}} angle={-30} textAnchor="end" interval={0}/>
                    <YAxis stroke="#475569" tick={{fill:'#94a3b8',fontSize:11}} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`}/>
                    <Tooltip content={<GlassTooltip formatter={v=>`$${v.toLocaleString()}`}/>}/>
                    <Legend wrapperStyle={{color:'#94a3b8',fontSize:12,paddingTop:8}}/>
                    <Bar dataKey="min" name="Mínimo" fill="#3b82f6" radius={[4,4,0,0]}/>
                    <Bar dataKey="avg" name="Promedio" fill="#0ea5e9" radius={[4,4,0,0]}/>
                    <Bar dataKey="max" name="Máximo" fill="#10b981" radius={[4,4,0,0]}/>
                  </BarChart>
                </ChartCard>

                {/* SALARY DISTRIBUTION */}
                <ChartCard icon="📊" title="Distribución por Rango Salarial" span={2} height={260}>
                  <BarChart data={insights.distribution} margin={{top:0,right:16,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
                    <XAxis dataKey="range" stroke="none" tick={{fill:'#94a3b8',fontSize:11}}/>
                    <YAxis stroke="#475569" tick={{fill:'#94a3b8',fontSize:11}}/>
                    <Tooltip content={<GlassTooltip/>}/>
                    <Bar dataKey="count" name="Vacantes" radius={[6,6,0,0]}>
                      {insights.distribution.map((_,i) => <Cell key={i} fill={C[i%C.length]}/>)}
                    </Bar>
                  </BarChart>
                </ChartCard>

                {/* RADAR: SALARY BY CATEGORY */}
                {insights.salaries.length >= 3 && (
                  <ChartCard icon="🕸️" title="Radar: Salario Promedio por Rol" height={260}>
                    <RadarChart data={insights.salaries.slice(0,8)} cx="50%" cy="50%" outerRadius="75%">
                      <PolarGrid stroke="#1e293b"/>
                      <PolarAngleAxis dataKey="role" tick={{fill:'#94a3b8',fontSize:10}}/>
                      <Radar name="Avg" dataKey="avg" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.25} strokeWidth={2}/>
                      <Tooltip content={<GlassTooltip formatter={v=>`$${v.toLocaleString()}`}/>}/>
                    </RadarChart>
                  </ChartCard>
                )}
              </>
            ) : (
              <div className="glass-card" style={{
                padding:60,textAlign:'center',display:'flex',flexDirection:'column',
                alignItems:'center',gap:16,
              }}>
                <span style={{fontSize:48}}>💰</span>
                <h3 style={{color:'#475569',margin:0}}>Datos salariales no disponibles con los filtros actuales</h3>
                <p style={{color:'var(--text-muted)',fontSize:14,maxWidth:420,lineHeight:1.6}}>
                  Los datos salariales provienen principalmente de <strong style={{color:'var(--accent)'}}>Adzuna</strong>.
                  Asegúrate de que el .env tiene las credenciales correctas y desmarca el filtro de fuente si aplicaste uno.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ MAP TAB ═══════════ */}
        {activeTab === 'geo' && insights && (
          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            <div style={{display:'flex',gap:16,alignItems:'center'}}>
              <div className="glass-card" style={{padding:'14px 20px',flex:1}}>
                <span style={{color:'var(--text-muted)',fontSize:12}}>
                  🗺️ {insights.geo.length} vacantes geo-localizadas de {insights.total} totales
                  {insights.geo.length === 0 && ' — Los datos de Adzuna incluyen coordenadas, activa Adzuna para ver el mapa completo.'}
                </span>
              </div>
            </div>

            {insights.geo.length > 0 ? (
              <div className="glass-card map-container-wrapper" style={{padding:8,height:560}}>
                <style>{`
                  @media (max-width: 768px) {
                    .map-container-wrapper { height: 400px !important; }
                  }
                `}</style>
                <MapContainer
                  center={[39, -95]}
                  zoom={4}
                  style={{height:'100%',width:'100%',borderRadius:16}}
                  scrollWheelZoom>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution=""
                  />
                  {insights.geo.map(job => (
                    <CircleMarker
                      key={job.id}
                      center={[job.lat, job.lng]}
                      radius={job.salary_min ? 8 : 5}
                      pathOptions={{
                        color: job.source==='Adzuna' ? '#0ea5e9' : '#10b981',
                        fillColor: job.source==='Adzuna' ? '#0ea5e9' : '#10b981',
                        fillOpacity: 0.7,
                        weight: 1,
                      }}>
                      <Popup>
                        <div style={{minWidth:200}}>
                          <p style={{fontWeight:700,marginBottom:4,fontSize:14}}>{job.title}</p>
                          <p style={{color:'#94a3b8',margin:'2px 0',fontSize:12}}>🏢 {job.company}</p>
                          <p style={{color:'#94a3b8',margin:'2px 0',fontSize:12}}>📍 {job.location}</p>
                          {job.salary && <p style={{color:'#10b981',margin:'4px 0',fontSize:12}}>💰 {job.salary}</p>}
                          {sanitizeUrl(job.url) && (
                            <a href={sanitizeUrl(job.url)} target="_blank" rel="noopener noreferrer"
                              style={{color:'#0ea5e9',fontSize:12,marginTop:6,display:'block'}}>
                              Ver vacante →
                            </a>
                          )}
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
            ) : (
              <div className="glass-card" style={{padding:80,textAlign:'center'}}>
                <p style={{fontSize:48,marginBottom:16}}>🗺️</p>
                <h3 style={{color:'#475569'}}>No hay vacantes geo-localizadas con los filtros actuales</h3>
                <p style={{color:'var(--text-muted)',fontSize:14,marginTop:8}}>
                  Asegúrate de que Adzuna esté activo y desactiva el filtro por fuente para ver los datos del mapa.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ JOBS TABLE TAB ═══════════ */}
        {activeTab === 'jobs' && (
          <div className="glass-card" style={{padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h3 style={{margin:0,fontSize:14,fontWeight:700,textTransform:'uppercase',
                letterSpacing:'0.05em',color:'var(--text-primary)'}}>
                💼 Listado de Vacantes <span style={{color:'var(--text-muted)',fontWeight:400}}>({filtered.length} resultados)</span>
              </h3>
            </div>
            <JobTable jobs={filtered}/>
            {filtered.length > 10 && (
              <p style={{color:'var(--text-muted)',fontSize:12,marginTop:16,textAlign:'center'}}>
                Mostrando 10 de {filtered.length} vacantes. Usa los filtros para refinar la búsqueda.
              </p>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer style={{textAlign:'center',color:'var(--text-dim)',fontSize:11,
        padding:'32px 24px',marginTop:16,borderTop:'1px solid var(--border)'}}>
        Job Market Intelligence ·  Remotive + The Muse + Adzuna · OpenStreetMap
      </footer>
    </div>
  )
}
