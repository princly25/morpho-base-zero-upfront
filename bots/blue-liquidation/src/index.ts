import { appendFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

import { loadConfig } from './config'
import { createReadonlyRuntime } from './runtime/readonly'

export async function main() {
  const config = loadConfig()
  const output = resolve('data/observations.jsonl')
  const rawPolls = process.env.OBSERVATION_POLLS?.trim()
  if (
    rawPolls &&
    (!/^\d+$/.test(rawPolls) || !Number.isSafeInteger(Number(rawPolls)) || Number(rawPolls) < 1)
  ) {
    throw new Error('OBSERVATION_POLLS must be a positive safe integer')
  }
  const polls = rawPolls ? Number(rawPolls) : undefined
  await mkdir(dirname(output), { recursive: true })
  const runtime = createReadonlyRuntime(config, async row => {
    await appendFile(
      output,
      JSON.stringify(row, (_, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value
      ) + '\n'
    )
  })
  let stopped = false
  process.once('SIGINT', () => {
    stopped = true
  })
  process.once('SIGTERM', () => {
    stopped = true
  })
  for (let i = 0; ; i++) {
    if (stopped || (polls !== undefined && i >= polls)) break
    try {
      await runtime.poll()
    } catch (error) {
      // Provider exceptions may embed credential URLs; log their class, never raw data.
      console.error(
        JSON.stringify({
          event: 'readonly.poll_error',
          error: error instanceof Error ? error.name : 'UnknownError'
        })
      )
    }
    if (!stopped && (polls === undefined || i + 1 < polls)) await delay(2_000)
  }
  console.log(JSON.stringify({ event: 'readonly.audit', ...runtime.audit }))
}

if (import.meta.main) {
  void main().catch(error => {
    console.error(
      JSON.stringify({
        event: 'startup.error',
        error: error instanceof Error ? error.name : 'UnknownError'
      })
    )
    process.exitCode = 1
  })
}
