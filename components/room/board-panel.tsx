'use client';

import { useState, useEffect } from 'react';
import { LayoutGrid, GitCompare, ListChecks, AlertCircle, Trophy, Trash2, Plus } from 'lucide-react';
import { useBoardSync } from '@/lib/realtime/use-board-sync';
import { useOpinionsSync } from '@/lib/realtime/use-opinions-sync';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OpinionCard } from './opinion-card';
import { NewOpinionDialog } from './new-opinion-dialog';
import type { BoardItem } from '@/lib/db/types';

type Props = {
  roomId: string;
  myUserId: string;
};

const SECTIONS: { type: BoardItem['type']; label: string; icon: typeof GitCompare; hint: string }[] = [
  { type: 'compare', label: '의견 비교', icon: GitCompare, hint: '의견들의 공통점·차이점을 적어보세요' },
  { type: 'criteria', label: '선택 기준', icon: ListChecks, hint: '어떤 기준으로 대표 의견을 고를까요?' },
  { type: 'issue', label: '쟁점', icon: AlertCircle, hint: '아직 합의가 어려운 부분이 있나요?' },
  { type: 'representative', label: '대표 의견 후보', icon: Trophy, hint: '모둠 대표 의견 후보를 적어보세요' },
];

export function BoardPanel({ roomId, myUserId }: Props) {
  const { itemsByType, upsertItem, deleteItem } = useBoardSync(roomId);
  const { opinions, addOpinion, deleteOpinion } = useOpinionsSync(roomId);

  return (
    <section className="border-r border-neutral-200 bg-neutral-50 flex flex-col min-h-0">
      <div className="px-4 py-3 border-b border-neutral-200 text-sm font-medium text-neutral-600 flex items-center gap-2 shrink-0">
        <LayoutGrid className="h-4 w-4" />
        공동 토의 보드
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-6">
          {/* 의견 카드 영역 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
              📌 의견 카드 ({opinions.length})
            </h3>
            {opinions.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-4">
                아직 등록된 의견이 없어요. 첫 의견을 카드로 등록해볼까요?
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {opinions.map((o) => (
                  <OpinionCard
                    key={o.id}
                    opinion={o}
                    canDelete={o.author_id === myUserId}
                    onDelete={deleteOpinion}
                  />
                ))}
              </div>
            )}
            <NewOpinionDialog onSubmit={addOpinion} />
          </div>

          {/* 4섹션 */}
          {SECTIONS.map(({ type, label, icon: Icon, hint }) => (
            <BoardSection
              key={type}
              type={type}
              label={label}
              icon={<Icon className="h-4 w-4" />}
              hint={hint}
              items={itemsByType(type)}
              onSave={(content, existingId) =>
                upsertItem(type, itemsByType(type).length, content, existingId)
              }
              onDelete={deleteItem}
            />
          ))}
        </div>
      </ScrollArea>
    </section>
  );
}

type BoardSectionProps = {
  type: BoardItem['type'];
  label: string;
  icon: React.ReactNode;
  hint: string;
  items: BoardItem[];
  onSave: (content: string, existingId?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

function BoardSection({ type, label, icon, hint, items, onSave, onDelete }: BoardSectionProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
        {icon}
        {label}
      </h3>
      {items.length === 0 && (
        <p className="text-xs text-neutral-400 italic">{hint}</p>
      )}
      <div className="space-y-2">
        {items.map((item) => (
          <BoardItemEditor key={item.id} item={item} onSave={onSave} onDelete={onDelete} />
        ))}
      </div>
      <AddBoardItem onAdd={onSave} placeholder={`${label} 추가하기…`} />
    </div>
  );
}

function BoardItemEditor({
  item,
  onSave,
  onDelete,
}: {
  item: BoardItem;
  onSave: BoardSectionProps['onSave'];
  onDelete: BoardSectionProps['onDelete'];
}) {
  const [value, setValue] = useState(item.content);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setValue(item.content);
    setDirty(false);
  }, [item.content]);

  async function commit() {
    if (!dirty) return;
    await onSave(value, item.id);
    setDirty(false);
  }

  return (
    <div className="flex gap-2 items-start group">
      <Textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setDirty(true);
        }}
        onBlur={commit}
        rows={2}
        className="flex-1 text-sm"
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onDelete(item.id)}
        aria-label="삭제"
      >
        <Trash2 className="h-4 w-4 text-neutral-400" />
      </Button>
    </div>
  );
}

function AddBoardItem({
  onAdd,
  placeholder,
}: {
  onAdd: BoardSectionProps['onSave'];
  placeholder: string;
}) {
  const [value, setValue] = useState('');
  const [adding, setAdding] = useState(false);

  async function commit() {
    const text = value.trim();
    if (!text) return;
    setAdding(true);
    await onAdd(text);
    setValue('');
    setAdding(false);
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
        placeholder={placeholder}
        className="flex-1 h-9 rounded-lg border border-dashed border-neutral-200 bg-neutral-0 px-3 text-sm text-neutral-800 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      />
      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={commit} disabled={adding || !value.trim()}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
