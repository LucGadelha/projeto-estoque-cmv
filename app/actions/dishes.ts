"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Database } from "@/types/supabase"

type Dish = Database["public"]["Tables"]["dishes"]["Row"]
type DishInsert = Database["public"]["Tables"]["dishes"]["Insert"]
type DishUpdate = Database["public"]["Tables"]["dishes"]["Update"]
type DishIngredient = Database["public"]["Tables"]["dish_ingredients"]["Insert"]

export async function getDishes() {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("dishes")
    .select(`
      *,
      categories(name, type),
      dish_ingredients(
        *,
        stock_items(id, name, unit, quantity)
      )
    `)
    .order("id", { ascending: true })

  if (error) {
    throw new Error(`Error fetching dishes: ${error.message}`)
  }

  return data
}

export async function getDish(id: number) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("dishes")
    .select(`
      *,
      categories(name, type),
      dish_ingredients(
        *,
        stock_items(id, name, unit, quantity)
      )
    `)
    .eq("id", id)
    .single()

  if (error) {
    throw new Error(`Error fetching dish: ${error.message}`)
  }

  return data
}

export async function createDish(dish: DishInsert, ingredients: Omit<DishIngredient, "dish_id">[], userId: string) {
  const supabase = createServerSupabaseClient()

  // Start a transaction
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    throw new Error("User not authenticated")
  }

  // Step 1: Create the dish
  const { data: dishData, error: dishError } = await supabase.from("dishes").insert(dish).select()

  if (dishError) {
    throw new Error(`Error creating dish: ${dishError.message}`)
  }

  const newDishId = dishData[0].id

  // Step 2: Add ingredients
  const dishIngredients = ingredients.map((ingredient) => ({
    ...ingredient,
    dish_id: newDishId,
  }))

  const { error: ingredientsError } = await supabase.from("dish_ingredients").insert(dishIngredients)

  if (ingredientsError) {
    // If there's an error, we should ideally rollback the dish creation
    await supabase.from("dishes").delete().eq("id", newDishId)
    throw new Error(`Error adding dish ingredients: ${ingredientsError.message}`)
  }

  revalidatePath("/dashboard/pratos")
  return { dish: dishData[0], ingredients: dishIngredients }
}

export async function prepareDish(dishId: number, userId: string) {
  const supabase = createServerSupabaseClient()

  try {
    // Buscar os ingredientes do prato
    const { data: ingredients, error: ingredientsError } = await supabase
      .from("dish_ingredients")
      .select(`
        id,
        quantity,
        unit,
        stock_item_id,
        stock_items(id, name, unit)
      `)
      .eq("dish_id", dishId)

    if (ingredientsError) {
      throw new Error(`Erro ao buscar ingredientes: ${ingredientsError.message}`)
    }

    if (!ingredients || ingredients.length === 0) {
      throw new Error("Prato não possui ingredientes cadastrados")
    }

    // Para cada ingrediente, reduzir o estoque
    for (const ingredient of ingredients) {
      if (!ingredient.stock_item_id) continue

      // Registrar movimento de estoque
      const { error: movementError } = await supabase.from("stock_movements").insert({
        stock_item_id: ingredient.stock_item_id,
        movement_type: "saida",
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        dish_id: dishId,
        user_id: userId,
        notes: "Venda de prato",
      })

      if (movementError) {
        throw new Error(`Erro ao registrar movimento: ${movementError.message}`)
      }

      // Atualizar quantidade no estoque
      const { error: updateError } = await supabase.rpc("update_stock_quantity", {
        p_stock_item_id: ingredient.stock_item_id,
        p_quantity: -ingredient.quantity,
        p_unit: ingredient.unit,
      })

      if (updateError) {
        throw new Error(`Erro ao atualizar estoque: ${updateError.message}`)
      }
    }

    revalidatePath("/dashboard/pratos")
    revalidatePath("/dashboard/estoque")

    return { success: true }
  } catch (error) {
    console.error("Erro ao preparar prato:", error)
    throw error
  }
}

export async function deleteDish(id: number) {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase.from("dishes").delete().eq("id", id)

  if (error) {
    throw new Error(`Error deleting dish: ${error.message}`)
  }

  revalidatePath("/dashboard/pratos")
}
