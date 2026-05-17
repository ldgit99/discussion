'use client';

import { Trash2, MessageSquareQuote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Opinion } from '@/lib/db/types';

type Props = {
  opinion: Opinion;
  canDelete: boolean;
  onDelete?: (id: string) => void;
};

export function OpinionCard({ opinion, canDelete, onDelete }: Props) {
  return (
    <Card className="animate-card-in">
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <MessageSquareQuote className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
          <p className="text-base text-neutral-800 flex-1 whitespace-pre-wrap">
            {opinion.content}
          </p>
          {canDelete && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onDelete(opinion.id)}
              aria-label="삭제"
            >
              <Trash2 className="h-4 w-4 text-neutral-400" />
            </Button>
          )}
        </div>
        {opinion.evidence && (
          <div className="text-xs text-neutral-600 space-y-1 border-l-2 border-brand-100 pl-3">
            <p className="font-semibold">근거</p>
            <p className="whitespace-pre-wrap">{opinion.evidence}</p>
          </div>
        )}
        <div className="text-2xs text-neutral-400">
          {opinion.author_nickname} · {formatTime(opinion.created_at)}
        </div>
      </div>
    </Card>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
