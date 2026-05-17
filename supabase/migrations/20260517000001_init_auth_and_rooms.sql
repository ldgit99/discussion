-- ============================================================================
-- 마이그레이션 #1: 인증 + 방 + 참여자 + 개인 채팅 동의
-- 참조: research.md §9.4, §9.6 / supabase-schema-patterns SKILL.md
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. 확장
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. role 부여 강제 트리거 (research.md §9.6.4)
--    회원가입 직후 student 기본값 강제. 'teacher'는 별도 RPC로만 승격 가능.
-- ----------------------------------------------------------------------------
create or replace function public.enforce_role_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- raw_user_meta_data가 비어있거나 role이 invalid면 student로 강제
  if new.raw_user_meta_data is null
     or not (new.raw_user_meta_data ? 'role')
     or (new.raw_user_meta_data ->> 'role') not in ('teacher', 'student') then
    new.raw_user_meta_data = coalesce(new.raw_user_meta_data, '{}'::jsonb)
                             || jsonb_build_object('role', 'student');
  end if;

  -- 학생이 'teacher' 자가 지정 차단: 가입 시 teacher 시도 → student로 강제
  -- (실제 teacher 승격은 admin RPC `promote_to_teacher`로만)
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

-- ----------------------------------------------------------------------------
-- 2. helper: 현재 사용자 role 추출 (RLS에서 재사용)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 3. rooms — 토의방
-- ----------------------------------------------------------------------------
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

create index if not exists rooms_teacher_id_idx on public.rooms(teacher_id);
create index if not exists rooms_room_code_idx on public.rooms(room_code);

alter table public.rooms enable row level security;

-- 교사: 본인 방 모두 read/write
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

-- 학생: 참가 중인 방만 read
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

-- 학생: 방 코드로 1회 read (입장 전 검증용)
-- 별도 RPC `validate_room_code(code text)`로 처리 (아래 정의)

-- ----------------------------------------------------------------------------
-- 4. participants — 모둠 참여자
-- ----------------------------------------------------------------------------
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

create index if not exists participants_room_id_idx on public.participants(room_id);
create index if not exists participants_user_id_idx on public.participants(user_id);

alter table public.participants enable row level security;

-- 같은 모둠 구성원끼리 + 담당 교사 read
drop policy if exists "participants read same room" on public.participants;
create policy "participants read same room"
  on public.participants for select
  to authenticated
  using (
    -- 본인 참여 모둠
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

-- 학생 insert: 본인 user_id만 + 모둠 정원 미만
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

-- 본인 update: 닉네임만 변경 가능 (turn_order는 시스템 부여)
drop policy if exists "users update own nickname" on public.participants;
create policy "users update own nickname"
  on public.participants for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 교사 delete: 본인 모둠 학생 강퇴 가능
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

-- ----------------------------------------------------------------------------
-- 5. personal_chat_consent — 개인 채팅 교사 열람 동의
--    research.md §3 채팅 모드 / C3 채널 격리
-- ----------------------------------------------------------------------------
create table if not exists public.personal_chat_consent (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  teacher_view_allowed boolean not null default false,
  consented_at timestamptz not null default now(),
  unique (participant_id)
);

create index if not exists personal_chat_consent_room_id_idx
  on public.personal_chat_consent(room_id);

alter table public.personal_chat_consent enable row level security;

-- 본인 read + 담당 교사 read
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

-- 본인만 insert/update
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

-- ----------------------------------------------------------------------------
-- 6. RPC — 방 코드로 방 정보 조회 (학생 입장 전 검증용)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 7. RPC — 방 코드 생성 헬퍼 (교사가 방 만들 때 사용)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 8. updated_at 자동 갱신 트리거
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 9. Realtime publication (마이그레이션 #2에서 messages 등 추가됨)
-- ----------------------------------------------------------------------------
-- participants는 입장/퇴장 모니터링용
alter publication supabase_realtime add table public.participants;
alter publication supabase_realtime add table public.rooms;
