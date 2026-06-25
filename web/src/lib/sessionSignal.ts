import type { SessionSignal } from "./types";

/** Per-session status signals an agent or operator can set, rendered as a
 *  colored sidebar dot. Kept separate from `repoAppearance` (repo/workspace
 *  visual color), because a signal is a meaning, not a decorative color. The
 *  three map onto the existing traffic-light theme tokens. See #2383. */

const SIGNAL_TOKENS: Record<SessionSignal, string> = {
  blocked: "--color-status-error",
  working: "--color-status-waiting",
  done: "--color-terminal-active",
};

const SIGNAL_LABELS: Record<SessionSignal, string> = {
  blocked: "Blocked",
  working: "Working",
  done: "Done",
};

/** Ordered list for rendering the context-menu submenu. */
export const SESSION_SIGNALS: SessionSignal[] = ["blocked", "working", "done"];

export function signalColor(signal: SessionSignal): string {
  return `var(${SIGNAL_TOKENS[signal]})`;
}

export function signalLabel(signal: SessionSignal): string {
  return SIGNAL_LABELS[signal];
}
