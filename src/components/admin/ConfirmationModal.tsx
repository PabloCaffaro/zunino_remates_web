import { useEffect, useRef } from "react";

type ConfirmationModalProps = {
  title: string;
  description: string;
  confirmLabel: string;
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmationModal({
  title,
  description,
  confirmLabel,
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  const isConfirmingRef = useRef(isConfirming);
  onCancelRef.current = onCancel;
  isConfirmingRef.current = isConfirming;

  useEffect(() => {
    const previouslyFocusedElement = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelButtonRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isConfirmingRef.current) {
        onCancelRef.current();
      }
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedElement?.focus();
    };
  }, []);

  return (
    <div
      className="admin-confirm-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isConfirming) onCancel();
      }}
    >
      <section
        className="admin-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        aria-describedby="admin-confirm-description"
      >
        <button
          className="admin-confirm-close"
          type="button"
          aria-label="Cerrar confirmación"
          disabled={isConfirming}
          onClick={onCancel}
        >
          ×
        </button>
        <p className="eyebrow">Confirmación requerida</p>
        <h2 id="admin-confirm-title">{title}</h2>
        <p id="admin-confirm-description">{description}</p>
        <div className="admin-confirm-actions">
          <button
            ref={cancelButtonRef}
            className="btn btn-ghost"
            type="button"
            disabled={isConfirming}
            onClick={onCancel}
          >
            Volver
          </button>
          <button
            className="btn admin-confirm-danger"
            type="button"
            disabled={isConfirming}
            onClick={onConfirm}
          >
            {isConfirming ? "Procesando…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
