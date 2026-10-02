# Windows Agent Design Contract

Status: **Required** for work on `apps/agent`, `apps/api/src/modules/agent`, and any agent-related API, database, shared type, or UI contract. This document fixes the course-project target; changing it requires an explicit team scope decision.

## 1. Platform and component boundaries

- The managed endpoint is a **Windows user workstation**. The web application is the management and user interface; the NestJS API and PostgreSQL database run on Linux-hosted infrastructure. A developer's Linux workstation may host the API during development, but it is not the target of the Windows scan.
- The Windows agent is a separate local process. Browser code must not claim to inspect or patch the operating system and must never receive agent credentials.
- Communication is agent-initiated over HTTPS to the NestJS API. The agent must not connect directly to PostgreSQL/Supabase. The API authenticates the agent, validates the payload, binds it to its registered device, and stores the scan result. The web reads that result through role-checked API endpoints.
- Keep the Windows-specific scan behind an adapter/interface so API contracts and tests can run on Linux with fixtures. Linux/macOS endpoint scanning is out of scope for acceptance unless the team explicitly expands it.

## 2. Non-installing scan scope

- The required agent action is a **read-only check for available Windows updates**, with structured results sent to the server. Use a fixed, reviewed Windows Update Agent search operation (for example, `IUpdateSearcher`) or an equivalent documented read-only Windows mechanism. Do not accept command text, PowerShell scripts, or executable paths from the server or the browser.
- If a subprocess is used to invoke the fixed scan, pass fixed arguments without a shell, enforce a timeout and output-size limit, and report exit/error states. Treat update titles and descriptions as untrusted data. A scan must not download, install, uninstall, hide, approve, or roll back updates, restart the machine, or alter Windows Update policy.
- Distinguish **available/missing updates** from **installed update history**. `Get-HotFix` alone is not a missing-update scan and must not be used to label a workstation compliant.
- The report and UI must label this capability accurately: the system detects and reports available updates; deployment task progress, if demonstrated, is a simulation. Never label a simulated task as an OS update actually installed.

## 3. Scan contract and security

- Preserve heartbeat and add a versioned, validated scan result containing device identity, agent/OS version, scan timestamp, outcome (`SUCCESS`, `NO_UPDATES`, or `ERROR`), available-update identifiers/titles and optional metadata, and a bounded error summary. Store the result and `lastScanAt` together; an empty successful scan differs from a failed or stale scan.
- Make repeated delivery of the same scan idempotent. Never let an older result overwrite a newer scan. Display scan age and errors separately from device connectivity.
- The current shared `AGENT_API_TOKEN` is a scaffold, not an acceptable credential for a privileged or multi-device deployment. Before distributing agents, issue/revoke a credential per device and bind it to that device; do not trust a `deviceId` URL parameter by itself. Do not log tokens, raw command output, or sensitive machine data.
- Keep endpoint authorization and payload validation on the server. A web role's visibility does not authorize agent ingestion. Do not add a generic remote-execution endpoint.

## 4. Acceptance boundary

The minimum demonstrable path is: register a Windows device, run its agent, observe heartbeat, execute a scan without installing anything, persist the result, show available updates or a clear no-updates/error state on the web, and repeat the scan safely. Demonstrate authentication rejection, malformed input rejection, offline/stale status, and an idempotent repeat using tests or fixtures. Test the Windows scan on a Windows machine/VM; Linux CI may test the adapter and API with fixtures but does not prove Windows integration.

Real installation, restart control, rollback, package distribution, remote shell, WSUS administration, and cross-platform endpoint support are **out of scope**. They need a separate design, security review, and team decision before implementation.

## 5. Current implementation versus target

At the time this contract was added, `apps/agent` sends heartbeat and basic OS metadata but does not query Windows Update. The NestJS scan endpoint records scan time but does not persist the submitted scan result. `AgentStatus.lastScanResult` exists in Prisma, but that field alone does not make scanning complete. Treat the acceptance path above as future work, not an existing feature.

Platform references: [Microsoft Windows Update Agent API](https://learn.microsoft.com/en-us/windows/win32/wua_sdk/portal-client), [IUpdateSearcher](https://learn.microsoft.com/en-us/windows/win32/api/wuapi/nn-wuapi-iupdatesearcher), and [Get-HotFix limitations](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-hotfix).
