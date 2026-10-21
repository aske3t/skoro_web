import { describe, expect, it } from "vitest";
import {
  getFieldErrors,
  leadSchema,
  MESSAGE_MAX,
  NAME_MAX,
  normalizePhone,
  parseUtm,
} from "./schema";

const valid = {
  kind: "question",
  firstName: "  Иван ",
  lastName: "",
  email: " Ivan@Example.COM ",
  phone: "777 123 456",
  message: "  Нужна доставка из Brno-střed  ",
};

function fieldErrorsOf(input: Record<string, unknown>) {
  const result = leadSchema.safeParse(input);
  if (result.success) throw new Error("expected validation to fail");
  return getFieldErrors(result.error);
}

describe("leadSchema", () => {
  it("accepts a valid lead and normalizes fields", () => {
    const result = leadSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      kind: "question",
      firstName: "Иван",
      lastName: null,
      email: "ivan@example.com",
      phone: "+420777123456",
      message: "Нужна доставка из Brno-střed",
      utm: null,
      pickupAddress: null,
      deliveryAddress: null,
      recipientPhone: null,
      paymentMethod: null,
    });
  });

  it("defaults kind to delivery", () => {
    const withoutKind: Record<string, unknown> = { ...valid };
    delete withoutKind.kind;
    // Без kind заявка считается доставкой, а значит требует поля доставки.
    expect(fieldErrorsOf(withoutKind)).toEqual({
      pickupAddress: "required",
      deliveryAddress: "required",
      paymentMethod: "required",
    });
    expect(
      leadSchema.parse({
        ...withoutKind,
        pickupAddress: "A",
        deliveryAddress: "B",
        paymentMethod: "cash",
      }).kind,
    ).toBe("delivery");
  });

  it("requires email and message", () => {
    expect(fieldErrorsOf({ ...valid, email: "   ", message: "" })).toEqual({
      email: "required",
      message: "required",
    });
  });

  it("rejects malformed email", () => {
    expect(fieldErrorsOf({ ...valid, email: "not-an-email" })).toEqual({
      email: "invalid",
    });
  });

  it("rejects too long values", () => {
    expect(
      fieldErrorsOf({
        ...valid,
        firstName: "a".repeat(NAME_MAX + 1),
        email: `${"a".repeat(250)}@example.com`,
        message: "a".repeat(MESSAGE_MAX + 1),
      }),
    ).toEqual({ firstName: "too_long", email: "too_long", message: "too_long" });
  });

  it("rejects kind outside the list", () => {
    const result = leadSchema.safeParse({ ...valid, kind: "partnership" });
    expect(result.success).toBe(false);
  });

  it("reports invalid phone as field error", () => {
    expect(fieldErrorsOf({ ...valid, phone: "call me" })).toEqual({
      phone: "invalid",
    });
  });
});

describe("normalizePhone", () => {
  it("adds +420 to a local number", () => {
    expect(normalizePhone("777 123 456")).toBe("+420777123456");
  });

  it("converts 00 prefix to +", () => {
    expect(normalizePhone("00420 777-123-456")).toBe("+420777123456");
  });

  it("keeps an international number, only stripping separators", () => {
    expect(normalizePhone("+49 30 1234567")).toBe("+49301234567");
    expect(normalizePhone("+49301234567")).toBe("+49301234567");
  });

  it("returns null for garbage", () => {
    expect(normalizePhone("call me")).toBeNull();
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("+0123456789")).toBeNull();
  });
});

describe("parseUtm", () => {
  it("keeps only utm_* keys", () => {
    const raw = JSON.stringify({
      utm_source: "google",
      utm_medium: " cpc ",
      gclid: "abc",
      utm_evil: "x",
      utm_term: 42,
      utm_content: "a".repeat(201),
    });
    expect(parseUtm(raw)).toEqual({ utm_source: "google", utm_medium: "cpc" });
  });

  it("returns null for invalid JSON", () => {
    expect(parseUtm("{utm_source:")).toBeNull();
    expect(parseUtm("[]")).toBeNull();
    expect(parseUtm("")).toBeNull();
  });

  it("is applied by the schema", () => {
    const lead = leadSchema.parse({
      ...valid,
      utm: '{"utm_campaign":"spring","ref":"x"}',
    });
    expect(lead.utm).toEqual({ utm_campaign: "spring" });
  });
});

describe("leadSchema: delivery details", () => {
  const delivery = {
    ...valid,
    kind: "delivery",
    pickupAddress: " Masarykova 1, Brno ",
    deliveryAddress: "Česká 5, Brno",
    recipientPhone: "777 000 111",
    paymentMethod: "cash",
  };

  it("accepts a full delivery lead and normalizes it", () => {
    const result = leadSchema.safeParse(delivery);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      pickupAddress: "Masarykova 1, Brno",
      deliveryAddress: "Česká 5, Brno",
      recipientPhone: "+420777000111",
      paymentMethod: "cash",
      phone: "+420777123456",
    });
  });

  it("requires addresses, client phone and payment method", () => {
    expect(
      fieldErrorsOf({
        ...delivery,
        pickupAddress: "",
        deliveryAddress: "  ",
        phone: "",
        paymentMethod: "",
      }),
    ).toEqual({
      pickupAddress: "required",
      deliveryAddress: "required",
      phone: "required",
      paymentMethod: "required",
    });
  });

  it("makes recipient phone optional but validates it when given", () => {
    expect(leadSchema.parse({ ...delivery, recipientPhone: "" }).recipientPhone).toBeNull();
    expect(fieldErrorsOf({ ...delivery, recipientPhone: "abc" })).toEqual({
      recipientPhone: "invalid",
    });
  });

  it("accepts only known payment methods", () => {
    expect(leadSchema.parse({ ...delivery, paymentMethod: "online" }).paymentMethod).toBe("online");
    expect(fieldErrorsOf({ ...delivery, paymentMethod: "bitcoin" })).toEqual({
      paymentMethod: "invalid",
    });
  });

  it("rejects too long addresses", () => {
    expect(fieldErrorsOf({ ...delivery, pickupAddress: "a".repeat(301) })).toEqual({
      pickupAddress: "too_long",
    });
  });

  it("drops delivery fields for questions and does not require them", () => {
    const result = leadSchema.parse({ ...valid, kind: "question", pickupAddress: "x", paymentMethod: "cash" });
    expect(result).toMatchObject({
      pickupAddress: null,
      deliveryAddress: null,
      recipientPhone: null,
      paymentMethod: null,
    });
  });
});
