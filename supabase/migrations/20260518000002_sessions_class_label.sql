-- ============================================================================
-- 마이그레이션 #10: sessions에 class_label(반 식별자) + RPC 갱신
--
-- 동기: 같은 교사가 여러 반을 가르칠 때 수업을 반별로 그룹핑하기 위함.
-- 형식: '학년-반' (예: '3-1', '2-7'). null이면 "반 미지정".
-- ============================================================================

-- 컬럼 추가
alter table public.sessions
  add column if not exists class_label text;

create index if not exists sessions_teacher_class_idx
  on public.sessions(teacher_id, class_label, created_at desc);

-- RPC 갱신: p_class_label 파라미터 추가 (선택)
-- 기존 시그니처를 바꾸지 않고 default null로 추가하면 클라이언트 호환성 유지
drop function if exists public.create_session_with_rooms(text, int, int, int);

create or replace function public.create_session_with_rooms(
  p_topic text,
  p_total_students int,
  p_group_size int default 5,
  p_time_limit_minutes int default 30,
  p_class_label text default null
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
  if public.current_user_role() <> 'teacher' then
    raise exception 'only teachers can create sessions';
  end if;

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

  insert into public.sessions (
    teacher_id, topic, total_students, group_size, num_rooms,
    time_limit_minutes, stage, class_label
  )
  values (
    auth.uid(), p_topic, p_total_students, p_group_size, v_num_rooms,
    p_time_limit_minutes, 'waiting',
    nullif(trim(p_class_label), '')
  )
  returning id into v_session_id;

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

grant execute on function public.create_session_with_rooms(text, int, int, int, text) to authenticated;

notify pgrst, 'reload schema';
