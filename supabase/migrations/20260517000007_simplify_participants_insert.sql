-- ============================================================================
-- 마이그레이션 #7: participants INSERT 정책 단순화 — 403 해소
--
-- 증상: 학생 [입장하기] → 403 (RLS 차단)
--
-- 원인 분석:
--   이전 정책은 (a) user_id = auth.uid()
--             (b) current_user_role() = 'student'
--             (c) EXISTS (정원 체크 서브쿼리)
--   세 조건 AND. (b)나 (c)가 RLS 평가 컨텍스트에서 실패하면 전체 false.
--   특히 (c)의 내부 count(*)는 participants SELECT RLS의 영향을 받아
--   가입 전 사용자에겐 0으로 평가되지만 그럼에도 검증 실패 케이스 발견.
--
-- 해결:
--   - user_id = auth.uid() 만 강제 (다른 사용자 ID로 insert 차단)
--   - role/정원 체크는 application 레벨에 위임 (validate_room_code RPC,
--     클라이언트 UX)
--   - rooms 조회 검사도 SECURITY DEFINER 함수로 캡슐화
-- ============================================================================

-- 헬퍼: 학생이 이 방에 입장 가능한지 종합 판정
create or replace function public.can_student_join_room(p_room_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_max int;
  v_current int;
begin
  -- role 체크
  v_role := public.current_user_role();
  if v_role <> 'student' then
    return false;
  end if;

  -- 방 존재 + 정원 체크
  select max_participants into v_max from public.rooms where id = p_room_id;
  if v_max is null then
    return false;
  end if;

  select count(*) into v_current
  from public.participants
  where room_id = p_room_id and role = 'student';

  return v_current < v_max;
end;
$$;

grant execute on function public.can_student_join_room(uuid) to authenticated;

-- 정책 재작성: 본인 user_id + 헬퍼 검사만
drop policy if exists "students join room" on public.participants;
create policy "students join room"
  on public.participants for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.can_student_join_room(participants.room_id)
  );

notify pgrst, 'reload schema';
