import { LoginForm } from "@/components/login-form"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export default async function Home() {
  // Verificar se o usuário já está autenticado
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Se estiver autenticado, redirecionar para o dashboard
  if (session) {
    redirect("/dashboard")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  )
}
