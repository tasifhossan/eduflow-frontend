import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const SCAN_DIRS = [
  path.resolve(ROOT_DIR, 'app'),
  path.resolve(ROOT_DIR, 'components'),
];

// Target regexes for hardcoded currency symbols/codes and raw toLocale* methods
const PATTERNS: { name: string; regex: RegExp }[] = [
  { name: 'BDT', regex: /['"`]BDT['"`]/g },
  { name: 'Tk', regex: /['"`]Tk['"`]/g },
  { name: '৳', regex: /৳/g },
  { name: 'toLocaleDateString', regex: /\.toLocaleDateString\b/g },
  { name: 'toLocaleTimeString', regex: /\.toLocaleTimeString\b/g },
  { name: 'toLocaleString', regex: /\.toLocaleString\b/g },
];

interface FileHit {
  relativePath: string;
  counts: Record<string, number>;
  total: number;
}

function scanDirectory(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        scanDirectory(fullPath, fileList);
      }
    } else if (entry.isFile() && /\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

console.log('='.repeat(70));
console.log(' EduFlow Format & Currency Hardcoding Audit');
console.log('='.repeat(70));

const allFiles: string[] = [];
for (const dir of SCAN_DIRS) {
  scanDirectory(dir, allFiles);
}

const hits: FileHit[] = [];
let grandTotal = 0;
const patternTotals: Record<string, number> = {};

for (const p of PATTERNS) {
  patternTotals[p.name] = 0;
}

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const fileCounts: Record<string, number> = {};
  let fileTotal = 0;

  for (const p of PATTERNS) {
    const matches = content.match(p.regex);
    const count = matches ? matches.length : 0;
    fileCounts[p.name] = count;
    patternTotals[p.name] += count;
    fileTotal += count;
  }

  if (fileTotal > 0) {
    const relativePath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');
    hits.push({
      relativePath,
      counts: fileCounts,
      total: fileTotal,
    });
    grandTotal += fileTotal;
  }
}

// Print results table
if (hits.length === 0) {
  console.log('No hardcoded currency or toLocale* calls found.');
} else {
  console.log(`Found ${hits.length} file(s) with formatting baseline hits:\n`);
  for (const hit of hits) {
    const details = Object.entries(hit.counts)
      .filter(([, c]) => c > 0)
      .map(([k, c]) => `${k}: ${c}`)
      .join(', ');
    console.log(`  ${hit.relativePath.padEnd(55)} (${hit.total} hits) -> [${details}]`);
  }
}

console.log('\n' + '-'.repeat(70));
console.log('Summary Breakdown:');
for (const [name, count] of Object.entries(patternTotals)) {
  console.log(`  ${name.padEnd(25)}: ${count}`);
}
console.log('='.repeat(70));
console.log(`Total Baseline Hits: ${grandTotal}`);
console.log('='.repeat(70));
