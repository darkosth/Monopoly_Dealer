import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAdminToken, verifyAdminToken, verifyCredentials } from "../../src/lib/heads-up/adminAuth";

const TEST_PASSWORD = ["strong", "test", "password"].join("-");
const TEST_SESSION_KEY = Array.from({ length: 48 }, (_, index) => String.fromCharCode(97 + (index % 26))).join("");

describe("Heads Up admin authentication", () => {
  beforeEach(() => {
    process.env.HEADS_UP_ADMIN_USERNAME = "owner";
    process.env.HEADS_UP_ADMIN_PASSWORD = TEST_PASSWORD;
    process.env.HEADS_UP_SESSION_SECRET = TEST_SESSION_KEY;
  });

  afterEach(() => {
    delete process.env.HEADS_UP_ADMIN_USERNAME;
    delete process.env.HEADS_UP_ADMIN_PASSWORD;
    delete process.env.HEADS_UP_SESSION_SECRET;
  });

  it("rejects incorrect credentials", () => {
    expect(verifyCredentials("owner", "wrong")).toBe(false);
    expect(verifyCredentials("owner", TEST_PASSWORD)).toBe(true);
  });

  it("signs, verifies, and expires admin sessions", () => {
    const token = createAdminToken(1_000);
    expect(verifyAdminToken(token, 2_000)).toBe(true);
    expect(verifyAdminToken(token, 1_000 + 12 * 60 * 60 * 1_000 + 1)).toBe(false);
    expect(verifyAdminToken(`${token}tampered`, 2_000)).toBe(false);
  });
});
