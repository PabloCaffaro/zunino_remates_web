type HealthStatus = "ok" | "unavailable";

export type HealthResponseBody = {
  status: HealthStatus;
  checks: {
    api: "ok";
    database: HealthStatus;
  };
  requestId: string;
};

export const jsonResponse = <Body extends { requestId: string }>(
  body: Body,
  status: number,
): Response =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Request-Id": body.requestId,
    },
  });
