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
      delivery_slots: {
        Row: {
          base_price: number
          display_order: number
          id: string
          label: string
          slug: string
          sub_label: string | null
        }
        Insert: {
          base_price: number
          display_order?: number
          id?: string
          label: string
          slug: string
          sub_label?: string | null
        }
        Update: {
          base_price?: number
          display_order?: number
          id?: string
          label?: string
          slug?: string
          sub_label?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          comment: string | null
          created_at: string | null
          delivered_at: string | null
          from_address: string | null
          id: string
          payment_status: string
          price: number | null
          recipient_contact: string | null
          scheduled_for: string | null
          slot_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subscription_id: string | null
          to_address: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          delivered_at?: string | null
          from_address?: string | null
          id?: string
          payment_status?: string
          price?: number | null
          recipient_contact?: string | null
          scheduled_for?: string | null
          slot_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subscription_id?: string | null
          to_address?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          delivered_at?: string | null
          from_address?: string | null
          id?: string
          payment_status?: string
          price?: number | null
          recipient_contact?: string | null
          scheduled_for?: string | null
          slot_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subscription_id?: string | null
          to_address?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "delivery_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          currency: string
          id: string
          method: string | null
          order_id: string | null
          paid_at: string | null
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          currency?: string
          id?: string
          method?: string | null
          order_id?: string | null
          paid_at?: string | null
          status?: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          currency?: string
          id?: string
          method?: string | null
          order_id?: string | null
          paid_at?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          contact_name: string | null
          created_at: string | null
          id: string
          phone: string | null
        }
        Insert: {
          company_name?: string | null
          contact_name?: string | null
          created_at?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          company_name?: string | null
          contact_name?: string | null
          created_at?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      retail_points: {
        Row: {
          base_price: number
          brand: string
          delivery_service: string | null
          display_order: number
          id: string
          name: string
          per_km_price: number
          zone_id: string | null
        }
        Insert: {
          base_price: number
          brand: string
          delivery_service?: string | null
          display_order?: number
          id?: string
          name: string
          per_km_price?: number
          zone_id?: string | null
        }
        Update: {
          base_price?: number
          brand?: string
          delivery_service?: string | null
          display_order?: number
          id?: string
          name?: string
          per_km_price?: number
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retail_points_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      skoro_pricing: {
        Row: {
          base_price: number
          id: number
          per_extra_point: number
          per_km_price: number
        }
        Insert: {
          base_price: number
          id?: number
          per_extra_point: number
          per_km_price: number
        }
        Update: {
          base_price?: number
          id?: number
          per_extra_point?: number
          per_km_price?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          price: number
          purchased_at: string | null
          remaining_deliveries: number
          status: string
          tier_name: string
          total_deliveries: number
          user_id: string
          valid_until: string | null
        }
        Insert: {
          id?: string
          price: number
          purchased_at?: string | null
          remaining_deliveries: number
          status?: string
          tier_name: string
          total_deliveries: number
          user_id: string
          valid_until?: string | null
        }
        Update: {
          id?: string
          price?: number
          purchased_at?: string | null
          remaining_deliveries?: number
          status?: string
          tier_name?: string
          total_deliveries?: number
          user_id?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      zone_distances: {
        Row: {
          distance_km: number
          from_zone_id: string
          to_zone_id: string
        }
        Insert: {
          distance_km: number
          from_zone_id: string
          to_zone_id: string
        }
        Update: {
          distance_km?: number
          from_zone_id?: string
          to_zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_distances_from_zone_id_fkey"
            columns: ["from_zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_distances_to_zone_id_fkey"
            columns: ["to_zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          display_order: number
          id: string
          name: string
          slug: string
        }
        Insert: {
          display_order?: number
          id?: string
          name: string
          slug: string
        }
        Update: {
          display_order?: number
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order_for_user: {
        Args: {
          p_comment?: string
          p_from_address: string
          p_recipient_contact: string
          p_scheduled_for: string
          p_slot_id: string
          p_to_address: string
        }
        Returns: {
          comment: string | null
          created_at: string | null
          delivered_at: string | null
          from_address: string | null
          id: string
          payment_status: string
          price: number | null
          recipient_contact: string | null
          scheduled_for: string | null
          slot_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subscription_id: string | null
          to_address: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      order_status: "new" | "in_progress" | "delivered" | "cancelled"
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
      order_status: ["new", "in_progress", "delivered", "cancelled"],
    },
  },
} as const
