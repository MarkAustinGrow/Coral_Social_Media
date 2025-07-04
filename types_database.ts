// types/database.ts
export interface Database {
  public: {
    Tables: {
      agent_logs: {
        Row: {
          id: number
          timestamp: string | null
          level: string
          agent_name: string
          message: string
          metadata: any | null
          created_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: number
          timestamp?: string | null
          level: string
          agent_name: string
          message: string
          metadata?: any | null
          created_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: number
          timestamp?: string | null
          level?: string
          agent_name?: string
          message?: string
          metadata?: any | null
          created_at?: string | null
          user_id?: string | null
        }
      }
      agent_status: {
        Row: {
          id: number
          agent_name: string
          status: string
          health: number
          last_heartbeat: string | null
          last_error: string | null
          last_activity: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: number
          agent_name: string
          status: string
          health: number
          last_heartbeat?: string | null
          last_error?: string | null
          last_activity?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: number
          agent_name?: string
          status?: string
          health?: number
          last_heartbeat?: string | null
          last_error?: string | null
          last_activity?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
      }
      blog_posts: {
        Row: {
          id: number
          title: string
          content: string
          word_count: number | null
          status: string | null
          created_at: string | null
          published_at: string | null
          updated_at: string | null
          review_status: string | null
          fact_checked_at: string | null
          metadata: any | null
          persona: string | null
          topic: string | null
          tweetified: boolean | null
          user_id: string | null
        }
        Insert: {
          id?: number
          title: string
          content: string
          word_count?: number | null
          status?: string | null
          created_at?: string | null
          published_at?: string | null
          updated_at?: string | null
          review_status?: string | null
          fact_checked_at?: string | null
          metadata?: any | null
          persona?: string | null
          topic?: string | null
          tweetified?: boolean | null
          user_id?: string | null
        }
        Update: {
          id?: number
          title?: string
          content?: string
          word_count?: number | null
          status?: string | null
          created_at?: string | null
          published_at?: string | null
          updated_at?: string | null
          review_status?: string | null
          fact_checked_at?: string | null
          metadata?: any | null
          persona?: string | null
          topic?: string | null
          tweetified?: boolean | null
          user_id?: string | null
        }
      }
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
          notification_email: boolean
          notification_browser: boolean
          auto_post_enabled: boolean
          max_daily_posts: number
          preferred_posting_times: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          timezone?: string
          notification_email?: boolean
          notification_browser?: boolean
          auto_post_enabled?: boolean
          max_daily_posts?: number
          preferred_posting_times?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          timezone?: string
          notification_email?: boolean
          notification_browser?: boolean
          auto_post_enabled?: boolean
          max_daily_posts?: number
          preferred_posting_times?: any
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
          tokens_used: number | null
          response_time_ms: number | null
          success: boolean
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          service_name: string
          endpoint?: string | null
          cost_cents?: number
          tokens_used?: number | null
          response_time_ms?: number | null
          success?: boolean
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          service_name?: string
          endpoint?: string | null
          cost_cents?: number
          tokens_used?: number | null
          response_time_ms?: number | null
          success?: boolean
          error_message?: string | null
          created_at?: string
        }
      }
      tweets_cache: {
        Row: {
          id: number
          tweet_id: string
          text: string
          created_at: string | null
          author: string
          likes: number | null
          retweets: number | null
          replies: number | null
          conversation_id: string | null
          analyzed: boolean | null
          inserted_at: string | null
          engagement_processed: boolean | null
          user_id: string | null
        }
        Insert: {
          id?: number
          tweet_id: string
          text: string
          created_at?: string | null
          author: string
          likes?: number | null
          retweets?: number | null
          replies?: number | null
          conversation_id?: string | null
          analyzed?: boolean | null
          inserted_at?: string | null
          engagement_processed?: boolean | null
          user_id?: string | null
        }
        Update: {
          id?: number
          tweet_id?: string
          text?: string
          created_at?: string | null
          author?: string
          likes?: number | null
          retweets?: number | null
          replies?: number | null
          conversation_id?: string | null
          analyzed?: boolean | null
          inserted_at?: string | null
          engagement_processed?: boolean | null
          user_id?: string | null
        }
      }
      x_accounts: {
        Row: {
          id: number
          username: string
          display_name: string | null
          priority: number | null
          last_fetched_at: string | null
          created_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: number
          username: string
          display_name?: string | null
          priority?: number | null
          last_fetched_at?: string | null
          created_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: number
          username?: string
          display_name?: string | null
          priority?: number | null
          last_fetched_at?: string | null
          created_at?: string | null
          user_id?: string | null
        }
      }
      personas: {
        Row: {
          id: number
          name: string
          description: string | null
          tone: number | null
          humor: number | null
          enthusiasm: number | null
          assertiveness: number | null
          created_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          tone?: number | null
          humor?: number | null
          enthusiasm?: number | null
          assertiveness?: number | null
          created_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          tone?: number | null
          humor?: number | null
          enthusiasm?: number | null
          assertiveness?: number | null
          created_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
      }
      potential_tweets: {
        Row: {
          id: number
          blog_post_id: number | null
          content: string
          position: number
          status: string | null
          scheduled_for: string | null
          posted_at: string | null
          created_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: number
          blog_post_id?: number | null
          content: string
          position: number
          status?: string | null
          scheduled_for?: string | null
          posted_at?: string | null
          created_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: number
          blog_post_id?: number | null
          content?: string
          position?: number
          status?: string | null
          scheduled_for?: string | null
          posted_at?: string | null
          created_at?: string | null
          user_id?: string | null
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
          unanalyzed_tweets: number | null
          total_blog_posts: number | null
          published_blogs: number | null
          total_potential_tweets: number | null
          scheduled_tweets: number | null
          total_x_accounts: number | null
          total_personas: number | null
          active_topics: number | null
        }
      }
      user_recent_activity: {
        Row: {
          user_id: string
          agent_name: string
          level: string
          message: string
          timestamp: string | null
          email: string
        }
      }
    }
    Functions: {
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      increment_api_usage: {
        Args: {
          p_user_id: string
          p_service_name: string
          p_cost_cents?: number
          p_tokens_used?: number
          p_endpoint?: string
        }
        Returns: undefined
      }
      check_usage_limit: {
        Args: {
          p_user_id: string
        }
        Returns: boolean
      }
      get_user_api_key: {
        Args: {
          p_user_id: string
          p_service_name: string
        }
        Returns: string
      }
      reset_monthly_usage: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      subscription_tier: 'free' | 'pro' | 'enterprise'
    }
  }
}
