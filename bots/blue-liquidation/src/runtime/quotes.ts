import type { Logger } from '@repo/bot-kit/readonly'
import type { Venue } from '@repo/swaps'
import type { Client } from 'viem'

import {
  createErc4626Unwrapper,
  createPendlePtUnwrapper,
  createRateLimitedClient,
  createVenueSelector,
  PENDLE_CHAIN_IDS,
  priceByVenue
} from '@repo/swaps'
import { erc20Abi } from 'viem'
import { readContract } from 'viem/actions'

import type { Config } from '../config'

import { composeQuoting } from '../quotes'

// Upstream quote wiring retained; no account, nonce or sender is constructed here.
export function createObservationQuoting(config: Config, client: Client, logger: Logger) {
  // Enabled venues are inferred from which venue API keys are present (loadConfig already enforced
  // the no-key → detection-only opt-in). Keys are read HERE, at the point of use, and live only in
  // this closure — never on the (logged) Config object.
  const apiKeys: Partial<Record<Venue, string>> = {}
  if (process.env.ZEROX_API_KEY) apiKeys['0x'] = process.env.ZEROX_API_KEY
  if (process.env.ONEINCH_API_KEY) apiKeys['1inch'] = process.env.ONEINCH_API_KEY
  if (process.env.LIFI_API_KEY) apiKeys.lifi = process.env.LIFI_API_KEY
  const venues = config.venues.enabled
  if (venues.length === 0) {
    logger.warn('quoting.no_routes', {
      chainId: config.chainId,
      detail:
        'no venue API keys set — running detection-only (every liquidation is skipped, config.no_swap_path)'
    })
  } else {
    logger.info('quoting.startup', { chainId: config.chainId, venues })
  }
  const baseUrls: Partial<Record<Venue, string>> = {}
  if (config.venues.zeroxBaseUrl) baseUrls['0x'] = config.venues.zeroxBaseUrl
  if (config.venues.oneinchBaseUrl) baseUrls['1inch'] = config.venues.oneinchBaseUrl
  if (config.venues.lifiBaseUrl) baseUrls.lifi = config.venues.lifiBaseUrl

  // Two rate-limited HTTP clients, each with its own per-venue token buckets: one for time-sensitive
  // FIRM quotes, and a separate, slower one for BACKGROUND probes — so a probe burst can never queue
  // ahead of a live liquidation's firm quote on the same venue's bucket.
  const httpClient = createRateLimitedClient({
    apiKeys,
    rps: config.quoting.httpRps,
    burst: config.quoting.httpBurst,
    maxRetries: config.quoting.httpMaxRetries,
    timeoutMs: config.quoting.quoteTimeoutMs
  })
  const probeClient = createRateLimitedClient({
    apiKeys,
    rps: config.probe.httpRps,
    burst: config.probe.httpRps,
    maxRetries: config.quoting.httpMaxRetries,
    timeoutMs: config.quoting.quoteTimeoutMs
  })

  // Venue selector: caches each venue's rate curve per pair from log-scaled indicative probes.
  // Decimals are read once per collateral (memoized in the selector); the collateral set is bounded
  // by the discovered markets, so these are a handful of one-off reads over the process lifetime. No
  // `usdPriceOf` is wired here, so the ladder stays denominated in whole collateral tokens.
  const venueSelector = createVenueSelector({
    venues,
    chainId: config.chainId,
    ladderSizes: config.probe.ladderSizes,
    getDecimals: token =>
      readContract(client, { address: token, abi: erc20Abi, functionName: 'decimals' }),
    indicativeQuote: (venue, params) => priceByVenue(probeClient, { venue, baseUrls, params }),
    staleMs: config.probe.staleMs,
    logger
  })

  // Pre-swap converters for exotic collateral (ERC-4626 shares, Pendle PTs → underlying).
  // Auto-detecting with per-process memoization. `erc4626` first: a memoized eth_call beats consulting
  // the markets list. Pendle is only constructed on chains it is deployed to — elsewhere a
  // cold-cache markets outage would fail plain-collateral quotes too. The Pendle markets list is
  // cached in-process for the bot's lifetime (a 6h TTL inside the unwrapper handles staleness), so
  // it is built once here.
  const pendle = PENDLE_CHAIN_IDS.has(config.chainId)
    ? createPendlePtUnwrapper({
        client: httpClient,
        chainId: config.chainId,
        slippageBps: config.quoting.pendleSlippageBps,
        logger
      })
    : null
  const unwrappers = [createErc4626Unwrapper({ client, logger }), ...(pendle ? [pendle] : [])]
  const { quoteFor } = composeQuoting({
    httpClient,
    selector: venueSelector,
    chainId: config.chainId,
    executor: config.executooorAddress,
    venues,
    baseUrls,
    maxRouteImpactBps: config.quoting.maxRouteImpactBps,
    unwrappers,
    excludeCollaterals: config.venues.excludeCollaterals,
    logger
  })
  return { quoteFor }
}
