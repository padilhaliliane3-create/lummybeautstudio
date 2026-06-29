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
      bookings: {
        Row: {
          client_id: string
          code: string
          created_at: string
          deposit_amount: number
          deposit_paid: boolean
          end_time: string
          id: string
          notes: string | null
          professional_id: string
          remaining_amount: number
          scheduled_date: string
          service_id: string
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at: string
        }
        Insert: {
          client_id: string
          code?: string
          created_at?: string
          deposit_amount: number
          deposit_paid?: boolean
          end_time: string
          id?: string
          notes?: string | null
          professional_id: string
          remaining_amount: number
          scheduled_date: string
          service_id: string
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          code?: string
          created_at?: string
          deposit_amount?: number
          deposit_paid?: boolean
          end_time?: string
          id?: string
          notes?: string | null
          professional_id?: string
          remaining_amount?: number
          scheduled_date?: string
          service_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      client_recommendations: {
        Row: {
          body: string | null
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_recommendations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          archived_at: string | null
          auth_user_id: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          updated_at: string
          whatsapp: string
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          auth_user_id?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          whatsapp: string
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          auth_user_id?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      finance_entries: {
        Row: {
          amount: number
          booking_id: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          entry_date: string
          id: string
          payment_method: string | null
          type: Database["public"]["Enums"]["finance_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          id?: string
          payment_method?: string | null
          type: Database["public"]["Enums"]["finance_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          id?: string
          payment_method?: string | null
          type?: Database["public"]["Enums"]["finance_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_entries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      hair_schedules: {
        Row: {
          client_id: string
          created_at: string
          done: boolean
          done_at: string | null
          id: string
          notes: string | null
          scheduled_date: string
          step_type: Database["public"]["Enums"]["hair_step_type"]
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          done?: boolean
          done_at?: string | null
          id?: string
          notes?: string | null
          scheduled_date: string
          step_type: Database["public"]["Enums"]["hair_step_type"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          done?: boolean
          done_at?: string | null
          id?: string
          notes?: string | null
          scheduled_date?: string
          step_type?: Database["public"]["Enums"]["hair_step_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hair_schedules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_services: {
        Row: {
          professional_id: string
          service_id: string
        }
        Insert: {
          professional_id: string
          service_id: string
        }
        Update: {
          professional_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_services_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          active: boolean
          bio: string | null
          break_end: string | null
          break_start: string | null
          commission_pct: number | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          photo_url: string | null
          pix_key: string | null
          rating: number | null
          slot_minutes: number
          specialty: string | null
          updated_at: string
          whatsapp: string
          work_end: string
          work_start: string
          working_days: number[]
        }
        Insert: {
          active?: boolean
          bio?: string | null
          break_end?: string | null
          break_start?: string | null
          commission_pct?: number | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          photo_url?: string | null
          pix_key?: string | null
          rating?: number | null
          slot_minutes?: number
          specialty?: string | null
          updated_at?: string
          whatsapp: string
          work_end?: string
          work_start?: string
          working_days?: number[]
        }
        Update: {
          active?: boolean
          bio?: string | null
          break_end?: string | null
          break_start?: string | null
          commission_pct?: number | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          pix_key?: string | null
          rating?: number | null
          slot_minutes?: number
          specialty?: string | null
          updated_at?: string
          whatsapp?: string
          work_end?: string
          work_start?: string
          working_days?: number[]
        }
        Relationships: []
      }
      salon_settings: {
        Row: {
          about_text: string | null
          address: string | null
          banner_url: string | null
          cancel_policy: string | null
          company_name: string | null
          deposit_pct: number
          email: string | null
          facebook: string | null
          finance_categories: Json | null
          hero_subtitle: string | null
          hero_title: string | null
          hours_json: Json | null
          id: number
          instagram: string | null
          logo_url: string | null
          name: string
          opening_hours: Json | null
          phone: string | null
          whatsapp: string
        }
        Insert: {
          about_text?: string | null
          address?: string | null
          banner_url?: string | null
          cancel_policy?: string | null
          company_name?: string | null
          deposit_pct?: number
          email?: string | null
          facebook?: string | null
          finance_categories?: Json | null
          hero_subtitle?: string | null
          hero_title?: string | null
          hours_json?: Json | null
          id?: number
          instagram?: string | null
          logo_url?: string | null
          name?: string
          opening_hours?: Json | null
          phone?: string | null
          whatsapp?: string
        }
        Update: {
          about_text?: string | null
          address?: string | null
          banner_url?: string | null
          cancel_policy?: string | null
          company_name?: string | null
          deposit_pct?: number
          email?: string | null
          facebook?: string | null
          finance_categories?: Json | null
          hero_subtitle?: string | null
          hero_title?: string | null
          hours_json?: Json | null
          id?: number
          instagram?: string | null
          logo_url?: string | null
          name?: string
          opening_hours?: Json | null
          phone?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      schedule_blocks: {
        Row: {
          block_date: string
          created_at: string
          end_time: string | null
          id: string
          professional_id: string
          reason: string | null
          start_time: string | null
        }
        Insert: {
          block_date: string
          created_at?: string
          end_time?: string | null
          id?: string
          professional_id: string
          reason?: string | null
          start_time?: string | null
        }
        Update: {
          block_date?: string
          created_at?: string
          end_time?: string | null
          id?: string
          professional_id?: string
          reason?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          category_id: string
          created_at: string
          description: string | null
          duration_min: number
          id: string
          image_url: string | null
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id: string
          created_at?: string
          description?: string | null
          duration_min: number
          id?: string
          image_url?: string | null
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string
          created_at?: string
          description?: string | null
          duration_min?: number
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_first_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff"
      booking_status:
        | "pending_payment"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "no_show"
      finance_type: "income" | "expense"
      hair_step_type: "hidratacao" | "nutricao" | "reconstrucao"
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
      app_role: ["admin", "staff"],
      booking_status: [
        "pending_payment",
        "confirmed",
        "cancelled",
        "completed",
        "no_show",
      ],
      finance_type: ["income", "expense"],
      hair_step_type: ["hidratacao", "nutricao", "reconstrucao"],
    },
  },
} as const
