import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail, Sparkles, UserRound, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

function safeNext(next: string | undefined): string {
  if (!next) return "/home";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/home";
  return next;
}

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const search = Route.useSearch();
  const nextPath = safeNext(search.next);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(null);

  // Auto-redirect already-signed-in users
  useEffect(() => {
    if (!authLoading && user) window.location.href = nextPath;
  }, [authLoading, user, nextPath]);

  // Restore remembered email for one-tap sign-in
  useEffect(() => {
    try {
      const saved = localStorage.getItem("aniverse:lastEmail");
      if (saved) {
        setRememberedEmail(saved);
        setEmail(saved);
      }
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  }, []);

  const persistEmail = (value: string) => {
    try {
      if (remember) localStorage.setItem("aniverse:lastEmail", value);
      else localStorage.removeItem("aniverse:lastEmail");
    } catch {
      // ignore
    }
  };

  const forgetMe = () => {
    try { localStorage.removeItem("aniverse:lastEmail"); } catch { /* noop */ }
    setRememberedEmail(null);
    setEmail("");
    setPw("");
  };

  const verifyAuthenticatedUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      console.error("[auth] Supabase Auth user verification failed:", error);
      throw new Error("Account authentication could not be verified. Please try again.");
    }
    return data.user;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pw,
          options: { emailRedirectTo: window.location.origin + nextPath },
        });
        if (error) {
          // Auto-switch to sign-in if account already exists
          if (
            error.message?.toLowerCase().includes("already") ||
            (error as { code?: string }).code === "user_already_exists"
          ) {
            setMode("signin");
            toast.info("Account already exists — please sign in instead.");
            return;
          }
          console.error("[auth] signUp error:", error);
          throw error;
        }
        if (data.session) {
          await verifyAuthenticatedUser();
          persistEmail(email);
          toast.success("Welcome to AniVerse!");
          window.location.href = nextPath;
        } else if (data.user) {
          persistEmail(email);
          toast.success("Account created. Check your inbox to confirm your email.");
        } else {
          console.error("[auth] signUp returned no user and no error:", data);
          throw new Error("Account creation could not be verified. Please try again.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) {
          console.error("[auth] signIn error:", error);
          if (error.message?.toLowerCase().includes("invalid")) {
            toast.error("Wrong email or password. Try again or reset your password.");
          } else {
            throw error;
          }
          return;
        }
        await verifyAuthenticatedUser();
        persistEmail(email);
        window.location.href = nextPath;
      }
    } catch (err) {
      console.error("[auth] submit failed:", err);
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const signInGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + nextPath,
      });
      if (result.error) throw result.error;
      if (result.redirected) return; // Browser navigating to Google
      await verifyAuthenticatedUser();
      window.location.href = nextPath;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  const forgotPassword = async () => {
    if (!email) {
      toast.error("Enter your email above first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (error) toast.error(error.message);
    else toast.success("Reset link sent — check your inbox.");
  };

  if (authLoading || user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-neon-orange" />
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center bg-mesh px-5 pb-10 pt-12">
      <div className="absolute inset-x-0 top-0 h-72 opacity-70" style={{
        background: "radial-gradient(60% 80% at 50% 0%, oklch(0.78 0.20 350 / 0.45), transparent 70%)",
      }} />
      <header className="relative mb-6 flex flex-col items-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-gradient-neon">AniVerse</h1>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full glass px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground">
          <Sparkles className="h-3 w-3 text-neon-pink" /> Stream the multiverse
        </div>
      </header>

      <div className="relative w-full max-w-md rounded-3xl glass card-glow p-6">
        <h2 className="mb-1 text-center text-2xl font-black tracking-tight text-foreground">
          {mode === "signin" ? "Welcome Back" : "Create Account"}
        </h2>
        <p className="mb-5 text-center text-xs text-muted-foreground">
          {mode === "signin" ? "Pick up where you left off." : "Start your AniVerse journey."}
        </p>

        {mode === "signin" && rememberedEmail && (
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-neon-orange/30 bg-neon-orange/10 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-cr text-background">
                <UserRound className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neon-orange">
                  Continue as
                </p>
                <p className="truncate text-sm font-bold text-foreground">{rememberedEmail}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={forgetMe}
              aria-label="Forget this account"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={signInGoogle}
          disabled={googleLoading || loading}
          className="mb-4 flex h-12 w-full items-center justify-center gap-3 rounded-full bg-foreground text-sm font-bold text-background shadow-orange disabled:opacity-60"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg viewBox="0 0 48 48" className="h-5 w-5">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.5C29.4 34.6 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.6 5.1C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.5 5.5C40.3 35.9 44 30.5 44 24c0-1.3-.1-2.3-.4-3.5z"/>
            </svg>
          )}
          Continue with Google
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="h-12 w-full rounded-xl bg-input pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-neon-orange"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Password</label>
              {mode === "signin" && (
                <button type="button" onClick={forgotPassword} className="text-[10px] font-bold uppercase tracking-widest text-neon-orange">
                  Forgot?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type={show ? "text" : "password"} required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="h-12 w-full rounded-xl bg-input pl-10 pr-10 text-sm text-foreground outline-none focus:ring-2 focus:ring-neon-orange"
              />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={loading || googleLoading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-cr text-sm font-extrabold uppercase tracking-widest text-background shadow-orange disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign In" : "Create Account"}
          </button>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-[hsl(var(--neon-orange))]"
            />
            Keep me signed in on this device
          </label>
        </form>
      </div>

      <p className="relative mt-6 text-sm text-muted-foreground">
        {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="font-bold text-neon-orange">
          {mode === "signin" ? "Create account" : "Sign in"}
        </button>
      </p>

      <footer className="relative mt-auto pt-10 text-center">
        <Link to="/" className="text-[10px] uppercase tracking-widest text-muted-foreground/60">Back to splash</Link>
      </footer>
    </main>
  );
}
