import { createServer } from 'node:http'
import { createClient, custom, http } from 'viem'
import { describe, expect, test, vi } from 'vitest'

import { loadConfig } from '../src/config'
import { readonlyTransport, type ReadonlyAudit } from '../src/execution/transport/readonly'
import { createReadonlyRuntime } from '../src/runtime/readonly'

const ENV = { CHAIN_ID: '8453', RPC_URL: 'https://base.example' }

test('readonly configuration never reads a private key, even if one is present', () => {
  const env = { ...ENV }
  Object.defineProperty(env, 'LIQUIDATOR_PRIVATE_KEY', {
    get() {
      throw new Error('Secret accessed')
    }
  })
  const config = loadConfig(env)
  expect(config.executionMode).toBe('readonly')
  expect(config.readOnly).toBe(true)
  expect(config.liveEnabled).toBe(false)
  expect(config.liquidatorPrivateKey).toBeUndefined()
})

test('only live EOA configuration requires a private key; live startup remains locked', () => {
  expect(() => loadConfig({ ...ENV, EXECUTION_MODE: 'eoa', LIVE_ENABLED: 'true' })).toThrow(
    /LIQUIDATOR_PRIVATE_KEY/
  )
  for (const mode of ['eoa', 'sponsored']) {
    const config = loadConfig({ ...ENV, EXECUTION_MODE: mode, ALLOW_DETECTION_ONLY: 'true' })
    expect(config.liquidatorPrivateKey).toBeUndefined()
    expect(() => createReadonlyRuntime(config, async () => {})).toThrow(/LIVE_EXECUTION_LOCKED/)
  }
})

test.each([
  { EXECUTION_MODE: 'readonly', LIVE_ENABLED: 'true' },
  { EXECUTION_MODE: 'readonly', READ_ONLY: 'false' },
  { EXECUTION_MODE: 'sponsored', READ_ONLY: 'true' },
  { EXECUTION_MODE: 'invalid' }
])('rejects contradictory mode flags: %j', flags => {
  expect(() => loadConfig({ ...ENV, ...flags })).toThrow()
})

test.each(['0x0000000000000000000000000000000000000000', 'broken'])(
  'rejects invalid profit recipient %s',
  profitWallet => {
    expect(() => loadConfig({ ...ENV, PROFIT_WALLET: profitWallet })).toThrow(/PROFIT_WALLET/)
  }
)

describe('default-deny RPC capability', () => {
  test('a real RPC timeout does not prevent the next guarded read', async () => {
    let calls = 0
    const server = createServer((request, response) => {
      let text = ''
      request.on('data', chunk => {
        text += String(chunk)
      })
      request.on('end', () => {
        calls++
        if (calls === 1) return
        const { id } = JSON.parse(text) as { id: number }
        response.setHeader('content-type', 'application/json')
        response.end(JSON.stringify({ jsonrpc: '2.0', id, result: '0x2105' }))
      })
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Missing test server address')
    const audit: ReadonlyAudit = { requests: {}, denied: {} }
    const client = createClient({
      transport: readonlyTransport(
        http(`http://127.0.0.1:${address.port}`, { timeout: 100, retryCount: 0 }),
        audit
      )
    })
    try {
      await expect(client.request({ method: 'eth_chainId' })).rejects.toThrow()
      expect(calls).toBe(1)
      expect(await client.request({ method: 'eth_chainId' })).toBe('0x2105')
      expect(audit.requests.eth_chainId).toBe(2)
      expect(audit.denied).toEqual({})
    } finally {
      server.closeAllConnections()
      await new Promise<void>((resolve, reject) =>
        server.close(error => (error ? reject(error) : resolve()))
      )
    }
  })

  test.each([
    'eth_sendTransaction',
    'eth_sendRawTransaction',
    'eth_sendUserOperation',
    'wallet_sendCalls',
    'personal_sign',
    'eth_sign',
    'eth_signTypedData_v4',
    'eth_getTransactionCount',
    'anvil_setBalance'
  ])('blocks %s before it reaches a provider', async method => {
    const downstream = vi.fn(async () => '0x1')
    const audit: ReadonlyAudit = { requests: {}, denied: {} }
    const transport = readonlyTransport(custom({ request: downstream }), audit)({})
    // Test untrusted method strings at the transport boundary, not a wallet API.
    await expect(async () =>
      transport.request({ method: method as 'eth_chainId' })
    ).rejects.toThrow(/READONLY_RPC_METHOD_DENIED/)
    expect(downstream).not.toHaveBeenCalled()
    expect(audit.denied[method]).toBe(1)
  })

  test('read requests reach the provider and are counted', async () => {
    const downstream = vi.fn(async () => '0x2105')
    const audit: ReadonlyAudit = { requests: {}, denied: {} }
    const client = createClient({
      transport: readonlyTransport(custom({ request: downstream }), audit)
    })
    expect(await client.request({ method: 'eth_chainId' })).toBe('0x2105')
    expect(audit.requests.eth_chainId).toBe(1)
    expect(audit.denied).toEqual({})
  })
})
