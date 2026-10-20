"use client"
import Link from "next/link";
import { useMemo, useRef, useState, type MouseEvent } from "react";
import styles from "./Overview.module.css";

const STATS = [
  { label: "Total Users", value: "3,482", delta: "6.2% MoM", progress: 68, invert: false, live: true },
  { label: "Active Listings", value: "1,240", delta: "3.1% MoM", progress: 45, invert: false, live: true },
  { label: "Bookings (30D)", value: "642", delta: "11% MoM", progress: 82, invert: false, live: false },
  { label: "Revenue (30D)", value: "₹18.4L", delta: "8.7% MoM", progress: 74, invert: false, live: false },
  { label: "Damage Claim", value: "2.8%", delta: "0.4% MoM", progress: 28, invert: true, live: false },
] as const;

const PENDING_ACTIONS = [
  { queue: "KYC Approvals", pending: 4, oldest: "2 days", action: "REVIEW", tone: "amber" },
  { queue: "Listing Approvals", pending: 7, oldest: "18 hrs", action: "REVIEW", tone: "amber" },
  { queue: "Booking Approvals", pending: 3, oldest: "4 hrs", action: "REVIEW", tone: "cyan" },
  { queue: "Damage Claims", pending: 2, oldest: "1 day", action: "URGENT", tone: "red" },
] as const;

const TOP_OWNERS = [
  { name: "Sharma Industries", moulds: 12, bookings: 38, revenue: "₹4.2L", initial: "S", gradient: "#2563eb" },
  { name: "Vector Molds", moulds: 9, bookings: 27, revenue: "₹3.1L", initial: "V", gradient: "#2563eb" },
  { name: "Precision Ltd.", moulds: 7, bookings: 21, revenue: "₹2.6L", initial: "P", gradient: "#2563eb" },
];

const RECENT_ACTIVITY = [
  { text: "Nova Plastics booking approved for MX-000123", time: "12 min ago", tone: "green" },
  { text: "Sharma Industries KYC submitted for review", time: "48 min ago", tone: "amber" },
  { text: "Damage claim raised on MX-000198 — ₹4,000", time: "2 hrs ago", tone: "red" },
  { text: "New owner signup: Precision Ltd.", time: "5 hrs ago", tone: "cyan" },
] as const;

const QUICK_ACTIONS = [
  { label: "Review KYC", icon: "🪪", href: "/admin/kyc" },
  { label: "Review Listings", icon: "▦", href: "/admin/listings" },
  { label: "Review Bookings", icon: "▦", href: "/admin/bookings" },
  { label: "Review Damage Claims", icon: "📣", href: "/admin/damage-claims" },
];

const GRANULARITY_OPTIONS = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
] as const;

type Granularity = (typeof GRANULARITY_OPTIONS)[number]["key"] | "custom";

const PERIOD_LABELS: Record<Granularity, string> = {
  weekly: "This Week",
  monthly: "This Month",
  yearly: "This Year",
  custom: "Custom Range",
};

/** Deterministic-looking mock trend generator — swap with real API data later. */
function buildSeries(numPoints: number, base: number, trend: number, volatility: number) {
  const values: number[] = [];
  let val = base;
  for (let i = 0; i < numPoints; i++) {
    val += trend + Math.sin(i / 1.7) * volatility;
    values.push(Math.max(0, Math.round(val)));
  }
  return values;
}

function formatDateLabel(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function buildCustomLabels(start: string, end: string, points: number) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const span = endDate.getTime() - startDate.getTime();
  const labels: string[] = [];
  for (let i = 0; i < points; i++) {
    const t = new Date(startDate.getTime() + (span * i) / Math.max(points - 1, 1));
    labels.push(formatDateLabel(t));
  }
  return labels;
}

function getSeriesForGranularity(
  granularity: Granularity,
  customRange: { start: string; end: string },
  kind: "listings" | "users"
) {
  const seed = kind === "listings" ? { base: 900, trend: 6, vol: 18 } : { base: 2600, trend: 14, vol: 40 };

  if (granularity === "custom" && customRange.start && customRange.end) {
    const points = 8;
    return {
      labels: buildCustomLabels(customRange.start, customRange.end, points),
      values: buildSeries(points, seed.base, seed.trend, seed.vol),
    };
  }
  if (granularity === "weekly") {
    return {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      values: buildSeries(7, seed.base * 0.35, seed.trend * 0.8, seed.vol * 0.6),
    };
  }
  if (granularity === "yearly") {
    return {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      values: buildSeries(12, seed.base * 2.2, seed.trend * 1.6, seed.vol * 1.4),
    };
  }
  // monthly (default) — last 4 weeks
  return {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    values: buildSeries(4, seed.base, seed.trend * 1.2, seed.vol),
  };
}

function computeTrend(values: number[]) {
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  const pctChange = first === 0 ? 0 : ((last - first) / first) * 100;
  return { last, pctChange, isUp: pctChange >= 0 };
}

function formatNumber(n: number) {
  return n.toLocaleString("en-IN");
}

function csvEscape(v: string | number) {
  const str = String(v);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  // \uFEFF (BOM) so Excel shows ₹ and other symbols correctly
  const csv = "\uFEFF" + rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function DateRangeFilter({
  granularity,
  isCustomActive,
  customRange,
  onGranularityClick,
  onDateChange,
  onDownload,
}: {
  granularity: Granularity;
  isCustomActive: boolean;
  customRange: { start: string; end: string };
  onGranularityClick: (g: "weekly" | "monthly" | "yearly") => void;
  onDateChange: (field: "start" | "end", value: string) => void;
  onDownload: () => void;
}) {
  return (
    <div className={styles.filterBar}>
      <div className={styles.filterBarLeft}>
        <span className={styles.filterBarIcon} aria-hidden>
          📅
        </span>
        <div>
          <p className={styles.filterBarTitle}>Data Range</p>
          <p className={styles.filterBarSubtitle}>
            {isCustomActive
              ? `${customRange.start} → ${customRange.end}`
              : PERIOD_LABELS[granularity]}
          </p>
        </div>
      </div>

      <div className={styles.filterBarRight}>
        <div className={styles.granularityGroup}>
          {GRANULARITY_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`${styles.granBtn} ${
                !isCustomActive && granularity === opt.key ? styles.granBtnActive : ""
              }`}
              onClick={() => onGranularityClick(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className={`${styles.dateRangeGroup} ${isCustomActive ? styles.dateRangeGroupActive : ""}`}>
          <input
            type="date"
            className={styles.dateInput}
            value={customRange.start}
            onChange={(e) => onDateChange("start", e.target.value)}
          />
          <span className={styles.dateSep}>→</span>
          <input
            type="date"
            className={styles.dateInput}
            value={customRange.end}
            onChange={(e) => onDateChange("end", e.target.value)}
          />
        </div>

        <button type="button" className={styles.downloadBtn} onClick={onDownload}>
          <span aria-hidden>⬇</span> Download CSV
        </button>
      </div>
    </div>
  );
}

function TrendLineChart({
  title,
  labels,
  values,
  color,
  companion,
}: {
  title: string;
  labels: string[];
  values: number[];
  color: string;
  companion: { name: string; color: string; values: number[] };
}) {
  const width = 560;
  const height = 160;
  const padX = 8;
  const padY = 14;

  const wrapRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = padX + (i * (width - padX * 2)) / Math.max(values.length - 1, 1);
    const y = height - padY - ((v - min) / range) * (height - padY * 2);
    return [x, y] as const;
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1][0]},${height} L${points[0][0]},${height} Z`;

  const { pctChange, isUp } = computeTrend(values);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const index = Math.round(fraction * (values.length - 1));
    setHoverIndex(index);
  };

  const handleMouseLeave = () => setHoverIndex(null);

  const hoverPoint = hoverIndex !== null ? points[hoverIndex] : null;
  const tooltipLeftPct = hoverPoint ? (hoverPoint[0] / width) * 100 : 0;
  const tooltipTopPx = hoverPoint ? hoverPoint[1] : 0;
  const flipTooltip = tooltipLeftPct > 70;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>{title}</h2>
        <span className={`${styles.chartDelta} ${isUp ? styles.deltaUp : styles.deltaDown}`}>
          {isUp ? "▲" : "▼"} {Math.abs(pctChange).toFixed(1)}%
        </span>
      </div>

      <div
        className={styles.chartSvgWrap}
        ref={wrapRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={styles.chartSvg}>
          <path d={areaPath} fill={`${color}1a`} stroke="none" />
          <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
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
            <div className={styles.chartTooltipRow}>
              <span className={styles.chartTooltipDot} style={{ background: companion.color }} />
              <span className={styles.chartTooltipName}>{companion.name}</span>
              <span className={styles.chartTooltipValue}>{formatNumber(companion.values[hoverIndex])}</span>
            </div>
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

export default function AdminOverviewPage() {
  const [granularity, setGranularity] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });

  const isCustomActive = Boolean(customRange.start && customRange.end);
  const activeGranularity: Granularity = isCustomActive ? "custom" : granularity;

  const handleGranularityClick = (g: "weekly" | "monthly" | "yearly") => {
    setGranularity(g);
    setCustomRange({ start: "", end: "" });
  };

  const handleDateChange = (field: "start" | "end", value: string) => {
    setCustomRange((prev) => ({ ...prev, [field]: value }));
  };

  const listingsSeries = useMemo(
    () => getSeriesForGranularity(activeGranularity, customRange, "listings"),
    [activeGranularity, customRange]
  );
  const usersSeries = useMemo(
    () => getSeriesForGranularity(activeGranularity, customRange, "users"),
    [activeGranularity, customRange]
  );

  const listingsTrend = computeTrend(listingsSeries.values);
  const usersTrend = computeTrend(usersSeries.values);

  const dynamicStats = STATS.map((s) => {
    if (s.label === "Active Listings") {
      return { ...s, value: formatNumber(listingsTrend.last), pctChange: listingsTrend.pctChange, isUp: listingsTrend.isUp };
    }
    if (s.label === "Total Users") {
      return { ...s, value: formatNumber(usersTrend.last), pctChange: usersTrend.pctChange, isUp: usersTrend.isUp };
    }
    return { ...s, pctChange: null as number | null, isUp: true };
  });

  const handleDownloadCsv = () => {
    const rangeText = isCustomActive
      ? `${customRange.start} to ${customRange.end}`
      : PERIOD_LABELS[activeGranularity];

    const rows: (string | number)[][] = [
      ["Platform Overview Report"],
      ["Period", rangeText],
      ["Generated On", new Date().toLocaleString("en-IN")],
      [],
      ["Summary"],
      ["Metric", "Value", "Change"],
      ...dynamicStats.map((s) => [
        s.label,
        s.value,
        s.pctChange !== null ? `${s.isUp ? "+" : "-"}${Math.abs(s.pctChange).toFixed(1)}%` : s.delta,
      ]),
      [],
      ["Trend"],
      ["Period", "Active Listings", "Active Users"],
      ...listingsSeries.labels.map((label, i) => [label, listingsSeries.values[i], usersSeries.values[i]]),
    ];

    const today = new Date().toISOString().slice(0, 10);
    const filename = isCustomActive
      ? `overview_${customRange.start}_to_${customRange.end}.csv`
      : `overview_${activeGranularity}_${today}.csv`;

    downloadCsv(filename, rows);
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Platform Overview</h1>
          <p className={styles.subtitle}>Welcome back — here&apos;s what needs attention today.</p>
        </div>
        <span className={styles.livePill}>
          <span className={styles.liveDot} aria-hidden /> All systems live
        </span>
      </div>

      {/* ---------- Date range filter (weekly / monthly / yearly / custom) ---------- */}
      <DateRangeFilter
        granularity={granularity}
        isCustomActive={isCustomActive}
        customRange={customRange}
        onGranularityClick={handleGranularityClick}
        onDateChange={handleDateChange}
        onDownload={handleDownloadCsv}
      />

      {/* ---------- Stat cards with progress bars ---------- */}
      <div className={styles.statsGrid}>
        {dynamicStats.map((s) => (
          <div key={s.label} className={styles.statCard}>
            {s.live && <span className={styles.liveBadge}>{PERIOD_LABELS[activeGranularity]}</span>}
            <p className={styles.statValue}>{s.value}</p>
            <p className={styles.statLabel}>{s.label}</p>
            <p
              className={`${styles.statDelta} ${
                s.pctChange !== null ? (s.isUp ? styles.deltaUp : styles.deltaDown) : s.invert ? styles.statDeltaGood : ""
              }`}
            >
              {s.pctChange !== null
                ? `${s.isUp ? "▲" : "▼"} ${Math.abs(s.pctChange).toFixed(1)}%`
                : `${s.invert ? "▼" : "▲"} ${s.delta}`}
            </p>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${s.progress}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* ---------- Quick actions ---------- */}
      <div className={styles.quickActionsRow}>
        {QUICK_ACTIONS.map((a) => (
          <a key={a.label} href={a.href} className={styles.quickAction}>
            <span className={styles.quickActionIcon}>{a.icon}</span>
            <span className={styles.quickActionLabel}>{a.label}</span>
          </a>
        ))}
      </div>

      {/* ---------- Pending actions table ---------- */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Pending Actions</h2>
          <span className={styles.cardHeaderMeta}>{PENDING_ACTIONS.length} queues</span>
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
              {PENDING_ACTIONS.map((row) => (
                <tr key={row.queue}>
                  <td className={styles.queueCell}>{row.queue}</td>
                  <td>{row.pending}</td>
                  <td className={styles.mutedCell}>{row.oldest}</td>
                  <td className={styles.actionCell}>
                    <button
                      type="button"
                      className={`${styles.actionPill} ${
                        row.tone === "red"
                          ? styles.actionRed
                          : row.tone === "cyan"
                          ? styles.actionCyan
                          : styles.actionAmber
                      }`}
                    >
                      {row.action}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- Trend charts: Active Listings + Active Users ---------- */}
      <div className={styles.twoColGrid}>
        <TrendLineChart
          title="Active Listings"
          labels={listingsSeries.labels}
          values={listingsSeries.values}
          color="#2563eb"
          companion={{ name: "Active Users", color: "#059669", values: usersSeries.values }}
        />
        <TrendLineChart
          title="Active Users"
          labels={usersSeries.labels}
          values={usersSeries.values}
          color="#059669"
          companion={{ name: "Active Listings", color: "#2563eb", values: listingsSeries.values }}
        />
      </div>

      {/* ---------- Two-column layout: Top owners + Recent activity ---------- */}
      <div className={styles.twoColGrid}>
        {/* Top performing owners */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Top Performing Owners</h2>
            <Link href="/admin/users" className={styles.cardHeaderLink}>
              View all →
            </Link>
          </div>

          <div className={styles.ownersList}>
            {TOP_OWNERS.map((owner, i) => (
              <div key={owner.name} className={styles.ownerRow}>
                <span className={styles.ownerRank}>{i + 1}</span>
                <div className={styles.ownerAvatar} style={{ background: owner.gradient }}>
                  {owner.initial}
                </div>
                <div className={styles.ownerInfo}>
                  <p className={styles.ownerName}>{owner.name}</p>
                  <p className={styles.ownerMeta}>
                    {owner.moulds} moulds · {owner.bookings} bookings
                  </p>
                </div>
                <span className={styles.ownerRevenue}>{owner.revenue}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Recent Activity</h2>
          <div className={styles.activityList}>
            {RECENT_ACTIVITY.map((item, i) => (
              <div key={i} className={styles.activityRow}>
                <span
                  className={`${styles.activityDot} ${
                    item.tone === "green"
                      ? styles.dotGreen
                      : item.tone === "red"
                      ? styles.dotRed
                      : item.tone === "amber"
                      ? styles.dotAmber
                      : styles.dotCyan
                  }`}
                />
                <div>
                  <p className={styles.activityText}>{item.text}</p>
                  <p className={styles.activityTime}>{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
