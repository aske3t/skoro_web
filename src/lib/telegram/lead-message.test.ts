import { describe, expect, it } from "vitest";
import { buildLeadKeyboard, buildRetryEmailKeyboard, leadKeyboardFor } from "./lead-keyboard";
import { displayName, formatEmailNote, formatHandledNote } from "./lead-message";
import { parseCallbackData } from "./callback-data";

describe("displayName", () => {
  it("joins first and last name", () => {
    expect(displayName({ first_name: "Иван", last_name: "Петров" })).toBe("Иван Петров");
  });

  it("falls back to username, then to a placeholder", () => {
    expect(displayName({ first_name: "", username: "ivan" })).toBe("@ivan");
    expect(displayName({ first_name: "" })).toBe("без имени");
  });

  it("truncates to 200 chars", () => {
    expect(displayName({ first_name: "a".repeat(300) })).toHaveLength(200);
  });
});

describe("formatHandledNote", () => {
  const at = new Date("2026-01-15T12:00:00Z"); // 13:00 в Праге

  it("shows who and when in Europe/Prague", () => {
    const note = formatHandledNote("take", "Иван", at);
    expect(note).toContain("Взял в работу");
    expect(note).toContain("<b>Иван</b>");
    expect(note).toContain("15.01.2026, 13:00");
  });

  it("labels spam", () => {
    expect(formatHandledNote("spam", "Иван", at)).toContain("Спам");
  });

  it("escapes HTML in the name", () => {
    const note = formatHandledNote("take", "<b>x</b> & y", at);
    expect(note).toContain("&lt;b&gt;x&lt;/b&gt; &amp; y");
    expect(note).not.toContain("<b>x</b>");
  });
});

describe("buildLeadKeyboard", () => {
  it("has take and spam buttons with parseable callback_data", () => {
    const id = "3f2b8c1e-9a47-4d6b-8e5f-1a2b3c4d5e6f";
    const [row] = buildLeadKeyboard(id).inline_keyboard;
    expect(row.map((b) => parseCallbackData(b.callback_data)?.action)).toEqual(["take", "spam"]);
    expect(row.every((b) => parseCallbackData(b.callback_data)?.leadId === id)).toBe(true);
  });
});

describe("leadKeyboardFor", () => {
  const id = "3f2b8c1e-9a47-4d6b-8e5f-1a2b3c4d5e6f";

  it("gives buttons to delivery leads", () => {
    expect(leadKeyboardFor({ id, kind: "delivery" })).toEqual(buildLeadKeyboard(id));
  });

  it("gives no buttons to questions", () => {
    expect(leadKeyboardFor({ id, kind: "question" })).toBeUndefined();
  });
});

describe("formatEmailNote", () => {
  it("reports sent and failed emails", () => {
    expect(formatEmailNote(true)).toContain("отправлено");
    expect(formatEmailNote(false)).toContain("не отправлено");
  });
});

describe("buildRetryEmailKeyboard", () => {
  it("has a single retry button for the lead", () => {
    const id = "3f2b8c1e-9a47-4d6b-8e5f-1a2b3c4d5e6f";
    const [[button]] = buildRetryEmailKeyboard(id).inline_keyboard;
    expect(parseCallbackData(button.callback_data)).toEqual({ kind: "lead", action: "email", leadId: id });
  });
});
