"use client"

import { AlertCircle, ArrowDown, ArrowUp, ChefHat, Download, Moon, Package, Sun } from "lucide-react"
import { useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { createBrowserSupabaseClient } from "@/lib/supabase/browser"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTheme } from "next-themes"

// Tipo para os itens do estoque
type StockItem = {
  id: number
  name: string
  category_id: number | null
  categories?: {
    name: string
    type: string
  }
  unit: string
  quantity: number
  price: number
  min_quantity: number
  created_at: string
  updated_at: string
}

// Tipo para os pratos
type Dish = {
  id: number
  name: string
  description: string | null
  category_id: number | null
  categories?: {
    name: string
    type: string
  }
  dish_ingredients: {
    id: number
    dish_id: number
    stock_item_id: number
    quantity: number
    unit: string
    stock_items?: {
      id: number
      name: string
      unit: string
      quantity: number
    }
  }[]
  price: number
  created_at: string
  updated_at: string
}

// Tipo para as movimentações
type StockMovement = {
  id: number
  stock_item_id: number
  movement_type: string
  quantity: number
  unit: string
  dish_id: number | null
  user_id: string | null
  notes: string | null
  created_at: string
  stock_items?: {
    name: string
    unit: string
  }
}

// Cores para os gráficos
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#8dd1e1"]

export default function DashboardPage() {
  const { theme, setTheme } = useTheme()
  const [period, setPeriod] = useState("month")
  const [recentTransactions, setRecentTransactions] = useState<StockMovement[]>([])
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [dishes, setDishes] = useState<Dish[]>([])
  const [lowStockItems, setLowStockItems] = useState<StockItem[]>([])
  const [isClient, setIsClient] = useState(false)
  const [totalValue, setTotalValue] = useState(0)
  const [movementData, setMovementData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [stockTrendData, setStockTrendData] = useState<any[]>([])

  useEffect(() => {
    setIsClient(true)
    fetchData(period)
  }, [period])

  const fetchData = async (selectedPeriod: string) => {
    try {
      const supabase = createBrowserSupabaseClient()

      // Calcular a data de início com base no período selecionado
      const startDate = new Date()
      switch (selectedPeriod) {
        case "week":
          startDate.setDate(startDate.getDate() - 7)
          break
        case "month":
          startDate.setMonth(startDate.getMonth() - 1)
          break
        case "quarter":
          startDate.setMonth(startDate.getMonth() - 3)
          break
        case "year":
          startDate.setFullYear(startDate.getFullYear() - 1)
          break
        default:
          startDate.setMonth(startDate.getMonth() - 1) // Padrão: último mês
      }

      const startDateStr = startDate.toISOString()

      // Buscar itens de estoque
      const { data: stockData, error: stockError } = await supabase
        .from("stock_items")
        .select("*, categories(*)")
        .order("name")

      if (stockError) throw stockError

      // Buscar pratos
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

      // Buscar movimentações recentes
      const { data: movementsData, error: movementsError } = await supabase
        .from("stock_movements")
        .select(`
          *,
          stock_items(name, unit)
        `)
        .order("created_at", { ascending: false })
        .limit(4)

      if (movementsError) throw movementsError

      // Buscar movimentações para o gráfico (filtradas por período)
      const { data: periodMovementsData, error: periodMovementsError } = await supabase
        .from("stock_movements")
        .select(`
          *,
          stock_items(name, unit)
        `)
        .gte("created_at", startDateStr)
        .order("created_at")

      if (periodMovementsError) throw periodMovementsError

      // Processar dados
      if (stockData) {
        setStockItems(stockData)
        setLowStockItems(stockData.filter((item) => item.quantity < item.min_quantity))

        // Calcular o valor total do estoque
        const total = stockData.reduce((sum, item) => sum + item.price * item.quantity, 0)
        setTotalValue(total)

        // Preparar dados para o gráfico de categorias
        const categoryValues = stockData.reduce<Record<string, number>>((acc, item) => {
          const categoryName = item.categories?.name || "Sem categoria"
          if (!acc[categoryName]) acc[categoryName] = 0
          acc[categoryName] += item.quantity * item.price
          return acc
        }, {})

        const categoryChartData = Object.entries(categoryValues).map(([name, value]) => ({
          name,
          value,
        }))

        setCategoryData(categoryChartData)
      }

      if (dishesData) {
        setDishes(dishesData)
      }

      if (movementsData) {
        setRecentTransactions(movementsData)
      }

      if (periodMovementsData) {
        // Agrupar movimentações por dia
        const movementsByDay = periodMovementsData.reduce<Record<string, { entrada: number; saida: number }>>(
          (acc, movement) => {
            const date = new Date(movement.created_at).toISOString().split("T")[0]
            if (!acc[date]) {
              acc[date] = { entrada: 0, saida: 0 }
            }

            if (movement.movement_type === "entrada") {
              acc[date].entrada += 1
            } else {
              acc[date].saida += 1
            }

            return acc
          },
          {},
        )

        // Converter para formato de gráfico
        const movementChartData = Object.entries(movementsByDay).map(([date, counts]) => ({
          date: new Date(date).toLocaleDateString("pt-BR"),
          entrada: counts.entrada,
          saida: counts.saida,
        }))

        // Ordenar por data
        movementChartData.sort((a, b) => {
          const dateA = new Date(a.date.split("/").reverse().join("-"))
          const dateB = new Date(b.date.split("/").reverse().join("-"))
          return dateA.getTime() - dateB.getTime()
        })

        setMovementData(movementChartData)

        // Preparar dados para o gráfico de tendência de estoque
        // Agrupar por semana para simplificar a visualização
        const weeklyData: Record<string, number> = {}

        periodMovementsData.forEach((movement) => {
          const date = new Date(movement.created_at)
          const weekNum = Math.floor(date.getDate() / 7) + 1
          const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`
          const weekKey = `Semana ${weekNum} - ${monthYear}`

          if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = 0
          }

          if (movement.movement_type === "entrada") {
            weeklyData[weekKey] += movement.quantity
          } else {
            weeklyData[weekKey] -= movement.quantity
          }
        })

        const trendData = Object.entries(weeklyData).map(([week, value]) => ({
          name: week,
          value,
        }))

        setStockTrendData(trendData)
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    }
  }

  // Função para exportar dados do dashboard
  const exportDashboardData = () => {
    // Criar CSV para estoque
    const stockHeaders = [
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
    const stockCsv = [
      stockHeaders.join(","),
      ...stockItems.map((item) =>
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
    const blob = new Blob([stockCsv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `estoque_dashboard_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    alert("Dados exportados com sucesso!")
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  if (!isClient) {
    return null // Não renderizar nada durante SSR
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-4 md:flex-row">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="ml-auto flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Última Semana</SelectItem>
              <SelectItem value="month">Último Mês</SelectItem>
              <SelectItem value="quarter">Último Trimestre</SelectItem>
              <SelectItem value="year">Último Ano</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={toggleTheme} size="icon" className="mr-2">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button variant="outline" onClick={exportDashboardData} className="mr-2">
            <Download className="mr-2 h-4 w-4" />
            Exportar Dados
          </Button>

          <Button asChild>
            <a href="/dashboard/nota-fiscal">
              <Package className="mr-2 h-4 w-4" />
              Nova Entrada
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockItems.length}</div>
            <p className="text-xs text-muted-foreground">+12% em relação ao mês anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor em Estoque</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">+2% em relação ao mês anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pratos Cadastrados</CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dishes.length}</div>
            <p className="text-xs text-muted-foreground">Pratos disponíveis para preparo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Itens com Estoque Baixo</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stockItems.filter((item) => item.quantity < item.min_quantity).length}
            </div>
            <p className="text-xs text-muted-foreground">Itens abaixo do estoque mínimo</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Movimentações */}
      <Card>
        <CardHeader>
          <CardTitle>Movimentações de Estoque</CardTitle>
          <CardDescription>Entradas e saídas de itens no período selecionado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={movementData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 60,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="entrada" name="Entradas" fill="#10b981" />
                <Bar dataKey="saida" name="Saídas" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Gráfico de Categorias */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Categorias</CardTitle>
            <CardDescription>Valor em estoque por categoria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Tendência de Estoque */}
        <Card>
          <CardHeader>
            <CardTitle>Tendência de Estoque</CardTitle>
            <CardDescription>Variação do estoque ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stockTrendData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 60,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(2)} unidades`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Variação de Estoque"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Itens com Estoque Baixo</CardTitle>
            <CardDescription>Itens que estão abaixo do nível mínimo recomendado</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockItems.length > 0 ? (
              <>
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Atenção!</AlertTitle>
                  <AlertDescription>
                    Existem {lowStockItems.length} itens com estoque abaixo do mínimo recomendado.
                  </AlertDescription>
                </Alert>
                <div className="space-y-4">
                  {lowStockItems.map((item) => (
                    <div key={item.id} className="flex items-center">
                      <div className="flex-1 space-y-1">
                        <div className="text-sm font-medium leading-none flex items-center gap-2">
                          <span>{item.name}</span>
                          <Badge variant="outline">
                            {item.quantity} {item.unit}
                          </Badge>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <span className="mr-2">
                            Mínimo: {item.min_quantity} {item.unit}
                          </span>
                          <Progress value={(item.quantity / item.min_quantity) * 100} className="h-2 w-24" />
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href="/dashboard/nota-fiscal?tab=avulsa">Adicionar</a>
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Não há itens com estoque baixo no momento.</div>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Movimentações Recentes</CardTitle>
            <CardDescription>Últimas entradas e saídas de estoque</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center">
                  <div className="mr-4">
                    {transaction.movement_type === "entrada" ? (
                      <div className="rounded-full bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300">
                        <ArrowDown className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="rounded-full bg-red-100 p-2 text-red-600 dark:bg-red-900 dark:text-red-300">
                        <ArrowUp className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {transaction.stock_items?.name || "Item não encontrado"}
                      <Badge variant="outline" className="ml-2">
                        {transaction.quantity} {transaction.unit}
                      </Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-sm font-medium">
                    {transaction.movement_type === "entrada" ? (
                      <span className="text-emerald-600 dark:text-emerald-400">Entrada</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">Saída</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pratos Populares</CardTitle>
            <CardDescription>Pratos mais preparados recentemente</CardDescription>
          </CardHeader>
          <CardContent>
            {dishes.length > 0 ? (
              <div className="space-y-4">
                {dishes.slice(0, 5).map((dish) => (
                  <div key={dish.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{dish.name}</p>
                      <p className="text-sm text-muted-foreground">{dish.dish_ingredients.length} ingredientes</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">R$ {dish.price.toFixed(2)}</p>
                      <Badge variant="outline">{dish.categories?.name || "Sem categoria"}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum prato cadastrado.
                <div className="mt-4">
                  <Button asChild>
                    <a href="/dashboard/pratos">
                      <ChefHat className="mr-2 h-4 w-4" />
                      Criar Pratos
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" asChild className="w-full">
              <a href="/dashboard/pratos">Ver Todos os Pratos</a>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Valor Total por Categoria</CardTitle>
            <CardDescription>Distribuição do valor em estoque por categoria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(
                stockItems.reduce<Record<string, number>>((acc, item) => {
                  const categoryName = item.categories?.name || "Sem categoria"
                  if (!acc[categoryName]) acc[categoryName] = 0
                  acc[categoryName] += item.quantity * item.price
                  return acc
                }, {}),
              ).map(([category, value]) => (
                <div key={category} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium capitalize">{category}</p>
                    <p className="text-sm text-muted-foreground">
                      {stockItems.filter((item) => (item.categories?.name || "Sem categoria") === category).length}{" "}
                      itens
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">R$ {value.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">{((value / totalValue) * 100).toFixed(1)}% do total</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" asChild className="w-full">
              <a href="/dashboard/relatorios">Ver Relatórios Detalhados</a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
