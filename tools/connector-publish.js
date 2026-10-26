// Runs inside the agent's functions.exec environment, where `tools` is provided.
// Read-only preparation/secret scanning must precede publication. Writes only the
// explicitly confirmed user repository and branch; no GitHub credentials extracted.
async function publishConnectorCheckpoint({ parent, message, chunks, expectedTree, branchExists }) {
  const link_id = 'link_6ad8ed4548dc8191987ccd5db9157378'
  const repository_full_name = 'princly25/morpho-base-zero-upfront'
  const branch_name = 'codex/morpho-base-zero-upfront'
  const cwd = 'C:\\Users\\RDP\\Desktop\\morpho-base-zero-upfront'
  const unwrap = result => {
    if (result.isError) throw new Error(JSON.stringify(result.structuredContent ?? result.content))
    return result.structuredContent
  }
  let encoded = ''
  for (let start = 0; start < chunks; start += 6) {
    const results = await Promise.allSettled(Array.from({ length: Math.min(6, chunks - start) }, (_, i) =>
      tools.exec_command({ cmd: `python tools/connector_checkpoint.py chunk --index ${start + i}`, workdir: cwd, max_output_tokens: 70000 })
    ))
    for (const result of results) {
      if (result.status !== 'fulfilled' || result.value.exit_code !== 0 || result.value.original_token_count > 70000) {
        throw new Error('Checkpoint chunk read failed or truncated')
      }
      // Decode base64 without Node APIs: the export is ASCII JSON.
      const input = result.value.output.trim()
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      let bits = 0, accumulator = 0
      for (const c of input.replace(/=+$/, '')) {
        const digit = alphabet.indexOf(c)
        if (digit < 0) throw new Error('Invalid base64 chunk')
        accumulator = (accumulator << 6) | digit
        bits += 6
        if (bits >= 8) { bits -= 8; encoded += String.fromCharCode((accumulator >> bits) & 255) }
      }
    }
  }
  const checkpoint = JSON.parse(encoded)
  if (checkpoint.tree !== expectedTree) throw new Error('Staged source tree changed')
  let treeSha = checkpoint.baseTree ?? null
  let batch = []
  let batchBytes = 0
  async function flush() {
    if (!batch.length) return
    const tree = unwrap(await tools.mcp__codex_apps__github_create_tree({ link_id, repository_full_name, base_tree_sha: treeSha, tree_elements: batch }))
    treeSha = tree.sha ?? tree.tree_sha ?? tree.tree?.sha
    if (!treeSha) throw new Error('Missing remote tree SHA')
    batch = []; batchBytes = 0
  }
  for (const entry of checkpoint.entries) {
    const item = { path: entry.path, mode: entry.mode, type: 'blob' }
    if (entry.delete) {
      item.sha = null
    } else if (entry.base64 !== undefined) {
      await flush()
      const blob = unwrap(await tools.mcp__codex_apps__github_create_blob({ link_id, repository_full_name, content: entry.base64, encoding: 'base64' }))
      item.sha = blob.sha ?? blob.blob_sha
      if (item.sha !== entry.sha) throw new Error(`Remote blob mismatch: ${entry.path}`)
    } else {
      item.content = entry.content
    }
    batch.push(item)
    batchBytes += JSON.stringify(item).length
    if (batchBytes > 220000 || batch.length >= 40) await flush()
  }
  await flush()
  if (treeSha !== expectedTree) throw new Error('Remote tree differs from exact staged source tree')
  const commit = unwrap(await tools.mcp__codex_apps__github_create_commit({ link_id, repository_full_name, parent_sha: parent, tree_sha: treeSha, message }))
  const commitSha = commit.sha ?? commit.commit_sha ?? commit.commit?.sha
  if (!commitSha) throw new Error('Missing remote commit SHA')
  if (branchExists) {
    unwrap(await tools.mcp__codex_apps__github_update_ref({ link_id, repository_full_name, branch_name, expected_sha: parent, sha: commitSha, force: false }))
  } else {
    unwrap(await tools.mcp__codex_apps__github_create_branch({ link_id, repository_full_name, branch_name, sha: commitSha }))
  }
  return { commit: commitSha, tree: treeSha, files: checkpoint.entries.length, repository: repository_full_name, branch: branch_name }
}
