import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
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
  }
}, 35_000)
