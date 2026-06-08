"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  private resetKey = 0;

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="p-8 text-center">
          <p className="lab-label mb-2 text-hazard">Error · uncaught exception</p>
          <h2 className="lab-mono mb-2 text-lg font-bold text-ink">Something went wrong</h2>
          <p className="lab-mono mb-4 text-sm text-muted">{this.state.error.message}</p>
          <button
            onClick={() => {
              this.resetKey += 1;
              this.setState({ error: null });
              // Force children to remount so useEffects re-fire
              this.forceUpdate();
            }}
            className="lab-btn lab-btn-primary"
          >
            Try again
          </button>
        </div>
      );
    }
    // Key changes on retry, forcing children to remount
    return <div key={this.resetKey}>{this.props.children}</div>;
  }
}
