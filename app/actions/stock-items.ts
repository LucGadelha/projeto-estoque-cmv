"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { convertUnits } from "@/lib/unit-converter"
import type { Database } from "@/types/supabase"

type StockItem = Database["public"]["Tables"]["stock_items"]["Row"]
type StockItemInsert = Database["public"]["Tables"]["stock_items"]["Insert"]
type StockItemUpdate = Database["public"]["Tables"]["stock_items"]["Update"]

export async function getStockItems() {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("stock_items")
    .select("*, categories(name, type)")
    .order("id", { ascending: true })

  if (error) {
    throw new Error(`Error fetching stock items: ${error.message}`)
  }

  return data
}

export async function getStockItem(id: number) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.from("stock_items").select("*, categories(name, type)").eq("id", id).single()

  if (error) {
    throw new Error(`Error fetching stock item: ${error.message}`)
  }

  return data
}

export async function createStockItem(item: StockItemInsert) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.from("stock_items").insert(item).select()

  if (error) {
    throw new Error(`Error creating stock item: ${error.message}`)
  }

  revalidatePath("/dashboard/estoque")
  return data[0]
}

export async function updateStockItem(id: number, item: StockItemUpdate) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.from("stock_items").update(item).eq("id", id).select()

  if (error) {
    throw new Error(`Error updating stock item: ${error.message}`)
  }

  revalidatePath("/dashboard/estoque")
  return data[0]
}

export async function deleteStockItem(id: number) {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase.from("stock_items").delete().eq("id", id)

  if (error) {
    throw new Error(`Error deleting stock item: ${error.message}`)
  }

  revalidatePath("/dashboard/estoque")
}

export async function adjustStockQuantity(
  id: number,
  quantity: number,
  unit: string,
  type: "add" | "remove",
  userId: string,
  notes?: string,
) {
  const supabase = createServerSupabaseClient()

  // Get the current stock item
  const { data: stockItem, error: fetchError } = await supabase.from("stock_items").select("*").eq("id", id).single()

  if (fetchError) {
    throw new Error(`Error fetching stock item: ${fetchError.message}`)
  }

  // Convert quantity if units are different
  let adjustedQuantity = quantity
  if (unit !== stockItem.unit) {
    const converted = convertUnits(quantity, unit, stockItem.unit)
    if (converted === null) {
      throw new Error(`Cannot convert from ${unit} to ${stockItem.unit}`)
    }
    adjustedQuantity = converted
  }

  // Calculate new quantity
  const newQuantity = type === "add" ? stockItem.quantity + adjustedQuantity : stockItem.quantity - adjustedQuantity

  // Check if we have enough stock for removal
  if (type === "remove" && newQuantity < 0) {
    throw new Error(`Not enough stock. Available: ${stockItem.quantity} ${stockItem.unit}`)
  }

  // Update the stock item
  const { error: updateError } = await supabase.from("stock_items").update({ quantity: newQuantity }).eq("id", id)

  if (updateError) {
    throw new Error(`Error updating stock quantity: ${updateError.message}`)
  }

  // Record the movement in stock_movements
  const { error: movementError } = await supabase.from("stock_movements").insert({
    stock_item_id: id,
    movement_type: type === "add" ? "entrada" : "saida",
    quantity: adjustedQuantity,
    unit: stockItem.unit,
    user_id: userId,
    notes,
  })

  if (movementError) {
    throw new Error(`Error recording stock movement: ${movementError.message}`)
  }

  revalidatePath("/dashboard/estoque")
}
