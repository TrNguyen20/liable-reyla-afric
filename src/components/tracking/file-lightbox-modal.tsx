import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

export interface FileLightboxModalProps {
  previewFile: { url: string; title: string; type: 'image' | 'pdf' } | null;
  onClose: () => void;
}

export const FileLightboxModal: React.FC<FileLightboxModalProps> = ({ previewFile, onClose }) => {
  if (!previewFile) return null;

  return (
    <Dialog open={!!previewFile} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-3xl rounded-xl sm:rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card p-5 shadow-2xl overflow-hidden"
        style={{ borderRadius: '12px' }}
      >
        <DialogTitle className="font-mono text-sm font-bold flex items-center justify-between border-b border-slate-200 dark:border-border pb-2.5">
          <span>{previewFile.title}</span>
          <a
            href={previewFile.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline font-sans"
          >
            [Mở tab mới]
          </a>
        </DialogTitle>
        <div className="mt-3 max-h-[75vh] overflow-auto flex items-center justify-center bg-slate-50/50 dark:bg-secondary/30 rounded-lg p-2 border border-slate-100 dark:border-border/40">
          {previewFile.type === 'image' ? (
            <img
              src={previewFile.url}
              alt={previewFile.title}
              className="max-h-[70vh] max-w-full object-contain rounded-lg"
            />
          ) : (
            <iframe
              src={previewFile.url}
              title={previewFile.title}
              className="w-full h-[65vh] rounded-lg border border-slate-200 dark:border-border"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
