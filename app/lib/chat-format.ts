export function chatTimestamp(value: string, dateOnly = false) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", ...(dateOnly ? {} : { hour: "numeric", minute: "2-digit" }) }).format(date);
}

export function chatDay(value: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
