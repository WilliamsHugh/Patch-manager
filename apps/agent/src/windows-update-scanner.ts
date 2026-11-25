import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AgentScanOutcome, type WindowsUpdateFinding } from "@patch-management/shared";

const executeFile = promisify(execFile);
const WINDOWS_UPDATE_QUERY = "IsInstalled=0 and Type='Software'";
const POWERSHELL_SCRIPT = [
  "$ErrorActionPreference = 'Stop'",
  "$session = New-Object -ComObject Microsoft.Update.Session",
  "$searcher = $session.CreateUpdateSearcher()",
  `$result = $searcher.Search(\"${WINDOWS_UPDATE_QUERY}\")`,
  "$updates = foreach ($update in $result.Updates) { [PSCustomObject]@{ updateId = $update.Identity.UpdateID; title = $update.Title; kbArticleIds = @($update.KBArticleIDs); categories = @($update.Categories | ForEach-Object { $_.Name }); rebootRequired = [bool]$update.RebootRequired } }",
  "[PSCustomObject]@{ updates = @($updates) } | ConvertTo-Json -Depth 5 -Compress",
].join("; ");

type ScannerResult = { outcome: AgentScanOutcome; updates: WindowsUpdateFinding[]; error?: string };
type RunPowerShell = (file: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;

export async function scanWindowsUpdates(run = runPowerShell): Promise<ScannerResult> {
  if (process.platform !== "win32") {
    return { outcome: AgentScanOutcome.ERROR, updates: [], error: "Windows Update scanning is only supported on Windows endpoints." };
  }

  try {
    const { stdout } = await run("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", POWERSHELL_SCRIPT]);
    const updates = parseWindowsUpdateOutput(stdout);
    return { outcome: updates.length ? AgentScanOutcome.SUCCESS : AgentScanOutcome.NO_UPDATES, updates };
  } catch (error) {
    return { outcome: AgentScanOutcome.ERROR, updates: [], error: summarizeError(error) };
  }
}

export function parseWindowsUpdateOutput(output: string): WindowsUpdateFinding[] {
  const parsed = JSON.parse(output.trim()) as { updates?: unknown };
  if (!parsed || !Array.isArray(parsed.updates)) throw new Error("Windows Update returned an invalid response");
  return parsed.updates.slice(0, 100).map((item) => normalizeUpdate(item));
}

async function runPowerShell(file: string, args: string[]) {
  return executeFile(file, args, { timeout: 120_000, maxBuffer: 512 * 1024, windowsHide: true });
}

function normalizeUpdate(value: unknown): WindowsUpdateFinding {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Windows Update returned an invalid update");
  const update = value as Record<string, unknown>;
  const updateId = boundedString(update.updateId, 100, "update ID");
  const title = boundedString(update.title, 500, "title");
  return {
    updateId,
    title,
    kbArticleIds: boundedStringArray(update.kbArticleIds, 20, 80),
    categories: boundedStringArray(update.categories, 20, 120),
    rebootRequired: Boolean(update.rebootRequired),
  };
}

function boundedString(value: unknown, max: number, field: string) {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error(`Windows Update returned an invalid ${field}`);
  return value.trim();
}

function boundedStringArray(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value) || value.length > maxItems) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length <= maxLength).map((item) => item.trim()).filter(Boolean);
}

function summarizeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Windows Update scan failed";
  return message.replace(/\s+/g, " ").slice(0, 1000);
}
