import "server-only";

/**
 * Minimal structured logger. Emits JSON lines so log aggregators can parse
 * them; swap the transport here without touching call sites.
 * Never log secrets, passwords, tokens, or full request bodies.
 */
type Level = "debug" | "info" | "warn" | "error";

function log(level: Level, message: string, context?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") log("debug", message, context);
  },
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => log("error", message, context),
};
