export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      collections: {
        Row: {
          id: string;
          name: string;
          keyword: string | null;
          color: string;
          description: string | null;
          created_at: string;
          listings_count: number;
        };
        Insert: Omit<Database['public']['Tables']['collections']['Row'], 'created_at' | 'listings_count'> & {
          created_at?: string;
          listings_count?: number;
        };
        Update: Partial<Database['public']['Tables']['collections']['Insert']>;
      };
      listings: {
        Row: {
          id: string;
          etsy_listing_id: string;
          url: string;
          title: string;
          shop_name: string;
          emoji: string | null;
          image_url: string | null;
          current_price: number | null;
          old_price: number | null;
          rating: number | null;
          reviews_count: number;
          is_active: boolean;
          snapshot_mode: 'daily' | 'hourly' | '6hours';
          collection_id: string | null;
          first_tracked_at: string;
          last_snapshot_at: string | null;
          etsy_created_at: string | null;
          etsy_updated_at: string | null;
          favorites_count: number | null;
          country: string | null;
          currency: string | null;
        };
        Insert: Omit<Database['public']['Tables']['listings']['Row'], 'first_tracked_at'> & {
          first_tracked_at?: string;
        };
        Update: Partial<Database['public']['Tables']['listings']['Row']>;
      };
      snapshots: {
        Row: {
          id: string;
          listing_id: string;
          captured_at: string;
          source: 'etsy_scrape' | 'heyetsy' | 'estimate';
          sold_total: number;
          sold_daily: number;
          views_total: number;
          views_daily: number;
          revenue_usd: number;
          price: number;
          favorites: number | null;
          reviews_count: number | null;
          rating: number | null;
          confidence: number | null;
        };
        Insert: Omit<Database['public']['Tables']['snapshots']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['snapshots']['Row']>;
      };
      tags: {
        Row: { id: string; name: string; color: string };
        Insert: Omit<Database['public']['Tables']['tags']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['tags']['Row']>;
      };
    };
  };
}
