-- ============================================================================
-- 마이그레이션 #1.1: generate_room_code 함수 결함 수정
--
-- 이전 구현 결함:
--   (1) base64 인코딩 후 혼동 글자 제거 시 6자 미만 가능 → CHECK 제약 위반
--   (2) security definer 없어 RLS로 타 교사 코드 미가시 → 충돌 위험
--
-- 수정:
--   - 고정 알파벳에서 정확히 6자 추출 (혼동 글자 O/0/I/L/1 제외)
--   - security definer 추가하여 전체 rooms 가시성 확보
-- ============================================================================

create or replace function public.generate_room_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  -- 31자 알파벳: A-Z(O, I 제외) + 2-9(0, 1 제외)
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_alpha_len int := length(v_alphabet);
  v_code text;
  v_attempts int := 0;
  i int;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(
        v_alphabet,
        1 + floor(random() * v_alpha_len)::int,
        1
      );
    end loop;

    exit when not exists (
      select 1 from public.rooms where room_code = v_code
    );

    v_attempts := v_attempts + 1;
    if v_attempts > 10 then
      raise exception 'failed to generate unique room code after 10 attempts';
    end if;
  end loop;

  return v_code;
end;
$$;

-- 권한 재부여 (create or replace는 grant를 유지하지만 명시적으로)
grant execute on function public.generate_room_code() to authenticated;
