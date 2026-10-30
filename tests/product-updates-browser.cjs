// End-to-end product revisions and maintenance against an isolated real API/database.
const { chromium, expect } = require("@playwright/test");
const { createRequire } = require("node:module");
const { resolve } = require("node:path");
const { once } = require("node:events");
const { mkdir } = require("node:fs/promises");
const backend = createRequire(resolve(__dirname, "../../mouldx_backend/package.json"));
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "isolated-product-revision-browser-secret";
process.env.ASSET_BASE_URL = "https://mouldx-production-assets.s3.ap-south-1.amazonaws.com";
const express = backend("express");
const mongoose = backend("mongoose");
const { MongoMemoryReplSet } = backend("mongodb-memory-server");
const { mock } = require("node:test");
const notifications = backend("./services/notificationService");
for (const name of ["sendAdminProductSubmitted", "sendProductReviewed"]) mock.method(notifications, name, async () => ({ provider: "test" }));
const User = backend("./models/User");
const Product = backend("./models/Product");
const Media = backend("./models/Media");
const Category = backend("./models/Category");
const Booking = backend("./models/Booking");
const { signAccessToken } = backend("./utils/jwt");
const { todayInIndia, addDays } = backend("./utils/bookingDates");
const url = process.env.BOOKING_TEST_URL || "http://localhost:3000";
const out = resolve(__dirname, "../test-results/product-updates");
let repl, server, browser;

async function run() {
  await mkdir(out, { recursive: true });
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: "8.0.16" } });
  await mongoose.connect(repl.getUri());
  for (const model of [User, Product, Media, Category, Booking, backend("./models/Mould"), backend("./models/Counter"), backend("./models/BookingEmail"), backend("./models/OwnerProfileVerification"), backend("./models/ProductVisit")]) await model.init();
  const makeUser = (name, phone, roles) => User.create({ fullName: name, phone, email: `${name.toLowerCase()}@example.test`, approvedRoles: roles, profileVerificationStatus: "approved", phoneVerifiedAt: new Date() });
  const host = await makeUser("Host", "9000000001", ["customer", "owner"]);
  const customer = await makeUser("Customer", "9000000002", ["customer"]);
  const admin = await makeUser("Admin", "9000000003", ["admin"]);
  const category = await Category.create({ title: "Industrial Moulds", description: "Product revision tests", isActive: true });
  const media = await Media.create({ owner: host._id, key: `public/users/${host._id}/products/original.webp`, visibility: "public", kind: "image", mimeType: "image/webp", status: "ready" });
  const app = express();
  app.use(backend("cors")({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(backend("cookie-parser")());
  app.use("/api", backend("./routes"));
  app.use(backend("./middleware/errorMiddleware"));
  server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const api = `http://127.0.0.1:${server.address().port}`;
  async function request(path, user, method = "GET", body) {
    const response = await fetch(`${api}/api${path}`, { method,
      headers: { "Content-Type": "application/json", ...(user ? { Authorization: `Bearer ${signAccessToken(user._id)}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  }
  const payload = {
    name: "Original Product", categoryId: String(category._id), imageIds: [String(media._id)],
    dimensions: { length: 100, breadth: 80, height: 60 }, weight: 100, material: "Steel", surfaceFinish: "Matte",
    pricing: { perDayCharges: 1000, securityDeposit: 2000 }, componentCount: 1, submit: true,
    moulds: [{ mouldNameOrId: "Original Mould", mouldType: "Injection", yearOfManufacturing: 2020,
      dimensions: { length: 100, breadth: 80, height: 60 }, weight: 100, cavities: 2,
      expectedCycleTime: 30, recommendedMachineTonnage: 100, runnerType: "Hot Runner", changeableBrandLogo: false,
      imageIds: [String(media._id)], videoIds: [],
    }],
  };
  const created = await request("/owner/products", host, "POST", payload);
  expect(created.status, JSON.stringify(created.body)).toBe(201);
  const id = created.body.data.product._id;
  expect((await request(`/admin/products/${id}/review`, admin, "PATCH", { status: "approved" })).status).toBe(200);
  const slug = (await request(`/owner/products/${id}`, host)).body.data.product.slug;
  const start = addDays(todayInIndia(), 30), end = addDays(start, 1);
  browser = await chromium.launch();
  const errors = [];
  async function actor(user, width = 390) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript((signedIn) => { sessionStorage.setItem("splashShown", "1"); if (signedIn) localStorage.setItem("mouldx:auth-session-present", "1"); }, Boolean(user));
    await context.route("**/_next/image?*", (route) => new URL(route.request().url()).searchParams.get("url")?.startsWith("https:")
      ? route.fulfill({ path: resolve(__dirname, "../public/images/mould-and-chair.webp"), contentType: "image/webp" }) : route.continue());
    await context.route("https://mouldx-production-assets.s3.ap-south-1.amazonaws.com/**", (route) => route.fulfill({ path: resolve(__dirname, "../public/images/mould-and-chair.webp"), contentType: "image/webp" }));
    await context.route("**/api/**", async (route) => {
      const req = route.request(); const parsed = new URL(req.url());
      if (parsed.pathname === "/api/auth/refresh-token" && user) return route.fulfill({ json: { success: true, data: { user: user.toJSON(), profileVerification: null, tokens: { accessToken: signAccessToken(user._id) } } } });
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": url, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
      await route.fulfill({ response: await route.fetch({ url: `${api}${parsed.pathname}${parsed.search}` }) });
    });
    const page = await context.newPage(); page.setDefaultTimeout(20000);
    page.on("pageerror", (error) => errors.push(error.message));
    return page;
  }
  const ownerPage = await actor(host);
  const publicPage = await actor(customer);
  const adminPage = await actor(admin, 1440);
  const originalPublic = async () => {
    const response = await request(`/products/${slug}`);
    expect(response.status).toBe(200);
    expect(response.body.data.product.name).toBe("Original Product");
    expect(response.body.data.product.pricing.perDayCharges).toBe(1000);
    expect(response.body.data.moulds[0].mouldNameOrId).toBe("Original Mould");
    expect(JSON.stringify(response.body)).not.toContain("pendingUpdate");
  };
  await ownerPage.goto(`${url}/owner/moulds/${id}/edit/technical`);
  await expect(ownerPage).toHaveURL(`${url}/owner/moulds/new/product?id=${id}`);
  await expect(ownerPage.getByRole("heading", { name: "Update Product", exact: true })).toBeVisible();
  await expect(ownerPage.getByLabel("Product Name", { exact: true })).toHaveValue("Original Product");
  await ownerPage.getByLabel("Product Name", { exact: true }).fill("Proposed Product");
  await ownerPage.getByLabel("Per day rental charges", { exact: true }).fill("1500");
  await ownerPage.getByRole("button", { name: "Next", exact: true }).click();
  await ownerPage.getByLabel("Mould Name / ID", { exact: true }).fill("Proposed Mould");
  await ownerPage.getByRole("button", { name: "Save Update Draft", exact: true }).click();
  await expect(ownerPage).toHaveURL(`${url}/owner/moulds`);
  await originalPublic();
  await ownerPage.goto(`${url}/owner/moulds/new/product?id=${id}`);
  await expect(ownerPage.getByLabel("Product Name", { exact: true })).toHaveValue("Proposed Product");
  await expect(ownerPage.getByLabel("Per day rental charges", { exact: true })).toHaveValue("1500");
  await ownerPage.getByRole("button", { name: "Next", exact: true }).click();
  await expect(ownerPage.getByLabel("Mould Name / ID", { exact: true })).toHaveValue("Proposed Mould");
  await ownerPage.getByRole("button", { name: "Submit Update for Approval", exact: true }).click();
  await expect(ownerPage).toHaveURL(`${url}/owner/moulds/new/submitted?id=${id}`);
  await expect(ownerPage.getByRole("heading", { name: "Approval pending", exact: true })).toBeVisible();
  await expect(ownerPage.getByText("Proposed Product", { exact: true })).toBeVisible();
  await originalPublic();
  const booking = await request("/bookings", customer, "POST", { productId: id, startDate: start, endDate: end, paymentMethod: "owner" });
  expect(booking.status).toBe(201);
  expect(booking.body.data.booking.snapshot.product.name).toBe("Original Product");
  expect(booking.body.data.booking.pricing.perDayCharges).toBe(1000);
  const bookingId = booking.body.data.booking._id;
  await ownerPage.goto(`${url}/owner/moulds/new/product?id=${id}`);
  await expect(ownerPage.getByText("Your listing update is under admin review", { exact: true })).toBeVisible();
  await expect(ownerPage.getByLabel("Product Name", { exact: true })).toHaveCount(0);
  await adminPage.goto(`${url}/admin/listings`);
  await adminPage.getByPlaceholder("Search by code, product, host...").fill(created.body.data.product.code);
  await expect(adminPage.getByText("UPDATE", { exact: true }).first()).toBeVisible();
  await adminPage.goto(`${url}/admin/listings/${id}`);
  await expect(adminPage.getByRole("heading", { name: /Proposed Product/ }).first()).toBeVisible();
  await adminPage.locator("textarea").fill("Please correct the product name");
  await adminPage.getByRole("button", { name: /Reject (Update )?with Remarks/ }).click();
  await expect(adminPage).toHaveURL(`${url}/admin/listings`);
  await originalPublic();
  await ownerPage.goto(`${url}/owner/moulds/new/product?id=${id}`);
  await expect(ownerPage.getByText("Please correct the product name", { exact: true })).toBeVisible();
  await expect(ownerPage.getByLabel("Product Name", { exact: true })).toHaveValue("Proposed Product");
  await ownerPage.getByLabel("Product Name", { exact: true }).fill("Updated Product");
  await ownerPage.getByRole("button", { name: "Next", exact: true }).click();
  await ownerPage.getByRole("button", { name: "Resubmit for Approval", exact: true }).click();
  await expect(ownerPage.getByRole("heading", { name: "Approval pending", exact: true })).toBeVisible();
  await adminPage.goto(`${url}/admin/listings/${id}`);
  await expect(adminPage.getByRole("heading", { name: /Updated Product/ }).first()).toBeVisible();
  for (const width of [390, 1440]) {
    await adminPage.setViewportSize({ width, height: 900 });
    if (width < 1024) await expect.poll(() => adminPage.locator("aside").first().evaluate((element) => element.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
    expect(await adminPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
    await adminPage.screenshot({ path: `${out}/admin-update-${width}.png`, fullPage: true });
  }
  await adminPage.getByRole("button", { name: /Approve (Update|Listing)/ }).click();
  await expect(adminPage).toHaveURL(`${url}/admin/listings`);
  const published = await request(`/products/${slug}`);
  expect(published.body.data.product.name).toBe("Updated Product");
  expect(published.body.data.product.slug).toBe(slug);
  expect(published.body.data.product.pricing.perDayCharges).toBe(1500);
  expect(published.body.data.moulds[0].mouldNameOrId).toBe("Proposed Mould");
  const oldBooking = (await request(`/bookings/${bookingId}`, customer)).body.data.booking;
  expect(oldBooking.snapshot.product.name).toBe("Original Product");
  expect(oldBooking.pricing.perDayCharges).toBe(1000);
  // The owner can pause bookings; admin can resume and apply its own restriction.
  await ownerPage.goto(`${url}/owner/moulds`);
  await ownerPage.getByRole("button", { name: "Status", exact: true }).click();
  await ownerPage.getByRole("radio", { name: /Maintenance/ }).click();
  await ownerPage.getByRole("button", { name: "Save status", exact: true }).click();
  await ownerPage.getByRole("alertdialog").getByRole("button", { name: /Confirm|maintenance/i }).click();
  await expect(ownerPage.getByRole("dialog", { name: "Update listing status", exact: true })).toHaveCount(0);
  expect((await request(`/owner/products/${id}`, host)).body.data.product.availability).toBe("maintenance");
  await publicPage.goto(`${url}/explore/${slug}`);
  await expect(publicPage.getByText("Under maintenance", { exact: true })).toBeVisible();
  await expect(publicPage.getByRole("link", { name: /Select Dates/ })).toHaveCount(0);
  const blocked = await request("/bookings", customer, "POST", { productId: id, startDate: addDays(start, 40), endDate: addDays(end, 40), paymentMethod: "owner" });
  expect(blocked.status).toBe(409);
  expect((await request(`/admin/bookings/${bookingId}/review`, admin, "PATCH", { status: "approved" })).status).toBe(409);
  await adminPage.goto(`${url}/admin/listings/${id}`);
  await adminPage.getByRole("button", { name: "Enable bookings", exact: true }).click();
  await expect(adminPage.getByRole("button", { name: "Set maintenance", exact: true })).toBeVisible();
  await adminPage.getByRole("button", { name: "Set maintenance", exact: true }).click();
  await expect(adminPage.getByRole("button", { name: "Enable bookings", exact: true })).toBeVisible();
  expect((await request(`/owner/products/${id}/availability`, host, "PATCH", { availability: "active" })).status).toBe(403);
  await ownerPage.reload();
  await ownerPage.getByRole("button", { name: "Status", exact: true }).click();
  await expect(ownerPage.getByRole("button", { name: "Save status", exact: true })).toBeDisabled();
  await expect(ownerPage.getByText("Maintenance was set by an admin. Only an admin can enable bookings again.", { exact: true }).last()).toBeVisible();
  for (const width of [320, 390, 1440]) {
    await publicPage.setViewportSize({ width, height: 900 });
    await publicPage.reload();
    await expect(publicPage.getByText("Under maintenance", { exact: true })).toBeVisible();
    expect(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
    await publicPage.screenshot({ path: `${out}/maintenance-${width}.png`, fullPage: true });
  }
  await adminPage.getByRole("button", { name: "Enable bookings", exact: true }).click();
  await expect(adminPage.getByRole("button", { name: "Set maintenance", exact: true })).toBeVisible();
  await publicPage.reload();
  await expect(publicPage.getByRole("link", { name: /Select Dates/ })).toBeVisible();
  expect((await request(`/admin/bookings/${bookingId}/review`, admin, "PATCH", { status: "approved" })).status).toBe(200);
  expect(errors).toEqual([]);
  console.log("Product updates browser test passed: real owner draft/resubmission, admin rejection/approval, public old-version bookings, frozen history, stable slug, maintenance and admin lock at mobile/desktop sizes.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) {
    for (const context of browser.contexts()) await context.unrouteAll({ behavior: "wait" });
    await browser.close();
  }
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  if (repl) await repl.stop();
  mock.restoreAll();
});
