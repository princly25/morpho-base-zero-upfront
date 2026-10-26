# Operations and VM recovery

Confirmed origin: https://github.com/princly25/morpho-base-zero-upfront.git
Development branch: codex/morpho-base-zero-upfront.
Initial import verified at 5ba7368f6050ae9e51e8bc88f2253effdad188fc. A fresh-clone
recovery passed all 19 Gate 0 checks; see docs/evidence/gate0-remote-validation.json.

## Recover on another VM

1. Clone the confirmed origin URL above.
2. Clone the user repository and checkout codex/morpho-base-zero-upfront.
3. Run git fetch origin, git rev-parse HEAD and git ls-remote origin
   refs/heads/codex/morpho-base-zero-upfront. Compare SHAs before assuming recovery.
4. Read README.md, AGENTS.md, PROGRESS.md, NEXT_STEPS.md, APPROVALS.md and BLOCKERS.md.
5. Verify upstream.lock.json and the history-archive checksum. Run the bundle
   verification/fetch commands in source-history/README.md to restore baseline Git
   objects. If upstream is absent, add its public Morpho URL and set its pushurl to
   DISABLED. Never reset to upstream main or push upstream release tags.
6. Read the recorded Gate 0 recovery evidence. Its validator checks unmodified
   baseline source and should be run at the Gate 0 checkpoint, not after later
   authorized feature changes. At newer checkpoints run the gate-specific tests
   recorded in PROGRESS.md and docs/evidence. Install Python if needed.
7. After Gate 0 validation passes, install Node 24.18.1 and pnpm 11.11.0, verify their
   versions, and install pinned dependencies with `pnpm install --frozen-lockfile`.
   Run the actual baseline scripts selected from package.json in Gate 1.
8. Restore any later-authorized local environment through a secure channel. Never
   retrieve secrets from Git or request a recipient's private key. Readonly must
   not need a private key. At Gate 0 no secrets exist or are required.
9. Verify intended chain 8453 in target configuration. onchain verification and
   runtime mode enforcement remain later-gate work; do not start the upstream bot.
10. Resume the exact authorized gate, respecting explicit approvals.

## Local project

Path: C:/Users/RDP/Desktop/morpho-base-zero-upfront

Local Git identity uses princly25's public GitHub noreply address. No credential is
stored in Git configuration. Local gh is currently unauthenticated; the connected
GitHub app is a separate authorized path and does not log the CLI in.

## Connector publication

After scanning and reviewing staged files, tools/connector_checkpoint.py exports
the exact canonical staged tree into ignored .local/ and supplies bounded base64
chunks. tools/connector-publish.js runs in the agent's functions.exec environment,
uploads blobs/trees, verifies equality with git write-tree and creates the remote
development-branch commit. Updates use the expected parent and force=false.

Fetch the published branch and verify the returned commit/tree before advancing
the local branch to the same commit without changing working files. Preserve the
pre-import history via its immutable bundle and archived branch. Do not hard-reset
or extract connector credentials. Subsequent checkpoints extend normal remote
history and need no further bundles.

## Safe checkpoint procedure

Inspect git status, branch, remotes and diff. Review every staged path. Run Gitleaks
8.30.1 with --redact and the upstream .gitleaks.toml, including a staged scan. Commit
the logical change. Push only to origin and the development branch, then verify
the remote commit. Never push to Morpho or automatically push main or release tags.

Example scans from the repository root in PowerShell:

```powershell
& 'C:\Users\RDP\AppData\Local\MorphoDevTools\gitleaks-8.30.1\gitleaks.exe' dir . --redact --no-banner --config .gitleaks.toml
& 'C:\Users\RDP\AppData\Local\MorphoDevTools\gitleaks-8.30.1\gitleaks.exe' git --pre-commit --staged --redact --no-banner --config .gitleaks.toml
git diff --cached --check
git diff --cached --stat
```

The root README is an exact copy of the user instruction. Its SHA256 is pinned in
upstream.lock.json; explain and record any user-authorized governance revision.
Never weaken the secret scanner to hide an unresolved finding.

## Shutdown

There is no running bot/service at Gate 0. No background task or cloud deployment
was created. Future live shutdown and crash reconciliation must be implemented and
tested before live readiness. Setting LIVE_ENABLED=false is target configuration,
not a proven upstream safety mechanism at this checkpoint.
