import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Toast } from '../hooks/useToast';

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

export default function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-lg border backdrop-blur-sm animate-slide-up ${ toast.type === 'success' ? 'bg-emerald-50/95 dark:bg-emerald-950/95 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : toast.type === 'error' ? 'bg-red-50/95 dark:bg-red-950/95 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300' : 'bg-primary-100/95 dark:bg-primary-900/95 border-primary-300 dark:border-zinc-800 text-primary-800 dark:text-primary-300' }`}
        >
          {toast.type === 'success' && <CheckCircle className="h-5 w-5 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="h-5 w-5 shrink-0" />}
          {toast.type === 'info' && <Info className="h-5 w-5 shrink-0" />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-2 rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
