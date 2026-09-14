// client/src/auth/AuthContext.tsx
import {
  createContext, useContext, useEffect, useState, type ReactNode,
} from "react";
import type { ApiError, AuthUser, LoginInput, RegisterInput } from "@fluxion/shared";
import { apiFetch, ApiFetchError } from "../lib/api";

type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: AuthUser }
  | { status: "unauthenticated" }
  | { status: "error"; error: ApiError };

type AuthContextValue = {
  state: AuthState;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  async function loadSession(): Promise<void> {
    setState({ status: "loading" });
    try {
      const { user } = await apiFetch<{ user: AuthUser }>("/auth/me");
      setState({ status: "authenticated", user });
    } catch (e) {
      if (e instanceof ApiFetchError && e.apiError.type === "unauthorized") {
        setState({ status: "unauthenticated" });     // 401 → definitively logged out
      } else if (e instanceof ApiFetchError) {
        setState({ status: "error", error: e.apiError }); // 5xx/network → unknown
      } else {
        setState({ status: "error", error: { type: "internal", code: "INTERNAL_ERROR", message: "Unknown error" } });
      }
    }
  }

  useEffect(() => { void loadSession(); }, []);        // run once on mount

  async function login(input: LoginInput): Promise<void> {
    const { user } = await apiFetch<{ user: AuthUser }>("/auth/login", {
      method: "POST", body: JSON.stringify(input),
    });
    setState({ status: "authenticated", user });       // throws on failure — form catches
  }

  async function register(input: RegisterInput): Promise<void> {
    await apiFetch<{ user: AuthUser }>("/auth/register", {
      method: "POST", body: JSON.stringify(input),
    });                                                 // no auto-login (Day 3) — form redirects to /login
  }

  async function logout(): Promise<void> {
    try { await apiFetch<void>("/auth/logout", { method: "POST" }); }
    finally { setState({ status: "unauthenticated" }); } // clear locally even if the call fails
  }

  const value: AuthContextValue = { state, login, register, logout, refresh: loadSession };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;                                           // guard NARROWS to non-undefined
}