-- ============================================================================
-- 마이그레이션 #4: create_session_with_rooms를 RETURNS JSONB로 재작성
--
-- 증상: REST API 호출 시 404 (PostgREST 스키마 캐시 갱신 실패)
--   - 함수·권한 모두 OK (auth_exec=true)
--   - SQL Editor에서는 호출 가능
--   - REST API에서만 404
--
-- 가설: RETURNS TABLE + OUT 파라미터명 충돌(room_code 등)이 PostgREST의
-- 함수 디스커버리에 영향. RETURNS JSONB로 단순화하면 캐시 문제 해소 가능성.
-- ============================================================================

-- 기존 함수 제거 (RETURNS 타입 변경은 CREATE OR REPLACE 불가)
drop function if exists public.create_session_with_rooms(text, int, int, int);

create or replace function public.create_session_with_rooms(
  p_topic text,
  p_total_students int,
  p_group_size int default 5,
  p_time_limit_minutes int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_num_rooms int;
  v_remaining int;
  v_idx int;
  v_capacity int;
  v_code text;
  v_room_id uuid;
  v_rooms jsonb := '[]'::jsonb;
begin
  -- 권한: teacher만
  if public.current_user_role() <> 'teacher' then
    raise exception 'only teachers can create sessions';
  end if;

  -- 입력 검증
  if p_topic is null or length(p_topic) < 5 then
    raise exception 'topic must be at least 5 characters';
  end if;
  if p_total_students < 2 or p_total_students > 150 then
    raise exception 'total_students must be between 2 and 150';
  end if;
  if p_group_size < 2 or p_group_size > 5 then
    raise exception 'group_size must be between 2 and 5';
  end if;

  v_num_rooms := ceil(p_total_students::numeric / p_group_size)::int;

  -- 세션 생성
  insert into public.sessions (
    teacher_id, topic, total_students, group_size, num_rooms,
    time_limit_minutes, stage
  )
  values (
    auth.uid(), p_topic, p_total_students, p_group_size, v_num_rooms,
    p_time_limit_minutes, 'waiting'
  )
  returning id into v_session_id;

  -- 모둠 N개 생성 (정원 균등 분배)
  v_remaining := p_total_students;
  for v_idx in 1..v_num_rooms loop
    v_capacity := least(
      p_group_size,
      ceil(v_remaining::numeric / (v_num_rooms - v_idx + 1))::int
    );

    v_code := public.generate_room_code();

    insert into public.rooms (
      session_id, room_code, topic, teacher_id,
      stage, time_limit_minutes,
      min_participants, max_participants
    )
    values (
      v_session_id, v_code, p_topic, auth.uid(),
      'waiting', p_time_limit_minutes,
      2, v_capacity
    )
    returning id into v_room_id;

    v_rooms := v_rooms || jsonb_build_object(
      'room_id', v_room_id,
      'room_code', v_code,
      'room_index', v_idx,
      'capacity', v_capacity
    );

    v_remaining := v_remaining - v_capacity;
  end loop;

  return jsonb_build_object(
    'session_id', v_session_id,
    'num_rooms', v_num_rooms,
    'rooms', v_rooms
  );
end;
$$;

grant execute on function public.create_session_with_rooms(text, int, int, int) to authenticated;

-- 스키마 캐시 강제 재로딩
notify pgrst, 'reload schema';
