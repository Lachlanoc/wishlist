import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-primary-950/40 dark:bg-primary-950/70 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-primary-900 shadow-2xl animate-slide-up">
        <div className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-black dark:text-white">{title}</h3>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
        </div>

        <div className="flex gap-3 border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-primary-300 dark:border-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-primary-50 dark:hover:bg-primary-800 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
