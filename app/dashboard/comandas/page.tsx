"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Clock, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { useSession } from "@/components/providers/session-provider"
import { NovaComandaDialog } from "@/components/comandas/nova-comanda-dialog"
import { buscarComandas } from "@/app/actions/comandas"

export default function ComandasPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { session } = useSession()
  const [comandas, setComandas] = useState<any[]>([])
  const [filteredComandas, setFilteredComandas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("todas")
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    const loadComandas = async () => {
      try {
        setLoading(true)
        const data = await buscarComandas()
        setComandas(data)
        setFilteredComandas(data)
      } catch (error) {
        console.error("Erro ao carregar comandas:", error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar as comandas.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadComandas()
  }, [toast])

  useEffect(() => {
    // Filtrar comandas com base no termo de busca e filtro de status
    const filtered = comandas.filter((comanda) => {
      const matchesSearch =
        comanda.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comanda.id.toString().includes(searchTerm)

      const matchesStatus = statusFilter === "todas" || comanda.status === statusFilter

      return matchesSearch && matchesStatus
    })

    setFilteredComandas(filtered)
  }, [searchTerm, statusFilter, comandas])

  const handleNovaComanda = () => {
    setDialogOpen(true)
  }

  const handleComandaCriada = () => {
    // Recarregar comandas após criar uma nova
    buscarComandas()
      .then((data) => {
        setComandas(data)
        setFilteredComandas(data)
      })
      .catch((error) => {
        console.error("Erro ao recarregar comandas:", error)
      })
  }

  // Função para formatar data
  const formatarData = (dataString: string) => {
    const data = new Date(dataString)
    return data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Função para formatar valor em reais
  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor)
  }

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "em_aberto":
        return "bg-yellow-500"
      case "finalizada":
        return "bg-green-500"
      case "cancelada":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  // Função para obter label do status
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "em_aberto":
        return "Em aberto"
      case "finalizada":
        return "Finalizada"
      case "cancelada":
        return "Cancelada"
      default:
        return status
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-bold">Comandas</h1>
        <Button onClick={handleNovaComanda}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Comanda
        </Button>
      </div>

      {/* Filtros */}
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou número..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Tabs defaultValue="todas" value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="em_aberto">Em aberto</TabsTrigger>
            <TabsTrigger value="finalizada">Finalizadas</TabsTrigger>
            <TabsTrigger value="cancelada">Canceladas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Lista de Comandas */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : filteredComandas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredComandas.map((comanda) => (
              <Card key={comanda.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">
                        #{comanda.id} - {comanda.cliente_nome}
                      </h3>
                      <p className="text-sm text-muted-foreground">Mesa {comanda.mesa_numero}</p>
                    </div>
                    <Badge className={getStatusColor(comanda.status)}>{getStatusLabel(comanda.status)}</Badge>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-1 h-4 w-4" />
                      {formatarData(comanda.created_at)}
                    </div>
                    <div className="font-medium">
                      {comanda.comanda_itens.count} {comanda.comanda_itens.count === 1 ? "item" : "itens"}
                    </div>
                  </div>
                  <div className="mt-2 text-right">
                    <span className="font-bold text-lg">{formatarValor(comanda.valor_total)}</span>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex justify-between">
                  <Button variant="outline" onClick={() => router.push(`/dashboard/comandas/${comanda.id}`)}>
                    Ver Detalhes
                  </Button>
                  {comanda.status === "em_aberto" && (
                    <Button variant="default" onClick={() => router.push(`/dashboard/comandas/${comanda.id}/editar`)}>
                      Editar
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground mb-4">Nenhuma comanda encontrada.</p>
            <Button variant="outline" onClick={handleNovaComanda}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Nova Comanda
            </Button>
          </div>
        )}
      </div>

      {/* Dialog para criar nova comanda */}
      <NovaComandaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onComandaCriada={handleComandaCriada}
        userId={session?.user?.id || ""}
      />
    </div>
  )
}
