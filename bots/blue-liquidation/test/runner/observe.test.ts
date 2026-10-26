import { lensKey } from '@repo/utils'
import { describe, expect, test, vi } from 'vitest'

import type { MarketParams } from '../../src/market'
import type { LensOut } from '../../src/state/lens.sol'

import { ORACLE_PRICE_SCALE, WAD } from '../../src/constants'
import { marketId } from '../../src/market'
import { observe } from '../../src/runner/observe'

const params: MarketParams = {
  loanToken: '0x1111111111111111111111111111111111111111',
  collateralToken: '0x2222222222222222222222222222222222222222',
  oracle: '0x3333333333333333333333333333333333333333',
  irm: '0x4444444444444444444444444444444444444444',
  lltv: (WAD * 8n) / 10n
}
const borrower = '0x5555555555555555555555555555555555555555'
const candidate = { marketParams: params, borrower } as const
const label = lensKey(marketId(params), borrower)
const state: LensOut = {
  params,
  valid: true,
  hasDebt: true,
  healthy: false,
  blockTimestamp: 100n,
  borrowShares: 1_000_000n,
  collateral: 2_000_000n,
  accruedTotalBorrowAssets: 1_000_000n,
  totalBorrowShares: 1_000_000n,
  collateralPrice: ORACLE_PRICE_SCALE,
  lltv: params.lltv
}

function setup(out = state) {
  const record = vi.fn(async (_row: Record<string, unknown>) => {})
  const quoteFor = vi.fn(async () => ({
    kind: 'swap' as const,
    plan: {
      steps: [],
      expectedAmountOut: 2_000_000n,
      amountOutMinimum: 1_100_000n
    }
  }))
  return {
    block: 1n,
    record,
    quoteFor,
    discover: vi.fn(async () => [candidate, candidate]),
    readLens: vi.fn(async () => new Map([[label, out]]))
  }
}

describe('readonly observations', () => {
  test('deduplicates candidates and uses protected output, never optimistic output for surplus', async () => {
    const deps = setup()
    await observe(deps)
    expect(deps.quoteFor).toHaveBeenCalledTimes(1)
    expect(deps.record).toHaveBeenCalledTimes(1)
    const row = deps.record.mock.calls[0]![0]
    expect(row.hypotheticalGrossSurplus).toBe(1_100_000n - BigInt(String(row.repayment)))
    expect(row.economicNetProfit).toBeNull()
    expect(row.liveEligible).toBe(false)
  })

  test('fresh healthy state defeats a stale unhealthy API candidate', async () => {
    const deps = setup({ ...state, healthy: true })
    await observe(deps)
    expect(deps.quoteFor).not.toHaveBeenCalled()
    expect(deps.record.mock.calls[0]![0].reason).toBe('NOT_LIQUIDATABLE')
  })

  test('invalid fresh state is rejected', async () => {
    const deps = setup({ ...state, valid: false })
    await observe(deps)
    expect(deps.quoteFor).not.toHaveBeenCalled()
    expect(deps.record.mock.calls[0]![0].reason).toBe('INVALID_FRESH_STATE')
  })

  test.each(['RPC temporary failure', 'network timeout', 'Morpho API outage'])(
    'a subsequent observation can recover from %s',
    async message => {
      const deps = setup()
      deps.discover.mockRejectedValueOnce(new Error(message))
      await expect(observe(deps)).rejects.toThrow(message)
      expect(deps.record).not.toHaveBeenCalled()
      await observe(deps)
      expect(deps.record).toHaveBeenCalledTimes(1)
    }
  )

  test('quote provider failure is recorded without losing the position', async () => {
    const deps = setup()
    deps.quoteFor.mockRejectedValueOnce(new Error('provider unavailable'))
    await observe(deps)
    expect(deps.record.mock.calls[0]![0].reason).toBe('QUOTE_ERROR')
  })
})
