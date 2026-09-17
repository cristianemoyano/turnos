type LogFields = Record<string, unknown>;

function write(level: "info" | "warn" | "error", fields: LogFields, msg: string) {
  const line = { level, msg, ...fields, ts: new Date().toISOString() };
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

const logger = {
  info: (fields: LogFields, msg: string) => write("info", fields, msg),
  warn: (fields: LogFields, msg: string) => write("warn", fields, msg),
  error: (fields: LogFields, msg: string) => write("error", fields, msg),
};

export default logger;
