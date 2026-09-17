import type { ReactElement } from "react";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

export default function AuthGate({
  children,
}: {
  children: (signOut: () => void) => ReactElement;
}) {
  return (
    <div className="auth-wrapper">
      <Authenticator>
        {({ signOut }) => children(() => signOut?.())}
      </Authenticator>
    </div>
  );
}
