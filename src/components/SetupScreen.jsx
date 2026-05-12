import { useState } from 'react'
import { supabase } from '../supabase.js'
import { todayLocalISO } from '../constants.js'

export default function SetupScreen({ onComplete }) {
  const [lastPeriod, setLastPeriod] = useState('')
  const [priorPeriod, setPriorPeriod] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const today = todayLocalISO()

  const save = async () => {
    setError('')
    if (!lastPeriod) {
      setError("Please enter at least the most recent period start date.")
      return
    }
    setSaving(true)
    const rows = [{ start_date: lastPeriod }]
    if (priorPeriod && priorPeriod !== lastPeriod) {
      rows.push({ start_date: priorPeriod })
    }
    const { error } = await supabase.from('period_starts').upsert(rows, { onConflict: 'start_date' })
    setSaving(false)
    if (error) {
      setError("Couldn't save — " + error.message)
      return
    }
    onComplete()
  }

  return (
    <div className="setup-screen">
      <div className="setup-card rise">
        <h1 className="setup-title">
          <span className="title-script">Ren's</span>
          <span className="title-roman">Journal</span>
        </h1>
        <p className="setup-lede">
          A quiet place to notice patterns — what your body's doing, what you've eaten, how you feel.
        </p>

        <div className="divider" />

        <p className="setup-prompt">
          To get started, when did your most recent period begin?
        </p>

        <label className="field-label">Most recent period start</label>
        <input
          type="date"
          className="input"
          value={lastPeriod}
          max={today}
          onChange={e => setLastPeriod(e.target.value)}
        />

        <label className="field-label" style={{ marginTop: 16 }}>
          Period before that <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}>(optional — helps estimate cycle length)</span>
        </label>
        <input
          type="date"
          className="input"
          value={priorPeriod}
          max={lastPeriod || today}
          onChange={e => setPriorPeriod(e.target.value)}
        />

        {error && <p className="setup-error">{error}</p>}

        <button
          className="btn btn-primary btn-full"
          style={{ marginTop: 24 }}
          onClick={save}
          disabled={saving || !lastPeriod}
        >
          {saving ? 'Saving…' : 'Begin'}
        </button>

        <p className="setup-footer">
          You can adjust or add more period dates later from the Calendar.
        </p>
      </div>

      <style>{`
        .setup-screen {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
        }
        .setup-card {
          max-width: 440px;
          width: 100%;
          background: var(--bg-elevated);
          border: 1px solid var(--line-soft);
          border-radius: var(--radius-lg);
          padding: 36px 28px;
          box-shadow: var(--shadow-lg);
        }
        .setup-title {
          font-family: var(--serif);
          font-size: 38px;
          line-height: 1.1;
          margin: 0 0 12px;
          display: flex;
          align-items: baseline;
          gap: 12px;
        }
        .setup-lede {
          color: var(--ink-soft);
          font-size: 15px;
          line-height: 1.55;
          margin: 0 0 4px;
        }
        .setup-prompt {
          font-family: var(--serif);
          font-size: 19px;
          color: var(--ink);
          margin: 0 0 18px;
          line-height: 1.4;
        }
        .setup-error {
          color: var(--rose-deep);
          font-size: 13px;
          margin: 12px 0 0;
        }
        .setup-footer {
          font-size: 12px;
          color: var(--ink-muted);
          text-align: center;
          margin: 18px 0 0;
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
