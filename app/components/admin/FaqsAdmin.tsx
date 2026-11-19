"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import styles from "./FaqsAdmin.module.css";
import { getApiErrorMessage } from "@/app/lib/api";
import {
  FAQ_CATEGORIES,
  FAQ_SEARCH_MAX_LENGTH,
  faqsAdminApi,
  type AdminFaq,
  type AdminFaqPage,
  type AdminFaqView,
  type FaqCategory,
  type FaqInput,
} from "@/app/lib/faqs-api";

const EMPTY_FORM: FaqInput = {
  question: "",
  answer: "",
  category: "General",
  published: true,
  showOnHome: true,
};

const QUESTION_MIN = 5;
const QUESTION_MAX = 160;
const ANSWER_MIN = 10;
const ANSWER_MAX = 600;

type FormErrors = Partial<Record<keyof FaqInput, string>>;
const FILTERS: { value: AdminFaqView; label: string }[] = [
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

type ListResult = { key: string } & ({ data: AdminFaqPage; error?: never } | { error: string; data?: never });

export default function FaqsAdmin() {
  const [result, setResult] = useState<ListResult>();
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);

  const [form, setForm] = useState<FaqInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const [filter, setFilter] = useState<AdminFaqView>("all");
  const [search, setSearch] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<AdminFaq | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const formRef = useRef<HTMLFormElement>(null);
  const questionRef = useRef<HTMLInputElement>(null);

  const busy = saving || deleting;
  const searchTerm = search.trim();
  const requestKey = JSON.stringify([filter, searchTerm, page, revision]);
  const current = result?.key === requestKey ? result : undefined;
  const loading = !current;
  const loadError = current?.error;
  const data = current?.data;
  const counts = result?.data?.counts;
  const refresh = () => setRevision((value) => value + 1);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      faqsAdminApi.list({ page, view: filter, search: searchTerm || undefined }, controller.signal).then(
        (data) => {
          if (controller.signal.aborted) return;

          if (page > data.pagination.pages) {
            setPage(data.pagination.pages);
            return;
          }
          setResult({ key: requestKey, data });
        },
        (err) => {
          if (!controller.signal.aborted) setResult({ key: requestKey, error: getApiErrorMessage(err, "Could not load FAQs.") });
        },
      );
    }, searchTerm ? 250 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [filter, page, requestKey, searchTerm]);

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

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

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
      category: item.category,
      published: item.published,
      showOnHome: item.showOnHome,
    });
    setErrors({});
    setFormError("");
    setNotice("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => questionRef.current?.focus(), 350);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || loading) return;
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
        await faqsAdminApi.update(editingId, payload);
        setNotice("FAQ updated.");
      } else {
        await faqsAdminApi.create(payload);
        setPage(1);
        setNotice("FAQ added.");
      }
      resetForm();
      refresh();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Could not save the FAQ."));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || busy) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await faqsAdminApi.remove(deleteTarget._id);
      if (editingId === deleteTarget._id) resetForm();
      setDeleteTarget(null);
      setNotice("FAQ deleted.");
      refresh();
    } catch (err) {
      setDeleteError(getApiErrorMessage(err, "Could not delete the FAQ."));
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
        <span className={styles.countPill}>{counts?.all ?? 0} total</span>
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
              <button type="button" className={styles.linkBtn} onClick={resetForm} disabled={busy}>
                <X size={14} aria-hidden /> Cancel edit
              </button>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="f-category" className={styles.label}>Category</label>
            <select
              id="f-category"
              className={styles.input}
              value={form.category}
              onChange={(e) => setField("category", e.target.value as FaqCategory)}
            >
              {FAQ_CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
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

          <label className={styles.switchRow}>
            <input
              type="checkbox"
              className={styles.switchInput}
              checked={form.showOnHome}
              onChange={(e) => setField("showOnHome", e.target.checked)}
            />
            <span className={styles.switchTrack} aria-hidden />
            <span className={styles.switchText}>Show on homepage</span>
          </label>

          {formError && (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          )}

          <div className={styles.actions}>
            <button type="submit" className={styles.primaryBtn} disabled={busy || loading}>
              {!editingId && !saving && <Plus size={16} aria-hidden />}
              {saving ? "Saving..." : editingId ? "Update FAQ" : "Add FAQ"}
            </button>
            {editingId && (
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={resetForm}
                disabled={busy}
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
                  onClick={() => {
                    setFilter(f.value);
                    setPage(1);
                  }}
                >
                  {f.label}
                  <span className={styles.tabCount}>{counts?.[f.value] ?? 0}</span>
                </button>
              ))}
            </div>

            <div className={styles.search}>
              <Search size={16} className={styles.searchIcon} aria-hidden />
              <input
                type="text"
                className={styles.searchInput}
                value={search}
                onChange={(e) => changeSearch(e.target.value)}
                placeholder="Search FAQs"
                aria-label="Search FAQs"
                autoComplete="off"
                maxLength={FAQ_SEARCH_MAX_LENGTH}
              />
              {search && (
                <button
                  type="button"
                  className={styles.searchClear}
                  onClick={() => changeSearch("")}
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
              <button type="button" className={styles.secondaryBtn} onClick={refresh}>
                Try again
              </button>
            </div>
          )}

          {data && data.counts.all === 0 && (
            <p className={styles.state}>No FAQs yet. Add your first one using the form.</p>
          )}

          {data && data.counts.all > 0 && data.faqs.length === 0 && (
            <p className={styles.state}>No FAQs match this filter.</p>
          )}

          {data && data.faqs.length > 0 && (
            <ul className={styles.list}>
              {data.faqs.map((item) => (
                <li
                  key={item._id}
                  className={`${styles.listItem} ${
                    editingId === item._id ? styles.listItemEditing : ""
                  }`}
                >
                  <div className={styles.badges}>
                    <span className={`${styles.badge} ${styles.badgeCategory}`}>
                      {item.category}
                    </span>
                    {item.showOnHome && <span className={`${styles.badge} ${styles.badgeDraft}`}>Home page</span>}
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
                      disabled={busy}
                      aria-label={`Edit FAQ: ${item.question}`}
                    >
                      <Pencil size={15} aria-hidden /> Edit
                    </button>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      disabled={busy}
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
          {data && data.pagination.total > 0 && (
            <nav className={styles.pagination} aria-label="FAQ pagination">
              <span className={styles.paginationMeta}>
                Page {data.pagination.page} of {data.pagination.pages} · {data.pagination.total} FAQ{data.pagination.total === 1 ? "" : "s"}
              </span>
              <div className={styles.paginationActions}>
                <button type="button" className={styles.secondaryBtn} disabled={busy || !data.pagination.hasPrevPage} onClick={() => setPage(page - 1)}>
                  <ChevronLeft size={15} aria-hidden /> Previous
                </button>
                <button type="button" className={styles.secondaryBtn} disabled={busy || !data.pagination.hasNextPage} onClick={() => setPage(page + 1)}>
                  Next <ChevronRight size={15} aria-hidden />
                </button>
              </div>
            </nav>
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
