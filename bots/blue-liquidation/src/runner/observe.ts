import type { QuoteOutcome } from '@repo/swaps'

import { lensKey } from '@repo/utils'

import type { BorrowerCandidate } from '../discovery/borrowers'
import type { LiquidationPlan } from '../sizing/plan'
import type { LensInput, LensOut } from '../state/lens.sol'

import { marketId } from '../market'
import { toAssetsUp } from '../sizing/math'
import { planWithReason } from '../sizing/plan'
import { isLiquidatable, planInputFromLens } from './eligibility'

/** Observation only. There is no transaction sender or submission dependency. */
export async function observe(deps: {
  block: bigint
  discover: () => Promise<BorrowerCandidate[]>
  readLens: (pairs: LensInput[]) => Promise<Map<string, LensOut>>
  quoteFor: (plan: LiquidationPlan, out: LensOut, label: string) => Promise<QuoteOutcome>
  record: (row: Record<string, unknown>) => Promise<void>
}): Promise<void> {
  const unique = new Map<string, BorrowerCandidate>()
  for (const candidate of await deps.discover()) {
    unique.set(lensKey(marketId(candidate.marketParams), candidate.borrower), candidate)
  }
  const pairs = [...unique.values()].map(c => ({ params: c.marketParams, borrower: c.borrower }))
  const state = await deps.readLens(pairs)
  for (const { params, borrower } of pairs) {
    const id = marketId(params)
    const label = lensKey(id, borrower)
    const out = state.get(label)
    const row: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      inputBlock: deps.block,
      market: id,
      borrower,
      loanToken: params.loanToken,
      collateralToken: params.collateralToken,
      executionMode: 'readonly',
      liveEligible: false,
      economicNetProfit: null,
      economicsStatus: 'COMPLETE_COST_MODEL_NOT_IMPLEMENTED'
    }
    if (!out?.valid) {
      await deps.record({ ...row, reason: 'INVALID_FRESH_STATE' })
      continue
    }
    row.lensTimestamp = out.blockTimestamp
    row.debt = toAssetsUp(out.borrowShares, out.accruedTotalBorrowAssets, out.totalBorrowShares)
    row.collateral = out.collateral
    row.liquidatable = isLiquidatable(out)
    if (!isLiquidatable(out)) {
      await deps.record({ ...row, reason: 'NOT_LIQUIDATABLE' })
      continue
    }
    const planned = planWithReason(planInputFromLens(out))
    if (!planned.plan) {
      await deps.record({ ...row, reason: planned.reason })
      continue
    }
    row.seizedAssets = planned.plan.seizedAssets
    row.repayment = planned.plan.impliedRepaidAssets
    try {
      const quote = await deps.quoteFor(planned.plan, out, label)
      row.quote = quote.kind
      if (quote.kind === 'swap') {
        row.expectedOutput = quote.plan.expectedAmountOut
        row.minimumOutput = quote.plan.amountOutMinimum
        row.hypotheticalGrossSurplus =
          quote.plan.amountOutMinimum - planned.plan.impliedRepaidAssets
        row.route = quote.plan.steps.map(s => ({
          tokenIn: s.tokenIn,
          tokenOut: s.tokenOut,
          target: s.target
        }))
      } else {
        row.reason = quote.kind === 'failed' ? quote.reason : 'NO_ROUTE_CONFIGURED'
      }
    } catch {
      row.reason = 'QUOTE_ERROR'
    }
    await deps.record(row)
  }
}
