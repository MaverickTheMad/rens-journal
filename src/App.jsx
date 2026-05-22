import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase.js'
import { todayLocalISO } from './constants.js'
import IntakeTab from './tabs/IntakeTab.jsx'
import TrendsTab from './tabs/TrendsTab.jsx'
import CalendarTab from './tabs/CalendarTab.jsx'
import SetupScreen from './components/SetupScreen.jsx'
import './App.css'

export default function App() {
  const [tab, setTab] = useState('intake')
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [periodStarts, setPeriodStarts] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  const loadPeriodStarts = useCallback(async () => {
    const { data, error } = await supabase
      .from('period_starts')
      .select('start_date')
      .order('start_date', { ascending: true })
    if (error) { console.error(error); return [] }
    return (data || []).map(r => r.start_date)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const starts = await loadPeriodStarts()
      if (cancelled) return
      setPeriodStarts(starts)
      setNeedsSetup(starts.length === 0)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [loadPeriodStarts])

  const bumpRefresh = () => setRefreshKey(k => k + 1)

  const handleSetupComplete = async () => {
    const starts = await loadPeriodStarts()
    setPeriodStarts(starts)
    setNeedsSetup(false)
  }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-cauldron">
          <CauldronSVG />
          <span className="loading-text">brewing something good...</span>
        </div>
      </div>
    )
  }

  if (needsSetup) {
    return <SetupScreen onComplete={handleSetupComplete} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <HeaderArt />
        <div className="app-header-text">
          <h1 className="app-title">
            <span className="title-script">Ren's</span>
            <span className="title-roman">Grimoire</span>
          </h1>
          <p className="app-subtitle">
            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </header>

      <main className="app-main">
        {tab === 'intake'   && <IntakeTab periodStarts={periodStarts} onChange={bumpRefresh} refreshKey={refreshKey} />}
        {tab === 'trends'   && <TrendsTab periodStarts={periodStarts} refreshKey={refreshKey} />}
        {tab === 'calendar' && <CalendarTab periodStarts={periodStarts} onPeriodStartsChange={async () => { const s = await loadPeriodStarts(); setPeriodStarts(s); bumpRefresh() }} refreshKey={refreshKey} />}
      </main>

      <nav className="tab-bar safe-bottom">
        <TabButton active={tab === 'intake'}   onClick={() => setTab('intake')}   icon={<QuillIcon />}  label="Log" />
        <TabButton active={tab === 'trends'}   onClick={() => setTab('trends')}   icon={<MoonIcon />}   label="Trends" />
        <TabButton active={tab === 'calendar'} onClick={() => setTab('calendar')} icon={<WheelIcon />}  label="Cycle" />
      </nav>
    </div>
  )
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button className={`tab-btn ${active ? 'tab-btn-active' : ''}`} onClick={onClick}>
      <span className="tab-icon-svg">{icon}</span>
      <span className="tab-label">{label}</span>
    </button>
  )
}

/* ============================================================
   SVG ILLUSTRATIONS
   ============================================================ */

// Tuxedo cat + moon + stars header scene
function HeaderArt() {
  return (
    <svg
      viewBox="0 0 400 180"
      xmlns="http://www.w3.org/2000/svg"
      className="app-header-art"
      aria-hidden="true"
    >
      {/* Sky gradient */}
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--violet)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--bg-warm)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="moonGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--moon)" />
          <stop offset="100%" stopColor="var(--amber-soft)" />
        </linearGradient>
      </defs>
      <rect width="400" height="180" fill="url(#skyGrad)" />

      {/* Stars */}
      {[
        [30, 22, 1.2], [60, 14, 0.9], [90, 28, 1.0], [130, 10, 1.3],
        [170, 20, 0.8], [220, 8,  1.1], [270, 18, 0.9], [310, 12, 1.2],
        [350, 24, 1.0], [380, 10, 0.8], [45, 40, 0.7], [155, 35, 0.8],
        [240, 30, 1.0], [330, 38, 0.7], [195, 48, 0.6],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="var(--moon)" opacity={0.7} />
      ))}

      {/* Crescent moon */}
      <g transform="translate(340, 30)">
        <circle cx="0" cy="0" r="22" fill="url(#moonGrad)" opacity="0.9" />
        <circle cx="8" cy="-4" r="18" fill="var(--bg-warm)" />
      </g>

      {/* Botanical left — herbs/fern sprigs */}
      <g transform="translate(18, 90)" opacity="0.55" stroke="var(--forest)" fill="none" strokeLinecap="round">
        {/* Main stem */}
        <path d="M0 60 C0 40 4 20 8 0" strokeWidth="1.5" />
        {/* Leaves */}
        <path d="M2 50 C-8 42 -14 34 -10 28 C-6 34 -2 42 2 50" fill="var(--forest)" opacity="0.6" strokeWidth="0" />
        <path d="M5 38 C14 30 20 22 16 16 C10 22 6 30 5 38" fill="var(--forest)" opacity="0.6" strokeWidth="0" />
        <path d="M3 24 C-6 16 -12 8 -8 2 C-4 8 0 16 3 24" fill="var(--forest)" opacity="0.5" strokeWidth="0" />
        <path d="M6 12 C14 4 18 -4 14 -10 C10 -4 6 4 6 12" fill="var(--forest)" opacity="0.5" strokeWidth="0" />
        {/* Second stem */}
        <path d="M18 65 C16 48 12 32 6 16" strokeWidth="1.2" />
        <path d="M16 52 C8 44 4 36 8 30 C12 36 14 44 16 52" fill="var(--forest)" opacity="0.45" strokeWidth="0" />
        <path d="M12 36 C20 28 24 20 20 14 C16 20 12 28 12 36" fill="var(--forest)" opacity="0.45" strokeWidth="0" />
      </g>

      {/* Botanical right — rosemary-style */}
      <g transform="translate(368, 88)" opacity="0.55" stroke="var(--forest)" fill="none" strokeLinecap="round">
        <path d="M0 62 C2 44 -2 24 -6 4" strokeWidth="1.5" />
        <path d="M-2 52 C6 44 12 36 8 30 C4 36 0 44 -2 52" fill="var(--forest)" opacity="0.6" strokeWidth="0" />
        <path d="M-4 38 C-12 30 -16 22 -12 16 C-8 22 -6 30 -4 38" fill="var(--forest)" opacity="0.6" strokeWidth="0" />
        <path d="M-5 24 C2 16 6 8 2 2 C-2 8 -4 16 -5 24" fill="var(--forest)" opacity="0.5" strokeWidth="0" />
        {/* Berry clusters */}
        <circle cx="-8" cy="14" r="2.5" fill="var(--rose)" opacity="0.5" strokeWidth="0" />
        <circle cx="-4" cy="10" r="2" fill="var(--rose)" opacity="0.4" strokeWidth="0" />
        <circle cx="-12" cy="18" r="2" fill="var(--rose)" opacity="0.4" strokeWidth="0" />
      </g>

      {/* Small floating herbs */}
      <g transform="translate(200, 55)" opacity="0.35" fill="var(--forest)">
        <ellipse cx="-20" cy="0" rx="5" ry="2.5" transform="rotate(-30)" />
        <ellipse cx="0" cy="0" rx="5" ry="2.5" transform="rotate(15)" />
        <ellipse cx="20" cy="0" rx="5" ry="2.5" transform="rotate(-20)" />
      </g>

      {/* TUXEDO CAT — sitting, silhouette style */}
      <g transform="translate(168, 58)">
        {/* Body */}
        <ellipse cx="32" cy="72" rx="26" ry="30" fill="var(--ink)" />
        {/* White chest bib */}
        <ellipse cx="32" cy="76" rx="12" ry="16" fill="var(--bg-paper)" opacity="0.92" />
        {/* White belly spot */}
        <ellipse cx="32" cy="88" rx="8" ry="7" fill="var(--bg-paper)" opacity="0.85" />

        {/* Head */}
        <ellipse cx="32" cy="38" rx="20" ry="18" fill="var(--ink)" />
        {/* White muzzle */}
        <ellipse cx="32" cy="44" rx="9" ry="7" fill="var(--bg-paper)" opacity="0.9" />

        {/* Ears */}
        <polygon points="16,26 10,8 24,20" fill="var(--ink)" />
        <polygon points="48,26 54,8 40,20" fill="var(--ink)" />
        {/* Inner ear pink */}
        <polygon points="17,24 12,12 23,21" fill="var(--rose)" opacity="0.5" />
        <polygon points="47,24 52,12 41,21" fill="var(--rose)" opacity="0.5" />

        {/* Eyes — closed/content slits for cozy look */}
        <path d="M24 36 Q27 33 30 36" stroke="var(--bg-paper)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M34 36 Q37 33 40 36" stroke="var(--bg-paper)" strokeWidth="1.8" fill="none" strokeLinecap="round" />

        {/* Nose */}
        <path d="M30 43 L32 45 L34 43 Q32 41 30 43" fill="var(--rose)" opacity="0.7" />

        {/* Whiskers */}
        <line x1="10" y1="42" x2="24" y2="44" stroke="var(--bg-paper)" strokeWidth="0.8" opacity="0.6" />
        <line x1="10" y1="45" x2="24" y2="46" stroke="var(--bg-paper)" strokeWidth="0.8" opacity="0.5" />
        <line x1="40" y1="44" x2="54" y2="42" stroke="var(--bg-paper)" strokeWidth="0.8" opacity="0.6" />
        <line x1="40" y1="46" x2="54" y2="45" stroke="var(--bg-paper)" strokeWidth="0.8" opacity="0.5" />

        {/* Tail curled around */}
        <path d="M6 90 Q-10 100 -4 82 Q0 68 14 72" stroke="var(--ink)" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M58 90 Q72 100 66 82 Q62 68 50 72" stroke="var(--ink)" strokeWidth="8" fill="none" strokeLinecap="round" />

        {/* White tail tip */}
        <circle cx="-4" cy="82" r="5" fill="var(--bg-paper)" opacity="0.85" />
        <circle cx="66" cy="82" r="5" fill="var(--bg-paper)" opacity="0.85" />

        {/* Paws */}
        <ellipse cx="20" cy="100" rx="9" ry="5" fill="var(--ink)" />
        <ellipse cx="44" cy="100" rx="9" ry="5" fill="var(--ink)" />
        {/* White paw tips */}
        <ellipse cx="44" cy="101" rx="5" ry="3" fill="var(--bg-paper)" opacity="0.8" />
      </g>

      {/* Tiny sparkle stars near cat */}
      {[[150, 72], [258, 68], [200, 95]].map(([x,y], i) => (
        <g key={i} transform={`translate(${x},${y})`} opacity="0.5">
          <line x1="0" y1="-4" x2="0" y2="4" stroke="var(--amber-soft)" strokeWidth="1" />
          <line x1="-4" y1="0" x2="4" y2="0" stroke="var(--amber-soft)" strokeWidth="1" />
          <line x1="-2.5" y1="-2.5" x2="2.5" y2="2.5" stroke="var(--amber-soft)" strokeWidth="0.7" />
          <line x1="2.5" y1="-2.5" x2="-2.5" y2="2.5" stroke="var(--amber-soft)" strokeWidth="0.7" />
        </g>
      ))}
    </svg>
  )
}

// Cauldron with steam for loading
function CauldronSVG() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Steam wisps */}
      <path d="M28 28 Q24 20 28 14 Q32 8 28 2" stroke="var(--violet-soft)" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M40 26 Q36 18 40 12 Q44 6 40 0" stroke="var(--violet-soft)" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
      <path d="M52 28 Q56 20 52 14 Q48 8 52 2" stroke="var(--violet-soft)" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6" />
      {/* Legs */}
      <line x1="20" y1="66" x2="14" y2="78" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
      <line x1="60" y1="66" x2="66" y2="78" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
      {/* Body */}
      <path d="M10 48 Q8 70 40 72 Q72 70 70 48 Z" fill="var(--ink)" />
      {/* Rim */}
      <ellipse cx="40" cy="48" rx="30" ry="8" fill="var(--ink-soft)" />
      {/* Liquid inside */}
      <ellipse cx="40" cy="48" rx="26" ry="6" fill="var(--violet)" opacity="0.7" />
      {/* Bubble */}
      <circle cx="34" cy="47" r="2" fill="var(--violet-soft)" opacity="0.5" />
      <circle cx="46" cy="46" r="1.5" fill="var(--violet-soft)" opacity="0.4" />
      {/* Handle */}
      <path d="M12 52 Q10 38 20 36 Q30 34 30 44" stroke="var(--ink-soft)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M68 52 Q70 38 60 36 Q50 34 50 44" stroke="var(--ink-soft)" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

// Tab icons — SVG, no emojis
function QuillIcon() {
  return (
    <svg className="tab-icon-svg" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 4 C16 2 8 6 6 14 L5 21 L12 20 C20 18 24 10 20 4Z"
        fill="currentColor" opacity="0.15" />
      <path d="M20 4 C16 2 8 6 6 14 L5 21 L12 20 C20 18 24 10 20 4Z"
        stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      <path d="M6 14 L5 21" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M14 7 Q10 12 8 18" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <path d="M5 21 L3 23" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="tab-icon-svg" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 5 C9 6 5 10 5 15 C5 20 9 23 14 23 C18 23 21 21 22 18 C19 19 15 18 13 15 C11 12 12 8 15 5Z"
        fill="currentColor" opacity="0.15" />
      <path d="M15 5 C9 6 5 10 5 15 C5 20 9 23 14 23 C18 23 21 21 22 18 C19 19 15 18 13 15 C11 12 12 8 15 5Z"
        stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      <circle cx="20" cy="7" r="1" fill="currentColor" opacity="0.6" />
      <circle cx="23" cy="11" r="0.7" fill="currentColor" opacity="0.5" />
      <circle cx="22" cy="4" r="0.6" fill="currentColor" opacity="0.4" />
    </svg>
  )
}

function WheelIcon() {
  return (
    <svg className="tab-icon-svg" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="13" cy="13" r="9" stroke="currentColor" strokeWidth="1.4" opacity="0.3" />
      <circle cx="13" cy="13" r="5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="13" cy="13" r="1.5" fill="currentColor" />
      {/* Spokes */}
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const rad = (deg * Math.PI) / 180
        const x1 = 13 + 5.5 * Math.cos(rad)
        const y1 = 13 + 5.5 * Math.sin(rad)
        const x2 = 13 + 8.5 * Math.cos(rad)
        const y2 = 13 + 8.5 * Math.sin(rad)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      })}
    </svg>
  )
}
