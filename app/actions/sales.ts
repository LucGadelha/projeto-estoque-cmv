"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { prepareDish } from "./dishes"

interface SaleItem {
  dishId: number
  quantity: number
  unitPrice: number
}

interface SaleData {
  userId: string
  items: SaleItem[]
  total: number
}

export async function registerSale(data: SaleData) {
  const supabase = createServerSupabaseClient()

  try {
    // Criar registro da venda
    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .insert({
        user_id: data.userId,
        total_amount: data.total,
        status: "completed",
      })
      .select()
      .single()

    if (saleError) {
      throw new Error(`Erro ao registrar venda: ${saleError.message}`)
    }

    const saleId = saleData.id

    // Registrar itens da venda
    const saleItems = data.items.map((item) => ({
      sale_id: saleId,
      dish_id: item.dishId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.quantity * item.unitPrice,
    }))

    const { error: itemsError } = await supabase.from("sale_items").insert(saleItems)

    if (itemsError) {
      throw new Error(`Erro ao registrar itens da venda: ${itemsError.message}`)
    }

    // Para cada prato vendido, atualizar o estoque
    for (const item of data.items) {
      // Preparar o prato (reduzir estoque) para cada unidade vendida
      for (let i = 0; i < item.quantity; i++) {
        await prepareDish(item.dishId, data.userId)
      }
    }

    revalidatePath("/dashboard/vendas")
    revalidatePath("/dashboard/estoque")
    revalidatePath("/dashboard/cmv")

    return { success: true, saleId }
  } catch (error) {
    console.error("Erro ao registrar venda:", error)
    throw error
  }
}

export async function getSales() {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("sales")
    .select(`
      *,
      profiles(name, email),
      sale_items(
        *,
        dishes(name, price)
      )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Erro ao buscar vendas: ${error.message}`)
  }

  return data
}

export async function getSaleById(id: number) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("sales")
    .select(`
      *,
      profiles(name, email),
      sale_items(
        *,
        dishes(name, price, category_id, categories(name))
      )
    `)
    .eq("id", id)
    .single()

  if (error) {
    throw new Error(`Erro ao buscar venda: ${error.message}`)
  }

  return data
}
