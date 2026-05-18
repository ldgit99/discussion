import { NewClassForm } from './new-class-form';

export default function NewClassPage() {
  return (
    <main className="px-6 lg:px-8 py-8 max-w-2xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-neutral-900">새 학급 만들기</h1>
        <p className="text-sm text-neutral-600">
          학년·반을 정하면 명단을 등록하고 계정을 일괄 발급할 수 있어요.
        </p>
      </header>

      <NewClassForm />
    </main>
  );
}
