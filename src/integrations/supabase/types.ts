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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      chat_conversations: {
        Row: {
          citizen_user_id: string
          closed_at: string | null
          created_at: string
          id: string
          is_closed: boolean
          issue_id: string
          mp_user_id: string
        }
        Insert: {
          citizen_user_id: string
          closed_at?: string | null
          created_at?: string
          id?: string
          is_closed?: boolean
          issue_id: string
          mp_user_id: string
        }
        Update: {
          citizen_user_id?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          is_closed?: boolean
          issue_id?: string
          mp_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: true
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          address_text: string | null
          body: string
          center_id: string
          created_at: string
          event_datetime: string | null
          id: string
          images: Json
          lat: number | null
          lng: number | null
          mp_user_id: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          address_text?: string | null
          body: string
          center_id: string
          created_at?: string
          event_datetime?: string | null
          id?: string
          images?: Json
          lat?: number | null
          lng?: number | null
          mp_user_id: string
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          address_text?: string | null
          body?: string
          center_id?: string
          created_at?: string
          event_datetime?: string | null
          id?: string
          images?: Json
          lat?: number | null
          lng?: number | null
          mp_user_id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      centers: {
        Row: {
          created_at: string
          district_ar: string
          district_en: string
          electoral_district_ar: string | null
          electoral_district_en: string | null
          electoral_seats: number | null
          governorate_ar: string
          governorate_en: string
          id: string
        }
        Insert: {
          created_at?: string
          district_ar: string
          district_en: string
          electoral_district_ar?: string | null
          electoral_district_en?: string | null
          electoral_seats?: number | null
          governorate_ar: string
          governorate_en: string
          id?: string
        }
        Update: {
          created_at?: string
          district_ar?: string
          district_en?: string
          electoral_district_ar?: string | null
          electoral_district_en?: string | null
          electoral_seats?: number | null
          governorate_ar?: string
          governorate_en?: string
          id?: string
        }
        Relationships: []
      }
      community_projects: {
        Row: {
          center_id: string
          created_at: string
          creator_user_id: string
          description: string
          id: string
          raised_amount: number
          refund_triggered_at: string | null
          status: string
          target_amount: number
          title: string
          updated_at: string
        }
        Insert: {
          center_id: string
          created_at?: string
          creator_user_id: string
          description: string
          id?: string
          raised_amount?: number
          refund_triggered_at?: string | null
          status?: string
          target_amount: number
          title: string
          updated_at?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          creator_user_id?: string
          description?: string
          id?: string
          raised_amount?: number
          refund_triggered_at?: string | null
          status?: string
          target_amount?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_donations: {
        Row: {
          admin_verified_at: string | null
          admin_verified_by: string | null
          amount: number
          created_at: string
          donor_user_id: string
          id: string
          payment_status: string
          project_id: string
          reference_code: string
          updated_at: string
        }
        Insert: {
          admin_verified_at?: string | null
          admin_verified_by?: string | null
          amount: number
          created_at?: string
          donor_user_id: string
          id?: string
          payment_status?: string
          project_id: string
          reference_code: string
          updated_at?: string
        }
        Update: {
          admin_verified_at?: string | null
          admin_verified_by?: string | null
          amount?: number
          created_at?: string
          donor_user_id?: string
          id?: string
          payment_status?: string
          project_id?: string
          reference_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_founders: {
        Row: {
          created_at: string
          founder_user_id: string
          id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          founder_user_id: string
          id?: string
          project_id: string
        }
        Update: {
          created_at?: string
          founder_user_id?: string
          id?: string
          project_id?: string
        }
        Relationships: []
      }
      project_mp_nomination_approvals: {
        Row: {
          created_at: string
          founder_user_id: string
          id: string
          nomination_id: string
        }
        Insert: {
          created_at?: string
          founder_user_id: string
          id?: string
          nomination_id: string
        }
        Update: {
          created_at?: string
          founder_user_id?: string
          id?: string
          nomination_id?: string
        }
        Relationships: []
      }
      project_mp_nominations: {
        Row: {
          admin_approved_at: string | null
          admin_approved_by: string | null
          bank_snapshot: Json | null
          created_at: string
          id: string
          legal_acknowledged: boolean
          legal_acknowledged_at: string | null
          mp_decided_at: string | null
          nominated_by_founder_user_id: string
          nominated_mp_user_id: string
          project_id: string
          status: string
          transfer_completed_at: string | null
          transfer_receipt_path: string | null
          transfer_receipt_uploaded_at: string | null
          updated_at: string
        }
        Insert: {
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          bank_snapshot?: Json | null
          created_at?: string
          id?: string
          legal_acknowledged?: boolean
          legal_acknowledged_at?: string | null
          mp_decided_at?: string | null
          nominated_by_founder_user_id: string
          nominated_mp_user_id: string
          project_id: string
          status?: string
          transfer_completed_at?: string | null
          transfer_receipt_path?: string | null
          transfer_receipt_uploaded_at?: string | null
          updated_at?: string
        }
        Update: {
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          bank_snapshot?: Json | null
          created_at?: string
          id?: string
          legal_acknowledged?: boolean
          legal_acknowledged_at?: string | null
          mp_decided_at?: string | null
          nominated_by_founder_user_id?: string
          nominated_mp_user_id?: string
          project_id?: string
          status?: string
          transfer_completed_at?: string | null
          transfer_receipt_path?: string | null
          transfer_receipt_uploaded_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_refund_batches: {
        Row: {
          created_at: string
          fee_percent: number
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee_percent: number
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee_percent?: number
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_refund_requests: {
        Row: {
          created_at: string
          id: string
          project_id: string
          requester_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          requester_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          requester_user_id?: string
        }
        Relationships: []
      }
      project_system_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value_numeric: number | null
          value_text: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value_numeric?: number | null
          value_text?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value_numeric?: number | null
          value_text?: string | null
        }
        Relationships: []
      }
      fcm_tokens: {
        Row: {
          created_at: string
          id: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      issue_actions: {
        Row: {
          action_type: string
          created_at: string
          id: string
          issue_id: string
          note: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          issue_id: string
          note?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          issue_id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_actions_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_type: string | null
          id: string
          issue_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_type?: string | null
          id?: string
          issue_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_type?: string | null
          id?: string
          issue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_attachments_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          ai_summary: string | null
          assigned_mp_id: string | null
          category: string
          citizen_confirmed: boolean
          created_at: string
          description: string
          id: string
          is_flagged: boolean
          issue_type: string
          latitude: number | null
          location: string
          longitude: number | null
          mp_notes: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          assigned_mp_id?: string | null
          category: string
          citizen_confirmed?: boolean
          created_at?: string
          description: string
          id?: string
          is_flagged?: boolean
          issue_type?: string
          latitude?: number | null
          location: string
          longitude?: number | null
          mp_notes?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          assigned_mp_id?: string | null
          category?: string
          citizen_confirmed?: boolean
          created_at?: string
          description?: string
          id?: string
          is_flagged?: boolean
          issue_type?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          mp_notes?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      identity_verifications: {
        Row: {
          center_id_snapshot: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          extracted_fields_json: Json | null
          id: string
          id_back_path: string
          id_front_path: string
          ocr_provider: string | null
          ocr_raw_json: Json | null
          rejection_reason: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          center_id_snapshot?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          extracted_fields_json?: Json | null
          id?: string
          id_back_path: string
          id_front_path: string
          ocr_provider?: string | null
          ocr_raw_json?: Json | null
          rejection_reason?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          center_id_snapshot?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          extracted_fields_json?: Json | null
          id?: string
          id_back_path?: string
          id_front_path?: string
          ocr_provider?: string | null
          ocr_raw_json?: Json | null
          rejection_reason?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "identity_verifications_center_id_snapshot_fkey"
            columns: ["center_id_snapshot"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data_json: Json | null
          dedup_key: string | null
          id: string
          is_read: boolean
          issue_id: string | null
          read_at: string | null
          message: string
          target_user_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data_json?: Json | null
          dedup_key?: string | null
          id?: string
          is_read?: boolean
          issue_id?: string | null
          read_at?: string | null
          message: string
          target_user_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data_json?: Json | null
          dedup_key?: string | null
          id?: string
          is_read?: boolean
          issue_id?: string | null
          read_at?: string | null
          message?: string
          target_user_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          id: string
          notification_id: string
          provider_message_id: string | null
          status: string
        }
        Insert: {
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          notification_id: string
          provider_message_id?: string | null
          status: string
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          notification_id?: string
          provider_message_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_opt_in: boolean
          inapp_opt_in: boolean
          sms_opt_in: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_opt_in?: boolean
          inapp_opt_in?: boolean
          sms_opt_in?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_opt_in?: boolean
          inapp_opt_in?: boolean
          sms_opt_in?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
          id: string
          mode: string
          phone: string
          used: boolean
          used_at: string | null
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          expires_at: string
          id?: string
          mode: string
          phone: string
          used?: boolean
          used_at?: string | null
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          mode?: string
          phone?: string
          used?: boolean
          used_at?: string | null
        }
        Relationships: []
      }
      mp_admin_requests: {
        Row: {
          center_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          id: string
          message: string
          mp_user_id: string
          status: string
          type: string
        }
        Insert: {
          center_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          message: string
          mp_user_id: string
          status?: string
          type?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          message?: string
          mp_user_id?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      outbound_email_tasks: {
        Row: {
          body: string
          context: Json
          created_at: string
          created_by: string | null
          error: string | null
          id: string
          processed_at: string | null
          status: string
          subject: string
          to_email: string
        }
        Insert: {
          body: string
          context?: Json
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          processed_at?: string | null
          status?: string
          subject: string
          to_email: string
        }
        Update: {
          body?: string
          context?: Json
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          processed_at?: string | null
          status?: string
          subject?: string
          to_email?: string
        }
        Relationships: []
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          poll_id: string
          vote_value: string
          voter_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          poll_id: string
          vote_value: string
          voter_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          poll_id?: string
          vote_value?: string
          voter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          center_id: string
          created_at: string
          description: string | null
          id: string
          mp_user_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          center_id: string
          created_at?: string
          description?: string | null
          id?: string
          mp_user_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          description?: string | null
          id?: string
          mp_user_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned_until: string | null
          center: string | null
          center_id: string | null
          constituency: string | null
          contact_phone: string | null
          created_at: string
          district: string | null
          electoral_district: string | null
          email: string | null
          email_verified: boolean
          full_name: string
          governorate: string | null
          id: string
          is_approved: boolean
          membership_number: string | null
          pending_email: string | null
          phone: string
          phone_verified: boolean
          updated_at: string
          user_id: string
          verification_decided_at: string | null
          verification_decided_by: string | null
          verification_status: string
          verification_submitted_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          banned_until?: string | null
          center?: string | null
          center_id?: string | null
          constituency?: string | null
          contact_phone?: string | null
          created_at?: string
          district?: string | null
          electoral_district?: string | null
          email?: string | null
          email_verified?: boolean
          full_name: string
          governorate?: string | null
          id?: string
          is_approved?: boolean
          membership_number?: string | null
          pending_email?: string | null
          phone: string
          phone_verified?: boolean
          updated_at?: string
          user_id: string
          verification_decided_at?: string | null
          verification_decided_by?: string | null
          verification_status?: string
          verification_submitted_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          banned_until?: string | null
          center?: string | null
          center_id?: string | null
          constituency?: string | null
          contact_phone?: string | null
          created_at?: string
          district?: string | null
          electoral_district?: string | null
          email?: string | null
          email_verified?: boolean
          full_name?: string
          governorate?: string | null
          id?: string
          is_approved?: boolean
          membership_number?: string | null
          pending_email?: string | null
          phone?: string
          phone_verified?: boolean
          updated_at?: string
          user_id?: string
          verification_decided_at?: string | null
          verification_decided_by?: string | null
          verification_status?: string
          verification_submitted_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_logs: {
        Row: {
          id: string
          ip_address: string
          request_path: string
          request_timestamp: string
          response_status: number | null
          user_id: string | null
        }
        Insert: {
          id?: string
          ip_address: string
          request_path: string
          request_timestamp?: string
          response_status?: number | null
          user_id?: string | null
        }
        Update: {
          id?: string
          ip_address?: string
          request_path?: string
          request_timestamp?: string
          response_status?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      community_project_public_stats: {
        Row: {
          center_id: string | null
          description: string | null
          distinct_donor_count: number | null
          founders_display: string | null
          founders_verified_count: number | null
          project_id: string | null
          raised_amount: number | null
          refund_request_count: number | null
          refund_request_percentage: number | null
          status: string | null
          target_amount: number | null
          title: string | null
        }
        Insert: {
          center_id?: string | null
          description?: string | null
          distinct_donor_count?: number | null
          founders_display?: string | null
          founders_verified_count?: number | null
          project_id?: string | null
          raised_amount?: number | null
          refund_request_count?: number | null
          refund_request_percentage?: number | null
          status?: string | null
          target_amount?: number | null
          title?: string | null
        }
        Update: {
          center_id?: string | null
          description?: string | null
          distinct_donor_count?: number | null
          founders_display?: string | null
          founders_verified_count?: number | null
          project_id?: string | null
          raised_amount?: number | null
          refund_request_count?: number | null
          refund_request_percentage?: number | null
          status?: string | null
          target_amount?: number | null
          title?: string | null
        }
        Relationships: []
      }
      poll_results: {
        Row: {
          center_id: string | null
          mp_user_id: string | null
          no_count: number | null
          no_percentage: number | null
          poll_id: string | null
          status: string | null
          total: number | null
          yes_count: number | null
          yes_percentage: number | null
        }
        Insert: {
          center_id?: string | null
          mp_user_id?: string | null
          no_count?: number | null
          no_percentage?: number | null
          poll_id?: string | null
          status?: string | null
          total?: number | null
          yes_count?: number | null
          yes_percentage?: number | null
        }
        Update: {
          center_id?: string | null
          mp_user_id?: string | null
          no_count?: number | null
          no_percentage?: number | null
          poll_id?: string | null
          status?: string | null
          total?: number | null
          yes_count?: number | null
          yes_percentage?: number | null
        }
        Relationships: []
      }
      mp_public_profiles: {
        Row: {
          avatar_url: string | null
          center: string | null
          center_id: string | null
          constituency: string | null
          contact_phone: string | null
          district: string | null
          electoral_district: string | null
          full_name: string | null
          governorate: string | null
          is_approved: boolean | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          center?: string | null
          center_id?: string | null
          constituency?: string | null
          contact_phone?: string | null
          district?: string | null
          electoral_district?: string | null
          full_name?: string | null
          governorate?: string | null
          is_approved?: boolean | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          center?: string | null
          center_id?: string | null
          constituency?: string | null
          contact_phone?: string | null
          district?: string | null
          electoral_district?: string | null
          full_name?: string | null
          governorate?: string | null
          is_approved?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_project_donation_pledge: {
        Args: { _amount: number; _project_id: string }
        Returns: {
          admin_verified_at: string | null
          admin_verified_by: string | null
          amount: number
          created_at: string
          donor_user_id: string
          id: string
          payment_status: string
          project_id: string
          reference_code: string
          updated_at: string
        }
      }
      get_project_public_aggregate: {
        Args: { _project_id: string }
        Returns: {
          center_id: string
          distinct_donor_count: number
          founders_display: string
          founders_verified_count: number
          project_id: string
          raised_amount: number
          refund_request_count: number
          refund_request_percentage: number
          status: string
          target_amount: number
        }[]
      }
      get_project_refund_fee_percent: { Args: never; Returns: number }
      get_mp_center_citizens_count: { Args: never; Returns: number }
      get_poll_vote_counts: {
        Args: { _poll_id: string }
        Returns: { no_count: number; total: number; yes_count: number }[]
      }
      get_public_issue_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_mp: { Args: { _user_id: string }; Returns: boolean }
      is_verified_citizen: { Args: { _user_id: string }; Returns: boolean }
      is_verified_mp: { Args: { _user_id: string }; Returns: boolean }
      resolve_center_id: {
        Args: { _district: string; _governorate: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "citizen" | "mp" | "admin" | "moderator"
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
      app_role: ["citizen", "mp", "admin", "moderator"],
    },
  },
} as const
