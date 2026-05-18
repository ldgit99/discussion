-- ============================================================================
-- 마이그레이션 #11: 학급 명단 관리 + 학생 일괄 계정 발급
--
-- 동기: 학생 이메일 인증 마찰 해소. 교사가 학급 명단을 등록하고 일괄로
-- 학생 계정을 생성. 학생은 발급된 ID·비번으로 즉시 로그인.
--
-- 테이블:
--   - classes: 학급 (학년·반·이름)
--   - roster_students: 학생 명단 + 발급된 계정 매핑
-- ============================================================================

-- ============================================================================
-- 1. classes
-- ============================================================================
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  grade int not null check (grade between 1 and 6),
  class_num int not null check (class_num between 1 and 20),
  label text generated always as (grade::text || '-' || class_num::text) stored,
  name text,
  created_at timestamptz not null default now(),
  unique (teacher_id, grade, class_num)
);

create index if not exists classes_teacher_id_idx on public.classes(teacher_id);

alter table public.classes enable row level security;

drop policy if exists "classes teacher all" on public.classes;
create policy "classes teacher all"
  on public.classes for all
  to authenticated
  using (
    public.current_user_role() = 'teacher'
    and teacher_id = auth.uid()
  )
  with check (
    public.current_user_role() = 'teacher'
    and teacher_id = auth.uid()
  );

-- ============================================================================
-- 2. roster_students
-- ============================================================================
create table if not exists public.roster_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_num int not null check (student_num between 1 and 50),
  name text not null check (length(name) between 1 and 20),
  user_id uuid references auth.users(id) on delete set null,
  generated_email text unique,
  account_issued_at timestamptz,
  created_at timestamptz not null default now(),
  unique (class_id, student_num)
);

create index if not exists roster_students_class_idx on public.roster_students(class_id);

alter table public.roster_students enable row level security;

-- 헬퍼: 현재 user가 특정 class의 담당 교사인지
create or replace function public.is_teacher_of_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.classes
    where id = p_class_id and teacher_id = auth.uid()
  );
$$;

grant execute on function public.is_teacher_of_class(uuid) to authenticated;

drop policy if exists "roster_students teacher all" on public.roster_students;
create policy "roster_students teacher all"
  on public.roster_students for all
  to authenticated
  using (public.is_teacher_of_class(roster_students.class_id))
  with check (public.is_teacher_of_class(roster_students.class_id));

-- ============================================================================
-- 3. Realtime publication (학급 명단 변화는 교사 화면용)
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'roster_students'
  ) then
    alter publication supabase_realtime add table public.roster_students;
  end if;
end $$;

notify pgrst, 'reload schema';
