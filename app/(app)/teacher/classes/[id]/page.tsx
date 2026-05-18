import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RosterEditor } from './roster-editor';

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: cls } = await supabase
    .from('classes')
    .select('id, grade, class_num, label, name')
    .eq('id', id)
    .eq('teacher_id', user!.id)
    .maybeSingle();

  if (!cls) notFound();

  const { data: roster } = await supabase
    .from('roster_students')
    .select('id, student_num, name, user_id, generated_email, account_issued_at')
    .eq('class_id', id)
    .order('student_num', { ascending: true });

  const meta = cls as { id: string; grade: number; class_num: number; label: string; name: string | null };

  return (
    <main className="px-6 lg:px-8 py-8 max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/teacher/classes">
          <ArrowLeft className="h-4 w-4" />
          학급 목록으로
        </Link>
      </Button>

      <header className="space-y-2">
        <div className="flex items-baseline gap-3">
          <h1 className="text-3xl font-bold text-neutral-900">{meta.label}반</h1>
          {meta.name && <Badge variant="muted">{meta.name}</Badge>}
        </div>
        <p className="text-sm text-neutral-600">
          학생 명단을 추가하고 [계정 일괄 발급]을 누르면 학생들이 받을 ID·비번이 만들어져요.
          이메일 인증은 불필요합니다.
        </p>
      </header>

      <RosterEditor
        classId={meta.id}
        grade={meta.grade}
        classNum={meta.class_num}
        initialRoster={
          (roster ?? []).map((r) => {
            const row = r as {
              id: string;
              student_num: number;
              name: string;
              user_id: string | null;
              generated_email: string | null;
              account_issued_at: string | null;
            };
            return row;
          })
        }
      />
    </main>
  );
}
