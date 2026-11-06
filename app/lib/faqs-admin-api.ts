export type FaqPlacement = "home" | "faq-page" | "both";

export interface AdminFaq {
  _id: string;
  question: string;
  answer: string;
  /** Where this FAQ is shown on the public site. */
  placement: FaqPlacement;
  published: boolean;
  createdAt?: string;
}

export type FaqInput = Omit<AdminFaq, "_id" | "createdAt">;

export const PLACEMENT_OPTIONS: { value: FaqPlacement; label: string }[] = [
  { value: "home", label: "Home page" },
  { value: "faq-page", label: "FAQ page" },
  { value: "both", label: "Both pages" },
];

export const placementLabel = (value: FaqPlacement) =>
  PLACEMENT_OPTIONS.find((option) => option.value === value)?.label ?? value;

// Static (no backend) version: data is kept in this browser's localStorage.
const STORAGE_KEY = "mouldx-admin-faqs";

const now = () => new Date().toISOString();

const SEED: AdminFaq[] = [
  {
    _id: "seed-1",
    question: "What is MouldX?",
    answer:
      "MouldX is a platform where manufacturers can find, book and rent verified injection, blow and die-cast moulds without buying them.",
    placement: "both",
    published: true,
    createdAt: now(),
  },
  {
    _id: "seed-2",
    question: "How do I book a mould?",
    answer:
      "Search for the mould you need, check its availability, choose your dates and confirm the booking. Our team then contacts you to finalise the details.",
    placement: "home",
    published: true,
    createdAt: now(),
  },
  {
    _id: "seed-3",
    question: "Who is responsible for damage during use?",
    answer:
      "Normal wear is covered. Damage caused by misuse or negligence is the renter's responsibility, as mentioned in the agreement.",
    placement: "faq-page",
    published: false,
    createdAt: now(),
  },
];

const read = (): AdminFaq[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AdminFaq[];
  } catch {
    /* storage unavailable or corrupted: fall back to the seed data */
  }
  return SEED;
};

const write = (items: AdminFaq[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore: changes just won't persist */
  }
};

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** True when an FAQ with this placement appears on the given page. */
export const appearsOn = (placement: FaqPlacement, page: "home" | "faq-page") =>
  placement === page || placement === "both";

/**
 * For the public site (client side only): published FAQs for one page.
 * Call it inside useEffect, because it reads localStorage.
 */
export const getPublishedFaqs = (page: "home" | "faq-page"): AdminFaq[] =>
  read().filter((faq) => faq.published && appearsOn(faq.placement, page));

export const faqsAdminApi = {
  list: async (): Promise<AdminFaq[]> => {
    await wait();
    return read();
  },

  create: async (input: FaqInput): Promise<AdminFaq> => {
    await wait();
    const created: AdminFaq = { ...input, _id: newId(), createdAt: now() };
    write([created, ...read()]);
    return created;
  },

  update: async (id: string, input: FaqInput): Promise<AdminFaq> => {
    await wait();
    const items = read();
    const current = items.find((item) => item._id === id);
    if (!current) throw new Error("FAQ not found.");
    const updated: AdminFaq = { ...current, ...input };
    write(items.map((item) => (item._id === id ? updated : item)));
    return updated;
  },

  remove: async (id: string): Promise<void> => {
    await wait();
    write(read().filter((item) => item._id !== id));
  },
};