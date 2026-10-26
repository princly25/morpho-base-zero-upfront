# Next steps

1. Resolve G0-REMOTE in docs/BLOCKERS.md. Do not choose an unrelated repository.
2. Inspect confirmed repository owner, permissions, default branch, existing README,
   history and source changes. Preserve useful existing content and approvals audit.
3. Configure origin to the clean confirmed princly25 repository URL. Keep upstream
   pushurl DISABLED. Use branch codex/morpho-base-zero-upfront.
4. Run `python tools/validate_gate0.py`, inspect `git diff` and staged paths, then
   Gitleaks dir and staged scans. Resolve any finding without committing secrets.
5. Commit updated records and checkpoint; push only the development branch. Verify
   remote branch SHA equals `git rev-parse HEAD`, and record evidence honestly.
6. Report Gate 0 PASS only when remote preservation is confirmed. Request the exact
   approval `APPROVE GATE 0`. Wait before beginning Gate 1 engineering.

After that approval, Gate 1 begins with pinned toolchain installation and an audit
of the actual scripts and implementation paths. Do not run the upstream bot or
deployment scripts. Node pin: 24.18.1. Package manager: pnpm@11.11.0. Gate 1 must
record install/build/lint/typecheck/unit/non-fixture results separately.
