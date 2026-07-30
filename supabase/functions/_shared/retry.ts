export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export interface RetryOptions {
  attempts?: number;
  delaysMs?: number[];
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
}

const RETRYABLE_STATUSES = new Set([429, 500, 503]);

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function fetchJsonWithRetry(
  url: string,
  init: RequestInit = {},
  options: RetryOptions = {},
): Promise<unknown> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ??
    ((milliseconds) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const random = options.random ?? Math.random;
  const delays = options.delaysMs ?? [2_000, 5_000, 10_000, 20_000, 40_000];
  const attempts = options.attempts ?? delays.length + 1;
  const timeoutMs = options.timeoutMs ?? 15_000;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        ...init,
        signal: controller.signal,
      });
      const body = await parseBody(response);
      if (response.ok) return body;

      const description = typeof body === "object" && body !== null
        ? (
          "error_description" in body
            ? String((body as Record<string, unknown>).error_description)
            : typeof (body as { errors?: { errorMessage?: unknown } }).errors
                ?.errorMessage === "string"
            ? String(
              (body as { errors: { errorMessage: string } }).errors
                .errorMessage,
            )
            : ""
        )
        : typeof body === "string"
        ? body.slice(0, 500)
        : "";
      const message = description ||
        `Rakuten request failed with HTTP ${response.status}`;
      const error = new HttpError(message, response.status, body);
      if (
        !RETRYABLE_STATUSES.has(response.status) || attempt === attempts - 1
      ) throw error;
      lastError = error;
    } catch (error) {
      lastError = error;
      const retryable = error instanceof HttpError
        ? RETRYABLE_STATUSES.has(error.status)
        : error instanceof DOMException && error.name === "AbortError";
      if (!retryable || attempt === attempts - 1) throw error;
    } finally {
      clearTimeout(timeout);
    }

    const baseDelay = delays[Math.min(attempt, delays.length - 1)] ?? 40_000;
    const jitter = Math.round(baseDelay * 0.2 * random());
    await sleep(baseDelay + jitter);
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Rakuten request failed");
}
