# Upstream source audit

Reviewed 2026-10-26. Baseline 08d0a415d6d027f7e401fd6a904b09bedb441668.
No newer upstream source adopted. This is a source audit, not mainnet validation.

| Component | Pinned implementation | Finding |
| --- | --- | --- |
| Candidate discovery | bots/blue-liquidation/src/discovery/borrowers.ts | Morpho GraphQL paginated candidate ids, chain/health filter, dedupe and bounds; API state is not trusted for liquidation correctness. |
| Market parameters | bots/blue-liquidation/src/state/market-params.ts | Resolves idToMarketParams onchain with cache and validates derived market id. |
| Fresh state and accrual | bots/blue-liquidation/src/state/lens.sol.ts | Deployless eth_call reads market, position, IRM and oracle at one timestamp; accrues borrow assets and applies conservative health rounding. |
| Eligibility | bots/blue-liquidation/src/runner/eligibility.ts | Requires valid state, debt and unhealthy position before sizing. |
| Sizing | bots/blue-liquidation/src/sizing/{plan,math,lif}.ts | Seize-exact plan with ceil-rounded implied repayment including the assets/shares round trip. |
| Quotes | bots/blue-liquidation/src/quotes.ts and packages/swaps/src | Preserves venue selection, unwrap chain and route-quality checks. SwapPlan exposes bigint amountOutMinimum and expectedAmountOut separately. A repay floor alone is not a $1 economic-profit gate. |
| Callback encoder | bots/blue-liquidation/src/execution/encode-call.ts | Morpho liquidate with seizedAssets and repaidShares=0; callback context expects Morpho and data argument index 1. Sale and repayment approval run inside callback; sweeps follow Morpho repayment. No separate flashLoan encoded. |
| Approvals/sweeps | packages/swaps/src/execution/executor-calls.ts | Zero-then-balance approval pair and balance placeholders; deduped loan/collateral/intermediate sweeps. Existing balances would also sweep, so the project balance guard remains necessary. |
| Exact simulation | packages/bot-kit/src/simulate.ts | simulateLiquidationExec calls eth_call using exact Executor calldata and sender; returns ok/revert. Success alone does not prove economic profit or token accounting. |
| Submission | bots/blue-liquidation/src/index.ts and packages/bot-kit/src/queue/pending-queue.ts, src/signer.ts | Upstream constructs signer, nonce cursor and pending queue unconditionally and can broadcast. Do not start the upstream entrypoint. |
| Recipient | bots/blue-liquidation/src/index.ts | Encodes recipient as signer EOA. Encoder already accepts a separate recipient argument; wire PROFIT_WALLET in the appropriate gate. |
| Executor | packages/contracts/solidity/Executor.sol, src/contracts.ts, scripts/build.ts, test/contracts.test.ts | Permissionless batch executor; no custody guarantees. Compiled deterministic address matches researched input. Runtime Base code hash not queried or trusted yet. |
| Fork harness | bots/blue-liquidation/test/fork/{harness,liquidation}.ts | Requires RPC_URL_8453 and historical fixture. No archive URL/fixture supplied. Deterministic callback proof remains Gate 4 work. |

## Reproduced platform defects and fixes

Initial application build failed with ERR_UNSUPPORTED_ESM_URL_SCHEME on a raw
Windows absolute import. Its contract bundle also contained the soltag runtime
error because esbuild's include regex assumed forward-slash boundaries.

- Convert the dynamic import using node:url pathToFileURL.
- Match either separator at existing scoped plugin boundaries in contract and
  blue-liquidation build scripts. Compiler/optimizer/metadata settings are unchanged.
- Add a production-artifact regression test: build the real bot and probe without
  executing them, then reject unresolved soltag runtime placeholders. Existing
  singleton-address tests additionally cover exact compilation results.

Initial root lint failed because cmd.exe did not expand the smoke-script wildcard.
The replacement Node launcher expands the exact same pattern, supplies every match
to the same configured linter, and fails if none exist. It linted seven files.
Do not replace this with a flag that silently accepts an empty file set.

Root README is a verbatim user specification with its own checksum validation.
Exclude only that file from automatic editorial copy checking; explicit checking
still works and the rest of the Markdown remains linted. Original contents and
all 40 specification sections are preserved.

No changes to discovery, state, interest, sizing, callback encoding, approvals,
simulation, Solidity contracts or transaction execution were needed for Gate 1.
