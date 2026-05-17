-- ============================================================================
-- 시드: 샘플 토의 주제 3개 (plan.md §4.1.19)
--
-- 주의: 교사 계정으로 SQL Editor에서 직접 실행하거나, 운영 시에는
-- 별도 admin RPC로 제공. 여기 SQL은 임의 teacher_id를 받아 사용.
--
-- 사용법:
--   1. teacher_id를 본인 교사 계정 UUID로 교체
--      예: select id from auth.users where email = 'teacher@email.com';
--   2. 실행하면 3개 sessions + 모둠들이 자동 생성됨
-- ============================================================================

-- 본인 교사 UUID 확인용
-- select id, email from auth.users where raw_user_meta_data->>'role' = 'teacher';

-- 아래 변수에 본인 교사 UUID 넣고 실행:
do $$
declare
  v_teacher_id uuid := 'PASTE-TEACHER-UUID-HERE'; -- ← 교체
  v_topic_korean text := '학교 점심 시간을 30분 더 늘려야 할까?';
  v_topic_social text := '교실에 CCTV를 설치하는 것은 학생 인권 침해일까?';
  v_topic_free text := '청소년이 정치 토론에 참여할 수 있도록 투표 가능 연령을 낮춰야 할까?';
begin
  if v_teacher_id::text = 'PASTE-TEACHER-UUID-HERE' then
    raise notice '먼저 v_teacher_id를 본인 교사 UUID로 교체하세요.';
    return;
  end if;

  -- 1) 국어 토의 시나리오
  perform public.create_session_with_rooms(
    p_topic := v_topic_korean,
    p_total_students := 24,
    p_group_size := 4,
    p_time_limit_minutes := 30
  );

  -- 2) 사회 쟁점 시나리오
  perform public.create_session_with_rooms(
    p_topic := v_topic_social,
    p_total_students := 28,
    p_group_size := 4,
    p_time_limit_minutes := 40
  );

  -- 3) 자유 시나리오
  perform public.create_session_with_rooms(
    p_topic := v_topic_free,
    p_total_students := 25,
    p_group_size := 5,
    p_time_limit_minutes := 35
  );

  raise notice '3개 샘플 세션이 만들어졌어요. /teacher 대시보드에서 확인하세요.';
end $$;
