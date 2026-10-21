"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./ProductDetails.module.css";
import { getApiErrorMessage } from "@/app/lib/api";
import { useAuth } from "@/app/lib/auth-context";
import { categoryApi, type PublishedCategory } from "@/app/lib/category-api";
import {
  formatBytes,
  getUploadRejection,
  MAX_UPLOAD_BYTES,
  uploadListingMedia,
} from "@/app/lib/media-api";
import { productApi, type MouldInput, type ProductWritePayload } from "@/app/lib/product-api";
import type { MouldType, RunnerType } from "@/app/lib/types";

/* =====================================================================
   CONSTANTS
===================================================================== */
const REGEX = {
  name: /^[a-zA-Z0-9\s.,'\-()]{2,80}$/,
  mouldNameOrId: /^[a-zA-Z0-9\s.,'\-·]{3,80}$/,
  text: /^[a-zA-Z0-9\s.,'\-\/]{2,60}$/,
  year: /^(19|20)\d{2}$/,
  posInt: /^[1-9]\d*$/,
  posDec: /^\d+(\.\d{1,2})?$/,
};

const MOULD_TYPES: MouldType[] = ["Injection", "Blow", "Die-Cast", "Compression"];
const RUNNER_TYPES: RunnerType[] = ["Hot Runner", "Cold Runner"];
const YES_NO = ["No", "Yes"];
const MAX_COMPONENTS = 10;

interface Option {
  value: string;
  label: string;
}

/** Plain string lists reuse the same option shape as fetched categories. */
const toOptions = (values: readonly string[]): Option[] =>
  values.map((value) => ({ value, label: value }));

const toCategoryOptions = (categories: PublishedCategory[]): Option[] =>
  categories.map((category) => ({ value: category._id, label: category.title }));

/** Media already on the listing becomes an item that needs no re-upload. */
const toStoredMedia = (media?: { _id: string; url?: string; originalName?: string }[] | null): MediaItem[] =>
  (media || []).map((item) => ({
    mediaId: item._id,
    previewUrl: item.url,
    name: item.originalName,
  }));

const str = (value: number | undefined | null): string =>
  value === undefined || value === null ? "" : String(value);

const num = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/* =====================================================================
   TYPES + INITIAL STATE
===================================================================== */
interface Coords {
  lat: number;
  lng: number;
}

/**
 * One picked or already-stored media item. `file` is set for a fresh pick,
 * `mediaId` for something already uploaded — an edit keeps the latter so the
 * owner never re-uploads what is already on the listing.
 */
interface MediaItem {
  file?: File;
  mediaId?: string;
  previewUrl?: string;
  name?: string;
}

type LocationStatus = "idle" | "fetching" | "done" | "denied";

interface ProductState {
  productName: string;
  category: string;
  subCategory: string;
  images: MediaItem[];
  videos: MediaItem[];
  length: string;
  breadth: string;
  height: string;
  weight: string;
  material: string;
  surfaceFinish: string;
  perDayCharges: string;
  securityDeposit: string;
  componentCount: string;
}

interface ComponentState {
  name: string;
  length: string;
  breadth: string;
  height: string;
  weight: string;
  surfaceFinish: string;
}

interface MouldState {
  images: MediaItem[];
  videos: MediaItem[];
  mouldNameOrId: string;
  mouldType: string;
  year: string;
  length: string;
  breadth: string;
  height: string;
  weight: string;
  cavities: string;
  cycleTime: string;
  tonnage: string;
  runnerType: string;
  changeableLogo: string;
}

const emptyProduct = (): ProductState => ({
  productName: "",
  category: "",
  subCategory: "",
  images: [],
  videos: [],
  length: "",
  breadth: "",
  height: "",
  weight: "",
  material: "",
  surfaceFinish: "",
  perDayCharges: "",
  securityDeposit: "",
  componentCount: "0", // 0 = nothing selected, component and mould forms stay hidden
});

const emptyComponent = (): ComponentState => ({
  name: "",
  length: "",
  breadth: "",
  height: "",
  weight: "",
  surfaceFinish: "",
});

const emptyMould = (): MouldState => ({
  images: [],
  videos: [],
  mouldNameOrId: "",
  mouldType: MOULD_TYPES[0],
  year: "",
  length: "",
  breadth: "",
  height: "",
  weight: "",
  cavities: "",
  cycleTime: "",
  tonnage: "",
  runnerType: RUNNER_TYPES[0],
  changeableLogo: "No",
});

/* =====================================================================
   VALIDATION
===================================================================== */
const req = (v: string, re: RegExp, msg: string) =>
  v.trim() === "" ? "Required" : !re.test(v.trim()) ? msg : "";
const dec = (v: string) => req(v, REGEX.posDec, "Numeric value only");
const int = (v: string) => req(v, REGEX.posInt, "Whole number only");

function validateAll(
  product: ProductState,
  components: ComponentState[],
  moulds: MouldState[],
  hasSubCategories: boolean
) {
  const e: Record<string, string> = {};
  const add = (key: string, msg: string) => {
    if (msg) e[key] = msg;
  };

  const count = Number(product.componentCount);

  // ----- Product -----
  add("p.productName", req(product.productName, REGEX.name, "2–80 characters, letters/numbers only"));
  if (!product.category) {
    add("p.category", "Required");
  }
  if (hasSubCategories && !product.subCategory) {
    add("p.subCategory", "Required");
  }
  add("p.images", product.images.length > 0 ? "" : "At least one image is required");
  add("p.length", dec(product.length));
  add("p.breadth", dec(product.breadth));
  add("p.height", dec(product.height));
  add("p.weight", dec(product.weight));
  add("p.material", req(product.material, REGEX.text, "Enter a valid material"));
  add("p.surfaceFinish", req(product.surfaceFinish, REGEX.text, "Enter a valid surface finish"));
  add("p.perDayCharges", dec(product.perDayCharges));
  add("p.securityDeposit", dec(product.securityDeposit));

  // ----- Count must be selected -----
  if (count < 1) {
    add("count", "Select at least 1 component / mould");
  }

  // ----- Components (only when more than 1) -----
  if (count > 1) {
    components.slice(0, count).forEach((c, i) => {
      const k = `c.${i}`;
      add(`${k}.name`, req(c.name, REGEX.name, "2–80 characters, letters/numbers only"));

      add(`${k}.length`, dec(c.length));
      add(`${k}.breadth`, dec(c.breadth));
      add(`${k}.height`, dec(c.height));
      add(`${k}.weight`, dec(c.weight));
      add(`${k}.surfaceFinish`, req(c.surfaceFinish, REGEX.text, "Enter a valid surface finish"));
    });
  }

  // ----- Moulds (one per component, or one for the product) -----
  if (count >= 1) {
    moulds.slice(0, count).forEach((m, i) => {
      const k = `m.${i}`;
      add(`${k}.mouldNameOrId`, req(m.mouldNameOrId, REGEX.mouldNameOrId, "3–80 characters, letters/numbers only"));
      add(`${k}.year`, req(m.year, REGEX.year, "Enter a valid year (e.g. 2022)"));
      add(`${k}.length`, dec(m.length));
      add(`${k}.breadth`, dec(m.breadth));
      add(`${k}.height`, dec(m.height));
      add(`${k}.weight`, dec(m.weight));
      add(`${k}.cavities`, int(m.cavities));
      add(`${k}.cycleTime`, int(m.cycleTime));
      add(`${k}.tonnage`, dec(m.tonnage));
    });
  }

  return e;
}

/* =====================================================================
   SMALL UI PIECES
===================================================================== */
interface Ctx {
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  touch: (key: string) => void;
  locationStatus: LocationStatus;
  coords: Coords | null;
}

type Mode = "text" | "int" | "dec";

const clean = (raw: string, mode: Mode) => {
  if (mode === "text") return raw;
  if (mode === "int") return raw.replace(/\D/g, "");
  let c = raw.replace(/[^0-9.]/g, "");
  const parts = c.split(".");
  if (parts.length > 2) c = parts[0] + "." + parts.slice(1).join("");
  return c;
};

function Field({
  ctx,
  id,
  label,
  value,
  onChange,
  mode = "text",
  placeholder,
  maxLength,
}: {
  ctx: Ctx;
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  mode?: Mode;
  placeholder?: string;
  maxLength?: number;
}) {
  const error = ctx.touched[id] ? ctx.errors[id] : "";
  return (
    <div>
      <label className={styles.fieldLabel}>{label}</label>
      <input
        type="text"
        inputMode={mode === "text" ? undefined : mode === "int" ? "numeric" : "decimal"}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(clean(e.target.value, mode))}
        onBlur={() => ctx.touch(id)}
        placeholder={placeholder}
        className={`${styles.input} ${error ? styles.inputError : ""}`}
      />
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  disabled = false,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <label className={styles.fieldLabel}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${styles.select} ${error ? styles.inputError : ""}`}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}

const MAX_IMAGES = 10;
const MAX_VIDEOS = 5;

/**
 * Multi-file picker for one gallery (images or videos). Thumbnails are
 * removable and the add tile disappears once the cap is reached.
 */
function MediaGallery({
  label,
  accept,
  kind,
  items,
  max,
  error,
  onAdd,
  onRemove,
}: {
  label: string;
  accept: string;
  kind: "image" | "video";
  items: MediaItem[];
  max: number;
  error?: string;
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
}) {
  const [rejected, setRejected] = useState<string[]>([]);
  const remaining = max - items.length;

  return (
    <div className={styles.galleryBlock}>
      <label className={styles.fieldLabel}>
        {label}{" "}
        <span className={styles.galleryCount}>
          {items.length}/{max}
        </span>
      </label>

      <div className={styles.galleryGrid}>
        {items.map((item, index) => (
          <div key={`${item.mediaId ?? item.name ?? "item"}-${index}`} className={styles.galleryTile}>
            {kind === "image" && item.previewUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={item.previewUrl} alt={`${label} ${index + 1}`} className={styles.galleryThumb} />
            ) : (
              <span className={styles.galleryVideoTile} aria-hidden>
                🎥
              </span>
            )}

            <button
              type="button"
              className={styles.galleryRemove}
              onClick={() => onRemove(index)}
              aria-label={`Remove ${label} ${index + 1}`}
            >
              ✕
            </button>

            {index === 0 && kind === "image" && <span className={styles.galleryCover}>Cover</span>}
          </div>
        ))}

        {remaining > 0 && (
          <label className={`${styles.galleryAdd} ${error ? styles.mediaBoxError : ""}`}>
            <span className={styles.mediaPlus}>{kind === "image" ? "📷" : "+"}</span>
            <span className={styles.mediaLabel}>Add</span>
            <input
              type="file"
              accept={accept}
              multiple
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                const problems: string[] = [];
                const accepted: File[] = [];

                for (const file of picked) {
                  const reason = getUploadRejection(file, kind);
                  if (reason) {
                    problems.push(reason);
                  } else if (accepted.length < remaining) {
                    accepted.push(file);
                  } else {
                    problems.push(`“${file.name}” was skipped — limit of ${max} reached.`);
                  }
                }

                setRejected(problems);
                if (accepted.length) onAdd(accepted);
                // Allow re-picking the same file after a remove.
                e.target.value = "";
              }}
              className={styles.mediaInput}
            />
          </label>
        )}
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      {rejected.length > 0 && (
        <ul className={styles.rejectList}>
          {rejected.map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      )}

      <p className={styles.galleryHint}>
        {kind === "image" ? "JPG, PNG or WebP" : "MP4 or MOV"} · up to{" "}
        {formatBytes(MAX_UPLOAD_BYTES)} each
      </p>
    </div>
  );
}

/** Images + videos for one entity (the product, or one mould). */
function MediaSection({
  ctx,
  base,
  images,
  videos,
  onAddImages,
  onRemoveImage,
  onAddVideos,
  onRemoveVideo,
}: {
  ctx: Ctx;
  base: string;
  images: MediaItem[];
  videos: MediaItem[];
  onAddImages: (files: File[]) => void;
  onRemoveImage: (index: number) => void;
  onAddVideos: (files: File[]) => void;
  onRemoveVideo: (index: number) => void;
}) {
  const imagesKey = `${base}.images`;
  const imageError = ctx.touched[imagesKey] ? ctx.errors[imagesKey] : "";

  return (
    <div className="mt-3">
      <MediaGallery
        label="Images"
        accept="image/*"
        kind="image"
        items={images}
        max={MAX_IMAGES}
        error={imageError}
        onAdd={(files) => {
          onAddImages(files);
          ctx.touch(imagesKey);
        }}
        onRemove={onRemoveImage}
      />

      <MediaGallery
        label="Videos"
        accept="video/*"
        kind="video"
        items={videos}
        max={MAX_VIDEOS}
        onAdd={onAddVideos}
        onRemove={onRemoveVideo}
      />
    </div>
  );
}

function DimensionsRow({
  ctx,
  base,
  values,
  onChange,
}: {
  ctx: Ctx;
  base: string;
  values: { length: string; breadth: string; height: string };
  onChange: (key: "length" | "breadth" | "height", v: string) => void;
}) {
  return (
    <div className="mt-3">
      <div className="grid grid-cols-3 gap-3">
        <Field ctx={ctx} id={`${base}.length`} label="Length (mm)" value={values.length} mode="dec" placeholder="420" onChange={(v) => onChange("length", v)} />
        <Field ctx={ctx} id={`${base}.breadth`} label="Breadth (mm)" value={values.breadth} mode="dec" placeholder="310" onChange={(v) => onChange("breadth", v)} />
        <Field ctx={ctx} id={`${base}.height`} label="Height (mm)" value={values.height} mode="dec" placeholder="280" onChange={(v) => onChange("height", v)} />
      </div>
    </div>
  );
}

function Accordion({
  title,
  subtitle,
  open,
  onToggle,
  hasError,
  children,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  hasError: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${styles.accordion} ${hasError ? styles.accordionError : ""}`}>
      <button type="button" onClick={onToggle} className={styles.accHeader} aria-expanded={open}>
        <div>
          <p className={styles.accTitle}>{title}</p>
          {subtitle && <p className={styles.accSubtitle}>{subtitle}</p>}
        </div>
        <div className={styles.accRight}>
          {hasError && <span className={styles.accBadge}>Fix errors</span>}
          <span className={`${styles.accChevron} ${open ? styles.accChevronOpen : ""}`} aria-hidden>
            ▾
          </span>
        </div>
      </button>
      {open && <div className={styles.accBody}>{children}</div>}
    </div>
  );
}

/* ---------- Mould Details block (re-used for every component) ---------- */
function MouldFields({
  ctx,
  base,
  m,
  set,
  onAddImages,
  onRemoveImage,
  onAddVideos,
  onRemoveVideo,
}: {
  ctx: Ctx;
  base: string;
  m: MouldState;
  set: (patch: Partial<MouldState>) => void;
  onAddImages: (files: File[]) => void;
  onRemoveImage: (index: number) => void;
  onAddVideos: (files: File[]) => void;
  onRemoveVideo: (index: number) => void;
}) {
  return (
    <>
      <Field ctx={ctx} id={`${base}.mouldNameOrId`} label="Mould Name / ID" value={m.mouldNameOrId} placeholder="Bottle Cap Mould · MX-000123" onChange={(v) => set({ mouldNameOrId: v })} />

      <MediaSection
        ctx={ctx}
        base={base}
        images={m.images}
        videos={m.videos}
        onAddImages={onAddImages}
        onRemoveImage={onRemoveImage}
        onAddVideos={onAddVideos}
        onRemoveVideo={onRemoveVideo}
      />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <SelectField label="Mould Type" value={m.mouldType} options={toOptions(MOULD_TYPES)} onChange={(v) => set({ mouldType: v })} />
        <Field ctx={ctx} id={`${base}.year`} label="Year of Manufacturing" value={m.year} mode="int" maxLength={4} placeholder="2022" onChange={(v) => set({ year: v })} />
      </div>

      <DimensionsRow
        ctx={ctx}
        base={base}
        values={m}
        onChange={(k, v) => set({ [k]: v } as Partial<MouldState>)}
      />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field ctx={ctx} id={`${base}.weight`} label="Weight (kg)" value={m.weight} mode="dec" placeholder="185" onChange={(v) => set({ weight: v })} />
        <Field ctx={ctx} id={`${base}.cavities`} label="No. of Cavities / Core" value={m.cavities} mode="int" placeholder="4" onChange={(v) => set({ cavities: v })} />
        <Field ctx={ctx} id={`${base}.cycleTime`} label="Expected Cycle Time (virgin material) (s)" value={m.cycleTime} mode="int" placeholder="28" onChange={(v) => set({ cycleTime: v })} />
        <Field ctx={ctx} id={`${base}.tonnage`} label="Recommended Machine Tonnage (T)" value={m.tonnage} mode="dec" placeholder="220" onChange={(v) => set({ tonnage: v })} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <SelectField label="Hot Runner / Cold Runner" value={m.runnerType} options={toOptions(RUNNER_TYPES)} onChange={(v) => set({ runnerType: v })} />
        <SelectField label="Changeable Brand Logo" value={m.changeableLogo} options={toOptions(YES_NO)} onChange={(v) => set({ changeableLogo: v })} />
      </div>
    </>
  );
}

/* =====================================================================
   PAGE
===================================================================== */
export default function ProductDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Present when editing a draft or fixing a rejected listing.
  const editingId = searchParams.get("id");

  const [product, setProduct] = useState<ProductState>(emptyProduct);
  const [components, setComponents] = useState<ComponentState[]>([emptyComponent()]);
  const [moulds, setMoulds] = useState<MouldState[]>([emptyMould()]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<Record<number, boolean>>({});

  // ---------- Geo-tag state (shared by every image and video) ----------
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");

  // ---------- Categories, loaded from the published category tree ----------
  const [rootCategories, setRootCategories] = useState<PublishedCategory[]>([]);
  const [subCategories, setSubCategories] = useState<PublishedCategory[]>([]);
  const [categoryError, setCategoryError] = useState("");

  // ---------- Submission ----------
  const { user, loading: authLoading } = useAuth();
  const [saving, setSaving] = useState<null | "draft" | "submit">(null);
  const [progress, setProgress] = useState("");
  const [serverError, setServerError] = useState("");
  const [serverDetails, setServerDetails] = useState<string[]>([]);
  // Media already uploaded in this session, keyed by File, so a retry after a
  // failed submit does not upload the same photo twice.
  const uploadedMedia = useRef(new Map<File, string>());

  const count = Number(product.componentCount);
  const hasSelection = count >= 1;
  const multiple = count > 1;

  const isApprovedOwner =
    Boolean(user?.approvedRoles.includes("owner")) && user?.profileVerificationStatus === "approved";

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/owner/moulds/new/product")}`);
      return;
    }

    if (!isApprovedOwner) {
      router.replace("/owner/onboarding");
    }
  }, [authLoading, isApprovedOwner, router, user]);

  useEffect(() => {
    let cancelled = false;

    categoryApi
      .listPublished({ limit: 100 })
      .then((data) => {
        if (cancelled) return;
        setRootCategories(data.categories);
        setCategoryError(
          data.categories.length === 0 ? "No categories are published yet. Ask admin to publish one." : ""
        );
      })
      .catch((err) => {
        if (!cancelled) setCategoryError(getApiErrorMessage(err, "Could not load categories"));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Subcategories follow the selected root category. Deferred to a macrotask so
  // the state updates do not run synchronously inside the effect.
  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      const selected = rootCategories.find((category) => category._id === product.category);

      if (!selected) {
        setSubCategories([]);
        return;
      }

      categoryApi
        .listPublished({ parentSlug: selected.slug, limit: 100 })
        .then((data) => {
          if (!cancelled) setSubCategories(data.categories);
        })
        .catch(() => {
          if (!cancelled) setSubCategories([]);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [product.category, rootCategories]);

  // ---------- Load an existing listing when editing ----------
  const [loadingListing, setLoadingListing] = useState(Boolean(editingId));
  const [listingStatus, setListingStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (!editingId) return;

    let cancelled = false;

    // Deferred to a macrotask so the state updates do not run synchronously
    // inside the effect.
    const timer = window.setTimeout(() => {
      setLoadingListing(true);

      productApi
        .get(editingId)
        .then(({ product: listing, moulds: storedMoulds }) => {
        if (cancelled) return;

        setListingStatus(listing.status);
        setRejectionReason(listing.rejectionReason || "");

        const total = Math.max(listing.componentCount || storedMoulds.length || 1, 1);

        setProduct({
          productName: listing.name || "",
          category: listing.category?._id || "",
          subCategory: listing.subCategory?._id || "",
          images: toStoredMedia(listing.images),
          videos: toStoredMedia(listing.videos),
          length: str(listing.dimensions?.length),
          breadth: str(listing.dimensions?.breadth),
          height: str(listing.dimensions?.height),
          weight: str(listing.weight),
          material: listing.material || "",
          surfaceFinish: listing.surfaceFinish || "",
          perDayCharges: str(listing.pricing?.perDayCharges),
          securityDeposit: str(listing.pricing?.securityDeposit),
          componentCount: String(total),
        });

        setComponents(
          Array.from({ length: total }, (_, i) => {
            const component = storedMoulds[i]?.component;
            if (!component) return emptyComponent();

            return {
              name: component.name || "",
              length: str(component.dimensions?.length),
              breadth: str(component.dimensions?.breadth),
              height: str(component.dimensions?.height),
              weight: str(component.weight),
              surfaceFinish: component.surfaceFinish || "",
            };
          })
        );

        setMoulds(
          Array.from({ length: total }, (_, i) => {
            const stored = storedMoulds[i];
            if (!stored) return emptyMould();

            return {
              images: toStoredMedia(stored.images),
              videos: toStoredMedia(stored.videos),
              mouldNameOrId: stored.mouldNameOrId || "",
              mouldType: stored.mouldType || MOULD_TYPES[0],
              year: str(stored.yearOfManufacturing),
              length: str(stored.dimensions?.length),
              breadth: str(stored.dimensions?.breadth),
              height: str(stored.dimensions?.height),
              weight: str(stored.weight),
              cavities: str(stored.cavities),
              cycleTime: str(stored.expectedCycleTime),
              tonnage: str(stored.recommendedMachineTonnage),
              runnerType: stored.runnerType || RUNNER_TYPES[0],
              changeableLogo: stored.changeableBrandLogo ? "Yes" : "No",
            };
          })
        );

        if (listing.location) setCoords(listing.location);
        })
        .catch((err) => {
          if (!cancelled) setServerError(getApiErrorMessage(err, "Could not load the listing"));
        })
        .finally(() => {
          if (!cancelled) setLoadingListing(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [editingId]);

  const errors = validateAll(product, components, moulds, subCategories.length > 0);
  const ctx: Ctx = {
    errors,
    touched,
    touch: (key) => setTouched((prev) => ({ ...prev, [key]: true })),
    locationStatus,
    coords,
  };

  /* ---------- updaters ---------- */
  const setP = (patch: Partial<ProductState>) => setProduct((prev) => ({ ...prev, ...patch }));
  const setComp = (i: number, patch: Partial<ComponentState>) =>
    setComponents((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const setMould = (i: number, patch: Partial<MouldState>) =>
    setMoulds((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  const handleCategoryChange = (category: string) => {
    setP({ category, subCategory: "" });
  };

  const handleCountChange = (value: string) => {
    const n = Number(value);
    setP({ componentCount: value });
    setTouched((prev) => ({ ...prev, count: true }));
    // arrays only grow, so typed data is kept when the count is reduced
    setComponents((prev) =>
      prev.length >= n ? prev : [...prev, ...Array.from({ length: n - prev.length }, emptyComponent)]
    );
    setMoulds((prev) =>
      prev.length >= n ? prev : [...prev, ...Array.from({ length: n - prev.length }, emptyMould)]
    );
  };

  /* ---------- Geolocation (cached after first success) ---------- */
  const fetchLocation = (): Promise<Coords | null> => {
    if (coords) return Promise.resolve(coords);
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocationStatus("denied");
      return Promise.resolve(null);
    }
    setLocationStatus("fetching");
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(c);
          setLocationStatus("done");
          resolve(c);
        },
        () => {
          setLocationStatus("denied");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  };

  /* ---------- Media handlers ---------- */

  const toMediaItems = (files: File[]): MediaItem[] =>
    files.map((file) => ({
      file,
      name: file.name,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));

  /** Adding media triggers one geolocation read, shared by every file. */
  const addProductMedia = (key: "images" | "videos", files: File[]) => {
    setP({ [key]: [...product[key], ...toMediaItems(files)] } as Partial<ProductState>);
    fetchLocation();
  };

  const removeProductMedia = (key: "images" | "videos", index: number) => {
    const item = product[key][index];
    if (item?.file && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    setP({ [key]: product[key].filter((_, i) => i !== index) } as Partial<ProductState>);
  };

  const addMouldMedia = (mouldIndex: number, key: "images" | "videos", files: File[]) => {
    setMoulds((prev) =>
      prev.map((mould, i) =>
        i === mouldIndex ? { ...mould, [key]: [...mould[key], ...toMediaItems(files)] } : mould
      )
    );
    fetchLocation();
  };

  const removeMouldMedia = (mouldIndex: number, key: "images" | "videos", index: number) => {
    const item = moulds[mouldIndex]?.[key][index];
    if (item?.file && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    setMoulds((prev) =>
      prev.map((mould, i) =>
        i === mouldIndex ? { ...mould, [key]: mould[key].filter((_, j) => j !== index) } : mould
      )
    );
  };

  const isOpen = (i: number) => open[i] ?? i === 0;
  const toggle = (i: number) => setOpen((prev) => ({ ...prev, [i]: !isOpen(i) }));

  const sectionHasError = (i: number) =>
    Object.keys(errors).some(
      (k) => (k.startsWith(`c.${i}.`) || k.startsWith(`m.${i}.`)) && errors[k] && touched[k]
    );

  /* ---------- Submission ---------- */

  /**
   * Uploads a file once per session and returns its media id. Files already
   * uploaded (because an earlier submit failed) are reused.
   */
  const uploadOnce = useCallback(async (file: File, location: Coords | null) => {
    const cached = uploadedMedia.current.get(file);
    if (cached) return cached;

    const mediaId = await uploadListingMedia(file, { folder: "product", location });
    uploadedMedia.current.set(file, mediaId);
    return mediaId;
  }, []);

  /**
   * Resolves a gallery to media ids: already-stored items pass straight
   * through, freshly picked files are uploaded. `onProgress` ticks once per
   * uploaded file so the owner sees honest progress.
   */
  const resolveGallery = async (items: MediaItem[], onProgress: () => void) => {
    const ids: string[] = [];

    for (const item of items) {
      if (item.mediaId) {
        ids.push(item.mediaId);
        continue;
      }

      if (!item.file) continue;

      ids.push(await uploadOnce(item.file, coords));
      onProgress();
    }

    return ids;
  };

  const buildPayload = async (submit: boolean): Promise<ProductWritePayload> => {
    const activeMoulds = moulds.slice(0, count);
    const pendingUploads =
      product.images.filter((m) => !m.mediaId).length +
      product.videos.filter((m) => !m.mediaId).length +
      activeMoulds.reduce(
        (sum, mould) =>
          sum +
          mould.images.filter((m) => !m.mediaId).length +
          mould.videos.filter((m) => !m.mediaId).length,
        0
      );

    let done = 0;
    const tick = () => {
      done += 1;
      setProgress(`Uploading media ${done} of ${pendingUploads}...`);
    };

    if (pendingUploads > 0) setProgress(`Uploading media 1 of ${pendingUploads}...`);

    const productImageIds = await resolveGallery(product.images, tick);
    const productVideoIds = await resolveGallery(product.videos, tick);

    const mouldPayload: MouldInput[] = [];

    for (let index = 0; index < activeMoulds.length; index += 1) {
      const mould = activeMoulds[index];
      const imageIds = await resolveGallery(mould.images, tick);
      const videoIds = await resolveGallery(mould.videos, tick);

      mouldPayload.push({
        mouldNameOrId: mould.mouldNameOrId.trim() || undefined,
        mouldType: mould.mouldType as MouldType,
        yearOfManufacturing: num(mould.year),
        dimensions: {
          length: num(mould.length),
          breadth: num(mould.breadth),
          height: num(mould.height),
        },
        weight: num(mould.weight),
        cavities: num(mould.cavities),
        expectedCycleTime: num(mould.cycleTime),
        recommendedMachineTonnage: num(mould.tonnage),
        runnerType: mould.runnerType as RunnerType,
        changeableBrandLogo: mould.changeableLogo === "Yes",
        imageIds,
        videoIds,
        ...(multiple
          ? {
              component: {
                name: components[index]?.name?.trim() || undefined,
                dimensions: {
                  length: num(components[index]?.length ?? ""),
                  breadth: num(components[index]?.breadth ?? ""),
                  height: num(components[index]?.height ?? ""),
                },
                weight: num(components[index]?.weight ?? ""),
                surfaceFinish: components[index]?.surfaceFinish?.trim() || undefined,
              },
            }
          : {}),
      });
    }

    setProgress(submit ? "Submitting listing..." : editingId ? "Saving changes..." : "Saving draft...");

    return {
      name: product.productName.trim(),
      categoryId: product.category || null,
      subCategoryId: product.subCategory || null,
      imageIds: productImageIds,
      videoIds: productVideoIds,
      dimensions: {
        length: num(product.length),
        breadth: num(product.breadth),
        height: num(product.height),
      },
      weight: num(product.weight),
      material: product.material.trim() || undefined,
      surfaceFinish: product.surfaceFinish.trim() || undefined,
      pricing: {
        perDayCharges: num(product.perDayCharges),
        securityDeposit: num(product.securityDeposit),
      },
      componentCount: count >= 1 ? count : undefined,
      location: coords,
      moulds: mouldPayload,
      submit,
    };
  };

  const save = async (mode: "draft" | "submit") => {
    if (saving) return;

    setServerError("");
    setServerDetails([]);

    // A draft only needs a product name; a submission must pass every rule.
    if (mode === "submit") {
      setTouched(Object.fromEntries(Object.keys(errors).map((k) => [k, true])));
      if (Object.keys(errors).length > 0) {
        // open every component so every error is visible
        if (count > 0) {
          setOpen(Object.fromEntries(Array.from({ length: count }, (_, i) => [i, true])));
        }
        return;
      }
    } else if (!product.productName.trim()) {
      setTouched((prev) => ({ ...prev, "p.productName": true }));
      setServerError("Add a product name before saving a draft.");
      return;
    }

    setSaving(mode);

    try {
      const payload = await buildPayload(mode === "submit");

      if (editingId) {
        await productApi.update(editingId, payload);
      } else {
        await productApi.create(payload);
      }

      router.push(mode === "submit" ? "/owner/moulds/new/submitted" : "/owner/moulds");
    } catch (err) {
      const details = (err as { response?: { data?: { details?: { message: string }[] } } })?.response
        ?.data?.details;
      setServerDetails((details || []).map((detail) => detail.message));
      setServerError(getApiErrorMessage(err, "Could not save the listing"));
    } finally {
      setSaving(null);
      setProgress("");
    }
  };

  const countError = touched["count"] ? errors["count"] : "";
  const isBusy = saving !== null;

  const isLocked = listingStatus === "in_review" || listingStatus === "approved";

  if (loadingListing) {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <p className={styles.loadingText}>Loading listing...</p>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <h1 className="text-[26px] font-extrabold text-gray-900">Product Details</h1>
          <div className={styles.lockedCard}>
            <p className={styles.lockedTitle}>
              {listingStatus === "in_review"
                ? "This listing is under admin review"
                : "This listing is approved and live"}
            </p>
            <p className={styles.lockedText}>
              {listingStatus === "in_review"
                ? "You can edit it again if admin asks for changes."
                : "An approved listing cannot be edited."}
            </p>
            <button
              type="button"
              onClick={() => router.push("/owner/moulds")}
              className={`${styles.ctaBtn} btn-primary`}
            >
              Back to My Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className="text-[26px] font-extrabold text-gray-900">Product Details</h1>
        <p className="mt-1 text-sm text-gray-400">Add the product, its components &amp; moulds.</p>
        {/* ---------- Admin remarks, shown when fixing a rejected listing ---------- */}
        {listingStatus === "rejected" && (
          <div className={styles.rejectedCard}>
            <span className={styles.rejectedPill}>CHANGES REQUESTED</span>
            <p className={styles.rejectedTitle}>Admin remarks</p>
            <p className={styles.rejectedText}>{rejectionReason || "No reason was provided."}</p>
          </div>
        )}

        {/* ================= PRODUCT DETAILS ================= */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Product Details</h2>

          <Field ctx={ctx} id="p.productName" label="Product Name" value={product.productName} placeholder="28mm PET Bottle Cap" onChange={(v) => setP({ productName: v })} />

          <div className="mt-3 grid grid-cols-2 gap-3">
            <SelectField
              label="Category"
              value={product.category}
              options={toCategoryOptions(rootCategories)}
              onChange={handleCategoryChange}
              placeholder={rootCategories.length === 0 ? "Loading..." : "Select category"}
              disabled={rootCategories.length === 0}
              error={touched["p.category"] ? errors["p.category"] : ""}
            />
            <SelectField
              label="Sub Category"
              value={product.subCategory}
              options={toCategoryOptions(subCategories)}
              onChange={(v) => setP({ subCategory: v })}
              placeholder={subCategories.length === 0 ? "—" : "Select sub category"}
              disabled={subCategories.length === 0}
              error={touched["p.subCategory"] ? errors["p.subCategory"] : ""}
            />
          </div>

          {categoryError && <p className={styles.errorText}>{categoryError}</p>}

          <MediaSection
            ctx={ctx}
            base="p"
            images={product.images}
            videos={product.videos}
            onAddImages={(files) => addProductMedia("images", files)}
            onRemoveImage={(i) => removeProductMedia("images", i)}
            onAddVideos={(files) => addProductMedia("videos", files)}
            onRemoveVideo={(i) => removeProductMedia("videos", i)}
          />

          <DimensionsRow
            ctx={ctx}
            base="p"
            values={product}
            onChange={(k, v) => setP({ [k]: v } as Partial<ProductState>)}
          />

          <div className="mt-3">
            <Field ctx={ctx} id="p.weight" label="Weight (g)" value={product.weight} mode="dec" placeholder="3.2" onChange={(v) => setP({ weight: v })} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field ctx={ctx} id="p.material" label="Material" value={product.material} placeholder="HDPE" onChange={(v) => setP({ material: v })} />
            <Field ctx={ctx} id="p.surfaceFinish" label="Surface Finish" value={product.surfaceFinish} placeholder="Matte" onChange={(v) => setP({ surfaceFinish: v })} />
          </div>

          <div className="mt-3">
            <Field ctx={ctx} id="p.securityDeposit" label="Security Deposit Amount (₹)" value={product.securityDeposit} mode="dec" placeholder="50000" onChange={(v) => setP({ securityDeposit: v })} />
          </div>
        </div>

        {/* ---------- Rental price hero card ---------- */}
        <div className={styles.rentalCard}>
          <span className={styles.rentalPill}>RENTAL</span>
          <div className={styles.rentalPriceRow}>
            <span className={styles.rentalPrice}>₹{product.perDayCharges || "0"}</span>
            <span className={styles.rentalPeriod}>/ day</span>
          </div>
          <p className={styles.rentalSubtext}>Per day rental charges</p>

          <input
            type="text"
            inputMode="decimal"
            value={product.perDayCharges}
            onChange={(e) => setP({ perDayCharges: clean(e.target.value, "dec") })}
            onBlur={() => ctx.touch("p.perDayCharges")}
            placeholder="Enter amount"
            className={styles.rentalInput}
          />
          {touched["p.perDayCharges"] && errors["p.perDayCharges"] && (
            <p className={styles.rentalError}>{errors["p.perDayCharges"]}</p>
          )}
        </div>

        {/* ================= SET OF COMPONENTS / MOULDS ================= */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Set of Components / Moulds Involved</h2>
          <label className={styles.fieldLabel}>Number of components / moulds</label>
          <select
            value={product.componentCount}
            onChange={(e) => handleCountChange(e.target.value)}
            className={`${styles.select} ${countError ? styles.inputError : ""}`}
          >
            {Array.from({ length: MAX_COMPONENTS + 1 }, (_, i) => String(i)).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          {countError && <p className={styles.errorText}>{countError}</p>}
          <p className={styles.helperText}>
            {!hasSelection
              ? "Select how many components / moulds are involved. The forms will appear below."
              : multiple
              ? `Fill details for all ${count} components below (example: Pen → Cap, Body, Bottom, Top).`
              : "Single mould. Fill the mould details below."}
          </p>
        </div>

        {/* ================= SINGLE MOULD ================= */}
        {count === 1 && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Mould Details</h2>
            <MouldFields
              ctx={ctx}
              base="m.0"
              m={moulds[0]}
              set={(patch) => setMould(0, patch)}
              onAddImages={(files) => addMouldMedia(0, "images", files)}
              onRemoveImage={(i) => removeMouldMedia(0, "images", i)}
              onAddVideos={(files) => addMouldMedia(0, "videos", files)}
              onRemoveVideo={(i) => removeMouldMedia(0, "videos", i)}
            />
          </div>
        )}

        {/* ================= MULTIPLE COMPONENTS (collapsible) ================= */}
        {multiple &&
          Array.from({ length: count }, (_, i) => {
            const c = components[i];
            const m = moulds[i];
            if (!c || !m) return null;
            const cBase = `c.${i}`;
            return (
              <Accordion
                key={i}
                title={`Component ${i + 1}`}
                subtitle={c.name || "Tap to fill component and mould details"}
                open={isOpen(i)}
                onToggle={() => toggle(i)}
                hasError={sectionHasError(i)}
              >
                {/* ----- Component Details ----- */}
                <p className={styles.subTitle}>Component Details</p>

                <div className="mt-3">
                  <Field ctx={ctx} id={`${cBase}.name`} label="Component Name" value={c.name} placeholder="Cap" onChange={(v) => setComp(i, { name: v })} />
                </div>

                <DimensionsRow
                  ctx={ctx}
                  base={cBase}
                  values={c}
                  onChange={(k, v) => setComp(i, { [k]: v } as Partial<ComponentState>)}
                />

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Field ctx={ctx} id={`${cBase}.weight`} label="Weight (g)" value={c.weight} mode="dec" placeholder="3.2" onChange={(v) => setComp(i, { weight: v })} />
                  <Field ctx={ctx} id={`${cBase}.surfaceFinish`} label="Surface Finish" value={c.surfaceFinish} placeholder="Matte" onChange={(v) => setComp(i, { surfaceFinish: v })} />
                </div>

                {/* ----- Mould Details ----- */}
                <div className={styles.divider} />
                <p className={styles.subTitle}>Mould Details</p>
                <div className="mt-3">
                  <MouldFields
                    ctx={ctx}
                    base={`m.${i}`}
                    m={m}
                    set={(patch) => setMould(i, patch)}
                    onAddImages={(files) => addMouldMedia(i, "images", files)}
                    onRemoveImage={(idx) => removeMouldMedia(i, "images", idx)}
                    onAddVideos={(files) => addMouldMedia(i, "videos", files)}
                    onRemoveVideo={(idx) => removeMouldMedia(i, "videos", idx)}
                  />
                </div>
              </Accordion>
            );
          })}
      </div>

      {/* ---------- Sticky Submit ---------- */}
      <div className={styles.ctaBar}>
        {(serverError || progress) && (
          <div className={styles.ctaStatus}>
            {progress && <p className={styles.ctaProgress}>{progress}</p>}
            {serverError && <p className={styles.ctaError}>{serverError}</p>}
            {serverDetails.length > 0 && (
              <ul className={styles.ctaErrorList}>
                {serverDetails.slice(0, 4).map((detail, i) => (
                  <li key={i}>{detail}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className={styles.ctaActions}>
          <button
            type="button"
            onClick={() => save("draft")}
            disabled={isBusy}
            className={styles.ctaDraftBtn}
          >
            {saving === "draft" ? "Saving..." : editingId ? "Save Changes" : "Save as Draft"}
          </button>
          <button
            type="button"
            onClick={() => save("submit")}
            disabled={isBusy}
            className={`${styles.ctaBtn} btn-primary`}
          >
            {saving === "submit"
              ? "Submitting..."
              : listingStatus === "rejected"
                ? "Resubmit for Approval"
                : "Submit for Approval"}
          </button>
        </div>
      </div>
    </div>
  );
}