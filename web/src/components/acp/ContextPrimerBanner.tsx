import { useEffect, useRef, useState } from "react";
import { fetchContextPrimer } from "../../lib/api";

/**
 * Banner shown above the structured view composer when `session/load` failed
 * and a prior user prompt exists. Clicking "Resume with prior context"
 * fetches a markdown primer (last N turns from the SQLite event log)
 * and pre-fills the composer with it so the user can review/edit
 * before sending. See #1004.
 *
 * Dismiss state lives on the cached reducer state (`onDismiss` clears
 * `contextPrimerAvailable` in the hook) rather than component-local
 * `useState`, so dismissing once survives session switches. See #1110.
 */
interface Props {
  sessionId: string;
  available: { resetSeq: number; reason: string } | null;
  onInsertPrimer: (text: string) => void;
  onDismiss: () => void;
}

export function ContextPrimerBanner({ sessionId, available, onInsertPrimer, onDismiss }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset transient state whenever a new reset incident lands.
  const [handledResetSeq, setHandledResetSeq] = useState<number | null>(null);
  const resetSeq = available?.resetSeq ?? null;
  if (resetSeq !== handledResetSeq) {
    setHandledResetSeq(resetSeq);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [sessionId, available?.resetSeq]);

  if (!available) return null;

  const handleClick = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetchContextPrimer(sessionId, available.resetSeq, controller.signal);
      if (controller.signal.aborted) return;
      if (!resp || !resp.primer) {
        setError(resp ? "No prior transcript available to recap." : "Failed to fetch primer.");
        return;
      }
      onInsertPrimer(resp.primer);
      onDismiss();
    } catch (e) {
      if ((e as { name?: string }).name === "AbortError") return;
      setError("Network error fetching primer.");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  return (
    <div
      role="status"
      className="bg-amber-100 border-y border-amber-300 px-4 py-2 flex items-center gap-3 text-xs font-mono text-amber-900"
    >
      <span className="shrink-0 text-amber-800" aria-hidden="true">
        ⚠
      </span>
      <span className="flex-1 leading-snug">
        Agent lost its prior model context.{" "}
        <span className="text-amber-800">You can pre-fill the composer with a recap of the recent turns.</span>
      </span>
      {error && (
        <span className="text-rose-800 text-[11px] shrink-0" role="alert">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="shrink-0 px-2 py-1 rounded bg-amber-200 hover:bg-amber-300 border border-amber-400 text-amber-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        {loading ? "Loading..." : "Resume with prior context"}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss context-reset banner"
        className="shrink-0 px-1 text-amber-800 hover:text-amber-900 cursor-pointer"
      >
        &times;
      </button>
    </div>
  );
}
