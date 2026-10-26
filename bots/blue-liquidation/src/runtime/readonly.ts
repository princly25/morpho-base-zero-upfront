import { createDeploylessTransport, createLogger, withDlcFacts } from '@repo/bot-kit/readonly'
import { createClient } from 'viem'
import { getBlockNumber, getChainId } from 'viem/actions'

import type { Config } from '../config'

import { createGraphqlCandidateSource, discoverCandidates } from '../discovery/borrowers'
import { readonlyTransport, type ReadonlyAudit } from '../execution/transport/readonly'
import { observe } from '../runner/observe'
import { readBlueLiquidationLens } from '../state/lens.sol'
import { createMarketParamsResolver, multicallIdToMarketParams } from '../state/market-params'
import { createObservationQuoting } from './quotes'

export function createReadonlyRuntime(
  config: Config,
  record: (row: Record<string, unknown>) => Promise<void>
) {
  if (config.executionMode !== 'readonly' || !config.readOnly || config.liveEnabled) {
    throw new Error('LIVE_EXECUTION_LOCKED')
  }
  if (config.chainId !== 8453) throw new Error('BASE_ONLY')
  const audit: ReadonlyAudit = { requests: {}, denied: {} }
  const client = createClient({
    chain: withDlcFacts(config.chain),
    transport: readonlyTransport(createDeploylessTransport(config), audit)
  })
  const logger = createLogger(config.logLevel, {
    context: { bot: 'blue-liquidation', chainId: config.chainId, mode: 'readonly' }
  })
  const fetchPage = createGraphqlCandidateSource({
    url: config.discovery.apiUrl,
    chainId: config.chainId,
    healthFactorLte: config.discovery.healthFactorLte
  })
  const resolveParams = createMarketParamsResolver(multicallIdToMarketParams(client, config.morpho))
  const { quoteFor } = createObservationQuoting(config, client, logger)
  return {
    audit,
    async poll() {
      if ((await getChainId(client)) !== 8453) throw new Error('RPC_CHAIN_MISMATCH')
      const block = await getBlockNumber(client, { cacheTime: 0 })
      let count = 0
      await observe({
        block,
        discover: () => discoverCandidates(fetchPage, resolveParams, { logger }),
        readLens: pairs => readBlueLiquidationLens(client, config.morpho, pairs),
        quoteFor,
        record: async row => {
          await record(row)
          count++
        }
      })
      logger.info('readonly.poll_complete', { block, candidates: count, audit })
    }
  }
}
