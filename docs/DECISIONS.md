# Decisions

## 2026-10-26 — restart from pinned maintained source

Use morpho-org/morpho-bots at the exact researched commit. Keep the full source and
history instead of rewriting the liquidation engine. A newer main exists but is
not adopted. The old standalone liquidation repository is reference-only.

No previous Morpho work was found in the checked Desktop, Documents and Downloads
locations or accessible princly25 repositories. The unrelated Hyperliquid worktree
contains uncommitted changes; it is outside this project and remains untouched.

## Financing and economics

Retain Morpho liquidation callback financing. No Aave or separate flashLoan flow.
Reuse the shared Executor only after runtime-bytecode identity validation in Gate 3.
Its researched address is an unverified input, not a trusted deployment.

V1 live scope remains Base native USDC debt only. Use protected minimum output,
bigint accounting and at least 1 USDC economic net after all modeled costs.
Gas sponsorship and repayment capital are distinct. No gasless claim is established.
PROFIT_WALLET will be independent of execution sender; no recipient key is needed.

## Gate 0 source quarantine

Application source, Solidity source, dependency lockfile and package scripts are
unchanged. Upstream currently creates a signer at startup and is not safe to run
under the project's required readonly assumptions. Environment defaults in
.env.example are target documentation until Gate 2 implements them.

Archive the original root README in docs/upstream/README.md and four inherited
workflows in docs/upstream/workflows. This preserves provenance without activating
unreviewed GitHub Actions or upstream npm/Docker publishing jobs in the user's repo.
Review project-specific CI in the appropriate approved engineering gate.

## Remote ownership

Never push to Morpho. Rename original remote to upstream and set pushurl DISABLED.
The user confirmed princly25/morpho-base-zero-upfront in the follow-up message.
The connected GitHub app is authenticated as princly25, although local gh is not.
Standard Git dry-run failed with terminal prompts disabled. Connector writes work.
The empty repository was initialized with BOOTSTRAP.md on its default branch.
A branch directly from upstream's SHA failed with GitHub 422 Object does not exist:
this is a separate repository, not a fork of upstream.

Import the complete staged source through connector Git-tree/blob/commit calls and
compare remote tree SHA with git write-tree. Preserve original history in a complete,
checksummed bundle in source-history and a local preserved/pre-connector-checkpoint
branch. The active import commit has a new SHA, but its exact source and original
commits are recoverable. Subsequent connector commits extend normal remote history.
Do not extract app credentials or depend on VM-local credential storage.

## Subsequent user autonomy instruction

The user's latest instruction authorizes routine free engineering without repeated
permission. Validate gates sequentially and document the authorization, while
retaining separate mainnet and financial locks. See APPROVALS.md.
