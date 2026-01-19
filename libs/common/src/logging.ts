export const log = (message: string, meta: Record<string, unknown> = {}): void => {
  const entry = {
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
  console.log(JSON.stringify(entry));
};
