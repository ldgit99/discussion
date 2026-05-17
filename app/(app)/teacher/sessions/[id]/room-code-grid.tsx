'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';
import { Card } from '@/components/ui/card';

type Room = {
  id: string;
  room_code: string;
  max_participants: number;
  stage: string;
  joined: number;
};

export function RoomCodeGrid({ rooms }: { rooms: Room[] }) {
  if (rooms.length === 0) {
    return (
      <Card>
        <div className="p-8 text-center text-neutral-600">
          모둠이 없어요.
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-3">
      {rooms.map((r, idx) => (
        <Link
          key={r.id}
          href={`/teacher/rooms/${r.id}`}
          className="block group"
        >
          <Card className="hover:shadow-md transition-shadow print:shadow-none print:border-2">
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between text-sm text-neutral-600">
                <span className="font-semibold">모둠 {idx + 1}</span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {r.joined}/{r.max_participants}
                </span>
              </div>
              <div className="text-center py-3">
                <code className="font-mono text-3xl font-bold tracking-[0.3em] text-brand-600">
                  {r.room_code}
                </code>
              </div>
              <p className="text-xs text-center text-neutral-400 group-hover:text-brand-600 transition-colors print:hidden">
                클릭하면 모둠 상세
              </p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
