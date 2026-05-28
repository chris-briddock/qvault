import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  username: z.string().min(1).max(255),
  credential_id: z.string(),
  public_key: z.string(),
  counter: z.number().int().default(0),
  // Post-quantum fields
  mlkem_public_key: z.string().optional(),
  mlkem_private_key_encrypted: z.string().optional(),
  mlkem_ciphertext: z.string().optional(),
  mlkem_salt: z.string().optional(),
  master_key_wrapped: z.string().optional(),
  master_key_salt: z.string().optional(),
  created_at: z.string().datetime().optional(),
});

export const VaultGroupSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string().min(1).max(100),
  color: z.string().optional(),
  created_at: z.string().datetime().optional(),
});

export const VaultEntrySchema = z.object({
  id: z.string(),
  user_id: z.string(),
  group_id: z.string().optional(),
  encrypted_data: z.string(),
  iv: z.string(),
  auth_tag: z.string(),
  title: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const SessionSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  expires_at: z.string().datetime(),
});

export const AuditLogSchema = z.object({
  id: z.string(),
  user_id: z.string().optional(),
  action: z.string(),
  resource: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  created_at: z.string().datetime().optional(),
});

export type User = z.infer<typeof UserSchema>;
export type VaultGroup = z.infer<typeof VaultGroupSchema>;
export type VaultEntry = z.infer<typeof VaultEntrySchema>;
export type Session = z.infer<typeof SessionSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
