"""Fraud scoring service: loads the trained model and serves predictions over REST."""
import math
from contextlib import asynccontextmanager
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

MODEL_PATH = Path(__file__).parent / "models" / "fraud_model.joblib"
MODEL_VERSION = "xgb-1"

state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    bundle = joblib.load(MODEL_PATH)       # loaded once at start-up, not per request
    bundle["model"].set_params(n_jobs=1)   # single-row predictions don't need threads
    state.update(bundle)
    yield
    state.clear()


app = FastAPI(title="Fraudguard ML service", lifespan=lifespan)


class PredictRequest(BaseModel):
    features: dict[str, float]


class PredictResponse(BaseModel):
    fraud_probability: float
    score: float
    threshold: float
    model_version: str


def to_score(probability: float, threshold: float) -> float:
    """Rescale so that the model's own threshold maps to 0.5."""
    threshold = min(max(threshold, 1e-6), 1 - 1e-6)
    if probability < threshold:
        return 0.5 * probability / threshold
    return 0.5 + 0.5 * (probability - threshold) / (1 - threshold)


@app.get("/health")
def health():
    return {"status": "ok", "model_version": MODEL_VERSION}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    features = state["features"]
    missing = [f for f in features if f not in req.features]
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing features: {missing}")

    row = {f: req.features[f] for f in features}
    if not all(math.isfinite(v) for v in row.values()):
        raise HTTPException(status_code=422, detail="Features must be finite numbers")

    frame = pd.DataFrame([row], columns=features)
    probability = float(state["model"].predict_proba(frame)[:, 1][0])
    threshold = state["threshold"]

    return PredictResponse(
        fraud_probability=round(probability, 6),
        score=round(to_score(probability, threshold), 4),
        threshold=round(threshold, 4),
        model_version=MODEL_VERSION,
    )