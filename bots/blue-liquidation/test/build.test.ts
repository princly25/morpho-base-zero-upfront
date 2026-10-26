import { execFile, execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { expect, test } from 'vitest'

// Source-level lens tests use Vite's transform and cannot detect a broken production
// esbuild filter. Compile the real entrypoints without ever starting the bot.
test('production artifacts compile Solidity templates on the host platform', () => {
  const root = fileURLToPath(new URL('../', import.meta.url))
  execFileSync(process.execPath, ['--import', 'tsx', 'scripts/build.ts'], {
    cwd: root,
    timeout: 30_000,
    stdio: 'pipe'
  })
  for (const entry of ['dist/src/index.js', 'dist/scripts/probe-live-lens.js']) {
    const source = readFileSync(new URL(`../${entry}`, import.meta.url), 'utf8')
    expect(source).not.toContain('soltag: sol() was not transformed')
    expect(source).not.toContain('soltag: solFile() was not transformed')
    if (entry.endsWith('src/index.js')) {
      for (const facility of [
        'createSigner',
        'privateKeyToAccount',
        'createWalletClient',
        'createPendingQueue',
        'createBalanceMonitor'
      ]) {
        expect(source, `readonly artifact must exclude ${facility}`).not.toContain(facility)
      }
    }
  }
}, 35_000)

test.each(['malformed_api', 'rpc_outage', 'wrong_chain'])(
  'keyless production CLI recovers from %s with no sending capability',
  async failure => {
    const methods: string[] = []
    let failed = false
    const server = createServer((request, response) => {
      let text = ''
      request.on('data', chunk => {
        text += String(chunk)
      })
      request.on('end', () => {
        const body = JSON.parse(text) as { method?: string; id?: number }
        response.setHeader('content-type', 'application/json')
        if (body.method) {
          methods.push(body.method)
          if (!failed && failure === 'rpc_outage') {
            failed = true
            response.statusCode = 503
            response.end('{}')
            return
          }
          let result = body.method === 'eth_chainId' ? '0x2105' : '0x1'
          if (!failed && failure === 'wrong_chain') {
            failed = true
            result = '0x1'
          }
          response.end(JSON.stringify({ jsonrpc: '2.0', id: body.id, result }))
        } else {
          if (!failed && failure === 'malformed_api') {
            failed = true
            response.end(JSON.stringify({ data: {} }))
            return
          }
          response.end(
            JSON.stringify({
              data: { marketPositions: { items: [], pageInfo: { count: 0, countTotal: 0 } } }
            })
          )
        }
      })
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Missing test server address')
    const url = `http://127.0.0.1:${address.port}`
    try {
      const { stdout, stderr } = await promisify(execFile)(
        process.execPath,
        [fileURLToPath(new URL('../dist/src/index.js', import.meta.url))],
        {
          cwd: mkdtempSync(join(tmpdir(), 'morpho-readonly-')),
          timeout: 30_000,
          env: {
            SystemRoot: process.env.SystemRoot,
            TEMP: process.env.TEMP,
            CHAIN_ID: '8453',
            RPC_URL: url,
            MORPHO_API_URL: url,
            EXECUTION_MODE: 'readonly',
            READ_ONLY: 'true',
            LIVE_ENABLED: 'false',
            OBSERVATION_POLLS: '2'
          }
        }
      )
      expect(failed).toBe(true)
      expect(stderr).toContain('readonly.poll_complete')
      const rows = stdout
        .trim()
        .split('\n')
        .map(line => JSON.parse(line))
      const audit = rows.find(row => row.event === 'readonly.audit')
      expect(audit.denied).toEqual({})
      for (const method of [
        'eth_sendTransaction',
        'eth_sendRawTransaction',
        'eth_sendUserOperation',
        'eth_getTransactionCount',
        'eth_sign',
        'personal_sign'
      ]) {
        expect(methods).not.toContain(method)
        expect(audit.requests[method] ?? 0).toBe(0)
      }
    } finally {
      server.closeAllConnections()
      await new Promise<void>((resolve, reject) =>
        server.close(error => (error ? reject(error) : resolve()))
      )
    }
  },
  35_000
)
