export interface AdminTestimonial {
  _id: string;
  name: string;
  role: string;
  location?: string;
  quote: string;
  /** 1 to 5 */
  rating: number;
  published: boolean;
  createdAt?: string;
}

export type TestimonialInput = Omit<AdminTestimonial, "_id" | "createdAt">;

// Static (no backend) version: data is kept in this browser's localStorage.
const STORAGE_KEY = "mouldx-admin-testimonials";

const SEED: AdminTestimonial[] = [
  {
    _id: "seed-1",
    name: "Sample Customer",
    role: "Furniture Manufacturer",
    location: "City, State",
    quote: "This is a sample testimonial. Edit or delete it to try the form.",
    rating: 5,
    published: true,
    createdAt: new Date().toISOString(),
  },
  {
    _id: "seed-2",
    name: "Another Customer",
    role: "Plastic Moulding Unit",
    location: "City, State",
    quote: "Second sample review, saved as a draft so you can see both badges.",
    rating: 4,
    published: false,
    createdAt: new Date().toISOString(),
  },
];

const read = (): AdminTestimonial[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AdminTestimonial[];
  } catch {
    /* storage unavailable or corrupted: fall back to the seed data */
  }
  return SEED;
};

const write = (items: AdminTestimonial[]) => {
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
    : `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const testimonialsAdminApi = {
  list: async (): Promise<AdminTestimonial[]> => {
    await wait();
    return read();
  },

  create: async (input: TestimonialInput): Promise<AdminTestimonial> => {
    await wait();
    const created: AdminTestimonial = {
      ...input,
      _id: newId(),
      createdAt: new Date().toISOString(),
    };
    write([created, ...read()]);
    return created;
  },

  update: async (id: string, input: TestimonialInput): Promise<AdminTestimonial> => {
    await wait();
    const items = read();
    const current = items.find((item) => item._id === id);
    if (!current) throw new Error("Testimonial not found.");
    const updated: AdminTestimonial = { ...current, ...input };
    write(items.map((item) => (item._id === id ? updated : item)));
    return updated;
  },

  remove: async (id: string): Promise<void> => {
    await wait();
    write(read().filter((item) => item._id !== id));
  },
};