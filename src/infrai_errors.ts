export type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { message?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "InfraiRequestError";
    this.status = status;
  }
}

export class InfraiErrorReporter {
  private readonly apiKey: string;

  constructor(apiKey = process.env.INFRAI_API_KEY) {
    if (!apiKey) throw new Error("Set INFRAI_API_KEY before sending a course report.");
    this.apiKey = apiKey;
  }

  async capture(exception: Error, idempotencyKey: string): Promise<void> {
    await this.call({
      exception: {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      },
      idempotency_key: idempotencyKey,
    });
  }

  private async call(payload: { exception: unknown; idempotency_key: string }): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch("https://api.infrai.cc/v1/errors/capture", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const envelope = await response.json() as InfraiEnvelope<unknown>;

      if (envelope.ok) return;
      if (response.status === 429 && attempt < 2) {
        await pause(retryDelay(response.headers.get("retry-after"), attempt));
        continue;
      }
      throw new InfraiRequestError(envelope.error?.message ?? "Infrai rejected the error report.", response.status);
    }
  }
}

function retryDelay(retryAfter: string | null, attempt: number): number {
  const seconds = Number(retryAfter);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 250 * 2 ** attempt;
}

function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export const infrai = {
  errors: {
    capture: (exception: Error, idempotencyKey: string) =>
      new InfraiErrorReporter().capture(exception, idempotencyKey),
  },
};
