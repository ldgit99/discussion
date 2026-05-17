import { redirect } from 'next/navigation';

// 단일 방 생성 흐름은 폐기. 새 흐름: /teacher/sessions/new (세션 + 모둠 일괄 생성).
export default function NewRoomRedirect() {
  redirect('/teacher/sessions/new');
}
