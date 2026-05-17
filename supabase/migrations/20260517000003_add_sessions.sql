-- ============================================================================
-- 마이그레이션 #3: Session(수업) 개념 도입 + 모둠 일괄 생성
--
-- 동기:
--   한 반 20-30명·여러 반 운영하는 교사가 매번 모둠 단위 방을 수동 생성하는
--   불편을 해소. 한 수업(Session)을 만들면 모둠(Room) 여러 개가 자동 생성됨.
--
-- 변경:
--   1. sessions 테이블 신규 (한 수업 = 한 차시 토의 활동)
--   2. rooms.session_id 컬럼 추가 (모든 room은 session에 속함)
--   3. 기존 rooms 데이터: room별 legacy session 1개씩 자동 생성하여 연결
--   4. RPC create_session_with_rooms(주제, 총인원, 모둠당인원, 시간)
-- ============================================================================

-- ============================================================================
-- 1. sessions 테이블
-- ============================================================================
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  topic text not null check (length(topic) between 5 and 200),
  total_students int not null check (total_students between 2 and 150),
  group_size int not null default 5 check (group_size between 2 and 5),
  num_rooms int not null check (num_rooms >= 1),
  time_limit_minutes int default 30,
  stage text not null default 'waiting' check (
    stage in ('waiting', 'active', 'closed')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sessions_teacher_id_idx on public.sessions(teacher_id);

alter table public.sessions enable row level security;

drop trigger if exists sessions_touch_updated_at on public.sessions;
create trigger sessions_touch_updated_at
  before update on public.sessions
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- 2. rooms.session_id 컬럼 추가 (NULLABLE로 일단)
-- ============================================================================
alter table public.rooms
  add column if not exists session_id uuid references public.sessions(id) on delete cascade;

create index if not exists rooms_session_id_idx on public.rooms(session_id);

-- ============================================================================
-- 3. 기존 rooms 데이터 마이그레이션 — 각 room마다 legacy session 1개씩 생성
-- ============================================================================
do $$
declare
  r record;
  v_session_id uuid;
begin
  for r in select * from public.rooms where session_id is null loop
    insert into public.sessions (
      teacher_id, topic, total_students, group_size, num_rooms,
      time_limit_minutes, stage
    )
    values (
      r.teacher_id,
      r.topic,
      r.max_participants,
      r.max_participants,
      1,  -- legacy session은 모둠 1개
      r.time_limit_minutes,
      case
        when r.stage = 'closed' then 'closed'
        when r.stage in ('waiting', 'intro') then 'waiting'
        else 'active'
      end
    )
    returning id into v_session_id;

    update public.rooms set session_id = v_session_id where id = r.id;
  end loop;
end $$;

-- ============================================================================
-- 4. session_id NOT NULL 적용 (마이그레이션 후)
-- ============================================================================
alter table public.rooms alter column session_id set not null;

-- ============================================================================
-- 5. sessions RLS 정책
-- ============================================================================

-- 교사: 본인 세션 전체 권한
drop policy if exists "teachers manage own sessions" on public.sessions;
create policy "teachers manage own sessions"
  on public.sessions for all
  to authenticated
  using (
    public.current_user_role() = 'teacher'
    and teacher_id = auth.uid()
  )
  with check (
    public.current_user_role() = 'teacher'
    and teacher_id = auth.uid()
  );

-- 학생: 본인 모둠의 session만 read
drop policy if exists "students read own session" on public.sessions;
create policy "students read own session"
  on public.sessions for select
  to authenticated
  using (
    exists (
      select 1 from public.rooms r
      join public.participants p on p.room_id = r.id
      where r.session_id = sessions.id
        and p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. RPC — 세션 + 모둠 일괄 생성
-- ============================================================================
create or replace function public.create_session_with_rooms(
  p_topic text,
  p_total_students int,
  p_group_size int default 5,
  p_time_limit_minutes int default 30
)
returns table (
  session_id uuid,
  room_id uuid,
  room_code text,
  room_index int,
  capacity int
)
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
  v_room_code text;
  v_room_id uuid;
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

  -- 모둠 수 계산 (올림)
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

  -- 모둠 N개 생성 (각 모둠 정원 균등 분배)
  v_remaining := p_total_students;
  for v_idx in 1..v_num_rooms loop
    -- 남은 인원을 남은 모둠 수로 나눈 ceiling
    v_capacity := least(p_group_size, ceil(v_remaining::numeric / (v_num_rooms - v_idx + 1))::int);

    -- 고유 코드 생성
    v_room_code := public.generate_room_code();

    insert into public.rooms (
      session_id, room_code, topic, teacher_id,
      stage, time_limit_minutes,
      min_participants, max_participants
    )
    values (
      v_session_id, v_room_code, p_topic, auth.uid(),
      'waiting', p_time_limit_minutes,
      2, v_capacity
    )
    returning id into v_room_id;

    -- 반환 row
    session_id := v_session_id;
    room_id := v_room_id;
    room_code := v_room_code;
    room_index := v_idx;
    capacity := v_capacity;
    return next;

    v_remaining := v_remaining - v_capacity;
  end loop;

  return;
end;
$$;

grant execute on function public.create_session_with_rooms(text, int, int, int) to authenticated;

-- ============================================================================
-- 7. Realtime publication에 sessions 추가
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sessions'
  ) then
    alter publication supabase_realtime add table public.sessions;
  end if;
end $$;
