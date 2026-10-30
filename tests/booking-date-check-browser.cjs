// Isolated browser fixtures: no real bookings, users, payments or database writes.
const { chromium, expect } = require("@playwright/test");
const { mkdir } = require("node:fs/promises");
const { resolve } = require("node:path");
const url = process.env.BOOKING_TEST_URL || "http://localhost:3000";
const out = resolve(__dirname, "../test-results/booking-date-check");
const today = new Date(Date.now() + 19800000).toISOString().slice(0, 10);
const addDays = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const start = addDays(today, 1), end = addDays(today, 2);
const dayLabel = (date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
const user = { _id: "customer-1", fullName: "Date Test Customer", phone: "9876543210", approvedRoles: ["customer"], profileVerificationStatus: "approved", phoneVerifiedAt: new Date().toISOString() };
const product = { _id: "product-1", slug: "date-check", name: "Date Test Mould", code: "MX-TEST", pricing: { perDayCharges: 1000, securityDeposit: 1000 }, images: [{ url: "/images/mould-and-chair.webp", kind: "image" }], videos: [] };
let browser;
const errors = [];

async function run() {
  await mkdir(out, { recursive: true });
  browser = await chromium.launch();
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => { sessionStorage.setItem("splashShown", "1"); localStorage.setItem("mouldx:auth-session-present", "1"); });
    let duplicate = true, failCheck = false, malformed = "", releaseCheck;
    let holdCheck = true;
    const requests = [];
    await context.route("**/api/**", async (route) => {
      const request = route.request();
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": url, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
      const parsed = new URL(request.url());
      const path = parsed.pathname.replace(/^\/api/, "");
      requests.push({ path, method: request.method(), query: Object.fromEntries(parsed.searchParams) });
      const send = (data) => route.fulfill({ json: { success: true, data } });
      if (path === "/auth/refresh-token" || path === "/user/profile") return send({ user, profileVerification: null, tokens: { accessToken: "fixture-access-token" } });
      if (path === "/products/date-check") return send({ product, moulds: [] });
      if (path.endsWith("/visit")) return route.fulfill({ status: 204 });
      if (path === "/bookings/payment-options") return send({ owner: true, platform: false, upi: null });
      if (path === "/bookings/availability") return send({ product, today, cooldownDays: 3, blockedRanges: [] });
      if (path === "/bookings/pending-request") {
        if (holdCheck) await new Promise((resolve) => { releaseCheck = resolve; });
        if (failCheck) return route.fulfill({ status: 503, json: { success: false, message: "Could not check pending requests" } });
        if (malformed === "missing") return send({});
        if (malformed === "invalid") return send({ pendingRequest: {} });
        if (malformed === "unsuccessful") return route.fulfill({ json: { success: false, data: { pendingRequest: null } } });
        return send({ pendingRequest: duplicate ? { bookingId: "existing-request", bookingCode: "BK-EXISTING" } : null });
      }
      return route.fulfill({ status: 404, json: { success: false, message: "Unexpected fixture route" } });
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${url}/explore/date-check`);
    await expect(page.getByRole("link", { name: /Select Dates/ })).toBeVisible();
    await expect(page.getByText(/₹.*deposit for MouldX payments only/)).toHaveCount(0);
    await page.getByRole("link", { name: /Select Dates/ }).click();
    await expect(page.getByRole("heading", { name: "Select rental dates" })).toBeVisible();
    const pickDates = async () => {
      if (start.slice(0, 7) !== today.slice(0, 7)) await page.getByRole("button", { name: "Next month", exact: true }).click();
      await page.getByRole("button", { name: dayLabel(start), exact: true }).click();
      if (end.slice(0, 7) !== start.slice(0, 7)) await page.getByRole("button", { name: "Next month", exact: true }).click();
      await page.getByRole("button", { name: dayLabel(end), exact: true }).click();
    };
    await pickDates();
    const paymentReads = requests.filter((request) => request.path === "/bookings/payment-options").length;
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByRole("button", { name: "Checking your dates...", exact: true })).toBeDisabled();
    await expect(page).toHaveURL(`${url}/explore/date-check/dates`);
    await expect(page.getByRole("heading", { name: "Confirm booking", exact: true })).toHaveCount(0);
    await expect.poll(() => typeof releaseCheck).toBe("function");
    holdCheck = false;
    releaseCheck();
    await expect(page.getByRole("alert").filter({ hasText: "A request is already pending" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "You already have a pending request", exact: true })).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(0);
    await expect(page).toHaveURL(`${url}/explore/date-check/dates`);
    const existingLink = page.getByRole("link", { name: "View existing booking BK-EXISTING", exact: true });
    await expect(existingLink).toHaveAttribute("href", "/bookings/existing-request");
    expect(requests.filter((request) => request.path === "/bookings/pending-request").at(-1).query).toEqual({ productId: product._id, startDate: start, endDate: end });
    expect(requests.filter((request) => request.path === "/bookings/payment-options")).toHaveLength(paymentReads);
    await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `${out}/pending-${width}.png`, fullPage: true });

    duplicate = false;
    await page.getByRole("button", { name: "Choose different dates", exact: true }).click();
    // Return to the first month before selecting again (covers month boundaries).
    if (end.slice(0, 7) !== today.slice(0, 7)) await page.getByRole("button", { name: "Previous month", exact: true }).click();
    await pickDates();
    failCheck = true;
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Could not check pending requests" })).toBeVisible();
    await expect(page).toHaveURL(`${url}/explore/date-check/dates`);
    failCheck = false;
    for (const mode of ["missing", "invalid", "unsuccessful"]) {
      malformed = mode;
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await expect(page.getByRole("alert").filter({ hasText: "We couldn't verify your existing requests" })).toBeVisible();
      await expect(page).toHaveURL(`${url}/explore/date-check/dates`);
      await expect(page.getByRole("heading", { name: "Confirm booking", exact: true })).toHaveCount(0);
    }
    malformed = "";
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Confirm booking", exact: true })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Pay owner directly/ })).toBeVisible();

    // A checkout deep link cannot render payment controls for an existing request.
    duplicate = true;
    const beforeDirect = requests.filter((request) => request.path === "/bookings/payment-options").length;
    await page.goto(`${url}/explore/date-check/confirm?startDate=${start}&endDate=${end}`);
    await expect(page.getByRole("link", { name: "View existing booking BK-EXISTING", exact: true })).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(0);
    expect(requests.filter((request) => request.path === "/bookings/payment-options")).toHaveLength(beforeDirect);
    expect(requests.some((request) => request.method === "POST" && request.path === "/bookings")).toBe(false);
    await context.close();
  }
  expect(errors).toEqual([]);
  console.log("Booking date-step checks passed at 320, 390 and 1440px: mandatory waiting gate, pending notice, malformed/network failures blocked before checkout, retry, change dates and direct-link fallback.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); });
