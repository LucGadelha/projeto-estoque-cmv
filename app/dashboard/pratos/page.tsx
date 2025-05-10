"use client"

import { useState, useEffect } from "react"
import { Download, Filter, Plus, Search, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { convertUnits } from "@/lib/unit-converter"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { useSession } from "@/components/providers/session-provider"

export default function PratosPage() {
  const { toast } = useToast()
  const { session } = useSession()
  const userId = session?.user?.id || ""

  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [isCreatingDish, setIsCreatingDish] = useState(false)
  const [isViewingDish, setIsViewingDish] = useState(false)
  const [currentDish, setCurrentDish] = useState(null)

  // Estados para o novo prato
  const [newDishName, setNewDishName] = useState("")
  const [newDishDescription, setNewDishDescription] = useState("")
  const [newDishCategory, setNewDishCategory] = useState("")
  const [newDishPrice, setNewDishPrice] = useState("")
  const [newDishIngredients, setNewDishIngredients] = useState([])
  const [currentIngredient, setCurrentIngredient] = useState({
    stockItemId: 0,
    name: "",
    quantity: 0,
    unit: "",
  })

  const [stockItems, setStockItems] = useState([])
  const [categories, setCategories] = useState([])
  const [dishes, setDishes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const supabase = createBrowserSupabaseClient()

        // Fetch stock items
        const { data: stockData, error: stockError } = await supabase.from("stock_items").select("*").order("name")

        if (stockError) throw stockError

        // Fetch categories for dishes
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("*")
          .eq("type", "dish")
          .order("name")

        if (categoriesError) throw categoriesError

        // Fetch dishes with ingredients
        const { data: dishesData, error: dishesError } = await supabase
          .from("dishes")
          .select(`
            *,
            categories(*),
            dish_ingredients(
              *,
              stock_items(*)
            )
          `)
          .order("name")

        if (dishesError) throw dishesError

        setStockItems(stockData || [])
        setCategories(categoriesData || [])
        setDishes(dishesData || [])
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os pratos.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [toast])

  // Filtrar pratos
  const filteredDishes = dishes.filter((dish) => {
    const matchesSearch = dish.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || dish.category_id === Number.parseInt(categoryFilter)
    return matchesSearch && matchesCategory
  })

  // Função para adicionar um ingrediente ao novo prato
  const addIngredient = () => {
    if (!currentIngredient.stockItemId || currentIngredient.quantity <= 0 || !currentIngredient.unit) {
      toast({
        title: "Dados incompletos",
        description: "Preencha todos os campos do ingrediente.",
        variant: "destructive",
      })
      return
    }

    // Verificar se o ingrediente já existe no prato
    const existingIndex = newDishIngredients.findIndex((ing) => ing.stockItemId === currentIngredient.stockItemId)

    if (existingIndex >= 0) {
      // Atualizar o ingrediente existente
      const updatedIngredients = [...newDishIngredients]
      updatedIngredients[existingIndex] = {
        ...updatedIngredients[existingIndex],
        quantity: updatedIngredients[existingIndex].quantity + currentIngredient.quantity,
      }
      setNewDishIngredients(updatedIngredients)
    } else {
      // Adicionar novo ingrediente
      setNewDishIngredients([
        ...newDishIngredients,
        {
          id: newDishIngredients.length + 1,
          stockItemId: currentIngredient.stockItemId,
          name: currentIngredient.name,
          quantity: currentIngredient.quantity,
          unit: currentIngredient.unit,
        },
      ])
    }

    // Limpar o formulário de ingrediente
    setCurrentIngredient({
      stockItemId: 0,
      name: "",
      quantity: 0,
      unit: "",
    })
  }

  // Função para remover um ingrediente do novo prato
  const removeIngredient = (id) => {
    setNewDishIngredients(newDishIngredients.filter((ing) => ing.id !== id))
  }

  // Função para verificar se há estoque suficiente para os ingredientes
  const checkStockAvailability = () => {
    const insufficientItems = []

    for (const ingredient of newDishIngredients) {
      const stockItem = stockItems.find((item) => item.id === ingredient.stockItemId)

      if (stockItem) {
        // Converter unidades se necessário
        let requiredQuantity = ingredient.quantity
        if (ingredient.unit !== stockItem.unit) {
          const convertedQuantity = convertUnits(ingredient.quantity, ingredient.unit, stockItem.unit)
          if (convertedQuantity !== null) {
            requiredQuantity = convertedQuantity
          } else {
            toast({
              title: "Erro de conversão",
              description: `Não é possível converter ${ingredient.unit} para ${stockItem.unit} para o ingrediente ${ingredient.name}.`,
              variant: "destructive",
            })
            return false
          }
        }

        if (stockItem.quantity < requiredQuantity) {
          insufficientItems.push({
            name: ingredient.name,
            available: stockItem.quantity,
            required: requiredQuantity,
            unit: stockItem.unit,
          })
        }
      } else {
        toast({
          title: "Ingrediente não encontrado",
          description: `O ingrediente ${ingredient.name} não foi encontrado no estoque.`,
          variant: "destructive",
        })
        return false
      }
    }

    if (insufficientItems.length > 0) {
      const itemsList = insufficientItems
        .map(
          (item) => `${item.name}: disponível ${item.available} ${item.unit}, necessário ${item.required} ${item.unit}`,
        )
        .join("\n")

      toast({
        title: "Estoque insuficiente",
        description: `Não há estoque suficiente para os seguintes ingredientes:\n${itemsList}`,
        variant: "destructive",
      })
      return false
    }

    return true
  }

  // Função para salvar o novo prato
  const saveDish = async () => {
    // Validar campos obrigatórios
    if (!newDishName || !newDishCategory || !newDishPrice || newDishIngredients.length === 0) {
      toast({
        title: "Dados incompletos",
        description: "Preencha todos os campos obrigatórios e adicione pelo menos um ingrediente.",
        variant: "destructive",
      })
      return
    }

    // Verificar disponibilidade de estoque
    if (!checkStockAvailability()) {
      return
    }

    try {
      const supabase = createBrowserSupabaseClient()

      // Criar prato
      const { data: dishData, error: dishError } = await supabase
        .from("dishes")
        .insert({
          name: newDishName,
          description: newDishDescription,
          category_id: Number.parseInt(newDishCategory),
          price: Number.parseFloat(newDishPrice),
        })
        .select()

      if (dishError) throw dishError

      const newDishId = dishData[0].id

      // Adicionar ingredientes
      const ingredientsToAdd = newDishIngredients.map((ingredient) => ({
        dish_id: newDishId,
        stock_item_id: ingredient.stockItemId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
      }))

      const { error: ingredientsError } = await supabase.from("dish_ingredients").insert(ingredientsToAdd)

      if (ingredientsError) throw ingredientsError

      toast({
        title: "Prato criado",
        description: `O prato ${newDishName} foi criado com sucesso.`,
      })

      // Reset form and refresh data
      resetForm()
      setIsCreatingDish(false)

      // Reload dishes
      const { data: updatedDishes, error: fetchError } = await supabase
        .from("dishes")
        .select(`
          *,
          categories(*),
          dish_ingredients(
            *,
            stock_items(*)
          )
        `)
        .order("name")

      if (!fetchError) {
        setDishes(updatedDishes)
      }
    } catch (error) {
      console.error("Error saving dish:", error)
      toast({
        title: "Erro ao criar prato",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Função para limpar o formulário
  const resetForm = () => {
    setNewDishName("")
    setNewDishDescription("")
    setNewDishCategory("")
    setNewDishPrice("")
    setNewDishIngredients([])
    setCurrentIngredient({
      stockItemId: 0,
      name: "",
      quantity: 0,
      unit: "",
    })
  }

  // Função para visualizar detalhes de um prato
  const viewDish = (dish) => {
    setCurrentDish(dish)
    setIsViewingDish(true)
  }

  // Função para exportar dados dos pratos
  const exportDishesData = () => {
    // Criar CSV
    const headers = ["ID", "Nome", "Categoria", "Preço", "Ingredientes", "Data de Criação"]
    const csvContent = [
      headers.join(","),
      ...filteredDishes.map((dish) =>
        [
          dish.id,
          dish.name,
          dish.categories?.name || "Sem categoria",
          dish.price.toFixed(2),
          dish.dish_ingredients
            .map((ing) => `${ing.quantity} ${ing.unit} ${ing.stock_items?.name || ing.stock_item_id}`)
            .join("; "),
          new Date(dish.created_at).toLocaleDateString("pt-BR"),
        ].join(","),
      ),
    ].join("\n")

    // Criar blob e link para download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `pratos_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Exportação concluída",
      description: "Os dados dos pratos foram exportados com sucesso.",
    })
  }

  // Função para preparar um prato (reduzir estoque)
  const prepareDish = async (dish) => {
    try {
      const supabase = createBrowserSupabaseClient()

      // Check if we have enough stock for all ingredients
      for (const ingredient of dish.dish_ingredients) {
        const stockItem = ingredient.stock_items
        if (!stockItem) continue

        // Convert units if necessary
        let requiredQuantity = ingredient.quantity
        if (ingredient.unit !== stockItem.unit) {
          const converted = convertUnits(ingredient.quantity, ingredient.unit, stockItem.unit)
          if (converted === null) {
            throw new Error(`Cannot convert from ${ingredient.unit} to ${stockItem.unit}`)
          }
          requiredQuantity = converted
        }

        if (stockItem.quantity < requiredQuantity) {
          throw new Error(
            `Not enough stock for ${stockItem.name}. ` +
              `Available: ${stockItem.quantity} ${stockItem.unit}, ` +
              `Required: ${requiredQuantity} ${stockItem.unit}`,
          )
        }
      }

      // Update stock for each ingredient
      for (const ingredient of dish.dish_ingredients) {
        const stockItem = ingredient.stock_items
        if (!stockItem) continue

        // Convert units if necessary
        let requiredQuantity = ingredient.quantity
        if (ingredient.unit !== stockItem.unit) {
          const converted = convertUnits(ingredient.quantity, ingredient.unit, stockItem.unit)
          if (converted !== null) {
            requiredQuantity = converted
          }
        }

        // Update stock quantity
        const { error: updateError } = await supabase
          .from("stock_items")
          .update({ quantity: stockItem.quantity - requiredQuantity })
          .eq("id", stockItem.id)

        if (updateError) throw updateError

        // Record stock movement
        const { error: movementError } = await supabase.from("stock_movements").insert({
          stock_item_id: stockItem.id,
          movement_type: "saida",
          quantity: requiredQuantity,
          unit: stockItem.unit,
          dish_id: dish.id,
          user_id: userId,
          notes: `Usado no preparo do prato: ${dish.name}`,
        })

        if (movementError) throw movementError
      }

      // Reload data
      const { data: stockData } = await supabase.from("stock_items").select("*").order("name")
      if (stockData) setStockItems(stockData)

      toast({
        title: "Prato preparado",
        description: `O prato ${dish.name} foi preparado e o estoque foi atualizado.`,
      })

      setIsViewingDish(false)
    } catch (error) {
      console.error("Error preparing dish:", error)
      toast({
        title: "Erro ao preparar prato",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Função para excluir um prato
  const deleteDish = async (id) => {
    try {
      const supabase = createBrowserSupabaseClient()

      const { error } = await supabase.from("dishes").delete().eq("id", id)

      if (error) throw error

      // Update local state
      setDishes(dishes.filter((dish) => dish.id !== id))

      toast({
        title: "Prato excluído",
        description: "O prato foi excluído com sucesso.",
      })
    } catch (error) {
      console.error("Error deleting dish:", error)
      toast({
        title: "Erro ao excluir prato",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Atualizar unidade quando o item do estoque é selecionado
  const handleStockItemChange = (stockItemId) => {
    const stockItem = stockItems.find((item) => item.id === Number.parseInt(stockItemId))
    if (stockItem) {
      setCurrentIngredient({
        ...currentIngredient,
        stockItemId: stockItem.id,
        name: stockItem.name,
        unit: stockItem.unit,
      })
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Carregando pratos...</div>
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Pratos</h1>
        <div className="ml-auto flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={exportDishesData} className="mr-2">
            <Download className="mr-2 h-4 w-4" />
            Exportar Dados
          </Button>
          <Button onClick={() => setIsCreatingDish(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Novo Prato
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pratos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pratos">Pratos</TabsTrigger>
          <TabsTrigger value="cmv">Simulação de CMV</TabsTrigger>
          <TabsTrigger value="porcionamento">Porcionamento</TabsTrigger>
        </TabsList>

        <TabsContent value="pratos">
          <Card>
            <CardHeader>
              <CardTitle>Pratos Cadastrados</CardTitle>
              <CardDescription>Gerencie os pratos do seu restaurante</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar prato..."
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
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Ingredientes</TableHead>
                      <TableHead>Data de Criação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDishes.length > 0 ? (
                      filteredDishes.map((dish) => (
                        <TableRow key={dish.id}>
                          <TableCell className="font-medium">{dish.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{dish.categories?.name || "Sem categoria"}</Badge>
                          </TableCell>
                          <TableCell>R$ {dish.price.toFixed(2)}</TableCell>
                          <TableCell>{dish.dish_ingredients.length} ingredientes</TableCell>
                          <TableCell>{new Date(dish.created_at).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => viewDish(dish)} className="mr-2">
                              Detalhes
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => prepareDish(dish)} className="mr-2">
                              Preparar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteDish(dish.id)}
                              className="text-red-500"
                            >
                              Excluir
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          Nenhum prato encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cmv">
          <SimulacaoCMV stockItems={stockItems} dishes={dishes} />
        </TabsContent>

        <TabsContent value="porcionamento">
          <PorcionamentoCarne stockItems={stockItems} />
        </TabsContent>
      </Tabs>

      {/* Modal de criação de prato */}
      <Dialog open={isCreatingDish} onOpenChange={setIsCreatingDish}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Criar Novo Prato</DialogTitle>
            <DialogDescription>Preencha os detalhes do novo prato e adicione os ingredientes.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Informações do Prato</TabsTrigger>
              <TabsTrigger value="ingredients">Ingredientes</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dish-name">Nome do Prato *</Label>
                  <Input
                    id="dish-name"
                    value={newDishName}
                    onChange={(e) => setNewDishName(e.target.value)}
                    placeholder="Ex: Risoto de Camarão"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dish-category">Categoria *</Label>
                  <Select value={newDishCategory} onValueChange={setNewDishCategory}>
                    <SelectTrigger id="dish-category">
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

                <div className="space-y-2">
                  <Label htmlFor="dish-price">Preço (R$) *</Label>
                  <Input
                    id="dish-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newDishPrice}
                    onChange={(e) => setNewDishPrice(e.target.value)}
                    placeholder="Ex: 45.90"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="dish-description">Descrição</Label>
                  <Textarea
                    id="dish-description"
                    value={newDishDescription}
                    onChange={(e) => setNewDishDescription(e.target.value)}
                    placeholder="Descreva o prato..."
                    rows={4}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ingredients" className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="ingredient-name">Ingrediente *</Label>
                  <Select
                    value={currentIngredient.stockItemId ? currentIngredient.stockItemId.toString() : ""}
                    onValueChange={(value) => handleStockItemChange(value)}
                  >
                    <SelectTrigger id="ingredient-name">
                      <SelectValue placeholder="Selecione um ingrediente" />
                    </SelectTrigger>
                    <SelectContent>
                      {stockItems.map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.name} ({item.quantity} {item.unit} disponível)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ingredient-quantity">Quantidade *</Label>
                  <Input
                    id="ingredient-quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentIngredient.quantity || ""}
                    onChange={(e) =>
                      setCurrentIngredient({
                        ...currentIngredient,
                        quantity: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ingredient-unit">Unidade *</Label>
                  <Select
                    value={currentIngredient.unit}
                    onValueChange={(value) => setCurrentIngredient({ ...currentIngredient, unit: value })}
                  >
                    <SelectTrigger id="ingredient-unit">
                      <SelectValue placeholder="Unidade" />
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

                <div className="flex items-end md:col-span-4">
                  <Button onClick={addIngredient} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Ingrediente
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Ingredientes Adicionados:</h3>
                {newDishIngredients.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ingrediente</TableHead>
                          <TableHead>Quantidade</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newDishIngredients.map((ingredient) => (
                          <TableRow key={ingredient.id}>
                            <TableCell>{ingredient.name}</TableCell>
                            <TableCell>
                              {ingredient.quantity} {ingredient.unit}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeIngredient(ingredient.id)}
                                className="text-red-500"
                              >
                                Remover
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center p-4 border rounded-md text-muted-foreground">
                    Nenhum ingrediente adicionado.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsCreatingDish(false)}>
              Cancelar
            </Button>
            <Button onClick={saveDish}>Salvar Prato</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de visualização de prato */}
      <Dialog open={isViewingDish} onOpenChange={setIsViewingDish}>
        <DialogContent className="max-w-3xl">
          {currentDish && (
            <>
              <DialogHeader>
                <DialogTitle>{currentDish.name}</DialogTitle>
                <DialogDescription>
                  {currentDish.categories?.name || "Sem categoria"} - R$ {currentDish.price.toFixed(2)}
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                {currentDish.description && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-2">Descrição:</h3>
                    <p className="text-sm text-muted-foreground">{currentDish.description}</p>
                  </div>
                )}

                <h3 className="text-sm font-medium mb-2">Ingredientes:</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ingrediente</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Estoque Disponível</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentDish.dish_ingredients.map((ingredient) => (
                        <TableRow key={ingredient.id}>
                          <TableCell>{ingredient.stock_items?.name || "Ingrediente não encontrado"}</TableCell>
                          <TableCell>
                            {ingredient.quantity} {ingredient.unit}
                          </TableCell>
                          <TableCell>
                            {ingredient.stock_items ? (
                              <span
                                className={
                                  ingredient.stock_items.quantity < ingredient.quantity
                                    ? "text-red-500 font-medium"
                                    : ""
                                }
                              >
                                {ingredient.stock_items.quantity} {ingredient.stock_items.unit}
                              </span>
                            ) : (
                              "N/A"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewingDish(false)}>
                  Fechar
                </Button>
                <Button onClick={() => prepareDish(currentDish)}>Preparar Prato</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Componente para simulação de CMV
function SimulacaoCMV({ stockItems, dishes }) {
  const [vendasSemanais, setVendasSemanais] = useState([])
  const [novaVenda, setNovaVenda] = useState({ dishId: "", quantidade: 1 })
  const [resultadoCMV, setResultadoCMV] = useState(null)
  const { toast } = useToast()

  // Adicionar venda à simulação
  const adicionarVenda = () => {
    if (!novaVenda.dishId || novaVenda.quantidade <= 0) {
      toast({
        title: "Dados incompletos",
        description: "Selecione um prato e informe a quantidade vendida.",
        variant: "destructive",
      })
      return
    }

    const prato = dishes.find((d) => d.id === Number(novaVenda.dishId))
    if (!prato) return

    setVendasSemanais([
      ...vendasSemanais,
      {
        id: Date.now(),
        dishId: Number(novaVenda.dishId),
        nome: prato.name,
        quantidade: novaVenda.quantidade,
        precoVenda: prato.price,
        valorTotal: prato.price * novaVenda.quantidade,
      },
    ])

    setNovaVenda({ dishId: "", quantidade: 1 })
  }

  // Remover venda da simulação
  const removerVenda = (id) => {
    setVendasSemanais(vendasSemanais.filter((venda) => venda.id !== id))
  }

  // Calcular CMV
  const calcularCMV = () => {
    if (vendasSemanais.length === 0) {
      toast({
        title: "Sem dados",
        description: "Adicione vendas para calcular o CMV.",
        variant: "destructive",
      })
      return
    }

    let custoTotal = 0
    let receitaTotal = 0
    const detalhes = []

    // Para cada venda, calcular o custo dos ingredientes
    for (const venda of vendasSemanais) {
      const prato = dishes.find((d) => d.id === venda.dishId)
      if (!prato) continue

      let custoPrato = 0
      const ingredientes = []

      // Calcular custo de cada ingrediente
      for (const ingrediente of prato.dish_ingredients) {
        const stockItem = stockItems.find((item) => item.id === ingrediente.stock_item_id)
        if (!stockItem) continue

        // Converter unidades se necessário
        let quantidade = ingrediente.quantity
        if (ingrediente.unit !== stockItem.unit) {
          const convertido = convertUnits(ingrediente.quantity, ingrediente.unit, stockItem.unit)
          if (convertido !== null) {
            quantidade = convertido
          }
        }

        const custoIngrediente = quantidade * stockItem.price
        custoPrato += custoIngrediente

        ingredientes.push({
          nome: stockItem.name,
          quantidade: `${ingrediente.quantity} ${ingrediente.unit}`,
          custoUnitario: stockItem.price,
          custoTotal: custoIngrediente,
        })
      }

      const custoTotalVenda = custoPrato * venda.quantidade
      custoTotal += custoTotalVenda
      receitaTotal += venda.valorTotal

      detalhes.push({
        prato: prato.name,
        quantidade: venda.quantidade,
        precoVenda: prato.price,
        custoPrato,
        custoTotalVenda,
        receitaVenda: venda.valorTotal,
        margemBruta: venda.valorTotal - custoTotalVenda,
        ingredientes,
      })
    }

    const cmvPercentual = (custoTotal / receitaTotal) * 100
    const margemBruta = receitaTotal - custoTotal
    const margemBrutaPercentual = (margemBruta / receitaTotal) * 100

    setResultadoCMV({
      custoTotal,
      receitaTotal,
      cmvPercentual,
      margemBruta,
      margemBrutaPercentual,
      detalhes,
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Simulação de CMV (Custo de Mercadoria Vendida)</CardTitle>
          <CardDescription>Simule o CMV com base nas vendas semanais e no estoque atual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="dish-select">Prato</Label>
              <Select value={novaVenda.dishId} onValueChange={(value) => setNovaVenda({ ...novaVenda, dishId: value })}>
                <SelectTrigger id="dish-select">
                  <SelectValue placeholder="Selecione um prato" />
                </SelectTrigger>
                <SelectContent>
                  {dishes.map((dish) => (
                    <SelectItem key={dish.id} value={dish.id.toString()}>
                      {dish.name} - R$ {dish.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantidade-vendida">Quantidade Vendida</Label>
              <Input
                id="quantidade-vendida"
                type="number"
                min="1"
                value={novaVenda.quantidade}
                onChange={(e) => setNovaVenda({ ...novaVenda, quantidade: Number(e.target.value) })}
              />
            </div>

            <div className="md:col-span-3">
              <Button onClick={adicionarVenda} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Venda
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prato</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Preço Unitário</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendasSemanais.length > 0 ? (
                  vendasSemanais.map((venda) => (
                    <TableRow key={venda.id}>
                      <TableCell className="font-medium">{venda.nome}</TableCell>
                      <TableCell>{venda.quantidade}</TableCell>
                      <TableCell>R$ {venda.precoVenda.toFixed(2)}</TableCell>
                      <TableCell>R$ {venda.valorTotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removerVenda(venda.id)}
                          className="text-red-500"
                        >
                          Remover
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Nenhuma venda adicionada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <Button onClick={calcularCMV} className="w-full" disabled={vendasSemanais.length === 0}>
            Calcular CMV
          </Button>

          {resultadoCMV && (
            <div className="space-y-4 mt-6 p-4 border rounded-md">
              <h3 className="text-lg font-medium">Resultado da Simulação</h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 bg-muted rounded-md">
                  <div className="text-sm text-muted-foreground">Receita Total</div>
                  <div className="text-2xl font-bold">R$ {resultadoCMV.receitaTotal.toFixed(2)}</div>
                </div>

                <div className="p-4 bg-muted rounded-md">
                  <div className="text-sm text-muted-foreground">Custo Total</div>
                  <div className="text-2xl font-bold">R$ {resultadoCMV.custoTotal.toFixed(2)}</div>
                </div>

                <div className="p-4 bg-muted rounded-md">
                  <div className="text-sm text-muted-foreground">CMV</div>
                  <div className="text-2xl font-bold">{resultadoCMV.cmvPercentual.toFixed(2)}%</div>
                </div>

                <div className="p-4 bg-muted rounded-md">
                  <div className="text-sm text-muted-foreground">Margem Bruta</div>
                  <div className="text-2xl font-bold">{resultadoCMV.margemBrutaPercentual.toFixed(2)}%</div>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-md font-medium mb-2">Detalhes por Prato</h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Prato</TableHead>
                        <TableHead>Qtd.</TableHead>
                        <TableHead>Custo Unit.</TableHead>
                        <TableHead>Preço Venda</TableHead>
                        <TableHead>Margem Unit.</TableHead>
                        <TableHead>Margem Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultadoCMV.detalhes.map((detalhe, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{detalhe.prato}</TableCell>
                          <TableCell>{detalhe.quantidade}</TableCell>
                          <TableCell>R$ {detalhe.custoPrato.toFixed(2)}</TableCell>
                          <TableCell>R$ {detalhe.precoVenda.toFixed(2)}</TableCell>
                          <TableCell>
                            R$ {(detalhe.precoVenda - detalhe.custoPrato).toFixed(2)}(
                            {(((detalhe.precoVenda - detalhe.custoPrato) / detalhe.precoVenda) * 100).toFixed(2)}%)
                          </TableCell>
                          <TableCell>R$ {detalhe.margemBruta.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Componente para porcionamento de carnes
function PorcionamentoCarne({ stockItems }) {
  const [carneId, setCarneId] = useState("")
  const [pesoBruto, setPesoBruto] = useState(0)
  const [pesoLiquido, setPesoLiquido] = useState(0)
  const [quantidadePorcoes, setQuantidadePorcoes] = useState(0)
  const [pesoPorcao, setPesoPorcao] = useState(0)
  const [subprodutos, setSubprodutos] = useState([{ nome: "", peso: 0 }])
  const [resultados, setResultados] = useState([])
  const { toast } = useToast()

  // Filtrar apenas itens de carne
  const carnes = stockItems.filter(
    (item) =>
      item.name.toLowerCase().includes("carne") ||
      item.name.toLowerCase().includes("bife") ||
      item.name.toLowerCase().includes("filé") ||
      item.name.toLowerCase().includes("costela") ||
      item.name.toLowerCase().includes("picanha") ||
      item.name.toLowerCase().includes("frango") ||
      item.name.toLowerCase().includes("peixe"),
  )

  // Adicionar subproduto
  const adicionarSubproduto = () => {
    setSubprodutos([...subprodutos, { nome: "", peso: 0 }])
  }

  // Remover subproduto
  const removerSubproduto = (index) => {
    setSubprodutos(subprodutos.filter((_, i) => i !== index))
  }

  // Atualizar subproduto
  const atualizarSubproduto = (index, campo, valor) => {
    const novosSubprodutos = [...subprodutos]
    novosSubprodutos[index] = { ...novosSubprodutos[index], [campo]: valor }
    setSubprodutos(novosSubprodutos)
  }

  // Calcular porcionamento
  const calcularPorcionamento = () => {
    if (!carneId || pesoBruto <= 0) {
      toast({
        title: "Dados incompletos",
        description: "Selecione uma carne e informe o peso bruto.",
        variant: "destructive",
      })
      return
    }

    const carne = stockItems.find((item) => item.id === Number(carneId))
    if (!carne) return

    // Calcular perda
    const pesoSubprodutos = subprodutos.reduce((total, sub) => total + Number(sub.peso), 0)
    const perda = pesoBruto - pesoLiquido - pesoSubprodutos
    const perdaPercentual = (perda / pesoBruto) * 100

    // Calcular rendimento
    const rendimento = (pesoLiquido / pesoBruto) * 100

    // Calcular custo por porção
    const custoPorKg = carne.price
    const custoBruto = pesoBruto * custoPorKg
    const custoPorPorcao = custoBruto / quantidadePorcoes

    const resultado = {
      id: Date.now(),
      data: new Date().toISOString(),
      carne: carne.name,
      pesoBruto,
      pesoLiquido,
      quantidadePorcoes,
      pesoPorcao,
      perda,
      perdaPercentual,
      rendimento,
      custoPorKg,
      custoBruto,
      custoPorPorcao,
      subprodutos: [...subprodutos],
    }

    setResultados([resultado, ...resultados])

    // Limpar formulário
    setPesoBruto(0)
    setPesoLiquido(0)
    setQuantidadePorcoes(0)
    setPesoPorcao(0)
    setSubprodutos([{ nome: "", peso: 0 }])

    toast({
      title: "Porcionamento calculado",
      description: "O porcionamento foi calculado e registrado com sucesso.",
    })
  }

  // Calcular peso da porção quando quantidade muda
  useEffect(() => {
    if (pesoLiquido > 0 && quantidadePorcoes > 0) {
      setPesoPorcao(pesoLiquido / quantidadePorcoes)
    }
  }, [pesoLiquido, quantidadePorcoes])

  // Calcular quantidade de porções quando peso da porção muda
  useEffect(() => {
    if (pesoLiquido > 0 && pesoPorcao > 0) {
      setQuantidadePorcoes(Math.floor(pesoLiquido / pesoPorcao))
    }
  }, [pesoLiquido, pesoPorcao])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Porcionamento de Carnes</CardTitle>
          <CardDescription>Registre o porcionamento de carnes para controle de rendimento e custos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="carne-select">Carne</Label>
              <Select value={carneId} onValueChange={setCarneId}>
                <SelectTrigger id="carne-select">
                  <SelectValue placeholder="Selecione uma carne" />
                </SelectTrigger>
                <SelectContent>
                  {carnes.map((carne) => (
                    <SelectItem key={carne.id} value={carne.id.toString()}>
                      {carne.name} - R$ {carne.price.toFixed(2)}/{carne.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="peso-bruto">Peso Bruto (Kg)</Label>
              <Input
                id="peso-bruto"
                type="number"
                step="0.01"
                min="0"
                value={pesoBruto || ""}
                onChange={(e) => setPesoBruto(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="peso-liquido">Peso Líquido (Kg)</Label>
              <Input
                id="peso-liquido"
                type="number"
                step="0.01"
                min="0"
                value={pesoLiquido || ""}
                onChange={(e) => setPesoLiquido(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantidade-porcoes">Quantidade de Porções</Label>
              <Input
                id="quantidade-porcoes"
                type="number"
                min="0"
                value={quantidadePorcoes || ""}
                onChange={(e) => setQuantidadePorcoes(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="peso-porcao">Peso por Porção (Kg)</Label>
              <Input
                id="peso-porcao"
                type="number"
                step="0.001"
                min="0"
                value={pesoPorcao || ""}
                onChange={(e) => setPesoPorcao(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-medium">Subprodutos</h3>
              <Button variant="outline" size="sm" onClick={adicionarSubproduto}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>

            {subprodutos.map((subproduto, index) => (
              <div key={index} className="grid grid-cols-1 gap-4 md:grid-cols-3 items-end border-b pb-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`subproduto-nome-${index}`}>Nome do Subproduto</Label>
                  <Input
                    id={`subproduto-nome-${index}`}
                    value={subproduto.nome}
                    onChange={(e) => atualizarSubproduto(index, "nome", e.target.value)}
                    placeholder="Ex: Ossos, Gordura, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`subproduto-peso-${index}`}>Peso (Kg)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`subproduto-peso-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={subproduto.peso || ""}
                      onChange={(e) => atualizarSubproduto(index, "peso", Number(e.target.value))}
                    />
                    {index > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removerSubproduto(index)}
                        className="text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={calcularPorcionamento} className="w-full">
            Calcular Porcionamento
          </Button>

          {resultados.length > 0 && (
            <div className="space-y-4 mt-6">
              <h3 className="text-lg font-medium">Histórico de Porcionamento</h3>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Carne</TableHead>
                      <TableHead>Peso Bruto</TableHead>
                      <TableHead>Peso Líquido</TableHead>
                      <TableHead>Rendimento</TableHead>
                      <TableHead>Porções</TableHead>
                      <TableHead>Custo/Porção</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultados.map((resultado) => (
                      <TableRow key={resultado.id}>
                        <TableCell>{new Date(resultado.data).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="font-medium">{resultado.carne}</TableCell>
                        <TableCell>{resultado.pesoBruto.toFixed(2)} Kg</TableCell>
                        <TableCell>{resultado.pesoLiquido.toFixed(2)} Kg</TableCell>
                        <TableCell>{resultado.rendimento.toFixed(2)}%</TableCell>
                        <TableCell>
                          {resultado.quantidadePorcoes} x {resultado.pesoPorcao.toFixed(3)} Kg
                        </TableCell>
                        <TableCell>R$ {resultado.custoPorPorcao.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
