"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Plus, QrCode, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { useSession } from "@/components/providers/session-provider"

export default function NotaFiscalPage() {
  const { toast } = useToast()
  const { session } = useSession()
  const userId = session?.user?.id || ""

  const [stockItems, setStockItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  // Nota Fiscal fields
  const [nfNumber, setNfNumber] = useState("")
  const [nfDate, setNfDate] = useState(new Date().toISOString().split("T")[0])
  const [nfSupplier, setNfSupplier] = useState("")
  const [nfSupplierCnpj, setNfSupplierCnpj] = useState("")
  const [nfEntryDate, setNfEntryDate] = useState(new Date().toISOString().split("T")[0])
  const [nfDueDate, setNfDueDate] = useState("")
  const [nfValue, setNfValue] = useState("")

  const [items, setItems] = useState([{ id: 1, name: "", quantity: 1, unit: "", price: 0, category: "" }])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createBrowserSupabaseClient()

        // Fetch stock items
        const { data: stockData, error: stockError } = await supabase
          .from("stock_items")
          .select("*, categories(*)")
          .order("name")

        if (stockError) throw stockError

        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("*")
          .eq("type", "stock")
          .order("name")

        if (categoriesError) throw categoriesError

        setStockItems(stockData || [])
        setCategories(categoriesData || [])
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados necessários.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [toast])

  // Função para verificar se um item existe no estoque e obter suas informações
  const findItemInStock = (itemName) => {
    return stockItems.find((stockItem) => stockItem.name.toLowerCase() === itemName.toLowerCase())
  }

  const handleQuantityChange = (id, newQuantity) => {
    setItems(items.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item)))
  }

  const handleRemoveItem = (id) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const handleItemChange = (id, field, value) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }

          // Se o nome do item foi alterado, verificar se já existe no estoque
          if (field === "name" && typeof value === "string" && value.trim() !== "") {
            const existingItem = findItemInStock(value)

            // Se encontrou o item no estoque, preencher a unidade automaticamente
            if (existingItem) {
              return {
                ...updatedItem,
                unit: existingItem.unit,
                category: existingItem.category_id || updatedItem.category,
              }
            }
          }

          return updatedItem
        }
        return item
      }),
    )
  }

  const handleAddItem = () => {
    const newId = items.length > 0 ? Math.max(...items.map((item) => item.id)) + 1 : 1
    setItems([...items, { id: newId, name: "", quantity: 1, unit: "", price: 0, category: "" }])
  }

  const totalValue = items.reduce((sum, item) => sum + item.quantity * item.price, 0)

  const handleConfirmEntry = async () => {
    // Validar se todos os itens têm nome e unidade
    const invalidItems = items.filter((item) => !item.name || !item.unit)
    if (invalidItems.length > 0) {
      toast({
        title: "Dados incompletos",
        description: "Todos os itens precisam ter nome e unidade definidos.",
        variant: "destructive",
      })
      return
    }

    try {
      const supabase = createBrowserSupabaseClient()

      // Process each item
      for (const item of items) {
        // Check if item exists in stock
        const { data: existingItems, error: searchError } = await supabase
          .from("stock_items")
          .select("*")
          .ilike("name", item.name)
          .limit(1)

        if (searchError) throw searchError

        let stockItemId

        if (existingItems && existingItems.length > 0) {
          // Update existing item
          const existingItem = existingItems[0]
          const newQuantity = existingItem.quantity + item.quantity

          const { error: updateError } = await supabase
            .from("stock_items")
            .update({ quantity: newQuantity })
            .eq("id", existingItem.id)

          if (updateError) throw updateError

          stockItemId = existingItem.id
        } else {
          // Add new item
          const { data: newItem, error: insertError } = await supabase
            .from("stock_items")
            .insert({
              name: item.name,
              category_id: item.category || null,
              unit: item.unit,
              quantity: item.quantity,
              price: item.price,
              min_quantity: Math.ceil(item.quantity * 0.2), // 20% of initial quantity
            })
            .select()

          if (insertError) throw insertError

          stockItemId = newItem[0].id
        }

        // Record movement
        const { error: movementError } = await supabase.from("stock_movements").insert({
          stock_item_id: stockItemId,
          movement_type: "entrada",
          quantity: item.quantity,
          unit: item.unit,
          user_id: userId,
          notes: `Entrada via nota fiscal #${nfNumber || "N/A"} - Fornecedor: ${nfSupplier || "N/A"}`,
        })

        if (movementError) throw movementError
      }

      // Reset form
      setItems([{ id: 1, name: "", quantity: 1, unit: "", price: 0, category: "" }])
      setNfNumber("")
      setNfValue("")
      setNfDate(new Date().toISOString().split("T")[0])
      setNfEntryDate(new Date().toISOString().split("T")[0])
      setNfDueDate("")
      setNfSupplier("")
      setNfSupplierCnpj("")

      toast({
        title: "Entrada confirmada",
        description: `${items.length} itens adicionados ao estoque com sucesso.`,
      })
    } catch (error) {
      console.error("Error confirming entry:", error)
      toast({
        title: "Erro ao confirmar entrada",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Carregando dados...</div>
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" asChild className="mr-2">
          <a href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </a>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Entrada de Itens</h1>
      </div>

      <Tabs defaultValue="nota-fiscal" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="nota-fiscal">Nota Fiscal</TabsTrigger>
          <TabsTrigger value="avulsa">Entrada Avulsa</TabsTrigger>
        </TabsList>

        <TabsContent value="nota-fiscal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Nota Fiscal</CardTitle>
              <CardDescription>Insira os dados da nota fiscal ou escaneie o QR Code</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nf-number">Número da Nota Fiscal</Label>
                  <Input
                    id="nf-number"
                    placeholder="Ex: 123456"
                    value={nfNumber}
                    onChange={(e) => setNfNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nf-date">Data de Emissão</Label>
                  <Input id="nf-date" type="date" value={nfDate} onChange={(e) => setNfDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nf-entry-date">Data de Entrada</Label>
                  <Input
                    id="nf-entry-date"
                    type="date"
                    value={nfEntryDate}
                    onChange={(e) => setNfEntryDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nf-due-date">Data de Vencimento</Label>
                  <Input
                    id="nf-due-date"
                    type="date"
                    value={nfDueDate}
                    onChange={(e) => setNfDueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nf-supplier">Fornecedor</Label>
                  <Input
                    id="nf-supplier"
                    placeholder="Nome do fornecedor"
                    value={nfSupplier}
                    onChange={(e) => setNfSupplier(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nf-supplier-cnpj">CNPJ do Fornecedor</Label>
                  <Input
                    id="nf-supplier-cnpj"
                    placeholder="Ex: 00.000.000/0001-00"
                    value={nfSupplierCnpj}
                    onChange={(e) => setNfSupplierCnpj(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nf-value">Valor Total</Label>
                  <Input
                    id="nf-value"
                    placeholder="R$ 0,00"
                    value={nfValue}
                    onChange={(e) => setNfValue(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-center mt-4">
                <Button variant="outline" className="w-full md:w-auto">
                  <QrCode className="mr-2 h-4 w-4" />
                  Escanear QR Code
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Itens da Nota Fiscal</CardTitle>
              <CardDescription>Confira e ajuste os itens que serão adicionados ao estoque</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="hidden md:table-cell">Preço Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          value={item.name}
                          onChange={(e) => handleItemChange(item.id, "name", e.target.value)}
                          className="h-8"
                          placeholder="Nome do item"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.id, Number.parseInt(e.target.value) || 1)}
                          className="w-20 h-8"
                          min="1"
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={item.unit} onValueChange={(value) => handleItemChange(item.id, "unit", value)}>
                          <SelectTrigger className="h-8 w-24">
                            <SelectValue placeholder="Unid." />
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
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => handleItemChange(item.id, "price", Number.parseFloat(e.target.value) || 0)}
                          className="w-24 h-8"
                          min="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">R$ {(item.quantity * item.price).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remover item</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button variant="outline" onClick={handleAddItem} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Item
              </Button>
            </CardContent>
            <CardFooter className="flex flex-col items-end">
              <Separator className="my-4" />
              <div className="flex items-center justify-between w-full md:w-1/2">
                <span className="text-lg font-medium">Total:</span>
                <span className="text-lg font-bold">R$ {totalValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-end w-full mt-4">
                <Button variant="outline" className="mr-2">
                  Cancelar
                </Button>
                <Button onClick={handleConfirmEntry}>Confirmar Entrada</Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="avulsa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Entrada Avulsa de Itens</CardTitle>
              <CardDescription>Insira os dados dos itens que deseja adicionar ao estoque</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="avulsa-nf-number">Número da Nota Fiscal (opcional)</Label>
                  <Input
                    id="avulsa-nf-number"
                    placeholder="Ex: 123456"
                    value={nfNumber}
                    onChange={(e) => setNfNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avulsa-date">Data de Entrada</Label>
                  <Input
                    id="avulsa-date"
                    type="date"
                    value={nfEntryDate}
                    onChange={(e) => setNfEntryDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avulsa-supplier">Fornecedor</Label>
                  <Input
                    id="avulsa-supplier"
                    placeholder="Nome do fornecedor"
                    value={nfSupplier}
                    onChange={(e) => setNfSupplier(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avulsa-supplier-cnpj">CNPJ do Fornecedor</Label>
                  <Input
                    id="avulsa-supplier-cnpj"
                    placeholder="Ex: 00.000.000/0001-00"
                    value={nfSupplierCnpj}
                    onChange={(e) => setNfSupplierCnpj(e.target.value)}
                  />
                </div>
              </div>

              {items.map((item, index) => (
                <div key={item.id} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Item {index + 1}</h3>
                    {items.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)}>
                        Remover
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`item-name-${item.id}`}>Nome do Item</Label>
                      <Input
                        id={`item-name-${item.id}`}
                        placeholder="Ex: Arroz"
                        value={item.name}
                        onChange={(e) => handleItemChange(item.id, "name", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`item-category-${item.id}`}>Categoria</Label>
                      <Select
                        value={item.category || ""}
                        onValueChange={(value) => handleItemChange(item.id, "category", value)}
                      >
                        <SelectTrigger id={`item-category-${item.id}`}>
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
                      <Label htmlFor={`item-quantity-${item.id}`}>Quantidade</Label>
                      <Input
                        id={`item-quantity-${item.id}`}
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, "quantity", Number.parseInt(e.target.value) || 1)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`item-unit-${item.id}`}>Unidade</Label>
                      <Select
                        value={item.unit || ""}
                        onValueChange={(value) => handleItemChange(item.id, "unit", value)}
                      >
                        <SelectTrigger id={`item-unit-${item.id}`}>
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

                    <div className="space-y-2">
                      <Label htmlFor={`item-price-${item.id}`}>Preço Unitário</Label>
                      <Input
                        id={`item-price-${item.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.price}
                        onChange={(e) => handleItemChange(item.id, "price", Number.parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`item-notes-${item.id}`}>Observações</Label>
                    <Textarea id={`item-notes-${item.id}`} placeholder="Observações adicionais sobre o item" />
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={handleAddItem} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Outro Item
              </Button>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button variant="outline" asChild>
                <a href="/dashboard">Cancelar</a>
              </Button>
              <Button onClick={handleConfirmEntry}>Confirmar Entrada</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
