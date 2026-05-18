'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2, Plus, KeyRound, Download, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type RosterRow = {
  id: string;
  student_num: number;
  name: string;
  user_id: string | null;
  generated_email: string | null;
  account_issued_at: string | null;
};

type IssueResult = {
  student_num: number;
  name: string;
  email: string;
  password: string | null;
  status: 'created' | 'already_issued' | 'failed';
  error?: string;
};

type Props = {
  classId: string;
  grade: number;
  classNum: number;
  initialRoster: RosterRow[];
};

export function RosterEditor({ classId, grade, classNum, initialRoster }: Props) {
  const router = useRouter();
  const [roster, setRoster] = useState<RosterRow[]>(initialRoster);
  const [num, setNum] = useState<number | ''>('');
  const [name, setName] = useState('');
  const [isPending, startTransition] = useTransition();
  const [issuing, setIssuing] = useState(false);
  const [issueResults, setIssueResults] = useState<IssueResult[] | null>(null);
  const [bulkText, setBulkText] = useState('');

  async function addStudent() {
    const n = typeof num === 'number' ? num : Number(num);
    const cleanName = name.trim();
    if (!n || n < 1 || n > 50) {
      toast.error('번호는 1-50 사이로 입력해주세요.');
      return;
    }
    if (!cleanName) {
      toast.error('이름을 입력해주세요.');
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('roster_students')
        .insert({ class_id: classId, student_num: n, name: cleanName })
        .select('id, student_num, name, user_id, generated_email, account_issued_at')
        .single();
      if (error) {
        if (error.code === '23505') {
          toast.error(`이미 ${n}번이 등록돼 있어요.`);
        } else {
          toast.error('추가에 실패했어요.');
        }
        return;
      }
      setRoster((prev) => [...prev, data as RosterRow].sort((a, b) => a.student_num - b.student_num));
      setNum('');
      setName('');
    });
  }

  async function deleteStudent(id: string) {
    if (!confirm('이 학생을 명단에서 제거할까요?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('roster_students').delete().eq('id', id);
    if (error) {
      toast.error('삭제에 실패했어요.');
      return;
    }
    setRoster((prev) => prev.filter((r) => r.id !== id));
  }

  async function bulkAdd() {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const rows: { class_id: string; student_num: number; name: string }[] = [];
    for (const line of lines) {
      // 형식 가정: "1 김지혜" 또는 "1,김지혜" 또는 "1\t김지혜"
      const m = line.match(/^(\d+)[\s,\t]+(.+)$/);
      if (!m) continue;
      const n = Number(m[1]);
      const nm = m[2].trim();
      if (n < 1 || n > 50 || !nm) continue;
      rows.push({ class_id: classId, student_num: n, name: nm });
    }
    if (rows.length === 0) {
      toast.error('형식이 맞는 줄이 없어요. "1 김지혜" 같은 형식이어야 해요.');
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('roster_students')
        .insert(rows)
        .select('id, student_num, name, user_id, generated_email, account_issued_at');
      if (error) {
        toast.error('일부 학생이 추가되지 않았어요. 중복 번호가 있는지 확인해주세요.');
        return;
      }
      setRoster((prev) =>
        [...prev, ...((data ?? []) as RosterRow[])].sort(
          (a, b) => a.student_num - b.student_num
        )
      );
      setBulkText('');
      toast.success(`${(data ?? []).length}명 추가됨.`);
    });
  }

  async function issueAccounts() {
    if (roster.length === 0) {
      toast.error('학생 명단을 먼저 추가해주세요.');
      return;
    }
    if (!confirm(`${roster.length}명에게 계정을 발급할까요? 이미 발급된 학생은 건너뜁니다.`)) return;

    setIssuing(true);
    try {
      const res = await fetch(`/api/teacher/classes/${classId}/issue`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(`발급 실패: ${data.error ?? '알 수 없는 오류'}`);
        return;
      }
      const { results } = (await res.json()) as { results: IssueResult[] };
      setIssueResults(results);
      router.refresh(); // roster_students 갱신 반영
      const created = results.filter((r) => r.status === 'created').length;
      toast.success(`${created}명 계정 발급 완료.`);
    } finally {
      setIssuing(false);
    }
  }

  function downloadCsv() {
    if (!issueResults || issueResults.length === 0) return;
    const header = ['번호', '이름', '아이디(이메일)', '비밀번호', '상태'];
    const rows = issueResults.map((r) => [
      r.student_num.toString(),
      r.name,
      r.email,
      r.password ?? '(기존 발급)',
      r.status === 'created' ? '신규' : r.status === 'already_issued' ? '기존' : '실패',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((c) => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${grade}-${classNum}반_계정.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const allIssued = roster.length > 0 && roster.every((r) => r.user_id);

  return (
    <div className="space-y-6">
      {/* 명단 입력 */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900">학생 추가</h2>

          <div className="flex gap-2 items-end">
            <div className="space-y-1 w-24">
              <label className="text-xs text-neutral-600">번호</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={num}
                onChange={(e) => setNum(e.target.value ? Number(e.target.value) : '')}
                placeholder="1"
              />
            </div>
            <div className="space-y-1 flex-1">
              <label className="text-xs text-neutral-600">이름</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="김지혜"
                maxLength={20}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addStudent();
                  }
                }}
              />
            </div>
            <Button onClick={addStudent} disabled={isPending}>
              <Plus className="h-4 w-4" />
              추가
            </Button>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-brand-600 hover:underline">
              여러 명 한 번에 붙여넣기
            </summary>
            <div className="mt-2 space-y-2">
              <p className="text-xs text-neutral-600">
                "번호 이름" 한 줄씩 (구분자: 공백·콤마·탭). 예:
              </p>
              <pre className="text-2xs bg-neutral-50 p-2 rounded">
{`1 김지혜
2 이민재
3 박소연`}
              </pre>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                placeholder="1 김지혜&#10;2 이민재"
              />
              <Button size="sm" variant="outline" onClick={bulkAdd} disabled={isPending || !bulkText.trim()}>
                일괄 추가
              </Button>
            </div>
          </details>
        </CardContent>
      </Card>

      {/* 명단 + 발급 */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">
              명단 ({roster.length}명)
            </h2>
            <Button
              onClick={issueAccounts}
              disabled={issuing || roster.length === 0 || allIssued}
              variant={allIssued ? 'outline' : 'default'}
            >
              <KeyRound className="h-4 w-4" />
              {issuing
                ? '발급 중…'
                : allIssued
                ? '모두 발급됨'
                : '계정 일괄 발급'}
            </Button>
          </div>

          {roster.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-6">
              위에서 학생을 추가해주세요.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {roster.map((r) => (
                <li key={r.id} className="py-2 flex items-center gap-3">
                  <span className="w-10 text-sm text-neutral-600 font-mono">
                    {r.student_num}번
                  </span>
                  <span className="flex-1 text-base text-neutral-900">{r.name}</span>
                  {r.user_id ? (
                    <Badge variant="success" className="gap-1 text-xs">
                      <CheckCircle2 className="h-3 w-3" />
                      발급됨
                    </Badge>
                  ) : (
                    <Badge variant="muted" className="text-xs">
                      미발급
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-neutral-400 hover:text-danger-500 hover:bg-danger-50"
                    onClick={() => deleteStudent(r.id)}
                    aria-label="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 발급 결과 — 1회 노출 */}
      {issueResults && issueResults.length > 0 && (
        <Card className="border-success-500">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-success-500">
                ⚠️ 발급된 ID·비번 (지금만 노출됩니다)
              </h2>
              <Button size="sm" variant="outline" onClick={downloadCsv}>
                <Download className="h-4 w-4" />
                CSV 다운로드
              </Button>
            </div>
            <p className="text-xs text-neutral-600">
              화면을 떠나면 비밀번호는 다시 볼 수 없어요. <strong>지금 CSV로 저장하거나 인쇄</strong>해주세요.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-neutral-600 border-b border-neutral-200">
                  <tr>
                    <th className="py-2 pr-3">번호</th>
                    <th className="py-2 pr-3">이름</th>
                    <th className="py-2 pr-3">아이디</th>
                    <th className="py-2 pr-3">비밀번호</th>
                    <th className="py-2 pr-3">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {issueResults.map((r) => (
                    <tr key={`${r.student_num}-${r.email}`} className="border-b border-neutral-100">
                      <td className="py-2 pr-3 font-mono text-neutral-600">{r.student_num}</td>
                      <td className="py-2 pr-3 text-neutral-800">{r.name}</td>
                      <td className="py-2 pr-3 font-mono text-xs text-neutral-700">{r.email}</td>
                      <td className="py-2 pr-3 font-mono text-base font-bold text-brand-600">
                        {r.password ?? '(기존)'}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge
                          variant={
                            r.status === 'created'
                              ? 'success'
                              : r.status === 'already_issued'
                              ? 'muted'
                              : 'danger'
                          }
                          className="text-2xs"
                        >
                          {r.status === 'created' ? '신규' : r.status === 'already_issued' ? '기존' : '실패'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
