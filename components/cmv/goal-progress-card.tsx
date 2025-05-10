"use client"

import { CheckCircle2, Clock, XCircle } from "lucide-react"
import { format } from "date-fns"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type GoalProgressCardProps = {
  goal: any
  currentCMV: number
  onEdit: () => void
  onDelete: () => void
}

export function GoalProgressCard({ goal, currentCMV, onEdit, onDelete }: GoalProgressCardProps) {
  // Calcular o progresso
  const targetCMV = goal.target_percentage
  const progress = Math.max(0, Math.min(100, (targetCMV / currentCMV) * 100))
  const isAchieved = currentCMV <= targetCMV

  // Verificar se a meta está ativa
  const today = new Date()
  const startDate = new Date(goal.start_date)
  const endDate = new Date(goal.end_date)
  const isActive = today >= startDate && today <= endDate
  const isPast = today > endDate
  const isFuture = today < startDate

  // Calcular dias restantes ou passados
  const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const daysPassed = Math.ceil((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))

  // Determinar o tipo de meta
  let metaType = "Geral"
  let metaTarget = "Todo o restaurante"

  if (goal.category_id) {
    metaType = "Categoria"
    metaTarget = goal.categories?.name || "Categoria desconhecida"
  } else if (goal.dish_id) {
    metaType = "Prato"
    metaTarget = goal.dishes?.name || "Prato desconhecido"
  }

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        isAchieved ? "border-green-200 dark:border-green-900" : "border-red-200 dark:border-red-900",
        !isActive && "opacity-70",
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{goal.name}</CardTitle>
            <CardDescription>
              Meta de {metaType}: {metaTarget}
            </CardDescription>
          </div>
          <StatusBadge isActive={isActive} isPast={isPast} isAchieved={isAchieved} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">Meta de CMV:</div>
          <div className="font-medium">{targetCMV.toFixed(2)}%</div>
        </div>
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">CMV Atual:</div>
          <div
            className={cn(
              "font-medium",
              isAchieved ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
            )}
          >
            {currentCMV.toFixed(2)}%
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Progresso</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <Progress
            value={progress}
            className={cn("h-2", isAchieved ? "bg-green-100 dark:bg-green-950" : "bg-red-100 dark:bg-red-950")}
            indicatorClassName={isAchieved ? "bg-green-600 dark:bg-green-400" : "bg-red-600 dark:bg-red-400"}
          />
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          <div>Início: {format(new Date(goal.start_date), "dd/MM/yyyy")}</div>
          <div>Término: {format(new Date(goal.end_date), "dd/MM/yyyy")}</div>
        </div>

        {isActive && (
          <div className="flex items-center justify-center">
            <Clock className="h-4 w-4 mr-1 text-amber-500" />
            <span className="text-sm">
              {daysRemaining} {daysRemaining === 1 ? "dia restante" : "dias restantes"}
            </span>
          </div>
        )}

        {isPast && (
          <div className="flex items-center justify-center">
            <span className="text-sm text-muted-foreground">
              Encerrada há {daysPassed} {daysPassed === 1 ? "dia" : "dias"}
            </span>
          </div>
        )}

        {isFuture && (
          <div className="flex items-center justify-center">
            <span className="text-sm text-muted-foreground">
              Inicia em {Math.abs(daysRemaining)} {Math.abs(daysRemaining) === 1 ? "dia" : "dias"}
            </span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          Editar
        </Button>
        <Button variant="ghost" size="sm" className="text-red-500" onClick={onDelete}>
          Excluir
        </Button>
      </CardFooter>
    </Card>
  )
}

function StatusBadge({ isActive, isPast, isAchieved }: { isActive: boolean; isPast: boolean; isAchieved: boolean }) {
  if (isPast) {
    return (
      <Badge variant={isAchieved ? "success" : "destructive"} className="ml-2">
        {isAchieved ? (
          <>
            <CheckCircle2 className="h-3 w-3 mr-1" /> Concluída
          </>
        ) : (
          <>
            <XCircle className="h-3 w-3 mr-1" /> Não atingida
          </>
        )}
      </Badge>
    )
  }

  if (isActive) {
    return (
      <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
        <Clock className="h-3 w-3 mr-1" /> Em andamento
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="ml-2">
      Futura
    </Badge>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ")
}
