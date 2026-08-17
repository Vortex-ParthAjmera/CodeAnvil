import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { navigate, parseHash, type Route } from "./router";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Dashboard } from "./screens/Dashboard";
import { PlaybackLab } from "./screens/PlaybackLab";
import { SavedSessions } from "./screens/SavedSessions";
import { sound } from "./engine/sound";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Heavy screens (Three.js scenes) are code-split: they only load when visited.
const LandingPage = lazy(() => import("./screens/LandingPage"));
const AuthScreen = lazy(() =>
  import("./screens/AuthScreen").then((m) => ({ default: m.AuthScreen })),
);
const ArenaScreen = lazy(() =>
  import("./screens/ArenaScreen").then((m) => ({ default: m.ArenaScreen })),
);
const DsaAtlasScreen = lazy(() =>
  import("./screens/DsaAtlasScreen").then((m) => ({ default: m.DsaAtlasScreen })),
);
const RoadmapScreen = lazy(() =>
  import("./screens/RoadmapScreen").then((m) => ({ default: m.RoadmapScreen })),
);
const VisualizerScreen = lazy(() =>
  import("./screens/VisualizerScreen").then((m) => ({ default: m.VisualizerScreen })),
);
const StoryScreen = lazy(() =>
  import("./screens/StoryScreen").then((m) => ({ default: m.StoryScreen })),
);
const DuelScreen = lazy(() =>
  import("./screens/DuelScreen").then((m) => ({ default: m.DuelScreen })),
);
const Ambient3D = lazy(() =>
  import("./components/three/Ambient3D").then((m) => ({ default: m.Ambient3D })),
);

/** Fixed-position ember particles — sizes/durations randomized once per mount. */
function useEmbers(count = 12) {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: `${(i * 8.3 + 4) % 100}%`,
        size: 2 + (((i * 37) % 30) / 10),
        dur: 11 + ((i * 53) % 90) / 10,
        delay: -((i * 7) % 22),
        drift: ((i * 61) % 120) - 60,
      })),
    [count],
  );
}

function AmbientBackground() {
  const embers = useEmbers();
  return (
    <div aria-hidden className="app-ambient pointer-events-none absolute inset-0 overflow-hidden">
      <div className="app-blob app-blob-1" />
      <div className="app-blob app-blob-2" />
      <div className="app-blob app-blob-3" />
      <div className="app-grid-overlay" />
      {embers.map((e, i) => (
        <span
          key={i}
          className="app-ember"
          style={
            {
              left: e.left,
              width: `${e.size}px`,
              height: `${e.size}px`,
              "--dur": `${e.dur}s`,
              "--delay": `${e.delay}s`,
              "--drift": `${e.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

const SIDEBAR_KEY = "codeanvil.sidebar-collapsed.v1";

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash());
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(readSidebarCollapsed);
  const glowRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Unlock the audio context on the first user gesture (autoplay policy),
  // and trail a soft glow behind the cursor.
  useEffect(() => {
    const unlock = () => sound.unlock();
    const move = (e: PointerEvent) => {
      const el = glowRef.current;
      if (!el) return;
      el.style.transform = `translate3d(${e.clientX - 280}px, ${e.clientY - 280}px, 0)`;
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("pointermove", move);
    };
  }, []);

  const nav = (r: Route) => navigate(r);

  if (route.name === "landing") {
    return (
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-ink-950 text-sm text-ink-400">
            Forging…
          </div>
        }
      >
        <LandingPage onNavigate={nav} />
      </Suspense>
    );
  }

  return (
    <ErrorBoundary
      label="app"
      fallback={
        <div className="flex h-screen flex-col items-center justify-center gap-3 bg-ink-950 p-6 text-center">
          <p className="text-lg font-semibold text-ink-100">The forge tripped a breaker.</p>
          <p className="max-w-md text-sm leading-relaxed text-ink-400">
            Something crashed while rendering. Your progress is saved locally — reloading
            is safe.
          </p>
          <button
            type="button"
            onClick={() => location.reload()}
            className="btn-shine mt-2 rounded-lg bg-ember-400 px-4 py-2 text-sm font-semibold text-ink-950 transition-colors hover:bg-ember-300"
          >
            Reload CodeAnvil
          </button>
        </div>
      }
    >
      <div className="relative flex h-screen overflow-hidden text-ink-100">
        <AmbientBackground />
        {/* Living 3D world behind every screen (falls back to CSS aurora when
            motion is reduced or WebGL is unavailable). */}
        <Suspense fallback={null}>
          <Ambient3D />
        </Suspense>
        <div ref={glowRef} aria-hidden className="cursor-glow" />
        <div className="relative z-10 flex min-w-0 flex-1">
          <Sidebar route={route} onNavigate={nav} collapsed={sidebarCollapsed} />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar
              route={route}
              collapsed={sidebarCollapsed}
              onToggleCollapsed={toggleSidebar}
            />
            <main className="min-h-0 min-w-0 flex-1">
            <ErrorBoundary label="screen">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-sm text-ink-400">
                    Forging…
                  </div>
                }
              >
                {route.name === "auth" && <AuthScreen onNavigate={nav} />}
                {route.name === "dashboard" && <Dashboard onNavigate={nav} />}
                {route.name === "lab" && <PlaybackLab route={route} onNavigate={nav} />}
                {route.name === "saved" && <SavedSessions onNavigate={nav} />}
                {route.name === "atlas" && <DsaAtlasScreen onNavigate={nav} />}
                {route.name === "roadmap" && <RoadmapScreen onNavigate={nav} />}
                {route.name === "arena" && <ArenaScreen />}
                {route.name === "visualize" && <VisualizerScreen onNavigate={nav} />}
                {route.name === "story" && <StoryScreen onNavigate={nav} />}
                {route.name === "duel" && <DuelScreen />}
              </Suspense>
            </ErrorBoundary>
            </main>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
