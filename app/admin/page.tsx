"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { adminApi, type AdminDashboard, type DashboardPeriod, type DashboardStat, type PendingQueue, type TrendSeries } from "@/app/lib/admin-api";
import type { AdminNotification } from "@/app/lib/admin-notification-api";
import { useAdminNotifications } from "@/app/lib/admin-notification-context";
import { getApiErrorMessage } from "@/app/lib/api";
import styles from "./Overview.module.css";

const QUICK_ACTIONS = [
  { label: "Review KYC", icon: "🪪", href: "/admin/kyc" },
  { label: "Review Listings", icon: "▦", href: "/admin/listings" },
  { label: "Review Bookings", icon: "☰", href: "/admin/bookings" },
];

const PERIOD_OPTIONS: { key: DashboardPeriod; label: string; current: string; previous: string }[] = [
  { key: "week", label: "Weekly", current: "This Week", previous: "last week" },
  { key: "month", label: "Monthly", current: "This Month", previous: "last month" },
  { key: "year", label: "Yearly", current: "This Year", previous: "last year" },
];

// Older than this, a pending item is flagged as urgent.
const URGENT_AFTER_MS = 48 * 60 * 60 * 1000;

function formatNumber(n: number) {
  return n.toLocaleString("en-IN");
}

function formatRupees(amount: number) {
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(1)}Cr`;
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(1)}L`;
  return `₹${formatNumber(Math.round(amount))}`;
}

function formatDay(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`));
}

function formatAge(value: string | null, now: number) {
  if (!value) return "—";
  const minutes = Math.max(0, Math.floor((now - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${Math.max(minutes, 1)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} hr${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `${days} days`;
}

function timeAgo(value: string, now: number) {
  const age = formatAge(value, now);
  return age === "—" ? "" : `${age} ago`;
}

/** Today in India as YYYY-MM-DD, matching the API's reporting timezone. */
function todayInIndia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function ChangeBadge({ change, className }: { change: number | null; className: string }) {
  if (change === null) return <span className={`${className} ${styles.deltaUp}`}>▲ New</span>;
  const isUp = change >= 0;
  return (
    <span className={`${className} ${isUp ? styles.deltaUp : styles.deltaDown}`}>
      {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
    </span>
  );
}

function DateRangeFilter({
  period,
  periodLabel,
  range,
  downloading,
  onPeriodChange,
  onDateChange,
  onDownload,
}: {
  period: DashboardPeriod;
  periodLabel: string;
  range: { start: string; end: string };
  downloading: boolean;
  onPeriodChange: (period: DashboardPeriod) => void;
  onDateChange: (field: "start" | "end", value: string) => void;
  onDownload: () => void;
}) {
  const today = todayInIndia();
  return (
    <div className={styles.filterBar}>
      <div className={styles.filterBarLeft}>
        <span className={styles.filterBarIcon} aria-hidden>
          📅
        </span>
        <div>
          <p className={styles.filterBarTitle}>Data Range</p>
          <p className={styles.filterBarSubtitle}>{periodLabel}</p>
        </div>
      </div>

      <div className={styles.filterBarRight}>
        <div className={styles.granularityGroup} role="group" aria-label="Dashboard period">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              aria-pressed={period === opt.key}
              className={`${styles.granBtn} ${period === opt.key ? styles.granBtnActive : ""}`}
              onClick={() => onPeriodChange(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div
          className={`${styles.dateRangeGroup} ${range.start && range.end ? styles.dateRangeGroupActive : ""}`}
          title="Date range for the CSV report"
        >
          <input
            type="date"
            aria-label="CSV report start date"
            className={styles.dateInput}
            value={range.start}
            max={range.end || today}
            onChange={(e) => onDateChange("start", e.target.value)}
          />
          <span className={styles.dateSep}>→</span>
          <input
            type="date"
            aria-label="CSV report end date"
            className={styles.dateInput}
            value={range.end}
            min={range.start || undefined}
            onChange={(e) => onDateChange("end", e.target.value)}
          />
        </div>

        <button
          type="button"
          className={styles.downloadBtn}
          onClick={onDownload}
          disabled={!range.start || !range.end || downloading}
          title={range.start && range.end ? "Download the platform report for the selected dates" : "Select a start and end date first"}
        >
          <span aria-hidden>⬇</span> {downloading ? "Preparing…" : "Download CSV"}
        </button>
      </div>
    </div>
  );
}

function TrendLineChart({
  title,
  series,
  color,
  companion,
}: {
  title: string;
  series: TrendSeries;
  color: string;
  companion: { name: string; color: string; values: number[] };
}) {
  const width = 560;
  const height = 160;
  const padX = 8;
  const padY = 14;

  const wrapRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const { labels, values } = series;

  const max = Math.max(...values, 0);
  const min = Math.min(...values, max);
  const range = max - min || 1;
  const flat = max === min;

  const points = values.map((v, i) => {
    const x = values.length === 1 ? width / 2 : padX + (i * (width - padX * 2)) / (values.length - 1);
    // A flat series sits mid-height instead of hugging the axis.
    const y = flat ? height / 2 : height - padY - ((v - min) / range) * (height - padY * 2);
    return [x, y] as const;
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const areaPath = points.length
    ? `${linePath} L${points[points.length - 1][0]},${height} L${points[0][0]},${height} Z`
    : "";

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || values.length === 0) return;
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHoverIndex(Math.round(fraction * (values.length - 1)));
  };

  const hoverPoint = hoverIndex !== null ? points[hoverIndex] : null;
  const tooltipLeftPct = hoverPoint ? (hoverPoint[0] / width) * 100 : 0;
  const tooltipTopPx = hoverPoint ? hoverPoint[1] : 0;
  const flipTooltip = tooltipLeftPct > 70;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>
          {title} <span className={styles.chartCurrent}>{formatNumber(series.current)}</span>
        </h2>
        <ChangeBadge change={series.change} className={styles.chartDelta} />
      </div>

      <div
        className={styles.chartSvgWrap}
        ref={wrapRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={styles.chartSvg} role="img"
          aria-label={`${title}: ${labels.map((l, i) => `${l} ${values[i]}`).join(", ")}`}>
          {points.length > 1 && <path d={areaPath} fill={`${color}1a`} stroke="none" />}
          {points.length > 1 && (
            <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          )}
          {points.map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={hoverIndex === i ? 5 : 3}
              fill={color}
              stroke="#ffffff"
              strokeWidth={hoverIndex === i ? 2 : 0}
            />
          ))}
          {hoverPoint && (
            <line
              x1={hoverPoint[0]}
              y1={padY / 2}
              x2={hoverPoint[0]}
              y2={height - padY / 2}
              stroke="#d1d5db"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}
        </svg>

        {hoverIndex !== null && (
          <div
            className={`${styles.chartTooltip} ${flipTooltip ? styles.chartTooltipFlip : ""}`}
            style={{ left: `${tooltipLeftPct}%`, top: `${tooltipTopPx}px` }}
          >
            <p className={styles.chartTooltipLabel}>{labels[hoverIndex]}</p>
            <div className={styles.chartTooltipRow}>
              <span className={styles.chartTooltipDot} style={{ background: color }} />
              <span className={styles.chartTooltipName}>{title}</span>
              <span className={styles.chartTooltipValue}>{formatNumber(values[hoverIndex])}</span>
            </div>
            {companion.values[hoverIndex] !== undefined && (
              <div className={styles.chartTooltipRow}>
                <span className={styles.chartTooltipDot} style={{ background: companion.color }} />
                <span className={styles.chartTooltipName}>{companion.name}</span>
                <span className={styles.chartTooltipValue}>{formatNumber(companion.values[hoverIndex])}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.chartLabelsRow}>
        {labels.map((l, i) => (
          <span key={i} className={`${styles.chartLabel} ${hoverIndex === i ? styles.chartLabelActive : ""}`}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatCard({ stat, badge, previousLabel }: { stat: DashboardStat; badge: string; previousLabel: string }) {
  const progress = Math.max(stat.value, stat.previous) === 0 ? 0 : (stat.value / Math.max(stat.value, stat.previous)) * 100;
  return (
    <div className={styles.statCard}>
      <span className={styles.liveBadge}>{badge}</span>
      <p className={styles.statValue}>{formatNumber(stat.value)}</p>
      <p className={styles.statLabel}>{stat.label}</p>
      <p className={styles.statDelta}>
        <ChangeBadge change={stat.change} className="" />
        <span className={styles.statCompare}> · {formatNumber(stat.previous)} {previousLabel}</span>
      </p>
      <div className={styles.progressTrack} title={`${formatNumber(stat.value)} this period vs ${formatNumber(stat.previous)} ${previousLabel}`}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function queueAction(queue: PendingQueue, now: number) {
  if (queue.count === 0) return { label: "CLEAR", tone: styles.actionCyan };
  if (queue.oldestAt && now - new Date(queue.oldestAt).getTime() > URGENT_AFTER_MS) return { label: "URGENT", tone: styles.actionRed };
  return { label: "REVIEW", tone: styles.actionAmber };
}

function activityDot(item: AdminNotification) {
  if (item.tone === "amber") return styles.dotAmber;
  if (item.category === "booking" || item.category === "profile") return styles.dotGreen;
  return styles.dotCyan;
}

export default function AdminOverviewPage() {
  const { version } = useAdminNotifications();
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState({ start: "", end: "" });
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const requestId = useRef(0);

  const load = useCallback(async (next: DashboardPeriod, quiet = false) => {
    const request = ++requestId.current;
    if (!quiet) setLoading(true);
    try {
      const result = await adminApi.getDashboard(next);
      if (request !== requestId.current) return;
      setData(result);
      setNow(Date.now());
      setError("");
    } catch (err) {
      if (request === requestId.current) setError(getApiErrorMessage(err, "Could not load the dashboard"));
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(period), 0);
    return () => window.clearTimeout(timer);
  }, [load, period]);

  // New admin activity (bookings, KYC, listings) refreshes the numbers quietly.
  useEffect(() => {
    if (version === 0) return;
    const timer = window.setTimeout(() => void load(period, true), 0);
    return () => window.clearTimeout(timer);
  }, [version, load, period]);

  const option = PERIOD_OPTIONS.find((opt) => opt.key === period)!;
  const periodLabel = data && data.period.key === period
    ? `${option.current} · ${formatDay(data.period.start)} – ${formatDay(data.period.today)}`
    : option.current;

  const handleDateChange = (field: "start" | "end", value: string) => {
    setDownloadError("");
    setRange((prev) => ({ ...prev, [field]: value }));
  };

  const handleDownload = async () => {
    if (!range.start || !range.end) {
      setDownloadError("Select both a start and an end date to download the report.");
      return;
    }
    if (range.end < range.start) {
      setDownloadError("End date must be on or after the start date.");
      return;
    }
    setDownloading(true);
    setDownloadError("");
    try {
      await adminApi.downloadDashboardCsv(range.start, range.end);
    } catch (err) {
      setDownloadError(getApiErrorMessage(err, "Could not download the report"));
    } finally {
      setDownloading(false);
    }
  };

  const pendingTotal = data?.pending.reduce((sum, queue) => sum + queue.count, 0) ?? 0;

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Platform Overview</h1>
          <p className={styles.subtitle}>
            {data
              ? pendingTotal > 0
                ? `Welcome back — ${pendingTotal} item${pendingTotal === 1 ? "" : "s"} need${pendingTotal === 1 ? "s" : ""} your review.`
                : "Welcome back — all review queues are clear."
              : "Welcome back — here's what needs attention today."}
          </p>
        </div>
        <span className={styles.livePill}>
          <span className={styles.liveDot} aria-hidden /> Live data
        </span>
      </div>

      <DateRangeFilter
        period={period}
        periodLabel={periodLabel}
        range={range}
        downloading={downloading}
        onPeriodChange={setPeriod}
        onDateChange={handleDateChange}
        onDownload={handleDownload}
      />
      {downloadError && <p className={styles.errorText} role="alert">{downloadError}</p>}

      {error && (
        <div className={styles.errorBox} role="alert">
          {error}
          <button type="button" onClick={() => void load(period)} className={styles.retryBtn}>Try again</button>
        </div>
      )}
      {loading && !data && <p className={styles.emptyText} role="status">Loading dashboard…</p>}

      {data && (
        <div className={loading ? styles.refreshing : undefined} aria-busy={loading}>
          <div className={styles.statsGrid}>
            {data.stats.map((stat) => (
              <StatCard key={stat.key} stat={stat} badge={option.current} previousLabel={option.previous} />
            ))}
          </div>

          <div className={styles.quickActionsRow}>
            {QUICK_ACTIONS.map((a) => (
              <Link key={a.label} href={a.href} className={styles.quickAction}>
                <span className={styles.quickActionIcon}>{a.icon}</span>
                <span className={styles.quickActionLabel}>{a.label}</span>
              </Link>
            ))}
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Pending Actions</h2>
              <span className={styles.cardHeaderMeta}>{pendingTotal} pending</span>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Queue</th>
                    <th>Pending</th>
                    <th>Oldest</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.pending.map((queue) => {
                    const action = queueAction(queue, now);
                    return (
                      <tr key={queue.key}>
                        <td className={styles.queueCell}>{queue.label}</td>
                        <td>{formatNumber(queue.count)}</td>
                        <td className={styles.mutedCell}>{queue.count ? formatAge(queue.oldestAt, now) : "—"}</td>
                        <td className={styles.actionCell}>
                          <Link href={queue.href} className={`${styles.actionPill} ${action.tone}`}>
                            {action.label}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.twoColGrid}>
            <TrendLineChart
              title="Active Listings"
              series={data.charts.activeListings}
              color="#2563eb"
              companion={{ name: "Active Users", color: "#059669", values: data.charts.activeUsers.values }}
            />
            <TrendLineChart
              title="Active Users"
              series={data.charts.activeUsers}
              color="#059669"
              companion={{ name: "Active Listings", color: "#2563eb", values: data.charts.activeListings.values }}
            />
          </div>

          <div className={styles.twoColGrid}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Top Performing Hosts</h2>
                <Link href="/admin/users" className={styles.cardHeaderLink}>
                  View all →
                </Link>
              </div>

              {data.topHosts.length === 0 ? (
                <p className={styles.emptyText}>No bookings were confirmed {option.current.toLowerCase()}.</p>
              ) : (
                <div className={styles.ownersList}>
                  {data.topHosts.map((host, i) => (
                    <Link key={host.hostId} href={`/admin/users/${host.hostId}`} className={styles.ownerRow}>
                      <span className={styles.ownerRank}>{i + 1}</span>
                      <div className={styles.ownerAvatar} style={{ background: "#2563eb" }}>
                        {(host.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.ownerInfo}>
                        <p className={styles.ownerName}>{host.name}</p>
                        <p className={styles.ownerMeta}>
                          {host.listings} listing{host.listings === 1 ? "" : "s"} · {host.bookings} booking{host.bookings === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className={styles.ownerRevenue} title="Rental value of confirmed bookings">{formatRupees(host.revenue)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Recent Activity</h2>
                <Link href="/admin/activity" className={styles.cardHeaderLink}>
                  View all →
                </Link>
              </div>
              {data.recentActivity.length === 0 ? (
                <p className={styles.emptyText}>No activity yet.</p>
              ) : (
                <div className={styles.activityList}>
                  {data.recentActivity.map((item) => (
                    <Link key={item._id} href={item.href} className={`${styles.activityRow} ${styles.activityLink}`}>
                      <span className={`${styles.activityDot} ${activityDot(item)}`} />
                      <div>
                        <p className={styles.activityText}>{item.title}</p>
                        <p className={styles.activityTime}>
                          {timeAgo(item.createdAt, now)}{item.actorLabel ? ` · ${item.actorLabel}` : ""}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
