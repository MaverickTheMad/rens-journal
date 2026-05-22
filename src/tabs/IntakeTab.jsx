import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase.js'
import {
  FOOD_CATEGORIES, SYMPTOMS, MOODS, EXERCISE_TYPES, FLOW_LEVELS,
  PHASES, computeCyclePhase, todayLocalISO, formatTimeLocal, formatDateLong,
  localDayBounds,
} from '../constants.js'
import TimePicker from '../components/TimePicker.jsx'

export default function IntakeTab({ periodStarts, onChange, refreshKey }) {
  const [date, setDate] = useState(todayLocalISO())
  const [day, setDay] = useState(null)            // cycle_days row
  const [symptoms, setSymptoms] = useState([])
  const [foods, setFoods]       = useState([])
  const [moods, setMoods]       = useState([])
  const [waters, setWaters]     = useState([])
  const [exercises, setExercises] = useState([])
  const [loading, setLoading]   = useState(true)

  // Active "add" panel: null | 'symptom' | 'food' | 'mood' | 'water' | 'exercise'
  const [adding, setAdding] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { startISO: start, endISO: end } = localDayBounds(date)

    const [d, s, f, m, w, e] = await Promise.all([
      supabase.from('cycle_days').select('*').eq('date', date).maybeSingle(),
      supabase.from('symptom_events').select('*').gte('occurred_at', start).lte('occurred_at', end).order('occurred_at', { ascending: true }),
      supabase.from('food_events').select('*').gte('occurred_at', start).lte('occurred_at', end).order('occurred_at', { ascending: true }),
      supabase.from('mood_events').select('*').gte('occurred_at', start).lte('occurred_at', end).order('occurred_at', { ascending: true }),
      supabase.from('water_events').select('*').gte('occurred_at', start).lte('occurred_at', end).order('occurred_at', { ascending: true }),
      supabase.from('exercise_events').select('*').gte('occurred_at', start).lte('occurred_at', end).order('occurred_at', { ascending: true }),
    ])

    setDay(d.data || null)
    setSymptoms(s.data || [])
    setFoods(f.data || [])
    setMoods(m.data || [])
    setWaters(w.data || [])
    setExercises(e.data || [])
    setLoading(false)
  }, [date])

  useEffect(() => { load() }, [load, refreshKey])

  // ---- Day-level updates (flow, sleep, notes) ----
  const updateDay = async (patch) => {
    const computedPhase = computeCyclePhase(date, periodStarts)
    const base = {
      date,
      cycle_phase: day?.cycle_phase_override ? day.cycle_phase : computedPhase,
      cycle_phase_override: day?.cycle_phase_override || false,
      ...day,
      ...patch,
      updated_at: new Date().toISOString(),
    }
    delete base.created_at
    const { data, error } = await supabase
      .from('cycle_days')
      .upsert(base, { onConflict: 'date' })
      .select()
      .single()
    if (error) { console.error(error); return }
    setDay(data)
    onChange?.()
  }

  const totalWater = waters.reduce((s, w) => s + (w.amount_oz || 0), 0)
  const totalExercise = exercises.reduce((s, ex) => s + (ex.duration_minutes || 0), 0)

  const computedPhase = computeCyclePhase(date, periodStarts)
  const activePhase = day?.cycle_phase || computedPhase

  return (
    <div className="intake-tab stack">

      {/* DATE NAV */}
      <div className="date-nav card">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setDate(shiftDate(date, -1))}
          aria-label="Previous day"
        >‹</button>
        <div className="date-nav-center">
          <input
            type="date"
            className="date-input"
            value={date}
            max={todayLocalISO()}
            onChange={e => setDate(e.target.value)}
          />
          <div className="date-nav-label">{formatDateLong(date)}</div>
          {activePhase && (
            <span className="phase-pill" style={{ background: PHASES[activePhase].color }}>
              {PHASES[activePhase].label}
              {day?.cycle_phase_override && <span style={{ opacity: 0.7, marginLeft: 4 }}>·edited</span>}
            </span>
          )}
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            const next = shiftDate(date, 1)
            if (next <= todayLocalISO()) setDate(next)
          }}
          disabled={date >= todayLocalISO()}
          aria-label="Next day"
        >›</button>
      </div>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : (
        <>
          {/* FLOW */}
          <FlowCard day={day} updateDay={updateDay} />

          {/* QUICK ADD ROW */}
          <div className="quick-add-row">
            <QuickAddBtn label="Symptom"  onClick={() => setAdding(adding === 'symptom'  ? null : 'symptom')}  active={adding === 'symptom'} />
            <QuickAddBtn label="Food"     onClick={() => setAdding(adding === 'food'     ? null : 'food')}     active={adding === 'food'} />
            <QuickAddBtn label="Mood"     onClick={() => setAdding(adding === 'mood'     ? null : 'mood')}     active={adding === 'mood'} />
            <QuickAddBtn label="Water"    onClick={() => setAdding(adding === 'water'    ? null : 'water')}    active={adding === 'water'} />
            <QuickAddBtn label="Exercise" onClick={() => setAdding(adding === 'exercise' ? null : 'exercise')} active={adding === 'exercise'} />
          </div>

          {/* ADD PANELS */}
          {adding === 'symptom'  && <AddSymptom  date={date} onDone={() => { setAdding(null); load(); onChange?.() }} />}
          {adding === 'food'     && <AddFood     date={date} onDone={() => { setAdding(null); load(); onChange?.() }} />}
          {adding === 'mood'     && <AddMood     date={date} onDone={() => { setAdding(null); load(); onChange?.() }} />}
          {adding === 'water'    && <AddWater    date={date} onDone={() => { setAdding(null); load(); onChange?.() }} />}
          {adding === 'exercise' && <AddExercise date={date} onDone={() => { setAdding(null); load(); onChange?.() }} />}

          {/* TIMELINE */}
          <Timeline
            symptoms={symptoms}
            foods={foods}
            moods={moods}
            waters={waters}
            exercises={exercises}
            onReload={() => { load(); onChange?.() }}
          />

          {/* DAY SUMMARY: SLEEP + NOTES */}
          <DaySummary day={day} updateDay={updateDay} totalWater={totalWater} totalExercise={totalExercise} />

          {/* PHASE OVERRIDE */}
          <PhaseOverride day={day} updateDay={updateDay} computedPhase={computedPhase} />
        </>
      )}

      <style>{`
        .date-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
        }
        .date-nav-center { text-align: center; flex: 1; }
        .date-input {
          font-family: var(--serif);
          font-size: 16px;
          background: transparent;
          border: none;
          color: var(--ink-soft);
          text-align: center;
          width: 100%;
          padding: 2px;
        }
        .date-input::-webkit-calendar-picker-indicator { opacity: 0.4; }
        .date-nav-label {
          font-family: var(--serif);
          font-size: 18px;
          color: var(--ink);
          margin-top: 2px;
        }
        .phase-pill {
          display: inline-block;
          padding: 3px 10px;
          border-radius: var(--radius-pill);
          font-size: 11px;
          color: white;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-top: 6px;
        }
        .quick-add-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
        }
        .quick-add-btn {
          padding: 14px 4px;
          border-radius: var(--radius);
          background: var(--bg-elevated);
          border: 1px solid var(--line-soft);
          color: var(--ink-soft);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          transition: all 0.15s;
          box-shadow: var(--shadow-sm);
        }
        .quick-add-btn:active { transform: scale(0.97); }
        .quick-add-btn-active {
          background: var(--rose);
          color: white;
          border-color: var(--rose);
        }
      `}</style>
    </div>
  )
}

function QuickAddBtn({ label, onClick, active }) {
  return (
    <button className={`quick-add-btn ${active ? 'quick-add-btn-active' : ''}`} onClick={onClick}>
      {active ? '✕' : '+'} {label}
    </button>
  )
}

function shiftDate(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ============ FLOW CARD ============
function FlowCard({ day, updateDay }) {
  const current = day?.flow || 'none'
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Flow</h3>
      </div>
      <div className="chip-group">
        {FLOW_LEVELS.map(f => (
          <button
            key={f.value}
            className={`flow-chip ${current === f.value ? 'flow-chip-selected' : ''}`}
            onClick={() => updateDay({ flow: f.value })}
          >
            <span className="flow-dot" style={{ background: f.color }} />
            {f.label}
          </button>
        ))}
      </div>
      <style>{`
        .flow-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: var(--radius-pill);
          background: var(--bg-sunken);
          color: var(--ink-soft);
          font-size: 14px;
          border: 1px solid transparent;
          font-weight: 500;
        }
        .flow-chip-selected {
          background: var(--rose-bg);
          color: var(--rose-deep);
          border-color: var(--rose-soft);
        }
        .flow-dot {
          width: 12px; height: 12px;
          border-radius: 50%;
          border: 1px solid rgba(0,0,0,0.05);
        }
      `}</style>
    </div>
  )
}

// ============ ADD SYMPTOM ============
function AddSymptom({ date, onDone }) {
  const [selected, setSelected] = useState([])  // array of symptom strings
  const [severity, setSeverity] = useState(3)
  const [time, setTime] = useState(new Date().toISOString())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const toggle = (s) => setSelected(prev =>
    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
  )

  const save = async () => {
    if (selected.length === 0) return
    setSaving(true)
    const occurred_at = adjustToDate(time, date)
    const rows = selected.map(symptom => ({
      occurred_at, symptom, severity, notes: notes || null,
    }))
    const { error } = await supabase.from('symptom_events').insert(rows)
    if (error) { setSaving(false); alert(error.message); return }
    onDone()
  }

  return (
    <div className="card add-panel rise">
      <div className="card-header">
        <h3 className="card-title">Log symptoms</h3>
        {selected.length > 0 && (
          <span className="selected-count">{selected.length} selected</span>
        )}
      </div>

      <label className="field-label">What <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}>(tap all that apply)</span></label>
      <div className="chip-group">
        {SYMPTOMS.map(s => (
          <button key={s} className={`chip ${selected.includes(s) ? 'chip-selected' : ''}`} onClick={() => toggle(s)}>
            {s}
          </button>
        ))}
      </div>

      <label className="field-label" style={{ marginTop: 16 }}>Severity (1–5) <span className="required">*</span></label>
      <SeverityPicker value={severity} onChange={setSeverity} />

      <label className="field-label" style={{ marginTop: 16 }}>When</label>
      <TimePicker value={time} onChange={setTime} />

      <label className="field-label" style={{ marginTop: 16 }}>Notes (optional)</label>
      <textarea className="textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. came on suddenly, dull ache…" />

      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button>
        <button className="btn btn-primary btn-full" onClick={save} disabled={selected.length === 0 || saving}>
          {saving ? 'Saving…' : selected.length > 1 ? `Save ${selected.length} symptoms` : 'Save symptom'}
        </button>
      </div>

      <style>{`
        .required { color: var(--rose); }
        .selected-count {
          font-size: 12px;
          font-weight: 600;
          color: var(--rose-deep);
          background: var(--rose-bg);
          padding: 3px 10px;
          border-radius: var(--radius-pill);
        }
      `}</style>
    </div>
  )
}

function SeverityPicker({ value, onChange }) {
  return (
    <div className="severity-picker">
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          className={`sev-btn ${value === n ? 'sev-btn-active' : ''}`}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
      <span className="sev-label">
        {['Barely', 'Mild', 'Moderate', 'Strong', 'Severe'][value - 1]}
      </span>
      <style>{`
        .severity-picker {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .sev-btn {
          width: 42px; height: 42px;
          border-radius: 50%;
          background: var(--bg-sunken);
          color: var(--ink-soft);
          font-size: 16px;
          font-weight: 500;
          border: 1px solid transparent;
        }
        .sev-btn-active {
          background: var(--rose);
          color: white;
          border-color: var(--rose-deep);
        }
        .sev-label {
          margin-left: 6px;
          font-size: 14px;
          color: var(--ink-soft);
          font-style: italic;
        }
      `}</style>
    </div>
  )
}

// ============ ADD FOOD ============
function AddFood({ date, onDone }) {
  const [category, setCategory] = useState(null)
  // basket: array of { category, item }
  const [basket, setBasket] = useState([])
  const [time, setTime] = useState(new Date().toISOString())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const toggleItem = (cat, item) => {
    setBasket(prev => {
      const exists = prev.find(b => b.category === cat && b.item === item)
      if (exists) return prev.filter(b => !(b.category === cat && b.item === item))
      return [...prev, { category: cat, item }]
    })
  }

  const isSelected = (cat, item) => basket.some(b => b.category === cat && b.item === item)

  const save = async () => {
    if (basket.length === 0) return
    setSaving(true)
    const occurred_at = adjustToDate(time, date)
    const rows = basket.map(({ category, item }) => ({
      occurred_at, category, item, notes: notes || null,
    }))
    const { error } = await supabase.from('food_events').insert(rows)
    if (error) { setSaving(false); alert(error.message); return }
    onDone()
  }

  const cat = FOOD_CATEGORIES.find(c => c.name === category)

  return (
    <div className="card add-panel rise">
      <div className="card-header">
        <h3 className="card-title">Log food</h3>
        {basket.length > 0 && (
          <span className="selected-count">{basket.length} item{basket.length > 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Basket summary */}
      {basket.length > 0 && (
        <div className="basket">
          {basket.map(b => (
            <span key={b.category + b.item} className="basket-chip">
              {b.item}
              <button className="basket-remove" onClick={() => toggleItem(b.category, b.item)}>×</button>
            </span>
          ))}
        </div>
      )}

      <label className="field-label" style={{ marginTop: basket.length > 0 ? 12 : 0 }}>Category</label>
      <div className="chip-group">
        {FOOD_CATEGORIES.map(c => {
          const hasSelected = basket.some(b => b.category === c.name)
          return (
            <button
              key={c.name}
              className={`chip ${category === c.name ? 'chip-selected' : ''}`}
              onClick={() => setCategory(category === c.name ? null : c.name)}
              style={hasSelected && category !== c.name ? { borderColor: 'var(--rose-soft)', color: 'var(--rose-deep)' } : {}}
            >
              {c.name}{hasSelected ? ` ·${basket.filter(b => b.category === c.name).length}` : ''}
            </button>
          )
        })}
      </div>

      {cat && (
        <>
          <label className="field-label" style={{ marginTop: 16 }}>
            {cat.name} <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}>(tap all that apply)</span>
          </label>
          <div className="chip-group">
            {cat.items.map(i => (
              <button
                key={i}
                className={`chip ${isSelected(cat.name, i) ? 'chip-selected' : ''}`}
                onClick={() => toggleItem(cat.name, i)}
              >
                {i}
              </button>
            ))}
          </div>
        </>
      )}

      <label className="field-label" style={{ marginTop: 16 }}>When</label>
      <TimePicker value={time} onChange={setTime} />

      <label className="field-label" style={{ marginTop: 16 }}>Notes (optional)</label>
      <textarea className="textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. big portion, post-workout…" />

      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button>
        <button className="btn btn-primary btn-full" onClick={save} disabled={basket.length === 0 || saving}>
          {saving ? 'Saving…' : basket.length > 1 ? `Save ${basket.length} foods` : 'Save food'}
        </button>
      </div>

      <style>{`
        .basket {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 10px 12px;
          background: var(--rose-bg);
          border-radius: var(--radius-sm);
          margin-bottom: 4px;
        }
        .basket-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          background: var(--bg-elevated);
          border: 1px solid var(--rose-soft);
          border-radius: var(--radius-pill);
          font-size: 13px;
          color: var(--rose-deep);
          font-weight: 500;
        }
        .basket-remove {
          font-size: 14px;
          color: var(--rose-soft);
          line-height: 1;
        }
        .basket-remove:hover { color: var(--rose-deep); }
      `}</style>
    </div>
  )
}

// ============ ADD MOOD ============
function AddMood({ date, onDone }) {
  const [selected, setSelected] = useState([])
  const [time, setTime] = useState(new Date().toISOString())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const toggle = (m) => setSelected(prev =>
    prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
  )

  const save = async () => {
    if (selected.length === 0) return
    setSaving(true)
    const occurred_at = adjustToDate(time, date)
    const rows = selected.map(mood => ({
      occurred_at, mood, notes: notes || null,
    }))
    const { error } = await supabase.from('mood_events').insert(rows)
    if (error) { setSaving(false); alert(error.message); return }
    onDone()
  }

  return (
    <div className="card add-panel rise">
      <div className="card-header">
        <h3 className="card-title">Log mood</h3>
        {selected.length > 0 && (
          <span className="selected-count">{selected.length} selected</span>
        )}
      </div>
      <label className="field-label">How are you feeling? <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}>(tap all that apply)</span></label>
      <div className="chip-group">
        {MOODS.map(m => (
          <button key={m} className={`chip ${selected.includes(m) ? 'chip-selected' : ''}`} onClick={() => toggle(m)}>
            {m}
          </button>
        ))}
      </div>
      <label className="field-label" style={{ marginTop: 16 }}>When</label>
      <TimePicker value={time} onChange={setTime} />
      <label className="field-label" style={{ marginTop: 16 }}>Notes (optional)</label>
      <textarea className="textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button>
        <button className="btn btn-primary btn-full" onClick={save} disabled={selected.length === 0 || saving}>
          {saving ? 'Saving…' : selected.length > 1 ? `Save ${selected.length} moods` : 'Save mood'}
        </button>
      </div>
    </div>
  )
}

// ============ ADD WATER ============
function AddWater({ date, onDone }) {
  const [amount, setAmount] = useState(8)
  const [time, setTime] = useState(new Date().toISOString())
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const occurred_at = adjustToDate(time, date)
    const { error } = await supabase.from('water_events').insert({
      occurred_at, amount_oz: amount,
    })
    if (error) { setSaving(false); alert(error.message); return }
    onDone()
  }

  return (
    <div className="card add-panel rise">
      <div className="card-header"><h3 className="card-title">Log water</h3></div>
      <label className="field-label">Amount (oz)</label>
      <div className="chip-group">
        {[4, 8, 12, 16, 20, 32].map(n => (
          <button key={n} className={`chip ${amount === n ? 'chip-selected' : ''}`} onClick={() => setAmount(n)}>
            {n} oz
          </button>
        ))}
      </div>
      <label className="field-label" style={{ marginTop: 16 }}>When</label>
      <TimePicker value={time} onChange={setTime} />
      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button>
        <button className="btn btn-primary btn-full" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : `Save ${amount} oz`}
        </button>
      </div>
    </div>
  )
}

// ============ ADD EXERCISE ============
function AddExercise({ date, onDone }) {
  const [type, setType] = useState(null)
  const [duration, setDuration] = useState(30)
  const [time, setTime] = useState(new Date().toISOString())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!type) return
    setSaving(true)
    const occurred_at = adjustToDate(time, date)
    const { error } = await supabase.from('exercise_events').insert({
      occurred_at, exercise_type: type, duration_minutes: duration, notes: notes || null,
    })
    if (error) { setSaving(false); alert(error.message); return }
    onDone()
  }

  return (
    <div className="card add-panel rise">
      <div className="card-header"><h3 className="card-title">Log exercise</h3></div>
      <label className="field-label">Type</label>
      <div className="chip-group">
        {EXERCISE_TYPES.map(t => (
          <button key={t} className={`chip ${type === t ? 'chip-selected' : ''}`} onClick={() => setType(t)}>
            {t}
          </button>
        ))}
      </div>
      <label className="field-label" style={{ marginTop: 16 }}>Duration (min)</label>
      <div className="chip-group">
        {[10, 20, 30, 45, 60, 90].map(d => (
          <button key={d} className={`chip ${duration === d ? 'chip-selected' : ''}`} onClick={() => setDuration(d)}>
            {d} min
          </button>
        ))}
      </div>
      <label className="field-label" style={{ marginTop: 16 }}>When</label>
      <TimePicker value={time} onChange={setTime} />
      <label className="field-label" style={{ marginTop: 16 }}>Notes (optional)</label>
      <textarea className="textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button>
        <button className="btn btn-primary btn-full" onClick={save} disabled={!type || saving}>
          {saving ? 'Saving…' : 'Save exercise'}
        </button>
      </div>
    </div>
  )
}

// ============ TIMELINE ============
function Timeline({ symptoms, foods, moods, waters, exercises, onReload }) {
  const [editing, setEditing] = useState(null) // { kind, id }

  const events = [
    ...symptoms.map(e => ({ ...e, kind: 'symptom' })),
    ...foods.map(e => ({ ...e, kind: 'food' })),
    ...moods.map(e => ({ ...e, kind: 'mood' })),
    ...waters.map(e => ({ ...e, kind: 'water' })),
    ...exercises.map(e => ({ ...e, kind: 'exercise' })),
  ].sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at))

  const deleteEvent = async (kind, id) => {
    const table = {
      symptom: 'symptom_events', food: 'food_events', mood: 'mood_events',
      water: 'water_events', exercise: 'exercise_events',
    }[kind]
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) { alert(error.message); return }
    onReload()
  }

  const isEditing = (kind, id) => editing?.kind === kind && editing?.id === id

  if (events.length === 0) {
    return (
      <div className="card">
        <div className="empty">Nothing logged yet today.</div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Today's log</h3>
        <span className="card-subtitle">{events.length} entries</span>
      </div>
      <div>
        {events.map(ev => (
          <div key={ev.kind + ev.id}>
            <div className="event-item">
              <span className="event-time">{formatTimeLocal(ev.occurred_at)}</span>
              <div className="event-body">
                <EventBody ev={ev} />
              </div>
              <div className="event-actions">
                <button
                  className="event-edit"
                  onClick={() => setEditing(isEditing(ev.kind, ev.id) ? null : { kind: ev.kind, id: ev.id })}
                  aria-label="Edit"
                >✎</button>
                <button
                  className="event-delete"
                  onClick={() => deleteEvent(ev.kind, ev.id)}
                  aria-label="Delete"
                >×</button>
              </div>
            </div>
            {isEditing(ev.kind, ev.id) && (
              <EditEvent
                ev={ev}
                onDone={() => { setEditing(null); onReload() }}
                onCancel={() => setEditing(null)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function EventBody({ ev }) {
  if (ev.kind === 'symptom') {
    return (
      <>
        <div className="event-label">
          <span className="event-tag tag-symptom">Symptom</span>
          {ev.symptom}
        </div>
        <div className="event-meta">
          <SeverityDots n={ev.severity} />
          {ev.notes && <span style={{ marginLeft: 8 }}>· {ev.notes}</span>}
        </div>
        <style>{eventTagStyle}</style>
      </>
    )
  }
  if (ev.kind === 'food') {
    return (
      <>
        <div className="event-label">
          <span className="event-tag tag-food">Food</span>
          {ev.item} <span className="muted">· {ev.category}</span>
        </div>
        {ev.notes && <div className="event-meta">{ev.notes}</div>}
        <style>{eventTagStyle}</style>
      </>
    )
  }
  if (ev.kind === 'mood') {
    return (
      <>
        <div className="event-label">
          <span className="event-tag tag-mood">Mood</span>
          {ev.mood}
        </div>
        {ev.notes && <div className="event-meta">{ev.notes}</div>}
        <style>{eventTagStyle}</style>
      </>
    )
  }
  if (ev.kind === 'water') {
    return (
      <>
        <div className="event-label">
          <span className="event-tag tag-water">Water</span>
          {ev.amount_oz} oz
        </div>
        <style>{eventTagStyle}</style>
      </>
    )
  }
  if (ev.kind === 'exercise') {
    return (
      <>
        <div className="event-label">
          <span className="event-tag tag-exercise">Exercise</span>
          {ev.exercise_type} · {ev.duration_minutes} min
        </div>
        {ev.notes && <div className="event-meta">{ev.notes}</div>}
        <style>{eventTagStyle}</style>
      </>
    )
  }
  return null
}

const eventTagStyle = `
  .event-tag {
    display: inline-block;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 2px 7px;
    border-radius: var(--radius-pill);
    margin-right: 8px;
    vertical-align: 2px;
  }
  .tag-symptom  { background: #f4dcd3; color: #8e3d31; }
  .tag-food     { background: #ede4d0; color: #806527; }
  .tag-mood     { background: #e4dae6; color: #6b4a55; }
  .tag-water    { background: #d9e6ee; color: #3d5e72; }
  .tag-exercise { background: #dfe5d6; color: #4f6238; }
`

// ============ EDIT EVENT ============
function EditEvent({ ev, onDone, onCancel }) {
  const table = {
    symptom: 'symptom_events', food: 'food_events', mood: 'mood_events',
    water: 'water_events', exercise: 'exercise_events',
  }[ev.kind]

  const [time, setTime] = useState(ev.occurred_at)
  const [notes, setNotes] = useState(ev.notes || '')
  const [saving, setSaving] = useState(false)

  // Kind-specific fields
  const [symptom, setSymptom] = useState(ev.symptom || null)
  const [severity, setSeverity] = useState(ev.severity || 3)
  const [category, setCategory] = useState(ev.category || null)
  const [item, setItem] = useState(ev.item || null)
  const [mood, setMood] = useState(ev.mood || null)
  const [amount, setAmount] = useState(ev.amount_oz || 8)
  const [exerciseType, setExerciseType] = useState(ev.exercise_type || null)
  const [duration, setDuration] = useState(ev.duration_minutes || 30)

  const save = async () => {
    setSaving(true)
    let patch = { occurred_at: time, notes: notes || null }
    if (ev.kind === 'symptom') patch = { ...patch, symptom, severity }
    if (ev.kind === 'food')    patch = { ...patch, category, item }
    if (ev.kind === 'mood')    patch = { ...patch, mood }
    if (ev.kind === 'water')   patch = { occurred_at: time, amount_oz: amount }
    if (ev.kind === 'exercise') patch = { ...patch, exercise_type: exerciseType, duration_minutes: duration }
    const { error } = await supabase.from(table).update(patch).eq('id', ev.id)
    if (error) { setSaving(false); alert(error.message); return }
    onDone()
  }

  const catItems = FOOD_CATEGORIES.find(c => c.name === category)?.items || []

  return (
    <div className="edit-panel rise">
      <div className="edit-panel-header">
        <span className="edit-panel-title">Edit {ev.kind}</span>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>

      {ev.kind === 'symptom' && (
        <>
          <label className="field-label">Symptom</label>
          <div className="chip-group" style={{ marginBottom: 12 }}>
            {SYMPTOMS.map(s => (
              <button key={s} className={`chip chip-sm ${symptom === s ? 'chip-selected' : ''}`} onClick={() => setSymptom(s)}>{s}</button>
            ))}
          </div>
          <label className="field-label">Severity</label>
          <SeverityPicker value={severity} onChange={setSeverity} />
        </>
      )}

      {ev.kind === 'food' && (
        <>
          <label className="field-label">Category</label>
          <div className="chip-group" style={{ marginBottom: 12 }}>
            {FOOD_CATEGORIES.map(c => (
              <button key={c.name} className={`chip chip-sm ${category === c.name ? 'chip-selected' : ''}`} onClick={() => { setCategory(c.name); setItem(null) }}>{c.name}</button>
            ))}
          </div>
          {catItems.length > 0 && (
            <>
              <label className="field-label">Item</label>
              <div className="chip-group" style={{ marginBottom: 12 }}>
                {catItems.map(i => (
                  <button key={i} className={`chip chip-sm ${item === i ? 'chip-selected' : ''}`} onClick={() => setItem(i)}>{i}</button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {ev.kind === 'mood' && (
        <>
          <label className="field-label">Mood</label>
          <div className="chip-group" style={{ marginBottom: 12 }}>
            {MOODS.map(m => (
              <button key={m} className={`chip chip-sm ${mood === m ? 'chip-selected' : ''}`} onClick={() => setMood(m)}>{m}</button>
            ))}
          </div>
        </>
      )}

      {ev.kind === 'water' && (
        <>
          <label className="field-label">Amount (oz)</label>
          <div className="chip-group" style={{ marginBottom: 12 }}>
            {[4, 8, 12, 16, 20, 32].map(n => (
              <button key={n} className={`chip chip-sm ${amount === n ? 'chip-selected' : ''}`} onClick={() => setAmount(n)}>{n} oz</button>
            ))}
          </div>
        </>
      )}

      {ev.kind === 'exercise' && (
        <>
          <label className="field-label">Type</label>
          <div className="chip-group" style={{ marginBottom: 12 }}>
            {EXERCISE_TYPES.map(t => (
              <button key={t} className={`chip chip-sm ${exerciseType === t ? 'chip-selected' : ''}`} onClick={() => setExerciseType(t)}>{t}</button>
            ))}
          </div>
          <label className="field-label">Duration (min)</label>
          <div className="chip-group" style={{ marginBottom: 12 }}>
            {[10, 20, 30, 45, 60, 90].map(d => (
              <button key={d} className={`chip chip-sm ${duration === d ? 'chip-selected' : ''}`} onClick={() => setDuration(d)}>{d} min</button>
            ))}
          </div>
        </>
      )}

      {ev.kind !== 'water' && (
        <>
          <label className="field-label" style={{ marginTop: 4 }}>Notes</label>
          <textarea className="textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} style={{ marginBottom: 12 }} />
        </>
      )}

      <label className="field-label">Time</label>
      <TimePicker value={time} onChange={setTime} />

      <button
        className="btn btn-amber btn-full"
        style={{ marginTop: 14 }}
        onClick={save}
        disabled={saving}
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>

      <style>{`
        .edit-panel {
          margin: 0 0 4px;
          padding: 14px 16px 16px;
          background: var(--amber-bg);
          border: 1.5px solid var(--amber-soft);
          border-radius: var(--radius-sm);
        }
        .edit-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .edit-panel-title {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--amber-deep);
        }
      `}</style>
    </div>
  )
}

function SeverityDots({ n }) {
  return (
    <span className="severity-dots">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`severity-dot ${i <= n ? 'severity-dot-on' : ''}`} />
      ))}
    </span>
  )
}

// ============ DAY SUMMARY ============
function DaySummary({ day, updateDay, totalWater, totalExercise }) {
  const [notes, setNotes] = useState(day?.notes || '')
  useEffect(() => { setNotes(day?.notes || '') }, [day?.notes])

  const saveNotes = () => {
    if (notes !== (day?.notes || '')) {
      updateDay({ notes: notes || null })
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Day summary</h3>
      </div>

      <div className="summary-grid">
        <div className="summary-stat">
          <div className="stat-value">{totalWater}<span className="stat-unit">oz</span></div>
          <div className="stat-label">Water</div>
        </div>
        <div className="summary-stat">
          <div className="stat-value">{totalExercise}<span className="stat-unit">min</span></div>
          <div className="stat-label">Exercise</div>
        </div>
        <div className="summary-stat">
          <input
            type="number"
            step="0.5"
            min="0"
            max="14"
            placeholder="—"
            className="stat-input"
            value={day?.sleep_hours ?? ''}
            onChange={e => updateDay({ sleep_hours: e.target.value === '' ? null : Number(e.target.value) })}
          />
          <div className="stat-label">Sleep (hrs)</div>
        </div>
      </div>

      <label className="field-label" style={{ marginTop: 16 }}>Notes for the day</label>
      <textarea
        className="textarea"
        rows={3}
        placeholder="Anything else worth remembering…"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onBlur={saveNotes}
      />

      <style>{`
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }
        .summary-stat {
          padding: 14px 10px;
          background: var(--bg-sunken);
          border-radius: var(--radius-sm);
          text-align: center;
        }
        .stat-value {
          font-family: var(--serif);
          font-size: 26px;
          color: var(--ink);
          line-height: 1;
        }
        .stat-unit {
          font-size: 14px;
          color: var(--ink-muted);
          margin-left: 3px;
        }
        .stat-input {
          font-family: var(--serif);
          font-size: 22px;
          color: var(--ink);
          background: transparent;
          border: none;
          width: 100%;
          text-align: center;
          padding: 2px 0;
        }
        .stat-input:focus { outline: none; }
        .stat-label {
          font-size: 11px;
          color: var(--ink-muted);
          margin-top: 4px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  )
}

// ============ PHASE OVERRIDE ============
function PhaseOverride({ day, updateDay, computedPhase }) {
  const [open, setOpen] = useState(false)
  const phases = Object.keys(PHASES)

  return (
    <div className="card">
      <button className="row-between" style={{ width: '100%' }} onClick={() => setOpen(o => !o)}>
        <div>
          <div className="card-title" style={{ fontSize: 16 }}>Cycle phase</div>
          <div className="card-subtitle" style={{ marginTop: 2 }}>
            {day?.cycle_phase_override
              ? `Set to ${PHASES[day.cycle_phase]?.label} (edited)`
              : computedPhase
                ? `Auto: ${PHASES[computedPhase].label}`
                : 'Unknown'}
          </div>
        </div>
        <span style={{ color: 'var(--ink-muted)' }}>{open ? '⌃' : '⌄'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 14 }}>
          <label className="field-label">Override phase for this day</label>
          <div className="chip-group">
            {phases.map(p => (
              <button
                key={p}
                className={`chip ${day?.cycle_phase === p && day?.cycle_phase_override ? 'chip-selected' : ''}`}
                onClick={() => updateDay({ cycle_phase: p, cycle_phase_override: true })}
              >
                {PHASES[p].label}
              </button>
            ))}
          </div>
          {day?.cycle_phase_override && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 12 }}
              onClick={() => updateDay({ cycle_phase: computedPhase, cycle_phase_override: false })}
            >
              Reset to auto
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Helper: keep date stable, only change time part
function adjustToDate(iso, dateStr) {
  const t = new Date(iso)
  const target = new Date(dateStr + 'T00:00:00')
  target.setHours(t.getHours(), t.getMinutes(), t.getSeconds(), 0)
  return target.toISOString()
}
