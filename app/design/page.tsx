import { Sparkles, Users, User, Lock, MessageSquareQuote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// design.md §20 — 디자인 토큰 + 컴포넌트 갤러리 (검토 자동화)
export default function DesignPreviewPage() {
  return (
    <main className="min-h-screen bg-neutral-0 px-6 lg:px-8 py-8 max-w-6xl mx-auto space-y-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-neutral-900">디자인 미리보기</h1>
        <p className="text-base text-neutral-600">
          design.md 토큰·컴포넌트·발화자 위계를 한 화면에서 검증합니다.
        </p>
      </header>

      {/* 컬러 */}
      <Section title="컬러 시스템 (design.md §2)">
        <ColorGroup title="Brand" colors={[
          { name: '50', hex: '#EFF6FF', cls: 'bg-brand-50' },
          { name: '100', hex: '#DBEAFE', cls: 'bg-brand-100' },
          { name: '500', hex: '#3B82F6', cls: 'bg-brand-500' },
          { name: '600', hex: '#2563EB', cls: 'bg-brand-600' },
          { name: '700', hex: '#1D4ED8', cls: 'bg-brand-700' },
          { name: '900', hex: '#1E3A8A', cls: 'bg-brand-900' },
        ]} />
        <ColorGroup title="AI Accent" colors={[
          { name: '50', hex: '#F5F3FF', cls: 'bg-ai-50' },
          { name: '200', hex: '#DDD6FE', cls: 'bg-ai-200' },
          { name: '500', hex: '#8B5CF6', cls: 'bg-ai-500' },
          { name: '600', hex: '#7C3AED', cls: 'bg-ai-600' },
        ]} />
        <ColorGroup title="Personal Mode" colors={[
          { name: 'bg', hex: '#FFFBEB', cls: 'bg-personal-bg' },
          { name: 'border', hex: '#FDE68A', cls: 'bg-personal-border' },
          { name: 'badge-bg', hex: '#FEF3C7', cls: 'bg-personal-badge-bg' },
          { name: 'accent', hex: '#B45309', cls: 'bg-personal-accent' },
        ]} />
        <ColorGroup title="Status" colors={[
          { name: 'success', hex: '#10B981', cls: 'bg-success-500' },
          { name: 'warning', hex: '#F59E0B', cls: 'bg-warning-500' },
          { name: 'danger', hex: '#F43F5E', cls: 'bg-danger-500' },
          { name: 'info', hex: '#0EA5E9', cls: 'bg-info-500' },
        ]} />
      </Section>

      {/* 타입 스케일 */}
      <Section title="타이포그래피 (design.md §3.2)">
        <div className="space-y-3">
          <TypeRow size="text-4xl">40px / 인증 페이지 큰 헤더</TypeRow>
          <TypeRow size="text-3xl">32px / 페이지 제목</TypeRow>
          <TypeRow size="text-2xl">26px / 패널 헤더</TypeRow>
          <TypeRow size="text-xl">22px / 카드 제목</TypeRow>
          <TypeRow size="text-lg">19px / 강조 본문</TypeRow>
          <TypeRow size="text-base">17px / 본문 기본 — 한글 가독성에 최적화된 사이즈</TypeRow>
          <TypeRow size="text-sm">15px / 보조 텍스트</TypeRow>
          <TypeRow size="text-xs">13px / 캡션</TypeRow>
        </div>
      </Section>

      {/* 버튼 */}
      <Section title="버튼 (design.md §12)">
        <div className="flex flex-wrap gap-3">
          <Button>기본</Button>
          <Button variant="outline">외곽선</Button>
          <Button variant="ghost">고스트</Button>
          <Button variant="ai">AI 액션</Button>
          <Button variant="personal">개인 액션</Button>
          <Button variant="consensus">합의 도달</Button>
          <Button variant="destructive">위험</Button>
          <Button disabled>비활성</Button>
        </div>
        <div className="flex flex-wrap gap-3 items-center mt-3">
          <Button size="sm">소형</Button>
          <Button>기본</Button>
          <Button size="lg">대형</Button>
        </div>
      </Section>

      {/* 인풋 */}
      <Section title="입력 (design.md §12)">
        <div className="space-y-3 max-w-sm">
          <div className="space-y-2">
            <Label htmlFor="demo-email">이메일</Label>
            <Input id="demo-email" type="email" placeholder="your@email.com" />
          </div>
        </div>
      </Section>

      {/* 배지 */}
      <Section title="배지 (design.md §12)">
        <div className="flex flex-wrap gap-2">
          <Badge>기본</Badge>
          <Badge variant="success">합의 완료</Badge>
          <Badge variant="warning">시간 임박</Badge>
          <Badge variant="danger">주의</Badge>
          <Badge variant="ai">AI</Badge>
          <Badge variant="personal">🔒 나만 보이는 공간</Badge>
          <Badge variant="muted">대기 중</Badge>
        </div>
      </Section>

      {/* 발화자 위계 — 핵심 */}
      <Section title="발화자 시각 위계 (design.md §11.3)">
        <div className="space-y-3 max-w-2xl">
          {/* 다른 학생 */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-900 flex items-center justify-center text-xs font-semibold shrink-0">
              모
            </div>
            <div className="flex-1 space-y-1">
              <div className="text-xs font-semibold text-neutral-600">모둠지기</div>
              <div className="rounded-lg bg-neutral-50 border border-neutral-200 px-4 py-2.5 text-base text-neutral-800">
                저는 점심 시간을 늘려야 한다고 생각해요. 충분히 먹고 쉬어야 오후 수업에
                집중할 수 있어요.
              </div>
              <div className="text-2xs text-neutral-400">14:23 · 1번째 발화</div>
            </div>
          </div>

          {/* AI 진행자 — 70% 폭, ai-50 배경, 보더 */}
          <div className="flex gap-3 max-w-[70%]">
            <div className="w-8 h-8 rounded-full bg-ai-50 border border-ai-200 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-ai-500" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="text-xs font-semibold text-ai-text">AI 진행자</div>
              <div className="rounded-lg bg-ai-50 border border-ai-200 px-4 py-2.5 text-base text-neutral-800">
                의견 잘 들었어요. 왜 그렇게 생각하게 됐는지 좀 더 들려줄 수 있을까요?
              </div>
            </div>
          </div>

          {/* 본인 발화 — 우측, brand-50 */}
          <div className="flex gap-3 justify-end">
            <div className="flex-1 space-y-1 max-w-[85%]">
              <div className="text-xs font-semibold text-neutral-600 text-right">
                나 (지혜)
              </div>
              <div className="rounded-lg bg-brand-50 border border-brand-100 px-4 py-2.5 text-base text-neutral-800">
                저도 비슷해요. 그런데 점심 시간 늘리면 하교 시간도 늦어지는 건 어떻게
                생각해요?
              </div>
              <div className="text-2xs text-neutral-400 text-right">14:24</div>
            </div>
          </div>
        </div>
      </Section>

      {/* 채널 모드 비교 */}
      <Section title="팀 vs 개인 모드 (design.md §10)">
        <div className="grid md:grid-cols-2 gap-4">
          <ModeCard
            title="팀 모드"
            icon={<Users className="h-5 w-5" />}
            bgClass="bg-neutral-0 border-neutral-200"
            badge={null}
            placeholder="팀에 의견 남기기…"
            aiLabel="AI 진행자"
          />
          <ModeCard
            title="개인 모드"
            icon={
              <div className="relative">
                <User className="h-5 w-5" />
                <Lock className="h-3 w-3 absolute -bottom-1 -right-1" />
              </div>
            }
            bgClass="bg-personal-bg border-personal-border"
            badge={
              <Badge variant="personal" className="text-xs">
                🔒 나만 보이는 공간
              </Badge>
            }
            placeholder="혼자만의 생각을 정리해보세요…"
            aiLabel="AI 코치"
          />
        </div>
      </Section>

      {/* 카드 */}
      <Section title="카드 (의견 카드 예시)">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-start gap-2">
              <MessageSquareQuote className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
              <CardTitle>점심 시간을 늘려야 해요</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-base text-neutral-800">
              충분히 먹고 친구들과 이야기할 시간이 필요해요.
            </p>
            <div className="text-xs text-neutral-600 space-y-1 border-l-2 border-brand-100 pl-3">
              <p className="font-semibold">근거</p>
              <p>현재 20분은 급식을 받고 자리에 앉기에도 빠듯해요.</p>
            </div>
            <div className="flex items-center justify-between text-2xs text-neutral-400">
              <span>모둠지기 · 14:23</span>
              <Badge variant="muted" className="text-2xs">
                의견 #1
              </Badge>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* 다크 모드 토글 안내 */}
      <Section title="다크 모드">
        <p className="text-sm text-neutral-600">
          다크 모드는 시스템 설정(prefers-color-scheme)을 따릅니다. 브라우저 또는 OS에서
          다크 모드를 켜면 자동으로 토큰이 전환됩니다.
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-neutral-900 border-b border-neutral-200 pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ColorGroup({
  title,
  colors,
}: {
  title: string;
  colors: { name: string; hex: string; cls: string }[];
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-neutral-600">{title}</h3>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {colors.map((c) => (
          <div key={c.name} className="space-y-1.5">
            <div
              className={`${c.cls} h-16 rounded-md border border-neutral-200`}
              aria-label={`${title} ${c.name} ${c.hex}`}
            />
            <div className="text-xs">
              <div className="font-medium text-neutral-800">{c.name}</div>
              <div className="font-mono text-neutral-400">{c.hex}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TypeRow({ size, children }: { size: string; children: string }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-neutral-100 pb-2">
      <code className="text-xs font-mono text-neutral-400 w-24 shrink-0">{size}</code>
      <span className={`${size} text-neutral-800`}>{children}</span>
    </div>
  );
}

function ModeCard({
  title,
  icon,
  bgClass,
  badge,
  placeholder,
  aiLabel,
}: {
  title: string;
  icon: React.ReactNode;
  bgClass: string;
  badge: React.ReactNode | null;
  placeholder: string;
  aiLabel: string;
}) {
  return (
    <div className={`rounded-lg border p-4 ${bgClass} space-y-3 min-h-[200px]`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
          {icon}
          {title}
        </div>
        {badge}
      </div>
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-ai-500 shrink-0 mt-1" />
          <div className="space-y-0.5">
            <div className="text-2xs font-semibold text-ai-text">{aiLabel}</div>
            <div className="text-sm text-neutral-800">예시 메시지가 여기 표시돼요.</div>
          </div>
        </div>
      </div>
      <Input placeholder={placeholder} className="mt-auto" />
    </div>
  );
}
