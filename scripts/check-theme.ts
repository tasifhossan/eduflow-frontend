import { isValidHex, sanitizeHex, generateThemeCss, DEFAULT_PRIMARY } from '../lib/theme';

console.log('======================================================================');
console.log('   EduFlow Theme Hardening & Hostile Input Validation Check');
console.log('======================================================================\n');

interface TestCase {
  name: string;
  input: string | null | undefined;
  expectValid: boolean;
}

const testCases: TestCase[] = [
  // Hostile / Malicious inputs
  { name: 'CSS Injection / Style breaker', input: 'red;}body{display:none', expectValid: false },
  { name: 'Short invalid hex', input: '#12345', expectValid: false },
  { name: 'URL expression', input: 'url(https://malicious.site/leak.css)', expectValid: false },
  { name: 'CSS expression / script injection', input: 'expression(alert(1))', expectValid: false },
  { name: 'Trailing CSS rule breakout', input: '#ffffff; background: red;', expectValid: false },
  { name: 'Named CSS color', input: 'blue', expectValid: false },
  { name: 'RGB syntax', input: 'rgb(14, 165, 233)', expectValid: false },
  { name: 'HSL syntax', input: 'hsl(199, 89%, 48%)', expectValid: false },
  { name: 'Too long 8-digit hex (RGBA)', input: '#0ea5e9ff', expectValid: false },
  { name: 'Non-hex characters', input: '#ZZZZZZ', expectValid: false },
  { name: 'Empty string', input: '', expectValid: false },
  { name: 'Whitespace only', input: '   ', expectValid: false },
  { name: 'Null input', input: null, expectValid: false },
  { name: 'Undefined input', input: undefined, expectValid: false },

  // Valid inputs
  { name: 'Default Brand Sky Blue', input: '#0ea5e9', expectValid: true },
  { name: 'Uppercase Hex', input: '#3B82F6', expectValid: true },
  { name: 'Emerald Green', input: '#10B981', expectValid: true },
  { name: 'Pure White Hex', input: '#ffffff', expectValid: true },
  { name: 'Pure Black Hex', input: '#000000', expectValid: true },
];

let failedCount = 0;

const defaultCss = generateThemeCss(DEFAULT_PRIMARY);

for (const tc of testCases) {
  const valid = isValidHex(tc.input);
  const sanitized = sanitizeHex(tc.input);
  const css = generateThemeCss(tc.input);

  let passed = true;
  let reason = '';

  if (valid !== tc.expectValid) {
    passed = false;
    reason = `Expected isValidHex to return ${tc.expectValid}, got ${valid}`;
  } else if (!tc.expectValid) {
    // Hostile input must fall back to DEFAULT_PRIMARY
    if (sanitized !== DEFAULT_PRIMARY) {
      passed = false;
      reason = `Expected sanitizeHex fallback ${DEFAULT_PRIMARY}, got ${sanitized}`;
    }
    // Hostile string must never appear in generated CSS
    if (typeof tc.input === 'string' && tc.input.trim().length > 0 && css.includes(tc.input)) {
      passed = false;
      reason = `Hostile input was reflected directly into generated CSS!`;
    }
    // Generated CSS must strictly match default palette CSS
    if (css !== defaultCss) {
      passed = false;
      reason = `Generated CSS does not match fallback default palette CSS`;
    }
  } else {
    // Valid input: sanitized must match lowercase trimmed
    const expected = (tc.input as string).trim().toLowerCase();
    if (sanitized !== expected) {
      passed = false;
      reason = `Expected sanitizeHex ${expected}, got ${sanitized}`;
    }
  }

  const statusStr = passed ? 'PASS' : 'FAIL';
  console.log(`[${statusStr}] ${tc.name.padEnd(40)} | Input: ${JSON.stringify(tc.input)}`);
  if (!passed) {
    console.error(`       Error: ${reason}`);
    failedCount++;
  }
}

console.log('\n----------------------------------------------------------------------');
if (failedCount === 0) {
  console.log(`RESULT: PASS (${testCases.length}/${testCases.length} checks passed)\n`);
  process.exit(0);
} else {
  console.error(`RESULT: FAIL (${failedCount} failed)\n`);
  process.exit(1);
}
