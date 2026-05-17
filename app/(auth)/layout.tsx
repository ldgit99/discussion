// 인증 레이아웃 — 중앙 정렬, 페이지 배경 neutral-50 (design.md §13.1)
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[420px]">{children}</div>
    </main>
  );
}
