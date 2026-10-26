# Research

All checks below occurred 2026-10-26 UTC. Sources are primary.

| Source | Claim/evidence | Version |
| --- | --- | --- |
| [Morpho commit](https://github.com/morpho-org/morpho-bots/commit/08d0a415d6d027f7e401fd6a904b09bedb441668) | Git object exists; commit subject is release: quoter-bot-341; parent history retained. Independently checked through GitHub connector and local git cat-file/show. | pinned 08d0a415 |
| [Morpho main observed](https://github.com/morpho-org/morpho-bots/commit/c1ee8a163eeb1632677337a89cf2a4cf6b70a2fa) | main was three commits ahead of baseline; no baseline-only commits. Comparison saved in docs/evidence/upstream-comparison.txt. | c1ee8a16 |
| Local pinned bots/blue-liquidation/src/execution/encode-call.ts | Source constructs seize-exact Morpho liquidate with callback queue, sale steps, repayment approvals and trailing sweeps to supplied recipient. Source inspection only; not execution proof. | 08d0a415 |
| Local pinned bots/blue-liquidation/src/index.ts | Startup unconditionally constructs createSigner and selects its EOA as recipient. Existing deployment check verifies code presence, not identity. Readonly redesign remains Gate 2 work. | 08d0a415 |
| Local LICENSE and blue-liquidation/package.json | Morpho copyright and Apache-2.0 licensing retained. | 08d0a415 |
| Local .nvmrc, package.json, pnpm-workspace.yaml and lockfile | Node pin 24.18.1; engine ^24.14.1; package manager pnpm@11.11.0. No install yet. | 08d0a415 |
| GitHub connected-account API | princly25 authenticated; accessible repositories enumerated with push permissions. No Morpho repo in returned set. CLI auth is separately unavailable. | checked 2026-10-26 |
| [Gitleaks official release](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1) | Windows scanner downloaded from official release and SHA256 checked against official checksums before running. | 8.30.1 |
| [Git attributes documentation](https://git-scm.com/docs/gitattributes) | README-only LF checkout preserves its checksum; conflict-marker-size=32 distinguishes actual merge markers from the user's seven-equals arithmetic separator. | installed Git 2.56.0 |
| [Node official artifacts](https://nodejs.org/dist/v24.18.1/) | Windows x64 ZIP checked against official SHASUMS256.txt, SHA256 ec56b84a7551893ab2324ebdfdc4ab974a63b4781162600b68a1293cc3e53765; executable reports v24.18.1. | 24.18.1 |
| Official npm registry, pnpm@11.11.0 | Installed the exact pinned manager into local development tools with dependency scripts disabled; executable reports 11.11.0. No package-manager upgrade adopted. | 11.11.0 |

Comparison: blue-liquidation/src is unchanged between baseline and observed main,
but package/build files, fork harness, Helm material and shared bot-kit/swaps files
changed. Shared contracts have no diff. Broad source review and regression testing remain Gate 1 work.
No newer upstream source is adopted by this restart.

Deferred research: canonical Base USDC identity; Base RPC contract identity; Executor
compilation/address derivation; current Viem OP Stack fee APIs; sponsorship terms.
These are not Gate 0 validations and are not claimed as verified.
