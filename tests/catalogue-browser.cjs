// Deterministic UI fixtures only; never connects to or modifies the user's DB.
const { chromium, expect } = require("@playwright/test");
const { mkdir } = require("node:fs/promises");
const { resolve } = require("node:path");
const url = process.env.CATALOGUE_TEST_URL || "http://localhost:3000";
const out = resolve(__dirname, "../test-results/catalogue");
const categories = ["Chair", "Table", "Storage", "Industrial", "Empty"].map((title) => ({ _id: title, title, slug: title.toLowerCase(), description: "" }));
const subcategories = [{ title: "Dining chairs", slug: "dining-chairs" }, { title: "Office chairs", slug: "office-chairs" }, { title: "Empty child", slug: "empty-child" }];
const products = Array.from({ length: 16 }, (_, i) => ({
  _id: `product-${i}`, slug: `precision-chair-${i}`, code: `MX-${i}`, name: `Precision chair mould ${i + 1}`,
  category: categories[0], subCategory: subcategories[i % 2], pricing: { perDayCharges: 1000 + i * 500 },
  image: { url: "/images/mould-and-chair.webp" }, images: [{ url: "/images/mould-and-chair.webp", kind: "image" }],
}));
const pagination = (page, limit, total) => ({ page, limit, total, pages: Math.max(1, Math.ceil(total / limit)), hasNextPage: page * limit < total, hasPrevPage: page > 1 });
const errors = [];
let browser;

async function run() {
  await mkdir(out, { recursive: true });
  browser = await chromium.launch();
  for (const width of [320, 390, 600, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => sessionStorage.setItem("splashShown", "1"));
    const requests = [];
    const visits = [];
    let offline = false;
    await context.route("**/api/**", async (route) => {
      const request = route.request();
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": url, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "Content-Type" } });
      const parsed = new URL(request.url());
      const path = parsed.pathname.replace(/^\/api/, "");
      const query = parsed.searchParams;
      requests.push({ path, query: Object.fromEntries(query) });
      if (offline && path === "/products/sections") return route.abort("failed");
      const send = (data) => route.fulfill({ json: { success: true, data } });
      if (path === "/categories/published") return send({ categories: query.has("parentSlug") ? (query.get("parentSlug") === "chair" ? subcategories : []) : categories, pagination: pagination(1, 100, 5) });
      if (path === "/products/sections") return send({ sections: categories.slice(0, 4).map((category, i) => ({ category, products: [products[i], products[i + 4]] })), stats: { totalPublished: products.length } });
      if (path === "/products/published") {
        let rows = [...products];
        if (query.get("categorySlug") === "empty" || query.get("subCategorySlug") === "empty-child" || query.get("search") === "zero") rows = [];
        if (query.get("search") === "single") rows = rows.slice(0, 1);
        if (query.get("subCategorySlug")) rows = rows.filter((p) => p.subCategory.slug === query.get("subCategorySlug"));
        if (query.has("maxPrice")) rows = rows.filter((p) => p.pricing.perDayCharges <= Number(query.get("maxPrice")));
        if (query.get("sort") === "price_desc") rows.reverse();
        const page = Number(query.get("page") || 1), limit = Number(query.get("limit") || 12);
        return send({ products: rows.slice((page - 1) * limit, page * limit), pagination: pagination(page, limit, rows.length), stats: { totalPublished: products.length, matching: rows.length } });
      }
      if (path.endsWith("/visit")) { visits.push(request.postDataJSON()); return route.fulfill({ status: 204 }); }
      if (path.startsWith("/products/")) return send({ product: products.find((p) => path.endsWith(p.slug)) || products[0], moulds: [] });
      return route.fulfill({ status: 404, json: { success: false, message: "Fixture not found" } });
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url);
    await expect(page.locator("#mould-explore article")).toHaveCount(8);
    await expect(page.getByText("16 verified listings", { exact: true })).toBeVisible();
    expect(requests.filter((r) => r.path === "/products/sections")).toHaveLength(1);
    expect(requests.filter((r) => r.path === "/products/published")).toHaveLength(0);
    expect(requests.filter((r) => r.path === "/products/filters")).toHaveLength(0);
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(await overflow()).toBe(false);
    await page.screenshot({ path: `${out}/home-${width}.png`, fullPage: true });

    await page.getByRole("button", { name: "Open search", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Search listings" });
    const input = dialog.getByRole("textbox", { name: "Search listings" });
    await expect(dialog.locator("article")).toHaveCount(12);
    await expect(dialog).toHaveCSS("opacity", "1");
    expect(requests.filter((r) => r.path === "/products/published").at(-1).query).toMatchObject({ sort: "popular", limit: "12" });
    const cardWidth = (await dialog.locator("article").first().boundingBox()).width;
    expect(cardWidth).toBeLessThan(width / (width >= 1024 ? 2 : 1.7));
    await expect(dialog.locator("article img").first()).toBeVisible();
    expect(await dialog.locator("article img").first().evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.screenshot({ path: `${out}/popular-${width}.png` });
    await input.fill("single");
    await expect(dialog.locator("article")).toHaveCount(1);
    expect(Math.abs((await dialog.locator("article").boundingBox()).width - cardWidth)).toBeLessThan(1);
    expect(await overflow()).toBe(false);
    await page.screenshot({ path: `${out}/single-${width}.png` });

    if (width === 390) {
      const before = requests.filter((r) => r.path === "/products/published").length;
      await input.pressSequentially(" mould", { delay: 25 });
      await page.waitForTimeout(550);
      const calls = requests.filter((r) => r.path === "/products/published").slice(before);
      expect(calls.filter((r) => r.query.page === "1")).toHaveLength(1);
      await input.fill("");
      await expect(dialog.getByText("Popular moulds", { exact: true })).toBeVisible();
      await dialog.getByRole("button", { name: "Filter listings" }).click();
      await expect(dialog.getByText("Mould type", { exact: true })).toHaveCount(0);
      await expect(dialog.getByRole("button", { name: "Empty", exact: true })).toBeVisible();
      await dialog.getByRole("button", { name: "Chair", exact: true }).click();
      await expect(dialog.getByRole("button", { name: "Dining chairs", exact: true })).toBeVisible();
      await dialog.getByRole("button", { name: "Dining chairs", exact: true }).click();
      await expect(dialog.getByRole("button", { name: "Dining chairs", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect.poll(() => requests.filter((r) => r.path === "/products/published").at(-1).query.subCategorySlug).toBe("dining-chairs");
      await dialog.getByRole("button", { name: "Table", exact: true }).click();
      await expect(dialog.getByRole("button", { name: "Dining chairs", exact: true })).toHaveCount(0);
      await expect.poll(() => requests.filter((r) => r.path === "/products/published").at(-1).query.categorySlug).toBe("table");
      expect(requests.filter((r) => r.path === "/products/published").at(-1).query.subCategorySlug).toBeUndefined();
      await dialog.getByRole("button", { name: "Empty", exact: true }).click();
      await expect(dialog.getByText("No listings found", { exact: true })).toBeVisible();
      await dialog.getByRole("button", { name: "Clear all filters" }).click();
      await dialog.getByRole("button", { name: "Under ₹2,000", exact: true }).click();
      await expect(dialog.locator("article")).toHaveCount(2);
      expect(requests.filter((r) => r.path === "/products/published").at(-1).query.maxPrice).toBe("1999.99");
      await dialog.getByRole("button", { name: "Price: high to low", exact: true }).click();
      await expect(dialog.locator("article h3").first()).toHaveText(products[1].name);
      await dialog.getByRole("button", { name: "Clear all filters" }).click();
      await dialog.getByRole("button", { name: "Newest", exact: true }).click();
      await dialog.getByRole("button", { name: "Filter listings" }).click();
      expect(requests.filter((r) => r.path === "/categories/published").every((r) => r.query.showAll === "true")).toBe(true);
      for (const term of ["first", "second", "third", "fourth", "fifth", "sixth"]) {
        await input.fill(term);
        await input.press("Enter");
      }
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem("mouldx_recent_searches")))).toEqual(["sixth", "fifth", "fourth", "third", "second"]);
      await input.fill("SIXTH"); await input.press("Enter");
      expect((await page.evaluate(() => JSON.parse(localStorage.getItem("mouldx_recent_searches")))).length).toBe(5);
      await input.fill("scroll");
      await expect(dialog.getByText("16 results for “scroll”", { exact: true })).toBeVisible();
      await expect(dialog.locator("article")).toHaveCount(12);
      await dialog.locator("article").last().scrollIntoViewIfNeeded();
      await expect(dialog.locator("article")).toHaveCount(16);
      await input.fill("single");
      await expect(dialog.locator("article")).toHaveCount(1);
      await dialog.locator("article a").click();
      await expect(page).toHaveURL(/\/explore\/precision-chair-0$/);
      await expect.poll(() => visits.length).toBe(1);
      expect(visits[0].visitId).toMatch(/^[0-9a-f-]{36}$/);
      await page.waitForTimeout(400);
      expect(visits).toHaveLength(1);
      await page.goto(url);
      await page.getByRole("button", { name: "Open search", exact: true }).click();
      await expect(dialog.getByText("Recent searches", { exact: true })).toBeVisible();
      await dialog.getByRole("button", { name: "Clear all", exact: true }).click();
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem("mouldx_recent_searches")))).toEqual([]);
    }

    await page.goto(url);
    offline = true;
    await page.reload();
    await expect(page.locator("#mould-explore").getByRole("alert")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
    offline = false;
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(page.locator("#mould-explore").getByRole("alert")).toHaveCount(0);
    await expect(page.locator("#mould-explore article")).toHaveCount(8);
    expect(await overflow()).toBe(false);
    await context.close();
  }
  expect(errors).toEqual([]);
  console.log("Catalogue browser checks passed at 320, 390, 600 and 1440px: filters, debounce, fixed cards, history, scroll, visits and offline recovery.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); });
