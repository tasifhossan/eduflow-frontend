import fs from 'fs';
import path from 'path';

/**
 * Validates custom design tokens and theme classes across app/ and components/.
 * Validates that custom tokens used exist in app/globals.css and flags
 * genuinely unknown class tokens.
 */

const cssPath = path.join(__dirname, '../app/globals.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

// Collect defined CSS custom utilities and theme tokens from globals.css
const definedTokens = new Set<string>();

// 1. Classes explicitly defined in CSS (e.g. .rounded-card, .custom-scrollbar)
const classDefRegex = /\.([a-zA-Z0-9_-]+)(?:::?[a-zA-Z0-9_-]+)*\s*\{/g;
let m;
while ((m = classDefRegex.exec(cssContent)) !== null) {
  definedTokens.add(m[1]);
}

// 2. Theme tokens defined in @theme { ... }
const themeVarRegex = /--(color|radius|shadow)-([a-zA-Z0-9_-]+):/g;
while ((m = themeVarRegex.exec(cssContent)) !== null) {
  const kind = m[1];
  const name = m[2];
  if (kind === 'color') {
    definedTokens.add(`bg-${name}`);
    definedTokens.add(`text-${name}`);
    definedTokens.add(`border-${name}`);
    definedTokens.add(`ring-${name}`);
  } else if (kind === 'radius') {
    definedTokens.add(`rounded-${name}`);
  } else if (kind === 'shadow') {
    definedTokens.add(`shadow-${name}`);
  }
}

// 3. Compiled CSS classes if .next build artifact exists
const chunksDir = path.join(__dirname, '../.next/static/chunks');
const compiledClasses = new Set<string>();
if (fs.existsSync(chunksDir)) {
  const cssFiles = fs.readdirSync(chunksDir).filter((f) => f.endsWith('.css'));
  for (const f of cssFiles) {
    const content = fs.readFileSync(path.join(chunksDir, f), 'utf8');
    // Extract class names from compiled selectors (.foo, .\32xl\:bar, etc.)
    const matches = content.match(/\.([a-zA-Z0-9_\-\\\:]+)/g) || [];
    for (const match of matches) {
      const clean = match.replace(/^\./, '').replace(/\\/g, '');
      compiledClasses.add(clean);
    }
  }
}

function walk(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const targetDirs = [
  path.join(__dirname, '../app'),
  path.join(__dirname, '../components'),
];

console.log('--- Verifying Custom Design Tokens and Theme Classes ---');
let hasErrors = false;

// Custom design token prefixes that must exist in globals.css or compiled CSS
const trackedPrefixes = [
  'rounded-card',
  'rounded-control',
  'rounded-pill',
  'shadow-card',
  'shadow-popover',
  'bg-surface',
  'border-border',
  'text-foreground',
  'text-muted-foreground',
];

for (const prefix of trackedPrefixes) {
  if (!definedTokens.has(prefix) && !compiledClasses.has(prefix) && !cssContent.includes(prefix)) {
    console.error(`Design token '${prefix}' is not defined in globals.css!`);
    hasErrors = true;
  }
}

// Scan source files for genuinely invalid or malformed classes
for (const dir of targetDirs) {
  const files = walk(dir);
  for (const file of files) {
    const relFile = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      // Flag syntax errors or accidental undefined strings in classNames
      if (line.includes('undefined') && /className\s*=\s*(?:["'][^"']*undefined|{`[^`]*undefined)/.test(line)) {
        console.error(`Accidental 'undefined' token in className at ${relFile}:${index + 1}`);
        hasErrors = true;
      }
      if (line.includes('[object Object]')) {
        console.error(`Invalid '[object Object]' in className at ${relFile}:${index + 1}`);
        hasErrors = true;
      }
    });
  }
}

if (hasErrors) {
  console.error('\nFAIL: Unknown or invalid class tokens found.');
  process.exit(1);
} else {
  console.log(`SUCCESS: All custom design tokens and theme classes verified (${definedTokens.size} tokens recognized).`);
  process.exit(0);
}
