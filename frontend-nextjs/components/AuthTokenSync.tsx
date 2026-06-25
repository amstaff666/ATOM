import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { setAuthToken } from "@/lib/auth-token";

type SessionWithBackendToken = {
  backendToken?: string;
};

export function AuthTokenSync() {
  const { data: session } = useSession();
  const backendToken = (session as SessionWithBackendToken | null)?.backendToken;

  useEffect(() => {
    if (backendToken) {
      setAuthToken(backendToken);
    }
  }, [backendToken]);

  return null;
}