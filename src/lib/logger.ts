/**
 * Structured logger for QVault.
 * Logs to stdout in JSON format for production, pretty format for development.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const SERVICE = "qvault";

function isDev(): boolean {
  return process.env.NODE_ENV !== "production";
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function buildLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    timestamp: formatTimestamp(),
    level,
    message,
    service: SERVICE,
  };

  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: isDev() ? error.stack : undefined,
    };
  }

  return entry;
}

function writeLog(entry: LogEntry): void {
  if (isDev()) {
    const color = {
      debug: "\x1b[36m", // cyan
      info: "\x1b[32m", // green
      warn: "\x1b[33m", // yellow
      error: "\x1b[31m", // red
    }[entry.level];

    const reset = "\x1b[0m";
    const ctx = entry.context
      ? " " + JSON.stringify(entry.context, null, 0)
      : "";
    const err = entry.error ? `\n  ${entry.error.stack || entry.error.message}` : "";

    // eslint-disable-next-line no-console
    console.log(
      `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} ${entry.message}${ctx}${err}`
    );
  } else {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    if (isDev()) {
      writeLog(buildLogEntry("debug", message, context));
    }
  },

  info(message: string, context?: LogContext): void {
    writeLog(buildLogEntry("info", message, context));
  },

  warn(message: string, context?: LogContext, error?: Error): void {
    writeLog(buildLogEntry("warn", message, context, error));
  },

  error(message: string, context?: LogContext, error?: Error): void {
    writeLog(buildLogEntry("error", message, context, error));
  },

  /** Log an incoming HTTP request */
  request(
    method: string,
    path: string,
    status: number,
    durationMs: number,
    context?: LogContext
  ): void {
    const level: LogLevel = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    writeLog(
      buildLogEntry(level, `${method} ${path} ${status} ${durationMs}ms`, {
        method,
        path,
        status,
        durationMs,
        ...context,
      })
    );
  },
};
