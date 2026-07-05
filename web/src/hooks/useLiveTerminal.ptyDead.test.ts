// @vitest-environment jsdom
//
// PTY-dead (4001) reconnect budget. Switching Structured -> Terminal
// destroys and recreates the agent's tmux pane; a live-ws that connects
// during the recreate window gets a transient 4001 (server: pane_dead=1).
// The client must retry a bounded number of times so the terminal recovers
// on its own instead of latching blank forever (the bug: worst over Tailscale
// latency, where the socket reliably lands inside the recreate window). A
// pane that stays dead past the budget (agent genuinely exited) still gives
// up. These tests pin that behavior against a regression back to the old
// "one 4001 => never retry" latch.

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveTerminal } from "./useLiveTerminal";

vi.mock("../lib/token", () => ({ getToken: () => null }));
vi.mock("../lib/deviceBinding", () => ({
  getOrCreateDeviceBindingSecret: () => "test-secret",
}));

interface FakeSocket {
  readyState: number;
  onopen: ((ev: Event) => void) | null;
  onclose: ((ev: CloseEvent) => void) | null;
  onmessage: ((ev: MessageEvent) => void) | null;
  sent: Array<string | Uint8Array>;
}

const sockets: FakeSocket[] = [];
let originalWebSocket: typeof WebSocket;

class FakeWebSocket implements FakeSocket {
  readyState = 0;
  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  binaryType = "blob";
  sent: Array<string | Uint8Array> = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  constructor(_url: string, _protocols?: string | string[]) {
    sockets.push(this);
  }
  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
  }
  send(_data: unknown): void {}
}

const latest = () => sockets[sockets.length - 1]!;
const open = (socket: FakeSocket) => {
  socket.readyState = FakeWebSocket.OPEN;
  act(() => socket.onopen?.({} as Event));
};
const closeDead = (socket: FakeSocket) => act(() => socket.onclose?.({ code: 4001 } as CloseEvent));
const deliverFrame = (socket: FakeSocket) =>
  act(() =>
    socket.onmessage?.({
      data: JSON.stringify({ type: "frame", content: "hello", rows: 1, history: 0 }),
    } as MessageEvent),
  );
// Advance past the longest backoff so any scheduled reconnect fires.
const flush = () => act(() => vi.advanceTimersByTime(11000));

beforeEach(() => {
  sockets.length = 0;
  vi.useFakeTimers();
  originalWebSocket = global.WebSocket;
  global.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
});

afterEach(() => {
  global.WebSocket = originalWebSocket;
  vi.useRealTimers();
});

describe("useLiveTerminal PTY-dead reconnect budget", () => {
  it("retries instead of latching on a transient 4001 (view-switch pane recreate)", () => {
    const { result } = renderHook(() => useLiveTerminal("s1"));
    open(sockets[0]!);
    expect(sockets).toHaveLength(1);

    closeDead(sockets[0]!);

    // Regression guard: the old code set retryCount = MAX on the first 4001,
    // which flipped `reconnecting` to false (permanent blank). It must retry.
    expect(result.current.state.reconnecting).toBe(true);
    flush();
    expect(sockets.length).toBeGreaterThan(1); // reconnected to the recreated pane
  });

  it("gives up after the PTY-dead budget is exhausted (genuinely dead pane)", () => {
    renderHook(() => useLiveTerminal("s1"));
    open(sockets[0]!);

    // Six consecutive dead closes with no intervening frame: the 6th trips
    // the budget (MAX_PTY_DEAD_RETRIES = 5) and gives up.
    for (let i = 0; i < 6; i++) {
      closeDead(latest());
      flush();
    }

    const count = sockets.length;
    flush();
    expect(sockets.length).toBe(count); // no further reconnect scheduled
  });

  it("resets the budget after a live frame so a later view switch recovers again", () => {
    const { result } = renderHook(() => useLiveTerminal("s1"));
    open(sockets[0]!);

    // Burn the whole budget (5 dead retries).
    for (let i = 0; i < 5; i++) {
      closeDead(latest());
      flush();
    }

    // A frame proves the pane is alive again -> the budget resets.
    open(latest());
    deliverFrame(latest());

    // Another 4001 (a second view switch later) must still retry, not latch.
    closeDead(latest());
    expect(result.current.state.reconnecting).toBe(true);
  });
});
