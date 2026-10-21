import { describe, expect, it } from "vitest";
import { clientEmailState } from "./lead-email-policy";

describe("clientEmailState", () => {
  const taken = { kind: "delivery", status: "in_progress", client_notified_at: null };

  it("sends for a taken delivery lead without a sent email", () => {
    expect(clientEmailState(taken)).toBe("send");
  });

  it("does not send twice", () => {
    expect(clientEmailState({ ...taken, client_notified_at: "2026-10-21T10:00:00Z" })).toBe("already_sent");
  });

  it("skips questions, spam, new and done leads", () => {
    expect(clientEmailState({ ...taken, kind: "question" })).toBe("not_applicable");
    expect(clientEmailState({ ...taken, status: "spam" })).toBe("not_applicable");
    expect(clientEmailState({ ...taken, status: "new" })).toBe("not_applicable");
    expect(clientEmailState({ ...taken, status: "done" })).toBe("not_applicable");
  });
});
