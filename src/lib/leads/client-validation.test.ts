import { describe, expect, it } from "vitest";
import { checkRequiredFields, type ClientCheckInput } from "./client-validation";

const empty: ClientCheckInput = {
  kind: "delivery",
  customerType: "company",
  email: "",
  message: "",
  phone: "",
  pickupAddress: "",
  deliveryAddress: "",
  deliveryMode: "asap",
  deliveryAt: "",
  paymentMethod: "",
  ico: "",
};

const filled: ClientCheckInput = {
  kind: "delivery",
  customerType: "company",
  email: "ivan@example.com",
  message: "Коробка 5 кг",
  phone: "+420 777 123 456",
  pickupAddress: "Brno, Masarykova 1",
  deliveryAddress: "Brno, Česká 5",
  deliveryMode: "asap",
  deliveryAt: "",
  paymentMethod: "cash",
  ico: "45274649",
};

describe("checkRequiredFields", () => {
  it("needs a time only in the at mode", () => {
    expect(checkRequiredFields(filled).deliveryAt).toBeUndefined();
    expect(checkRequiredFields({ ...filled, deliveryMode: "at" }).deliveryAt).toBe("required");
    expect(checkRequiredFields({ ...filled, deliveryMode: "at", deliveryAt: "2026-07-15T12:00" }).deliveryAt).toBeUndefined();
  });

  it("does not ask for a time on a question", () => {
    expect(checkRequiredFields({ ...filled, kind: "question", deliveryMode: "at" }).deliveryAt).toBeUndefined();
  });

  it("lists every missing required field of a business delivery", () => {
    expect(checkRequiredFields(empty)).toEqual({
      email: "required",
      phone: "required",
      pickupAddress: "required",
      deliveryAddress: "required",
      paymentMethod: "required",
      ico: "required",
    });
  });

  it("passes a complete form", () => {
    expect(checkRequiredFields(filled)).toEqual({});
  });

  it("checks email format and IČO check digit", () => {
    expect(checkRequiredFields({ ...filled, email: "ivan@", ico: "45274648" })).toEqual({
      email: "invalid",
      ico: "invalid",
    });
  });

  it("does not require a comment for deliveries", () => {
    expect(checkRequiredFields({ ...filled, message: "  " })).toEqual({});
  });

  it("does not require IČO from private persons", () => {
    expect(checkRequiredFields({ ...filled, customerType: "person", ico: "" })).toEqual({});
  });

  it("requires only email and message for questions", () => {
    expect(checkRequiredFields({ ...empty, kind: "question" })).toEqual({
      email: "required",
      message: "required",
    });
  });
});
