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
  paymentMethod: "cash",
  ico: "45274649",
};

describe("checkRequiredFields", () => {
  it("lists every missing required field of a business delivery", () => {
    expect(checkRequiredFields(empty)).toEqual({
      email: "required",
      message: "required",
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
