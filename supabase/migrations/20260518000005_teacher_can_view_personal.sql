-- ============================================================================
-- 마이그레이션 #13: 교사가 개인 채팅도 무조건 열람 가능
--
-- 정책 변경 (CLAUDE.md C3 완화):
--   - 이전: personal 채널은 본인만 read, 교사는 동의된 경우만 사후 조회
--   - 변경: personal 채널은 본인 + 담당 교사 read. 동의 절차 제거.
--
-- 이유: 교실 환경에서 교사는 모든 학생 활동의 안전·교육 책임자.
-- 학생은 "다른 친구는 못 보는 공간"으로 정직하게 안내됨 (UI 변경 함께).
-- ============================================================================

-- 1) messages personal 채널 read 정책 확장: 본인 OR 담당 교사
drop policy if exists "messages personal read" on public.messages;
create policy "messages personal read"
  on public.messages for select
  to authenticated
  using (
    channel like 'personal:%'
    and (
      public.is_self_participant(
        (substring(channel from 'personal:(.+)$'))::uuid
      )
      or public.is_teacher_of_room(messages.room_id)
    )
  );

-- 2) fetch_personal_chat RPC에서 동의 체크 제거
create or replace function public.fetch_personal_chat(p_participant_id uuid)
returns setof public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
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

  -- 동의 체크 제거 — 담당 교사는 항상 열람 가능
  return query
  select *
  from public.messages
  where channel = 'personal:' || p_participant_id::text
  order by created_at asc;
end;
$$;

grant execute on function public.fetch_personal_chat(uuid) to authenticated;

notify pgrst, 'reload schema';
