"use client"

import { useState, useEffect } from "react"
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
  ComposedChart,
  Area,
} from "recharts"
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChefHat,
  Download,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createBrowserSupabaseClient } from "@/lib/supabase/browser"
import { useToast } from "@/hooks/use-toast"
import { GoalFormDialog } from "@/components/cmv/goal-form-dialog"
import { GoalProgressCard } from "@/components/cmv/goal-progress-card"
import { DeleteGoalDialog } from "@/components/cmv/delete-goal-dialog"
import { PredictiveAnalysis } from "@/components/cmv/predictive-analysis"

// Cores para os gráficos
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#8dd1e1"]

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
      price: number
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
    price: number
  }
}

// Tipo para análise de CMV por prato
type DishCMVAnalysis = {
  id: number
  name: string
  category: string
  price: number
  cost: number
  cmvPercentage: number
  margin: number
  marginPercentage: number
  ingredients: {
    name: string
    quantity: string
    cost: number
  }[]
}

// Tipo para metas de CMV
type CMVGoal = {
  id: number
  name: string
  target_percentage: number
  category_id: number | null
  dish_id: number | null
  start_date: string
  end_date: string
  created_by: string
  created_at: string
  updated_at: string
  categories?: {
    id: number
    name: string
  } | null
  dishes?: {
    id: number
    name: string
  } | null
}

export default function CMVDashboardPage() {
  const { toast } = useToast()
  const [period, setPeriod] = useState("month")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [dishes, setDishes] = useState<Dish[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [cmvAnalysis, setCmvAnalysis] = useState<DishCMVAnalysis[]>([])
  const [cmvTrendData, setCmvTrendData] = useState<any[]>([])
  const [cmvByCategoryData, setCmvByCategoryData] = useState<any[]>([])
  const [cmvGoals, setCmvGoals] = useState<CMVGoal[]>([])
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<CMVGoal | null>(null)
  const [cmvSummary, setCmvSummary] = useState({
    averageCmv: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalMargin: 0,
    bestDish: { name: "", cmv: 0 },
    worstDish: { name: "", cmv: 0 },
  })

  useEffect(() => {
    fetchData(period)
  }, [period, categoryFilter])

  const fetchData = async (selectedPeriod: string) => {
    try {
      setIsLoading(true)
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

      // Buscar categorias
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("type", "dish")
        .order("name")

      if (categoriesError) throw categoriesError

      // Buscar pratos com ingredientes
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

      // Buscar movimentações de saída relacionadas a pratos
      const { data: movementsData, error: movementsError } = await supabase
        .from("stock_movements")
        .select(`
          *,
          stock_items(*)
        `)
        .eq("movement_type", "saida")
        .not("dish_id", "is", null)
        .gte("created_at", startDateStr)
        .order("created_at")

      if (movementsError) throw movementsError

      // Buscar metas de CMV
      const { data: goalsData, error: goalsError } = await supabase
        .from("cmv_goals")
        .select(`
          *,
          categories(*),
          dishes(*)
        `)
        .order("created_at", { ascending: false })

      if (goalsError) throw goalsError

      // Processar dados
      if (categoriesData) {
        setCategories(categoriesData)
      }

      if (dishesData && dishesData.length > 0) {
        // Filtrar pratos por categoria se necessário
        const filteredDishes =
          categoryFilter === "all"
            ? dishesData
            : dishesData.filter((dish) => dish.category_id === Number.parseInt(categoryFilter))

        setDishes(filteredDishes)

        // Calcular CMV para cada prato
        const dishAnalysis: DishCMVAnalysis[] = filteredDishes.map((dish) => {
          let totalCost = 0

          // Calcular custo total dos ingredientes
          const ingredientsAnalysis = dish.dish_ingredients.map((ingredient) => {
            const stockItem = ingredient.stock_items
            if (!stockItem) return { name: "Desconhecido", quantity: "0", cost: 0 }

            const ingredientCost = ingredient.quantity * stockItem.price
            totalCost += ingredientCost

            return {
              name: stockItem.name,
              quantity: `${ingredient.quantity} ${ingredient.unit}`,
              cost: ingredientCost,
            }
          })

          // Calcular métricas de CMV
          const cmvPercentage = (totalCost / dish.price) * 100
          const margin = dish.price - totalCost
          const marginPercentage = (margin / dish.price) * 100

          return {
            id: dish.id,
            name: dish.name,
            category: dish.categories?.name || "Sem categoria",
            price: dish.price,
            cost: totalCost,
            cmvPercentage,
            margin,
            marginPercentage,
            ingredients: ingredientsAnalysis,
          }
        })

        setCmvAnalysis(dishAnalysis)

        // Calcular métricas de resumo
        if (dishAnalysis.length > 0) {
          const totalRevenue = dishAnalysis.reduce((sum, dish) => sum + dish.price, 0)
          const totalCost = dishAnalysis.reduce((sum, dish) => sum + dish.cost, 0)
          const totalMargin = totalRevenue - totalCost
          const averageCmv = (totalCost / totalRevenue) * 100

          // Encontrar prato com menor e maior CMV
          const sortedByEfficiency = [...dishAnalysis].sort((a, b) => a.cmvPercentage - b.cmvPercentage)
          const bestDish = sortedByEfficiency[0]
          const worstDish = sortedByEfficiency[sortedByEfficiency.length - 1]

          setCmvSummary({
            averageCmv,
            totalRevenue,
            totalCost,
            totalMargin,
            bestDish: { name: bestDish.name, cmv: bestDish.cmvPercentage },
            worstDish: { name: worstDish.name, cmv: worstDish.cmvPercentage },
          })
        }

        // Preparar dados para o gráfico de CMV por categoria
        const cmvByCategory = filteredDishes.reduce<Record<string, { cost: number; revenue: number; count: number }>>(
          (acc, dish) => {
            const category = dish.categories?.name || "Sem categoria"
            if (!acc[category]) {
              acc[category] = { cost: 0, revenue: 0, count: 0 }
            }

            // Calcular custo total dos ingredientes
            const dishCost = dish.dish_ingredients.reduce((sum, ingredient) => {
              const stockItem = ingredient.stock_items
              if (!stockItem) return sum
              return sum + ingredient.quantity * stockItem.price
            }, 0)

            acc[category].cost += dishCost
            acc[category].revenue += dish.price
            acc[category].count += 1

            return acc
          },
          {},
        )

        const cmvByCategoryChartData = Object.entries(cmvByCategory).map(([category, data]) => ({
          name: category,
          cmv: (data.cost / data.revenue) * 100,
          margin: ((data.revenue - data.cost) / data.revenue) * 100,
          count: data.count,
        }))

        setCmvByCategoryData(cmvByCategoryChartData)
      }

      if (movementsData) {
        setMovements(movementsData)

        // Agrupar movimentações por semana para o gráfico de tendência
        const cmvByWeek: Record<string, { cost: number; revenue: number; dishes: Set<number> }> = {}

        movementsData.forEach((movement) => {
          if (!movement.dish_id) return

          const date = new Date(movement.created_at)
          const weekNum = Math.floor(date.getDate() / 7) + 1
          const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`
          const weekKey = `Semana ${weekNum} - ${monthYear}`

          if (!cmvByWeek[weekKey]) {
            cmvByWeek[weekKey] = { cost: 0, revenue: 0, dishes: new Set() }
          }

          // Adicionar custo do ingrediente
          if (movement.stock_items) {
            cmvByWeek[weekKey].cost += movement.quantity * movement.stock_items.price
          }

          // Adicionar o prato à lista de pratos da semana
          cmvByWeek[weekKey].dishes.add(movement.dish_id)
        })

        // Calcular receita estimada com base nos pratos preparados
        Object.keys(cmvByWeek).forEach((week) => {
          const weekData = cmvByWeek[week]

          // Para cada prato preparado nesta semana, adicionar seu preço à receita
          weekData.dishes.forEach((dishId) => {
            const dish = dishes.find((d) => d.id === dishId)
            if (dish) {
              weekData.revenue += dish.price
            }
          })
        })

        // Converter para formato de gráfico
        const trendData = Object.entries(cmvByWeek).map(([week, data]) => {
          const cmvPercentage = data.revenue > 0 ? (data.cost / data.revenue) * 100 : 0
          return {
            name: week,
            cmv: cmvPercentage,
            cost: data.cost,
            revenue: data.revenue,
            margin: data.revenue - data.cost,
          }
        })

        // Ordenar por semana
        trendData.sort((a, b) => {
          const weekA = Number.parseInt(a.name.split(" ")[1])
          const weekB = Number.parseInt(b.name.split(" ")[1])
          return weekA - weekB
        })

        setCmvTrendData(trendData)
      }

      if (goalsData) {
        setCmvGoals(goalsData)
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados de CMV.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const exportCMVData = () => {
    // Criar CSV para análise de CMV
    const headers = [
      "ID",
      "Nome",
      "Categoria",
      "Preço de Venda",
      "Custo Total",
      "CMV (%)",
      "Margem",
      "Margem (%)",
      "Ingredientes",
    ]
    const csvContent = [
      headers.join(","),
      ...cmvAnalysis.map((dish) =>
        [
          dish.id,
          dish.name,
          dish.category,
          dish.price.toFixed(2),
          dish.cost.toFixed(2),
          dish.cmvPercentage.toFixed(2),
          dish.margin.toFixed(2),
          dish.marginPercentage.toFixed(2),
          dish.ingredients.map((ing) => `${ing.name}: ${ing.quantity} (R$ ${ing.cost.toFixed(2)})`).join("; "),
        ].join(","),
      ),
    ].join("\n")

    // Criar blob e link para download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `analise_cmv_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Exportação concluída",
      description: "Os dados de análise de CMV foram exportados com sucesso.",
    })
  }

  const handleEditGoal = (goal: CMVGoal) => {
    setSelectedGoal(goal)
    setIsGoalDialogOpen(true)
  }

  const handleDeleteGoal = (goal: CMVGoal) => {
    setSelectedGoal(goal)
    setIsDeleteDialogOpen(true)
  }

  // Função para obter o CMV atual para uma meta específica
  const getCurrentCMVForGoal = (goal: CMVGoal): number => {
    // Meta geral
    if (!goal.category_id && !goal.dish_id) {
      return cmvSummary.averageCmv
    }

    // Meta por categoria
    if (goal.category_id) {
      const categoryData = cmvByCategoryData.find((cat) => cat.name === goal.categories?.name)
      return categoryData ? categoryData.cmv : 0
    }

    // Meta por prato
    if (goal.dish_id) {
      const dishData = cmvAnalysis.find((dish) => dish.id === goal.dish_id)
      return dishData ? dishData.cmvPercentage : 0
    }

    return 0
  }

  if (isLoading) {
    return <div className="p-8 text-center">Carregando dados de CMV...</div>
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de CMV</h1>
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

          <Button variant="outline" onClick={exportCMVData}>
            <Download className="mr-2 h-4 w-4" />
            Exportar Dados
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CMV Médio</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cmvSummary.averageCmv.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              {cmvSummary.averageCmv < 30 ? (
                <span className="text-green-500 flex items-center">
                  <ArrowDownRight className="h-4 w-4 mr-1" /> Abaixo da média do setor (30%)
                </span>
              ) : (
                <span className="text-red-500 flex items-center">
                  <ArrowUpRight className="h-4 w-4 mr-1" /> Acima da média do setor (30%)
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem Bruta</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cmvSummary.totalMargin > 0
                ? `${((cmvSummary.totalMargin / cmvSummary.totalRevenue) * 100).toFixed(2)}%`
                : "0.00%"}
            </div>
            <p className="text-xs text-muted-foreground">R$ {cmvSummary.totalMargin.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prato Mais Eficiente</CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{cmvSummary.bestDish.name}</div>
            <p className="text-xs text-muted-foreground">CMV: {cmvSummary.bestDish.cmv.toFixed(2)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prato Menos Eficiente</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{cmvSummary.worstDish.name}</div>
            <p className="text-xs text-muted-foreground">CMV: {cmvSummary.worstDish.cmv.toFixed(2)}%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="dishes">Análise por Prato</TabsTrigger>
          <TabsTrigger value="categories">Análise por Categoria</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="predictions">Previsões</TabsTrigger>
          <TabsTrigger value="goals">Metas de CMV</TabsTrigger>
        </TabsList>

        {/* Aba de Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          {/* Gráfico de Tendência de CMV */}
          <Card>
            <CardHeader>
              <CardTitle>Tendência de CMV</CardTitle>
              <CardDescription>Evolução do CMV ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={cmvTrendData}
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
                    <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="cmv"
                      name="CMV (%)"
                      stroke="#ef4444"
                      activeDot={{ r: 8 }}
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="margin"
                      name="Margem (R$)"
                      stroke="#10b981"
                      activeDot={{ r: 8 }}
                      strokeWidth={2}
                      yAxisId={1}
                      hide
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Gráfico de CMV por Categoria */}
            <Card>
              <CardHeader>
                <CardTitle>CMV por Categoria</CardTitle>
                <CardDescription>Comparação do CMV entre diferentes categorias de pratos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={cmvByCategoryData}
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
                      <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                      <Legend />
                      <Bar dataKey="cmv" name="CMV (%)" fill="#ef4444" />
                      <Bar dataKey="margin" name="Margem (%)" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de Custo vs Receita */}
            <Card>
              <CardHeader>
                <CardTitle>Custo vs Receita</CardTitle>
                <CardDescription>Comparação entre custos e receitas ao longo do tempo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={cmvTrendData}
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
                      <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                      <Legend />
                      <Bar dataKey="cost" name="Custo" fill="#ef4444" />
                      <Bar dataKey="revenue" name="Receita" fill="#10b981" />
                      <Line
                        type="monotone"
                        dataKey="margin"
                        name="Margem"
                        stroke="#8884d8"
                        strokeWidth={2}
                        dot={{ r: 5 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Metas Ativas */}
          {cmvGoals.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Metas de CMV Ativas</CardTitle>
                  <CardDescription>Acompanhamento das metas de CMV em andamento</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setSelectedGoal(null)
                    setIsGoalDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Meta
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {cmvGoals
                    .filter((goal) => {
                      const today = new Date()
                      const startDate = new Date(goal.start_date)
                      const endDate = new Date(goal.end_date)
                      return today >= startDate && today <= endDate
                    })
                    .slice(0, 3)
                    .map((goal) => (
                      <GoalProgressCard
                        key={goal.id}
                        goal={goal}
                        currentCMV={getCurrentCMVForGoal(goal)}
                        onEdit={() => handleEditGoal(goal)}
                        onDelete={() => handleDeleteGoal(goal)}
                      />
                    ))}

                  {cmvGoals.filter((goal) => {
                    const today = new Date()
                    const startDate = new Date(goal.start_date)
                    const endDate = new Date(goal.end_date)
                    return today >= startDate && today <= endDate
                  }).length === 0 && (
                    <div className="col-span-full text-center py-6 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>Não há metas de CMV ativas no momento.</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => {
                          setSelectedGoal(null)
                          setIsGoalDialogOpen(true)
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Criar Meta
                      </Button>
                    </div>
                  )}
                </div>

                {cmvGoals.filter((goal) => {
                  const today = new Date()
                  const startDate = new Date(goal.start_date)
                  const endDate = new Date(goal.end_date)
                  return today >= startDate && today <= endDate
                }).length > 3 && (
                  <div className="mt-4 text-center">
                    <Button variant="link" onClick={() => document.querySelector('[data-value="goals"]')?.click()}>
                      Ver todas as metas
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recomendações */}
          <Card>
            <CardHeader>
              <CardTitle>Recomendações para Otimização do CMV</CardTitle>
              <CardDescription>Sugestões baseadas na análise dos dados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cmvSummary.averageCmv > 30 && (
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium">CMV acima da média do setor</p>
                      <p className="text-sm text-muted-foreground">
                        Seu CMV médio de {cmvSummary.averageCmv.toFixed(2)}% está acima da média do setor (30%).
                        Considere revisar os custos dos ingredientes ou ajustar os preços de venda.
                      </p>
                    </div>
                  </div>
                )}

                {cmvSummary.worstDish.cmv > 40 && (
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Prato com CMV elevado</p>
                      <p className="text-sm text-muted-foreground">
                        O prato "{cmvSummary.worstDish.name}" tem um CMV de {cmvSummary.worstDish.cmv.toFixed(2)}%, o
                        que é considerado alto. Considere revisar a receita ou aumentar o preço.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start space-x-2">
                  <TrendingDown className="h-5 w-5 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Oportunidade de padronização</p>
                    <p className="text-sm text-muted-foreground">
                      Há uma variação significativa no CMV entre categorias. Padronizar as receitas e porções pode
                      ajudar a reduzir essa variação e melhorar a previsibilidade dos custos.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Planejamento sazonal</p>
                    <p className="text-sm text-muted-foreground">
                      Considere ajustar o cardápio sazonalmente para aproveitar ingredientes mais baratos em
                      determinadas épocas do ano, o que pode reduzir o CMV geral.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Análise por Prato */}
        <TabsContent value="dishes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análise Detalhada por Prato</CardTitle>
              <CardDescription>Detalhamento do CMV e margem para cada prato</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prato</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Preço (R$)</TableHead>
                      <TableHead>Custo (R$)</TableHead>
                      <TableHead>CMV (%)</TableHead>
                      <TableHead>Margem (R$)</TableHead>
                      <TableHead>Margem (%)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cmvAnalysis.map((dish) => (
                      <TableRow key={dish.id}>
                        <TableCell className="font-medium">{dish.name}</TableCell>
                        <TableCell>{dish.category}</TableCell>
                        <TableCell>{dish.price.toFixed(2)}</TableCell>
                        <TableCell>{dish.cost.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              dish.cmvPercentage < 30 ? "success" : dish.cmvPercentage < 40 ? "warning" : "destructive"
                            }
                            className={
                              dish.cmvPercentage < 30
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                : dish.cmvPercentage < 40
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                            }
                          >
                            {dish.cmvPercentage.toFixed(2)}%
                          </Badge>
                        </TableCell>
                        <TableCell>{dish.margin.toFixed(2)}</TableCell>
                        <TableCell>{dish.marginPercentage.toFixed(2)}%</TableCell>
                        <TableCell>
                          {dish.cmvPercentage < 30 ? (
                            <Badge
                              variant="outline"
                              className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            >
                              Ótimo
                            </Badge>
                          ) : dish.cmvPercentage < 40 ? (
                            <Badge
                              variant="outline"
                              className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                            >
                              Aceitável
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                            >
                              Revisar
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Detalhamento de ingredientes por prato */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento de Ingredientes</CardTitle>
              <CardDescription>Análise de custo por ingrediente para cada prato</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={cmvAnalysis.length > 0 ? cmvAnalysis[0].id.toString() : ""} className="space-y-4">
                <TabsList className="flex flex-wrap">
                  {cmvAnalysis.map((dish) => (
                    <TabsTrigger key={dish.id} value={dish.id.toString()} className="mb-1">
                      {dish.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {cmvAnalysis.map((dish) => (
                  <TabsContent key={dish.id} value={dish.id.toString()} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h3 className="text-lg font-medium mb-2">{dish.name}</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Preço de Venda:</span>
                            <span className="font-medium">R$ {dish.price.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Custo Total:</span>
                            <span className="font-medium">R$ {dish.cost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">CMV:</span>
                            <span className="font-medium">{dish.cmvPercentage.toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Margem:</span>
                            <span className="font-medium">
                              R$ {dish.margin.toFixed(2)} ({dish.marginPercentage.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium mb-2">Distribuição de Custos</h3>
                        <div className="h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={dish.ingredients.map((ing) => ({
                                  name: ing.name,
                                  value: ing.cost,
                                }))}
                                cx="50%"
                                cy="50%"
                                outerRadius={60}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              >
                                {dish.ingredients.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ingrediente</TableHead>
                            <TableHead>Quantidade</TableHead>
                            <TableHead>Custo (R$)</TableHead>
                            <TableHead>% do Custo Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dish.ingredients.map((ingredient, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{ingredient.name}</TableCell>
                              <TableCell>{ingredient.quantity}</TableCell>
                              <TableCell>{ingredient.cost.toFixed(2)}</TableCell>
                              <TableCell>{((ingredient.cost / dish.cost) * 100).toFixed(2)}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Análise por Categoria */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análise por Categoria</CardTitle>
              <CardDescription>Comparação de CMV e margem entre categorias de pratos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cmvByCategoryData}
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
                    <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                    <Legend />
                    <Bar dataKey="cmv" name="CMV (%)" fill="#ef4444" />
                    <Bar dataKey="margin" name="Margem (%)" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Qtd. Pratos</TableHead>
                      <TableHead>CMV Médio (%)</TableHead>
                      <TableHead>Margem Média (%)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cmvByCategoryData.map((category, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>{category.count}</TableCell>
                        <TableCell>
                          <Badge
                            variant={category.cmv < 30 ? "success" : category.cmv < 40 ? "warning" : "destructive"}
                            className={
                              category.cmv < 30
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                : category.cmv < 40
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                            }
                          >
                            {category.cmv.toFixed(2)}%
                          </Badge>
                        </TableCell>
                        <TableCell>{category.margin.toFixed(2)}%</TableCell>
                        <TableCell>
                          {category.cmv < 30 ? (
                            <Badge
                              variant="outline"
                              className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            >
                              Ótimo
                            </Badge>
                          ) : category.cmv < 40 ? (
                            <Badge
                              variant="outline"
                              className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                            >
                              Aceitável
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                            >
                              Revisar
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Pratos por categoria */}
          <Card>
            <CardHeader>
              <CardTitle>Pratos por Categoria</CardTitle>
              <CardDescription>Detalhamento dos pratos em cada categoria</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={cmvByCategoryData.length > 0 ? cmvByCategoryData[0].name : ""} className="space-y-4">
                <TabsList className="flex flex-wrap">
                  {cmvByCategoryData.map((category, index) => (
                    <TabsTrigger key={index} value={category.name} className="mb-1">
                      {category.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {cmvByCategoryData.map((category, index) => (
                  <TabsContent key={index} value={category.name} className="space-y-4">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Prato</TableHead>
                            <TableHead>Preço (R$)</TableHead>
                            <TableHead>Custo (R$)</TableHead>
                            <TableHead>CMV (%)</TableHead>
                            <TableHead>Margem (R$)</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cmvAnalysis
                            .filter((dish) => dish.category === category.name)
                            .map((dish) => (
                              <TableRow key={dish.id}>
                                <TableCell className="font-medium">{dish.name}</TableCell>
                                <TableCell>{dish.price.toFixed(2)}</TableCell>
                                <TableCell>{dish.cost.toFixed(2)}</TableCell>
                                <TableCell>{dish.cmvPercentage.toFixed(2)}%</TableCell>
                                <TableCell>{dish.margin.toFixed(2)}</TableCell>
                                <TableCell>
                                  {dish.cmvPercentage < 30 ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                    >
                                      Ótimo
                                    </Badge>
                                  ) : dish.cmvPercentage < 40 ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                    >
                                      Aceitável
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                    >
                                      Revisar
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Tendências */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tendência de CMV ao Longo do Tempo</CardTitle>
              <CardDescription>Evolução do CMV no período selecionado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={cmvTrendData}
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
                    <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="cmv"
                      name="CMV (%)"
                      stroke="#ef4444"
                      activeDot={{ r: 8 }}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custo vs Receita ao Longo do Tempo</CardTitle>
              <CardDescription>Evolução dos custos e receitas no período selecionado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={cmvTrendData}
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
                    <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Receita"
                      fill="#10b981"
                      stroke="#10b981"
                      fillOpacity={0.3}
                    />
                    <Bar dataKey="cost" name="Custo" fill="#ef4444" />
                    <Line
                      type="monotone"
                      dataKey="margin"
                      name="Margem"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Análise de Tendências</CardTitle>
              <CardDescription>Insights sobre as tendências de CMV</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cmvTrendData.length > 1 && (
                  <>
                    <div className="flex items-start space-x-2">
                      <TrendingDown className="h-5 w-5 text-emerald-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Tendência de CMV</p>
                        <p className="text-sm text-muted-foreground">
                          {cmvTrendData[cmvTrendData.length - 1].cmv < cmvTrendData[0].cmv ? (
                            <>
                              O CMV apresenta tendência de queda, reduzindo de{" "}
                              <span className="font-medium">{cmvTrendData[0].cmv.toFixed(2)}%</span> para{" "}
                              <span className="font-medium">
                                {cmvTrendData[cmvTrendData.length - 1].cmv.toFixed(2)}%
                              </span>{" "}
                              no período analisado.
                            </>
                          ) : (
                            <>
                              O CMV apresenta tendência de alta, aumentando de{" "}
                              <span className="font-medium">{cmvTrendData[0].cmv.toFixed(2)}%</span> para{" "}
                              <span className="font-medium">
                                {cmvTrendData[cmvTrendData.length - 1].cmv.toFixed(2)}%
                              </span>{" "}
                              no período analisado.
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Sazonalidade</p>
                        <p className="text-sm text-muted-foreground">
                          {cmvTrendData.length > 3 &&
                            "Os dados sugerem variações sazonais no CMV, possivelmente relacionadas à disponibilidade e preço dos ingredientes em diferentes períodos."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <TrendingUp className="h-5 w-5 text-amber-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Margem de Lucro</p>
                        <p className="text-sm text-muted-foreground">
                          {cmvTrendData[cmvTrendData.length - 1].margin > cmvTrendData[0].margin ? (
                            <>
                              A margem de lucro apresenta tendência de alta, aumentando de{" "}
                              <span className="font-medium">R$ {cmvTrendData[0].margin.toFixed(2)}</span> para{" "}
                              <span className="font-medium">
                                R$ {cmvTrendData[cmvTrendData.length - 1].margin.toFixed(2)}
                              </span>{" "}
                              no período analisado.
                            </>
                          ) : (
                            <>
                              A margem de lucro apresenta tendência de queda, reduzindo de{" "}
                              <span className="font-medium">R$ {cmvTrendData[0].margin.toFixed(2)}</span> para{" "}
                              <span className="font-medium">
                                R$ {cmvTrendData[cmvTrendData.length - 1].margin.toFixed(2)}
                              </span>{" "}
                              no período analisado.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {cmvTrendData.length <= 1 && (
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Dados insuficientes</p>
                      <p className="text-sm text-muted-foreground">
                        Não há dados suficientes para analisar tendências no período selecionado. Tente selecionar um
                        período maior ou adicionar mais dados de movimentação.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Previsões */}
        <TabsContent value="predictions" className="space-y-4">
          <PredictiveAnalysis historicalData={cmvTrendData} />

          <Card>
            <CardHeader>
              <CardTitle>Recomendações Baseadas em Previsões</CardTitle>
              <CardDescription>Sugestões para otimização futura do CMV</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cmvTrendData.length > 0 && (
                  <>
                    <div className="flex items-start space-x-2">
                      <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Planejamento Antecipado</p>
                        <p className="text-sm text-muted-foreground">
                          Use as previsões de CMV para planejar compras e ajustes de preço com antecedência, permitindo
                          uma resposta proativa às tendências de custos.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <TrendingDown className="h-5 w-5 text-emerald-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Otimização de Cardápio</p>
                        <p className="text-sm text-muted-foreground">
                          Considere ajustar o cardápio sazonalmente com base nas previsões de CMV, destacando pratos com
                          melhor margem durante períodos de custos mais altos.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Gestão de Riscos</p>
                        <p className="text-sm text-muted-foreground">
                          Utilize o intervalo de confiança das previsões para planejar cenários de pior e melhor caso,
                          estabelecendo estratégias para cada situação.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {cmvTrendData.length <= 3 && (
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Dados limitados</p>
                      <p className="text-sm text-muted-foreground">
                        Para melhorar a precisão das previsões, continue registrando dados de CMV consistentemente.
                        Quanto mais dados históricos disponíveis, mais confiáveis serão as previsões.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Metas de CMV */}
        <TabsContent value="goals" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Metas de CMV</CardTitle>
                <CardDescription>Defina e acompanhe metas de CMV para melhorar o desempenho</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setSelectedGoal(null)
                  setIsGoalDialogOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova Meta
              </Button>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="active" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="active">Metas Ativas</TabsTrigger>
                  <TabsTrigger value="upcoming">Metas Futuras</TabsTrigger>
                  <TabsTrigger value="completed">Metas Concluídas</TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {cmvGoals
                      .filter((goal) => {
                        const today = new Date()
                        const startDate = new Date(goal.start_date)
                        const endDate = new Date(goal.end_date)
                        return today >= startDate && today <= endDate
                      })
                      .map((goal) => (
                        <GoalProgressCard
                          key={goal.id}
                          goal={goal}
                          currentCMV={getCurrentCMVForGoal(goal)}
                          onEdit={() => handleEditGoal(goal)}
                          onDelete={() => handleDeleteGoal(goal)}
                        />
                      ))}

                    {cmvGoals.filter((goal) => {
                      const today = new Date()
                      const startDate = new Date(goal.start_date)
                      const endDate = new Date(goal.end_date)
                      return today >= startDate && today <= endDate
                    }).length === 0 && (
                      <div className="col-span-full text-center py-12 text-muted-foreground">
                        <Target className="h-16 w-16 mx-auto mb-4 opacity-20" />
                        <p>Não há metas de CMV ativas no momento.</p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => {
                            setSelectedGoal(null)
                            setIsGoalDialogOpen(true)
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Criar Meta
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="upcoming" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {cmvGoals
                      .filter((goal) => {
                        const today = new Date()
                        const startDate = new Date(goal.start_date)
                        return today < startDate
                      })
                      .map((goal) => (
                        <GoalProgressCard
                          key={goal.id}
                          goal={goal}
                          currentCMV={getCurrentCMVForGoal(goal)}
                          onEdit={() => handleEditGoal(goal)}
                          onDelete={() => handleDeleteGoal(goal)}
                        />
                      ))}

                    {cmvGoals.filter((goal) => {
                      const today = new Date()
                      const startDate = new Date(goal.start_date)
                      return today < startDate
                    }).length === 0 && (
                      <div className="col-span-full text-center py-12 text-muted-foreground">
                        <Calendar className="h-16 w-16 mx-auto mb-4 opacity-20" />
                        <p>Não há metas de CMV futuras no momento.</p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => {
                            setSelectedGoal(null)
                            setIsGoalDialogOpen(true)
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Criar Meta
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="completed" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {cmvGoals
                      .filter((goal) => {
                        const today = new Date()
                        const endDate = new Date(goal.end_date)
                        return today > endDate
                      })
                      .map((goal) => (
                        <GoalProgressCard
                          key={goal.id}
                          goal={goal}
                          currentCMV={getCurrentCMVForGoal(goal)}
                          onEdit={() => handleEditGoal(goal)}
                          onDelete={() => handleDeleteGoal(goal)}
                        />
                      ))}

                    {cmvGoals.filter((goal) => {
                      const today = new Date()
                      const endDate = new Date(goal.end_date)
                      return today > endDate
                    }).length === 0 && (
                      <div className="col-span-full text-center py-12 text-muted-foreground">
                        <CheckCircle2 className="h-16 w-16 mx-auto mb-4 opacity-20" />
                        <p>Não há metas de CMV concluídas no momento.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo para adicionar/editar meta */}
      <GoalFormDialog
        open={isGoalDialogOpen}
        onOpenChange={setIsGoalDialogOpen}
        categories={categories}
        dishes={dishes}
        initialData={selectedGoal}
      />

      {/* Diálogo para confirmar exclusão */}
      {selectedGoal && (
        <DeleteGoalDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          goalId={selectedGoal.id}
          goalName={selectedGoal.name}
        />
      )}
    </div>
  )
}
