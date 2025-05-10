"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { deleteCMVGoal } from "@/app/actions/cmv-goals"

type DeleteGoalDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  goalId: number
  goalName: string
}

export function DeleteGoalDialog({ open, onOpenChange, goalId, goalName }: DeleteGoalDialogProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    try {
      setIsLoading(true)
      await deleteCMVGoal(goalId)

      toast({
        title: "Meta excluída",
        description: "A meta de CMV foi excluída com sucesso.",
      })

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error("Error deleting CMV goal:", error)
      toast({
        title: "Erro ao excluir meta",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao excluir a meta de CMV.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Meta de CMV</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a meta <strong>"{goalName}"</strong>? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
