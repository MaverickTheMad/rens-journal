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
        <span className="loading-dot" />
      </div>
    )
  }

  if (needsSetup) {
    return <SetupScreen onComplete={handleSetupComplete} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <h1 className="app-title">
            <span className="title-script">Ren's</span>
            <span className="title-roman">Journal</span>
          </h1>
          <p className="app-subtitle">{new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
      </header>

      <main className="app-main">
        {tab === 'intake'   && <IntakeTab periodStarts={periodStarts} onChange={bumpRefresh} refreshKey={refreshKey} />}
        {tab === 'trends'   && <TrendsTab periodStarts={periodStarts} refreshKey={refreshKey} />}
        {tab === 'calendar' && <CalendarTab periodStarts={periodStarts} onPeriodStartsChange={async () => { const s = await loadPeriodStarts(); setPeriodStarts(s); bumpRefresh() }} refreshKey={refreshKey} />}
      </main>

      <nav className="tab-bar safe-bottom">
        <TabButton active={tab === 'intake'}   onClick={() => setTab('intake')}   icon="✎" label="Log" />
        <TabButton active={tab === 'trends'}   onClick={() => setTab('trends')}   icon="◔" label="Trends" />
        <TabButton active={tab === 'calendar'} onClick={() => setTab('calendar')} icon="▦" label="Calendar" />
      </nav>
    </div>
  )
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button className={`tab-btn ${active ? 'tab-btn-active' : ''}`} onClick={onClick}>
      <span className="tab-icon">{icon}</span>
      <span className="tab-label">{label}</span>
    </button>
  )
}
