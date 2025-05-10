"use client"

import Image from "next/image"
import { Plus } from "lucide-react"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface DishCardProps {
  dish: any
  onAddToCart: () => void
}

export function DishCard({ dish, onAddToCart }: DishCardProps) {
  // Função para formatar o preço em reais
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price)
  }

  // Mapeamento de categorias para cores
  const categoryColors: Record<string, string> = {
    entrada: "bg-blue-500",
    prato_principal: "bg-emerald-500",
    sobremesa: "bg-purple-500",
    drink: "bg-pink-500",
    bebida: "bg-amber-500",
    vinho: "bg-red-500",
  }

  // Obter a cor da categoria ou usar um padrão
  const categoryColor = dish.categories
    ? categoryColors[dish.categories.name.toLowerCase()] || "bg-gray-500"
    : "bg-gray-500"

  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <div className="relative h-40 bg-muted">
        <Image
          src={dish.image_url || "/placeholder.svg?height=160&width=320"}
          alt={dish.name}
          fill
          className="object-cover"
        />
        {dish.categories && <Badge className={`absolute top-2 right-2 ${categoryColor}`}>{dish.categories.name}</Badge>}
      </div>
      <CardContent className="flex-1 p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg line-clamp-1">{dish.name}</h3>
          <span className="font-bold text-emerald-600">{formatPrice(dish.price)}</span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{dish.description || "Sem descrição disponível."}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button onClick={onAddToCart} className="w-full" variant="default">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar
        </Button>
      </CardFooter>
    </Card>
  )
}
