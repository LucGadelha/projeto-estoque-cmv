"use client"

import { useState, useEffect } from "react"
import { ArrowUpDown, Download, Filter, Plus, Search, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { convertUnits } from "@/lib/unit-converter"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { useSession } from "@/components/providers/session-provider"

export default function EstoquePage() {
  const { toast } = useToast()
  const { session } = useSession()
  const userId = session?.user?.id || ""

  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [editingItem, setEditingItem] = useState(null)
  const [adjustStockItem, setAdjustStockItem] = useState(null)
  const [adjustQuantity, setAdjustQuantity] = useState(0)
  const [adjustUnit, setAdjustUnit] = useState("")
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false)
  const [adjustType, setAdjustType] = useState("add")

  const [stockItems, setStockItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  // Function to fetch data
  const fetchData = async () => {
    try {
      setLoading(true)
      const supabase = createBrowserSupabaseClient()

      console.log("Fetching stock items...")
      // Fetch stock items
      const { data: stockData, error: stockError } = await supabase
        .from("stock_items")
        .select("*, categories(*)")
        .order("name")

      if (stockError) {
        console.error("Stock items fetch error:", stockError)
        throw stockError
      }

      console.log("Fetched stock items:", stockData)

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("type", "stock")
        .order("name")

      if (categoriesError) {
        console.error("Categories fetch error:", categoriesError)
        throw categoriesError
      }

      console.log("Fetched categories:", categoriesData)

      setStockItems(stockData || [])
      setCategories(categoriesData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os itens de estoque.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [toast])

  // Filtrar itens
  const filteredItems = stockItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || item.category_id === Number.parseInt(categoryFilter)
    return matchesSearch && matchesCategory
  })

  // Função para editar um item
  const handleEditItem = (item) => {
    setEditingItem({ ...item })
  }

  // Função para salvar as alterações de um item
  const handleSaveItem = async () => {
    if (!editingItem) return

    try {
      const supabase = createBrowserSupabaseClient()

      const { id, ...updateData } = editingItem

      const { data, error } = await supabase.from("stock_items").update(updateData).eq("id", id).select()

      if (error) throw error

      // Update local state
      setStockItems(stockItems.map((item) => (item.id === id ? data[0] : item)))

      setEditingItem(null)

      toast({
        title: "Item atualizado",
        description: `${editingItem.name} foi atualizado com sucesso.`,
      })
    } catch (error) {
      console.error("Error saving item:", error)
      toast({
        title: "Erro ao salvar item",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Função para abrir o diálogo de ajuste de estoque
  const openAdjustStockDialog = (item, type) => {
    setAdjustStockItem(item)
    setAdjustQuantity(0)
    setAdjustUnit(item.unit)
    setAdjustType(type)
    setIsAdjustDialogOpen(true)
  }

  // Função para ajustar o estoque (adicionar ou remover)
  const handleAdjustStock = async () => {
    if (!adjustStockItem || adjustQuantity <= 0) return

    try {
      const supabase = createBrowserSupabaseClient()

      // Converter a quantidade se a unidade for diferente
      let adjustedQuantity = adjustQuantity
      if (adjustUnit !== adjustStockItem.unit) {
        const conversion = convertUnits(adjustQuantity, adjustUnit, adjustStockItem.unit)
        if (conversion !== null) {
          adjustedQuantity = conversion
        } else {
          toast({
            title: "Erro de conversão",
            description: `Não é possível converter de ${adjustUnit} para ${adjustStockItem.unit}.`,
            variant: "destructive",
          })
          return
        }
      }

      // Verificar se há estoque suficiente para remoção
      if (adjustType === "remove" && adjustStockItem.quantity < adjustedQuantity) {
        toast({
          title: "Erro",
          description: `Quantidade a remover (${adjustedQuantity} ${adjustStockItem.unit}) é maior que o estoque disponível (${adjustStockItem.quantity} ${adjustStockItem.unit}).`,
          variant: "destructive",
        })
        return
      }

      // Update stock quantity
      const newQuantity =
        adjustType === "add" ? adjustStockItem.quantity + adjustedQuantity : adjustStockItem.quantity - adjustedQuantity

      const { data: updatedItem, error: updateError } = await supabase
        .from("stock_items")
        .update({ quantity: newQuantity })
        .eq("id", adjustStockItem.id)
        .select()

      if (updateError) throw updateError

      // Record movement
      const { error: movementError } = await supabase.from("stock_movements").insert({
        stock_item_id: adjustStockItem.id,
        movement_type: adjustType === "add" ? "entrada" : "saida",
        quantity: adjustedQuantity,
        unit: adjustStockItem.unit,
        user_id: userId,
        notes: `Ajuste manual de estoque: ${adjustType === "add" ? "adição" : "remoção"}`,
      })

      if (movementError) throw movementError

      // Update local state
      setStockItems(stockItems.map((item) => (item.id === adjustStockItem.id ? updatedItem[0] : item)))

      setIsAdjustDialogOpen(false)

      toast({
        title: adjustType === "add" ? "Estoque adicionado" : "Estoque removido",
        description: `${adjustQuantity} ${adjustUnit} ${adjustType === "add" ? "adicionados" : "removidos"} com sucesso.`,
      })

      // Refresh data
      fetchData()
    } catch (error) {
      console.error("Error adjusting stock:", error)
      toast({
        title: "Erro ao ajustar estoque",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Função para excluir um item
  const handleDeleteItem = async (id) => {
    try {
      const supabase = createBrowserSupabaseClient()

      const { error } = await supabase.from("stock_items").delete().eq("id", id)

      if (error) throw error

      // Update local state
      setStockItems(stockItems.filter((item) => item.id !== id))

      toast({
        title: "Item excluído",
        description: "Item removido do estoque com sucesso.",
      })
    } catch (error) {
      console.error("Error deleting item:", error)
      toast({
        title: "Erro ao excluir item",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Função para exportar dados do estoque
  const exportStockData = () => {
    // Criar CSV
    const headers = [
      "ID",
      "Nome",
      "Categoria",
      "Unidade",
      "Quantidade",
      "Preço Unitário",
      "Valor Total",
      "Estoque Mínimo",
      "Última Atualização",
    ]
    const csvContent = [
      headers.join(","),
      ...filteredItems.map((item) =>
        [
          item.id,
          item.name,
          item.categories?.name || "Sem categoria",
          item.unit,
          item.quantity,
          item.price.toFixed(2),
          (item.quantity * item.price).toFixed(2),
          item.min_quantity,
          new Date(item.updated_at).toLocaleDateString("pt-BR"),
        ].join(","),
      ),
    ].join("\n")

    // Criar blob e link para download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `estoque_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Exportação concluída",
      description: "Os dados do estoque foram exportados com sucesso.",
    })
  }

  // Calcular valor total do estoque
  const totalStockValue = stockItems.reduce((sum, item) => sum + item.quantity * item.price, 0)

  if (loading) {
    return <div className="p-8 text-center">Carregando itens do estoque...</div>
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <h1 className="text-3xl font-bold tracking-tight">Controle de Estoque</h1>
        <div className="ml-auto flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={exportStockData} className="mr-2">
            <Download className="mr-2 h-4 w-4" />
            Exportar Dados
          </Button>
          <Button asChild>
            <a href="/dashboard/nota-fiscal?tab=avulsa">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Item
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Valor Total em Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalStockValue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Itens com Estoque Baixo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stockItems.filter((item) => item.quantity < item.min_quantity).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Itens em Estoque</CardTitle>
          <CardDescription>Gerencie todos os itens disponíveis no estoque do seu restaurante</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar item..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center">
                      Nome
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Preço Unit.</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead className="hidden md:table-cell">Mínimo</TableHead>
                  <TableHead className="hidden md:table-cell">Última Atualização</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.categories?.name || "Sem categoria"}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className={item.quantity < item.min_quantity ? "text-red-500 font-medium" : ""}>
                            {item.quantity}
                          </span>
                          {item.quantity < item.min_quantity && (
                            <Badge variant="destructive" className="ml-2">
                              Baixo
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>R$ {item.price.toFixed(2)}</TableCell>
                      <TableCell>R$ {(item.quantity * item.price).toFixed(2)}</TableCell>
                      <TableCell className="hidden md:table-cell">{item.min_quantity}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {new Date(item.updated_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Ações
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditItem(item)}>Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAdjustStockDialog(item, "add")}>
                              Adicionar Estoque
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAdjustStockDialog(item, "remove")}>
                              Remover Estoque
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteItem(item.id)}>
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      Nenhum item encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div>
            <span className="text-sm text-muted-foreground">Total: {filteredItems.length} itens</span>
          </div>
          <div>
            <span className="font-medium">
              Valor Total: R$ {filteredItems.reduce((sum, item) => sum + item.quantity * item.price, 0).toFixed(2)}
            </span>
          </div>
        </CardFooter>
      </Card>

      {/* Modal de edição de item */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Item</DialogTitle>
            <DialogDescription>Atualize as informações do item no estoque.</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Nome
                </Label>
                <Input
                  id="edit-name"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-category" className="text-right">
                  Categoria
                </Label>
                <Select
                  value={editingItem.category_id?.toString() || ""}
                  onValueChange={(value) => setEditingItem({ ...editingItem, category_id: Number.parseInt(value) })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-unit" className="text-right">
                  Unidade
                </Label>
                <Select
                  value={editingItem.unit}
                  onValueChange={(value) => setEditingItem({ ...editingItem, unit: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione uma unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Litro (L)</SelectItem>
                    <SelectItem value="mL">Mililitro (mL)</SelectItem>
                    <SelectItem value="Kg">Quilo (Kg)</SelectItem>
                    <SelectItem value="g">Grama (g)</SelectItem>
                    <SelectItem value="und">Unidade (und)</SelectItem>
                    <SelectItem value="cx">Caixa (cx)</SelectItem>
                    <SelectItem value="pct">Pacote (pct)</SelectItem>
                    <SelectItem value="dz">Dúzia (dz)</SelectItem>
                    <SelectItem value="fd">Fardo (fd)</SelectItem>
                    <SelectItem value="grf">Garrafa (grf)</SelectItem>
                    <SelectItem value="lt">Lata (lt)</SelectItem>
                    <SelectItem value="sc">Saco (sc)</SelectItem>
                    <SelectItem value="bdj">Bandeja (bdj)</SelectItem>
                    <SelectItem value="mç">Maço (mç)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-quantity" className="text-right">
                  Quantidade
                </Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  min="0"
                  value={editingItem.quantity}
                  onChange={(e) => setEditingItem({ ...editingItem, quantity: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-min-quantity" className="text-right">
                  Mínimo
                </Label>
                <Input
                  id="edit-min-quantity"
                  type="number"
                  min="0"
                  value={editingItem.min_quantity}
                  onChange={(e) => setEditingItem({ ...editingItem, min_quantity: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-price" className="text-right">
                  Preço Unit.
                </Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingItem.price}
                  onChange={(e) => setEditingItem({ ...editingItem, price: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveItem}>
              <Save className="mr-2 h-4 w-4" />
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de ajuste de estoque */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{adjustType === "add" ? "Adicionar ao Estoque" : "Remover do Estoque"}</DialogTitle>
            <DialogDescription>
              {adjustStockItem?.name} - Estoque atual: {adjustStockItem?.quantity} {adjustStockItem?.unit}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="adjust-quantity" className="text-right">
                Quantidade
              </Label>
              <Input
                id="adjust-quantity"
                type="number"
                min="0"
                step="0.01"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(Number(e.target.value))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="adjust-unit" className="text-right">
                Unidade
              </Label>
              <Select value={adjustUnit} onValueChange={setAdjustUnit}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione uma unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">Litro (L)</SelectItem>
                  <SelectItem value="mL">Mililitro (mL)</SelectItem>
                  <SelectItem value="Kg">Quilo (Kg)</SelectItem>
                  <SelectItem value="g">Grama (g)</SelectItem>
                  <SelectItem value="und">Unidade (und)</SelectItem>
                  <SelectItem value="cx">Caixa (cx)</SelectItem>
                  <SelectItem value="pct">Pacote (pct)</SelectItem>
                  <SelectItem value="dz">Dúzia (dz)</SelectItem>
                  <SelectItem value="fd">Fardo (fd)</SelectItem>
                  <SelectItem value="grf">Garrafa (grf)</SelectItem>
                  <SelectItem value="lt">Lata (lt)</SelectItem>
                  <SelectItem value="sc">Saco (sc)</SelectItem>
                  <SelectItem value="bdj">Bandeja (bdj)</SelectItem>
                  <SelectItem value="mç">Maço (mç)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {adjustUnit !== adjustStockItem?.unit && (
              <div className="bg-yellow-50 p-3 rounded-md text-sm">
                <p className="font-medium text-yellow-800">Conversão de unidades será aplicada</p>
                <p className="text-yellow-700">
                  {adjustQuantity} {adjustUnit} será convertido para {adjustStockItem?.unit}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdjustStock}>{adjustType === "add" ? "Adicionar" : "Remover"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
