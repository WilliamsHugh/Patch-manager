# Agent work instructions

Before changing this Windows endpoint agent, read and follow `docs/AGENT_DESIGN_CONTRACT.md` from the repository root in full. Windows update discovery and reporting are in scope; installation, reboot, rollback, and server-supplied arbitrary commands are not. Keep the scan behind a testable platform adapter and state which Windows checks and Linux-fixture checks were run in the PR.

Also read root `AGENTS.md`, `docs/TASK_EXECUTION_CONTRACT.md` and the exact assigned task in `docs/TEAM_TASK_PLAN.md`. Member 2 owns M2-02; use the credential/payload contract from merged M1-02 and coordinate ingestion with M2-03. Do not invent an alternate schema/transport while that dependency is pending. Record Windows execution evidence separately from Linux fixtures; never tick Windows acceptance based on Linux-only tests.
