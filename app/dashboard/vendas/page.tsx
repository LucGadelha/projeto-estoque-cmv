"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, ShoppingCart, Plus, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { useSession } from "@/components/providers/session-provider"
import { DishCard } from "@/components/vendas/dish-card"
import { CartDrawer } from "@/components/vendas/cart-drawer"
import { getDishes } from "@/app/actions/dishes"
import { getCategories } from "@/app/actions/categories"

export default function VendasPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { session } = useSession()
  const [dishes, setDishes] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCategory, setActiveCategory] = useState("todos")
  const [cartOpen, setCartOpen] = useState(false)
  const [cart, setCart] = useState<{ dish: any; quantity: number }[]>([])

  // Categorias específicas solicitadas
  const categoryTypes = ["todos", "entrada", "prato_principal", "sobremesa", "drink", "bebida", "vinho"]

  const categoryLabels: Record<string, string> = {
    todos: "Todos",
    entrada: "Entradas",
    prato_principal: "Pratos Principais",
    sobremesa: "Sobremesas",
    drink: "Drinks",
    bebida: "Bebidas",
    vinho: "Vinhos",
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const dishesData = await getDishes()
        const categoriesData = await getCategories()

        setDishes(dishesData)
        setCategories(categoriesData)
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar os pratos.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [toast])

  const filteredDishes = dishes.filter((dish) => {
    const matchesSearch = dish.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory =
      activeCategory === "todos" ||
      (dish.categories && dish.categories.name.toLowerCase() === activeCategory.toLowerCase())
    return matchesSearch && matchesCategory
  })

  const addToCart = (dish: any) => {
    setCart((prev) => {
      const existingItem = prev.find((item) => item.dish.id === dish.id)
      if (existingItem) {
        return prev.map((item) => (item.dish.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item))
      } else {
        return [...prev, { dish, quantity: 1 }]
      }
    })

    toast({
      title: "Adicionado ao carrinho",
      description: `${dish.name} foi adicionado ao carrinho.`,
    })
  }

  const removeFromCart = (dishId: number) => {
    setCart((prev) => prev.filter((item) => item.dish.id !== dishId))
  }

  const updateQuantity = (dishId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(dishId)
      return
    }

    setCart((prev) => prev.map((item) => (item.dish.id === dishId ? { ...item, quantity } : item)))
  }

  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0)
  const cartTotal = cart.reduce((total, item) => total + item.dish.price * item.quantity, 0)

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-bold">Venda de Pratos</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="relative" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="h-5 w-5" />
            {cartItemCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-emerald-500">
                {cartItemCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pratos..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <ScrollArea className="w-full">
          <div className="flex space-x-2 pb-1">
            {categoryTypes.map((category) => (
              <Button
                key={category}
                variant={activeCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(category)}
                className="whitespace-nowrap"
              >
                {categoryLabels[category]}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Dish List */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : filteredDishes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDishes.map((dish) => (
              <DishCard key={dish.id} dish={dish} onAddToCart={() => addToCart(dish)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground mb-4">Nenhum prato encontrado.</p>
            <Button variant="outline" onClick={() => router.push("/dashboard/pratos")}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Novo Prato
            </Button>
          </div>
        )}
      </div>

      {/* Cart Drawer */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cartItems={cart}
        onRemove={removeFromCart}
        onUpdateQuantity={updateQuantity}
        total={cartTotal}
        userId={session?.user?.id || ""}
      />
    </div>
  )
}
