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
      event_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          event_id: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["event_member_role"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          event_id: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["event_member_role"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          event_id?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["event_member_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_members: {
        Row: {
          created_at: string
          event_id: string
          id: string
          role: Database["public"]["Enums"]["event_member_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          role?: Database["public"]["Enums"]["event_member_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          role?: Database["public"]["Enums"]["event_member_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          event_date: string | null
          id: string
          name: string
          owner_id: string
          plan: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_date?: string | null
          id?: string
          name: string
          owner_id: string
          plan?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_date?: string | null
          id?: string
          name?: string
          owner_id?: string
          plan?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          created_at: string
          description: string | null
          due: string | null
          event_id: string
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
          event_id?: string
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
          event_id?: string
          id?: string
          name?: string
          paid?: number
          planned?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          event_id: string
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
          event_id?: string
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
          event_id?: string
          id?: string
          invite_physical?: boolean
          invite_physical_at?: string | null
          invite_virtual?: boolean
          invite_virtual_at?: string | null
          name?: string
          rsvp_deadline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "families_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_link_audit: {
        Row: {
          changed_at: string
          changed_by: string | null
          event_id: string
          guest_id: string
          guest_name: string
          id: string
          new_family_id: string | null
          new_host_id: string | null
          old_family_id: string | null
          old_host_id: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          event_id: string
          guest_id: string
          guest_name: string
          id?: string
          new_family_id?: string | null
          new_host_id?: string | null
          old_family_id?: string | null
          old_host_id?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          event_id?: string
          guest_id?: string
          guest_name?: string
          id?: string
          new_family_id?: string | null
          new_host_id?: string | null
          old_family_id?: string | null
          old_host_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_link_audit_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_link_snapshots: {
        Row: {
          created_at: string
          event_id: string
          id: string
          links: Json
          snapshot_date: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          links: Json
          snapshot_date?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          links?: Json
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_link_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          age: number | null
          created_at: string
          event_id: string
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
          event_id?: string
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
          event_id?: string
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
            foreignKeyName: "guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
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
          event_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hosts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      installments: {
        Row: {
          amount: number
          created_at: string
          due: string | null
          event_id: string
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
          event_id?: string
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
          event_id?: string
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
            foreignKeyName: "installments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
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
      notification_settings: {
        Row: {
          audience_roles: Database["public"]["Enums"]["event_member_role"][]
          created_at: string
          enabled: boolean
          event_id: string
          id: string
          kind: string
          updated_at: string
        }
        Insert: {
          audience_roles?: Database["public"]["Enums"]["event_member_role"][]
          created_at?: string
          enabled?: boolean
          event_id: string
          id?: string
          kind: string
          updated_at?: string
        }
        Update: {
          audience_roles?: Database["public"]["Enums"]["event_member_role"][]
          created_at?: string
          enabled?: boolean
          event_id?: string
          id?: string
          kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      payers: {
        Row: {
          created_at: string
          event_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          can_finance: boolean
          created_at: string
          display_name: string
          email: string | null
          id: string
          party_role: string
          updated_at: string
        }
        Insert: {
          can_finance?: boolean
          created_at?: string
          display_name?: string
          email?: string | null
          id: string
          party_role?: string
          updated_at?: string
        }
        Update: {
          can_finance?: boolean
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          party_role?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_messages: {
        Row: {
          audience_roles: Database["public"]["Enums"]["event_member_role"][]
          audience_user_ids: string[]
          automatic: boolean
          body: string
          created_at: string
          delivered: number
          event_id: string | null
          id: string
          kind: string
          sent_by: string | null
          title: string
          url: string | null
        }
        Insert: {
          audience_roles?: Database["public"]["Enums"]["event_member_role"][]
          audience_user_ids?: string[]
          automatic?: boolean
          body: string
          created_at?: string
          delivered?: number
          event_id?: string | null
          id?: string
          kind?: string
          sent_by?: string | null
          title: string
          url?: string | null
        }
        Update: {
          audience_roles?: Database["public"]["Enums"]["event_member_role"][]
          audience_user_ids?: string[]
          automatic?: boolean
          body?: string
          created_at?: string
          delivered?: number
          event_id?: string | null
          id?: string
          kind?: string
          sent_by?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          event_id: string | null
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
          event_id?: string | null
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
          event_id?: string | null
          id?: string
          label?: string | null
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          category: string | null
          contact: string | null
          created_at: string
          due: string | null
          event_id: string
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
          event_id?: string
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
          event_id?: string
          id?: string
          name?: string
          notes?: string | null
          paid?: number
          status?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          area: string | null
          created_at: string
          due: string | null
          event_id: string
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
          event_id?: string
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
          event_id?: string
          id?: string
          legacy_id?: number | null
          name?: string
          owner?: string | null
          parent_legacy_id?: number | null
          priority?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
      event_role_of: {
        Args: { _event: string; _user?: string }
        Returns: Database["public"]["Enums"]["event_member_role"]
      }
      has_event_role: {
        Args: {
          _event: string
          _roles: Database["public"]["Enums"]["event_member_role"][]
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
      is_event_member: { Args: { _event: string }; Returns: boolean }
      shares_event_with: { Args: { _user: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "aniversariante"
      event_member_role:
        | "owner"
        | "organizer"
        | "planner"
        | "rsvp"
        | "celebrant"
        | "viewer"
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
      event_member_role: [
        "owner",
        "organizer",
        "planner",
        "rsvp",
        "celebrant",
        "viewer",
      ],
    },
  },
} as const
