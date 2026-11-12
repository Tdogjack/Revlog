"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Modal } from "@/components/modal";

// A destructive moderator action behind a dialog that names what it affects.
export function ConfirmButton({
  label,
  title,
  body,
  action,
}: {
  label: string;
  title: string;
  body: string;
  action: () => Promise<{ error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const opener = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  return (
    <>
      <button ref={opener} type="button" onClick={() => setOpen(true)} className="btn btn-danger">
        {label}
      </button>
      {open && (
        <Modal
          labelledBy={titleId}
          focusRef={cancel}
          returnRef={opener}
          onClose={() => setOpen(false)}
        >
          <h2 id={titleId} className="font-display text-2xl font-semibold break-words">
            {title}
          </h2>
          <p className="mt-2 text-sm text-steel">{body}</p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-overdue">
              {error}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <button ref={cancel} type="button" onClick={() => setOpen(false)} className="btn">
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const result = await action();
                  if (result.error) setError(result.error);
                  else setOpen(false);
                })
              }
              className="btn btn-danger"
            >
              {pending ? "Working…" : label}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
