import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { issueAccountsForClass } from '@/lib/students/issue';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  // 본인 학급인지 확인
  const { data: cls } = await supabase
    .from('classes')
    .select('id, teacher_id, grade, class_num')
    .eq('id', classId)
    .eq('teacher_id', user.id)
    .maybeSingle();

  if (!cls) return NextResponse.json({ error: 'class_not_found' }, { status: 404 });

  const meta = cls as { grade: number; class_num: number };
  const results = await issueAccountsForClass({
    classId,
    grade: meta.grade,
    classNum: meta.class_num,
  });

  return NextResponse.json({ results });
}
