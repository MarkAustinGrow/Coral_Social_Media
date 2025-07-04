export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: number
          user_id: string
          email: string
          full_name: string | null
          company_name: string | null
          subscription_tier: string
          api_usage_limit: number
          api_usage_current: number
          setup_completed: boolean
          onboarding_step: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          email: string
          full_name?: string | null
          company_name?: string | null
          subscription_tier?: string
          api_usage_limit?: number
          api_usage_current?: number
          setup_completed?: boolean
          onboarding_step?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          email?: string
          full_name?: string | null
          company_name?: string | null
          subscription_tier?: string
          api_usage_limit?: number
          api_usage_current?: number
          setup_completed?: boolean
          onboarding_step?: number
          created_at?: string
          updated_at?: string
        }
      }
      user_api_keys: {
        Row: {
          id: number
          user_id: string
          service_name: string
          encrypted_key: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          service_name: string
          encrypted_key: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          service_name?: string
          encrypted_key?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_settings: {
        Row: {
          id: number
          user_id: string
          timezone: string
          email_notifications: boolean
          theme_preference: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          timezone?: string
          email_notifications?: boolean
          theme_preference?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          timezone?: string
          email_notifications?: boolean
          theme_preference?: string
          created_at?: string
          updated_at?: string
        }
      }
      api_usage_logs: {
        Row: {
          id: number
          user_id: string
          service_name: string
          endpoint: string | null
          cost_cents: number
          success: boolean
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          service_name: string
          endpoint?: string | null
          cost_cents: number
          success?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          service_name?: string
          endpoint?: string | null
          cost_cents?: number
          success?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      user_dashboard_summary: {
        Row: {
          user_id: string
          email: string
          full_name: string | null
          subscription_tier: string
          api_usage_current: number
          api_usage_limit: number
          setup_completed: boolean
          total_tweets_cache: number | null
          total_blog_posts: number | null
          total_x_accounts: number | null
        }
      }
    }
    Functions: {
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      subscription_tier: 'free' | 'pro' | 'enterprise'
    }
  }
}

export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type UserApiKey = Database['public']['Tables']['user_api_keys']['Row']
export type UserSettings = Database['public']['Tables']['user_settings']['Row']
export type ApiUsageLog = Database['public']['Tables']['api_usage_logs']['Row']
export type DashboardSummary = Database['public']['Views']['user_dashboard_summary']['Row']
