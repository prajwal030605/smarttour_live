/**
 * Supabase database type definitions
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
      vehicle_logs: {
        Row: {
          id: string;
          type: string;
          vehicle_type: string;
          passenger_count: number;
          latitude: number;
          longitude: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          vehicle_type: string;
          passenger_count: number;
          latitude: number;
          longitude: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['vehicle_logs']['Insert']>;
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
