"use client"

import type React from "react"

import { useState } from "react"
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
import { separarItensComanda } from "@/app/actions/comandas"

interface SepararItensDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  comandaId: number
  itensIds: number[]
  userId: string
  onItensSeparados?: () => void
}

export function SepararItensDialog({
  open,
  onOpenChange,
  comandaId,
  itensIds,
  userId,
  onItensSeparados,
}: SepararItensDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [clienteNome, setClienteNome] = useState("")
  const [mesaNumero, setMesaNumero] = useState("")

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

      const result = await separarItensComanda(
        comandaId,
        itensIds,
        {
          cliente_nome: clienteNome,
          mesa_numero: Number(mesaNumero),
        },
        userId,
      )

      if (result.success) {
        toast({
          title: "Itens separados",
          description: `Itens separados com sucesso para a nova comanda #${result.novaComanda.id}.`,
        })

        // Resetar formulário
        setClienteNome("")
        setMesaNumero("")

        // Fechar dialog
        onOpenChange(false)

        // Callback
        if (onItensSeparados) {
          onItensSeparados()
        }
      } else {
        throw new Error("Erro ao separar itens")
      }
    } catch (error) {
      console.error("Erro ao separar itens:", error)
      toast({
        title: "Erro",
        description: "Não foi possível separar os itens. Tente novamente.",
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
            <DialogTitle>Separar Itens</DialogTitle>
            <DialogDescription>
              Preencha os dados abaixo para criar uma nova comanda com os itens selecionados.
            </DialogDescription>
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
              Separar Itens
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
