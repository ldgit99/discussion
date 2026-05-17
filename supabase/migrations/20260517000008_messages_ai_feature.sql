-- ============================================================================
-- 마이그레이션 #8: messages에 AI 기능 식별자 추가
--
-- 동기: 3주차 AI 기능 5종이 messages 테이블에 message_type='ai_facilitation'
-- 으로 통합 저장됨. 어느 기능(summary/compare/evidence-check/consensus-aid/
-- facilitation)에서 만든 메시지인지 구분 필요.
--
-- 별도 ai_messages 테이블을 만들지 않은 이유:
--   채팅 timeline 조회 시 학생 발화 + AI 발화를 시간순으로 한 번에 정렬해야
--   하는데, 별도 테이블이면 UNION + sort 비용. message_type 컬럼으로 분기.
--
-- 참조: research.md §4.4 (8개 AI 기능), CLAUDE.md C2
-- ============================================================================

alter table public.messages
  add column if not exists ai_feature text check (
    ai_feature is null
    or ai_feature in (
      'facilitation', 'summary', 'compare', 'evidence_check',
      'question_gen', 'attitude_check', 'consensus_aid', 'coaching'
    )
  );

-- ai_feature 비어있을 수 있으니 인덱스는 부분 인덱스
create index if not exists messages_ai_feature_idx
  on public.messages(room_id, ai_feature, created_at desc)
  where ai_feature is not null;

notify pgrst, 'reload schema';
