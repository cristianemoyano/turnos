export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Error desconocido";
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, headers });
  const json = (await res.json().catch(() => null)) as {
    error?: string;
    code?: string;
    data?: T;
  } | null;
  if (!res.ok) {
    throw new ApiError(json?.error ?? `HTTP ${res.status}`, res.status, json?.code);
  }
  // Some endpoints return the payload at the top level (push config), others under `data`.
  if (json && typeof json === "object" && "data" in json && json.data !== undefined) {
    return json.data as T;
  }
  return json as T;
}
