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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      brand_audit: {
        Row: {
          audit_date: string
          created_at: string
          created_by: string
          engagement_id: string
          id: string
          overall_score: number | null
          priority_actions: Json | null
          repositioning_roadmap: Json | null
          scores: Json | null
          target_score: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          audit_date?: string
          created_at?: string
          created_by: string
          engagement_id: string
          id?: string
          overall_score?: number | null
          priority_actions?: Json | null
          repositioning_roadmap?: Json | null
          scores?: Json | null
          target_score?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          audit_date?: string
          created_at?: string
          created_by?: string
          engagement_id?: string
          id?: string
          overall_score?: number | null
          priority_actions?: Json | null
          repositioning_roadmap?: Json | null
          scores?: Json | null
          target_score?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_audit_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      briefs: {
        Row: {
          content: Json
          created_at: string
          date_from: string | null
          date_to: string | null
          engagement_id: string
          generated_at: string
          generated_by: string
          id: string
          type: string
        }
        Insert: {
          content?: Json
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          engagement_id: string
          generated_at?: string
          generated_by: string
          id?: string
          type?: string
        }
        Update: {
          content?: Json
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          engagement_id?: string
          generated_at?: string
          generated_by?: string
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefs_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      cadence_touchpoints: {
        Row: {
          action_items: Json | null
          completed_date: string | null
          created_at: string
          created_by: string
          engagement_id: string
          id: string
          led_by_id: string | null
          notes: string | null
          scheduled_date: string
          status: Database["public"]["Enums"]["touchpoint_status"]
          touchpoint_type: Database["public"]["Enums"]["touchpoint_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          action_items?: Json | null
          completed_date?: string | null
          created_at?: string
          created_by: string
          engagement_id: string
          id?: string
          led_by_id?: string | null
          notes?: string | null
          scheduled_date: string
          status?: Database["public"]["Enums"]["touchpoint_status"]
          touchpoint_type: Database["public"]["Enums"]["touchpoint_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          action_items?: Json | null
          completed_date?: string | null
          created_at?: string
          created_by?: string
          engagement_id?: string
          id?: string
          led_by_id?: string | null
          notes?: string | null
          scheduled_date?: string
          status?: Database["public"]["Enums"]["touchpoint_status"]
          touchpoint_type?: Database["public"]["Enums"]["touchpoint_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cadence_touchpoints_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_access: {
        Row: {
          allowed_modules: Json
          created_at: string
          created_by: string
          engagement_id: string
          expires_at: string | null
          id: string
          is_active: boolean
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          allowed_modules?: Json
          created_at?: string
          created_by: string
          engagement_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          allowed_modules?: Json
          created_at?: string
          created_by?: string
          engagement_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_access_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          brief_description: string | null
          conflict_check_passed: boolean
          contact_email: string | null
          contact_name: string | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          nda_document_url: string | null
          nda_signed: boolean
          phone: string | null
          qualification_status: string | null
          type: Database["public"]["Enums"]["client_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brief_description?: string | null
          conflict_check_passed?: boolean
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          nda_document_url?: string | null
          nda_signed?: boolean
          phone?: string | null
          qualification_status?: string | null
          type: Database["public"]["Enums"]["client_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brief_description?: string | null
          conflict_check_passed?: boolean
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          nda_document_url?: string | null
          nda_signed?: boolean
          phone?: string | null
          qualification_status?: string | null
          type?: Database["public"]["Enums"]["client_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      comms_initiatives: {
        Row: {
          actual_result: string | null
          communication_phase: string | null
          created_at: string
          created_by: string
          engagement_id: string
          id: string
          key_message: string | null
          launch_date: string | null
          notes: string | null
          policy_area: string | null
          primary_channel: string | null
          responsible_id: string | null
          status: Database["public"]["Enums"]["initiative_status"]
          success_metric: string | null
          target_audience: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actual_result?: string | null
          communication_phase?: string | null
          created_at?: string
          created_by: string
          engagement_id: string
          id?: string
          key_message?: string | null
          launch_date?: string | null
          notes?: string | null
          policy_area?: string | null
          primary_channel?: string | null
          responsible_id?: string | null
          status?: Database["public"]["Enums"]["initiative_status"]
          success_metric?: string | null
          target_audience?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actual_result?: string | null
          communication_phase?: string | null
          created_at?: string
          created_by?: string
          engagement_id?: string
          id?: string
          key_message?: string | null
          launch_date?: string | null
          notes?: string | null
          policy_area?: string | null
          primary_channel?: string | null
          responsible_id?: string | null
          status?: Database["public"]["Enums"]["initiative_status"]
          success_metric?: string | null
          target_audience?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comms_initiatives_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_metrics_history: {
        Row: {
          competitor_profile_id: string
          created_at: string
          engagement_rate: number | null
          followers: number | null
          id: string
          metric_date: string
          platform: string
        }
        Insert: {
          competitor_profile_id: string
          created_at?: string
          engagement_rate?: number | null
          followers?: number | null
          id?: string
          metric_date?: string
          platform?: string
        }
        Update: {
          competitor_profile_id?: string
          created_at?: string
          engagement_rate?: number | null
          followers?: number | null
          id?: string
          metric_date?: string
          platform?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_metrics_history_competitor_profile_id_fkey"
            columns: ["competitor_profile_id"]
            isOneToOne: false
            referencedRelation: "competitor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_profiles: {
        Row: {
          alliance_map: Json | null
          avg_sentiment_score: number | null
          biography: string | null
          constituency: string | null
          created_at: string
          created_by: string
          engagement_id: string
          facebook_likes: number | null
          facebook_page: string | null
          id: string
          influence_score: number | null
          instagram_followers: number | null
          instagram_handle: string | null
          key_messages: Json | null
          last_updated: string | null
          monthly_media_mentions: number | null
          name: string
          party_affiliation: string | null
          role_position: string | null
          threat_score: number | null
          twitter_followers: number | null
          twitter_handle: string | null
          updated_at: string
          updated_by: string | null
          vulnerabilities: Json | null
          youtube_channel: string | null
          youtube_subscribers: number | null
        }
        Insert: {
          alliance_map?: Json | null
          avg_sentiment_score?: number | null
          biography?: string | null
          constituency?: string | null
          created_at?: string
          created_by: string
          engagement_id: string
          facebook_likes?: number | null
          facebook_page?: string | null
          id?: string
          influence_score?: number | null
          instagram_followers?: number | null
          instagram_handle?: string | null
          key_messages?: Json | null
          last_updated?: string | null
          monthly_media_mentions?: number | null
          name: string
          party_affiliation?: string | null
          role_position?: string | null
          threat_score?: number | null
          twitter_followers?: number | null
          twitter_handle?: string | null
          updated_at?: string
          updated_by?: string | null
          vulnerabilities?: Json | null
          youtube_channel?: string | null
          youtube_subscribers?: number | null
        }
        Update: {
          alliance_map?: Json | null
          avg_sentiment_score?: number | null
          biography?: string | null
          constituency?: string | null
          created_at?: string
          created_by?: string
          engagement_id?: string
          facebook_likes?: number | null
          facebook_page?: string | null
          id?: string
          influence_score?: number | null
          instagram_followers?: number | null
          instagram_handle?: string | null
          key_messages?: Json | null
          last_updated?: string | null
          monthly_media_mentions?: number | null
          name?: string
          party_affiliation?: string | null
          role_position?: string | null
          threat_score?: number | null
          twitter_followers?: number | null
          twitter_handle?: string | null
          updated_at?: string
          updated_by?: string | null
          vulnerabilities?: Json | null
          youtube_channel?: string | null
          youtube_subscribers?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_profiles_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          approval_stage: string | null
          approved_by: string | null
          content_body: string | null
          content_brief: string | null
          created_at: string
          created_by: string
          engagement_id: string
          engagement_metrics: Json | null
          id: string
          platform: string | null
          published_date: string | null
          scheduled_date: string | null
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approval_stage?: string | null
          approved_by?: string | null
          content_body?: string | null
          content_brief?: string | null
          created_at?: string
          created_by: string
          engagement_id: string
          engagement_metrics?: Json | null
          id?: string
          platform?: string | null
          published_date?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approval_stage?: string | null
          approved_by?: string | null
          content_body?: string | null
          content_brief?: string | null
          created_at?: string
          created_by?: string
          engagement_id?: string
          engagement_metrics?: Json | null
          id?: string
          platform?: string | null
          published_date?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      crisis_events: {
        Row: {
          activated_at: string
          activation_notes: string | null
          checklist_items: Json | null
          communications_log: Json | null
          created_at: string
          created_by: string
          crisis_type_id: string
          debrief_notes: string | null
          engagement_id: string
          id: string
          resolved_at: string | null
          sentiment_after: number | null
          sentiment_before: number | null
          status: Database["public"]["Enums"]["crisis_event_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activated_at?: string
          activation_notes?: string | null
          checklist_items?: Json | null
          communications_log?: Json | null
          created_at?: string
          created_by: string
          crisis_type_id: string
          debrief_notes?: string | null
          engagement_id: string
          id?: string
          resolved_at?: string | null
          sentiment_after?: number | null
          sentiment_before?: number | null
          status?: Database["public"]["Enums"]["crisis_event_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activated_at?: string
          activation_notes?: string | null
          checklist_items?: Json | null
          communications_log?: Json | null
          created_at?: string
          created_by?: string
          crisis_type_id?: string
          debrief_notes?: string | null
          engagement_id?: string
          id?: string
          resolved_at?: string | null
          sentiment_after?: number | null
          sentiment_before?: number | null
          status?: Database["public"]["Enums"]["crisis_event_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crisis_events_crisis_type_id_fkey"
            columns: ["crisis_type_id"]
            isOneToOne: false
            referencedRelation: "crisis_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crisis_events_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      crisis_types: {
        Row: {
          created_at: string
          created_by: string
          crisis_type_name: string
          engagement_id: string
          first_response_command: string | null
          holding_statement_draft: string | null
          id: string
          immediate_actions: Json | null
          narrative_control_objective: string | null
          political_risk: string | null
          public_visibility: string | null
          recovery_timeline: string | null
          severity: number | null
          short_term_actions: Json | null
          updated_at: string
          updated_by: string | null
          velocity_hours: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          crisis_type_name: string
          engagement_id: string
          first_response_command?: string | null
          holding_statement_draft?: string | null
          id?: string
          immediate_actions?: Json | null
          narrative_control_objective?: string | null
          political_risk?: string | null
          public_visibility?: string | null
          recovery_timeline?: string | null
          severity?: number | null
          short_term_actions?: Json | null
          updated_at?: string
          updated_by?: string | null
          velocity_hours?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          crisis_type_name?: string
          engagement_id?: string
          first_response_command?: string | null
          holding_statement_draft?: string | null
          id?: string
          immediate_actions?: Json | null
          narrative_control_objective?: string | null
          political_risk?: string | null
          public_visibility?: string | null
          recovery_timeline?: string | null
          severity?: number | null
          short_term_actions?: Json | null
          updated_at?: string
          updated_by?: string | null
          velocity_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crisis_types_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      engagements: {
        Row: {
          billing_status: string | null
          client_id: string
          created_at: string
          created_by: string
          end_date: string | null
          fee_amount: number | null
          health_rag: Database["public"]["Enums"]["health_rag"] | null
          id: string
          lead_advisor_id: string | null
          phase: Database["public"]["Enums"]["engagement_phase"]
          start_date: string | null
          status: Database["public"]["Enums"]["engagement_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          billing_status?: string | null
          client_id: string
          created_at?: string
          created_by: string
          end_date?: string | null
          fee_amount?: number | null
          health_rag?: Database["public"]["Enums"]["health_rag"] | null
          id?: string
          lead_advisor_id?: string | null
          phase?: Database["public"]["Enums"]["engagement_phase"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["engagement_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          billing_status?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          end_date?: string | null
          fee_amount?: number | null
          health_rag?: Database["public"]["Enums"]["health_rag"] | null
          id?: string
          lead_advisor_id?: string | null
          phase?: Database["public"]["Enums"]["engagement_phase"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["engagement_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_data: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          last_election_votes: number | null
          lga: string | null
          polling_unit_code: string | null
          registered_voters: number | null
          state: string
          ward: string | null
          winning_party: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_election_votes?: number | null
          lga?: string | null
          polling_unit_code?: string | null
          registered_voters?: number | null
          state: string
          ward?: string | null
          winning_party?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_election_votes?: number | null
          lga?: string | null
          polling_unit_code?: string | null
          registered_voters?: number | null
          state?: string
          ward?: string | null
          winning_party?: string | null
        }
        Relationships: []
      }
      geo_demographics: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          lga_name: string
          literacy_rate: number | null
          median_income: number | null
          population_estimate: number | null
          poverty_rate: number | null
          state: string
          urban_rural: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          lga_name: string
          literacy_rate?: number | null
          median_income?: number | null
          population_estimate?: number | null
          poverty_rate?: number | null
          state: string
          urban_rural?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          lga_name?: string
          literacy_rate?: number | null
          median_income?: number | null
          population_estimate?: number | null
          poverty_rate?: number | null
          state?: string
          urban_rural?: string | null
        }
        Relationships: []
      }
      google_trends_data: {
        Row: {
          created_at: string
          date: string
          engagement_id: string
          id: string
          interest_score: number | null
          keyword: string
          region: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          engagement_id: string
          id?: string
          interest_score?: number | null
          keyword: string
          region?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          engagement_id?: string
          id?: string
          interest_score?: number | null
          keyword?: string
          region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_trends_data_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_configs: {
        Row: {
          api_key_encrypted: string | null
          config: Json | null
          created_at: string
          created_by: string
          error_log: string | null
          id: string
          is_active: boolean
          last_sync_at: string | null
          platform_name: string
          sync_status: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          config?: Json | null
          created_at?: string
          created_by: string
          error_log?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          platform_name: string
          sync_status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          config?: Json | null
          created_at?: string
          created_by?: string
          error_log?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          platform_name?: string
          sync_status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      intel_items: {
        Row: {
          action_required: boolean
          action_status: Database["public"]["Enums"]["action_status"] | null
          created_at: string
          created_by: string
          date_logged: string
          engagement_id: string
          headline: string
          id: string
          is_escalated: boolean
          is_urgent: boolean
          narrative_theme: string | null
          platform: string | null
          portal_approved: boolean
          raw_content: string | null
          reach_tier: number | null
          sentiment_score: number | null
          source_name: string | null
          source_type: Database["public"]["Enums"]["source_type"] | null
          summary: string | null
          updated_at: string
          updated_by: string | null
          url: string | null
        }
        Insert: {
          action_required?: boolean
          action_status?: Database["public"]["Enums"]["action_status"] | null
          created_at?: string
          created_by: string
          date_logged?: string
          engagement_id: string
          headline: string
          id?: string
          is_escalated?: boolean
          is_urgent?: boolean
          narrative_theme?: string | null
          platform?: string | null
          portal_approved?: boolean
          raw_content?: string | null
          reach_tier?: number | null
          sentiment_score?: number | null
          source_name?: string | null
          source_type?: Database["public"]["Enums"]["source_type"] | null
          summary?: string | null
          updated_at?: string
          updated_by?: string | null
          url?: string | null
        }
        Update: {
          action_required?: boolean
          action_status?: Database["public"]["Enums"]["action_status"] | null
          created_at?: string
          created_by?: string
          date_logged?: string
          engagement_id?: string
          headline?: string
          id?: string
          is_escalated?: boolean
          is_urgent?: boolean
          narrative_theme?: string | null
          platform?: string | null
          portal_approved?: boolean
          raw_content?: string | null
          reach_tier?: number | null
          sentiment_score?: number | null
          source_name?: string | null
          source_type?: Database["public"]["Enums"]["source_type"] | null
          summary?: string | null
          updated_at?: string
          updated_by?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intel_items_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      narrative_audience_matrix: {
        Row: {
          audience_segment: string
          call_to_action: string | null
          created_at: string
          created_by: string | null
          id: string
          key_message: string | null
          narrative_platform_id: string
          proof_points: Json | null
          tone_calibration: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          audience_segment: string
          call_to_action?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          key_message?: string | null
          narrative_platform_id: string
          proof_points?: Json | null
          tone_calibration?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          audience_segment?: string
          call_to_action?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          key_message?: string | null
          narrative_platform_id?: string
          proof_points?: Json | null
          tone_calibration?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "narrative_audience_matrix_narrative_platform_id_fkey"
            columns: ["narrative_platform_id"]
            isOneToOne: false
            referencedRelation: "narrative_platform"
            referencedColumns: ["id"]
          },
        ]
      }
      narrative_platform: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          core_values_in_action: string | null
          created_at: string
          created_by: string
          crisis_anchor_message: string | null
          defining_purpose: string | null
          engagement_id: string
          id: string
          is_approved: boolean
          leadership_promise: string | null
          master_narrative: string | null
          updated_at: string
          updated_by: string | null
          version: number
          voice_tone_guide: string | null
          what_we_never_say: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          core_values_in_action?: string | null
          created_at?: string
          created_by: string
          crisis_anchor_message?: string | null
          defining_purpose?: string | null
          engagement_id: string
          id?: string
          is_approved?: boolean
          leadership_promise?: string | null
          master_narrative?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          voice_tone_guide?: string | null
          what_we_never_say?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          core_values_in_action?: string | null
          created_at?: string
          created_by?: string
          crisis_anchor_message?: string | null
          defining_purpose?: string | null
          engagement_id?: string
          id?: string
          is_approved?: boolean
          leadership_promise?: string | null
          master_narrative?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          voice_tone_guide?: string | null
          what_we_never_say?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "narrative_platform_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_login: string | null
          mfa_enabled: boolean
          role_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean
          last_login?: string | null
          mfa_enabled?: boolean
          role_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          mfa_enabled?: boolean
          role_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          id: string
          name: Database["public"]["Enums"]["app_role"]
          permissions: Json
        }
        Insert: {
          created_at?: string
          id?: string
          name: Database["public"]["Enums"]["app_role"]
          permissions?: Json
        }
        Update: {
          created_at?: string
          id?: string
          name?: Database["public"]["Enums"]["app_role"]
          permissions?: Json
        }
        Relationships: []
      }
      scenario_alerts: {
        Row: {
          created_at: string
          engagement_id: string
          id: string
          intel_item_id: string | null
          is_dismissed: boolean
          matched_keyword: string
          scenario_id: string
        }
        Insert: {
          created_at?: string
          engagement_id: string
          id?: string
          intel_item_id?: string | null
          is_dismissed?: boolean
          matched_keyword: string
          scenario_id: string
        }
        Update: {
          created_at?: string
          engagement_id?: string
          id?: string
          intel_item_id?: string | null
          is_dismissed?: boolean
          matched_keyword?: string
          scenario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_alerts_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_alerts_intel_item_id_fkey"
            columns: ["intel_item_id"]
            isOneToOne: false
            referencedRelation: "intel_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_alerts_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          created_at: string
          created_by: string
          engagement_id: string
          id: string
          impact_score: number | null
          key_driver: string | null
          key_opportunities: string | null
          key_risks: string | null
          name: string
          probability:
            | Database["public"]["Enums"]["scenario_probability"]
            | null
          status: Database["public"]["Enums"]["scenario_status"]
          strategic_response: string | null
          time_horizon_months: number | null
          trigger_events: Json | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          engagement_id: string
          id?: string
          impact_score?: number | null
          key_driver?: string | null
          key_opportunities?: string | null
          key_risks?: string | null
          name: string
          probability?:
            | Database["public"]["Enums"]["scenario_probability"]
            | null
          status?: Database["public"]["Enums"]["scenario_status"]
          strategic_response?: string | null
          time_horizon_months?: number | null
          trigger_events?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          engagement_id?: string
          id?: string
          impact_score?: number | null
          key_driver?: string | null
          key_opportunities?: string | null
          key_risks?: string | null
          name?: string
          probability?:
            | Database["public"]["Enums"]["scenario_probability"]
            | null
          status?: Database["public"]["Enums"]["scenario_status"]
          strategic_response?: string | null
          time_horizon_months?: number | null
          trigger_events?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      stakeholder_interactions: {
        Row: {
          created_at: string
          created_by: string
          engagement_id: string
          follow_up_due_date: string | null
          follow_up_required: boolean
          follow_up_status: string | null
          id: string
          interaction_date: string
          interaction_type: string
          led_by_id: string | null
          notes: string | null
          outcome: string | null
          stakeholder_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          engagement_id: string
          follow_up_due_date?: string | null
          follow_up_required?: boolean
          follow_up_status?: string | null
          id?: string
          interaction_date?: string
          interaction_type?: string
          led_by_id?: string | null
          notes?: string | null
          outcome?: string | null
          stakeholder_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          engagement_id?: string
          follow_up_due_date?: string | null
          follow_up_required?: boolean
          follow_up_status?: string | null
          id?: string
          interaction_date?: string
          interaction_type?: string
          led_by_id?: string | null
          notes?: string | null
          outcome?: string | null
          stakeholder_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stakeholder_interactions_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stakeholder_interactions_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "stakeholders"
            referencedColumns: ["id"]
          },
        ]
      }
      stakeholders: {
        Row: {
          alignment: Database["public"]["Enums"]["stakeholder_alignment"] | null
          category: Database["public"]["Enums"]["stakeholder_category"]
          contact_frequency: string | null
          created_at: string
          created_by: string
          engagement_id: string
          engagement_strategy: string | null
          id: string
          influence_score: number | null
          last_contact_date: string | null
          lat: number | null
          lng: number | null
          name: string
          relationship_owner_id: string | null
          risk_level: string | null
          role_position: string | null
          strategic_notes: string | null
          strategic_priority:
            | Database["public"]["Enums"]["strategic_priority"]
            | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          alignment?:
            | Database["public"]["Enums"]["stakeholder_alignment"]
            | null
          category: Database["public"]["Enums"]["stakeholder_category"]
          contact_frequency?: string | null
          created_at?: string
          created_by: string
          engagement_id: string
          engagement_strategy?: string | null
          id?: string
          influence_score?: number | null
          last_contact_date?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          relationship_owner_id?: string | null
          risk_level?: string | null
          role_position?: string | null
          strategic_notes?: string | null
          strategic_priority?:
            | Database["public"]["Enums"]["strategic_priority"]
            | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          alignment?:
            | Database["public"]["Enums"]["stakeholder_alignment"]
            | null
          category?: Database["public"]["Enums"]["stakeholder_category"]
          contact_frequency?: string | null
          created_at?: string
          created_by?: string
          engagement_id?: string
          engagement_strategy?: string | null
          id?: string
          influence_score?: number | null
          last_contact_date?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          relationship_owner_id?: string | null
          risk_level?: string | null
          role_position?: string | null
          strategic_notes?: string | null
          strategic_priority?:
            | Database["public"]["Enums"]["strategic_priority"]
            | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stakeholders_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          engagement_id: string | null
          error_message: string | null
          id: string
          integration_id: string | null
          platform_name: string
          records_ingested: number | null
          status: string
          triggered_at: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          engagement_id?: string | null
          error_message?: string | null
          id?: string
          integration_id?: string | null
          platform_name: string
          records_ingested?: number | null
          status?: string
          triggered_at?: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          engagement_id?: string | null
          error_message?: string | null
          id?: string
          integration_id?: string | null
          platform_name?: string
          records_ingested?: number | null
          status?: string
          triggered_at?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integration_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
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
      action_status: "pending" | "in_progress" | "done" | "monitor_only"
      app_role:
        | "super_admin"
        | "lead_advisor"
        | "senior_advisor"
        | "comms_director"
        | "intel_analyst"
        | "digital_strategist"
        | "client_principal"
      audit_action:
        | "create"
        | "read"
        | "update"
        | "delete"
        | "login"
        | "logout"
        | "export"
      client_type: "legislator" | "governor" | "ministry" | "civic" | "party"
      content_status:
        | "draft"
        | "approved"
        | "scheduled"
        | "published"
        | "archived"
      crisis_event_status: "active" | "resolved" | "monitoring"
      engagement_phase: "1" | "2" | "3" | "4"
      engagement_status: "active" | "paused" | "closed"
      health_rag: "red" | "amber" | "green"
      initiative_status: "not_started" | "in_progress" | "complete" | "overdue"
      scenario_probability: "low" | "medium" | "high"
      scenario_status: "active" | "watching" | "triggered" | "resolved"
      source_type: "print" | "digital" | "broadcast" | "social"
      stakeholder_alignment: "hostile" | "neutral" | "supportive" | "champion"
      stakeholder_category:
        | "government"
        | "media"
        | "civil_society"
        | "business"
        | "traditional"
        | "international"
      strategic_priority: "critical" | "high" | "medium" | "low"
      touchpoint_status: "scheduled" | "completed" | "cancelled" | "rescheduled"
      touchpoint_type:
        | "intel_briefing"
        | "strategic_checkin"
        | "monthly_assessment"
        | "quarterly_review"
        | "emergency_advisory"
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
      action_status: ["pending", "in_progress", "done", "monitor_only"],
      app_role: [
        "super_admin",
        "lead_advisor",
        "senior_advisor",
        "comms_director",
        "intel_analyst",
        "digital_strategist",
        "client_principal",
      ],
      audit_action: [
        "create",
        "read",
        "update",
        "delete",
        "login",
        "logout",
        "export",
      ],
      client_type: ["legislator", "governor", "ministry", "civic", "party"],
      content_status: [
        "draft",
        "approved",
        "scheduled",
        "published",
        "archived",
      ],
      crisis_event_status: ["active", "resolved", "monitoring"],
      engagement_phase: ["1", "2", "3", "4"],
      engagement_status: ["active", "paused", "closed"],
      health_rag: ["red", "amber", "green"],
      initiative_status: ["not_started", "in_progress", "complete", "overdue"],
      scenario_probability: ["low", "medium", "high"],
      scenario_status: ["active", "watching", "triggered", "resolved"],
      source_type: ["print", "digital", "broadcast", "social"],
      stakeholder_alignment: ["hostile", "neutral", "supportive", "champion"],
      stakeholder_category: [
        "government",
        "media",
        "civil_society",
        "business",
        "traditional",
        "international",
      ],
      strategic_priority: ["critical", "high", "medium", "low"],
      touchpoint_status: ["scheduled", "completed", "cancelled", "rescheduled"],
      touchpoint_type: [
        "intel_briefing",
        "strategic_checkin",
        "monthly_assessment",
        "quarterly_review",
        "emergency_advisory",
      ],
    },
  },
} as const
