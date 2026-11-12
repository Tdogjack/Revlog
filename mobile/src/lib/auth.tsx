import type { Tokens } from "@revlog/api";
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { api, setSignedOutHandler } from "@/lib/api";
import { unregisterPush } from "@/lib/push";
import { clearTokens, loadTokens, saveTokens } from "@/lib/session";

type Status = "loading" | "signedIn" | "signedOut";

const AuthContext = createContext<{
  status: Status;
  signIn: (email: string, password: string) => Promise<void>;
  acceptTokens: (tokens: Tokens) => Promise<void>;
  signOut: () => Promise<void>;
  forget: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    setSignedOutHandler(() => setStatus("signedOut"));
    loadTokens()
      .then((tokens) => setStatus(tokens ? "signedIn" : "signedOut"))
      .catch(() => setStatus("signedOut"));
  }, []);

  const acceptTokens = async (tokens: Tokens) => {
    await saveTokens(tokens);
    setStatus("signedIn");
  };
  const forget = async () => {
    await clearTokens();
    setStatus("signedOut");
  };

  return (
    <AuthContext
      value={{
        status,
        acceptTokens,
        forget,
        signIn: async (email, password) => {
          await acceptTokens(
            await api<Tokens>("/auth/signin", { method: "POST", body: { email, password } }),
          );
        },
        signOut: async () => {
          // The phone forgets the session even if the server can't be reached.
          await unregisterPush().catch(() => undefined);
          await api("/auth/signout", { method: "POST", body: {} }).catch(() => undefined);
          await forget();
        },
      }}
    >
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const auth = use(AuthContext);
  if (!auth) throw new Error("useAuth needs AuthProvider");
  return auth;
}
