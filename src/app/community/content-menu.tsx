"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { Ban, Ellipsis, Flag, ShieldX, Trash2 } from "lucide-react";
import { removeTarget, suspendAccount } from "@/app/garage/moderation/actions";
import { Modal } from "@/components/modal";
import { REPORT_REASONS, type ReportKind } from "@/lib/report-reasons";
import {
  blockAccount,
  finishReport,
  reportContent,
  type ReportFormState,
} from "./actions";

type Surface = "report" | "block" | "remove" | "suspend";

const NOUN: Record<ReportKind, string> = { post: "post", comment: "comment", user: "account" };

// The "..." menu on other people's posts, comments, and profiles. `leaveTo` is
// where to go once the content disappears, for pages that show only that post.
// Moderators also get remove and suspend; the server checks they really are.
export function ContentMenu({
  kind,
  targetId,
  userId,
  username,
  signedIn,
  moderator = false,
  suspended = false,
  loginNext,
  leaveTo,
}: {
  kind: ReportKind;
  targetId: string;
  userId: string;
  username: string;
  signedIn: boolean;
  moderator?: boolean;
  suspended?: boolean;
  loginNext: string;
  leaveTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [surface, setSurface] = useState<Surface | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    wrapper.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    function onClick(e: MouseEvent) {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function moveFocus(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...(wrapper.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const step = e.key === "ArrowDown" ? 1 : -1;
    const at = items.indexOf(document.activeElement as HTMLElement);
    items[(at + step + items.length) % items.length]?.focus();
  }

  function choose(next: Surface) {
    setOpen(false);
    setSurface(next);
  }

  function goOn() {
    setSurface(null);
    if (leaveTo) router.push(leaveTo);
    else router.refresh();
  }

  const itemClass =
    "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-chalk hover:bg-graphite active:bg-graphite focus-visible:bg-graphite focus-visible:outline-none";
  const login = `/login?next=${encodeURIComponent(loginNext)}`;
  const reportLabel = `Report ${NOUN[kind]}`;
  const blockLabel = `Block @${username}`;
  const suspendLabel = `Suspend @${username}`;

  return (
    <div ref={wrapper} className="relative -my-2 -mr-2">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More options for @${username}'s ${NOUN[kind]}`}
        title="More options"
        className="icon-btn"
      >
        <Ellipsis className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={`Options for @${username}'s ${NOUN[kind]}`}
          onKeyDown={moveFocus}
          className="pop-in absolute top-full right-0 z-20 mt-1 w-64 origin-top-right overflow-hidden rounded-xl border border-edge bg-panel p-1 shadow-2xl shadow-black/50"
        >
          {signedIn ? (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => choose("report")}
                className={itemClass}
              >
                <Flag className="h-4 w-4 text-steel" aria-hidden />
                {reportLabel}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => choose("block")}
                className={itemClass}
              >
                <Ban className="h-4 w-4 shrink-0 text-steel" aria-hidden />
                <span className="min-w-0 truncate">{blockLabel}</span>
              </button>
              {moderator && (kind !== "user" || !suspended) && (
                <div role="separator" className="my-1 border-t border-edge" />
              )}
              {moderator && kind !== "user" && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => choose("remove")}
                  className={`${itemClass} text-overdue`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Remove {NOUN[kind]}
                </button>
              )}
              {moderator && !suspended && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => choose("suspend")}
                  className={`${itemClass} text-overdue`}
                >
                  <ShieldX className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="min-w-0 truncate">{suspendLabel}</span>
                </button>
              )}
            </>
          ) : (
            <>
              <Link href={login} role="menuitem" className={itemClass}>
                <Flag className="h-4 w-4 text-steel" aria-hidden />
                {reportLabel}
              </Link>
              <Link href={login} role="menuitem" className={itemClass}>
                <Ban className="h-4 w-4 shrink-0 text-steel" aria-hidden />
                <span className="min-w-0 truncate">{blockLabel}</span>
              </Link>
            </>
          )}
        </div>
      )}
      {surface === "report" && (
        <ReportSheet
          kind={kind}
          targetId={targetId}
          username={username}
          returnRef={trigger}
          onCancel={() => setSurface(null)}
          onSent={goOn}
        />
      )}
      {surface === "block" && (
        <ConfirmDialog
          title={`Block @${username}?`}
          body="You won't see their posts or comments, and they can't like or comment on your posts. Moderators are told about the block. You can undo it in Settings."
          label={blockLabel}
          run={() => blockAccount(userId)}
          returnRef={trigger}
          onCancel={() => setSurface(null)}
          onDone={goOn}
        />
      )}
      {surface === "remove" && kind !== "user" && (
        <ConfirmDialog
          title={`Remove @${username}'s ${NOUN[kind]}?`}
          body={`This permanently deletes the ${NOUN[kind]} for everyone and closes any reports on it. This can't be undone.`}
          label={`Remove ${NOUN[kind]}`}
          run={() => removeTarget(kind, targetId)}
          returnRef={trigger}
          onCancel={() => setSurface(null)}
          onDone={goOn}
        />
      )}
      {surface === "suspend" && (
        <ConfirmDialog
          title={`Suspend @${username}?`}
          body="This hides all of their posts and comments and stops them posting. Their private garage stays. You can restore them from Moderation."
          label={suspendLabel}
          run={() => suspendAccount(userId)}
          returnRef={trigger}
          onCancel={() => setSurface(null)}
          onDone={goOn}
        />
      )}
    </div>
  );
}

function ReportSheet({
  kind,
  targetId,
  username,
  returnRef,
  onCancel,
  onSent,
}: {
  kind: ReportKind;
  targetId: string;
  username: string;
  returnRef: React.RefObject<HTMLElement | null>;
  onCancel: () => void;
  onSent: () => void;
}) {
  const [state, action, pending] = useActionState<ReportFormState, FormData>(
    reportContent.bind(null, kind, targetId),
    undefined,
  );
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const noun = NOUN[kind];

  async function finish() {
    await finishReport();
    onSent();
  }

  return (
    <Modal
      labelledBy={titleId}
      shape="sheet"
      focusRef={titleRef}
      returnRef={returnRef}
      onClose={state?.sent ? finish : onCancel}
    >
      {state?.sent ? (
        <div role="status">
          <h2 id={titleId} className="font-display text-2xl font-semibold">
            Report sent
          </h2>
          <p className="mt-2 text-sm text-steel">
            {kind === "user"
              ? `Moderators review reports within 24 hours. Block @${username} to stop seeing their posts now.`
              : `You won't see this ${noun} again. Moderators review reports within 24 hours.`}
          </p>
          <form method="dialog" className="mt-5">
            <button type="submit" className="btn btn-primary">
              Close
            </button>
          </form>
        </div>
      ) : (
        <form action={action} noValidate className="flex min-h-full flex-col">
          <h2
            ref={titleRef}
            id={titleId}
            tabIndex={-1}
            className="font-display text-2xl font-semibold break-words focus:outline-none"
          >
            Report @{username}&apos;s {noun}
          </h2>
          <p className="mt-2 text-sm text-steel">
            Moderators review reports within 24 hours. @{username} isn&apos;t told who reported
            them. See the{" "}
            <Link href="/terms#community" className="font-semibold text-chalk hover:text-redline">
              community rules
            </Link>
            .
          </p>

          <fieldset className="mt-5">
            <legend className="field-label">Reason</legend>
            <div className="mt-2 grid gap-2">
              {REPORT_REASONS.map((r) => (
                <label key={r.value} className="choice justify-start px-3 text-left">
                  <input type="radio" name="reason" value={r.value} className="sr-only" />
                  {r.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mt-5 block">
            <span className="field-label">Details (optional)</span>
            <textarea name="details" rows={3} maxLength={1000} className="field mt-1 text-sm" />
          </label>

          {state?.error && (
            <p role="alert" className="mt-3 text-sm text-overdue">
              {state.error}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-3 pb-1">
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? "Sending…" : "Send report"}
            </button>
            <button type="button" onClick={onCancel} className="btn">
              Cancel
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// Names what's about to happen, with Cancel focused so it can't fire by accident.
function ConfirmDialog({
  title,
  body,
  label,
  run,
  returnRef,
  onCancel,
  onDone,
}: {
  title: string;
  body: string;
  label: string;
  run: () => Promise<{ error?: string }>;
  returnRef: React.RefObject<HTMLElement | null>;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  function confirm() {
    setError(null);
    start(async () => {
      const result = await run();
      if (result.error) setError(result.error);
      else onDone();
    });
  }

  return (
    <Modal labelledBy={titleId} focusRef={cancelRef} returnRef={returnRef} onClose={onCancel}>
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
        <button ref={cancelRef} type="button" onClick={onCancel} className="btn">
          Cancel
        </button>
        <button type="button" onClick={confirm} disabled={pending} className="btn btn-danger">
          {pending ? "Working…" : label}
        </button>
      </div>
    </Modal>
  );
}
