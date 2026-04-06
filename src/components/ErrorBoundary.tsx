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
          <h2 className="text-xl font-bold text-chocolate mb-2">Something went wrong</h2>
          <p className="text-caramel text-sm mb-4">{this.state.error.message}</p>
          <button
            onClick={() => {
              this.resetKey += 1;
              this.setState({ error: null });
              // Force children to remount so useEffects re-fire
              this.forceUpdate();
            }}
            className="bg-pink-bold text-white px-4 py-2 rounded-full font-semibold hover:bg-pink-mid transition-colors"
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
