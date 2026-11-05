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
      bot_sessions: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          id: string
          invite_expires_at: string | null
          invite_token_hash: string | null
          name: string
          phone: string | null
          status: string
          telegram_user_id: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_token_hash?: string | null
          name: string
          phone?: string | null
          status?: string
          telegram_user_id?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_token_hash?: string | null
          name?: string
          phone?: string | null
          status?: string
          telegram_user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_locations: {
        Row: {
          address: string
          client_id: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
        }
        Insert: {
          address: string
          client_id: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
        }
        Update: {
          address?: string
          client_id?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_locations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_options: {
        Row: {
          active: boolean
          client_id: string
          created_at: string
          custom_name: string | null
          display_order: number
          form_defaults: Json
          id: string
          option_id: string
          tariff_kind: string
          tariff_params: Json
        }
        Insert: {
          active?: boolean
          client_id: string
          created_at?: string
          custom_name?: string | null
          display_order?: number
          form_defaults?: Json
          id?: string
          option_id: string
          tariff_kind: string
          tariff_params: Json
        }
        Update: {
          active?: boolean
          client_id?: string
          created_at?: string
          custom_name?: string | null
          display_order?: number
          form_defaults?: Json
          id?: string
          option_id?: string
          tariff_kind?: string
          tariff_params?: Json
        }
        Relationships: [
          {
            foreignKeyName: "client_options_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_options_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "service_options"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          default_payment_method: string
          email: string | null
          ico: string | null
          id: string
          name: string
          phone: string | null
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          default_payment_method?: string
          email?: string | null
          ico?: string | null
          id?: string
          name: string
          phone?: string | null
          status?: string
          type: string
        }
        Update: {
          created_at?: string
          default_payment_method?: string
          email?: string | null
          ico?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: string
          type?: string
        }
        Relationships: []
      }
      delivery_slots: {
        Row: {
          base_price: number
          display_order: number
          id: string
          label: string
          max_lead_minutes: number | null
          slug: string
          sub_label: string | null
        }
        Insert: {
          base_price: number
          display_order?: number
          id?: string
          label: string
          max_lead_minutes?: number | null
          slug: string
          sub_label?: string | null
        }
        Update: {
          base_price?: number
          display_order?: number
          id?: string
          label?: string
          max_lead_minutes?: number | null
          slug?: string
          sub_label?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          client_notified_at: string | null
          company_name: string | null
          created_at: string
          customer_type: string | null
          delivery_address: string | null
          delivery_at: string | null
          email: string
          first_name: string | null
          handled_at: string | null
          handled_by_name: string | null
          handled_by_tg_id: number | null
          ico: string | null
          ico_verified: boolean | null
          id: string
          ip_hash: string | null
          kind: string
          last_name: string | null
          message: string | null
          number: number | null
          payment_method: string | null
          phone: string | null
          pickup_address: string | null
          recipient_name: string | null
          recipient_phone: string | null
          status: string
          utm: Json | null
        }
        Insert: {
          client_notified_at?: string | null
          company_name?: string | null
          created_at?: string
          customer_type?: string | null
          delivery_address?: string | null
          delivery_at?: string | null
          email: string
          first_name?: string | null
          handled_at?: string | null
          handled_by_name?: string | null
          handled_by_tg_id?: number | null
          ico?: string | null
          ico_verified?: boolean | null
          id?: string
          ip_hash?: string | null
          kind: string
          last_name?: string | null
          message?: string | null
          number?: number | null
          payment_method?: string | null
          phone?: string | null
          pickup_address?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: string
          utm?: Json | null
        }
        Update: {
          client_notified_at?: string | null
          company_name?: string | null
          created_at?: string
          customer_type?: string | null
          delivery_address?: string | null
          delivery_at?: string | null
          email?: string
          first_name?: string | null
          handled_at?: string | null
          handled_by_name?: string | null
          handled_by_tg_id?: number | null
          ico?: string | null
          ico_verified?: boolean | null
          id?: string
          ip_hash?: string | null
          kind?: string
          last_name?: string | null
          message?: string | null
          number?: number | null
          payment_method?: string | null
          phone?: string | null
          pickup_address?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: string
          utm?: Json | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          consented_at: string
          created_at: string
          email: string
          id: string
          ip_hash: string | null
          unsubscribed_at: string | null
        }
        Insert: {
          consented_at: string
          created_at?: string
          email: string
          id?: string
          ip_hash?: string | null
          unsubscribed_at?: string | null
        }
        Update: {
          consented_at?: string
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string | null
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          entity: string
          entity_id: string
          event: string
          id: string
          last_error: string | null
          recipient: string | null
          sent_at: string | null
        }
        Insert: {
          attempts?: number
          channel: string
          created_at?: string
          entity: string
          entity_id: string
          event: string
          id?: string
          last_error?: string | null
          recipient?: string | null
          sent_at?: string | null
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          entity?: string
          entity_id?: string
          event?: string
          id?: string
          last_error?: string | null
          recipient?: string | null
          sent_at?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          accepted_at: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_id: string | null
          client_option_id: string | null
          comment: string | null
          contact_id: string | null
          created_at: string | null
          created_via: string | null
          delivered_at: string | null
          form_data: Json | null
          from_address: string | null
          handled_by_name: string | null
          handled_by_tg_id: number | null
          id: string
          number: number | null
          payment_status: string
          price: number | null
          price_breakdown: Json | null
          recipient_contact: string | null
          scheduled_for: string | null
          slot_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subscription_id: string | null
          tariff_kind: string | null
          tg_chat_id: number | null
          tg_message_id: number | null
          to_address: string | null
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id?: string | null
          client_option_id?: string | null
          comment?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_via?: string | null
          delivered_at?: string | null
          form_data?: Json | null
          from_address?: string | null
          handled_by_name?: string | null
          handled_by_tg_id?: number | null
          id?: string
          number?: number | null
          payment_status?: string
          price?: number | null
          price_breakdown?: Json | null
          recipient_contact?: string | null
          scheduled_for?: string | null
          slot_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subscription_id?: string | null
          tariff_kind?: string | null
          tg_chat_id?: number | null
          tg_message_id?: number | null
          to_address?: string | null
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id?: string | null
          client_option_id?: string | null
          comment?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_via?: string | null
          delivered_at?: string | null
          form_data?: Json | null
          from_address?: string | null
          handled_by_name?: string | null
          handled_by_tg_id?: number | null
          id?: string
          number?: number | null
          payment_status?: string
          price?: number | null
          price_breakdown?: Json | null
          recipient_contact?: string | null
          scheduled_for?: string | null
          slot_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subscription_id?: string | null
          tariff_kind?: string | null
          tg_chat_id?: number | null
          tg_message_id?: number | null
          to_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_client_option_id_fkey"
            columns: ["client_option_id"]
            isOneToOne: false
            referencedRelation: "client_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_contacts"
            referencedColumns: ["id"]
          },
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
      service_config: {
        Row: {
          id: number
          operating_end_minute: number
          operating_start_minute: number
        }
        Insert: {
          id?: number
          operating_end_minute: number
          operating_start_minute: number
        }
        Update: {
          id?: number
          operating_end_minute?: number
          operating_start_minute?: number
        }
        Relationships: []
      }
      service_options: {
        Row: {
          active: boolean
          client_id: string | null
          created_at: string
          description: string | null
          display_order: number
          form_kind: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          active?: boolean
          client_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          form_kind: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          active?: boolean
          client_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          form_kind?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_options_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      telegram_users: {
        Row: {
          first_name: string | null
          last_name: string | null
          last_seen_at: string
          telegram_user_id: number
          username: string | null
        }
        Insert: {
          first_name?: string | null
          last_name?: string | null
          last_seen_at?: string
          telegram_user_id: number
          username?: string | null
        }
        Update: {
          first_name?: string | null
          last_name?: string | null
          last_seen_at?: string
          telegram_user_id?: number
          username?: string | null
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
      create_option_order: {
        Args: {
          p_client_option_id: string
          p_comment?: string
          p_contact_id: string
          p_created_via: string
          p_form_data: Json
          p_from_address: string
          p_price: number
          p_price_breakdown: Json
          p_recipient_contact?: string
          p_scheduled_for?: string
          p_slot_id: string
          p_tariff_kind: string
          p_to_address: string
        }
        Returns: {
          accepted_at: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_id: string | null
          client_option_id: string | null
          comment: string | null
          contact_id: string | null
          created_at: string | null
          created_via: string | null
          delivered_at: string | null
          form_data: Json | null
          from_address: string | null
          handled_by_name: string | null
          handled_by_tg_id: number | null
          id: string
          number: number | null
          payment_status: string
          price: number | null
          price_breakdown: Json | null
          recipient_contact: string | null
          scheduled_for: string | null
          slot_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subscription_id: string | null
          tariff_kind: string | null
          tg_chat_id: number | null
          tg_message_id: number | null
          to_address: string | null
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
          accepted_at: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_id: string | null
          client_option_id: string | null
          comment: string | null
          contact_id: string | null
          created_at: string | null
          created_via: string | null
          delivered_at: string | null
          form_data: Json | null
          from_address: string | null
          handled_by_name: string | null
          handled_by_tg_id: number | null
          id: string
          number: number | null
          payment_status: string
          price: number | null
          price_breakdown: Json | null
          recipient_contact: string | null
          scheduled_for: string | null
          slot_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subscription_id: string | null
          tariff_kind: string | null
          tg_chat_id: number | null
          tg_message_id: number | null
          to_address: string | null
          user_id: string | null
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
