"""Read-only project-control checks. Never starts the bot or calls a chain RPC.

Exit 0: local checks pass and remote checkpoint verified with --remote.
Exit 1: a local invariant failed.
Exit 2: no failure, but durable remote preservation is not yet verified.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
BASE = "08d0a415d6d027f7e401fd6a904b09bedb441668"
BRANCH = "codex/morpho-base-zero-upfront"
RECORDS = (
    "PROGRESS", "VALIDATION", "DECISIONS", "RESEARCH", "APPROVALS",
    "OPERATIONS", "NEXT_STEPS", "BLOCKERS", "LIVE_READINESS",
)
WORKFLOWS = (
    "checks.yml", "close-prs.yml", "publish-quoter-bot-dockerhub.yml",
    "publish-quoter-bot-npm.yml",
)


def git(*args: str, optional: bool = False) -> str:
    result = subprocess.run(
        ["git", *args], cwd=ROOT, capture_output=True, check=False,
        encoding="utf-8", errors="replace", timeout=45,
    )
    if result.returncode and not optional:
        # Do not print subprocess errors, which might contain credential URLs.
        raise RuntimeError("Git command failed; inspect it locally without logging credentials")
    return result.stdout.strip()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--remote", action="store_true", help="Read origin and compare remote branch SHA")
    args = parser.parse_args()
    results: list[dict[str, str]] = []

    def record(name: str, ok: bool, detail: str = "") -> None:
        results.append({"check": name, "status": "PASS" if ok else "FAIL", "detail": detail})

    lock = json.loads((ROOT / "upstream.lock.json").read_text(encoding="utf-8"))
    record("pinned baseline", lock["commit"] == BASE and git("cat-file", "-t", BASE) == "commit")
    archive = ROOT / "source-history/initial-git-history.bundle"
    record("original Git history archived", archive.is_file() and hashlib.sha256(archive.read_bytes()).hexdigest() == lock.get("historyArchiveSha256"))
    record("development branch", git("branch", "--show-current") == BRANCH)
    record("upstream push disabled", git("remote", "get-url", "--push", "upstream") == "DISABLED")
    readme = (ROOT / "README.md").read_bytes()
    record("complete specification checksum", hashlib.sha256(readme).hexdigest() == lock["readmeSha256"])
    sections = re.findall(r"^# (\d+)\. ", readme.decode("utf-8"), flags=re.MULTILINE)
    record("all 40 specification sections", sections == [str(n) for n in range(1, 41)])
    record("project records", all((ROOT / "docs" / f"{name}.md").is_file() for name in RECORDS))
    record("governing agent instructions", (ROOT / "AGENTS.md").is_file())
    record("upstream source untouched", not git("diff", BASE, "--", "bots", "packages", "pnpm-lock.yaml", "pnpm-workspace.yaml", "package.json"))
    record("Apache license preserved", git("show", f"{BASE}:LICENSE") == (ROOT / "LICENSE").read_text(encoding="utf-8").strip())
    record("upstream README archived", git("show", f"{BASE}:README.md") == (ROOT / "docs/upstream/README.md").read_text(encoding="utf-8").strip())
    record("upstream workflows archived", all(
        git("show", f"{BASE}:.github/workflows/{name}") ==
        (ROOT / "docs/upstream/workflows" / name).read_text(encoding="utf-8").strip()
        for name in WORKFLOWS
    ))
    active_workflows = ROOT / ".github/workflows"
    record("no active inherited workflows", not any(active_workflows.glob("*.y*ml")))
    env = dict(
        line.split("=", 1) for line in (ROOT / ".env.example").read_text(encoding="utf-8").splitlines()
        if line and not line.startswith("#")
    )
    record("target configuration stays disabled", all(env.get(k) == v for k, v in {
        "CHAIN_ID": "8453", "EXECUTION_MODE": "readonly", "READ_ONLY": "true",
        "LIVE_ENABLED": "false", "MIN_NET_PROFIT_USDC": "1",
        "PROFIT_WALLET": "", "RPC_URL": "", "LIQUIDATOR_PRIVATE_KEY": "", "CDP_PAYMASTER_URL": "",
    }.items()), "Documentation only; upstream mode enforcement is not yet implemented")
    ignored = (
        ".env", ".env.production", "bots/blue-liquidation/.env.local", "account.key",
        "wallet.keystore", "keys/credentials.json", "local-secrets/rpc.txt", "logs/run.jsonl",
    )
    record("secret path exclusions", all(git("check-ignore", path, optional=True) == path for path in ignored))
    record("environment example trackable", not git("check-ignore", ".env.example", optional=True))
    record("diff whitespace", not git("diff", "--check", BASE, optional=True))

    remote_ok = False
    origin = git("config", "--get", "remote.origin.url", optional=True)
    parsed = urlparse(origin)
    valid_origin = (
        parsed.scheme == "https" and parsed.netloc == "github.com" and
        parsed.path.startswith("/princly25/") and len(parsed.path.strip("/").split("/")) == 2 and
        not parsed.username and not parsed.password and not parsed.query and not parsed.fragment
    )
    if not origin:
        results.append({"check": "remote backup", "status": "BLOCKED", "detail": "Exact user-owned destination unknown; no origin configured"})
    elif not valid_origin:
        record("clean princly25 origin", False, "Origin must be a credential-free https://github.com/princly25/ repository URL")
    elif args.remote:
        remote_sha = git("ls-remote", "--exit-code", "origin", f"refs/heads/{BRANCH}").split()[0]
        remote_ok = remote_sha == git("rev-parse", "HEAD")
        record("remote checkpoint equality", remote_ok, remote_sha)
        record("working tree committed", not git("status", "--porcelain"))
    else:
        results.append({"check": "remote backup", "status": "SKIPPED", "detail": "Run with --remote after checkpoint push"})

    failed = any(r["status"] == "FAIL" for r in results)
    output = {
        "gate": 0, "status": "FAIL" if failed else "PASS" if remote_ok else "BLOCKED",
        "head": git("rev-parse", "HEAD"), "checks": results,
        "scope": "Project governance only; not application, chain, execution or sponsorship validation",
    }
    print(json.dumps(output, indent=2))
    return 1 if failed else 0 if remote_ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
