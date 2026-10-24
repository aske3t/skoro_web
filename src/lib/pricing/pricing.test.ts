import { describe, expect, it, vi } from "vitest";
import { quoteDelivery, TARIFFS } from "./index";

const request = { pickupAddress: "Brno, Masarykova 1", deliveryAddress: "Brno, Česká 5", paymentMethod: "cash" };

describe("pricing setup", () => {
  it("has a separate tariff strategy for every site version", () => {
    expect(Object.keys(TARIFFS).sort()).toEqual(["business", "personal"]);
    expect(TARIFFS.business.audience).toBe("business");
    expect(TARIFFS.personal.audience).toBe("personal");
  });

  it("returns no quote yet: the price is set by a manager after the request", () => {
    expect(quoteDelivery("business", request)).toBeNull();
    expect(quoteDelivery("personal", request)).toBeNull();
  });

  it("dispatches to the strategy of the given site version", () => {
    const spy = vi.spyOn(TARIFFS.personal, "quote");
    quoteDelivery("personal", request);
    expect(spy).toHaveBeenCalledWith(request);
    spy.mockRestore();
  });
});
