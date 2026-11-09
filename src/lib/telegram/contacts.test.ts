import { describe, expect, it } from "vitest";
import { argsOf, fail, fakeSupabase as fakeDb, hasCall, ok, type Call } from "@/test-utils/fake-supabase";
import {
  createInvite,
  findClientContact,
  listInviteContacts,
  logoutContact,
  redeemInvite,
  resolveClientContact,
  unlinkContact,
} from "./contacts";
import { hashInviteToken } from "./invite";

const updatesOf = (calls: Call[]) => argsOf(calls, "update")?.[0] as Record<string, unknown>;

const NOW = new Date("2026-11-06T12:00:00Z");
const TOKEN = "a".repeat(32);
const CONTACT = {
  id: "contact-1",
  name: "Анна",
  status: "active",
  invite_expires_at: "2026-11-10T12:00:00Z",
  clients: { name: "Клиент", status: "active" },
};

describe("listInviteContacts", () => {
  it("marks which contacts are linked and asks only for active ones", async () => {
    const { db, queries } = fakeDb([
      ok([
        { id: "1", name: "Анна", telegram_user_id: null, clients: { name: "А" } },
        { id: "2", name: "Борис", telegram_user_id: 42, clients: { name: "Б" } },
      ]),
    ]);
    expect(await listInviteContacts(db)).toEqual([
      { id: "1", name: "Анна", clientName: "А", linked: false },
      { id: "2", name: "Борис", clientName: "Б", linked: true },
    ]);
    expect(hasCall(queries[0], "eq", "status", "active")).toBe(true);
    expect(hasCall(queries[0], "eq", "clients.status", "active")).toBe(true);
  });

  it("throws on a database error", async () => {
    await expect(listInviteContacts(fakeDb([fail()]).db)).rejects.toBeTruthy();
  });
});

describe("createInvite", () => {
  it("stores only the hash and an expiry seven days ahead", async () => {
    const { db, queries } = fakeDb([ok({ name: "Анна", clients: { name: "Клиент", status: "active" } })]);
    const result = await createInvite(db, "contact-1", NOW);
    if (!result.ok) throw new Error("expected an invite");

    expect(result).toMatchObject({ contactName: "Анна", clientName: "Клиент" });
    const updates = updatesOf(queries[0]);
    expect(updates.invite_token_hash).toBe(hashInviteToken(result.token));
    expect(updates.invite_token_hash).not.toBe(result.token);
    expect(updates.invite_expires_at).toBe("2026-11-13T12:00:00.000Z");
  });

  it("targets only an active contact without Telegram", async () => {
    const { db, queries } = fakeDb([ok(null)]);
    expect(await createInvite(db, "contact-1", NOW)).toEqual({ ok: false, code: "unavailable" });
    expect(hasCall(queries[0], "eq", "status", "active")).toBe(true);
    expect(hasCall(queries[0], "is", "telegram_user_id", null)).toBe(true);
  });

  it("refuses a contact of an inactive client", async () => {
    const { db } = fakeDb([ok({ name: "Анна", clients: { name: "Клиент", status: "blocked" } })]);
    expect(await createInvite(db, "contact-1", NOW)).toEqual({ ok: false, code: "unavailable" });
  });

  it("reports a database error", async () => {
    expect(await createInvite(fakeDb([fail()]).db, "contact-1", NOW)).toEqual({ ok: false, code: "error" });
  });
});

describe("unlinkContact", () => {
  it("clears Telegram and any pending invite", async () => {
    const { db, queries } = fakeDb([ok({ id: "contact-1" })]);
    expect(await unlinkContact(db, "contact-1")).toBe("unlinked");
    expect(updatesOf(queries[0])).toEqual({ telegram_user_id: null, invite_token_hash: null, invite_expires_at: null });
  });

  it("reports when there was nothing to unlink", async () => {
    expect(await unlinkContact(fakeDb([ok(null)]).db, "contact-1")).toBe("not_linked");
  });

  it("reports a database error", async () => {
    expect(await unlinkContact(fakeDb([fail()]).db, "contact-1")).toBe("error");
  });
});

describe("redeemInvite", () => {
  it("links the account, erases the token and greets by client name", async () => {
    const { db, queries } = fakeDb([ok(CONTACT), ok({ id: "contact-1" })]);
    expect(await redeemInvite(db, TOKEN, 42, NOW)).toEqual({ ok: true, contactName: "Анна", clientName: "Клиент" });

    expect(hasCall(queries[0], "eq", "invite_token_hash", hashInviteToken(TOKEN))).toBe(true);
    expect(updatesOf(queries[1])).toEqual({ telegram_user_id: 42, invite_token_hash: null, invite_expires_at: null });
  });

  it("links conditionally, so one link works only once", async () => {
    const { db, queries } = fakeDb([ok(CONTACT), ok({ id: "contact-1" })]);
    await redeemInvite(db, TOKEN, 42, NOW);
    expect(hasCall(queries[1], "is", "telegram_user_id", null)).toBe(true);
    expect(hasCall(queries[1], "eq", "invite_token_hash", hashInviteToken(TOKEN))).toBe(true);
  });

  const invalid = { ok: false, code: "invalid" };

  it("rejects an unknown or used token", async () => {
    expect(await redeemInvite(fakeDb([ok(null)]).db, TOKEN, 42, NOW)).toEqual(invalid);
  });

  it("rejects an expired token", async () => {
    const expired = { ...CONTACT, invite_expires_at: NOW.toISOString() };
    expect(await redeemInvite(fakeDb([ok(expired)]).db, TOKEN, 42, NOW)).toEqual(invalid);
  });

  it("rejects a blocked contact and a client that is not active", async () => {
    expect(await redeemInvite(fakeDb([ok({ ...CONTACT, status: "blocked" })]).db, TOKEN, 42, NOW)).toEqual(invalid);
    for (const status of ["blocked", "pending"]) {
      const contact = { ...CONTACT, clients: { name: "Клиент", status } };
      expect(await redeemInvite(fakeDb([ok(contact)]).db, TOKEN, 42, NOW)).toEqual(invalid);
    }
  });

  it("does not touch the contact when the check fails", async () => {
    const { db, queries } = fakeDb([ok({ ...CONTACT, status: "blocked" })]);
    await redeemInvite(db, TOKEN, 42, NOW);
    expect(queries).toHaveLength(1);
  });

  it("rejects when another tab won the race", async () => {
    expect(await redeemInvite(fakeDb([ok(CONTACT), ok(null)]).db, TOKEN, 42, NOW)).toEqual(invalid);
  });

  it("rejects an account already linked to another contact", async () => {
    expect(await redeemInvite(fakeDb([ok(CONTACT), fail("23505")]).db, TOKEN, 42, NOW)).toEqual(invalid);
  });

  it("reports a database error as an error, not as a bad link", async () => {
    const error = { ok: false, code: "error" };
    expect(await redeemInvite(fakeDb([fail()]).db, TOKEN, 42, NOW)).toEqual(error);
    expect(await redeemInvite(fakeDb([ok(CONTACT), fail()]).db, TOKEN, 42, NOW)).toEqual(error);
  });
});

describe("findClientContact", () => {
  const row = {
    id: "contact-1",
    name: "Анна",
    phone: "+420777123456",
    email: "a@example.test",
    status: "active",
    clients: { id: "client-1", name: "Клиент", status: "active", default_payment_method: "invoice" },
  };

  it("returns an active contact of an active client", async () => {
    expect(await findClientContact(fakeDb([ok(row)]).db, 42)).toEqual({
      id: "contact-1",
      name: "Анна",
      phone: "+420777123456",
      email: "a@example.test",
      clientId: "client-1",
      clientName: "Клиент",
      paymentMethod: "invoice",
    });
  });

  it("treats an unknown, blocked or inactive one as a guest", async () => {
    expect(await findClientContact(fakeDb([ok(null)]).db, 42)).toBeNull();
    expect(await findClientContact(fakeDb([ok({ ...row, status: "blocked" })]).db, 42)).toBeNull();
    const blocked = { ...row, clients: { ...row.clients, status: "blocked" } };
    expect(await findClientContact(fakeDb([ok(blocked)]).db, 42)).toBeNull();
  });

  it("throws on a database error", async () => {
    await expect(findClientContact(fakeDb([fail()]).db, 42)).rejects.toBeTruthy();
  });
});

describe("resolveClientContact", () => {
  const row = {
    id: "contact-1",
    name: "Анна",
    phone: null,
    email: null,
    status: "active",
    clients: { id: "client-1", name: "Клиент", status: "active", default_payment_method: "cash" },
  };

  it("tells an unlinked or blocked contact from an inactive client", async () => {
    expect(await resolveClientContact(fakeDb([ok(null)]).db, 42)).toEqual({ ok: false, code: "not_linked" });
    expect(await resolveClientContact(fakeDb([ok({ ...row, status: "blocked" })]).db, 42)).toEqual({
      ok: false,
      code: "not_linked",
    });
    for (const status of ["pending", "blocked"]) {
      const inactive = { ...row, clients: { ...row.clients, status } };
      expect(await resolveClientContact(fakeDb([ok(inactive)]).db, 42)).toEqual({ ok: false, code: "client_inactive" });
    }
  });

  it("returns the contact of an active client", async () => {
    expect(await resolveClientContact(fakeDb([ok(row)]).db, 42)).toMatchObject({
      ok: true,
      contact: { clientId: "client-1", clientName: "Клиент", paymentMethod: "cash" },
    });
  });
});

describe("logoutContact", () => {
  it("unlinks by the Telegram account", async () => {
    const { db, queries } = fakeDb([ok({ id: "contact-1" })]);
    expect(await logoutContact(db, 42)).toBe(true);
    expect(hasCall(queries[0], "eq", "telegram_user_id", 42)).toBe(true);
    expect(updatesOf(queries[0])).toEqual({ telegram_user_id: null });
  });

  it("reports when the account was not linked", async () => {
    expect(await logoutContact(fakeDb([ok(null)]).db, 42)).toBe(false);
  });
});
