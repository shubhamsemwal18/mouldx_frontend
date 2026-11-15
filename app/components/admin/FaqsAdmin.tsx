"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import styles from "./FaqsAdmin.module.css";
import {
  PLACEMENT_OPTIONS,
  appearsOn,
  faqsAdminApi,
  placementLabel,
  type AdminFaq,
  type FaqInput,
} from "@/app/lib/faqs-admin-api";

const EMPTY_FORM: FaqInput = {
  question: "",
  answer: "",
  placement: "home",
  published: true,
};

const QUESTION_MIN = 5;
const QUESTION_MAX = 160;
const ANSWER_MIN = 10;
const ANSWER_MAX = 600;

type FormErrors = Partial<Record<keyof FaqInput, string>>;
type Filter = "all" | "home" | "faq-page";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "home", label: "Home page" },
  { value: "faq-page", label: "FAQ page" },
];

const validate = (form: FaqInput): FormErrors => {
  const errors: FormErrors = {};
  const q = form.question.trim().length;
  const a = form.answer.trim().length;
  if (q < QUESTION_MIN) errors.question = `Write at least ${QUESTION_MIN} characters.`;
  else if (q > QUESTION_MAX) errors.question = `Keep it under ${QUESTION_MAX} characters.`;
  if (a < ANSWER_MIN) errors.answer = `Write at least ${ANSWER_MIN} characters.`;
  else if (a > ANSWER_MAX) errors.answer = `Keep it under ${ANSWER_MAX} characters.`;
  return errors;
};

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

const countFor = (items: AdminFaq[], filter: Filter) =>
  filter === "all" ? items.length : items.filter((i) => appearsOn(i.placement, filter)).length;

export default function FaqsAdmin() {
  const [items, setItems] = useState<AdminFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState<FaqInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<AdminFaq | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const formRef = useRef<HTMLFormElement>(null);
  const questionRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setItems(await faqsAdminApi.list());
    } catch (err) {
      setLoadError(errorMessage(err, "Could not load FAQs."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!deleteTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) setDeleteTarget(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteTarget, deleting]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== "all" && !appearsOn(item.placement, filter)) return false;
      if (q && !`${item.question} ${item.answer}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, filter, search]);

  const setField = <K extends keyof FaqInput>(key: K, value: FaqInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditingId(null);
    setFormError("");
  };

  const startEdit = (item: AdminFaq) => {
    setEditingId(item._id);
    setForm({
      question: item.question,
      answer: item.answer,
      placement: item.placement,
      published: item.published,
    });
    setErrors({});
    setFormError("");
    setNotice("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => questionRef.current?.focus(), 350);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const payload: FaqInput = {
      ...form,
      question: form.question.trim(),
      answer: form.answer.trim(),
    };

    setSaving(true);
    setFormError("");
    try {
      if (editingId) {
        const updated = await faqsAdminApi.update(editingId, payload);
        setItems((current) => current.map((item) => (item._id === editingId ? updated : item)));
        setNotice("FAQ updated.");
      } else {
        const created = await faqsAdminApi.create(payload);
        setItems((current) => [created, ...current]);
        setNotice("FAQ added.");
      }
      resetForm();
    } catch (err) {
      setFormError(errorMessage(err, "Could not save the FAQ."));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await faqsAdminApi.remove(deleteTarget._id);
      setItems((current) => current.filter((item) => item._id !== deleteTarget._id));
      if (editingId === deleteTarget._id) resetForm();
      setDeleteTarget(null);
      setNotice("FAQ deleted.");
    } catch (err) {
      setDeleteError(errorMessage(err, "Could not delete the FAQ."));
    } finally {
      setDeleting(false);
    }
  };

  const questionLength = form.question.trim().length;
  const answerLength = form.answer.trim().length;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>FAQs</h1>
          <p className={styles.pageSubtitle}>
            Manage the questions shown on the home page and the FAQ page.
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
            <h2 className={styles.cardTitle}>{editingId ? "Edit FAQ" : "Add FAQ"}</h2>
            {editingId && (
              <button type="button" className={styles.linkBtn} onClick={resetForm}>
                <X size={14} aria-hidden /> Cancel edit
              </button>
            )}
          </div>

          <div className={styles.field}>
            <span className={styles.label} id="f-placement-label">
              Show on
            </span>
            <div
              className={styles.segmented}
              role="radiogroup"
              aria-labelledby="f-placement-label"
            >
              {PLACEMENT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={form.placement === option.value}
                  className={`${styles.segment} ${
                    form.placement === option.value ? styles.segmentActive : ""
                  }`}
                  onClick={() => setField("placement", option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="f-question" className={styles.label}>
              Question
            </label>
            <input
              id="f-question"
              ref={questionRef}
              type="text"
              className={`${styles.input} ${errors.question ? styles.inputError : ""}`}
              value={form.question}
              onChange={(e) => setField("question", e.target.value)}
              autoComplete="off"
              aria-invalid={Boolean(errors.question)}
            />
            <div className={styles.fieldMeta}>
              {errors.question ? <p className={styles.error}>{errors.question}</p> : <span />}
              <span
                className={`${styles.counter} ${
                  questionLength > QUESTION_MAX ? styles.counterOver : ""
                }`}
              >
                {questionLength}/{QUESTION_MAX}
              </span>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="f-answer" className={styles.label}>
              Answer
            </label>
            <textarea
              id="f-answer"
              className={`${styles.input} ${styles.textarea} ${
                errors.answer ? styles.inputError : ""
              }`}
              value={form.answer}
              onChange={(e) => setField("answer", e.target.value)}
              rows={6}
              aria-invalid={Boolean(errors.answer)}
            />
            <div className={styles.fieldMeta}>
              {errors.answer ? <p className={styles.error}>{errors.answer}</p> : <span />}
              <span
                className={`${styles.counter} ${
                  answerLength > ANSWER_MAX ? styles.counterOver : ""
                }`}
              >
                {answerLength}/{ANSWER_MAX}
              </span>
            </div>
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
              Published
              <span className={styles.switchHint}>Turn off to keep it as a draft.</span>
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
              {saving ? "Saving..." : editingId ? "Update FAQ" : "Add FAQ"}
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
        <section className={styles.card} aria-labelledby="f-list-title">
          <div className={styles.cardHeader}>
            <h2 id="f-list-title" className={styles.cardTitle}>
              All FAQs
            </h2>
          </div>

          <div className={styles.toolbar}>
            <div className={styles.tabs} role="tablist" aria-label="Filter by page">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.value}
                  className={`${styles.tab} ${filter === f.value ? styles.tabActive : ""}`}
                  onClick={() => setFilter(f.value)}
                >
                  {f.label}
                  <span className={styles.tabCount}>{countFor(items, f.value)}</span>
                </button>
              ))}
            </div>

            <div className={styles.search}>
              <Search size={16} className={styles.searchIcon} aria-hidden />
              <input
                type="text"
                className={styles.searchInput}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search FAQs"
                aria-label="Search FAQs"
                autoComplete="off"
              />
              {search && (
                <button
                  type="button"
                  className={styles.searchClear}
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {loading && <p className={styles.state}>Loading FAQs...</p>}

          {!loading && loadError && (
            <div className={styles.errorBox} role="alert">
              <p>{loadError}</p>
              <button type="button" className={styles.secondaryBtn} onClick={load}>
                Try again
              </button>
            </div>
          )}

          {!loading && !loadError && items.length === 0 && (
            <p className={styles.state}>No FAQs yet. Add your first one using the form.</p>
          )}

          {!loading && !loadError && items.length > 0 && visible.length === 0 && (
            <p className={styles.state}>No FAQs match this filter.</p>
          )}

          {!loading && !loadError && visible.length > 0 && (
            <ul className={styles.list}>
              {visible.map((item) => (
                <li
                  key={item._id}
                  className={`${styles.listItem} ${
                    editingId === item._id ? styles.listItemEditing : ""
                  }`}
                >
                  <div className={styles.badges}>
                    <span className={`${styles.badge} ${styles.badgePlacement}`}>
                      {placementLabel(item.placement)}
                    </span>
                    <span
                      className={`${styles.badge} ${
                        item.published ? styles.badgeLive : styles.badgeDraft
                      }`}
                    >
                      {item.published ? "Published" : "Draft"}
                    </span>
                  </div>

                  <p className={styles.itemQuestion}>{item.question}</p>
                  <p className={styles.itemAnswer}>{item.answer}</p>

                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => startEdit(item)}
                      aria-label={`Edit FAQ: ${item.question}`}
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
                      aria-label={`Delete FAQ: ${item.question}`}
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
        <div className={styles.backdrop} onClick={() => !deleting && setDeleteTarget(null)}>
          <div
            className={styles.dialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="f-delete-title"
            aria-describedby="f-delete-text"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="f-delete-title" className={styles.dialogTitle}>
              Delete this FAQ?
            </h3>
            <p id="f-delete-text" className={styles.dialogText}>
              <strong>{deleteTarget.question}</strong> will be removed permanently. This cannot
              be undone.
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