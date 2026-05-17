-- ============================================================================
-- 마이그레이션 #9: 4주차 개인 채팅 + 태도 감지
--
-- 참조: research.md §9.4, plan.md §4.1.1-§4.1.2, CLAUDE.md C3 (채널 격리)
--
-- 추가/변경:
--   1. attitude_flags 테이블 (학생 비노출, 교사·시스템만)
--   2. messages 정책 추가: personal:{participant_id} 채널은 본인만 read/insert
-- ============================================================================

-- ============================================================================
-- 1. attitude_flags
-- ============================================================================
create table if not exists public.attitude_flags (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  target_participant_id uuid references public.participants(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  severity text not null default 'low' check (severity in ('low', 'medium', 'high')),
  raw_text text not null,
  detected_by text not null default 'keyword' check (
    detected_by in ('keyword', 'moderation_api', 'manual')
  ),
  action_taken text,
  created_at timestamptz not null default now()
);

create index if not exists attitude_flags_room_idx
  on public.attitude_flags(room_id, created_at desc);

alter table public.attitude_flags enable row level security;

-- 학생: 절대 read 불가 (CLAUDE.md C7 학생 비노출)
-- 교사: 본인 모둠의 flag만 read
drop policy if exists "attitude_flags teacher read" on public.attitude_flags;
create policy "attitude_flags teacher read"
  on public.attitude_flags for select
  to authenticated
  using (
    public.is_teacher_of_room(attitude_flags.room_id)
  );

-- write는 service_role만 (RLS bypass) — 정책 없음 = 차단

-- ============================================================================
-- 2. messages — personal 채널 정책 추가
--    기존 'messages team read' 정책은 channel='team'만 다룸. personal 채널은
--    별도 정책으로 본인만 read 허용.
-- ============================================================================

-- 헬퍼: 현재 user가 특정 participant_id 본인인지
create or replace function public.is_self_participant(p_participant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.participants
    where id = p_participant_id and user_id = auth.uid()
  );
$$;

grant execute on function public.is_self_participant(uuid) to authenticated;

-- personal 채널 read: 본인만 + 동의된 교사 사후 조회는 별도 RPC로
drop policy if exists "messages personal read" on public.messages;
create policy "messages personal read"
  on public.messages for select
  to authenticated
  using (
    channel like 'personal:%'
    and public.is_self_participant(
      (substring(channel from 'personal:(.+)$'))::uuid
    )
  );

-- personal 채널 student insert: 본인만 utterance type
drop policy if exists "messages personal student insert" on public.messages;
create policy "messages personal student insert"
  on public.messages for insert
  to authenticated
  with check (
    channel like 'personal:%'
    and message_type = 'utterance'
    and author_id = auth.uid()
    and public.is_self_participant(
      (substring(channel from 'personal:(.+)$'))::uuid
    )
  );

-- ============================================================================
-- 3. 교사 개인 채팅 사후 조회 RPC (동의된 경우만)
-- ============================================================================
create or replace function public.fetch_personal_chat(p_participant_id uuid)
returns setof public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_consented boolean;
begin
  -- 호출자가 담당 교사인지 확인
  select room_id into v_room_id
  from public.participants
  where id = p_participant_id;

  if v_room_id is null then
    raise exception 'participant not found';
  end if;

  if not public.is_teacher_of_room(v_room_id) then
    raise exception 'not authorized';
  end if;

  -- 동의 여부 확인
  select coalesce(teacher_view_allowed, false) into v_consented
  from public.personal_chat_consent
  where participant_id = p_participant_id;

  if not coalesce(v_consented, false) then
    raise exception 'student did not consent to teacher view';
  end if;

  return query
  select *
  from public.messages
  where channel = 'personal:' || p_participant_id::text
  order by created_at asc;
end;
$$;

grant execute on function public.fetch_personal_chat(uuid) to authenticated;

-- ============================================================================
-- 4. Realtime publication
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'attitude_flags'
  ) then
    alter publication supabase_realtime add table public.attitude_flags;
  end if;
end $$;

notify pgrst, 'reload schema';
