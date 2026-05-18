import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 학급 명단 학생들에게 계정 일괄 발급.
 * 이미 user_id가 있는 row는 skip. 새로 만들 학생만 처리.
 *
 * 발급 정책:
 *   - email: `s{grade}{class_num}{student_num}@discussion-class.local` (예: s3115)
 *   - password: 6자리 영숫자 랜덤 (혼동 글자 제외)
 *   - email_confirm: true (사전 인증 처리)
 *   - user_metadata: role='student', class_num, student_num, name, nickname
 */

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // O,I,L,0,1 제외

function genPassword(length = 6): string {
  let p = '';
  for (let i = 0; i < length; i++) {
    p += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return p;
}

function emailFor(grade: number, classNum: number, studentNum: number): string {
  return `s${grade}${pad2(classNum)}${pad2(studentNum)}@discussion-class.local`;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

export type IssueResult = {
  student_num: number;
  name: string;
  email: string;
  password: string | null; // 신규 발급된 경우만 노출
  status: 'created' | 'already_issued' | 'failed';
  error?: string;
};

export async function issueAccountsForClass(opts: {
  classId: string;
  grade: number;
  classNum: number;
}): Promise<IssueResult[]> {
  const admin = createAdminClient();

  // 해당 학급의 학생 명단
  const { data: roster } = await admin
    .from('roster_students')
    .select('*')
    .eq('class_id', opts.classId)
    .order('student_num', { ascending: true });

  const results: IssueResult[] = [];

  for (const r of (roster ?? []) as Array<{
    id: string;
    student_num: number;
    name: string;
    user_id: string | null;
  }>) {
    // 이미 발급됐으면 skip
    if (r.user_id) {
      results.push({
        student_num: r.student_num,
        name: r.name,
        email: emailFor(opts.grade, opts.classNum, r.student_num),
        password: null,
        status: 'already_issued',
      });
      continue;
    }

    const email = emailFor(opts.grade, opts.classNum, r.student_num);
    const password = genPassword(6);
    const nickname = `${opts.grade}-${opts.classNum}-${r.name}`;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'student',
        class_num: opts.classNum,
        grade: opts.grade,
        student_num: r.student_num,
        name: r.name,
        nickname,
        verified_teacher: 'false',
      },
    });

    if (createError || !created.user) {
      results.push({
        student_num: r.student_num,
        name: r.name,
        email,
        password: null,
        status: 'failed',
        error: createError?.message ?? 'unknown',
      });
      continue;
    }

    // roster_students 갱신 (user_id, generated_email, account_issued_at)
    await admin
      .from('roster_students')
      .update({
        user_id: created.user.id,
        generated_email: email,
        account_issued_at: new Date().toISOString(),
      })
      .eq('id', r.id);

    results.push({
      student_num: r.student_num,
      name: r.name,
      email,
      password,
      status: 'created',
    });
  }

  return results;
}
