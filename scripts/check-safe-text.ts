import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SafeText } from '../components/content/safe-text';

console.log('='.repeat(70));
console.log(' EduFlow SafeText Renderer Security & Rendering Test');
console.log('='.repeat(70));

const hostileVectors = [
  '<script>alert("pwned")</script>',
  '<img src=x onerror="alert(1)">',
  '<iframe src="https://evil.com"></iframe>',
  '[Click here](javascript:alert("exploit"))',
  '[Data URL](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)',
  '<svg onload="alert(1)">',
  '<a href="javascript:void(0)">evil</a>',
];

let failed = false;

for (const vector of hostileVectors) {
  const rendered = renderToStaticMarkup(React.createElement(SafeText, { content: vector }));
  console.log(`Input:   ${vector}`);
  console.log(`Output:  ${rendered}`);

  // Assert no unescaped dangerous HTML tags, no javascript: link href, no data: link href
  if (rendered.includes('<script>') || rendered.includes('</script>') || rendered.includes('<script ')) {
    console.error('  ✗ FAILED: Raw script tag found in HTML output!');
    failed = true;
  }
  if (rendered.includes('<img ') || rendered.includes('<img/')) {
    console.error('  ✗ FAILED: Raw img tag found in HTML output!');
    failed = true;
  }
  if (rendered.includes('<iframe ') || rendered.includes('<iframe/')) {
    console.error('  ✗ FAILED: iframe tag found in HTML output!');
    failed = true;
  }
  if (rendered.includes('<svg ') || rendered.includes('<svg/')) {
    console.error('  ✗ FAILED: svg tag found in HTML output!');
    failed = true;
  }
  if (rendered.includes('href="javascript:')) {
    console.error('  ✗ FAILED: javascript: href found in HTML output!');
    failed = true;
  }
  if (rendered.includes('href="data:')) {
    console.error('  ✗ FAILED: data: href found in HTML output!');
    failed = true;
  }
  console.log('  ✓ PASSED');
  console.log('-'.repeat(50));
}

// Assert valid markdown works as expected
const validSample = `## Welcome
This is **bold** and *italic* text.

Here is a safe link: [Official](https://example.com/info)

- Bullet point 1
- Bullet point 2

1. Numbered 1
2. Numbered 2
`;

const renderedValid = renderToStaticMarkup(React.createElement(SafeText, { content: validSample }));
console.log('Valid Sample Output:\n', renderedValid);

if (!renderedValid.includes('<h2') || !renderedValid.includes('Welcome</h2>')) {
  console.error('  ✗ FAILED: Heading 2 did not render correctly!');
  failed = true;
}
if (!renderedValid.includes('bold</strong>')) {
  console.error('  ✗ FAILED: Bold text did not render correctly!');
  failed = true;
}
if (!renderedValid.includes('italic</em>')) {
  console.error('  ✗ FAILED: Italic text did not render correctly!');
  failed = true;
}
if (!renderedValid.includes('href="https://example.com/info"') || !renderedValid.includes('target="_blank"')) {
  console.error('  ✗ FAILED: Safe link did not render correctly!');
  failed = true;
}
if (!renderedValid.includes('<ul') || !renderedValid.includes('<li>Bullet point 1</li>')) {
  console.error('  ✗ FAILED: Unordered list did not render correctly!');
  failed = true;
}
if (!renderedValid.includes('<ol') || !renderedValid.includes('<li>Numbered 1</li>')) {
  console.error('  ✗ FAILED: Ordered list did not render correctly!');
  failed = true;
}

console.log('='.repeat(70));
if (failed) {
  console.error('SafeText verification FAILED with security or parsing errors.');
  process.exit(1);
} else {
  console.log('All SafeText tests PASSED successfully.');
}
console.log('='.repeat(70));
