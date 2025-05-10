import { BarChart, Download, FileText, PieChart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function RelatoriosPage() {
  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <div className="ml-auto flex items-center gap-2">
          <Select defaultValue="month">
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
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="movimentacao">
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:grid-cols-4">
          <TabsTrigger value="movimentacao">Movimentação</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="consumo">Consumo</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="movimentacao" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Movimentação de Estoque</CardTitle>
              <CardDescription>Entradas e saídas de itens no período selecionado</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px] w-full flex items-center justify-center border rounded-md">
                <div className="flex flex-col items-center text-muted-foreground">
                  <BarChart className="h-16 w-16 mb-2" />
                  <p>Gráfico de Movimentação de Estoque</p>
                  <p className="text-sm">(Dados de exemplo)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Itens Mais Movimentados</CardTitle>
                <CardDescription>Itens com maior número de entradas e saídas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Arroz Branco</p>
                      <p className="text-sm text-muted-foreground">120 movimentações</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">75 saídas</p>
                      <p className="text-sm">45 entradas</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Óleo de Soja</p>
                      <p className="text-sm text-muted-foreground">98 movimentações</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">60 saídas</p>
                      <p className="text-sm">38 entradas</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Feijão Preto</p>
                      <p className="text-sm text-muted-foreground">85 movimentações</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">50 saídas</p>
                      <p className="text-sm">35 entradas</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Relatórios Disponíveis</CardTitle>
                <CardDescription>Relatórios detalhados para download</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="mr-2 h-4 w-4" />
                    Relatório de Movimentação Completo
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="mr-2 h-4 w-4" />
                    Relatório de Entradas por Fornecedor
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="mr-2 h-4 w-4" />
                    Relatório de Saídas por Categoria
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categorias" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Categorias</CardTitle>
              <CardDescription>Distribuição dos itens em estoque por categoria</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px] w-full flex items-center justify-center border rounded-md">
                <div className="flex flex-col items-center text-muted-foreground">
                  <PieChart className="h-16 w-16 mb-2" />
                  <p>Gráfico de Distribuição por Categorias</p>
                  <p className="text-sm">(Dados de exemplo)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consumo" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Consumo</CardTitle>
              <CardDescription>Análise do consumo de itens ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full flex items-center justify-center border rounded-md">
                <div className="flex flex-col items-center text-muted-foreground">
                  <BarChart className="h-16 w-16 mb-2" />
                  <p>Gráfico de Análise de Consumo</p>
                  <p className="text-sm">(Dados de exemplo)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financeiro" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Análise Financeira</CardTitle>
              <CardDescription>Análise financeira do estoque</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full flex items-center justify-center border rounded-md">
                <div className="flex flex-col items-center text-muted-foreground">
                  <BarChart className="h-16 w-16 mb-2" />
                  <p>Gráfico de Análise Financeira</p>
                  <p className="text-sm">(Dados de exemplo)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
