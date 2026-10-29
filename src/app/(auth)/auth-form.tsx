"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Gauge } from "lucide-react";
import type { AuthState } from "./actions";

type Props = {
  mode: "login" | "signup";
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  next?: string;
};

export function AuthForm({ mode, action, next }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const isLogin = mode === "login";

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-xl font-semibold">
          <Gauge className="h-6 w-6 text-redline" aria-hidden />
          <span>
            Rev<span className="text-redline">log</span>
          </span>
        </Link>

        <div className="rounded-xl border border-graphite bg-panel p-6">
          <h1 className="text-lg font-semibold">
            {isLogin ? "Log in to your garage" : "Create your garage"}
          </h1>

          {state?.message ? (
            <p className="mt-4 rounded-md bg-done-bg px-3 py-2 text-sm text-done">{state.message}</p>
          ) : (
            <form action={formAction} className="mt-5 space-y-4">
              {next && <input type="hidden" name="next" value={next} />}
              <label className="block text-sm">
                <span className="text-steel">Email</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-md border border-graphite bg-carbon px-3 py-2 outline-none focus:border-redline"
                />
              </label>
              <label className="block text-sm">
                <span className="text-steel">Password</span>
                <input
                  name="password"
                  type="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  minLength={isLogin ? undefined : 8}
                  className="mt-1 w-full rounded-md border border-graphite bg-carbon px-3 py-2 outline-none focus:border-redline"
                />
              </label>

              {state?.error && (
                <p role="alert" className="text-sm text-due">
                  {state.error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-md bg-redline py-2.5 font-medium text-white hover:bg-redline-hover disabled:opacity-60"
              >
                {pending ? "One sec…" : isLogin ? "Log in" : "Create account"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-steel">
          {isLogin ? "New to Revlog? " : "Already have an account? "}
          <Link href={isLogin ? "/signup" : "/login"} className="text-chalk hover:text-redline">
            {isLogin ? "Create an account" : "Log in"}
          </Link>
        </p>
      </div>
    </div>
  );
}
