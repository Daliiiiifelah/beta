/// <reference types="vite/client" />

declare module "convex/auth/react" {
    export interface AuthSession {
      user: { name?: string; email?: string } | null;
      isLoading: boolean;  // <-- correct casing
    }
  
    export function useAuthSession(): AuthSession;
    export function useSignInPassword(): (data: FormData) => Promise<void>;
    export function useSignInAnonymous(): () => Promise<void>;
  }