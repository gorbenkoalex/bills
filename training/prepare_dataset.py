import json
import os
import re
from typing import List, Tuple

SAMPLES_FILE = os.path.join(os.path.dirname(__file__), '..', 'server', 'data', 'samples.jsonl')
CURRENCY_PATTERN = re.compile(r"[€$£¥₴₽₸₼₺₩₦₨₫₡₱₲₪₵₭₮₤]|\\bkn\\b|\\bhrk\\b|\\brsd\\b|\\bbam\\b|\\bum\\b", re.IGNORECASE)
PRICE_PATTERN = re.compile(r"\d+[.,]\d{2}")
# Keep this list in sync with frontend/src/services/lineFeatures.ts
FEATURE_NAMES = [
    'length',
    'digitCount',
    'alphaCount',
    'spaceCount',
    'digitRatio',
    'alphaRatio',
    'hasX',
    'hasStar',
    'hasPercent',
    'hasCurrency',
    'priceLikeCount'
]


def extract_line_features(line: str) -> List[float]:
    length = len(line)
    digit_count = len(re.findall(r"\d", line))
    alpha_count = sum(1 for ch in line if ch.isalpha())
    space_count = len(re.findall(r"\s", line))
    digit_ratio = digit_count / length if length else 0.0
    alpha_ratio = alpha_count / length if length else 0.0
    # Align with frontend feature extraction (x or multiplication sign).
    has_x = 1 if re.search(r"x|×", line, re.IGNORECASE) else 0
    has_star = 1 if "*" in line else 0
    has_percent = 1 if "%" in line else 0
    has_currency = 1 if CURRENCY_PATTERN.search(line) else 0
    price_like_count = len(PRICE_PATTERN.findall(line)) if length else 0
    return [
        float(length),
        float(digit_count),
        float(alpha_count),
        float(space_count),
        float(digit_ratio),
        float(alpha_ratio),
        float(has_x),
        float(has_star),
        float(has_percent),
        float(has_currency),
        float(price_like_count),
    ]


def load_samples(path: str = SAMPLES_FILE) -> List[dict]:
    samples: List[dict] = []
    if not os.path.exists(path):
        return samples
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip():
                continue
            samples.append(json.loads(line))
    return samples


def build_dataset(samples: List[dict]) -> Tuple[List[List[float]], List[str]]:
    X: List[List[float]] = []
    y: List[str] = []
    for sample in samples:
        raw_text: str = sample.get('rawText', '')
        parsed_after = sample.get('parsedAfter', {})
        items = parsed_after.get('items', [])
        grand_total = parsed_after.get('grandTotal')

        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

        for line in lines:
            label = 'OTHER'
            # ITEM label if line matches an item description in parsedAfter
            for item in items:
                desc = (item.get('description') or '').strip()
                total = item.get('total')
                if desc and desc.lower() in line.lower():
                    label = 'ITEM'
                    break
                if total is not None and f"{total:.2f}" in line.replace(',', '.'):  # numeric fallback
                    label = 'ITEM'
                    break

            if label == 'OTHER' and grand_total is not None:
                if re.search(rf"{grand_total:.2f}".replace('.', r"[.,]"), line):
                    label = 'TOTAL'
            features = extract_line_features(line)
            X.append(features)
            y.append(label)
    return X, y


if __name__ == '__main__':
    samples = load_samples()
    X, y = build_dataset(samples)
    print(f"Loaded {len(samples)} samples, {len(X)} lines")
    if X:
        print(f"First row features: {X[0]}")
