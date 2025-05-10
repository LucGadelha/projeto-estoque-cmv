"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Package, ChefHat, FileText, Settings, BarChart2, Receipt, ShoppingCart } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMobile } from "@/hooks/use-mobile"

interface MobileNavProps extends React.HTMLAttributes<HTMLDivElement> {}

export function MobileNav({ className, ...props }: MobileNavProps) {
  const pathname = usePathname()
  const isMobile = useMobile()

  const routes = [
    {
      href: "/dashboard",
      icon: Home,
      label: "Início",
    },
    {
      href: "/dashboard/estoque",
      icon: Package,
      label: "Estoque",
    },
    {
      href: "/dashboard/pratos",
      icon: ChefHat,
      label: "Pratos",
    },
    {
      href: "/dashboard/vendas",
      icon: ShoppingCart,
      label: "Vendas",
    },
    {
      href: "/dashboard/cmv",
      icon: BarChart2,
      label: "CMV",
    },
    {
      href: "/dashboard/nota-fiscal",
      icon: Receipt,
      label: "Nota Fiscal",
    },
    {
      href: "/dashboard/relatorios",
      icon: FileText,
      label: "Relatórios",
    },
    {
      href: "/dashboard/configuracoes",
      icon: Settings,
      label: "Configurações",
    },
  ]

  return (
    <div className={cn("pb-12", className)} {...props}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="space-y-1">
            <ScrollArea className="h-full">
              <nav className="grid gap-2 px-2">
                {routes.map((route) => (
                  <Link key={route.href} href={route.href} passHref>
                    <Button
                      variant={pathname === route.href ? "default" : "ghost"}
                      className={cn("w-full justify-start", isMobile ? "h-12 text-base" : "h-10 text-sm")}
                    >
                      <route.icon className={cn("mr-2 h-5 w-5", isMobile ? "h-5 w-5" : "h-4 w-4")} />
                      {route.label}
                    </Button>
                  </Link>
                ))}
              </nav>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}
