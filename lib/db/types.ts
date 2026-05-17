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
      rooms: {
        Row: {
          id: string;
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
        Update: {
          id?: string;
          room_code?: string;
          topic?: string;
          teacher_id?: string;
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
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

// 편의 타입 alias
export type Room = Database['public']['Tables']['rooms']['Row'];
export type Participant = Database['public']['Tables']['participants']['Row'];
export type PersonalChatConsent =
  Database['public']['Tables']['personal_chat_consent']['Row'];
