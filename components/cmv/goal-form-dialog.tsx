"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { createCMVGoal, updateCMVGoal } from "@/app/actions/cmv-goals"
import { useSession } from "@/components/providers/session-provider"

type GoalFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: { id: number; name: string }[]
  dishes: { id: number; name: string }[]
  initialData?: any
}

export function GoalFormDialog({ open, onOpenChange, categories, dishes, initialData }: GoalFormDialogProps) {
  const { toast } = useToast()
  const router = useRouter()
  const { session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [goalType, setGoalType] = useState<"general" | "category" | "dish">("general")
  const [formData, setFormData] = useState({
    name: "",
    target_percentage: 30,
    category_id: null as number | null,
    dish_id: null as number | null,
    start_date: new Date(),
    end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)),
  })

  useEffect(() => {
    if (initialData) {
      // Determine goal type
      let type: "general" | "category" | "dish" = "general"
      if (initialData.category_id) type = "category"
      if (initialData.dish_id) type = "dish"

      setGoalType(type)
      setFormData({
        name: initialData.name,
        target_percentage: initialData.target_percentage,
        category_id: initialData.category_id,
        dish_id: initialData.dish_id,
        start_date: new Date(initialData.start_date),
        end_date: new Date(initialData.end_date),
      })
    } else {
      // Reset form for new goal
      setGoalType("general")
      setFormData({
        name: "",
        target_percentage: 30,
        category_id: null,
        dish_id: null,
        start_date: new Date(),
        end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      })
    }
  }, [initialData, open])

  const handleSubmit = async () => {
    if (!formData.name) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, forneça um nome para a meta de CMV.",
        variant: "destructive",
      })
      return
    }

    if (goalType === "category" && !formData.category_id) {
      toast({
        title: "Categoria obrigatória",
        description: "Por favor, selecione uma categoria para a meta de CMV.",
        variant: "destructive",
      })
      return
    }

    if (goalType === "dish" && !formData.dish_id) {
      toast({
        title: "Prato obrigatório",
        description: "Por favor, selecione um prato para a meta de CMV.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)

      const goalData = {
        name: formData.name,
        target_percentage: formData.target_percentage,
        category_id: goalType === "category" ? formData.category_id : null,
        dish_id: goalType === "dish" ? formData.dish_id : null,
        start_date: format(formData.start_date, "yyyy-MM-dd"),
        end_date: format(formData.end_date, "yyyy-MM-dd"),
        created_by: session?.user?.email || "unknown",
      }

      if (initialData) {
        await updateCMVGoal(initialData.id, goalData)
        toast({
          title: "Meta atualizada",
          description: "A meta de CMV foi atualizada com sucesso.",
        })
      } else {
        await createCMVGoal(goalData)
        toast({
          title: "Meta criada",
          description: "A meta de CMV foi criada com sucesso.",
        })
      }

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error("Error saving CMV goal:", error)
      toast({
        title: "Erro ao salvar meta",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao salvar a meta de CMV.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Meta de CMV" : "Nova Meta de CMV"}</DialogTitle>
          <DialogDescription>
            {initialData
              ? "Atualize os detalhes da meta de CMV existente."
              : "Defina uma nova meta de CMV para acompanhar o desempenho."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="goal-name" className="text-right">
              Nome
            </Label>
            <Input
              id="goal-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Meta de CMV Q1 2023"
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="goal-type" className="text-right">
              Tipo
            </Label>
            <Select value={goalType} onValueChange={(value) => setGoalType(value as any)}>
              <SelectTrigger id="goal-type" className="col-span-3">
                <SelectValue placeholder="Selecione o tipo de meta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Geral (Todo o Restaurante)</SelectItem>
                <SelectItem value="category">Por Categoria</SelectItem>
                <SelectItem value="dish">Por Prato</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {goalType === "category" && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Categoria
              </Label>
              <Select
                value={formData.category_id?.toString() || ""}
                onValueChange={(value) => setFormData({ ...formData, category_id: Number(value) })}
              >
                <SelectTrigger id="category" className="col-span-3">
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
          )}

          {goalType === "dish" && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dish" className="text-right">
                Prato
              </Label>
              <Select
                value={formData.dish_id?.toString() || ""}
                onValueChange={(value) => setFormData({ ...formData, dish_id: Number(value) })}
              >
                <SelectTrigger id="dish" className="col-span-3">
                  <SelectValue placeholder="Selecione um prato" />
                </SelectTrigger>
                <SelectContent>
                  {dishes.map((dish) => (
                    <SelectItem key={dish.id} value={dish.id.toString()}>
                      {dish.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="target-percentage" className="text-right">
              Meta de CMV (%)
            </Label>
            <Input
              id="target-percentage"
              type="number"
              min="1"
              max="100"
              step="0.1"
              value={formData.target_percentage}
              onChange={(e) => setFormData({ ...formData, target_percentage: Number(e.target.value) })}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date-range" className="text-right">
              Período
            </Label>
            <div className="col-span-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="start-date" className="w-20">
                  Início:
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="start-date"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.start_date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.start_date ? (
                        format(formData.start_date, "PPP", { locale: ptBR })
                      ) : (
                        <span>Selecione uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.start_date}
                      onSelect={(date) => date && setFormData({ ...formData, start_date: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="end-date" className="w-20">
                  Término:
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="end-date"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.end_date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.end_date ? (
                        format(formData.end_date, "PPP", { locale: ptBR })
                      ) : (
                        <span>Selecione uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.end_date}
                      onSelect={(date) => date && setFormData({ ...formData, end_date: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Atualizar" : "Criar"} Meta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
