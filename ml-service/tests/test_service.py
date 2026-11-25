import json

import pytest
from fastapi.testclient import TestClient

from app import app, to_score

FEATURES = [f"V{i}" for i in range(1, 29)] + ["Amount"]
VALID = {name: 0.0 for name in FEATURES}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:   # using "with" runs the start-up code that loads the model
        yield c


class TestToScore:
    def test_the_threshold_maps_to_one_half(self):
        assert to_score(0.65, 0.65) == pytest.approx(0.5)

    def test_ends_of_the_range(self):
        assert to_score(0.0, 0.65) == 0.0
        assert to_score(1.0, 0.65) == pytest.approx(1.0)

    def test_score_never_decreases_as_probability_grows(self):
        scores = [to_score(p, 0.65) for p in (0.0, 0.1, 0.3, 0.65, 0.8, 0.95, 1.0)]
        assert scores == sorted(scores)

    def test_degenerate_thresholds_do_not_break_it(self):
        for threshold in (0.0, 1.0):
            assert 0.0 <= to_score(0.5, threshold) <= 1.0


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_predict_returns_probability_and_score(client):
    response = client.post("/predict", json={"features": VALID})
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"fraud_probability", "score", "threshold", "model_version"}
    assert 0.0 <= body["fraud_probability"] <= 1.0
    assert 0.0 <= body["score"] <= 1.0


def test_unknown_extra_features_are_ignored(client):
    response = client.post("/predict", json={"features": {**VALID, "Time": 12345.0}})
    assert response.status_code == 200


def test_a_missing_feature_is_rejected(client):
    features = {k: v for k, v in VALID.items() if k != "V7"}
    response = client.post("/predict", json={"features": features})
    assert response.status_code == 422
    assert "V7" in response.text


def test_a_non_finite_number_is_rejected(client):
    body = json.dumps({"features": {**VALID, "V1": float("nan")}})
    response = client.post("/predict", content=body, headers={"Content-Type": "application/json"})
    assert response.status_code == 422
