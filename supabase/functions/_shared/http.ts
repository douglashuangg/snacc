const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function constantTimeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return mismatch === 0;
}

export function authorizeAdmin(request: Request): Response | null {
  const expected = Deno.env.get("INGESTION_ADMIN_SECRET");
  const supplied = request.headers.get("x-ingestion-secret") ?? "";
  if (!expected || !supplied || !constantTimeEqual(supplied, expected)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  return null;
}

export function errorResponse(error: unknown): Response {
  const message = error instanceof Error
    ? error.message
    : "Unexpected ingestion error";
  console.error(error);
  return jsonResponse({ error: message }, 500);
}
