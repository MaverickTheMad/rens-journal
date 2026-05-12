import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase.js'
import { PHASES, FLOW_LEVELS, computeCyclePhase, todayLocalISO, formatDateLong } from '../constants.js'

export default function CalendarTab({ periodStarts, onPeriodStartsChange, refreshKey }) {
  const [monthOffset, setMonthOffset] = useState(0)
  const [days, setDays] = useState([])
  const [symptomCounts, setSymptomCounts] = useState({})
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const viewMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const monthLabel = viewMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })

  const load = useCallback(async () => {
    setLoading(true)
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
    const last = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0)
    const firstStr = toISO(first)
    const lastStr = toISO(last)

    const [dDays, dSym] = await Promise.all([
      supabase.from('cycle_days').select('date,flow,cycle_phase,cycle_phase_override').gte('date', firstStr).lte('date', lastStr),
      supabase.from('symptom_events').select('occurred_at')
        .gte('occurred_at', firstStr + 'T00:00:00')
        .lte('occurred_at', lastStr + 'T23:59:59'),
    ])

    const byDate = {}
    for (const d of dDays.data || []) byDate[d.date] = d
    setDays(byDate)

    const sCounts = {}
    for (const ev of dSym.data || []) {
      const d = ev.occurred_at.slice(0, 10)
      sCounts[d] = (sCounts[d] || 0) + 1
    }
    setSymptomCounts(sCounts)
    setLoading(false)
  }, [monthOffset])

  useEffect(() => { load() }, [load, refreshKey])

  const cells = buildMonthCells(viewMonth)
  const today = todayLocalISO()

  return (
    <div className="calendar-tab stack">
      <div className="card">
        <div className="month-nav">
          <button className="btn btn-ghost btn-sm" onClick={() => setMonthOffset(o => o - 1)}>‹</button>
          <h3 className="card-title month-title">{monthLabel}</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => setMonthOffset(o => o + 1)} disabled={monthOffset >= 0}>›</button>
        </div>

        <div className="weekdays">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="weekday">{d}</div>
          ))}
        </div>

        <div className="month-grid">
          {cells.map((cell, idx) => {
            if (!cell) return <div key={idx} className="cell cell-empty" />
            const dStr = toISO(cell)
            const dayData = days[dStr]
            const phase = dayData?.cycle_phase || computeCyclePhase(dStr, periodStarts)
            const flow = dayData?.flow || 'none'
            const flowMeta = FLOW_LEVELS.find(f => f.value === flow)
            const sCount = symptomCounts[dStr] || 0
            const isPeriodStart = periodStarts.includes(dStr)
            const isToday = dStr === today
            const isFuture = dStr > today
            const isSelected = selected === dStr

            return (
              <button
                key={idx}
                className={`cell ${isToday ? 'cell-today' : ''} ${isSelected ? 'cell-selected' : ''} ${isFuture ? 'cell-future' : ''}`}
                onClick={() => setSelected(isSelected ? null : dStr)}
              >
                {phase && (
                  <span className="cell-phase-ring" style={{ borderColor: PHASES[phase].color }} />
                )}
                {flow !== 'none' && (
                  <span className="cell-flow" style={{ background: flowMeta?.color }} />
                )}
                <span className="cell-num">{cell.getDate()}</span>
                {isPeriodStart && <span className="cell-star">★</span>}
                {sCount > 0 && (
                  <span className="cell-symptom-dots">
                    {Array.from({ length: Math.min(sCount, 3) }).map((_, i) => (
                      <span key={i} className="cell-symptom-dot" />
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="legend">
          <div className="legend-group">
            <span className="legend-label">Flow:</span>
            {FLOW_LEVELS.filter(f => f.value !== 'none').map(f => (
              <span key={f.value} className="legend-item">
                <span className="legend-dot" style={{ background: f.color }} />
                {f.label}
              </span>
            ))}
          </div>
          <div className="legend-group">
            <span className="legend-label">Phase:</span>
            {Object.entries(PHASES).map(([k, p]) => (
              <span key={k} className="legend-item">
                <span className="legend-ring" style={{ borderColor: p.color }} />
                {p.label}
              </span>
            ))}
          </div>
          <div className="legend-group">
            <span className="legend-item"><span className="cell-star" style={{ position: 'static' }}>★</span> Period start</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--rose)' }} /> Symptom logged</span>
          </div>
        </div>
      </div>

      {selected && (
        <SelectedDayCard
          date={selected}
          periodStarts={periodStarts}
          onClose={() => setSelected(null)}
          onPeriodStartsChange={() => { onPeriodStartsChange(); load() }}
        />
      )}

      <PeriodHistoryCard periodStarts={periodStarts} onChange={() => { onPeriodStartsChange(); load() }} />

      <style>{`
        .month-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .month-title { font-size: 22px; }
        .weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 6px;
        }
        .weekday {
          text-align: center;
          font-size: 11px;
          color: var(--ink-muted);
          letter-spacing: 0.05em;
          font-weight: 500;
        }
        .month-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }
        .cell {
          aspect-ratio: 1;
          position: relative;
          border-radius: var(--radius-sm);
          background: var(--bg-elevated);
          border: 1px solid transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: var(--ink);
          transition: all 0.15s;
          min-height: 38px;
        }
        .cell:active { transform: scale(0.95); }
        .cell-empty { background: transparent; pointer-events: none; }
        .cell-today { background: var(--rose-bg); font-weight: 600; }
        .cell-selected { border-color: var(--rose); box-shadow: 0 0 0 1px var(--rose); }
        .cell-future { color: var(--ink-muted); opacity: 0.55; }
        .cell-num { position: relative; z-index: 2; }
        .cell-phase-ring {
          position: absolute;
          inset: 3px;
          border-radius: var(--radius-sm);
          border: 1.5px solid;
          pointer-events: none;
        }
        .cell-flow {
          position: absolute;
          bottom: 4px;
          left: 4px;
          right: 4px;
          height: 3px;
          border-radius: var(--radius-pill);
        }
        .cell-star {
          position: absolute;
          top: 1px;
          right: 3px;
          font-size: 10px;
          color: var(--rose-deep);
        }
        .cell-symptom-dots {
          position: absolute;
          bottom: 9px;
          left: 0; right: 0;
          display: flex;
          justify-content: center;
          gap: 2px;
        }
        .cell-symptom-dot {
          width: 3px; height: 3px;
          background: var(--rose);
          border-radius: 50%;
        }
        .legend {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid var(--line-soft);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .legend-group {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          color: var(--ink-soft);
        }
        .legend-label {
          color: var(--ink-muted);
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          font-size: 10px;
        }
        .legend-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .legend-dot {
          width: 10px; height: 4px;
          border-radius: var(--radius-pill);
        }
        .legend-ring {
          width: 10px; height: 10px;
          border-radius: 3px;
          border: 1.5px solid;
        }
      `}</style>
    </div>
  )
}

// ===== SELECTED DAY CARD =====
function SelectedDayCard({ date, periodStarts, onClose, onPeriodStartsChange }) {
  const [day, setDay] = useState(null)
  const [events, setEvents] = useState({ symptoms: [], foods: [], moods: [], waters: [], exercises: [] })
  const isPeriodStart = periodStarts.includes(date)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const start = date + 'T00:00:00'
      const end   = date + 'T23:59:59.999'
      const [d, s, f, m, w, e] = await Promise.all([
        supabase.from('cycle_days').select('*').eq('date', date).maybeSingle(),
        supabase.from('symptom_events').select('*').gte('occurred_at', start).lte('occurred_at', end),
        supabase.from('food_events').select('*').gte('occurred_at', start).lte('occurred_at', end),
        supabase.from('mood_events').select('*').gte('occurred_at', start).lte('occurred_at', end),
        supabase.from('water_events').select('*').gte('occurred_at', start).lte('occurred_at', end),
        supabase.from('exercise_events').select('*').gte('occurred_at', start).lte('occurred_at', end),
      ])
      if (cancelled) return
      setDay(d.data)
      setEvents({
        symptoms: s.data || [], foods: f.data || [], moods: m.data || [],
        waters: w.data || [], exercises: e.data || [],
      })
    })()
    return () => { cancelled = true }
  }, [date])

  const togglePeriodStart = async () => {
    if (isPeriodStart) {
      if (!confirm('Remove this as a period start date?')) return
      await supabase.from('period_starts').delete().eq('start_date', date)
    } else {
      await supabase.from('period_starts').upsert({ start_date: date }, { onConflict: 'start_date' })
    }
    onPeriodStartsChange()
  }

  const phase = day?.cycle_phase || computeCyclePhase(date, periodStarts)
  const totalSym = events.symptoms.length
  const totalFood = events.foods.length

  return (
    <div className="card fade-in">
      <div className="row-between">
        <div>
          <h3 className="card-title" style={{ fontSize: 20 }}>{formatDateLong(date)}</h3>
          {phase && (
            <span className="phase-pill-sm" style={{ background: PHASES[phase].color }}>
              {PHASES[phase].label}
            </span>
          )}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>

      <div className="day-detail-stats">
        <div className="dd-stat">
          <div className="dd-stat-value">{totalSym}</div>
          <div className="dd-stat-label">Symptoms</div>
        </div>
        <div className="dd-stat">
          <div className="dd-stat-value">{totalFood}</div>
          <div className="dd-stat-label">Foods</div>
        </div>
        <div className="dd-stat">
          <div className="dd-stat-value">{day?.flow ? FLOW_LEVELS.find(f => f.value === day.flow)?.label : '—'}</div>
          <div className="dd-stat-label">Flow</div>
        </div>
      </div>

      {day?.notes && (
        <>
          <label className="field-label" style={{ marginTop: 14 }}>Notes</label>
          <p style={{ margin: 0, color: 'var(--ink-soft)', fontStyle: 'italic' }}>{day.notes}</p>
        </>
      )}

      <button
        className="btn btn-secondary btn-full"
        style={{ marginTop: 14 }}
        onClick={togglePeriodStart}
      >
        {isPeriodStart ? '★ Unmark as period start' : '☆ Mark as period start'}
      </button>

      <p className="muted" style={{ fontSize: 12, marginTop: 10, textAlign: 'center' }}>
        Tip: to log or edit details for this day, switch to the Log tab and pick this date.
      </p>

      <style>{`
        .phase-pill-sm {
          display: inline-block;
          padding: 2px 8px;
          border-radius: var(--radius-pill);
          font-size: 10px;
          color: white;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-top: 4px;
        }
        .day-detail-stats {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          margin-top: 14px;
        }
        .dd-stat {
          padding: 12px 6px;
          background: var(--bg-sunken);
          border-radius: var(--radius-sm);
          text-align: center;
        }
        .dd-stat-value {
          font-family: var(--serif);
          font-size: 22px;
          color: var(--ink);
        }
        .dd-stat-label {
          font-size: 10px;
          color: var(--ink-muted);
          margin-top: 2px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  )
}

// ===== PERIOD HISTORY =====
function PeriodHistoryCard({ periodStarts, onChange }) {
  const [open, setOpen] = useState(false)
  const [newDate, setNewDate] = useState('')

  const add = async () => {
    if (!newDate) return
    await supabase.from('period_starts').upsert({ start_date: newDate }, { onConflict: 'start_date' })
    setNewDate('')
    onChange()
  }

  const remove = async (d) => {
    if (!confirm(`Remove ${d}?`)) return
    await supabase.from('period_starts').delete().eq('start_date', d)
    onChange()
  }

  const sorted = [...periodStarts].sort().reverse()

  return (
    <div className="card">
      <button className="row-between" style={{ width: '100%' }} onClick={() => setOpen(o => !o)}>
        <div>
          <div className="card-title" style={{ fontSize: 16 }}>Period history</div>
          <div className="card-subtitle" style={{ marginTop: 2 }}>
            {sorted.length} recorded
          </div>
        </div>
        <span style={{ color: 'var(--ink-muted)' }}>{open ? '⌃' : '⌄'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 14 }}>
          <div className="row" style={{ gap: 8 }}>
            <input
              type="date"
              className="input"
              value={newDate}
              max={todayLocalISO()}
              onChange={e => setNewDate(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" onClick={add} disabled={!newDate}>Add</button>
          </div>
          <div style={{ marginTop: 14 }}>
            {sorted.length === 0 ? (
              <div className="empty">None yet.</div>
            ) : (
              sorted.map(d => (
                <div key={d} className="event-item">
                  <span className="event-time" style={{ minWidth: 'auto' }}>★</span>
                  <div className="event-body">
                    <div className="event-label">{formatDateLong(d)}</div>
                  </div>
                  <button className="event-delete" onClick={() => remove(d)}>×</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ===== UTILITIES =====
function toISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildMonthCells(viewMonth) {
  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
  const last = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0)
  const startWeekday = first.getDay() // 0 = Sun
  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d))
  }
  return cells
}
