import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const appUrl = process.env.RTHC_APP_URL || "http://localhost:5173";
const root = resolve("RTHC_User_Manual");
const shared = join(root, "screenshots", "shared");
const adminDesktop = join(root, "screenshots", "super_admin", "desktop");
const adminMobile = join(root, "screenshots", "super_admin", "mobile");
const coordinatorDesktop = join(root, "screenshots", "coordinator", "desktop");
const coordinatorMobile = join(root, "screenshots", "coordinator", "mobile");
const redactTerms = (process.env.RTHC_REDACT_TEXT || "")
  .split("|")
  .map((term) => term.trim())
  .filter(Boolean);

for (const path of [shared, adminDesktop, adminMobile, coordinatorDesktop, coordinatorMobile]) {
  await mkdir(path, { recursive: true });
}

const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.RTHC_BROWSER_PATH ||
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
});

async function login(page, email, password, expectedPath) {
  if (!email || !password) {
    throw new Error("Provide the authorized test credentials through environment variables.");
  }

  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname === expectedPath, { timeout: 20000 });
}

async function redact(page) {
  await page.evaluate((terms) => {
    const sensitiveText = [...terms, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i];
    for (const element of document.querySelectorAll("body *")) {
      if (element.children.length) continue;
      const text = element.textContent?.trim() || "";
      if (sensitiveText.some((term) => (typeof term === "string" ? text.includes(term) : term.test(text)))) {
        element.style.filter = "blur(9px)";
      }
    }

    for (const cell of document.querySelectorAll("tbody td")) {
      cell.style.filter = "blur(8px)";
    }
    for (const field of document.querySelectorAll("input:not([type=password]), textarea")) {
      if (field.value) {
        field.style.color = "transparent";
        field.style.textShadow = "none";
      }
    }
  }, redactTerms);
}

async function capture(page, directory, name, width, height, options = {}) {
  await page.setViewportSize({ width, height });
  if (options.scrollTarget) {
    await page.getByText(options.scrollTarget, { exact: true }).first().scrollIntoViewIfNeeded();
  } else {
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await page.waitForTimeout(350);
  await redact(page);
  await page.screenshot({ path: join(directory, name), fullPage: false });
  console.log(`Captured ${name} (${width}x${height})`);
}

try {
  const sharedContext = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  const sharedPage = await sharedContext.newPage();
  await sharedPage.goto(appUrl, { waitUntil: "domcontentloaded" });
  await sharedPage.waitForTimeout(700);
  for (const [width, height, name] of [
    [1920, 1080, "login-desktop-1920x1080.png"],
    [1366, 768, "login-laptop-1366x768.png"],
    [768, 1024, "login-tablet-768x1024.png"],
    [390, 844, "login-mobile-390x844.png"],
    [360, 800, "login-mobile-360x800.png"],
  ]) {
    await capture(sharedPage, shared, name, width, height);
  }
  await sharedContext.close();

  const adminContext = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  const adminPage = await adminContext.newPage();
  await login(
    adminPage,
    process.env.RTHC_SUPERADMIN_EMAIL,
    process.env.RTHC_SUPERADMIN_PASSWORD,
    "/app-select",
  );
  await capture(adminPage, adminDesktop, "application-selection-laptop-1366x768.png", 1366, 768);
  await capture(adminPage, adminMobile, "application-selection-mobile-390x844.png", 390, 844);

  await adminPage.setViewportSize({ width: 1366, height: 768 });
  await adminPage.getByRole("button", { name: "Open RTHC" }).click();
  await adminPage.waitForURL((url) => url.pathname === "/dashboard", { timeout: 15000 });

  for (const [name, path] of [
    ["dashboard", "/dashboard"],
    ["companies", "/companies"],
    ["locations", "/locations"],
    ["coordinators", "/coordinators"],
    ["headcount", "/Headcount"],
    ["reports", "/reports"],
    ["analytics", "/Analytics"],
    ["users", "/users"],
    ["settings", "/settings"],
  ]) {
    await adminPage.goto(new URL(path, appUrl).href, { waitUntil: "domcontentloaded" });
    await adminPage.waitForTimeout(900);
    await capture(adminPage, adminDesktop, `${name}-laptop-1366x768.png`, 1366, 768);
  }

  for (const [name, path] of [
    ["dashboard", "/dashboard"],
    ["companies", "/companies"],
    ["locations", "/locations"],
    ["coordinators", "/coordinators"],
    ["headcount", "/Headcount"],
    ["settings", "/settings"],
  ]) {
    await adminPage.goto(new URL(path, appUrl).href, { waitUntil: "domcontentloaded" });
    await adminPage.waitForTimeout(900);
    await capture(adminPage, adminMobile, `${name}-mobile-390x844.png`, 390, 844);
  }
  await adminContext.close();

  const coordinatorContext = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });
  const coordinatorPage = await coordinatorContext.newPage();
  await login(
    coordinatorPage,
    process.env.RTHC_COORDINATOR_EMAIL,
    process.env.RTHC_COORDINATOR_PASSWORD,
    "/coordinator",
  );

  await capture(
    coordinatorPage,
    coordinatorDesktop,
    "coordinator-dashboard-laptop-1366x768.png",
    1366,
    768,
  );
  await capture(
    coordinatorPage,
    coordinatorDesktop,
    "coordinator-headcount-form-laptop-1366x768.png",
    1366,
    768,
    { scrollTarget: "Today's Head Count" },
  );
  await capture(
    coordinatorPage,
    coordinatorDesktop,
    "coordinator-history-laptop-1366x768.png",
    1366,
    768,
    { scrollTarget: "My Previous Entries" },
  );

  for (const [width, height, name] of [
    [390, 844, "coordinator-dashboard-mobile-390x844.png"],
    [390, 844, "coordinator-headcount-form-mobile-390x844.png"],
    [360, 800, "coordinator-headcount-form-mobile-360x800.png"],
  ]) {
    const target = name.includes("headcount-form") ? "Today's Head Count" : undefined;
    await capture(coordinatorPage, coordinatorMobile, name, width, height, { scrollTarget: target });
  }
  await coordinatorContext.close();
} finally {
  await browser.close();
}
