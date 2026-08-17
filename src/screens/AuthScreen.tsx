import { useState } from "react";
import { AtSign, Eye, EyeOff, KeyRound, Lock, ShieldCheck, User as UserIcon } from "lucide-react";
import { signIn, signInWithGoogle, signUp } from "../lib/auth";
import { BrandLogo } from "../components/BrandLogo";
import { AnimatedHeading } from "../components/motionfx";
import { Badge, Button, Card } from "../components/ui";
import type { Route } from "../router";

type Mode = "signin" | "signup";

const PROVIDER_PLAN = [
  { title: "Google OAuth", line: "Primary provider when the backend ships — one tap, no passwords to forget." },
  { title: "Email + password", line: "Kept as a fallback with magic-link option, per docs/35 security gate." },
  { title: "Local-first today", line: "This screen is a live demo: accounts live in this browser only, nothing is sent anywhere." },
];

export function AuthScreen({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = () => {
    setError(null);
    setBusy(true);
    // Small delay so the loading state reads as real work.
    window.setTimeout(() => {
      const res =
        mode === "signup"
          ? signUp(name, email, password)
          : signIn(email, password);
      setBusy(false);
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      onNavigate({ name: "dashboard" });
    }, 450);
  };

  const google = () => {
    setError(null);
    setBusy(true);
    window.setTimeout(() => {
      const res = signInWithGoogle();
      setBusy(false);
      if (!res.ok) {
        setError(res.error ?? "Google sign-in unavailable.");
        return;
      }
      onNavigate({ name: "dashboard" });
    }, 600);
  };

  const inputCls =
    "w-full rounded-md border border-ink-700 bg-ink-850 px-3 py-2.5 pl-9 text-sm text-ink-100 outline-none placeholder:text-ink-600 focus:border-ember-500/60";

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-4xl gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Left: pitch + provider plan */}
        <div>
          <div className="mb-6 flex items-center">
            <BrandLogo className="h-10 w-auto" />
          </div>

          <AnimatedHeading
            text="Your forge, your progress."
            gradientLast
            className="text-3xl font-bold tracking-tight text-ink-100"
          />
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-300">
            Sign in to keep your XP, saved sessions, duels, and themes. Progress
            stays local-first — accounts unlock the sync layer when the backend
            ships.
          </p>

          <ul className="mt-6 space-y-3">
            {PROVIDER_PLAN.map((p) => (
              <li key={p.title} className="flex gap-3 rounded-lg border border-ink-800 bg-ink-900/60 px-3 py-2.5">
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-verdant-300" />
                <div>
                  <p className="text-xs font-semibold text-ink-100">{p.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-ink-400">{p.line}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: the card */}
        <Card className="h-fit p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink-100">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <Badge tone="amber">demo · local</Badge>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-lg border border-ink-700 bg-ink-850 p-1">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  mode === m
                    ? "bg-ember-400 text-ink-950"
                    : "text-ink-400 hover:text-ink-100"
                }`}
              >
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {mode === "signup" && (
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                  Name
                </span>
                <span className="relative block">
                  <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ada Lovelace"
                    className={inputCls}
                  />
                </span>
              </label>
            )}
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                Email
              </span>
              <span className="relative block">
                <AtSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputCls}
                  autoComplete="email"
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                Password
              </span>
              <span className="relative block">
                <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                  className={inputCls}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300"
                  title={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </span>
            </label>
          </div>

          {error && (
            <p className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          )}

          <Button
            variant="primary"
            className="btn-shine mt-4 h-10 w-full"
            onClick={submit}
            disabled={busy}
          >
            {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>

          <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-widest text-ink-600">
            <span className="h-px flex-1 bg-ink-700" /> or <span className="h-px flex-1 bg-ink-700" />
          </div>

          <Button
            variant="default"
            className="h-10 w-full"
            onClick={google}
            disabled={busy}
          >
            <Lock size={14} className="text-arc-300" /> Continue with Google (demo)
          </Button>

          <p className="mt-4 text-[10px] leading-relaxed text-ink-600">
            Demo mode: accounts are stored in this browser only and passwords
            are hashed locally. Real Google OAuth + sync arrive with the backend
            (docs/35 — Backend Pre-Deploy Security Gate). Nothing you type is
            ever sent to a server.
          </p>
        </Card>
      </div>
    </div>
  );
}
