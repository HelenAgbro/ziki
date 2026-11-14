import { describe, expect, it, vi } from "vitest";
import { cancelOnCallInvite, inviteToOnCall, respondToOnCallInvite } from "@/lib/security-checks/on-call";

/** A fake Prisma client: every model method is a mock, and $transaction runs the callback on the same fake. */
function fakeDb() {
  const db = {
    user: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    onCallInvite: { create: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
    notification: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  db.$transaction.mockImplementation((fn: (tx: typeof db) => unknown) => fn(db));
  return db;
}
const asDb = (db: ReturnType<typeof fakeDb>) => db as never;
const now = new Date("2026-11-13T10:00:00Z");

describe("inviting a person to go on call (#on-call)", () => {
  const person = { id: "u1", onCallAt: null, securityClearedAt: null };

  it("creates the invite by lowercase email and tells a person with an account in their inbox", async () => {
    const db = fakeDb();
    db.user.findUnique.mockResolvedValue(person);
    db.onCallInvite.findFirst.mockResolvedValue(null);
    db.onCallInvite.create.mockResolvedValue({ id: "inv1" });
    expect(await inviteToOnCall(asDb(db), { email: "  Hamzat@Example.com ", invitedById: "admin", clearForSecurity: true })).toEqual({ inviteId: "inv1" });
    expect(db.user.findUnique.mock.calls[0][0].where).toEqual({ email: "hamzat@example.com" });
    expect(db.onCallInvite.create.mock.calls[0][0].data).toEqual({ email: "hamzat@example.com", invitedById: "admin", clearForSecurity: true });
    expect(db.notification.create.mock.calls[0][0].data).toMatchObject({ userId: "u1", kind: "on_call_invite" });
  });

  it("invites someone with no account yet, with no inbox note", async () => {
    const db = fakeDb();
    db.user.findUnique.mockResolvedValue(null);
    db.onCallInvite.findFirst.mockResolvedValue(null);
    db.onCallInvite.create.mockResolvedValue({ id: "inv2" });
    await inviteToOnCall(asDb(db), { email: "new@example.com", invitedById: "admin", clearForSecurity: false });
    expect(db.notification.create).not.toHaveBeenCalled();
  });

  it("refuses a bad address, a person already on call, or one already invited", async () => {
    const cases: [string, unknown, unknown, string][] = [
      ["not-an-email", null, null, "invalid_email"],
      ["a@b.co", { ...person, onCallAt: now }, null, "already_on_call"],
      ["a@b.co", person, { id: "old" }, "already_invited"],
    ];
    for (const [email, found, pending, code] of cases) {
      const db = fakeDb();
      db.user.findUnique.mockResolvedValue(found);
      db.onCallInvite.findFirst.mockResolvedValue(pending);
      await expect(inviteToOnCall(asDb(db), { email, invitedById: "admin", clearForSecurity: false })).rejects.toMatchObject({ code });
      expect(db.onCallInvite.create).not.toHaveBeenCalled();
    }
  });

  it("still invites someone on call who is not yet cleared when the invite clears them", async () => {
    const db = fakeDb();
    db.user.findUnique.mockResolvedValue({ ...person, onCallAt: now });
    db.onCallInvite.findFirst.mockResolvedValue(null);
    db.onCallInvite.create.mockResolvedValue({ id: "inv3" });
    await expect(inviteToOnCall(asDb(db), { email: "a@b.co", invitedById: "admin", clearForSecurity: true })).resolves.toEqual({ inviteId: "inv3" });
  });

  it("lets staff withdraw only a pending invite", async () => {
    const db = fakeDb();
    db.onCallInvite.updateMany.mockResolvedValue({ count: 0 });
    await expect(cancelOnCallInvite(asDb(db), "inv1", now)).rejects.toMatchObject({ code: "not_pending" });
  });
});

describe("the invited person answering (#on-call)", () => {
  const invite = (clearForSecurity: boolean) => ({ id: "inv1", email: "owner@example.com", clearForSecurity });
  const signedIn = { email: "Owner@Example.com" };

  it("accepting puts the person on call, and clears them for security only when the invite says so", async () => {
    for (const clear of [true, false]) {
      const db = fakeDb();
      db.onCallInvite.findUnique.mockResolvedValue(invite(clear));
      db.user.findUnique.mockResolvedValue(signedIn);
      db.onCallInvite.updateMany.mockResolvedValue({ count: 1 });
      await respondToOnCallInvite(asDb(db), { inviteId: "inv1", userId: "u1", accept: true }, now);
      expect(db.user.update.mock.calls[0][0]).toEqual({ where: { id: "u1" }, data: clear ? { onCallAt: now, securityClearedAt: now } : { onCallAt: now } });
    }
  });

  it("declining changes nothing on the person", async () => {
    const db = fakeDb();
    db.onCallInvite.findUnique.mockResolvedValue(invite(true));
    db.user.findUnique.mockResolvedValue(signedIn);
    db.onCallInvite.updateMany.mockResolvedValue({ count: 1 });
    await respondToOnCallInvite(asDb(db), { inviteId: "inv1", userId: "u1", accept: false }, now);
    expect(db.onCallInvite.updateMany.mock.calls[0][0].data).toMatchObject({ status: "declined" });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("only the person with that email may answer, and only once", async () => {
    const db = fakeDb();
    db.onCallInvite.findUnique.mockResolvedValue(invite(false));
    db.user.findUnique.mockResolvedValue({ email: "someone-else@example.com" });
    await expect(respondToOnCallInvite(asDb(db), { inviteId: "inv1", userId: "u2", accept: true }, now)).rejects.toMatchObject({ code: "not_yours" });
    db.user.findUnique.mockResolvedValue(signedIn);
    db.onCallInvite.updateMany.mockResolvedValue({ count: 0 });
    await expect(respondToOnCallInvite(asDb(db), { inviteId: "inv1", userId: "u1", accept: true }, now)).rejects.toMatchObject({ code: "not_pending" });
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

describe("on-call cover: coverage, pick-up speed and who sees it (#on-call)", async () => {
  const { coverageOf, medianMs, formatWait, canSeeOnCall, recordOnCallSample } = await import("@/lib/on-call-metrics");

  it("coverage is the share of snapshots with at least one agent free", () => {
    expect(coverageOf([])).toBeNull();
    expect(coverageOf([{ free: 1 }, { free: 0 }, { free: 2 }, { free: 3 }])).toBe(75);
  });

  it("pick-up speed is the median wait, in plain words", () => {
    expect(medianMs([])).toBeNull();
    expect(medianMs([30_000, 10_000, 20_000])).toBe(20_000);
    expect(medianMs([10_000, 20_000])).toBe(15_000);
    expect(formatWait(12_000)).toBe("12s");
    expect(formatWait(4 * 60_000)).toBe("4m");
    expect(formatWait(80 * 60_000)).toBe("1h 20m");
    expect(formatWait(null)).toBe("no parts picked up yet");
  });

  it("a snapshot counts on-call agents online (not paused, seen recently) and free (room for a part)", async () => {
    const db = {
      agent: {
        findMany: vi.fn().mockResolvedValue([
          { pausedAt: null, apiKeys: [{ id: "k" }], _count: { securityCheckItems: 0 } },
          { pausedAt: null, apiKeys: [{ id: "k" }], _count: { securityCheckItems: 2 } },
          { pausedAt: now, apiKeys: [{ id: "k" }], _count: { securityCheckItems: 0 } },
          { pausedAt: null, apiKeys: [], _count: { securityCheckItems: 0 } },
        ]),
      },
      onCallSample: { create: vi.fn(), deleteMany: vi.fn() },
    };
    expect(await recordOnCallSample(db as never, now)).toEqual({ onCall: 4, online: 2, free: 1 });
    expect(db.onCallSample.create.mock.calls[0][0].data).toEqual({ at: now, onCall: 4, online: 2, free: 1 });
    expect(db.onCallSample.deleteMany).toHaveBeenCalled();
  });

  it("only super admins and people on call see it", async () => {
    const db = { user: { findUnique: vi.fn().mockResolvedValue({ onCallAt: null }) } };
    expect(await canSeeOnCall({ id: "u", role: "super_admin" }, db as never)).toBe(true);
    expect(await canSeeOnCall({ id: "u", role: "user" }, db as never)).toBe(false);
    db.user.findUnique.mockResolvedValue({ onCallAt: now });
    expect(await canSeeOnCall({ id: "u", role: "user" }, db as never)).toBe(true);
  });
});
