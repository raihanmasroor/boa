// @vitest-environment jsdom
//
// Modal-side contract for the agent-switch flow (#1281 / #1282), now
// account-aware. The list is sourced from /api/agents (installed + ACP-capable
// + discovered accounts): agents the host never set up are dropped, and an
// agent with 2+ accounts (e.g. claude personal / ydo) renders one row per
// account. Switching carries the chosen account's env so the new worker
// launches on the right account (separate token pools). These tests pin: the
// install/account filtering, per-account rows, the env passed to switchAcpAgent,
// and the handoff/prefill/cancel/error behavior.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";

import { SwitchAgentModal } from "./SwitchAgentModal";
import type { AgentInfo, AgentProfile } from "../../lib/types";

vi.mock("../../lib/api", () => ({
  fetchAgents: vi.fn(),
  switchAcpAgent: vi.fn(),
  fetchContextPrimer: vi.fn(),
}));

import { fetchAgents, fetchContextPrimer, switchAcpAgent } from "../../lib/api";

const mockAgents = vi.mocked(fetchAgents);
const mockSwitch = vi.mocked(switchAcpAgent);
const mockPrimer = vi.mocked(fetchContextPrimer);

/** An /api/agents fixture; installed + ACP-capable, single account by default. */
function agentInfo(name: string, overrides: Partial<AgentInfo> = {}): AgentInfo {
  return {
    name,
    kind: "builtin",
    binary: name,
    host_only: false,
    installed: true,
    install_hint: "",
    acp_capable: true,
    acp_installed: true,
    profiles: [],
    ...overrides,
  };
}
function profile(label: string, dir: string): AgentProfile {
  return { agent: "claude", label, config_dir: dir, env: [`CLAUDE_CONFIG_DIR=${dir}`] };
}
const radioValues = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLInputElement>("input[name=acp-agent-target]")).map((r) => r.value);

beforeEach(() => {
  vi.clearAllMocks();
  mockAgents.mockResolvedValue([agentInfo("claude"), agentInfo("codex"), agentInfo("gemini")]);
  mockSwitch.mockResolvedValue({
    session_id: "s-1",
    agent: "codex",
    before_seq: 41,
    switch_seq: 42,
    status: "switched",
  });
  mockPrimer.mockResolvedValue({
    primer: "user: hi\nagent: hello",
    included_event_count: 2,
    included_turn_count: 1,
    truncated: false,
    max_chars: 4_000,
    unprocessed_prompt: "deploy the thing",
  });
});

afterEach(() => {
  cleanup();
});

function mount(props?: Partial<React.ComponentProps<typeof SwitchAgentModal>>) {
  const onClose = vi.fn();
  const onPrefill = vi.fn();
  const utils = render(
    <SwitchAgentModal
      open
      sessionId="s-1"
      currentAgent="claude"
      onClose={onClose}
      onPrefill={onPrefill}
      trigger="rate_limit"
      {...props}
    />,
  );
  return { onClose, onPrefill, ...utils };
}

describe("SwitchAgentModal — install + account list", () => {
  it("lists only installed ACP agents and hides a single-account current agent", async () => {
    mockAgents.mockResolvedValue([
      agentInfo("claude"),
      agentInfo("codex"),
      agentInfo("opencode", { installed: false }),
    ]);
    const { container, findByText } = mount({ trigger: "manual", currentAgent: "codex" });
    await findByText(/Switch to claude/);
    const values = radioValues(container);
    expect(values).toContain("claude");
    expect(values).not.toContain("codex"); // current single-account agent hidden
    expect(values).not.toContain("opencode"); // not installed
  });

  it("expands a multi-account agent into one row per account", async () => {
    mockAgents.mockResolvedValue([
      agentInfo("claude", {
        profiles: [profile("personal", "/h/.claude-personal"), profile("ydo", "/h/.claude-ydo")],
      }),
      agentInfo("codex"),
    ]);
    const { container, findByText } = mount({ trigger: "manual", currentAgent: "gemini" });
    await findByText(/account: personal/);
    await findByText(/account: ydo/);
    const values = radioValues(container);
    expect(values).toEqual(expect.arrayContaining(["claude::personal", "claude::ydo", "codex"]));
  });

  it("switching to a specific account sends that account's env to switchAcpAgent", async () => {
    mockAgents.mockResolvedValue([
      agentInfo("claude", {
        profiles: [profile("personal", "/h/.claude-personal"), profile("ydo", "/h/.claude-ydo")],
      }),
    ]);
    const { container, findByText } = mount({ trigger: "manual", currentAgent: "codex" });
    await findByText(/account: ydo/);
    const ydo = container.querySelector<HTMLInputElement>('input[name=acp-agent-target][value="claude::ydo"]');
    fireEvent.click(ydo!);
    fireEvent.click(await findByText(/Switch to claude · ydo/));
    await waitFor(() => expect(mockSwitch).toHaveBeenCalledTimes(1));
    expect(mockSwitch).toHaveBeenCalledWith("s-1", "claude", null, "manual", ["CLAUDE_CONFIG_DIR=/h/.claude-ydo"]);
  });

  it("keeps every account of a multi-account CURRENT agent so you can switch accounts", async () => {
    mockAgents.mockResolvedValue([
      agentInfo("claude", {
        profiles: [profile("personal", "/h/.claude-personal"), profile("ydo", "/h/.claude-ydo")],
      }),
      agentInfo("codex"),
    ]);
    const { container, findByText } = mount({ trigger: "manual", currentAgent: "claude" });
    await findByText(/account: ydo/);
    const values = radioValues(container);
    expect(values).toEqual(expect.arrayContaining(["claude::personal", "claude::ydo"]));
  });

  it("shows the install hint when no other agents or accounts are available", async () => {
    mockAgents.mockResolvedValue([agentInfo("claude")]); // only the single-account current agent
    const { findByText } = mount({ currentAgent: "claude" });
    await findByText(/No other installed structured view agents or accounts/i);
  });
});

describe("SwitchAgentModal — handoff", () => {
  it("rate-limit prefers codex and passes an empty env for a single-account agent", async () => {
    const { findByText } = mount({ currentAgent: "claude", trigger: "rate_limit" });
    fireEvent.click(await findByText(/Continue in codex/));
    await waitFor(() => expect(mockSwitch).toHaveBeenCalledTimes(1));
    expect(mockSwitch).toHaveBeenCalledWith("s-1", "codex", null, "rate_limited", []);
  });

  it("hands off via switchAcpAgent + fetchContextPrimer and prefills the recap", async () => {
    const { findByText, onPrefill, onClose } = mount({ currentAgent: "claude" });
    fireEvent.click(await findByText(/Continue in codex/));
    await waitFor(() => expect(mockSwitch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockPrimer).toHaveBeenCalledTimes(1));
    // before_seq (41), not switch_seq, so the recap excludes the switch event.
    expect(mockPrimer.mock.calls[0]?.[1]).toBe(41);
    await waitFor(() => expect(onPrefill).toHaveBeenCalledTimes(1));
    const prefilled = onPrefill.mock.calls[0]?.[0] as string;
    expect(prefilled).toContain("CONTEXT HANDOFF");
    expect(prefilled).toContain("codex");
    expect(prefilled).toContain("user: hi");
    expect(prefilled).toContain("deploy the thing");
    expect(prefilled.indexOf("user: hi")).toBeLessThan(prefilled.indexOf("deploy the thing"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("records reason 'manual' and frames the recap as a plain switch", async () => {
    const { findByText, onPrefill } = mount({ trigger: "manual", currentAgent: "claude" });
    fireEvent.click(await findByText(/Switch to codex/));
    await waitFor(() => expect(mockSwitch).toHaveBeenCalledTimes(1));
    expect(mockSwitch).toHaveBeenCalledWith("s-1", "codex", null, "manual", []);
    await waitFor(() => expect(onPrefill).toHaveBeenCalledTimes(1));
    const prefilled = onPrefill.mock.calls[0]?.[0] as string;
    expect(prefilled).toContain("switched from claude to codex");
    expect(prefilled).not.toContain("rate-limited");
  });

  it("does not switch on cancel", async () => {
    const { findByText, onClose } = mount({ currentAgent: "claude" });
    await findByText(/Continue in codex/);
    fireEvent.click(await findByText("Cancel"));
    expect(mockSwitch).not.toHaveBeenCalled();
    expect(mockPrimer).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape without switching", async () => {
    const { findByText, onClose } = mount({ currentAgent: "claude" });
    await findByText(/Continue in codex/);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockSwitch).not.toHaveBeenCalled();
  });

  it("surfaces a server error and keeps the modal open", async () => {
    mockSwitch.mockRejectedValue(new Error("boom"));
    const { findByText, onPrefill, onClose } = mount({ currentAgent: "claude" });
    fireEvent.click(await findByText(/Continue in codex/));
    const alert = await findByText(/boom/);
    expect(alert.textContent).toMatch(/boom/);
    expect(onPrefill).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("surfaces fetchAgents rejection in the modal error slot", async () => {
    mockAgents.mockRejectedValue(new Error("agents fetch broke"));
    const { findByText, onPrefill } = mount({ currentAgent: "claude" });
    const alert = await findByText(/agents fetch broke/);
    expect(alert.textContent).toMatch(/agents fetch broke/);
    expect(mockSwitch).not.toHaveBeenCalled();
    expect(onPrefill).not.toHaveBeenCalled();
  });

  it("surfaces a generic message when switchAcpAgent returns null", async () => {
    mockSwitch.mockResolvedValue(null);
    const { findByText, onPrefill, onClose } = mount({ currentAgent: "claude" });
    fireEvent.click(await findByText(/Continue in codex/));
    await findByText(/server returned no response/i);
    expect(mockPrimer).not.toHaveBeenCalled();
    expect(onPrefill).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
