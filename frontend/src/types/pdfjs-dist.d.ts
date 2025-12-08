declare module 'pdfjs-dist' {
  export interface PDFDocumentProxy {
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }

  export interface PDFPageProxy {
    getTextContent(): Promise<PDFTextContent>;
  }

  export interface PDFTextContent {
    items: Array<{ str: string }>;
  }

  export interface GetDocumentOptions {
    url?: string;
    data?: ArrayBuffer | Uint8Array;
    useWorkerFetch?: boolean;
    workerSrc?: string;
  }

  export function getDocument(options: string | GetDocumentOptions): { promise: Promise<PDFDocumentProxy> };

  export const GlobalWorkerOptions: {
    workerSrc?: string;
  };
}

declare module 'pdfjs-dist/legacy/build/pdf.mjs' {
  export * from 'pdfjs-dist';
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs?url' {
  const src: string;
  export default src;
}

declare module 'pdfjs-dist/legacy/build/pdf' {
  export * from 'pdfjs-dist/legacy/build/pdf.mjs';
}
