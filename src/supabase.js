import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// All of Ren's Journal data lives in the "journal" schema of the shared
// reilly.live Supabase project. No .from() calls need to change.
export const supabase = createClient(url, key, { db: { schema: 'journal' } })
