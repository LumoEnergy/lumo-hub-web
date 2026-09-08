import { useEffect } from 'react';
import type { ReactNode } from 'react';

/**
 * One overlay: a bottom sheet on a phone, a centred dialog on a laptop. The spec
 * forbids a second overlay pattern — a tool with two kinds of modal teaches nothing
 * consistent about how to dismiss things.
 *
 * The responsive switch is presentation only. Anchoring to the bottom edge is right
 * where a thumb is and wrong on a 1400px screen, where a panel welded to the bottom
 * of the viewport reads as a notification rather than as the record you just opened.
 */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // Stop the list behind the sheet scrolling under a drag.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center lg:p-6">
      {/* Tap-outside-to-dismiss. Hidden from assistive tech and from the tab order:
          the Close button below is the accessible route out, and two controls both
          called "Close" is worse than one. */}
      <button
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="hub-fade-in absolute inset-0 bg-black/35"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="hub-sheet-in relative flex max-h-[88vh] w-full max-w-[480px] flex-col rounded-t-sheet border border-line bg-surface lg:max-h-[85vh] lg:max-w-[560px] lg:rounded-sheet lg:shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-[17px] font-bold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="-mr-1 -mt-1 rounded-chip px-2 py-1 text-[14px] font-semibold text-ink-soft"
          >
            Close
          </button>
        </div>
        <div className="overflow-y-auto px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}
