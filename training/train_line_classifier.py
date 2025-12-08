import os
from typing import Optional

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

from training.prepare_dataset import build_dataset, ensure_minimum_dataset, load_samples

LIVE_MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', 'models', 'receipt_parser_live.onnx')
LOCAL_MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', 'models', 'receipt_parser_local.onnx')


def train_model(X, y):
    clf = RandomForestClassifier(n_estimators=80, max_depth=None, random_state=42)
    clf.fit(X, y)
    return clf


def export_model(clf, path: str, input_dim: int):
    initial_type = [('input', FloatTensorType([None, input_dim]))]
    onnx_model = convert_sklearn(clf, initial_types=initial_type, target_opset=15)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(onnx_model.SerializeToString())
    return path


def main(samples_path: Optional[str] = None):
    samples = load_samples(samples_path or os.path.join(os.path.dirname(__file__), '..', 'server', 'data', 'samples.jsonl'))
    X, y = build_dataset(samples)
    X, y = ensure_minimum_dataset(X, y)

    X_arr = np.array(X, dtype=np.float32)
    y_arr = np.array(y)
    X_train, X_test, y_train, y_test = train_test_split(X_arr, y_arr, test_size=0.25, random_state=42)

    clf = train_model(X_train, y_train)

    train_pred = clf.predict(X_train)
    test_pred = clf.predict(X_test)
    print(f"Train accuracy: {accuracy_score(y_train, train_pred):.3f}")
    print(f"Test accuracy: {accuracy_score(y_test, test_pred):.3f}")

    live_path = export_model(clf, LIVE_MODEL_PATH, X_train.shape[1])
    print(f"Exported live model to {live_path}")
    local_path = export_model(clf, LOCAL_MODEL_PATH, X_train.shape[1])
    print(f"Exported local model to {local_path}")


if __name__ == '__main__':
    main()
