export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          name: string | null
          role: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          name?: string | null
          role?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          name?: string | null
          role?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: number
          name: string
          type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          type: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          type?: string
          created_at?: string
          updated_at?: string
        }
      }
      stock_items: {
        Row: {
          id: number
          name: string
          category_id: number | null
          unit: string
          quantity: number
          price: number
          min_quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          category_id?: number | null
          unit: string
          quantity: number
          price: number
          min_quantity: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          category_id?: number | null
          unit?: string
          quantity?: number
          price?: number
          min_quantity?: number
          created_at?: string
          updated_at?: string
        }
      }
      dishes: {
        Row: {
          id: number
          name: string
          description: string | null
          category_id: number | null
          price: number
          created_at: string
          updated_at: string
          image_url: string | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          category_id?: number | null
          price: number
          created_at?: string
          updated_at?: string
          image_url?: string | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          category_id?: number | null
          price?: number
          created_at?: string
          updated_at?: string
          image_url?: string | null
        }
      }
      dish_ingredients: {
        Row: {
          id: number
          dish_id: number | null
          stock_item_id: number | null
          quantity: number
          unit: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          dish_id?: number | null
          stock_item_id?: number | null
          quantity: number
          unit: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          dish_id?: number | null
          stock_item_id?: number | null
          quantity?: number
          unit?: string
          created_at?: string
          updated_at?: string
        }
      }
      stock_movements: {
        Row: {
          id: number
          stock_item_id: number | null
          movement_type: string
          quantity: number
          unit: string
          dish_id: number | null
          user_id: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: number
          stock_item_id?: number | null
          movement_type: string
          quantity: number
          unit: string
          dish_id?: number | null
          user_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          stock_item_id?: number | null
          movement_type?: string
          quantity?: number
          unit?: string
          dish_id?: number | null
          user_id?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      cmv_goals: {
        Row: {
          id: number
          name: string
          target_percentage: number
          category_id: number | null
          dish_id: number | null
          start_date: string
          end_date: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          target_percentage: number
          category_id?: number | null
          dish_id?: number | null
          start_date: string
          end_date: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          target_percentage?: number
          category_id?: number | null
          dish_id?: number | null
          start_date?: string
          end_date?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: number
          user_id: string
          total_amount: number
          status: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          total_amount: number
          status: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          total_amount?: number
          status?: string
          created_at?: string
        }
      }
      sale_items: {
        Row: {
          id: number
          sale_id: number
          dish_id: number
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: number
          sale_id: number
          dish_id: number
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: number
          sale_id?: number
          dish_id?: number
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
        }
      }
    }
  }
}
