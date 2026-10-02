# Agent API work instructions

Before changing agent ingestion, authentication, or status endpoints, read and follow `docs/AGENT_DESIGN_CONTRACT.md` from the repository root in full. Validate and persist structured scan results, bind credentials to the device before distributing agents, and never expose a general remote-command endpoint. Report allowed/denied API tests and migration implications in the PR.
