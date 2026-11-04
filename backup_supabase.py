"""Back up every Supabase (public schema) table into one Excel workbook.

Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env (or the environment).
Output: backups/supabase_backup_<timestamp>.xlsx  (git-ignored; contains real data)
"""
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

import requests
from openpyxl import Workbook

ROOT = Path(__file__).resolve().parent
PAGE = 1000


def load_env():
    for path in (ROOT / ".env", ROOT / "server" / ".env"):
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def discover_tables(base, headers):
    resp = requests.get(f"{base}/rest/v1/", headers=headers, timeout=60)
    if resp.ok:
        try:
            spec = resp.json()
            names = [p.strip("/") for p in spec.get("paths", {}) if p != "/" and not p.startswith("/rpc/")]
            if names:
                return sorted(names)
        except ValueError:
            pass
    names = set()
    for f in (ROOT / "src").rglob("*"):
        if f.suffix in {".ts", ".tsx", ".js", ".jsx"}:
            names.update(re.findall(r"\.from\(\s*[\"']([\w]+)[\"']", f.read_text(encoding="utf-8", errors="ignore")))
    return sorted(names)


def fetch_all(base, headers, table):
    rows, offset = [], 0
    while True:
        resp = requests.get(
            f"{base}/rest/v1/{table}",
            headers={**headers, "Range-Unit": "items", "Range": f"{offset}-{offset + PAGE - 1}"},
            params={"select": "*"},
            timeout=120,
        )
        resp.raise_for_status()
        batch = resp.json()
        rows.extend(batch)
        if len(batch) < PAGE:
            return rows
        offset += PAGE


def cell(value):
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False)
    if isinstance(value, str):
        value = "".join(ch for ch in value if ch in "\n\t" or ord(ch) >= 32)
        return value[:32000]
    return value


def main():
    load_env()
    base = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")
    if not base or not key:
        sys.exit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
    if not os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
        print("WARNING: no service-role key; row-level security may hide data.")
    base = base.rstrip("/")
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}

    tables = discover_tables(base, headers)
    print(f"Found {len(tables)} tables")

    wb = Workbook()
    summary = wb.active
    summary.title = "Summary"
    summary.append(["Table", "Rows", "Status"])

    used = {"Summary"}
    for table in tables:
        try:
            rows = fetch_all(base, headers, table)
            status = "OK"
        except Exception as exc:
            rows, status = [], f"ERROR: {exc}"[:200]
        name = re.sub(r"[\[\]:*?/\\]", "_", table)[:31]
        while name in used:
            name = name[:28] + "_" + str(len(used))
        used.add(name)
        ws = wb.create_sheet(name)
        columns = list(dict.fromkeys(k for r in rows for k in r))
        ws.append(columns)
        for r in rows:
            ws.append([cell(r.get(c)) for c in columns])
        ws.freeze_panes = "A2"
        summary.append([table, len(rows), status])
        print(f"  {table}: {len(rows)} rows [{status}]")

    out_dir = ROOT / "backups"
    out_dir.mkdir(exist_ok=True)
    out = out_dir / f"supabase_backup_{datetime.now():%Y%m%d_%H%M%S}.xlsx"
    wb.save(out)
    print(f"Saved: {out}")


if __name__ == "__main__":
    main()
