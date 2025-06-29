export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      business_details: {
        Row: {
          business_address: string | null
          business_category: string | null
          business_email: string | null
          business_logo_url: string | null
          business_name: string
          business_phone: string | null
          created_at: string
          id: string
          invoice_template: string | null
          ntn_number: string | null
          privacy_policy: string | null
          social_media_links: Json | null
          tax_configuration: Json | null
          user_id: string
          website: string | null
        }
        Insert: {
          business_address?: string | null
          business_category?: string | null
          business_email?: string | null
          business_logo_url?: string | null
          business_name: string
          business_phone?: string | null
          created_at?: string
          id?: string
          invoice_template?: string | null
          ntn_number?: string | null
          privacy_policy?: string | null
          social_media_links?: Json | null
          tax_configuration?: Json | null
          user_id: string
          website?: string | null
        }
        Update: {
          business_address?: string | null
          business_category?: string | null
          business_email?: string | null
          business_logo_url?: string | null
          business_name?: string
          business_phone?: string | null
          created_at?: string
          id?: string
          invoice_template?: string | null
          ntn_number?: string | null
          privacy_policy?: string | null
          social_media_links?: Json | null
          tax_configuration?: Json | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      custom_columns: {
        Row: {
          column_name: string
          column_type: string
          created_at: string
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          column_name: string
          column_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          column_name?: string
          column_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          total_paid: number | null
          total_unpaid: number | null
          user_id: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          total_paid?: number | null
          total_unpaid?: number | null
          user_id?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          total_paid?: number | null
          total_unpaid?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      estimate_items: {
        Row: {
          description: string | null
          estimate_id: string | null
          id: string
          price: number
          product_name: string
          quantity: number
          total: number
        }
        Insert: {
          description?: string | null
          estimate_id?: string | null
          id?: string
          price: number
          product_name: string
          quantity: number
          total: number
        }
        Update: {
          description?: string | null
          estimate_id?: string | null
          id?: string
          price?: number
          product_name?: string
          quantity?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimate_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          status: string
          tax_amount: number
          total_amount: number
          user_id: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          status?: string
          tax_amount?: number
          total_amount?: number
          user_id?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          status?: string
          tax_amount?: number
          total_amount?: number
          user_id?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          created_at: string
          description: string | null
          id: string
          price: number
          product_name: string
          quantity: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          price?: number
          product_name: string
          quantity?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          price?: number
          product_name?: string
          quantity?: number
          user_id?: string | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          description: string | null
          id: string
          invoice_id: string | null
          price: number
          product_name: string
          quantity: number
          total: number
        }
        Insert: {
          description?: string | null
          id?: string
          invoice_id?: string | null
          price: number
          product_name: string
          quantity: number
          total: number
        }
        Update: {
          description?: string | null
          id?: string
          invoice_id?: string | null
          price?: number
          product_name?: string
          quantity?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string
          notification_sent: boolean | null
          pdf_url: string | null
          status: string
          tax_amount: number
          total_amount: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notification_sent?: boolean | null
          pdf_url?: string | null
          status?: string
          tax_amount?: number
          total_amount?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notification_sent?: boolean | null
          pdf_url?: string | null
          status?: string
          tax_amount?: number
          total_amount?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          name: string
          price: number
          quantity: number
        }
        Insert: {
          id?: string
          name: string
          price: number
          quantity: number
        }
        Update: {
          id?: string
          name?: string
          price?: number
          quantity?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          digital_signature_url: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          phone_number: string | null
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          digital_signature_url?: string | null
          email: string
          full_name: string
          id: string
          phone?: string | null
          phone_number?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          digital_signature_url?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          phone_number?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      tax_payments: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          payment_date: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          payment_date: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          payment_date?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
