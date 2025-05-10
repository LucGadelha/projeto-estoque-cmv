"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2, Edit, Save, SplitSquareVertical, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useSession } from "@/components/providers/session-provider"
import { buscarComandaPorId, editarItemComanda, removerItemComanda } from "@/app/actions/comandas"
import { ConfirmDialog } from "@/components/comandas/confirm-dialog"
import { AdicionarItemDialog } from "@/components/comandas/adicionar-item-dialog"
import { SepararItensDialog } from "@/components/comandas/separar-itens-dialog"

export default function EditarComandaPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const { session } = useSession()
  const [comanda, setComanda] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [editingItemData, setEditingItemData] = useState<{ quantidade: number; observacoes: string }>({
    quantidade: 1,
    observacoes: "",
  })
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<number | null>(null)
  const [adicionarItemDialogOpen, setAdicionarItemDialogOpen] = useState(false)
  const [separarItensDialogOpen, setSepararItensDialogOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState<number[]>([])

  useEffect(() => {
    const loadComanda = async () => {
      try {
        setLoading(true)
        const comandaData = await buscarComandaPorId(Number(params.id))
        setComanda(comandaData)
      } catch (error) {
        console.error("Erro ao carregar comanda:", error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar os detalhes da comanda.",
          variant: "destructive",
        })
        router.push("/dashboard/comandas")
      } finally {
        setLoading(false)
      }
    }

    loadComanda()
  }, [params.id, router, toast])

  // Função para formatar valor em reais
  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor)
  }

  const handleEditItem = (item: any) => {
    setEditingItemId(item.id)
    setEditingItemData({
      quantidade: item.quantidade,
      observacoes: item.observacoes || "",
    })
  }

  const handleCancelEdit = () => {
    setEditingItemId(null)
    setEditingItemData({
      quantidade: 1,
      observacoes: "",
    })
  }

  const handleSaveEdit = async (itemId: number) => {
    try {
      setLoading(true)

      const result = await editarItemComanda(
        itemId,
        {
          quantidade: editingItemData.quantidade,
          observacoes: editingItemData.observacoes,
        },
        session?.user?.id || "",
      )

      if (result.success) {
        toast({
          title: "Item atualizado",
          description: "Item atualizado com sucesso.",
        })

        // Atualizar comanda
        const comandaData = await buscarComandaPorId(Number(params.id))
        setComanda(comandaData)

        // Resetar estado de edição
        setEditingItemId(null)
        setEditingItemData({
          quantidade: 1,
          observacoes: "",
        })
      } else {
        throw new Error("Erro ao atualizar item")
      }
    } catch (error) {
      console.error("Erro ao atualizar item:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o item. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteItem = (itemId: number) => {
    setItemToDelete(itemId)
    setConfirmDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return

    try {
      setLoading(true)

      const result = await removerItemComanda(itemToDelete, session?.user?.id || "")

      if (result.success) {
        toast({
          title: "Item removido",
          description: "Item removido com sucesso.",
        })

        // Atualizar comanda
        const comandaData = await buscarComandaPorId(Number(params.id))
        setComanda(comandaData)
      } else {
        throw new Error("Erro ao remover item")
      }
    } catch (error) {
      console.error("Erro ao remover item:", error)
      toast({
        title: "Erro",
        description: "Não foi possível remover o item. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setConfirmDialogOpen(false)
      setItemToDelete(null)
    }
  }

  const handleItemAdicionado = async () => {
    try {
      // Atualizar comanda
      const comandaData = await buscarComandaPorId(Number(params.id))
      setComanda(comandaData)
    } catch (error) {
      console.error("Erro ao atualizar comanda:", error)
    }
  }

  const handleToggleSelectItem = (itemId: number) => {
    setSelectedItems((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId)
      } else {
        return [...prev, itemId]
      }
    })
  }

  const handleSepararItens = () => {
    if (selectedItems.length === 0) {
      toast({
        title: "Nenhum item selecionado",
        description: "Selecione pelo menos um item para separar.",
        variant: "destructive",
      })
      return
    }

    setSepararItensDialogOpen(true)
  }

  const handleItensSeparados = async () => {
    try {
      // Atualizar comanda
      const comandaData = await buscarComandaPorId(Number(params.id))
      setComanda(comandaData)
      setSelectedItems([])
    } catch (error) {
      console.error("Erro ao atualizar comanda:", error)
    }
  }

  if (loading && !comanda) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)] md:h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (!comanda) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] md:h-[calc(100vh-64px)]">
        <p className="text-muted-foreground mb-4">Comanda não encontrada.</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/comandas")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Comandas
        </Button>
      </div>
    )
  }

  if (comanda.status !== "em_aberto") {
    router.push(`/dashboard/comandas/${params.id}`)
    return null
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/comandas/${params.id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold ml-2">
            Editar Comanda #{params.id} - {comanda.cliente_nome}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/comandas/${params.id}`)}>
            Cancelar
          </Button>
          <Button variant="default" onClick={() => setAdicionarItemDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Item
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-4">
        <Card className="mb-4">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Informações da Comanda</CardTitle>
              <Badge className="bg-yellow-500">Em aberto</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{comanda.cliente_nome}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mesa</p>
                <p className="font-medium">{comanda.mesa_numero}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Itens da Comanda</CardTitle>
              {selectedItems.length > 0 && (
                <Button variant="outline" onClick={handleSepararItens}>
                  <SplitSquareVertical className="mr-2 h-4 w-4" />
                  Separar Itens ({selectedItems.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {comanda.comanda_itens.length > 0 ? (
              <div className="space-y-4">
                {comanda.comanda_itens.map((item: any) => (
                  <div key={item.id} className="border rounded-md p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleToggleSelectItem(item.id)}
                          className="mt-1"
                        />
                        <div>
                          <div className="flex items-center">
                            <h4 className="font-medium">{item.dishes.name}</h4>
                            <Badge variant="outline" className="ml-2">
                              {item.dishes.categories?.name || "Sem categoria"}
                            </Badge>
                          </div>
                          {editingItemId === item.id ? (
                            <div className="mt-2 space-y-2">
                              <div className="flex items-center">
                                <label className="text-sm text-muted-foreground mr-2">Quantidade:</label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={editingItemData.quantidade}
                                  onChange={(e) =>
                                    setEditingItemData({
                                      ...editingItemData,
                                      quantidade: Number.parseInt(e.target.value) || 1,
                                    })
                                  }
                                  className="w-20"
                                />
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground block mb-1">Observações:</label>
                                <Textarea
                                  value={editingItemData.observacoes}
                                  onChange={(e) =>
                                    setEditingItemData({
                                      ...editingItemData,
                                      observacoes: e.target.value,
                                    })
                                  }
                                  placeholder="Ex: sem cebola, bem passado, etc."
                                  className="w-full"
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              {item.observacoes && (
                                <p className="text-sm text-muted-foreground mt-1">Obs: {item.observacoes}</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatarValor(item.valor_unitario)}</p>
                        <p className="text-sm text-muted-foreground">x{item.quantidade}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex gap-2">
                        {editingItemId === item.id ? (
                          <>
                            <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={loading}>
                              Cancelar
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleSaveEdit(item.id)}
                              disabled={loading}
                            >
                              {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="mr-2 h-4 w-4" />
                              )}
                              Salvar
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditItem(item)}
                              disabled={loading || editingItemId !== null}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id)}
                              disabled={loading || editingItemId !== null}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remover
                            </Button>
                          </>
                        )}
                      </div>
                      <div className="font-bold">{formatarValor(item.valor_unitario * item.quantidade)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Nenhum item na comanda.</p>
                <Button variant="outline" onClick={() => setAdicionarItemDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Item
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <div className="font-bold text-lg">Total</div>
            <div className="font-bold text-lg">{formatarValor(comanda.valor_total)}</div>
          </CardFooter>
        </Card>
      </div>

      {/* Dialog de confirmação para excluir item */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="Remover Item"
        description="Tem certeza que deseja remover este item da comanda? Esta ação não pode ser desfeita."
        onConfirm={handleConfirmDelete}
      />

      {/* Dialog para adicionar item */}
      <AdicionarItemDialog
        open={adicionarItemDialogOpen}
        onOpenChange={setAdicionarItemDialogOpen}
        comandaId={Number(params.id)}
        userId={session?.user?.id || ""}
        onItemAdicionado={handleItemAdicionado}
      />

      {/* Dialog para separar itens */}
      <SepararItensDialog
        open={separarItensDialogOpen}
        onOpenChange={setSepararItensDialogOpen}
        comandaId={Number(params.id)}
        itensIds={selectedItems}
        userId={session?.user?.id || ""}
        onItensSeparados={handleItensSeparados}
      />
    </div>
  )
}
