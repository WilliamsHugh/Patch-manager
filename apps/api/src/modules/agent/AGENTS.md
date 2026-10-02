# Agent API work instructions

Before changing agent ingestion, authentication, or status endpoints, read and follow `docs/AGENT_DESIGN_CONTRACT.md` from the repository root in full. Validate and persist structured scan results, bind credentials to the device before distributing agents, and never expose a general remote-command endpoint. Report allowed/denied API tests and migration implications in the PR.

Read root and API `AGENTS.md`, `docs/TASK_EXECUTION_CONTRACT.md`, and the exact task in `docs/TEAM_TASK_PLAN.md`. Member 1 owns credential/controller-boundary work during M1-02; member 2 begins M2-03 ingestion after that contract merges. Do not edit this boundary from both tasks simultaneously. Preserve device-bound authentication, scan validation/freshness and the distinction between observed results and simulated deployment.
