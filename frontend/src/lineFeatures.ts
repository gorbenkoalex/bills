const currencyRegex = /[€$£¥₴₽₽₸₸₼₺₩₦₨₫₡₱₲₪₵₭₮₤]|\bkn\b|\bhrk\b|\brsd\b|\bbam\b|\bum\b/iu;
const pricePattern = /\d+[.,]\d{2}/g;

export const FEATURE_NAMES = [
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
] as const;

export type FeatureVector = number[];

export function extractLineFeatures(line: string): FeatureVector {
  const length = line.length;
  const digitCount = (line.match(/\d/g) || []).length;
  const alphaCount = (line.match(/[\p{L}]/gu) || []).length;
  const spaceCount = (line.match(/\s/g) || []).length;
  const digitRatio = length > 0 ? digitCount / length : 0;
  const alphaRatio = length > 0 ? alphaCount / length : 0;
  const hasX = /x/i.test(line) ? 1 : 0;
  const hasStar = line.includes('*') ? 1 : 0;
  const hasPercent = line.includes('%') ? 1 : 0;
  const hasCurrency = currencyRegex.test(line) ? 1 : 0;
  const priceLikeCount = length > 0 ? (line.match(pricePattern) || []).length : 0;

  return [
    length,
    digitCount,
    alphaCount,
    spaceCount,
    digitRatio,
    alphaRatio,
    hasX,
    hasStar,
    hasPercent,
    hasCurrency,
    priceLikeCount
  ];
}
