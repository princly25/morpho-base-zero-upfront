import { spawnSync } from 'node:child_process'
import { globSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// cmd.exe does not expand globs. Supply the same file set explicitly on every OS,
// and fail rather than silently skipping a missing smoke suite.
const root = fileURLToPath(new URL('../', import.meta.url))
const files = globSync('bots/quoter-bot/scripts/playground-smoke*.mjs', { cwd: root })
if (files.length === 0) throw new Error('No playground smoke scripts found')
const result = spawnSync(
  process.execPath,
  [
    resolve(root, 'node_modules/oxlint/bin/oxlint'),
    '--config',
    'bots/quoter-bot/scripts/playground-smoke.oxlintrc.json',
    ...files
  ],
  { cwd: root, stdio: 'inherit' }
)
if (result.error) throw result.error
process.exit(result.status ?? 1)
