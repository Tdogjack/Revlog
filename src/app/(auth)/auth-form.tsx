"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Circle, Gauge } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/password-rules";
import { USERNAME_HINT } from "@/lib/username-rules";
import { signInWithProvider, type AuthState } from "./actions";

type Action = (prev: AuthState, formData: FormData) => Promise<AuthState>;

const inputClass = "field mt-1.5";

export function AuthShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 pt-[calc(4rem+env(safe-area-inset-top))] pb-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mx-auto mb-8 flex min-h-11 w-fit items-center justify-center gap-2 text-2xl font-semibold"
        >
          <Gauge className="h-7 w-7 text-redline" aria-hidden />
          <span>
            Rev<span className="text-redline">log</span>
          </span>
        </Link>
        <div className="rounded-2xl border border-graphite bg-panel p-6 sm:p-8">
          {children}
        </div>
        {footer && (
          <p className="mt-6 text-center text-sm text-steel">{footer}</p>
        )}
        <p className="mt-4 text-center text-xs text-steel">
          <Link href="/privacy" className="hover:text-chalk">
            Privacy
          </Link>
          <span className="mx-2" aria-hidden>
            ·
          </span>
          <Link href="/terms" className="hover:text-chalk">
            Terms
          </Link>
        </p>
      </div>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-lg bg-done-bg px-3.5 py-2.5 text-sm text-done">
      {children}
    </p>
  );
}

function ErrorText({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-overdue">
      {error}
    </p>
  );
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-primary btn-lg w-full"
    >
      {pending ? "One sec…" : label}
    </button>
  );
}

function EmailField({ defaultValue }: { defaultValue?: string }) {
  return (
    <label className="block text-sm">
      <span className="field-label">Email</span>
      <input
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
        defaultValue={defaultValue}
        className={inputClass}
      />
    </label>
  );
}

export function UsernameField({ defaultValue }: { defaultValue?: string }) {
  return (
    <label className="block text-sm">
      <span className="field-label">Username</span>
      <div className="field mt-1.5 flex items-center py-0 pl-0 focus-within:border-redline focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-redline)_30%,transparent)]">
        <span className="pl-3.5 text-steel" aria-hidden>
          @
        </span>
        <input
          name="username"
          required
          minLength={3}
          maxLength={20}
          pattern="@?[A-Za-z0-9_]{3,20}"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="redline_rob"
          defaultValue={defaultValue}
          className="min-h-11 w-full bg-transparent pr-0 pl-1 outline-none"
        />
      </div>
      <span className="mt-1 block text-xs text-steel">
        Shown on your community posts. {USERNAME_HINT}
      </span>
    </label>
  );
}

// A new-password input with a live checklist of the password rules.
function NewPasswordField({ label = "Password" }: { label?: string }) {
  const [password, setPassword] = useState("");
  return (
    <div>
      <label className="block text-sm">
        <span className="field-label">{label}</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          maxLength={72}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby="password-rules"
          className={inputClass}
        />
      </label>
      <ul id="password-rules" className="mt-2 space-y-1 text-xs">
        {PASSWORD_RULES.map((rule) => {
          const met = rule.test(password);
          return (
            <li
              key={rule.label}
              className={`flex items-center gap-1.5 ${met ? "text-done" : "text-steel"}`}
            >
              {met ? (
                <Check className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Circle className="h-3.5 w-3.5" aria-hidden />
              )}
              {rule.label}
              <span className="sr-only">{met ? "(done)" : "(missing)"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="currentColor"
      aria-hidden
    >
      <path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.35 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.77-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.38-3.69ZM14.1 5.85c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.68-1.1 1.76-.96 2.8 1.01.08 2.05-.52 2.68-1.28Z" />
    </svg>
  );
}

function ProviderButton({
  provider,
  label,
  logo,
}: {
  provider: string;
  label: string;
  logo: React.ReactNode;
}) {
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get("provider") === provider;
  return (
    <button
      type="submit"
      name="provider"
      value={provider}
      disabled={pending}
      className="btn btn-lg w-full"
    >
      {logo}
      {mine ? "One sec…" : label}
    </button>
  );
}

// Google and Apple sign-in. New accounts pick a username right after.
function ProviderSignIn({ next }: { next?: string }) {
  return (
    <>
      <div className="mt-5 flex items-center gap-3 text-xs text-steel">
        <span className="h-px flex-1 bg-graphite" aria-hidden />
        or
        <span className="h-px flex-1 bg-graphite" aria-hidden />
      </div>
      <form action={signInWithProvider} className="mt-5 space-y-3">
        {next && <input type="hidden" name="next" value={next} />}
        <ProviderButton
          provider="google"
          label="Continue with Google"
          logo={<GoogleLogo />}
        />
        <ProviderButton
          provider="apple"
          label="Continue with Apple"
          logo={<AppleLogo />}
        />
      </form>
      <p className="mt-3 text-center text-xs text-steel">
        New here? Continuing with Apple or Google means you agree to the{" "}
        <Link
          href="/terms"
          className="font-medium text-redline hover:text-redline-hover"
        >
          Terms
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="font-medium text-redline hover:text-redline-hover"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </>
  );
}

const LINK_ERRORS: Record<string, string> = {
  confirm:
    "That confirmation link didn't work. It may have expired, so try logging in.",
  reset:
    "That reset link didn't work. It may have expired or been opened in a different browser. Request a new one.",
  oauth:
    "Couldn't sign you in with that account. Try again, or use your email.",
};

export function LoginForm({
  action,
  next,
  linkError,
}: {
  action: Action;
  next?: string;
  linkError?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <AuthShell
      footer={
        <>
          New to Revlog?{" "}
          <Link
            href="/signup"
            className="font-medium text-redline hover:text-redline-hover"
          >
            Create an account
          </Link>
        </>
      }
    >
      <h1 className="font-display text-2xl font-semibold">
        Log in to your garage
      </h1>
      {linkError && LINK_ERRORS[linkError] && (
        <p className="mt-4 rounded-lg bg-overdue-bg px-3.5 py-2.5 text-sm text-overdue">
          {LINK_ERRORS[linkError]}
        </p>
      )}
      <form action={formAction} className="mt-5 space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <EmailField />
        <label className="block text-sm">
          <span className="flex items-baseline justify-between">
            <span className="field-label">Password</span>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-redline hover:text-redline-hover"
            >
              Forgot password?
            </Link>
          </span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
          />
        </label>
        <ErrorText error={state?.error} />
        <SubmitButton pending={pending} label="Log in" />
      </form>
      <ProviderSignIn next={next} />
    </AuthShell>
  );
}

export function SignupForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <AuthShell
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-redline hover:text-redline-hover"
          >
            Log in
          </Link>
        </>
      }
    >
      <h1 className="font-display text-2xl font-semibold">
        Create your garage
      </h1>
      {state?.message ? (
        <Notice>{state.message}</Notice>
      ) : (
        <>
          <form action={formAction} className="mt-5 space-y-4">
            <UsernameField defaultValue={state?.values?.username} />
            <EmailField defaultValue={state?.values?.email} />
            <NewPasswordField />
            <label className="flex min-h-11 items-start gap-3 text-sm text-steel">
              <input
                type="checkbox"
                name="agree"
                required
                className="mt-0.5 h-5 w-5 shrink-0 accent-redline"
              />
              <span>
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="font-medium text-redline hover:text-redline-hover"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-redline hover:text-redline-hover"
                >
                  Privacy Policy
                </Link>
                , including no abusive or objectionable content.
              </span>
            </label>
            <ErrorText error={state?.error} />
            <SubmitButton pending={pending} label="Create account" />
          </form>
          <ProviderSignIn />
        </>
      )}
    </AuthShell>
  );
}

export function ForgotPasswordForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <AuthShell
      footer={
        <>
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-medium text-redline hover:text-redline-hover"
          >
            Log in
          </Link>
        </>
      }
    >
      <h1 className="font-display text-2xl font-semibold">
        Reset your password
      </h1>
      {state?.message ? (
        <Notice>{state.message}</Notice>
      ) : (
        <form action={formAction} className="mt-5 space-y-4">
          <p className="text-sm text-steel">
            Enter your email and we&apos;ll send you a link to set a new
            password.
          </p>
          <EmailField />
          <ErrorText error={state?.error} />
          <SubmitButton pending={pending} label="Send reset link" />
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordForm({
  action,
  email,
}: {
  action: Action;
  email: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <AuthShell>
      <h1 className="font-display text-2xl font-semibold">
        Set a new password
      </h1>
      {state?.message ? (
        <>
          <Notice>{state.message}</Notice>
          <Link href="/garage" className="btn btn-primary btn-lg mt-4 w-full">
            Go to your garage
          </Link>
        </>
      ) : (
        <form action={formAction} className="mt-5 space-y-4">
          <p className="text-sm text-steel">For {email}</p>
          <NewPasswordField label="New password" />
          <label className="block text-sm">
            <span className="field-label">Confirm new password</span>
            <input
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              maxLength={72}
              className={inputClass}
            />
          </label>
          <ErrorText error={state?.error} />
          <SubmitButton pending={pending} label="Update password" />
        </form>
      )}
    </AuthShell>
  );
}

export function ChooseUsernameForm({
  action,
  next,
}: {
  action: Action;
  next?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <AuthShell>
      <h1 className="font-display text-2xl font-semibold">Pick a username</h1>
      <p className="mt-2 text-sm text-steel">
        Revlog now has a community. Your username is how others see your posts.
      </p>
      <form action={formAction} className="mt-5 space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <UsernameField defaultValue={state?.values?.username} />
        <ErrorText error={state?.error} />
        <SubmitButton pending={pending} label="Save username" />
      </form>
    </AuthShell>
  );
}
