export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string
          id: string
          notes: string | null
          staff_id: string
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          staff_id: string
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          staff_id?: string
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      cash_sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_cash: number | null
          created_at: string
          expected_cash: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string
          opening_cash: number
          status: Database["public"]["Enums"]["cash_session_status"]
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_cash?: number | null
          created_at?: string
          expected_cash?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by: string
          opening_cash?: number
          status?: Database["public"]["Enums"]["cash_session_status"]
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_cash?: number | null
          created_at?: string
          expected_cash?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string
          opening_cash?: number
          status?: Database["public"]["Enums"]["cash_session_status"]
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          address_line1: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          business_name: string | null
          business_type: string | null
          city: string | null
          created_at: string
          credit_balance: number
          email: string | null
          email_verified: boolean | null
          enabled_addons: Json | null
          gov_id_url: string | null
          id: string
          is_active: boolean | null
          locality: string | null
          max_stores: number | null
          mobile_verified: boolean | null
          name: string
          notes: string | null
          outlet_limit: number | null
          owner_email: string | null
          owner_name: string | null
          owner_user_id: string | null
          phone: string | null
          pincode: string | null
          ref_code: string | null
          rejected_at: string | null
          rejection_reason: string | null
          staff_limit: number | null
          state: string | null
          subscription_end: string | null
          subscription_plan: string | null
          subscription_start: string | null
          subscription_tier: string | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_line1?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_name?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string
          credit_balance?: number
          email?: string | null
          email_verified?: boolean | null
          enabled_addons?: Json | null
          gov_id_url?: string | null
          id?: string
          is_active?: boolean | null
          locality?: string | null
          max_stores?: number | null
          mobile_verified?: boolean | null
          name: string
          notes?: string | null
          outlet_limit?: number | null
          owner_email?: string | null
          owner_name?: string | null
          owner_user_id?: string | null
          phone?: string | null
          pincode?: string | null
          ref_code?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          staff_limit?: number | null
          state?: string | null
          subscription_end?: string | null
          subscription_plan?: string | null
          subscription_start?: string | null
          subscription_tier?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_line1?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_name?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string
          credit_balance?: number
          email?: string | null
          email_verified?: boolean | null
          enabled_addons?: Json | null
          gov_id_url?: string | null
          id?: string
          is_active?: boolean | null
          locality?: string | null
          max_stores?: number | null
          mobile_verified?: boolean | null
          name?: string
          notes?: string | null
          outlet_limit?: number | null
          owner_email?: string | null
          owner_name?: string | null
          owner_user_id?: string | null
          phone?: string | null
          pincode?: string | null
          ref_code?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          staff_limit?: number | null
          state?: string | null
          subscription_end?: string | null
          subscription_plan?: string | null
          subscription_start?: string | null
          subscription_tier?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          id: string
          note: string | null
          paid_to: string | null
          session_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by: string
          id?: string
          note?: string | null
          paid_to?: string | null
          session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          note?: string | null
          paid_to?: string | null
          session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_catalog: {
        Row: {
          category: string
          created_at: string
          feature_key: string
          included_in: string[]
          is_active: boolean
          label: string
          price_yearly: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          feature_key: string
          included_in?: string[]
          is_active?: boolean
          label: string
          price_yearly?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          feature_key?: string
          included_in?: string[]
          is_active?: boolean
          label?: string
          price_yearly?: number
          updated_at?: string
        }
        Relationships: []
      }
      kot_items: {
        Row: {
          created_at: string
          id: string
          kot_id: string
          name: string
          notes: string | null
          product_id: string | null
          quantity: number
          status: Database["public"]["Enums"]["kot_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          kot_id: string
          name: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["kot_status"]
        }
        Update: {
          created_at?: string
          id?: string
          kot_id?: string
          name?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["kot_status"]
        }
        Relationships: [
          {
            foreignKeyName: "kot_items_kot_id_fkey"
            columns: ["kot_id"]
            isOneToOne: false
            referencedRelation: "kot_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kot_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      kot_tickets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_id: string
          station: Database["public"]["Enums"]["kot_station"]
          status: Database["public"]["Enums"]["kot_status"]
          table_id: string | null
          ticket_no: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id: string
          station?: Database["public"]["Enums"]["kot_station"]
          status?: Database["public"]["Enums"]["kot_status"]
          table_id?: string | null
          ticket_no?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          station?: Database["public"]["Enums"]["kot_station"]
          status?: Database["public"]["Enums"]["kot_status"]
          table_id?: string | null
          ticket_no?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kot_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kot_tickets_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_ingredients: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          menu_item_id: string
          quantity_required: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          menu_item_id: string
          quantity_required?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          menu_item_id?: string
          quantity_required?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_ingredients_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_variations: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          menu_item_id: string
          name: string
          price: number
          sku: string | null
          sort_order: number
          stock: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          menu_item_id: string
          name: string
          price?: number
          sku?: string | null
          sort_order?: number
          stock?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          menu_item_id?: string
          name?: string
          price?: number
          sku?: string | null
          sort_order?: number
          stock?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_variations_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          barcode: string | null
          category: string
          created_at: string
          gramage_per_unit: number
          id: string
          image_url: string | null
          is_available: boolean
          linked_inventory_id: string | null
          name: string
          name_hindi: string | null
          preparation_time: number | null
          price: number
          sku: string | null
          stock: number | null
          store_id: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category?: string
          created_at?: string
          gramage_per_unit?: number
          id?: string
          image_url?: string | null
          is_available?: boolean
          linked_inventory_id?: string | null
          name: string
          name_hindi?: string | null
          preparation_time?: number | null
          price?: number
          sku?: string | null
          stock?: number | null
          store_id: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category?: string
          created_at?: string
          gramage_per_unit?: number
          id?: string
          image_url?: string | null
          is_available?: boolean
          linked_inventory_id?: string | null
          name?: string
          name_hindi?: string | null
          preparation_time?: number | null
          price?: number
          sku?: string | null
          stock?: number | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_addons: {
        Row: {
          created_at: string
          enabled: boolean
          expiry_date: string
          feature_key: string
          id: string
          merchant_id: string
          price_paid: number
          purchase_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          expiry_date?: string
          feature_key: string
          id?: string
          merchant_id: string
          price_paid?: number
          purchase_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          expiry_date?: string
          feature_key?: string
          id?: string
          merchant_id?: string
          price_paid?: number
          purchase_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_addons_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "feature_catalog"
            referencedColumns: ["feature_key"]
          },
          {
            foreignKeyName: "merchant_addons_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_custom_plan: {
        Row: {
          created_at: string
          features: string[]
          id: string
          is_active: boolean
          merchant_id: string
          total_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: string[]
          id?: string
          is_active?: boolean
          merchant_id: string
          total_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: string[]
          id?: string
          is_active?: boolean
          merchant_id?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_custom_plan_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_subscription: {
        Row: {
          created_at: string
          expiry_date: string
          extra_outlets: number
          extra_staff: number
          id: string
          merchant_id: string
          outlet_limit: number
          plan_name: Database["public"]["Enums"]["merchant_plan"]
          staff_limit: number
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          expiry_date?: string
          extra_outlets?: number
          extra_staff?: number
          id?: string
          merchant_id: string
          outlet_limit?: number
          plan_name?: Database["public"]["Enums"]["merchant_plan"]
          staff_limit?: number
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          expiry_date?: string
          extra_outlets?: number
          extra_staff?: number
          id?: string
          merchant_id?: string
          outlet_limit?: number
          plan_name?: Database["public"]["Enums"]["merchant_plan"]
          staff_limit?: number
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_subscription_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          address: string | null
          address_line1: string | null
          approval_status: string
          business_name: string
          business_type: string | null
          city: string | null
          created_at: string
          email_verified: boolean
          gov_id_url: string | null
          id: string
          is_active: boolean
          locality: string | null
          max_stores: number | null
          mobile_verified: boolean
          owner_email: string
          owner_name: string
          owner_user_id: string | null
          phone: string | null
          phone_verified: boolean
          pincode: string | null
          state: string | null
          subscription_end: string | null
          subscription_plan: string | null
          subscription_tier: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_line1?: string | null
          approval_status?: string
          business_name: string
          business_type?: string | null
          city?: string | null
          created_at?: string
          email_verified?: boolean
          gov_id_url?: string | null
          id?: string
          is_active?: boolean
          locality?: string | null
          max_stores?: number | null
          mobile_verified?: boolean
          owner_email: string
          owner_name: string
          owner_user_id?: string | null
          phone?: string | null
          phone_verified?: boolean
          pincode?: string | null
          state?: string | null
          subscription_end?: string | null
          subscription_plan?: string | null
          subscription_tier?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_line1?: string | null
          approval_status?: string
          business_name?: string
          business_type?: string | null
          city?: string | null
          created_at?: string
          email_verified?: boolean
          gov_id_url?: string | null
          id?: string
          is_active?: boolean
          locality?: string | null
          max_stores?: number | null
          mobile_verified?: boolean
          owner_email?: string
          owner_name?: string
          owner_user_id?: string | null
          phone?: string | null
          phone_verified?: boolean
          pincode?: string | null
          state?: string | null
          subscription_end?: string | null
          subscription_plan?: string | null
          subscription_tier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          discount: number
          id: string
          line_total: number
          name_snapshot: string
          order_id: string
          product_id: string | null
          quantity: number
          tax_rate: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          line_total?: number
          name_snapshot: string
          order_id: string
          product_id?: string | null
          quantity?: number
          tax_rate?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          line_total?: number
          name_snapshot?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          tax_rate?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cash_session_id: string | null
          cashier_id: string | null
          change_amount: number
          created_at: string
          customer_id: string | null
          discount: number
          id: string
          notes: string | null
          order_number: string
          order_type: Database["public"]["Enums"]["order_type"]
          paid_amount: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          table_id: string | null
          tax_total: number
          total: number
          updated_at: string
        }
        Insert: {
          cash_session_id?: string | null
          cashier_id?: string | null
          change_amount?: number
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          notes?: string | null
          order_number?: string
          order_type?: Database["public"]["Enums"]["order_type"]
          paid_amount?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_id?: string | null
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Update: {
          cash_session_id?: string | null
          cashier_id?: string | null
          change_amount?: number
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          notes?: string | null
          order_number?: string
          order_type?: Database["public"]["Enums"]["order_type"]
          paid_amount?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_id?: string | null
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_cash_session_fk"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          cost: number | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          low_stock_threshold: number | null
          name: string
          price: number
          sku: string | null
          stock: number
          tax_rate: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          cost?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          low_stock_threshold?: number | null
          name: string
          price?: number
          sku?: string | null
          stock?: number
          tax_rate?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          cost?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          low_stock_threshold?: number | null
          name?: string
          price?: number
          sku?: string | null
          stock?: number
          tax_rate?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_line1: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          email: string | null
          email_verified: boolean | null
          full_name: string | null
          id: string
          locality: string | null
          mobile_verified: boolean | null
          phone: string | null
          pincode: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id: string
          locality?: string | null
          mobile_verified?: boolean | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          locality?: string | null
          mobile_verified?: boolean | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          purchase_order_id: string
          quantity: number
          received_qty: number
          total: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          purchase_order_id: string
          quantity: number
          received_qty?: number
          total: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          purchase_order_id?: string
          quantity?: number
          received_qty?: number
          total?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          po_number: string
          received_date: string | null
          status: string
          subtotal: number
          supplier_id: string | null
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          po_number?: string
          received_date?: string | null
          status?: string
          subtotal?: number
          supplier_id?: string | null
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          po_number?: string
          received_date?: string | null
          status?: string
          subtotal?: number
          supplier_id?: string | null
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          capacity: number
          created_at: string
          current_order_id: string | null
          id: string
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["table_status"]
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          current_order_id?: string | null
          id?: string
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["table_status"]
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          current_order_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["table_status"]
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          active: boolean
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          customer_id: string | null
          employee_code: string | null
          hire_date: string | null
          hourly_rate: number | null
          id: string
          position: string | null
          profile_id: string
          rejected_at: string | null
          rejection_reason: string | null
          store_id: string | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          customer_id?: string | null
          employee_code?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          position?: string | null
          profile_id: string
          rejected_at?: string | null
          rejection_reason?: string | null
          store_id?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          customer_id?: string | null
          employee_code?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          position?: string | null
          profile_id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          store_id?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adjusted_by: string | null
          adjustment_type: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          reason: string | null
        }
        Insert: {
          adjusted_by?: string | null
          adjustment_type: string
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          reason?: string | null
        }
        Update: {
          adjusted_by?: string | null
          adjustment_type?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_categories: {
        Row: {
          category_id: string
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          name_hindi: string | null
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          name_hindi?: string | null
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          name_hindi?: string | null
          sort_order?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          address_line1: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          business_type: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          currency_code: string | null
          customer_id: string | null
          email: string | null
          id: string
          is_active: boolean
          locality: string | null
          merchant_id: string
          name: string
          owner_id: string | null
          phone: string | null
          pincode: string | null
          rejected_at: string | null
          rejection_reason: string | null
          state: string | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          tax_percentage: number | null
          tax_type: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_line1?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          customer_id?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          locality?: string | null
          merchant_id: string
          name: string
          owner_id?: string | null
          phone?: string | null
          pincode?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          state?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          tax_percentage?: number | null
          tax_type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_line1?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          customer_id?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          locality?: string | null
          merchant_id?: string
          name?: string
          owner_id?: string | null
          phone?: string | null
          pincode?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          state?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          tax_percentage?: number | null
          tax_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stores_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          merchant_id: string
          message: string | null
          quantity: number | null
          request_type: string
          requested_by: string
          requested_feature: string | null
          requested_plan: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          merchant_id: string
          message?: string | null
          quantity?: number | null
          request_type: string
          requested_by: string
          requested_feature?: string | null
          requested_plan?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          merchant_id?: string
          message?: string | null
          quantity?: number | null
          request_type?: string
          requested_by?: string
          requested_feature?: string | null
          requested_plan?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          active: boolean
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          is_active: boolean
          merchant_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          store_id: string | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          is_active?: boolean
          merchant_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          store_id?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          is_active?: boolean
          merchant_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          store_id?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_store: { Args: { _store_id: string }; Returns: boolean }
      delete_store_cascade: { Args: { p_store_id: string }; Returns: undefined }
      generate_order_number: { Args: never; Returns: string }
      generate_po_number: { Args: never; Returns: string }
      get_merchant_features: { Args: { _user_id: string }; Returns: string[] }
      get_merchant_plan: { Args: { _user_id: string }; Returns: string }
      get_user_customer_id: { Args: { _user_id: string }; Returns: string }
      has_any_active_role: { Args: { _user_id: string }; Returns: boolean }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "owner"
        | "manager"
        | "cashier"
        | "admin"
        | "store_manager"
        | "staff"
        | "merchant"
      cash_session_status: "open" | "closed"
      kot_station: "kitchen" | "bar" | "other"
      kot_status: "new" | "preparing" | "ready" | "served" | "cancelled"
      merchant_plan: "basic" | "gold" | "platinum"
      order_status: "open" | "completed" | "voided" | "refunded"
      order_type: "dine_in" | "takeaway" | "delivery"
      payment_method: "cash" | "card" | "upi" | "credit" | "other"
      subscription_status: "active" | "expired" | "cancelled"
      table_status: "available" | "occupied" | "reserved" | "cleaning"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "owner",
        "manager",
        "cashier",
        "admin",
        "store_manager",
        "staff",
        "merchant",
      ],
      cash_session_status: ["open", "closed"],
      kot_station: ["kitchen", "bar", "other"],
      kot_status: ["new", "preparing", "ready", "served", "cancelled"],
      merchant_plan: ["basic", "gold", "platinum"],
      order_status: ["open", "completed", "voided", "refunded"],
      order_type: ["dine_in", "takeaway", "delivery"],
      payment_method: ["cash", "card", "upi", "credit", "other"],
      subscription_status: ["active", "expired", "cancelled"],
      table_status: ["available", "occupied", "reserved", "cleaning"],
    },
  },
} as const
