import { describe, expect, it } from "vitest";
import { buildLeadTakenEmail, leadNumber } from "./lead-taken";

const lead = {
  id: "3f2b8c1e-9a47-4d6b-8e5f-1a2b3c4d5e6f",
  number: 12,
  first_name: "Jan",
  pickup_address: "Masarykova 1, Brno",
  delivery_address: "Česká 5, Brno",
  recipient_name: "Petr Novák",
  recipient_phone: "+420777000111",
  payment_method: "cash",
  message: "Krabice 5 kg",
};

describe("leadNumber", () => {
  it("uses the sequential number, including zero", () => {
    expect(leadNumber(lead)).toBe("12");
    expect(leadNumber({ ...lead, number: 0 })).toBe("0");
  });

  it("falls back to the first 8 uuid chars for rows without a number", () => {
    expect(leadNumber({ ...lead, number: null })).toBe("3F2B8C1E");
  });
});

describe("buildLeadTakenEmail", () => {
  it("builds a Czech email with number, summary and support phone", () => {
    const email = buildLeadTakenEmail(lead);
    expect(email.subject).toBe("Vaše objednávka č. 12 byla přijata");
    expect(email.text).toContain("Dobrý den, Jan,");
    expect(email.text).toContain("převzal kurýr");
    expect(email.text).toContain("Vyzvednutí: Masarykova 1, Brno");
    expect(email.text).toContain("Doručení: Česká 5, Brno");
    expect(email.text).toContain("Telefon příjemce: +420777000111");
    expect(email.text).toContain("Platba: Hotově");
    expect(email.text).toContain("Poznámka: Krabice 5 kg");
    expect(email.text).toContain("+420 795 402 571");
    expect(email.html).toContain('href="tel:+420795402571"');
    expect(email.html).toContain("Objednávka č. 12");
    expect(email.html).toContain('src="cid:skoro-logo"');
  });

  it("omits optional rows and the name when missing", () => {
    const email = buildLeadTakenEmail({
      ...lead,
      first_name: null,
      recipient_phone: null,
      payment_method: "online",
    });
    expect(email.text.startsWith("Dobrý den,\n")).toBe(true);
    expect(email.text).not.toContain("Telefon příjemce");
    expect(email.text).toContain("Platba: Platba na webu");
  });

  it("escapes user input in HTML", () => {
    const email = buildLeadTakenEmail({ ...lead, pickup_address: "<script>x</script>", first_name: "<b>" });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;x&lt;/script&gt;");
    expect(email.html).toContain("Dobrý den, &lt;b&gt;,");
  });

  it("truncates a long note to 500 chars", () => {
    const email = buildLeadTakenEmail({ ...lead, message: "a".repeat(800) });
    expect(email.text).toContain(`Poznámka: ${"a".repeat(500)}…`);
    expect(email.text).not.toContain("a".repeat(501));
  });

  it("omits the note row when the delivery has no comment", () => {
    expect(buildLeadTakenEmail({ ...lead, message: null }).text).not.toContain("Poznámka:");
  });
});

describe("buildLeadTakenEmail: recipient", () => {
  it("shows the recipient name when given and hides the row otherwise", () => {
    expect(buildLeadTakenEmail(lead).text).toContain("Příjemce: Petr Novák");
    expect(buildLeadTakenEmail({ ...lead, recipient_name: null }).text).not.toContain("Příjemce:");
  });
});
