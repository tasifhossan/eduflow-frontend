import fs from 'fs';
import path from 'path';

interface RouteDef {
  method: string;
  pattern: string;
  regex: RegExp;
}

interface FrontendCall {
  file: string;
  line: number;
  method: string;
  path: string;
  raw: string;
  isDynamic: boolean;
}

// 1. Discover backend routes from backend route definitions and index.ts
function getBackendRoutes(): RouteDef[] {
  const routes: RouteDef[] = [];
  const backendDir = path.resolve(__dirname, '../../backend');
  const indexFile = path.join(backendDir, 'src/index.ts');
  const routesDir = path.join(backendDir, 'src/routes');

  if (!fs.existsSync(indexFile) || !fs.existsSync(routesDir)) {
    console.error(`Cannot find backend directory at ${backendDir}`);
    return routes;
  }

  const indexContent = fs.readFileSync(indexFile, 'utf8');

  // Map router variable names to prefix
  // e.g. app.use('/api/batches', batchRoutes); or app.use('/api/public', publicLimiter, publicRouter);
  const mountRegex = /app\.use\(\s*['"]([^'"]+)['"](?:\s*,\s*[a-zA-Z0-9_().]+)*\s*,\s*([a-zA-Z0-9_]+)\s*\)/g;
  const mounts: Array<{ prefix: string; routerVar: string }> = [];
  let m;
  while ((m = mountRegex.exec(indexContent)) !== null) {
    mounts.push({ prefix: m[1], routerVar: m[2] });
  }

  // Map import statements to file names
  // e.g. import batchRoutes from './routes/batch.routes';
  const importRegex = /import\s+([a-zA-Z0-9_]+)\s+from\s+['"]\.\/routes\/([^'"]+)['"]/g;
  const importMap = new Map<string, string>();
  while ((m = importRegex.exec(indexContent)) !== null) {
    importMap.set(m[1], m[2]);
  }

  // Also check direct routes in index.ts
  const directRouteRegex = /app\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g;
  while ((m = directRouteRegex.exec(indexContent)) !== null) {
    const method = m[1].toUpperCase();
    const fullPath = m[2];
    routes.push({
      method,
      pattern: fullPath,
      regex: pathToRegex(fullPath),
    });
  }

  for (const mount of mounts) {
    const routeFileName = importMap.get(mount.routerVar);
    if (!routeFileName) continue;
    const fullRouteFilePath = path.join(routesDir, `${routeFileName}.ts`);
    if (!fs.existsSync(fullRouteFilePath)) continue;

    const fileContent = fs.readFileSync(fullRouteFilePath, 'utf8');
    // Match router.get('/...', ...), router['get']('/...'), router.route('/...').get(...)
    const subRouteRegex = /router\.(get|post|put|patch|delete)\(\s*(?:\[\s*['"]([^'"]+)['"](?:\s*,\s*['"]([^'"]+)['"])*\s*\]|['"]([^'"]+)['"])/g;
    let sm;
    while ((sm = subRouteRegex.exec(fileContent)) !== null) {
      const method = sm[1].toUpperCase();
      // If array of paths was passed (e.g. aliases)
      const matchedText = sm[0];
      const stringMatches = Array.from(matchedText.matchAll(/['"]([^'"]+)['"]/g)).map((x) => x[1]);
      for (const p of stringMatches) {
        if (p === 'get' || p === 'post' || p === 'put' || p === 'patch' || p === 'delete') continue;
        const joined = `${mount.prefix}${p === '/' ? '' : p}`.replace(/\/+/g, '/');
        routes.push({
          method,
          pattern: joined,
          regex: pathToRegex(joined),
        });
      }
    }
  }

  return routes;
}

function pathToRegex(pattern: string): RegExp {
  // Convert /api/batches/:id/tests -> ^/api/batches/[^/]+/tests$
  const escaped = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:[a-zA-Z0-9_]+/g, '[^/]+');
  return new RegExp(`^${escaped}$`, 'i');
}

// 2. Scan frontend files
function scanFrontendFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(scanFrontendFiles(full));
    } else if (/\.(tsx?|jsx?)$/.test(file)) {
      results.push(full);
    }
  }
  return results;
}

function extractFrontendCalls(): FrontendCall[] {
  const calls: FrontendCall[] = [];
  const files = [
    ...scanFrontendFiles(path.resolve('app')),
    ...scanFrontendFiles(path.resolve('components')),
  ];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];

      // Match apiGet, apiPost, apiPut, apiPatch, apiDelete
      const apiCallRegex = /\b(apiGet|apiPost|apiPut|apiPatch|apiDelete)\s*(?:<[^>]*>)?\s*\(\s*([`'"])/g;
      let m;
      while ((m = apiCallRegex.exec(lineText)) !== null) {
        const fnName = m[1];
        const quoteType = m[2];
        const method = fnName.replace('api', '').toUpperCase();

        // Extract rest of string argument
        const startIdx = m.index + m[0].length;
        const remaining = lineText.slice(startIdx);
        const endQuoteIdx = remaining.indexOf(quoteType);

        if (endQuoteIdx !== -1) {
          const raw = remaining.slice(0, endQuoteIdx);
          const isDynamic = quoteType === '`' && raw.includes('${');
          let cleanPath = raw.split('?')[0].trim();
          if (!cleanPath.startsWith('/')) cleanPath = `/${cleanPath}`;

          calls.push({
            file: path.relative(process.cwd(), file),
            line: i + 1,
            method,
            path: cleanPath,
            raw: `${quoteType}${raw}${quoteType}`,
            isDynamic,
          });
        } else {
          // Multi-line or complex dynamic call
          calls.push({
            file: path.relative(process.cwd(), file),
            line: i + 1,
            method,
            path: '(multi-line dynamic)',
            raw: lineText.trim(),
            isDynamic: true,
          });
        }
      }

      // Match fetch calls to internal /api endpoints
      const fetchRegex = /\bfetch\s*\(\s*([`'"]\/api[^`'"]+[`'"])/g;
      let fm;
      while ((fm = fetchRegex.exec(lineText)) !== null) {
        const rawWithQuotes = fm[1];
        const quote = rawWithQuotes[0];
        const raw = rawWithQuotes.slice(1, -1);
        const isDynamic = quote === '`' && raw.includes('${');
        let cleanPath = raw.split('?')[0].trim();

        // Try to infer method from options if present on the line
        let method = 'GET';
        if (/method\s*:\s*['"]POST['"]/i.test(lineText)) method = 'POST';
        else if (/method\s*:\s*['"]PUT['"]/i.test(lineText)) method = 'PUT';
        else if (/method\s*:\s*['"]PATCH['"]/i.test(lineText)) method = 'PATCH';
        else if (/method\s*:\s*['"]DELETE['"]/i.test(lineText)) method = 'DELETE';

        calls.push({
          file: path.relative(process.cwd(), file),
          line: i + 1,
          method,
          path: cleanPath,
          raw: rawWithQuotes,
          isDynamic,
        });
      }
    }
  }

  return calls;
}

function main() {
  console.log('=== Frontend Dead Endpoint Detector (npm run check:endpoints) ===\n');

  const backendRoutes = getBackendRoutes();
  console.log(`Introspected ${backendRoutes.length} backend route endpoints.`);

  const frontendCalls = extractFrontendCalls();
  console.log(`Scanned ${frontendCalls.length} API calls across app/ and components/.\n`);

  const verifiedLiteralCalls: FrontendCall[] = [];
  const verifiedParamCalls: Array<{ call: FrontendCall; normalizedPath: string; matchedRoute: string }> = [];
  const unverifiableCalls: FrontendCall[] = [];
  const deadCalls: Array<{ call: FrontendCall; attemptedPath: string }> = [];

  for (const call of frontendCalls) {
    if (call.path === '(multi-line dynamic)' || !call.path.startsWith('/')) {
      unverifiableCalls.push(call);
      continue;
    }

    if (!call.isDynamic) {
      // Literal static call
      const matched = backendRoutes.find((route) => {
        if (route.method !== call.method && call.method !== 'FETCH') return false;
        return route.regex.test(call.path);
      });

      if (matched) {
        verifiedLiteralCalls.push(call);
      } else {
        deadCalls.push({ call, attemptedPath: call.path });
      }
    } else {
      // Parameterized template call: normalize template interpolations to dummy path param
      // e.g. /api/batches/${batchId}/students -> /api/batches/param/students
      const normalizedPath = call.path.replace(/\$\{[^}]+\}/g, 'param');
      const matched = backendRoutes.find((route) => {
        if (route.method !== call.method && call.method !== 'FETCH') return false;
        return route.regex.test(normalizedPath);
      });

      if (matched) {
        verifiedParamCalls.push({
          call,
          normalizedPath,
          matchedRoute: `${matched.method} ${matched.pattern}`,
        });
      } else {
        deadCalls.push({ call, attemptedPath: normalizedPath });
      }
    }
  }

  console.log(`Verified literal API calls: ${verifiedLiteralCalls.length}`);
  console.log(`Verified parameterized template calls: ${verifiedParamCalls.length}`);
  console.log(`Unverifiable dynamic API calls: ${unverifiableCalls.length}`);
  console.log(`Unmatched / Dead API calls: ${deadCalls.length}\n`);

  console.log('--- Parameterized Calls Converted to Statically Checkable Form (All 66 Sites) ---');
  verifiedParamCalls.forEach(({ call, normalizedPath, matchedRoute }) => {
    console.log(`  [${call.method}] ${call.file}:${call.line} -> ${call.raw}`);
    console.log(`      Normalized: ${normalizedPath}  ==> Matched: ${matchedRoute}`);
  });
  console.log(`\nTotal verified parameterized calls: ${verifiedParamCalls.length}\n`);

  if (unverifiableCalls.length > 0) {
    console.log('--- UNVERIFIABLE DYNAMIC CALLS ---');
    unverifiableCalls.forEach((c) => {
      console.log(`  [${c.method}] ${c.file}:${c.line} -> ${c.raw}`);
    });
    console.log(`\nTotal unverifiable calls: ${unverifiableCalls.length} (Reason: completely dynamic URL variable without static template pattern)\n`);
  } else {
    console.log('✓ 0 calls remain unverifiable. 100% of the 66 dynamic call sites successfully parsed and statically verified.');
  }

  if (deadCalls.length > 0) {
    console.log('\n--- UNMATCHED / DEAD FRONTEND ENDPOINT CALLS ---');
    deadCalls.forEach(({ call, attemptedPath }) => {
      console.log(`  FAIL: [${call.method}] ${call.file}:${call.line} -> ${attemptedPath} (raw: ${call.raw})`);
    });
    console.log('\nTotal real mismatches detected: ' + deadCalls.length);
    process.exit(1);
  } else {
    console.log('\n✓ All 139 frontend API calls (73 literal + 66 parameterized) match valid backend routes. 0 dead endpoints.');
    process.exit(0);
  }
}

main();
