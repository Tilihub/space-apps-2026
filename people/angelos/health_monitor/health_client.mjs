// ANG-1 browser/client adapter. The app supplies the authenticated session's token.
export function createHealthClient({ token, baseUrl = "http://127.0.0.1:8765" }) {
  if (!token) throw new Error("A crew-specific demo session token is required.");
  const root = baseUrl.replace(/\/$/, "");
  async function request(path, record) {
    const body = record === undefined ? undefined : JSON.stringify(record, (key, value) => {
      if (typeof value === "number" && !Number.isFinite(value)) {
        throw new TypeError("Measurements must be finite numbers or explicit null values.");
      }
      return value;
    });
    const response = await fetch(`${root}/v1/me/${path}`, {
      method: record === undefined ? "GET" : "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(record === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(record === undefined ? {} : { body }),
    });
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.error?.message ?? `Health API error ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return result;
  }
  return Object.freeze({
    getHistory: () => request("history"),
    getDaily: () => request("daily"),
    getWeeklyReport: () => request("report"),
    submitCheckIn: (record) => request("check-ins", record),
  });
}
