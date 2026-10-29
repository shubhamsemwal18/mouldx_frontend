// Uses the real API/services with an isolated Mongo replica set. Never loads .env,
// modifies application data, sends email, or restarts the user's running servers.
const { chromium, expect } = require("@playwright/test");
const { createRequire } = require("node:module");
const { resolve } = require("node:path");
const { once } = require("node:events");
const { mkdir } = require("node:fs/promises");
const backend = createRequire(resolve(__dirname, "../../mouldx_backend/package.json"));
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "isolated-calendar-integration-secret";
const express = backend("express");
const mongoose = backend("mongoose");
const { MongoMemoryReplSet } = backend("mongodb-memory-server");
const User = backend("./models/User");
const Product = backend("./models/Product");
const Booking = backend("./models/Booking");
const { signAccessToken } = backend("./utils/jwt");
const { todayInIndia, addDays } = backend("./utils/bookingDates");
const url = process.env.BOOKING_TEST_URL || "http://localhost:3000";
const out = resolve(__dirname, "../test-results/booking-date-check");
let repl, server, browser;

async function run() {
  await mkdir(out, { recursive: true });
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: "8.0.16" } });
  await mongoose.connect(repl.getUri());
  for (const model of [User, Product, Booking, backend("./models/BookingEmail"), backend("./models/OwnerProfileVerification"), backend("./models/Media"), backend("./models/Category"), backend("./models/Mould"), backend("./models/Counter"), backend("./models/ProductVisit")]) await model.init();
  const host = await User.create({ fullName: "Calendar Host", phone: "9000000001", approvedRoles: ["customer", "owner"], profileVerificationStatus: "approved", phoneVerifiedAt: new Date() });
  const customer = await User.create({ fullName: "Calendar Customer", phone: "9000000002", approvedRoles: ["customer"], profileVerificationStatus: "approved", phoneVerifiedAt: new Date() });
  const product = await Product.create({ owner: host._id, name: "Calendar Integration Mould", status: "approved", pricing: { perDayCharges: 1000, securityDeposit: 1000 } });
  const start = addDays(todayInIndia(), 1), end = addDays(start, 1);
  const app = express();
  app.use(backend("cors")({ origin: true, credentials: true }));
  app.use(express.json());
  app.use("/api/bookings", backend("./routes/bookingRoutes"));
  app.use("/api/products", backend("./routes/productRoutes"));
  app.use(backend("./middleware/errorMiddleware"));
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const api = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${api}/api/bookings`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${signAccessToken(customer._id)}` },
    body: JSON.stringify({ productId: String(product._id), startDate: start, endDate: end, paymentMethod: "owner" }),
  });
  expect(response.status).toBe(201);
  const booking = (await response.json()).data.booking;
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => { sessionStorage.setItem("splashShown", "1"); localStorage.setItem("mouldx:auth-session-present", "1"); });
  const requests = [], errors = [];
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const parsed = new URL(request.url());
    if (parsed.pathname === "/api/auth/refresh-token") return route.fulfill({ json: { success: true, data: { user: customer.toJSON(), profileVerification: null, tokens: { accessToken: signAccessToken(customer._id) } } } });
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": url, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
    requests.push({ path: parsed.pathname, method: request.method() });
    const actual = await route.fetch({ url: `${api}${parsed.pathname}${parsed.search}` });
    await route.fulfill({ response: actual });
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${url}/explore/${product.slug}/dates`);
  await expect(page.getByRole("heading", { name: "Select rental dates", exact: true })).toBeVisible();
  const label = (date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
  if (start.slice(0, 7) !== todayInIndia().slice(0, 7)) await page.getByRole("button", { name: "Next month", exact: true }).click();
  await page.getByRole("button", { name: label(start), exact: true }).click();
  if (end.slice(0, 7) !== start.slice(0, 7)) await page.getByRole("button", { name: "Next month", exact: true }).click();
  await page.getByRole("button", { name: label(end), exact: true }).click();
  const paymentReads = requests.filter((request) => request.path === "/api/bookings/payment-options").length;
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "You already have a pending request", exact: true })).toBeVisible();
  await expect(page).toHaveURL(`${url}/explore/${product.slug}/dates`);
  await expect(page.getByRole("link", { name: `View existing booking ${booking.code}`, exact: true })).toHaveAttribute("href", `/bookings/${booking._id}`);
  await expect(page.getByRole("heading", { name: "Confirm booking", exact: true })).toHaveCount(0);
  await expect(page.getByRole("radio")).toHaveCount(0);
  expect(requests.filter((request) => request.path === "/api/bookings/payment-options")).toHaveLength(paymentReads);
  expect(requests.filter((request) => request.path === "/api/bookings/pending-request")).toHaveLength(1);
  expect(requests.some((request) => request.path === "/api/bookings" && request.method === "POST")).toBe(false);
  expect(await Booking.countDocuments({ product: product._id })).toBe(1);
  await page.screenshot({ path: `${out}/real-api-pending-mobile.png`, fullPage: true });

  // A genuinely different range still passes both the preflight and checkout gate.
  await page.getByRole("button", { name: "Choose different dates", exact: true }).click();
  if (end.slice(0, 7) !== start.slice(0, 7)) await page.getByRole("button", { name: "Previous month", exact: true }).click();
  await page.getByRole("button", { name: label(start), exact: true }).click();
  const newEnd = addDays(end, 1);
  if (newEnd.slice(0, 7) !== start.slice(0, 7)) {
    await page.getByRole("button", { name: "Next month", exact: true }).click();
  }
  await page.getByRole("button", { name: label(newEnd), exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Confirm booking", exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Pay owner directly/ })).toBeVisible();
  expect(await Booking.countDocuments({ product: product._id })).toBe(1);
  expect(errors).toEqual([]);
  await context.close();
  console.log("Real API + isolated replica-set browser test passed: existing pending request blocked by calendar Continue before checkout/payment; different dates allowed; no duplicate write.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  if (repl) await repl.stop();
});
