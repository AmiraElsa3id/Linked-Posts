'use client';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmPendingLabel?: string;
  confirming?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Destructive-action confirmation modal (matches the Route Posts demo). */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmPendingLabel = 'Working...',
  confirming = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/65 p-4"
      onClick={() => !confirming && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={onClose}
            disabled={confirming}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? confirmPendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
