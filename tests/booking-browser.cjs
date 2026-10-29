// Isolated browser/API smoke test. Never loads .env or connects to the user's DB.
const { chromium, expect } = require("@playwright/test");
const { createRequire } = require("node:module");
const { resolve } = require("node:path");
const { mkdir } = require("node:fs/promises");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const net = require("node:net");
const backend = createRequire(resolve(__dirname, "../../mouldx_backend/package.json"));
const express = backend("express");
const mongoose = backend("mongoose");
const { MongoMemoryReplSet } = backend("mongodb-memory-server");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "isolated-browser-test-secret";
const User = backend("./models/User");
const Product = backend("./models/Product");
const Profile = backend("./models/OwnerProfileVerification");
const Booking = backend("./models/Booking");
const Media = backend("./models/Media");
const { signAccessToken } = backend("./utils/jwt");
const { todayInIndia, addDays } = backend("./utils/bookingDates");
const out = resolve(__dirname, "../test-results/bookings");
let repl, server, next, browser;
const errors = [];
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function freePort() {
  const socket = net.createServer().listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = socket.address().port;
  await new Promise((r) => socket.close(r));
  return port;
}
async function run() {
  await mkdir(out, { recursive: true });
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: "8.0.16" } });
  await mongoose.connect(repl.getUri());
  for (const model of [User, Product, Profile, Booking, Media, backend("./models/BookingEmail"), backend("./models/Category"), backend("./models/Mould"), backend("./models/Counter"), backend("./models/Conversation"), backend("./models/ChatMessage"), backend("./models/ConversationRead")]) await model.init();
  const host = await User.create({ fullName: "Smoke Host", phone: "9000000001", email: "host@example.test", approvedRoles: ["customer", "owner"], profileVerificationStatus: "approved", phoneVerifiedAt: new Date() });
  const customer = await User.create({ fullName: "Smoke Customer", phone: "9000000002", email: "customer@example.test", approvedRoles: ["customer"], profileVerificationStatus: "approved", phoneVerifiedAt: new Date() });
  const admin = await User.create({ fullName: "Smoke Admin", phone: "9000000003", email: "admin@example.test", approvedRoles: ["admin"], phoneVerifiedAt: new Date() });
  const other = await User.create({ fullName: "Other Customer", phone: "9000000004", email: "other@example.test", approvedRoles: ["customer"], profileVerificationStatus: "approved", phoneVerifiedAt: new Date() });
  const unverified = await User.create({ fullName: "Unverified Customer", phone: "9000000005", approvedRoles: ["customer"], profileVerificationStatus: "in_review", phoneVerifiedAt: new Date() });
  const file = { key: "private/users/test/documents/kyc.pdf" };
  await Profile.create({ user: host._id, status: "approved", personalDetails: { panNumber: "ABCDE1234F" }, firmDetails: { name: "Smoke Firm", email: "firm@example.test", address: "Test address", gstNumber: "TESTGST", gstCertificate: file, msmeCertificate: file, electricityBill: file }, payoutDetails: { bankAccountNumber: "123456789", ifscCode: "TEST0001234", accountHolderName: host.fullName, bankName: "Test Bank", upiId: "host@testbank" } });
  const media = await Media.create({ owner: host._id, key: `public/users/${host._id}/products/test.webp`, visibility: "public", kind: "image", mimeType: "image/webp", status: "ready", attachedAt: new Date() });
  const product = await Product.create({ owner: host._id, name: "Booking Test Product", status: "approved", pricing: { perDayCharges: 1250, securityDeposit: 2000 }, images: [media._id] });
  const secondProduct = await Product.create({ owner: host._id, name: "UPI Booking Product", status: "approved", pricing: { perDayCharges: 500, securityDeposit: 1000 } });
  const app = express();
  app.use(backend("cors")({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(backend("cookie-parser")());
  app.use("/assets", (_req, res) => res.sendFile(resolve(__dirname, "../public/images/mould-and-chair.webp")));
  app.use("/api", backend("./routes"));
  app.use(backend("./middleware/errorMiddleware"));
  server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const api = `http://127.0.0.1:${server.address().port}/api`;
  process.env.ASSET_BASE_URL = `http://127.0.0.1:${server.address().port}/assets`;
  const port = await freePort();
  const url = `http://127.0.0.1:${port}`;
  next = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--port", String(port), "--hostname", "127.0.0.1"], {
    cwd: resolve(__dirname, ".."), stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "development", NEXT_PUBLIC_API_BASE_URL: api },
  });
  let serverLog = "";
  next.stdout.on("data", (d) => { serverLog += d; }); next.stderr.on("data", (d) => { serverLog += d; });
  for (let i = 0; i < 90; i++) {
    if (next.exitCode !== null) throw new Error(serverLog);
    try { if ((await fetch(`${url}/login`)).ok) break; } catch {}
    await pause(1000);
    if (i === 89) throw new Error(`Next failed to start: ${serverLog}`);
  }
  browser = await chromium.launch();
  async function actor(user, viewport = { width: 390, height: 844 }) {
    const context = await browser.newContext({ viewport });
    await context.addInitScript((hasUser) => { sessionStorage.setItem("splashShown", "1"); if (hasUser) localStorage.setItem("mouldx:auth-session-present", "1"); }, Boolean(user));
    if (user) await context.route("**/api/auth/refresh-token", (route) => route.fulfill({ json: { success: true, data: { user: user.toJSON(), tokens: { accessToken: signAccessToken(user._id) } } } }));
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.setDefaultTimeout(20000);
    return page;
  }
  const start = addDays(todayInIndia(), 1), end = addDays(start, 1);
  const renter = await actor(customer);
  await renter.goto(`${url}/explore/${secondProduct.slug}`);
  const selectDates = renter.getByRole("link", { name: "Select Dates" });
  await expect(selectDates).toBeVisible();
  for (const viewport of [{ width: 320, height: 740 }, { width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await renter.setViewportSize(viewport);
    const selectDatesBox = await selectDates.boundingBox();
    const bottomNavBox = await renter.getByRole("navigation").filter({ has: renter.getByRole("link", { name: "Booking", exact: true }) }).boundingBox();
    expect(selectDatesBox.y + selectDatesBox.height).toBeLessThanOrEqual(bottomNavBox.y);
    expect(await selectDates.evaluate((link) => {
      const rect = link.getBoundingClientRect();
      return link.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    })).toBeTruthy();
    expect(await renter.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  }
  await renter.screenshot({ path: `${out}/mobile-product-booking-action.png`, fullPage: true });
  await selectDates.click();
  await expect(renter).toHaveURL(`${url}/explore/${secondProduct.slug}/dates`);
  await expect(renter.getByRole("heading", { name: "Select rental dates" })).toBeVisible();
  await renter.goto(`${url}/explore/${product.slug}/dates`);
  await expect(renter.getByRole("heading", { name: "Select rental dates" })).toBeVisible();
  const dayLabel = (day) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
  if (start.slice(0, 7) !== todayInIndia().slice(0, 7)) await renter.getByRole("button", { name: "Next month" }).click();
  await renter.getByRole("button", { name: dayLabel(start), exact: true }).click();
  if (end.slice(0, 7) !== start.slice(0, 7)) await renter.getByRole("button", { name: "Next month" }).click();
  await renter.getByRole("button", { name: dayLabel(end), exact: true }).click();
  await expect(renter.getByRole("button", { name: "Continue", exact: true })).toBeEnabled();
  await renter.screenshot({ path: `${out}/mobile-dates.png`, fullPage: true });
  await renter.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(renter.getByRole("heading", { name: "Confirm booking" })).toBeVisible();
  await expect(renter.getByRole("radio", { name: /Pay through MouldX/ })).toBeDisabled();
  await expect(renter.getByText("Security deposit", { exact: true })).toHaveCount(0);
  await expect(renter.getByText("₹2,500.00", { exact: true })).toHaveCount(2);
  await renter.getByRole("checkbox").check();
  await renter.screenshot({ path: `${out}/mobile-confirm.png`, fullPage: true });
  await renter.getByRole("button", { name: "Send for approval" }).click();
  await expect(renter.getByText("Request submitted. Dates are not reserved until admin approval.")).toBeVisible();
  const bookingId = renter.url().split("/").at(-1);
  await expect(renter.locator("article")).not.toContainText(host.fullName);
  await expect(renter.locator("article")).not.toContainText(customer.fullName);
  await expect(renter.getByRole("heading", { name: "Customer and host" })).toHaveCount(0);
  await expect(renter.locator("article").getByText("Security deposit", { exact: true })).toHaveCount(0);
  await renter.screenshot({ path: `${out}/mobile-booking.png`, fullPage: true });
  await expect(renter.locator("article img").first()).toBeVisible();
  const imageLoaded = await renter.locator("article img").first().evaluate((img) => img.complete && img.naturalWidth > 0);
  expect(imageLoaded).toBeTruthy();
  // A second customer may request identical dates while the first is pending.
  const response = await fetch(`${api}/bookings`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${signAccessToken(other._id)}` }, body: JSON.stringify({ productId: String(product._id), startDate: start, endDate: end, paymentMethod: "owner" }) });
  expect(response.status).toBe(201);
  const competing = (await response.json()).data.booking;
  const reviewer = await actor(admin, { width: 1440, height: 1000 });
  await reviewer.goto(`${url}/admin/bookings/${bookingId}`);
  await expect(reviewer.getByRole("heading", { name: "Customer and host" })).toBeVisible();
  await expect(reviewer.getByText(customer.email, { exact: true })).toBeVisible();
  await reviewer.screenshot({ path: `${out}/desktop-admin-review.png`, fullPage: true });
  await reviewer.getByRole("button", { name: "Approve", exact: true }).click();
  await reviewer.getByRole("button", { name: "Confirm decision" }).click();
  await expect(reviewer.getByText(/^Booking confirmed for/)).toBeVisible();
  await reviewer.goto(`${url}/admin/bookings/${competing._id}`);
  await reviewer.getByRole("button", { name: "Approve", exact: true }).click();
  await reviewer.getByRole("button", { name: "Confirm decision" }).click();
  await expect(reviewer.getByRole("link", { name: /Open conflicting booking/ })).toBeVisible();
  await reviewer.screenshot({ path: `${out}/desktop-conflict.png`, fullPage: true });
  await reviewer.getByRole("button", { name: "Cancel", exact: true }).click();
  await reviewer.getByLabel("Rejection reason").fill("Dates already reserved by another approved booking.");
  await reviewer.getByRole("button", { name: "Reject", exact: true }).click();
  await reviewer.getByRole("button", { name: "Confirm decision" }).click();
  await expect(reviewer.getByText("Booking rejected", { exact: true })).toBeVisible();
  await reviewer.goto(`${url}/admin/bookings`);
  await expect(reviewer.getByRole("heading", { name: "Booking approvals" })).toBeVisible();
  await reviewer.getByLabel("Search bookings").fill("Booking Test");
  await expect(reviewer.getByRole("table").locator("tbody tr")).toHaveCount(2);
  await reviewer.getByRole("button", { name: "Approved bookings", exact: true }).click();
  await expect(reviewer.getByRole("table").locator("tbody tr")).toHaveCount(1);
  await expect(reviewer.getByRole("button", { name: "Approved bookings", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(reviewer.getByRole("button", { name: "All bookings", exact: true })).toContainText("2");
  await reviewer.getByRole("button", { name: "Rejected bookings", exact: true }).click();
  await expect(reviewer.getByRole("table").locator("tbody tr")).toHaveCount(1);
  await reviewer.getByRole("button", { name: "All bookings", exact: true }).click();
  await expect(reviewer.getByRole("table").locator("tbody tr")).toHaveCount(2);
  await expect(reviewer.getByRole("combobox")).toHaveCount(0);
  await reviewer.screenshot({ path: `${out}/desktop-admin-list.png`, fullPage: true });
  // QR generation is entirely local; reporting a reference is not charging money.
  await renter.goto(`${url}/explore/${secondProduct.slug}/confirm?startDate=${start}&endDate=${end}`);
  await renter.getByRole("radio", { name: /Pay host by UPI/ }).check();
  await expect(renter.getByText("Security deposit", { exact: true })).toHaveCount(0);
  await expect(renter.getByText("₹1,000.00", { exact: true })).toHaveCount(3);
  await expect(renter.locator("svg title", { hasText: /Pay Smoke Host by UPI/ })).toHaveCount(1);
  await renter.getByLabel("UPI transaction reference", { exact: true }).fill("SMOKE123456789");
  await renter.getByRole("checkbox").check();
  await expect(renter.getByRole("button", { name: "Send for approval" })).toBeEnabled();
  await renter.screenshot({ path: `${out}/mobile-upi.png`, fullPage: true });
  await Profile.updateOne({ user: host._id }, { $set: { "payoutDetails.upiId": "changed@testbank" } });
  await renter.getByRole("button", { name: "Send for approval" }).click();
  await expect(renter.getByRole("alert").filter({ hasText: "The host's UPI details have changed" })).toBeVisible();
  await expect(renter.getByRole("button", { name: "Send for approval" })).toBeDisabled();
  await expect(renter.getByRole("link", { name: "Contact support", exact: true })).toBeVisible();
  expect(await Booking.countDocuments({ product: secondProduct._id })).toBe(0);
  await Profile.updateOne({ user: host._id }, { $set: { "payoutDetails.upiId": "host@testbank" } });
  await renter.reload();
  await renter.getByRole("radio", { name: /Pay host by UPI/ }).check();
  await renter.getByLabel("UPI transaction reference", { exact: true }).fill("SMOKE123456789");
  await renter.getByRole("checkbox").check();
  const upiRequest = renter.waitForRequest((request) => request.url().endsWith("/api/bookings") && request.method() === "POST");
  await renter.getByRole("button", { name: "Send for approval" }).click();
  expect((await upiRequest).postDataJSON().expectedUpiId).toBe("host@testbank");
  await expect(renter.getByText("Reported, not verified", { exact: true })).toBeVisible();
  const pendingBookingId = renter.url().split("/").at(-1);
  await renter.goto(`${url}/bookings`);
  await expect(renter.getByRole("button", { name: "All bookings", exact: true })).toContainText("2");
  await expect(renter.locator('a[href^="/bookings/"]')).toHaveCount(2);
  await renter.getByRole("button", { name: "Pending bookings", exact: true }).click();
  await expect(renter.locator('a[href^="/bookings/"]')).toHaveCount(1);
  await expect(renter.getByRole("button", { name: "All bookings", exact: true })).toContainText("2");
  await renter.getByRole("button", { name: "Rejected bookings", exact: true }).click();
  await expect(renter.getByRole("heading", { name: "No bookings found" })).toBeVisible();
  await renter.getByRole("button", { name: "All bookings", exact: true }).click();
  await expect(renter.locator('a[href^="/bookings/"]')).toHaveCount(2);
  await renter.screenshot({ path: `${out}/mobile-customer-list.png`, fullPage: true });
  await renter.goto(`${url}/explore/${product.slug}/dates`);
  await expect(renter.getByRole("button", { name: `${dayLabel(start)}, unavailable`, exact: true })).toBeDisabled();
  const hostPage = await actor(host);
  await hostPage.goto(`${url}/owner/bookings`);
  await expect(hostPage.getByRole("heading", { name: "Host bookings" })).toBeVisible();
  await expect(hostPage.getByRole("button", { name: "Upcoming bookings", exact: true })).toContainText("1");
  await expect(hostPage.getByRole("button", { name: "Pending bookings", exact: true })).toHaveCount(0);
  await hostPage.screenshot({ path: `${out}/mobile-host-list.png`, fullPage: true });
  await hostPage.goto(`${url}/owner/bookings/${bookingId}`);
  await expect(hostPage.getByText(/^Booking confirmed for/)).toBeVisible();
  await expect(hostPage.locator("article")).not.toContainText(customer.fullName);
  await expect(hostPage.locator("article")).not.toContainText(customer.email);
  await expect(hostPage.getByRole("heading", { name: "Customer and host" })).toHaveCount(0);
  await hostPage.screenshot({ path: `${out}/mobile-host-detail.png`, fullPage: true });
  await hostPage.goto(`${url}/explore/${product.slug}/dates`);
  await expect(hostPage.getByText("You cannot book your own product", { exact: true })).toBeVisible();
  const waiting = await actor(unverified);
  await waiting.goto(`${url}/explore/${product.slug}/dates`);
  await expect(waiting.getByRole("heading", { name: "Profile approval required" })).toBeVisible();
  const guest = await actor(null);
  await guest.goto(`${url}/explore/${secondProduct.slug}`);
  await guest.getByRole("link", { name: "Select Dates" }).click();
  await expect(guest.getByRole("heading", { name: "Sign in to book a product" })).toBeVisible();
  await guest.getByRole("link", { name: "Log in", exact: true }).click();
  await guest.getByLabel("Phone Number").fill(customer.phone);
  const otpResponse = guest.waitForResponse((response) => response.url().endsWith("/auth/login/request-otp") && response.request().method() === "POST");
  await guest.getByRole("button", { name: "Continue with OTP" }).click();
  const otp = (await (await otpResponse).json()).data.devOtp;
  expect(otp).toMatch(/^\d{6}$/);
  await expect(guest.getByRole("heading", { name: "Verify OTP" })).toBeVisible();
  for (let i = 0; i < 6; i++) await guest.locator("input").nth(i).fill(otp[i]);
  await guest.getByRole("button", { name: "Verify & Continue" }).click();
  await expect(guest).toHaveURL(`${url}/explore/${secondProduct.slug}/dates`);
  await expect(guest.getByRole("heading", { name: "Select rental dates" })).toBeVisible();
  for (const viewport of [{ width: 320, height: 740 }, { width: 1440, height: 1000 }]) {
    await renter.setViewportSize(viewport);
    await renter.goto(`${url}/bookings`);
    await expect(renter.getByRole("button", { name: "All bookings", exact: true })).toContainText("2");
    expect(await renter.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
    await renter.screenshot({ path: `${out}/customer-list-${viewport.width}.png`, fullPage: true });
    await renter.goto(`${url}/bookings/${bookingId}`);
    await expect(renter.getByText(/^Booking confirmed for/)).toBeVisible();
    const bookingHeading = renter.getByRole("heading", { name: /^BK-/ });
    expect(await bookingHeading.evaluate((heading) => heading.getBoundingClientRect().height < 40)).toBeTruthy();
    expect(await renter.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
    await renter.screenshot({ path: `${out}/customer-detail-${viewport.width}.png`, fullPage: true });
    await reviewer.setViewportSize(viewport);
    await reviewer.goto(`${url}/admin/bookings/${bookingId}`);
    await expect(reviewer.getByRole("heading", { name: "Customer and host" })).toBeVisible();
    expect(await reviewer.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
    await reviewer.screenshot({ path: `${out}/admin-detail-${viewport.width}.png`, fullPage: true });
  }
  // Seed additional isolated records to exercise infinite scrolling and resets.
  const original = (await Booking.findById(bookingId)).toObject();
  const { _id, __v, createdAt, updatedAt, ...seed } = original;
  void _id; void __v; void createdAt; void updatedAt;
  await Booking.insertMany(Array.from({ length: 13 }, (_, i) => ({
    ...seed, code: `BK-SMOKE-${i + 1}`, status: "pending", reviewedAt: undefined, reviewedBy: undefined,
    startDate: addDays(start, 10 + i * 7), endDate: addDays(end, 10 + i * 7),
    snapshot: { ...seed.snapshot, product: { ...seed.snapshot.product, name: `Additional rental ${i + 1}` } },
    history: [{ action: "requested", at: new Date(), by: customer._id }],
  })));
  await renter.setViewportSize({ width: 390, height: 844 });
  let failNextPage = true;
  let continuationRequests = 0;
  await renter.route("**/api/bookings?*", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get("page") === "2" && !params.get("status") && !params.get("search")) {
      continuationRequests++;
      if (failNextPage) {
        failNextPage = false;
        return route.fulfill({ status: 500, json: { success: false, message: "Temporary booking-list failure" } });
      }
    }
    return route.continue();
  });
  await renter.goto(`${url}/bookings`);
  await expect(renter.getByRole("button", { name: "All bookings", exact: true })).toContainText("15");
  await expect(renter.locator('a[href^="/bookings/"]')).toHaveCount(12);
  await expect(renter.getByRole("button", { name: "Next page", exact: true })).toHaveCount(0);
  await renter.getByText("12 of 15 bookings", { exact: true }).scrollIntoViewIfNeeded();
  await expect(renter.getByRole("alert").filter({ hasText: "Temporary booking-list failure" })).toBeVisible();
  await expect(renter.locator('a[href^="/bookings/"]')).toHaveCount(12);
  expect(continuationRequests).toBe(1);
  await renter.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(renter.locator('a[href^="/bookings/"]')).toHaveCount(15);
  expect(continuationRequests).toBe(2);
  const bookingLinks = await renter.locator('a[href^="/bookings/"]').evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(new Set(bookingLinks).size).toBe(15);
  await renter.getByText("15 of 15 bookings", { exact: true }).scrollIntoViewIfNeeded();
  await renter.screenshot({ path: `${out}/mobile-infinite-scroll.png` });
  await renter.getByRole("button", { name: "Approved bookings", exact: true }).click();
  await expect(renter.locator('a[href^="/bookings/"]')).toHaveCount(1);
  await expect(renter.getByText("1 of 1 bookings", { exact: true })).toBeVisible();
  await expect(renter.getByRole("button", { name: "All bookings", exact: true })).toContainText("15");
  await renter.getByRole("button", { name: "All bookings", exact: true }).click();
  await expect(renter.locator('a[href^="/bookings/"]')).toHaveCount(12);
  await renter.getByText("12 of 15 bookings", { exact: true }).scrollIntoViewIfNeeded();
  await expect(renter.locator('a[href^="/bookings/"]')).toHaveCount(15);
  const searchRequests = [];
  renter.on("request", (request) => {
    const requestedUrl = new URL(request.url());
    if (requestedUrl.pathname === "/api/bookings" && requestedUrl.searchParams.get("search")) searchRequests.push(requestedUrl);
  });
  await renter.getByLabel("Search bookings").pressSequentially(product.name, { delay: 20 });
  expect(searchRequests).toHaveLength(0);
  await expect(renter.locator('a[href^="/bookings/"]')).toHaveCount(1);
  expect(searchRequests).toHaveLength(1);
  expect(searchRequests[0].searchParams.get("search")).toBe(product.name);
  expect(searchRequests[0].searchParams.get("page")).toBe("1");
  await expect(renter.getByText("1 of 1 bookings", { exact: true })).toBeVisible();
  await require("./chat-browser.cjs")({ url, api, renter, reviewer, hostPage, customer, host, admin, bookingId, pendingBookingId, product, backend, out });
  for (const page of [renter, reviewer, hostPage, waiting, guest]) expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  expect(errors).toEqual([]);
  console.log(`Booking and chat browser smoke passed. Screenshots: ${out}`);
}
run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (next && next.exitCode === null) { const stopped = once(next, "exit"); next.kill("SIGTERM"); await stopped; }
  if (server) await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  if (repl) await repl.stop();
});
