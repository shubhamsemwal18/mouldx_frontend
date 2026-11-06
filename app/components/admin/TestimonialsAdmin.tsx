"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil, Plus, Star, Trash2, X } from "lucide-react";
import styles from "./TestimonialsAdmin.module.css";
import {
  testimonialsAdminApi,
  type AdminTestimonial,
  type TestimonialInput,
} from "@/app/lib/testimonials-admin-api";

const EMPTY_FORM: TestimonialInput = {
  name: "",
  role: "",
  location: "",
  quote: "",
  rating: 5,
  published: true,
};

const QUOTE_MIN = 10;
const QUOTE_MAX = 400;

type FormErrors = Partial<Record<keyof TestimonialInput, string>>;

const validate = (form: TestimonialInput): FormErrors => {
  const errors: FormErrors = {};
  if (form.name.trim().length < 2) errors.name = "Enter the customer name.";
  if (!form.role.trim()) errors.role = "Enter the role or business.";
  const quoteLength = form.quote.trim().length;
  if (quoteLength < QUOTE_MIN) errors.quote = `Write at least ${QUOTE_MIN} characters.`;
  if (quoteLength > QUOTE_MAX) errors.quote = `Keep it under ${QUOTE_MAX} characters.`;
  if (form.rating < 1 || form.rating > 5) errors.rating = "Choose a rating from 1 to 5.";
  return errors;
};

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

export default function TestimonialsAdmin() {
  const [items, setItems] = useState<AdminTestimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState<TestimonialInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<AdminTestimonial | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setItems(await testimonialsAdminApi.list());
    } catch (err) {
      setLoadError(errorMessage(err, "Could not load testimonials."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-hide the success message.
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // Close the delete dialog with Escape.
  useEffect(() => {
    if (!deleteTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) setDeleteTarget(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteTarget, deleting]);

  const setField = <K extends keyof TestimonialInput>(key: K, value: TestimonialInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditingId(null);
    setFormError("");
  };

  const startEdit = (item: AdminTestimonial) => {
    setEditingId(item._id);
    setForm({
      name: item.name,
      role: item.role,
      location: item.location ?? "",
      quote: item.quote,
      rating: item.rating,
      published: item.published,
    });
    setErrors({});
    setFormError("");
    setNotice("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => nameRef.current?.focus(), 350);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const payload: TestimonialInput = {
      ...form,
      name: form.name.trim(),
      role: form.role.trim(),
      location: form.location?.trim() ?? "",
      quote: form.quote.trim(),
    };

    setSaving(true);
    setFormError("");
    try {
      if (editingId) {
        const updated = await testimonialsAdminApi.update(editingId, payload);
        setItems((current) => current.map((item) => (item._id === editingId ? updated : item)));
        setNotice("Testimonial updated.");
      } else {
        const created = await testimonialsAdminApi.create(payload);
        setItems((current) => [created, ...current]);
        setNotice("Testimonial added.");
      }
      resetForm();
    } catch (err) {
      setFormError(errorMessage(err, "Could not save the testimonial."));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await testimonialsAdminApi.remove(deleteTarget._id);
      setItems((current) => current.filter((item) => item._id !== deleteTarget._id));
      if (editingId === deleteTarget._id) resetForm();
      setDeleteTarget(null);
      setNotice("Testimonial deleted.");
    } catch (err) {
      setDeleteError(errorMessage(err, "Could not delete the testimonial."));
    } finally {
      setDeleting(false);
    }
  };

  const quoteLength = form.quote.trim().length;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Testimonials</h1>
          <p className={styles.pageSubtitle}>
            Manage the customer reviews shown on the home page.
          </p>
        </div>
        <span className={styles.countPill}>{items.length} total</span>
      </header>

      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}

      <div className={styles.layout}>
        {/* ---------- Form ---------- */}
        <form ref={formRef} className={styles.card} onSubmit={handleSubmit} noValidate>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              {editingId ? "Edit testimonial" : "Add testimonial"}
            </h2>
            {editingId && (
              <button type="button" className={styles.linkBtn} onClick={resetForm}>
                <X size={14} aria-hidden /> Cancel edit
              </button>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="t-name" className={styles.label}>
              Customer name
            </label>
            <input
              id="t-name"
              ref={nameRef}
              type="text"
              className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              maxLength={80}
              autoComplete="off"
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <p className={styles.error}>{errors.name}</p>}
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="t-role" className={styles.label}>
                Role / business
              </label>
              <input
                id="t-role"
                type="text"
                className={`${styles.input} ${errors.role ? styles.inputError : ""}`}
                value={form.role}
                onChange={(e) => setField("role", e.target.value)}
                maxLength={80}
                placeholder="Furniture Manufacturer"
                autoComplete="off"
                aria-invalid={Boolean(errors.role)}
              />
              {errors.role && <p className={styles.error}>{errors.role}</p>}
            </div>

            <div className={styles.field}>
              <label htmlFor="t-location" className={styles.label}>
                Location <span className={styles.optional}>(optional)</span>
              </label>
              <input
                id="t-location"
                type="text"
                className={styles.input}
                value={form.location}
                onChange={(e) => setField("location", e.target.value)}
                maxLength={80}
                placeholder="City, State"
                autoComplete="off"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="t-quote" className={styles.label}>
              Feedback
            </label>
            <textarea
              id="t-quote"
              className={`${styles.input} ${styles.textarea} ${errors.quote ? styles.inputError : ""}`}
              value={form.quote}
              onChange={(e) => setField("quote", e.target.value)}
              rows={5}
              aria-invalid={Boolean(errors.quote)}
            />
            <div className={styles.fieldMeta}>
              {errors.quote ? <p className={styles.error}>{errors.quote}</p> : <span />}
              <span
                className={`${styles.counter} ${quoteLength > QUOTE_MAX ? styles.counterOver : ""}`}
              >
                {quoteLength}/{QUOTE_MAX}
              </span>
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.label} id="t-rating-label">
              Rating
            </span>
            <div className={styles.ratingInput} role="radiogroup" aria-labelledby="t-rating-label">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={form.rating === n}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  className={styles.starBtn}
                  onClick={() => setField("rating", n)}
                >
                  <Star
                    size={24}
                    aria-hidden
                    className={n <= form.rating ? styles.starOn : styles.starOff}
                  />
                </button>
              ))}
            </div>
            {errors.rating && <p className={styles.error}>{errors.rating}</p>}
          </div>

          <label className={styles.switchRow}>
            <input
              type="checkbox"
              className={styles.switchInput}
              checked={form.published}
              onChange={(e) => setField("published", e.target.checked)}
            />
            <span className={styles.switchTrack} aria-hidden />
            <span className={styles.switchText}>
              Show on home page
              <span className={styles.switchHint}>
                Turn off to keep it as a draft.
              </span>
            </span>
          </label>

          {formError && (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          )}

          <div className={styles.actions}>
            <button type="submit" className={styles.primaryBtn} disabled={saving}>
              {!editingId && !saving && <Plus size={16} aria-hidden />}
              {saving ? "Saving..." : editingId ? "Update testimonial" : "Add testimonial"}
            </button>
            {editingId && (
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* ---------- List ---------- */}
        <section className={styles.card} aria-labelledby="t-list-title">
          <div className={styles.cardHeader}>
            <h2 id="t-list-title" className={styles.cardTitle}>
              All testimonials
            </h2>
          </div>

          {loading && <p className={styles.state}>Loading testimonials...</p>}

          {!loading && loadError && (
            <div className={styles.errorBox} role="alert">
              <p>{loadError}</p>
              <button type="button" className={styles.secondaryBtn} onClick={load}>
                Try again
              </button>
            </div>
          )}

          {!loading && !loadError && items.length === 0 && (
            <p className={styles.state}>No testimonials yet. Add your first one using the form.</p>
          )}

          {!loading && !loadError && items.length > 0 && (
            <ul className={styles.list}>
              {items.map((item) => (
                <li
                  key={item._id}
                  className={`${styles.listItem} ${
                    editingId === item._id ? styles.listItemEditing : ""
                  }`}
                >
                  <div className={styles.itemTop}>
                    <div className={styles.itemWho}>
                      <p className={styles.itemName}>{item.name}</p>
                      <p className={styles.itemMeta}>
                        {item.role}
                        {item.location ? ` · ${item.location}` : ""}
                      </p>
                    </div>
                    <span
                      className={`${styles.badge} ${
                        item.published ? styles.badgeLive : styles.badgeDraft
                      }`}
                    >
                      {item.published ? "Published" : "Draft"}
                    </span>
                  </div>

                  <div
                    className={styles.itemStars}
                    role="img"
                    aria-label={`${item.rating} out of 5 stars`}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={14}
                        aria-hidden
                        className={n <= item.rating ? styles.starOn : styles.starOff}
                      />
                    ))}
                  </div>

                  <p className={styles.itemQuote}>{item.quote}</p>

                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => startEdit(item)}
                      aria-label={`Edit testimonial from ${item.name}`}
                    >
                      <Pencil size={15} aria-hidden /> Edit
                    </button>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => {
                        setDeleteError("");
                        setDeleteTarget(item);
                      }}
                      aria-label={`Delete testimonial from ${item.name}`}
                    >
                      <Trash2 size={15} aria-hidden /> Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ---------- Delete confirmation ---------- */}
      {deleteTarget && (
        <div
          className={styles.backdrop}
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className={styles.dialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="t-delete-title"
            aria-describedby="t-delete-text"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="t-delete-title" className={styles.dialogTitle}>
              Delete this testimonial?
            </h3>
            <p id="t-delete-text" className={styles.dialogText}>
              The review from <strong>{deleteTarget.name}</strong> will be removed permanently.
              This cannot be undone.
            </p>
            {deleteError && (
              <p className={styles.formError} role="alert">
                {deleteError}
              </p>
            )}
            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                autoFocus
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}