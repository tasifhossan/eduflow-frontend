import { splitInstallments, toMinor, fromMinor, sum } from '../lib/money';

interface TestCase {
  total: string;
  count: number;
  expected: string[];
}

const TEST_CASES: TestCase[] = [
  // 1. Core requirement: 100.00 over 3 installments
  { total: '100.00', count: 3, expected: ['33.33', '33.33', '33.34'] },
  // 2. Even split
  { total: '50.00', count: 2, expected: ['25.00', '25.00'] },
  // 3. 1234.56 over 5: 1234.56 / 5 = 246.912 -> 246.91 * 4 = 987.64 -> last: 246.92
  { total: '1234.56', count: 5, expected: ['246.91', '246.91', '246.91', '246.91', '246.92'] },
  // 4. 999.99 over 7: 999.99 / 7 = 142.8557... -> 142.86 * 6 = 857.16 -> last: 142.83
  { total: '999.99', count: 7, expected: ['142.86', '142.86', '142.86', '142.86', '142.86', '142.86', '142.83'] },
  // 5. 10.00 over 4
  { total: '10.00', count: 4, expected: ['2.50', '2.50', '2.50', '2.50'] },
  // 6. 250.75 over 6: 250.75 / 6 = 41.7916... -> 41.79 * 5 = 208.95 -> last: 41.80
  { total: '250.75', count: 6, expected: ['41.79', '41.79', '41.79', '41.79', '41.79', '41.80'] },
  // 7. 1000.00 over 12: 1000.00 / 12 = 83.333... -> 83.33 * 11 = 916.63 -> last: 83.37
  { total: '1000.00', count: 12, expected: ['83.33', '83.33', '83.33', '83.33', '83.33', '83.33', '83.33', '83.33', '83.33', '83.33', '83.33', '83.37'] },
  // 8. 0.01 over 2: 0.01 / 2 = 0.005 -> 0.01 * 1 -> last: 0.00
  { total: '0.01', count: 2, expected: ['0.01', '0.00'] },
  // 9. 333.33 over 3: 333.33 / 3 = 111.11 -> last: 111.11
  { total: '333.33', count: 3, expected: ['111.11', '111.11', '111.11'] },
  // 10. 777.77 over 11: 777.77 / 11 = 70.7063... -> 70.71 * 10 = 707.10 -> last: 70.67
  { total: '777.77', count: 11, expected: ['70.71', '70.71', '70.71', '70.71', '70.71', '70.71', '70.71', '70.71', '70.71', '70.71', '70.67'] },
  // 11. 15000.00 over 8: 15000 / 8 = 1875.00
  { total: '15000.00', count: 8, expected: ['1875.00', '1875.00', '1875.00', '1875.00', '1875.00', '1875.00', '1875.00', '1875.00'] },
  // 12. 499.50 over 9: 499.50 / 9 = 55.50
  { total: '499.50', count: 9, expected: ['55.50', '55.50', '55.50', '55.50', '55.50', '55.50', '55.50', '55.50', '55.50'] },
  // 13. 888.88 over 4: 888.88 / 4 = 222.22
  { total: '888.88', count: 4, expected: ['222.22', '222.22', '222.22', '222.22'] },
  // 14. 555.55 over 5: 555.55 / 5 = 111.11
  { total: '555.55', count: 5, expected: ['111.11', '111.11', '111.11', '111.11', '111.11'] },
  // 15. 100.01 over 3: 100.01 / 3 = 33.3366... -> 33.34 * 2 = 66.68 -> last: 33.33
  { total: '100.01', count: 3, expected: ['33.34', '33.34', '33.33'] },
  // 16. 100.02 over 3: 100.02 / 3 = 33.34 -> last: 33.34
  { total: '100.02', count: 3, expected: ['33.34', '33.34', '33.34'] },
  // 17. 71.43 over 7: 71.43 / 7 = 10.2042... -> 10.20 * 6 = 61.20 -> last: 10.23
  { total: '71.43', count: 7, expected: ['10.20', '10.20', '10.20', '10.20', '10.20', '10.20', '10.23'] },
  // 18. 99.90 over 10: 99.90 / 10 = 9.99
  { total: '99.90', count: 10, expected: ['9.99', '9.99', '9.99', '9.99', '9.99', '9.99', '9.99', '9.99', '9.99', '9.99'] },
  // 19. 2400.00 over 6: 2400 / 6 = 400.00
  { total: '2400.00', count: 6, expected: ['400.00', '400.00', '400.00', '400.00', '400.00', '400.00'] },
  // 20. 120.00 over 5: 120 / 5 = 24.00
  { total: '120.00', count: 5, expected: ['24.00', '24.00', '24.00', '24.00', '24.00'] },
];

console.log('='.repeat(70));
console.log(' EduFlow Money Arithmetic & Installment Split Verification');
console.log('='.repeat(70));

let failures = 0;

TEST_CASES.forEach((tc, idx) => {
  const result = splitInstallments(tc.total, tc.count);
  const match = JSON.stringify(result) === JSON.stringify(tc.expected);
  const checkSum = sum(result);
  const sumMatches = toMinor(checkSum) === toMinor(tc.total);

  if (match && sumMatches) {
    console.log(`[PASS] Case ${String(idx + 1).padStart(2)}: Total=${tc.total.padStart(8)}, Count=${String(tc.count).padStart(2)} -> [${result.join(', ')}]`);
  } else {
    failures++;
    console.error(`[FAIL] Case ${String(idx + 1).padStart(2)}: Total=${tc.total}, Count=${tc.count}`);
    console.error(`       Expected: [${tc.expected.join(', ')}]`);
    console.error(`       Actual:   [${result.join(', ')}] (Sum=${checkSum})`);
  }
});

console.log('='.repeat(70));
console.log(`TOTAL CASES: ${TEST_CASES.length} | PASSED: ${TEST_CASES.length - failures} | FAILED: ${failures}`);
console.log('='.repeat(70));

if (failures > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

