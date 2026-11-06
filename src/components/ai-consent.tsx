"use client";

import Link from "next/link";
import { useId, useRef, useState, useTransition } from "react";
import { allowAiScans, checkAiConsent } from "@/app/garage/ai-consent-actions";
import { Modal } from "@/components/modal";

// Asks before anything is sent to the AI service. `ensure()` resolves true once
// the person has allowed it, now or earlier, and false if they say no. Render
// `dialog` anywhere in the component using it.
export function useAiConsent() {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const allowed = useRef(false);
  const answer = useRef<(ok: boolean) => void>(() => {});

  async function ensure() {
    if (allowed.current) return true;
    allowed.current = await checkAiConsent();
    if (allowed.current) return true;
    setError(null);
    setAsking(true);
    return new Promise<boolean>((resolve) => {
      answer.current = resolve;
    });
  }

  function finish(ok: boolean) {
    setAsking(false);
    answer.current(ok);
  }

  function allow() {
    start(async () => {
      try {
        await allowAiScans();
        allowed.current = true;
        finish(true);
      } catch {
        setError("That didn't save. Try again, or fill it in by hand.");
      }
    });
  }

  const dialog = asking && (
    <AiConsentDialog
      error={error}
      pending={pending}
      onAllow={allow}
      onDecline={() => finish(false)}
    />
  );

  return { ensure, dialog };
}

export function AiConsentDialog({
  error,
  pending,
  onAllow,
  onDecline,
}: {
  error: string | null;
  pending: boolean;
  onAllow: () => void;
  onDecline: () => void;
}) {
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  return (
    <Modal labelledBy={titleId} focusRef={titleRef} onClose={onDecline}>
      <h2
        ref={titleRef}
        id={titleId}
        tabIndex={-1}
        className="font-display text-2xl leading-tight font-semibold focus:outline-none"
      >
        Send this to Anthropic&apos;s AI?
      </h2>
      <div className="mt-2 space-y-2 text-sm text-steel">
        <p>
          Revlog uses Anthropic, an AI company, to read your files. Each file you scan goes to
          Anthropic, along with anything in it, such as your name, address, VIN, or what you paid.
        </p>
        <p>
          Anthropic reads it and sends back the details for you to check. It doesn&apos;t use your
          files to train its AI. Read more in the{" "}
          <Link
            href="/privacy#ai-scanning"
            target="_blank"
            className="font-semibold text-chalk hover:text-redline"
          >
            privacy policy
          </Link>
          . You can turn this off in Settings.
        </p>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-overdue">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={onAllow} disabled={pending} className="btn btn-primary">
          {pending ? "Saving…" : "Allow and scan"}
        </button>
        <button type="button" onClick={onDecline} className="btn">
          Don&apos;t send
        </button>
      </div>
    </Modal>
  );
}
