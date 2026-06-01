import { getDb, closeDb } from "../src/lib/db";
import { logger } from "../src/lib/logger";
import { readdir } from "fs/promises";
import { join } from "path";
import { Surreal } from "surrealdb";
import { env } from "../src/lib/env";

async function connectRoot(): Promise<Surreal> {
  const surreal = new Surreal();
  await surreal.connect(env.SURREALDB_URL, {
    authentication: {
      username: env.SURREALDB_USER,
      password: env.SURREALDB_PASS,
    },
  });
  return surreal;
}

async function ensureNamespace(): Promise<void> {
  const surreal = await connectRoot();
  try {
    try {
      await surreal.query(`DEFINE NAMESPACE IF NOT EXISTS ${env.SURREALDB_NS}`);
    } catch {
      await surreal.query(`DEFINE NAMESPACE ${env.SURREALDB_NS}`);
    }
    logger.info("Namespace ensured", { ns: env.SURREALDB_NS });
  } finally {
    await surreal.close();
  }
}

async function connectWithNamespace(): Promise<Surreal> {
  const surreal = new Surreal();
  await surreal.connect(env.SURREALDB_URL, {
    namespace: env.SURREALDB_NS,
    authentication: {
      username: env.SURREALDB_USER,
      password: env.SURREALDB_PASS,
    },
  });
  return surreal;
}

async function ensureDatabase(): Promise<void> {
  const surreal = await connectWithNamespace();
  try {
    try {
      await surreal.query(`DEFINE DATABASE IF NOT EXISTS ${env.SURREALDB_DB}`);
    } catch {
      await surreal.query(`DEFINE DATABASE ${env.SURREALDB_DB}`);
    }
    logger.info("Database ensured", { ns: env.SURREALDB_NS, db: env.SURREALDB_DB });
  } finally {
    await surreal.close();
  }
}

interface MigrationModule {
  up: () => Promise<void>;
  down: () => Promise<void>;
}

async function ensureMigrationsTable(): Promise<void> {
  const db = await getDb();
  try {
    await db.query("DEFINE TABLE _migration SCHEMAFULL");
    await db.query("DEFINE FIELD name ON _migration TYPE string ASSERT $value != NONE");
    await db.query("DEFINE FIELD applied_at ON _migration TYPE datetime DEFAULT time::now()");
    await db.query("DEFINE INDEX idx_migration_name ON _migration COLUMNS name UNIQUE");
  } catch {
    // Table may already exist
  }
}

async function getAppliedMigrations(): Promise<string[]> {
  const db = await getDb();
  const result = await db.query<[{ name: string }[]]>(
    "SELECT name FROM _migration ORDER BY name ASC"
  );
  const names = result[0] || [];
  return names.map((m) => m.name);
}

async function recordMigration(name: string): Promise<void> {
  const db = await getDb();
  await db.query(
    "CREATE _migration SET name = $name, applied_at = time::now()",
    { name }
  );
}

async function removeMigrationRecord(name: string): Promise<void> {
  const db = await getDb();
  await db.query("DELETE _migration WHERE name = $name", { name });
}

async function loadMigration(file: string): Promise<MigrationModule> {
  const mod = await import(join(process.cwd(), "migrations", file));
  if (typeof mod.up !== "function") {
    throw new Error(`Migration ${file} does not export an 'up' function`);
  }
  if (typeof mod.down !== "function") {
    throw new Error(`Migration ${file} does not export a 'down' function`);
  }
  return mod as MigrationModule;
}

async function migrateUp(): Promise<void> {
  const applied = await getAppliedMigrations();
  const appliedSet = new Set(applied);

  const files = (await readdir("migrations"))
    .filter((f) => /^\d{4}_.+\.ts$/.test(f))
    .sort();

  let ran = 0;
  for (const file of files) {
    if (appliedSet.has(file)) {
      logger.debug(`Skipping already applied migration: ${file}`);
      continue;
    }

    const migration = await loadMigration(file);
    logger.info(`Running UP migration: ${file}`);
    await migration.up();
    await recordMigration(file);
    logger.info(`Completed UP migration: ${file}`);
    ran++;
  }

  if (ran === 0) {
    logger.info("No new migrations to apply");
  } else {
    logger.info(`Applied ${ran} migration(s)`);
  }
}

async function migrateDown(steps = 1): Promise<void> {
  const applied = await getAppliedMigrations();
  if (applied.length === 0) {
    logger.info("No migrations to rollback");
    return;
  }

  const toRollback = applied.slice(-steps).reverse();
  for (const file of toRollback) {
    const migration = await loadMigration(file);
    logger.info(`Running DOWN migration: ${file}`);
    await migration.down();
    await removeMigrationRecord(file);
    logger.info(`Completed DOWN migration: ${file}`);
  }

  logger.info(`Rolled back ${toRollback.length} migration(s)`);
}

async function main() {
  const direction = process.argv[2] || "up";
  const steps = parseInt(process.argv[3] || "1", 10);

  await ensureNamespace();
  await ensureDatabase();
  await ensureMigrationsTable();

  if (direction === "up") {
    await migrateUp();
  } else if (direction === "down") {
    await migrateDown(steps);
  } else {
    console.error(`Unknown direction: ${direction}. Use "up" or "down".`);
    process.exit(1);
  }

  await closeDb();
}

main().catch((err) => {
  logger.error("Migration failed", {}, err instanceof Error ? err : new Error(String(err)));
  process.exit(1);
});
