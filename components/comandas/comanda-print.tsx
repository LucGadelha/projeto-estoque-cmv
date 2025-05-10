"use client"

import { useEffect } from "react"

interface ComandaPrintProps {
  comanda: any
}

export function ComandaPrint({ comanda }: ComandaPrintProps) {
  useEffect(() => {
    // Adicionar classe ao body para estilo de impressão
    document.body.classList.add("print-mode")

    return () => {
      // Remover classe ao desmontar
      document.body.classList.remove("print-mode")
    }
  }, [])

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

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">COMANDA #{comanda.id}</h1>
        <p className="text-sm text-gray-500">Emitida em: {formatarData(new Date().toISOString())}</p>
      </div>

      <div className="mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Cliente</p>
            <p className="font-medium">{comanda.cliente_nome}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Mesa</p>
            <p className="font-medium">{comanda.mesa_numero}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Data de Abertura</p>
            <p className="font-medium">{formatarData(comanda.created_at)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-medium">
              {comanda.status === "em_aberto"
                ? "Em aberto"
                : comanda.status === "finalizada"
                  ? "Finalizada"
                  : "Cancelada"}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-bold mb-2">Itens</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Item</th>
              <th className="text-left py-2">Categoria</th>
              <th className="text-center py-2">Qtd</th>
              <th className="text-right py-2">Valor Unit.</th>
              <th className="text-right py-2">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {comanda.comanda_itens.map((item: any) => (
              <tr key={item.id} className="border-b">
                <td className="py-2">
                  {item.dishes.name}
                  {item.observacoes && <div className="text-xs text-gray-500">Obs: {item.observacoes}</div>}
                </td>
                <td className="py-2">{item.dishes.categories?.name || "Sem categoria"}</td>
                <td className="text-center py-2">{item.quantidade}</td>
                <td className="text-right py-2">{formatarValor(item.valor_unitario)}</td>
                <td className="text-right py-2">{formatarValor(item.valor_unitario * item.quantidade)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td colSpan={4} className="text-right py-2">
                Total:
              </td>
              <td className="text-right py-2">{formatarValor(comanda.valor_total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="text-center text-sm text-gray-500 mt-8">
        <p>Obrigado pela preferência!</p>
        <p>Este documento não possui valor fiscal.</p>
      </div>

      <style jsx global>{`
        @media print {
          body.print-mode {
            background: white;
          }
          body.print-mode * {
            visibility: hidden;
          }
          body.print-mode .p-8 {
            visibility: visible;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          body.print-mode .p-8 * {
            visibility: visible;
          }
        }
      `}</style>
    </div>
  )
}
