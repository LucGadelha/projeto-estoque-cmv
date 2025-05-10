"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { criarComanda } from "@/app/actions/comandas"

interface NovaComandaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComandaCriada?: () => void
  userId: string
}

export function NovaComandaDialog({ open, onOpenChange, onComandaCriada, userId }: NovaComandaDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [clienteNome, setClienteNome] = useState("")
  const [mesaNumero, setMesaNumero] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clienteNome.trim()) {
      toast({
        title: "Nome do cliente obrigatório",
        description: "Por favor, informe o nome do cliente.",
        variant: "destructive",
      })
      return
    }

    if (!mesaNumero.trim() || isNaN(Number(mesaNumero)) || Number(mesaNumero) <= 0) {
      toast({
        title: "Mesa inválida",
        description: "Por favor, informe um número de mesa válido.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      const result = await criarComanda({
        cliente_nome: clienteNome,
        mesa_numero: Number(mesaNumero),
        responsavel_id: userId,
      })

      if (result.success) {
        toast({
          title: "Comanda criada",
          description: `Comanda #${result.comanda.id} criada com sucesso.`,
        })

        // Resetar formulário
        setClienteNome("")
        setMesaNumero("")

        // Fechar dialog
        onOpenChange(false)

        // Callback
        if (onComandaCriada) {
          onComandaCriada()
        }

        // Redirecionar para a página da comanda
        router.push(`/dashboard/comandas/${result.comanda.id}/editar`)
      } else {
        throw new Error("Erro ao criar comanda")
      }
    } catch (error) {
      console.error("Erro ao criar comanda:", error)
      toast({
        title: "Erro",
        description: "Não foi possível criar a comanda. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nova Comanda</DialogTitle>
            <DialogDescription>Preencha os dados abaixo para criar uma nova comanda.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cliente" className="text-right">
                Cliente
              </Label>
              <Input
                id="cliente"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                className="col-span-3"
                placeholder="Nome do cliente"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mesa" className="text-right">
                Mesa
              </Label>
              <Input
                id="mesa"
                type="number"
                min="1"
                value={mesaNumero}
                onChange={(e) => setMesaNumero(e.target.value)}
                className="col-span-3"
                placeholder="Número da mesa"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Criar Comanda
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
