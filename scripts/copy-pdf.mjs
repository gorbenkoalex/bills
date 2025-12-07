import { copyFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

const distDir = path.join('dist');
const files = ['pdf.min.js', 'pdf.worker.min.js'];
const candidates = [
  path.join('node_modules', 'pdfjs-dist', 'build'),
  path.join('node_modules', 'pdfjs-dist', 'legacy', 'build'),
];

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

const foundBase = candidates.find((base) => files.every((f) => existsSync(path.join(base, f))));

if (foundBase) {
  for (const file of files) {
    const source = path.join(foundBase, file);
    const dest = path.join(distDir, file);
    copyFileSync(source, dest);
    console.log(`copied ${file} from ${foundBase}`);
  }
} else {
  console.warn(
    'pdf.js assets not found. Run "npm install" to download pdfjs-dist or place pdf.min.js/pdf.worker.min.js into dist/ manually.'
  );
}
