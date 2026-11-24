"""Replay real dataset rows through the Fraudguard API (demo traffic simulator)."""
import argparse
import getpass
import json
import time
import urllib.error
import urllib.request
import uuid
from collections import Counter
from pathlib import Path

import pandas as pd

FEATURES = [f"V{i}" for i in range(1, 29)] + ["Amount"]
DATA = Path(__file__).parent / "data" / "creditcard.csv"


def call(method, url, token=None, body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    for key, value in (headers or {}).items():
        req.add_header(key, value)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.load(resp)
    except urllib.error.HTTPError as e:
        return e.code, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://127.0.0.1:8080")
    ap.add_argument("--user", default="sanjay")
    ap.add_argument("--password")
    ap.add_argument("--normal", type=int, default=200)
    ap.add_argument("--fraud", type=int, default=20)
    ap.add_argument("--accounts", type=int, default=40)
    ap.add_argument("--delay", type=float, default=0.4)
    args = ap.parse_args()
    password = args.password or getpass.getpass("Password: ")

    status, login = call("POST", f"{args.base}/api/auth/login",
                         body={"username": args.user, "password": password})
    if status != 200:
        raise SystemExit(f"Login failed (HTTP {status})")
    token = login["token"]

    # Make sure the simulation accounts exist
    _, existing = call("GET", f"{args.base}/api/accounts?page=0&size=100", token)
    ids = {a["accountNumber"]: a["id"] for a in (existing or [])}
    pool = []
    for i in range(1, args.accounts + 1):
        number = f"SIM{i:07d}"
        if number not in ids:
            status, created = call("POST", f"{args.base}/api/accounts", token, {
                "accountNumber": number, "holderName": f"Sim User {i}", "homeCountry": "IN"})
            if status != 201:
                raise SystemExit(f"Could not create account {number} (HTTP {status})")
            ids[number] = created["id"]
        pool.append(ids[number])

    # Real rows: fraud is over-sampled for the demo (real fraud is about 0.17%)
    df = pd.read_csv(DATA)
    rows = pd.concat([
        df[df.Class == 0].sample(args.normal, random_state=7),
        df[df.Class == 1].sample(args.fraud, random_state=7),
    ]).sample(frac=1, random_state=7)

    results = Counter()
    for n, (_, row) in enumerate(rows.iterrows()):
        idx = n % len(pool)
        body = {
            "accountId": pool[idx],
            "merchant": "Replay",
            "amount": max(round(float(row["Amount"]), 2), 0.01),
            "currency": "EUR",
            "country": "IN",
            "deviceId": f"sim-dev-{idx}",
            "features": {f: float(row[f]) for f in FEATURES},
        }
        status, res = call("POST", f"{args.base}/api/transactions", token, body,
                           {"Idempotency-Key": str(uuid.uuid4())})
        if status not in (200, 201):
            print(f"row {n}: HTTP {status}")
            continue
        results[("fraud" if row["Class"] == 1 else "normal", res["decision"])] += 1
        time.sleep(args.delay)

    print("\nActual class vs. decision")
    for cls in ("normal", "fraud"):
        counts = {d: results[(cls, d)] for d in ("APPROVE", "REVIEW", "BLOCK")}
        print(f"{cls:<8}{counts}")


if __name__ == "__main__":
    main()