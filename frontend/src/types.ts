export type LineClass = 'ITEM' | 'TOTAL' | 'OTHER';

export interface ParsedItem {
  description: string;
  quantity?: number;
  price?: number;
  total?: number;
}

export interface ParsedReceipt {
  storeName?: string;
  purchaseDate?: string;
  grandTotal?: number;
  items: ParsedItem[];
  rawText: string;
}

export interface RawReceiptInput {
  rawText: string;
  lines: string[];
  source: {
    fileName?: string;
    mimeType?: string;
    uploadedAt?: string;
  };
  structure?: {
    page?: number;
    linePositions?: Array<{ text: string; x: number; y: number; width?: number; height?: number }>;
  };
}

export interface ModelRunMetadata {
  modelId: 'live' | 'local';
  modelPath: string;
  modelVersion?: string;
  modeUsed: ModelMode;
  runAt: string;
  notes?: string;
}

export interface ModelRunResult {
  parsed: ParsedReceipt;
  lineClasses: LineClass[];
  metadata: ModelRunMetadata;
}

export interface TrainingSample {
  rawInput: RawReceiptInput;
  modelOutput: ModelRunResult;
  alternativeOutputs?: Partial<Record<'live' | 'local', ModelRunResult>>;
  userCorrected: ParsedReceipt;
  modelMetadata: ModelRunMetadata;
  sourceInfo: RawReceiptInput['source'] & { wasEdited: boolean };
  createdAt: string;
}

export type ModelMode = 'live' | 'local' | 'ensemble';
