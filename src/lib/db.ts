import { Surreal } from "surrealdb";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

let db: Surreal | null = null;
let circuitOpen = false;
let circuitOpenUntil = 0;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT_MS = 30000;
let consecutiveFailures = 0;

/** Total time budget for all connection attempts (ms) */
const CONNECTION_TIMEOUT_MS = 3000;
/** Timeout for establishing a new connection (ms) */
const CONNECT_TIMEOUT_MS = 1500;
/** Timeout for health-checking an existing connection (ms) */
const HEALTH_CHECK_TIMEOUT_MS = 2000;

/** Reject after a given timeout */
function timeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/** Minimal delay between retries */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Check if circuit breaker is open */
function isCircuitOpen(): boolean {
  if (!circuitOpen) return false;
  if (Date.now() >= circuitOpenUntil) {
    logger.info("Circuit breaker closed, retrying DB connections");
    circuitOpen = false;
    consecutiveFailures = 0;
    return false;
  }
  return true;
}

/** Record a failure and potentially open the circuit breaker */
function recordFailure(error: unknown): void {
  consecutiveFailures++;
  logger.warn("DB connection failure", { consecutiveFailures }, error instanceof Error ? error : undefined);

  if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitOpen = true;
    circuitOpenUntil = Date.now() + CIRCUIT_BREAKER_TIMEOUT_MS;
    logger.error("Circuit breaker opened", {
      openUntil: new Date(circuitOpenUntil).toISOString(),
      consecutiveFailures,
    });
  }
}

/** Record a success and reset failure counter */
function recordSuccess(): void {
  if (consecutiveFailures > 0) {
    logger.info("DB connection recovered", { previousFailures: consecutiveFailures });
    consecutiveFailures = 0;
  }
}

/** Test if the current connection is alive.
 *  No timeout wrapper here — Promise.race can leave the underlying
 *  WebSocket query in a bad state. A dead connection throws quickly
 *  on its own; a live one responds fast. */
async function isConnectionAlive(surreal: Surreal): Promise<boolean> {
  try {
    await surreal.query("RETURN 1");
    return true;
  } catch (err) {
    logger.debug("Connection health check failed", { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

/** Create a fresh SurrealDB connection (with timeout) */
async function createConnection(): Promise<Surreal> {
  const surreal = new Surreal();
  await timeout(
    surreal.connect(env.SURREALDB_URL, {
      namespace: env.SURREALDB_NS,
      database: env.SURREALDB_DB,
      authentication: {
        username: env.SURREALDB_USER,
        password: env.SURREALDB_PASS,
      },
    }),
    CONNECT_TIMEOUT_MS,
    "SurrealDB connect"
  );
  return surreal;
}

/** Get a healthy DB connection with retry and circuit breaker.
 *  Fails fast: total time budget is 3 seconds. */
export async function getDb(): Promise<Surreal> {
  if (isCircuitOpen()) {
    throw new Error("Database circuit breaker is open. Please try again later.");
  }

  const deadline = Date.now() + CONNECTION_TIMEOUT_MS;

  // Check existing connection
  if (db) {
    const alive = await isConnectionAlive(db);
    if (alive) {
      recordSuccess();
      return db;
    }
    logger.warn("Existing DB connection is dead, reconnecting");
    try {
      await db.close();
    } catch {
      // ignore close errors
    }
    db = null;
  }

  let lastError: unknown;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt++;
    try {
      logger.debug("DB connection attempt", { attempt, timeRemainingMs: deadline - Date.now() });
      db = await createConnection();
      recordSuccess();
      logger.info("DB connection established", { attempt, elapsedMs: CONNECTION_TIMEOUT_MS - (deadline - Date.now()) });
      return db;
    } catch (error) {
      lastError = error;
      recordFailure(error);

      const timeRemaining = deadline - Date.now();
      if (timeRemaining <= 0) break;

      // Short fixed delay between attempts (100-300ms)
      const delay = Math.min(300, timeRemaining - 50);
      if (delay > 0) {
        logger.warn(`DB connection attempt ${attempt} failed, retrying in ${delay}ms`, { attempt, timeRemainingMs: timeRemaining });
        await sleep(delay);
      }
    }
  }

  throw new Error(
    `Failed to connect to database after ${attempt} attempt(s) within ${CONNECTION_TIMEOUT_MS}ms: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

/** Close the DB connection gracefully */
export async function closeDb(): Promise<void> {
  if (db) {
    try {
      await db.close();
      logger.info("DB connection closed");
    } catch (error) {
      logger.warn("Error closing DB connection", {}, error instanceof Error ? error : undefined);
    } finally {
      db = null;
    }
  }
}

/** Health check for the database */
export async function checkDbHealth(): Promise<{
  healthy: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const surreal = await getDb();
    await surreal.query("SELECT 1");
    return { healthy: true, latencyMs: Date.now() - start };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
