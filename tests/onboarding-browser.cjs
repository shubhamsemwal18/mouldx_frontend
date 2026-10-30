// Browser-only fixtures. No real accounts, OTPs, uploads or database writes.
const { chromium, expect } = require("@playwright/test");
const { mkdir } = require("node:fs/promises");
const { resolve } = require("node:path");
const url = process.env.ONBOARDING_TEST_URL || "http://localhost:3000";
const out = resolve(__dirname, "../test-results/onboarding");
let browser;
const errors = [];

async function actor({ role = "customer", status = "pending", loggedIn = false, roles = ["customer"], width = 390 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 844 } });
  await context.addInitScript(({ role, loggedIn }) => {
    sessionStorage.setItem("splashShown", "1");
    if (role) localStorage.setItem("mouldx_active_role", role);
    if (loggedIn) localStorage.setItem("mouldx:auth-session-present", "1");
  }, { role, loggedIn });
  const state = {
    loggedIn, submissions: [], uploads: [], requests: [], failLogout: false,
    user: { _id: "user-1", fullName: "Test Person", email: "person@example.test", phone: "9876543210", approvedRoles: roles, profileVerificationStatus: status },
    verification: null,
  };
  const document = { key: "private/users/user-1/documents/existing.pdf", mimeType: "application/pdf", size: 4 };
  if (status !== "pending") state.verification = {
    _id: "kyc-1", user: "user-1", status, submittedAt: "2026-10-27T12:00:00.000Z", reviewedAt: "2026-10-27T13:00:00.000Z", rejectionReason: "Please correct your firm address.",
    personalDetails: { panNumber: "ABCDE1234F" },
    firmDetails: { name: "Test Industries", email: "firm@example.test", address: "Test address", gstNumber: "27ABCDE1234F1Z5", gstCertificate: document, msmeCertificate: document, electricityBill: document },
    payoutDetails: { bankAccountNumber: "1234567890", ifscCode: "SBIN0001234", accountHolderName: "Test Person", bankName: "Test Bank" },
  };
  const payload = () => ({ user: state.user, profileVerification: state.verification, tokens: { accessToken: "fixture-access-token" } });
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": url, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
    const path = new URL(request.url()).pathname.replace(/^\/api/, "");
    state.requests.push(path);
    const send = (data, status = 200) => route.fulfill({ status, json: { success: true, data } });
    if (path === "/auth/refresh-token" || path === "/user/profile") {
      if (!state.loggedIn) return route.fulfill({ status: 401, json: { success: false, message: "Not signed in" } });
      return send(payload());
    }
    if (path === "/auth/signup") { Object.assign(state.user, request.postDataJSON()); return send({ userId: state.user._id }); }
    if (path === "/auth/signup/verify-otp" || path === "/auth/login/verify-otp") { state.loggedIn = true; return send(payload()); }
    if (path === "/auth/login/request-otp" || path === "/auth/signup/resend-otp") return send({});
    if (path === "/auth/logout") {
      if (state.failLogout) return route.fulfill({ status: 503, json: { success: false, message: "Temporarily unavailable" } });
      state.loggedIn = false; return send({});
    }
    if (path === "/user/profile-verification" && request.method() === "POST") {
      const body = request.postDataJSON(); state.submissions.push(body);
      Object.assign(state.user, body.userDetails, { profileVerificationStatus: "in_review" });
      state.verification = { ...body, _id: "kyc-1", user: state.user._id, status: "in_review", submittedAt: new Date().toISOString() };
      return send({ user: state.user, profileVerification: state.verification });
    }
    if (path === "/uploads/presigned-url") {
      const body = request.postDataJSON(); state.uploads.push(body);
      return send({ upload: { key: `private/users/user-1/documents/${body.fileName}`, bucket: "fixture", uploadUrl: `${url}/test-upload`, headers: { "Content-Type": body.contentType } } });
    }
    if (path === "/products/sections") return send({ sections: [], stats: { totalPublished: 0 } });
    if (path === "/products/route-test") return send({ product: { _id: "route-product", slug: "route-test", name: "Route test mould", pricing: { perDayCharges: 1000 }, images: [], videos: [] }, moulds: [] });
    if (path === "/categories/published") return send({ categories: [], pagination: { hasNextPage: false } });
    if (path === "/owner/dashboard") return send({});
    if (path === "/owner/products") return send({ products: [], pagination: { hasNextPage: false }, stats: {} });
    return send({});
  });
  await context.route("**/test-upload", (route) => route.fulfill({ status: 200 }));
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.setDefaultTimeout(15000);
  return { page, context, state };
}

async function noMode(page) {
  await expect(page.locator("header").getByText(/^(Host|User) Mode$/)).toHaveCount(0);
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Notifications", exact: true })).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: "Logout", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: /^Switch to/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Close menu", exact: true }).click();
}
async function noOverflow(page) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); }
async function otp(page) {
  for (let i = 0; i < 6; i++) await page.getByRole("textbox", { name: `OTP digit ${i + 1}`, exact: true }).fill(String(i + 1));
  await page.getByRole("button", { name: "Verify & Continue", exact: true }).click();
}

async function run() {
  await mkdir(out, { recursive: true });
  browser = await chromium.launch();
  for (const role of ["customer", "owner"]) {
    const { page, context, state } = await actor({ role: null, width: role === "customer" ? 320 : 390 });
    await page.goto(url);
    await page.getByRole("button", { name: /Get Started/ }).click();
    await page.getByRole("button", { name: role === "owner" ? /Start as Host/ : /Start as User/ }).click();
    await expect(page).toHaveURL(`${url}/signup`);
    expect(await page.evaluate(() => localStorage.getItem("mouldx_selected_signup_role"))).toBe(role);
    await page.getByLabel("Full Name").fill("Test Person");
    await page.getByLabel("Email ID").fill("person@example.test");
    await page.getByLabel("Phone Number").fill("9876543210");
    await page.getByRole("button", { name: /Continue with OTP/ }).click();
    await expect(page).toHaveURL(`${url}/verify-otp`);
    await expect(page.getByText("Tip", { exact: true })).toHaveCount(0);
    await expect(page.getByText("OTP auto-fills from SMS when detected.")).toHaveCount(0);
    await noOverflow(page);
    await page.screenshot({ path: `${out}/otp-${role}.png`, fullPage: true });
    await otp(page);
    await expect(page).toHaveURL(`${url}/onboarding`);
    await page.getByRole("link", { name: "Start Profile", exact: true }).click();
    await expect(page).toHaveURL(`${url}/onboarding/profile`);
    await expect(page.getByRole("heading", { name: "Profile Creation" })).toBeVisible();
    await noMode(page);
    await expect(page.locator("nav")).toHaveCount(0);
    await noOverflow(page);
    await page.screenshot({ path: `${out}/profile-${role}.png` });
    if (role === "owner") {
      await page.getByPlaceholder("ABCDE1234F", { exact: true }).fill("ABCDE1234F");
      await page.getByPlaceholder("firm@company.com").fill("firm@example.test");
      await page.getByPlaceholder("Sharma Industries").fill("Test Industries");
      await page.getByPlaceholder("Plot no., street, city, state, pincode").fill("Test address");
      await page.getByPlaceholder("27ABCDE1234F1Z5").fill("27ABCDE1234F1Z5");
      await page.getByPlaceholder("XXXXXXXXXXXX").fill("1234567890");
      await page.getByPlaceholder("SBIN0001234").fill("SBIN0001234");
      await page.getByPlaceholder("As per bank records").fill("Test Person");
      await page.getByPlaceholder("State Bank of India").fill("Test Bank");
      for (let i = 0; i < 3; i++) await page.locator('input[type="file"]').nth(i).setInputFiles({ name: `kyc-${i}.pdf`, mimeType: "application/pdf", buffer: Buffer.from("test") });
      await page.getByRole("button", { name: "Submit for Approval", exact: true }).click();
      await expect(page).toHaveURL(`${url}/onboarding/review`);
      await expect(page.getByRole("heading", { name: "Approval pending" })).toBeVisible();
      expect(state.uploads.every((upload) => upload.fileSize === 4)).toBe(true);
      expect(state.submissions).toHaveLength(1);
      await noMode(page);
      await page.goto(`${url}/onboarding/profile`);
      await expect(page).toHaveURL(`${url}/onboarding/review`);
    }
    await page.goto(url);
    await expect(page.getByRole("heading", { name: /Turning Moulds/ })).toBeVisible();
    await noMode(page);
    await page.goto(`${url}/owner/moulds`);
    await expect(page).toHaveURL(role === "owner" ? `${url}/onboarding/review` : `${url}/onboarding`);
    expect(await page.evaluate(() => localStorage.getItem("mouldx_active_role"))).toBe(role);
    await context.close();
  }

  const rejected = await actor({ loggedIn: true, role: "owner", status: "rejected" });
  await rejected.page.goto(`${url}/onboarding/rejected`);
  await expect(rejected.page.getByText("Please correct your firm address.", { exact: true })).toBeVisible();
  await noMode(rejected.page);
  await rejected.page.getByRole("button", { name: "Resubmit Profile", exact: true }).click();
  await expect(rejected.page).toHaveURL(`${url}/onboarding/profile`);
  await expect(rejected.page.getByPlaceholder("Sharma Industries")).toHaveValue("Test Industries");
  await rejected.page.getByPlaceholder("Rohit Sharma").fill("Updated Person");
  await rejected.page.getByPlaceholder("Plot no., street, city, state, pincode").fill("Corrected address");
  await rejected.page.getByRole("button", { name: "Submit for Approval", exact: true }).click();
  await expect(rejected.page).toHaveURL(`${url}/onboarding/review`);
  await expect(rejected.page.getByRole("heading", { name: "Approval pending" })).toBeVisible();
  expect(rejected.state.submissions[0].userDetails.fullName).toBe("Updated Person");
  expect(rejected.state.uploads).toHaveLength(0);
  await rejected.context.close();

  for (const role of ["customer", "owner"]) {
    const { page, context } = await actor({ loggedIn: true, role, status: "approved", roles: ["customer", "owner"] });
    await page.goto(`${url}/onboarding/approved`);
    await expect(page.locator("header").getByText(role === "owner" ? "Host Mode" : "User Mode", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: role === "owner" ? "+ List a Mould" : "Explore Moulds", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await expect(page.getByRole("menuitem", { name: role === "owner" ? "Switch to User" : "Switch to Host", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Close menu", exact: true }).click();
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await page.getByRole("menuitem", { name: role === "owner" ? "Switch to User" : "Switch to Host", exact: true }).click();
    await expect(page).toHaveURL(`${url}/`);
    await expect(page.locator("header").getByText(role === "owner" ? "User Mode" : "Host Mode", { exact: true })).toBeVisible();
    await page.goto(`${url}/owner/onboarding/profile`);
    await expect(page).toHaveURL(`${url}/onboarding/approved`);
    await noOverflow(page);
    if (role === "owner") {
      await page.goto(`${url}/owner/profile`);
      await expect(page.locator("header").getByText("Host Mode", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Open menu", exact: true }).click();
      await page.getByRole("menuitem", { name: "Switch to User", exact: true }).click();
      await expect(page).toHaveURL(`${url}/`);
      await expect(page.locator("header").getByText("User Mode", { exact: true })).toBeVisible();
    }
    await context.close();
  }

  for (const role of ["customer", "owner"]) {
    const login = await actor({ role, status: "approved", roles: ["customer", "owner"] });
    await login.page.goto(`${url}/login`);
    await login.page.getByLabel("Phone Number").fill("9876543210");
    await login.page.getByRole("button", { name: /Continue with OTP/ }).click();
    await otp(login.page);
    await expect(login.page).toHaveURL(`${url}/`);
    await expect(login.page.locator("header").getByText(role === "owner" ? "Host Mode" : "User Mode", { exact: true })).toBeVisible();
    await login.context.close();
  }

  const customerOnly = await actor({ loggedIn: true, role: "owner", status: "approved", roles: ["customer"] });
  await customerOnly.page.goto(`${url}/onboarding/approved`);
  await expect(customerOnly.page.locator("header").getByText("User Mode", { exact: true })).toBeVisible();
  await customerOnly.page.getByRole("button", { name: "Open menu", exact: true }).click();
  await expect(customerOnly.page.getByRole("menuitem", { name: "Switch to Host", exact: true })).toHaveCount(0);
  await customerOnly.context.close();

  const unverifiedHost = await actor({ loggedIn: true, role: "owner", roles: ["customer", "owner"] });
  await unverifiedHost.page.goto(`${url}/owner/moulds`);
  await expect(unverifiedHost.page).toHaveURL(`${url}/onboarding`);
  await noMode(unverifiedHost.page);
  await unverifiedHost.context.close();

  const pending = await actor({ loggedIn: true });
  for (const path of ["/bookings", "/inbox", "/profile", "/owner/bookings", "/owner/inbox", "/owner/profile"]) {
    await pending.page.goto(`${url}${path}`);
    await expect(pending.page).toHaveURL(`${url}/onboarding`);
    await expect(pending.page.getByRole("heading", { name: "Complete your profile", exact: true })).toBeVisible();
  }
  pending.state.failLogout = true;
  await pending.page.getByRole("button", { name: "Open menu", exact: true }).click();
  await pending.page.getByRole("menuitem", { name: "Logout", exact: true }).click();
  await expect(pending.page.getByRole("alert").filter({ hasText: "We couldn't log you out" })).toBeVisible();
  await expect(pending.page.getByRole("menuitem", { name: "Logout", exact: true })).toBeEnabled();
  expect(pending.state.loggedIn).toBe(true);
  pending.state.failLogout = false;
  await pending.page.evaluate(() => sessionStorage.setItem("mouldx_pending_auth", "stale-test-data"));
  await pending.page.getByRole("menuitem", { name: "Logout", exact: true }).click();
  await expect(pending.page).toHaveURL(`${url}/`);
  await expect(pending.page.getByRole("button", { name: /Get Started/ })).toBeVisible();
  expect(await pending.page.evaluate(() => [localStorage.getItem("mouldx:auth-session-present"), localStorage.getItem("mouldx_active_role"), localStorage.getItem("mouldx_selected_signup_role"), sessionStorage.getItem("mouldx_pending_auth")])).toEqual([null, null, null, null]);
  await pending.context.close();

  for (const path of ["/profile", "/owner/profile", "/admin"]) {
    const admin = path === "/admin";
    const session = await actor({ loggedIn: true, status: "approved", roles: admin ? ["admin"] : ["customer", "owner"], role: path.startsWith("/owner") ? "owner" : "customer" });
    await session.page.goto(`${url}${path}`);
    if (admin) await session.page.getByRole("button", { name: "Account menu", exact: true }).click();
    await session.page.getByRole("button", { name: "Logout", exact: true }).click();
    await expect(session.page).toHaveURL(admin ? `${url}/login` : `${url}/`);
    expect(session.state.requests.filter((request) => request === "/auth/logout")).toHaveLength(1);
    expect(session.state.loggedIn).toBe(false);
    await session.context.close();
  }

  // Signed-in sessions must never render the guest-only forms, even via a deep link.
  for (const status of ["pending", "in_review", "rejected", "approved"]) {
    const session = await actor({ loggedIn: true, status });
    const destination = status === "approved" ? "/" : status === "pending" ? "/onboarding" : status === "in_review" ? "/onboarding/review" : "/onboarding/rejected";
    for (const path of ["/login", "/signup", "/verify-otp"]) {
      await session.page.goto(`${url}${path}`);
      await expect(session.page).toHaveURL(`${url}${destination}`);
      await expect(session.page.getByRole("heading", { name: /^(Welcome Back|Create Account|Verify OTP)$/ })).toHaveCount(0);
    }
    await session.context.close();
  }

  // Admin takes precedence even if the account also carries customer/owner roles.
  for (const roles of [["admin"], ["admin", "customer", "owner"]]) {
    const session = await actor({ loggedIn: true, status: "approved", roles, role: "owner" });
    for (const path of ["/login?next=%2Fbookings", "/signup", "/verify-otp", "/bookings", "/bookings/example", "/inbox", "/inbox/example", "/profile", "/onboarding", "/onboarding/profile", "/booking-success", "/owner", "/owner/moulds", "/owner/moulds/new/product", "/owner/bookings", "/owner/inbox", "/owner/profile", "/explore/route-test/dates", "/explore/route-test/confirm?startDate=2026-11-01&endDate=2026-11-03"]) {
      await session.page.goto(`${url}${path}`);
      await expect(session.page).toHaveURL(`${url}/admin`);
      await expect(session.page.locator('nav a[href="/bookings"], nav a[href="/owner/bookings"], nav a[href="/profile"]')).toHaveCount(0);
    }
    for (const path of ["/", "/explore", "/explore/route-test"]) {
      await session.page.goto(`${url}${path}`);
      await expect(session.page.locator("header").getByRole("link", { name: "Admin", exact: true })).toBeVisible();
      await expect(session.page.locator('nav a[href="/bookings"], nav a[href="/owner/bookings"], nav a[href="/profile"]')).toHaveCount(0);
      await expect(session.page.getByRole("link", { name: /Select Dates/ })).toHaveCount(0);
      await session.page.getByRole("button", { name: "Open menu", exact: true }).click();
      await expect(session.page.getByRole("menuitem", { name: "Profile", exact: true })).toHaveCount(0);
      await expect(session.page.getByRole("menuitem", { name: /^Switch to/ })).toHaveCount(0);
      await session.page.getByRole("button", { name: "Close menu", exact: true }).click();
      for (const width of [320, 390, 1440]) {
        await session.page.setViewportSize({ width, height: 844 });
        await noOverflow(session.page);
      }
      await session.page.setViewportSize({ width: 390, height: 844 });
      if (path === "/explore/route-test") await session.page.screenshot({ path: `${out}/admin-public-detail-${roles.length}.png`, fullPage: true });
    }
    expect(session.state.requests.some((path) => path.startsWith("/bookings") || path.startsWith("/chats") || path.startsWith("/owner/"))).toBe(false);
    await session.context.close();
  }

  // Safe booking continuations survive auth; auth/admin targets cannot create loops.
  const nextSession = await actor({ loggedIn: true, status: "approved" });
  await nextSession.page.goto(`${url}/login?next=%2Fprofile`);
  await expect(nextSession.page).toHaveURL(`${url}/profile`);
  await nextSession.page.goto(`${url}/signup?next=%2Flogin`);
  await expect(nextSession.page).toHaveURL(`${url}/`);
  await nextSession.context.close();

  const guest = await actor();
  await guest.page.goto(`${url}/owner/onboarding/profile`);
  await expect(guest.page).toHaveURL(`${url}/login?next=%2Fonboarding%2Fprofile`);
  await expect(guest.page.getByRole("heading", { name: "Profile Creation" })).toHaveCount(0);
  await guest.context.close();
  for (const suffix of ["", "/profile", "/review", "/rejected", "/approved"]) {
    const response = await fetch(`${url}/owner/onboarding${suffix}?source=legacy`, { redirect: "manual" });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(`/onboarding${suffix}?source=legacy`);
  }
  expect(errors).toEqual([]);
  console.log("Auth/onboarding browser checks passed: guest-only auth routes, admin isolation (including mixed roles), public admin browsing without booking/nav, safe next targets, signup/KYC, logout, modes and legacy redirects.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); });
