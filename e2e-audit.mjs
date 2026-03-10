import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = '/Users/sujit/projects/Agentipedia copy/e2e-screenshots';

const ROUTES = [
  { path: '/', name: '01-homepage' },
  { path: '/auth/login', name: '02-auth-login' },
  { path: '/auth/tokens', name: '03-auth-tokens' },
  { path: '/create-hypothesis', name: '04-create-hypothesis' },
  { path: '/hypotheses/test-id', name: '05-hypothesis-detail' },
  { path: '/runs/test-id', name: '06-run-detail' },
  { path: '/users/test-handle', name: '07-user-profile' },
];

async function auditRoute(browser, route) {
  const consoleMessages = [];
  const pageErrors = [];
  const networkErrors = [];

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  // Collect console messages
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || type === 'warning') {
      consoleMessages.push({ type, text: text.substring(0, 3000) });
    }
  });

  // Collect uncaught page errors
  page.on('pageerror', (error) => {
    pageErrors.push({
      message: error.message.substring(0, 3000),
      stack: (error.stack || '').substring(0, 1500),
    });
  });

  // Collect failed network requests
  page.on('response', (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !url.includes('_next/static') && !url.includes('favicon')) {
      networkErrors.push({ status, url: url.substring(0, 500) });
    }
  });

  const url = `${BASE_URL}${route.path}`;
  let navigationError = null;
  let httpStatus = null;

  try {
    const response = await page.goto(url, {
      waitUntil: 'load',
      timeout: 30000
    });
    httpStatus = response?.status();

    // Wait for hydration and dynamic content
    await page.waitForTimeout(3000);
  } catch (error) {
    navigationError = error.message.substring(0, 1000);
    // Still try to take screenshot even after nav error
    await page.waitForTimeout(2000);
  }

  // Take screenshot
  let screenshotTaken = false;
  try {
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/${route.name}.png`,
      fullPage: true,
      timeout: 10000,
    });
    screenshotTaken = true;
  } catch (e) {
    console.log(`  Screenshot failed: ${e.message.substring(0, 200)}`);
  }

  // Get page content for error analysis
  let bodyText = '';
  let htmlContent = '';
  try {
    bodyText = await page.locator('body').textContent({ timeout: 5000 });
    htmlContent = await page.content();
  } catch {
    // ignore
  }

  // Check for Next.js error patterns in rendered content
  let errorBoundary = null;
  if (bodyText.includes('Application error') ||
      bodyText.includes('Unhandled Runtime Error') ||
      bodyText.includes('Internal Server Error')) {
    const h1 = await page.locator('h1').first().textContent().catch(() => null);
    const h2 = await page.locator('h2').first().textContent().catch(() => null);
    const pre = await page.locator('pre').first().textContent().catch(() => null);
    errorBoundary = { h1, h2, pre: pre?.substring(0, 500) };
  }

  // Check for Next.js dev error overlay via evaluate
  let devOverlayError = null;
  try {
    devOverlayError = await page.evaluate(() => {
      // Check for nextjs-portal shadow DOM
      const portal = document.querySelector('nextjs-portal');
      if (portal && portal.shadowRoot) {
        const dialog = portal.shadowRoot.querySelector('[data-nextjs-dialog]');
        if (dialog) return dialog.textContent;
        // Check toast
        const toast = portal.shadowRoot.querySelector('[data-nextjs-toast]');
        if (toast) return toast.textContent;
        // Get any content
        const content = portal.shadowRoot.textContent;
        if (content && content.trim().length > 0) return content;
      }
      return null;
    });
  } catch {
    // ignore
  }

  // Check HTML source for error indicators
  let sourceErrors = [];
  const errorPatterns = [
    { pattern: /Error:\s*[^<"]{10,200}/g, label: 'Error message' },
    { pattern: /Unhandled Runtime Error/g, label: 'Unhandled Runtime Error' },
    { pattern: /hydration/gi, label: 'Hydration issue' },
    { pattern: /Internal Server Error/g, label: 'Internal Server Error' },
    { pattern: /MODULE_NOT_FOUND/g, label: 'Module not found' },
    { pattern: /Cannot read properties of/g, label: 'Cannot read properties' },
    { pattern: /is not a function/g, label: 'Not a function' },
    { pattern: /is not defined/g, label: 'Not defined' },
    { pattern: /NEXT_REDIRECT/g, label: 'Next redirect' },
    { pattern: /digest/g, label: 'Error digest' },
  ];
  for (const { pattern, label } of errorPatterns) {
    const found = htmlContent.match(pattern);
    if (found) {
      sourceErrors.push(...found.map(m => `[${label}] ${m.substring(0, 300)}`));
    }
  }

  const pageTitle = await page.title().catch(() => 'UNKNOWN');

  await page.close();
  await context.close();

  return {
    route: route.path,
    name: route.name,
    httpStatus,
    navigationError,
    consoleErrors: consoleMessages.filter(m => m.type === 'error'),
    consoleWarnings: consoleMessages.filter(m => m.type === 'warning'),
    pageErrors,
    networkErrors,
    errorBoundary,
    devOverlayError,
    sourceErrors: sourceErrors.length > 0 ? sourceErrors : null,
    pageTitle,
    screenshotTaken,
    bodyTextPreview: bodyText.substring(0, 500),
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const route of ROUTES) {
    console.log(`\n--- Testing: ${route.path} ---`);
    try {
      const result = await auditRoute(browser, route);
      results.push(result);

      console.log(`  HTTP Status: ${result.httpStatus}`);
      console.log(`  Page Title: ${result.pageTitle}`);
      console.log(`  Screenshot: ${result.screenshotTaken ? 'OK' : 'FAILED'}`);
      if (result.navigationError) console.log(`  NAV ERROR: ${result.navigationError.substring(0, 200)}`);
      if (result.pageErrors.length > 0) console.log(`  PAGE ERRORS: ${result.pageErrors.length}`);
      if (result.consoleErrors.length > 0) console.log(`  CONSOLE ERRORS: ${result.consoleErrors.length}`);
      if (result.consoleWarnings.length > 0) console.log(`  CONSOLE WARNINGS: ${result.consoleWarnings.length}`);
      if (result.networkErrors.length > 0) console.log(`  NETWORK ERRORS: ${result.networkErrors.length}`);
      if (result.errorBoundary) console.log(`  ERROR BOUNDARY: yes`);
      if (result.devOverlayError) console.log(`  DEV OVERLAY: ${result.devOverlayError.substring(0, 200)}`);
      if (result.sourceErrors) console.log(`  SOURCE ERRORS: ${result.sourceErrors.length}`);
    } catch (error) {
      console.log(`  FATAL: ${error.message}`);
      results.push({ route: route.path, name: route.name, fatalError: error.message });
    }
  }

  await browser.close();

  // Write report
  const reportPath = `${SCREENSHOT_DIR}/audit-report.json`;
  writeFileSync(reportPath, JSON.stringify(results, null, 2));

  // Detailed report
  console.log('\n\n========== DETAILED ERROR REPORT ==========\n');
  for (const r of results) {
    console.log(`\n===== ${r.route} (${r.name}) =====`);
    console.log(`HTTP Status: ${r.httpStatus || 'N/A'}`);
    console.log(`Page Title: ${r.pageTitle || 'N/A'}`);

    if (r.fatalError) {
      console.log(`FATAL ERROR: ${r.fatalError}`);
      continue;
    }

    if (r.navigationError) {
      console.log(`\nNAVIGATION ERROR:\n  ${r.navigationError}`);
    }

    if (r.bodyTextPreview) {
      console.log(`\nBODY TEXT PREVIEW:\n  ${r.bodyTextPreview.substring(0, 300)}`);
    }

    if (r.pageErrors?.length > 0) {
      console.log(`\nPAGE ERRORS (${r.pageErrors.length}):`);
      for (const e of r.pageErrors) {
        console.log(`  MESSAGE: ${e.message}`);
        if (e.stack) console.log(`  STACK: ${e.stack.substring(0, 300)}`);
      }
    }

    if (r.consoleErrors?.length > 0) {
      console.log(`\nCONSOLE ERRORS (${r.consoleErrors.length}):`);
      for (const e of r.consoleErrors) {
        console.log(`  - ${e.text}`);
      }
    }

    if (r.consoleWarnings?.length > 0) {
      console.log(`\nCONSOLE WARNINGS (${r.consoleWarnings.length}):`);
      for (const e of r.consoleWarnings) {
        console.log(`  - ${e.text}`);
      }
    }

    if (r.networkErrors?.length > 0) {
      console.log(`\nNETWORK ERRORS (${r.networkErrors.length}):`);
      for (const e of r.networkErrors) {
        console.log(`  - ${e.status} ${e.url}`);
      }
    }

    if (r.errorBoundary) {
      console.log(`\nERROR BOUNDARY CONTENT:`);
      console.log(`  H1: ${r.errorBoundary.h1}`);
      console.log(`  H2: ${r.errorBoundary.h2}`);
      if (r.errorBoundary.pre) console.log(`  PRE: ${r.errorBoundary.pre}`);
    }

    if (r.devOverlayError) {
      console.log(`\nDEV OVERLAY ERROR:\n  ${r.devOverlayError.substring(0, 1000)}`);
    }

    if (r.sourceErrors) {
      console.log(`\nSOURCE HTML ERROR PATTERNS (${r.sourceErrors.length}):`);
      for (const e of r.sourceErrors) {
        console.log(`  - ${e}`);
      }
    }
  }
}

main().catch(console.error);
