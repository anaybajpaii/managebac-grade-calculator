import { beforeEach, describe, expect, it } from "vitest";
import { resetFeedbackLimit, sendFeedback } from "./feedback";

const payload = { message: "grade is wrong", email: "", diagnostics: "subject: PHYSICS" };

describe("sendFeedback", () => {
  beforeEach(resetFeedbackLimit);

  it("posts the message, version and diagnostics as JSON", async () => {
    const seen: { url: string; init: RequestInit }[] = [];
    await sendFeedback("https://x.test/f/1", "0.1.0", payload, async (url, init) => {
      seen.push({ url, init });
      return { ok: true };
    });
    const body = JSON.parse(String(seen[0]?.init.body));
    expect(seen[0]?.url).toBe("https://x.test/f/1");
    expect(body).toEqual({ message: "grade is wrong", version: "0.1.0", diagnostics: "subject: PHYSICS" });
  });

  it("rejects when not configured or the server refuses", async () => {
    await expect(sendFeedback("", "1", payload)).rejects.toThrow();
    await expect(sendFeedback("https://x.test", "1", payload, async () => ({ ok: false }))).rejects.toThrow();
  });

  it("blocks sends that come too quickly", async () => {
    let t = 1000;
    const ok = async () => ({ ok: true });
    await sendFeedback("https://x.test", "1", payload, ok, () => t);
    await expect(sendFeedback("https://x.test", "1", payload, ok, () => t + 5000)).rejects.toThrow();
    await sendFeedback("https://x.test", "1", payload, ok, () => t + 30000);
  });
});
