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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      app_state: {
        Row: {
          created_at: string
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          created_at: string
          description: string | null
          due: string | null
          id: string
          name: string
          paid: number
          planned: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due?: string | null
          id?: string
          name: string
          paid?: number
          planned?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due?: string | null
          id?: string
          name?: string
          paid?: number
          planned?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      families: {
        Row: {
          created_at: string
          id: string
          invite_physical: boolean
          invite_physical_at: string | null
          invite_virtual: boolean
          invite_virtual_at: string | null
          name: string
          rsvp_deadline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_physical?: boolean
          invite_physical_at?: string | null
          invite_virtual?: boolean
          invite_virtual_at?: string | null
          name: string
          rsvp_deadline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_physical?: boolean
          invite_physical_at?: string | null
          invite_virtual?: boolean
          invite_virtual_at?: string | null
          name?: string
          rsvp_deadline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      guests: {
        Row: {
          age: number | null
          created_at: string
          family_id: string | null
          host_id: string | null
          id: string
          invite_personal: boolean
          invite_physical: boolean
          invite_virtual: boolean
          invite_virtual_at: string | null
          is_child: boolean
          is_primary: boolean
          legacy_id: number | null
          name: string
          phone: string | null
          rsvp_deadline: string | null
          status: string
          updated_at: string
        }
        Insert: {
          age?: number | null
          created_at?: string
          family_id?: string | null
          host_id?: string | null
          id?: string
          invite_personal?: boolean
          invite_physical?: boolean
          invite_virtual?: boolean
          invite_virtual_at?: string | null
          is_child?: boolean
          is_primary?: boolean
          legacy_id?: number | null
          name: string
          phone?: string | null
          rsvp_deadline?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          age?: number | null
          created_at?: string
          family_id?: string | null
          host_id?: string | null
          id?: string
          invite_personal?: boolean
          invite_physical?: boolean
          invite_virtual?: boolean
          invite_virtual_at?: string | null
          is_child?: boolean
          is_primary?: boolean
          legacy_id?: number | null
          name?: string
          phone?: string | null
          rsvp_deadline?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      hosts: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      installments: {
        Row: {
          amount: number
          created_at: string
          due: string | null
          expense_id: string | null
          id: string
          label: string | null
          paid: boolean
          paid_at: string | null
          payer: string | null
          seq: number
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due?: string | null
          expense_id?: string | null
          id?: string
          label?: string | null
          paid?: boolean
          paid_at?: string | null
          payer?: string | null
          seq?: number
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due?: string | null
          expense_id?: string | null
          id?: string
          label?: string | null
          paid?: boolean
          paid_at?: string | null
          payer?: string | null
          seq?: number
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      payers: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_messages: {
        Row: {
          automatic: boolean
          body: string
          created_at: string
          delivered: number
          id: string
          sent_by: string | null
          title: string
          url: string | null
        }
        Insert: {
          automatic?: boolean
          body: string
          created_at?: string
          delivered?: number
          id?: string
          sent_by?: string | null
          title: string
          url?: string | null
        }
        Update: {
          automatic?: boolean
          body?: string
          created_at?: string
          delivered?: number
          id?: string
          sent_by?: string | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          label: string | null
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          label?: string | null
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          label?: string | null
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          category: string | null
          contact: string | null
          created_at: string
          due: string | null
          id: string
          name: string
          notes: string | null
          paid: number
          status: string
          updated_at: string
          value: number
        }
        Insert: {
          category?: string | null
          contact?: string | null
          created_at?: string
          due?: string | null
          id?: string
          name: string
          notes?: string | null
          paid?: number
          status?: string
          updated_at?: string
          value?: number
        }
        Update: {
          category?: string | null
          contact?: string | null
          created_at?: string
          due?: string | null
          id?: string
          name?: string
          notes?: string | null
          paid?: number
          status?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      tasks: {
        Row: {
          area: string | null
          created_at: string
          due: string | null
          id: string
          legacy_id: number | null
          name: string
          owner: string | null
          parent_legacy_id: number | null
          priority: string
          status: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          due?: string | null
          id?: string
          legacy_id?: number | null
          name: string
          owner?: string | null
          parent_legacy_id?: number | null
          priority?: string
          status?: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          created_at?: string
          due?: string | null
          id?: string
          legacy_id?: number | null
          name?: string
          owner?: string | null
          parent_legacy_id?: number | null
          priority?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "aniversariante"
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
      app_role: ["admin", "user", "aniversariante"],
    },
  },
} as const
