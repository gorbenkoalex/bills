import os
from datetime import datetime
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
from prepare_dataset import build_dataset, load_samples, FEATURE_NAMES

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'line_classifier.onnx')
LABEL_ORDER = ['ITEM', 'OTHER', 'TOTAL']


def train_and_export():
    samples = load_samples()
    X, y = build_dataset(samples)
    if not X:
        print('No data found in samples.jsonl. Add training samples first.')
        return

    X_array = np.array(X, dtype=np.float32)
    encoder = LabelEncoder()
    encoder.fit(LABEL_ORDER)
    y_array = encoder.transform(y)

    X_train, X_test, y_train, y_test = train_test_split(X_array, y_array, test_size=0.2, random_state=42)

    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)

    train_acc = clf.score(X_train, y_train)
    test_acc = clf.score(X_test, y_test)
    print(f"Train accuracy: {train_acc:.3f} | Test accuracy: {test_acc:.3f}")

    initial_type = [('input', FloatTensorType([None, len(FEATURE_NAMES)]))]
    onnx_model = convert_sklearn(
        clf,
        initial_types=initial_type,
        target_opset=17,
        options={"zipmap": False}
    )
    onnx_model.metadata_props.append({'key': 'trained_at', 'value': datetime.utcnow().isoformat()})
    onnx_model.metadata_props.append({'key': 'classes', 'value': ','.join(encoder.classes_)})

    os.makedirs(MODEL_DIR, exist_ok=True)
    with open(MODEL_PATH, 'wb') as f:
        f.write(onnx_model.SerializeToString())
    print(f"Saved model to {MODEL_PATH}")


if __name__ == '__main__':
    train_and_export()
