import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, User, Mail, Lock, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/settings/account")({ component: AccountSettings });

function AccountSettings() {
  const nav = useNavigate();
  const { user, signOut } = useAuth();

  const [displayName, setDisplayName] = useState(user?.email?.split("@")[0] ?? "");
  const [savingName, setSavingName] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleSaveName = async () => {
    if (!user || !displayName.trim()) return;
    setSavingName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", user.id);
    setSavingName(false);
    if (error) { toast.error("Failed to save name"); return; }
    toast.success("Display name updated!");
  };

  const handleChangePassword = async () => {
    if (!newPw.trim()) { toast.error("Enter a new password"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords don't match"); return; }
    if (newPw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSavingPw(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password changed successfully!");
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
  };

  const handleDeleteAccount = async () => {
    toast.error("Please contact support to delete your account.");
    setDeleteConfirm(false);
  };

  return (
    <main className="px-5 pt-10 pb-28">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => nav({ to: "/profile" })}
          className="flex h-9 w-9 items-center justify-center rounded-full glass">
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
        <h1 className="text-xl font-extrabold text-foreground">Account Settings</h1>
      </div>

      {/* Email (read-only) */}
      <div className="mb-4 rounded-2xl glass p-4 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Mail className="h-4 w-4 text-neon-cyan" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email</p>
        </div>
        <p className="text-sm font-semibold text-foreground">{user?.email}</p>
        <p className="text-[11px] text-muted-foreground">Email cannot be changed</p>
      </div>

      {/* Display Name */}
      <div className="mb-4 rounded-2xl glass p-4 space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-neon-pink" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Display Name</p>
        </div>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={24}
          placeholder="Your display name"
          className="w-full rounded-xl bg-muted/30 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={handleSaveName}
          disabled={savingName || !displayName.trim()}
          className="w-full rounded-xl bg-gradient-to-r from-primary to-secondary py-2 text-xs font-extrabold uppercase tracking-widest text-primary-foreground disabled:opacity-40"
        >
          {savingName ? "Saving..." : "Save Name"}
        </button>
      </div>

      {/* Change Password */}
      <div className="mb-4 rounded-2xl glass p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-neon-orange" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Change Password</p>
        </div>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="New password"
            className="w-full rounded-xl bg-muted/30 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground pr-10"
          />
          <button onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <input
          type={showPw ? "text" : "password"}
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          placeholder="Confirm new password"
          className="w-full rounded-xl bg-muted/30 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={handleChangePassword}
          disabled={savingPw || !newPw || !confirmPw}
          className="w-full rounded-xl bg-gradient-to-r from-primary to-secondary py-2 text-xs font-extrabold uppercase tracking-widest text-primary-foreground disabled:opacity-40"
        >
          {savingPw ? "Updating..." : "Update Password"}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-destructive/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-destructive" />
          <p className="text-xs font-bold uppercase tracking-widest text-destructive">Danger Zone</p>
        </div>
        {!deleteConfirm ? (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="w-full rounded-xl border border-destructive/50 py-2 text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors"
          >
            Delete Account
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Are you sure? This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={handleDeleteAccount}
                className="flex-1 rounded-xl bg-destructive py-2 text-xs font-bold text-destructive-foreground">
                Yes, Delete
              </button>
              <button onClick={() => setDeleteConfirm(false)}
                className="flex-1 rounded-xl glass py-2 text-xs font-bold text-muted-foreground">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
