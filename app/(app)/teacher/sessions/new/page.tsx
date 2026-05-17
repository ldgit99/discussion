import { NewSessionForm } from './new-session-form';

export default function NewSessionPage() {
  return (
    <main className="px-6 lg:px-8 py-8 max-w-2xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-neutral-900">새 수업 만들기</h1>
        <p className="text-sm text-neutral-600">
          학생 인원을 알려주면 모둠 코드를 자동으로 나눠 만들어줘요.
        </p>
      </header>

      <NewSessionForm />
    </main>
  );
}
