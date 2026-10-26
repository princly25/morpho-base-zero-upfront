"""Export the staged Git tree for the authorized GitHub connector, without secrets.

Run the documented scanner/diff review first. Exports live under ignored .local/.
This helper never signs, sends chain transactions, authenticates Git, or pushes.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXPORT = ROOT / ".local/connector-checkpoint.json"


def git(*args: str) -> bytes:
    return subprocess.check_output(["git", *args], cwd=ROOT)


def prepare() -> None:
    tree = git("write-tree").decode().strip()
    entries = []
    for line in git("ls-tree", "-rz", tree).split(b"\0"):
        if not line:
            continue
        meta, path = line.split(b"\t", 1)
        mode, kind, sha = meta.decode().split()
        if kind != "blob":
            raise SystemExit("Unsupported non-blob Git tree entry")
        entries.append({"path": path.decode(), "mode": mode, "sha": sha})
    request = "".join(e["sha"] + "\n" for e in entries).encode()
    data = subprocess.check_output(["git", "cat-file", "--batch"], cwd=ROOT, input=request)
    stream = io.BytesIO(data)
    for entry in entries:
        header = stream.readline().decode().split()
        blob = stream.read(int(header[2]))
        if stream.read(1) != b"\n" or header[0] != entry["sha"]:
            raise SystemExit("Invalid Git batch output")
        try:
            content = blob.decode("utf-8")
            if "\0" in content:
                raise UnicodeError("binary")
            entry["content"] = content
        except UnicodeError:
            entry["base64"] = base64.b64encode(blob).decode()
    result = {"tree": tree, "parent": git("rev-parse", "HEAD").decode().strip(), "entries": entries}
    EXPORT.parent.mkdir(exist_ok=True)
    EXPORT.write_text(json.dumps(result, ensure_ascii=True, separators=(",", ":")), encoding="utf-8")
    size = EXPORT.stat().st_size
    print(json.dumps({"tree": tree, "files": len(entries), "bytes": size, "chunks": (size + 65535) // 65536}))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=("prepare", "chunk", "script"))
    parser.add_argument("--index", type=int, default=0)
    args = parser.parse_args()
    if args.operation == "prepare":
        prepare()
    elif args.operation == "script":
        print((ROOT / "tools/connector-publish.js").read_text(encoding="utf-8"))
    else:
        with EXPORT.open("rb") as stream:
            stream.seek(args.index * 65536)
            chunk = stream.read(65536)
        print(base64.b64encode(chunk).decode())


if __name__ == "__main__":
    main()
