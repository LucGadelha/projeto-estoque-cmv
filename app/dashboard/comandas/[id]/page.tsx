"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Printer, Clock, Edit, CheckCircle, XCircle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { useSession } from "@/components/providers/session-provider"
import { buscarComandaPorId, buscarHistoricoComanda, atualizarStatusComanda } from "@/app/actions/comandas"
import { ConfirmDialog } from "@/components/comandas/confirm-dialog"
import { ComandaPrint } from "@/components/comandas/comanda-print"

export default function ComandaDetalhesPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const { session } = useSession()
  const [comanda, setComanda] = useState<any>(null)
  const [historico, setHistorico] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ action: string; title: string; description: string }>({
    action: "",
    title: "",
    description: "",
  })
  const [printMode, setPrintMode] = useState(false)

  useEffect(() => {
    const loadComanda = async () => {
      try {
        setLoading(true)
        const comandaData = await buscarComandaPorId(Number(params.id))
        const historicoData = await buscarHistoricoComanda(Number(params.id))
        setComanda(comandaData)
        setHistorico(historicoData)
      } catch (error) {
        console.error("Erro ao carregar comanda:", error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar os detalhes da comanda.",
          variant: "destructive",
        })
        router.push("/dashboard/comandas")
      } finally {
        setLoading(false)
      }
    }

    loadComanda()
  }, [params.id, router, toast])

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

  const handleFinalizarComanda = () => {
    setConfirmAction({
      action: "finalizar",
      title: "Finalizar Comanda",
      description: "Tem certeza que deseja finalizar esta comanda? Esta ação não pode ser desfeita.",
    })
    setConfirmDialogOpen(true)
  }

  const handleCancelarComanda = () => {
    setConfirmAction({
      action: "cancelar",
      title: "Cancelar Comanda",
      description: "Tem certeza que deseja cancelar esta comanda? Esta ação não pode ser desfeita.",
    })
    setConfirmDialogOpen(true)
  }

  const handleConfirmAction = async () => {
    try {
      setLoading(true)

      let novoStatus = ""
      if (confirmAction.action === "finalizar") {
        novoStatus = "finalizada"
      } else if (confirmAction.action === "cancelar") {
        novoStatus = "cancelada"
      }

      if (novoStatus) {
        const result = await atualizarStatusComanda(Number(params.id), novoStatus, session?.user?.id || "")

        if (result.success) {
          toast({
            title: "Status atualizado",
            description: `Comanda ${novoStatus === "finalizada" ? "finalizada" : "cancelada"} com sucesso.`,
          })

          // Atualizar comanda
          const comandaData = await buscarComandaPorId(Number(params.id))
          const historicoData = await buscarHistoricoComanda(Number(params.id))
          setComanda(comandaData)
          setHistorico(historicoData)
        } else {
          throw new Error(`Erro ao ${novoStatus === "finalizada" ? "finalizar" : "cancelar"} comanda`)
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar status da comanda:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da comanda. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setConfirmDialogOpen(false)
    }
  }

  const handlePrint = () => {
    setPrintMode(true)
    setTimeout(() => {
      window.print()
      setPrintMode(false)
    }, 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)] md:h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (!comanda) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] md:h-[calc(100vh-64px)]">
        <p className="text-muted-foreground mb-4">Comanda não encontrada.</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/comandas")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Comandas
        </Button>
      </div>
    )
  }

  if (printMode) {
    return <ComandaPrint comanda={comanda} />
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/comandas")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold ml-2">Comanda #{params.id}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          {comanda.status === "em_aberto" && (
            <Button variant="default" onClick={() => router.push(`/dashboard/comandas/${params.id}/editar`)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-4">
        <Tabs defaultValue="detalhes">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="detalhes" className="space-y-4 mt-4">
            {/* Informações da comanda */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Informações da Comanda</CardTitle>
                  <Badge className={getStatusColor(comanda.status)}>{getStatusLabel(comanda.status)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{comanda.cliente_nome}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mesa</p>
                    <p className="font-medium">{comanda.mesa_numero}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Abertura</p>
                    <p className="font-medium">{formatarData(comanda.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Responsável</p>
                    <p className="font-medium">{comanda.profiles?.name || "Não informado"}</p>
                  </div>
                </div>
              </CardContent>
              {comanda.status === "em_aberto" && (
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={handleCancelarComanda}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancelar Comanda
                  </Button>
                  <Button variant="default" onClick={handleFinalizarComanda}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Finalizar Comanda
                  </Button>
                </CardFooter>
              )}
            </Card>

            {/* Itens da comanda */}
            <Card>
              <CardHeader>
                <CardTitle>Itens da Comanda</CardTitle>
              </CardHeader>
              <CardContent>
                {comanda.comanda_itens.length > 0 ? (
                  <div className="space-y-4">
                    {comanda.comanda_itens.map((item: any) => (
                      <div key={item.id} className="border-b pb-4 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center">
                              <h4 className="font-medium">{item.dishes.name}</h4>
                              <Badge variant="outline" className="ml-2">
                                {item.dishes.categories?.name || "Sem categoria"}
                              </Badge>
                            </div>
                            {item.observacoes && (
                              <p className="text-sm text-muted-foreground mt-1">Obs: {item.observacoes}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatarValor(item.valor_unitario)}</p>
                            <p className="text-sm text-muted-foreground">x{item.quantidade}</p>
                          </div>
                        </div>
                        <div className="flex justify-end mt-2">
                          <p className="font-bold">{formatarValor(item.valor_unitario * item.quantidade)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">Nenhum item na comanda.</p>
                )}
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <div className="font-bold text-lg">Total</div>
                <div className="font-bold text-lg">{formatarValor(comanda.valor_total)}</div>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Alterações</CardTitle>
              </CardHeader>
              <CardContent>
                {historico.length > 0 ? (
                  <div className="space-y-4">
                    {historico.map((item) => (
                      <div key={item.id} className="flex items-start space-x-4 border-b pb-4 last:border-0 last:pb-0">
                        <div className="rounded-full bg-muted p-2">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">
                                {item.acao.charAt(0).toUpperCase() + item.acao.slice(1).replace("_", " ")}
                              </p>
                              <p className="text-sm text-muted-foreground">{item.descricao}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">{formatarData(item.created_at)}</p>
                              <p className="text-xs text-muted-foreground">{item.profiles?.name || "Sistema"}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">Nenhum registro de histórico encontrado.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog de confirmação */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        onConfirm={handleConfirmAction}
      />
    </div>
  )
}
