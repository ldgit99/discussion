import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: '토론모임 — 함께 생각하고 결정해요',
  description: '중학생을 위한 AI 기반 공동 토의 지원 서비스',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        {children}
        <Toaster position="top-center" richColors closeButton duration={4000} />
      </body>
    </html>
  );
}
