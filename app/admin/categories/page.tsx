"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit3, FolderTree, Plus, Search, Trash2, X } from "lucide-react";
import { adminApi, type AdminCategoryStats } from "@/app/lib/admin-api";
import { getApiErrorMessage } from "@/app/lib/api";
import type { Category } from "@/app/lib/types";
import styles from "./Categories.module.css";

type StatusFilter = "all" | "active" | "draft";

interface CategoryFormState {
  id?: string;
  title: string;
  description: string;
  parentId: string;
  isActive: boolean;
  childCount: number;
}

const EMPTY_FORM: CategoryFormState = {
  title: "",
  description: "",
  parentId: "",
  isActive: false,
  childCount: 0,
};

const DEFAULT_STATS: AdminCategoryStats = {
  total: 0,
  active: 0,
  draft: 0,
  root: 0,
  subcategories: 0,
};

const SEARCH_DEBOUNCE_MS = 350;

function getParentId(category: Category) {
  if (!category.parent) return "";
  return typeof category.parent === "string" ? category.parent : category.parent._id;
}

function getParentTitle(category: Category) {
  if (!category.parent) return "Root category";
  return typeof category.parent === "string" ? "Parent category" : category.parent.title;
}

function toFormState(category: Category): CategoryFormState {
  return {
    id: category._id,
    title: category.title,
    description: category.description || "",
    parentId: getParentId(category),
    isActive: category.isActive,
    childCount: category.childCount || 0,
  };
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [rootCategories, setRootCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<AdminCategoryStats>(DEFAULT_STATS);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isEditing = Boolean(form.id);
  const canSubmit = form.title.trim().length >= 2 && !saving;
  const parentOptions = useMemo(
    () => rootCategories.filter((category) => category._id !== form.id),
    [form.id, rootCategories]
  );

  const loadCategories = async () => {
    setLoading(true);
    setError("");

    try {
      const [listData, rootsData] = await Promise.all([
        adminApi.listCategories({
          page,
          limit: 12,
          search: debouncedSearch || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
          parentId: "all",
        }),
        adminApi.listCategories({
          page: 1,
          limit: 100,
          parentId: "root",
        }),
      ]);

      setCategories(listData.categories);
      setStats(listData.stats);
      setPages(listData.pagination.pages);
      setTotal(listData.pagination.total);
      setRootCategories(rootsData.categories);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load categories"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = search.trim();
      setDebouncedSearch((current) => {
        if (current === nextSearch) return current;
        setPage(1);
        return nextSearch;
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadCategories();
    }, 0);

    return () => window.clearTimeout(loadTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page, statusFilter]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        parentId: form.parentId || null,
        isActive: form.isActive,
      };

      if (form.id) {
        await adminApi.updateCategory(form.id, payload);
        setSuccess("Category updated");
      } else {
        await adminApi.createCategory(payload);
        setSuccess(form.isActive ? "Category published" : "Category saved as draft");
      }

      setForm(EMPTY_FORM);
      await loadCategories();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save category"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    const confirmed = window.confirm(`Delete "${category.title}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");
      await adminApi.deleteCategory(category._id);
      setSuccess("Category deleted");
      if (categories.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadCategories();
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not delete category"));
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <p className={styles.eyebrow}>Product configuration</p>
          <h1 className={styles.title}>Categories</h1>
        </div>
        <span className={styles.summaryPill}>
          {stats.active} PUBLISHED / {stats.total} TOTAL
        </span>
      </div>

      <div className={styles.statsGrid}>
        <StatCard label="Total" value={stats.total} active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
        <StatCard label="Published" value={stats.active} active={statusFilter === "active"} onClick={() => setStatusFilter("active")} />
        <StatCard label="Draft" value={stats.draft} active={statusFilter === "draft"} onClick={() => setStatusFilter("draft")} />
        <StatCard label="Subcategories" value={stats.subcategories} />
      </div>

      <div className={styles.contentGrid}>
        <section className={styles.formCard}>
          <div className={styles.formHeader}>
            <div>
              <h2 className={styles.cardTitle}>{isEditing ? "Edit category" : "Create category"}</h2>
              <p className={styles.cardSubtitle}>Use parent category only when creating a subcategory.</p>
            </div>
            {isEditing && (
              <button type="button" className={styles.iconBtn} onClick={resetForm} aria-label="Cancel edit">
                <X size={16} />
              </button>
            )}
          </div>

          <label className={styles.label} htmlFor="categoryTitle">
            Category title
          </label>
          <input
            id="categoryTitle"
            type="text"
            className={styles.input}
            placeholder="Bucket moulds"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />

          <label className={styles.label} htmlFor="categoryDescription">
            Description
          </label>
          <textarea
            id="categoryDescription"
            className={styles.textarea}
            placeholder="Short internal description for this category"
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
          />

          <label className={styles.label} htmlFor="parentCategory">
            Parent category
          </label>
          <select
            id="parentCategory"
            className={styles.input}
            value={form.parentId}
            disabled={Boolean(form.childCount)}
            onChange={(event) =>
              setForm((current) => ({ ...current, parentId: event.target.value }))
            }
          >
            <option value="">Root category</option>
            {parentOptions.map((category) => (
              <option key={category._id} value={category._id}>
                {category.title}
              </option>
            ))}
          </select>
          {Boolean(form.childCount) && (
            <p className={styles.helpText}>Categories with subcategories must stay at root level.</p>
          )}

          <div className={styles.statusControl}>
            <button
              type="button"
              className={`${styles.statusBtn} ${!form.isActive ? styles.statusBtnActive : ""}`}
              onClick={() => setForm((current) => ({ ...current, isActive: false }))}
            >
              Save as draft
            </button>
            <button
              type="button"
              className={`${styles.statusBtn} ${form.isActive ? styles.statusBtnActive : ""}`}
              onClick={() => setForm((current) => ({ ...current, isActive: true }))}
            >
              Publish
            </button>
          </div>

          <button
            type="button"
            className={styles.primaryBtn}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {saving ? "Saving..." : isEditing ? "Update category" : "Create category"}
          </button>
        </section>

        <section className={styles.listSection}>
          <div className={styles.toolbar}>
            <div className={styles.searchWrap}>
              <Search size={15} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search categories..."
                className={styles.searchInput}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <button type="button" className={styles.newBtn} onClick={resetForm}>
              <Plus size={16} />
              New
            </button>
          </div>

          {error && <p className={styles.errorText}>{error}</p>}
          {success && <p className={styles.successText}>{success}</p>}

          <div className={styles.categoryList}>
            {loading ? (
              <p className={styles.emptyText}>Loading categories...</p>
            ) : categories.length ? (
              categories.map((category) => (
                <article key={category._id} className={styles.categoryCard}>
                  <div className={styles.categoryIcon} aria-hidden>
                    <FolderTree size={18} />
                  </div>
                  <div className={styles.categoryBody}>
                    <div className={styles.categoryTop}>
                      <div>
                        <h3 className={styles.categoryTitle}>{category.title}</h3>
                        <p className={styles.categoryMeta}>
                          {getParentTitle(category)}
                          {category.childCount ? ` · ${category.childCount} subcategories` : ""}
                        </p>
                      </div>
                      <span className={`${styles.statusPill} ${category.isActive ? styles.published : styles.draft}`}>
                        {category.isActive ? "Published" : "Draft"}
                      </span>
                    </div>
                    {category.description && (
                      <p className={styles.description}>{category.description}</p>
                    )}
                    <div className={styles.cardActions}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => setForm(toFormState(category))}
                      >
                        <Edit3 size={14} />
                        Edit
                      </button>
                      <button
                        type="button"
                        className={styles.dangerBtn}
                        onClick={() => handleDelete(category)}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className={styles.emptyText}>No categories found.</p>
            )}
          </div>

          <div className={styles.pagination}>
            <span className={styles.paginationMeta}>
              Page {page} of {pages} · {total} categories
            </span>
            <div className={styles.paginationActions}>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={page >= pages}
                onClick={() => setPage((current) => Math.min(pages, current + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  active = false,
  onClick,
}: {
  label: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.statCard} ${active ? styles.statCardActive : ""}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </button>
  );
}
