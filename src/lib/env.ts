import { z } from "zod";

const envSchema = z.object({
  SURREALDB_URL: z.string().url().default("ws://localhost:8000/rpc"),
  SURREALDB_NS: z.string().default("qvault"),
  SURREALDB_DB: z.string().default("qvault"),
  SURREALDB_USER: z.string().default("root"),
  SURREALDB_PASS: z.string().default("root"),
  WEBAUTHN_RP_NAME: z.string().default("QVault"),
  WEBAUTHN_RP_ID: z.string().default("localhost"),
  WEBAUTHN_ORIGIN: z.string().url().default("http://localhost:3000"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  SESSION_MAX_AGE: z.coerce.number().default(86400),
  SERVER_SECRET: z.string().min(32, "SERVER_SECRET must be at least 32 characters"),
  NEXT_PUBLIC_APP_NAME: z.string().default("QVault"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

export const env =
  process.env.SKIP_ENV_VALIDATION === "1"
    ? (envSchema.partial().parse(process.env) as z.infer<typeof envSchema>)
    : envSchema.parse(process.env);
