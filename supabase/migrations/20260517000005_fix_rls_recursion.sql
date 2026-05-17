-- ============================================================================
-- 마이그레이션 #5: RLS 정책 무한 재귀 해소
--
-- 증상: sessions SELECT 시 42P17 "infinite recursion detected in policy
--       for relation participants"
--
-- 원인: 자기참조 EXISTS 정책
--   - participants 정책: participants 자체를 서브쿼리로 참조
--   - sessions/rooms 학생 정책: participants 참조 → participants 정책 평가 →
--     다시 participants 참조 → 재귀
--
-- 해결: SECURITY DEFINER 헬퍼 함수로 멤버십 검사를 RLS 우회 경로로 격리.
--       함수가 SECURITY DEFINER + STABLE이라 정책 evaluation에서 안전.
-- ============================================================================

-- ---- 헬퍼 함수 (SECURITY DEFINER로 RLS 우회) ----

-- 현재 유저가 특정 room에 참가한 student인지
create or replace function public.is_participant_of_room(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.participants
    where room_id = p_room_id and user_id = auth.uid()
  );
$$;

-- 현재 유저가 특정 session의 어떤 room이든 참가했는지
create or replace function public.is_member_of_session(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.participants p
    join public.rooms r on r.id = p.room_id
    where r.session_id = p_session_id
      and p.user_id = auth.uid()
  );
$$;

-- 현재 유저가 특정 room의 담당 교사인지
create or replace function public.is_teacher_of_room(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.rooms
    where id = p_room_id and teacher_id = auth.uid()
  );
$$;

-- 현재 유저가 특정 session의 담당 교사인지
create or replace function public.is_teacher_of_session(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.sessions
    where id = p_session_id and teacher_id = auth.uid()
  );
$$;

grant execute on function public.is_participant_of_room(uuid) to authenticated;
grant execute on function public.is_member_of_session(uuid) to authenticated;
grant execute on function public.is_teacher_of_room(uuid) to authenticated;
grant execute on function public.is_teacher_of_session(uuid) to authenticated;

-- ============================================================================
-- participants 정책 재작성 (자기참조 제거)
-- ============================================================================
drop policy if exists "participants read same room" on public.participants;
create policy "participants read same room"
  on public.participants for select
  to authenticated
  using (
    -- 본인 row (자기참조 없음)
    user_id = auth.uid()
    -- 또는 같은 room 참가자 (SECURITY DEFINER 헬퍼로 우회)
    or public.is_participant_of_room(participants.room_id)
    -- 또는 담당 교사
    or public.is_teacher_of_room(participants.room_id)
  );

-- ============================================================================
-- rooms 학생 정책 재작성 (participants 직접 참조 제거)
-- ============================================================================
drop policy if exists "students read joined rooms" on public.rooms;
create policy "students read joined rooms"
  on public.rooms for select
  to authenticated
  using (
    public.is_participant_of_room(rooms.id)
  );

-- ============================================================================
-- sessions 학생 정책 재작성 (participants 직접 참조 제거)
-- ============================================================================
drop policy if exists "students read own session" on public.sessions;
create policy "students read own session"
  on public.sessions for select
  to authenticated
  using (
    public.is_member_of_session(sessions.id)
  );

-- ============================================================================
-- personal_chat_consent 정책 재작성 (마찬가지로 자기참조 가능성 있음)
-- ============================================================================
drop policy if exists "consent read self or teacher" on public.personal_chat_consent;
create policy "consent read self or teacher"
  on public.personal_chat_consent for select
  to authenticated
  using (
    -- 본인 (participants 통해)
    exists (
      select 1 from public.participants p
      where p.id = personal_chat_consent.participant_id
        and p.user_id = auth.uid()
    )
    -- 또는 담당 교사
    or public.is_teacher_of_session(
      (select session_id from public.rooms where id = (
        select room_id from public.participants
        where id = personal_chat_consent.participant_id
        limit 1
      ))
    )
    or exists (
      select 1 from public.rooms r
      where r.id = personal_chat_consent.room_id
        and r.teacher_id = auth.uid()
    )
  );

-- 스키마 캐시 재로딩
notify pgrst, 'reload schema';
