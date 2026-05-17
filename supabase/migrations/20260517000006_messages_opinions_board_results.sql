-- ============================================================================
-- 마이그레이션 #6: 2주차 실시간 협업용 테이블 4종
--
-- 참조: research.md §9.4, plan.md §2.1.1
--
-- 추가 테이블:
--   1. messages           — 채팅 메시지 (team / personal 채널)
--   2. opinions           — 학생 의견 카드 (의견 + 근거)
--   3. board_items        — 공동 보드 4섹션 (비교/기준/쟁점/대표의견 후보)
--   4. consensus_results  — 모둠 최종 제출 결과
--
-- RLS는 #5의 SECURITY DEFINER 헬퍼(is_participant_of_room, is_teacher_of_room)
-- 사용하여 자기참조 트랩 회피.
-- ============================================================================

-- ============================================================================
-- 1. messages
-- ============================================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  channel text not null default 'team', -- 'team' or 'personal:{participant_id}'
  author_id uuid references auth.users(id) on delete set null,
  author_nickname text,                 -- denormalized for read perf
  content text not null check (length(content) between 1 and 2000),
  message_type text not null default 'utterance' check (
    message_type in ('utterance', 'ai_facilitation', 'ai_coaching', 'system')
  ),
  created_at timestamptz not null default now()
);

create index if not exists messages_room_channel_idx
  on public.messages(room_id, channel, created_at desc);

alter table public.messages enable row level security;

-- 학생: 본인 참여 모둠의 team 채널만 read (개인 채널은 4주차)
drop policy if exists "messages team read" on public.messages;
create policy "messages team read"
  on public.messages for select
  to authenticated
  using (
    channel = 'team'
    and (
      public.is_participant_of_room(messages.room_id)
      or public.is_teacher_of_room(messages.room_id)
    )
  );

-- 본인만 insert (utterance만 — AI 메시지는 service role)
drop policy if exists "messages student insert" on public.messages;
create policy "messages student insert"
  on public.messages for insert
  to authenticated
  with check (
    channel = 'team'
    and message_type = 'utterance'
    and author_id = auth.uid()
    and public.is_participant_of_room(messages.room_id)
  );

-- ============================================================================
-- 2. opinions
-- ============================================================================
create table if not exists public.opinions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_nickname text not null,
  content text not null check (length(content) between 1 and 1000),
  evidence text check (length(evidence) <= 1000),
  shared_from_personal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opinions_room_idx
  on public.opinions(room_id, created_at desc);

alter table public.opinions enable row level security;

drop policy if exists "opinions read same room" on public.opinions;
create policy "opinions read same room"
  on public.opinions for select
  to authenticated
  using (
    public.is_participant_of_room(opinions.room_id)
    or public.is_teacher_of_room(opinions.room_id)
  );

drop policy if exists "opinions insert own" on public.opinions;
create policy "opinions insert own"
  on public.opinions for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.is_participant_of_room(opinions.room_id)
  );

drop policy if exists "opinions update own" on public.opinions;
create policy "opinions update own"
  on public.opinions for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists "opinions delete own" on public.opinions;
create policy "opinions delete own"
  on public.opinions for delete
  to authenticated
  using (author_id = auth.uid());

drop trigger if exists opinions_touch_updated_at on public.opinions;
create trigger opinions_touch_updated_at
  before update on public.opinions
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- 3. board_items
--    공동 보드의 셀 단위. type별로 여러 row 가능 (예: 쟁점 여러 개).
-- ============================================================================
create table if not exists public.board_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  type text not null check (
    type in ('compare', 'criteria', 'issue', 'representative')
  ),
  position int not null default 0,
  content text not null default '' check (length(content) <= 2000),
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_nickname text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists board_items_room_type_idx
  on public.board_items(room_id, type, position);

alter table public.board_items enable row level security;

drop policy if exists "board_items read same room" on public.board_items;
create policy "board_items read same room"
  on public.board_items for select
  to authenticated
  using (
    public.is_participant_of_room(board_items.room_id)
    or public.is_teacher_of_room(board_items.room_id)
  );

drop policy if exists "board_items participant write" on public.board_items;
create policy "board_items participant write"
  on public.board_items for all
  to authenticated
  using (
    public.is_participant_of_room(board_items.room_id)
  )
  with check (
    public.is_participant_of_room(board_items.room_id)
  );

drop trigger if exists board_items_touch_updated_at on public.board_items;
create trigger board_items_touch_updated_at
  before update on public.board_items
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- 4. consensus_results — 모둠 최종 제출 (모둠당 1개)
-- ============================================================================
create table if not exists public.consensus_results (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade unique,
  session_id uuid not null references public.sessions(id) on delete cascade,
  representative_opinion text not null check (length(representative_opinion) between 1 and 2000),
  reason text check (length(reason) <= 2000),
  improvements text check (length(improvements) <= 2000),
  action_plan text check (length(action_plan) <= 2000),
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now()
);

create index if not exists consensus_results_session_idx
  on public.consensus_results(session_id, submitted_at desc);

alter table public.consensus_results enable row level security;

drop policy if exists "consensus read same room" on public.consensus_results;
create policy "consensus read same room"
  on public.consensus_results for select
  to authenticated
  using (
    public.is_participant_of_room(consensus_results.room_id)
    or public.is_teacher_of_room(consensus_results.room_id)
    or public.is_teacher_of_session(consensus_results.session_id)
  );

drop policy if exists "consensus participant write" on public.consensus_results;
create policy "consensus participant write"
  on public.consensus_results for all
  to authenticated
  using (
    public.is_participant_of_room(consensus_results.room_id)
  )
  with check (
    public.is_participant_of_room(consensus_results.room_id)
  );

-- ============================================================================
-- 5. Realtime publication
-- ============================================================================
do $$
declare
  t text;
begin
  for t in select unnest(array['messages', 'opinions', 'board_items', 'consensus_results']) loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
