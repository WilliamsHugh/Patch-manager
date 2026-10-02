# Agent work instructions

Before changing this Windows endpoint agent, read and follow `docs/AGENT_DESIGN_CONTRACT.md` from the repository root in full. Windows update discovery and reporting are in scope; installation, reboot, rollback, and server-supplied arbitrary commands are not. Keep the scan behind a testable platform adapter and state which Windows checks and Linux-fixture checks were run in the PR.
