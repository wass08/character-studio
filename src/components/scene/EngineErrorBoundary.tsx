"use client";

import { Component, type ReactNode } from "react";

// A bad GLTF/texture (404, parse failure, stale cross-gender URL after a
// navigation) THROWS out of useGLTF/useTexture. <Suspense> only catches
// promises, not errors, so an unguarded throw unwinds the whole R3F tree and
// freezes the canvas (no frames, dead camera). This boundary contains the
// failure to one engine subtree (renders nothing in its place) and clears
// itself when `resetKey` changes, so the next request can try again.
export class EngineErrorBoundary extends Component<
  { children: ReactNode; resetKey: string; onError?: () => void; label?: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn(
      `[engine] ${this.props.label ?? "subtree"} failed to load and was dropped`,
      error,
    );
    this.props.onError?.();
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
