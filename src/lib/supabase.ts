import { createClient } from '@supabase/supabase-js'

// Feature flag to toggle backend usage; set to true once env vars are configured
export const USE_SUPABASE = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Single supabase client for the app
export const supabase = USE_SUPABASE
  ? createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    )
  : (null as any)
