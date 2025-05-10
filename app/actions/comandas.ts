"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"

// Tipos
interface ComandaData {
  cliente_nome: string
  mesa_numero: number
  responsavel_id: string
}

interface ComandaItemData {
  comanda_id: number
  dish_id: number
  quantidade: number
  valor_unitario: number
  observacoes?: string
}

// Criar nova comanda
export async function criarComanda(data: ComandaData) {
  const supabase = createServerSupabaseClient()

  try {
    // Inserir comanda
    const { data: comanda, error } = await supabase
      .from("comandas")
      .insert({
        cliente_nome: data.cliente_nome,
        mesa_numero: data.mesa_numero,
        responsavel_id: data.responsavel_id,
        status: "em_aberto",
        valor_total: 0,
      })
      .select()
      .single()

    if (error) throw error

    // Registrar no histórico
    await supabase.from("comanda_historico").insert({
      comanda_id: comanda.id,
      acao: "criacao",
      descricao: `Comanda criada para ${data.cliente_nome} na mesa ${data.mesa_numero}`,
      responsavel_id: data.responsavel_id,
    })

    revalidatePath("/dashboard/comandas")
    return { success: true, comanda }
  } catch (error) {
    console.error("Erro ao criar comanda:", error)
    return { success: false, error }
  }
}

// Adicionar item à comanda
export async function adicionarItemComanda(data: ComandaItemData, responsavel_id: string) {
  const supabase = createServerSupabaseClient()

  try {
    // Buscar informações do prato
    const { data: dish, error: dishError } = await supabase
      .from("dishes")
      .select("name, categories(name)")
      .eq("id", data.dish_id)
      .single()

    if (dishError) throw dishError

    // Inserir item na comanda
    const { data: item, error } = await supabase
      .from("comanda_itens")
      .insert({
        comanda_id: data.comanda_id,
        dish_id: data.dish_id,
        quantidade: data.quantidade,
        valor_unitario: data.valor_unitario,
        observacoes: data.observacoes || "",
      })
      .select()
      .single()

    if (error) throw error

    // Atualizar valor total da comanda
    await atualizarValorTotalComanda(data.comanda_id)

    // Registrar no histórico
    await supabase.from("comanda_historico").insert({
      comanda_id: data.comanda_id,
      acao: "adicao_item",
      descricao: `Item adicionado: ${dish.name} (${data.quantidade}x) - ${
        data.observacoes ? "Obs: " + data.observacoes : "Sem observações"
      }`,
      responsavel_id,
    })

    revalidatePath("/dashboard/comandas")
    revalidatePath(`/dashboard/comandas/${data.comanda_id}`)
    return { success: true, item }
  } catch (error) {
    console.error("Erro ao adicionar item à comanda:", error)
    return { success: false, error }
  }
}

// Editar item da comanda
export async function editarItemComanda(
  id: number,
  data: { quantidade: number; observacoes?: string },
  responsavel_id: string,
) {
  const supabase = createServerSupabaseClient()

  try {
    // Buscar informações do item atual
    const { data: itemAtual, error: itemError } = await supabase
      .from("comanda_itens")
      .select("comanda_id, dish_id, quantidade, observacoes, dishes(name)")
      .eq("id", id)
      .single()

    if (itemError) throw itemError

    // Atualizar item
    const { data: item, error } = await supabase
      .from("comanda_itens")
      .update({
        quantidade: data.quantidade,
        observacoes: data.observacoes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    // Atualizar valor total da comanda
    await atualizarValorTotalComanda(itemAtual.comanda_id)

    // Registrar no histórico
    await supabase.from("comanda_historico").insert({
      comanda_id: itemAtual.comanda_id,
      acao: "edicao_item",
      descricao: `Item editado: ${itemAtual.dishes.name} - Quantidade: ${itemAtual.quantidade} → ${
        data.quantidade
      }, Observações: ${itemAtual.observacoes || "Nenhuma"} → ${data.observacoes || "Nenhuma"}`,
      responsavel_id,
    })

    revalidatePath("/dashboard/comandas")
    revalidatePath(`/dashboard/comandas/${itemAtual.comanda_id}`)
    return { success: true, item }
  } catch (error) {
    console.error("Erro ao editar item da comanda:", error)
    return { success: false, error }
  }
}

// Remover item da comanda
export async function removerItemComanda(id: number, responsavel_id: string) {
  const supabase = createServerSupabaseClient()

  try {
    // Buscar informações do item
    const { data: item, error: itemError } = await supabase
      .from("comanda_itens")
      .select("comanda_id, dish_id, quantidade, dishes(name)")
      .eq("id", id)
      .single()

    if (itemError) throw itemError

    // Remover item
    const { error } = await supabase.from("comanda_itens").delete().eq("id", id)

    if (error) throw error

    // Atualizar valor total da comanda
    await atualizarValorTotalComanda(item.comanda_id)

    // Registrar no histórico
    await supabase.from("comanda_historico").insert({
      comanda_id: item.comanda_id,
      acao: "remocao_item",
      descricao: `Item removido: ${item.dishes.name} (${item.quantidade}x)`,
      responsavel_id,
    })

    revalidatePath("/dashboard/comandas")
    revalidatePath(`/dashboard/comandas/${item.comanda_id}`)
    return { success: true }
  } catch (error) {
    console.error("Erro ao remover item da comanda:", error)
    return { success: false, error }
  }
}

// Atualizar status da comanda
export async function atualizarStatusComanda(id: number, status: string, responsavel_id: string) {
  const supabase = createServerSupabaseClient()

  try {
    // Buscar status atual
    const { data: comandaAtual, error: comandaError } = await supabase
      .from("comandas")
      .select("status")
      .eq("id", id)
      .single()

    if (comandaError) throw comandaError

    // Atualizar status
    const { error } = await supabase
      .from("comandas")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) throw error

    // Registrar no histórico
    await supabase.from("comanda_historico").insert({
      comanda_id: id,
      acao: "alteracao_status",
      descricao: `Status alterado: ${comandaAtual.status} → ${status}`,
      responsavel_id,
    })

    revalidatePath("/dashboard/comandas")
    revalidatePath(`/dashboard/comandas/${id}`)
    return { success: true }
  } catch (error) {
    console.error("Erro ao atualizar status da comanda:", error)
    return { success: false, error }
  }
}

// Separar itens para nova comanda
export async function separarItensComanda(
  comanda_id: number,
  itens_ids: number[],
  nova_comanda: { cliente_nome: string; mesa_numero: number },
  responsavel_id: string,
) {
  const supabase = createServerSupabaseClient()

  try {
    // Criar nova comanda
    const { data: novaComanda, error: novaComandaError } = await supabase
      .from("comandas")
      .insert({
        cliente_nome: nova_comanda.cliente_nome,
        mesa_numero: nova_comanda.mesa_numero,
        responsavel_id,
        status: "em_aberto",
        valor_total: 0,
      })
      .select()
      .single()

    if (novaComandaError) throw novaComandaError

    // Buscar itens a serem transferidos
    const { data: itens, error: itensError } = await supabase
      .from("comanda_itens")
      .select("*")
      .in("id", itens_ids)
      .eq("comanda_id", comanda_id)

    if (itensError) throw itensError

    // Transferir itens para a nova comanda
    for (const item of itens) {
      const { error } = await supabase.from("comanda_itens").insert({
        comanda_id: novaComanda.id,
        dish_id: item.dish_id,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        observacoes: item.observacoes,
      })

      if (error) throw error

      // Remover item da comanda original
      await supabase.from("comanda_itens").delete().eq("id", item.id)
    }

    // Atualizar valores totais
    await atualizarValorTotalComanda(comanda_id)
    await atualizarValorTotalComanda(novaComanda.id)

    // Registrar no histórico da comanda original
    await supabase.from("comanda_historico").insert({
      comanda_id,
      acao: "separacao",
      descricao: `${itens.length} itens separados para nova comanda #${novaComanda.id} (${nova_comanda.cliente_nome})`,
      responsavel_id,
    })

    // Registrar no histórico da nova comanda
    await supabase.from("comanda_historico").insert({
      comanda_id: novaComanda.id,
      acao: "criacao",
      descricao: `Comanda criada a partir da separação de itens da comanda #${comanda_id}`,
      responsavel_id,
    })

    revalidatePath("/dashboard/comandas")
    revalidatePath(`/dashboard/comandas/${comanda_id}`)
    revalidatePath(`/dashboard/comandas/${novaComanda.id}`)
    return { success: true, novaComanda }
  } catch (error) {
    console.error("Erro ao separar itens da comanda:", error)
    return { success: false, error }
  }
}

// Modificar a função buscarComandas para remover a referência à tabela profiles
export async function buscarComandas() {
  const supabase = createServerSupabaseClient()

  try {
    const { data, error } = await supabase
      .from("comandas")
      .select(`
        *,
        comanda_itens(count)
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    return data
  } catch (error) {
    console.error("Erro ao buscar comandas:", error)
    throw error
  }
}

// Modificar a função buscarComandaPorId para remover a referência à tabela profiles
export async function buscarComandaPorId(id: number) {
  const supabase = createServerSupabaseClient()

  try {
    const { data, error } = await supabase
      .from("comandas")
      .select(`
        *,
        comanda_itens(
          *,
          dishes(
            *,
            categories(name)
          )
        )
      `)
      .eq("id", id)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error("Erro ao buscar comanda:", error)
    throw error
  }
}

// Modificar a função buscarHistoricoComanda para remover a referência à tabela profiles
export async function buscarHistoricoComanda(id: number) {
  const supabase = createServerSupabaseClient()

  try {
    const { data, error } = await supabase
      .from("comanda_historico")
      .select(`*`)
      .eq("comanda_id", id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return data
  } catch (error) {
    console.error("Erro ao buscar histórico da comanda:", error)
    throw error
  }
}

// Função auxiliar para atualizar o valor total da comanda
async function atualizarValorTotalComanda(comanda_id: number) {
  const supabase = createServerSupabaseClient()

  try {
    // Calcular valor total
    const { data, error } = await supabase
      .from("comanda_itens")
      .select("quantidade, valor_unitario")
      .eq("comanda_id", comanda_id)

    if (error) throw error

    const valorTotal = data.reduce((total, item) => total + item.quantidade * item.valor_unitario, 0)

    // Atualizar comanda
    await supabase
      .from("comandas")
      .update({
        valor_total: valorTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", comanda_id)

    return { success: true, valorTotal }
  } catch (error) {
    console.error("Erro ao atualizar valor total da comanda:", error)
    return { success: false, error }
  }
}
