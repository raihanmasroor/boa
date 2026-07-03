// @vitest-environment jsdom
//
// BOA divergence coverage: the agent picker expands an agent with 2+ discovered
// logged-in accounts ("profiles") into one card per account, and picking one
// sets both `tool` and the account's config-dir env (`agentEnv`). Single- or
// zero-profile agents keep a single plain card.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, fireEvent } from "@testing-library/react";

import { AgentPickerEssentials } from "../steps/AgentPickerEssentials";
import { initialData } from "../wizardReducer";
import type { AgentInfo } from "../../../lib/types";

afterEach(() => {
  cleanup();
});

const claudeMulti: AgentInfo = {
  kind: "builtin",
  name: "claude",
  binary: "claude",
  host_only: false,
  installed: true,
  install_hint: "",
  acp_capable: true,
  profiles: [
    { agent: "claude", label: "default", config_dir: "/home/u/.claude", env: [] },
    {
      agent: "claude",
      label: "personal",
      config_dir: "/home/u/.claude-personal",
      env: ["CLAUDE_CONFIG_DIR=/home/u/.claude-personal"],
    },
    {
      agent: "claude",
      label: "ydo",
      config_dir: "/home/u/.claude-ydo",
      env: ["CLAUDE_CONFIG_DIR=/home/u/.claude-ydo"],
    },
  ],
};

const codexSingle: AgentInfo = {
  kind: "builtin",
  name: "codex",
  binary: "codex",
  host_only: false,
  installed: true,
  install_hint: "",
  acp_capable: true,
  // Single account → collapsed to a plain card, so no `profiles` expansion.
  profiles: [{ agent: "codex", label: "default", config_dir: "/home/u/.codex", env: [] }],
};

function renderPicker(agents: AgentInfo[], data: Partial<typeof initialData> = {}) {
  const onChange = vi.fn();
  const utils = render(
    <AgentPickerEssentials data={{ ...initialData, ...data }} onChange={onChange} agents={agents} />,
  );
  return { onChange, ...utils };
}

describe("AgentPickerEssentials profile expansion (BOA)", () => {
  it("renders one card per account for a multi-profile agent", () => {
    const { getByText } = renderPicker([claudeMulti, codexSingle]);
    expect(getByText(/· default/)).toBeTruthy();
    expect(getByText(/· personal/)).toBeTruthy();
    expect(getByText(/· ydo/)).toBeTruthy();
    // The single-account agent stays a plain card: its full label is exactly
    // "codex" (an expanded card would read "codex · default").
    expect(getByText("codex")).toBeTruthy();
  });

  it("picking a profile card sets tool and its account env", () => {
    const { getByText, onChange } = renderPicker([claudeMulti]);
    fireEvent.click(getByText(/· ydo/));
    expect(onChange).toHaveBeenCalledWith("tool", "claude");
    expect(onChange).toHaveBeenCalledWith("agentEnv", ["CLAUDE_CONFIG_DIR=/home/u/.claude-ydo"]);
  });

  it("default account card carries no env override", () => {
    const { getByText, onChange } = renderPicker([claudeMulti]);
    fireEvent.click(getByText(/· default/));
    expect(onChange).toHaveBeenCalledWith("tool", "claude");
    expect(onChange).toHaveBeenCalledWith("agentEnv", []);
  });

  it("keeps a single plain card for an agent without discovered profiles", () => {
    const plain: AgentInfo = { ...codexSingle, profiles: undefined };
    const { getByText, onChange } = renderPicker([plain]);
    const card = getByText("codex");
    fireEvent.click(card);
    expect(onChange).toHaveBeenCalledWith("tool", "codex");
    expect(onChange).toHaveBeenCalledWith("agentEnv", []);
  });
});
