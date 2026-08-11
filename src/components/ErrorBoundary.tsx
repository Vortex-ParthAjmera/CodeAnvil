import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback UI instead of the default recovery card. */
  fallback?: ReactNode;
  /** Short label for the console log, e.g. "3D anatomy". */
  label?: string;
  /** Called when the user clicks "try again". */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render/lifecycle errors from children so a single broken panel
 * (e.g. a WebGL failure) can never blank the whole app. When no custom
 * fallback is given, shows a recovery card with the error message and a
 * "try again" button.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`, error, info);
  }

  private handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;

    return (
      <div className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 text-center">
        <p className="text-sm font-semibold text-ink-100">This panel hit a snag.</p>
        <p className="max-w-md font-mono text-[11px] leading-relaxed text-ink-500">
          {String(this.state.error.message || this.state.error)}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={this.handleReset}
            className="rounded-lg border border-ember-500/50 bg-ember-500/15 px-3 py-1.5 text-xs font-semibold text-ember-300 transition-colors hover:bg-ember-500/25"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => location.reload()}
            className="rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-300 transition-colors hover:border-ink-500"
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}
