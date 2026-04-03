'use client';

import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LogipaieDocumentPreview } from './LogipaieDocumentPreview';

export type LogipaieDocumentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  meta?: string;
  sections: {
    title: string;
    rows: { label: string; value: ReactNode }[];
  }[];
  table?: {
    headers: string[];
    rows: ReactNode[][];
  };
};

export function LogipaieDocumentModal({
  open,
  onOpenChange,
  title,
  subtitle,
  meta,
  sections,
  table,
}: LogipaieDocumentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <LogipaieDocumentPreview
          title={title}
          subtitle={subtitle}
          meta={meta}
          sections={sections}
          table={table}
        />
      </DialogContent>
    </Dialog>
  );
}
