"use client";

import { useEffect, useRef } from "react";

const SHAPES = {
  // Short confirmations, centered.
  dialog: "modal m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border p-5 sm:p-6",
  // Small forms, against the right edge at full height.
  sheet: "modal modal-sheet my-0 mr-0 ml-auto h-dvh max-h-dvh w-full max-w-md border-l p-5 sm:rounded-l-2xl sm:p-6",
};

// A native modal dialog, which traps focus and closes on Escape by itself.
// It materializes on open (see dialog.modal in globals.css): dialogs scale up,
// sheets slide in from the right edge they leave by.
// `focusRef` picks what's focused on open; the first control otherwise.
// `returnRef` gets focus back on close, since the opener may be gone by then.
export function Modal({
  labelledBy,
  shape = "dialog",
  focusRef,
  returnRef,
  onClose,
  children,
}: {
  labelledBy: string;
  shape?: keyof typeof SHAPES;
  focusRef?: React.RefObject<HTMLElement | null>;
  returnRef?: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    focusRef?.current?.focus();
    const back = returnRef?.current;
    return () => back?.focus();
  }, [focusRef, returnRef]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => {
        // The dialog element itself only receives clicks on its backdrop.
        if (e.target === ref.current) ref.current?.close();
      }}
      className={`${SHAPES[shape]} border-edge bg-panel text-chalk shadow-2xl shadow-black/50`}
    >
      {children}
    </dialog>
  );
}
