// Real review/dashboard APIs on an isolated database; never loads .env or sends mail.
const { chromium, expect } = require("@playwright/test");
const { createRequire } = require("node:module");
const { resolve } = require("node:path");
const { once } = require("node:events");
const { mkdir } = require("node:fs/promises");
const backend = createRequire(resolve(__dirname, "../../mouldx_backend/package.json"));
process.env.NODE_ENV = "test"; process.env.JWT_SECRET = "isolated-reviews-browser-secret";
process.env.ASSET_BASE_URL = "https://mouldx-production-assets.s3.ap-south-1.amazonaws.com";
const express = backend("express"), mongoose = backend("mongoose"), jwt = backend("jsonwebtoken");
const { MongoMemoryReplSet } = backend("mongodb-memory-server");
const User = backend("./models/User"), Product = backend("./models/Product"), Booking = backend("./models/Booking"), Review = backend("./models/Review");
const { signAccessToken } = backend("./utils/jwt");
const { todayInIndia, addDays } = backend("./utils/bookingDates");
const url = process.env.BOOKING_TEST_URL || "http://localhost:3000";
const out = resolve(__dirname, "../test-results/reviews-dashboard");
let repl, server, browser, seq = 0;
const errors = [];
async function run() {
  await mkdir(out, { recursive: true });
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: "8.0.16" } });
  await mongoose.connect(repl.getUri());
  for (const model of [User, Product, Booking, Review, backend("./models/Counter"), backend("./models/Mould"), backend("./models/Category"), backend("./models/OwnerProfileVerification"), backend("./models/ProductVisit")]) await model.init();
  const makeUser = (name, roles) => User.create({ fullName: name, phone: `9300000${String(++seq).padStart(3, "0")}`, email: `${name.replaceAll(" ", "")}@example.test`, approvedRoles: roles, profileVerificationStatus: "approved", phoneVerifiedAt: new Date() });
  const host = await makeUser("Dashboard Host", ["customer", "owner"]), customer = await makeUser("Review Customer", ["customer"]);
  const Profile = backend("./models/OwnerProfileVerification");
  for (const user of [host, customer]) {
    const file = { key: `private/users/${user._id}/documents/test.pdf` };
    await Profile.create({ user: user._id, status: "approved", personalDetails: { panNumber: "ABCDE1234F", panCard: file },
      firmDetails: { name: `${user.fullName} Industries`, email: user.email, address: "Test industrial estate, Mumbai", gstNumber: "27ABCDE1234F1Z5", gstCertificate: file, msmeCertificate: file, electricityBill: file },
      payoutDetails: { bankAccountNumber: "123456789012", ifscCode: "TEST0001234", bankName: "Test Bank", accountHolderName: user.fullName }, submittedAt: new Date() });
  }
  const products = await Promise.all(Array.from({ length: 10 }, () => Product.create({ owner: host._id, name: `Dashboard Mould ${++seq}`, status: "approved", pricing: { perDayCharges: 100, securityDeposit: 1000 } })));
  await Product.updateMany({ _id: { $in: [products[8]._id, products[9]._id] } }, { $set: { availability: "maintenance" } });
  const today = todayInIndia();
  const makeBooking = (p, start, end) => Booking.create({ code: `BK-DASH-${++seq}`, host: host._id, customer: customer._id, product: p._id,
    status: "approved", startDate: start, endDate: end, snapshot: { product: { name: p.name, code: p.code, slug: p.slug },
      customer: { fullName: customer.fullName }, host: { fullName: host.fullName } }, pricing: { currency: "INR", days: 2, perDayCharges: 100, securityDeposit: 0, rentalTotal: 200, total: 200, rentalPaise: 20000 }, payment: { method: "owner", status: "unpaid" } });
  const completed = await makeBooking(products[5], addDays(today, -4), addDays(today, -1));
  const active = [];
  for (let i = 0; i < 5; i++) active.push(await makeBooking(products[i], addDays(today, -2), addDays(today, i)));
  for (let i = 0; i < 6; i++) await makeBooking(products[5], addDays(today, i + 1), addDays(today, i + 2));
  for (let i = 0; i < 12; i++) {
    const b = await makeBooking(products[5], addDays(today, -6), addDays(today, -3));
    await Review.create({ booking: b._id, product: b.product, host: host._id, customer: customer._id, author: customer._id, type: "product", rating: i % 2 ? 4 : 5, comment: `Historical product review ${i}` });
  }
  const app = express(); app.use(backend("cors")({ origin: true, credentials: true })); app.use(express.json()); app.use(backend("cookie-parser")());
  app.use("/api", backend("./routes")); app.use(backend("./middleware/errorMiddleware"));
  server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const api = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
  async function actor(user, role) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript((mode) => { sessionStorage.setItem("splashShown", "1"); localStorage.setItem("mouldx:auth-session-present", "1"); localStorage.setItem("mouldx_active_role", mode); }, role);
    let refreshCount = 0;
    await context.route("**/api/**", async (route) => {
      const req = route.request(), parsed = new URL(req.url());
      if (parsed.pathname === "/api/auth/refresh-token") {
        refreshCount++;
        // Bootstrap an expired access token to exercise a real backend 401 and
        // the shared refresh interceptor, rather than bypassing authentication.
        const accessToken = refreshCount === 1 ? jwt.sign({ id: String(user._id), purpose: "access" }, process.env.JWT_SECRET, { expiresIn: -1 }) : signAccessToken(user._id);
        return route.fulfill({ json: { success: true, data: { user: user.toJSON(), tokens: { accessToken } } } });
      }
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": url, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "Content-Type, Authorization, Cache-Control" } });
      return route.fulfill({ response: await route.fetch({ url: `${api}${parsed.pathname}${parsed.search}` }) });
    });
    const page = await context.newPage(); page.setDefaultTimeout(20000); page.on("pageerror", (error) => errors.push(error.message));
    return { page, context, refreshCount: () => refreshCount };
  }
  const renter = await actor(customer, "customer"), owner = await actor(host, "owner");
  const customerPage = renter.page, hostPage = owner.page;
  await customerPage.goto(`${url}/bookings/${completed._id}`);
  await customerPage.getByRole("button", { name: "Write a review", exact: true }).click();
  await customerPage.getByRole("button", { name: "4 stars", exact: true }).click();
  await customerPage.getByLabel("Your review", { exact: true }).fill("The mould worked well throughout the rental.");
  await customerPage.getByRole("button", { name: "Submit review", exact: true }).click();
  await expect(customerPage.getByText("The mould worked well throughout the rental.", { exact: true })).toBeVisible();
  await expect(customerPage.getByRole("button", { name: "Write a review", exact: true })).toHaveCount(0);
  expect(renter.refreshCount()).toBe(2);
  await hostPage.goto(`${url}/`);
  await expect(hostPage.getByText("TOTAL EARNINGS", { exact: true })).toBeVisible();
  await expect(hostPage.getByRole("progressbar", { name: "Mould utilization" })).toHaveAttribute("aria-valuenow", "50");
  expect(owner.refreshCount()).toBe(2);
  await expect(hostPage.locator('a[href^="/owner/bookings/"]')).toHaveCount(8);
  await expect(hostPage.getByText("Based on 13 reviews", { exact: true })).toBeVisible();
  for (const width of [320, 390, 1440]) {
    await hostPage.setViewportSize({ width, height: 900 });
    expect(await hostPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
    await hostPage.screenshot({ path: `${out}/dashboard-${width}.png`, fullPage: true });
  }
  await hostPage.setViewportSize({ width: 390, height: 844 });
  await hostPage.getByRole("link", { name: /Rented/ }).click();
  await expect(hostPage).toHaveURL(/status=rented/);
  await expect(hostPage.locator('h3 a[href^="/owner/moulds/"]')).toHaveCount(5);
  await hostPage.goto(`${url}/owner/reviews`);
  const card = hostPage.locator("article").filter({ hasText: "The mould worked well throughout the rental." });
  await card.getByRole("button", { name: "Reply to review", exact: true }).click();
  await card.getByLabel("Reply to review", { exact: true }).fill("Thank you for taking care of the mould.");
  await card.getByRole("button", { name: "Save reply", exact: true }).click();
  await expect(card.getByText("Thank you for taking care of the mould.", { exact: true })).toBeVisible();
  const sentinel = hostPage.getByRole("button", { name: "Load more reviews", exact: true });
  if (await sentinel.count()) await sentinel.scrollIntoViewIfNeeded();
  await expect(hostPage.locator("article")).toHaveCount(13);
  await hostPage.screenshot({ path: `${out}/host-reviews-390.png`, fullPage: true });
  await hostPage.goto(`${url}/owner/bookings/${completed._id}`);
  await hostPage.getByRole("button", { name: "Review customer", exact: true }).click();
  await hostPage.getByRole("button", { name: "5 stars", exact: true }).click();
  await hostPage.getByLabel("Your review", { exact: true }).fill("A careful customer who returned the mould on time.");
  await hostPage.getByRole("button", { name: "Submit review", exact: true }).click();
  await expect(hostPage.getByText("A careful customer who returned the mould on time.", { exact: true })).toBeVisible();
  await customerPage.reload();
  await expect(customerPage.getByText("Thank you for taking care of the mould.", { exact: true })).toBeVisible();
  await expect(customerPage.getByRole("button", { name: /Reply/ })).toHaveCount(0);
  await customerPage.screenshot({ path: `${out}/customer-booking-reviews-390.png`, fullPage: true });
  await hostPage.goto(`${url}/owner/profile`);
  await expect(hostPage).toHaveURL(`${url}/profile`);
  await expect(hostPage.getByRole("heading", { name: "Your Rating as a Customer", exact: true })).toBeVisible();
  await expect(hostPage.getByRole("link", { name: "Moulds", exact: true })).toBeVisible();
  await expect(hostPage.getByText("No reviews yet", { exact: true })).toBeVisible();
  await expect(hostPage.getByText("Dashboard Host Industries", { exact: true })).toBeVisible();
  await expect(hostPage.getByText("•••• 9012", { exact: true })).toBeVisible();
  await expect(hostPage.getByRole("button", { name: "GST Certificate ↗", exact: true })).toBeEnabled();
  await hostPage.screenshot({ path: `${out}/host-profile-390.png`, fullPage: true });
  // A temporary refresh/server failure should show a retry without discarding
  // an established session. Normal permission errors must also stay local.
  const profilePath = "**/api/user/profile";
  const refreshPath = "**/api/auth/refresh-token";
  const expiredOnce = (route) => route.fulfill({ status: 401, json: { success: false, message: "Access token expired" } });
  const unavailableOnce = (route) => route.fulfill({ status: 503, json: { success: false, message: "Session service is temporarily unavailable" } });
  await owner.context.route(profilePath, expiredOnce); await owner.context.route(refreshPath, unavailableOnce);
  await hostPage.getByRole("button", { name: "Refresh profile", exact: true }).click();
  await expect(hostPage.getByText("Session service is temporarily unavailable", { exact: true })).toBeVisible();
  await expect(hostPage.getByText("Host Mode", { exact: true })).toBeVisible();
  expect(await hostPage.evaluate(() => localStorage.getItem("mouldx:auth-session-present"))).toBe("1");
  await owner.context.unroute(profilePath, expiredOnce); await owner.context.unroute(refreshPath, unavailableOnce);
  await hostPage.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(hostPage.getByText("Dashboard Host Industries", { exact: true })).toBeVisible();
  await customerPage.goto(`${url}/profile`);
  await expect(customerPage.getByText("Based on 1 review", { exact: true })).toBeVisible();
  await expect(customerPage.getByRole("link", { name: "Moulds", exact: true })).toHaveCount(0);
  await expect(customerPage.getByText("A careful customer who returned the mould on time.", { exact: true })).toBeVisible();
  for (const width of [320, 390, 1440]) {
    await customerPage.setViewportSize({ width, height: 900 });
    expect(await customerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
    await customerPage.screenshot({ path: `${out}/customer-profile-${width}.png`, fullPage: true });
  }
  await customerPage.setViewportSize({ width: 390, height: 844 });
  await customerPage.goto(`${url}/bookings/${active[0]._id}`);
  await expect(customerPage.getByRole("button", { name: "Write a review", exact: true })).toHaveCount(0);
  await customerPage.goto(`${url}/explore/${products[5].slug}`);
  await expect(customerPage.getByText("The mould worked well throughout the rental.", { exact: true })).toBeVisible();
  const maintenance = await fetch(`${api}/api/owner/products/${products[5]._id}/availability`, { method: "PATCH", headers: { Authorization: `Bearer ${signAccessToken(host._id)}`, "Content-Type": "application/json" }, body: JSON.stringify({ availability: "maintenance" }) });
  expect(maintenance.status).toBe(200);
  await customerPage.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(customerPage.getByText("Under maintenance", { exact: true })).toBeVisible();
  await expect(customerPage.getByRole("link", { name: "Select Dates" })).toHaveCount(0);
  await customerPage.goto(`${url}/explore/${products[5].slug}/dates`);
  await expect(customerPage.getByRole("heading", { name: "Booking is currently unavailable" })).toBeVisible();
  await customerPage.screenshot({ path: `${out}/dates-error-390.png`, fullPage: true });
  const rejectedRefresh = (route) => route.fulfill({ status: 401, json: { success: false, message: "Refresh token is invalid or expired" } });
  await owner.context.route(profilePath, expiredOnce); await owner.context.route(refreshPath, rejectedRefresh);
  await hostPage.getByRole("button", { name: "Refresh profile", exact: true }).click();
  await expect(hostPage).toHaveURL(/\/login(?:\?|$)/);
  expect(await hostPage.evaluate(() => localStorage.getItem("mouldx:auth-session-present"))).toBeNull();
  await expect(hostPage.getByText("Host Mode", { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
  console.log("Review/dashboard browser passed: expired-token refresh, completed booking reviews, host replies, customer ratings, infinite scroll, common profile, live maintenance and responsive dashboard.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) { for (const context of browser.contexts()) await context.unrouteAll({ behavior: "wait" }); await browser.close(); }
  if (server) await new Promise((resolve) => server.close(resolve)); await mongoose.disconnect(); if (repl) await repl.stop();
});
