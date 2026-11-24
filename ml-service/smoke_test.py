"""Send a few real rows from the dataset to the running service."""
import json
import time
import urllib.request
from pathlib import Path

import pandas as pd

URL = "http://127.0.0.1:8000/predict"
FEATURES = [f"V{i}" for i in range(1, 29)] + ["Amount"]
df = pd.read_csv(Path(__file__).parent / "data" / "creditcard.csv")


def ask(row):
    body = json.dumps({"features": {f: float(row[f]) for f in FEATURES}}).encode()
    req = urllib.request.Request(URL, data=body, headers={"Content-Type": "application/json"})
    start = time.perf_counter()
    with urllib.request.urlopen(req) as resp:
        result = json.load(resp)
    result["ms"] = round((time.perf_counter() - start) * 1000, 1)
    return result


for label, subset in [("FRAUD ", df[df.Class == 1]), ("NORMAL", df[df.Class == 0])]:
    for _, row in subset.sample(5, random_state=1).iterrows():
        r = ask(row)
        print(label, f"prob={r['fraud_probability']:<9} score={r['score']:<7} {r['ms']} ms")
