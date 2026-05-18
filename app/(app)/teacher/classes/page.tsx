import Link from 'next/link';
import { Plus, GraduationCap, Users, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function ClassesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: classes } = await supabase
    .from('classes')
    .select('id, grade, class_num, label, name, created_at')
    .eq('teacher_id', user!.id)
    .order('grade', { ascending: true })
    .order('class_num', { ascending: true });

  const classIds =
    ((classes as { id: string }[]) ?? []).map((c) => c.id);

  // 학급별 명단 수 + 발급 수
  const rosterCount = new Map<string, { total: number; issued: number }>();
  if (classIds.length > 0) {
    const { data: roster } = await supabase
      .from('roster_students')
      .select('class_id, user_id')
      .in('class_id', classIds);
    (roster ?? []).forEach((r) => {
      const row = r as { class_id: string; user_id: string | null };
      const cur = rosterCount.get(row.class_id) ?? { total: 0, issued: 0 };
      cur.total += 1;
      if (row.user_id) cur.issued += 1;
      rosterCount.set(row.class_id, cur);
    });
  }

  return (
    <main className="px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/teacher">
          <ArrowLeft className="h-4 w-4" />
          대시보드로
        </Link>
      </Button>

      <header className="flex items-end justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-neutral-900">학급 명단</h1>
          <p className="text-sm text-neutral-600">
            반별 학생 명단을 등록하고 계정을 일괄로 발급할 수 있어요. 이메일 인증 없이 즉시 로그인.
          </p>
        </div>
        <Button asChild>
          <Link href="/teacher/classes/new">
            <Plus className="h-5 w-5" />
            새 학급
          </Link>
        </Button>
      </header>

      {(classes?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-brand-600" />
            </div>
            <p className="text-base text-neutral-600 text-center max-w-sm">
              학급을 등록하면 학생 명단을 관리하고 계정을 일괄 발급할 수 있어요.
            </p>
            <Button asChild size="lg">
              <Link href="/teacher/classes/new">첫 학급 만들기</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(classes ?? []).map((c) => {
            const cls = c as {
              id: string;
              grade: number;
              class_num: number;
              label: string;
              name: string | null;
            };
            const count = rosterCount.get(cls.id) ?? { total: 0, issued: 0 };
            return (
              <Card key={cls.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-xl font-bold text-neutral-900">{cls.label}반</h3>
                    {count.total > 0 && (
                      <Badge variant={count.issued === count.total ? 'success' : 'muted'}>
                        {count.issued}/{count.total} 발급
                      </Badge>
                    )}
                  </div>
                  {cls.name && (
                    <p className="text-sm text-neutral-600">{cls.name}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-neutral-600">
                    <Users className="h-4 w-4" />
                    학생 {count.total}명
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/teacher/classes/${cls.id}`}>명단 관리</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
