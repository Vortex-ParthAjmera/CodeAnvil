import { useEffect, useState, useSyncExternalStore } from "react";
import {
  BookMarked,
  Flame,
  LibraryBig,
  LayoutDashboard,
  Map as MapIcon,
  Play,
  ScanLine,
  Swords,
  Gamepad2,
  Users,
  Volume2,
  VolumeX,
  LogOut,
  UserRound,
} from "lucide-react";
import type { Route } from "../router";
import { BrandLogo } from "./BrandLogo";
import { cn } from "../lib/cn";
import { sound } from "../engine/sound";
import { heatLabel, useHeat } from "../engine/session";
import { initialsOf, signOut, useSession } from "../lib/auth";

const PRODUCT: { route: Route; label: string; icon: typeof Play }[] = [
  { route: { name: "dashboard" }, label: "Dashboard", icon: LayoutDashboard },
  { route: { name: "roadmap" }, label: "Roadmap", icon: MapIcon },
  { route: { name: "atlas" }, label: "DSA Atlas", icon: LibraryBig },
  { route: { name: "lab" }, label: "Playback Lab", icon: Play },
  { route: { name: "saved" }, label: "Saved Sessions", icon: BookMarked },
];

const MODULES: { route: Route; label: string; icon: typeof Play; hint: string }[] = [
  { route: { name: "arena" }, label: "DSA Arena", icon: Swords, hint: "sort · search · race" },
  { route: { name: "story" }, label: "Story Mode", icon: Gamepad2, hint: "worlds · missions · XP" },
  { route: { name: "duel" }, label: "Skill Duel", icon: Users, hint: "timed · leaderboard" },
  { route: { name: "visualize" }, label: "Visualize Your Code", icon: ScanLine, hint: "any language · 3D" },
];

/** Live forge clock — updates every second. */
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function Sidebar({
  route,
  onNavigate,
  collapsed = false,
}: {
  route: Route;
  onNavigate: (route: Route) => void;
  collapsed?: boolean;
}) {
  const heat = useHeat();
  const clock = useClock();
  const muted = useSyncExternalStore(sound.subscribe, () => sound.muted);
  const account = useSession();

  // Text is only shown in the expanded rail (hidden on mobile / when collapsed).
  const labelCls = collapsed ? "hidden" : "hidden sm:block";

  const NavItem = ({
    r,
    label,
    icon: Icon,
    hint,
  }: {
    r: Route;
    label: string;
    icon: typeof Play;
    hint?: string;
  }) => {
    const active = route.name === r.name;
    return (
      <button
        type="button"
        onClick={() => {
          sound.open();
          onNavigate(r);
        }}
        title={hint}
        className={cn(
          "flex w-full items-center justify-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors sm:justify-start",
          active
            ? "bg-ember-500/12 text-ember-300 ring-1 ring-ember-500/30"
            : "text-ink-300 hover:bg-ink-800 hover:text-ink-100",
        )}
      >
        <Icon size={15} />
        <span className={cn(labelCls, "min-w-0 flex-1 truncate text-left")}>{label}</span>
        {hint && (
          <span
            className={cn(
              collapsed ? "hidden" : "hidden text-[9px] uppercase tracking-wider text-ink-600 xl:block",
            )}
          >
            {hint}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-ink-700 bg-ink-900/80 backdrop-blur-sm transition-[width] duration-200 ease-out",
        collapsed ? "w-14" : "w-14 sm:w-52",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center border-b border-ink-700 py-4",
          collapsed ? "px-0" : "px-2 sm:justify-start sm:px-4",
        )}
      >
        <BrandLogo
          className={cn(
            "h-10 w-auto transition-transform duration-300 hover:scale-105",
            !collapsed && "sm:h-14",
          )}
        />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        <p className={cn(labelCls, "px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-ink-500")}>
          Product
        </p>
        {PRODUCT.map((item) => (
          <NavItem key={item.label} r={item.route} label={item.label} icon={item.icon} />
        ))}

        <p className={cn(labelCls, "px-2 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-ink-500")}>
          Modules
        </p>
        {MODULES.map((item) => (
          <NavItem
            key={item.label}
            r={item.route}
            label={item.label}
            icon={item.icon}
            hint={item.hint}
          />
        ))}
      </nav>

      {/* Account: signed-in profile chip, or sign-in prompt */}
      <div className="border-t border-ink-700 px-2 py-2.5 sm:px-3">
        {account ? (
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ember-500/20 text-[11px] font-bold text-ember-300 ring-1 ring-ember-500/40">
              {initialsOf(account.name)}
            </span>
            <div className={cn(labelCls, "min-w-0 flex-1")}>
              <p className="truncate text-xs font-semibold text-ink-100">{account.name}</p>
              <p className="truncate text-[10px] text-ink-500">
                {account.provider === "google" ? "Google account" : account.email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              title="Sign out"
              className={cn("rounded p-1 text-ink-500 transition-colors hover:bg-ink-800 hover:text-rose-300", collapsed ? "hidden" : "hidden sm:block")}
            >
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              sound.open();
              onNavigate({ name: "auth" });
            }}
            title="Sign in"
            className="flex w-full items-center justify-center gap-2 rounded-md border border-ember-500/40 bg-ember-500/10 px-2.5 py-2 text-xs font-semibold text-ember-300 transition-colors hover:bg-ember-500/20 sm:justify-start"
          >
            <UserRound size={13} />
            <span className={labelCls}>Sign in</span>
          </button>
        )}
      </div>

      {/* Live forge status: heat gauge + clock + sound toggle */}
      <div className={cn("border-t border-ink-700 px-4 py-3", collapsed ? "hidden" : "hidden sm:block")}>
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-400">
            <Flame
              size={11}
              className={cn(
                "transition-colors",
                heat >= 35 ? "text-ember-300" : "text-ink-500",
              )}
            />
            Forge {heatLabel(heat)}
          </span>
          <span className="font-mono text-[10px] text-ink-500">{clock}</span>
        </div>
        <div className="heat-track">
          <div className="heat-fill" style={{ width: `${heat}%` }} />
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-ink-500">
          {heat >= 70
            ? "The forge is roaring — keep the steps coming."
            : heat >= 35
              ? "Hot streak — every step keeps it lit."
              : heat > 0
                ? "Warming up — step a trace to stoke it."
                : "Idle forge — step a trace to stoke it."}
        </p>
        <button
          type="button"
          onClick={() => {
            sound.toggle();
            if (sound.muted) sound.unlock();
          }}
          className="mt-2 flex w-full items-center gap-2 rounded-md border border-ink-700 bg-ink-800 px-2.5 py-1.5 text-[11px] text-ink-300 transition-colors hover:border-ink-600 hover:text-ink-100"
        >
          {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          {muted ? "Sound off" : "Sound on"}
          <span className="ml-auto text-[9px] uppercase tracking-wider text-ink-600">
            synth
          </span>
        </button>
        <p className="mt-2 text-[10px] leading-relaxed text-ink-500">
          All modules live.
          <br />
          Local-first — nothing executes user code.
        </p>
      </div>
    </aside>
  );
}
