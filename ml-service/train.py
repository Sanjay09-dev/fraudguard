"""Train a fraud model on the Kaggle credit card dataset and save it."""
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (average_precision_score, confusion_matrix,
                             precision_recall_curve, precision_score,
                             recall_score, roc_auc_score)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

ROOT = Path(__file__).parent
DATA = ROOT / "data" / "creditcard.csv"
MODELS = ROOT / "models"
SEED = 42

# "Time" is dropped: it is seconds since the dataset started, so it means nothing live.
FEATURES = [f"V{i}" for i in range(1, 29)] + ["Amount"]


def best_f1_threshold(y_true, proba):
    """Pick the probability cut-off that maximises F1 (on validation data only)."""
    precision, recall, thresholds = precision_recall_curve(y_true, proba)
    p, r = precision[:-1], recall[:-1]
    f1 = 2 * p * r / np.clip(p + r, 1e-12, None)
    return float(thresholds[np.argmax(f1)])


def evaluate(y_true, proba, threshold):
    pred = (proba >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, pred).ravel()
    return {
        "pr_auc": round(float(average_precision_score(y_true, proba)), 4),
        "roc_auc": round(float(roc_auc_score(y_true, proba)), 4),
        "threshold": round(float(threshold), 4),
        "precision": round(float(precision_score(y_true, pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_true, pred)), 4),
        "true_positives": int(tp),
        "false_positives": int(fp),
        "false_negatives": int(fn),
        "true_negatives": int(tn),
    }


def main():
    df = pd.read_csv(DATA)
    X, y = df[FEATURES], df["Class"]
    print(f"Rows: {len(df):,} | Fraud: {int(y.sum())} ({y.mean():.3%})")

    # 64% fit / 16% validation / 20% test, all keeping the same fraud ratio.
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=SEED)
    X_fit, X_val, y_fit, y_val = train_test_split(
        X_train, y_train, test_size=0.2, stratify=y_train, random_state=SEED)
    print(f"Fraud in test set: {int(y_test.sum())} of {len(y_test):,}")

    # --- Baseline: logistic regression with class weights -------------------
    baseline = make_pipeline(
        StandardScaler(),
        LogisticRegression(max_iter=1000, class_weight="balanced"))
    baseline.fit(X_fit, y_fit)
    base_thr = best_f1_threshold(y_val, baseline.predict_proba(X_val)[:, 1])
    base_metrics = evaluate(y_test, baseline.predict_proba(X_test)[:, 1], base_thr)

    # --- Main model: XGBoost -------------------------------------------------
    # Moderate weighting for the rare class (square root of the imbalance ratio).
    ratio = float((y_fit == 0).sum() / (y_fit == 1).sum())
    model = XGBClassifier(
        n_estimators=500,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=float(np.sqrt(ratio)),
        eval_metric="aucpr",
        early_stopping_rounds=30,
        tree_method="hist",
        n_jobs=-1,
        random_state=SEED,
    )
    model.fit(X_fit, y_fit, eval_set=[(X_val, y_val)], verbose=False)

    threshold = best_f1_threshold(y_val, model.predict_proba(X_val)[:, 1])
    xgb_metrics = evaluate(y_test, model.predict_proba(X_test)[:, 1], threshold)

    # --- Report ---------------------------------------------------------------
    print("\nResults on the held-out TEST set")
    print(f"{'model':<22}{'PR-AUC':>8}{'ROC-AUC':>9}{'precision':>11}{'recall':>8}")
    for name, m in [("logistic regression", base_metrics), ("xgboost", xgb_metrics)]:
        print(f"{name:<22}{m['pr_auc']:>8}{m['roc_auc']:>9}{m['precision']:>11}{m['recall']:>8}")
    print(f"\nXGBoost threshold: {threshold:.4f} | trees used: {model.best_iteration + 1}")
    print(f"XGBoost caught {xgb_metrics['true_positives']} fraud cases, "
          f"missed {xgb_metrics['false_negatives']}, "
          f"raised {xgb_metrics['false_positives']} false alarms")
    print("\nTop features:")
    print(pd.Series(model.feature_importances_, index=FEATURES).nlargest(5).round(3).to_string())

    # --- Save -------------------------------------------------------------------
    MODELS.mkdir(exist_ok=True)
    joblib.dump({"model": model, "features": FEATURES, "threshold": threshold},
                MODELS / "fraud_model.joblib")
    (MODELS / "metrics.json").write_text(json.dumps({
        "dataset": {"rows": len(df), "fraud": int(y.sum()), "test_fraud": int(y_test.sum())},
        "logistic_regression": base_metrics,
        "xgboost": xgb_metrics,
    }, indent=2))
    print(f"\nSaved model and metrics to {MODELS}")


if __name__ == "__main__":
    main()