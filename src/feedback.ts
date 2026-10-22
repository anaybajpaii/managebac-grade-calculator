import type { FeedbackPayload } from "./ui/feedback-panel";

type Fetch = (url: string, init: RequestInit) => Promise<{ ok: boolean }>;

const MIN_GAP_MS = 20_000;
let lastSent = 0;

/** Posts feedback as JSON. Rejects when the endpoint fails or sends come too fast. */
export async function sendFeedback(
  url: string,
  version: string,
  payload: FeedbackPayload,
  fetchImpl: Fetch = (u, i) => fetch(u, i),
  now: () => number = Date.now,
): Promise<void> {
  if (url === "") throw new Error("feedback is not configured");
  if (lastSent !== 0 && now() - lastSent < MIN_GAP_MS) throw new Error("too fast");
  const body: Record<string, string> = {
    message: payload.message.slice(0, 2000),
    version,
  };
  if (payload.email) body.email = payload.email;
  if (payload.diagnostics) body.diagnostics = payload.diagnostics;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("feedback rejected");
  lastSent = now();
}

/** For tests. */
export function resetFeedbackLimit(): void {
  lastSent = 0;
}
