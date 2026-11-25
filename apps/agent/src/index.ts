import os from "node:os";
import { randomUUID } from "node:crypto";
import { scanWindowsUpdates } from "./windows-update-scanner.js";

const apiUrl = process.env.AGENT_API_URL ?? "http://localhost:4000/api";
const deviceId = process.env.AGENT_DEVICE_ID;
const agentToken = process.env.AGENT_API_TOKEN;
const version = process.env.AGENT_VERSION ?? "agent-1.0.0";
const heartbeatIntervalMs = readInterval(process.env.AGENT_HEARTBEAT_INTERVAL_MS, 60_000);
const scanIntervalMs = readInterval(process.env.AGENT_SCAN_INTERVAL_MS, 5 * 60_000);

if (!deviceId || !agentToken) {
  console.error("AGENT_DEVICE_ID and AGENT_API_TOKEN are required.");
  process.exit(1);
}

const configuredDeviceId = deviceId;
const configuredAgentToken = agentToken;

async function postAgentEvent(event: "heartbeat" | "scan", body: Record<string, unknown>) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${apiUrl}/agent/${configuredDeviceId}/${event}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-agent-token": configuredAgentToken },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`${event} failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
      return response.json().catch(() => null);
    } catch (error) {
      lastError = error;
      if (attempt < 3) await delay(attempt * 1_000);
    }
  }
  throw lastError;
}

async function sendHeartbeat() {
  try {
    await postAgentEvent("heartbeat", { version });
    console.log(`[agent] heartbeat sent: ${new Date().toISOString()}`);
  } catch (error) {
    console.error("[agent] heartbeat error:", error instanceof Error ? error.message : error);
  }
}

let scanInProgress = false;
async function sendScan() {
  if (scanInProgress) return;
  scanInProgress = true;
  const startedAt = new Date().toISOString();
  try {
    const result = await scanWindowsUpdates();
    const completedAt = new Date().toISOString();
    await postAgentEvent("scan", {
      protocolVersion: 1,
      scanId: randomUUID(),
      version,
      os: { name: os.platform(), version: os.release(), architecture: os.arch() },
      startedAt,
      completedAt,
      ...result,
    });
    console.log(`[agent] scan sent: ${result.outcome} at ${completedAt}`);
  } catch (error) {
    console.error("[agent] scan delivery error:", error instanceof Error ? error.message : error);
  } finally {
    scanInProgress = false;
  }
}

async function main() {
  await Promise.all([sendHeartbeat(), sendScan()]);
  setInterval(() => void sendHeartbeat(), heartbeatIntervalMs);
  setInterval(() => void sendScan(), scanIntervalMs);
  console.log(`[agent] running for ${configuredDeviceId}; heartbeat=${heartbeatIntervalMs}ms, scan=${scanIntervalMs}ms`);
}

function readInterval(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

void main();
