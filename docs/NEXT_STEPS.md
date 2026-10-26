# Next steps

Current gate: 1. Gate 0 passed; latest user instruction authorizes routine engineering.

1. Install Node 24.18.1 and pnpm 11.11.0 using official artifacts and verify versions.
2. Install unchanged lockfile dependencies with pnpm install --frozen-lockfile.
3. Run the scripts actually declared in pinned package manifests: build, lint,
   typecheck, unit/non-fixture suites. Record PASS/FAIL/SKIPPED independently.
4. Audit discovery, state, sizing, quote, callback encoder, simulation, submission,
   signer initialization, recipient selection, Executor source and fork harness.
5. Diagnose reproducible failures from local source and primary documentation.
   Keep baseline results separate from any validated platform fix.
6. Update docs, review/secret-scan, export incremental staged checkpoint through
   tools/connector_checkpoint.py, publish with the authorized connector, fetch and
   compare remote/local SHAs. Proceed sequentially after gate evidence passes.

No mainnet sends, deployments, paid obligations, or user-funded fallback.
