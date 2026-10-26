import type { Transport } from 'viem'

const READ_METHODS = new Set([
  'eth_chainId',
  'eth_blockNumber',
  'eth_call',
  'eth_getCode',
  'eth_getBalance',
  'eth_getBlockByNumber',
  'eth_getBlockByHash',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_feeHistory',
  'eth_maxPriorityFeePerGas',
  'eth_getTransactionReceipt'
])

export type ReadonlyAudit = {
  requests: Record<string, number>
  denied: Record<string, number>
}

/** Default-deny capability boundary before the underlying RPC transport. */
export function readonlyTransport<T extends string>(
  inner: Transport<T>,
  audit: ReadonlyAudit
): Transport<T> {
  return options => {
    const transport = inner(options)
    const request: typeof transport.request = (...args) => {
      const method = args[0].method
      if (!READ_METHODS.has(method)) {
        audit.denied[method] = (audit.denied[method] ?? 0) + 1
        throw new Error('READONLY_RPC_METHOD_DENIED')
      }
      audit.requests[method] = (audit.requests[method] ?? 0) + 1
      return transport.request(...args)
    }
    return { ...transport, request }
  }
}
