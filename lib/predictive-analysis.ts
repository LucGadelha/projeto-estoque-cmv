/**
 * Biblioteca para análise preditiva de CMV
 */

// Tipo para dados de série temporal
export type TimeSeriesData = {
  date: Date
  value: number
}

// Tipo para resultado de previsão
export type PredictionResult = {
  dates: Date[]
  values: number[]
  upperBound: number[]
  lowerBound: number[]
  r2: number
  trend: "increasing" | "decreasing" | "stable"
  confidence: "high" | "medium" | "low"
}

/**
 * Realiza regressão linear simples para prever valores futuros
 * @param data Dados históricos
 * @param periodsToPredict Número de períodos a prever
 * @param confidenceInterval Intervalo de confiança (0-1)
 */
export function linearRegressionPredict(
  data: TimeSeriesData[],
  periodsToPredict = 12,
  confidenceInterval = 0.95,
): PredictionResult {
  if (data.length < 2) {
    throw new Error("Dados insuficientes para previsão")
  }

  // Converter datas para números (dias desde o primeiro ponto)
  const baseDate = data[0].date.getTime()
  const xValues = data.map((d) => (d.date.getTime() - baseDate) / (1000 * 60 * 60 * 24))
  const yValues = data.map((d) => d.value)

  // Calcular médias
  const n = data.length
  const sumX = xValues.reduce((a, b) => a + b, 0)
  const sumY = yValues.reduce((a, b) => a + b, 0)
  const meanX = sumX / n
  const meanY = sumY / n

  // Calcular coeficientes de regressão
  let sumXY = 0
  let sumXX = 0
  for (let i = 0; i < n; i++) {
    sumXY += (xValues[i] - meanX) * (yValues[i] - meanY)
    sumXX += (xValues[i] - meanX) * (xValues[i] - meanX)
  }

  const slope = sumXY / sumXX
  const intercept = meanY - slope * meanX

  // Calcular R²
  const predictedY = xValues.map((x) => slope * x + intercept)
  const totalSS = yValues.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0)
  const residualSS = yValues.reduce((sum, y, i) => sum + Math.pow(y - predictedY[i], 2), 0)
  const r2 = 1 - residualSS / totalSS

  // Calcular erro padrão da estimativa
  const standardError = Math.sqrt(residualSS / (n - 2))

  // Gerar datas futuras
  const lastDate = data[data.length - 1].date
  const futureDates: Date[] = []
  for (let i = 1; i <= periodsToPredict; i++) {
    const newDate = new Date(lastDate)
    newDate.setMonth(newDate.getMonth() + i)
    futureDates.push(newDate)
  }

  // Calcular valores previstos
  const lastX = xValues[xValues.length - 1]
  const futureX = futureDates.map((d, i) => lastX + (d.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

  const predictedValues = futureX.map((x) => slope * x + intercept)

  // Calcular intervalos de confiança
  // Valor t para intervalo de confiança de 95% com n-2 graus de liberdade
  // Simplificação: usando 1.96 para aproximar o valor t para 95% de confiança
  const tValue = 1.96
  const marginOfError = tValue * standardError

  const upperBound = predictedValues.map((val) => val + marginOfError)
  const lowerBound = predictedValues.map((val) => val - marginOfError)

  // Determinar tendência
  let trend: "increasing" | "decreasing" | "stable"
  if (slope > 0.1) {
    trend = "increasing"
  } else if (slope < -0.1) {
    trend = "decreasing"
  } else {
    trend = "stable"
  }

  // Determinar confiança com base no R²
  let confidence: "high" | "medium" | "low"
  if (r2 > 0.7) {
    confidence = "high"
  } else if (r2 > 0.4) {
    confidence = "medium"
  } else {
    confidence = "low"
  }

  return {
    dates: futureDates,
    values: predictedValues,
    upperBound,
    lowerBound,
    r2,
    trend,
    confidence,
  }
}

/**
 * Calcula a média móvel para suavizar dados
 * @param data Dados de entrada
 * @param windowSize Tamanho da janela para média móvel
 */
export function movingAverage(data: TimeSeriesData[], windowSize = 3): TimeSeriesData[] {
  if (data.length < windowSize) {
    return data
  }

  const result: TimeSeriesData[] = []

  for (let i = 0; i <= data.length - windowSize; i++) {
    const windowValues = data.slice(i, i + windowSize).map((d) => d.value)
    const sum = windowValues.reduce((a, b) => a + b, 0)
    const avg = sum / windowSize

    result.push({
      date: data[i + Math.floor(windowSize / 2)].date,
      value: avg,
    })
  }

  return result
}

/**
 * Detecta sazonalidade nos dados
 * @param data Dados de entrada
 * @param period Período esperado da sazonalidade (em número de pontos)
 */
export function detectSeasonality(data: TimeSeriesData[], period = 12): boolean {
  if (data.length < period * 2) {
    return false
  }

  const values = data.map((d) => d.value)

  // Calcular autocorrelação para o período especificado
  let sumProduct = 0
  let sumSquared1 = 0
  let sumSquared2 = 0

  for (let i = 0; i < values.length - period; i++) {
    sumProduct += values[i] * values[i + period]
    sumSquared1 += values[i] * values[i]
    sumSquared2 += values[i + period] * values[i + period]
  }

  const autocorrelation = sumProduct / Math.sqrt(sumSquared1 * sumSquared2)

  // Se a autocorrelação for maior que 0.5, consideramos que há sazonalidade
  return autocorrelation > 0.5
}

/**
 * Converte dados de CMV para formato de série temporal
 * @param cmvData Dados de CMV do dashboard
 */
export function convertCMVDataToTimeSeries(cmvData: any[]): TimeSeriesData[] {
  return cmvData.map((item) => {
    // Extrair mês e ano da string "Semana X - MM/YYYY"
    const parts = item.name.split(" - ")[1].split("/")
    const month = Number.parseInt(parts[0]) - 1 // Meses em JS são 0-indexed
    const year = Number.parseInt(parts[1])

    // Criar data para o primeiro dia do mês
    const date = new Date(year, month, 1)

    return {
      date,
      value: item.cmv,
    }
  })
}

/**
 * Formata uma data para exibição em gráficos
 * @param date Data a ser formatada
 */
export function formatDateForChart(date: Date): string {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
  return `${months[date.getMonth()]}/${date.getFullYear()}`
}
