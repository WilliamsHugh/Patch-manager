import os from "node:os";

const apiUrl = process.env.AGENT_API_URL ?? "http://localhost:4000/api";
const deviceId = process.env.AGENT_DEVICE_ID;
const agentToken = process.env.AGENT_API_TOKEN;
const version = process.env.AGENT_VERSION ?? "agent-1.0.0";
const heartbeatIntervalMs = readInterval(
  process.env.AGENT_HEARTBEAT_INTERVAL_MS,
  60_000,
);
const scanIntervalMs = readInterval(
  process.env.AGENT_SCAN_INTERVAL_MS,
  5 * 60_000,
);

if (!deviceId || !agentToken) {
  console.error(
    "Thiếu AGENT_DEVICE_ID hoặc AGENT_API_TOKEN.",
  );
  process.exit(1);
}

const configuredAgentToken = agentToken ?? "";

async function postAgentEvent(
  event: "heartbeat" | "scan",
  body: Record<string, unknown>,
) {
  const response = await fetch(
    `${apiUrl}/agent/${deviceId}/${event}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agent-token": configuredAgentToken,
      },
      body: JSON.stringify(body),
    },
  );

  const responseText = await response.text();
  let responseBody: unknown = responseText;

  try {
    responseBody = responseText ? JSON.parse(responseText) : null;
  } catch {
    // Giữ nguyên response text nếu API không trả JSON.
  }

  if (!response.ok) {
    throw new Error(
      `${event} failed (${response.status}): ${JSON.stringify(responseBody)}`,
    );
  }

  return responseBody;
}

async function sendHeartbeat() {
  try {
    await postAgentEvent("heartbeat", { version });
    console.log(
      `[agent] heartbeat sent: ${new Date().toISOString()}`,
    );
  } catch (error) {
    console.error("[agent] heartbeat error:", error);
  }
}

async function sendScan() {
  try {
    await postAgentEvent("scan", {
      version,
      result: {
        hostname: os.hostname(),
        platform: os.platform(),
        release: os.release(),
        architecture: os.arch(),
        scannedAt: new Date().toISOString(),
      },
    });
    console.log(`[agent] scan sent: ${new Date().toISOString()}`);
  } catch (error) {
    console.error("[agent] scan error:", error);
  }
}

async function main() {
  await sendHeartbeat();
  await sendScan();

  setInterval(() => {
    void sendHeartbeat();
  }, heartbeatIntervalMs);

  setInterval(() => {
    void sendScan();
  }, scanIntervalMs);

  console.log(
    `[agent] running for ${deviceId}; heartbeat=${heartbeatIntervalMs}ms, scan=${scanIntervalMs}ms`,
  );
}

function readInterval(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

void main();
