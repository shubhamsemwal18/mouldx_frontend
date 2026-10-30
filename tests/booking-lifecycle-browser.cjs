// Real booking routes and an isolated replica set; never loads app .env or sends mail.
const { chromium, expect } = require("@playwright/test");
const { createRequire } = require("node:module");
const { resolve } = require("node:path");
const { once } = require("node:events");
const { mkdir } = require("node:fs/promises");
const backend = createRequire(resolve(__dirname, "../../mouldx_backend/package.json"));
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "isolated-booking-lifecycle-secret";
const express = backend("express");
const mongoose = backend("mongoose");
const { MongoMemoryReplSet } = backend("mongodb-memory-server");
const User = backend("./models/User");
const Product = backend("./models/Product");
const Booking = backend("./models/Booking");
const BookingEmail = backend("./models/BookingEmail");
const { signAccessToken } = backend("./utils/jwt");
const { todayInIndia, addDays } = backend("./utils/bookingDates");
const url = process.env.BOOKING_TEST_URL || "http://localhost:3000";
const out = resolve(__dirname, "../test-results/booking-lifecycle");
let repl, server, browser;

async function run() {
  await mkdir(out, { recursive: true });
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: "8.0.16" } });
  await mongoose.connect(repl.getUri());
  for (const model of [User, Product, Booking, BookingEmail, backend("./models/OwnerProfileVerification"), backend("./models/Media"), backend("./models/Category"), backend("./models/Mould"), backend("./models/Counter")]) await model.init();
  const makeUser = (name, phone, roles) => User.create({ fullName: name, phone, email: `${name.toLowerCase()}@example.test`, approvedRoles: roles, profileVerificationStatus: "approved", phoneVerifiedAt: new Date() });
  const host = await makeUser("Host", "9000000001", ["customer", "owner"]);
  const customer = await makeUser("Customer", "9000000002", ["customer"]);
  const admin = await makeUser("Admin", "9000000003", ["admin"]);
  const product = await Product.create({ owner: host._id, name: "Lifecycle Test Mould", status: "approved", pricing: { perDayCharges: 1250, securityDeposit: 2000 } });
  const today = todayInIndia();
  const fixture = async (code, status, start, end) => Booking.create({
    code, status, product: product._id, host: host._id, customer: customer._id,
    startDate: addDays(today, start), endDate: addDays(today, end),
    snapshot: { product: { name: product.name, code: product.code, slug: product.slug }, customer: { fullName: customer.fullName, email: customer.email }, host: { fullName: host.fullName, email: host.email } },
    pricing: { currency: "INR", days: end - start + 1, perDayCharges: 1250, rentalTotal: (end - start + 1) * 1250, securityDeposit: 0, total: (end - start + 1) * 1250 },
    payment: { method: "owner", status: "unpaid" }, history: [{ action: "requested", at: new Date() }],
  });
  const pending = await fixture("BK-HIDDEN-PENDING", "pending", 20, 21);
  await fixture("BK-HIDDEN-REJECTED", "rejected", 30, 31);
  const active = await fixture("BK-ACTIVE", "approved", -1, 0);
  const completed = await fixture("BK-COMPLETED", "approved", -3, -1);
  for (let i = 0; i < 13; i++) await fixture(`BK-UPCOMING-${String(i).padStart(2, "0")}`, "approved", i * 7 + 1, i * 7 + 2);
  const app = express();
  app.use(backend("cors")({ origin: true, credentials: true }));
  app.use(express.json());
  app.use("/api/bookings", backend("./routes/bookingRoutes"));
  app.use("/api/admin", backend("./routes/adminRoutes"));
  app.use(backend("./middleware/errorMiddleware"));
  server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const api = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
  const errors = [];
  async function actor(user) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(() => { sessionStorage.setItem("splashShown", "1"); localStorage.setItem("mouldx:auth-session-present", "1"); });
    const requests = [];
    await context.route("**/api/**", async (route) => {
      const request = route.request(); const parsed = new URL(request.url());
      if (parsed.pathname === "/api/auth/refresh-token") return route.fulfill({ json: { success: true, data: { user: user.toJSON(), profileVerification: null, tokens: { accessToken: signAccessToken(user._id) } } } });
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": url, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
      requests.push(parsed);
      const actual = await route.fetch({ url: `${api}${parsed.pathname}${parsed.search}` });
      await route.fulfill({ response: actual });
    });
    const page = await context.newPage(); page.setDefaultTimeout(20000);
    page.on("pageerror", (error) => errors.push(error.message));
    return { page, requests };
  }
  const { page: hostPage, requests: hostRequests } = await actor(host);
  await hostPage.goto(`${url}/owner/bookings`);
  const filters = hostPage.getByRole("group", { name: "Filter bookings by status" });
  await expect(filters.getByRole("button")).toHaveCount(3);
  await expect(hostPage.getByRole("button", { name: "Upcoming bookings", exact: true })).toContainText("13");
  await expect(hostPage.getByRole("button", { name: "Upcoming bookings", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(hostPage.locator('a[href^="/owner/bookings/"]')).toHaveCount(12);
  await hostPage.getByText("12 of 13 bookings", { exact: true }).scrollIntoViewIfNeeded();
  await expect(hostPage.locator('a[href^="/owner/bookings/"]')).toHaveCount(13);
  for (const phase of ["Active", "Completed"]) {
    await hostPage.getByRole("button", { name: `${phase} bookings`, exact: true }).click();
    await expect(hostPage.locator('a[href^="/owner/bookings/"]')).toHaveCount(1);
    await expect(hostPage.locator('a[href^="/owner/bookings/"]').first()).toContainText(`BK-${phase.toUpperCase()}`);
  }
  for (const width of [320, 390, 1440]) {
    await hostPage.setViewportSize({ width, height: 900 });
    await hostPage.getByRole("button", { name: "Upcoming bookings", exact: true }).click();
    await expect(hostPage.getByRole("heading", { name: "Upcoming bookings", exact: true })).toBeVisible();
    expect(await hostPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
    await hostPage.screenshot({ path: `${out}/host-${width}.png`, fullPage: true });
  }
  await hostPage.getByRole("textbox", { name: "Search bookings" }).pressSequentially("BK-UPCOMING-00", { delay: 20 });
  expect(hostRequests.filter((request) => request.searchParams.get("search"))).toHaveLength(0);
  await expect(hostPage.locator('a[href^="/owner/bookings/"]')).toHaveCount(1);
  expect(hostRequests.filter((request) => request.searchParams.get("search"))).toHaveLength(1);
  await hostPage.goto(`${url}/owner/bookings/${pending._id}`);
  await expect(hostPage.getByText("Booking not found", { exact: true })).toBeVisible();
  await expect(hostPage.getByRole("heading", { name: pending.code, exact: true })).toHaveCount(0);
  await hostPage.goto(`${url}/owner/bookings/${completed._id}`);
  await expect(hostPage.getByText("Booking completed", { exact: true })).toBeVisible();
  for (const route of ["dispatch", "claim/resolved", "return/accepted"]) {
    await hostPage.goto(`${url}/owner/bookings/${completed._id}/${route}`);
    await expect(hostPage).toHaveURL(`${url}/owner/bookings/${completed._id}`);
    await expect(hostPage.getByText("Booking completed", { exact: true })).toBeVisible();
  }
  await hostPage.goto(`${url}/owner/bookings/${active._id}`);
  await expect(hostPage.getByText("Booking active", { exact: true })).toBeVisible();
  const { page: renter } = await actor(customer);
  for (const route of ["receive", "refund", "mould-details"]) {
    await renter.goto(`${url}/bookings/${completed._id}/${route}`);
    await expect(renter).toHaveURL(`${url}/bookings/${completed._id}`);
    await expect(renter.getByText("Booking completed", { exact: true })).toBeVisible();
  }
  await renter.goto(`${url}/booking-success`);
  await expect(renter).toHaveURL(`${url}/bookings`);
  await expect(renter.getByText("Payment received", { exact: true })).toHaveCount(0);
  for (const width of [320, 390, 1440]) {
    await renter.setViewportSize({ width, height: 900 });
    await renter.goto(`${url}/bookings`);
    await expect(renter.getByRole("group", { name: "Filter bookings by status" }).getByRole("button")).toHaveCount(5);
    await expect(renter.getByRole("button", { name: "All bookings", exact: true })).toContainText("17");
    await renter.getByRole("button", { name: "Completed bookings", exact: true }).click();
    await expect(renter.locator('a[href^="/bookings/"]')).toHaveCount(1);
    await expect(renter.locator('a[href^="/bookings/"]').first()).toContainText("BK-COMPLETED");
    expect(await renter.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
    await renter.screenshot({ path: `${out}/customer-${width}.png`, fullPage: true });
  }
  const { page: reviewer } = await actor(admin);
  await reviewer.goto(`${url}/admin/bookings/${pending._id}`);
  await expect(reviewer.getByRole("button", { name: "Message host", exact: true })).toHaveCount(0);
  await expect(reviewer.getByRole("button", { name: "Message customer", exact: true })).toBeVisible();
  await reviewer.getByLabel("Rejection reason").fill("Dates do not work");
  await reviewer.getByRole("button", { name: "Reject", exact: true }).click();
  await expect(reviewer.getByText("Reject this request and notify the customer and admin team? The host will not be notified.")).toBeVisible();
  await reviewer.getByRole("button", { name: "Confirm decision", exact: true }).click();
  await expect(reviewer.getByText("Booking rejected", { exact: true })).toBeVisible();
  expect(await BookingEmail.countDocuments({ booking: pending._id, audience: "host" })).toBe(0);
  expect(await BookingEmail.countDocuments({ booking: pending._id, event: "rejected" })).toBe(2);
  await reviewer.goto(`${url}/admin/bookings`);
  await expect(reviewer.getByRole("group", { name: "Filter bookings by status" }).getByRole("button")).toHaveCount(4);
  expect(errors).toEqual([]);
  console.log("Real-API lifecycle browser tests passed at 320/390/1440px: host-only confirmed phases, completed customer filter, infinite scroll, debounced search, hidden request detail and rejection email policy.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  if (repl) await repl.stop();
});
