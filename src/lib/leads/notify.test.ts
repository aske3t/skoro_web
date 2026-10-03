import { describe, expect, it } from "vitest";
import { formatLeadMessage, type LeadNotification } from "./notify";

const lead: LeadNotification = {
  id: "00000000-0000-0000-0000-000000000001",
  created_at: "2026-01-15T12:00:00Z",
  kind: "delivery",
  first_name: "Иван",
  last_name: "Иванов",
  email: "ivan@example.com",
  phone: "+420777123456",
  message: "Нужна доставка",
  utm: { utm_source: "google" },
};

describe("formatLeadMessage", () => {
  it("renders all lead fields", () => {
    const text = formatLeadMessage(lead);
    expect(text).toContain("Новая заявка · Доставка");
    expect(text).toContain("Имя: Иван Иванов");
    expect(text).toContain("Email: ivan@example.com");
    expect(text).toContain('<a href="tel:+420777123456">+420777123456</a>');
    expect(text).toContain("Нужна доставка");
    expect(text).toContain("UTM: utm_source=google");
  });

  it("escapes HTML in user fields", () => {
    const text = formatLeadMessage({
      ...lead,
      first_name: "<b>Bot</b>",
      message: '<script>alert("x")</script> & co',
      utm: { utm_source: "<img>" },
    });
    expect(text).not.toContain("<script>");
    expect(text).not.toContain("<b>Bot</b>");
    expect(text).toContain("&lt;script&gt;alert(\"x\")&lt;/script&gt; &amp; co");
    expect(text).toContain("Имя: &lt;b&gt;Bot&lt;/b&gt;");
    expect(text).toContain("UTM: utm_source=&lt;img&gt;");
  });

  it("truncates a long message to 3500 chars", () => {
    const text = formatLeadMessage({ ...lead, message: "a".repeat(4000) });
    expect(text).toContain(`${"a".repeat(3500)}…`);
    expect(text).not.toContain("a".repeat(3501));
    expect(text.length).toBeLessThanOrEqual(4096);
  });

  it("does not break HTML entities when truncating", () => {
    const text = formatLeadMessage({ ...lead, message: "&".repeat(4000) });
    expect(text.length).toBeLessThanOrEqual(4096);
    expect(text).toMatch(/(&amp;)+…/);
    expect(text).not.toMatch(/&am…|&a…|&…/);
  });

  it("shows time in Europe/Prague", () => {
    expect(formatLeadMessage(lead)).toContain("15.01.2026, 13:00");
    expect(
      formatLeadMessage({ ...lead, created_at: "2026-07-15T12:00:00Z" }),
    ).toContain("15.07.2026, 14:00");
  });

  it("handles missing optional fields", () => {
    const text = formatLeadMessage({
      ...lead,
      first_name: null,
      last_name: null,
      phone: null,
      utm: null,
    });
    expect(text).toContain("Имя: —");
    expect(text).toContain("Телефон: —");
    expect(text).not.toContain("UTM:");
  });
});
