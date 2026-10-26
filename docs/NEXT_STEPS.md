# Next steps

Current gate: 3. Gates 0–2 passed. Persist and verify Gate 2 before new engineering.

1. Publish the reviewed readonly code and public Base evidence; verify remote tree
   and branch SHA, keeping the working tree clean.
2. Inspect compiled contract metadata and pinned Solidity/settings. Recompile exact
   creation/runtime code and independently derive CREATE2 address.
3. Query Base chain ID, block/hash and Executor code from independent public RPCs at
   the same block. Empty code, mismatch, wrong chain or disagreement must hard-block.
4. Add deterministic identity tests and strict zero-pre-existing-balance checks for
   all swept loan/collateral/intermediate tokens. Preserve upstream approvals/sweeps.
5. Store chain/block/address/expected and actual runtime hashes/source/date in
   VALIDATION.md. Test, scan, publish and verify the next checkpoint.

No mainnet broadcasts, deployments, financial obligations or funded EOA fallback.
