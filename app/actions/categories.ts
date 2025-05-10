"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Database } from "@/types/supabase"

type Category = Database["public"]["Tables"]["categories"]["Row"]
type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"]
type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"]

export async function getCategories(type?: string) {
  const supabase = createServerSupabaseClient()

  let query = supabase.from("categories").select("*")

  if (type) {
    query = query.eq("type", type)
  }

  const { data, error } = await query.order("name", { ascending: true })

  if (error) {
    throw new Error(`Error fetching categories: ${error.message}`)
  }

  return data
}

export async function createCategory(category: CategoryInsert) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.from("categories").insert(category).select()

  if (error) {
    throw new Error(`Error creating category: ${error.message}`)
  }

  revalidatePath("/dashboard/configuracoes")
  return data[0]
}

export async function updateCategory(id: number, category: CategoryUpdate) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.from("categories").update(category).eq("id", id).select()

  if (error) {
    throw new Error(`Error updating category: ${error.message}`)
  }

  revalidatePath("/dashboard/configuracoes")
  return data[0]
}

export async function deleteCategory(id: number) {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase.from("categories").delete().eq("id", id)

  if (error) {
    throw new Error(`Error deleting category: ${error.message}`)
  }

  revalidatePath("/dashboard/configuracoes")
}
