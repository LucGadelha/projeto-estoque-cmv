"use client"

import { useState } from "react"
import { ShoppingCart, Trash2, Minus, Plus, X, CheckCircle, Loader2 } from "lucide-react"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { registerSale } from "@/app/actions/sales"

interface CartDrawerProps {
  open: boolean
  onClose: () => void
  cartItems: { dish: any; quantity: number }[]
  onRemove: (dishId: number) => void
  onUpdateQuantity: (dishId: number, quantity: number) => void
  total: number
  userId: string
}

export function CartDrawer({ open, onClose, cartItems, onRemove, onUpdateQuantity, total, userId }: CartDrawerProps) {
  const { toast } = useToast()
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)

  // Função para formatar o preço em reais
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price)
  }

  const handleCheckout = async () => {
    if (cartItems.length === 0) return

    try {
      setProcessing(true)

      // Preparar os itens para o registro de venda
      const saleItems = cartItems.map((item) => ({
        dishId: item.dish.id,
        quantity: item.quantity,
        unitPrice: item.dish.price,
      }))

      // Registrar a venda
      await registerSale({
        userId,
        items: saleItems,
        total,
      })

      setSuccess(true)

      // Mostrar mensagem de sucesso
      toast({
        title: "Venda realizada com sucesso!",
        description: "Os itens foram vendidos e o estoque foi atualizado.",
        variant: "default",
      })

      // Resetar após 2 segundos
      setTimeout(() => {
        setSuccess(false)
        setProcessing(false)
        // Limpar o carrinho removendo todos os itens
        cartItems.forEach((item) => onRemove(item.dish.id))
        onClose()
      }, 2000)
    } catch (error) {
      console.error("Erro ao processar venda:", error)
      toast({
        title: "Erro ao processar venda",
        description: "Ocorreu um erro ao registrar a venda. Tente novamente.",
        variant: "destructive",
      })
      setProcessing(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Carrinho
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 p-4">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">Seu carrinho está vazio.</p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {cartItems.map((item) => (
                <div key={item.dish.id} className="flex items-center space-x-4">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.dish.name}</h4>
                    <p className="text-sm text-muted-foreground">{formatPrice(item.dish.price)} cada</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onUpdateQuantity(item.dish.id, item.quantity - 1)}
                      disabled={processing}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onUpdateQuantity(item.dish.id, item.quantity + 1)}
                      disabled={processing}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => onRemove(item.dish.id)}
                      disabled={processing}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="p-4 border-t mt-auto">
          <div className="flex justify-between mb-4">
            <span className="font-semibold">Total:</span>
            <span className="font-bold text-lg">{formatPrice(total)}</span>
          </div>
          <Button
            className="w-full h-12 text-base"
            disabled={cartItems.length === 0 || processing || success}
            onClick={handleCheckout}
          >
            {processing ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : success ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <ShoppingCart className="h-5 w-5 mr-2" />
            )}
            {processing ? "Processando..." : success ? "Venda Concluída!" : "Finalizar Venda"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
