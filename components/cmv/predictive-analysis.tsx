"use client"

import { useState, useEffect } from "react"
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart } from "recharts"
import { AlertCircle, ArrowDownRight, ArrowUpRight, Calendar, Info } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  convertCMVDataToTimeSeries,
  detectSeasonality,
  formatDateForChart,
  linearRegressionPredict,
  movingAverage,
  type PredictionResult,
} from "@/lib/predictive-analysis"

type PredictiveAnalysisProps = {
  historicalData: any[]
}

export function PredictiveAnalysis({ historicalData }: PredictiveAnalysisProps) {
  const [predictionPeriod, setPredictionPeriod] = useState("6")
  const [smoothingWindow, setSmoothingWindow] = useState("3")
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [hasSeasonality, setHasSeasonality] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (historicalData.length > 0) {
      generatePrediction()
    }
  }, [historicalData, predictionPeriod, smoothingWindow])

  const generatePrediction = () => {
    try {
      setIsLoading(true)

      // Converter dados para formato de série temporal
      const timeSeriesData = convertCMVDataToTimeSeries(historicalData)

      // Aplicar suavização (média móvel)
      const smoothedData = movingAverage(timeSeriesData, Number.parseInt(smoothingWindow))

      // Verificar sazonalidade
      const seasonality = detectSeasonality(timeSeriesData)
      setHasSeasonality(seasonality)

      // Gerar previsão
      const predictionResult = linearRegressionPredict(smoothedData, Number.parseInt(predictionPeriod))
      setPrediction(predictionResult)

      // Preparar dados para o gráfico
      const historicalChartData = historicalData.map((item) => ({
        name: item.name,
        cmv: item.cmv,
        type: "historical",
      }))

      const predictionChartData = predictionResult.dates.map((date, index) => ({
        name: formatDateForChart(date),
        cmv: predictionResult.values[index],
        upper: predictionResult.upperBound[index],
        lower: predictionResult.lowerBound[index],
        type: "prediction",
      }))

      setChartData([...historicalChartData, ...predictionChartData])
    } catch (error) {
      console.error("Erro ao gerar previsão:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTrendBadge = () => {
    if (!prediction) return null

    if (prediction.trend === "decreasing") {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          <ArrowDownRight className="mr-1 h-3 w-3" />
          Tendência de Queda
        </Badge>
      )
    } else if (prediction.trend === "increasing") {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
          <ArrowUpRight className="mr-1 h-3 w-3" />
          Tendência de Alta
        </Badge>
      )
    } else {
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Tendência Estável</Badge>
    }
  }

  const getConfidenceBadge = () => {
    if (!prediction) return null

    if (prediction.confidence === "high") {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Alta Confiança</Badge>
    } else if (prediction.confidence === "medium") {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Média Confiança</Badge>
      )
    } else {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Baixa Confiança</Badge>
    }
  }

  if (historicalData.length < 3) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise Preditiva de CMV</CardTitle>
          <CardDescription>Previsão de tendências futuras de CMV</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <AlertCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">Dados insuficientes para previsão</h3>
          <p className="text-muted-foreground max-w-md">
            São necessários pelo menos 3 pontos de dados históricos para gerar previsões confiáveis. Continue
            registrando dados de CMV para habilitar esta funcionalidade.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Análise Preditiva de CMV</CardTitle>
            <CardDescription>Previsão de tendências futuras de CMV</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={predictionPeriod} onValueChange={setPredictionPeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 meses</SelectItem>
                <SelectItem value="6">6 meses</SelectItem>
                <SelectItem value="12">12 meses</SelectItem>
              </SelectContent>
            </Select>

            <Select value={smoothingWindow} onValueChange={setSmoothingWindow}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Suavização" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Sem suavização</SelectItem>
                <SelectItem value="2">Suavização baixa</SelectItem>
                <SelectItem value="3">Suavização média</SelectItem>
                <SelectItem value="4">Suavização alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {prediction && (
          <div className="flex flex-wrap gap-2 mt-2">
            {getTrendBadge()}
            {getConfidenceBadge()}
            {hasSeasonality && (
              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                <Calendar className="mr-1 h-3 w-3" />
                Padrão Sazonal Detectado
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 60,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fill: chartData.map((d) => (d.type === "prediction" ? "#888" : "#333")) }}
              />
              <YAxis />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "cmv") return [`${Number(value).toFixed(2)}%`, "CMV"]
                  if (name === "upper") return [`${Number(value).toFixed(2)}%`, "Limite Superior"]
                  if (name === "lower") return [`${Number(value).toFixed(2)}%`, "Limite Inferior"]
                  return [value, name]
                }}
                labelFormatter={(label, items) => {
                  const item = items[0]?.payload
                  if (item?.type === "prediction") {
                    return `${label} (Previsão)`
                  }
                  return label
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="cmv"
                name="CMV Histórico"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 8 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="cmv"
                name="CMV Previsto"
                stroke="#8884d8"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4 }}
                connectNulls
              />
              <Area
                type="monotone"
                dataKey="upper"
                name="Limite Superior"
                stroke="transparent"
                fill="#8884d8"
                fillOpacity={0.2}
              />
              <Area
                type="monotone"
                dataKey="lower"
                name="Limite Inferior"
                stroke="transparent"
                fill="#8884d8"
                fillOpacity={0.2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {prediction && (
          <div className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">CMV Previsto (Final do Período)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {prediction.values[prediction.values.length - 1].toFixed(2)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {prediction.trend === "decreasing" ? (
                      <span className="text-green-500 flex items-center">
                        <ArrowDownRight className="h-4 w-4 mr-1" /> Queda prevista
                      </span>
                    ) : prediction.trend === "increasing" ? (
                      <span className="text-red-500 flex items-center">
                        <ArrowUpRight className="h-4 w-4 mr-1" /> Aumento previsto
                      </span>
                    ) : (
                      <span className="text-blue-500">Estabilidade prevista</span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Intervalo de Confiança</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-medium">
                    {prediction.lowerBound[prediction.lowerBound.length - 1].toFixed(2)}% -{" "}
                    {prediction.upperBound[prediction.upperBound.length - 1].toFixed(2)}%
                  </div>
                  <p className="text-xs text-muted-foreground">Intervalo de 95% de confiança para a previsão</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Precisão do Modelo</CardTitle>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-4 w-4 absolute right-4 top-4">
                          <Info className="h-4 w-4" />
                          <span className="sr-only">Informações sobre R²</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          R² mede a qualidade do ajuste do modelo. <br />
                          Valores próximos a 1 indicam melhor ajuste.
                        </p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(prediction.r2 * 100).toFixed(0)}%</div>
                  <p className="text-xs text-muted-foreground">Coeficiente de determinação (R²)</p>
                </CardContent>
              </Card>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-2">Interpretação da Análise</h3>
              <div className="space-y-2 text-sm">
                {prediction.trend === "decreasing" ? (
                  <p>
                    A análise indica uma{" "}
                    <span className="font-medium text-green-600 dark:text-green-400">tendência de queda</span> no CMV
                    para os próximos {predictionPeriod} meses. Isso sugere que as medidas de controle de custos estão
                    sendo eficazes.
                  </p>
                ) : prediction.trend === "increasing" ? (
                  <p>
                    A análise indica uma{" "}
                    <span className="font-medium text-red-600 dark:text-red-400">tendência de aumento</span> no CMV para
                    os próximos {predictionPeriod} meses. Recomenda-se revisar os custos dos ingredientes e considerar
                    ajustes nos preços ou nas receitas.
                  </p>
                ) : (
                  <p>
                    A análise indica uma{" "}
                    <span className="font-medium text-blue-600 dark:text-blue-400">tendência estável</span> no CMV para
                    os próximos {predictionPeriod} meses. Isso sugere que os custos e preços estão em equilíbrio.
                  </p>
                )}

                {prediction.confidence === "low" && (
                  <p className="text-amber-600 dark:text-amber-400">
                    <AlertCircle className="inline h-4 w-4 mr-1" />A confiança na previsão é baixa devido à
                    variabilidade nos dados históricos ou à quantidade limitada de dados. Considere esta previsão como
                    uma estimativa preliminar.
                  </p>
                )}

                {hasSeasonality && (
                  <p>
                    <Calendar className="inline h-4 w-4 mr-1 text-purple-600 dark:text-purple-400" />
                    Foi detectado um padrão sazonal nos dados de CMV, o que pode indicar variações cíclicas nos custos
                    dos ingredientes ou na demanda. Considere planejar compras e cardápios levando em conta esta
                    sazonalidade.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
