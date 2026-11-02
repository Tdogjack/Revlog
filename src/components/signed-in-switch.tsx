import { Suspense } from "react";
import { getUser } from "@/lib/auth";

// Renders `signedOut` in the static shell, then swaps to `signedIn` once the
// session is read, so public pages stay prerendered but still know who you are.
export function SignedInSwitch({
  signedIn,
  signedOut,
}: {
  signedIn: React.ReactNode;
  signedOut: React.ReactNode;
}) {
  return (
    <Suspense fallback={signedOut}>
      <Resolve signedIn={signedIn} signedOut={signedOut} />
    </Suspense>
  );
}

async function Resolve({
  signedIn,
  signedOut,
}: {
  signedIn: React.ReactNode;
  signedOut: React.ReactNode;
}) {
  const user = await getUser();
  return user ? signedIn : signedOut;
}
