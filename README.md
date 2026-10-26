# Morpho Base Zero-Upfront Liquidation Engine

# 1. PROJECT MISSION

Build the simplest practical autonomous Morpho Blue liquidation engine that can eventually:

1. Run on Base.
2. Monitor real Morpho Blue positions.
3. Identify genuinely liquidatable positions.
4. Use Morpho's existing callback-funded liquidation mechanism.
5. Require **$0 of the user's own trading capital**.
6. Avoid deploying our own liquidation contract if the existing shared Morpho Executor can be safely reused.
7. Target **$0 user-funded transaction gas** through an externally sponsored execution mechanism.
8. Execute only when expected **economic net profit is at least $1 USDC** after every modeled cost.
9. Send realized liquidation surplus directly to a configured `PROFIT_WALLET`.
10. Validate everything through reproducible tests before any Base mainnet transaction is permitted.
11. Automatically preserve every meaningful development checkpoint in the user's GitHub repository because the development VM is temporary.
12. Continue solving technical problems instead of abandoning the project at the first error.

The project is not a general MEV system.

The project is not a multi-chain platform.

The project is not an arbitrage bot.

The project is not a dashboard project.

The project is not an Aave flash-loan system.

The initial product is intentionally narrow:

```text
Base
  +
Morpho Blue
  +
Morpho liquidation callback
  +
existing shared Executor
  +
USDC debt markets
  +
strict profitability filtering
  +
external gas sponsorship
  +
automatic profit payout
```

Simplicity is a requirement.

---

# 2. THE CENTRAL ARCHITECTURAL DECISION

Do **not** add an Aave flash loan.

Do **not** add Morpho `flashLoan()` to the liquidation strategy unless later evidence proves that a specific required liquidation cannot be completed using the existing callback mechanism.

Do **not** create a new liquidation protocol.

Do **not** rewrite the current Morpho liquidator.

The maintained Morpho Blue liquidation bot already implements the financing mechanism this project needs.

The desired execution is:

```text
UNHEALTHY MORPHO POSITION
          │
          ▼
Shared Executor calls
Morpho.liquidate(...)
          │
          ▼
Morpho transfers seized collateral
to the Executor
          │
          ▼
onMorphoLiquidate(...)
          │
          ▼
Executor swaps seized collateral
into the loan token
          │
          ▼
Executor approves Morpho
for required repayment
          │
          ▼
callback returns
          │
          ▼
Morpho pulls repayment
          │
          ▼
remaining surplus
          │
          ▼
PROFIT_WALLET
```

This means the liquidation does not require the bot operator to possess the debt-token repayment capital before the liquidation begins.

The seized collateral itself is used to obtain the repayment asset during the callback.

That is the strategy.

Preserve it.

---

# 3. VERIFIED UPSTREAM BASELINE

Primary upstream repository:

```text
https://github.com/morpho-org/morpho-bots
```

Target application:

```text
bots/blue-liquidation
```

Research snapshot:

```text
08d0a415d6d027f7e401fd6a904b09bedb441668
```

Research identified this snapshot as:

```text
release: quoter-bot-341
```

Codex must independently verify that commit exists.

Do not silently replace this pinned baseline with a newer upstream `main`.

If upstream has advanced, first record:

```text
researched commit
current upstream commit
difference between them
whether relevant liquidation code changed
```

A newer upstream version may be adopted only after the changes are reviewed and tested.

The old repository:

```text
morpho-org/morpho-blue-liquidation-bot
```

is reference material only unless a specific implementation detail is needed.

The maintained source should come from:

```text
morpho-org/morpho-bots
```

Preserve Apache-2.0 licensing and required notices.

---

# 4. UPSTREAM CODE THAT SHOULD BE PRESERVED

Do not rewrite these components unless a reproducible defect requires it:

```text
Morpho GraphQL candidate discovery

on-chain market parameter resolution

fresh on-chain liquidation state verification

interest accrual calculations

liquidatability calculations

seize-exact liquidation sizing

collateral swap routing

onMorphoLiquidate callback financing

exact Executor transaction encoding

eth_call transaction simulation

approval reset logic

token sweeping logic
```

Known source areas from the researched version include approximately:

```text
bots/blue-liquidation/src/discovery/

bots/blue-liquidation/src/state/

bots/blue-liquidation/src/sizing/

bots/blue-liquidation/src/execution/

bots/blue-liquidation/src/runner/

bots/blue-liquidation/src/config.ts

bots/blue-liquidation/src/index.ts
```

Do not assume the exact paths remain unchanged.

Verify them before editing.

One especially important researched file was:

```text
bots/blue-liquidation/src/execution/encode-call.ts
```

The current architecture encoded the callback-funded sequence there.

Preserve this behavior unless current source proves it has changed.

---

# 5. SHARED EXECUTOR STRATEGY

Research identified the deterministic shared Executor address as:

```text
0x844124693a429CB9eD04472a23d6aEBFd1395dFe
```

This address must **not** automatically be trusted.

Before any execution mode can use it, implement an identity verification procedure.

Required procedure:

```text
derive expected Executor address
from pinned Morpho source
        │
        ▼
compile pinned Executor source
        │
        ▼
obtain expected runtime bytecode
        │
        ▼
hash expected runtime bytecode
        │
        ▼
eth_getCode on Base
        │
        ▼
hash actual runtime bytecode
        │
        ▼
compare
```

Result:

```text
NO CODE
  -> HARD BLOCK

HASH MISMATCH
  -> HARD BLOCK

HASH MATCH
  -> executor identity verified
```

Merely finding non-empty code at the address is insufficient.

The exact runtime code must be validated against the reviewed implementation.

The verification result must be stored in:

```text
docs/VALIDATION.md
```

including:

```text
chain ID
block number
executor address
expected code hash
actual code hash
result
date
source commit
```

---

# 6. SHARED EXECUTOR CUSTODY RULE

Treat the shared Executor as **non-custodial temporary execution infrastructure**.

Never intentionally leave our money in it.

Permanent invariant after every successful supported transaction:

```text
Executor loan-token residual       = 0
Executor collateral residual       = 0
Executor supported intermediates   = 0
```

Because the contract is permissionless, do not count existing Executor balances as our profit.

Before an execution involving any touched token:

```text
read Executor token balance before transaction
```

Supported V1 policy:

```text
if material pre-existing balance exists
for any token our transaction would sweep
    -> reject live execution
```

This avoids accidentally sweeping assets unrelated to our transaction and makes profit accounting unambiguous.

Log this rejection as:

```text
PREEXISTING_EXECUTOR_BALANCE
```

---

# 7. INITIAL LIVE SCOPE

For V1 live execution:

```text
Chain:
Base

Chain ID:
8453

Protocol:
Morpho Blue

Loan token:
canonical native Base USDC only

Liquidation funding:
Morpho callback

Separate flash loan:
disabled

Minimum economic net profit:
1 USDC

User trading capital:
$0

User deployment funding:
$0 target

User execution gas:
$0 target

Profit output:
USDC

Profit recipient:
PROFIT_WALLET
```

Other Morpho markets may be scanned and analyzed.

They must not be live-executed in V1.

Represent them as:

```text
NOT_LIVE_ALLOWLISTED
```

Do not hard-code a Base USDC address from memory.

Verify the canonical token from authoritative Base/Circle information and then verify on-chain:

```text
address
code exists
symbol
decimals
chain ID
```

Expected decimals must be independently confirmed.

---

# 8. DEFINITION OF ZERO UPFRONT

There are several different meanings of "zero capital."

This project distinguishes them explicitly.

## Trading capital

Required target:

```text
$0
```

The callback-funded liquidation should provide this.

## Contract deployment funding

Required target:

```text
$0
```

This may be possible because the shared Morpho Executor already exists.

It must be verified.

## User execution gas

Required target:

```text
$0
```

This requires sponsorship.

It is **not solved by the liquidation callback**.

## Economic transaction cost

Gas still has economic value even when somebody else sponsors it.

Therefore track:

```text
USER CASH PROFIT
```

separately from:

```text
ECONOMIC NET PROFIT
```

Example:

```text
profit wallet receives        1.20 USDC
user ETH paid                 0
user cash profit              1.20 USDC

actual sponsored gas value    0.03 USDC
economic net profit           1.17 USDC
```

The minimum-profit rule applies to:

```text
ECONOMIC NET PROFIT
```

not merely cash received by the user.

---

# 9. EXECUTION MODES

Implement explicit execution modes.

Conceptual model:

```typescript
type ExecutionMode =
  | "readonly"
  | "sponsored"
  | "eoa";
```

Default:

```env
EXECUTION_MODE=readonly
READ_ONLY=true
LIVE_ENABLED=false
```

## readonly

Must require:

```text
NO private key
NO funded wallet
NO signing
NO nonce reservation
NO sendTransaction
NO sendRawTransaction
NO UserOperation broadcast
```

## sponsored

Future approved mode.

Uses verified external sponsorship.

Must not require ETH in the execution account.

## eoa

Fallback only.

Not authorized by default.

A user-funded EOA mode must remain disabled until the user separately approves it.

Do not silently fall back from sponsored mode to EOA mode.

---

# 10. TRUE WALLET-FREE READ-ONLY MODE

Research found that the upstream application historically initialized a signer even for behavior that could be described as detection-only.

Our mode must be stricter.

When:

```env
EXECUTION_MODE=readonly
```

the process must structurally avoid creating:

```text
wallet client
private-key account
signer
transaction sender
nonce queue
gas-balance monitor
submission queue
broadcast transport
```

This should not simply be:

```typescript
if (readOnly) return before send();
```

The sending machinery itself should not exist in the readonly dependency graph.

A private key must become required only when:

```text
EXECUTION_MODE=eoa
AND
LIVE_ENABLED=true
```

Readonly startup with no private key must succeed.

---

# 11. SEPARATE EXECUTION SENDER FROM PROFIT RECIPIENT

Never assume:

```text
transaction sender == profit wallet
```

These are separate concepts.

Final architecture may be:

```text
SMART EXECUTION ACCOUNT
        │
        ▼
SHARED EXECUTOR
        │
        ▼
MORPHO
        │
        ▼
callback settlement
        │
        ▼
PROFIT_WALLET
```

Configuration:

```env
PROFIT_WALLET=
```

The public receiving address does not require its private key on the bot machine.

Modify the liquidation encoder so the surplus sweep target is:

```text
config.profitWallet
```

not automatically:

```text
signer.account.address
```

Validate:

```text
valid EVM address
not zero address
Base-compatible address format
```

Do not require possession of its private key.

---

# 12. PROFITABILITY ENGINE

The existing liquidation bot's basic break-even requirement is not enough.

A route that can repay Morpho is not automatically profitable.

Required decision:

```text
Will this transaction leave at least
$1 of ECONOMIC NET PROFIT?
```

Use only integer-safe arithmetic.

Use:

```typescript
bigint
```

for monetary/token calculations.

Never use JavaScript floating-point numbers for the decision to submit a transaction.

Conceptual structure:

```typescript
type ProfitAssessment = {
  repaymentUsdc: bigint;
  minimumSwapOutUsdc: bigint;

  grossSurplusUsdc: bigint;

  baseExecutionCostUsdc: bigint;
  sponsorshipCostUsdc: bigint;
  safetyMarginUsdc: bigint;

  economicNetProfitUsdc: bigint;
  minimumRequiredProfitUsdc: bigint;

  viable: boolean;
};
```

Required calculations:

```text
gross surplus =
minimum guaranteed swap output
-
exact Morpho repayment
```

Then:

```text
economic net profit =
gross surplus
-
complete Base transaction cost
-
sponsor/paymaster cost
-
configured safety margin
```

Then:

```text
execute only if

economic net profit
>=
minimum required profit
```

Initial minimum:

```text
1 USDC
```

For 6-decimal USDC this may correspond to:

```text
1,000,000 base units
```

but the software must first verify token decimals.

---

# 13. USE MINIMUM GUARANTEED OUTPUT

Do not make profitability decisions based only on optimistic quote output.

The hard safety calculation must use the minimum protected route output:

```text
amountOutMinimum
```

or its actual equivalent in the current routing implementation.

Example:

```text
expected route output = 108 USDC

minimum protected output = 101.50 USDC

repayment = 101 USDC

gas/economic cost = 0.20 USDC

safety margin = 0.40 USDC
```

Economic minimum:

```text
101.50
-101.00
-0.20
-0.40
=======
-0.10
```

Reject.

Even though the optimistic output looked profitable.

---

# 14. COMPLETE BASE FEE ACCOUNTING

Base is an OP Stack network.

Do not approximate transaction cost using only:

```text
gasUsed × gasPrice
```

Use the current Viem OP Stack functionality where compatible with the repository version.

Research identified:

```text
estimateTotalFee()
```

as the relevant Viem action for estimating combined transaction fee components.

Estimate using the **exact calldata intended for submission**.

Conceptually:

```typescript
const totalFeeWei =
  await opStackClient.estimateTotalFee({
    account: executionSender,
    to: executorAddress,
    data: exactExecutorCalldata,
    value: 0n,
  });
```

Verify the actual supported signature from the installed Viem version.

Do not copy an API example blindly.

Include all currently applicable Base transaction fee components returned by the supported API.

Then convert the native-token cost into conservative USDC value.

---

# 15. ETH TO USDC COST CONVERSION

V1 needs only one reliable conversion path.

Do not build a generalized price system.

Implement one conservative ETH/WETH to USDC valuation mechanism.

Requirements:

```text
on-chain or reliable route-derived
fresh
bounded
testable
fails closed
```

If pricing cannot be obtained safely:

```text
DO NOT EXECUTE
```

Apply a configurable safety margin.

Document the method.

Test:

```text
normal ETH price
price unavailable
stale price
abnormal price
large sudden change
rounding
USDC decimal handling
```

---

# 16. SPONSOR COST ACCOUNTING

Even when the user pays $0 directly, sponsorship may have:

```text
credit consumption
billing cost
markup
service fee
policy cost
future financial obligation
```

Never automatically treat:

```text
sponsored gas = free gas
```

Maintain:

```text
userFundedCost
```

and:

```text
economicGasCost
```

as separate values.

Strict-zero execution requires:

```text
userFundedCost = 0
```

Profitability requires:

```text
economicNetProfit >= configured minimum
```

---

# 17. PRIMARY SPONSORED EXECUTION EXPERIMENT

First sponsorship candidate:

```text
Coinbase Developer Platform
ERC-4337 / managed smart account
CDP Paymaster
Base
```

Research indicates a sponsored smart account may transact on Base without holding ETH and contracts can be subject to sponsorship policy/allowlisting.

This is an experiment to prove.

It is **not yet an assumption**.

Required target:

```text
Smart Account ETH before = 0
Smart Account ETH after  = 0
```

Sponsored operation should call only the verified shared Executor.

Sponsorship policy should be as restrictive as reasonably supported:

```text
chain = Base

target contract =
verified shared Executor

allowed operation =
our liquidation execution path

spending limits =
minimal

unrelated arbitrary calls =
not sponsored
```

Do not assume CDP credits are unlimited or permanently free.

Determine:

```text
free credit amount
expiry
billing requirements
payment method requirements
limits
rate limits
allowed smart account types
supported chains
failure/revert charging
mainnet restrictions
terms
```

Do not create paid obligations without user approval.

---

# 18. ALTERNATIVE GAS OPTIONS

These are research fallbacks, not default implementation targets.

## Circle Paymaster

Potentially allows gas denominated in USDC.

However, the project's starting account should have:

```text
ETH = 0
USDC = 0
```

before a liquidation.

Do not assume Circle can front a transaction against USDC that only appears later during execution.

Prove it before considering it viable.

## Custom ERC-4337 postOp paymaster

Theoretically attractive:

```text
paymaster fronts ETH
        │
        ▼
liquidation creates USDC
        │
        ▼
postOp charges reimbursement
        │
        ▼
remainder becomes profit
```

Do not implement this for V1 unless simpler sponsorship options are proven impossible and the user approves the added complexity.

A custom paymaster would itself require:

```text
deployment
security analysis
capitalized EntryPoint deposit
maintenance
abuse prevention
```

That conflicts with the simplicity goal.

## EOA gas reserve

Not allowed under the strict-zero target.

May only become a fallback after explicit user approval.

Never silently activate it.

---

# 19. SOURCE MODIFICATION MAP

Verify actual current source paths before modifying.

Expected approximate modifications:

```text
discovery/borrowers.ts
    KEEP

state/lens...
    KEEP

sizing/plan.ts
    KEEP

quotes...
    EXTEND only as needed for
    profitability inputs

execution/encode-call.ts
    CHANGE profit recipient
    to PROFIT_WALLET

runner/tick.ts
    ADD profitability gate

config.ts
    ADD true execution-mode separation

index.ts
    DO NOT initialize signer in readonly

simulation code
    EXTEND diagnostics carefully

new economics module
    ADD

new Base fee estimator
    ADD

new executor identity validator
    ADD

new token allowlist
    ADD

new broadcast/live gate
    ADD

new execution transport abstraction
    ADD

sponsored transport
    ADD at sponsorship gate

separate flash-loan contract
    DO NOT ADD

replacement liquidation contract
    DO NOT ADD initially
```

Possible logical layout:

```text
src/
├── economics/
│   ├── accounting.ts
│   ├── base-fees.ts
│   └── eth-usdc.ts
│
├── execution/
│   └── transport/
│       ├── types.ts
│       ├── readonly.ts
│       ├── sponsored.ts
│       └── eoa.ts
│
├── safety/
│   ├── executor-identity.ts
│   ├── token-allowlist.ts
│   └── live-gate.ts
│
└── runner/
    └── profitability.ts
```

Follow existing repository conventions where they differ.

Do not create needless abstractions.

---

# 20. TARGET CONFIGURATION

Equivalent configuration should exist after implementation:

```env
CHAIN_ID=8453

EXECUTION_MODE=readonly
READ_ONLY=true
LIVE_ENABLED=false

PROFIT_WALLET=

MIN_NET_PROFIT_USDC=1

PROFIT_SAFETY_BPS=

RPC_URL=

ENABLE_LIFI=true

ALLOWED_LOAN_TOKENS=

# STRICTLY EOA MODE ONLY
LIQUIDATOR_PRIVATE_KEY=

# SPONSORED MODE
CDP_PAYMASTER_URL=
```

Do not commit real:

```text
private keys
mnemonics
wallet keystores
authenticated RPC URLs
paymaster credentials
API secrets
CDP secrets
GitHub tokens
```

`.env.example` must contain placeholders only.

---

# 21. EXACT DECISION PIPELINE

Target production logic:

```text
NEW BLOCK / NEW POLL
        │
        ▼
DISCOVER MORPHO CANDIDATES
        │
        ▼
REFRESH ON-CHAIN POSITION STATE
        │
        ▼
POSITION LIQUIDATABLE?
    │           │
   NO          YES
    │           │
   SKIP         ▼
          BUILD SEIZE-EXACT PLAN
                │
                ▼
        LIVE TOKEN ALLOWLIST?
           │           │
          NO          YES
           │           │
      OBSERVE ONLY     ▼
               GET COLLATERAL SALE QUOTE
                       │
                       ▼
               MIN OUTPUT > REPAYMENT?
                   │           │
                  NO          YES
                   │           │
                 REJECT        ▼
                         BUILD EXACT
                         EXECUTOR CALLDATA
                                │
                                ▼
                        ESTIMATE COMPLETE
                          BASE TX COST
                                │
                                ▼
                      CONVERT COST TO USDC
                                │
                                ▼
                       CALCULATE ECONOMIC
                           NET PROFIT
                                │
                                ▼
                       NET >= MINIMUM?
                         │          │
                        NO         YES
                         │          │
                      REJECT        ▼
                               EXACT eth_call
                                SIMULATION
                                   │
                                   ▼
                             SIMULATION OK?
                              │         │
                             NO        YES
                              │         │
                           REJECT       ▼
                                  RECHECK STATE
                                  + FEE FRESHNESS
                                         │
                                         ▼
                                  LIVE_ENABLED?
                                  │         │
                                 NO        YES
                                  │         │
                              RECORD       ▼
                             DRY RUN    EXECUTION
                                       TRANSPORT
                                           │
                          ┌────────────────┴─────────────┐
                          ▼                              ▼
                     SPONSORED                       EOA
                     preferred                 disabled unless
                                                user approved
                          │
                          ▼
                    WAIT RECEIPT
                          │
                          ▼
                 RECONCILE REAL BALANCES
                          │
                          ▼
                VERIFY PROFIT_WALLET DELTA
                          │
                          ▼
                    RECORD RESULT
```

---

# 22. NO MAINNET EXECUTION WITHOUT FINAL GATE

Allowed before final live approval:

```text
public web research
official documentation research
GitHub source inspection
Morpho API reads
Base RPC reads
eth_call
eth_getCode
gas estimation
transaction simulation
local tests
Anvil
fork tests
Base fork transactions
supported testnet sponsored operations
Git operations
```

Forbidden before final live approval:

```text
Base mainnet transaction send
Base mainnet UserOperation send
contract deployment
funded EOA transaction
paid subscription enrollment
paymaster arrangement that creates billing liability
automatic fallback to funded wallet
```

Enforce this boundary in code.

Do not rely only on human discipline.

---

# 23. CONTINUOUS PROBLEM-RESOLUTION PROTOCOL

A technical error is **not** permission to abandon the project.

When a problem occurs, Codex must follow this process.

```text
1. Capture exact error.

2. Reproduce it reliably.

3. Identify the component responsible.

4. Inspect local source code.

5. Inspect official documentation.

6. Inspect current upstream repository/history/issues
   where relevant.

7. Form one or more explicit hypotheses.

8. Create the smallest possible diagnostic test.

9. Test the most likely solution.

10. If it fails:
    record why and test the next evidence-based approach.

11. Add regression tests when a fix succeeds.

12. Re-run affected test suites.

13. Update documentation.

14. Commit and push the validated result.

15. Continue toward the current gate.
```

Do not stop merely because:

```text
a command fails
a dependency changed
an API moved
a package script differs
a type error occurs
a fork fixture is unavailable
a historical borrower no longer exists
an RPC endpoint rate-limits
a quote provider returns an error
a test is flaky
documentation is outdated
Windows behaves differently
Git Bash behaves differently
an upstream path changed
```

Research the issue, create a reproducible solution, test it, and continue.

---

# 24. LEGITIMATE HARD BLOCKERS

Codex may stop a gate only when continuing requires something it cannot safely or legitimately do automatically.

Examples:

```text
user must create/authorize an external account

user credentials are required

a provider requires acceptance of financial terms

a provider requires a payment method

a real transaction would spend money

a mainnet action needs approval

GitHub authentication cannot be established

user-owned repository is unknown

a researched protocol constraint proves the target impossible

an upstream outage makes the required external service unavailable
and no safe alternative exists
```

When blocked:

Do **not** merely write:

```text
Blocked.
```

Instead produce:

```text
BLOCKER

What failed:
...

Root cause:
...

Evidence:
...

What was tested:
...

Alternatives tested:
...

What can continue without the blocker:
...

Exact user action required:
...

Cost or financial obligation:
...

Security implications:
...

Next command/action after resolution:
...
```

Continue all other work that does not depend on the blocker.

---

# 25. NEVER INVENT SUCCESS

Codex must never claim:

```text
tested
working
validated
gasless
zero-cost
profitable
deployed
live
production-ready
secure
```

without evidence.

Every important result must have one or more of:

```text
test output
transaction simulation
fork receipt
RPC result
code hash
balance delta
Git commit
official documentation
source-code proof
```

A skipped test is:

```text
SKIPPED
```

not:

```text
PASS
```

---

# 26. GIT PERSISTENCE IS MANDATORY

The VM is temporary.

Local-only progress is unacceptable.

Every meaningful completed engineering checkpoint must be committed and pushed.

First inspect:

```bash
git status
git remote -v
git branch --show-current
git rev-parse HEAD
```

Confirm:

```text
repository belongs to user
remote push destination is correct
authentication works
branch is safe
```

Never push modifications to Morpho's upstream repository.

Recommended development branch:

```text
codex/morpho-base-zero-upfront
```

If previous work exists, preserve it before restructuring.

Do not destroy useful previous commits.

---

# 27. FIRST RESTART PROCEDURE

Because this specification replaces the previous README, begin with a clean project-control restart.

Do this before further feature development:

```text
1. Inspect current repository state.

2. Identify modifications made under the old README.

3. Record them.

4. Preserve all useful changes in Git.

5. Confirm they are pushed remotely.

6. Replace the old README.md completely
   with this README.

7. Mark previous project instructions
   as superseded.

8. Reset approval-gate status to Gate 0.

9. Do NOT automatically erase source changes.

10. Evaluate existing source modifications
    against this new specification.

11. Keep only changes that remain valid.

12. Revert conflicting changes safely,
    preserving Git history.

13. Commit the restart checkpoint.

14. Push it.

15. Verify the remote commit.
```

Recommended commit:

```text
docs: restart morpho zero-upfront project from verified research
```

---

# 28. REQUIRED PROJECT RECORDS

Maintain:

```text
README.md

docs/PROGRESS.md

docs/VALIDATION.md

docs/DECISIONS.md

docs/RESEARCH.md

docs/APPROVALS.md

docs/OPERATIONS.md

docs/NEXT_STEPS.md

docs/BLOCKERS.md

docs/LIVE_READINESS.md
```

## PROGRESS.md

Include:

```text
current gate
completed work
current commit
test status
blockers
next technical action
```

## VALIDATION.md

Include reproducible evidence.

## DECISIONS.md

Explain why architectural choices were made.

## RESEARCH.md

Record:

```text
source
date checked
claim supported
relevant version
```

Prefer official sources.

## APPROVALS.md

Record user approval for each gate.

## OPERATIONS.md

Document restart/recovery.

## NEXT_STEPS.md

The exact next engineering action.

## BLOCKERS.md

Persistent unresolved blockers.

## LIVE_READINESS.md

Final launch checklist.

---

# 29. SECRET PROTECTION

`.gitignore` must cover at least:

```text
.env
.env.*
!.env.example

private keys
seed phrases
wallet stores
credential JSON
paymaster credentials
authenticated RPC URLs
API keys
GitHub tokens
local secret files
sensitive logs
```

Before every push:

```text
inspect diff
inspect staged files
scan for secrets
confirm no credentials present
```

Use an available reputable secret scanner if practical.

Do not push first and remove a secret later.

---

# 30. CHECKPOINT POLICY

At every meaningful engineering checkpoint:

```text
implement
   ↓
test
   ↓
review diff
   ↓
update docs
   ↓
secret scan
   ↓
commit
   ↓
push
   ↓
verify remote commit
```

Do not commit on every scanner poll.

Do commit after every completed logical development task.

Recommended progression:

```text
docs: restart project from verified research

chore: pin morpho upstream baseline

test: verify clean upstream baseline

feat: implement signer-free readonly runtime

test: verify zero-wallet readonly operation

test: verify shared executor runtime identity

feat: separate execution sender from profit wallet

test: add deterministic callback liquidation fixture

test: prove zero trading capital callback flow

feat: add usdc liquidation allowlist

feat: add base total fee accounting

feat: add economic profitability gate

test: add profitability boundary coverage

feat: route surplus to profit wallet

test: verify atomic payout accounting

feat: add sponsored execution transport

test: prove zero-eth sponsored operation

test: run continuous dry-run validation

docs: produce live readiness report
```

---

# 31. APPROVAL GATE MODEL

Routine engineering inside a gate does not require constant permission.

Every major gate requires explicit user approval before the next gate begins.

Codex must not self-approve a gate.

Use exact approval identifiers.

---

# GATE 0 — CONTROLLED PROJECT RESTART

## Objective

Restart project governance using this specification without losing valid previous work.

## Tasks

Verify:

```text
repository
remote
branch
GitHub push access
working tree
existing modifications
previous commits
old README
```

Preserve useful work.

Replace previous README.

Create/update project documentation.

Push restart checkpoint.

## Required tests

```text
git status
git remote -v
remote ownership verification
test push
secret scan
```

## Acceptance criteria

```text
new README active
old README superseded
no useful source work lost
remote backup confirmed
zero secrets committed
zero money spent
```

Stop and request:

```text
APPROVE GATE 0
```

---

# GATE 1 — VERIFIED UPSTREAM BASELINE

## Objective

Establish a known-good Morpho source baseline.

## Required work

Verify:

```text
morpho-org/morpho-bots

target:
bots/blue-liquidation

researched commit:
08d0a415d6d027f7e401fd6a904b09bedb441668
```

Inspect current repository changes relative to upstream.

Verify licensing.

Inspect package manager/version constraints.

Do not blindly use versions from old documentation.

Use versions specified by the pinned repository.

Run actual scripts present in:

```text
package.json
workspace configuration
```

Do not invent script names.

Run all applicable:

```text
install
build
lint
typecheck
unit tests
non-fixture tests
```

Record each result separately:

```text
PASS
FAIL
SKIPPED
```

## Source audit

Locate and document current implementations for:

```text
candidate discovery

liquidation lens

liquidation sizing

quotes

encode-call

onMorphoLiquidate behavior

simulation

submission

signer initialization

recipient selection

Executor source

fork tests
```

## Acceptance criteria

Clean reproducible baseline established.

Stop and request:

```text
APPROVE GATE 1
```

---

# GATE 2 — GENUINE ZERO-WALLET READONLY ENGINE

## Objective

Run the real Base Morpho scanner with no wallet or secret.

Required environment:

```text
CHAIN_ID=8453

EXECUTION_MODE=readonly

READ_ONLY=true

LIVE_ENABLED=false

NO PRIVATE KEY

NO FUNDED ACCOUNT
```

## Required outputs

Scanner must retrieve:

```text
borrower candidates

market details

fresh on-chain position state

debt

collateral

liquidatability

seize estimate

swap quote where available

hypothetical profitability
```

## Hard proof

Instrument/verify that readonly operation generates:

```text
eth_sendTransaction        0

eth_sendRawTransaction     0

UserOperation broadcasts   0

signatures                  0

nonce reservations          0
```

## Failure recovery tests

Test:

```text
RPC temporary failure

Morpho API failure

rate limit

network timeout

malformed response

duplicate candidate

stale API candidate

position changed before verification
```

Continue polling safely after recoverable errors.

## Acceptance criteria

Real Base observation works with no secret and no funded account.

Stop and request:

```text
APPROVE GATE 2
```

---

# GATE 3 — SHARED EXECUTOR IDENTITY AND SAFETY

## Objective

Prove the existing Executor can be reused without deployment.

Verify:

```text
expected deterministic address

on-chain Base bytecode

compiled local runtime bytecode

code hash equality
```

Investigate researched address:

```text
0x844124693a429CB9eD04472a23d6aEBFd1395dFe
```

Do not trust it until verified.

## Tests

```text
correct code hash -> pass

empty code -> block

incorrect code -> block

wrong chain -> block

RPC disagreement -> block until resolved
```

Inspect permissionless execution assumptions.

Document custody risks.

Implement pre-existing balance guard.

## Acceptance criteria

Executor reuse proven safe enough for subsequent fork testing.

No deployment transaction performed.

Stop and request:

```text
APPROVE GATE 3
```

---

# GATE 4 — DETERMINISTIC CALLBACK-FUNDED LIQUIDATION PROOF

## Objective

Prove the core business mechanism without user trading capital.

Do not wait for a naturally unhealthy borrower.

Create a deterministic local/fork fixture.

Preferred approach:

```text
Anvil
   ↓
pinned Base fork
   ↓
real Morpho Blue contracts where practical
   ↓
controlled test market/oracle
   ↓
borrower starts healthy
   ↓
controlled oracle change
   ↓
borrower becomes liquidatable
   ↓
execute production callback path
```

The exact implementation must follow actual protocol interfaces.

## Critical starting assertion

```text
liquidating execution account
loan-token balance
before transaction
=
0
```

## Required callback proof

Demonstrate:

```text
Morpho.liquidate called

collateral delivered to Executor

onMorphoLiquidate executed

collateral sold

loan token produced

Morpho repayment approved

Morpho repayment completed

no separate flashLoan() used

surplus remains

surplus swept
```

## Atomicity tests

Failure of:

```text
swap
minimum output
repayment
callback
approval
```

must safely revert the transaction.

## Required assertions

```text
borrower position updated

debt repayment correct

collateral seized correct

callback observed

loan-token repayment obtained from callback path

no initial repayment capital

no separate flash loan

Executor loan-token final balance = 0

Executor collateral final balance = 0

supported intermediate balances = 0
```

## Negative tests

```text
healthy position

already-liquidated position

oracle becomes healthy

repayment shortfall

swap below min output

bad route

rounding edge case

tiny liquidation

large liquidation

bad debt

state changes before execution
```

## Acceptance criteria

Zero-trading-capital mechanism demonstrated reproducibly.

Stop and request:

```text
APPROVE GATE 4
```

---

# GATE 5 — COMPLETE ECONOMICS ENGINE

## Objective

Prevent break-even or economically losing liquidations.

Implement:

```text
minimum route output

Morpho repayment

gross surplus

complete Base fee

sponsor economic cost

safety margin

economic net profit

user-funded cost
```

## Required boundaries

Test:

```text
$0.99 economic net
-> reject

$1.00 economic net
-> configured boundary behavior

$1.01 economic net
-> eligible

gross profit positive
but gas makes net negative
-> reject

optimistic quote profitable
but protected min output not profitable
-> reject

gas spike
-> recalculate/reject

sponsor cost above surplus
-> reject

negative surplus
-> reject

zero surplus
-> reject
```

## Base fee tests

Verify exact calldata impacts fee estimate.

Verify:

```text
L2 component

L1/data component where applicable

operator component where applicable

total
```

according to current Base/Viem behavior.

## Price-conversion tests

ETH→USDC pricing:

```text
fresh

conservative

integer safe

stale price rejected

missing price rejected
```

## Acceptance criteria

Only transactions with at least configured economic net profit qualify.

Stop and request:

```text
APPROVE GATE 5
```

---

# GATE 6 — PROFIT WALLET AND EXACT ACCOUNTING

## Objective

Route only our transaction's legitimate surplus to the configured wallet.

Separate:

```text
execution sender

shared Executor

profit recipient
```

Use:

```env
PROFIT_WALLET=
```

## Required tests

```text
valid wallet

zero address rejected

malformed address rejected

correct USDC recipient

wrong recipient impossible through config validation

no payout on revert

no payout below profit threshold

existing shared Executor balance not counted as ours

no accidental sweep of unrelated assets

profit wallet balance delta correct
```

## Accounting proof

Record:

```text
profit wallet balance before

profit wallet balance after

difference

economic gas cost

sponsor cost

user-funded cost

economic net
```

Success must not be defined merely by:

```text
receipt.status == success
```

It also requires correct balance reconciliation.

Stop and request:

```text
APPROVE GATE 6
```

---

# GATE 7 — ZERO-ETH SPONSORED EXECUTION PROOF

## Objective

Prove the strict zero-user-funded gas requirement.

Start with Coinbase CDP / supported ERC-4337 sponsorship.

Research current official documentation immediately before implementation.

Do not rely solely on this README for provider APIs because they may change.

## Required account state

```text
execution smart account ETH
before operation
=
0
```

And after:

```text
execution smart account ETH
=
0
```

## First test

Use supported non-production network if available.

Send a harmless sponsored operation.

Collect:

```text
UserOperation hash

transaction hash

receipt

paymaster/sponsor identity

ETH balance before

ETH balance after

actual gas consumed

economic gas value

free credit consumed if applicable

billing obligation if any

failure behavior
```

## Second test

Test sponsored call compatibility with:

```text
shared Executor call structure
```

before considering a mainnet liquidation.

## Provider economics

Establish:

```text
who fronts gas

whether user pays anything

whether account must have card/payment method

free credit amount

credit expiry

ongoing cost

failed operation charging

rate limits

contract allowlist rules

daily limits

abuse protections

whether arbitrary calldata is permitted

whether our Executor call is supportable
```

## Hard requirement

Strict-zero mode only passes if:

```text
USER-PROVIDED UPFRONT FUNDS
=
$0
```

A sponsored transaction that later creates an automatic financial debt to the user is not considered zero-cost without explicit approval.

## If Coinbase route fails

Do not abandon the project.

Investigate in order:

```text
other reputable 4337 sponsorship providers

Circle Paymaster feasibility

solver/relayer sponsorship

other existing externally funded mechanisms

custom postOp paymaster only as last-resort R&D
```

Document each experiment.

Do not implement large new infrastructure merely because one provider fails.

## Acceptance criteria

Either:

```text
SPONSORSHIP_PROVEN
```

or:

```text
STRICT_ZERO_GAS_BLOCKED
```

with complete evidence.

If blocked, continue free read-only/dry-run development but do not enable live execution.

Stop and request:

```text
APPROVE GATE 7
```

---

# GATE 8 — ADVERSARIAL AND SECURITY VALIDATION

## Objective

Try to break the system before money is involved.

Test:

```text
unexpected pre-existing Executor balances

malicious token

fee-on-transfer token

rebasing token

weird ERC20 return values

incorrect decimals

unexpected callback caller

corrupted callback data

unexpected allowance state

approval misuse

stale quote

stale oracle

race with another liquidator

borrower becomes healthy

borrower partially liquidated first

pool liquidity disappears

swap price moves

RPC reports inconsistent block

API stale candidate

nonce race if relevant

sponsor outage

paymaster rejection

sponsor limit exceeded

provider returns malformed response

transaction simulation succeeds
then state changes

duplicate candidate

duplicate execution

restart after VM crash
```

V1 should prefer denying unsupported markets/tokens instead of inventing complex compatibility hacks.

## Fuzz/property tests

Where useful:

```text
token decimals

rounding

repayment

seized collateral

profit threshold

sizing

safety margin

fee conversion
```

## Acceptance criteria

No known high-risk condition bypasses simulation, allowlisting, profitability, or live gates.

Stop and request:

```text
APPROVE GATE 8
```

---

# GATE 9 — CONTINUOUS REAL-MARKET DRY RUN

## Objective

Determine whether the completed system sees actual economically attractive opportunities.

Run read-only against Base.

No live transactions.

Record opportunities in a simple durable format.

Prefer:

```text
JSONL
```

or:

```text
CSV
```

unless another database is genuinely necessary.

Each candidate should record:

```text
timestamp

block

market

borrower

loan token

collateral token

debt

collateral

liquidatability

seized collateral estimate

repayment

route

expected output

minimum output

Base fee estimate

sponsorship economic cost

gross surplus

economic net profit

user-funded cost

simulation result

opportunity lifetime

eventual winning transaction if observable

reason rejected
```

Do not count repeated observations of the same opportunity as separate revenue opportunities.

Track:

```text
detected

liquidatable

routeable

gross profitable

net profitable

simulation-successful

likely executable
```

separately.

## No fake waiting requirement

If this VM cannot remain available continuously, implement safe resumability and collect as much real data as the environment permits.

Do not claim that seven days of monitoring occurred unless seven days actually occurred.

## Acceptance criteria

Produce business metrics:

```text
opportunities observed

net-positive opportunities

median economic net

maximum economic net

simulation success

competition observations

average opportunity lifetime

estimated sponsored cost

expected capture difficulty
```

Stop and request:

```text
APPROVE GATE 9
```

---

# GATE 10 — LIVE READINESS REVIEW

## Objective

Determine whether the system is genuinely ready for the first Base mainnet attempt.

Do not send anything yet.

`docs/LIVE_READINESS.md` must verify:

```text
correct chain

correct Morpho contracts

correct shared Executor bytecode

correct USDC

correct PROFIT_WALLET

callback proof passed

zero-trading-capital proof passed

profit engine passed

payout proof passed

sponsorship proof passed

execution smart account has 0 user-funded ETH

paymaster arrangement has no unauthorized cost

all security suites pass

no secrets in Git

shutdown procedure tested

current upstream changes reviewed

RPC working

Morpho API working

route provider working

minimum profit set

maximum sponsor spend/risk set

live allowlist set
```

There must be no unresolved critical failure.

Stop and request explicit authorization:

```text
APPROVE GATE 10
```

Approval of Gate 10 means:

```text
ready for final live configuration review
```

It does not automatically authorize unlimited autonomous execution.

---

# GATE 11 — FIRST LIVE TRANSACTION

**LOCKED BY DEFAULT.**

A separate explicit user command is required.

User approval must include or confirm:

```text
Base

Morpho Blue

verified Executor

approved smart account/sender

approved sponsor/paymaster

PROFIT_WALLET

USDC-only live allowlist

minimum economic net profit

maximum economic gas

maximum sponsor exposure

slippage limit

supported collateral

emergency shutdown
```

The first transaction should be treated as a controlled production validation.

Before sending:

```text
refresh borrower state

refresh route

refresh total fee

refresh sponsorship status

refresh Executor code identity

re-simulate exact operation

recalculate net profit
```

If any check changes materially:

```text
DO NOT SEND
```

---

# 32. DEFINITION OF A SUCCESSFUL LIVE LIQUIDATION

A transaction is successful for this project only if all of the following are true:

```text
receipt succeeded

Morpho debt repayment completed

callback settlement completed

no separate trading principal was supplied

shared Executor residual supported balances = 0

PROFIT_WALLET USDC increased

user-funded gas cost = 0
for strict-zero mode

economic net profit >= configured minimum

actual result recorded
```

Do not call it a profitable liquidation merely because:

```text
transaction did not revert
```

---

# 33. FAILURE AND CIRCUIT BREAKER

Live execution must automatically disable itself on serious anomalies.

Examples:

```text
Executor bytecode changes

wrong chain

USDC identity mismatch

profit calculation invariant failure

balance reconciliation failure

unexpected Executor residual

sponsor unexpectedly charges user funds

sponsor API behavior changes

paymaster configuration invalid

simulation result inconsistent

repeated execution failures

RPC chain inconsistency

unexpected token behavior
```

Transition to:

```text
LIVE_ENABLED=false
```

Record the reason.

Continue monitoring in read-only mode where safe.

Do not automatically re-enable live mode.

---

# 34. VM CRASH RECOVERY

Because the machine is temporary, another Codex session must be able to continue without hidden conversational memory.

`docs/OPERATIONS.md` must contain:

```text
clone repository

checkout development branch

verify latest remote commit

install pinned dependencies

restore local environment variables securely

run baseline tests

verify chain configuration

read PROGRESS.md

read NEXT_STEPS.md

read APPROVALS.md

resume exact gate
```

GitHub is the durable engineering state.

Codex conversation memory is not.

---

# 35. RESEARCH POLICY FOR CODEX

This project has already made its core strategic decision.

Do not repeatedly research whether we should switch to arbitrage, Aave, cross-chain MEV, or another business model.

Research should now answer implementation problems.

Research priority:

```text
1. current local source code

2. pinned upstream Morpho source

3. official Morpho documentation

4. official Base documentation

5. official Viem documentation

6. official sponsorship/paymaster documentation

7. protocol source contracts

8. upstream issues/PRs

9. reputable technical references
```

Avoid random blog posts when primary sources exist.

Record consequential research in:

```text
docs/RESEARCH.md
```

with date and source.

---

# 36. DON'T ASK THE USER TO SOLVE ENGINEERING PROBLEMS

Codex is the coding agent.

The user should not be asked things such as:

```text
Which file should I modify?

How should I fix this TypeScript error?

Should I use bigint?

Which Morpho function should I call?

What test framework should I use?

How do I resolve this package issue?
```

Inspect the code and solve those.

Ask the user only when a decision genuinely requires user authority, such as:

```text
GitHub repository destination

external account connection

financial terms

wallet receiving address

paid subscription

private credentials

mainnet activation

fallback requiring user funds
```

---

# 37. NO PREMATURE COMPLEXITY

Do not add:

```text
dashboard

mobile app

AI model

database cluster

Redis

Docker microservices

cross-chain execution

Aave

Solana

DEX arbitrage engine

pre-liquidation customer service

refinancing

analytics frontend

Telegram bot

Discord bot

custom paymaster
```

unless later evidence shows one is genuinely required and the user approves expansion.

The initial win condition is one reliable liquidation path.

---

# 38. FINAL PROJECT SUCCESS CRITERIA

The project is complete only when we have evidence for:

```text
Morpho Base scanning works

no-key readonly operation works

shared Executor identity verified

callback-funded liquidation works

liquidator starts with zero debt-token capital

no separate flash loan required

USDC route works

exact Base economic cost calculated

minimum $1 economic-net rule works

surplus reaches PROFIT_WALLET

Executor ends clean

zero-user-funded sponsorship works

no hidden paid obligation exists

security/adversarial tests pass

dry-run market data supports attempting live execution

final user authorization received
```

The ultimate business proof is:

```text
START
user-funded trading capital = $0

user-funded execution ETH = $0

user-funded deployment cost = $0

          │
          ▼

real unhealthy Morpho position

          │
          ▼

shared Executor

          │
          ▼

Morpho callback

          │
          ▼

seized collateral sold

          │
          ▼

Morpho repaid

          │
          ▼

externally sponsored Base gas

          │
          ▼

all economic costs accounted for

          │
          ▼

economic net >= $1

          │
          ▼

PROFIT_WALLET receives realized USDC
```

No profit amount is guaranteed.

No opportunity frequency is guaranteed.

The software must prove profitability transaction by transaction.

---

# 39. CODEX REPORT FORMAT AT EVERY GATE

At the end of each gate report:

```text
CURRENT GATE:
...

STATUS:
PASS / PARTIAL / BLOCKED

WORK COMPLETED:
...

SOURCE CHANGES:
...

RESEARCH PERFORMED:
...

TESTS PASSED:
...

TESTS FAILED:
...

TESTS SKIPPED:
...

VALIDATION EVIDENCE:
...

GITHUB:
repository:
branch:
commit:
push verified:

COST TO USER:
$...

USER-FUNDED CAPITAL USED:
$...

BLOCKERS:
...

NEXT ACTION:
...

APPROVAL REQUIRED:
APPROVE GATE X
```

Be concise but complete.

---

# 40. FIRST ACTIONS — START NOW

Codex, this README supersedes all previous project instructions.

Start again from **Gate 0**.

Immediately:

```text
1. Inspect the current working tree.

2. Inspect current branch and remote.

3. Identify all code already changed under
   the previous README.

4. Preserve existing useful work in Git.

5. Confirm the latest progress is pushed.

6. Replace the previous README.md entirely
   with this README.

7. Mark all previous README instructions
   superseded.

8. Create/update the required project
   documentation.

9. Create/use:
   codex/morpho-base-zero-upfront

10. Verify GitHub push works.

11. Pin and inspect the researched Morpho
    upstream commit.

12. Compare existing code changes against
    this specification.

13. Keep valid changes.

14. Correct invalid changes.

15. Run Gate 0 validation.

16. Commit.

17. Push.

18. Verify the remote commit.

19. Report Gate 0.

20. Request:
    APPROVE GATE 0
```

Do not ask for a private key.

Do not deploy a contract.

Do not send a Base transaction.

Do not spend money.

Do not introduce another flash loan.

Do not abandon the project because of a technical failure.

Research the failure, reproduce it, test the solution, preserve progress, and continue until the current gate is either **proven successful** or reaches a **genuine external hard blocker** requiring user authority.

**Begin Gate 0 now.**
