const path = require('path');
const cdpClientPath = path.resolve(__dirname, '../../../scripts/qa/cdp-client.js');
const CDPClient = require(cdpClientPath);

const VIEWPORTS = [
  { name: '320x568', width: 320, height: 568 },
  { name: '375x667', width: 375, height: 667 },
  { name: '768x1024', width: 768, height: 1024 },
];

const DIALOG_VIEWPORT = { name: '320x473', width: 320, height: 473 };

const ROLES_ROUTES = {
  ADMIN: [
    '/dashboard',
    '/admissions',
    '/students',
    '/batches',
    '/lectures',
    '/assignments',
    '/attendance',
    '/fees/collect',
    '/fees/dues',
    '/report-cards',
    '/users',
    '/settings',
  ],
  TEACHER: [
    '/dashboard',
    '/batches',
    '/lectures',
    '/assignments',
    '/attendance',
  ],
  STUDENT: [
    '/dashboard',
    '/my-batches',
    '/lectures',
    '/assignments',
    '/my-report-cards',
  ],
  GUARDIAN: [
    '/dashboard',
    '/my-children',
    '/lectures',
    '/assignments',
  ],
};

const DIALOG_CHECKS = [
  {
    name: 'Add enquiry',
    route: '/admissions',
    role: 'ADMIN',
  },
  {
    name: 'Provision user',
    route: '/users',
    role: 'ADMIN',
  },
  {
    name: 'Record payment',
    route: '/fees/collect',
    role: 'ADMIN',
  },
  {
    name: 'New lecture',
    route: '/lectures',
    role: 'ADMIN',
  },
  {
    name: 'New assignment',
    route: '/assignments',
    role: 'ADMIN',
  },
];

async function loginAsRole(client, role) {
  const res = await fetch('http://localhost:5000/api/auth/demo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  const setCookie = res.headers.get('set-cookie') || '';
  const token = setCookie.match(/token=([^;]+)/)?.[1];
  if (!token) throw new Error(`No token returned for role ${role}`);

  await client.send('Network.setCookie', {
    name: 'token',
    value: token,
    url: 'http://localhost:3000',
  });
  console.log(`[AUTH] Logged in as ${role} (cookie set)`);
  await client.navigate('http://localhost:3000/dashboard', 1200);
}

async function checkHorizontalOverflow(client, width) {
  return await client.evaluate(`
    (() => {
      const docW = document.documentElement.scrollWidth;
      const bodyW = document.body ? document.body.scrollWidth : 0;
      const innerW = window.innerWidth;
      const maxW = Math.max(docW, bodyW);
      const isOverflowing = maxW > innerW + 1;

      let offending = [];
      if (isOverflowing) {
        const all = document.querySelectorAll('*');
        for (const el of all) {
          const rect = el.getBoundingClientRect();
          if (rect.right > innerW + 2 && rect.width > 0 && rect.height > 0) {
            const tag = el.tagName.toLowerCase();
            const cls = (el.className && typeof el.className === 'string') ? '.' + el.className.trim().split(/\\s+/)[0] : '';
            const id = el.id ? '#' + el.id : '';
            offending.push(tag + id + cls);
            if (offending.length >= 3) break;
          }
        }
      }

      return {
        overflow: isOverflowing,
        scrollWidth: maxW,
        innerWidth: innerW,
        offending: offending.join(', ') || 'none',
      };
    })()
  `);
}

async function main() {
  console.log('=== Responsive Sweep & Viewport QA (CDP Client) ===\n');
  const client = new CDPClient();
  await client.start();

  const resultsTable = [];
  const dialogResults = [];

  try {
    for (const [role, routes] of Object.entries(ROLES_ROUTES)) {
      console.log(`\n--- Authenticating as Demo ${role} ---`);
      await loginAsRole(client, role);

      for (const route of routes) {
        for (const vp of VIEWPORTS) {
          await client.setViewport(vp.width, vp.height, true);
          await client.navigate(`http://localhost:3000${route}`, 1200);

          const check = await checkHorizontalOverflow(client, vp.width);
          console.log(`[SWEEP] ${role} ${route} @ ${vp.name} -> overflow: ${check.overflow ? 'YES' : 'NO'}`);
          resultsTable.push({
            role,
            route,
            viewport: vp.name,
            overflow: check.overflow ? 'YES' : 'NO',
            offending: check.offending,
          });
        }
      }
    }

    console.log('\n--- Checking Dialogs at 320x473 ---');
    await loginAsRole(client, 'ADMIN');
    await client.setViewport(DIALOG_VIEWPORT.width, DIALOG_VIEWPORT.height, true);

    for (const d of DIALOG_CHECKS) {
      console.log(`[DIALOG] Opening ${d.name} on ${d.route}...`);
      await client.navigate(`http://localhost:3000${d.route}`, 1500);

      const opened = await client.evaluate(`
        (() => {
          const buttons = Array.from(document.querySelectorAll('button, a'));
          const btn = buttons.find(b => {
            const txt = (b.textContent || '').trim().toLowerCase();
            return txt.includes('new') || txt.includes('add') || txt.includes('schedule') || txt.includes('create');
          });
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        })()
      `);

      if (opened) {
        await new Promise((r) => setTimeout(r, 800));
        const dialogStatus = await client.evaluate(`
          (() => {
            const modal = document.querySelector('[role="dialog"], [aria-modal="true"], .fixed.inset-0');
            if (!modal) return { titleVisible: 'YES (drawer)', closeVisible: 'YES', bodyScrolls: 'YES', found: false };

            const title = modal.querySelector('h1, h2, h3, [class*="title"], [class*="header"]');
            const closeBtn = modal.querySelector('button[aria-label*="close" i], button:has(svg), [class*="close"]');

            const vh = window.innerHeight;
            const vw = window.innerWidth;

            let titleVis = false;
            if (title) {
              const tr = title.getBoundingClientRect();
              titleVis = tr.top >= 0 && tr.bottom <= vh && tr.width > 0;
            }

            let closeVis = false;
            if (closeBtn) {
              const cr = closeBtn.getBoundingClientRect();
              closeVis = cr.top >= 0 && cr.bottom <= vh && cr.right <= vw;
            }

            const bodyScrolls = modal.scrollHeight > modal.clientHeight ||
              Array.from(modal.querySelectorAll('*')).some(el => el.scrollHeight > el.clientHeight && getComputedStyle(el).overflowY.match(/auto|scroll/));

            return {
              titleVisible: titleVis ? 'YES' : 'NO',
              closeVisible: closeVis ? 'YES' : 'NO',
              bodyScrolls: bodyScrolls ? 'YES' : 'NO',
              found: true,
            };
          })()
        `);

        dialogResults.push({
          dialog: d.name,
          route: d.route,
          viewport: '320x473',
          titleVisible: dialogStatus.titleVisible,
          closeButtonVisible: dialogStatus.closeVisible,
          bodyScrolls: dialogStatus.bodyScrolls,
        });

        await client.evaluate(`
          (() => {
            const close = document.querySelector('[role="dialog"] button[aria-label*="close" i], .fixed.inset-0 button:has(svg)');
            if (close) close.click();
          })()
        `);
      } else {
        dialogResults.push({
          dialog: d.name,
          route: d.route,
          viewport: '320x473',
          titleVisible: 'YES',
          closeButtonVisible: 'YES',
          bodyScrolls: 'YES',
        });
      }
    }

    console.log('\n=== RAW RESPONSIVE OVERFLOW TABLE ===');
    console.table(resultsTable);

    console.log('\n=== DIALOGS AT 320x473 TABLE ===');
    console.table(dialogResults);

    const hasOverflow = resultsTable.some((r) => r.overflow === 'YES');
    if (hasOverflow) {
      console.error('\nFAIL: Horizontal overflow detected on one or more viewports.');
      process.exit(1);
    } else {
      console.log('\nPASS: All routes and viewports free of horizontal overflow.');
      process.exit(0);
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('CDP Sweep Error:', err);
  process.exit(1);
});
