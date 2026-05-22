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
        {/* Art scene — no text inside the SVG */}
        <HeaderArt />
        {/* Title sits cleanly below the illustration */}
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
   HEADER ART — night sky + proper tuxedo cat + botanicals
   Title is NOT inside this SVG. It renders below.
   ============================================================ */
function HeaderArt() {
  return (
    <svg
      viewBox="0 0 400 150"
      xmlns="http://www.w3.org/2000/svg"
      className="app-header-art"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="hdrSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--midnight)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--bg-warm)"  stopOpacity="1" />
        </linearGradient>
        <linearGradient id="hdrMoon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="var(--moon)" />
          <stop offset="100%" stopColor="var(--amber-soft)" />
        </linearGradient>
        <radialGradient id="hdrGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="var(--violet)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--violet)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background sky */}
      <rect width="400" height="150" fill="url(#hdrSky)" />

      {/* Subtle violet glow behind cat */}
      <ellipse cx="200" cy="110" rx="80" ry="50" fill="url(#hdrGlow)" />

      {/* Stars — varied sizes */}
      {[
        [25,12,1.1],[55,8,0.8],[88,18,1.0],[118,7,1.3],
        [152,14,0.7],[185,6,1.0],[230,10,0.9],[262,16,1.2],
        [295,8,0.8],[328,12,1.1],[358,6,0.9],[380,20,0.7],
        [40,32,0.6],[100,38,0.8],[160,28,0.7],[240,34,0.6],
        [310,30,0.8],[370,40,0.6],
      ].map(([x,y,r],i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="var(--moon)" opacity={0.65 + r*0.1} />
      ))}

      {/* Crescent moon — top right */}
      <g transform="translate(348,28)">
        <circle cx="0" cy="0" r="20" fill="url(#hdrMoon)" opacity="0.95" />
        <circle cx="7" cy="-5" r="16" fill="var(--midnight)" />
      </g>

      {/* Four-point sparkles */}
      {[[148,55],[258,48],[200,90],[320,65]].map(([x,y],i) => (
        <g key={i} transform={`translate(${x},${y})`} opacity="0.55">
          <line x1="0" y1="-5" x2="0" y2="5" stroke="var(--amber-soft)" strokeWidth="1.2" />
          <line x1="-5" y1="0" x2="5" y2="0" stroke="var(--amber-soft)" strokeWidth="1.2" />
          <line x1="-3" y1="-3" x2="3" y2="3" stroke="var(--amber-soft)" strokeWidth="0.7" />
          <line x1="3" y1="-3" x2="-3" y2="3" stroke="var(--amber-soft)" strokeWidth="0.7" />
        </g>
      ))}

      {/* Left botanical — tall herb sprig */}
      <g transform="translate(28,148) rotate(5)" opacity="0.7">
        <line x1="0" y1="0" x2="-4" y2="-80" stroke="var(--forest)" strokeWidth="1.8" strokeLinecap="round" />
        {[[-4,-20],[-8,-35],[-4,-50],[-8,-63],[-4,-74]].map(([lx,ly],i) => (
          <g key={i} transform={`translate(${lx},${ly})`}>
            <ellipse cx="-8" cy="0" rx="10" ry="4" fill="var(--forest)" opacity="0.65" transform={`rotate(${-30+i*8})`} />
            <ellipse cx="6"  cy="0" rx="8"  ry="3" fill="var(--forest)" opacity="0.55" transform={`rotate(${25-i*6})`} />
          </g>
        ))}
      </g>

      {/* Right botanical — with berries */}
      <g transform="translate(372,148) rotate(-5)" opacity="0.7">
        <line x1="0" y1="0" x2="4" y2="-75" stroke="var(--forest)" strokeWidth="1.8" strokeLinecap="round" />
        {[[4,-18],[8,-32],[4,-47],[8,-60],[4,-70]].map(([lx,ly],i) => (
          <g key={i} transform={`translate(${lx},${ly})`}>
            <ellipse cx="8"  cy="0" rx="10" ry="4" fill="var(--forest)" opacity="0.65" transform={`rotate(${30-i*8})`} />
            <ellipse cx="-6" cy="0" rx="8"  ry="3" fill="var(--forest)" opacity="0.55" transform={`rotate(${-25+i*6})`} />
          </g>
        ))}
        {/* Berry cluster at top */}
        <circle cx="4"  cy="-78" r="3.5" fill="var(--rose)" opacity="0.6" />
        <circle cx="10" cy="-74" r="2.5" fill="var(--rose)" opacity="0.5" />
        <circle cx="-1" cy="-74" r="2.5" fill="var(--rose)" opacity="0.5" />
        <circle cx="6"  cy="-82" r="2"   fill="var(--rose)" opacity="0.4" />
      </g>

      {/* ====== TUXEDO CAT ====== */}
      {/* Centered at x=200, sitting on the bottom edge */}
      <g transform="translate(200, 148)">

        {/* TAIL — drawn first so it's behind body */}
        {/* Sweeps left and curls up */}
        <path
          d="M-8,0 C-30,0 -46,-8 -44,-24 C-42,-38 -28,-38 -24,-28"
          fill="none" stroke="var(--ink)" strokeWidth="10" strokeLinecap="round"
        />
        {/* White tail tip */}
        <circle cx="-24" cy="-28" r="6" fill="var(--bg-paper)" opacity="0.95" />

        {/* BODY — black, rounded rectangle */}
        <ellipse cx="0" cy="-28" rx="24" ry="28" fill="var(--ink)" />

        {/* WHITE CHEST BIB — teardrop shape */}
        <path
          d="M0,-10 C-10,-10 -12,-22 -8,-34 C-4,-44 4,-44 8,-34 C12,-22 10,-10 0,-10Z"
          fill="var(--bg-paper)" opacity="0.95"
        />

        {/* WHITE BELLY */}
        <ellipse cx="0" cy="-10" rx="9" ry="7" fill="var(--bg-paper)" opacity="0.9" />

        {/* FRONT PAWS — side by side at bottom */}
        <ellipse cx="-13" cy="-1" rx="10" ry="6" fill="var(--ink)" />
        <ellipse cx="13"  cy="-1" rx="10" ry="6" fill="var(--ink)" />
        {/* Right paw white toes */}
        <ellipse cx="13"  cy="0"  rx="6"  ry="4" fill="var(--bg-paper)" opacity="0.85" />

        {/* HEAD — nice round circle */}
        <circle cx="0" cy="-66" r="22" fill="var(--ink)" />

        {/* EARS — sharp triangles, properly placed */}
        <polygon points="-22,-76  -28,-100  -8,-80" fill="var(--ink)" />
        <polygon points=" 22,-76   28,-100   8,-80" fill="var(--ink)" />
        {/* Inner ear — pink */}
        <polygon points="-21,-78  -25,-96  -10,-82" fill="var(--rose)" opacity="0.55" />
        <polygon points=" 21,-78   25,-96   10,-82" fill="var(--rose)" opacity="0.55" />

        {/* WHITE FACE MASK — covers lower half of head */}
        <ellipse cx="0" cy="-60" rx="14" ry="11" fill="var(--bg-paper)" opacity="0.95" />

        {/* EYES — happy closed crescents */}
        <path d="M-9,-68 Q-6,-72 -3,-68" stroke="var(--ink)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M 3,-68 Q 6,-72  9,-68" stroke="var(--ink)" strokeWidth="2.2" fill="none" strokeLinecap="round" />

        {/* NOSE */}
        <path d="M-3,-61 L0,-58 L3,-61 Q0,-64 -3,-61Z" fill="var(--rose)" opacity="0.75" />

        {/* MOUTH */}
        <path d="M0,-58 Q-4,-55 -5,-53" stroke="var(--ink)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d="M0,-58 Q 4,-55  5,-53" stroke="var(--ink)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6" />

        {/* WHISKERS */}
        <line x1="-14" y1="-62" x2="-26" y2="-60" stroke="var(--bg-paper)" strokeWidth="1.1" opacity="0.7" />
        <line x1="-14" y1="-59" x2="-26" y2="-58" stroke="var(--bg-paper)" strokeWidth="1.1" opacity="0.6" />
        <line x1="-14" y1="-56" x2="-25" y2="-57" stroke="var(--bg-paper)" strokeWidth="1.1" opacity="0.5" />
        <line x1=" 14" y1="-62" x2=" 26" y2="-60" stroke="var(--bg-paper)" strokeWidth="1.1" opacity="0.7" />
        <line x1=" 14" y1="-59" x2=" 26" y2="-58" stroke="var(--bg-paper)" strokeWidth="1.1" opacity="0.6" />
        <line x1=" 14" y1="-56" x2=" 25" y2="-57" stroke="var(--bg-paper)" strokeWidth="1.1" opacity="0.5" />
      </g>
    </svg>
  )
}

/* ============================================================
   CAULDRON — loading state
   ============================================================ */
function CauldronSVG() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M28 30 Q24 20 28 12 Q32 4 28 0"  stroke="var(--violet-soft)" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M40 28 Q36 18 40 10 Q44 2 40 0"  stroke="var(--violet-soft)" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
      <path d="M52 30 Q56 20 52 12 Q48 4 52 0"  stroke="var(--violet-soft)" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6" />
      <line x1="20" y1="66" x2="14" y2="78" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
      <line x1="60" y1="66" x2="66" y2="78" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
      <path d="M10 48 Q8 70 40 72 Q72 70 70 48 Z" fill="var(--ink)" />
      <ellipse cx="40" cy="48" rx="30" ry="8" fill="var(--ink-soft)" />
      <ellipse cx="40" cy="48" rx="26" ry="6" fill="var(--violet)" opacity="0.7" />
      <circle cx="34" cy="47" r="2"   fill="var(--violet-soft)" opacity="0.5" />
      <circle cx="46" cy="46" r="1.5" fill="var(--violet-soft)" opacity="0.4" />
      <path d="M12 52 Q10 38 20 36 Q30 34 30 44" stroke="var(--ink-soft)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M68 52 Q70 38 60 36 Q50 34 50 44" stroke="var(--ink-soft)" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/* ============================================================
   TAB ICONS — SVG only, no emojis
   ============================================================ */
function QuillIcon() {
  return (
    <svg className="tab-icon-svg" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 4 C16 2 8 6 6 14 L5 21 L12 20 C20 18 24 10 20 4Z" fill="currentColor" opacity="0.15" />
      <path d="M20 4 C16 2 8 6 6 14 L5 21 L12 20 C20 18 24 10 20 4Z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      <path d="M14 7 Q10 12 8 18" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <path d="M5 21 L3 23" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="tab-icon-svg" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 5 C9 6 5 10 5 15 C5 20 9 23 14 23 C18 23 21 21 22 18 C19 19 15 18 13 15 C11 12 12 8 15 5Z" fill="currentColor" opacity="0.15" />
      <path d="M15 5 C9 6 5 10 5 15 C5 20 9 23 14 23 C18 23 21 21 22 18 C19 19 15 18 13 15 C11 12 12 8 15 5Z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      <circle cx="20" cy="7"  r="1"   fill="currentColor" opacity="0.6" />
      <circle cx="23" cy="11" r="0.7" fill="currentColor" opacity="0.5" />
      <circle cx="22" cy="4"  r="0.6" fill="currentColor" opacity="0.4" />
    </svg>
  )
}

function WheelIcon() {
  return (
    <svg className="tab-icon-svg" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="13" cy="13" r="9" stroke="currentColor" strokeWidth="1.4" opacity="0.3" />
      <circle cx="13" cy="13" r="5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="13" cy="13" r="1.5" fill="currentColor" />
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const rad = (deg * Math.PI) / 180
        return (
          <line
            key={i}
            x1={13 + 5.5 * Math.cos(rad)} y1={13 + 5.5 * Math.sin(rad)}
            x2={13 + 8.5 * Math.cos(rad)} y2={13 + 8.5 * Math.sin(rad)}
            stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"
          />
        )
      })}
    </svg>
  )
}
