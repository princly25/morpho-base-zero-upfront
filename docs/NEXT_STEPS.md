# Next steps

Current gate: 2. Gate 1 validation passed; persist its checkpoint before new features.

1. Publish/fetch the reviewed Gate 1 platform fixes and evidence via the connector.
2. Replace the startup dependency graph with a readonly entrypoint. Retain the old
   sender implementation as isolated reference, unreachable from startup until
   subsequent transport gates. Never initialize signer or nonce state in readonly.
3. Make key requirements conditional on EOA plus live-enabled configuration, while
   retaining hard-deny live controls until final authority. Reject contradictory flags.
4. Reuse GraphQL discovery, onchain parameter resolution, fresh lens, sizing and
   routing. Produce bounded durable observations with hypothetical economics marked
   incomplete until complete cost modeling is implemented.
5. Test no-key startup and a read-method allowlist; record zero signatures, nonce
   reservations and broadcast attempts. Test recoverable API/RPC/rate-limit/timeout/
   malformed/duplicate/stale candidate cases. Observe real Base using public reads.
6. Build/lint/typecheck/test, update records, scan and publish each validated checkpoint.

Mainnet transactions, deployments, paid obligations and funded fallback stay locked.
