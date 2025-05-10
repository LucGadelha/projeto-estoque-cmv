"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"

type CMVGoal = {
  id?: number
  name: string
  target_percentage: number
  category_id?: number | null
  dish_id?: number | null
  start_date: string
  end_date: string
  created_by: string
}

export async function getCMVGoals() {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("cmv_goals")
    .select(`
      *,
      categories(*),
      dishes(*)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Error fetching CMV goals: ${error.message}`)
  }

  return data
}

export async function getCMVGoalById(id: number) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("cmv_goals")
    .select(`
      *,
      categories(*),
      dishes(*)
    `)
    .eq("id", id)
    .single()

  if (error) {
    throw new Error(`Error fetching CMV goal: ${error.message}`)
  }

  return data
}

export async function createCMVGoal(goal: CMVGoal) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.from("cmv_goals").insert(goal).select()

  if (error) {
    throw new Error(`Error creating CMV goal: ${error.message}`)
  }

  revalidatePath("/dashboard/cmv")
  return data[0]
}

export async function updateCMVGoal(id: number, goal: Partial<CMVGoal>) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.from("cmv_goals").update(goal).eq("id", id).select()

  if (error) {
    throw new Error(`Error updating CMV goal: ${error.message}`)
  }

  revalidatePath("/dashboard/cmv")
  return data[0]
}

export async function deleteCMVGoal(id: number) {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase.from("cmv_goals").delete().eq("id", id)

  if (error) {
    throw new Error(`Error deleting CMV goal: ${error.message}`)
  }

  revalidatePath("/dashboard/cmv")
}

export async function getActiveCMVGoals() {
  const supabase = createServerSupabaseClient()
  const today = new Date().toISOString().split("T")[0]

  const { data, error } = await supabase
    .from("cmv_goals")
    .select(`
      *,
      categories(*),
      dishes(*)
    `)
    .lte("start_date", today)
    .gte("end_date", today)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Error fetching active CMV goals: ${error.message}`)
  }

  return data
}
