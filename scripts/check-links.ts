import fs from 'node:fs';
import path from 'node:path';

// 1. Gather all hrefs from site-config.ts
const siteConfigPath = path.resolve(process.cwd(), 'lib/site-config.ts');
const siteConfigContent = fs.readFileSync(siteConfigPath, 'utf8');

// Match all href: '...' or href: "..."
const hrefRegex = /href:\s*['"]([^'"]+)['"]/g;
const linksSet = new Set<string>();
let match: RegExpExecArray | null;

while ((match = hrefRegex.exec(siteConfigContent)) !== null) {
  const url = match[1];
  // Only internal links starting with /
  if (url.startsWith('/')) {
    // Strip hash or query parameter
    const cleanUrl = url.split('#')[0].split('?')[0];
    linksSet.add(cleanUrl);
  }
}

// Add auth links referenced in navbar/footer/mobile menu
linksSet.add('/login');
linksSet.add('/register');

// 2. Scan app/ directory for all route pages
const appDir = path.resolve(process.cwd(), 'app');
const routes = new Set<string>();

function scanDirectory(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && /^page\.(tsx|jsx|js|ts)$/.test(entry.name)) {
      // Convert filesystem path to route
      const relative = path.relative(appDir, dir).replace(/\\/g, '/');

      // Remove route groups like (public), (auth), etc.
      const routeSegments = relative
        .split('/')
        .filter((segment) => segment && !segment.startsWith('(') && !segment.endsWith(')'));

      const route = '/' + routeSegments.join('/');
      routes.add(route === '//' ? '/' : route);
    }
  }
}

scanDirectory(appDir);

// 3. Match links against routes
const sortedLinks = Array.from(linksSet).sort();
console.log('='.repeat(70));
console.log(' EduFlow Link Inventory Check');
console.log('='.repeat(70));
console.log(`Discovered ${routes.size} app route(s):`);
for (const r of Array.from(routes).sort()) {
  console.log(`  [PAGE] ${r}`);
}
console.log('-'.repeat(70));

const existing: string[] = [];
const missing: string[] = [];

for (const link of sortedLinks) {
  // Check exact match or dynamic route match
  let found = routes.has(link);

  if (!found) {
    // Check if link matches a dynamic route pattern e.g. /dashboard/batches/1 -> /dashboard/batches/[id]
    for (const r of routes) {
      const regexPattern = '^' + r.replace(/\[[^\]]+\]/g, '[^/]+') + '$';
      if (new RegExp(regexPattern).test(link)) {
        found = true;
        break;
      }
    }
  }

  if (found) {
    existing.push(link);
    console.log(`  ✓ FOUND:    ${link}`);
  } else {
    missing.push(link);
    console.log(`  ✗ MISSING:  ${link}  (Expected: will be implemented in later blocks)`);
  }
}

console.log('='.repeat(70));
console.log(`Summary: ${existing.length} routes found, ${missing.length} routes pending.`);
console.log('='.repeat(70));
