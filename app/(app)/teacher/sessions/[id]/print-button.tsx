'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PrintButton() {
  return (
    <Button
      variant="outline"
      className="print:hidden"
      onClick={() => window.print()}
    >
      <Printer className="h-4 w-4" />
      인쇄·저장
    </Button>
  );
}
