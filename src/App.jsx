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
   HEADER ART — night sky + accurate tuxedo cat + botanicals
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
          <stop offset="0%"   stopColor="var(--violet)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--violet)" stopOpacity="0" />
        </radialGradient>
        {/* Green eye glow */}
        <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#a8d878" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#6aaa40" stopOpacity="0.7" />
        </radialGradient>
      </defs>

      {/* Background sky */}
      <rect width="400" height="150" fill="url(#hdrSky)" />

      {/* Soft violet glow around cat */}
      <ellipse cx="200" cy="115" rx="90" ry="55" fill="url(#hdrGlow)" />

      {/* Stars */}
      {[
        [22,10,1.1],[58,7,0.8],[92,17,1.0],[125,6,1.3],
        [158,13,0.7],[188,5,1.0],[235,9,0.9],[268,15,1.2],
        [298,7,0.8],[332,11,1.1],[362,5,0.9],[385,19,0.7],
        [42,30,0.6],[108,36,0.8],[168,26,0.7],[245,32,0.6],
        [315,28,0.8],[375,38,0.6],
      ].map(([x,y,r],i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="var(--moon)" opacity={0.6 + r*0.1} />
      ))}

      {/* Crescent moon — top right */}
      <g transform="translate(348,26)">
        <circle cx="0" cy="0" r="20" fill="url(#hdrMoon)" opacity="0.95" />
        <circle cx="7" cy="-5" r="16" fill="var(--midnight)" />
      </g>

      {/* Four-point sparkles */}
      {[[148,52],[258,46],[196,88],[322,62]].map(([x,y],i) => (
        <g key={i} transform={`translate(${x},${y})`} opacity="0.5">
          <line x1="0" y1="-5" x2="0" y2="5" stroke="var(--amber-soft)" strokeWidth="1.2" />
          <line x1="-5" y1="0" x2="5" y2="0" stroke="var(--amber-soft)" strokeWidth="1.2" />
          <line x1="-3" y1="-3" x2="3" y2="3" stroke="var(--amber-soft)" strokeWidth="0.7" />
          <line x1="3" y1="-3" x2="-3" y2="3" stroke="var(--amber-soft)" strokeWidth="0.7" />
        </g>
      ))}

      {/* Left botanical */}
      <g transform="translate(28,148) rotate(4)" opacity="0.65">
        <line x1="0" y1="0" x2="-3" y2="-78" stroke="var(--forest)" strokeWidth="1.8" strokeLinecap="round" />
        {[[-3,-18],[-7,-33],[-3,-48],[-7,-61],[-3,-73]].map(([lx,ly],i) => (
          <g key={i} transform={`translate(${lx},${ly})`}>
            <ellipse cx="-8" cy="0" rx="10" ry="4" fill="var(--forest)" opacity="0.65" transform={`rotate(${-30+i*8})`} />
            <ellipse cx="6"  cy="0" rx="8"  ry="3" fill="var(--forest)" opacity="0.5"  transform={`rotate(${25-i*6})`} />
          </g>
        ))}
      </g>

      {/* Right botanical with berries */}
      <g transform="translate(372,148) rotate(-4)" opacity="0.65">
        <line x1="0" y1="0" x2="3" y2="-74" stroke="var(--forest)" strokeWidth="1.8" strokeLinecap="round" />
        {[[3,-16],[7,-30],[3,-45],[7,-58],[3,-69]].map(([lx,ly],i) => (
          <g key={i} transform={`translate(${lx},${ly})`}>
            <ellipse cx="8"  cy="0" rx="10" ry="4" fill="var(--forest)" opacity="0.65" transform={`rotate(${30-i*8})`} />
            <ellipse cx="-6" cy="0" rx="8"  ry="3" fill="var(--forest)" opacity="0.5"  transform={`rotate(${-25+i*6})`} />
          </g>
        ))}
        <circle cx="3"  cy="-77" r="3.5" fill="var(--rose)" opacity="0.65" />
        <circle cx="9"  cy="-73" r="2.5" fill="var(--rose)" opacity="0.5"  />
        <circle cx="-2" cy="-73" r="2.5" fill="var(--rose)" opacity="0.5"  />
      </g>

      {/* ====== TUXEDO CAT — based on real cat ======
          Mostly black. White: small mustache patch under nose,
          chin, narrow chest bib, front paws.
          Tall pointy ears. Green eyes. Alert/judgy expression.
          Sitting upright, centered at x=200, bottom at y=148.
      */}
      <g transform="translate(200,148)">

        {/* TAIL — long, curves behind to the right */}
        <path
          d="M12,-5 C36,-5 52,-18 50,-38 C48,-54 32,-52 30,-40"
          fill="none" stroke="#111111" strokeWidth="9" strokeLinecap="round"
        />

        {/* BODY — tall, upright, mostly black */}
        <ellipse cx="0" cy="-32" rx="22" ry="30" fill="#111111" />

        {/* NARROW CHEST BIB — thin vertical strip, not wide */}
        <path
          d="M0,-14 C-5,-14 -6,-22 -4,-34 C-2,-42 2,-42 4,-34 C6,-22 5,-14 0,-14Z"
          fill="#f5f0e8" opacity="0.95"
        />

        {/* FRONT PAWS — white, resting at bottom */}
        <ellipse cx="-12" cy="-3" rx="9" ry="5.5" fill="#111111" />
        <ellipse cx=" 12" cy="-3" rx="9" ry="5.5" fill="#111111" />
        {/* White paw tops */}
        <ellipse cx="-12" cy="-3" rx="7"  ry="4" fill="#f0ece0" opacity="0.9" />
        <ellipse cx=" 12" cy="-3" rx="7"  ry="4" fill="#f0ece0" opacity="0.9" />

        {/* HEAD — slightly narrower than wide, sits close to body */}
        <ellipse cx="0" cy="-72" rx="19" ry="18" fill="#111111" />

        {/* EARS — tall and pointy, signature feature */}
        {/* Left ear */}
        <polygon points="-19,-82  -26,-108  -7,-86" fill="#111111" />
        {/* Right ear */}
        <polygon points=" 19,-82   26,-108   7,-86" fill="#111111" />
        {/* Inner ear — pinkish */}
        <polygon points="-18,-84  -23,-104  -9,-88"  fill="#cc8880" opacity="0.5" />
        <polygon points=" 18,-84   23,-104   9,-88"  fill="#cc8880" opacity="0.5" />

        {/* GREEN EYES — almond shaped, slightly narrowed (judgy) */}
        {/* Left eye */}
        <ellipse cx="-8" cy="-72" rx="5.5" ry="4" fill="url(#eyeGlow)" />
        <ellipse cx="-8" cy="-72" rx="2.5" ry="3.5" fill="#1a2a10" />
        <circle  cx="-7" cy="-73" r="1"   fill="white" opacity="0.7" />
        {/* Right eye */}
        <ellipse cx=" 8" cy="-72" rx="5.5" ry="4" fill="url(#eyeGlow)" />
        <ellipse cx=" 8" cy="-72" rx="2.5" ry="3.5" fill="#1a2a10" />
        <circle  cx=" 9" cy="-73" r="1"   fill="white" opacity="0.7" />
        {/* Eyelid — slightly lowered for judgy look */}
        <path d="M-13.5,-73 Q-8,-70 -2.5,-73" stroke="#111111" strokeWidth="1.5" fill="none" opacity="0.5" />
        <path d="M  2.5,-73 Q 8,-70  13.5,-73" stroke="#111111" strokeWidth="1.5" fill="none" opacity="0.5" />

        {/* WHITE MUSTACHE PATCH — the signature marking, under nose */}
        <ellipse cx="0" cy="-60" rx="7" ry="5.5" fill="#f0ece0" opacity="0.95" />
        {/* Chin white */}
        <ellipse cx="0" cy="-55" rx="5" ry="3.5" fill="#f0ece0" opacity="0.9" />

        {/* NOSE — small, dark pink */}
        <path d="M-2.5,-63 L0,-61 L2.5,-63 Q0,-65.5 -2.5,-63Z" fill="#bb6666" opacity="0.85" />

        {/* WHISKERS — long, prominent */}
        <line x1="-7"  y1="-61" x2="-24" y2="-58" stroke="#f0ece0" strokeWidth="0.9" opacity="0.85" />
        <line x1="-7"  y1="-59" x2="-24" y2="-58" stroke="#f0ece0" strokeWidth="0.9" opacity="0.75" />
        <line x1="-7"  y1="-57" x2="-23" y2="-58" stroke="#f0ece0" strokeWidth="0.9" opacity="0.65" />
        <line x1=" 7"  y1="-61" x2=" 24" y2="-58" stroke="#f0ece0" strokeWidth="0.9" opacity="0.85" />
        <line x1=" 7"  y1="-59" x2=" 24" y2="-58" stroke="#f0ece0" strokeWidth="0.9" opacity="0.75" />
        <line x1=" 7"  y1="-57" x2=" 23" y2="-58" stroke="#f0ece0" strokeWidth="0.9" opacity="0.65" />
        {/* Eyebrow whiskers */}
        <line x1="-10" y1="-79" x2="-22" y2="-83" stroke="#f0ece0" strokeWidth="0.7" opacity="0.5" />
        <line x1=" 10" y1="-79" x2=" 22" y2="-83" stroke="#f0ece0" strokeWidth="0.7" opacity="0.5" />

        {/* Small collar tag suggestion */}
        <circle cx="0" cy="-44" r="2.5" fill="var(--amber)" opacity="0.7" />
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
