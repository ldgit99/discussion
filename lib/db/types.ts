// ============================================================================
// 이 파일은 자동 생성됩니다.
// `npm run db:types` (실제 Supabase 프로젝트 link 후 실행)
//
// 현재는 마이그레이션 #1 기준 수동 작성된 placeholder.
// Supabase 연결 후 `supabase gen types typescript --linked > lib/db/types.ts`로 교체.
// 형식은 supabase gen types 출력과 호환되도록 작성됨.
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string;
          teacher_id: string;
          topic: string;
          total_students: number;
          group_size: number;
          num_rooms: number;
          time_limit_minutes: number | null;
          stage: 'waiting' | 'active' | 'closed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          topic: string;
          total_students: number;
          group_size?: number;
          num_rooms: number;
          time_limit_minutes?: number | null;
          stage?: 'waiting' | 'active' | 'closed';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['sessions']['Insert']>;
        Relationships: [];
      };
      rooms: {
        Row: {
          id: string;
          session_id: string;
          room_code: string;
          topic: string;
          teacher_id: string;
          stage:
            | 'waiting'
            | 'intro'
            | 'turn_taking'
            | 'discussion'
            | 'consensus'
            | 'submitted'
            | 'closed';
          time_limit_minutes: number | null;
          min_participants: number;
          max_participants: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          room_code: string;
          topic: string;
          teacher_id: string;
          stage?:
            | 'waiting'
            | 'intro'
            | 'turn_taking'
            | 'discussion'
            | 'consensus'
            | 'submitted'
            | 'closed';
          time_limit_minutes?: number | null;
          min_participants?: number;
          max_participants?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['rooms']['Insert']>;
        Relationships: [];
      };
      participants: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          role: 'teacher' | 'student';
          nickname: string;
          turn_order: number | null;
          joined_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          role: 'teacher' | 'student';
          nickname: string;
          turn_order?: number | null;
          joined_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          role?: 'teacher' | 'student';
          nickname?: string;
          turn_order?: number | null;
          joined_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          room_id: string;
          channel: string;
          author_id: string | null;
          author_nickname: string | null;
          content: string;
          message_type: 'utterance' | 'ai_facilitation' | 'ai_coaching' | 'system';
          ai_feature:
            | 'facilitation'
            | 'summary'
            | 'compare'
            | 'evidence_check'
            | 'question_gen'
            | 'attitude_check'
            | 'consensus_aid'
            | 'coaching'
            | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          channel?: string;
          author_id?: string | null;
          author_nickname?: string | null;
          content: string;
          message_type?: 'utterance' | 'ai_facilitation' | 'ai_coaching' | 'system';
          ai_feature?:
            | 'facilitation'
            | 'summary'
            | 'compare'
            | 'evidence_check'
            | 'question_gen'
            | 'attitude_check'
            | 'consensus_aid'
            | 'coaching'
            | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
        Relationships: [];
      };
      opinions: {
        Row: {
          id: string;
          room_id: string;
          author_id: string;
          author_nickname: string;
          content: string;
          evidence: string | null;
          shared_from_personal: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          author_id: string;
          author_nickname: string;
          content: string;
          evidence?: string | null;
          shared_from_personal?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['opinions']['Insert']>;
        Relationships: [];
      };
      board_items: {
        Row: {
          id: string;
          room_id: string;
          type: 'compare' | 'criteria' | 'issue' | 'representative';
          position: number;
          content: string;
          updated_by: string | null;
          updated_by_nickname: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          type: 'compare' | 'criteria' | 'issue' | 'representative';
          position?: number;
          content?: string;
          updated_by?: string | null;
          updated_by_nickname?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['board_items']['Insert']>;
        Relationships: [];
      };
      consensus_results: {
        Row: {
          id: string;
          room_id: string;
          session_id: string;
          representative_opinion: string;
          reason: string | null;
          improvements: string | null;
          action_plan: string | null;
          submitted_by: string | null;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          session_id: string;
          representative_opinion: string;
          reason?: string | null;
          improvements?: string | null;
          action_plan?: string | null;
          submitted_by?: string | null;
          submitted_at?: string;
        };
        Update: Partial<Database['public']['Tables']['consensus_results']['Insert']>;
        Relationships: [];
      };
      attitude_flags: {
        Row: {
          id: string;
          room_id: string;
          target_participant_id: string | null;
          message_id: string | null;
          severity: 'low' | 'medium' | 'high';
          raw_text: string;
          detected_by: 'keyword' | 'moderation_api' | 'manual';
          action_taken: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          target_participant_id?: string | null;
          message_id?: string | null;
          severity?: 'low' | 'medium' | 'high';
          raw_text: string;
          detected_by?: 'keyword' | 'moderation_api' | 'manual';
          action_taken?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['attitude_flags']['Insert']>;
        Relationships: [];
      };
      personal_chat_consent: {
        Row: {
          id: string;
          participant_id: string;
          room_id: string;
          teacher_view_allowed: boolean;
          consented_at: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          room_id: string;
          teacher_view_allowed?: boolean;
          consented_at?: string;
        };
        Update: {
          id?: string;
          participant_id?: string;
          room_id?: string;
          teacher_view_allowed?: boolean;
          consented_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      validate_room_code: {
        Args: { p_code: string };
        Returns: {
          id: string;
          topic: string;
          stage: string;
          current_count: number;
          max_participants: number;
          joinable: boolean;
        }[];
      };
      generate_room_code: {
        Args: Record<string, never>;
        Returns: string;
      };
      current_user_role: {
        Args: Record<string, never>;
        Returns: string;
      };
      create_session_with_rooms: {
        Args: {
          p_topic: string;
          p_total_students: number;
          p_group_size?: number;
          p_time_limit_minutes?: number;
        };
        // returns jsonb: { session_id, num_rooms, rooms: [...] }
        Returns: {
          session_id: string;
          num_rooms: number;
          rooms: Array<{
            room_id: string;
            room_code: string;
            room_index: number;
            capacity: number;
          }>;
        };
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

// 편의 타입 alias
export type Session = Database['public']['Tables']['sessions']['Row'];
export type Room = Database['public']['Tables']['rooms']['Row'];
export type Participant = Database['public']['Tables']['participants']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Opinion = Database['public']['Tables']['opinions']['Row'];
export type BoardItem = Database['public']['Tables']['board_items']['Row'];
export type ConsensusResult = Database['public']['Tables']['consensus_results']['Row'];
export type PersonalChatConsent =
  Database['public']['Tables']['personal_chat_consent']['Row'];
