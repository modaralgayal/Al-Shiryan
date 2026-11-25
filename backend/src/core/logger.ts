type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, msg: string, meta?: unknown) {
  const line = `[${level}] ${msg}${meta !== undefined ? ' ' + JSON.stringify(meta) : ''}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/** Minimal structured logger. Swap for pino/winston later without touching call sites. */
export const logger = {
  debug: (msg: string, meta?: unknown) => emit('debug', msg, meta),
  info: (msg: string, meta?: unknown) => emit('info', msg, meta),
  warn: (msg: string, meta?: unknown) => emit('warn', msg, meta),
  error: (msg: string, meta?: unknown) => emit('error', msg, meta),
};
