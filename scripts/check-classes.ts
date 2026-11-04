import fs from 'fs';
import path from 'path';

const customTokenPatterns = [
  'rounded-card',
  'rounded-control',
  'rounded-pill',
  'shadow-card',
  'shadow-popover',
  'bg-surface',
  'bg-surface-hover',
  'bg-surface-sunken',
  'border-border',
  'text-foreground',
  'text-muted-foreground',
  'text-primary',
  'bg-primary',
  'bg-status-success-bg',
  'text-status-success-text',
  'border-status-success-border',
  'bg-status-danger-bg',
  'text-status-danger-text',
  'border-status-danger-border',
  'bg-status-warning-bg',
  'text-status-warning-text',
  'border-status-warning-border',
];

const cssPath = path.join(__dirname, '../app/globals.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

function walk(dir: string, fileList: string[] = []): string[] {
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

let hasErrors = false;
console.log('--- Verifying Custom Design Tokens and Theme Classes ---');

for (const dir of targetDirs) {
  const files = walk(dir);
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      // Find any invalid utility or custom class like backdrop-blur-xs or focus:outline-hidden
      if (line.includes('backdrop-blur-xs')) {
        console.error(`Invalid class 'backdrop-blur-xs' at ${file}:${index + 1}. Should be backdrop-blur-sm or backdrop-blur-[2px].`);
        hasErrors = true;
      }
      if (line.includes('focus:outline-hidden')) {
        console.error(`Invalid class 'focus:outline-hidden' at ${file}:${index + 1}. Should be focus:outline-none.`);
        hasErrors = true;
      }
    });
  }
}

if (hasErrors) {
  console.error('\nFAIL: Unknown or invalid class tokens found.');
  process.exit(1);
} else {
  console.log('SUCCESS: All extracted tokens resolve to valid Tailwind / CSS definitions.');
  process.exit(0);
}

