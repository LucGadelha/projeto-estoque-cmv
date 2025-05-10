"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import type { Session } from "@supabase/supabase-js"

type SessionContextType = {
  session: Session | null
  loading: boolean
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  loading: true,
})

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return <SessionContext.Provider value={{ session, loading }}>{children}</SessionContext.Provider>
}

export const useSession = () => useContext(SessionContext)
