import fs from 'node:fs';
import path from 'node:path';

// Regex for raw Tailwind color palette classes:
// (bg|text|border|ring|from|to|via|divide|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-NNN
const TAILWIND_COLOR_REGEX =
  /\b(?:bg|text|border|ring|from|to|via|divide|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;

// Regex for hex literals inside className or style attributes:
// Matches #[0-9a-fA-F]{3,8} inside className or style strings
const HEX_IN_CLASSNAME_OR_STYLE_REGEX =
  /(?:className\s*=\s*["'`][^"'`]*?|style\s*=\s*\{[^}]*?)(#[0-9A-Fa-f]{3,8})/g;

interface FileHit {
  filePath: string;
  relativePath: string;
  tailwindHits: string[];
  hexHits: string[];
  totalHits: number;
  isConverted: boolean;
  isProtectedRest: boolean;
}

const ROOT_DIR = process.cwd();
const APP_DIR = path.resolve(ROOT_DIR, 'app');
const COMPONENTS_DIR = path.resolve(ROOT_DIR, 'components');

// Converted files list (must have 0 hits, exits non-zero if any hit is found)
const CONVERTED_PATTERNS = [
  path.normalize('app/(protected)/layout.tsx'),
  path.normalize('components/dashboard/'),
  path.normalize('app/(protected)/dashboard/page.tsx'),
  path.normalize('app/(protected)/notices/page.tsx'),
];

function isConvertedFile(relPath: string): boolean {
  const normalized = path.normalize(relPath).replace(/\\/g, '/');
  return CONVERTED_PATTERNS.some((p) => {
    const normP = p.replace(/\\/g, '/');
    return normP.endsWith('/') ? normalized.startsWith(normP) : normalized === normP;
  });
}

function isProtectedRestFile(relPath: string): boolean {
  const normalized = path.normalize(relPath).replace(/\\/g, '/');
  return (
    normalized.startsWith('app/(protected)/') &&
    !isConvertedFile(relPath)
  );
}

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        getAllFiles(fullPath, fileList);
      }
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allFiles = [...getAllFiles(APP_DIR), ...getAllFiles(COMPONENTS_DIR)];

const results: FileHit[] = [];
let totalConvertedHits = 0;
let totalProtectedRestHits = 0;
let grandTotalHits = 0;

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');

  // Match raw Tailwind classes
  const twMatches = content.match(TAILWIND_COLOR_REGEX) || [];

  // Match hex literals in className or style
  const hexMatches: string[] = [];
  let m: RegExpExecArray | null;
  const hexRegex = new RegExp(HEX_IN_CLASSNAME_OR_STYLE_REGEX.source, 'g');
  while ((m = hexRegex.exec(content)) !== null) {
    if (m[1]) hexMatches.push(m[1]);
  }

  const totalHits = twMatches.length + hexMatches.length;
  if (totalHits > 0) {
    const isConverted = isConvertedFile(relativePath);
    const isProtectedRest = isProtectedRestFile(relativePath);

    results.push({
      filePath,
      relativePath,
      tailwindHits: twMatches,
      hexHits: hexMatches,
      totalHits,
      isConverted,
      isProtectedRest,
    });

    if (isConverted) {
      totalConvertedHits += totalHits;
    }
    if (isProtectedRest) {
      totalProtectedRestHits += totalHits;
    }
    grandTotalHits += totalHits;
  }
}

console.log('='.repeat(75));
console.log('   EduFlow Color Guard: Raw Tailwind & Hex Literal Scanner');
console.log('='.repeat(75));

// 1. Converted list status
console.log('\n[CONVERTED TARGETS CHECK]');
const convertedHits = results.filter((r) => r.isConverted);
if (convertedHits.length === 0) {
  console.log('  ✓ ALL converted files are 100% CLEAN (0 raw color hits)!');
} else {
  console.error(`  ✗ FAIL: Found ${totalConvertedHits} raw color hits in converted files:`);
  for (const hit of convertedHits) {
    console.error(`    - ${hit.relativePath}: ${hit.totalHits} hit(s)`);
    if (hit.tailwindHits.length > 0) {
      console.error(`      Tailwind: ${hit.tailwindHits.slice(0, 5).join(', ')}${hit.tailwindHits.length > 5 ? '...' : ''}`);
    }
    if (hit.hexHits.length > 0) {
      console.error(`      Hex: ${hit.hexHits.slice(0, 5).join(', ')}`);
    }
  }
}

// 2. Protected Rest baseline
console.log('\n[PROTECTED PAGES BASELINE (UNCONVERTED)]');
const protectedRestHits = results.filter((r) => r.isProtectedRest);
console.log(`  Total unconverted app/(protected) files with hits: ${protectedRestHits.length}`);
console.log(`  Total baseline hits across unconverted protected pages: ${totalProtectedRestHits}`);
for (const hit of protectedRestHits) {
  console.log(`    · ${hit.relativePath.padEnd(50)} ${hit.totalHits} hit(s)`);
}

// 3. Grand Total
console.log('\n' + '-'.repeat(75));
console.log(`GRAND TOTAL: ${grandTotalHits} raw color/hex hit(s) across entire app/ & components/`);
console.log('='.repeat(75) + '\n');

if (totalConvertedHits > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
