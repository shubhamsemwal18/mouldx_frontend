import type { BlockedRange } from "./booking-types";

const DAY = 86_400_000;
export function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
export function addDays(value: string, days: number): string {
  return dateOnly(new Date(Date.parse(`${value}T00:00:00Z`) + days * DAY));
}
export function rentalDays(start: string, end: string): number {
  if (!isDateOnly(start) || !isDateOnly(end) || end < start) return 0;
  return (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY + 1;
}
export function rangeError(start: string, end: string, today: string, blocked: BlockedRange[]): string | null {
  if (!isDateOnly(start) || !isDateOnly(end)) return "Select valid pickup and return dates.";
  if (start < today) return "Pickup cannot be in the past.";
  if (end < start) return "Return cannot be before pickup.";
  if (rentalDays(start, end) > 366) return "A booking can include at most 366 days.";
  if (end > addDays(today, 730)) return "Return must be within 730 days of today.";
  if (blocked.some((range) => start <= range.endDate.slice(0, 10) && end >= range.startDate.slice(0, 10))) {
    return "These dates include an approved booking or its 3-day cooldown. Select an available range.";
  }
  return null;
}
export function formatBookingDate(value: string): string {
  const day = value.slice(0, 10);
  if (!isDateOnly(day)) return "Unavailable";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${day}T00:00:00Z`));
}
export const bookingMoney = (amount: number) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2,
}).format(amount);

export function upiPaymentUri(upi: { id: string; name: string }, amount: number, productCode: string): string {
  return `upi://pay?${new URLSearchParams({ pa: upi.id, pn: upi.name, am: amount.toFixed(2), cu: "INR", tn: `MouldX ${productCode}` })}`;
}

export function isUpiReference(value: string): boolean {
  return /^[A-Z0-9]{6,64}$/.test(value);
}
