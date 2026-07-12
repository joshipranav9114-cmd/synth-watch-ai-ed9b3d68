import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type AuthorizationDetails = {
  client?: { name?: string; redirect_uri?: string } | null;
  scope?: string | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

type OAuthNs = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
};

function oauth(): OAuthNs {
  return (supabase.auth as unknown as { oauth: OAuthNs }).oauth;
}

function isSafeRelativePath(p: string): boolean {
  return p.startsWith("/") && !p.startsWith("//") && !p.startsWith("/\\");
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/login", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) {
      window.location.href = immediate;
      return data;
    }
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="flex min-h-screen items-center justify-center bg-mesh px-6 text-center">
      <div className="max-w-md rounded-3xl glass p-6">
        <h1 className="text-lg font-bold text-foreground">Authorization unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {String((error as Error)?.message ?? error)}
        </p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an app";
  const scope = details?.scope ?? "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-mesh px-5 py-10">
      <div className="w-full max-w-md rounded-3xl glass card-glow p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-cr text-background">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neon-orange">Connect</p>
            <h1 className="text-lg font-black text-foreground">{clientName} to AniVerse</h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          This lets <span className="font-semibold text-foreground">{clientName}</span> use AniVerse's tools while you're
          signed in.
        </p>

        {scope && (
          <div className="mt-4 rounded-2xl border border-border/50 bg-background/40 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Permissions</p>
            <p className="mt-1 text-xs text-foreground">{scope}</p>
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          This does not bypass AniVerse's permissions or backend policies.
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-cr text-sm font-extrabold uppercase tracking-widest text-background shadow-orange disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="h-12 w-full rounded-full border border-border text-sm font-bold text-foreground disabled:opacity-60"
          >
            Cancel connection
          </button>
        </div>
      </div>
    </main>
  );
}

export { isSafeRelativePath };