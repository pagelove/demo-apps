import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import testServer from "../scripts/serve-test.cjs";

const { startStaticServer } = testServer;


const ROUTES = [
  "/",
  "/demo-01-event/",
  "/demo-02-show-and-tell/",
  "/demo-03-resource-exchange/",
  "/demo-04-accountability/",
  "/demo-05-professional/",
];

let server;
let baseURL;

test.beforeAll(async () => {
  server = await startStaticServer(".deploy-ci", 0);
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("The test server did not expose a TCP port.");
  }
  baseURL = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  });
});


test("all public pages render without browser or accessibility errors", async ({ page }) => {
  for (const route of ROUTES) {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const browserErrors = [];
    const onConsole = (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    };
    const onPageError = (error) => browserErrors.push(error.message);
    page.on("console", onConsole);
    page.on("pageerror", onPageError);

    const response = await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle" });
    expect(response?.ok(), `${route} should return a successful response`).toBeTruthy();
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 5_000 });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const performanceBudget = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0];
      const resources = performance.getEntriesByType("resource");
      const entries = navigation ? [navigation, ...resources] : resources;
      return {
        loadMs: navigation ? navigation.duration : Number.POSITIVE_INFINITY,
        transferBytes: entries.reduce(
          (total, entry) => total + (entry.transferSize || entry.encodedBodySize || 0),
          0
        ),
      };
    });
    expect(results.violations, `${route} should have no WCAG A/AA violations`).toEqual([]);
    expect(browserErrors, `${route} should have no browser errors`).toEqual([]);
    expect(performanceBudget.loadMs, `${route} should load within 3 seconds`).toBeLessThan(3_000);
    expect(
      performanceBudget.transferBytes,
      `${route} should transfer less than 1.5 MB`
    ).toBeLessThan(1_500_000);
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }
});

test("all public pages keep their primary content visible without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  for (const route of ROUTES) {
    const response = await page.goto(`${baseURL}${route}`);
    expect(response?.ok(), `${route} should return a successful response`).toBeTruthy();
    await expect(page.locator("h1").first()).toBeVisible();
  }
  await context.close();
});


test("professional resource form rejects non-HTTP links before writing", async ({ page }) => {
  await page.goto(`${baseURL}/demo-05-professional/`);
  await page.click("#tab-resources");
  await page.fill("#nr-title", "Unsafe example");
  await page.fill("#nr-url", "javascript:alert(document.domain)");
  await page.fill("#nr-desc", "This must never be stored as a clickable link.");

  let writes = 0;
  page.on("request", (request) => {
    if (request.method() !== "GET") writes += 1;
  });
  await page.locator("#pl-new-resource").evaluate((form) => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });

  await expect(page.locator("#pl-toasts")).toContainText(
    "Only https:// and http:// links can be shared."
  );
  expect(writes).toBe(0);
});
