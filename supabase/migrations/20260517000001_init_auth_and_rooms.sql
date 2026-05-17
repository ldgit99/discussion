-- ============================================================================
-- 마이그레이션 #1: 인증 + 방 + 참여자 + 개인 채팅 동의
-- 참조: research.md §9.4, §9.6 / supabase-schema-patterns SKILL.md
--
-- 순서 (중요): 정책이 다른 테이블을 참조하므로
--   1. 확장·트리거 함수 → 2. 모든 테이블 → 3. 인덱스 → 4. 정책
--   → 5. RPC → 6. updated_at 트리거 → 7. Realtime
-- ============================================================================

-- ============================================================================
-- 1. 확장
-- ============================================================================
create extension if not exists "pgcrypto";

-- ============================================================================
-- 2. role 부여 강제 트리거 (research.md §9.6.4)
-- ============================================================================
create or replace function public.enforce_role_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data is null
     or not (new.raw_user_meta_data ? 'role')
     or (new.raw_user_meta_data ->> 'role') not in ('teacher', 'student') then
    new.raw_user_meta_data = coalesce(new.raw_user_meta_data, '{}'::jsonb)
                             || jsonb_build_object('role', 'student');
  end if;

  -- 학생이 'teacher' 자가 지정 차단
  if (new.raw_user_meta_data ->> 'role') = 'teacher'
     and (new.raw_user_meta_data ->> 'verified_teacher') is distinct from 'true' then
    new.raw_user_meta_data = new.raw_user_meta_data
                             || jsonb_build_object('role', 'student');
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_role_on_signup_trigger on auth.users;
create trigger enforce_role_on_signup_trigger
  before insert on auth.users
  for each row execute function public.enforce_role_on_signup();

-- ============================================================================
-- 3. helper: 현재 사용자 role 추출 (RLS에서 재사용)
-- ============================================================================
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    (select raw_user_meta_data ->> 'role' from auth.users where id = auth.uid())
  );
$$;

-- ============================================================================
-- 4. 테이블 정의 (모든 테이블 먼저 생성)
-- ============================================================================

-- 4.1 rooms — 토의방
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique check (length(room_code) = 6),
  topic text not null,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  stage text not null default 'waiting' check (
    stage in ('waiting', 'intro', 'turn_taking', 'discussion', 'consensus', 'submitted', 'closed')
  ),
  time_limit_minutes int default 30,
  min_participants int not null default 2 check (min_participants >= 2),
  max_participants int not null default 5 check (max_participants <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.2 participants — 모둠 참여자
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  nickname text not null check (length(nickname) between 1 and 20),
  turn_order int,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id),
  unique (room_id, nickname)
);

-- 4.3 personal_chat_consent — 개인 채팅 교사 열람 동의
create table if not exists public.personal_chat_consent (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  teacher_view_allowed boolean not null default false,
  consented_at timestamptz not null default now(),
  unique (participant_id)
);

-- ============================================================================
-- 5. 인덱스
-- ============================================================================
create index if not exists rooms_teacher_id_idx on public.rooms(teacher_id);
create index if not exists rooms_room_code_idx on public.rooms(room_code);

create index if not exists participants_room_id_idx on public.participants(room_id);
create index if not exists participants_user_id_idx on public.participants(user_id);

create index if not exists personal_chat_consent_room_id_idx
  on public.personal_chat_consent(room_id);

-- ============================================================================
-- 6. RLS 활성화 (모든 테이블 일괄)
-- ============================================================================
alter table public.rooms enable row level security;
alter table public.participants enable row level security;
alter table public.personal_chat_consent enable row level security;

-- ============================================================================
-- 7. 정책 (모든 테이블 생성 후 일괄 — 상호 참조 안전)
-- ============================================================================

-- ---- rooms ----
drop policy if exists "teachers manage own rooms" on public.rooms;
create policy "teachers manage own rooms"
  on public.rooms for all
  to authenticated
  using (
    public.current_user_role() = 'teacher'
    and teacher_id = auth.uid()
  )
  with check (
    public.current_user_role() = 'teacher'
    and teacher_id = auth.uid()
  );

drop policy if exists "students read joined rooms" on public.rooms;
create policy "students read joined rooms"
  on public.rooms for select
  to authenticated
  using (
    exists (
      select 1 from public.participants p
      where p.room_id = rooms.id
        and p.user_id = auth.uid()
    )
  );

-- ---- participants ----
drop policy if exists "participants read same room" on public.participants;
create policy "participants read same room"
  on public.participants for select
  to authenticated
  using (
    -- 본인 참여 모둠 (self-referential 허용)
    exists (
      select 1 from public.participants p2
      where p2.room_id = participants.room_id
        and p2.user_id = auth.uid()
    )
    -- 또는 담당 교사
    or exists (
      select 1 from public.rooms r
      where r.id = participants.room_id
        and r.teacher_id = auth.uid()
    )
  );

drop policy if exists "students join room" on public.participants;
create policy "students join room"
  on public.participants for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.current_user_role() = 'student'
    and exists (
      select 1 from public.rooms r
      where r.id = participants.room_id
        and (
          select count(*) from public.participants p
          where p.room_id = r.id and p.role = 'student'
        ) < r.max_participants
    )
  );

drop policy if exists "users update own nickname" on public.participants;
create policy "users update own nickname"
  on public.participants for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "teachers remove participants" on public.participants;
create policy "teachers remove participants"
  on public.participants for delete
  to authenticated
  using (
    exists (
      select 1 from public.rooms r
      where r.id = participants.room_id
        and r.teacher_id = auth.uid()
    )
  );

-- ---- personal_chat_consent ----
drop policy if exists "consent read self or teacher" on public.personal_chat_consent;
create policy "consent read self or teacher"
  on public.personal_chat_consent for select
  to authenticated
  using (
    exists (
      select 1 from public.participants p
      where p.id = personal_chat_consent.participant_id
        and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.rooms r
      where r.id = personal_chat_consent.room_id
        and r.teacher_id = auth.uid()
    )
  );

drop policy if exists "consent self only write" on public.personal_chat_consent;
create policy "consent self only write"
  on public.personal_chat_consent for all
  to authenticated
  using (
    exists (
      select 1 from public.participants p
      where p.id = personal_chat_consent.participant_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.participants p
      where p.id = personal_chat_consent.participant_id
        and p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 8. RPC
-- ============================================================================

-- 8.1 방 코드로 방 정보 조회 (학생 입장 전 검증용)
create or replace function public.validate_room_code(p_code text)
returns table (
  id uuid,
  topic text,
  stage text,
  current_count int,
  max_participants int,
  joinable boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    r.id,
    r.topic,
    r.stage,
    (select count(*)::int from public.participants p
     where p.room_id = r.id and p.role = 'student'),
    r.max_participants,
    (
      r.stage in ('waiting', 'intro')
      and (select count(*) from public.participants p
           where p.room_id = r.id and p.role = 'student') < r.max_participants
    )
  from public.rooms r
  where r.room_code = upper(p_code)
  limit 1;
end;
$$;

grant execute on function public.validate_room_code(text) to authenticated, anon;

-- 8.2 방 코드 생성 헬퍼 (교사가 방 만들 때 사용)
create or replace function public.generate_room_code()
returns text
language plpgsql
as $$
declare
  v_code text;
  v_attempts int := 0;
begin
  loop
    -- 6자리 영숫자 (혼동 가능한 0, O, I, 1 제외)
    v_code := upper(
      substring(
        translate(
          encode(gen_random_bytes(6), 'base64'),
          '+/=OoIl01',
          ''
        ),
        1, 6
      )
    );
    exit when not exists (select 1 from public.rooms where room_code = v_code);
    v_attempts := v_attempts + 1;
    if v_attempts > 10 then
      raise exception 'failed to generate unique room code after 10 attempts';
    end if;
  end loop;
  return v_code;
end;
$$;

grant execute on function public.generate_room_code() to authenticated;

-- ============================================================================
-- 9. updated_at 자동 갱신 트리거
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rooms_touch_updated_at on public.rooms;
create trigger rooms_touch_updated_at
  before update on public.rooms
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- 10. Realtime publication (마이그레이션 #2에서 messages 등 추가됨)
-- ============================================================================
-- supabase_realtime publication에 이미 추가되어 있으면 에러 없이 통과하도록 처리
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'participants'
  ) then
    alter publication supabase_realtime add table public.participants;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
end $$;
