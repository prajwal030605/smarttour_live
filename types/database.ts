/**
 * Supabase database type definitions (multi-location v2)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      locations: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          category: string;
          district: string | null;
          center_lat: number;
          center_lon: number;
          radius_km: number;
          max_capacity: number;
          normal_limit: number;
          high_limit: number;
          critical_limit: number;
          daily_quota: number | null;
          featured_image_url: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          category: string;
          district?: string | null;
          center_lat: number;
          center_lon: number;
          radius_km?: number;
          max_capacity?: number;
          normal_limit?: number;
          high_limit?: number;
          critical_limit?: number;
          daily_quota?: number | null;
          featured_image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['locations']['Insert']>;
      };

      vehicle_logs: {
        Row: {
          id: string;
          type: string;
          location_id: string | null;
          vehicle_type: string;
          vehicle_registration_number: string;
          phone_number: string;
          email: string | null;
          passenger_count: number;
          latitude: number;
          longitude: number;
          source: string;
          session_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          location_id?: string | null;
          vehicle_type: string;
          vehicle_registration_number: string;
          phone_number: string;
          email?: string | null;
          passenger_count: number;
          latitude: number;
          longitude: number;
          source?: string;
          session_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['vehicle_logs']['Insert']>;
      };

      active_vehicles: {
        Row: {
          id: string;
          location_id: string | null;
          vehicle_registration_number: string;
          phone_number: string;
          email: string | null;
          vehicle_type: string;
          passenger_count: number;
          latitude: number;
          longitude: number;
          session_id: string | null;
          last_heartbeat_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          location_id?: string | null;
          vehicle_registration_number: string;
          phone_number: string;
          email?: string | null;
          vehicle_type: string;
          passenger_count: number;
          latitude: number;
          longitude: number;
          session_id?: string | null;
          last_heartbeat_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['active_vehicles']['Insert']>;
      };

      vehicle_sessions: {
        Row: {
          id: string;
          vehicle_registration_number: string;
          vehicle_type: string;
          passenger_count: number;
          email: string | null;
          phone_number: string | null;
          device_id: string | null;
          session_token: string;
          status: string;
          verified_at: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          vehicle_registration_number: string;
          vehicle_type: string;
          passenger_count: number;
          email?: string | null;
          phone_number?: string | null;
          device_id?: string | null;
          session_token: string;
          status?: string;
          verified_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['vehicle_sessions']['Insert']>;
      };

      otp_codes: {
        Row: {
          id: string;
          email: string;
          code: string;
          purpose: string;
          used: boolean;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          code: string;
          purpose: string;
          used?: boolean;
          expires_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['otp_codes']['Insert']>;
      };

      admin_users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          role: string;
          assigned_location_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          display_name?: string | null;
          role?: string;
          assigned_location_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['admin_users']['Insert']>;
      };

      festivals: {
        Row: {
          id: string;
          name: string;
          start_date: string;
          end_date: string;
          impact_multiplier: number;
          applies_to_location_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          start_date: string;
          end_date: string;
          impact_multiplier?: number;
          applies_to_location_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['festivals']['Insert']>;
      };

      alerts: {
        Row: {
          id: string;
          location_id: string | null;
          type: string;
          message: string;
          metadata: Json | null;
          acknowledged_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          location_id?: string | null;
          type: string;
          message: string;
          metadata?: Json | null;
          acknowledged_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['alerts']['Insert']>;
      };

      threshold_config: {
        Row: {
          id: string;
          normal_limit: number;
          high_limit: number;
          critical_limit: number;
        };
        Insert: {
          id?: string;
          normal_limit: number;
          high_limit: number;
          critical_limit: number;
        };
        Update: Partial<Database['public']['Tables']['threshold_config']['Insert']>;
      };

      tourist_places: {
        Row: {
          id: string;
          name: string;
          category: string;
          area: string;
          description: string;
          crowd_level: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          area: string;
          description: string;
          crowd_level: string;
        };
        Update: Partial<Database['public']['Tables']['tourist_places']['Insert']>;
      };
    };
  };
}
