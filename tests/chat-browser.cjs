const { expect } = require("@playwright/test");
const { randomUUID } = require("node:crypto");

module.exports = async function testChatScenarios({ url, api, renter, reviewer, hostPage, customer, host, admin, bookingId, pendingBookingId, product, backend, out }) {
  const Conversation = backend("./models/Conversation");
  const ChatMessage = backend("./models/ChatMessage");
  const Booking = backend("./models/Booking");
  const write = async (page, text) => {
    await page.getByRole("textbox", { name: "Message", exact: true }).fill(text);
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(page.getByText(text, { exact: true })).toHaveCount(1);
    await expect(page.getByRole("textbox", { name: "Message", exact: true })).toHaveValue("");
  };
  await renter.setViewportSize({ width: 390, height: 844 });
  await renter.goto(`${url}/bookings/${bookingId}`);
  await expect(renter.getByRole("heading", { name: "Product booked" })).toHaveCount(0);
  await expect(renter.getByRole("link", { name: product.name, exact: true })).toHaveAttribute("href", `/explore/${product.slug}`);
  await expect(renter.getByRole("heading", { name: "Need help?" })).toBeVisible();
  await renter.getByRole("button", { name: "Message owner", exact: true }).click();
  await expect(renter).toHaveURL(/\/inbox\/[a-f0-9]{24}$/);
  const peerId = renter.url().split("/").at(-1);
  await expect(renter.getByRole("heading", { name: "Host", exact: true })).toBeVisible();
  await write(renter, "When can we arrange pickup?");

  await hostPage.goto(`${url}/inbox`);
  await expect(hostPage.getByLabel("1 unread messages", { exact: true })).toBeVisible();
  await hostPage.locator(`a[href="/inbox/${peerId}"]`).click();
  await expect(hostPage.getByText("When can we arrange pickup?", { exact: true })).toBeVisible();
  await write(hostPage, "Pickup is available in the morning.");
  await expect(renter.getByText("Pickup is available in the morning.", { exact: true })).toHaveCount(0);
  await renter.getByRole("button", { name: "Refresh chat", exact: true }).click();
  await expect(renter.getByText("Pickup is available in the morning.", { exact: true })).toBeVisible();
  await write(hostPage, "Please confirm the preferred pickup slot.");
  await write(renter, "I will collect it at 10 am.");
  await renter.getByRole("button", { name: "Refresh chat", exact: true }).click();
  await expect(renter.getByText("Please confirm the preferred pickup slot.", { exact: true })).toBeVisible();
  await expect(renter.getByText("I will collect it at 10 am.", { exact: true })).toHaveCount(1);
  await renter.screenshot({ path: `${out}/mobile-booking-chat.png` });
  await renter.goto(`${url}/bookings/${bookingId}`);
  await renter.getByRole("button", { name: "Message owner", exact: true }).click();
  await expect(renter).toHaveURL(`${url}/inbox/${peerId}`);
  expect(await Conversation.countDocuments({ booking: bookingId, kind: "booking" })).toBe(1);

  await renter.goto(`${url}/bookings/${pendingBookingId}`);
  await expect(renter.getByRole("button", { name: "Message owner", exact: true })).toBeDisabled();
  await renter.getByRole("button", { name: "Raise an issue", exact: true }).click();
  await expect(renter).toHaveURL(/\/inbox\/[a-f0-9]{24}$/);
  const customerSupport = renter.url().split("/").at(-1);
  await expect(renter.getByRole("heading", { name: "MouldX Support", exact: true })).toBeVisible();
  await write(renter, "Please help check my booking payment.");
  await reviewer.goto(`${url}/admin/support`);
  await reviewer.locator(`a[href="/admin/support/${customerSupport}"]`).click();
  await expect(reviewer.getByText("Please help check my booking payment.", { exact: true })).toBeVisible();
  await write(reviewer, "We are checking your payment reference.");
  await renter.getByRole("button", { name: "Refresh chat", exact: true }).click();
  await expect(renter.getByText("We are checking your payment reference.", { exact: true })).toBeVisible();
  await reviewer.getByRole("button", { name: "Mark resolved", exact: true }).click();
  await expect(reviewer.getByRole("button", { name: "Reopen conversation", exact: true })).toBeVisible();
  await reviewer.goto(`${url}/admin/support`);
  await reviewer.getByRole("button", { name: "Resolved", exact: true }).click();
  await expect(reviewer.locator(`a[href="/admin/support/${customerSupport}"]`)).toBeVisible();
  await write(renter, "I still need help with this payment.");
  await reviewer.getByRole("button", { name: "Refresh inbox", exact: true }).click();
  await expect(reviewer.locator(`a[href="/admin/support/${customerSupport}"]`)).toHaveCount(0);

  await hostPage.goto(`${url}/owner/bookings/${pendingBookingId}`);
  await expect(hostPage.getByText("Booking not found", { exact: true })).toBeVisible();
  await expect(hostPage.getByRole("button", { name: "Raise an issue", exact: true })).toHaveCount(0);
  await hostPage.goto(`${url}/owner/bookings/${bookingId}`);
  await hostPage.getByRole("button", { name: "Raise an issue", exact: true }).click();
  await expect(hostPage).toHaveURL(/\/inbox\/[a-f0-9]{24}$/);
  const hostSupport = hostPage.url().split("/").at(-1);
  expect(hostSupport).not.toBe(customerSupport);
  await write(hostPage, "I need help with this rental request.");
  await reviewer.goto(`${url}/admin/bookings/${bookingId}`);
  await reviewer.getByRole("button", { name: "Message host", exact: true }).click();
  await expect(reviewer).toHaveURL(`${url}/admin/support/${hostSupport}`);
  await write(reviewer, "We will help you review this rental request.");
  await hostPage.getByRole("button", { name: "Refresh chat", exact: true }).click();
  await expect(hostPage.getByText("We will help you review this rental request.", { exact: true })).toBeVisible();
  await expect(hostPage.getByText("Please help check my booking payment.", { exact: true })).toHaveCount(0);
  await reviewer.goto(`${url}/admin/bookings/${pendingBookingId}`);
  await reviewer.getByRole("button", { name: "Message customer", exact: true }).click();
  await expect(reviewer).toHaveURL(`${url}/admin/support/${customerSupport}`);
  await expect(reviewer.getByText("I still need help with this payment.", { exact: true })).toBeVisible();

  for (const width of [320, 1440]) {
    await reviewer.setViewportSize({ width, height: 844 });
    if (width < 1024) await expect.poll(() => reviewer.locator("aside").evaluate((element) => element.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
    await renter.setViewportSize({ width, height: 844 });
    for (const page of [reviewer, renter]) {
      const send = await page.getByRole("button", { name: "Send message", exact: true }).boundingBox();
      expect(send.y + send.height).toBeLessThanOrEqual(844);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
    }
    await reviewer.screenshot({ path: `${out}/admin-support-chat-${width}.png` });
    await renter.screenshot({ path: `${out}/customer-support-chat-${width}.png` });
  }
  await hostPage.goto(`${url}/owner/inbox`);
  await hostPage.getByRole("button", { name: "Support", exact: true }).click();
  await expect(hostPage.locator(`a[href="/owner/inbox/${hostSupport}"]`)).toBeVisible();
  await expect(hostPage.locator(`a[href="/owner/inbox/${customerSupport}"]`)).toHaveCount(0);

  // Real DB fixtures exercise older history and refresh after a long absence.
  const seedMessages = async (prefix, count) => {
    const thread = await Conversation.findById(peerId);
    const messages = Array.from({ length: count }, (_, i) => ({ conversation: peerId, sender: host._id, senderRole: "host", sequence: thread.lastSequence + i + 1, text: `${prefix} ${i + 1}`, clientMessageId: randomUUID() }));
    const saved = await ChatMessage.insertMany(messages);
    const last = saved.at(-1);
    await Conversation.updateOne({ _id: peerId }, { $set: { lastSequence: last.sequence, lastMessage: { text: last.text, createdAt: last.createdAt, sender: host._id, senderRole: "host" }, lastActivityAt: last.createdAt } });
  };
  await seedMessages("Historical message", 45);
  await renter.setViewportSize({ width: 390, height: 844 });
  await renter.goto(`${url}/inbox/${peerId}`);
  await expect(renter.getByText("Historical message 45", { exact: true })).toBeVisible();
  await expect(renter.getByText("Historical message 1", { exact: true })).toHaveCount(0);
  await renter.getByLabel("Messages", { exact: true }).evaluate((element) => { element.scrollTop = 0; });
  await expect(renter.getByText("Historical message 1", { exact: true })).toHaveCount(1);
  await seedMessages("Missed incoming message", 35);
  await expect(renter.getByText("Missed incoming message 1", { exact: true })).toHaveCount(0);
  await renter.getByRole("button", { name: "Refresh chat", exact: true }).click();
  await expect(renter.getByText("Missed incoming message 1", { exact: true })).toHaveCount(1);
  await expect(renter.getByText("Missed incoming message 35", { exact: true })).toHaveCount(1);

  let loseResponse = true;
  await renter.route(`**/api/chats/${peerId}/messages`, async (route) => {
    if (route.request().method() === "POST" && loseResponse) {
      loseResponse = false;
      await route.fetch();
      return route.abort("failed");
    }
    return route.continue();
  });
  const retryText = "Retrying after an interrupted response.";
  await renter.getByRole("textbox", { name: "Message", exact: true }).fill(retryText);
  await renter.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(renter.getByRole("alert").filter({ hasText: "Network" })).toBeVisible();
  await renter.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(renter.getByText(retryText, { exact: true })).toHaveCount(1);
  expect(await ChatMessage.countDocuments({ conversation: peerId, text: retryText })).toBe(1);

  const template = (await Booking.findById(bookingId)).toObject();
  const { _id, __v, createdAt, updatedAt, ...bookingSeed } = template;
  void _id; void __v; void createdAt; void updatedAt;
  const extraBookings = await Booking.insertMany(Array.from({ length: 21 }, (_, i) => ({ ...bookingSeed, code: `INBOX-BK-${i + 1}` })));
  await Conversation.insertMany(extraBookings.map((b) => ({ booking: b._id, kind: "booking", party: "both", members: [customer._id, host._id], customer: customer._id, host: host._id, bookingCode: b.code, productName: b.snapshot.product.name, createdBy: customer._id })));
  await renter.goto(`${url}/inbox`);
  const inboxLinks = renter.locator('a[href^="/inbox/"]');
  await expect(inboxLinks).toHaveCount(20);
  await renter.getByText("20 of 23 conversations", { exact: true }).scrollIntoViewIfNeeded();
  await expect(inboxLinks).toHaveCount(23);
  const hrefs = await inboxLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(new Set(hrefs).size).toBe(23);
  await renter.getByRole("button", { name: "Support", exact: true }).click();
  await expect(inboxLinks).toHaveCount(1);
  await renter.getByRole("button", { name: "Booking", exact: true }).click();
  await expect(inboxLinks).toHaveCount(20);
  await renter.getByRole("textbox", { name: "Search conversations", exact: true }).fill("INBOX-BK-21");
  await expect(inboxLinks).toHaveCount(1);
  await reviewer.goto(`${url}/admin/support`);
  await expect(reviewer.locator('a[href^="/admin/support/"]')).toHaveCount(2);
  await reviewer.screenshot({ path: `${out}/admin-support-inbox.png`, fullPage: true });
  const response = await fetch(`${api}/chats`, { headers: { Authorization: `Bearer ${backend("./utils/jwt").signAccessToken(customer._id)}` } });
  expect(response.status).toBe(200);
  void admin;
};
