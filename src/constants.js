// ---------- FOOD TAXONOMY ----------
export const FOOD_CATEGORIES = [
  { name: 'Dairy', items: ['Milk', 'Cheese', 'Yogurt', 'Butter', 'Cream', 'Ice cream'] },
  { name: 'Gluten / Grains', items: ['Bread', 'Pasta', 'Cereal', 'Oats', 'Rice', 'Corn'] },
  { name: 'Sugar / Sweets', items: ['Candy', 'Dessert', 'Soda', 'Baked goods', 'Chocolate'] },
  { name: 'Caffeine', items: ['Coffee', 'Black tea', 'Green tea', 'Energy drink'] },
  { name: 'Alcohol', items: ['Wine', 'Beer', 'Liquor', 'Cocktail'] },
  { name: 'Processed / Fast food', items: ['Fast food', 'Frozen meal', 'Chips', 'Deli meat'] },
  { name: 'Spicy', items: ['Hot sauce', 'Peppers', 'Spicy dish'] },
  { name: 'Nightshades', items: ['Tomato', 'Potato', 'Eggplant', 'Bell pepper'] },
  { name: 'High-FODMAP', items: ['Onion', 'Garlic', 'Beans', 'Lentils'] },
  { name: 'Red meat', items: ['Beef', 'Pork', 'Lamb'] },
  { name: 'Seafood', items: ['Fish', 'Shellfish'] },
  { name: 'Cruciferous veg', items: ['Broccoli', 'Cauliflower', 'Cabbage', 'Brussels sprouts'] },
  { name: 'Citrus', items: ['Orange', 'Lemon', 'Grapefruit'] },
  { name: 'Nuts', items: ['Peanut', 'Almond', 'Cashew', 'Walnut'] },
  { name: 'Eggs', items: ['Eggs'] },
  { name: 'Soy', items: ['Tofu', 'Soy sauce', 'Edamame'] },
  { name: 'Artificial sweeteners', items: ['Diet soda', 'Sugar-free'] },
]

// ---------- SYMPTOMS ----------
export const SYMPTOMS = [
  'Cramps', 'Headache', 'Migraine', 'Bloating', 'Nausea', 'Fatigue',
  'Breast tenderness', 'Back pain', 'Joint pain', 'Acne', 'Hot flashes',
  'Dizziness', 'Constipation', 'Diarrhea', 'Gas',
]

// ---------- MOODS ----------
export const MOODS = [
  'Anxious', 'Irritable', 'Sad', 'Happy', 'Energetic',
  'Foggy', 'Sensitive', 'Angry', 'Calm',
]

// ---------- EXERCISE TYPES ----------
export const EXERCISE_TYPES = [
  'Walk', 'Run', 'Yoga', 'Strength', 'Cycling', 'Swim', 'Pilates', 'Other'
]

// ---------- FLOW ----------
export const FLOW_LEVELS = [
  { value: 'none',     label: 'None',     color: 'var(--line)' },
  { value: 'spotting', label: 'Spotting', color: 'var(--flow-spotting)' },
  { value: 'light',    label: 'Light',    color: 'var(--flow-light)' },
  { value: 'medium',   label: 'Medium',   color: 'var(--flow-medium)' },
  { value: 'heavy',    label: 'Heavy',    color: 'var(--flow-heavy)' },
]

// ---------- CYCLE PHASES ----------
// Default 28-day cycle, 5-day period.
// Phase windows (day-of-cycle, 1-indexed):
//   menstrual: 1–5
//   follicular: 6–13
//   ovulation: 14–16
//   luteal: 17–end
export const PHASES = {
  menstrual:  { label: 'Menstrual',  color: '#c0685a' },
  follicular: { label: 'Follicular', color: '#b8945a' },
  ovulation:  { label: 'Ovulation',  color: '#6b7a5a' },
  luteal:     { label: 'Luteal',     color: '#6b4a55' },
}

export function computeCyclePhase(dateStr, periodStarts) {
  // periodStarts: array of date strings, sorted ASC
  if (!periodStarts || periodStarts.length === 0) return null
  const date = new Date(dateStr + 'T00:00:00')
  // Find the most recent start on or before date
  const sorted = [...periodStarts].sort()
  let lastStart = null
  for (const s of sorted) {
    const sd = new Date(s + 'T00:00:00')
    if (sd <= date) lastStart = sd
    else break
  }
  if (!lastStart) return null

  // Day of cycle (1-indexed)
  const dayOfCycle = Math.floor((date - lastStart) / (1000 * 60 * 60 * 24)) + 1

  // Estimate cycle length: avg of recent gaps, or 28
  let cycleLength = 28
  if (sorted.length >= 2) {
    const gaps = []
    for (let i = 1; i < sorted.length; i++) {
      const a = new Date(sorted[i - 1] + 'T00:00:00')
      const b = new Date(sorted[i] + 'T00:00:00')
      gaps.push(Math.round((b - a) / (1000 * 60 * 60 * 24)))
    }
    const recent = gaps.slice(-3) // last 3 cycles
    cycleLength = Math.round(recent.reduce((s, g) => s + g, 0) / recent.length)
    if (cycleLength < 21 || cycleLength > 40) cycleLength = 28 // sanity
  }

  // If we're past expected cycle length, fall back to luteal (late period)
  if (dayOfCycle > cycleLength + 5) return null

  if (dayOfCycle <= 5)  return 'menstrual'
  if (dayOfCycle <= 13) return 'follicular'
  if (dayOfCycle <= 16) return 'ovulation'
  return 'luteal'
}

export function todayLocalISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatTimeLocal(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function formatDateLong(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

export function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// ---------- TIMEZONE-AWARE HELPERS ----------
// `dateStr` here is always a local-time YYYY-MM-DD.
// `localDayBounds` returns the start/end of that local day expressed as UTC
// ISO strings — used for filtering timestamptz columns in Supabase queries.
// Without this, late-evening events get pushed to the next UTC day and
// show up under the wrong calendar date.
export function localDayBounds(dateStr) {
  const startLocal = new Date(dateStr + 'T00:00:00')
  const endLocal   = new Date(dateStr + 'T23:59:59.999')
  return {
    startISO: startLocal.toISOString(),
    endISO:   endLocal.toISOString(),
  }
}

// Given a UTC ISO timestamp from the DB, return the YYYY-MM-DD it falls on
// in the user's local timezone. Used for bucketing events by day.
export function isoToLocalDateStr(iso) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
