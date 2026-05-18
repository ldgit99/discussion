-- ============================================================================
-- 마이그레이션 #12: SSCI 논문용 데이터 인프라
--
-- 추가 테이블:
--   1. learning_events: 모든 학생·AI 상호작용 이벤트 시간순 저장 (event sourcing)
--   2. ai_message_reactions: AI 응답에 대한 학생 반응 (수용/거부/무시)
--
-- 분석 가능한 것:
--   - Lag Sequential Analysis (이벤트 시퀀스 → 인과 추론)
--   - AI 개입 효과 (개입 전후 발화 변화)
--   - Agency 보존 검증 (AI vs 학생 발화 비율)
--   - 개인-팀 모드 전환 패턴
-- ============================================================================

-- ============================================================================
-- 1. learning_events
-- ============================================================================
create table if not exists public.learning_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_nickname text,
  event_type text not null check (event_type in (
    -- 학생 발화
    'message_send',
    'opinion_create', 'opinion_update', 'opinion_delete',
    'board_create', 'board_update', 'board_delete',
    -- 모드 전환
    'mode_switch_to_team', 'mode_switch_to_personal',
    'share_personal_to_team',
    -- AI 호출
    'ai_button_click',
    'ai_trigger_auto',
    'ai_message_posted',
    -- 합의
    'consensus_submit',
    -- 입장/퇴장
    'room_join', 'room_leave',
    -- 시스템 감지
    'silence_detected',
    'attitude_flagged'
  )),
  channel text,                      -- 'team' or 'personal:{pid}' or null
  target_object_id uuid,             -- opinion_id, message_id, ai_message_id 등
  ai_feature text,                   -- AI 관련 이벤트면 어느 기능
  payload jsonb,                     -- 추가 컨텍스트 (자유 형식)
  created_at timestamptz not null default clock_timestamp()  -- 밀리초 정밀도
);

create index if not exists learning_events_room_time_idx
  on public.learning_events(room_id, created_at);
create index if not exists learning_events_session_time_idx
  on public.learning_events(session_id, created_at);
create index if not exists learning_events_type_idx
  on public.learning_events(event_type, created_at);
create index if not exists learning_events_actor_idx
  on public.learning_events(actor_id, created_at);

alter table public.learning_events enable row level security;

-- 학생은 본인 발생 이벤트만 read (디버깅용, 일반 학생 화면엔 미사용)
drop policy if exists "learning_events read own or teacher" on public.learning_events;
create policy "learning_events read own or teacher"
  on public.learning_events for select
  to authenticated
  using (
    actor_id = auth.uid()
    or (room_id is not null and public.is_teacher_of_room(room_id))
    or (session_id is not null and public.is_teacher_of_session(session_id))
  );

-- insert는 service_role만 (서버 사이드 emit)
-- 학생 클라이언트는 직접 insert 불가 → 정책 미정의 = 차단

-- ============================================================================
-- 2. ai_message_reactions
--    AI 응답 직후 학생 반응 (자동 추적 또는 학생 자발적 평가)
-- ============================================================================
create table if not exists public.ai_message_reactions (
  id uuid primary key default gen_random_uuid(),
  ai_message_id uuid not null references public.messages(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  participant_id uuid references public.participants(id) on delete set null,
  reaction text not null check (reaction in (
    'helpful', 'not_helpful', 'ignored',
    'used_in_consensus',     -- 합의문에 인용됨 (자동 감지)
    'follow_up_utterance'    -- AI 메시지 30초 내 학생 발화 (자동)
  )),
  detected_by text not null default 'auto' check (
    detected_by in ('auto', 'self_report')
  ),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists ai_reactions_message_idx
  on public.ai_message_reactions(ai_message_id);
create index if not exists ai_reactions_room_idx
  on public.ai_message_reactions(room_id, created_at);

alter table public.ai_message_reactions enable row level security;

drop policy if exists "ai_reactions read same room teacher" on public.ai_message_reactions;
create policy "ai_reactions read same room teacher"
  on public.ai_message_reactions for select
  to authenticated
  using (
    public.is_teacher_of_room(ai_message_reactions.room_id)
    or public.is_participant_of_room(ai_message_reactions.room_id)
  );

-- 학생 self-report insert (helpful/not_helpful) — 본인 participant만
drop policy if exists "ai_reactions self report" on public.ai_message_reactions;
create policy "ai_reactions self report"
  on public.ai_message_reactions for insert
  to authenticated
  with check (
    detected_by = 'self_report'
    and reaction in ('helpful', 'not_helpful')
    and exists (
      select 1 from public.participants p
      where p.id = ai_message_reactions.participant_id
        and p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. RPC — 익명화된 연구 데이터 export
-- ============================================================================
create or replace function public.export_research_data(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  -- 호출자가 담당 교사인지 확인
  if not public.is_teacher_of_session(p_session_id) then
    raise exception 'not authorized';
  end if;

  with anon_participants as (
    select
      p.id,
      'P' || row_number() over (order by p.joined_at) as anon_id
    from public.participants p
    join public.rooms r on r.id = p.room_id
    where r.session_id = p_session_id and p.role = 'student'
  ),
  anon_messages as (
    select
      m.id,
      m.room_id,
      m.channel,
      coalesce(ap.anon_id, 'AI') as anon_actor,
      m.content,
      m.message_type,
      m.ai_feature,
      extract(epoch from m.created_at) * 1000 as ts_ms
    from public.messages m
    join public.rooms r on r.id = m.room_id
    left join anon_participants ap on ap.id = (
      select p.id from public.participants p
      where p.user_id = m.author_id and p.room_id = m.room_id
    )
    where r.session_id = p_session_id
  ),
  anon_opinions as (
    select
      o.id,
      o.room_id,
      coalesce(ap.anon_id, 'X') as anon_author,
      o.content,
      o.evidence,
      extract(epoch from o.created_at) * 1000 as ts_ms
    from public.opinions o
    join public.rooms r on r.id = o.room_id
    join public.participants p on p.user_id = o.author_id and p.room_id = o.room_id
    left join anon_participants ap on ap.id = p.id
    where r.session_id = p_session_id
  ),
  anon_events as (
    select
      e.event_type,
      coalesce(ap.anon_id, 'AI') as anon_actor,
      e.room_id,
      e.channel,
      e.ai_feature,
      e.payload,
      extract(epoch from e.created_at) * 1000 as ts_ms
    from public.learning_events e
    left join anon_participants ap on ap.id = (
      select p.id from public.participants p
      where p.user_id = e.actor_id and p.room_id = e.room_id
    )
    where e.session_id = p_session_id
  ),
  rooms_info as (
    select id, room_code, stage, max_participants
    from public.rooms
    where session_id = p_session_id
  ),
  consensus_info as (
    select room_id, representative_opinion, reason, improvements, action_plan,
           extract(epoch from submitted_at) * 1000 as ts_ms
    from public.consensus_results
    where session_id = p_session_id
  )
  select jsonb_build_object(
    'session_id', p_session_id,
    'export_ts_ms', extract(epoch from now()) * 1000,
    'rooms', coalesce((select jsonb_agg(to_jsonb(r)) from rooms_info r), '[]'::jsonb),
    'participants', coalesce((select jsonb_agg(jsonb_build_object('anon_id', anon_id)) from anon_participants), '[]'::jsonb),
    'messages', coalesce((select jsonb_agg(to_jsonb(m)) from anon_messages m), '[]'::jsonb),
    'opinions', coalesce((select jsonb_agg(to_jsonb(o)) from anon_opinions o), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(to_jsonb(e)) from anon_events e), '[]'::jsonb),
    'consensus', coalesce((select jsonb_agg(to_jsonb(c)) from consensus_info c), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.export_research_data(uuid) to authenticated;

-- ============================================================================
-- 4. Realtime publication (학습 이벤트는 분석용이라 realtime 불필요 → 제외)
-- ============================================================================

notify pgrst, 'reload schema';
