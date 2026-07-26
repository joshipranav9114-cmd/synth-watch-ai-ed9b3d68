import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Shield, Eye, Bell, Database, Download, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/settings/privacy")({ component: PrivacySecurity });

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative h-6 w-11 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}
    >
      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function PrivacySecurity() {
  const nav = useNavigate();
  const { user, signOut } = useAuth();

  const [publicProfile, setPublicProfile] = useState(() =>
    localStorage.getItem("av-public-profile") !== "false"
  );
  const [showWatchlist, setShowWatchlist] = useState(() =>
    localStorage.getItem("av-show-watchlist") !== "false"
  );
  const [showReviews, setShowReviews] = useState(() =>
    localStorage.getItem("av-show-reviews") !== "false"
  );
  const [emailNotifs, setEmailNotifs] = useState(() =>
    localStorage.getItem("av-email-notifs") !== "false"
  );
  const [communityNotifs, setCommunityNotifs] = useState(() =>
    localStorage.getItem("av-community-notifs") !== "false"
  );

  const handleSavePrivacy = () => {
    localStorage.setItem("av-public-profile", String(publicProfile));
    localStorage.setItem("av-show-watchlist", String(showWatchlist));
    localStorage.setItem("av-show-reviews", String(showReviews));
    localStorage.setItem("av-email-notifs", String(emailNotifs));
    localStorage.setItem("av-community-notifs", String(communityNotifs));
    toast.success("Privacy settings saved!");
  };

  const handleExportData = async () => {
    if (!user) return;
    toast("Preparing your data export...");
    try {
      const [watchlist, reviews, comments, progress] = await Promise.all([
        supabase.from("watchlist").select("*").eq("user_id", user.id),
        supabase.from("anime_reviews").select("*").eq("user_id", user.id),
        supabase.from("anime_comments").select("*").eq("user_id", user.id),
        supabase.from("watch_progress").select("*").eq("user_id", user.id),
      ]);
      const exportData = {
        exported_at: new Date().toISOString(),
        user_email: user.email,
        watchlist: watchlist.data ?? [],
        reviews: reviews.data ?? [],
        comments: comments.data ?? [],
        watch_progress: progress.data ?? [],
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aniverse-data-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully!");
    } catch {
      toast.error("Export failed. Please try again.");
    }
  };

  const handleSignOutAllDevices = async () => {
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) { toast.error(error.message); return; }
    toast.success("Signed out from all devices!");
    nav({ to: "/login", search: { next: "/" } });
  };

  return (
    <main className="px-5 pt-10 pb-28">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => nav({ to: "/profile" })}
          className="flex h-9 w-9 items-center justify-center rounded-full glass">
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
        <h1 className="text-xl font-extrabold text-foreground">Privacy & Security</h1>
      </div>

      {/* Profile Visibility */}
      <div className="mb-4 rounded-2xl glass p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Eye className="h-4 w-4 text-neon-cyan" />
          <p className="text-xs font-bold uppercase tracking-widest text-neon-cyan">Profile Visibility</p>
        </div>
        {[
          { label: "Public Profile", sub: "Other users can find and view your profile", value: publicProfile, onChange: setPublicProfile },
          { label: "Show Watchlist", sub: "Let others see your anime watchlist", value: showWatchlist, onChange: setShowWatchlist },
          { label: "Show Reviews", sub: "Display your reviews publicly", value: showReviews, onChange: setShowReviews },
        ].map(({ label, sub, value, onChange }) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-[11px] text-muted-foreground">{sub}</p>
            </div>
            <Toggle value={value} onChange={onChange} />
          </div>
        ))}
      </div>

      {/* Notifications */}
      <div className="mb-4 rounded-2xl glass p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="h-4 w-4 text-neon-pink" />
          <p className="text-xs font-bold uppercase tracking-widest text-neon-pink">Notifications</p>
        </div>
        {[
          { label: "Email Notifications", sub: "Receive updates via email", value: emailNotifs, onChange: setEmailNotifs },
          { label: "Community Alerts", sub: "Replies to your comments and reviews", value: communityNotifs, onChange: setCommunityNotifs },
        ].map(({ label, sub, value, onChange }) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-[11px] text-muted-foreground">{sub}</p>
            </div>
            <Toggle value={value} onChange={onChange} />
          </div>
        ))}
      </div>

      {/* Save button */}
      <button onClick={handleSavePrivacy}
        className="w-full mb-4 rounded-2xl bg-gradient-to-r from-primary to-secondary py-3 text-sm font-extrabold uppercase tracking-widest text-primary-foreground">
        Save Privacy Settings
      </button>

      {/* Data */}
      <div className="mb-4 rounded-2xl glass p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Database className="h-4 w-4 text-neon-orange" />
          <p className="text-xs font-bold uppercase tracking-widest text-neon-orange">Your Data</p>
        </div>
        <button onClick={handleExportData}
          className="flex w-full items-center gap-3 rounded-xl glass px-3 py-3 hover:bg-muted/40 transition-colors">
          <Download className="h-4 w-4 text-neon-cyan" />
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Export My Data</p>
            <p className="text-[11px] text-muted-foreground">Download watchlist, reviews and comments as JSON</p>
          </div>
        </button>
      </div>

      {/* Security */}
      <div className="rounded-2xl glass p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-neon-pink" />
          <p className="text-xs font-bold uppercase tracking-widest text-neon-pink">Security</p>
        </div>
        <button onClick={handleSignOutAllDevices}
          className="flex w-full items-center gap-3 rounded-xl glass px-3 py-3 hover:bg-destructive/10 transition-colors">
          <LogOut className="h-4 w-4 text-destructive" />
          <div className="text-left">
            <p className="text-sm font-semibold text-destructive">Sign Out All Devices</p>
            <p className="text-[11px] text-muted-foreground">Revoke all active sessions everywhere</p>
          </div>
        </button>
      </div>
    </main>
  );
}
