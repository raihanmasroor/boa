import type { AgentInfo, AgentProfile } from "../../../lib/types";

interface WizardData {
  tool: string;
  agentEnv?: string[];
  [key: string]: unknown;
}

interface Props {
  data: WizardData;
  onChange: (field: string, value: unknown) => void;
  agents: AgentInfo[];
}

/** One pickable card: either a plain agent (no account discovery / single
 *  account) or a specific discovered account of a multi-account agent. */
interface AgentCard {
  agent: AgentInfo;
  profile?: AgentProfile;
}

/** Order-insensitive-enough equality for the small config-dir env arrays each
 *  profile carries (one entry in practice). Used only to decide which card is
 *  visually selected. */
function sameEnv(a: string[] | undefined, b: string[]): boolean {
  const left = a ?? [];
  if (left.length !== b.length) return false;
  return left.every((v, i) => v === b[i]);
}

/** Flatten agents into cards: an agent with 2+ discovered accounts expands to
 *  one card per account; every other agent (0 or 1 account) keeps a single
 *  plain card, so single-account agents are never cluttered. */
function buildCards(agents: AgentInfo[]): AgentCard[] {
  return agents.flatMap((agent) => {
    const profiles = agent.profiles ?? [];
    if (profiles.length >= 2) {
      return profiles.map((profile) => ({ agent, profile }));
    }
    return [{ agent }];
  });
}

/** Always-visible essentials of the agent section: just the agent picker
 *  grid. The structured-view choice lives in `AgentOptions` under the More
 *  options fold (#2210).
 *
 *  BOA divergence: agents with multiple discovered logged-in accounts render
 *  one card per account (e.g. `claude · personal`, `claude · ydo`). Picking one
 *  sets `tool` and the account's config-dir env (`agentEnv`), which the submit
 *  path sends as `agent_env` so the session launches on that account. */
export function AgentPickerEssentials({ data, onChange, agents }: Props) {
  const selectableAgents = agents.filter((agent) => agent.kind === "custom" || agent.installed);
  const cards = buildCards(selectableAgents);

  const pick = (agent: AgentInfo, profile?: AgentProfile) => {
    // `tool` must be set first: the reducer clears `agentEnv` on a tool change,
    // then this explicit `agentEnv` set lands the chosen account (or clears it
    // for a plain card).
    onChange("tool", agent.name);
    onChange("agentEnv", profile?.env ?? []);
  };

  const isSelected = (card: AgentCard): boolean => {
    if (data.tool !== card.agent.name) return false;
    return sameEnv(data.agentEnv, card.profile?.env ?? []);
  };

  return (
    <div>
      {/* No agents installed */}
      {selectableAgents.length === 0 && agents.length > 0 && (
        <div className="mb-5 p-4 rounded-lg border border-status-warning/30 bg-status-warning/5">
          <p className="text-sm font-semibold text-status-warning mb-2">No agents installed</p>
          <p className="text-sm text-text-muted mb-3">Install at least one AI coding agent to create a session.</p>
          <div className="space-y-1.5">
            {agents
              .filter((a) => ["claude", "codex", "gemini"].includes(a.name))
              .map((agent) => (
                <div key={agent.name} className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-text-primary w-20">{agent.name}</span>
                  <code className="text-xs text-text-dim font-mono">{agent.install_hint}</code>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Agent picker */}
      <div className="grid grid-cols-2 gap-2">
        {cards.map((card) => {
          const { agent, profile } = card;
          // Card key must be unique per account, so include the profile dir.
          const key = profile ? `${agent.name}:${profile.config_dir}` : agent.name;
          const selected = isSelected(card);
          return (
            <button
              type="button"
              key={key}
              onClick={() => pick(agent, profile)}
              title={profile ? profile.config_dir : undefined}
              aria-pressed={selected}
              className={`min-h-[44px] text-left p-3 rounded-lg border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                selected
                  ? "border-brand-600 bg-surface-900"
                  : "border-surface-700 bg-surface-950 hover:border-surface-600"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">
                  {agent.name}
                  {profile && <span className="text-text-muted font-normal"> · {profile.label}</span>}
                </span>
                {agent.kind === "custom" && (
                  <span className="rounded px-1.5 py-px text-[10px] font-mono uppercase tracking-wide bg-surface-700 text-text-dim">
                    Custom
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
