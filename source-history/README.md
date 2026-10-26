# Original history archive

initial-git-history.bundle preserves the entire original development-branch history
through checkpoint ebce54ee9e02ba34476722732480875ebc3ab4c4, including the pinned
upstream commit and its ancestors. This complete bundle is stored in GitHub with
the source. No original commits were deleted.

SHA256: 6ead5e1d17e3bfb6f53c23d82ef216b64296d8228e3f3233a7bd15bdbe80e6f8.

The connected app publishes exact trees, blobs and new commits, but cannot forward
original serialized commit objects. Local Git has no login. The user repository's
normal development history begins with an import of the exact staged source; the
original history remains here in its original form. All source is directly tracked,
not delegated to a submodule or external repository.

After cloning, restore the reviewed baseline objects:

```powershell
git bundle verify source-history/initial-git-history.bundle
git fetch source-history/initial-git-history.bundle refs/heads/codex/morpho-base-zero-upfront:refs/remotes/preserved/initial-checkpoint
git show 08d0a415d6d027f7e401fd6a904b09bedb441668:LICENSE
```

Working-tree, staged and original-history Gitleaks scans found zero secrets before
archiving. Upstream's reviewed scanner permits only documented public Anvil fixture
keys and other specific false positives. No user secrets were supplied. The bundle
is immutable; subsequent work belongs in ordinary commits, not repeated bundles.
