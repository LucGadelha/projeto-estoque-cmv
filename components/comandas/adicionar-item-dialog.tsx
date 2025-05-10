"use client"

import { useState, useEffect } from "react"
import { Loader2, Search } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { adicionarItemComanda } from "@/app/actions/comandas"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"

interface AdicionarItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  comandaId: number
  userId: string
  onItemAdicionado?: () => void
}

export function AdicionarItemDialog({
  open,
  onOpenChange,
  comandaId,
  userId,
  onItemAdicionado,
}: AdicionarItemDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [pratos, setPratos] = useState<any[]>([])
  const [pratosFiltrados, setPratosFiltrados] = useState<any[]>([])
  const [pratoSelecionado, setPratoSelecionado] = useState<any>(null)
  const [quantidade, setQuantidade] = useState(1)
  const [observacoes, setObservacoes] = useState("")

  useEffect(() => {
    const buscarPratos = async () => {
      try {
        const supabase = createClientComponentClient<Database>()
        const { data, error } = await supabase
          .from("dishes")
          .select(`
            *,
            categories(name)
          `)
          .order("name")

        if (error) throw error

        setPratos(data)
        setPratosFiltrados(data)
      } catch (error) {
        console.error("Erro ao buscar pratos:", error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar os pratos.",
          variant: "destructive",
        })
      }
    }

    if (open) {
      buscarPratos()
    }
  }, [open, toast])

  useEffect(() => {
    // Filtrar pratos com base no termo de busca
    const filtered = pratos.filter((prato) => prato.name.toLowerCase().includes(searchTerm.toLowerCase()))
    setPratosFiltrados(filtered)
  }, [searchTerm, pratos])

  const handleSelectPrato = (prato: any) => {
    setPratoSelecionado(prato)
  }

  const handleSubmit = async () => {
    if (!pratoSelecionado) {
      toast({
        title: "Selecione um prato",
        description: "Por favor, selecione um prato para adicionar à comanda.",
        variant: "destructive",
      })
      return
    }

    if (quantidade <= 0) {
      toast({
        title: "Quantidade inválida",
        description: "Por favor, informe uma quantidade válida.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      const result = await adicionarItemComanda(
        {
          comanda_id: comandaId,
          dish_id: pratoSelecionado.id,
          quantidade,
          valor_unitario: pratoSelecionado.price,
          observacoes,
        },
        userId,
      )

      if (result.success) {
        toast({
          title: "Item adicionado",
          description: "Item adicionado à comanda com sucesso.",
        })

        // Resetar formulário
        setPratoSelecionado(null)
        setQuantidade(1)
        setObservacoes("")
        setSearchTerm("")

        // Fechar dialog
        onOpenChange(false)

        // Callback
        if (onItemAdicionado) {
          onItemAdicionado()
        }
      } else {
        throw new Error("Erro ao adicionar item à comanda")
      }
    } catch (error) {
      console.error("Erro ao adicionar item à comanda:", error)
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o item à comanda. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Função para formatar valor em reais
  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Adicionar Item à Comanda</DialogTitle>
          <DialogDescription>Selecione um item do cardápio para adicionar à comanda.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {pratoSelecionado ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start p-4 border rounded-md">
                <div>
                  <h3 className="font-medium">{pratoSelecionado.name}</h3>
                  <p className="text-sm text-muted-foreground">{pratoSelecionado.description}</p>
                  <p className="text-sm mt-1">Categoria: {pratoSelecionado.categories?.name || "Sem categoria"}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatarValor(pratoSelecionado.price)}</p>
                  <Button variant="ghost" size="sm" onClick={() => setPratoSelecionado(null)} className="mt-2">
                    Trocar
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantidade" className="text-right">
                  Quantidade
                </Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number.parseInt(e.target.value) || 1)}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="observacoes" className="text-right pt-2">
                  Observações
                </Label>
                <Textarea
                  id="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: sem cebola, bem passado, etc."
                  className="col-span-3"
                />
              </div>

              <div className="flex justify-between items-center pt-4">
                <div className="font-medium">Subtotal:</div>
                <div className="font-bold text-lg">{formatarValor(pratoSelecionado.price * quantidade)}</div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar item..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="border rounded-md overflow-hidden">
                <div className="max-h-[300px] overflow-y-auto">
                  {pratosFiltrados.length > 0 ? (
                    pratosFiltrados.map((prato) => (
                      <div
                        key={prato.id}
                        className="flex justify-between items-start p-4 border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleSelectPrato(prato)}
                      >
                        <div>
                          <h3 className="font-medium">{prato.name}</h3>
                          <p className="text-sm text-muted-foreground">{prato.description}</p>
                          <p className="text-sm mt-1">Categoria: {prato.categories?.name || "Sem categoria"}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatarValor(prato.price)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">Nenhum item encontrado.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading || !pratoSelecionado}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Adicionar Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
