import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Journey 1: Landing Page (unauthenticated visitor)
// ---------------------------------------------------------------------------
test.describe("Journey 1: Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders hero section with headline", async ({ page }) => {
    const hero = page.locator("section").first();
    await expect(hero).toBeVisible();

    // The headline is split across elements:
    //   "Post a hypothesis." <br> "Agents collaborate" " to solve it."
    const headline = page.locator("h1").first();
    await expect(headline).toContainText("Post a hypothesis.");
    await expect(headline).toContainText("Agents collaborate");
    await expect(headline).toContainText("to solve it.");
  });

  test("Browse Hypotheses CTA links to /hypotheses", async ({ page }) => {
    const browseBtn = page
      .locator("a", { hasText: "Browse Hypotheses" })
      .first();
    await expect(browseBtn).toBeVisible();
    await expect(browseBtn).toHaveAttribute("href", "/hypotheses");
  });

  test("Start a Hypothesis CTA links to /hypotheses/new", async ({
    page,
  }) => {
    const startBtn = page.locator("a", { hasText: "Start a Hypothesis" });
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toHaveAttribute("href", "/hypotheses/new");
  });

  test("pip install command box is visible", async ({ page }) => {
    const pipCommand = page.locator("code", {
      hasText: "pip install agentipedia",
    });
    await expect(pipCommand).toBeVisible();
  });

  test("Beta badge is visible", async ({ page }) => {
    const badge = page.locator("span", { hasText: "Beta" });
    await expect(badge).toBeVisible();
  });

  test("footer shows Sign in link (not Your Profile)", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    const signInLink = footer.locator("a", { hasText: "Sign in" });
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute("href", "/auth/login");

    // "Your Profile" should NOT be in the footer for unauthenticated users
    const profileLink = footer.locator("a", { hasText: "Your Profile" });
    await expect(profileLink).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 2: Browse Page
// ---------------------------------------------------------------------------
test.describe("Journey 2: Browse Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/hypotheses");
  });

  test("renders Browse Hypotheses heading", async ({ page }) => {
    const heading = page.locator("h1", { hasText: "Browse Hypotheses" });
    await expect(heading).toBeVisible();
  });

  test("search input exists with placeholder text", async ({ page }) => {
    const searchInput = page.locator(
      'input[placeholder="Search hypotheses by keyword..."]',
    );
    await expect(searchInput).toBeVisible();
  });

  test("filter bar renders with domain, status, and sort dropdowns", async ({
    page,
  }) => {
    // The filter bar has three select triggers with recognizable default labels
    const allDomains = page.locator("button", { hasText: "All Domains" });
    await expect(allDomains).toBeVisible();

    const allStatuses = page.locator("button", { hasText: "All Statuses" });
    await expect(allStatuses).toBeVisible();

    const newest = page.locator("button", { hasText: "Newest" });
    await expect(newest).toBeVisible();
  });

  test("+ New Hypothesis button links to /hypotheses/new", async ({
    page,
  }) => {
    const newBtn = page.locator("a", { hasText: "+ New Hypothesis" });
    await expect(newBtn).toBeVisible();
    await expect(newBtn).toHaveAttribute("href", "/hypotheses/new");
  });
});

// ---------------------------------------------------------------------------
// Journey 3: Auth Flow
// ---------------------------------------------------------------------------
test.describe("Journey 3: Auth Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Use domcontentloaded to avoid hanging on slow client-side hydration
    await page.goto("/auth/login", { waitUntil: "domcontentloaded" });
  });

  test("renders Sign in to Agentipedia heading", async ({ page }) => {
    const heading = page.locator("h1", {
      hasText: "Sign in to Agentipedia",
    });
    await expect(heading).toBeVisible();
  });

  test("Sign in with X button exists", async ({ page }) => {
    const xButton = page.locator("button", { hasText: "Sign in with X" });
    await expect(xButton).toBeVisible();
  });

  test("dev login link exists in development mode", async ({ page }) => {
    // In development, a "Dev: Sign in as demo_user" link should appear
    const devLink = page.locator("a", {
      hasText: "Dev: Sign in as demo_user",
    });
    await expect(devLink).toBeVisible();
    await expect(devLink).toHaveAttribute("href", "/api/auth/dev-login");
  });
});

// ---------------------------------------------------------------------------
// Journey 4: Navigation (unauthenticated)
// ---------------------------------------------------------------------------
test.describe("Journey 4: Navigation (unauthenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("logo links to /", async ({ page }) => {
    const logo = page.locator('nav a[href="/"]');
    await expect(logo).toBeVisible();
  });

  test("Browse Hypotheses nav link exists and links to /hypotheses", async ({
    page,
  }) => {
    // For unauthenticated users, the nav shows "Browse Hypotheses"
    const navLink = page.locator('nav a[href="/hypotheses"]', {
      hasText: "Browse Hypotheses",
    });
    await expect(navLink).toBeVisible();
  });

  test("Sign in button exists in top nav", async ({ page }) => {
    // The top nav uses a fixed position bar with the "Sign in" link styled as
    // a rounded pill button. Scope to the top-level fixed nav to avoid matching
    // the footer's nav element which also contains a "Sign in" link.
    const topNav = page.locator("nav.fixed");
    const signIn = topNav.locator('a[href="/auth/login"]', {
      hasText: "Sign in",
    });
    await expect(signIn).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Journey 5: Protected Routes
// ---------------------------------------------------------------------------
test.describe("Journey 5: Protected Routes", () => {
  test("navigating to /hypotheses/new redirects to /auth/login with returnTo", async ({
    page,
  }) => {
    // Use domcontentloaded since we follow a redirect chain
    await page.goto("/hypotheses/new", { waitUntil: "domcontentloaded" });

    // Should have been redirected to the login page
    await expect(page).toHaveURL(/\/auth\/login/);

    // URL should include returnTo query parameter
    const url = new URL(page.url());
    expect(url.searchParams.get("returnTo")).toBe("/hypotheses/new");
  });
});

// ---------------------------------------------------------------------------
// Journey 6: Legacy Redirect
// ---------------------------------------------------------------------------
test.describe("Journey 6: Legacy Redirect", () => {
  test("navigating to /create-hypothesis redirects to /hypotheses/new", async ({
    page,
  }) => {
    // /create-hypothesis uses permanentRedirect to /hypotheses/new
    // which in turn redirects to /auth/login (protected route) for
    // unauthenticated users. Use domcontentloaded for the redirect chain.
    await page.goto("/create-hypothesis", { waitUntil: "domcontentloaded" });

    // The key assertion: we do NOT stay on /create-hypothesis
    const url = page.url();
    expect(url).not.toContain("/create-hypothesis");

    // The redirect chain: /create-hypothesis -> /hypotheses/new -> /auth/login
    // So we end up at /auth/login with returnTo=/hypotheses/new
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
