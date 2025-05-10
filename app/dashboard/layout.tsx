"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, ShoppingCart, Users, Settings, BarChart, Menu, LogOut, Receipt } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useSession } from "@/components/providers/session-provider"

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Estoque",
    href: "/dashboard/estoque",
    icon: Package,
  },
  {
    title: "Compras",
    href: "/dashboard/compras",
    icon: ShoppingCart,
  },
  {
    title: "Vendas",
    href: "/dashboard/comandas",
    icon: Receipt,
  },
  {
    title: "Usuários",
    href: "/dashboard/usuarios",
    icon: Users,
  },
  {
    title: "Relatórios",
    href: "/dashboard/relatorios",
    icon: BarChart,
  },
  {
    title: "Configurações",
    href: "/dashboard/configuracoes",
    icon: Settings,
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { session, signOut } = useSession()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Mobile Navigation */}
      <div className="flex h-16 items-center gap-4 border-b bg-background px-4 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col">
            <nav className="grid gap-2 text-lg font-medium">
              {navItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                    pathname === item.href ? "bg-accent" : "hover:bg-accent"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.title}
                </Link>
              ))}
            </nav>
            <div className="mt-auto">
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => signOut()}>
                <LogOut className="h-5 w-5" />
                Sair
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Estoque Restaurante</h1>
        </div>
      </div>

      <div className="flex flex-1 md:grid md:grid-cols-[240px_1fr]">
        {/* Desktop Navigation */}
        <aside className="hidden border-r bg-background md:block">
          <nav className="grid gap-2 p-4 text-sm">
            {navItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                  pathname === item.href ? "bg-accent" : "hover:bg-accent"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.title}
              </Link>
            ))}
          </nav>
          <div className="mt-auto p-4">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => signOut()}>
              <LogOut className="h-5 w-5" />
              Sair
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  )
}
