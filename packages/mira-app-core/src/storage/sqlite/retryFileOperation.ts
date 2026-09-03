const TRANSIENT_FILE_ERROR_CODES = new Set(['EBUSY', 'EPERM', 'EACCES']);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function retryFileOperation<T>(
  operation: () => T | Promise<T>,
  options: { attempts?: number; initialDelayMs?: number } = {}
): Promise<T> {
  const attempts = options.attempts ?? 5;
  const initialDelayMs = options.initialDelayMs ?? 100;

  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      if (attempt >= attempts || !code || !TRANSIENT_FILE_ERROR_CODES.has(code)) throw error;
      await delay(initialDelayMs * 2 ** (attempt - 1));
    }
  }
}
