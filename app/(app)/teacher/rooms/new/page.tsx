import { NewRoomForm } from './new-room-form';

export default function NewRoomPage() {
  return (
    <main className="px-6 lg:px-8 py-8 max-w-2xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-neutral-900">새 토의방 만들기</h1>
        <p className="text-sm text-neutral-600">
          토의 주제를 정하면 학생들이 입장할 수 있는 방 코드가 만들어져요.
        </p>
      </header>

      <NewRoomForm />
    </main>
  );
}
