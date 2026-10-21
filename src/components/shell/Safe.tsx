"use client";
import { Component, type ReactNode } from "react";

function isNextControl(e: unknown) {
  const d = e && typeof e === "object" && "digest" in e ? (e as { digest?: unknown }).digest : undefined;
  return typeof d === "string" && (d.startsWith("NEXT_REDIRECT") || d.startsWith("NEXT_HTTP_ERROR_FALLBACK") || d === "NEXT_NOT_FOUND");
}

/**
 * Error boundary for optional, personalised parts (user menu, resume button,
 * sidebar progress): if the session/progress read fails, show `fallback`
 * instead of taking down the whole page. Redirect/notFound still propagate.
 */
export class Safe extends Component<{ fallback: ReactNode; children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  componentDidCatch(e: unknown) {
    if (!isNextControl(e)) console.error(e);
  }
  render() {
    if (this.state.error) {
      if (isNextControl(this.state.error)) throw this.state.error;
      return this.props.fallback;
    }
    return this.props.children;
  }
}
