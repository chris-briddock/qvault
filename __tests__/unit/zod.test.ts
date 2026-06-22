/**
 * Unit tests for Zod schemas (src/lib/zod.ts).
 */

import {
  UserSchema,
  VaultEntrySchema,
  VaultGroupSchema,
  SessionSchema,
  AuditLogSchema,
} from "@/lib/zod";

describe("UserSchema", () => {
  const valid = {
    id: "user:abc123",
    username: "alice",
    credential_id: "cred-xyz",
    public_key: "pubkey-base64",
    counter: 0,
  };

  it("accepts a valid user", () => {
    expect(UserSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty username", () => {
    expect(
      UserSchema.safeParse({ ...valid, username: "" }).success
    ).toBe(false);
  });

  it("accepts optional PQ fields when present", () => {
    const result = UserSchema.safeParse({
      ...valid,
      mlkem_public_key: "mlkem-pub",
      mlkem_ciphertext: "ct",
      mlkem_salt: "salt",
      master_key_wrapped: "wk",
      master_key_salt: "wks",
    });
    expect(result.success).toBe(true);
  });

  it("defaults counter to 0 if omitted", () => {
    const { counter, ...withoutCounter } = valid;
    const result = UserSchema.safeParse(withoutCounter);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.counter).toBe(0);
  });
});

describe("VaultEntrySchema", () => {
  const valid = {
    id: "vault_entry:1",
    user_id: "user:abc",
    encrypted_data: "enc-data",
    iv: "iv-value",
    auth_tag: "tag-value",
  };

  it("accepts a valid vault entry", () => {
    expect(VaultEntrySchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const { encrypted_data, ...missing } = valid;
    expect(VaultEntrySchema.safeParse(missing).success).toBe(false);
  });

  it("accepts optional group_id and title", () => {
    const result = VaultEntrySchema.safeParse({
      ...valid,
      group_id: "vault_group:1",
      title: "My Bank",
    });
    expect(result.success).toBe(true);
  });
});

describe("VaultGroupSchema", () => {
  const valid = {
    id: "vault_group:1",
    user_id: "user:abc",
    name: "Work",
  };

  it("accepts a valid group", () => {
    expect(VaultGroupSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a name longer than 100 chars", () => {
    const result = VaultGroupSchema.safeParse({
      ...valid,
      name: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(
      VaultGroupSchema.safeParse({ ...valid, name: "" }).success
    ).toBe(false);
  });
});

describe("SessionSchema", () => {
  it("accepts a valid session", () => {
    const result = SessionSchema.safeParse({
      id: "session:1",
      user_id: "user:abc",
      expires_at: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-datetime expires_at", () => {
    const result = SessionSchema.safeParse({
      id: "session:1",
      user_id: "user:abc",
      expires_at: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});

describe("AuditLogSchema", () => {
  it("accepts a minimal audit log entry", () => {
    const result = AuditLogSchema.safeParse({
      id: "audit:1",
      action: "login",
    });
    expect(result.success).toBe(true);
  });

  it("accepts full audit log entry", () => {
    const result = AuditLogSchema.safeParse({
      id: "audit:1",
      user_id: "user:abc",
      action: "create_vault_entry",
      resource: "vault_entry:5",
      details: { title: "Bank" },
      created_at: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });
});
