import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signInitData } from "@/test-utils/telegram-init-data";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({})) }));
vi.mock("@/lib/telegram/contacts", () => ({ resolveClientContact: vi.fn() }));
vi.mock("@/lib/orders/options", () => ({ loadClientOption: vi.fn() }));

import { loadClientOption } from "@/lib/orders/options";
import { resolveClientContact } from "@/lib/telegram/contacts";
import { loadOrderForm } from "./actions";

const CLIENT_TOKEN = "123456:client-test-token";
const SERVICE_TOKEN = "654321:service-test-token";
const OPTION_ID = "11111111-1111-4111-8111-111111111111";
const CONTACT = {
  id: "contact-1",
  name: "Анна",
  phone: null,
  email: null,
  clientId: "client-1",
  clientName: "Клиент А",
  paymentMethod: "invoice",
};

const initData = (token = CLIENT_TOKEN) =>
  signInitData(
    { auth_date: String(Math.floor(Date.now() / 1000) - 60), user: JSON.stringify({ id: 42, first_name: "Анна" }) },
    token,
  );

beforeEach(() => {
  vi.stubEnv("TELEGRAM_CLIENT_BOT_TOKEN", CLIENT_TOKEN);
  vi.mocked(resolveClientContact).mockResolvedValue({ ok: true, contact: CONTACT });
  vi.mocked(loadClientOption).mockResolvedValue({
    id: OPTION_ID,
    name: "Доставка по городу",
    formKind: "city_delivery",
    tariffKind: "slot_table",
    tariffParams: {},
    formDefaults: {},
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("loadOrderForm", () => {
  it("greets the client by name with the option", async () => {
    expect(await loadOrderForm(initData(), OPTION_ID)).toEqual({
      status: "ok",
      clientName: "Клиент А",
      optionName: "Доставка по городу",
    });
    expect(resolveClientContact).toHaveBeenCalledWith(expect.anything(), 42);
    expect(loadClientOption).toHaveBeenCalledWith(expect.anything(), "client-1", OPTION_ID);
  });

  it.each([
    ["no initData", ""],
    ["something that is not initData", "user=%7B%22id%22%3A42%7D"],
  ])("refuses %s without touching the database", async (_name, data) => {
    expect(await loadOrderForm(data, OPTION_ID)).toEqual({ status: "error", code: "unauthorized" });
    expect(resolveClientContact).not.toHaveBeenCalled();
  });

  it("refuses data signed by the service bot", async () => {
    expect(await loadOrderForm(initData(SERVICE_TOKEN), OPTION_ID)).toEqual({ status: "error", code: "unauthorized" });
    expect(resolveClientContact).not.toHaveBeenCalled();
  });

  it("refuses tampered data", async () => {
    const params = new URLSearchParams(initData());
    params.set("user", JSON.stringify({ id: 43, first_name: "Чужой" }));
    expect(await loadOrderForm(params.toString(), OPTION_ID)).toEqual({ status: "error", code: "unauthorized" });
  });

  it.each(["not_linked", "client_inactive"] as const)("passes on %s", async (code) => {
    vi.mocked(resolveClientContact).mockResolvedValue({ ok: false, code });
    expect(await loadOrderForm(initData(), OPTION_ID)).toEqual({ status: "error", code });
    expect(loadClientOption).not.toHaveBeenCalled();
  });

  it("refuses an option the client cannot order", async () => {
    vi.mocked(loadClientOption).mockResolvedValue(null);
    expect(await loadOrderForm(initData(), OPTION_ID)).toEqual({ status: "error", code: "option_unavailable" });
  });

  it("reports a missing bot token and a database failure as server errors", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.stubEnv("TELEGRAM_CLIENT_BOT_TOKEN", "");
    expect(await loadOrderForm(initData(), OPTION_ID)).toEqual({ status: "error", code: "server_error" });

    vi.stubEnv("TELEGRAM_CLIENT_BOT_TOKEN", CLIENT_TOKEN);
    vi.mocked(resolveClientContact).mockRejectedValue(new Error("db down"));
    expect(await loadOrderForm(initData(), OPTION_ID)).toEqual({ status: "error", code: "server_error" });

    error.mockRestore();
  });
});
