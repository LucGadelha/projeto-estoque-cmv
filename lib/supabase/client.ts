import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Create a singleton Supabase client for the browser
let client: ReturnType<typeof createClient<Database>> | undefined

export const createBrowserSupabaseClient = () => {
  if (client) return client

  client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    },
  )

  return client
}
