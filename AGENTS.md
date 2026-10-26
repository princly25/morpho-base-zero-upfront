# Morpho project control

The root README.md is the user's complete governing specification dated 2026-10-26.
It supersedes earlier project instructions. Archived upstream documentation describes
upstream behavior and does not authorize project execution.

- Latest user instruction (2026-10-26): use princly25/morpho-base-zero-upfront,
  continue work and handle routine decisions without asking permission again.
  This supersedes repeated per-gate approval stops for free, reversible engineering.
  Validate each gate sequentially and preserve evidence; do not invent approvals.
  Read docs/PROGRESS.md, docs/NEXT_STEPS.md, docs/APPROVALS.md and docs/BLOCKERS.md.
- Mainnet transactions, deployments, financial obligations and user-funded fallback
  still require separate explicit authority. General engineering autonomy does not
  satisfy the README's specific Gate 11 live-transaction authorization.
- The checked-out application is unmodified upstream source. Its entrypoint creates
  a signer and can broadcast. DO NOT run its start/deploy/seed scripts. Target
  readonly configuration is a specification, not an implemented safety boundary yet.
- No Base mainnet transaction, UserOperation, deployment, EOA funding, paid service,
  payment obligation, or fallback to user-funded gas is authorized.
- Never request a private key for Gate 0 or readonly work.
- Keep the pinned baseline in upstream.lock.json. Do not update to upstream main
  without reviewing and testing its changes in the appropriate approved gate.
- Preserve upstream licensing, source, notices and Git history.
- Push only to the user-confirmed princly25 repository and development branch
  codex/morpho-base-zero-upfront. Never push to morpho-org. Keep upstream push
  disabled and never force-push or push upstream release tags.
- Before each push: inspect staged paths and diff, run Gitleaks with redaction,
  commit the logical checkpoint, push, and compare the remote branch SHA with HEAD.
- Do not touch the unrelated Desktop Hyperliquid project or its uncommitted work.
- Do not spawn sub-agents unless the user subsequently requests delegation.
- GitHub CLI is unauthenticated. Use the authorized connector publisher described
  in tools/connector-publish.js and docs/OPERATIONS.md. Never extract app credentials.

Recover from errors using the README's problem-resolution protocol. Persist all
results honestly as PASS, FAIL, SKIPPED or BLOCKED with reproducible evidence.
