import { describe, expect, it } from "vitest";
import { formatLeadMessage, type LeadNotification } from "./notify";

const lead: LeadNotification = {
  id: "00000000-0000-0000-0000-000000000001",
  number: 7,
  created_at: "2026-01-15T12:00:00Z",
  kind: "delivery",
  first_name: "Иван",
  last_name: "Иванов",
  email: "ivan@example.com",
  phone: "+420777123456",
  message: "Нужна доставка",
  utm: { utm_source: "google" },
  pickup_address: null,
  delivery_address: null,
  recipient_phone: null,
  payment_method: null,
  customer_type: null,
  ico: null,
  company_name: null,
  ico_verified: null,
};

describe("formatLeadMessage", () => {
  it("renders all lead fields", () => {
    const text = formatLeadMessage(lead);
    expect(text).toContain("Новая заявка №7 · Доставка");
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

  it("appends a note to the footer and keeps the Telegram limit", () => {
    const note = "✅ Взял в работу: <b>Иван</b> · 15.01.2026, 13:00";
    const text = formatLeadMessage({ ...lead, message: "a".repeat(4000) }, note);
    expect(text.endsWith(note)).toBe(true);
    expect(text.length).toBeLessThanOrEqual(4096);
  });

  it("shows delivery details only for delivery leads", () => {
    const details = {
      pickup_address: "Masarykova 1 <b>",
      delivery_address: "Česká 5",
      recipient_phone: "+420777000111",
      payment_method: "online",
    };
    const text = formatLeadMessage({ ...lead, ...details });
    expect(text).toContain("Забор: Masarykova 1 &lt;b&gt;");
    expect(text).toContain("Доставка: Česká 5");
    expect(text).toContain('Тел. получателя: <a href="tel:+420777000111">');
    expect(text).toContain("Оплата: Оплата на сайте");

    const question = formatLeadMessage({ ...lead, ...details, kind: "question" });
    expect(question).not.toContain("Забор:");
  });

  it("shows a dash for missing optional delivery fields", () => {
    const text = formatLeadMessage({ ...lead, delivery_address: "Česká 5", payment_method: "cash" });
    expect(text).toContain("Тел. получателя: —");
    expect(text).toContain("Оплата: Наличные");
  });

  it("shows the sequential number in the header", () => {
    expect(formatLeadMessage(lead)).toContain("Новая заявка №7 · Доставка");
    expect(formatLeadMessage({ ...lead, number: 0 })).toContain("Новая заявка №0 ·");
    expect(formatLeadMessage({ ...lead, number: null })).toContain("Новая заявка · Доставка");
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

describe("formatLeadMessage: customer", () => {
  const delivery = { ...lead, delivery_address: "Česká 5", payment_method: "cash" };

  it("shows a verified company with name and IČO", () => {
    const text = formatLeadMessage({
      ...delivery,
      customer_type: "company",
      ico: "45274649",
      company_name: "ČEZ, a. s. <x>",
      ico_verified: true,
    });
    expect(text).toContain("Клиент: компания «ČEZ, a. s. &lt;x&gt;» · IČO 45274649 ✅ ARES");
  });

  it("warns when ARES was unavailable", () => {
    const text = formatLeadMessage({
      ...delivery,
      customer_type: "company",
      ico: "45274649",
      ico_verified: false,
    });
    expect(text).toContain("Клиент: компания · IČO 45274649 ⚠️ ARES недоступен, не проверено");
  });

  it("shows private persons and skips old leads", () => {
    expect(formatLeadMessage({ ...delivery, customer_type: "person" })).toContain(
      "Клиент: частное лицо",
    );
    expect(formatLeadMessage(delivery)).not.toContain("Клиент:");
  });
});
